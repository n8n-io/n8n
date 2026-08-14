import type { INodeExecutionData } from 'n8n-workflow';
import { evaluateJmespathQuery } from 'n8n-workflow';

export const MAX_ITEMS = 20;
export const MAX_OUTPUT_CHARS = 50_000;

/**
 * Shared description of the data shape both data tools expose, so the agent
 * builds correct JMESPath expressions. Items keep their `{ json, binary }`
 * wrapper (matching the non-query response), so fields live under `json`.
 */
export const ITEM_SHAPE_HINT =
	'The data is a JSON array of item objects; index the first item as `[0]`, not `items[0]`, ' +
	'and read its fields under `json` — e.g. `[0].json`, `[0].json.fieldName`, `[*].json.fieldName`. ' +
	'Any binary fields are listed by name under `binary`.';

/** Shared guidance steering the agent to query only as a truncation-recovery step. */
export const QUERY_WHEN_TRUNCATED_HINT =
	'Use only when a previous non-query result came back truncated — never re-query data you already received in full.';

/** Strips binary payloads down to their key names — the agent only needs to know they exist. */
export function toSafeItem(item: INodeExecutionData): Record<string, unknown> {
	const safe: Record<string, unknown> = { json: item.json };
	if (item.binary) {
		safe.binary = Object.keys(item.binary);
	}
	return safe;
}

/**
 * Caps a list of items to MAX_ITEMS / MAX_OUTPUT_CHARS, stripping binary and
 * substituting a bounded preview when even the first item exceeds the size cap.
 */
export function trimItems(allItems: INodeExecutionData[]): {
	items: Array<Record<string, unknown>>;
	truncated: boolean;
} {
	const items: Array<Record<string, unknown>> = [];
	let itemPreviewed = false;
	let serializedSize = 0;
	for (const item of allItems.slice(0, MAX_ITEMS)) {
		const safe = toSafeItem(item);
		const safeSize = JSON.stringify(safe).length;
		if (serializedSize + safeSize > MAX_OUTPUT_CHARS) {
			// Always give the agent something, even when one item exceeds the cap.
			if (items.length === 0) {
				items.push({
					jsonPreview: JSON.stringify(item.json).slice(0, MAX_OUTPUT_CHARS),
					itemTruncated: true,
				});
				itemPreviewed = true;
			}
			break;
		}
		serializedSize += safeSize;
		items.push(safe);
	}
	return { items, truncated: itemPreviewed || items.length < allItems.length };
}

/**
 * Runs a JMESPath query against full (untrimmed) data, bounded only by the
 * output-size ceiling. Never throws — guard/parser errors and no-match become
 * `{ error }` payloads the agent can read and recover from. When the matched
 * value exceeds the size ceiling, `result` is a serialised string preview
 * (not the original value) and `truncated` is `true`.
 */
export function runQuery(
	data: unknown,
	query: string,
): { result: unknown; truncated: boolean } | { error: string } {
	let result: unknown;
	try {
		result = evaluateJmespathQuery(data, query);
	} catch (error) {
		return { error: `Query failed: ${(error as Error).message}` };
	}

	if (result === null || result === undefined) {
		return { error: `Query '${query}' matched no data.` };
	}

	const serialized = JSON.stringify(result);
	if (serialized.length > MAX_OUTPUT_CHARS) {
		return { result: serialized.slice(0, MAX_OUTPUT_CHARS), truncated: true };
	}
	return { result, truncated: false };
}

/**
 * Runs a JMESPath query against the wrapped (`{ json, binary }`) item shape the
 * tools expose to the agent — keeping query targets consistent with the
 * non-query response (see {@link ITEM_SHAPE_HINT}). Binary is reduced to key
 * names before querying.
 */
export function queryItems(
	items: INodeExecutionData[],
	query: string,
): { result: unknown; truncated: boolean } | { error: string } {
	return runQuery(items.map(toSafeItem), query);
}
