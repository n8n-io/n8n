import type { VIEWS } from '@n8n/frontend-constants/views';
import type { Component, VNode } from 'vue';

export type NotificationType = '' | 'success' | 'warning' | 'error' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * Notification payload accepted by the toast layer.
 *
 * Mirrors Element Plus' notification options (the shape the toast layer
 * ultimately forwards to `ElNotification`) but is declared inline so no
 * dependency on `element-plus` is carried across the package boundary.
 * `message` is required; every other field is optional.
 *
 * Owned here rather than in `@n8n/stores/notifications.store` because it is the
 * toast layer's contract, and `@n8n/composables` now sits below the stores tier
 * (N8N-100). The store re-exports it for existing importers.
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
 * The notification state `useToast` needs, injected instead of imported so this
 * package carries no dependency on `@n8n/stores`. `editor-ui` registers the
 * notifications store at bootstrap via `registerNotificationState`.
 *
 * Declared from the consumer's point of view — plain values, not `Ref`s — so a
 * Pinia store instance (whose refs are unwrapped for consumers) satisfies it
 * structurally with no cast at the registration site. Reads happen per call, so
 * reactivity is preserved.
 */
export interface ToastNotificationState {
	readonly areNotificationsSuppressed: boolean;
	readonly allowErrorNotificationsWhenSuppressed: boolean;
	readonly pendingNotificationsForViews: Partial<Record<VIEWS, NotificationOptions[]>>;
	setNotificationsForView(view: VIEWS, notifications: NotificationOptions[]): void;
}
