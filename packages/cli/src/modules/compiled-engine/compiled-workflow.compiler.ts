import type {
	CompiledEngineDiagnostic,
	CompiledEngineDiagnosticSeverity,
	CompiledNodeTier,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type { IConnections, INode, INodeTypes, IWorkflowSettings } from 'n8n-workflow';
import { InstanceSettings } from 'n8n-core';
import { getGlobalState, NodeHelpers, nodeIssuesToString, Workflow } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { NodeTypes } from '@/node-types';

import { ArtifactCache } from './compiled-engine-disk.service';
import { CompiledEngineConfig } from './compiled-engine.config';
import { CompiledEngineProcesses } from './compiled-engine-processes';
import type { CompiledArtifact, CredentialSlotBinding } from './compiled-engine.types';
import { CompiledSubWorkflowResolver } from './compiled-sub-workflow.resolver';
import { loadWorkflowLang } from './workflow-lang';

/** The parts of a workflow that the converter reads. */
export interface CompileInput {
	id: string;
	name: string;
	versionId: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings | null;
}

interface StepInfo {
	name: string;
	kind: string;
	nodeType: string | null;
}

const STICKY_NOTE = 'n8n-nodes-base.stickyNote';

function isTriggerType(type: string) {
	return /trigger$/i.test(type) || type === 'n8n-nodes-base.webhook';
}

function toSeverity(value: string): CompiledEngineDiagnosticSeverity {
	return value === 'error' || value === 'warning' ? value : 'info';
}

/**
 * Says where each node runs:
 * - a step that `wfrt` runs itself is `native`; a code step or a v1 node
 *   step (no library port) is `host`,
 * - a node that runs in the fallback host without a step name of its own is `host`,
 * - a node with an error diagnostic is left out,
 * - every other node became code in the module.
 */
export function classifyNodes(input: {
	nodes: INode[];
	steps: StepInfo[];
	libraryTypes: Set<string>;
	fallbackNodes: string[];
	diagnostics: CompiledEngineDiagnostic[];
}): Record<string, CompiledNodeTier> {
	const failed = new Set(
		input.diagnostics.filter((d) => d.severity === 'error' && d.node).map((d) => d.node),
	);
	const steps = new Map(input.steps.map((s) => [s.name, s]));
	const fallback = new Set(input.fallbackNodes);
	const out: Record<string, CompiledNodeTier> = {};
	for (const node of input.nodes) {
		if (node.type === STICKY_NOTE || failed.has(node.name)) continue;
		const step = steps.get(node.name);
		if (step) {
			if (step.kind === 'code') out[node.name] = 'host';
			else if (step.kind === 'node') {
				out[node.name] =
					step.nodeType !== null && input.libraryTypes.has(step.nodeType) ? 'native' : 'host';
			} else out[node.name] = 'native';
		} else if (fallback.has(node.name)) {
			out[node.name] = 'host';
		} else if (isTriggerType(node.type)) {
			out[node.name] = 'native';
		} else {
			out[node.name] = 'code';
		}
	}
	return out;
}

/**
 * Gives each credential slot of the module the n8n credential that fills it.
 * The converter names a slot after the credential name and type, in the same
 * way for the same workflow, so the names are computed again here.
 */
export function bindSlots(
	nodes: INode[],
	moduleSlots: Array<{ slot: string; type: unknown }>,
	credentialSlots: (uses: Array<{ type: string; name: string }>) => Map<string, string>,
	credentialKey: (type: string, name: string) => string,
): CredentialSlotBinding[] {
	const uses = nodes.flatMap((node) =>
		Object.entries(node.credentials ?? {}).map(([type, ref]) => ({
			type,
			name: ref.name ?? '',
			id: ref.id ?? null,
		})),
	);
	const slotOf = credentialSlots(uses.map(({ type, name }) => ({ type, name })));
	const bySlot = new Map<string, { type: string; name: string; id: string | null }>();
	for (const use of uses) {
		const slot = slotOf.get(credentialKey(use.type, use.name));
		if (slot && !bySlot.has(slot)) bySlot.set(slot, use);
	}
	return moduleSlots.map(({ slot, type }) => {
		const use = bySlot.get(slot);
		return {
			slot,
			type: typeof type === 'string' ? type : (use?.type ?? ''),
			credentialId: use?.id ?? null,
			credentialName: use?.name ?? '',
		};
	});
}

/**
 * The parameter issues of each enabled node, as n8n finds them before a run
 * (`NodeHelpers.getNodeParametersIssues`, with the defaults that `Workflow` sets),
 * as compile diagnostics. A run that starts at a node with issues fails before
 * any node runs (the fallback host runs the same check), and n8n refuses to
 * publish a workflow whose reachable nodes have issues
 * (`WorkflowValidationService`), so the diagnostics are warnings here.
 */
export function parameterIssueDiagnostics(
	nodes: INode[],
	connections: IConnections,
	nodeTypes: INodeTypes,
): CompiledEngineDiagnostic[] {
	// `Workflow` sets the parameter defaults on the nodes it gets: give it copies.
	const workflow = new Workflow({
		nodes: structuredClone(nodes),
		connections,
		active: false,
		nodeTypes,
	});
	const out: CompiledEngineDiagnostic[] = [];
	for (const node of Object.values(workflow.nodes)) {
		if (node.disabled === true || node.type === STICKY_NOTE) continue;
		let issues: ReturnType<typeof NodeHelpers.getNodeParametersIssues>;
		try {
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			issues = NodeHelpers.getNodeParametersIssues(
				nodeType.description.properties,
				node,
				nodeType.description,
			);
		} catch {
			issues = { typeUnknown: true };
		}
		if (issues === null) continue;
		out.push({
			node: node.name,
			severity: 'warning',
			code: 'parameter-issues',
			message: nodeIssuesToString(issues, node).join(' '),
		});
	}
	return out;
}

interface StoredArtifact extends Omit<CompiledArtifact, 'module'> {
	module?: string;
}

/**
 * Converts and compiles workflows with `@n8n/workflow-lang`. Results are kept
 * by a hash of the input, in memory and as files in the data folder, so a
 * version compiles once.
 */
@Service()
export class CompiledWorkflowCompiler {
	private readonly cache = new Map<string, CompiledArtifact>();

	private readonly inFlight = new Map<string, Promise<CompiledArtifact>>();

	/** The files of the cache, bounded by `N8N_COMPILED_ENGINE_ARTIFACT_CACHE_MB`. */
	private readonly artifacts: ArtifactCache;

	constructor(
		private readonly processes: CompiledEngineProcesses,
		private readonly subWorkflows: CompiledSubWorkflowResolver,
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
		private readonly urlService: UrlService,
		private readonly instanceSettings: InstanceSettings,
		config: CompiledEngineConfig,
	) {
		this.logger = this.logger.scoped('compiled-engine');
		this.artifacts = new ArtifactCache(
			join(this.processes.dataDir, 'artifacts'),
			config.artifactCacheMb * 1024 * 1024,
		);
	}

	async compile(input: CompileInput): Promise<CompiledArtifact> {
		const lang = await loadWorkflowLang();
		const subWorkflows = await this.subWorkflows.preload(input.nodes);
		const workflowJson = {
			id: input.id,
			name: input.name,
			nodes: input.nodes,
			connections: input.connections,
			settings: input.settings ?? {},
		};
		const key = createHash('sha256')
			.update(lang.COMPILER_VERSION)
			.update(JSON.stringify(workflowJson))
			.update(JSON.stringify([...subWorkflows.entries()]))
			.update(getGlobalState().defaultTimezone)
			.digest('hex');

		const inMemory = this.cache.get(key);
		if (inMemory) {
			void this.artifacts.touch(key);
			return { ...inMemory, workflowId: input.id, versionId: input.versionId };
		}

		const stored = await this.readCached(key);
		if (stored) {
			this.cache.set(key, stored);
			return { ...stored, workflowId: input.id, versionId: input.versionId };
		}

		const pending = this.inFlight.get(key);
		if (pending) return await pending;

		const work = this.run(lang, key, input, workflowJson, subWorkflows).finally(() =>
			this.inFlight.delete(key),
		);
		this.inFlight.set(key, work);
		return await work;
	}

	private async run(
		lang: Awaited<ReturnType<typeof loadWorkflowLang>>,
		key: string,
		input: CompileInput,
		workflowJson: Record<string, unknown>,
		subWorkflows: Map<string, unknown>,
	): Promise<CompiledArtifact> {
		const startedAt = Date.now();
		// `resolveWorkflow` is read by converters that support Execute Workflow nodes.
		// `timezone` is the instance default (GENERIC_TIMEZONE), for workflows without their own.
		// `instance` is the base URL that nodes get (`additionalData.instanceBaseUrl`) and the
		// instance id, for the links to the workflow that library nodes write (Slack).
		const options: Parameters<typeof lang.convertWorkflow>[1] & {
			resolveWorkflow?: (id: string) => unknown;
			timezone?: string;
			instance?: { baseUrl: string; id: string };
		} = {
			name: input.name,
			resolveWorkflow: (id: string) => subWorkflows.get(id),
			timezone: getGlobalState().defaultTimezone,
			instance: {
				baseUrl: `${this.urlService.getInstanceBaseUrl()}/`,
				id: this.instanceSettings.instanceId,
			},
		};
		const converted = lang.convertWorkflow(workflowJson, options);
		const diagnostics: CompiledEngineDiagnostic[] = converted.diagnostics.map((d) => ({
			...(d.node ? { node: d.node } : {}),
			severity: toSeverity(d.severity),
			code: d.code,
			message: d.message,
			...(d.parameter ? { parameter: d.parameter } : {}),
		}));

		try {
			diagnostics.push(
				...parameterIssueDiagnostics(input.nodes, input.connections, this.nodeTypes),
			);
		} catch (error) {
			this.logger.debug('Could not check the node parameters of the workflow', {
				workflowId: input.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		let module: Buffer | undefined;
		let steps: StepInfo[] = [];
		let libraryTypes = new Set<string>();
		let moduleSlots: Array<{ slot: string; type: unknown }> = [];
		let triggers: unknown[] = [];
		if (converted.ok) {
			const compiled = lang.compile(converted.source, { fileName: '/workflow.ts' });
			for (const d of compiled.diagnostics) {
				diagnostics.push({ severity: 'error', code: d.code, message: d.message });
			}
			for (const d of compiled.warnings ?? []) {
				diagnostics.push({ severity: 'warning', code: d.code, message: d.message });
			}
			if (compiled.ok && compiled.module && compiled.manifest) {
				module = Buffer.from(compiled.module);
				steps = compiled.manifest.steps;
				libraryTypes = new Set(
					compiled.manifest.nodeTypes.filter((t) => t.library).map((t) => t.type),
				);
				moduleSlots = compiled.manifest.credentials;
				triggers = compiled.manifest.triggers;
			}
		}

		const ok = module !== undefined && !diagnostics.some((d) => d.severity === 'error');
		const artifact: CompiledArtifact = {
			key,
			workflowId: input.id,
			versionId: input.versionId,
			ok,
			diagnostics,
			nodes: classifyNodes({
				nodes: input.nodes,
				steps,
				libraryTypes,
				fallbackNodes: converted.fallbackNodes,
				diagnostics,
			}),
			module: ok ? module : undefined,
			slots: bindSlots(input.nodes, moduleSlots, lang.credentialSlots, lang.credentialKey),
			triggers,
			compiledAt: new Date().toISOString(),
		};
		this.logger.debug(
			`Compiled workflow ${input.id} (${ok ? 'ok' : 'with errors'}) in ${Date.now() - startedAt} ms`,
			{ workflowId: input.id },
		);
		this.cache.set(key, artifact);
		await this.writeCached(artifact);
		return artifact;
	}

	private async readCached(key: string): Promise<CompiledArtifact | undefined> {
		try {
			const contents = await this.artifacts.read(key);
			if (contents === undefined) return undefined;
			const stored: StoredArtifact = JSON.parse(contents);
			return {
				...stored,
				module: stored.module ? Buffer.from(stored.module, 'base64') : undefined,
			};
		} catch {
			return undefined;
		}
	}

	private async writeCached(artifact: CompiledArtifact) {
		try {
			const stored: StoredArtifact = {
				...artifact,
				module: artifact.module?.toString('base64'),
			};
			await this.artifacts.write(artifact.key, JSON.stringify(stored));
		} catch (error) {
			this.logger.warn('Could not write the compiled workflow to the cache folder', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
