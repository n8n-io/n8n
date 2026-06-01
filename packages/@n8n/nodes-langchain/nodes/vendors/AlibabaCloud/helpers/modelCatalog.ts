import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { apiRequest } from '../transport';

/**
 * A single model entry as returned by the Model Studio `/api/v1/models` endpoint.
 * Only the fields we rely on are typed here.
 */
export interface ModelStudioModel {
	model: string;
	name?: string;
	description?: string;
	inference_metadata?: {
		request_modality?: string[] | null;
		response_modality?: string[] | null;
	} | null;
}

interface ModelsListOutput {
	total?: number;
	models?: ModelStudioModel[];
	data?: ModelStudioModel[];
}

const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
	expires: number;
	models: ModelStudioModel[];
}

const catalogCache = new Map<string, CacheEntry>();

export function clearModelCatalogCache(): void {
	catalogCache.clear();
}

export function toModalitySet(value: unknown): Set<string> {
	if (!Array.isArray(value)) return new Set();
	return new Set(
		value
			.filter((entry): entry is string => typeof entry === 'string')
			.map((entry) => entry.toLowerCase()),
	);
}

async function fetchAllPages(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<ModelStudioModel[]> {
	const allModels: ModelStudioModel[] = [];

	for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
		const response = (await apiRequest.call(this, 'GET', '/api/v1/models', {
			qs: { page_size: PAGE_SIZE, page_no: pageNo },
		})) as { output?: ModelsListOutput } & ModelsListOutput;

		const output: ModelsListOutput = response?.output ?? response ?? {};
		const items = output.models ?? output.data ?? [];

		for (const item of items) {
			allModels.push(item);
		}

		if (items.length === 0) break;

		const total = typeof output.total === 'number' ? output.total : undefined;
		if (total !== undefined) {
			if (allModels.length >= total) break;
		} else if (items.length < PAGE_SIZE) {
			break;
		}
	}

	return allModels;
}

/**
 * Fetches every model across all pages of the `/api/v1/models` endpoint, caching
 * the result per credential for {@link CACHE_TTL_MS}. Repeated calls (e.g. typing
 * in the model dropdown, or opening several model pickers) reuse the cached list.
 */
export async function fetchModelCatalog(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<ModelStudioModel[]> {
	const credentials = await this.getCredentials('alibabaCloudApi');
	const cacheKey = `${credentials.url as string}|${credentials.apiKey as string}`;
	const now = Date.now();

	const cached = catalogCache.get(cacheKey);
	if (cached && cached.expires > now) {
		return cached.models;
	}

	const models = await fetchAllPages.call(this);
	catalogCache.set(cacheKey, { expires: now + CACHE_TTL_MS, models });
	return models;
}
