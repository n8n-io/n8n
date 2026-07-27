import { setNotify } from '@n8n/composables/useToast';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useToast } from '@/app/composables/useToast';

/**
 * This module is bootstrap wiring, not just a re-export: importing it registers
 * the notifier (`setNotify`) and the notification state
 * (`registerNotificationState`) that package-side `useToast` depends on, because
 * `@n8n/composables` sits below the stores tier and imports neither element-plus
 * nor `@n8n/stores` (N8N-100).
 *
 * `setNotify` is already covered indirectly by component tests that assert on
 * rendered toasts. `registerNotificationState` was not covered by anything: the
 * suppression flags could stop being honoured — a silent behaviour change — with
 * the whole editor-ui suite still green. This pins it, so stage 6 cannot delete
 * the registration along with the re-export without CI saying so.
 */
// Typed parameter so the spy satisfies the package's `NotifyFn` contract.
const createNotifySpy = () => vi.fn((_options: Record<string, unknown>) => ({ close: vi.fn() }));

describe('useToast bootstrap wiring', () => {
	let notifySpy: ReturnType<typeof createNotifySpy>;

	beforeEach(() => {
		// `stubActions: false` so `setNotificationsSuppressed` really mutates state,
		// matching `usePostMessageHandler.test.ts`.
		setActivePinia(createTestingPinia({ stubActions: false }));

		notifySpy = createNotifySpy();
		setNotify(notifySpy);
	});

	it('honours suppression from the notifications store', () => {
		useNotificationsStore().setNotificationsSuppressed(true);

		useToast().showMessage({ message: 'Suppressed' });

		expect(notifySpy).not.toHaveBeenCalled();
	});

	it('shows notifications when suppression is off', () => {
		useNotificationsStore().setNotificationsSuppressed(false);

		useToast().showMessage({ message: 'Shown' });

		expect(notifySpy).toHaveBeenCalledTimes(1);
	});

	it('still shows errors when suppressed but errors are allowed', () => {
		useNotificationsStore().setNotificationsSuppressed(true, { allowErrors: true });

		useToast().showMessage({ message: 'Allowed error', type: 'error' });

		expect(notifySpy).toHaveBeenCalledTimes(1);
	});
});
