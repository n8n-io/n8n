import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createExploreNodeResourcesTool(context: InstanceAiContext) {
	return createTool({
		id: 'explore-node-resources',
		description:
			"Query real resources for a node's RLC parameters (e.g., list Google Sheets, " +
			"OpenAI models, Slack channels). Uses the node's built-in search/load methods " +
			'with your credentials. Call after discovering nodes and credentials to get real ' +
			'resource IDs instead of placeholders.',
		inputSchema: z.object({
			nodeType: z.string().describe('Node type ID, e.g. "n8n-nodes-base.googleSheets"'),
			version: z.number().describe('Node version, e.g. 4.7'),
			methodName: z
				.string()
				.describe(
					'The method name from the node type definition JSDoc annotation, ' +
						'e.g. "spreadSheetsSearch" from @searchListMethod, "getModels" from @loadOptionsMethod',
				),
			methodType: z
				.enum(['listSearch', 'loadOptions'])
				.describe(
					'The method type: "listSearch" for @searchListMethod annotations (supports filter/pagination), ' +
						'"loadOptions" for @loadOptionsMethod annotations',
				),
			credentialType: z.string().describe('Credential type key, e.g. "googleSheetsOAuth2Api"'),
			credentialId: z.string().describe('Credential ID from list-credentials'),
			filter: z.string().optional().describe('Search/filter text to narrow results'),
			paginationToken: z
				.string()
				.optional()
				.describe('Pagination token from a previous call to get more results'),
			currentNodeParameters: z
				.record(z.unknown())
				.optional()
				.describe(
					'Current node parameters for dependent lookups. Some methods need prior selections — ' +
						'e.g. sheetsSearch needs documentId: { __rl: true, mode: "id", value: "spreadsheetId" } ' +
						'to list sheets within that spreadsheet. Check displayOptions in the type definition.',
				),
		}),
		outputSchema: z.object({
			results: z.array(
				z.object({
					name: z.string(),
					value: z.union([z.string(), z.number(), z.boolean()]),
					url: z.string().optional(),
					description: z.string().optional(),
				}),
			),
			paginationToken: z.unknown().optional(),
			error: z.string().optional(),
		}),
		execute: async (input) => {
			if (!context.nodeService.exploreResources) {
				return {
					results: [],
					error: 'Resource exploration is not available.',
				};
			}

			try {
				const result = await context.nodeService.exploreResources(input);
				return {
					results: result.results,
					paginationToken: result.paginationToken,
				};
			} catch (error) {
				return {
					results: [],
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	});
}
