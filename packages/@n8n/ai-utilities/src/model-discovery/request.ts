import { UserError } from 'n8n-workflow';

import type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';

/** GET a provider endpoint and parse JSON, treating rejected credentials as user errors. */
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
		if (response.status === 401 || response.status === 403) {
			throw new UserError(
				"Models couldn't be loaded. Check that the selected credential is valid and has the required permissions, then try again.",
				{ shouldReport: false },
			);
		}

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

/**
 * Ensure a base URL's path ends with `suffix`, appending it if missing.
 *
 * `stripSuffix`, when given and present at the end of the path, is removed
 * before `suffix` is appended (e.g. a path ending in `/v1` becomes one
 * ending in `/anthropic/v1`, not `/v1/anthropic/v1`).
 */
export function ensureUrlPathSuffix(
	baseURL: string,
	suffix: string,
	options?: { stripSuffix?: string },
): string {
	const url = new URL(baseURL);

	const path = url.pathname.replace(/\/$/, '');
	if (path.endsWith(suffix)) return baseURL;

	const trimmedPath =
		options?.stripSuffix && path.endsWith(options.stripSuffix)
			? path.slice(0, -options.stripSuffix.length)
			: path;
	url.pathname = `${trimmedPath}${suffix}`;

	return url.toString();
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
