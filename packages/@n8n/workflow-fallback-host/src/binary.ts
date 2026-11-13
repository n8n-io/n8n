/**
 * Binary data on the wire.
 *
 * Compiled code holds an item as its JSON object. When the item has binary
 * data, the object has one more key, `$binary`, with n8n's binary map in the
 * in-memory form: `{ "<property>": { data: <base64>, mimeType, fileName?,
 * fileExtension?, fileSize?, ... } }`. This is the form that n8n gives when no
 * binary data store is set (`BinaryDataService` without a manager), and it is
 * the form that the fallback host gives to and takes from the nodes.
 *
 * The host does not set a binary data store, so a node that makes binary data
 * gives it in this form too. A binary entry with an `id` (a stored file of an
 * n8n instance) cannot be read here.
 */
import type { IBinaryKeyData, INodeExecutionData } from 'n8n-workflow';

import type { JsonObject, JsonValue } from './protocol';
import { isJsonObject } from './protocol';

export const BINARY_KEY = '$binary';

/** The default limit of the base64 text of all binary data in one step result. */
export const DEFAULT_MAX_BINARY_BYTES = 32 * 1024 * 1024;

export class BinaryLimitError extends Error {
	constructor(bytes: number, limit: number) {
		super(
			`The binary data of the step result is ${bytes} bytes of base64 text. The limit is ${limit} bytes (WF_FALLBACK_MAX_BINARY_BYTES).`,
		);
		this.name = 'BinaryLimitError';
	}
}

function isBinaryEntry(value: JsonValue): boolean {
	return (
		isJsonObject(value) && typeof value.data === 'string' && typeof value.mimeType === 'string'
	);
}

/** n8n's text of a file size (`prettyBytes` of `BinaryDataService`). */
function fileSizeText(bytes: number): string {
	const units = ['B', 'kB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1000 && unit < units.length - 1) {
		value /= 1000;
		unit++;
	}
	const text = unit === 0 ? String(value) : value.toPrecision(3).replace(/\.0+$|(\.\d*?)0+$/, '$1');
	return `${text} ${units[unit]}`;
}

/**
 * Gives a binary entry both size fields: `bytes` (the runtime's form, spec
 * section 8.5) and `fileSize` (n8n's text). The size comes from the base64 data
 * when the entry has neither.
 */
export function withSizes(entry: JsonObject): JsonObject {
	const data = typeof entry.data === 'string' ? entry.data : '';
	const bytes = typeof entry.bytes === 'number' ? entry.bytes : Buffer.from(data, 'base64').length;
	return {
		...entry,
		bytes,
		fileSize: typeof entry.fileSize === 'string' ? entry.fileSize : fileSizeText(bytes),
	};
}

/** The binary map of a wire or n8n item with both size fields on each entry. */
export function binaryWithSizes(value: JsonObject): JsonObject {
	const out: JsonObject = {};
	for (const [key, entry] of Object.entries(value)) {
		out[key] = isJsonObject(entry) && isBinaryEntry(entry) ? withSizes(entry) : entry;
	}
	return out;
}

/** Copies JSON binary entries to n8n's binary map. Entries that are not binary data are dropped. */
function toBinaryMap(value: JsonObject): IBinaryKeyData {
	const binary: IBinaryKeyData = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!isJsonObject(entry) || !isBinaryEntry(entry)) continue;
		const { data, mimeType, ...rest } = withSizes(entry);
		if (typeof data !== 'string' || typeof mimeType !== 'string') continue;
		const meta: Record<string, string | number> = {};
		for (const [k, v] of Object.entries(rest)) {
			if (typeof v === 'string' || typeof v === 'number') meta[k] = v;
		}
		binary[key] = { ...meta, data, mimeType };
	}
	return binary;
}

/** An n8n item from a wire item: `$binary` becomes the item's `binary`. */
export function toN8nItem(item: JsonObject): INodeExecutionData {
	const binaryValue = item[BINARY_KEY];
	if (!isJsonObject(binaryValue)) return { json: item };
	const { [BINARY_KEY]: _omit, ...json } = item;
	const binary = toBinaryMap(binaryValue);
	return Object.keys(binary).length > 0 ? { json, binary } : { json };
}

/** The item form of the engine v2 shim: `{ json, binary? }`. */
export function toStepItem(item: JsonObject): JsonObject {
	const binary = item[BINARY_KEY];
	if (!isJsonObject(binary)) return { json: item };
	const { [BINARY_KEY]: _omit, ...json } = item;
	return { json, binary: binaryWithSizes(binary) };
}

/** The size of the base64 text of the binary data of the items. */
export function binaryBytes(items: JsonObject[]): number {
	let total = 0;
	for (const item of items) {
		const binary = item[BINARY_KEY];
		if (!isJsonObject(binary)) continue;
		for (const entry of Object.values(binary)) {
			if (isJsonObject(entry) && typeof entry.data === 'string') total += entry.data.length;
		}
	}
	return total;
}

/** Throws when the binary data of the items is larger than the limit. */
export function checkBinaryLimit(items: JsonObject[], limit: number): void {
	const bytes = binaryBytes(items);
	if (bytes > limit) throw new BinaryLimitError(bytes, limit);
}

/** The binary limit from the environment, or the default. */
export function maxBinaryBytes(): number {
	const value = Number(process.env.WF_FALLBACK_MAX_BINARY_BYTES);
	return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_BINARY_BYTES;
}
