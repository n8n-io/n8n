import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeWebContent, wrapInBoundaryTags } from './sanitize-web-content';
import type { InstanceAiContext } from '../../types';

export function createFetchUrlTool(context: InstanceAiContext) {
	return createTool({
		id: 'fetch-url',
		description:
			'Fetch a web page and extract its content as markdown. Use for reading documentation pages, API references, or guides from known URLs.',
		inputSchema: z.object({
			url: z.string().url().describe('URL of the page to fetch'),
			maxContentLength: z
				.number()
				.int()
				.positive()
				.max(100_000)
				.default(30_000)
				.optional()
				.describe('Maximum content length in characters (default 30000)'),
		}),
		outputSchema: z.object({
			url: z.string(),
			finalUrl: z.string(),
			title: z.string(),
			content: z.string(),
			truncated: z.boolean(),
			contentLength: z.number(),
			safetyFlags: z
				.object({
					jsRenderingSuspected: z.boolean().optional(),
					loginRequired: z.boolean().optional(),
				})
				.optional(),
		}),
		execute: async ({ url, maxContentLength }) => {
			if (!context.webResearchService) {
				return {
					url,
					finalUrl: url,
					title: '',
					content: 'Web research is not available in this environment.',
					truncated: false,
					contentLength: 0,
				};
			}

			const result = await context.webResearchService.fetchUrl(url, {
				maxContentLength: maxContentLength ?? undefined,
			});
			result.content = wrapInBoundaryTags(sanitizeWebContent(result.content), result.finalUrl);
			return result;
		},
	});
}
