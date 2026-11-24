import { useToast } from '@n8n/composables/useToast';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { registerToastNotifier } from '@/app/init/toastNotifier';

/**
 * This is bootstrap wiring, not a re-export: the notifier registered here is
 * what makes package-side `useToast` render anything at all, and it is where
 * notification suppression lives — `@n8n/composables` sits below the stores tier
 * and cannot read the store itself.
 *
 * So this is the only place the suppression matrix can be verified end to end.
 * Deleting the registration, or the suppression check inside it, must fail here;
 * both are mutation-verified.
 */
describe('registerToastNotifier', () => {
	beforeEach(() => {
		// `stubActions: false` so `setNotificationsSuppressed` really mutates state,
		// matching `usePostMessageHandler.test.ts`.
		setActivePinia(createTestingPinia({ stubActions: false }));

		const appEl = document.createElement('div');
		appEl.id = 'n8n-app';
		document.body.appendChild(appEl);
	});

	afterEach(() => {
		// Takes the rendered notifications with it, so each test starts clean.
		document.getElementById('n8n-app')?.remove();
	});

	function suppress(options?: { allowErrors: boolean }) {
		useNotificationsStore().setNotificationsSuppressed(true, {
			allowErrors: options?.allowErrors ?? false,
		});
	}

	// Ordered first on purpose: the only test here that needs a module state where
	// nothing has registered yet. The unregistered precondition is asserted rather
	// than assumed, so a test inserted above this one fails on that assertion
	// instead of making this one pass vacuously.
	it('is picked up by a composable created before registration ran', () => {
		const earlyToast = useToast();

		earlyToast.showMessage({ message: 'Before registration' });
		expect(document.querySelector('.el-notification')).toBeNull();

		registerToastNotifier();
		earlyToast.showMessage({ message: 'After registration' });

		// Same composable instance. Passes only because `showMessage` resolves the
		// notifier per call; resolve-at-instantiation would leave a composable
		// created this early bound to the no-op notifier for its whole lifetime,
		// which is what would have made relocating this registration dangerous.
		expect(document.querySelector('.el-notification')).not.toBeNull();
	});

	describe('once registered', () => {
		beforeEach(() => {
			registerToastNotifier();
		});

		it('shows notifications when suppression is off', () => {
			useToast().showMessage({ message: 'Shown' });

			expect(document.querySelector('.el-notification')).not.toBeNull();
		});

		it('drops a non-error notification when suppressed', () => {
			suppress({ allowErrors: true });

			useToast().showMessage({ message: 'Suppressed' });

			expect(document.querySelector('.el-notification')).toBeNull();
		});

		it('drops an error notification when suppressed and errors are not allowed', () => {
			suppress({ allowErrors: false });

			useToast().showMessage({ message: 'Suppressed error', type: 'error' });

			expect(document.querySelector('.el-notification')).toBeNull();
		});

		it('still shows an error notification when suppressed and errors are allowed', () => {
			suppress({ allowErrors: true });

			useToast().showMessage({ message: 'Allowed error', type: 'error' });

			expect(document.querySelector('.el-notification')).not.toBeNull();
		});
	});
});
