import type { CheckpointStore, ModelConfig, SerializableAgentState } from '@n8n/agents';
import { Agent } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { INodeType, IVersionedNodeType } from 'n8n-workflow';

import { NodeCatalogService } from '@/node-catalog';
import { NodeTypes } from '@/node-types';

import { BUILDER_V2_SYSTEM_PROMPT } from './prompts/system-prompt';
import type { RunStateRegistry } from './session/run-state-registry';
import { createAiAgentBuildGuideTool } from './tools/ai-agent-build-guide.tool';
import { createCommitNodeTool } from './tools/commit-node.tool';
import {
	createGetNodeSchemaTool,
	createGetNodeSchemasTool,
	type LookupNodeSchema,
	type LookupNodeSchemas,
	type NodeSchemaRequest,
} from './tools/get-node-schema.tool';
import { createProposeNodesTool, type ResolveNodeVersion } from './tools/propose-nodes.tool';
import { createUpdateTaskListTool } from './tools/update-task-list.tool';
import { createVerifyNodeTool } from './tools/verify-node.tool';
import type { LookupNodeDescription } from './utils/node-filter';

export interface BuildAgentOptions {
	sessionId: string;
	registry: RunStateRegistry;
	/** Pre-resolved model config (caller resolves via AgentsBuilderSettingsService). */
	modelConfig: ModelConfig;
	/**
	 * Optional override for node-type lookup. Tests inject a stub that resolves
	 * canonical node types without requiring `LoadNodesAndCredentials` to be
	 * fully initialized. In production this defaults to the DI-resolved
	 * `NodeTypes` service.
	 */
	lookupNodeDescription?: LookupNodeDescription;
	/**
	 * Optional override for choosing the current installed node version. Tests
	 * inject this so proposals can be normalized without loading real nodes.
	 */
	resolveNodeVersion?: ResolveNodeVersion;
	/**
	 * Optional override for parameter-schema lookups. Tests inject a stub so
	 * `get_node_schema` returns canned strings without requiring the full node
	 * catalog. In production this defaults to
	 * `NodeCatalogService.getNodeTypes(...)`.
	 */
	lookupNodeSchema?: LookupNodeSchema;
	/**
	 * Optional override for batched parameter-schema lookups. In production
	 * this defaults to a single NodeCatalogService.getNodeTypes([...]) call.
	 */
	lookupNodeSchemas?: LookupNodeSchemas;
}

/**
 * Resolve a node-type description via the DI-registered `NodeTypes` service.
 * Returns `null` for unknown nodes or invalid versions.
 */
export function defaultLookupNodeDescription(nodeType: string, version: number) {
	try {
		const nodeTypes = Container.get(NodeTypes);
		return nodeTypes.getByNameAndVersion(nodeType, version).description;
	} catch {
		return null;
	}
}

function isVersionedNodeType(
	nodeType: INodeType | IVersionedNodeType,
): nodeType is IVersionedNodeType {
	return 'currentVersion' in nodeType && 'nodeVersions' in nodeType;
}

function getDescriptionVersion(
	descriptionVersion: INodeType['description']['version'],
): number | null {
	if (typeof descriptionVersion === 'number') return descriptionVersion;
	if (Array.isArray(descriptionVersion) && descriptionVersion.length > 0) {
		return Math.max(...descriptionVersion);
	}
	return null;
}

function defaultResolveNodeVersion(nodeType: string): number | null {
	try {
		const node = Container.get(NodeTypes).getByName(nodeType);
		if (isVersionedNodeType(node)) return node.currentVersion;
		return getDescriptionVersion(node.description.version);
	} catch {
		return null;
	}
}

/**
 * Resolve a node's parameter schema via the DI-registered
 * `NodeCatalogService`. Falls back to a friendly error message when the
 * catalog is unavailable so the LLM can keep going.
 */
async function defaultLookupNodeSchema(input: {
	nodeType: string;
	version: number;
	resource?: string;
	operation?: string;
}): Promise<string> {
	return await defaultLookupNodeSchemas([input]);
}

async function defaultLookupNodeSchemas(inputs: NodeSchemaRequest[]): Promise<string> {
	const catalog = Container.get(NodeCatalogService);
	await catalog.initialize();
	const requests = inputs.map((input) => ({
		nodeId: input.nodeType,
		version: String(input.version),
		...(input.resource ? { resource: input.resource } : {}),
		...(input.operation ? { operation: input.operation } : {}),
	}));
	return await catalog.getNodeTypes(requests);
}

/**
 * Build a per-session Agent instance. Per-request rebuild pattern, mirroring
 * `AgentsBuilderService.createBuilderAgent`. The agent picks up its suspended
 * state via the SDK's `resume` mechanism + the shared CheckpointStore.
 */
export function createBuilderAgent(options: BuildAgentOptions): Agent {
	const { sessionId, registry, modelConfig } = options;
	const lookupNodeDescription = options.lookupNodeDescription ?? defaultLookupNodeDescription;
	const resolveNodeVersion = options.resolveNodeVersion ?? defaultResolveNodeVersion;
	const lookupNodeSchema = options.lookupNodeSchema ?? defaultLookupNodeSchema;
	const lookupNodeSchemas =
		options.lookupNodeSchemas ??
		(async (inputs: NodeSchemaRequest[]) =>
			options.lookupNodeSchema
				? (await Promise.all(inputs.map(async (input) => await lookupNodeSchema(input)))).join(
						'\n\n',
					)
				: await defaultLookupNodeSchemas(inputs));
	// Resolve a logger via DI when available; fall back to console for tests
	// that haven't wired a Logger mock yet.
	let toolLogger: {
		debug: (m: string, x?: Record<string, unknown>) => void;
		warn: (m: string, x?: Record<string, unknown>) => void;
	} = console;
	try {
		const di = Container.get(Logger);
		toolLogger = {
			debug: (m, x) => di.debug(m, x),
			warn: (m, x) => di.warn(m, x),
		};
	} catch {
		// Use console fallback.
	}

	const checkpointStore: CheckpointStore = {
		async save(key: string, state: SerializableAgentState): Promise<void> {
			registry.saveCheckpoint(`${sessionId}:${key}`, state);
			return await Promise.resolve();
		},
		async load(key: string): Promise<SerializableAgentState | undefined> {
			return await Promise.resolve(registry.loadCheckpoint(`${sessionId}:${key}`));
		},
		async delete(key: string): Promise<void> {
			registry.deleteCheckpoint(`${sessionId}:${key}`);
			return await Promise.resolve();
		},
	};

	const agent = new Agent('workflow-builder-v2')
		.model(modelConfig)
		.instructions(BUILDER_V2_SYSTEM_PROMPT)
		.checkpoint(checkpointStore)
		.toolCallConcurrency(1)
		.tool(createUpdateTaskListTool(registry, sessionId))
		.tool(createVerifyNodeTool(lookupNodeDescription, resolveNodeVersion))
		.tool(createAiAgentBuildGuideTool())
		.tool(
			createProposeNodesTool(
				registry,
				sessionId,
				lookupNodeDescription,
				resolveNodeVersion,
				toolLogger,
			),
		)
		.tool(createGetNodeSchemaTool(lookupNodeSchema))
		.tool(createGetNodeSchemasTool(lookupNodeSchemas))
		.tool(createCommitNodeTool(registry, sessionId, lookupNodeDescription, toolLogger));

	return agent;
}
