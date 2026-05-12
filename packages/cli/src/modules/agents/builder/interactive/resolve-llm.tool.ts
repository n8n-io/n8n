import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialListItem, CredentialProvider } from '@n8n/agents';
import { z } from 'zod';

import { BUILDER_TOOLS } from '../builder-tool-names';
import {
	LLM_PROVIDER_DEFAULTS,
	type LlmProviderDefault,
	type ModelLookupConfig,
} from './llm-provider-defaults';

export interface ModelLookup {
	list(
		credentialId: string,
		credentialType: string,
		lookup: ModelLookupConfig,
	): Promise<Array<{ name: string; value: string }>>;
}

export interface ResolveLlmToolDeps {
	credentialProvider: CredentialProvider;
	modelLookup: ModelLookup;
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
	if (!defaults.modelLookup || !trimmedModel) {
		return toLlmResolution(credential, defaults, requestedModel);
	}

	let availableModels: Array<{ name: string; value: string }>;
	try {
		availableModels = await modelLookup.list(credential.id, credential.type, defaults.modelLookup);
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
			'Resolve the agent main LLM without showing a picker. Use this when the user ' +
				'explicitly requests a provider/model, or when a fresh agent needs a default LLM. ' +
				'If provider is given, resolves only that provider; if model is omitted, uses the ' +
				'provider default model. For "Anthropic via OpenRouter", pass provider="openrouter" ' +
				'and omit model unless the user named a concrete OpenRouter model id. Returns ok=false ' +
				'when credentials are missing, unsupported, or ambiguous; use ask_llm only when the ' +
				'user must choose.',
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
			const llmCredentials = all.filter((credential) => LLM_PROVIDER_DEFAULTS[credential.type]);

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
