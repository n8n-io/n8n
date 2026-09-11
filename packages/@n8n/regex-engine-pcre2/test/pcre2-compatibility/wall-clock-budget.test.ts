import { describe, expect, it } from 'vitest';

import createPcre2WrapperModule from '../../src/generated/pcre2_wrapper.js';

// match_limit/depth_limit count backtrack steps, not wall-clock: an unanchored lazy
// quantifier can stay well under both while still costing real time per scan position, so
// they can't be relied on alone to bound a single pcre2_match() call's duration. This
// covers the native PCRE2_AUTO_CALLOUT-based deadline check (native/pcre2_wrapper.cpp)
// that exists specifically for that gap.
//
// The public createPcre2RegexEngine() API always uses the real 300ms WALL_CLOCK_LIMIT_MS
// (handle-cache.ts), and no pattern in this repo's corpus reliably exceeds that on
// reasonable hardware -- PCRE2's interpreter is well-optimized against most classic
// catastrophic-backtracking shapes (unlike native RegExp on the same patterns). So this
// exercises the mechanism directly against the generated module, with a deliberately tiny
// deadline, rather than hunting for an input slow enough to trip a 300ms budget in a test
// that must also run quickly and deterministically on CI.
describe('wall-clock budget (native callout)', () => {
	it('aborts a single match once its wall-clock deadline elapses, with a distinct status', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper(
			'(a+)+$',
			'',
			1_000_000, // matchLimit -- generous, so match-limit can't fire first
			1_000_000, // depthLimit
			20_000, // heapLimitKb
			1, // wallClockLimitMs -- deliberately tiny
			0,
			0,
			0,
		);
		try {
			expect(handle.compileStatus().ok).toBe(true);
			handle.setSubject('a'.repeat(35) + 'b');

			const start = performance.now();
			const result = handle.matchAt(0, false);
			const took = performance.now() - start;

			expect(result.status.value).toBe(module.MatchStatus.WallClockExceeded.value);
			expect(result.errorCode).toBe(-37); // PCRE2_ERROR_CALLOUT
			expect(took).toBeLessThan(1000);
		} finally {
			handle.delete();
		}
	});

	it('does not fire on a fast, legitimate match', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper(
			'a+b',
			'',
			1_000_000,
			1_000_000,
			20_000,
			300, // wallClockLimitMs -- the real production value
			0,
			0,
			0,
		);
		try {
			handle.setSubject('xxaaabxx');
			const result = handle.matchAt(0, false);
			expect(result.status.value).toBe(module.MatchStatus.Match.value);
		} finally {
			handle.delete();
		}
	});
});
