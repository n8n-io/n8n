import { createPinia, setActivePinia } from 'pinia';

import { useNotificationsStore } from './notifications.store';

let notificationsStore: ReturnType<typeof useNotificationsStore>;

describe('notifications store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		notificationsStore = useNotificationsStore();
	});

	it('starts with suppression disabled', () => {
		expect(notificationsStore.areNotificationsSuppressed).toBe(false);
		expect(notificationsStore.allowErrorNotificationsWhenSuppressed).toBe(false);
	});

	it('suppresses notifications without allowing errors by default', () => {
		notificationsStore.setNotificationsSuppressed(true);

		expect(notificationsStore.areNotificationsSuppressed).toBe(true);
		expect(notificationsStore.allowErrorNotificationsWhenSuppressed).toBe(false);
	});

	it('allows error notifications while suppressed when opted in', () => {
		notificationsStore.setNotificationsSuppressed(true, { allowErrors: true });

		expect(notificationsStore.areNotificationsSuppressed).toBe(true);
		expect(notificationsStore.allowErrorNotificationsWhenSuppressed).toBe(true);
	});

	it('clears the error allowance when suppression is turned off', () => {
		notificationsStore.setNotificationsSuppressed(true, { allowErrors: true });
		notificationsStore.setNotificationsSuppressed(false, { allowErrors: true });

		expect(notificationsStore.areNotificationsSuppressed).toBe(false);
		expect(notificationsStore.allowErrorNotificationsWhenSuppressed).toBe(false);
	});
});
