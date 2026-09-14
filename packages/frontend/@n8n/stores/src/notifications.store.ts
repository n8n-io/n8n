import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

import { STORES } from './constants';

/**
 * Public surface of the notifications store. Declared explicitly so the emitted
 * type declarations reference these named types instead of inlining the
 * structural Vue ref types, keeping the declarations portable across the package
 * boundary.
 */
export interface NotificationsStore {
	areNotificationsSuppressed: Ref<boolean>;
	allowErrorNotificationsWhenSuppressed: Ref<boolean>;
	setNotificationsSuppressed: (suppressed: boolean, options?: { allowErrors?: boolean }) => void;
}

/**
 * Notification state extracted from `ui.store`: the suppression flags read by
 * the toast layer.
 */
export const useNotificationsStore = defineStore(STORES.NOTIFICATIONS, (): NotificationsStore => {
	const areNotificationsSuppressed = ref(false);
	const allowErrorNotificationsWhenSuppressed = ref(false);

	const setNotificationsSuppressed = (suppressed: boolean, options?: { allowErrors?: boolean }) => {
		areNotificationsSuppressed.value = suppressed;
		allowErrorNotificationsWhenSuppressed.value = suppressed && options?.allowErrors === true;
	};

	return {
		areNotificationsSuppressed,
		allowErrorNotificationsWhenSuppressed,
		setNotificationsSuppressed,
	};
});
