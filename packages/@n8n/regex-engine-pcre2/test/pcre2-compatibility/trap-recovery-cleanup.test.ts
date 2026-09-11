import { beforeAll, describe, expect, it, vi } from 'vitest';

import createPcre2WrapperModule from '../../src/generated/pcre2_wrapper.js';
import { releaseSubject, runMatch } from '../../src/match.js';
import { initPcre2Engine, invalidatedHandles } from '../../src/wasm-module.js';

// A trap during runMatch() invalidates every cached handle before the caller's `finally`
// gets to call releaseSubject() on the one it was using (reinitModuleAfterTrap() tears down
// the whole wasm module). Without this check, that cleanup call would hit a dead native
// object -- either throwing again (masking the real Pcre2InternalError already in flight)
// or worse. Exercises releaseSubject() directly against a handle marked invalidated the
// same way reinitModuleAfterTrap() marks one, since a real trap isn't reliably reproducible
// in a test (see wall-clock-budget.test.ts's similar note).
describe('releaseSubject() after a handle is invalidated', () => {
	beforeAll(async () => {
		await initPcre2Engine();
	});

	it('skips the native clearSubject() call for an invalidated handle, without throwing', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper('a+b', '', 1_000_000, 1_000_000, 20_000, 300, 0, 0, 0);
		try {
			runMatch(handle, 'a+b', '', 'xxaaabxx', 0);
			const clearSubject = vi.spyOn(handle, 'clearSubject');

			invalidatedHandles.add(handle);
			expect(() => releaseSubject(handle)).not.toThrow();

			expect(clearSubject).not.toHaveBeenCalled();
		} finally {
			handle.delete();
		}
	});

	it('still calls the native clearSubject() for a handle that was not invalidated', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper('a+b', '', 1_000_000, 1_000_000, 20_000, 300, 0, 0, 0);
		try {
			runMatch(handle, 'a+b', '', 'xxaaabxx', 0);
			const clearSubject = vi.spyOn(handle, 'clearSubject');

			releaseSubject(handle);

			expect(clearSubject).toHaveBeenCalledOnce();
		} finally {
			handle.delete();
		}
	});
});
