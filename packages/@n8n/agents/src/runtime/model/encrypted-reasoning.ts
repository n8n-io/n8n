import { isRecord } from '@n8n/utils/is-record';
import type { ModelMessage } from 'ai';

import { isLlmMessage } from '../../sdk/message';
import { hasErrorCode } from './error-code';
import type { AgentDbMessage } from '../../types/sdk/message';

/** The OpenAI keys that replay a reasoning item (see `PROVIDER_QUIRKS.openai.reasoningReplayKeys`). */
const OPENAI_REPLAY_KEYS = ['itemId', 'reasoningEncryptedContent'];

/**
 * OpenAI encrypts replayed reasoning with a key of the org that produced it.
 * Another org rejects it with this code, for example after a session changes
 * from Gateway credits to an own API key.
 */
export function isEncryptedReasoningRejected(error: unknown): boolean {
	return hasErrorCode(error, 'invalid_encrypted_content');
}

function hasEncryptedReasoning(options: Record<string, unknown> | undefined): boolean {
	const openai = options?.openai;
	return isRecord(openai) && typeof openai.reasoningEncryptedContent === 'string';
}

function withoutReplayKeys<T extends Record<string, unknown>>(
	options: T | undefined,
): T | undefined {
	const openai = options?.openai;
	if (!options || !isRecord(openai)) return options;
	const kept = Object.fromEntries(
		Object.entries(openai).filter(([key]) => !OPENAI_REPLAY_KEYS.includes(key)),
	);
	return { ...options, openai: kept };
}

/**
 * Remove the OpenAI replay data from every reasoning block, in place. The
 * blocks stay, so the reasoning text and block positions do not change, but
 * the next request no longer replays them. Returns the changed messages.
 */
export function stripEncryptedReasoning(messages: readonly AgentDbMessage[]): AgentDbMessage[] {
	return messages.filter((message) => {
		if (!isLlmMessage(message) || message.role !== 'assistant') return false;
		let changed = false;
		for (const block of message.content) {
			if (block.type !== 'reasoning') continue;
			if (
				!hasEncryptedReasoning(block.providerMetadata) &&
				!hasEncryptedReasoning(block.providerOptions)
			) {
				continue;
			}
			block.providerMetadata = withoutReplayKeys(block.providerMetadata);
			block.providerOptions = withoutReplayKeys(block.providerOptions);
			changed = true;
		}
		return changed;
	});
}

/** Drop the reasoning parts that replay OpenAI encrypted content from a prepared request. */
export function withoutEncryptedReasoning(messages: ModelMessage[]): ModelMessage[] {
	return messages.flatMap((message) => {
		if (message.role !== 'assistant' || typeof message.content === 'string') return [message];
		const content = message.content.filter(
			(part) => part.type !== 'reasoning' || !hasEncryptedReasoning(part.providerOptions),
		);
		if (content.length === message.content.length) return [message];
		return content.length > 0 ? [{ ...message, content }] : [];
	});
}
