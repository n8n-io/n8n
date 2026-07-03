import type { AgentCatalogModel, AgentProviderModelsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BuilderModelLookupService } from './builder/builder-model-lookup.service';
import {
	LLM_PROVIDER_DEFAULTS,
	type ModelLookupConfig,
} from './builder/interactive/llm-provider-defaults';

/** Google's models API returns ids as `models/<id>`; the AI SDK expects the bare id. */
const GOOGLE_MODEL_ID_PREFIX = 'models/';

interface ProviderLookup {
	credentialType: string;
	lookup: ModelLookupConfig;
}

function getProviderLookup(provider: string): ProviderLookup | undefined {
	for (const [credentialType, entry] of Object.entries(LLM_PROVIDER_DEFAULTS)) {
		if (entry.provider === provider && entry.modelLookup) {
			return { credentialType, lookup: entry.modelLookup };
		}
	}
	return undefined;
}

function normalizeLiveModelValue(provider: string, value: string): string {
	if (provider === 'google' && value.startsWith(GOOGLE_MODEL_ID_PREFIX)) {
		return value.slice(GOOGLE_MODEL_ID_PREFIX.length);
	}
	return value;
}

/**
 * Builds the model list offered in the agent model picker for one provider.
 *
 * The static models.dev catalog lags provider retirements (a listed model can
 * 404 at call time), so when a credential is available the provider's own
 * model API — reached through the same node list methods that power the chat
 * sub-node dropdowns — is the source of truth for *which* models are offered,
 * and the catalog only enriches them with metadata (display name, cost,
 * limits, capabilities). Without a credential, or when the provider has no
 * list API wired up, the catalog list is returned as-is with `verified: false`.
 */
@Service()
export class AgentModelCatalogService {
	constructor(
		private readonly logger: Logger,
		private readonly builderModelLookupService: BuilderModelLookupService,
	) {}

	async getProviderModels(
		user: User,
		provider: string,
		credentialId?: string,
	): Promise<AgentProviderModelsResponse> {
		const catalogModels = await this.getCatalogModels(provider);
		const providerLookup = getProviderLookup(provider);

		if (!credentialId || !providerLookup) {
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		let liveModels: Array<{ name: string; value: string }>;
		try {
			liveModels = await this.builderModelLookupService.list(
				user,
				credentialId,
				providerLookup.credentialType,
				providerLookup.lookup,
			);
		} catch (error) {
			this.logger.warn('Live model list failed — falling back to the static catalog', {
				provider,
				error: error instanceof Error ? error.message : String(error),
			});
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		const modelsById = new Map<string, AgentCatalogModel>();
		for (const live of liveModels) {
			const id = normalizeLiveModelValue(provider, live.value);
			const fromCatalog = catalogModels[id];
			// Live models missing from the catalog stay offered: the provider says
			// they work, the catalog just has no metadata yet. Tool support defaults
			// to true — these lists only contain chat models.
			modelsById.set(
				id,
				fromCatalog ?? {
					id,
					name: normalizeLiveModelValue(provider, live.name) || id,
					reasoning: false,
					toolCall: true,
				},
			);
		}

		return { provider, verified: true, models: [...modelsById.values()] };
	}

	private async getCatalogModels(provider: string): Promise<Record<string, AgentCatalogModel>> {
		try {
			const { fetchProviderCatalog } = await import('@n8n/agents');
			const catalog = await fetchProviderCatalog();
			return catalog[provider]?.models ?? {};
		} catch (error) {
			this.logger.warn('Model catalog fetch failed', {
				provider,
				error: error instanceof Error ? error.message : String(error),
			});
			return {};
		}
	}
}
