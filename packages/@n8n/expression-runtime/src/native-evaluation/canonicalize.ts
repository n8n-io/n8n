import { isRecord } from '@n8n/utils/is-record';
import { DateTime, Duration, Interval } from 'luxon';

const MAX_CANONICAL_NODES = 10_000;

// A long string counts as one node, so the size of strings has its own limit.
const MAX_CANONICAL_CHARS = 1_000_000;

// Captured at load: an expression can replace `valueOf` on its result or, in the legacy
// engine, on the prototype, and calling that would run expression code again.
const unboxString = String.prototype.valueOf;
const unboxNumber = Number.prototype.valueOf;
const unboxBoolean = Boolean.prototype.valueOf;

class ValueTooLargeError extends Error {}

interface CanonicalState {
	nodes: number;
	chars: number;
	seen: Set<object>;
}

function spendChars(state: CanonicalState, chars: number) {
	state.chars += chars;
	if (state.chars > MAX_CANONICAL_CHARS) {
		throw new ValueTooLargeError();
	}
}

/**
 * A string that is equal for two values when both engines produced the same
 * result. Dates compare by instant and zone, objects by sorted keys. An object
 * key that holds `undefined` counts as absent. Returns
 * `undefined` when the value is too large to compare.
 */
export function canonicalize(value: unknown): string | undefined {
	try {
		return writeCanonical(value, { nodes: 0, chars: 0, seen: new Set() });
	} catch (error) {
		if (error instanceof ValueTooLargeError) return undefined;
		throw error;
	}
}

function writeCanonical(value: unknown, state: CanonicalState): string {
	state.nodes += 1;
	if (state.nodes > MAX_CANONICAL_NODES) {
		throw new ValueTooLargeError();
	}

	switch (typeof value) {
		case 'string':
			spendChars(state, value.length);
			return JSON.stringify(value);
		case 'number':
		case 'boolean':
			return String(value);
		case 'bigint':
			return `${value}n`;
		case 'undefined':
		case 'symbol':
		case 'function':
			return typeof value;
	}

	if (value === null) return 'null';
	if (typeof value !== 'object') return typeof value;
	if (DateTime.isDateTime(value)) {
		return value.isValid ? `DateTime(${value.toISO()}|${value.zoneName})` : 'DateTime(invalid)';
	}
	if (Duration.isDuration(value)) return `Duration(${value.toISO()})`;
	if (Interval.isInterval(value)) return `Interval(${value.toISO()})`;
	if (value instanceof Date) {
		return `Date(${Number.isNaN(value.getTime()) ? 'invalid' : value.toISOString()})`;
	}

	// A boxed primitive must not equal a plain object that has the same index keys.
	if (value instanceof String) return `String(${writeCanonical(unboxString.call(value), state)})`;
	if (value instanceof Number) return `Number(${writeCanonical(unboxNumber.call(value), state)})`;
	if (value instanceof Boolean) return `Boolean(${String(unboxBoolean.call(value))})`;

	if (state.seen.has(value)) return 'circular';
	state.seen.add(value);
	try {
		return writeContainer(value, state);
	} finally {
		state.seen.delete(value);
	}
}

function writeContainer(value: object, state: CanonicalState): string {
	if (Array.isArray(value)) {
		// `Array.from` reads a hole as undefined, so each hole counts against the node limit.
		return `[${Array.from(value, (entry) => writeCanonical(entry, state)).join(',')}]`;
	}
	if (value instanceof Map) {
		const entries = [...value.entries()].map(
			([key, entry]) => `${writeCanonical(key, state)}=>${writeCanonical(entry, state)}`,
		);
		return `Map{${entries.join(',')}}`;
	}
	if (value instanceof Set) {
		return `Set[${[...value].map((entry) => writeCanonical(entry, state)).join(',')}]`;
	}
	if (value instanceof Error) return `Error(${value.name})`;
	if (!isRecord(value)) return 'object';

	// QuickJS drops object keys that hold undefined from its results.
	const entries = Object.entries(value)
		.filter(([, entry]) => entry !== undefined)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([key, entry]) => {
			spendChars(state, key.length);
			return `${JSON.stringify(key)}:${writeCanonical(entry, state)}`;
		});
	return `{${entries.join(',')}}`;
}
