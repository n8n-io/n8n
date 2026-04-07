import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { fetchWorkflowsFromTemplates } from './template-api';
import { categories } from './types';
import {
	collectNodeConfigurationsFromWorkflows,
	formatNodeConfigurationExamples,
} from '../utils/node-configuration.utils';

export function createSearchTemplateParametersTool() {
	return createTool({
		id: 'search-template-parameters',
		description:
			'Search n8n workflow templates and return node parameter configurations showing how specific nodes are typically set up. Use this to understand how nodes should be configured.',
		inputSchema: z.object({
			search: z.string().optional().describe('Free-text search query for templates'),
			category: z.enum(categories).optional().describe('Filter by template category'),
			rows: z
				.number()
				.min(1)
				.max(10)
				.optional()
				.describe('Number of templates to search (default: 5, max: 10)'),
			nodeType: z
				.string()
				.optional()
				.describe(
					'Filter to show configurations for a specific node type only (e.g. "n8n-nodes-base.telegram")',
				),
		}),
		outputSchema: z.object({
			configurations: z.record(
				z.string(),
				z.array(
					z.object({
						version: z.number(),
						parameters: z.record(z.string(), z.unknown()),
					}),
				),
			),
			nodeTypes: z.array(z.string()),
			totalTemplatesSearched: z.number(),
			formatted: z.string(),
		}),
		execute: async ({ search, category, rows, nodeType }) => {
			const result = await fetchWorkflowsFromTemplates({ search, category, rows });

			const allConfigurations = collectNodeConfigurationsFromWorkflows(result.workflows);

			// Filter by nodeType if specified
			let filteredConfigurations = allConfigurations;
			if (nodeType) {
				const matching = allConfigurations[nodeType];
				filteredConfigurations = matching ? { [nodeType]: matching } : {};
			}

			// Format as readable text
			const nodeTypes = Object.keys(filteredConfigurations);
			const formattedParts = nodeTypes.map((nt) =>
				formatNodeConfigurationExamples(nt, filteredConfigurations[nt], undefined, 3),
			);

			return {
				configurations: filteredConfigurations,
				nodeTypes,
				totalTemplatesSearched: result.totalFound,
				formatted: formattedParts.join('\n\n'),
			};
		},
	});
}
