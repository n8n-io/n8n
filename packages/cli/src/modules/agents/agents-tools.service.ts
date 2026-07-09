import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES,
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isToolType, isTriggerNodeType } from 'n8n-workflow';
import { z } from 'zod';

import { NodeCatalogService } from '@/node-catalog';
import { isAgentProviderNode } from '@/node-execution';

import { MCP_REGISTRY_PACKAGE_NAME } from '../mcp-registry/node-description-transform';

type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: number;
			resource?: string;
			operation?: string;
			mode?: string;
	  };

/**
 * Nodes the agent runtime can execute directly. Triggers are workflow entry
 * points, so they are never valid as standalone agent tools.
 */
export const isExecutableNodeType = (nodeId: string): boolean => !isTriggerNodeType(nodeId);

const hiddenAgentToolNodeTypes = new Set<string>(AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES);
const aiUtilityAgentToolNodeTypes = new Set<string>(
	AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES,
);

/**
 * Node IDs the agent builder should surface when configuring node-backed
 * tools. For regular nodes marked `usableAsTool`, the loader creates a
 * mirrored `*Tool` node type; native tool nodes already follow this shape.
 * HITL tools are excluded because the builder wires regular executable tools,
 * not approval-gated workflow steps. Provider nodes (OpenAI etc.) are
 * admitted via the explicit whitelist — they ship the full vendor API
 * (image, audio, …) but lack the `usableAsTool` flag.
 * Frontend-hidden tool variants are excluded here too, so `search_nodes`
 * cannot offer tools the modal intentionally hides.
 *
 * Exported as a stable reference so the catalog service can cache its
 * filtered search tool per filter identity.
 */
export const isAgentToolNodeType = (nodeId: string): boolean => {
	if (!isExecutableNodeType(nodeId)) {
		return false;
	}
	if (hiddenAgentToolNodeTypes.has(nodeId)) {
		return false;
	}

	const isAllowedAiUtilityTool = aiUtilityAgentToolNodeTypes.has(nodeId);
	const isAllowedTool = isToolType(nodeId, { includeHitl: false }) && !isMcpToolNodeType(nodeId);
	const isAllowedProviderNode = isAgentProviderNode(nodeId);
	return isAllowedAiUtilityTool || isAllowedTool || isAllowedProviderNode;
};

const MCP_CLIENT_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpClientTool';
const isMcpToolNodeType = (nodeId: string): boolean =>
	nodeId === MCP_CLIENT_TOOL_NODE_TYPE || nodeId.startsWith(MCP_REGISTRY_PACKAGE_NAME);

const searchNodesInputSchema = z.object({
	queries: z.array(z.string()).min(1).describe('Search queries (e.g., ["gmail", "slack", "http"])'),
});

const nodeVersionSchema = z.number().describe('Tool node type version from search_nodes');

const getNodeTypesInputSchema = z.object({
	nodeIds: z
		.array(
			z.union([
				z.string(),
				z.object({
					nodeId: z.string(),
					version: nodeVersionSchema.optional(),
					resource: z.string().optional(),
					operation: z.string().optional(),
					mode: z.string().optional(),
				}),
			]),
		)
		.min(1)
		.describe('Tool node IDs from search_nodes (e.g., ["n8n-nodes-base.gmailTool"])'),
});

const listCredentialsInputSchema = z.object({
	types: z
		.array(z.string())
		.optional()
		.describe(
			'Optional credential types to filter by (e.g., ["gmailOAuth2", "httpHeaderAuth"]). ' +
				'When omitted, returns all credentials. Use the credential types declared in the ' +
				'node schema from get_node_types to narrow the results.',
		),
});

@Service()
export class AgentsToolsService {
	constructor(private readonly nodeCatalogService: NodeCatalogService) {}

	/**
	 * Tools usable by the builder while configuring node-backed tools.
	 * `listCredentialsUsageHint` lets callers tailor the credential guidance.
	 */
	getSharedTools(
		credentialProvider: CredentialProvider,
		listCredentialsUsageHint: string,
	): BuiltTool[] {
		return [
			this.buildSearchNodesTool(),
			this.buildGetNodeTypesTool(),
			this.buildListCredentialsTool(credentialProvider, listCredentialsUsageHint),
		];
	}

	private buildSearchNodesTool(): BuiltTool {
		return new Tool('search_nodes')
			.description(
				'Search for n8n nodes by name or service. Use this to find nodes that can be executed. ' +
					'Returns tool node IDs, display names, versions, and descriptions. ' +
					'After finding a node, call get_node_types to get its parameter schema.',
			)
			.input(searchNodesInputSchema)
			.handler(async ({ queries }: { queries: string[] }) => {
				await this.nodeCatalogService.initialize();
				const { results } = await this.nodeCatalogService.searchNodes(queries, {
					nodeFilter: isAgentToolNodeType,
				});
				return { results };
			})
			.build();
	}

	private buildGetNodeTypesTool(): BuiltTool {
		return new Tool('get_node_types')
			.description(
				'Get detailed parameter schema for specific n8n nodes. Use the node IDs returned ' +
					'by search_nodes. Returns parameter definitions needed to configure a node for execution. ' +
					'Use the tool node IDs from search_nodes. ' +
					'You can optionally filter by resource/operation/mode.',
			)
			.input(getNodeTypesInputSchema)
			.handler(async ({ nodeIds }: { nodeIds: NodeRequest[] }) => {
				await this.nodeCatalogService.initialize();
				const results = await this.nodeCatalogService.getNodeTypes(
					nodeIds.map(normalizeNodeRequestForCatalog),
				);
				return { results };
			})
			.build();
	}

	private buildListCredentialsTool(
		credentialProvider: CredentialProvider,
		usageHint: string,
	): BuiltTool {
		return new Tool('list_credentials')
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Accepts an optional `types` filter to return only credentials matching the given types. ' +
					usageHint,
			)
			.input(listCredentialsInputSchema)
			.handler(async ({ types }) => {
				const creds = await credentialProvider.list();
				if (!types || types.length === 0) return { credentials: creds };
				const allowed = new Set(types);
				return { credentials: creds.filter((c) => allowed.has(c.type)) };
			})
			.build();
	}
}

/**
 * The catalog's `getNodeTypes` signature expects `version` as a string (matching the
 * builder tool's wire format); adapt at the boundary.
 */
function normalizeNodeRequestForCatalog(req: NodeRequest):
	| string
	| {
			nodeId: string;
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
	  } {
	if (typeof req === 'string') return req;
	const { version, ...rest } = req;
	return version === undefined ? rest : { ...rest, version: String(version) };
}
