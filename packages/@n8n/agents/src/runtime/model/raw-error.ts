import { isRecord } from '@n8n/utils/is-record';

import { getModelProvider } from './prompt-cache';
import { type ProviderId } from './provider-credentials';
import type { ModelTurnErrorType } from '../loop/run-output-sink';

/** A recognized failure signal read from the provider's raw stream events. */
export interface RawProviderError {
	type: ModelTurnErrorType;
	/** The provider's own reason string (e.g. Google's `PROHIBITED_CONTENT`). */
	reason: string;
}

/**
 * Reads a provider's native raw stream events (the AI SDK's `chunk.rawValue`
 * passthrough, enabled by `includeRawChunks`) for failure signals the SDK does
 * not surface — e.g. a prompt safety block that ends the stream with no error
 * and no content. Each provider's wire format differs, so the runtime stays
 * provider-agnostic and delegates to a per-provider implementation selected
 * via {@link createRawErrorReader}.
 */
export interface RawErrorReader {
	/** Inspect one raw provider event for a failure signal. */
	capture(rawValue: unknown): void;
	/** The failure signal seen this turn, or undefined when none was observed. */
	getError(): RawProviderError | undefined;
}

/**
 * Google reports prompt safety blocks only via `promptFeedback.blockReason` on
 * the raw stream — the response then simply contains no candidates.
 */
export class GoogleRawErrorReader implements RawErrorReader {
	private blockReason: string | undefined;

	capture(rawValue: unknown): void {
		if (!isRecord(rawValue) || !isRecord(rawValue.promptFeedback)) return;
		const blockReason = rawValue.promptFeedback.blockReason;
		if (typeof blockReason === 'string' && blockReason) {
			this.blockReason = blockReason;
		}
	}

	getError(): RawProviderError | undefined {
		return this.blockReason ? { type: 'prompt_blocked', reason: this.blockReason } : undefined;
	}
}

/**
 * Per-provider raw-error readers, keyed by provider id. Partial because this is
 * best-effort diagnostics: a provider without an entry still gets the generic
 * empty-response handling, just without the provider's own reason attached.
 */
const RAW_ERROR_READERS: Partial<Record<ProviderId, () => RawErrorReader>> = {
	google: () => new GoogleRawErrorReader(),
};

/**
 * Create a fresh raw-error reader for the run's model, or undefined when the
 * provider has no reader. The provider is the prefix of the `provider/model` id
 * (same convention as `createModel`).
 */
export function createRawErrorReader(modelId: string): RawErrorReader | undefined {
	const provider = getModelProvider(modelId) as ProviderId;
	return RAW_ERROR_READERS[provider]?.();
}
