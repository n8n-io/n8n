import { stripSnapshotSuffix } from './model-snapshot-alias';

/** Google's models API returns ids as `models/<id>`; the AI SDK expects the bare id. */
const GOOGLE_MODEL_ID_PREFIX = 'models/';

/**
 * The SDK-callable form of a model id as a provider's `/models` endpoint
 * reports it. Only Google needs unwrapping today, but every path that compares
 * or persists a live id must go through here — a `models/`-prefixed id passes
 * config validation and then fails at run time with `404 Not Found`.
 */
export function normalizeProviderModelId(provider: string, id: string): string {
	if (provider === 'google' && id.startsWith(GOOGLE_MODEL_ID_PREFIX)) {
		return id.slice(GOOGLE_MODEL_ID_PREFIX.length);
	}
	return id;
}

/**
 * The id from a provider's verified model list that satisfies `wantedModel`,
 * in SDK-callable form — or `undefined` when the credential cannot reach it.
 *
 * Exact match first; otherwise a verified id whose snapshot-stripped alias
 * matches, because providers list older models only as dated snapshots (e.g.
 * `claude-sonnet-4-6-20251001`) while our defaults use the versionless alias.
 * The verified id is returned with its original casing so callers can use it
 * verbatim.
 */
export function findVerifiedModelId(
	provider: string,
	wantedModel: string,
	verifiedModelIds: readonly string[],
): string | undefined {
	const wanted = normalizeProviderModelId(provider, wantedModel.trim()).toLowerCase();
	if (!wanted) return undefined;

	const normalized = verifiedModelIds.map((id) => normalizeProviderModelId(provider, id));
	return (
		normalized.find((id) => id.toLowerCase() === wanted) ??
		normalized.find((id) => stripSnapshotSuffix(id).toLowerCase() === wanted)
	);
}
