import {
	waitForActivationConfirmation,
	resolveActivationConfirmation,
	rejectActivationConfirmation,
	cancelActivationConfirmation,
} from './useWorkflowActivateConfirmation';

describe('useWorkflowActivateConfirmation', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('waitForActivationConfirmation', () => {
		it('should resolve to true when resolveActivationConfirmation is called', async () => {
			const promise = waitForActivationConfirmation('wf-1');
			resolveActivationConfirmation('wf-1');
			await expect(promise).resolves.toBe(true);
		});

		it('should resolve to false when rejectActivationConfirmation is called', async () => {
			const promise = waitForActivationConfirmation('wf-1');
			rejectActivationConfirmation('wf-1');
			await expect(promise).resolves.toBe(false);
		});

		it('should resolve to false on timeout', async () => {
			const promise = waitForActivationConfirmation('wf-1');
			vi.advanceTimersByTime(30_000);
			await expect(promise).resolves.toBe(false);
		});

		it('should clean up previous confirmation for the same workflow', async () => {
			const firstPromise = waitForActivationConfirmation('wf-1');
			const secondPromise = waitForActivationConfirmation('wf-1');

			resolveActivationConfirmation('wf-1');

			// Second promise should resolve, first should remain pending
			// (it was cleaned up and will never resolve)
			await expect(secondPromise).resolves.toBe(true);

			// First promise never resolves because its entry was removed
			// We verify this by ensuring resolve only affects the second one
			const raceResult = await Promise.race([
				firstPromise.then(() => 'first'),
				Promise.resolve('timeout'),
			]);
			expect(raceResult).toBe('timeout');
		});
	});

	describe('resolveActivationConfirmation', () => {
		it('should return true when a pending confirmation exists', () => {
			void waitForActivationConfirmation('wf-1');
			expect(resolveActivationConfirmation('wf-1')).toBe(true);
		});

		it('should return false when no pending confirmation exists', () => {
			expect(resolveActivationConfirmation('wf-unknown')).toBe(false);
		});

		it('should return false when called twice for the same workflow', () => {
			void waitForActivationConfirmation('wf-1');
			expect(resolveActivationConfirmation('wf-1')).toBe(true);
			expect(resolveActivationConfirmation('wf-1')).toBe(false);
		});
	});

	describe('rejectActivationConfirmation', () => {
		it('should return true when a pending confirmation exists', () => {
			void waitForActivationConfirmation('wf-1');
			expect(rejectActivationConfirmation('wf-1')).toBe(true);
		});

		it('should return false when no pending confirmation exists', () => {
			expect(rejectActivationConfirmation('wf-unknown')).toBe(false);
		});
	});

	describe('cancelActivationConfirmation', () => {
		it('should remove the pending confirmation without resolving', async () => {
			void waitForActivationConfirmation('wf-1');

			cancelActivationConfirmation('wf-1');

			// Subsequent resolve/reject should return false (nothing pending)
			expect(resolveActivationConfirmation('wf-1')).toBe(false);
			expect(rejectActivationConfirmation('wf-1')).toBe(false);
		});

		it('should not throw when no pending confirmation exists', () => {
			expect(() => cancelActivationConfirmation('wf-unknown')).not.toThrow();
		});
	});

	describe('isolation between workflows', () => {
		it('should track confirmations independently per workflow', async () => {
			const promise1 = waitForActivationConfirmation('wf-1');
			const promise2 = waitForActivationConfirmation('wf-2');

			rejectActivationConfirmation('wf-1');
			resolveActivationConfirmation('wf-2');

			await expect(promise1).resolves.toBe(false);
			await expect(promise2).resolves.toBe(true);
		});
	});
});
