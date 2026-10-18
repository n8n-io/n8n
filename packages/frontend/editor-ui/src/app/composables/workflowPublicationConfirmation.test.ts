import {
	registerPendingActivationModal,
	consumePendingActivationModal,
	clearPendingActivationModal,
	PENDING_ACTIVATION_MODAL_TIMEOUT,
} from './workflowPublicationConfirmation';

describe('workflowPublicationConfirmation', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		// The registry is module-level: drop the ids used below so no intent
		// leaks into the next test.
		clearPendingActivationModal('wf-1');
		clearPendingActivationModal('wf-2');
		vi.useRealTimers();
	});

	describe('consumePendingActivationModal', () => {
		it('consumes a registered intent when the version matches', () => {
			registerPendingActivationModal('wf-1', 'v-1');

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(true);
		});

		it('consumes an intent only once', () => {
			registerPendingActivationModal('wf-1', 'v-1');

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(true);
			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(false);
		});

		it('does not consume when no intent was registered', () => {
			expect(consumePendingActivationModal('wf-unknown', 'v-1')).toBe(false);
		});

		it('keeps the intent in place when the version does not match', () => {
			registerPendingActivationModal('wf-1', 'v-2');

			// A confirmation for an older version must not consume the intent of
			// the newer publish still in flight.
			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(false);
			expect(consumePendingActivationModal('wf-1', 'v-2')).toBe(true);
		});

		it('tracks intents independently per workflow', () => {
			registerPendingActivationModal('wf-1', 'v-1');
			registerPendingActivationModal('wf-2', 'v-2');

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(true);
			expect(consumePendingActivationModal('wf-2', 'v-2')).toBe(true);
		});
	});

	describe('registerPendingActivationModal', () => {
		it('overwrites a previous intent for the same workflow', () => {
			registerPendingActivationModal('wf-1', 'v-1');
			registerPendingActivationModal('wf-1', 'v-2');

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(false);
			expect(consumePendingActivationModal('wf-1', 'v-2')).toBe(true);
		});

		it('expires the intent after the timeout', () => {
			registerPendingActivationModal('wf-1', 'v-1');

			vi.advanceTimersByTime(PENDING_ACTIVATION_MODAL_TIMEOUT);

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(false);
		});

		it('does not expire the intent before the timeout', () => {
			registerPendingActivationModal('wf-1', 'v-1');

			vi.advanceTimersByTime(PENDING_ACTIVATION_MODAL_TIMEOUT - 1);

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(true);
		});
	});

	describe('clearPendingActivationModal', () => {
		it('drops the intent so it can no longer be consumed', () => {
			registerPendingActivationModal('wf-1', 'v-1');

			clearPendingActivationModal('wf-1');

			expect(consumePendingActivationModal('wf-1', 'v-1')).toBe(false);
		});

		it('does not throw when no intent exists', () => {
			expect(() => clearPendingActivationModal('wf-unknown')).not.toThrow();
		});
	});
});
