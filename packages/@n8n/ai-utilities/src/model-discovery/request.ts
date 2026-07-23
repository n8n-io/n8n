import type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';

/** GET a provider endpoint and parse JSON, throwing a descriptive error on non-2xx. */
export async function getJson(
	url: string,
	headers: Record<string, string>,
	options: ListModelsOptions,
	provider: string,
): Promise<unknown> {
	const fetchFn = options.fetch ?? globalThis.fetch;
	const response = await fetchFn(url, {
		method: 'GET',
		headers: { ...headers, ...options.headers },
	});
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`Failed to list ${provider} models (status ${response.status})${body ? `: ${body.slice(0, 500)}` : ''}`,
		);
	}
	return await response.json();
}

/** Resolve the API base: caller override or the provider default, without a trailing slash. */
export function baseUrl(options: ListModelsOptions, fallback: string): string {
	return (options.baseURL ?? fallback).replace(/\/+$/, '');
}

export function bearerHeaders(options: ListModelsOptions): Record<string, string> {
	return { Authorization: `Bearer ${options.apiKey}` };
}

export function byName(a: ProviderModel, b: ProviderModel): number {
	return a.name.localeCompare(b.name);
}

export interface IdItem {
	id?: unknown;
}

/** Map `{ id }` response items to models (name = id), dropping malformed entries. */
export function idsToModels(items: IdItem[]): ProviderModel[] {
	return items
		.filter((item): item is { id: string } => typeof item.id === 'string' && item.id !== '')
		.map((item) => ({ id: item.id, name: item.id }));
}

/**
 * The most common provider shape: `GET <base>/models` with bearer auth
 * returning `{ data: [{ id }] }`, listed by id ascending.
 */
export function makeBearerDataListing(provider: string, defaultBaseUrl: string): ListModelsFn {
	return async (options) => {
		const data = (await getJson(
			`${baseUrl(options, defaultBaseUrl)}/models`,
			bearerHeaders(options),
			options,
			provider,
		)) as { data?: IdItem[] };
		return idsToModels(data.data ?? []).sort(byName);
	};
}
