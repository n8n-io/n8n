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
 * Turns the value that a node or Python step returned into the result list.
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

/**
 * Turns the value that a code step returned into the result list, with the
 * rules that n8n's Code node applies in "Run Once for All Items" mode
 * (`normalizeItems` and `validateRunCodeAllItems` of `nodes-base`). One object
 * becomes a list of one. An item with `json` keeps it. An item with `binary`
 * and no `json` gets its other keys under `json`. A mix of the two forms is an
 * error. The binary data of an item goes in the `$binary` key (`binary.ts`).
 */
export function toCodeResultItems(value: unknown): JsonObject[] {
	if (value === undefined || value === null) return [];
	if (typeof value !== 'object') {
		throw new StepInputError(
			'Code must return an object or an array of objects. Result item 0 is not an object',
		);
	}
	const list: JsonObject[] = [];
	if (Array.isArray(value)) {
		value.forEach((entry, index) => {
			if (!isJsonObject(entry)) {
				throw new StepInputError(
					`Code must return an object or an array of objects. Result item ${index} is not an object`,
				);
			}
			list.push(entry);
		});
		validateTopLevelKeys(list);
	} else {
		if (!isJsonObject(value)) {
			throw new StepInputError(
				'Code must return an object or an array of objects. Result item 0 is not an object',
			);
		}
		// As n8n: an object with a truthy `json` is one item, else the object goes under `json`.
		if (value.json) list.push(value);
		else list.push({ json: value });
	}
	// As n8n: the binary form is used only when every item has it.
	const withJson = list.filter((entry) => 'json' in entry).length;
	const withBinary = list.filter((entry) => 'binary' in entry).length;
	if (withJson > 0 && withJson < list.length) throw new StepInputError('Inconsistent item format');
	if (withJson === 0 && withBinary > 0 && withBinary < list.length) {
		throw new StepInputError('Inconsistent item format');
	}
	// As n8n: the list stays when every item has `json`, else every item is normalised.
	return list.map((entry, index) => {
		if (withJson === list.length) return codeResultItem(entry, index);
		if (withJson === 0 && withBinary === list.length)
			return codeResultItem(binaryItem(entry), index);
		return codeResultItem({ json: entry }, index);
	});
}

/**
 * The check of n8n's `validateTopLevelKeys`: when an item has a reserved key,
 * it must not have other top-level keys. Only an array result is checked.
 */
function validateTopLevelKeys(list: JsonObject[]): void {
	const mustCheck = list.some((entry) => Object.keys(entry).some((key) => N8N_ITEM_KEYS.has(key)));
	if (!mustCheck) return;
	list.forEach((entry, index) => {
		let found = '';
		const unknown: string[] = [];
		for (const key of Object.keys(entry)) {
			if (N8N_ITEM_KEYS.has(key)) {
				found ||= key;
			} else {
				unknown.push(key);
			}
		}
		if (unknown.length === 0) return;
		if (found !== '') throw new StepInputError(`Invalid output format [item ${index}]`);
		throw new StepInputError(`Unknown top-level item key: ${unknown[0]} [item ${index}]`);
	});
}

/** An item with `binary` and no `json`: its other keys go under `json`. */
function binaryItem(entry: JsonObject): JsonObject {
	const json: JsonObject = {};
	for (const key of Object.keys(entry)) {
		if (key !== 'binary') json[key] = entry[key];
	}
	return { json, binary: entry.binary };
}

/** The checks of n8n's `validateItem`, then the item as compiled code holds it. */
function codeResultItem(entry: JsonObject, index: number): JsonObject {
	const json = entry.json;
	if (!isJsonObject(json)) {
		throw new StepInputError(`A 'json' property isn't an object [item ${index}]`);
	}
	const binary = entry.binary;
	if (binary !== undefined && !isJsonObject(binary)) {
		throw new StepInputError(`A 'binary' property isn't an object [item ${index}]`);
	}
	return isJsonObject(binary) && Object.keys(binary).length > 0
		? { ...json, $binary: binaryWithSizes(binary) }
		: json;
}
