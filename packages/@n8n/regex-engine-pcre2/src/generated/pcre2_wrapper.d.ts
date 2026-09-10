// Hand-written type declarations for the Embind glue emitted by Emscripten.
// Emscripten's MODULARIZE+EXPORT_ES6 output has no generated .d.ts, so this
// file describes the actual runtime shape (verified against the built
// pcre2_wrapper.js/.wasm) instead of typing the boundary as `any`.

/** An Embind C++ enum value, as returned to JS. Compare with `.value`. */
export interface EnumValue {
	value: number;
}

export interface MatchStatusEnum {
	Match: EnumValue;
	NoMatch: EnumValue;
	MatchLimitExceeded: EnumValue;
	DepthLimitExceeded: EnumValue;
	HeapLimitExceeded: EnumValue;
	CompileError: EnumValue;
	OtherError: EnumValue;
}

/**
 * An Embind `register_vector<std::string>` instance. Not a real JS array:
 * it exposes `size()`/`get()` and is iterable, so use `Array.from(...)` to
 * get a plain string[].
 */
export interface StringVector {
	size(): number;
	get(index: number): string | undefined;
	[Symbol.iterator](): IterableIterator<string>;
}

/** An Embind `register_vector<int>` instance -- same shape as StringVector, over numbers. */
export interface IntVector {
	size(): number;
	get(index: number): number | undefined;
	[Symbol.iterator](): IterableIterator<number>;
}

export interface CompileResult {
	ok: boolean;
	errorCode: number;
	errorMessage: string;
	errorOffset: number;
}

export interface NamedGroup {
	name: string;
	index: number;
}

/** An Embind `register_vector<NamedGroup>` instance -- same shape as StringVector/IntVector. */
export interface NamedGroupVector {
	size(): number;
	get(index: number): NamedGroup | undefined;
	[Symbol.iterator](): IterableIterator<NamedGroup>;
}

export interface MatchResult {
	status: EnumValue;
	groups: StringVector;
	// Optional: this feature isn't exposed by the current wasm build yet --
	// feature-detected in src/pcre2-engine.ts's runMatch() rather than assumed
	// present, so an unrebuilt wasm binary keeps working exactly as before.
	groupParticipated?: IntVector;
	errorCode: number;
	errorMessage: string;
	matchStart: number;
	matchEnd: number;
}

export declare class Pcre2Wrapper {
	constructor(
		pattern: string,
		flags: string,
		matchLimit: number,
		depthLimit: number,
		heapLimitKb: number,
		extraOptions: number,
		compileExtraOptions: number,
		newlineConvention: number,
	);
	compileStatus(): CompileResult;
	namedGroups(): NamedGroupVector;
	match(subject: string, startOffset: number, anchored: boolean): MatchResult;
	/** Frees the underlying wasm-heap C++ object. Must be called once the handle is no longer needed. */
	delete(): void;
}

export interface Pcre2WrapperModule {
	Pcre2Wrapper: typeof Pcre2Wrapper;
	MatchStatus: MatchStatusEnum;
	/** Real PCRE2 option values, exposed as embind constants -- see native/pcre2_wrapper_bindings.cpp. */
	PCRE2_ALT_BSUX: number;
	PCRE2_MATCH_UNSET_BACKREF: number;
	PCRE2_UCP: number;
	PCRE2_DOLLAR_ENDONLY: number;
	PCRE2_EXTRA_ALT_BSUX: number;
	PCRE2_NEWLINE_ANYCRLF: number;
}

export default function createPcre2WrapperModule(): Promise<Pcre2WrapperModule>;
