import type { NotificationOptions as ElementNotificationOptions } from 'element-plus';
import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

import { STORES } from './constants';
import type { VIEWS } from './views';

/**
 * Notification payload accepted by the toast layer. Extends Element Plus'
 * notification options, narrowing `message` to also allow a plain string.
 *
 * Relocated here from `editor-ui`'s `@/Interface` so it can travel with the
 * notifications store; `editor-ui` re-exports it for existing importers.
 */
export interface NotificationOptions extends Partial<ElementNotificationOptions> {
	message: string | ElementNotificationOptions['message'];
}

/**
 * Public surface of the notifications store. Declared explicitly so the emitted
 * type declarations reference these named types instead of inlining Element
 * Plus' deep option types (which are not portable across the package boundary).
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
