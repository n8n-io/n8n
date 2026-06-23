import type { Logger } from '../../logger';
import { sanitizeWebContent, wrapUntrustedData } from '../web-research/sanitize-web-content';

const N8N_DOCS_ORIGIN = 'https://docs.n8n.io';
export const N8N_DOCS_REGISTRY_URL = `${N8N_DOCS_ORIGIN}/llms.txt`;

const REGISTRY_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const REGISTRY_MAX_BYTES = 1_000_000;

export interface N8nDocsRegistryEntry {
	title: string;
	url: string;
	path: string;
	section: string;
}

export interface N8nDocsDocument extends N8nDocsRegistryEntry {
	content: string;
	contentLength: number;
	truncated: boolean;
}

export interface ParsedN8nDocsRegistry {
	entries: N8nDocsRegistryEntry[];
	byUrl: Map<string, N8nDocsRegistryEntry>;
	fetchedAt: string;
}

export interface N8nDocsRegistryResult {
	registry?: ParsedN8nDocsRegistry;
	hint?: string;
	error?: string;
}

interface FetchTextResult {
	url: string;
	text: string;
	truncated: boolean;
}

export interface N8nDocsRegistryContext {
	logger?: Pick<Logger, 'warn' | 'debug'>;
}

let registryCache: ParsedN8nDocsRegistry | undefined;
let registryFetchedAtMs = 0;
let registryFetchPromise: Promise<ParsedN8nDocsRegistry> | undefined;

export function getFetchErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function normalizeDocsUrl(rawUrl: string): string | undefined {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return undefined;
	}

	if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.n8n.io') return undefined;

	parsed.hash = '';
	parsed.search = '';
	if (parsed.pathname.endsWith('/')) {
		parsed.pathname = `${parsed.pathname}index.md`;
	} else if (!parsed.pathname.endsWith('.md')) {
		parsed.pathname = `${parsed.pathname.replace(/\/?$/, '/')}index.md`;
	}

	return parsed.toString();
}

function normalizeAllowedDocsFetchUrl(rawUrl: string): string | undefined {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return undefined;
	}

	if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.n8n.io') return undefined;
	parsed.hash = '';
	parsed.search = '';
	return parsed.toString();
}

export function parseN8nDocsRegistry(
	registryText: string,
	fetchedAt: string,
): ParsedN8nDocsRegistry {
	const entries: N8nDocsRegistryEntry[] = [];
	let section = '';

	for (const line of registryText.split(/\r?\n/)) {
		const heading = /^##+\s+(.+?)\s*$/.exec(line);
		if (heading?.[1]) {
			section = heading[1];
			continue;
		}

		const match = /^-\s+\[([^\]]+)]\((https:\/\/docs\.n8n\.io\/[^)]+)\)\s*$/.exec(line);
		if (!match?.[1] || !match[2]) continue;
		const normalizedUrl = normalizeDocsUrl(match[2]);
		if (!normalizedUrl) continue;
		const url = new URL(normalizedUrl);
		entries.push({
			title: match[1],
			url: normalizedUrl,
			path: url.pathname,
			section,
		});
	}

	return {
		entries,
		byUrl: new Map(entries.map((entry) => [entry.url, entry])),
		fetchedAt,
	};
}

async function fetchText(
	url: string,
	options: { maxLength: number; maxBytes?: number },
): Promise<FetchTextResult> {
	const response = await globalThis.fetch(url, {
		headers: { accept: 'text/markdown,text/plain,*/*' },
		redirect: 'follow',
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});

	const finalUrl = normalizeAllowedDocsFetchUrl(response.url || url);
	if (!finalUrl) {
		throw new Error('Docs request redirected outside docs.n8n.io');
	}

	if (!response.ok) {
		throw new Error(`Docs request failed with HTTP ${response.status}`);
	}

	const contentLength = response.headers.get('content-length');
	const maxBytes = options.maxBytes ?? Buffer.byteLength('x'.repeat(options.maxLength));
	if (contentLength && Number(contentLength) > maxBytes) {
		throw new Error(`Docs response exceeds ${maxBytes} bytes`);
	}

	const text = await response.text();
	if (/^\s*<!doctype html/i.test(text) || /^\s*<html[\s>]/i.test(text)) {
		throw new Error('Docs page returned HTML instead of markdown');
	}

	const truncated = text.length > options.maxLength;
	return {
		url: finalUrl,
		text: truncated ? text.slice(0, options.maxLength) : text,
		truncated,
	};
}

async function fetchRegistry(): Promise<ParsedN8nDocsRegistry> {
	const fetchedAt = new Date().toISOString();
	const response = await fetchText(N8N_DOCS_REGISTRY_URL, {
		maxLength: REGISTRY_MAX_BYTES,
		maxBytes: REGISTRY_MAX_BYTES,
	});
	const registry = parseN8nDocsRegistry(response.text, fetchedAt);
	if (registry.entries.length === 0) {
		throw new Error('n8n docs registry was empty');
	}
	registryCache = registry;
	registryFetchedAtMs = Date.now();
	return registry;
}

export async function getN8nDocsRegistry(
	context: N8nDocsRegistryContext,
): Promise<N8nDocsRegistryResult> {
	const now = Date.now();
	if (registryCache && now - registryFetchedAtMs < REGISTRY_CACHE_TTL_MS) {
		return { registry: registryCache };
	}

	try {
		registryFetchPromise ??= fetchRegistry();
		const registry = await registryFetchPromise;
		return { registry };
	} catch (error) {
		const message = getFetchErrorMessage(error);
		context.logger?.warn('Failed to fetch n8n docs registry', { error: message });
		if (registryCache) {
			return {
				registry: registryCache,
				hint: `Using cached n8n docs registry because refresh failed: ${message}`,
			};
		}
		return { error: message, hint: `Could not load n8n docs registry: ${message}` };
	} finally {
		registryFetchPromise = undefined;
	}
}

export async function readN8nDocsEntry(
	entry: N8nDocsRegistryEntry,
	maxContentLength: number,
): Promise<N8nDocsDocument> {
	const fetched = await fetchText(entry.url, { maxLength: maxContentLength });
	const sanitized = sanitizeWebContent(fetched.text);
	return {
		...entry,
		url: fetched.url,
		path: new URL(fetched.url).pathname,
		content: wrapUntrustedData(sanitized, fetched.url, entry.title),
		contentLength: sanitized.length,
		truncated: fetched.truncated,
	};
}

export function resetN8nDocsRegistryCacheForTests(): void {
	registryCache = undefined;
	registryFetchedAtMs = 0;
	registryFetchPromise = undefined;
}
