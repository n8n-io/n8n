import { raceWithAbort, throwIfAborted } from '@n8n/agents';
import { fetchProviderCatalog, type ModelInfo, type ProviderCatalog } from '@n8n/agents/catalog';
import { z } from 'zod';

import type { SearchModelsInput, SearchModelsResult } from './schemas';

const FRESH_TTL_MS = 60 * 60 * 1000;
const MAX_STALE_AGE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const SOURCE = 'https://models.dev/api.json';

const GUIDANCE =
	'Preliminary catalog candidates only. Credential access has not been checked. ' +
	'When a provider credential or Gateway credits is available, use nodes(action="explore-resources") with that credential instead. ' +
	'Catalog absence does not prove that a model is invalid. Catalog prices do not prove free-tier access. ' +
	'Do not replace a working or requested model based on this list.';

interface CatalogSnapshot {
	catalog: ProviderCatalog;
	fetchedAt: number;
}

const releaseDateSchema = z.string().date();

function toSearchModel(model: ModelInfo): SearchModelsResult['models'][number] {
	const releaseDate = releaseDateSchema.safeParse(model.releaseDate);
	return {
		id: model.id,
		name: model.name,
		releaseDate: releaseDate.success ? releaseDate.data : null,
		status: model.status ?? null,
		toolCalling: model.toolCallKnown === true ? model.toolCall : null,
		reasoning: model.reasoning ?? null,
		modalities: {
			input: model.modalities?.input ? [...model.modalities.input] : null,
			output: model.modalities?.output ? [...model.modalities.output] : null,
		},
		limits: {
			context: model.limits?.context ?? null,
			output: model.limits?.output ?? null,
		},
		pricing: model.cost
			? {
					currency: 'USD',
					unit: 'per_million_tokens',
					input: model.cost.input,
					output: model.cost.output,
					cacheRead: model.cost.cacheRead ?? null,
					cacheWrite: model.cost.cacheWrite ?? null,
				}
			: null,
	};
}

function compareModels(
	a: SearchModelsResult['models'][number],
	b: SearchModelsResult['models'][number],
): number {
	if (a.releaseDate !== b.releaseDate) {
		if (a.releaseDate === null) return 1;
		if (b.releaseDate === null) return -1;
		return a.releaseDate > b.releaseDate ? -1 : 1;
	}
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export class ModelCatalogService {
	private snapshot?: CatalogSnapshot;
	private refreshPromise?: Promise<void>;

	async search(input: SearchModelsInput, abortSignal?: AbortSignal): Promise<SearchModelsResult> {
		throwIfAborted(abortSignal);
		const providerId = input.provider.trim().toLowerCase();
		const query = input.query?.trim().toLowerCase();
		const base = {
			provider: providerId,
			source: SOURCE,
			credentialAccess: 'not_checked',
			guidance: GUIDANCE,
			hasMore: false,
			models: [],
		} satisfies Partial<SearchModelsResult>;

		if (!this.snapshot || Date.now() - this.snapshot.fetchedAt >= FRESH_TTL_MS) {
			// Callers share public catalog data. Cancelling one caller must not cancel the refresh.
			this.refreshPromise ??= this.refresh().finally(() => {
				this.refreshPromise = undefined;
			});
			await raceWithAbort(this.refreshPromise, abortSignal);
		}

		const snapshot = this.snapshot;
		if (!snapshot || Date.now() - snapshot.fetchedAt >= MAX_STALE_AGE_MS) {
			return {
				...base,
				status: 'catalog_unavailable',
				fetchedAt: null,
				freshness: 'unavailable',
			};
		}

		const metadata = {
			...base,
			fetchedAt: new Date(snapshot.fetchedAt).toISOString(),
			freshness: Date.now() - snapshot.fetchedAt < FRESH_TTL_MS ? 'fresh' : 'stale',
		} satisfies Partial<SearchModelsResult>;
		if (!Object.hasOwn(snapshot.catalog, providerId)) {
			return { ...metadata, status: 'unknown_provider' };
		}

		const models = Object.values(snapshot.catalog[providerId].models)
			.filter(
				(model) =>
					model.status !== 'deprecated' &&
					model.modalities?.input?.includes('text') &&
					model.modalities.output?.includes('text'),
			)
			.filter(
				(model) =>
					!query ||
					model.id.toLowerCase().includes(query) ||
					model.name.toLowerCase().includes(query),
			)
			.map(toSearchModel)
			.sort(compareModels);
		return {
			...metadata,
			status: models.length > 0 ? 'ok' : 'no_matching_models',
			models: models.slice(0, input.limit),
			hasMore: models.length > input.limit,
		};
	}

	private async refresh(): Promise<void> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const catalog = await raceWithAbort(
				async () => await fetchProviderCatalog({ signal: controller.signal }),
				controller.signal,
			);
			// An empty parsed catalog may mean upstream data no longer matches the schema.
			if (Object.keys(catalog).length > 0) {
				this.snapshot = { catalog, fetchedAt: Date.now() };
			}
		} catch {
			// Keep the last successful snapshot; search reports whether it is still usable.
		} finally {
			clearTimeout(timer);
		}
	}
}
