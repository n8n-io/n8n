import { HumanMessage, type BaseMessage } from '@langchain/core/messages';
import dns from 'dns';
import { promisify } from 'util';

import {
	WEB_FETCH_MAX_BYTES,
	WEB_FETCH_MAX_CONTENT_CHARS,
	WEB_FETCH_TIMEOUT_MS,
} from '../../constants';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

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
	status: 'success' | 'unsupported' | 'redirect_new_host';
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
// SSRF PROTECTION
// ============================================================================

const PRIVATE_IPV4_RANGES = [
	// 127.0.0.0/8
	{ start: [127, 0, 0, 0], mask: 8 },
	// 10.0.0.0/8
	{ start: [10, 0, 0, 0], mask: 8 },
	// 172.16.0.0/12
	{ start: [172, 16, 0, 0], mask: 12 },
	// 192.168.0.0/16
	{ start: [192, 168, 0, 0], mask: 16 },
	// 169.254.0.0/16 (link-local)
	{ start: [169, 254, 0, 0], mask: 16 },
	// 0.0.0.0/8
	{ start: [0, 0, 0, 0], mask: 8 },
];

function ipToNumber(parts: number[]): number {
	return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
	const parts = ip.split('.').map(Number);
	if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;

	const ipNum = ipToNumber(parts);

	for (const range of PRIVATE_IPV4_RANGES) {
		const rangeStart = ipToNumber(range.start);
		const mask = (0xffffffff << (32 - range.mask)) >>> 0;
		if ((ipNum & mask) === (rangeStart & mask)) return true;
	}

	return false;
}

function isPrivateIPv6(ip: string): boolean {
	const normalized = ip.toLowerCase();
	// Loopback
	if (normalized === '::1') return true;
	// Link-local
	if (normalized.startsWith('fe80:')) return true;
	// Unique local
	if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
	// IPv4-mapped
	if (normalized.startsWith('::ffff:')) {
		const v4 = normalized.slice(7);
		return isPrivateIPv4(v4);
	}
	return false;
}

/**
 * Check if a hostname is blocked by static rules (localhost, private IPs, etc).
 */
function isBlockedHostname(hostname: string): boolean {
	// Block localhost variants
	if (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '[::1]' ||
		hostname === '::1'
	) {
		return true;
	}

	// Block .local and .internal TLDs
	if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
		return true;
	}

	// Block metadata service IPs
	if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
		return true;
	}

	// Check if hostname is an IP literal
	if (isPrivateIPv4(hostname)) return true;
	if (isPrivateIPv6(hostname.replace(/^\[|\]$/g, ''))) return true;

	return false;
}

/**
 * Check if a URL should be blocked for SSRF protection.
 * Validates scheme, hostname patterns, and resolved IP addresses.
 */
export async function isBlockedUrl(url: string): Promise<boolean> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return true;
	}

	// Block non-HTTP(S) schemes
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return true;
	}

	const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');

	if (isBlockedHostname(hostname)) return true;

	// DNS resolution check
	try {
		const [v4Addrs, v6Addrs] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);

		const allIps: string[] = [];
		if (v4Addrs.status === 'fulfilled') allIps.push(...v4Addrs.value);
		if (v6Addrs.status === 'fulfilled') allIps.push(...v6Addrs.value);

		// If no DNS results at all, block (hostname may not exist or may be crafted)
		if (allIps.length === 0) return true;

		for (const ip of allIps) {
			if (isPrivateIPv4(ip) || isPrivateIPv6(ip)) return true;
		}
	} catch {
		// DNS resolution failed — block to be safe
		return true;
	}

	return false;
}

// ============================================================================
// HTTP FETCH
// ============================================================================

/**
 * Fetch a URL with timeout, size limit, redirect tracking, and PDF detection.
 */
export async function fetchUrl(url: string, signal?: AbortSignal): Promise<FetchResult> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS);

	// Combine external signal with timeout
	if (signal) {
		signal.addEventListener('abort', () => controller.abort(), { once: true });
	}

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			redirect: 'follow',
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'User-Agent': 'n8n-workflow-builder/1.0',
				Accept: 'text/html,application/xhtml+xml,*/*',
			},
		});

		const finalUrl = response.url;
		const contentType = response.headers.get('content-type') ?? '';

		// PDF detection
		if (contentType.includes('application/pdf')) {
			return { status: 'unsupported', reason: 'pdf' };
		}

		// Check for cross-host redirect
		const requestedHost = normalizeHost(url);
		const finalHost = normalizeHost(finalUrl);
		if (requestedHost !== finalHost) {
			return { status: 'redirect_new_host', finalUrl };
		}

		// Read body with size limit
		const reader = response.body?.getReader();
		if (!reader) {
			return {
				status: 'success',
				body: '',
				finalUrl,
				httpStatus: response.status,
				contentType,
			};
		}

		const chunks: Uint8Array[] = [];
		let totalBytes = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			totalBytes += value.byteLength;
			if (totalBytes > WEB_FETCH_MAX_BYTES) {
				void reader.cancel();
				// Still return what we have
				break;
			}
			chunks.push(value);
		}

		const body = new TextDecoder().decode(
			chunks.reduce((acc, chunk) => {
				const merged = new Uint8Array(acc.length + chunk.length);
				merged.set(acc);
				merged.set(chunk, acc.length);
				return merged;
			}, new Uint8Array()),
		);

		return {
			status: 'success',
			body,
			finalUrl,
			httpStatus: response.status,
			contentType,
		};
	} finally {
		clearTimeout(timeout);
	}
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
