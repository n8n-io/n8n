import type { NotificationOptions } from '@n8n/composables/types/notification';
import type { VIEWS } from '@n8n/frontend-constants/views';
import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

import { STORES } from './constants';

/**
 * `NotificationOptions` now lives in `@n8n/composables`, alongside the toast
 * layer that owns the contract, since that package sits below this one
 * (N8N-100). Re-exported here so existing importers stay unchanged.
 */
export type { NotificationOptions } from '@n8n/composables/types/notification';

/**
 * Public surface of the notifications store. Declared explicitly so the emitted
 * type declarations reference these named types instead of inlining the
 * structural notification/Vue types, keeping the declarations portable across
 * the package boundary.
 */
export interface NotificationsStore {
	pendingNotificationsForViews: Ref<Partial<Record<VIEWS, NotificationOptions[]>>>;
	areNotificationsSuppressed: Ref<boolean>;
	allowErrorNotificationsWhenSuppressed: Ref<boolean>;
	setNotificationsForView: (view: VIEWS, notifications: NotificationOptions[]) => void;
	setNotificationsSuppressed: (suppressed: boolean, options?: { allowErrors?: boolean }) => void;
}

/**
 * Notification state extracted from `ui.store`: the per-view queue of pending
 * notifications and the suppression flags read by the toast layer.
 */
export const useNotificationsStore = defineStore(STORES.NOTIFICATIONS, (): NotificationsStore => {
	const pendingNotificationsForViews = ref<Partial<Record<VIEWS, NotificationOptions[]>>>({});
	const areNotificationsSuppressed = ref(false);
	const allowErrorNotificationsWhenSuppressed = ref(false);

	const setNotificationsForView = (view: VIEWS, notifications: NotificationOptions[]) => {
		pendingNotificationsForViews.value[view] = notifications;
	};

	const setNotificationsSuppressed = (suppressed: boolean, options?: { allowErrors?: boolean }) => {
		areNotificationsSuppressed.value = suppressed;
		allowErrorNotificationsWhenSuppressed.value = suppressed && options?.allowErrors === true;
	};

	return {
		pendingNotificationsForViews,
		areNotificationsSuppressed,
		allowErrorNotificationsWhenSuppressed,
		setNotificationsForView,
		setNotificationsSuppressed,
	};
});
