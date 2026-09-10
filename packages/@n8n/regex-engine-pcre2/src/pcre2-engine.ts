import createPcre2WrapperModule from './generated/pcre2_wrapper.js';
import type { EnumValue, Pcre2Wrapper, Pcre2WrapperModule } from './generated/pcre2_wrapper.js';

// PCRE2 by default, not a JS RegExp emulation: 'g'/'u' have no PCRE2 compile-option
// equivalent, so accepting them is opt-in via jsFlags.
export type Pcre2Flag = 'i' | 'm' | 's' | 'x';
const NATIVE_FLAGS = new Set<Pcre2Flag>(['i', 'm', 's', 'x']);

export type Pcre2JsFlag = 'g' | 'u';
const ALL_JS_FLAGS: readonly Pcre2JsFlag[] = ['g', 'u'];

/** Opt-in PCRE2 compile options beyond the always-on `PCRE2_UTF`; off unless requested since some alter default PCRE2 semantics. */
export type Pcre2CompileOption =
	| 'altBsux'
	| 'matchUnsetBackref'
	| 'ucp'
	| 'dollarEndonly'
	| 'newlineAnyCrlf';

export interface Pcre2EngineOptions {
	/** PCRE2 compile options to enable. Default: none (plain PCRE2). */
	compileOptions?: Pcre2CompileOption[];
	/** JS-only flag characters this engine accepts in a pattern's flags string. Default: none. */
	jsFlags?: Pcre2JsFlag[];
}

interface ResolvedNativeOptions {
	extraOptions: number;
	compileExtraOptions: number;
	newlineConvention: number;
}

interface EngineConfig {
	allowedFlags: ReadonlySet<Pcre2Flag | Pcre2JsFlag>;
	native: ResolvedNativeOptions;
	handleCache: Map<string, CompiledPattern>;
}

function resolveNativeOptions(
	compileOptions: Pcre2CompileOption[],
	module: Pcre2WrapperModule,
): ResolvedNativeOptions {
	let extraOptions = 0;
	let compileExtraOptions = 0;
	let newlineConvention = 0;
	for (const option of compileOptions) {
		switch (option) {
			case 'altBsux':
				extraOptions |= module.PCRE2_ALT_BSUX;
				compileExtraOptions |= module.PCRE2_EXTRA_ALT_BSUX;
				break;
			case 'matchUnsetBackref':
				extraOptions |= module.PCRE2_MATCH_UNSET_BACKREF;
				break;
			case 'ucp':
				extraOptions |= module.PCRE2_UCP;
				break;
			case 'dollarEndonly':
				extraOptions |= module.PCRE2_DOLLAR_ENDONLY;
				break;
			case 'newlineAnyCrlf':
				newlineConvention = module.PCRE2_NEWLINE_ANYCRLF;
				break;
		}
	}
	return { extraOptions, compileExtraOptions, newlineConvention };
}

// Tracks every live engine's handle cache so reinitModuleAfterTrap can invalidate all of them.
const liveCaches = new Set<Map<string, CompiledPattern>>();

function assertSupportedFlags(config: EngineConfig, flags: string): void {
	for (const flag of flags) {
		if (!config.allowedFlags.has(flag as Pcre2Flag | Pcre2JsFlag)) {
			throw new Pcre2CompileError(`Unsupported regex flag: '${flag}'`, '', flags, 0, 0);
		}
	}
}

// Bounds on PCRE2's match steps, backtracking depth, and heap use; exceeding one
// makes pcre2_match() error out instead of continuing to backtrack.
const MATCH_LIMIT = 1_000_000;
const DEPTH_LIMIT = 1_000_000;
const HEAP_LIMIT_KB = 20_000;

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

export class Pcre2BudgetExceededError extends Error {
	constructor(
		message: string,
		readonly kind: 'match-limit' | 'depth-limit' | 'heap-limit',
		readonly pattern: string,
		readonly flags: string,
	) {
		super(message);
		this.name = 'Pcre2BudgetExceededError';
	}
}

/** A RegExpExecArray-like result: an array of matched groups plus `index`/`input`/`groups`. */
export type Pcre2ExecArray = (string | undefined)[] & {
	0: string;
	index: number;
	input: string;
	groups: Record<string, string | undefined> | undefined;
};

let loadPromise: Promise<Pcre2WrapperModule> | undefined;
let loadedModule: Pcre2WrapperModule | undefined;

/** Idempotent. Must resolve before createPcre2RegexEngine()'s functions run -- they're synchronous. */
export async function initPcre2Engine(): Promise<void> {
	loadPromise ??= createPcre2WrapperModule();
	loadedModule = await loadPromise;
}

function getModule(): Pcre2WrapperModule {
	if (!loadedModule) {
		throw new Error(
			'PCRE2 engine used before initPcre2Engine() resolved. Call and await initPcre2Engine() once at startup.',
		);
	}
	return loadedModule;
}

// @types/node doesn't declare WebAssembly (a "dom" lib type), so type it narrowly here.
function isWasmTrap(error: unknown): boolean {
	const runtimeErrorCtor = (
		globalThis as { WebAssembly?: { RuntimeError: new (...args: never[]) => Error } }
	).WebAssembly?.RuntimeError;
	return runtimeErrorCtor !== undefined && error instanceof runtimeErrorCtor;
}

// A wasm trap leaves memory unspecified, so it's fatal module-wide: drop every handle
// cache (not explicitly freed -- that could crash a corrupted instance) and reload.
function reinitModuleAfterTrap(): void {
	loadedModule = undefined;
	for (const cache of liveCaches) cache.clear();
	loadPromise = createPcre2WrapperModule().then((module) => {
		loadedModule = module;
		return module;
	});
}

interface CompiledPattern {
	handle: Pcre2Wrapper;
	// Resolved once at compile time -- PCRE2's own name table never changes across matches.
	nameToIndex: ReadonlyMap<string, number>;
}

function cacheKey(pattern: string, flags: string): string {
	return JSON.stringify([pattern, flags]);
}

function getHandle(config: EngineConfig, pattern: string, flags: string): CompiledPattern {
	assertSupportedFlags(config, flags);
	const key = cacheKey(pattern, flags);
	const cached = config.handleCache.get(key);
	if (cached) return cached;

	const module = getModule();
	let handle: Pcre2Wrapper;
	try {
		handle = new module.Pcre2Wrapper(
			pattern,
			flags,
			MATCH_LIMIT,
			DEPTH_LIMIT,
			HEAP_LIMIT_KB,
			config.native.extraOptions,
			config.native.compileExtraOptions,
			config.native.newlineConvention,
		);
	} catch (error) {
		// A trap must surface as the normal typed compile failure, not a raw wasm RuntimeError.
		if (isWasmTrap(error)) {
			reinitModuleAfterTrap();
			throw new Pcre2CompileError(
				'Pattern is too complex to compile (exceeded internal nesting/recursion limits)',
				pattern,
				flags,
				0,
				0,
			);
		}
		throw error;
	}

	const compileStatus = handle.compileStatus();
	if (!compileStatus.ok) {
		handle.delete();
		throw new Pcre2CompileError(
			compileStatus.errorMessage,
			pattern,
			flags,
			compileStatus.errorCode,
			compileStatus.errorOffset,
		);
	}

	const nameToIndex = new Map<string, number>();
	for (const namedGroup of Array.from(handle.namedGroups())) {
		nameToIndex.set(namedGroup.name, namedGroup.index);
	}

	const compiled: CompiledPattern = { handle, nameToIndex };
	config.handleCache.set(key, compiled);
	return compiled;
}

function isStatus(status: EnumValue, expected: EnumValue): boolean {
	return status.value === expected.value;
}

interface MatchOutcome {
	matched: boolean;
	// undefined for a group PCRE2 reports as unset (never participated), distinct from
	// one that matched empty text (""); native RegExp draws the same distinction.
	groups: (string | undefined)[];
	matchStart: number;
	matchEnd: number;
}

// Budget exhaustion or an unexpected PCRE2 error throws, so callers don't re-check status codes.
function runMatch(
	handle: Pcre2Wrapper,
	pattern: string,
	flags: string,
	input: string,
	startOffset: number,
	anchored = false,
): MatchOutcome {
	const { MatchStatus } = getModule();
	let result: ReturnType<Pcre2Wrapper['match']>;
	try {
		result = handle.match(input, startOffset, anchored);
	} catch (error) {
		// Not observed in practice, but handled the same way as the compile-time trap for safety.
		if (isWasmTrap(error)) {
			reinitModuleAfterTrap();
			throw new Pcre2BudgetExceededError(
				'Pattern exceeded its native recursion budget while matching (unrecoverable)',
				'depth-limit',
				pattern,
				flags,
			);
		}
		throw error;
	}

	if (isStatus(result.status, MatchStatus.Match)) {
		const groups = Array.from(result.groups) as (string | undefined)[];
		// Feature-detected: older wasm builds report every unset group as "" instead.
		if (result.groupParticipated) {
			const participated = Array.from(result.groupParticipated);
			for (let i = 0; i < groups.length; i++) {
				if (!participated[i]) groups[i] = undefined;
			}
		}
		return { matched: true, groups, matchStart: result.matchStart, matchEnd: result.matchEnd };
	}
	if (isStatus(result.status, MatchStatus.NoMatch)) {
		return { matched: false, groups: [], matchStart: -1, matchEnd: -1 };
	}

	const budgets: [EnumValue, Pcre2BudgetExceededError['kind'], string, number][] = [
		[MatchStatus.MatchLimitExceeded, 'match-limit', 'match_limit', MATCH_LIMIT],
		[MatchStatus.DepthLimitExceeded, 'depth-limit', 'depth_limit', DEPTH_LIMIT],
		[MatchStatus.HeapLimitExceeded, 'heap-limit', 'heap_limit_kb', HEAP_LIMIT_KB],
	];
	for (const [status, kind, param, value] of budgets) {
		if (isStatus(result.status, status)) {
			throw new Pcre2BudgetExceededError(
				`Pattern exceeded its ${kind} budget (${param}=${value}) while matching`,
				kind,
				pattern,
				flags,
			);
		}
	}

	// CompileError can't happen here: getHandle() already rejected uncompilable patterns.
	throw new Error(
		`Unexpected PCRE2 match error${result.errorMessage ? `: ${result.errorMessage}` : ''} (code ${result.errorCode})`,
	);
}

function buildNamedGroups(
	nameToIndex: ReadonlyMap<string, number>,
	groups: (string | undefined)[],
): Record<string, string | undefined> | undefined {
	// Native RegExp: `.groups` is undefined only when the pattern has no named groups at all.
	if (nameToIndex.size === 0) return undefined;
	const named: Record<string, string | undefined> = Object.create(null);
	for (const [name, index] of nameToIndex) named[name] = groups[index];
	return named;
}

function toExecArray(
	groups: (string | undefined)[],
	matchStart: number,
	input: string,
	nameToIndex: ReadonlyMap<string, number>,
): Pcre2ExecArray {
	const exec = groups.slice() as Pcre2ExecArray;
	exec.index = matchStart;
	exec.input = input;
	exec.groups = buildNamedGroups(nameToIndex, groups);
	return exec;
}

/** A zero-length match must advance by at least one code unit, or a loop over it never makes progress. */
function nextOffset(matchEnd: number, matchStart: number): number {
	return matchEnd > matchStart ? matchEnd : matchEnd + 1;
}

function testPattern(config: EngineConfig, pattern: string, input: string, flags = ''): boolean {
	const { handle } = getHandle(config, pattern, flags);
	return runMatch(handle, pattern, flags, input, 0).matched;
}

function execPattern(
	config: EngineConfig,
	pattern: string,
	input: string,
	flags = '',
): Pcre2ExecArray | null {
	const { handle, nameToIndex } = getHandle(config, pattern, flags);
	const outcome = runMatch(handle, pattern, flags, input, 0);
	if (!outcome.matched) return null;
	return toExecArray(outcome.groups, outcome.matchStart, input, nameToIndex);
}

function matchAllPattern(
	config: EngineConfig,
	pattern: string,
	input: string,
	flags = '',
): Pcre2ExecArray[] {
	const { handle, nameToIndex } = getHandle(config, pattern, flags);
	const results: Pcre2ExecArray[] = [];
	let offset = 0;
	while (offset <= input.length) {
		const outcome = runMatch(handle, pattern, flags, input, offset);
		if (!outcome.matched) break;
		results.push(toExecArray(outcome.groups, outcome.matchStart, input, nameToIndex));
		offset = nextOffset(outcome.matchEnd, outcome.matchStart);
	}
	return results;
}

// Minimal RegExp-shaped object so RegExp.prototype[Symbol.replace] can run against a
// PCRE2-backed match. matchAll/split keep their own loops since species-construct misses a foreign .exec().
class Pcre2RegExpLike {
	readonly source: string;
	readonly flags: string;
	lastIndex = 0;

	constructor(
		private readonly config: EngineConfig,
		source: string,
		flags?: string,
	) {
		this.source = source;
		this.flags = flags ?? '';
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
		const { handle, nameToIndex } = getHandle(this.config, this.source, this.flags);
		const outcome = runMatch(handle, this.source, this.flags, input, this.lastIndex);
		if (!outcome.matched) {
			this.lastIndex = 0;
			return null;
		}
		// No manual +1 for a zero-length match: Symbol.replace applies that itself via
		// AdvanceStringIndex; doing it here too would skip a character.
		this.lastIndex = outcome.matchEnd;
		return toExecArray(outcome.groups, outcome.matchStart, input, nameToIndex);
	}
}

// lib.es2015.symbol.wellknown only declares the function-replacer overload;
// the runtime method (per spec) also accepts a plain string.
type StringReplacer = (this: RegExp, string: string, replacement: string) => string;

function replacePattern(
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

function splitPattern(
	config: EngineConfig,
	pattern: string,
	input: string,
	flags = '',
): (string | undefined)[] {
	// Splits on every match regardless of `g` (implicitly global, per spec),
	// splicing capture groups from each separator match into the result.
	const { handle } = getHandle(config, pattern, flags);
	const parts: (string | undefined)[] = [];
	let cursor = 0;
	let offset = 0;

	while (offset <= input.length) {
		const outcome = runMatch(handle, pattern, flags, input, offset);
		if (!outcome.matched) break;

		// A zero-length match sitting exactly where the previous segment ended
		// doesn't split anything (matches native split's edge-case skip).
		if (outcome.matchEnd === outcome.matchStart && outcome.matchStart === cursor) {
			offset = nextOffset(outcome.matchEnd, outcome.matchStart);
			continue;
		}

		parts.push(input.slice(cursor, outcome.matchStart));
		parts.push(...outcome.groups.slice(1));
		cursor = outcome.matchEnd;
		offset = nextOffset(outcome.matchEnd, outcome.matchStart);
	}

	parts.push(input.slice(cursor));
	return parts;
}

export interface RegexEngine {
	test(pattern: string, input: string, flags?: string): boolean;
	exec(pattern: string, input: string, flags?: string): Pcre2ExecArray | null;
	replace(pattern: string, input: string, flags: string | undefined, replacement: string): string;
	matchAll(pattern: string, input: string, flags?: string): Pcre2ExecArray[];
	split(pattern: string, input: string, flags?: string): (string | undefined)[];
}

/** `initPcre2Engine()` must have already resolved. With no options, only `i`/`m`/`s`/`x` are accepted. */
export function createPcre2RegexEngine(options?: Pcre2EngineOptions): RegexEngine {
	const jsFlags = options?.jsFlags ?? [];
	for (const flag of jsFlags) {
		if (!ALL_JS_FLAGS.includes(flag)) throw new Error(`Unknown jsFlags entry: '${flag}'`);
	}

	const config: EngineConfig = {
		allowedFlags: new Set<Pcre2Flag | Pcre2JsFlag>([...NATIVE_FLAGS, ...jsFlags]),
		native: resolveNativeOptions(options?.compileOptions ?? [], getModule()),
		handleCache: new Map(),
	};
	liveCaches.add(config.handleCache);

	return {
		test: (pattern, input, flags) => testPattern(config, pattern, input, flags ?? ''),
		exec: (pattern, input, flags) => execPattern(config, pattern, input, flags ?? ''),
		replace: (pattern, input, flags, replacement) =>
			replacePattern(config, pattern, input, flags ?? '', replacement),
		matchAll: (pattern, input, flags) => matchAllPattern(config, pattern, input, flags ?? ''),
		split: (pattern, input, flags) => splitPattern(config, pattern, input, flags ?? ''),
	};
}
