import type { JsonObject, JsonValue } from './protocol';
import { isJsonObject } from './protocol';
import { binaryWithSizes } from './binary';

export class StepInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StepInputError';
	}
}

/** Reads the optional `items` option of a ctx call. */
export function readItems(value: JsonValue | undefined): JsonObject[] {
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) throw new StepInputError('"items" must be an array of objects');
	return value.map((item, index) => {
		if (!isJsonObject(item)) throw new StepInputError(`"items[${index}]" must be an object`);
		return item;
	});
}

/**
 * Turns the value that a step returned into the result list.
 * One object becomes a list of one. An n8n item (`{ json, ... }`) becomes its
 * `json`. Its binary data, if any, goes in the `$binary` key (see `binary.ts`).
 */
export function toResultItems(value: unknown): JsonObject[] {
	if (value === undefined || value === null) return [];
	const list: unknown[] = Array.isArray(value) ? value : [value];
	return list.map((entry, index) => {
		if (!isJsonObject(entry)) {
			throw new StepInputError(`Result item ${index} is not an object`);
		}
		if (!isN8nItem(entry)) return entry;
		const { binary } = entry;
		return isJsonObject(binary) && Object.keys(binary).length > 0
			? { ...entry.json, $binary: binaryWithSizes(binary) }
			: entry.json;
	});
}

const N8N_ITEM_KEYS = new Set(['json', 'binary', 'pairedItem', 'error', 'index']);

function isN8nItem(entry: JsonObject): entry is JsonObject & { json: JsonObject } {
	return isJsonObject(entry.json) && Object.keys(entry).every((key) => N8N_ITEM_KEYS.has(key));
}
