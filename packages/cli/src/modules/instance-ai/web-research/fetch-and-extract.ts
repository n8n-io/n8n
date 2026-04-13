import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';

import type { FetchedPage } from '@n8n/instance-ai';
import { assertPublicUrl } from './ssrf-guard';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_CONTENT_LENGTH = 30_000;
const MAX_REDIRECTS = 10;

export interface FetchAndExtractOptions {
	maxContentLength?: number;
	maxResponseBytes?: number;
	timeoutMs?: number;
	/**
	 * Called before following each redirect hop to validate the target URL.
	 * Throw to abort the fetch (e.g. for HITL domain approval).
	 */
	authorizeUrl?: (url: string) => Promise<void>;
}

/**
 * Fetch a URL, extract its main content, and convert to markdown.
 * Routes by content-type: HTML → Readability + Turndown, PDF → pdf-parse, text → passthrough.
 *
 * Every redirect hop is validated against the SSRF guard before following,
 * preventing open-redirect chains to internal/private addresses.
 */
export async function fetchAndExtract(
	url: string,
	options?: FetchAndExtractOptions,
): Promise<FetchedPage> {
	const maxContentLength = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
	const maxResponseBytes = options?.maxResponseBytes ?? MAX_RESPONSE_BYTES;
	const timeoutMs = Math.min(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);

	const authorizeUrl = options?.authorizeUrl;

	// Manual redirect handling — validate every hop against SSRF guard
	let currentUrl = url;
	let response!: Response;
	let redirectCount = 0;

	while (redirectCount <= MAX_REDIRECTS) {
		await assertPublicUrl(currentUrl);

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		try {
			response = await fetch(currentUrl, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'n8n-instance-ai/1.0 (content extraction)',
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/pdf;q=0.7,*/*;q=0.5',
				},
				redirect: 'manual',
			});
		} finally {
			clearTimeout(timeout);
		}

		// Follow redirects manually so each hop is SSRF-checked
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) break;

			redirectCount++;
			if (redirectCount > MAX_REDIRECTS) {
				throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
			}

			// Resolve relative redirect URLs against the current URL
			currentUrl = new URL(location, currentUrl).href;

			// Domain-access authorization for the redirect target
			if (authorizeUrl) {
				await authorizeUrl(currentUrl);
			}

			continue;
		}

		// Defense-in-depth: if the runtime followed a redirect despite manual mode,
		// validate the actual response URL against the SSRF guard.
		if (response.url && response.url !== currentUrl) {
			await assertPublicUrl(response.url);
			currentUrl = response.url;
		}

		break;
	}

	const finalUrl = currentUrl;

	if (!response.ok) {
		return {
			url,
			finalUrl,
			title: '',
			content: `HTTP ${response.status}: ${response.statusText}`,
			truncated: false,
			contentLength: 0,
		};
	}

	// Read body with size limit
	const rawBody = await readLimitedBody(response, maxResponseBytes);
	const contentType = response.headers.get('content-type') ?? '';

	if (contentType.includes('application/pdf')) {
		return await extractPdf(url, finalUrl, rawBody, maxContentLength);
	}

	if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
		return extractPlainText(url, finalUrl, rawBody, maxContentLength);
	}

	// Default: treat as HTML
	return extractHtml(url, finalUrl, rawBody, maxContentLength);
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let totalBytes = 0;

	if (!response.body) {
		return Buffer.alloc(0);
	}

	const reader = response.body.getReader();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = Buffer.from(value);
			totalBytes += chunk.length;

			if (totalBytes > maxBytes) {
				chunks.push(chunk.subarray(0, maxBytes - (totalBytes - chunk.length)));
				break;
			}

			chunks.push(chunk);
		}
	} finally {
		reader.releaseLock();
	}

	return Buffer.concat(chunks);
}

function extractHtml(
	url: string,
	finalUrl: string,
	body: Buffer,
	maxContentLength: number,
): FetchedPage {
	const html = body.toString('utf-8');
	const { document } = parseHTML(html);

	// Detect safety flags from raw HTML
	const safetyFlags = detectSafetyFlags(html);

	// Use Readability to extract main content
	const reader = new Readability(document as unknown as Document);
	const article = reader.parse();

	if (!article) {
		// Readability failed — fall back to body text
		const fallbackText = document.body?.textContent ?? '';
		const truncated = fallbackText.length > maxContentLength;
		const content = truncated ? fallbackText.slice(0, maxContentLength) : fallbackText;

		return {
			url,
			finalUrl,
			title: document.title ?? '',
			content,
			truncated,
			contentLength: fallbackText.length,
			...(hasSafetyFlags(safetyFlags) ? { safetyFlags } : {}),
		};
	}

	// Convert extracted HTML to markdown
	const turndown = createTurndownService();
	let markdown = turndown.turndown(article.content ?? '');

	const truncated = markdown.length > maxContentLength;
	const contentLength = markdown.length;
	if (truncated) {
		markdown = markdown.slice(0, maxContentLength);
	}

	return {
		url,
		finalUrl,
		title: article.title ?? '',
		content: markdown,
		truncated,
		contentLength,
		...(hasSafetyFlags(safetyFlags) ? { safetyFlags } : {}),
	};
}

async function extractPdf(
	url: string,
	finalUrl: string,
	body: Buffer,
	maxContentLength: number,
): Promise<FetchedPage> {
	// Dynamic import to avoid loading pdf-parse unless needed
	const pdfParse = (await import('pdf-parse')).default;
	const result = await pdfParse(body);

	const truncated = result.text.length > maxContentLength;
	const content = truncated ? result.text.slice(0, maxContentLength) : result.text;

	return {
		url,
		finalUrl,
		title: result.info?.Title ?? '',
		content,
		truncated,
		contentLength: result.text.length,
	};
}

function extractPlainText(
	url: string,
	finalUrl: string,
	body: Buffer,
	maxContentLength: number,
): FetchedPage {
	const text = body.toString('utf-8');
	const truncated = text.length > maxContentLength;
	const content = truncated ? text.slice(0, maxContentLength) : text;

	return {
		url,
		finalUrl,
		title: '',
		content,
		truncated,
		contentLength: text.length,
	};
}

function createTurndownService(): TurndownService {
	const turndown = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
	});
	turndown.use(gfm);
	return turndown;
}

/** Detect common patterns that suggest degraded content quality. */
function detectSafetyFlags(html: string): FetchedPage['safetyFlags'] {
	const flags: NonNullable<FetchedPage['safetyFlags']> = {};

	// JS rendering suspected: heavy framework markers with minimal content
	const hasAppRoot = /<div\s+id=["'](?:app|root|__next|__nuxt)["']\s*>/i.test(html);
	const hasNoscript = /<noscript/i.test(html);
	if (hasAppRoot && hasNoscript) {
		flags.jsRenderingSuspected = true;
	}

	// Login required: meta refresh to login, or login form patterns
	const hasLoginForm = /action=["'][^"']*login/i.test(html);
	const hasLoginRedirect = /meta[^>]+url=.*(?:login|signin|auth)/i.test(html);
	if (hasLoginForm || hasLoginRedirect) {
		flags.loginRequired = true;
	}

	return flags;
}

function hasSafetyFlags(flags: FetchedPage['safetyFlags']): boolean {
	return (
		flags !== undefined && (flags.jsRenderingSuspected === true || flags.loginRequired === true)
	);
}
