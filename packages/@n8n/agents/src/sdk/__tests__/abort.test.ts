import { describe, expect, it, vi } from 'vitest';

import { createAbortError, isAbortError, raceWithAbort, throwIfAborted } from '../abort';

describe('abort helpers', () => {
	describe('isAbortError', () => {
		it('detects AbortError by name', () => {
			const error = new Error('stopped');
			error.name = 'AbortError';
			expect(isAbortError(error)).toBe(true);
		});

		it('detects known abort messages', () => {
			expect(isAbortError(new Error('Aborted'))).toBe(true);
			expect(isAbortError(new Error('This operation was aborted'))).toBe(true);
		});

		it('rejects unrelated errors', () => {
			expect(isAbortError(new Error('disk full'))).toBe(false);
			expect(isAbortError('Aborted')).toBe(false);
		});
	});

	describe('throwIfAborted', () => {
		it('throws when the signal is already aborted', () => {
			const controller = new AbortController();
			controller.abort();
			expect(() => throwIfAborted(controller.signal)).toThrowError(
				expect.objectContaining({ name: 'AbortError' }),
			);
		});

		it('no-ops when the signal is still open', () => {
			expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
			expect(() => throwIfAborted(undefined)).not.toThrow();
		});
	});

	describe('raceWithAbort', () => {
		it('resolves the work promise when no signal is provided', async () => {
			await expect(raceWithAbort(Promise.resolve('ok'))).resolves.toBe('ok');
		});

		it('rejects immediately when the signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(
				raceWithAbort(new Promise(() => undefined), controller.signal),
			).rejects.toMatchObject({ name: 'AbortError' });
		});

		it('rejects promptly when the signal aborts during execution', async () => {
			const controller = new AbortController();
			const pending = raceWithAbort(new Promise(() => undefined), controller.signal);
			controller.abort('Agent run was aborted');

			await expect(pending).rejects.toMatchObject({
				name: 'AbortError',
				message: 'Agent run was aborted',
			});
		});

		it('removes the abort listener when work wins the race', async () => {
			const controller = new AbortController();
			const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

			for (let i = 0; i < 12; i++) {
				await expect(raceWithAbort(Promise.resolve(i), controller.signal)).resolves.toBe(i);
			}

			expect(removeSpy).toHaveBeenCalledTimes(12);
			expect(removeSpy.mock.calls.every(([type]) => type === 'abort')).toBe(true);
		});

		it('does not start factory work when the signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();
			const work = vi.fn().mockResolvedValue('started');

			await expect(raceWithAbort(work, controller.signal)).rejects.toMatchObject({
				name: 'AbortError',
			});
			expect(work).not.toHaveBeenCalled();
		});

		it('returns createAbortError for string reasons', () => {
			const error = createAbortError('stopped by user');
			expect(error).toMatchObject({ name: 'AbortError', message: 'stopped by user' });
		});

		describe('timeoutMs', () => {
			it('rejects with a TimeoutError when work does not settle by the deadline', async () => {
				vi.useFakeTimers();
				try {
					const pending = raceWithAbort(new Promise(() => undefined), undefined, 50);
					vi.advanceTimersByTime(50);
					const error = await pending.catch((e: unknown) => e);
					expect(error).toMatchObject({ name: 'TimeoutError' });
					expect(isAbortError(error)).toBe(false);
				} finally {
					vi.useRealTimers();
				}
			});

			it('clears the timer when work wins the race', async () => {
				vi.useFakeTimers();
				try {
					const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
					await expect(raceWithAbort(Promise.resolve('ok'), undefined, 1000)).resolves.toBe('ok');
					expect(clearTimeoutSpy).toHaveBeenCalled();
				} finally {
					vi.useRealTimers();
				}
			});

			it('clears the timer when abort wins the race', async () => {
				vi.useFakeTimers();
				try {
					const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
					const controller = new AbortController();
					const pending = raceWithAbort(new Promise(() => undefined), controller.signal, 1000);
					controller.abort('stopped');
					await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
					expect(clearTimeoutSpy).toHaveBeenCalled();
				} finally {
					vi.useRealTimers();
				}
			});

			it('does not arm a timer when timeoutMs is 0 or undefined', async () => {
				const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
				try {
					await expect(raceWithAbort(Promise.resolve('a'), undefined, 0)).resolves.toBe('a');
					await expect(raceWithAbort(Promise.resolve('b'), undefined, undefined)).resolves.toBe(
						'b',
					);
					expect(setTimeoutSpy).not.toHaveBeenCalled();
				} finally {
					setTimeoutSpy.mockRestore();
				}
			});

			it('resolves normally when work settles before the deadline', async () => {
				vi.useFakeTimers();
				try {
					const pending = raceWithAbort(Promise.resolve('fast'), undefined, 1000);
					vi.advanceTimersByTime(10);
					await expect(pending).resolves.toBe('fast');
				} finally {
					vi.useRealTimers();
				}
			});
		});
	});
});
