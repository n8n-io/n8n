import type { NotificationOptions } from '@n8n/composables/useToast';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useNotificationsStore } from '@n8n/stores/notifications.store';

/**
 * Displays the notifications a view queued before it mounted.
 *
 * Relocated here from `@n8n/composables/useToast`: it is the only part
 * of the toast layer that needs the notification *queue*, and depending on a
 * store is legitimate in app code but not in a package below the stores tier.
 * Behaviour is unchanged from the package version.
 *
 * Note: `setNotificationsForView` currently has no producer anywhere, so the
 * queue is permanently empty and this is dead in production. Deleting it —
 * together with the store's queue members — is N8N-103's call, not this move's.
 */
export function useNotificationForViews() {
	const toast = useToast();
	const notificationsStore = useNotificationsStore();

	function showNotificationForViews(views: VIEWS[]) {
		const notifications: NotificationOptions[] = [];
		views.forEach((view) => {
			notifications.push(...(notificationsStore.pendingNotificationsForViews[view] ?? []));
		});
		if (notifications.length) {
			notifications.forEach((notification) => {
				// Notifications show on top of each other without this timeout
				setTimeout(() => {
					toast.showMessage(notification);
				}, 5);
			});
			// Clear the queue once all notifications are shown.
			// Only `WORKFLOW` is cleared regardless of `views` — preserved as-is from
			// the package version; correcting it belongs with N8N-103.
			notificationsStore.setNotificationsForView(VIEWS.WORKFLOW, []);
		}
	}

	return { showNotificationForViews };
}
