import { describe, it, expect } from 'vitest';

// TODO: Rewrite sleep/wait tests for the new standalone sleep primitive.
// The old tests tested the SleepRequestedError/continuation mechanism which
// has been replaced by ctx.sleep({ name, duration }) as a graph-level node.
// See: docs/superpowers/specs/2026-03-11-engine-v2-sdk-redesign.md

describe.skipIf(!process.env.DATABASE_URL)('Sleep/Wait', () => {
	it('placeholder — tests will be added when the new sleep primitive is implemented', () => {
		expect(true).toBe(true);
	});
});
