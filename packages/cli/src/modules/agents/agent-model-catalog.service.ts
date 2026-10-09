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
import type { ModelChoice } from './builder/model-lookup.types';
import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import { stripSnapshotSuffix } from './utils/model-snapshot-alias';
import { normalizeProviderModelId } from './utils/provider-model-id';

function getProviderCredentialType(provider: string): string | undefined {
	if (!isModelDiscoveryProvider(provider)) return undefined;
	return getAgentModelProviderCredentialTypes(provider)[0];
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
		if (!credentialId || !credentialType) return await this.unverifiedCatalog(provider);

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
			return await this.unavailableModels(provider, credentialId, error);
		}
		return await this.modelsFromLookup(provider, credentialId, lookup);
	}

	private async unverifiedCatalog(provider: string): Promise<AgentProviderModelsResponse> {
		const models = await this.getCatalogModels(provider);
		return { provider, verified: false, models: Object.values(models) };
	}

	private async unavailableModels(
		provider: string,
		credentialId: string,
		error: unknown,
		policy?: LiveModelLookupResult['policy'],
	): Promise<AgentProviderModelsResponse> {
		this.logLiveLookupFailure(provider, error);
		// Managed and custom endpoint lists are authoritative. Do not use a static fallback.
		if (
			policy === 'managed' ||
			policy === 'endpoint-only' ||
			credentialId === AI_GATEWAY_MANAGED_TAG
		) {
			return { provider, verified: true, unavailable: true, models: [] };
		}
		return await this.unverifiedCatalog(provider);
	}

	private async modelsFromLookup(
		provider: string,
		credentialId: string,
		lookup: LiveModelLookupResult,
	): Promise<AgentProviderModelsResponse> {
		if (lookup.status === 'unavailable') {
			return await this.unavailableModels(provider, credentialId, lookup.error, lookup.policy);
		}
		if (lookup.policy === 'endpoint-only') {
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

		const catalogModels = await this.getCatalogModels(provider);
		const models =
			lookup.policy === 'managed'
				? this.enrichManagedModels(provider, lookup.models, catalogModels)
				: this.verifyCuratedModels(provider, lookup.models, catalogModels);
		return this.withDefaultModel(provider, credentialId, { provider, verified: true, models });
	}

	private enrichManagedModels(
		provider: string,
		liveModels: ModelChoice[],
		catalogModels: Record<string, AgentCatalogModel>,
	): AgentCatalogModel[] {
		// Keep exact gateway IDs. Catalog aliases supply display metadata only.
		return liveModels.map((live) => {
			const id = normalizeProviderModelId(provider, live.value);
			const catalogMatch = catalogModels[id] ?? catalogModels[stripSnapshotSuffix(id)];
			return catalogMatch
				? { ...catalogMatch, id }
				: {
						id,
						name: normalizeProviderModelId(provider, live.name) || id,
						toolCall: true,
					};
		});
	}

	private verifyCuratedModels(
		provider: string,
		liveModels: ModelChoice[],
		catalogModels: Record<string, AgentCatalogModel>,
	): AgentCatalogModel[] {
		const liveModelIds = new Set(
			liveModels.flatMap((live) =>
				liveModelIdVariants(normalizeProviderModelId(provider, live.value)),
			),
		);
		const catalogList = Object.values(catalogModels);

		// models.dev is the curated display list; the live lookup only verifies it.
		// Provider `/models` endpoints return every variant/snapshot, so we never
		// add live-only models — we only prune catalog entries the provider no
		// longer reports (retired ids that would 404 at call time).
		if (catalogList.length > 0) return catalogList.filter((model) => liveModelIds.has(model.id));

		// With no catalog, return the verified live list.
		return liveModels.map((live) => {
			const id = normalizeProviderModelId(provider, live.value);
			return {
				id,
				name: normalizeProviderModelId(provider, live.name) || id,
				toolCall: true,
			};
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
