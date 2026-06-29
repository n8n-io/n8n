import type * as JoplinTurndownGfm from '@joplin/turndown-plugin-gfm';
import type { Readability as TReadability } from '@mozilla/readability';
import type * as ReadabilityMod from '@mozilla/readability';
import type { HttpTransport } from '@n8n/backend-network';
import type { FetchedPage } from '@n8n/instance-ai';
import type * as LinkedomMod from 'linkedom';
import type { parseHTML as TParseHtml } from 'linkedom';
import type TTurndownService from 'turndown';
import type * as TurndownMod from 'turndown';

let _linkedom: typeof LinkedomMod | undefined;
let _readability: typeof ReadabilityMod | undefined;
let _turndown: typeof TurndownMod | undefined;
let _turndownGfm: typeof JoplinTurndownGfm | undefined;

function loadLinkedom(): typeof TParseHtml {
	if (!_linkedom) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_linkedom = require('linkedom') as typeof LinkedomMod;
	}
	return _linkedom.parseHTML;
}
function loadReadability(): typeof TReadability {
	if (!_readability) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_readability = require('@mozilla/readability') as typeof ReadabilityMod;
	}
	return _readability.Readability;
}
function loadTurndown(): typeof TTurndownService {
	if (!_turndown) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_turndown = require('turndown') as typeof TurndownMod;
	}
	return _turndown as unknown as typeof TTurndownService;
}
function loadTurndownGfm(): typeof JoplinTurndownGfm.gfm {
	if (!_turndownGfm) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_turndownGfm = require('@joplin/turndown-plugin-gfm') as typeof JoplinTurndownGfm;
	}
	return _turndownGfm.gfm;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_CONTENT_LENGTH = 30_000;

export interface FetchAndExtractOptions {
	maxContentLength?: number;
	maxResponseBytes?: number;
	timeoutMs?: number;
	/**
	 * SSRF-validated fetch transport.
	 */
	transport: HttpTransport;
}

/**
 * undici's `fetch` reports a failure raised inside dispatch
 * as an opaque `TypeError: fetch failed` with the real error on `.cause`.
 */
function unwrapFetchError(error: unknown): unknown {
	let current = error;
	const seen = new Set<unknown>();
	while (current instanceof Error && current.cause instanceof Error && !seen.has(current)) {
		seen.add(current);
		current = current.cause;
	}
	return current;
}

/**
 * Fetch a URL, extract its main content, and convert to markdown.
 * Routes by content-type: HTML → Readability + Turndown, PDF → pdf-parse, text → passthrough.
 */
export async function fetchAndExtract(
	url: string,
	options: FetchAndExtractOptions,
): Promise<FetchedPage> {
	const maxContentLength = options.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
	const maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
	const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);

	const customFetch = options.transport.asCustomFetch();

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	let response: Response;
	try {
		response = await customFetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'n8n-instance-ai/1.0 (content extraction)',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/pdf;q=0.7,*/*;q=0.5',
			},
			redirect: 'follow',
		});
	} catch (error) {
		throw unwrapFetchError(error);
	} finally {
		clearTimeout(timeout);
	}

	// `redirect: 'follow'` resolves to the final, non-redirect response.
	const finalUrl = response.url || url;

	if (!response.ok) {
		// Release the connection back to the pool — we don't read the error body.
		await response.body?.cancel().catch(() => {});
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
	let truncated = false;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = Buffer.from(value);
			totalBytes += chunk.length;

			if (totalBytes > maxBytes) {
				chunks.push(chunk.subarray(0, maxBytes - (totalBytes - chunk.length)));
				truncated = true;
				break;
			}

			chunks.push(chunk);
		}
	} finally {
		if (truncated) {
			// Cancel when we stopped early so the underlying connection is released back to the pool.
			await reader.cancel().catch(() => {});
		}
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
	const { document } = loadLinkedom()(html);

	// Detect safety flags from raw HTML
	const safetyFlags = detectSafetyFlags(html);

	// Use Readability to extract main content
	const Readability = loadReadability();
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
	const { PDFParse } = await import('pdf-parse');
	const parser = new PDFParse({ data: body });
	let textResult;
	let title = '';
	try {
		textResult = await parser.getText();
		try {
			const infoResult = await parser.getInfo();
			const titleField: unknown = infoResult.info?.Title;
			if (typeof titleField === 'string') title = titleField;
		} catch {
			// Metadata is decorative — fall through with empty title rather than
			// dropping the successfully extracted text.
		}
	} finally {
		await parser.destroy();
	}

	const truncated = textResult.text.length > maxContentLength;
	const content = truncated ? textResult.text.slice(0, maxContentLength) : textResult.text;

	return {
		url,
		finalUrl,
		title,
		content,
		truncated,
		contentLength: textResult.text.length,
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

function createTurndownService(): TTurndownService {
	const TurndownService = loadTurndown();
	const turndown = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
	});
	turndown.use(loadTurndownGfm());
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
