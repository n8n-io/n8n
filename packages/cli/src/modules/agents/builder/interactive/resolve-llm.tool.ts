import type { BuiltTool, CredentialListItem, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { z } from 'zod';

import { BUILDER_TOOLS } from '../builder-tool-names';
import {
	LLM_PROVIDER_DEFAULTS,
	LLM_PROVIDER_PRIORITY,
	type LlmProviderDefault,
} from '../../llm-provider-defaults';

/** User-facing name written for an n8n credits (AI Gateway managed) model credential. */
const N8N_CONNECT_CREDENTIAL_NAME = 'n8n credits';

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
	/**
	 * Whether n8n Connect (AI Gateway) serves the given model provider (e.g.
	 * `openai`). When provided, the tool offers n8n Connect as an additional
	 * credential for served providers the user has no own credential for.
	 */
	isProviderServedByGateway?(provider: string): Promise<boolean>;
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

async function resolveDefaultModelForCredential(
	credential: CredentialListItem,
	defaults: LlmProviderDefault,
	modelLookup: ModelLookup,
) {
	// Managed credential: no fallback key, and gateway discovery is authoritative — the
	// static default may not be on the allowlist — so pick the default (or first served)
	// model from the gateway's list. Own credentials keep the static default.
	if (credential.id !== AI_GATEWAY_MANAGED_TAG || !isModelDiscoveryProvider(defaults.provider)) {
		return toLlmResolution(credential, defaults);
	}

	let availableModels: Array<{ name: string; value: string }>;
	try {
		availableModels = await modelLookup.list(credential.id, credential.type, defaults.provider);
	} catch (error) {
		return {
			ok: false as const,
			reason: 'model_lookup_failed' as const,
			provider: defaults.provider,
			requestedModel: defaults.defaultModel,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	if (availableModels.length === 0) {
		return {
			ok: false as const,
			reason: 'unknown_model' as const,
			provider: defaults.provider,
			requestedModel: defaults.defaultModel,
			availableModels,
		};
	}

	const preferred =
		availableModels.find((m) => m.value === defaults.defaultModel) ?? availableModels[0];
	return toLlmResolution(credential, defaults, preferred.value);
}

/**
 * Resolve the n8n Connect managed credential for a provider on an explicit
 * request; fails only when the provider is unknown or the gateway does not
 * serve it (own-credential precedence is the caller's concern).
 *
 * Model failures flow straight through from the shared resolvers, so an
 * `unknown_model` result still carries `availableModels` (the gateway's
 * allowlist) for the caller to retry with or surface, and `model_lookup_failed`
 * stays retryable.
 */
async function resolveManagedCredentialForProvider(
	provider: string,
	model: string | undefined,
	deps: ResolveLlmToolDeps,
) {
	const providerEntry = findProviderDefault(provider);
	if (!providerEntry) {
		return {
			ok: false as const,
			reason: 'unsupported_provider' as const,
			provider,
			supportedProviders: Object.values(LLM_PROVIDER_DEFAULTS).map((defaults) => defaults.provider),
		};
	}

	const [credentialType, defaults] = providerEntry;
	const served = (await deps.isProviderServedByGateway?.(defaults.provider)) ?? false;
	if (!served) {
		return {
			ok: false as const,
			reason: 'n8n_credits_unsupported_provider' as const,
			provider: defaults.provider,
		};
	}

	const managed: CredentialListItem = {
		id: AI_GATEWAY_MANAGED_TAG,
		name: N8N_CONNECT_CREDENTIAL_NAME,
		type: credentialType,
	};
	if (model?.trim()) {
		return await resolveModelAgainstLookup(managed, defaults, model, deps.modelLookup);
	}
	return await resolveDefaultModelForCredential(managed, defaults, deps.modelLookup);
}

/** Distinct gateway-served providers, for resolving an unqualified n8n-credits request. */
async function servedGatewayProviders(deps: ResolveLlmToolDeps): Promise<string[]> {
	const served = new Set<string>();
	for (const defaults of Object.values(LLM_PROVIDER_DEFAULTS)) {
		if ((await deps.isProviderServedByGateway?.(defaults.provider)) ?? false) {
			served.add(defaults.provider);
		}
	}
	return [...served];
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
				'claimedFreeOpenAiCredits: true; tell the user free OpenAI credits were set up. When the ' +
				'provider has no own credential but n8n credits (the managed option) serves it, the tool ' +
				'resolves to the managed credential — the result credentialName is "n8n credits"; persist it ' +
				'like any credential and tell the user the model runs on n8n credits. When the user ' +
				'explicitly asks to use n8n credits, pass useN8nCredits: true (with provider when named): ' +
				'the tool resolves n8n credits for that provider without a picker even if the user has their ' +
				'own credential for it, and returns ok=false with reason "n8n_credits_unsupported_provider", ' +
				'"ambiguous_n8n_credits_provider" (with providers), or "n8n_credits_unavailable" (n8n ' +
				'credits serves no provider on this instance) when it cannot. When multiple ' +
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
				useN8nCredits: z
					.boolean()
					.optional()
					.describe(
						'Set true when the user explicitly asked to use n8n credits for the main model. ' +
							'Resolves n8n credits for the requested provider even if the user already has ' +
							'their own credential for it, and never asks. Pass `provider` when the user named one.',
					),
			}),
		)
		.handler(
			async ({
				provider,
				model,
				credentialId,
				useN8nCredits,
			}: {
				provider?: string;
				model?: string;
				credentialId?: string;
				useN8nCredits?: boolean;
			}) => {
				// Explicit "use n8n credits" wins over own credentials and never asks:
				// resolve the managed credential for the named provider, or the sole
				// gateway-served provider when none is named.
				if (useN8nCredits) {
					if (provider) {
						return await resolveManagedCredentialForProvider(provider, model, deps);
					}
					const served = await servedGatewayProviders(deps);
					if (served.length === 1) {
						return await resolveManagedCredentialForProvider(served[0], model, deps);
					}
					if (served.length === 0) {
						return { ok: false as const, reason: 'n8n_credits_unavailable' as const };
					}
					return {
						ok: false as const,
						reason: 'ambiguous_n8n_credits_provider' as const,
						providers: served,
					};
				}

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

				if (credentialId) {
					const matchingCredentials = llmCredentials.filter((c) => c.id === credentialId);
					if (matchingCredentials.length === 0) {
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

					// A real credential id is unique, but the managed tag is shared by every
					// gateway-served provider. So a named provider has to narrow the match
					// rather than only break a tie — otherwise a lone managed entry is accepted
					// for a provider the gateway does not serve, and the wrong one is persisted.
					let candidates = matchingCredentials;
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

						const [credentialType] = providerEntry;
						candidates = matchingCredentials.filter((c) => c.type === credentialType);
					}

					const credential = candidates.length === 1 ? candidates[0] : undefined;

					if (!credential) {
						return {
							ok: false as const,
							reason: 'ambiguous_credential' as const,
							credentials: matchingCredentials.map((c) => {
								const defaults = LLM_PROVIDER_DEFAULTS[c.type];
								return {
									id: c.id,
									name: c.name,
									type: c.type,
									provider: defaults.provider,
								};
							}),
						};
					}

					const defaults = LLM_PROVIDER_DEFAULTS[credential.type];
					if (model?.trim()) {
						return await resolveModelAgainstLookup(credential, defaults, model, deps.modelLookup);
					}
					return await resolveDefaultModelForCredential(credential, defaults, deps.modelLookup);
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
						return await resolveDefaultModelForCredential(credential, defaults, deps.modelLookup);
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
					return await resolveDefaultModelForCredential(credential, defaults, deps.modelLookup);
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
						const resolved = await resolveDefaultModelForCredential(
							topCredentials[0],
							LLM_PROVIDER_DEFAULTS[topCredentials[0].type],
							deps.modelLookup,
						);
						if (!resolved.ok) return resolved;
						return {
							...resolved,
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
