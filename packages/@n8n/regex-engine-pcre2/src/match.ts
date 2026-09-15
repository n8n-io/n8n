import { Pcre2BudgetExceededError, Pcre2InternalError, Pcre2MatchError } from './errors.js';
import type { Pcre2BudgetKind } from './errors.js';
import type { EnumValue, Pcre2Wrapper } from './generated/pcre2_wrapper.js';
import { MATCH_LIMIT, DEPTH_LIMIT, HEAP_LIMIT_KB, WALL_CLOCK_LIMIT_MS } from './handle-cache.js';
import { getModule, isWasmTrap, reinitModuleAfterTrap, invalidatedHandles } from './wasm-module.js';

/** A RegExpExecArray-like result: an array of matched groups plus `index`/`input`/`groups`. */
export type Pcre2ExecArray = Array<string | undefined> & {
	// eslint-disable-next-line @typescript-eslint/naming-convention -- numeric index key, mirrors RegExpExecArray's own shape
	0: string;
	index: number;
	input: string;
	groups: Record<string, string | undefined> | undefined;
};

function isStatus(status: EnumValue, expected: EnumValue): boolean {
	return status.value === expected.value;
}

interface MatchOutcome {
	matched: boolean;
	// undefined for an unset group, distinct from one that matched empty text -- as native RegExp does.
	groups: Array<string | undefined>;
	matchStart: number;
	matchEnd: number;
}

// A matchAll/replace/split loop calls runMatch many times with the same `input` reference
// (per call) against the same handle -- embind's setSubject() copies the whole string into
// wasm memory, so this skips repeating that copy when it's the same subject as last time,
// dropping a matchAll loop's marshalling cost from O(matches x subject length) to O(subject
// length) once per operation. Relies on callers passing the same string reference across a
// loop (true today), not on content equality -- a fresh distinct string is still handled
// correctly, just without the memoization.
const lastSubjectByHandle = new WeakMap<Pcre2Wrapper, string>();

function ensureSubjectSet(handle: Pcre2Wrapper, input: string): void {
	if (lastSubjectByHandle.get(handle) === input) return;
	handle.setSubject(input);
	lastSubjectByHandle.set(handle, input);
}

// Call once a whole engine-level operation (one test/exec, or a whole matchAll/replace/split
// loop) is done with `handle`. Without this, a handle sitting in the LRU pattern cache keeps
// a full copy of the last subject it matched for as long as it stays cached -- unbounded by
// anything but cache size, since a cached handle can outlive the operation that populated it
// by a long margin. Must drop the WeakMap entry in the same call as the native clear, or a
// later ensureSubjectSet() would wrongly believe the native side still has it set.
export function releaseSubject(handle: Pcre2Wrapper): void {
	if (!lastSubjectByHandle.has(handle)) return;
	lastSubjectByHandle.delete(handle);
	// A trap between the match and this cleanup already tore this handle's wasm object
	// down (reinitModuleAfterTrap) -- calling clearSubject() on it would throw again or
	// mask the Pcre2InternalError the caller is already propagating.
	if (invalidatedHandles.has(handle)) return;
	handle.clearSubject();
}

// Budget exhaustion or an unexpected PCRE2 error throws, so callers don't re-check status codes.
export function runMatch(
	handle: Pcre2Wrapper,
	pattern: string,
	flags: string,
	input: string,
	startOffset: number,
	anchored = false,
): MatchOutcome {
	const { MatchStatus } = getModule();
	let result: ReturnType<Pcre2Wrapper['matchAt']>;
	try {
		ensureSubjectSet(handle, input);
		result = handle.matchAt(startOffset, anchored);
	} catch (error) {
		// A trap isn't a budget hit -- could be an internal/memory fault -- so it gets its own type.
		if (isWasmTrap(error)) {
			reinitModuleAfterTrap();
			throw new Pcre2InternalError(
				'The PCRE2 wasm module trapped while matching (unrecoverable; the module was reloaded)',
				pattern,
				flags,
			);
		}
		throw error;
	}

	// matchAt() allocates a fresh StringVector/IntVector in wasm memory on every call,
	// regardless of status -- embind's vector bindings aren't JS-GC'd, so every exit path
	// (including the throwing ones below) must free them or this leaks per match, forever,
	// unbounded by anything (unlike the LRU-capped compiled-pattern cache).
	try {
		if (isStatus(result.status, MatchStatus.Match)) {
			const groups = Array.from(result.groups) as Array<string | undefined>;
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

		const budgets: Array<[EnumValue, Pcre2BudgetKind, string, number]> = [
			[MatchStatus.MatchLimitExceeded, 'match-limit', 'match_limit', MATCH_LIMIT],
			[MatchStatus.DepthLimitExceeded, 'depth-limit', 'depth_limit', DEPTH_LIMIT],
			[MatchStatus.HeapLimitExceeded, 'heap-limit', 'heap_limit_kb', HEAP_LIMIT_KB],
			[
				MatchStatus.WallClockExceeded,
				'wall-clock-limit',
				'wall_clock_limit_ms',
				WALL_CLOCK_LIMIT_MS,
			],
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
		throw new Pcre2MatchError(
			`Unexpected PCRE2 match error${result.errorMessage ? `: ${result.errorMessage}` : ''} (code ${result.errorCode})`,
			result.errorCode,
			pattern,
			flags,
		);
	} finally {
		result.groups.delete();
		result.groupParticipated?.delete();
	}
}

function buildNamedGroups(
	nameToIndex: ReadonlyMap<string, number>,
	groups: Array<string | undefined>,
): Record<string, string | undefined> | undefined {
	// Native RegExp: `.groups` is undefined only when the pattern has no named groups at all.
	if (nameToIndex.size === 0) return undefined;
	const named = Object.create(null) as Record<string, string | undefined>;
	for (const [name, index] of nameToIndex) named[name] = groups[index];
	return named;
}

export function toExecArray(
	groups: Array<string | undefined>,
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

const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;

/**
 * A zero-length match must advance by at least one code unit, or a loop over it never makes
 * progress. Under the `u`/unicode flag the advance must land on a code-point boundary: PCRE2
 * validates that for every call by default, but the matchAll/replace/split loop now runs with
 * PCRE2_NO_UTF_CHECK after its first call (see native matchAt()) to avoid re-validating the
 * whole subject per match, so an offset landing mid-surrogate-pair would be PCRE2's own
 * undefined behaviour instead of a caught error -- this must not happen.
 */
export function nextOffset(
	matchEnd: number,
	matchStart: number,
	input: string,
	unicode: boolean,
): number {
	if (matchEnd > matchStart) return matchEnd;
	const highSurrogate = input.charCodeAt(matchEnd);
	if (unicode && highSurrogate >= HIGH_SURROGATE_MIN && highSurrogate <= HIGH_SURROGATE_MAX) {
		return matchEnd + 2;
	}
	return matchEnd + 1;
}
