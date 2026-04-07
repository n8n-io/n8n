import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeWebContent } from './sanitize-web-content';
import type { InstanceAiContext } from '../../types';

export const webSearchInputSchema = z.object({
	query: z
		.string()
		.describe('Search query. Be specific — include service names, API versions, error codes.'),
	maxResults: z
		.number()
		.int()
		.min(1)
		.max(20)
		.default(5)
		.optional()
		.describe('Maximum number of results to return (default 5, max 20)'),
	includeDomains: z
		.array(z.string())
		.optional()
		.describe('Restrict results to these domains, e.g. ["docs.stripe.com"]'),
});

export function createWebSearchTool(context: InstanceAiContext) {
	return createTool({
		id: 'web-search',
		description:
			'Search the web for information. Returns ranked results with titles, URLs, ' +
			'and snippets. Use for API docs, integration guides, error messages, and ' +
			'general technical questions.',
		inputSchema: webSearchInputSchema,
		outputSchema: z.object({
			query: z.string(),
			results: z.array(
				z.object({
					title: z.string(),
					url: z.string(),
					snippet: z.string(),
					publishedDate: z.string().optional(),
				}),
			),
		}),
		execute: async ({
			query,
			maxResults,
			includeDomains,
		}: z.infer<typeof webSearchInputSchema>) => {
			if (!context.webResearchService?.search) {
				return {
					query,
					results: [],
				};
			}

			const result = await context.webResearchService.search(query, {
				maxResults: maxResults ?? undefined,
				includeDomains: includeDomains ?? undefined,
			});
			// Sanitize search result snippets to remove hidden injection payloads
			for (const r of result.results) {
				r.snippet = sanitizeWebContent(r.snippet);
			}
			return result;
		},
	});
}
