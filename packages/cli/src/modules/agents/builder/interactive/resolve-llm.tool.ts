import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialListItem, CredentialProvider } from '@n8n/agents';
import { z } from 'zod';

import { BUILDER_TOOLS } from '../builder-tool-names';
import { LLM_PROVIDER_DEFAULTS, type LlmProviderDefault } from './llm-provider-defaults';

export interface ResolveLlmToolDeps {
	credentialProvider: CredentialProvider;
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
					return toLlmResolution(matchingCredentials[0], defaults, model);
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
				return toLlmResolution(credential, LLM_PROVIDER_DEFAULTS[credential.type], model);
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
