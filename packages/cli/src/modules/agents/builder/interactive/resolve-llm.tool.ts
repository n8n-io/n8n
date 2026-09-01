import type { BuiltTool, CredentialListItem, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { z } from 'zod';

import {
	LLM_PROVIDER_DEFAULTS,
	LLM_PROVIDER_PRIORITY,
	type LlmProviderDefault,
} from '../../llm-provider-defaults';
import { findVerifiedModelId, normalizeProviderModelId } from '../../utils/provider-model-id';
import { BUILDER_TOOLS } from '../builder-tool-names';

/** User-facing name written for an n8n credits (AI Gateway managed) model credential. */
const N8N_CONNECT_CREDENTIAL_NAME = 'Gateway credits';

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

interface CallableModel {
	name: string;
	value: string;
}

function modelLookupFailed(provider: string, requestedModel: string, error: unknown) {
	return {
		ok: false as const,
		reason: 'model_lookup_failed' as const,
		provider,
		requestedModel,
		error: error instanceof Error ? error.message : String(error),
	};
}

/**
 * The provider's live model list for this credential, every id in SDK-callable
 * form. Normalizing here is what keeps a `models/`-prefixed Google id out of
 * the agent config — it passes config validation and then fails at run time.
 */
async function listCallableModels(
	credential: CredentialListItem,
	provider: string,
	modelLookup: ModelLookup,
): Promise<{ ok: true; models: CallableModel[] } | { ok: false; error: unknown }> {
	try {
		const models = await modelLookup.list(credential.id, credential.type, provider);
		return {
			ok: true,
			models: models.map(({ name, value }) => ({
				name: normalizeProviderModelId(provider, name),
				value: normalizeProviderModelId(provider, value),
			})),
		};
	} catch (error) {
		return { ok: false, error };
	}
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

	const lookup = await listCallableModels(credential, defaults.provider, modelLookup);
	if (!lookup.ok) return modelLookupFailed(defaults.provider, trimmedModel, lookup.error);

	const availableModels = lookup.models;
	const verified = findVerifiedModelId(
		defaults.provider,
		trimmedModel,
		availableModels.map((m) => m.value),
	);
	if (verified) return toLlmResolution(credential, defaults, verified);

	const lowerHint = normalizeProviderModelId(defaults.provider, trimmedModel).toLowerCase();
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

/**
 * The provider default is a maintained hint, not a guarantee: a provider can
 * stop serving it, and a given key may never have been able to reach it. So it
 * is checked against this credential's live list like any other candidate — an
 * unvalidated default ships straight into the agent config, and every model
 * call then fails with `404 Not Found`.
 */
async function resolveDefaultModelForCredential(
	credential: CredentialListItem,
	defaults: LlmProviderDefault,
	modelLookup: ModelLookup,
) {
	if (!isModelDiscoveryProvider(defaults.provider)) {
		return toLlmResolution(credential, defaults);
	}

	const lookup = await listCallableModels(credential, defaults.provider, modelLookup);
	if (!lookup.ok) return modelLookupFailed(defaults.provider, defaults.defaultModel, lookup.error);

	const availableModels = lookup.models;
	if (availableModels.length > 0) {
		const verified = findVerifiedModelId(
			defaults.provider,
			defaults.defaultModel,
			availableModels.map((m) => m.value),
		);
		if (verified) return toLlmResolution(credential, defaults, verified);

		// The managed allowlist is short and curated, so its first entry is a safe
		// stand-in for an un-allowlisted default. A provider's own catalog is long
		// and name-sorted, where the first entry is arbitrary — surface the list and
		// let the agent choose instead of persisting a coin flip.
		if (credential.id === AI_GATEWAY_MANAGED_TAG) {
			return toLlmResolution(credential, defaults, availableModels[0].value);
		}
	}

	return {
		ok: false as const,
		reason: 'unknown_model' as const,
		provider: defaults.provider,
		requestedModel: defaults.defaultModel,
		availableModels,
	};
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
			reason: 'gateway_credits_unsupported_provider' as const,
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
				'A fresh agent may already have a model and credential persisted by the system at creation ' +
				'(a sensible default was auto-selected). Before calling this tool on a fresh agent, call ' +
				'read_config first: if model and credential are already set, keep them, mention the choice ' +
				'in your summary as changeable, and do not call resolve_llm. Only when model is empty call ' +
				'resolve_llm once, silently, before the first config write to detect existing credentials — ' +
				'with provider/model when the user named them, otherwise without arguments. ' +
				'Also call it whenever the user names or changes a provider or model. ' +
				'If provider is given, resolves only that provider; if model is omitted, uses the ' +
				'provider default model. Every model it returns — the default included — is checked ' +
				'against the list the chosen credential can actually reach, so reason "unknown_model" ' +
				'(carrying availableModels) can come back even when you passed no model: retry with a ' +
				'value from availableModels, never the id that just failed. For "Anthropic via OpenRouter", pass provider="openrouter" ' +
				'and omit model unless the user named a concrete OpenRouter model id. Returns ok=false ' +
				'when credentials are missing, unsupported, or ambiguous — during an initial build, do not ' +
				'ask; keep building with model "" and include the model choice in the trailing ' +
				'finish_setup call, then call resolve_llm again with the answer. For a model ' +
				'change on an existing agent, ask immediately and keep the current model and credential until the new one resolves. ' +
				'When no matching credential exists and the user is eligible for free OpenAI credits, the tool ' +
				'claims them automatically and resolves to openai/gpt-5-mini — the result carries ' +
				'claimedFreeOpenAiCredits: true; tell the user free OpenAI credits were set up. When the ' +
				'provider has no own credential but Gateway credits (the managed option) serve it, the tool ' +
				'resolves to the managed credential — the result credentialName is "Gateway credits"; persist it ' +
				'like any credential and tell the user the model runs on Gateway credits. When the user ' +
				'explicitly asks to use Gateway credits, pass useGatewayCredits: true (with provider when named): ' +
				'the tool resolves Gateway credits for that provider without a picker even if the user has their ' +
				'own credential for it, and returns ok=false with reason "gateway_credits_unsupported_provider", ' +
				'"ambiguous_gateway_credits_provider" (with providers), or "gateway_credits_unavailable" (Gateway ' +
				'credits serve no provider on this instance) when it cannot. When multiple ' +
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
						'Requested model without the selected provider prefix. For OpenRouter use the routed id, e.g. "anthropic/claude-sonnet-5".',
					),
				credentialId: z
					.string()
					.optional()
					.describe(
						'Credential id picked by the user from an earlier ambiguous resolve_llm result.',
					),
				useGatewayCredits: z
					.boolean()
					.optional()
					.describe(
						'Set true when the user explicitly asked to use Gateway credits for the main model. ' +
							'Resolves Gateway credits for the requested provider even if the user already has ' +
							'their own credential for it, and never asks. Pass `provider` when the user named one.',
					),
			}),
		)
		.handler(
			async ({
				provider,
				model,
				credentialId,
				useGatewayCredits,
			}: {
				provider?: string;
				model?: string;
				credentialId?: string;
				useGatewayCredits?: boolean;
			}) => {
				// Explicit "use n8n credits" wins over own credentials and never asks:
				// resolve the managed credential for the named provider, or the sole
				// gateway-served provider when none is named.
				if (useGatewayCredits) {
					if (provider) {
						return await resolveManagedCredentialForProvider(provider, model, deps);
					}
					const served = await servedGatewayProviders(deps);
					if (served.length === 1) {
						return await resolveManagedCredentialForProvider(served[0], model, deps);
					}
					if (served.length === 0) {
						return { ok: false as const, reason: 'gateway_credits_unavailable' as const };
					}
					return {
						ok: false as const,
						reason: 'ambiguous_gateway_credits_provider' as const,
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
