import {
	INSTANCE_AI_CATALOG_PROVIDERS,
	type InstanceAiCatalogModel,
	type InstanceAiCatalogProvider,
	type InstanceAiModelCatalogResponse,
} from '@n8n/api-types';
import type { ProviderCatalog } from '@n8n/agents/catalog';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

const CATALOG_CACHE_TTL_MS = 60 * 60 * 1000;
const CATALOG_FETCH_TIMEOUT_MS = 5000;

function emptyCatalogResponse(): InstanceAiModelCatalogResponse {
	return {
		models: {
			anthropic: [],
			openai: [],
			openrouter: [],
		},
	};
}

function compareModels(a: InstanceAiCatalogModel, b: InstanceAiCatalogModel): number {
	const aReleaseTime = a.releaseDate ? Date.parse(a.releaseDate) : Number.NaN;
	const bReleaseTime = b.releaseDate ? Date.parse(b.releaseDate) : Number.NaN;
	const aHasReleaseDate = !Number.isNaN(aReleaseTime);
	const bHasReleaseDate = !Number.isNaN(bReleaseTime);

	if (aHasReleaseDate && bHasReleaseDate && aReleaseTime !== bReleaseTime) {
		return bReleaseTime - aReleaseTime;
	}
	if (aHasReleaseDate !== bHasReleaseDate) return aHasReleaseDate ? -1 : 1;

	return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

function isEligibleModel(model: unknown): model is {
	id: string;
	name: string;
	toolCall: true;
	modalities: { output: ['text'] };
	releaseDate?: unknown;
} {
	const id = typeof model === 'object' && model !== null ? Reflect.get(model, 'id') : undefined;
	const name = typeof model === 'object' && model !== null ? Reflect.get(model, 'name') : undefined;
	const modalities =
		typeof model === 'object' && model !== null ? Reflect.get(model, 'modalities') : undefined;
	const output =
		typeof modalities === 'object' && modalities !== null
			? Reflect.get(modalities, 'output')
			: undefined;
	return (
		typeof model === 'object' &&
		model !== null &&
		Reflect.get(model, 'toolCall') === true &&
		Array.isArray(output) &&
		output.length === 1 &&
		output[0] === 'text' &&
		typeof id === 'string' &&
		id.length > 0 &&
		typeof name === 'string' &&
		name.length > 0
	);
}

@Service()
export class InstanceAiModelCatalogService {
	private readonly logger: Logger;

	private cached?: { value: InstanceAiModelCatalogResponse; expiresAt: number };

	private fetchPromise?: Promise<InstanceAiModelCatalogResponse>;

	constructor(logger: Logger) {
		this.logger = logger.scoped('instance-ai');
	}

	async getModels(): Promise<InstanceAiModelCatalogResponse> {
		if (this.cached && Date.now() < this.cached.expiresAt) return this.cached.value;

		this.fetchPromise ??= this.refresh().finally(() => {
			this.fetchPromise = undefined;
		});

		return await this.fetchPromise;
	}

	private async refresh(): Promise<InstanceAiModelCatalogResponse> {
		try {
			const catalog = await this.fetchCatalogWithTimeout();
			const value = this.toResponse(catalog);
			this.cached = { value, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS };
			return value;
		} catch (error) {
			this.logger.warn('Failed to load the Instance AI model catalog', {
				error: ensureError(error).message,
			});
			return this.cached?.value ?? emptyCatalogResponse();
		}
	}

	private async fetchCatalogWithTimeout(): Promise<ProviderCatalog> {
		const abortController = new AbortController();
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const timeoutPromise = new Promise<never>((_resolve, reject) => {
			timeout = setTimeout(() => {
				reject(new Error('Model catalog request timed out'));
				abortController.abort();
			}, CATALOG_FETCH_TIMEOUT_MS);
		});
		const catalogPromise = this.fetchCatalog(abortController.signal);
		void catalogPromise.catch(() => undefined);

		try {
			return await Promise.race([catalogPromise, timeoutPromise]);
		} finally {
			if (timeout) clearTimeout(timeout);
		}
	}

	protected async fetchCatalog(signal: AbortSignal): Promise<ProviderCatalog> {
		const { fetchProviderCatalog } = await import('@n8n/agents/catalog');
		return await fetchProviderCatalog({ signal });
	}

	private toResponse(catalog: ProviderCatalog): InstanceAiModelCatalogResponse {
		const response = emptyCatalogResponse();

		for (const provider of INSTANCE_AI_CATALOG_PROVIDERS) {
			response.models[provider] = this.getProviderModels(catalog, provider);
		}

		return response;
	}

	private getProviderModels(
		catalog: ProviderCatalog,
		provider: InstanceAiCatalogProvider,
	): InstanceAiCatalogModel[] {
		return Object.values(catalog[provider]?.models ?? {})
			.filter(isEligibleModel)
			.map((model) => ({
				id: model.id,
				name: model.name,
				...(typeof model.releaseDate === 'string' ? { releaseDate: model.releaseDate } : {}),
			}))
			.sort(compareModels);
	}
}
