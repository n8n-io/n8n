import type { BuiltTool, CredentialListItem, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';
import { z } from 'zod';

import { BUILDER_TOOLS } from '../builder-tool-names';
import {
	LLM_PROVIDER_DEFAULTS,
	LLM_PROVIDER_PRIORITY,
	type LlmProviderDefault,
} from '../../llm-provider-defaults';

export interface ModelLookup {
	list(
		credentialId: string,
		credentialType: string,
		provider: string,
	): Promise<Array<{ name: string; value: string }>>;
}

/** Provisions free OpenAI credits on demand for a zero-credential builder session. */
export interface FreeCreditsProvisioner {
	isEligible(): boolean | Promise<boolean>;
	claim(): Promise<{ credentialId: string; credentialName: string }>;
}

export interface ResolveLlmToolDeps {
	credentialProvider: CredentialProvider;
	modelLookup: ModelLookup;
	freeCredits: FreeCreditsProvisioner;
}

type LlmCredentialEntry = [credentialType: string, defaults: LlmProviderDefault];

const FREE_CREDITS_MODEL = 'gpt-5-mini';

/** Silently claims free OpenAI credits if eligible; never throws. */
async function tryClaimFreeCredits(freeCredits: FreeCreditsProvisioner) {
	try {
		if (!(await freeCredits.isEligible())) return null;
		const { credentialId, credentialName } = await freeCredits.claim();
		return {
			ok: true as const,
			provider: 'openai',
			model: FREE_CREDITS_MODEL,
			credentialId,
			credentialName,
			claimedFreeOpenAiCredits: true as const,
		};
	} catch {
		return null;
	}
}

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
				'For fresh agents, call it once, silently, before the first config write to detect existing ' +
				'credentials — with provider/model when the user named them, otherwise without arguments. ' +
				'Also call it whenever the user names or changes a provider or model. ' +
				'If provider is given, resolves only that provider; if model is omitted, uses the ' +
				'provider default model. For "Anthropic via OpenRouter", pass provider="openrouter" ' +
				'and omit model unless the user named a concrete OpenRouter model id. Returns ok=false ' +
				'when credentials are missing, unsupported, or ambiguous — during an initial build, do not ' +
				'ask; keep building with model "" and include the model choice in the trailing ' +
				'finish_setup call, then call resolve_llm again with the answer. For a model ' +
				'change on an existing agent, ask immediately and keep the current model and credential until the new one resolves. ' +
				'When no matching credential exists and the user is eligible for free OpenAI credits, the tool ' +
				'claims them automatically and resolves to openai/gpt-5-mini — the result carries ' +
				'claimedFreeOpenAiCredits: true; tell the user free OpenAI credits were set up. When multiple ' +
				'providers each have one credential, the tool auto-picks the recommended provider — the result ' +
				'carries autoPicked: true and otherProviders; state the pick as changeable, do not ask to confirm it. ' +
				'When the user picks between multiple credentials of one provider, pass the picked credentialId ' +
				'from the earlier ambiguous result.',
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
				credentialId: z
					.string()
					.optional()
					.describe(
						'Credential id picked by the user from an earlier ambiguous resolve_llm result.',
					),
			}),
		)
		.handler(
			async ({
				provider,
				model,
				credentialId,
			}: {
				provider?: string;
				model?: string;
				credentialId?: string;
			}) => {
				const all = await deps.credentialProvider.list();
				const llmCredentials = all.filter((credential) => LLM_PROVIDER_DEFAULTS[credential.type]);

				if (credentialId) {
					const credential = llmCredentials.find((c) => c.id === credentialId);
					if (!credential) {
						return {
							ok: false as const,
							reason: 'unknown_credential' as const,
							credentialId,
							credentials: llmCredentials.map((c) => ({
								id: c.id,
								name: c.name,
								type: c.type,
							})),
						};
					}
					const defaults = LLM_PROVIDER_DEFAULTS[credential.type];
					if (model?.trim()) {
						return await resolveModelAgainstLookup(credential, defaults, model, deps.modelLookup);
					}
					return toLlmResolution(credential, defaults);
				}

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

					if (
						matchingCredentials.length === 0 &&
						defaults.provider === 'openai' &&
						!model?.trim()
					) {
						const claimed = await tryClaimFreeCredits(deps.freeCredits);
						if (claimed) return claimed;
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

				if (llmCredentials.length === 0 && !model?.trim()) {
					const claimed = await tryClaimFreeCredits(deps.freeCredits);
					if (claimed) return claimed;
				}

				if (llmCredentials.length > 1 && !model?.trim()) {
					const byProvider = new Map<string, CredentialListItem[]>();
					for (const credential of llmCredentials) {
						const providerName = LLM_PROVIDER_DEFAULTS[credential.type].provider;
						byProvider.set(providerName, [...(byProvider.get(providerName) ?? []), credential]);
					}

					const topProvider = LLM_PROVIDER_PRIORITY.find((candidate) => byProvider.has(candidate));
					const topCredentials = topProvider ? byProvider.get(topProvider) : undefined;
					if (topProvider && topCredentials?.length === 1) {
						return {
							...toLlmResolution(topCredentials[0], LLM_PROVIDER_DEFAULTS[topCredentials[0].type]),
							autoPicked: true as const,
							otherProviders: [...byProvider.keys()].filter((other) => other !== topProvider),
						};
					}
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
			},
		)
		.build();
}
