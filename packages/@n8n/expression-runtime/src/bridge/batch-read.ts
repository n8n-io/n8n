import type { BatchRequest } from '../runtime/lazy-proxy';
import { WHOLE_VALUES } from '../runtime/lazy-proxy';
import {
	defineOwnValue,
	isPlainObject,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_TYPE_KEY,
	TRANSFER_VALUE_KEY,
} from '../runtime/transfer';
import { HOST_DATA_TYPE } from '../runtime/transfer-codec';
import type { HostDataResolver } from './host-data-resolver';
import { toHostMetadata } from './host-functions';
import { smallJsonCopy } from './small-json-data';
import type { SmallJsonCopy } from './small-json-data';

/**
 * Only `$json` has batched reads. It holds item data. Other roots are host
 * proxies, where a read can evaluate a parameter or throw.
 */
const ITEM_DATA_ROOT = '$json';

/** The sizes that limit one batched read, in characters. */
export interface BatchReadLimits {
	/** The most that one value takes, unless the expression reads the values whole. */
	smallValueChars: number;
	/** What the first read of array items in order takes. Each next read takes four times more. */
	firstBatchChars: number;
	/** The most that one read takes. */
	maxBatchChars: number;
	/**
	 * The bytes of the memory limit of the bridge for each character of the
	 * budget of one evaluation. A batched read starts only while the reads of the
	 * evaluation took less than the budget, so they can take up to one read more.
	 * After that, each read gives one value.
	 */
	memoryBytesPerChar: number;
}

/** The limits that the bridges use for the batched reads of item data. */
export const BATCH_READ_LIMITS: BatchReadLimits = {
	smallValueChars: 1024,
	firstBatchChars: 512,
	maxBatchChars: 262_144,
	// Half the limit: one-byte strings of as many characters as the limit has bytes fill the isolate.
	memoryBytesPerChar: 2,
};

/** The characters that the batched reads of one evaluation can still take. */
export interface BatchReadBudget {
	remaining: number;
}

/** The budget of one evaluation in a bridge with a memory limit of `memoryLimitMb`. */
export function batchReadBudget(memoryLimitMb: number, limits: BatchReadLimits): BatchReadBudget {
	return { remaining: Math.floor((memoryLimitMb * 1024 * 1024) / limits.memoryBytesPerChar) };
}

/** The characters counted for an array item that goes across with only some of its fields. */
const PARTIAL_ITEM_CHARS = 8;

const MAX_REQUEST_NAMES = 16;

/** No read of array items grows after this many reads. */
const MAX_READ_AHEAD_STEPS = 16;

/** The characters that read number `step` of an array takes. */
function readAheadChars(step: number, limits: BatchReadLimits): number {
	const steps = Number.isInteger(step) && step > 0 ? Math.min(step, MAX_READ_AHEAD_STEPS) : 0;
	return Math.min(limits.firstBatchChars * 4 ** steps, limits.maxBatchChars);
}

/** The most that one value takes for a request. */
function valueCharsFor(request: unknown, limits: BatchReadLimits): number {
	return request === WHOLE_VALUES ? limits.maxBatchChars : limits.smallValueChars;
}

/**
 * The field names of a request. Undefined for a request that is not a list.
 * The first item of a read goes without a size check, so a name over
 * `smallValueChars` is left out. Its field is then read alone.
 */
function namesOf(request: unknown, limits: BatchReadLimits): string[] | undefined {
	return Array.isArray(request)
		? request
				.filter(
					(name): name is string =>
						typeof name === 'string' && name.length <= limits.smallValueChars,
				)
				.slice(0, MAX_REQUEST_NAMES)
		: undefined;
}

function toHostData(value: unknown): unknown {
	return { [TRANSFER_TYPE_KEY]: HOST_DATA_TYPE, [TRANSFER_VALUE_KEY]: value };
}

/** Say whether a key is an enumerable data property. An accessor is never called. */
function isDataKey(container: object, key: string): boolean {
	const descriptor = Object.getOwnPropertyDescriptor(container, key);
	return descriptor?.enumerable === true && 'value' in descriptor;
}

const NO_COPY: SmallJsonCopy = { copy: undefined, chars: 0 };

function wholeChild(
	container: Record<string, unknown> | unknown[],
	key: string,
	maxChars: number,
): SmallJsonCopy {
	return isDataKey(container, key)
		? smallJsonCopy((container as Record<string, unknown>)[key], maxChars)
		: NO_COPY;
}

/**
 * The run of items from `start` that go across whole. It stops before the first
 * item that does not. The item at `start` can take `childChars`. The items
 * after it share what is left of `readChars`.
 */
function wholeItemsFrom(
	items: unknown[],
	start: number,
	readChars: number,
	childChars: number,
	budget: BatchReadBudget,
): unknown[] {
	const whole: unknown[] = [];
	let remaining = readChars;
	for (let index = start; index < items.length; index++) {
		const maxChars = index === start ? childChars : Math.min(childChars, remaining);
		const item = maxChars > 0 ? wholeChild(items, String(index), maxChars) : NO_COPY;
		if (item.copy === undefined) {
			// A later item that does not go across starts the next read, which counts it.
			if (index === start) remaining -= item.chars;
			break;
		}
		remaining -= item.chars;
		whole.push(item.copy);
	}
	budget.remaining -= readChars - remaining;
	return whole;
}

/**
 * The fields in `names` that go across whole, each in at most `childChars` characters.
 * A field that is there but does not go across counts what its walk counted.
 */
function namedFieldsOf(
	item: Record<string, unknown>,
	names: string[],
	childChars: number,
): { fields: Record<string, unknown>; chars: number } {
	const fields: Record<string, unknown> = {};
	let chars = PARTIAL_ITEM_CHARS;
	for (const name of names) {
		if (TRANSFER_FRAMING_KEYS.includes(name) || !isDataKey(item, name)) {
			continue;
		}
		const field = smallJsonCopy(item[name], childChars);
		chars += field.chars;
		if (field.copy !== undefined) {
			chars += name.length;
			defineOwnValue(fields, name, field.copy);
		}
	}
	return { fields, chars };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && isPlainObject(value);
}

/**
 * For the run of plain objects from `start`, the fields in `names` of each one.
 * It stops before the first item that is not a plain object. It also stops before
 * an item after `start` whose fields take more than what is left of `readChars`.
 */
function namedFieldsOfItemsFrom(
	items: unknown[],
	start: number,
	readChars: number,
	names: string[],
	childChars: number,
	budget: BatchReadBudget,
): Array<Record<string, unknown>> {
	const rows: Array<Record<string, unknown>> = [];
	let remaining = readChars;
	for (let index = start; index < items.length && (remaining > 0 || index === start); index++) {
		const item: unknown = isDataKey(items, String(index)) ? items[index] : undefined;
		if (!isPlainRecord(item)) {
			break;
		}
		const { fields, chars } = namedFieldsOf(item, names, childChars);
		if (index !== start && chars > remaining) {
			break;
		}
		remaining -= chars;
		rows.push(fields);
	}
	budget.remaining -= readChars - remaining;
	return rows;
}

/**
 * The fields of an object that go across whole, in at most `readChars`
 * characters for all of them. A field that does not is left out, but its
 * walk still counts.
 */
function wholeFieldsOf(
	record: Record<string, unknown>,
	readChars: number,
	childChars: number,
	budget: BatchReadBudget,
): Record<string, unknown> {
	const whole: Record<string, unknown> = {};
	let remaining = readChars;
	for (const key of Object.keys(record)) {
		if (remaining <= 0) {
			break;
		}
		const maxChars = Math.min(childChars, remaining - key.length);
		if (maxChars > 0 && !TRANSFER_FRAMING_KEYS.includes(key)) {
			const field = wholeChild(record, key, maxChars);
			remaining -= field.chars + key.length;
			if (field.copy !== undefined) {
				defineOwnValue(whole, key, field.copy);
			}
		}
	}
	budget.remaining -= readChars - remaining;
	return whole;
}

/** The items of one read from `start`. Empty when the item at `start` must stay lazy. */
function itemsOfRead(
	items: unknown[],
	start: number,
	step: number,
	request: unknown,
	limits: BatchReadLimits,
	budget: BatchReadBudget,
): unknown[] {
	const names = namesOf(request, limits);
	const readChars = readAheadChars(step, limits);
	const childChars = valueCharsFor(request, limits);
	// An array subclass can change how its items read.
	if (Object.getPrototypeOf(items) !== Array.prototype) {
		return [];
	}
	return names === undefined
		? wholeItemsFrom(items, start, readChars, childChars, budget)
		: namedFieldsOfItemsFrom(items, start, readChars, names, childChars, budget);
}

/** The values of one read. Empty when a proxy trap throws, so the values stay lazy. */
function valuesOfRead<T extends unknown[] | Record<string, unknown>>(empty: T, read: () => T): T {
	try {
		return read();
	} catch {
		return empty;
	}
}

/**
 * Read a batch of item data values in one call.
 *
 * For an array, the result is a data wrapper around the run of items from
 * `start`. `WHOLE_VALUES` and `SMALL_VALUES` give whole items. A list of
 * names gives, for each item, an object with only these fields. When the item
 * at `start` cannot be part of a run, the result is that one item as
 * `getArrayElement` gives it.
 *
 * For any other value, the result is a data wrapper around the fields that can
 * go across whole. It holds no field for a path outside `$json`.
 *
 * A read takes its characters from `budget`. When the budget is spent, a read
 * gives what a read of one value gives.
 */
export function readBatchAtPath(
	resolver: HostDataResolver,
	pathArr: readonly string[],
	start: number,
	step: number,
	request: BatchRequest,
	limits: BatchReadLimits,
	budget: BatchReadBudget,
): unknown {
	const canBatch = pathArr[0] === ITEM_DATA_ROOT && budget.remaining > 0;
	const container = resolver.resolve(pathArr);
	if (Array.isArray(container)) {
		if (!Number.isInteger(start) || start < 0) {
			return undefined;
		}
		const items = canBatch
			? valuesOfRead([], () => itemsOfRead(container, start, step, request, limits, budget))
			: [];
		return items.length > 0 ? toHostData(items) : toHostMetadata(container[start]);
	}
	return toHostData(
		canBatch && isPlainRecord(container)
			? valuesOfRead({}, () =>
					wholeFieldsOf(container, limits.maxBatchChars, valueCharsFor(request, limits), budget),
				)
			: {},
	);
}
