import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { CodeBuilderSearchResult } from '@n8n/ai-utilities/node-catalog';
import {
	AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES,
	getLegacyBuilderToolNames,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isToolType, isTriggerNodeType } from 'n8n-workflow';
import { z } from 'zod';

import { NodeCatalogService } from '@/node-catalog';

import { BUILDER_TOOLS } from './builder/builder-tool-names';
import { MCP_REGISTRY_PACKAGE_NAME } from '../mcp-registry/node-description-transform';

/**
 * Nodes the agent runtime can execute directly. Triggers are workflow entry
 * points, so they are never valid as standalone agent tools.
 */
export const isExecutableNodeType = (nodeId: string): boolean => !isTriggerNodeType(nodeId);

const hiddenAgentToolNodeTypes = new Set<string>(AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES);

/**
 * Node IDs the agent builder should surface when configuring node-backed
 * tools. For regular nodes marked `usableAsTool`, the loader creates a
 * mirrored `*Tool` node type; native tool nodes already follow this shape.
 * HITL tools are excluded because the builder wires regular executable tools,
 * not approval-gated workflow steps. `AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES`
 * is shared with the frontend tools picker, so discovery and the picker cannot
 * offer different tool sets.
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

	return isToolType(nodeId, { includeHitl: false }) && !isMcpToolNodeType(nodeId);
};

const MCP_CLIENT_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpClientTool';
const isMcpToolNodeType = (nodeId: string): boolean =>
	nodeId === MCP_CLIENT_TOOL_NODE_TYPE || nodeId.startsWith(MCP_REGISTRY_PACKAGE_NAME);

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
		return [this.buildListCredentialsTool(credentialProvider, listCredentialsUsageHint)];
	}

	async searchAgentToolNodes(queries: string[]): Promise<CodeBuilderSearchResult> {
		await this.nodeCatalogService.initialize();
		return await this.nodeCatalogService.searchNodes(queries, {
			nodeFilter: isAgentToolNodeType,
		});
	}

	private buildListCredentialsTool(
		credentialProvider: CredentialProvider,
		usageHint: string,
	): BuiltTool {
		return new Tool(BUILDER_TOOLS.LIST_CREDENTIALS)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.LIST_CREDENTIALS))
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Accepts an optional `types` filter to return only credentials matching the given types. ' +
					usageHint,
			)
			.input(listCredentialsInputSchema)
			.handler(async ({ types }: { types?: string[] }) => {
				const creds = await credentialProvider.list();
				if (!types || types.length === 0) return { credentials: creds };
				const allowed = new Set(types);
				return { credentials: creds.filter((c) => allowed.has(c.type)) };
			})
			.build();
	}
}
