import { describe, expect, it } from 'vitest';

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

		it('returns createAbortError for string reasons', () => {
			const error = createAbortError('stopped by user');
			expect(error).toMatchObject({ name: 'AbortError', message: 'stopped by user' });
		});
	});
});
