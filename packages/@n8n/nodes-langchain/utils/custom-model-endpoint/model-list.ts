import { isRecord } from '@n8n/utils/is-record';

function idOf(entry: unknown): string | undefined {
	if (typeof entry === 'string') return entry;
	if (isRecord(entry) && typeof entry.id === 'string') return entry.id;
	return undefined;
}

/**
 * OpenAI answers `{ data: [{ id }] }`; gateways that trim it answer a bare array. Anything else
 * is a shape this does not know, which is not the same as a gateway that lists no models.
 *
 * One rule, so the list the transport passes through is the list the node reads.
 */
export function modelIdsIn(body: unknown): string[] | undefined {
	const entries = Array.isArray(body)
		? body
		: isRecord(body) && Array.isArray(body.data)
			? body.data
			: undefined;
	if (entries === undefined) return undefined;

	const ids = entries.flatMap((entry) => {
		const id = idOf(entry);
		return id ? [id] : [];
	});
	// Entries that none of them names a model is a shape this does not know either,
	// unlike the empty list of a gateway that publishes no models.
	return entries.length > 0 && ids.length === 0 ? undefined : ids;
}
