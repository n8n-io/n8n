type JsonContainer = Record<string, unknown> | unknown[];

/** Either a container left to measure, or the end of a container's descendants. */
type Step = { measure: JsonContainer } | { leave: JsonContainer };

/**
 * Tells whether a value exceeds a JSON size limit, without serializing it.
 *
 * The measure is a lower bound, so a value is never reported as exceeding a size
 * it does not have.
 *
 * @param value Value to measure as if it were passed to `JSON.stringify`.
 * @param maxBytes Limit the serialization must stay within.
 * @returns `true` only if the serialization is certainly longer than `maxBytes`.
 *
 * @remarks Complexity time and memory: O(n)
 */
export function jsonSizeExceeds(value: unknown, maxBytes: number): boolean {
	if (!isContainer(value)) {
		return minSerializedSize(value) > maxBytes;
	}

	// Only ancestors are tracked, because serialization repeats a container reached
	// twice and fails on a cycle alone.
	const ancestors = new Set<JsonContainer>();
	const steps: Step[] = [{ measure: value }];
	let size = 0;

	for (let step = steps.pop(); step !== undefined && size <= maxBytes; step = steps.pop()) {
		if ('leave' in step) {
			ancestors.delete(step.leave);
			continue;
		}

		if (ancestors.has(step.measure)) {
			continue;
		}

		ancestors.add(step.measure);
		steps.push({ leave: step.measure });
		size += measureMembers(step.measure, steps, maxBytes - size);
	}

	return size > maxBytes;
}

/**
 * Lower bound of the bytes `container`'s own members occupy. *
 * @param budget Bytes left before the limit. Measuring stops above it.
 */
function measureMembers(container: JsonContainer, steps: Step[], budget: number): number {
	if (Buffer.isBuffer(container)) {
		return container.length;
	}

	if (Array.isArray(container)) {
		return measureElements(container, steps, budget);
	}

	return measureEntries(container, steps, budget);
}

const COMMA_SIZE = 1;
function measureElements(elements: unknown[], steps: Step[], budget: number): number {
	let size = 0;
	for (let index = 0; index < elements.length && size <= budget; index++) {
		const element = elements[index];
		size += minSerializedSize(element) + (index === 0 ? 0 : COMMA_SIZE);

		if (isContainer(element)) {
			steps.push({ measure: element });
		}
	}
	return size;
}

const QUOTES_SIZE = 2;
const COLON_SIZE = 1;
function measureEntries(entries: Record<string, unknown>, steps: Step[], budget: number): number {
	const keys = serializedKeys(entries);
	let size = 0;
	for (let index = 0; index < keys.length && size <= budget; index++) {
		const key = keys[index];
		const value = entries[key];

		size += (index === 0 ? 0 : COMMA_SIZE) + minEntrySize(key, value);

		if (isContainer(value)) {
			steps.push({ measure: value });
		}
	}
	return size;
}

function serializedKeys(entries: Record<string, unknown>): string[] {
	return Object.keys(entries).filter((key) => !isDroppedFromObjects(entries[key]));
}

/** Lower bound of the bytes the entry `key`/`value` occupies, separator excluded. */
function minEntrySize(key: string, value: unknown): number {
	return QUOTES_SIZE + Buffer.byteLength(key) + COLON_SIZE + minSerializedSize(value);
}

const SHORTEST_NUMBER_SIZE = 1;
const SHORTEST_KEYWORD_SIZE = 4; // "null", "true"
const EMPTY_CONTAINER_SIZE = 2; // "{}", "[]"

function minSerializedSize(value: unknown): number {
	switch (typeof value) {
		case 'string':
			return Buffer.byteLength(value) + QUOTES_SIZE;
		case 'number':
			return minNumberSize(value);
		case 'boolean':
			return SHORTEST_KEYWORD_SIZE;
		case 'object':
			return value === null ? SHORTEST_KEYWORD_SIZE : EMPTY_CONTAINER_SIZE;
		default:
			return SHORTEST_KEYWORD_SIZE;
	}
}

const SIGN_SIZE = 1;
const EXPONENTIAL_NOTATION_THRESHOLD = 1e21;

function minNumberSize(value: number): number {
	if (!Number.isFinite(value)) {
		return SHORTEST_KEYWORD_SIZE;
	}

	const magnitude = Math.abs(value);
	const sign = value < 0 ? SIGN_SIZE : 0;

	// Exponential notation above the threshold, and no certain digit count below one.
	if (magnitude < 1 || magnitude >= EXPONENTIAL_NOTATION_THRESHOLD) {
		return sign + SHORTEST_NUMBER_SIZE;
	}

	// One digit fewer than the magnitude implies, so that a rounding error in
	// log10 cannot turn this into an over-estimate.
	return sign + Math.max(SHORTEST_NUMBER_SIZE, Math.floor(Math.log10(magnitude)));
}

/** Whether serializing an object drops the entry holding `value`, key included. */
function isDroppedFromObjects(value: unknown): boolean {
	const type = typeof value;
	return type === 'undefined' || type === 'function' || type === 'symbol';
}

function isContainer(value: unknown): value is JsonContainer {
	return typeof value === 'object' && value !== null;
}
