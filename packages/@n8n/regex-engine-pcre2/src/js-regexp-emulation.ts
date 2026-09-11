import { createOperationBudget } from './budget.js';
import type { OperationBudget } from './budget.js';
import type { EngineConfig } from './engine.js';
import { isSticky, isUnicode } from './flags.js';
import { getHandle } from './handle-cache.js';
import { runMatch, toExecArray, nextOffset } from './match.js';
import type { Pcre2ExecArray } from './match.js';

// Minimal RegExp-shaped object so RegExp.prototype[Symbol.replace] can run against a
// PCRE2-backed match. matchAll/split keep their own loops since species-construct misses a foreign .exec().
class Pcre2RegExpLike {
	readonly source: string;
	readonly flags: string;
	lastIndex = 0;
	// Per-instance, so a global Symbol.replace's repeated exec() calls share one operation budget.
	private readonly budget: OperationBudget;

	constructor(
		private readonly config: EngineConfig,
		source: string,
		flags?: string,
	) {
		this.source = source;
		this.flags = flags ?? '';
		this.budget = createOperationBudget(config, source, this.flags);
	}

	get global(): boolean {
		return this.flags.includes('g');
	}

	get unicode(): boolean {
		return this.flags.includes('u');
	}

	exec(input: string): Pcre2ExecArray | null {
		if (this.lastIndex > input.length) {
			this.lastIndex = 0;
			return null;
		}
		this.budget.checkTime();
		const { handle, nameToIndex } = getHandle(this.config, this.source, this.flags);
		const outcome = runMatch(
			handle,
			this.source,
			this.flags,
			input,
			this.lastIndex,
			isSticky(this.flags),
		);
		this.budget.checkTime();
		if (!outcome.matched) {
			this.lastIndex = 0;
			return null;
		}
		this.budget.recordMatch();
		// No manual +1 for a zero-length match: Symbol.replace applies that itself via
		// AdvanceStringIndex; doing it here too would skip a character.
		this.lastIndex = outcome.matchEnd;
		return toExecArray(outcome.groups, outcome.matchStart, input, nameToIndex);
	}
}

// lib.es2015.symbol.wellknown only declares the function-replacer overload;
// the runtime method (per spec) also accepts a plain string.
type StringReplacer = (this: RegExp, subject: string, replacement: string) => string;

export function replacePattern(
	config: EngineConfig,
	pattern: string,
	input: string,
	flags: string,
	replacement: string,
): string {
	const rx = new Pcre2RegExpLike(config, pattern, flags);
	const nativeReplace = RegExp.prototype[Symbol.replace] as unknown as StringReplacer;
	return nativeReplace.call(rx as unknown as RegExp, input, replacement);
}

export function splitPattern(
	config: EngineConfig,
	pattern: string,
	input: string,
	flags = '',
): Array<string | undefined> {
	// Splits on every match regardless of `g` (implicitly global, per spec),
	// splicing capture groups from each separator match into the result.
	const { handle } = getHandle(config, pattern, flags);
	const budget = createOperationBudget(config, pattern, flags);
	const unicode = isUnicode(flags);

	// Native split special-cases an empty subject: a match at offset 0 yields [], anything
	// else yields [input] -- the general loop below never runs (offset < 0 is never true).
	if (input.length === 0) {
		budget.checkTime();
		return runMatch(handle, pattern, flags, input, 0).matched ? [] : [input];
	}

	const parts: Array<string | undefined> = [];
	let cursor = 0;
	let offset = 0;

	// Native split's internal matcher is implicitly sticky at the search offset and its loop
	// never searches at offset === input.length -- so a match (empty or not) starting exactly
	// at the end of the string is never attempted, and can't produce a spurious trailing part.
	while (offset < input.length) {
		budget.checkTime();
		const outcome = runMatch(handle, pattern, flags, input, offset);
		budget.checkTime();
		// The search starting offset is bounded above (< input.length), but an unanchored
		// scan from it can still land a zero-length match (e.g. `$`) exactly at the end of
		// the string -- native split's per-position search never considers that position,
		// so treat it the same as no match, not a genuine trailing separator.
		if (!outcome.matched || outcome.matchStart === input.length) break;
		budget.recordMatch();

		// A zero-length match sitting exactly where the previous segment ended
		// doesn't split anything (matches native split's edge-case skip).
		if (outcome.matchEnd === outcome.matchStart && outcome.matchStart === cursor) {
			offset = nextOffset(outcome.matchEnd, outcome.matchStart, input, unicode);
			continue;
		}

		parts.push(input.slice(cursor, outcome.matchStart));
		parts.push(...outcome.groups.slice(1));
		cursor = outcome.matchEnd;
		offset = nextOffset(outcome.matchEnd, outcome.matchStart, input, unicode);
	}

	parts.push(input.slice(cursor));
	return parts;
}
