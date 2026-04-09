import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeWebContent, wrapInBoundaryTags } from './sanitize-web-content';
import {
	checkDomainAccess,
	applyDomainAccessResume,
	domainGatingSuspendSchema,
	domainGatingResumeSchema,
} from '../../domain-access';
import type { InstanceAiContext } from '../../types';

export const fetchUrlInputSchema = z.object({
	url: z.string().url().describe('URL of the page to fetch'),
	maxContentLength: z
		.number()
		.int()
		.positive()
		.max(100_000)
		.default(30_000)
		.optional()
		.describe('Maximum content length in characters (default 30000)'),
});

export function createFetchUrlTool(context: InstanceAiContext) {
	return createTool({
		id: 'fetch-url',
		description:
			'Fetch a web page and extract its content as markdown. Use for reading documentation pages, API references, or guides from known URLs.',
		inputSchema: fetchUrlInputSchema,
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
		suspendSchema: domainGatingSuspendSchema,
		resumeSchema: domainGatingResumeSchema,
		execute: async (input: z.infer<typeof fetchUrlInputSchema>, ctx) => {
			if (!context.webResearchService) {
				return {
					url: input.url,
					finalUrl: input.url,
					title: '',
					content: 'Web research is not available in this environment.',
					truncated: false,
					contentLength: 0,
				};
			}

			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof domainGatingResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			// ── Resume path: apply user's domain decision ──────────────────
			if (resumeData !== undefined && resumeData !== null) {
				let host: string;
				try {
					host = new URL(input.url).hostname;
				} catch {
					host = input.url;
				}
				const { proceed } = applyDomainAccessResume({
					resumeData,
					host,
					tracker: context.domainAccessTracker,
					runId: context.runId,
				});
				if (!proceed) {
					return {
						url: input.url,
						finalUrl: input.url,
						title: '',
						content: 'User denied access to this URL.',
						truncated: false,
						contentLength: 0,
					};
				}
			}

			// ── Initial check: is the URL's host allowed? ──────────────────
			if (resumeData === undefined || resumeData === null) {
				const check = checkDomainAccess({
					url: input.url,
					tracker: context.domainAccessTracker,
					permissionMode: context.permissions?.fetchUrl,
					runId: context.runId,
				});
				if (!check.allowed) {
					// Blocked by admin — deny immediately without approval prompt
					if (check.blocked) {
						return {
							url: input.url,
							finalUrl: input.url,
							title: '',
							content: 'Action blocked by admin.',
							truncated: false,
							contentLength: 0,
						};
					}
					await suspend?.(check.suspendPayload!);
					// suspend() never resolves — this satisfies the type checker
					return {
						url: input.url,
						finalUrl: input.url,
						title: '',
						content: '',
						truncated: false,
						contentLength: 0,
					};
				}
			}

			// ── Execute fetch ──────────────────────────────────────────────
			// Build authorizeUrl callback for redirect-hop and cache-hit gating.
			// Redirects to a new untrusted host will throw, which propagates
			// as a tool error to the agent (it can retry with the redirect URL
			// directly, triggering normal HITL for that host).
			// eslint-disable-next-line @typescript-eslint/require-await -- must be async to match authorizeUrl signature
			const authorizeUrl = async (targetUrl: string) => {
				const redirectCheck = checkDomainAccess({
					url: targetUrl,
					tracker: context.domainAccessTracker,
					permissionMode: context.permissions?.fetchUrl,
					runId: context.runId,
				});
				if (!redirectCheck.allowed) {
					const reason = redirectCheck.blocked
						? `Access to ${new URL(targetUrl).hostname} is blocked by admin.`
						: `Redirect to ${new URL(targetUrl).hostname} requires approval. ` +
							`Retry with the direct URL: ${targetUrl}`;
					throw new Error(reason);
				}
			};

			const result = await context.webResearchService.fetchUrl(input.url, {
				maxContentLength: input.maxContentLength ?? undefined,
				authorizeUrl,
			});
			result.content = wrapInBoundaryTags(sanitizeWebContent(result.content), result.finalUrl);
			return result;
		},
	});
}
