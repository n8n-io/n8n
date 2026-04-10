import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { fetchWorkflowsFromTemplates } from './template-api';
import { categories } from './types';
import { mermaidStringify } from '../utils/mermaid.utils';

export const searchTemplateStructuresInputSchema = z.object({
	search: z.string().optional().describe('Free-text search query for templates'),
	category: z.enum(categories).optional().describe('Filter by template category'),
	rows: z
		.number()
		.min(1)
		.max(10)
		.optional()
		.describe('Number of templates to return (default: 5, max: 10)'),
});

export function createSearchTemplateStructuresTool() {
	return createTool({
		id: 'search-template-structures',
		description:
			'Search n8n workflow templates and return mermaid diagrams showing their structure. Use this to find reference workflow patterns before building complex workflows.',
		inputSchema: searchTemplateStructuresInputSchema,
		outputSchema: z.object({
			examples: z.array(
				z.object({
					name: z.string(),
					description: z.string().optional(),
					mermaid: z.string(),
				}),
			),
			totalResults: z.number(),
		}),
		execute: async ({
			search,
			category,
			rows,
		}: z.infer<typeof searchTemplateStructuresInputSchema>) => {
			const result = await fetchWorkflowsFromTemplates({ search, category, rows });

			const examples = result.workflows.map((wf) => ({
				name: wf.name,
				description: wf.description,
				mermaid: mermaidStringify(wf, { includeNodeParameters: false }),
			}));

			return {
				examples,
				totalResults: result.totalFound,
			};
		},
	});
}
