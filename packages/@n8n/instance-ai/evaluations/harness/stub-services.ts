// ---------------------------------------------------------------------------
// Stub InstanceAiContext services for in-process workflow-build evals.
//
// The goal is to run createInstanceAgent without a running n8n instance.
// `nodeService` is wired to the same node catalogue (`nodes.json`) and the
// same production resolvers (`resolveNodeTypeDefinition`,
// `listNodeDiscriminators`) that the real adapter uses, so the agent sees
// real node metadata — properties, type-definition source, discriminators
// — rather than a stripped-down stub. Other services (workflows,
// credentials, executions, data-tables) return minimal canned data — just
// enough for the `build-workflow` tool path to succeed. The workflow JSON
// is captured via `workflowService.createFromWorkflowJSON` and exposed on
// the capture array returned from `createStubServices`.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/require-await */
// Stub methods must be `async` to satisfy the InstanceAi*Service interfaces
// even though they synchronously return canned data — there's nothing to
// await here.

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { jsonParse } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

// Production resolver functions (pure — only depend on `node:fs` and
// `@n8n/backend-common`'s `safeJoinPath`). Imported via deep relative path
// so the eval stays in lock-step with the real adapter; if production
// changes how it reads `dist/node-definitions/`, evals follow automatically.
import {
	listNodeDiscriminators,
	resolveNodeTypeDefinition,
} from '../../../../cli/src/modules/instance-ai/node-definition-resolver';
import type {
	InstanceAiContext,
	InstanceAiCredentialService,
	InstanceAiDataTableService,
	InstanceAiExecutionService,
	InstanceAiNodeService,
	InstanceAiWorkflowService,
	NodeDescription,
	SearchableNodeDescription,
	WorkflowDetail,
} from '../../src/types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StubServiceHandle {
	context: InstanceAiContext;
	/** Every WorkflowJSON passed to `workflowService.createFromWorkflowJSON`. */
	capturedWorkflows: WorkflowJSON[];
}

export interface CreateStubServicesOptions {
	/**
	 * Absolute path to the nodes.json file produced by
	 * `ai-workflow-builder.ee/pnpm export:nodes`. Required — the agent's
	 * builder sub-agent needs a non-empty node catalogue.
	 */
	nodesJsonPath: string;
	/** Optional user id. */
	userId?: string;
}

export async function createStubServices(
	options: CreateStubServicesOptions,
): Promise<StubServiceHandle> {
	const { searchableNodes, descriptionsByName } = await loadNodeCatalogue(options.nodesJsonPath);
	const nodeDefinitionDirs = resolveEvalNodeDefinitionDirs();
	const capturedWorkflows: WorkflowJSON[] = [];

	const workflowService: InstanceAiWorkflowService = {
		async list() {
			return [];
		},
		async get(workflowId: string) {
			return emptyWorkflowDetail(workflowId);
		},
		async getAsWorkflowJSON(workflowId: string) {
			const latest = capturedWorkflows[capturedWorkflows.length - 1];
			return latest ?? { id: workflowId, name: 'empty', nodes: [], connections: {} };
		},
		async createFromWorkflowJSON(json: WorkflowJSON) {
			capturedWorkflows.push(json);
			return {
				...emptyWorkflowDetail('eval-' + nanoid()),
				name: json.name,
			};
		},
		async updateFromWorkflowJSON(workflowId: string, json: WorkflowJSON) {
			capturedWorkflows.push(json);
			return {
				...emptyWorkflowDetail(workflowId),
				name: json.name,
			};
		},
		async archive() {},
		async delete() {},
		async clearAiTemporary() {},
		async archiveIfAiTemporary() {
			return false;
		},
		async publish() {
			return { activeVersionId: 'eval-version' };
		},
		async unpublish() {},
	};

	const credentialService: InstanceAiCredentialService = {
		async list() {
			return [];
		},
		async get(credentialId: string) {
			return { id: credentialId, name: credentialId, type: 'unknown' };
		},
		async delete() {},
		async test() {
			return { success: false, message: 'stub: credentials unavailable in eval' };
		},
		async searchCredentialTypes() {
			return [];
		},
	};

	const nodeService: InstanceAiNodeService = {
		async listAvailable(opts) {
			const all = searchableNodes.map((node) => {
				const desc = descriptionsByName.get(node.name);
				return {
					name: node.name,
					displayName: node.displayName,
					description: node.description,
					group: desc?.group ?? [],
					// Version arrays list supported versions in ascending order; the
					// latest is the last entry. Returning [0] would surface a stale
					// version to the agent.
					version: Array.isArray(node.version)
						? (node.version[node.version.length - 1] ?? 1)
						: node.version,
				};
			});
			if (!opts?.query) return all;
			const q = opts.query.toLowerCase();
			return all.filter(
				(n) =>
					n.displayName.toLowerCase().includes(q) ||
					n.name.toLowerCase().includes(q) ||
					n.description.toLowerCase().includes(q),
			);
		},
		async getDescription(nodeType: string) {
			const desc = descriptionsByName.get(nodeType);
			if (!desc) {
				throw new Error(`Node type ${nodeType} not found`);
			}
			return desc;
		},
		async listSearchable() {
			return searchableNodes;
		},
		// Real type-definition source from `dist/node-definitions/`. Falls back
		// to a clear message when the nodes packages haven't been built yet
		// (`pnpm build` from the repo root produces them) — matches production's
		// behavior when node-definition dirs are missing.
		getNodeTypeDefinition: async (nodeType, opts) => {
			if (nodeDefinitionDirs.length === 0) {
				return {
					content: '',
					error:
						'Node type definitions are not available in this eval run. ' +
						'Run `pnpm build` in packages/nodes-base and packages/@n8n/nodes-langchain ' +
						'to generate dist/node-definitions/.',
				};
			}
			const result = resolveNodeTypeDefinition(nodeType, nodeDefinitionDirs, opts);
			if (result.error) return { content: '', error: result.error };
			return { content: result.content, version: result.version };
		},
		listDiscriminators: async (nodeType) => {
			if (nodeDefinitionDirs.length === 0) return null;
			return listNodeDiscriminators(nodeType, nodeDefinitionDirs);
		},
	};

	const executionService: InstanceAiExecutionService = {
		async list() {
			return [];
		},
		// `verify-built-workflow` invokes `executionService.run()` after
		// `submit-workflow` has captured the TS-compiled workflow JSON. The eval
		// has no execution backend, but we want the builder agent's submit →
		// verify → done sequence to complete cleanly so the production briefing
		// (`DETACHED_BUILDER_REQUIREMENTS`) reads coherently. Returning a
		// synthetic success here lets the agent terminate after submit. The
		// eval's `buildSuccess` metric is derived from `submit-workflow` capture
		// — never from this synthetic verdict — so this can't inflate the score.
		async run(workflowId) {
			return {
				executionId: 'eval-exec-' + nanoid(),
				status: 'success' as const,
				data: { __eval_synthetic_verify__: [{ workflowId }] },
				startedAt: new Date().toISOString(),
				finishedAt: new Date().toISOString(),
			};
		},
		async getStatus() {
			return stubExecutionResult('stub: execution disabled in eval');
		},
		async getResult() {
			return stubExecutionResult('stub: execution disabled in eval');
		},
		async stop() {
			return { success: false, message: 'stub: execution disabled in eval' };
		},
		async getDebugInfo() {
			return {
				...stubExecutionResult('stub: execution disabled in eval'),
				nodeTrace: [],
			};
		},
		async getNodeOutput(_executionId: string, nodeName: string) {
			return {
				nodeName,
				items: [],
				totalItems: 0,
				returned: { from: 0, to: 0 },
			};
		},
	};

	const dataTableService: InstanceAiDataTableService = {
		async list() {
			return [];
		},
		async create(name: string) {
			return {
				id: 'eval-dt-' + nanoid(),
				name,
				columns: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		},
		async delete() {},
		async getSchema() {
			return [];
		},
		async addColumn(_dataTableId: string, column) {
			return { id: 'col-' + nanoid(), name: column.name, type: column.type, index: 0 };
		},
		async deleteColumn() {},
		async renameColumn() {},
		async queryRows() {
			return { count: 0, data: [] };
		},
		async insertRows(dataTableId: string) {
			return {
				insertedCount: 0,
				dataTableId,
				tableName: 'stub-table',
				projectId: 'stub-project',
			};
		},
		async updateRows(dataTableId: string) {
			return {
				updatedCount: 0,
				dataTableId,
				tableName: 'stub-table',
				projectId: 'stub-project',
			};
		},
		async deleteRows(dataTableId: string) {
			return {
				deletedCount: 0,
				dataTableId,
				tableName: 'stub-table',
				projectId: 'stub-project',
			};
		},
	};

	const context: InstanceAiContext = {
		userId: options.userId ?? 'eval-user',
		workflowService,
		executionService,
		credentialService,
		nodeService,
		dataTableService,
	};

	return { context, capturedWorkflows };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NodeCatalogue {
	searchableNodes: SearchableNodeDescription[];
	/** Indexed by node `name` for O(1) `getDescription` lookups. */
	descriptionsByName: Map<string, NodeDescription>;
}

async function loadNodeCatalogue(jsonPath: string): Promise<NodeCatalogue> {
	let content: string;
	try {
		content = await fs.readFile(jsonPath, 'utf8');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Could not read node catalogue at ${jsonPath}: ${message}\n` +
				'Run `pnpm export:nodes` in packages/@n8n/ai-workflow-builder.ee to generate it, ' +
				'or pass --nodes-json <path> to point at an existing file.',
		);
	}

	const parsed = jsonParse<unknown>(content, {
		errorMessage: `Could not parse node catalogue at ${jsonPath} as JSON`,
	});
	if (!Array.isArray(parsed)) {
		throw new Error(`Expected ${jsonPath} to contain a JSON array of node descriptions.`);
	}

	const searchableNodes: SearchableNodeDescription[] = [];
	const descriptionsByName = new Map<string, NodeDescription>();
	for (const entry of parsed) {
		const searchable = coerceSearchableNode(entry);
		searchableNodes.push(searchable);
		// `coerceNodeDescription` mirrors the production adapter's mapping in
		// `instance-ai.adapter.service.ts#getDescription`. Keep the two in sync
		// when adding new fields to `NodeDescription`.
		descriptionsByName.set(searchable.name, coerceNodeDescription(entry, searchable));
	}
	return { searchableNodes, descriptionsByName };
}

function coerceSearchableNode(entry: unknown): SearchableNodeDescription {
	if (!isRecord(entry)) {
		throw new Error(`Invalid node entry in catalogue: ${JSON.stringify(entry)}`);
	}

	const name = typeof entry.name === 'string' ? entry.name : undefined;
	const displayName =
		typeof entry.displayName === 'string' ? entry.displayName : (name ?? 'Unknown node');
	const description = typeof entry.description === 'string' ? entry.description : '';
	const version = coerceVersion(entry.version);
	const inputs = coerceStringList(entry.inputs) ?? ['main'];
	const outputs = coerceStringList(entry.outputs) ?? ['main'];

	if (!name) {
		throw new Error(`Node entry missing name: ${JSON.stringify(entry)}`);
	}

	const codex = coerceCodex(entry.codex);
	const builderHint = coerceBuilderHint(entry.builderHint);

	return {
		name,
		displayName,
		description,
		version,
		inputs,
		outputs,
		// Preserve fields used by NodeSearchEngine relevance scoring and
		// builder hints so eval runs see the same metadata as production.
		...(codex ? { codex } : {}),
		...(builderHint ? { builderHint } : {}),
	};
}

/**
 * Build a `NodeDescription` from a raw `nodes.json` entry, mirroring the
 * shape produced by the production adapter (`instance-ai.adapter.service.ts`
 * `getDescription`). The eval reuses the searchable-node coercion for the
 * fields they share (name/displayName/description/version) and adds the
 * richer fields the agent's tools rely on (properties, credentials, inputs,
 * outputs, webhooks, polling, triggerPanel).
 */
function coerceNodeDescription(
	entry: unknown,
	searchable: SearchableNodeDescription,
): NodeDescription {
	const record: Record<string, unknown> = isRecord(entry) ? entry : {};
	const group = coerceStringList(record.group) ?? [];
	const versionField = searchable.version;
	const version = Array.isArray(versionField)
		? (versionField[versionField.length - 1] ?? 1)
		: versionField;

	const properties = Array.isArray(record.properties)
		? record.properties.flatMap((p): NodeDescription['properties'] => {
				if (!isRecord(p) || typeof p.name !== 'string' || typeof p.type !== 'string') return [];
				const displayName = typeof p.displayName === 'string' ? p.displayName : p.name;
				const required = typeof p.required === 'boolean' ? p.required : undefined;
				const description = typeof p.description === 'string' ? p.description : undefined;
				const options = Array.isArray(p.options)
					? p.options.flatMap((o): Array<{ name: string; value: string | number | boolean }> => {
							if (!isRecord(o) || !('name' in o) || !('value' in o)) return [];
							const optName = typeof o.name === 'string' ? o.name : String(o.name);
							const optValue = o.value;
							if (
								typeof optValue !== 'string' &&
								typeof optValue !== 'number' &&
								typeof optValue !== 'boolean'
							) {
								return [];
							}
							return [{ name: optName, value: optValue }];
						})
					: undefined;
				return [
					{
						displayName,
						name: p.name,
						type: p.type,
						...(required !== undefined ? { required } : {}),
						...(description !== undefined ? { description } : {}),
						default: p.default,
						...(options ? { options } : {}),
					},
				];
			})
		: [];

	const credentials = Array.isArray(record.credentials)
		? record.credentials.flatMap((c): NonNullable<NodeDescription['credentials']> => {
				if (!isRecord(c) || typeof c.name !== 'string') return [];
				return [
					{
						name: c.name,
						...(typeof c.required === 'boolean' ? { required: c.required } : {}),
						...(isRecord(c.displayOptions) ? { displayOptions: c.displayOptions } : {}),
					},
				];
			})
		: undefined;

	const inputs = coerceStringList(searchable.inputs) ?? ['main'];
	const outputs = coerceStringList(searchable.outputs) ?? ['main'];

	return {
		name: searchable.name,
		displayName: searchable.displayName,
		description: searchable.description,
		group,
		version,
		properties,
		...(credentials && credentials.length > 0 ? { credentials } : {}),
		inputs,
		outputs,
		...(Array.isArray(record.webhooks) ? { webhooks: record.webhooks } : {}),
		...(typeof record.polling === 'boolean' ? { polling: record.polling } : {}),
		...(record.triggerPanel !== undefined ? { triggerPanel: record.triggerPanel } : {}),
	};
}

function coerceCodex(value: unknown): SearchableNodeDescription['codex'] | undefined {
	if (!isRecord(value)) return undefined;
	const aliases = coerceStringList(value.alias);
	if (!aliases) return undefined;
	return { alias: aliases };
}

function coerceBuilderHint(value: unknown): SearchableNodeDescription['builderHint'] | undefined {
	if (!isRecord(value)) return undefined;
	const hint: NonNullable<SearchableNodeDescription['builderHint']> = {};
	if (typeof value.message === 'string') hint.message = value.message;
	const inputs = coerceHintPortMap(value.inputs);
	if (inputs) hint.inputs = inputs;
	const outputs = coerceHintPortMap(value.outputs);
	if (outputs) hint.outputs = outputs;
	return Object.keys(hint).length > 0 ? hint : undefined;
}

function coerceHintPortMap(
	value: unknown,
): Record<string, { required: boolean; displayOptions?: Record<string, unknown> }> | undefined {
	if (!isRecord(value)) return undefined;
	const result: Record<string, { required: boolean; displayOptions?: Record<string, unknown> }> =
		{};
	for (const [key, raw] of Object.entries(value)) {
		if (!isRecord(raw)) continue;
		const required = typeof raw.required === 'boolean' ? raw.required : false;
		const entry: { required: boolean; displayOptions?: Record<string, unknown> } = { required };
		if (isRecord(raw.displayOptions)) entry.displayOptions = raw.displayOptions;
		result[key] = entry;
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function coerceVersion(value: unknown): number | number[] {
	if (typeof value === 'number') return value;
	if (Array.isArray(value)) {
		const numbers = value.filter((v): v is number => typeof v === 'number');
		if (numbers.length > 0) return numbers;
	}
	return 1;
}

function coerceStringList(value: unknown): string[] | undefined {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) {
		const strings = value.filter((v): v is string => typeof v === 'string');
		if (strings.length === value.length) return strings;
	}
	return undefined;
}

function emptyWorkflowDetail(id: string): WorkflowDetail {
	const now = new Date().toISOString();
	return {
		id,
		name: 'eval-workflow',
		versionId: 'v1',
		activeVersionId: null,
		createdAt: now,
		updatedAt: now,
		nodes: [],
		connections: {},
	};
}

function stubExecutionResult(message: string) {
	const now = new Date().toISOString();
	return {
		executionId: 'eval-exec-' + nanoid(),
		status: 'error' as const,
		error: message,
		startedAt: now,
		finishedAt: now,
	};
}

// ---------------------------------------------------------------------------
// Resolve nodes.json path from sibling package
// ---------------------------------------------------------------------------

/**
 * Resolve the default node-catalogue path inside
 * `packages/@n8n/ai-workflow-builder.ee/evaluations/`. Pass `--nodes-json
 * <path>` (or `nodesJsonPath`) to point at a different file.
 */
export function defaultNodesJsonPath(): string {
	const siblingPackage = path.resolve(
		__dirname,
		'..',
		'..',
		'..',
		'ai-workflow-builder.ee',
		'evaluations',
	);
	return path.join(siblingPackage, 'nodes.json');
}

/**
 * Resolve the workspace-relative `dist/node-definitions/` directories the
 * production resolver expects. Production reads them via
 * `require.resolve('n8n-nodes-base/package.json')`, but adding those heavy
 * packages as direct deps of `instance-ai` just for evals is wasteful — the
 * eval already lives in the monorepo, so we walk up to `packages/` and
 * point at the built dist dirs directly.
 *
 * Returns an empty array if neither package has been built. Callers should
 * surface a clear error rather than silently degrading the agent's view.
 */
export function resolveEvalNodeDefinitionDirs(): string[] {
	const packagesRoot = path.resolve(__dirname, '..', '..', '..', '..');
	const candidates = [
		path.join(packagesRoot, 'nodes-base', 'dist', 'node-definitions'),
		path.join(packagesRoot, '@n8n', 'nodes-langchain', 'dist', 'node-definitions'),
	];
	return candidates.filter((dir) => existsSync(dir));
}
