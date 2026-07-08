/** Provider prefix from a "provider/model" id (e.g. "anthropic/claude-…" → "anthropic"). */
export function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}
