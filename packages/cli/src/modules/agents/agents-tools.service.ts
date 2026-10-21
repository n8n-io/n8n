import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { CodeBuilderSearchResult } from '@n8n/ai-utilities/node-catalog';
import { getLegacyBuilderToolNames, isAgentToolNodeType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isTriggerNodeType } from 'n8n-workflow';
import { z } from 'zod';

import { NodeCatalogService } from '@/node-catalog';

import { BUILDER_TOOLS } from './builder/builder-tool-names';

/**
 * Nodes the agent runtime can execute directly. Triggers are workflow entry
 * points, so they are never valid as standalone agent tools.
 */
export const isExecutableNodeType = (nodeId: string): boolean => !isTriggerNodeType(nodeId);

export { isAgentToolNodeType };

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
