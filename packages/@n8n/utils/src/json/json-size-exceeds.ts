type JsonContainer = Record<string, unknown> | unknown[];

/** A value serialization replaces with the result of its own `toJSON`. */
type SelfSerializing = JsonContainer & { toJSON: (key: string) => unknown };

/** A view over binary data, serialized as one entry per element. */
type IndexedView = ArrayBufferView & { length: number };

/** An array being measured, and how far through its elements the walk is. */
type ElementsFrame = { readonly elements: unknown[]; index: number };

/** An object being measured, and how far through its keys the walk is. */
type EntriesFrame = {
	readonly entries: Record<string, unknown>;
	readonly keys: string[];
	index: number;
};

type Frame = ElementsFrame | EntriesFrame;

/** Bytes counted so far, and the containers the walk still has to finish. */
type Walk = {
	readonly maxBytes: number;
	readonly frames: Frame[];
	readonly ancestors: Set<JsonContainer>;
	size: number;
};

const QUOTES_SIZE = 2; // `""` around a string or a key
const COLON_SIZE = 1;
const COMMA_SIZE = 1;
const EMPTY_CONTAINER_SIZE = 2; // `{}` or `[]`
const NULL_SIZE = 4;
const TRUE_SIZE = 4;
const FALSE_SIZE = 5;
const SIGN_SIZE = 1;

/** Magnitude from which a number serializes in exponential notation. */
const EXPONENTIAL_NOTATION_THRESHOLD = 1e21;

/** `{"type":"Buffer","data":[]}` around the bytes of a Buffer. */
const BUFFER_ENVELOPE_SIZE = 27;

/** Longest a byte serializes to inside that envelope, as in `255,`. */
const MAX_BUFFER_BYTE_SIZE = 4;

/**
 * Widest a number can serialize to, as in `-0.0000075911789601505095`. Bounds the
 * elements of a binary view, which are counted without being visited.
 */
const MAX_NUMBER_SIZE = 25;

const SHORT_ESCAPE_SIZE = 2; // `\n`, `\"`, `\\`
const UNICODE_ESCAPE_SIZE = 6; // `\u001f`, and a lone surrogate
const ONE_BYTE_SIZE = 1;
const TWO_BYTE_SIZE = 2;
const THREE_BYTE_SIZE = 3;
const SURROGATE_PAIR_SIZE = 4; // one code point spread over two code units

const CONTROL_MAX = 0x1f;
const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const ASCII_MAX = 0x7f;
const TWO_BYTE_MAX = 0x7ff;
const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;
const LOW_SURROGATE_MIN = 0xdc00;
const LOW_SURROGATE_MAX = 0xdfff;

/** Control characters serialization escapes with a letter instead of a code point. */
const LETTER_ESCAPED_CONTROLS = new Set([0x08, 0x09, 0x0a, 0x0c, 0x0d]);

/** Key `JSON.stringify` hands to the `toJSON` of the value it is called on. */
const ROOT_KEY = '';

/**
 * Tells whether a value exceeds a JSON size limit, without serializing it.
 *
 * The measure is an upper bound, so a value is never reported as fitting a size
 * it does not fit. It overshoots by one byte per non-empty container, and counts
 * binary data at the widest its bytes can serialize to.
 *
 * @param value Value to measure as if it were passed to `JSON.stringify`.
 * @param maxBytes Limit the serialization must stay within.
 * @returns `true` unless the serialization is certainly `maxBytes` or shorter.
 *
 * @remarks Time O(n) in the members and characters of `value`, memory O(depth).
 * Calls `toJSON` on the members defining one, as serialization would.
 */
export function jsonSizeExceeds(value: unknown, maxBytes: number): boolean {
	const walk: Walk = { maxBytes, frames: [], ancestors: new Set(), size: 0 };

	addValue(walk, replacedValue(value, ROOT_KEY));
	while (walk.frames.length > 0 && walk.size <= maxBytes) {
		advance(walk, walk.frames[walk.frames.length - 1]);
	}

	return walk.size > maxBytes;
}

/** Bytes left before the limit. Negative once the limit is crossed. */
function remaining(walk: Walk): number {
	return walk.maxBytes - walk.size;
}

/** Measures the next member of the innermost container, or closes it. */
function advance(walk: Walk, frame: Frame): void {
	if ('elements' in frame) {
		advanceElements(walk, frame);
	} else {
		advanceEntries(walk, frame);
	}
}

function advanceElements(walk: Walk, frame: ElementsFrame): void {
	if (frame.index === frame.elements.length) {
		close(walk, frame.elements);
	} else {
		const index = frame.index;
		frame.index += 1;
		walk.size += COMMA_SIZE;
		addValue(walk, replacedValue(frame.elements[index], index));
	}
}

function advanceEntries(walk: Walk, frame: EntriesFrame): void {
	if (frame.index === frame.keys.length) {
		close(walk, frame.entries);
	} else {
		const key = frame.keys[frame.index];
		frame.index += 1;
		addEntry(walk, key, replacedValue(frame.entries[key], key));
	}
}

/** Adds an entry, unless serialization drops it along with its key. */
function addEntry(walk: Walk, key: string, value: unknown): void {
	if (!isDroppedFromObjects(value)) {
		walk.size += COMMA_SIZE + COLON_SIZE + stringSize(key, remaining(walk));
		addValue(walk, value);
	}
}

/**
 * Adds what a value occupies on its own, and opens it when it has members.
 * Measuring stops once the limit is crossed, so a size cut short is still above it.
 */
function addValue(walk: Walk, value: unknown): void {
	if (isContainer(value)) {
		open(walk, value);
	} else {
		walk.size += leafSize(value, remaining(walk));
	}
}

/**
 * Adds a container's own delimiters and queues its members, or the whole of it
 * when its size follows from its length alone.
 */
function open(walk: Walk, container: JsonContainer): void {
	// A container reached from inside itself makes serialization fail, so it has
	// no size to answer with, and walking into it again would not end.
	if (!walk.ancestors.has(container)) {
		const binarySize = maxBinaryViewSize(container);

		if (binarySize === undefined) {
			walk.size += EMPTY_CONTAINER_SIZE;
			walk.ancestors.add(container);
			walk.frames.push(frameFor(container));
		} else {
			walk.size += binarySize;
		}
	}
}

function close(walk: Walk, container: JsonContainer): void {
	walk.ancestors.delete(container);
	walk.frames.pop();
}

function frameFor(container: JsonContainer): Frame {
	return Array.isArray(container)
		? { elements: container, index: 0 }
		: { entries: container, keys: Object.keys(container), index: 0 };
}

/** The value serialization puts in place of this one, given the key holding it. */
function replacedValue(value: unknown, key: string | number): unknown {
	return isSelfSerializing(value) ? value.toJSON(String(key)) : value;
}

function isSelfSerializing(value: unknown): value is SelfSerializing {
	return (
		isContainer(value) &&
		// A Buffer would hand over an array of one number per byte, which its own
		// measure derives from its length instead.
		!Buffer.isBuffer(value) &&
		'toJSON' in value &&
		typeof value.toJSON === 'function'
	);
}

/**
 * Bytes a Buffer or another binary view occupies serialized, or `undefined` for
 * a container whose members have to be walked.
 */
function maxBinaryViewSize(container: JsonContainer): number | undefined {
	if (Buffer.isBuffer(container)) {
		return BUFFER_ENVELOPE_SIZE + MAX_BUFFER_BYTE_SIZE * container.length;
	}

	return isIndexedView(container) ? maxIndexedViewSize(container) : undefined;
}

/**
 * Bytes an indexed view occupies as the object of index/element entries it
 * serializes to. Derived from its length, because listing those keys would hold
 * one string per element in memory.
 */
function maxIndexedViewSize(view: IndexedView): number {
	const lastIndex = Math.max(view.length - 1, 0);
	const maxEntrySize =
		QUOTES_SIZE + decimalDigits(lastIndex) + COLON_SIZE + MAX_NUMBER_SIZE + COMMA_SIZE;

	return EMPTY_CONTAINER_SIZE + view.length * maxEntrySize;
}

/** Bytes a value with no members occupies serialized. */
function leafSize(value: unknown, budget: number): number {
	switch (typeof value) {
		case 'string':
			return stringSize(value, budget);
		case 'number':
			return numberSize(value);
		case 'boolean':
			return value ? TRUE_SIZE : FALSE_SIZE;
		default:
			return NULL_SIZE;
	}
}

/** Bytes a string occupies serialized, escapes and quotes included. */
function stringSize(value: string, budget: number): number {
	return QUOTES_SIZE + escapedContentSize(value, budget - QUOTES_SIZE);
}

/**
 * Bytes the escaped characters of a string occupy, quotes excluded. Reads the
 * string one code unit at a time so that nothing is copied, and stops once
 * `budget` is gone, since what is already counted then settles the answer.
 */
function escapedContentSize(value: string, budget: number): number {
	let size = 0;
	let index = 0;

	while (index < value.length && size <= budget) {
		const code = value.charCodeAt(index);
		const paired = isHighSurrogate(code) && isLowSurrogate(value.charCodeAt(index + 1));

		size += paired ? SURROGATE_PAIR_SIZE : codeUnitSize(code);
		index += paired ? 2 : 1;
	}

	return size;
}

/** Bytes a single code unit occupies, escaped and encoded as serialization would. */
function codeUnitSize(code: number): number {
	if (code === QUOTE || code === BACKSLASH) {
		return SHORT_ESCAPE_SIZE;
	}

	if (code <= CONTROL_MAX) {
		return LETTER_ESCAPED_CONTROLS.has(code) ? SHORT_ESCAPE_SIZE : UNICODE_ESCAPE_SIZE;
	}

	if (code <= ASCII_MAX) {
		return ONE_BYTE_SIZE;
	}

	if (code <= TWO_BYTE_MAX) {
		return TWO_BYTE_SIZE;
	}

	// A surrogate left without its other half, which serialization escapes.
	return isSurrogate(code) ? UNICODE_ESCAPE_SIZE : THREE_BYTE_SIZE;
}

/** Bytes a number occupies serialized. */
function numberSize(value: number): number {
	if (!Number.isFinite(value)) {
		return NULL_SIZE;
	}

	const magnitude = Math.abs(value);
	const isPlainInteger = Number.isInteger(value) && magnitude < EXPONENTIAL_NOTATION_THRESHOLD;

	// A plain integer has a length its magnitude gives away. Any other number has
	// to be formatted to be measured, and nothing shorter would be exact.
	return isPlainInteger
		? (value < 0 ? SIGN_SIZE : 0) + decimalDigits(magnitude)
		: String(value).length;
}

/** Digits the integer part of a magnitude is written with. */
function decimalDigits(magnitude: number): number {
	const digits = magnitude < 1 ? 1 : Math.floor(Math.log10(magnitude)) + 1;

	// A rounding error in log10 costs a digit on some exact powers of ten.
	return magnitude < 10 ** digits ? digits : digits + 1;
}

/** Whether serializing an object drops the entry holding this value, key included. */
function isDroppedFromObjects(value: unknown): boolean {
	const type = typeof value;
	return type === 'undefined' || type === 'function' || type === 'symbol';
}

function isContainer(value: unknown): value is JsonContainer {
	return typeof value === 'object' && value !== null;
}

function isIndexedView(value: object): value is IndexedView {
	return ArrayBuffer.isView(value) && 'length' in value && typeof value.length === 'number';
}

function isHighSurrogate(code: number): boolean {
	return code >= HIGH_SURROGATE_MIN && code <= HIGH_SURROGATE_MAX;
}

function isLowSurrogate(code: number): boolean {
	return code >= LOW_SURROGATE_MIN && code <= LOW_SURROGATE_MAX;
}

function isSurrogate(code: number): boolean {
	return code >= HIGH_SURROGATE_MIN && code <= LOW_SURROGATE_MAX;
}
