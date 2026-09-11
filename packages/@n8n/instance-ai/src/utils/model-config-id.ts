import { isRecord } from '@n8n/utils/is-record';

/** Normalize the provider half of a `provider/model` id. The AI SDK reports the
 *  transport too (`anthropic.messages`, `moonshotai.chat`), which we drop so
 *  proxy-built models group with the plain-string model ids. */
function normalizeProvider(provider: unknown): string | undefined {
	if (typeof provider !== 'string') return undefined;
	return provider.split('.', 1)[0] || undefined;
}

/**
 * Best-effort `provider/model` id for any `ModelConfig` variant — for telemetry,
 * tracing, and logs.
 *
 * Takes `unknown` so callers holding an unnarrowed value can use it too. Returns
 * `undefined` when no id can be read, so callers pick their own fallback.
 *
 * The pre-built AI SDK `LanguageModel` variant (proxy routes) is the reason this
 * exists: it carries `modelId` plus a `provider` and no `id`, so an `id`-only
 * lookup silently misses every proxy-backed run.
 */
export function modelConfigId(config: unknown): string | undefined {
	if (typeof config === 'string') {
		return config.length > 0 ? config : undefined;
	}

	if (!isRecord(config)) return undefined;

	if (typeof config.id === 'string') return config.id;

	if (typeof config.modelId === 'string' && config.modelId.length > 0) {
		// `provider` is a prototype getter on AI SDK model instances; `config.provider`
		// is the own property the openai-compatible and Anthropic providers set.
		const provider = normalizeProvider(
			config.provider ?? (isRecord(config.config) ? config.config.provider : undefined),
		);
		return provider ? `${provider}/${config.modelId}` : config.modelId;
	}

	return undefined;
}
