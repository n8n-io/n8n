import {
	AI_GATEWAY_MANAGED_TAG,
	getAgentModelProviderCredentialTypes,
	type AgentCatalogModel,
	type AgentProviderModelsResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';

import {
	BuilderModelLiveLookupService,
	type LiveModelLookupResult,
} from './builder/builder-model-live-lookup.service';
import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import { stripSnapshotSuffix } from './utils/model-snapshot-alias';

/** Google's models API returns ids as `models/<id>`; the AI SDK expects the bare id. */
const GOOGLE_MODEL_ID_PREFIX = 'models/';

function getProviderCredentialType(provider: string): string | undefined {
	if (!isModelDiscoveryProvider(provider)) return undefined;
	return getAgentModelProviderCredentialTypes(provider)[0];
}

function normalizeLiveModelValue(provider: string, value: string): string {
	if (provider === 'google' && value.startsWith(GOOGLE_MODEL_ID_PREFIX)) {
		return value.slice(GOOGLE_MODEL_ID_PREFIX.length);
	}
	return value;
}

/**
 * The ids a live model verifies. Providers list older models only as dated
 * snapshots (e.g. `claude-haiku-4-5-20251001`) while the catalog prefers the
 * versionless alias (`claude-haiku-4-5`, which providers resolve to the latest
 * snapshot) — so a listed snapshot also verifies its alias. A retired alias
 * still prunes: retired models have no live snapshot either.
 */
function liveModelIdVariants(id: string): string[] {
	const alias = stripSnapshotSuffix(id);
	return alias === id ? [id] : [id, alias];
}

/**
 * Builds the model list offered in the agent model picker for one provider.
 *
 * For curated providers, models.dev is the display list and live discovery
 * verifies/prunes it. Custom OpenAI-compatible endpoints are the exception:
 * their live `/models` response is authoritative and models.dev is never read.
 * The managed gateway also uses exact live ids, enriched from models.dev when
 * available. Without live discovery, curated catalog models remain unverified.
 */
@Service()
export class AgentModelCatalogService {
	constructor(
		private readonly logger: Logger,
		private readonly builderModelLiveLookupService: BuilderModelLiveLookupService,
		private readonly agentDefaultModelResolverService: AgentDefaultModelResolverService,
	) {}

	/** Returns the provider's models according to the live lookup's catalog policy. */
	async getProviderModels(
		user: User,
		projectId: string,
		provider: string,
		credentialId?: string,
	): Promise<AgentProviderModelsResponse> {
		const credentialType = getProviderCredentialType(provider);

		if (!credentialId || !credentialType) {
			const catalogModels = await this.getCatalogModels(provider);
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		let lookup: LiveModelLookupResult;
		try {
			lookup = await this.builderModelLiveLookupService.lookup(
				user,
				projectId,
				credentialId,
				credentialType,
				provider,
			);
		} catch (error) {
			this.logLiveLookupFailure(provider, error);
			// Managed slot: the gateway allowlist is the contract, so don't fall back
			// to the static catalog (it may list models the gateway won't serve).
			// Flagged unavailable so the picker distinguishes a failed lookup from a
			// gateway that genuinely allows nothing.
			if (credentialId === AI_GATEWAY_MANAGED_TAG) {
				return { provider, verified: true, unavailable: true, models: [] };
			}
			const catalogModels = await this.getCatalogModels(provider);
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		// A custom endpoint can expose any OpenAI-compatible model id. Its live
		// response is authoritative, so keep exact ids and attach no inferred or
		// models.dev metadata.
		if (lookup.policy === 'endpoint-only') {
			if (lookup.status === 'unavailable') {
				this.logLiveLookupFailure(provider, lookup.error);
				return { provider, verified: true, unavailable: true, models: [] };
			}

			return this.withDefaultModel(provider, credentialId, {
				provider,
				verified: true,
				models: lookup.models.map((live) => ({
					id: live.value,
					name: live.name || live.value,
					toolCall: true,
				})),
			});
		}

		if (lookup.status === 'unavailable') {
			this.logLiveLookupFailure(provider, lookup.error);
			if (lookup.policy === 'managed' || credentialId === AI_GATEWAY_MANAGED_TAG) {
				return { provider, verified: true, unavailable: true, models: [] };
			}
			const catalogModels = await this.getCatalogModels(provider);
			return { provider, verified: false, models: Object.values(catalogModels) };
		}

		const liveModels = lookup.models;
		const catalogModels = await this.getCatalogModels(provider);

		// n8n Connect managed slot: the gateway's `/models` is the authoritative,
		// allowlist-filtered set, and its exact ids are what the gateway's model
		// allowlist matches (e.g. a dated snapshot, not the catalog's versionless
		// alias). Use those ids verbatim, enriched with catalog display/metadata.
		if (lookup.policy === 'managed') {
			return this.withDefaultModel(provider, credentialId, {
				provider,
				verified: true,
				models: liveModels.map((live) => {
					const id = normalizeLiveModelValue(provider, live.value);
					const catalogMatch = catalogModels[id] ?? catalogModels[stripSnapshotSuffix(id)];
					return catalogMatch
						? { ...catalogMatch, id }
						: {
								id,
								name: normalizeLiveModelValue(provider, live.name) || id,
								toolCall: true,
							};
				}),
			});
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
			return this.withDefaultModel(provider, credentialId, {
				provider,
				verified: true,
				models: catalogList.filter((model) => liveModelIds.has(model.id)),
			});
		}

		// Catalog unavailable (models.dev down or no entry for this provider): there
		// is no curated list to prune against, so show the verified live list rather
		// than an empty picker.
		return this.withDefaultModel(provider, credentialId, {
			provider,
			verified: true,
			models: liveModels.map((live) => {
				const id = normalizeLiveModelValue(provider, live.value);
				return {
					id,
					name: normalizeLiveModelValue(provider, live.name) || id,
					toolCall: true,
				};
			}),
		});
	}

	private withDefaultModel(
		provider: string,
		credentialId: string,
		result: AgentProviderModelsResponse,
	): AgentProviderModelsResponse {
		const resolved = this.agentDefaultModelResolverService.resolveFromVerifiedModelIds(
			provider,
			credentialId,
			result.models.map((model) => model.id),
		);
		if (!resolved) return result;

		const modelId = resolved.model.slice(`${provider}/`.length);
		return result.models.some((model) => model.id === modelId)
			? { ...result, defaultModelId: modelId }
			: result;
	}

	private logLiveLookupFailure(provider: string, error: unknown): void {
		this.logger.warn('Live model list failed', {
			provider,
			error: error instanceof Error ? error.message : String(error),
		});
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
