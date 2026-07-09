/**
 * resolve_llm — resolve the target agent's main LLM (provider/model/credential)
 * WITHOUT a picker, using the available LLM-provider credentials. Non-interactive:
 * returns ok=false with options when the choice is missing/ambiguous, so the
 * caller can fall back to the native ask-user tool and then write the choice
 * into the config file and build_agent it. (Instance AI has no picker cards,
 * so there is no interactive ask_llm tool here.)
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { LLM_PROVIDER_DEFAULTS, type LlmProviderDefault } from './llm-provider-defaults';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

function findProviderDefault(provider: string): [string, LlmProviderDefault] | undefined {
	const requested = provider.trim().toLowerCase();
	return Object.entries(LLM_PROVIDER_DEFAULTS).find(
		([, d]) => d.provider.toLowerCase() === requested,
	);
}

function toLlmResolution(
	credential: { id: string; name: string },
	defaults: LlmProviderDefault,
	model?: string,
) {
	const trimmed = model?.trim();
	return {
		ok: true as const,
		provider: defaults.provider,
		model: trimmed && trimmed.length > 0 ? trimmed : defaults.defaultModel,
		credentialId: credential.id,
		credentialName: credential.name,
	};
}

async function resolveModelAgainstLookup(
	service: InstanceAiAgentBuilderService,
	credential: { id: string; name: string; type: string },
	defaults: LlmProviderDefault,
	requestedModel: string,
) {
	const trimmed = requestedModel.trim();
	if (!defaults.modelLookup || !trimmed)
		return toLlmResolution(credential, defaults, requestedModel);

	let availableModels;
	try {
		availableModels = await service.listModels(
			credential.id,
			credential.type,
			defaults.modelLookup,
		);
	} catch (error) {
		return {
			ok: false as const,
			reason: 'model_lookup_failed' as const,
			provider: defaults.provider,
			requestedModel: trimmed,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	const hint = trimmed.toLowerCase();
	const exact = availableModels.find((m) => m.value.toLowerCase() === hint);
	if (exact) return toLlmResolution(credential, defaults, exact.value);

	const candidates = availableModels.filter(
		(m) => m.value.toLowerCase().includes(hint) || m.name.toLowerCase().includes(hint),
	);
	if (candidates.length === 1) return toLlmResolution(credential, defaults, candidates[0].value);

	return {
		ok: false as const,
		reason: 'unknown_model' as const,
		provider: defaults.provider,
		requestedModel: trimmed,
		availableModels: candidates.length > 0 ? candidates : availableModels,
	};
}

export function createResolveLlmTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.RESOLVE_LLM)
		.description(
			'Resolve the agent main LLM without showing a picker. Only call this when the user explicitly ' +
				'names a provider or model — do NOT call it proactively for fresh agents. If model is ' +
				'omitted, uses the provider default. Returns ok=false with candidate credentials/models when ' +
				'the choice is missing, unsupported, or ambiguous; ask the user (via the ask-user tool) to ' +
				'pick, then write the choice into the config file and call build_agent.',
		)
		.input(
			z.object({
				provider: z.string().optional().describe('Requested provider, e.g. "anthropic", "openai".'),
				model: z.string().optional().describe('Requested model id without the provider prefix.'),
			}),
		)
		.handler(async ({ provider, model }) => {
			const service = context.agentBuilderService;
			if (!service) {
				return { ok: false as const, reason: 'not_available' as const };
			}
			const all = await context.credentialService.list();
			const llmCredentials = all.filter((c) => LLM_PROVIDER_DEFAULTS[c.type]);

			if (provider) {
				const providerEntry = findProviderDefault(provider);
				if (!providerEntry) {
					return {
						ok: false as const,
						reason: 'unsupported_provider' as const,
						provider,
						supportedProviders: Object.values(LLM_PROVIDER_DEFAULTS).map((d) => d.provider),
					};
				}
				const [credentialType, defaults] = providerEntry;
				const matching = llmCredentials.filter((c) => c.type === credentialType);
				if (matching.length === 1) {
					return model?.trim()
						? await resolveModelAgainstLookup(service, matching[0], defaults, model)
						: toLlmResolution(matching[0], defaults);
				}
				return {
					ok: false as const,
					reason:
						matching.length === 0
							? ('missing_credential' as const)
							: ('ambiguous_credential' as const),
					provider: defaults.provider,
					credentialType,
					credentials: matching.map((c) => ({ id: c.id, name: c.name })),
				};
			}

			if (llmCredentials.length === 1) {
				const credential = llmCredentials[0];
				const defaults = LLM_PROVIDER_DEFAULTS[credential.type];
				return model?.trim()
					? await resolveModelAgainstLookup(service, credential, defaults, model)
					: toLlmResolution(credential, defaults);
			}

			return {
				ok: false as const,
				reason:
					llmCredentials.length === 0
						? ('missing_credential' as const)
						: ('ambiguous_provider_or_credential' as const),
				credentials: llmCredentials.map((c) => ({
					id: c.id,
					name: c.name,
					type: c.type,
					provider: LLM_PROVIDER_DEFAULTS[c.type].provider,
				})),
			};
		})
		.build();
}
