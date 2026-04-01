import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { fetchTemplateList } from './template-api';
import { categories } from './types';

export function createSearchWorkflowTemplatesTool() {
	return createTool({
		id: 'search-workflow-templates',
		description:
			'Search public n8n workflow templates and return concise template suggestions for inspiration before building.',
		inputSchema: z.object({
			search: z.string().optional().describe('Free-text query for template search'),
			category: z.enum(categories).optional().describe('Optional template category filter'),
			rows: z
				.number()
				.min(1)
				.max(10)
				.optional()
				.describe('Number of templates to return (default: 5, max: 10)'),
		}),
		outputSchema: z.object({
			templates: z.array(
				z.object({
					templateId: z.number(),
					name: z.string(),
					description: z.string().optional(),
				}),
			),
			totalResults: z.number(),
		}),
		execute: async ({ search, category, rows }) => {
			const result = await fetchTemplateList({ search, category, rows });

			const templates = result.workflows.map((template) => ({
				templateId: template.id,
				name: template.name,
				description: template.description,
			}));

			return {
				templates,
				totalResults: result.totalWorkflows,
			};
		},
	});
}
