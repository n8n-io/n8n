import type { VIEWS } from '@n8n/frontend-constants/views';
import { defineStore } from 'pinia';
import { ref, type Component, type Ref, type VNode } from 'vue';

import { STORES } from './constants';

type NotificationType = '' | 'success' | 'warning' | 'error' | 'info';
type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * Notification payload accepted by the toast layer.
 *
 * This mirrors Element Plus' notification options (the shape the toast layer
 * ultimately forwards to `ElNotification`) but is declared inline so this
 * package carries no dependency on `element-plus`. `message` is required; every
 * other field is optional, matching the original `Partial<...>`-based type.
 *
 * Relocated here from `editor-ui`'s `@/Interface` so it can travel with the
 * notifications store; `editor-ui` re-exports it for existing importers.
 */
export interface NotificationOptions {
	message: string | VNode;
	title?: string;
	type?: NotificationType;
	icon?: string | Component;
	customClass?: string;
	duration?: number;
	position?: NotificationPosition;
	showClose?: boolean;
	dangerouslyUseHTMLString?: boolean;
	offset?: number;
	appendTo?: HTMLElement | string;
	zIndex?: number;
	onClick?: () => void;
	onClose?: () => void;
}

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
