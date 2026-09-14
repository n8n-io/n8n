/** Provider prefix from a "provider/model" id (e.g. "anthropic/claude-…" → "anthropic"). */
export function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}

/**
 * Split a model id into its provider prefix and model name. Guards degenerate
 * ids that an unvalidated persisted config may contain: an id with no prefix
 * (`claude-...`) or an empty model segment (`anthropic/`, `/`) keeps the raw id
 * as the model name with an empty provider, so callers never render a blank
 * model label. Multi-slash ids keep everything after the first slash as the
 * model name (`openrouter/amazon/x` -> `{ provider: 'openrouter', model: 'amazon/x' }`).
 */
export function splitModelId(modelId: string): { provider: string; model: string } {
	const slashIdx = modelId.indexOf('/');
	const model = modelId.slice(slashIdx + 1);
	if (slashIdx === -1 || model === '') return { provider: '', model: modelId };
	return { provider: modelId.slice(0, slashIdx), model };
}
