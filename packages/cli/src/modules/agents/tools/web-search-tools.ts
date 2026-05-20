import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import type { AgentJsonWebSearchConfig } from '@n8n/api-types';
import {
	sanitizeWebContent,
	wrapUntrustedData,
	type InstanceAiWebResearchService,
} from '@n8n/instance-ai';
import { z } from 'zod';

const MAX_SEARCH_RESULTS = 20;
const DEFAULT_SEARCH_RESULTS = 5;
const DEFAULT_PAGE_CONTENT_LENGTH = 30_000;
const MAX_PAGE_CONTENT_LENGTH = 100_000;

const domainSchema = z
	.string()
	.min(1)
	.max(253)
	.regex(
		/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i,
		'Domain must be a hostname like "docs.n8n.io"',
	);

const webSearchInputSchema = z.object({
	query: z.string().min(1),
	maxResults: z.number().int().min(1).max(MAX_SEARCH_RESULTS).optional(),
	includeDomains: z.array(domainSchema).optional(),
	excludeDomains: z.array(domainSchema).optional(),
});

const webOpenInputSchema = z.object({
	url: z.string().url(),
	maxContentLength: z.number().int().min(1).max(MAX_PAGE_CONTENT_LENGTH).optional(),
});

export type WebSearchBackendConfig =
	| { type: 'brave'; apiKey: string }
	| { type: 'searxng'; apiUrl: string };

type SearchInput = z.infer<typeof webSearchInputSchema>;
type OpenInput = z.infer<typeof webOpenInputSchema>;

interface DomainPolicy {
	allowedDomains: string[];
	blockedDomains: string[];
}

export async function resolveWebSearchBackendConfig(
	config: AgentJsonWebSearchConfig,
	credentialProvider: CredentialProvider,
): Promise<WebSearchBackendConfig> {
	const credential = config.credential;
	if (!credential) {
		throw new Error('webSearch.credential is required when n8n fallback web search is selected');
	}

	const available = await credentialProvider.list();
	const actual = available.find((candidate) => candidate.id === credential.id);
	if (!actual) {
		throw new Error(`Credential "${credential.id}" not found or not accessible`);
	}
	if (actual.type !== credential.type) {
		throw new Error(
			`Credential "${credential.id}" expected type ${credential.type} but found ${actual.type}`,
		);
	}

	const resolved = await credentialProvider.resolve(credential.id);

	if (credential.type === 'braveSearchApi') {
		const apiKey = typeof resolved.apiKey === 'string' ? resolved.apiKey.trim() : '';
		if (!apiKey) throw new Error(`Credential "${credential.id}" is missing a Brave Search API key`);
		return { type: 'brave', apiKey };
	}

	const apiUrl = typeof resolved.apiUrl === 'string' ? resolved.apiUrl.trim() : '';
	if (!apiUrl) throw new Error(`Credential "${credential.id}" is missing a SearXNG API URL`);
	return { type: 'searxng', apiUrl };
}

export function createWebSearchFallbackTools(
	webResearchService: InstanceAiWebResearchService,
	config: AgentJsonWebSearchConfig,
): BuiltTool[] {
	const policy = getDomainPolicy(config);

	return [
		new Tool('web_search')
			.description(
				'Search the web for current information using the configured n8n search backend.',
			)
			.input(webSearchInputSchema)
			.handler(async (input: SearchInput) => {
				const domainOptions = resolveSearchDomainOptions(input, policy);
				const search = webResearchService.search;
				if (!search) {
					return {
						query: input.query,
						results: [],
						error: 'No web search backend is configured for this agent.',
					};
				}

				const response = await search(input.query, {
					maxResults: input.maxResults ?? DEFAULT_SEARCH_RESULTS,
					...domainOptions,
				});
				const fetchedAt = new Date().toISOString();

				return {
					query: response.query,
					fetchedAt,
					results: response.results
						.filter((result) => isUrlAllowed(result.url, policy))
						.map((result) => ({
							title: result.title,
							url: result.url,
							snippet: wrapSanitizedWebContent(result.snippet, result.url, 'search_snippet'),
							...(result.publishedDate ? { publishedAt: result.publishedDate } : {}),
							fetchedAt,
						})),
				};
			})
			.build(),

		new Tool('web_open')
			.description(
				'Open a URL and return extracted page content using n8n SSRF-protected fetching.',
			)
			.input(webOpenInputSchema)
			.handler(async (input: OpenInput) => {
				assertUrlAllowed(input.url, policy);

				const page = await webResearchService.fetchUrl(input.url, {
					maxContentLength: input.maxContentLength ?? DEFAULT_PAGE_CONTENT_LENGTH,
					authorizeUrl: async (targetUrl) => {
						assertUrlAllowed(targetUrl, policy);
					},
				});
				assertUrlAllowed(page.finalUrl, policy);

				const fetchedAt = new Date().toISOString();

				return {
					url: page.url,
					finalUrl: page.finalUrl,
					title: page.title,
					content: wrapSanitizedWebContent(page.content, page.finalUrl, 'web_page'),
					truncated: page.truncated,
					contentLength: page.contentLength,
					fetchedAt,
				};
			})
			.build(),
	];
}

function getDomainPolicy(config: AgentJsonWebSearchConfig): DomainPolicy {
	return {
		allowedDomains: normalizeDomains(config.allowedDomains),
		blockedDomains: normalizeDomains(config.blockedDomains),
	};
}

function resolveSearchDomainOptions(input: SearchInput, policy: DomainPolicy) {
	const includeDomains = normalizeDomains(input.includeDomains);
	const excludeDomains = normalizeDomains(input.excludeDomains);

	if (policy.allowedDomains.length > 0 && includeDomains.length > 0) {
		const invalid = includeDomains.find(
			(domain) => !policy.allowedDomains.some((allowed) => isSameOrSubdomain(domain, allowed)),
		);
		if (invalid) {
			throw new Error(
				`includeDomains cannot broaden configured allowedDomains. "${invalid}" is not allowed.`,
			);
		}
	}

	const effectiveIncludeDomains =
		policy.allowedDomains.length > 0
			? includeDomainsOrPolicy(includeDomains, policy)
			: includeDomains;
	const effectiveExcludeDomains = uniqueDomains([...policy.blockedDomains, ...excludeDomains]);

	return {
		...(effectiveIncludeDomains.length > 0 ? { includeDomains: effectiveIncludeDomains } : {}),
		...(effectiveExcludeDomains.length > 0 ? { excludeDomains: effectiveExcludeDomains } : {}),
	};
}

function includeDomainsOrPolicy(includeDomains: string[], policy: DomainPolicy): string[] {
	return includeDomains.length > 0 ? includeDomains : policy.allowedDomains;
}

function assertUrlAllowed(url: string, policy: DomainPolicy): void {
	const host = getHostname(url);
	if (policy.allowedDomains.length > 0) {
		const allowed = policy.allowedDomains.some((domain) => isSameOrSubdomain(host, domain));
		if (!allowed) {
			throw new Error(`URL is outside configured allowedDomains: ${url}`);
		}
	}

	const blocked = policy.blockedDomains.some((domain) => isSameOrSubdomain(host, domain));
	if (blocked) {
		throw new Error(`URL is blocked by configured blockedDomains: ${url}`);
	}
}

function isUrlAllowed(url: string, policy: DomainPolicy): boolean {
	try {
		assertUrlAllowed(url, policy);
		return true;
	} catch {
		return false;
	}
}

function getHostname(url: string): string {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}
}

function normalizeDomains(domains: string[] | undefined): string[] {
	return uniqueDomains((domains ?? []).map((domain) => domain.toLowerCase().replace(/\.$/, '')));
}

function uniqueDomains(domains: string[]): string[] {
	return Array.from(new Set(domains.filter((domain) => domain.length > 0)));
}

function isSameOrSubdomain(host: string, domain: string): boolean {
	return host === domain || host.endsWith(`.${domain}`);
}

function wrapSanitizedWebContent(content: string, source: string, label: string): string {
	return wrapUntrustedData(sanitizeWebContent(content), source, label);
}
