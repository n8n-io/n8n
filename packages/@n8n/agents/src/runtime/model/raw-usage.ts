import { isRecord } from '@n8n/utils';

import { type ProviderId } from './provider-credentials';
import type { TokenUsage } from '../../types';

/**
 * Reads a provider's native raw stream events (the AI SDK's `chunk.rawValue`
 * passthrough, enabled by `includeRawChunks`) and accumulates the in-flight
 * turn's token usage. This lets an aborted run — where the AI SDK surfaces no
 * usage — still be billed for the tokens consumed before the stop.
 *
 * Each provider's wire format differs, so the runtime stays provider-agnostic
 * and delegates the translation to a per-provider implementation selected via
 * {@link createRawUsageReader}.
 */
export interface RawUsageReader {
	/** Fold one raw provider event into the in-flight accumulator. */
	capture(rawValue: unknown): void;
	/** The accumulated in-flight usage, or undefined when nothing usable was seen. */
	getUsage(): TokenUsage | undefined;
}

/**
 * Anthropic raw usage. `message_start` carries input/cache tokens (final from
 * the first event) plus the initial output count; `message_delta` updates the
 * cumulative output as it streams. Best-effort: unknown shapes leave usage unset.
 */
export class AnthropicRawUsageReader implements RawUsageReader {
	private raw: Record<string, unknown> | undefined;

	capture(rawValue: unknown): void {
		if (typeof rawValue !== 'object' || rawValue === null) return;
		const event = rawValue as { type?: unknown; message?: unknown; usage?: unknown };
		if (event.type === 'message_start' && isRecord(event.message)) {
			const usage = event.message.usage;
			if (isRecord(usage)) this.raw = usage;
		} else if (event.type === 'message_delta' && isRecord(event.usage)) {
			this.raw = { ...(this.raw ?? {}), ...event.usage };
		}
	}

	getUsage(): TokenUsage | undefined {
		const raw = this.raw;
		if (!raw) return undefined;
		const num = (v: unknown): number => (typeof v === 'number' && v > 0 ? v : 0);
		const noCache = num(raw.input_tokens);
		const cacheWrite = num(raw.cache_creation_input_tokens);
		const cacheRead = num(raw.cache_read_input_tokens);
		const output = num(raw.output_tokens);
		const promptTokens = noCache + cacheWrite + cacheRead;
		if (promptTokens + output <= 0) return undefined;

		const usage: TokenUsage = {
			promptTokens,
			completionTokens: output,
			totalTokens: promptTokens + output,
		};
		if (noCache || cacheRead || cacheWrite) {
			usage.inputTokenDetails = {
				...(noCache && { noCache }),
				...(cacheRead && { cacheRead }),
				...(cacheWrite && { cacheWrite }),
			};
		}
		return usage;
	}
}

/**
 * Per-provider raw-usage readers, keyed by provider id. Partial because raw
 * abort-recovery is best-effort: a provider without an entry simply gets no
 * recovered usage (the AI SDK's normalized usage still covers the happy path).
 */
const RAW_USAGE_READERS: Partial<Record<ProviderId, () => RawUsageReader>> = {
	anthropic: () => new AnthropicRawUsageReader(),
};

/**
 * Create a fresh raw-usage reader for the run's model, or undefined when the
 * provider has no reader. The provider is the prefix of the `provider/model` id
 * (same convention as `createModel`).
 */
export function createRawUsageReader(modelId: string): RawUsageReader | undefined {
	const provider = modelId.split('/')[0] as ProviderId;
	return RAW_USAGE_READERS[provider]?.();
}
