// The HTML-processing stack used by extractHtml() is deferred until the
// first actual fetch. Eagerly importing these pulls a huge transitive
// graph into idle n8n processes (require-cache probe confirmed):
//   - linkedom              : 0.17 MiB / 124 files + brings in @mixmark-io/domino (0.52 / 52)
//   - @mozilla/readability  : 0.09 MiB / 3 files
//   - turndown              : ~0.02 MiB / 1 file + pulls entities, htmlparser2, css-*, domutils, dom-serializer
//   - @joplin/turndown-plugin-gfm : 0.01 MiB / 1 file
// extractHtml() only runs when the agent actually fetches a URL, so the
// require() can safely be deferred to that call site.
import type { Readability as TReadability } from '@mozilla/readability';
import type { FetchedPage } from '@n8n/instance-ai';
import type { parseHTML as TParseHtml } from 'linkedom';
import type { SsrfBridge } from 'n8n-core';
import type TTurndownService from 'turndown';
import { Agent } from 'undici';

let _linkedom: typeof import('linkedom') | undefined;
let _readability: typeof import('@mozilla/readability') | undefined;
let _turndown: typeof import('turndown') | undefined;
let _turndownGfm: typeof import('@joplin/turndown-plugin-gfm') | undefined;

function loadLinkedom(): typeof TParseHtml {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_linkedom ??= require('linkedom')).parseHTML;
}
function loadReadability(): typeof TReadability {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_readability ??= require('@mozilla/readability')).Readability;
}
function loadTurndown(): typeof TTurndownService {
	// turndown's CJS export IS the constructor (module.exports = TurndownService).
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_turndown ??= require('turndown')) as unknown as typeof TTurndownService;
}
function loadTurndownGfm(): typeof import('@joplin/turndown-plugin-gfm').gfm {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_turndownGfm ??= require('@joplin/turndown-plugin-gfm')).gfm;
}

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
	/**
	 * SSRF guard. The same secure lookup function pins DNS for the actual
	 * connect, so the IP that passes validation is the one fetch connects to.
	 */
	ssrf: SsrfBridge;
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
	options: FetchAndExtractOptions,
): Promise<FetchedPage> {
	const maxContentLength = options.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
	const maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
	const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);

	const { authorizeUrl, ssrf } = options;

	// Manual redirect handling — validate every hop against SSRF guard
	let currentUrl = url;
	let response!: Response;
	let redirectCount = 0;

	while (redirectCount <= MAX_REDIRECTS) {
		const validation = await ssrf.validateUrl(currentUrl);
		if (!validation.ok) throw validation.error;

		const dispatcher = new Agent({ connect: { lookup: ssrf.createSecureLookup() } });
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
				// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
				dispatcher,
			});
		} finally {
			clearTimeout(timeout);
			// Fire-and-forget — awaiting Agent.close() deadlocks against an unread body.
			void dispatcher.close().catch(() => {});
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

			// Direct-IP redirect targets are caught here; hostnames are caught by
			// validateUrl on the next loop iteration before the dispatcher connects.
			ssrf.validateRedirectSync(currentUrl);

			// Domain-access authorization for the redirect target
			if (authorizeUrl) {
				await authorizeUrl(currentUrl);
			}

			continue;
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
