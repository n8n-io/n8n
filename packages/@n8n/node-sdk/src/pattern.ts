import { safeRegex } from 'n8n-workflow';

/** What a pattern needs for a match at one position, to the end of the scanned part. */
interface PatternScan {
	readonly end: number;
	/** Atoms with `*`, `+` or `{n,}`. */
	readonly unbounded: number;
	/** The ways the pattern can match, not counting the repeats of an unbounded atom. */
	readonly paths: number;
	/** The most characters one way matches, not counting the repeats of an unbounded atom. */
	readonly length: number;
}

const EMPTY_SCAN: PatternScan = { end: 0, unbounded: 0, paths: 1, length: 0 };

function repeatAt(pattern: string, at: number) {
	const match = /\{(\d+)(?:(,)(\d*))?\}|[*+?]/y;
	match.lastIndex = at;
	const found = match.exec(pattern);
	if (!found) return undefined;
	const [text, min, comma, max] = found;
	const [low, high] =
		text === '*'
			? [0, Infinity]
			: text === '+'
				? [1, Infinity]
				: text === '?'
					? [0, 1]
					: [Number(min), comma === undefined ? Number(min) : max ? Number(max) : Infinity];
	return {
		low,
		high,
		end: pattern[match.lastIndex] === '?' ? match.lastIndex + 1 : match.lastIndex,
	};
}

/** A character, an escape, a class or a group. A back reference, a lookbehind and a named group are not covered. */
function atomScanAt(pattern: string, at: number): PatternScan | undefined {
	const char = pattern[at];
	const one = (end: number): PatternScan => ({ end, unbounded: 0, paths: 1, length: 1 });
	if (char === '\\') return /[^1-9k]/.test(pattern[at + 1] ?? '1') ? one(at + 2) : undefined;
	if (char === '[') {
		const close = /(?:\\[\s\S]|[^\\\]])*\]/y;
		close.lastIndex = at + 1;
		return close.exec(pattern) ? one(close.lastIndex) : undefined;
	}
	if (char === '(') {
		const start = /^\(\?[:=!]/.test(pattern.slice(at, at + 3)) ? at + 3 : at + 1;
		if (pattern[start] === '?') return undefined;
		const group = alternativesScanAt(pattern, start);
		return group && pattern[group.end] === ')' ? { ...group, end: group.end + 1 } : undefined;
	}
	return char === undefined || '*+?{|)'.includes(char) ? undefined : one(at + 1);
}

/** A group may only be optional: a repeated group can backtrack in too many ways. */
function repeatedScanAt(pattern: string, at: number): PatternScan | undefined {
	const atom = atomScanAt(pattern, at);
	const repeat = atom && repeatAt(pattern, atom.end);
	if (!atom || !repeat) return atom;
	const { low, high, end } = repeat;
	if (pattern[at] === '(') {
		return high > 1 ? undefined : { ...atom, end, paths: atom.paths + (low === 0 ? 1 : 0) };
	}
	return high === Infinity
		? { end, unbounded: 1, paths: 1, length: low }
		: { end, unbounded: 0, paths: high - low + 1, length: high };
}

function sequenceScanAt(
	pattern: string,
	at: number,
	scanned = EMPTY_SCAN,
): PatternScan | undefined {
	if (at >= pattern.length || pattern[at] === '|' || pattern[at] === ')') {
		return { ...scanned, end: at };
	}
	const next = repeatedScanAt(pattern, at);
	return (
		next &&
		sequenceScanAt(pattern, next.end, {
			end: next.end,
			unbounded: scanned.unbounded + next.unbounded,
			paths: scanned.paths * next.paths,
			length: scanned.length + next.length,
		})
	);
}

function alternativesScanAt(pattern: string, at: number): PatternScan | undefined {
	const first = sequenceScanAt(pattern, at);
	if (!first || pattern[first.end] !== '|') return first;
	const rest = alternativesScanAt(pattern, first.end + 1);
	return (
		rest && {
			end: rest.end,
			unbounded: first.unbounded + rest.unbounded,
			paths: first.paths + rest.paths,
			length: Math.max(first.length, rest.length),
		}
	);
}

/** The scan recurses once for each atom. */
const MAX_SCANNED_PATTERN = 1000;

/**
 * The most backtracking steps for each input character, or `undefined` when a match can take
 * more than linear time, e.g. `(a+)+`, `a*a*`, or `a+b` without `^`. A backtracking engine tries
 * each way at each start position. With `^`, only the first position matches, so one unbounded
 * atom adds one factor of the input length.
 */
export function stepsPerCharOf(pattern: string): number | undefined {
	if (pattern.length > MAX_SCANNED_PATTERN) return undefined;
	const scan = alternativesScanAt(pattern, 0);
	if (scan?.end !== pattern.length) return undefined;
	const anchored = pattern.startsWith('^') && sequenceScanAt(pattern, 0)?.end === pattern.length;
	return scan.unbounded > (anchored ? 1 : 0)
		? undefined
		: scan.paths * (scan.length + pattern.length);
}

/** The most steps of a native match. A match that can need more runs in `safeRegex`, which has a timeout. */
const MAX_NATIVE_STEPS = 1_000_000;
const MAX_NATIVE_PATTERNS = 1000;

const nativePatterns = new Map<string, { regex: RegExp; stepsPerChar: number } | false>();

/** The `u` flag changes what a match means, not how many ways the engine backtracks. */
const NATIVE_FLAGS = new Set(['', 'u']);

function nativePatternOf(pattern: string, flags: string) {
	const key = `${flags}/${pattern}`;
	const known = nativePatterns.get(key);
	if (known !== undefined) return known;
	const stepsPerChar = stepsPerCharOf(pattern);
	const compiled = (() => {
		if (stepsPerChar === undefined) return false;
		try {
			return { regex: new RegExp(pattern, flags), stepsPerChar };
		} catch {
			// `safeRegex` throws the same error.
			return false;
		}
	})();
	if (nativePatterns.size < MAX_NATIVE_PATTERNS) nativePatterns.set(key, compiled);
	return compiled;
}

/**
 * `safeRegex.test` with the same result. `safeRegex` runs each match in a `vm` with a timeout,
 * about 100 µs a call. A pattern without flags or with only `u` whose match takes at most
 * `MAX_NATIVE_STEPS` steps for `input` runs natively instead, compiled once.
 */
export function testPattern(pattern: string, input: string, flags?: string): boolean {
	const native = NATIVE_FLAGS.has(flags ?? '') && nativePatternOf(pattern, flags ?? '');
	return native && native.stepsPerChar * (input.length + 1) <= MAX_NATIVE_STEPS
		? native.regex.test(input)
		: safeRegex.test(pattern, input, flags);
}

/** The first match of `pattern` in `input`, with the timeout of `safeRegex`. None for a bad pattern. */
export function firstMatchOf(pattern: string, input: string): string | undefined {
	try {
		return safeRegex.exec(pattern, input)?.[0];
	} catch {
		return undefined;
	}
}
