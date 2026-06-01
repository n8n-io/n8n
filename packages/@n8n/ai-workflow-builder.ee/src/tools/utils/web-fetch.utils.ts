import { HumanMessage, type BaseMessage } from '@langchain/core/messages';
import axios, { type AxiosRequestConfig } from 'axios';
import type { Readable } from 'node:stream';

import {
	CrossHostRedirectError,
	findCrossHostRedirectError,
	isSsrfBlockedError,
	type SsrfGuard,
} from './ssrf-guard';
import {
	WEB_FETCH_MAX_BYTES,
	WEB_FETCH_MAX_CONTENT_CHARS,
	WEB_FETCH_TIMEOUT_MS,
} from '../../constants';

/** Maximum number of redirects axios will follow before aborting. */
const WEB_FETCH_MAX_REDIRECTS = 5;

// ============================================================================
// URL PROVENANCE
// ============================================================================

/**
 * Normalize a URL for comparison: lowercase scheme+host, strip trailing slash.
 */
function normalizeUrlForComparison(url: string): string {
	return url.replace(/\/+$/, '');
}

/**
 * Extract text content from a message, handling both string and array content formats.
 */
function getMessageText(msg: BaseMessage): string {
	if (typeof msg.content === 'string') return msg.content;
	if (Array.isArray(msg.content)) {
		return msg.content
			.filter(
				(part): part is { type: 'text'; text: string } =>
					typeof part === 'object' && part !== null && 'type' in part && part.type === 'text',
			)
			.map((part) => part.text)
			.join(' ');
	}
	return '';
}

/**
 * Check if a URL was provided by the user in any HumanMessage.
 * Matches exact URL or URL without trailing slash.
 */
export function isUrlInUserMessages(url: string, messages: BaseMessage[]): boolean {
	const normalized = normalizeUrlForComparison(url);

	for (const msg of messages) {
		if (!(msg instanceof HumanMessage)) continue;
		const content = getMessageText(msg);
		if (!content) continue;

		if (content.includes(url) || content.includes(normalized)) {
			return true;
		}
	}
	return false;
}

// ============================================================================
// TYPES
// ============================================================================

export interface FetchResult {
	status: 'success' | 'unsupported' | 'redirect_new_host' | 'blocked';
	body?: string;
	finalUrl?: string;
	httpStatus?: number;
	contentType?: string;
	reason?: string;
}

export interface ExtractedContent {
	title: string;
	content: string;
	truncated: boolean;
	truncateReason?: string;
}

// ============================================================================
// HOST NORMALIZATION
// ============================================================================

/**
 * Normalize a hostname: lowercase, strip trailing dot.
 */
export function normalizeHost(url: string): string {
	const parsed = new URL(url);
	return parsed.hostname.toLowerCase().replace(/\.$/, '');
}

// ============================================================================
// HTTP FETCH
// ============================================================================

/**
 * Read a Node stream into a string, capping at maxBytes. On overflow the stream is
 * destroyed and the partial content kept (the page is still extracted from what we have).
 */
async function readStreamWithCap(stream: Readable, maxBytes: number): Promise<string> {
	const chunks: Buffer[] = [];
	let total = 0;

	for await (const chunk of stream) {
		const buf = chunk as Buffer;
		if (total + buf.length > maxBytes) {
			chunks.push(buf.subarray(0, maxBytes - total));
			stream.destroy();
			break;
		}
		chunks.push(buf);
		total += buf.length;
	}

	return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Fetch a URL with SSRF protection, timeout, size limit, and PDF detection.
 *
 * SSRF is enforced three ways:
 * - a pre-flight `validateUrl` on the initial target,
 * - a secure DNS lookup that validates the resolved IP at connect time (every hop),
 * - a `beforeRedirect` hook that validates direct-IP redirect targets and halts
 *   auto-follow on a cross-host redirect so the caller can run domain approval.
 */
export async function fetchUrl(
	url: string,
	ssrf: SsrfGuard,
	signal?: AbortSignal,
): Promise<FetchResult> {
	// Pre-flight: reject before opening any connection.
	const preflight = await ssrf.validateUrl(url);
	if (!preflight.ok) return { status: 'blocked' };

	const originalHost = normalizeHost(url);

	const config: AxiosRequestConfig = {
		// Honored by Node's http(s) agent on every hop; validates the resolved IP at
		// connect time, preventing DNS-rebinding TOCTOU.
		lookup: ssrf.createSecureLookup() as AxiosRequestConfig['lookup'],
		beforeRedirect: (opts: Record<string, string>) => {
			// Direct-IP redirect targets do no DNS lookup, so validate them here first.
			ssrf.validateRedirectSync(opts.href);
			// Halt auto-follow on cross-host redirects so the caller can run HITL approval.
			if (normalizeHost(opts.href) !== originalHost) {
				throw new CrossHostRedirectError(opts.href);
			}
		},
		maxRedirects: WEB_FETCH_MAX_REDIRECTS,
		timeout: WEB_FETCH_TIMEOUT_MS,
		signal,
		responseType: 'stream',
		// Let the manual byte-cap own truncation; arraybuffer + maxContentLength would reject.
		maxContentLength: Infinity,
		maxBodyLength: Infinity,
		validateStatus: () => true,
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'User-Agent': 'n8n-workflow-builder/1.0',
			Accept: 'text/html,application/xhtml+xml,*/*',
		},
	};

	let response;
	try {
		response = await axios.get<Readable>(url, config);
	} catch (error) {
		const crossHost = findCrossHostRedirectError(error);
		if (crossHost) {
			return { status: 'redirect_new_host', finalUrl: crossHost.finalUrl };
		}
		if (isSsrfBlockedError(error)) {
			return { status: 'blocked' };
		}
		throw error;
	}

	const responseUrl = (response.request as { res?: { responseUrl?: string } } | undefined)?.res
		?.responseUrl;
	const finalUrl = responseUrl ?? url;
	const contentTypeHeader = response.headers['content-type'];
	const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : '';

	// PDF detection
	if (contentType.includes('application/pdf')) {
		response.data.destroy();
		return { status: 'unsupported', reason: 'pdf' };
	}

	const body = await readStreamWithCap(response.data, WEB_FETCH_MAX_BYTES);

	return {
		status: 'success',
		body,
		finalUrl,
		httpStatus: response.status,
		contentType,
	};
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/**
 * Extract readable content from HTML using JSDOM + Readability.
 * Libraries are lazy-loaded to avoid pulling jsdom (~15-20MB) into memory at startup.
 */
export async function extractReadableContent(html: string, url: string): Promise<ExtractedContent> {
	const [{ JSDOM, VirtualConsole }, { Readability }, { default: TurndownService }] =
		await Promise.all([import('jsdom'), import('@mozilla/readability'), import('turndown')]);

	const virtualConsole = new VirtualConsole();
	const dom = new JSDOM(html, { url, virtualConsole });
	const article = new Readability(dom.window.document, { keepClasses: true }).parse();

	const title = article?.title ?? '';
	const articleHtml = article?.content ?? '';
	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
	});
	let content = articleHtml ? turndownService.turndown(articleHtml) : '';
	let truncated = false;
	let truncateReason: string | undefined;

	if (content.length > WEB_FETCH_MAX_CONTENT_CHARS) {
		content = content.substring(0, WEB_FETCH_MAX_CONTENT_CHARS);
		truncated = true;
		truncateReason = `Content truncated to ${WEB_FETCH_MAX_CONTENT_CHARS} characters`;
	}

	return { title, content, truncated, truncateReason };
}
