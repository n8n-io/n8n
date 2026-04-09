import { Tool } from '@n8n/agents';
import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { NodeSearchEngine } from '@n8n/ai-workflow-builder';
import type { NodeSearchResult } from '@n8n/ai-workflow-builder';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import type {
	IDataObject,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

export interface NodeDescriptor {
	/** Human-readable display name, e.g. "HTTP Request" */
	displayName: string;
	/** Human-readable description, e.g. "Makes HTTP requests to any URL" */
	description: string;
	/** Node type identifier, e.g. 'n8n-nodes-base.httpRequest' */
	nodeType: string;
	/** The primary version number to use when executing this node. */
	nodeTypeVersion: number;
	/** Whether the user has at least one credential configured for this node. */
	hasCredentials: boolean;
	/** Configured credentials for this node, ready to use in run_node_tool */
	credentials: CredentialListItem[];
}

const UI_ONLY_TYPES = new Set([
	'notice',
	'callout',
	'button',
	'hidden',
	'icon',
	'curlImport',
	'workflowSelector',
	'credentialsSelect',
	'credentials',
]);

/**
 * Returns the raw `INodeProperties[]` for a node type, filtered to remove
 * UI-only and node-setting entries that are irrelevant to an LLM agent.
 * Returns `undefined` if the node is not found or not usable as a tool.
 */
export function getNodeSchema(
	nodes: INodeTypeDescription[],
	nodeType: string,
): INodeProperties[] | undefined {
	const node = nodes.find((n) => n.usableAsTool && n.name === nodeType);
	if (!node) return undefined;
	return node.properties.filter((prop) => !UI_ONLY_TYPES.has(prop.type) && !prop.isNodeSetting);
}

function getLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
}

/**
 * Returns a name-indexed Map of `usableAsTool` nodes, keeping the highest
 * version of each type. Used for credential lookup after search and for
 * listing all nodes without a query.
 */
function indexUsableNodes(nodes: INodeTypeDescription[]): Map<string, INodeTypeDescription> {
	const index = new Map<string, INodeTypeDescription>();
	for (const node of nodes) {
		if (!node.usableAsTool) continue;
		const existing = index.get(node.name);
		if (!existing || getLatestVersion(node.version) > getLatestVersion(existing.version)) {
			index.set(node.name, node);
		}
	}
	return index;
}

function toDescriptor(
	node: INodeTypeDescription,
	credsByType: Map<string, CredentialListItem>,
): NodeDescriptor {
	const credentialSlots = (node.credentials ?? []).map((credDef) => credDef.name);
	const credentials = credentialSlots.flatMap((type) => {
		const cred = credsByType.get(type);
		return cred ? [cred] : [];
	});
	return {
		displayName: node.displayName,
		description: node.description,
		nodeType: node.name,
		nodeTypeVersion: getLatestVersion(node.version),
		hasCredentials: credentials.length > 0,
		credentials,
	};
}

/**
 * Returns descriptors for all nodes flagged as `usableAsTool`, deduplicated
 * by node type (highest version wins). When a `credentialProvider` is given,
 * each descriptor is populated with the credentials the user has configured
 * for that node.
 */
export async function listNodes(
	nodes: INodeTypeDescription[],
	credentialProvider?: CredentialProvider,
): Promise<NodeDescriptor[]> {
	const availableCreds = credentialProvider ? await credentialProvider.list() : [];
	const credsByType = new Map(availableCreds.map((cred) => [cred.type, cred]));
	const nodeIndex = indexUsableNodes(nodes);
	return [...nodeIndex.values()].map((node) => toDescriptor(node, credsByType));
}

/**
 * Returns node descriptors relevant to `query`, ranked by relevance and
 * trimmed to `topK`. When `query` is empty, all nodes are returned up to `topK`.
 *
 * Delegates search to `NodeSearchEngine` from the ai-workflow-builder package,
 * which uses `sublimeSearch` (character-level fuzzy matching with bonuses for
 * sequential, camelCase, and separator patterns) across `displayName`, `name`,
 * `codex.alias`, and `description`.
 */
export async function searchNodes(
	nodes: INodeTypeDescription[],
	query: string,
	credentialProvider?: CredentialProvider,
	{ topK = 10 }: { topK?: number; minScore?: number } = {},
): Promise<NodeDescriptor[]> {
	const availableCreds = credentialProvider ? await credentialProvider.list() : [];
	const credsByType = new Map(availableCreds.map((cred) => [cred.type, cred]));
	const nodeIndex = indexUsableNodes(nodes);

	if (!query.trim()) {
		return [...nodeIndex.values()].slice(0, topK).map((node) => toDescriptor(node, credsByType));
	}

	const engine = new NodeSearchEngine([...nodeIndex.values()]);
	return engine
		.searchByName(query, topK)
		.map(({ name }: NodeSearchResult) => toDescriptor(nodeIndex.get(name)!, credsByType));
}

// ---------------------------------------------------------------------------
// TOOLS
// ---------------------------------------------------------------------------

const searchNodesInputSchema = z.object({
	query: z.string().describe('Natural-language description of what you want to do'),
	topK: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
	minScore: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe('Minimum relevance score 0–1 (default 0.1)'),
});

const getNodeSchemaInputSchema = z.object({
	nodeType: z.string().describe('Node type identifier from search_nodes'),
});

const runNodeInputSchema = z.object({
	nodeType: z.string().describe('Node type identifier from search_nodes'),
	nodeTypeVersion: z.number().describe('Node type version from search_nodes'),
	nodeParameters: z
		.record(z.unknown())
		.optional()
		.describe(
			'Static node config. Use expressions like ={{ $json.url }} to reference inputData fields.',
		),
	credentials: z
		.record(z.object({ id: z.string(), name: z.string() }))
		.optional()
		.describe('Credential slot → { id, name }. Copy from search_nodes credentials array.'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe('Runtime input, available as $json inside nodeParameters expressions.'),
});

/**
 * Tool that searches for relevant n8n nodes by keyword query.
 *
 * Delegates to `NodeSearchEngine` from the ai-workflow-builder package across
 * displayName, name, codex aliases, and description. Results are ranked by
 * relevance and trimmed to `topK`. Use `get_node_schema` to inspect parameters,
 * then `run_node_tool` to execute.
 */
export function createSearchNodesTool(
	nodes: INodeTypeDescription[],
	credentialProvider: CredentialProvider,
) {
	return new Tool('search_nodes')
		.description(
			'Search for n8n node tools relevant to your task. ' +
				'Pass a natural-language query (e.g. "send email", "fetch HTTP"). ' +
				'Each result includes: displayName, nodeType, nodeTypeVersion, description, hasCredentials, credentials. ' +
				'Use get_node_schema to inspect parameters, then run_node_tool to execute.',
		)
		.input(searchNodesInputSchema)
		.handler(async ({ query, topK, minScore }) => {
			const tools = await searchNodes(nodes, query, credentialProvider, { topK, minScore });
			return { tools };
		});
}

/**
 * Tool that returns the full parameter schema for a single n8n node type.
 *
 * Call this after search_nodes to understand what nodeParameters a node accepts
 * before calling run_node_tool.
 */
export function createGetNodeSchemaTool(nodes: INodeTypeDescription[]) {
	return new Tool('get_node_schema')
		.description(
			'Return the parameter schema for a specific n8n node type. ' +
				'Each entry describes a parameter the node accepts: type, displayName, description, ' +
				'required, default, and (for options/multiOptions) the allowed values. ' +
				'Nested types: collection → fields, fixedCollection → groups with fields inside. ' +
				'Parameters marked conditional only apply under certain resource/operation combinations. ' +
				'Use this before run_node_tool to understand what to put in nodeParameters.',
		)
		.input(getNodeSchemaInputSchema)
		.handler(async ({ nodeType }) => {
			const schema = getNodeSchema(nodes, nodeType);
			if (!schema) {
				return { error: `No schema found for node type "${nodeType}"` };
			}
			return { nodeType, schema };
		});
}

/**
 * Tool that executes an n8n node for the current request.
 *
 * nodeParameters are validated against the node's pre-generated Zod schema
 * (from @n8n/workflow-sdk) before execution. n8n expression strings are
 * accepted for any field and validated at runtime by the node itself.
 */
export function createRunNodeTool(
	executor: Pick<EphemeralNodeExecutor, 'executeInline'>,
	projectId: string,
) {
	return new Tool('run_node_tool')
		.description(
			'Execute an n8n node for the current request. ' +
				'Use nodeType and nodeTypeVersion from search_nodes. ' +
				'Call get_node_schema first to understand what nodeParameters the node accepts. ' +
				'nodeParameters holds static node config; use n8n expressions like ={{ $json.url }} to map inputData fields. ' +
				'credentials maps slot names to { id, name } — copy from the credentials array in search_nodes. ' +
				'inputData is the runtime payload available as $json inside expressions. ' +
				'Parameters are validated against the node schema before execution.',
		)
		.input(runNodeInputSchema)
		.handler(async ({ nodeType, nodeTypeVersion, nodeParameters, credentials, inputData }) => {
			if (nodeParameters) {
				const { valid, errors } = validateNodeConfig(nodeType, nodeTypeVersion, {
					parameters: nodeParameters,
				});
				if (!valid) {
					return {
						status: 'error',
						message: `Invalid nodeParameters: ${errors.map((e) => e.message).join('; ')}`,
					};
				}
			}

			return await executor.executeInline({
				nodeType,
				nodeTypeVersion,
				nodeParameters: (nodeParameters ?? {}) as INodeParameters,
				credentialDetails: credentials,
				inputData: [{ json: (inputData ?? {}) as IDataObject }],
				projectId,
			});
		});
}
