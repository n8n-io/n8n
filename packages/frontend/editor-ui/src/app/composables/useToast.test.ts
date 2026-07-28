import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useToast } from '@/app/composables/useToast';

/**
 * This module is bootstrap wiring, not just a re-export: importing it registers
 * the notifier that package-side `useToast` depends on, and that notifier is
 * where notification suppression lives — `@n8n/composables` sits below
 * the stores tier and cannot read the store itself.
 *
 * So this is the only place the suppression matrix can be verified end to end.
 * Deleting the registration, or the suppression check inside it, must fail here;
 * both are mutation-verified.
 */
describe('useToast bootstrap wiring', () => {
	beforeEach(() => {
		// `stubActions: false` so `setNotificationsSuppressed` really mutates state,
		// matching `usePostMessageHandler.test.ts`.
		setActivePinia(createTestingPinia({ stubActions: false }));

		const appEl = document.createElement('div');
		appEl.id = 'n8n-app';
		document.body.appendChild(appEl);
	});

	afterEach(() => {
		document.getElementById('n8n-app')?.remove();
	});

	function suppress(options?: { allowErrors: boolean }) {
		useNotificationsStore().setNotificationsSuppressed(true, {
			allowErrors: options?.allowErrors ?? false,
		});
	}

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
