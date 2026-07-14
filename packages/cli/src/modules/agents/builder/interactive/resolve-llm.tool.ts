import type { BuiltTool, CredentialListItem, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { z } from 'zod';

import { BUILDER_TOOLS } from '../builder-tool-names';
import { LLM_PROVIDER_DEFAULTS, type LlmProviderDefault } from './llm-provider-defaults';

/** User-facing name written for an n8n Connect (AI Gateway) managed model credential. */
const N8N_CONNECT_CREDENTIAL_NAME = 'n8n Connect';

export interface ModelLookup {
	list(
		credentialId: string,
		credentialType: string,
		provider: string,
	): Promise<Array<{ name: string; value: string }>>;
}

export interface ResolveLlmToolDeps {
	credentialProvider: CredentialProvider;
	modelLookup: ModelLookup;
	/**
	 * Whether n8n Connect (AI Gateway) serves the given model provider (e.g.
	 * `openai`). When provided, the tool offers n8n Connect as an additional
	 * credential for served providers the user has no own credential for.
	 */
	isProviderServedByGateway?(provider: string): Promise<boolean>;
}

type LlmCredentialEntry = [credentialType: string, defaults: LlmProviderDefault];

function findProviderDefault(provider: string): LlmCredentialEntry | undefined {
	const requestedProvider = provider.trim();
	return Object.entries(LLM_PROVIDER_DEFAULTS).find(
		([, defaults]) => defaults.provider === requestedProvider,
	);
}

function toLlmResolution(
	credential: CredentialListItem,
	defaults: LlmProviderDefault,
	model?: string,
) {
	return {
		ok: true as const,
		provider: defaults.provider,
		model: model?.trim() || defaults.defaultModel,
		credentialId: credential.id,
		credentialName: credential.name,
	};
}

async function resolveModelAgainstLookup(
	credential: CredentialListItem,
	defaults: LlmProviderDefault,
	requestedModel: string,
	modelLookup: ModelLookup,
) {
	const trimmedModel = requestedModel.trim();
	if (!isModelDiscoveryProvider(defaults.provider) || !trimmedModel) {
		return toLlmResolution(credential, defaults, requestedModel);
	}

	let availableModels: Array<{ name: string; value: string }>;
	try {
		availableModels = await modelLookup.list(credential.id, credential.type, defaults.provider);
	} catch (error) {
		return {
			ok: false as const,
			reason: 'model_lookup_failed' as const,
			provider: defaults.provider,
			requestedModel: trimmedModel,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	const lowerHint = trimmedModel.toLowerCase();
	const exactMatch = availableModels.find((m) => m.value.toLowerCase() === lowerHint);
	if (exactMatch) {
		return toLlmResolution(credential, defaults, exactMatch.value);
	}

	const candidates = availableModels.filter(
		(m) => m.value.toLowerCase().includes(lowerHint) || m.name.toLowerCase().includes(lowerHint),
	);
	if (candidates.length === 1) {
		return toLlmResolution(credential, defaults, candidates[0].value);
	}

	return {
		ok: false as const,
		reason: 'unknown_model' as const,
		provider: defaults.provider,
		requestedModel: trimmedModel,
		availableModels: candidates.length > 0 ? candidates : availableModels,
	};
}

export function buildResolveLlmTool(deps: ResolveLlmToolDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.RESOLVE_LLM)
		.description(
			'Resolve the agent main LLM without showing a picker. ' +
				'Only call this when the user explicitly names a provider or model — do NOT call it ' +
				'at the start of a conversation or proactively for fresh agents. ' +
				'If provider is given, resolves only that provider; if model is omitted, uses the ' +
				'provider default model. For "Anthropic via OpenRouter", pass provider="openrouter" ' +
				'and omit model unless the user named a concrete OpenRouter model id. Returns ok=false ' +
				'when credentials are missing, unsupported, or ambiguous; use ask_questions to let the ' +
				'user choose, then call resolve_llm again with the choice.',
		)
		.input(
			z.object({
				provider: z
					.string()
					.optional()
					.describe('Requested provider, e.g. "anthropic", "openai", or "openrouter".'),
				model: z
					.string()
					.optional()
					.describe(
						'Requested model without the selected provider prefix. For OpenRouter use the routed id, e.g. "anthropic/claude-sonnet-4.6".',
					),
			}),
		)
		.handler(async ({ provider, model }: { provider?: string; model?: string }) => {
			const all = await deps.credentialProvider.list();
			const ownCredentials = all.filter((credential) => LLM_PROVIDER_DEFAULTS[credential.type]);

			// Offer n8n Connect as an additional credential for each gateway-served
			// provider the user has no own credential for. It then flows through the same
			// resolution below as any credential: single → auto-use, several → ask, none →
			// missing (a legitimate setup prompt, e.g. a provider n8n Connect does not serve).
			const managedCredentials: CredentialListItem[] = [];
			for (const [credentialType, defaults] of Object.entries(LLM_PROVIDER_DEFAULTS)) {
				const hasOwnCredential = ownCredentials.some((c) => c.type === credentialType);
				if (
					!hasOwnCredential &&
					((await deps.isProviderServedByGateway?.(defaults.provider)) ?? false)
				) {
					managedCredentials.push({
						id: AI_GATEWAY_MANAGED_TAG,
						name: N8N_CONNECT_CREDENTIAL_NAME,
						type: credentialType,
					});
				}
			}
			const llmCredentials = [...ownCredentials, ...managedCredentials];

			if (provider) {
				const providerEntry = findProviderDefault(provider);
				if (!providerEntry) {
					return {
						ok: false as const,
						reason: 'unsupported_provider' as const,
						provider,
						supportedProviders: Object.values(LLM_PROVIDER_DEFAULTS).map(
							(defaults) => defaults.provider,
						),
					};
				}

				const [credentialType, defaults] = providerEntry;
				const matchingCredentials = llmCredentials.filter(
					(credential) => credential.type === credentialType,
				);

				if (matchingCredentials.length === 1) {
					const credential = matchingCredentials[0];
					if (model?.trim()) {
						return await resolveModelAgainstLookup(credential, defaults, model, deps.modelLookup);
					}
					return toLlmResolution(credential, defaults);
				}

				return {
					ok: false as const,
					reason:
						matchingCredentials.length === 0
							? ('missing_credential' as const)
							: ('ambiguous_credential' as const),
					provider: defaults.provider,
					credentialType,
					credentials: matchingCredentials.map((credential) => ({
						id: credential.id,
						name: credential.name,
					})),
				};
			}

			if (llmCredentials.length === 1) {
				const credential = llmCredentials[0];
				const defaults = LLM_PROVIDER_DEFAULTS[credential.type];
				if (model?.trim()) {
					return await resolveModelAgainstLookup(credential, defaults, model, deps.modelLookup);
				}
				return toLlmResolution(credential, defaults);
			}

			return {
				ok: false as const,
				reason:
					llmCredentials.length === 0
						? ('missing_credential' as const)
						: ('ambiguous_provider_or_credential' as const),
				credentials: llmCredentials.map((credential) => {
					const defaults = LLM_PROVIDER_DEFAULTS[credential.type];
					return {
						id: credential.id,
						name: credential.name,
						type: credential.type,
						provider: defaults.provider,
					};
				}),
			};
		})
		.build();
}
