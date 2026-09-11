import type { EngineConfig } from './engine.js';
import { Pcre2CompileError } from './errors.js';
import { assertSupportedFlags } from './flags.js';
import type { Pcre2Wrapper } from './generated/pcre2_wrapper.js';
import { getModule, isWasmTrap, reinitModuleAfterTrap } from './wasm-module.js';

// Exceeding one of these makes pcre2_match() error out instead of continuing to backtrack.
export const MATCH_LIMIT = 100_000;
export const DEPTH_LIMIT = 1_000_000;
export const HEAP_LIMIT_KB = 20_000;
// match_limit/depth_limit count backtrack steps, not wall-clock: an unanchored lazy
// quantifier (e.g. `.+?(?=x)`) can stay well under both while still costing O(subject
// length) time per scan position -- confirmed to take seconds on a single exec() against
// a large subject without tripping either. This bounds a single pcre2_match() call via a
// PCRE2_AUTO_CALLOUT check (native/pcre2_wrapper.cpp), independent of both those counters
// and of the JS-side operation timeout (budget.ts), which can't interrupt a call already
// in flight. 300ms leaves comfortable margin above the real corpus's worst legitimate
// single-match time (under 100ms outside this exact pathological shape).
export const WALL_CLOCK_LIMIT_MS = 300;

export interface CompiledPattern {
	handle: Pcre2Wrapper;
	// Resolved once at compile time -- PCRE2's own name table never changes across matches.
	nameToIndex: ReadonlyMap<string, number>;
}

function cacheKey(pattern: string, flags: string): string {
	return JSON.stringify([pattern, flags]);
}

export function getHandle(config: EngineConfig, pattern: string, flags: string): CompiledPattern {
	assertSupportedFlags(config.allowedFlags, flags);
	const key = cacheKey(pattern, flags);
	const cached = config.handleCache.get(key);
	if (cached) {
		// Re-insert so Map iteration order stays least-recently-used first.
		config.handleCache.delete(key);
		config.handleCache.set(key, cached);
		return cached;
	}

	const module = getModule();
	let handle: Pcre2Wrapper;
	try {
		handle = new module.Pcre2Wrapper(
			pattern,
			flags,
			MATCH_LIMIT,
			DEPTH_LIMIT,
			HEAP_LIMIT_KB,
			WALL_CLOCK_LIMIT_MS,
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
	evictOverflow(config);
	return compiled;
}

// A compiled pattern owns wasm-heap memory; an unbounded cache leaks for the process lifetime.
function evictOverflow(config: EngineConfig): void {
	while (config.handleCache.size > config.maxCachedPatterns) {
		const oldest = config.handleCache.keys().next();
		if (oldest.done) return;
		const evicted = config.handleCache.get(oldest.value);
		config.handleCache.delete(oldest.value);
		evicted?.handle.delete();
	}
}
