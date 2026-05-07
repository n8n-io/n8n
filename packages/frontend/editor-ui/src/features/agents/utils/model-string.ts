/**
 * Model identifier helpers. The canonical storage format is `"<provider>/<name>"`.
 * Centralised here because three callers (Agent panel, Advanced panel, AskLlm
 * card) used to roll their own and drifted on naming + edge cases.
 */

export interface ParsedModel {
	provider: string;
	name: string;
}

/** Split `"<provider>/<name>"` on the first `/`. Returns null when malformed. */
export function parseModelString(model: string): ParsedModel | null {
	const slashIndex = model.indexOf('/');
	if (slashIndex <= 0) return null;
	return { provider: model.slice(0, slashIndex), name: model.slice(slashIndex + 1) };
}

/** Build the canonical string. Pass-through for already-string inputs. */
export function modelToString(
	raw: string | { provider: string | null; name: string | null } | undefined,
): string {
	if (!raw) return '';
	if (typeof raw === 'string') return raw;
	return `${raw.provider ?? ''}/${raw.name ?? ''}`;
}

/** Read just the provider, accepting either string or object form. */
export function parseProvider(
	raw: string | { provider: string | null; name: string | null } | undefined,
): string {
	if (!raw) return '';
	if (typeof raw === 'object') return raw.provider ?? '';
	const parsed = parseModelString(raw);
	return parsed?.provider ?? '';
}

/**
 * Normalise provider-specific id quirks. Currently only Google's `"models/"`
 * prefix is stripped — other providers pass through unchanged.
 */
export function sanitizeModelId(provider: string, modelId: string): string {
	if (provider === 'google') return modelId.replace(/^models\//, '');
	return modelId;
}
