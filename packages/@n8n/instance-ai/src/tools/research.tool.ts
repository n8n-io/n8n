/**
 * Consolidated research tool — web-search + fetch-url.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import {
	checkDomainAccess,
	checkWebSearchAccess,
	applyDomainAccessResume,
	applyWebSearchAccessResume,
	domainGatingSuspendSchema,
	domainGatingResumeSchema,
} from '../domain-access';
import type { FetchedPage, InstanceAiContext } from '../types';
import { saveFetchedPage } from './web-research/save-fetched-page';
import { sanitizeWebContent, wrapUntrustedData } from './web-research/sanitize-web-content';

/** True when both URLs share an eTLD+1 (per Public Suffix List) and target is HTTPS. */
async function isSameRegistrableDomainOverHttps(
	originalUrl: string,
	redirectUrl: string,
): Promise<boolean> {
	let originalHost: string;
	let redirectUrlObj: URL;
	try {
		originalHost = new URL(originalUrl).hostname;
		redirectUrlObj = new URL(redirectUrl);
	} catch {
		return false;
	}
	if (redirectUrlObj.protocol !== 'https:') return false;
	const { get: pslGet } = await import('psl');
	const originalDomain = pslGet(originalHost);
	const redirectDomain = pslGet(redirectUrlObj.hostname);
	return originalDomain !== null && redirectDomain !== null && originalDomain === redirectDomain;
}

// ── Action schemas ──────────────────────────────────────────────────────────

const DEFAULT_MAX_CONTENT_LENGTH = 30_000;
const SAVED_PAGE_PREVIEW_LENGTH = 500;

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
		.default(DEFAULT_MAX_CONTENT_LENGTH)
		.optional()
		.describe('Maximum content length in characters (default 30000)'),
	offset: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe(
			'Character offset to start reading from (default 0). Pass `nextOffset` from the previous result to read the next part of a long page.',
		),
	saveTo: z
		.string()
		.optional()
		.describe(
			'Workspace-relative file path, e.g. "research/stripe-pricing.md". Saves the full page to this file and returns only the path and a short preview. Use it for long pages, then read the file with grep, sed or cat.',
		),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [webSearchAction, fetchUrlAction]),
);

type Input = z.infer<typeof inputSchema>;
type DomainGatingResumeData = z.infer<typeof domainGatingResumeSchema>;
type DomainGatingSuspendPayload = z.infer<typeof domainGatingSuspendSchema>;
interface DomainGatingToolContext {
	resumeData: DomainGatingResumeData | undefined;
	suspend?: (payload: DomainGatingSuspendPayload) => Promise<never>;
	/** The payload this tool suspended with, restored by the runtime on resume. */
	suspendPayload?: DomainGatingSuspendPayload;
	abortSignal?: AbortSignal;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleWebSearch(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'web-search' }>,
	ctx: DomainGatingToolContext,
) {
	if (!context.webResearchService?.search) {
		return { query: input.query, results: [] };
	}

	const resumeData = ctx.resumeData;

	// ── Resume path: apply user's decision ─────────────────────────
	if (resumeData !== undefined && resumeData !== null) {
		const { proceed } = await applyWebSearchAccessResume({
			resumeData,
			tracker: context.domainAccessTracker,
			runId: context.runId,
		});
		if (!proceed) {
			return { query: input.query, results: [] };
		}
	}

	// ── Initial check: is web-search allowed? ──────────────────────
	if (resumeData === undefined || resumeData === null) {
		const check = checkWebSearchAccess({
			query: input.query,
			tracker: context.domainAccessTracker,
			permissionMode: context.permissions?.webSearch,
			runId: context.runId,
		});
		if (!check.allowed) {
			if (check.blocked) {
				return { query: input.query, results: [] };
			}

			if (ctx.suspend) return await ctx.suspend(check.suspendPayload!);
			return { query: input.query, results: [] };
		}
	}

	const result = await context.webResearchService.search(input.query, {
		maxResults: input.maxResults ?? undefined,
		includeDomains: input.includeDomains ?? undefined,
		abortSignal: ctx.abortSignal,
	});
	// Snippets come from arbitrary third-party pages — sanitize against hidden
	// payloads, then wrap so the LLM treats the content as data, not instructions.
	// The wrapper also escapes any closing boundary tag in the snippet to
	// prevent breakout into the surrounding prompt context.
	for (const r of result.results) {
		r.snippet = wrapUntrustedData(sanitizeWebContent(r.snippet), r.url, r.title);
	}
	return result;
}

async function handleFetchUrl(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'fetch-url' }>,
	ctx: DomainGatingToolContext,
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

	const resumeData = ctx.resumeData;

	// ── Resume path: apply user's domain decision ──────────────────
	if (resumeData !== undefined && resumeData !== null) {
		// The card may be for a redirect target, so take the host from the card.
		let host = ctx.suspendPayload?.domainAccess?.host;
		if (!host) {
			try {
				host = new URL(input.url).hostname;
			} catch {
				host = input.url;
			}
		}
		const { proceed } = await applyDomainAccessResume({
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

			if (ctx.suspend) return await ctx.suspend(check.suspendPayload!);
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

	const authorizeUrl = async (targetUrl: string) => {
		const redirectCheck = checkDomainAccess({
			url: targetUrl,
			tracker: context.domainAccessTracker,
			permissionMode: context.permissions?.fetchUrl,
			runId: context.runId,
		});
		if (redirectCheck.allowed) return;
		if (redirectCheck.blocked) {
			throw new Error(`Access to ${new URL(targetUrl).hostname} is blocked by admin.`);
		}
		if (await isSameRegistrableDomainOverHttps(input.url, targetUrl)) return;
		// Cross-domain HTTPS redirect (e.g. directus.io → directus.com): don't follow
		// it silently. Remember the target so the handler can ask the user to approve
		// its domain. Redirects to plain HTTP stay rejected.
		if (new URL(targetUrl).protocol === 'https:') blockedRedirectUrl = targetUrl;
		throw new Error(
			`Redirect from ${new URL(input.url).hostname} to ${new URL(targetUrl).hostname} is not allowed. ` +
				'Skip this URL and try a different research strategy — retrying the same URL will not help.',
		);
	};

	let blockedRedirectUrl: string | undefined;
	let page: FetchedPage;
	try {
		page = await context.webResearchService.fetchUrl(input.url, {
			authorizeUrl,
			abortSignal: ctx.abortSignal,
		});
	} catch (error) {
		if (blockedRedirectUrl === undefined) throw error;
		const redirectCheck = checkDomainAccess({
			url: blockedRedirectUrl,
			tracker: context.domainAccessTracker,
			permissionMode: context.permissions?.fetchUrl,
			runId: context.runId,
		});
		// Ask the user to approve the redirect target, then the fetch re-runs on resume.
		if (!ctx.suspend || !redirectCheck.suspendPayload) throw error;
		return await ctx.suspend(redirectCheck.suspendPayload);
	}
	const content = sanitizeWebContent(page.content);
	const saveResult = input.saveTo
		? await saveFetchedPage(context, page, content, input.saveTo, ctx.abortSignal)
		: undefined;
	if (saveResult && 'savedTo' in saveResult) {
		return {
			...slicePage(page, content, 0, SAVED_PAGE_PREVIEW_LENGTH),
			...saveResult,
			nextOffset: undefined,
		};
	}
	return {
		...slicePage(
			page,
			content,
			input.offset ?? 0,
			input.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH,
		),
		...saveResult,
	};
}

/**
 * Return one part of the full page. Offsets count characters of the sanitized
 * content, so `nextOffset` always continues where this part ends.
 */
function slicePage(page: FetchedPage, content: string, offset: number, maxContentLength: number) {
	const end = sliceEnd(content, offset, maxContentLength);
	const hasMore = end < content.length;
	return {
		...page,
		content: wrapUntrustedData(content.slice(offset, end), page.finalUrl),
		contentLength: content.length,
		truncated: hasMore || page.truncated,
		...(hasMore ? { nextOffset: end } : {}),
	};
}

/** Move the end back by one when it would split a surrogate pair, so the next part starts on a whole character. */
function sliceEnd(content: string, offset: number, maxContentLength: number) {
	const end = offset + maxContentLength;
	const code = content.charCodeAt(end - 1);
	const endsOnHighSurrogate = code >= 0xd800 && code <= 0xdbff;
	return endsOnHighSurrogate && end - 1 > offset ? end - 1 : end;
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createResearchTool(context: InstanceAiContext) {
	return new Tool('research')
		.description(
			'Search the web or fetch page content for external (non-n8n) documentation. ' +
				'For n8n-specific questions — product behavior, node setup, credentials, hosting, ' +
				'or feature docs, including which OAuth scopes a provider app needs — prefer the ' +
				'sandbox knowledge base and `n8n-docs`, which is always loaded and takes one ' +
				'call, over web search. Use this tool when those ' +
				'sources and node type definitions are insufficient, or when researching a ' +
				'third-party API/service.',
		)
		.input(inputSchema)
		.suspend(domainGatingSuspendSchema)
		.resume(domainGatingResumeSchema)
		.handler(async (input: Input, ctx) => {
			switch (input.action) {
				case 'web-search':
					return await handleWebSearch(context, input, ctx);
				case 'fetch-url':
					return await handleFetchUrl(context, input, ctx);
			}
		})
		.build();
}
