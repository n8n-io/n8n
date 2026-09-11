/** Mirrors `new RegExp(pattern)` throwing a SyntaxError. */
export class Pcre2CompileError extends Error {
	constructor(
		message: string,
		readonly pattern: string,
		readonly flags: string,
		readonly errorCode: number,
		readonly errorOffset: number,
	) {
		super(message);
		this.name = 'Pcre2CompileError';
	}
}

export type Pcre2BudgetKind =
	| 'match-limit'
	| 'depth-limit'
	| 'heap-limit'
	/** A single pcre2_match() call ran past its wall-clock budget (see WALL_CLOCK_LIMIT_MS). */
	| 'wall-clock-limit'
	/** The whole matchAll/replace/split loop ran past its time or match-count budget. */
	| 'operation-limit';

export class Pcre2BudgetExceededError extends Error {
	constructor(
		message: string,
		readonly kind: Pcre2BudgetKind,
		readonly pattern: string,
		readonly flags: string,
	) {
		super(message);
		this.name = 'Pcre2BudgetExceededError';
	}
}

/** PCRE2 returned an error that is neither a compile failure nor a budget hit. */
export class Pcre2MatchError extends Error {
	constructor(
		message: string,
		readonly errorCode: number,
		readonly pattern: string,
		readonly flags: string,
	) {
		super(message);
		this.name = 'Pcre2MatchError';
	}
}

/** The wasm module trapped. Memory is unspecified afterwards, so the module is reloaded. */
export class Pcre2InternalError extends Error {
	constructor(
		message: string,
		readonly pattern: string,
		readonly flags: string,
	) {
		super(message);
		this.name = 'Pcre2InternalError';
	}
}

/** `initPcre2Engine()` has not resolved yet, so the synchronous API cannot run. */
export class Pcre2NotInitializedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'Pcre2NotInitializedError';
	}
}
