import type { INodeExecutionData } from 'n8n-workflow';
import { evaluateJmespathQuery } from 'n8n-workflow';

export const MAX_ITEMS = 20;
export const MAX_OUTPUT_CHARS = 50_000;

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
 * `{ error }` payloads the agent can read and recover from.
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
