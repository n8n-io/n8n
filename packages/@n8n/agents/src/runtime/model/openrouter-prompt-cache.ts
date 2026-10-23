import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { isOpenRouterAnthropicModel } from '@n8n/ai-utilities/agent-config';
import { isRecord } from '@n8n/utils/is-record';
import type { ModelMessage, SystemModelMessage } from 'ai';

import { getEffectiveAnthropicCacheTtl, mergeProviderOptions } from './prompt-cache';
import type { PromptCachingConfig } from '../../types/sdk/agent';

type CacheControl = Record<string, unknown>;
type CacheTtl = '5m' | '1h';
const MAX_CACHE_BREAKPOINTS = 4;

/** Match the namespaces and key precedence in the OpenRouter chat adapter. */
function getCacheControl(options: ProviderOptions | undefined): CacheControl | undefined {
	const control =
		options?.openrouter?.cacheControl ??
		options?.openrouter?.cache_control ??
		options?.anthropic?.cacheControl ??
		options?.anthropic?.cache_control;
	return isRecord(control) ? control : undefined;
}

function getCacheTtl(control: CacheControl): CacheTtl {
	return control.ttl === '1h' ? '1h' : '5m';
}

/** Count wire breakpoints, including the marker copied to each tool result. */
function getMessageCacheControls(message: ModelMessage): Array<CacheControl | undefined> {
	const control = getCacheControl(message.providerOptions);
	// The adapter reads only message options for these roles.
	if (message.role === 'system' || message.role === 'assistant') return [control];
	if (message.role === 'tool') {
		return message.content
			.filter((part) => part.type === 'tool-result')
			.map((part) => control ?? getCacheControl(part.providerOptions));
	}
	if (typeof message.content === 'string') return [control];
	if (message.content.length === 1 && message.content[0].type === 'text') {
		return [control ?? getCacheControl(message.content[0].providerOptions)];
	}
	const lastTextIndex = message.content.map((part) => part.type).lastIndexOf('text');
	return message.content.map((part, index) => {
		const partControl = getCacheControl(part.providerOptions);
		return partControl ?? (index === lastTextIndex ? control : undefined);
	});
}

function cacheOptions(ttl: CacheTtl): ProviderOptions {
	return { openrouter: { cacheControl: { type: 'ephemeral', ttl } } };
}

/** Add request-local caching after skills and conversation history are assembled. */
export function applyOpenRouterPromptCache(params: {
	system: SystemModelMessage | SystemModelMessage[];
	messages: ModelMessage[];
	providerOptions: ProviderOptions | undefined;
	promptCaching: PromptCachingConfig | undefined;
	modelId: string;
}): {
	system: SystemModelMessage | SystemModelMessage[];
	providerOptions: ProviderOptions | undefined;
} {
	const { system, messages, providerOptions, promptCaching, modelId } = params;
	const ttl = getEffectiveAnthropicCacheTtl(promptCaching, modelId);
	if (!isOpenRouterAnthropicModel(modelId) || !ttl) return { system, providerOptions };

	const systemMessages = Array.isArray(system) ? system : [system];
	const controls = [...systemMessages, ...messages].flatMap(getMessageCacheControls);
	const callerControls = controls.filter((control) => control !== undefined);
	const openrouter = providerOptions?.openrouter;
	const hasCallerAutomaticControl =
		openrouter !== undefined && ('cache_control' in openrouter || 'cacheControl' in openrouter);
	const automaticControl =
		openrouter && 'cache_control' in openrouter
			? openrouter.cache_control
			: openrouter?.cacheControl;
	let used = callerControls.length + (isRecord(automaticControl) ? 1 : 0);

	// Caller controls take priority, followed by stable instructions and automatic caching.
	const instructionTtl = isRecord(automaticControl) ? getCacheTtl(automaticControl) : ttl;
	const firstSystem = systemMessages[0];
	const canCacheInstructions =
		firstSystem?.content.trim() &&
		!getCacheControl(firstSystem.providerOptions) &&
		used < MAX_CACHE_BREAKPOINTS &&
		(instructionTtl === '1h' || callerControls.every((control) => getCacheTtl(control) === '5m'));
	let nextSystem = system;
	if (canCacheInstructions) {
		const cachedInstruction = {
			...firstSystem,
			providerOptions: mergeProviderOptions(
				firstSystem.providerOptions,
				cacheOptions(instructionTtl),
			),
		};
		nextSystem = Array.isArray(system)
			? [cachedInstruction, ...system.slice(1)]
			: cachedInstruction;
		used++;
	}

	// A longer TTL must precede shorter TTLs. A marked final block can also conflict with auto caching.
	if (
		hasCallerAutomaticControl ||
		used >= MAX_CACHE_BREAKPOINTS ||
		controls.at(-1) ||
		(ttl === '1h' && callerControls.some((control) => getCacheTtl(control) === '5m'))
	) {
		return { system: nextSystem, providerOptions };
	}
	return {
		system: nextSystem,
		providerOptions: mergeProviderOptions(cacheOptions(ttl), providerOptions),
	};
}
