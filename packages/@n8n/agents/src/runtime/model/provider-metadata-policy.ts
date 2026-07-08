import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { isRecord } from '@n8n/utils/is-record';

import type { ContentReasoning } from '../../types/sdk/message';
import type { JSONObject } from '../../types/utils/json';

const OPENAI_RESPONSES_STATE_KEYS = new Set(['itemId', 'responseId', 'phase']);

function hasEntries(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}

function shouldStripOpenAiResponsesField(key: string, value: unknown): boolean {
	return (
		OPENAI_RESPONSES_STATE_KEYS.has(key) ||
		(key === 'reasoningEncryptedContent' && (value === null || value === undefined))
	);
}

function sanitizeOpenAiResponsesRecord(
	value: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const result: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!shouldStripOpenAiResponsesField(key, entry)) {
			result[key] = entry;
		}
	}

	return hasEntries(result) ? result : undefined;
}

function sanitizeOpenAiResponsesJsonObject(value: JSONObject): JSONObject | undefined {
	const result: JSONObject = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!shouldStripOpenAiResponsesField(key, entry)) {
			result[key] = entry;
		}
	}

	return hasEntries(result) ? result : undefined;
}

export function sanitizeProviderMetadataForReplay(
	providerMetadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!providerMetadata) return undefined;

	const result: Record<string, unknown> = {};
	for (const [provider, metadata] of Object.entries(providerMetadata)) {
		if (provider === 'openai' && isRecord(metadata)) {
			const sanitizedOpenAiMetadata = sanitizeOpenAiResponsesRecord(metadata);
			if (sanitizedOpenAiMetadata) result[provider] = sanitizedOpenAiMetadata;
			continue;
		}

		result[provider] = metadata;
	}

	return hasEntries(result) ? result : undefined;
}

export function sanitizeProviderOptionsForReplay(
	providerOptions: ProviderOptions | undefined,
): ProviderOptions | undefined {
	if (!providerOptions) return undefined;

	const result: ProviderOptions = {};
	for (const [provider, options] of Object.entries(providerOptions)) {
		if (provider === 'openai') {
			const sanitizedOpenAiOptions = sanitizeOpenAiResponsesJsonObject(options);
			if (sanitizedOpenAiOptions) result[provider] = sanitizedOpenAiOptions;
			continue;
		}

		result[provider] = options;
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

export function hasReplayableReasoningProviderOptions(
	providerOptions: ProviderOptions | undefined,
): boolean {
	if (!providerOptions) return false;

	const openAiOptions = getRecord(providerOptions.openai);
	if (typeof openAiOptions?.reasoningEncryptedContent === 'string') return true;

	const anthropicOptions = getRecord(providerOptions.anthropic);
	if (
		typeof anthropicOptions?.signature === 'string' ||
		typeof anthropicOptions?.redactedData === 'string'
	) {
		return true;
	}

	return Object.entries(providerOptions).some(
		([provider, options]) =>
			provider !== 'openai' && provider !== 'anthropic' && hasEntries(options),
	);
}

/**
 * Some providers replay reasoning from `providerOptions`, but the AI SDK exposes
 * replay fields in `providerMetadata`. Copy them across so the next request can
 * replay the reasoning block. Existing `providerOptions` values win.
 */
export function getReasoningReplayProviderOptions(
	block: ContentReasoning,
): ProviderOptions | undefined {
	const anthropicMetadata = getRecord(block.providerMetadata?.anthropic);
	const signature = anthropicMetadata?.signature;
	const redactedData = anthropicMetadata?.redactedData;

	const openAiMetadata = getRecord(block.providerMetadata?.openai);
	const reasoningEncryptedContent = openAiMetadata?.reasoningEncryptedContent;

	const hasAnthropicReplayFields =
		typeof signature === 'string' || typeof redactedData === 'string';
	const hasOpenAiReplayFields = typeof reasoningEncryptedContent === 'string';
	if (!hasAnthropicReplayFields && !hasOpenAiReplayFields) {
		return block.providerOptions;
	}

	return {
		...block.providerOptions,
		...(hasOpenAiReplayFields && {
			openai: {
				reasoningEncryptedContent,
				...getRecord(block.providerOptions?.openai),
			},
		}),
		...(hasAnthropicReplayFields && {
			anthropic: {
				...(typeof signature === 'string' && { signature }),
				...(typeof redactedData === 'string' && { redactedData }),
				...getRecord(block.providerOptions?.anthropic),
			},
		}),
	};
}
