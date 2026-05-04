/**
 * Consolidated research tool — web-search + fetch-url.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import {
	checkDomainAccess,
	applyDomainAccessResume,
	domainGatingSuspendSchema,
	domainGatingResumeSchema,
} from '../domain-access';
import type { InstanceAiContext } from '../types';
import { sanitizeWebContent, wrapInBoundaryTags } from './web-research/sanitize-web-content';

// ── Action schemas ──────────────────────────────────────────────────────────

const webSearchAction = z.object({
	action: z.literal('web-search').describe('Search the web for information'),
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

const fetchUrlAction = z.object({
	action: z.literal('fetch-url').describe('Fetch a web page and extract its content as markdown'),
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

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [webSearchAction, fetchUrlAction]),
);

type Input = z.infer<typeof inputSchema>;

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleWebSearch(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'web-search' }>,
) {
	if (!context.webResearchService?.search) {
		return { query: input.query, results: [] };
	}

	const result = await context.webResearchService.search(input.query, {
		maxResults: input.maxResults ?? undefined,
		includeDomains: input.includeDomains ?? undefined,
	});
	for (const r of result.results) {
		r.snippet = sanitizeWebContent(r.snippet);
	}
	return result;
}

async function handleFetchUrl(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'fetch-url' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
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

	const resumeData = ctx?.agent?.resumeData as z.infer<typeof domainGatingResumeSchema> | undefined;
	const suspend = ctx?.agent?.suspend as
		| ((payload: z.infer<typeof domainGatingSuspendSchema>) => Promise<void>)
		| undefined;

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
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createResearchTool(context: InstanceAiContext) {
	return createTool({
		id: 'research',
		description: 'Search the web or fetch page content.',
		inputSchema,
		suspendSchema: domainGatingSuspendSchema,
		resumeSchema: domainGatingResumeSchema,
		execute: async (input: Input, ctx) => {
			switch (input.action) {
				case 'web-search':
					return await handleWebSearch(context, input);
				case 'fetch-url':
					return await handleFetchUrl(context, input, ctx);
			}
		},
	});
}
