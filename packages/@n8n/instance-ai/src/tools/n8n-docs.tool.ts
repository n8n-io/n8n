import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { Logger } from '../logger';
import type { InstanceAiContext } from '../types';
import { N8N_DOCS_TOOL_ID } from './tool-ids';
import { sanitizeWebContent, wrapUntrustedData } from './web-research/sanitize-web-content';

export { N8N_DOCS_TOOL_ID };

const N8N_DOCS_ORIGIN = 'https://docs.n8n.io';
export const N8N_DOCS_REGISTRY_URL = `${N8N_DOCS_ORIGIN}/llms.txt`;
const DEFAULT_MAX_PAGES = 3;
const MAX_PAGES = 5;
const DEFAULT_MAX_RESULTS = 8;
const MAX_RESULTS = 20;
const DEFAULT_MAX_CONTENT_LENGTH = 30_000;
const MAX_CONTENT_LENGTH = 100_000;
const REGISTRY_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const REGISTRY_MAX_BYTES = 1_000_000;

const CREDENTIAL_SETUP_DOC_PATH = '/credentials/add-edit-credentials/index.md';
const GOOGLE_SERVICE_TOKENS = new Set([
	'gmail',
	'google',
	'calendar',
	'contacts',
	'docs',
	'drive',
	'sheets',
	'slides',
	'tasks',
	'workspace',
	'gsuite',
]);
const STOPWORDS = new Set([
	'a',
	'an',
	'and',
	'api',
	'for',
	'how',
	'i',
	'in',
	'is',
	'it',
	'n8n',
	'of',
	'on',
	'or',
	'set',
	'setup',
	'the',
	'to',
	'up',
	'use',
	'with',
]);

const intentSchema = z.enum(['credential-setup', 'node-help', 'hosting', 'api', 'general']);

const sharedLookupFields = {
	query: z.string().describe('Docs lookup query. Include the product area, service, and task.'),
	intent: intentSchema.optional().describe('The kind of n8n docs answer needed.'),
	credentialType: z
		.string()
		.optional()
		.describe('n8n credential type name, for example "gmailOAuth2Api".'),
	credentialDisplayName: z
		.string()
		.optional()
		.describe('Human-readable credential name, for example "Gmail OAuth2 API".'),
	documentationUrl: z
		.string()
		.url()
		.optional()
		.describe('Known n8n docs URL from credential or node metadata.'),
	nodeType: z
		.string()
		.optional()
		.describe('n8n node type name, for example "n8n-nodes-base.gmail".'),
};

const maxContentLengthField = z
	.number()
	.int()
	.positive()
	.max(MAX_CONTENT_LENGTH)
	.default(DEFAULT_MAX_CONTENT_LENGTH)
	.optional()
	.describe(`Maximum content length in characters (default ${DEFAULT_MAX_CONTENT_LENGTH}).`);

const lookupAction = z.object({
	action: z
		.literal('lookup')
		.describe(
			'Search the n8n docs registry, read the best matching markdown pages, and return source material.',
		),
	...sharedLookupFields,
	oauthRedirectUrl: z
		.string()
		.optional()
		.describe('OAuth redirect URL currently shown in the n8n credential modal.'),
	maxPages: z
		.number()
		.int()
		.min(1)
		.max(MAX_PAGES)
		.default(DEFAULT_MAX_PAGES)
		.optional()
		.describe(`Maximum docs pages to read (default ${DEFAULT_MAX_PAGES}, max ${MAX_PAGES}).`),
	maxContentLength: maxContentLengthField,
});

const searchAction = z.object({
	action: z.literal('search').describe('Search the n8n docs registry without reading pages.'),
	...sharedLookupFields,
	maxResults: z
		.number()
		.int()
		.min(1)
		.max(MAX_RESULTS)
		.default(DEFAULT_MAX_RESULTS)
		.optional()
		.describe(
			`Maximum registry matches to return (default ${DEFAULT_MAX_RESULTS}, max ${MAX_RESULTS}).`,
		),
});

const readAction = z.object({
	action: z.literal('read').describe('Read one n8n docs markdown page from the registry.'),
	url: z.string().url().describe('n8n docs page URL. Must resolve to a docs registry entry.'),
	maxContentLength: maxContentLengthField,
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [lookupAction, searchAction, readAction]),
);

type Input = z.infer<typeof inputSchema>;
type LookupInput = Extract<Input, { action: 'lookup' }>;
type SearchInput = Extract<Input, { action: 'search' }>;

export interface N8nDocsRegistryEntry {
	title: string;
	url: string;
	path: string;
	section: string;
}

export interface N8nDocsMatch extends N8nDocsRegistryEntry {
	score: number;
	reason: string;
}

export interface N8nDocsDocument extends N8nDocsRegistryEntry {
	content: string;
	contentLength: number;
	truncated: boolean;
}

interface ParsedRegistry {
	entries: N8nDocsRegistryEntry[];
	byUrl: Map<string, N8nDocsRegistryEntry>;
	fetchedAt: string;
}

interface RegistryResult {
	registry?: ParsedRegistry;
	hint?: string;
	error?: string;
}

interface FetchTextResult {
	url: string;
	text: string;
	truncated: boolean;
}

interface ToolContext {
	logger?: Pick<Logger, 'warn' | 'debug'>;
}

let registryCache: ParsedRegistry | undefined;
let registryFetchedAtMs = 0;
let registryFetchPromise: Promise<ParsedRegistry> | undefined;

function clamp(value: number | undefined, fallback: number, max: number): number {
	if (value === undefined) return fallback;
	return Math.min(value, max);
}

function getFetchErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function normalizeTokenSource(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/oauth\s*2/gi, 'oauth2')
		.toLowerCase();
}

function tokenize(...values: Array<string | undefined>): string[] {
	const seen = new Set<string>();
	const tokens: string[] = [];
	for (const value of values) {
		if (!value) continue;
		for (const token of normalizeTokenSource(value).match(/[a-z0-9]+/g) ?? []) {
			if (token.length < 2 || STOPWORDS.has(token) || seen.has(token)) continue;
			seen.add(token);
			tokens.push(token);
		}
	}
	return tokens;
}

function includesAll(value: string, tokens: string[]): boolean {
	return tokens.length > 0 && tokens.every((token) => value.includes(token));
}

function pathStartsWith(entry: N8nDocsRegistryEntry, prefix: string): boolean {
	return entry.path.startsWith(prefix);
}

function isCredentialSetupIntent(intent: string | undefined): boolean {
	return intent === 'credential-setup';
}

function inferGoogleCredential(tokens: string[]): boolean {
	return tokens.some((token) => GOOGLE_SERVICE_TOKENS.has(token));
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

export function parseN8nDocsRegistry(registryText: string, fetchedAt: string): ParsedRegistry {
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

function scoreEntry(
	entry: N8nDocsRegistryEntry,
	input: Pick<
		LookupInput | SearchInput,
		| 'query'
		| 'intent'
		| 'credentialType'
		| 'credentialDisplayName'
		| 'documentationUrl'
		| 'nodeType'
	>,
): N8nDocsMatch | undefined {
	const reasons: string[] = [];
	let score = 0;
	const normalizedDocumentationUrl = input.documentationUrl
		? normalizeDocsUrl(input.documentationUrl)
		: undefined;

	if (normalizedDocumentationUrl && normalizedDocumentationUrl === entry.url) {
		score += 500;
		reasons.push('documentation URL match');
	}

	const queryTokens = tokenize(input.query);
	const credentialTokens = tokenize(input.credentialType, input.credentialDisplayName);
	const nodeTokens = tokenize(input.nodeType);
	const allTokens = [...new Set([...queryTokens, ...credentialTokens, ...nodeTokens])];
	const title = normalizeTokenSource(entry.title);
	const path = normalizeTokenSource(entry.path);
	const titleAndPath = `${title} ${path}`;

	for (const token of allTokens) {
		if (title.includes(token)) score += 12;
		if (path.includes(token)) score += 5;
	}

	const normalizedQuery = normalizeTokenSource(input.query).trim();
	if (normalizedQuery && title.includes(normalizedQuery)) {
		score += 40;
		reasons.push('title phrase match');
	}

	if (queryTokens.length > 0 && includesAll(titleAndPath, queryTokens)) {
		score += 30;
		reasons.push('query token match');
	}

	if (credentialTokens.length > 0 && includesAll(titleAndPath, credentialTokens)) {
		score += 30;
		reasons.push('credential token match');
	}

	if (isCredentialSetupIntent(input.intent)) {
		if (pathStartsWith(entry, '/integrations/builtin/credentials/')) {
			score += 90;
			reasons.push('credential docs');
		}

		if (entry.path === CREDENTIAL_SETUP_DOC_PATH) {
			score += 55;
			reasons.push('general credential setup docs');
		}

		if (pathStartsWith(entry, '/integrations/builtin/app-nodes/')) {
			score -= 25;
		}

		const googleCredential = inferGoogleCredential([...queryTokens, ...credentialTokens]);
		if (googleCredential && path.includes('/credentials/google/')) {
			score += 110;
			reasons.push('Google credential setup docs');
		}

		if (credentialTokens.includes('oauth') || credentialTokens.includes('oauth2')) {
			if (title.includes('oauth') || path.includes('oauth')) {
				score += 45;
				reasons.push('OAuth docs');
			}
		}
	}

	if (
		!/release-notes|breaking-changes/.test(normalizedQuery) &&
		entry.path.includes('/release-notes/')
	) {
		score -= 30;
	}

	if (score <= 0) return undefined;

	return {
		...entry,
		score,
		reason: reasons.length > 0 ? reasons.join(', ') : 'text match',
	};
}

export function rankN8nDocsEntries(
	entries: N8nDocsRegistryEntry[],
	input: Pick<
		LookupInput | SearchInput,
		| 'query'
		| 'intent'
		| 'credentialType'
		| 'credentialDisplayName'
		| 'documentationUrl'
		| 'nodeType'
	>,
): N8nDocsMatch[] {
	return entries
		.map((entry) => scoreEntry(entry, input))
		.filter((match): match is N8nDocsMatch => match !== undefined)
		.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function pickLookupMatches(matches: N8nDocsMatch[], maxPages: number): N8nDocsMatch[] {
	if (matches.length <= maxPages) return matches;

	const picked: N8nDocsMatch[] = [];
	const generalCredentialSetup = matches.find((match) => match.path === CREDENTIAL_SETUP_DOC_PATH);

	for (const match of matches) {
		if (picked.length >= maxPages) break;
		if (match.path === CREDENTIAL_SETUP_DOC_PATH) continue;
		picked.push(match);
	}

	if (generalCredentialSetup && !picked.some((match) => match.url === generalCredentialSetup.url)) {
		if (picked.length >= maxPages) picked.pop();
		picked.push(generalCredentialSetup);
	}

	return picked;
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

async function fetchRegistry(): Promise<ParsedRegistry> {
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

async function getRegistry(context: ToolContext): Promise<RegistryResult> {
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

function emptyLookupResult(input: LookupInput | SearchInput, registry: RegistryResult) {
	return {
		query: input.query,
		intent: input.intent ?? 'general',
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry?.fetchedAt ?? '',
		matches: [],
		documents: [],
		...(registry.hint ? { hint: registry.hint } : {}),
		...(registry.error ? { error: registry.error } : {}),
	};
}

async function readEntry(
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

async function handleSearch(context: ToolContext, input: SearchInput) {
	const registry = await getRegistry(context);
	if (!registry.registry) return emptyLookupResult(input, registry);

	const maxResults = clamp(input.maxResults, DEFAULT_MAX_RESULTS, MAX_RESULTS);
	const matches = rankN8nDocsEntries(registry.registry.entries, input).slice(0, maxResults);

	return {
		query: input.query,
		intent: input.intent ?? 'general',
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		matches,
		...(registry.hint ? { hint: registry.hint } : {}),
	};
}

async function handleLookup(context: ToolContext, input: LookupInput) {
	const registry = await getRegistry(context);
	if (!registry.registry) return emptyLookupResult(input, registry);

	const maxPages = clamp(input.maxPages, DEFAULT_MAX_PAGES, MAX_PAGES);
	const maxContentLength = clamp(
		input.maxContentLength,
		DEFAULT_MAX_CONTENT_LENGTH,
		MAX_CONTENT_LENGTH,
	);
	const matches = rankN8nDocsEntries(registry.registry.entries, input);
	const pagesToRead = pickLookupMatches(matches, maxPages);
	const documents: N8nDocsDocument[] = [];
	const readErrors: string[] = [];

	for (const match of pagesToRead) {
		try {
			documents.push(await readEntry(match, maxContentLength));
		} catch (error) {
			readErrors.push(`${match.title}: ${getFetchErrorMessage(error)}`);
		}
	}

	const hints = [
		registry.hint,
		readErrors.length ? `Some docs pages could not be read: ${readErrors.join('; ')}` : undefined,
	].filter((hint): hint is string => typeof hint === 'string' && hint.length > 0);

	return {
		query: input.query,
		intent: input.intent ?? 'general',
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		matches: matches.slice(0, Math.max(DEFAULT_MAX_RESULTS, maxPages)),
		documents,
		...(hints.length ? { hint: hints.join(' ') } : {}),
	};
}

async function handleRead(context: ToolContext, input: Extract<Input, { action: 'read' }>) {
	const registry = await getRegistry(context);
	if (!registry.registry) {
		return {
			url: input.url,
			registryUrl: N8N_DOCS_REGISTRY_URL,
			registryFetchedAt: '',
			documents: [],
			...(registry.hint ? { hint: registry.hint } : {}),
			...(registry.error ? { error: registry.error } : {}),
		};
	}

	const normalizedUrl = normalizeDocsUrl(input.url);
	const entry = normalizedUrl ? registry.registry.byUrl.get(normalizedUrl) : undefined;
	if (!entry) {
		return {
			url: input.url,
			registryUrl: N8N_DOCS_REGISTRY_URL,
			registryFetchedAt: registry.registry.fetchedAt,
			documents: [],
			error: 'URL is not an n8n docs registry entry.',
			...(registry.hint ? { hint: registry.hint } : {}),
		};
	}

	const maxContentLength = clamp(
		input.maxContentLength,
		DEFAULT_MAX_CONTENT_LENGTH,
		MAX_CONTENT_LENGTH,
	);
	return {
		url: entry.url,
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		documents: [await readEntry(entry, maxContentLength)],
		...(registry.hint ? { hint: registry.hint } : {}),
	};
}

export function resetN8nDocsRegistryCacheForTests(): void {
	registryCache = undefined;
	registryFetchedAtMs = 0;
	registryFetchPromise = undefined;
}

export function createN8nDocsTool(context: Pick<InstanceAiContext, 'logger'>) {
	return new Tool(N8N_DOCS_TOOL_ID)
		.description(
			'Search and read current n8n documentation from docs.n8n.io. Use for n8n product, setup, credential, node, hosting, API, and troubleshooting questions.',
		)
		.input(inputSchema)
		.handler(async (input) => {
			const parsedInput = inputSchema.parse(input);
			switch (parsedInput.action) {
				case 'lookup':
					return await handleLookup(context, parsedInput);
				case 'search':
					return await handleSearch(context, parsedInput);
				case 'read':
					return await handleRead(context, parsedInput);
			}
		})
		.build();
}
