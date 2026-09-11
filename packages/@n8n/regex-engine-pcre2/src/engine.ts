import { createOperationBudget } from './budget.js';
import type { Pcre2Flag, Pcre2JsFlag } from './flags.js';
import { ALL_JS_FLAGS, nativeFlagsFrom, isSticky, isUnicode } from './flags.js';
import type { CompiledPattern } from './handle-cache.js';
import { getHandle } from './handle-cache.js';
import { replacePattern, splitPattern } from './js-regexp-emulation.js';
import type { Pcre2ExecArray } from './match.js';
import { runMatch, toExecArray, nextOffset } from './match.js';
import type { Pcre2CompileOption, ResolvedNativeOptions } from './native-options.js';
import { resolveNativeOptions } from './native-options.js';
import { getModule, liveCaches } from './wasm-module.js';

export interface Pcre2EngineOptions {
	/** PCRE2 compile options to enable. Default: none (plain PCRE2). */
	compileOptions?: Pcre2CompileOption[];
	/** JS-only flag characters this engine accepts in a pattern's flags string. Default: none. */
	jsFlags?: Pcre2JsFlag[];
	/** Wall-clock budget for one whole `matchAll`/`replace`/`split` call, in ms. Default: {@link DEFAULT_OPERATION_TIMEOUT_MS}. */
	operationTimeoutMs?: number;
	/** Maximum matches one `matchAll`/`replace`/`split` call may produce. Default: {@link DEFAULT_MAX_MATCHES}. */
	maxMatchesPerOperation?: number;
	/** Maximum compiled patterns kept in the handle cache, evicted least-recently-used first. Default: {@link DEFAULT_MAX_CACHED_PATTERNS}. */
	maxCachedPatterns?: number;
}

/** @see Pcre2EngineOptions.operationTimeoutMs */
export const DEFAULT_OPERATION_TIMEOUT_MS = 1_000;
/** @see Pcre2EngineOptions.maxMatchesPerOperation */
export const DEFAULT_MAX_MATCHES = 1_000_000;
/** @see Pcre2EngineOptions.maxCachedPatterns */
export const DEFAULT_MAX_CACHED_PATTERNS = 1_000;

export interface EngineConfig {
	allowedFlags: ReadonlySet<Pcre2Flag | Pcre2JsFlag>;
	native: ResolvedNativeOptions;
	handleCache: Map<string, CompiledPattern>;
	operationTimeoutMs: number;
	maxMatchesPerOperation: number;
	maxCachedPatterns: number;
}

// A NaN/negative/non-finite value would silently disable the budget check it's meant to
// drive (e.g. `matches > NaN` is always false), so validate every numeric option up front
// rather than let a bad value reach the hot loop.
function requirePositiveInteger(value: number, name: string): number {
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive integer, got ${value}`);
	}
	return value;
}

function testPattern(config: EngineConfig, pattern: string, input: string, flags = ''): boolean {
	const { handle } = getHandle(config, pattern, flags);
	return runMatch(handle, pattern, flags, input, 0, isSticky(flags)).matched;
}

function execPattern(
	config: EngineConfig,
	pattern: string,
	input: string,
	flags = '',
): Pcre2ExecArray | null {
	const { handle, nameToIndex } = getHandle(config, pattern, flags);
	const outcome = runMatch(handle, pattern, flags, input, 0, isSticky(flags));
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
	const budget = createOperationBudget(config, pattern, flags);
	const sticky = isSticky(flags);
	const unicode = isUnicode(flags);
	let offset = 0;
	while (offset <= input.length) {
		budget.checkTime();
		const outcome = runMatch(handle, pattern, flags, input, offset, sticky);
		budget.checkTime();
		if (!outcome.matched) break;
		budget.recordMatch();
		results.push(toExecArray(outcome.groups, outcome.matchStart, input, nameToIndex));
		offset = nextOffset(outcome.matchEnd, outcome.matchStart, input, unicode);
	}
	return results;
}

export interface RegexEngine {
	test(pattern: string, input: string, flags?: string): boolean;
	exec(pattern: string, input: string, flags?: string): Pcre2ExecArray | null;
	replace(pattern: string, input: string, flags: string | undefined, replacement: string): string;
	matchAll(pattern: string, input: string, flags?: string): Pcre2ExecArray[];
	split(pattern: string, input: string, flags?: string): Array<string | undefined>;
	/** Frees every compiled pattern this engine holds in wasm memory. The engine is unusable afterwards. */
	dispose(): void;
}

/** `initPcre2Engine()` must have already resolved. With no options, only `i`/`m`/`s`/`x` are accepted. */
export function createPcre2RegexEngine(options?: Pcre2EngineOptions): RegexEngine {
	const jsFlags = options?.jsFlags ?? [];
	for (const flag of jsFlags) {
		if (!ALL_JS_FLAGS.includes(flag)) throw new Error(`Unknown jsFlags entry: '${flag}'`);
	}

	const module = getModule();
	const config: EngineConfig = {
		allowedFlags: new Set<Pcre2Flag | Pcre2JsFlag>([...nativeFlagsFrom(module), ...jsFlags]),
		native: resolveNativeOptions(options?.compileOptions ?? [], module),
		handleCache: new Map(),
		operationTimeoutMs: requirePositiveInteger(
			options?.operationTimeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS,
			'operationTimeoutMs',
		),
		maxMatchesPerOperation: requirePositiveInteger(
			options?.maxMatchesPerOperation ?? DEFAULT_MAX_MATCHES,
			'maxMatchesPerOperation',
		),
		maxCachedPatterns: requirePositiveInteger(
			options?.maxCachedPatterns ?? DEFAULT_MAX_CACHED_PATTERNS,
			'maxCachedPatterns',
		),
	};
	liveCaches.add(config.handleCache);
	let disposed = false;

	function checkNotDisposed(): void {
		if (disposed) throw new Error('This RegexEngine has been disposed and can no longer be used.');
	}

	return {
		test: (pattern, input, flags) => {
			checkNotDisposed();
			return testPattern(config, pattern, input, flags ?? '');
		},
		exec: (pattern, input, flags) => {
			checkNotDisposed();
			return execPattern(config, pattern, input, flags ?? '');
		},
		replace: (pattern, input, flags, replacement) => {
			checkNotDisposed();
			return replacePattern(config, pattern, input, flags ?? '', replacement);
		},
		matchAll: (pattern, input, flags) => {
			checkNotDisposed();
			return matchAllPattern(config, pattern, input, flags ?? '');
		},
		split: (pattern, input, flags) => {
			checkNotDisposed();
			return splitPattern(config, pattern, input, flags ?? '');
		},
		dispose: () => {
			for (const compiled of config.handleCache.values()) compiled.handle.delete();
			config.handleCache.clear();
			liveCaches.delete(config.handleCache);
			disposed = true;
		},
	};
}
