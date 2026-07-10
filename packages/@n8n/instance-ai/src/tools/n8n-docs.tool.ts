import { Tool } from '@n8n/agents';

import type { InstanceAiContext } from '../types';
import {
	getLookupQuery,
	pickLookupMatches,
	rankN8nDocsEntries,
	type N8nDocsMatch,
} from './n8n-docs/ranking';
import {
	getFetchErrorMessage,
	getDocsUrlCandidates,
	getN8nDocsRegistry,
	normalizeDocsUrl,
	N8N_DOCS_REGISTRY_URL,
	readN8nDocsEntry,
	resetN8nDocsRegistryCacheForTests,
	toPublicDocsUrl,
	type N8nDocsDocument,
	parseN8nDocsRegistry,
} from './n8n-docs/registry';
import {
	DEFAULT_MAX_CONTENT_LENGTH,
	DEFAULT_MAX_PAGES,
	DEFAULT_MAX_RESULTS,
	MAX_CONTENT_LENGTH,
	MAX_PAGES,
	MAX_RESULTS,
	n8nDocsRuntimeInputSchema,
	n8nDocsToolInputSchema,
	type N8nDocsLookupInput,
	type N8nDocsReadInput,
	type N8nDocsSearchInput,
} from './n8n-docs/schemas';
import { N8N_DOCS_TOOL_ID } from './tool-ids';

export { N8N_DOCS_TOOL_ID };
export {
	N8N_DOCS_REGISTRY_URL,
	getDocsUrlCandidates,
	normalizeDocsUrl,
	parseN8nDocsRegistry,
	rankN8nDocsEntries,
	resetN8nDocsRegistryCacheForTests,
	toPublicDocsUrl,
	type N8nDocsDocument,
	type N8nDocsMatch,
};

const SOURCE_ATTRIBUTION_INSTRUCTION =
	'When answering from returned docs, end with `Source: [Page title](page URL)` for one page or `Sources:` for multiple pages, using only returned page titles and URLs.';

function clamp(value: number | undefined, fallback: number, max: number): number {
	if (value === undefined) return fallback;
	return Math.min(value, max);
}

function toPublicMatch(match: N8nDocsMatch): N8nDocsMatch {
	const publicUrl = toPublicDocsUrl(match.url);
	return {
		...match,
		url: publicUrl,
		path: new URL(publicUrl).pathname,
	};
}

function emptyLookupResult(
	input: N8nDocsLookupInput | N8nDocsSearchInput,
	registry: Awaited<ReturnType<typeof getN8nDocsRegistry>>,
) {
	return {
		query: getLookupQuery(input),
		intent: input.intent ?? 'general',
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry?.fetchedAt ?? '',
		matches: [],
		documents: [],
		...(registry.hint ? { hint: registry.hint } : {}),
		...(registry.error ? { error: registry.error } : {}),
	};
}

async function handleSearch(context: Pick<InstanceAiContext, 'logger'>, input: N8nDocsSearchInput) {
	const registry = await getN8nDocsRegistry(context);
	if (!registry.registry) return emptyLookupResult(input, registry);

	const maxResults = clamp(input.maxResults, DEFAULT_MAX_RESULTS, MAX_RESULTS);
	const matches = rankN8nDocsEntries(registry.registry.entries, input).slice(0, maxResults);

	return {
		query: getLookupQuery(input),
		intent: input.intent ?? 'general',
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		matches: matches.map(toPublicMatch),
		...(registry.hint ? { hint: registry.hint } : {}),
	};
}

async function handleLookup(context: Pick<InstanceAiContext, 'logger'>, input: N8nDocsLookupInput) {
	const registry = await getN8nDocsRegistry(context);
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

	const readResults = await Promise.allSettled(
		pagesToRead.map(async (match) => await readN8nDocsEntry(match, maxContentLength)),
	);

	for (const [index, result] of readResults.entries()) {
		const match = pagesToRead[index];
		if (!match) continue;
		if (result.status === 'fulfilled') {
			documents.push(result.value);
		} else {
			readErrors.push(`${match.title}: ${getFetchErrorMessage(result.reason)}`);
		}
	}

	const hints = [
		registry.hint,
		readErrors.length ? `Some docs pages could not be read: ${readErrors.join('; ')}` : undefined,
	].filter((hint): hint is string => typeof hint === 'string' && hint.length > 0);

	return {
		query: getLookupQuery(input),
		intent: input.intent ?? 'general',
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		matches: pagesToRead.map(toPublicMatch),
		documents,
		...(hints.length ? { hint: hints.join(' ') } : {}),
	};
}

async function handleRead(context: Pick<InstanceAiContext, 'logger'>, input: N8nDocsReadInput) {
	const registry = await getN8nDocsRegistry(context);
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

	const docsRegistry = registry.registry;
	const entry = getDocsUrlCandidates(input.url)
		.map((candidate) => docsRegistry.byUrl.get(candidate))
		.find((candidate) => candidate !== undefined);
	if (!entry) {
		return {
			url: input.url,
			registryUrl: N8N_DOCS_REGISTRY_URL,
			registryFetchedAt: docsRegistry.fetchedAt,
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
		url: toPublicDocsUrl(entry.url),
		registryUrl: N8N_DOCS_REGISTRY_URL,
		registryFetchedAt: docsRegistry.fetchedAt,
		documents: [await readN8nDocsEntry(entry, maxContentLength)],
		...(registry.hint ? { hint: registry.hint } : {}),
	};
}

export function createN8nDocsTool(context: Pick<InstanceAiContext, 'logger'>) {
	return new Tool(N8N_DOCS_TOOL_ID)
		.description(
			`Search and read current n8n documentation from docs.n8n.io. Load via \`load_tool\` before calling (search "n8n docs" if not visible). Use for n8n product, setup, credential, node, hosting, API, and troubleshooting questions. ${SOURCE_ATTRIBUTION_INSTRUCTION}`,
		)
		.input(n8nDocsToolInputSchema)
		.handler(async (input) => {
			const parsedInput = n8nDocsRuntimeInputSchema.parse(input);
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
