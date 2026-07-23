import type { AgentCatalogModel, AgentProviderModelsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';

import { BuilderModelLiveLookupService } from './builder/builder-model-live-lookup.service';
import { LLM_PROVIDER_DEFAULTS } from './llm-provider-defaults';

/** Google's models API returns ids as `models/<id>`; the AI SDK expects the bare id. */
const GOOGLE_MODEL_ID_PREFIX = 'models/';

function getProviderCredentialType(provider: string): string | undefined {
	if (!isModelDiscoveryProvider(provider)) return undefined;
	for (const [credentialType, entry] of Object.entries(LLM_PROVIDER_DEFAULTS)) {
		if (entry.provider === provider) return credentialType;
	}
	return undefined;
}

function normalizeLiveModelValue(provider: string, value: string): string {
	if (provider === 'google' && value.startsWith(GOOGLE_MODEL_ID_PREFIX)) {
		return value.slice(GOOGLE_MODEL_ID_PREFIX.length);
	}
	return value;
}

/** Dated snapshot suffixes: Anthropic `-20251001`, OpenAI `-2024-08-06`. */
const SNAPSHOT_SUFFIX = /-(?:\d{8}|\d{4}-\d{2}-\d{2})$/;

/**
 * The ids a live model verifies. Providers list older models only as dated
 * snapshots (e.g. `claude-haiku-4-5-20251001`) while the catalog prefers the
 * versionless alias (`claude-haiku-4-5`, which providers resolve to the latest
 * snapshot) — so a listed snapshot also verifies its alias. A retired alias
 * still prunes: retired models have no live snapshot either.
 */
function liveModelIdVariants(id: string): string[] {
	const alias = id.replace(SNAPSHOT_SUFFIX, '');
	return alias === id ? [id] : [id, alias];
}

/**
 * Builds the model list offered in the agent model picker for one provider.
 *
 * The curated models.dev catalog is the display list — it is the up-to-date set
 * of chat models with names, cost, and limits. But it lags provider
 * retirements, so a listed model can 404 at call time. When a credential is
 * available we verify the catalog against the provider's own model API (via the
 * shared `@n8n/ai-utilities/model-discovery` functions) and prune any catalog
 * entry the provider no longer reports. We never add live-only
 * models: provider `/models` endpoints return every variant/snapshot and would
 * overload the picker. Without a credential, or when the provider has no list
 * API wired up, the catalog list is returned unpruned with `verified: false`.
 */
@Service()
export class AgentModelCatalogService {
	constructor(
		private readonly logger: Logger,
		private readonly builderModelLiveLookupService: BuilderModelLiveLookupService,
	) {}

	async getProviderModels(
		user: User,
		projectId: string,
		provider: string,
		credentialId?: string,
	): Promise<AgentProviderModelsResponse> {
		const catalogModels = await this.getCatalogModels(provider);
		const credentialType = getProviderCredentialType(provider);

		if (!credentialId || !credentialType) {
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		let liveModels: Array<{ name: string; value: string }>;
		try {
			liveModels = await this.builderModelLiveLookupService.list(
				user,
				projectId,
				credentialId,
				credentialType,
				provider,
			);
		} catch (error) {
			this.logger.warn('Live model list failed — falling back to the static catalog', {
				provider,
				error: error instanceof Error ? error.message : String(error),
			});
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		const liveModelIds = new Set(
			liveModels.flatMap((live) =>
				liveModelIdVariants(normalizeLiveModelValue(provider, live.value)),
			),
		);
		const catalogList = Object.values(catalogModels);

		// models.dev is the curated display list; the live lookup only verifies it.
		// Provider `/models` endpoints return every variant/snapshot, so we never
		// add live-only models — we only prune catalog entries the provider no
		// longer reports (retired ids that would 404 at call time).
		if (catalogList.length > 0) {
			return {
				provider,
				verified: true,
				models: catalogList.filter((model) => liveModelIds.has(model.id)),
			};
		}

		// Catalog unavailable (models.dev down or no entry for this provider): there
		// is no curated list to prune against, so show the verified live list rather
		// than an empty picker.
		return {
			provider,
			verified: true,
			models: liveModels.map((live) => {
				const id = normalizeLiveModelValue(provider, live.value);
				return {
					id,
					name: normalizeLiveModelValue(provider, live.name) || id,
					reasoning: false,
					toolCall: true,
				};
			}),
		};
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
