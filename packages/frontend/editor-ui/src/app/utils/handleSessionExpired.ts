import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import type { Router } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useSessionExpiryStore } from '@/app/stores/sessionExpiry.store';
import { useUIStore } from '@/app/stores/ui.store';
import { getSanitizedCurrentPath } from '@/app/utils/urlUtils';

// Called on successful login so a future expiry is handled again.
export function resetSessionExpiredHandledFlag(): void {
	useSessionExpiryStore().resetHandled();
}

// Called from SigninView.vue on a login attempt or on unmount; safe to call more than once.
export function restoreNotificationSuppression(): void {
	const notificationsStore = useNotificationsStore();
	const { priorSuppression } = useSessionExpiryStore();
	if (priorSuppression) {
		notificationsStore.setNotificationsSuppressed(priorSuppression.suppressed, {
			allowErrors: priorSuppression.allowErrors,
		});
	} else {
		notificationsStore.setNotificationsSuppressed(false);
	}
}

// currentUser excludes failed-login 401s; handled dedupes concurrent ones; baseURL excludes non-n8n hosts.
export async function handleSessionExpired(router: Router, baseURL: string): Promise<void> {
	const usersStore = useUsersStore();
	const sessionExpiryStore = useSessionExpiryStore();

	if (
		sessionExpiryStore.handled ||
		!usersStore.currentUser ||
		baseURL !== useRootStore().restApiContext.baseUrl
	) {
		return;
	}
	sessionExpiryStore.markHandled();

	useUIStore().closeAllModals();

	// Set before any `await` so the triggering request's own toast is suppressed too.
	const notificationsStore = useNotificationsStore();
	sessionExpiryStore.setPriorSuppression({
		suppressed: notificationsStore.areNotificationsSuppressed,
		allowErrors: notificationsStore.allowErrorNotificationsWhenSuppressed,
	});
	notificationsStore.setNotificationsSuppressed(true);

	const redirectPath = getSanitizedCurrentPath(router.currentRoute.value);

	try {
		await usersStore.logout();
	} catch {
		// Session is already invalid server-side; local cleanup still happens inside logout().
	}

	await router.push({
		name: VIEWS.SIGNIN,
		query: { redirect: encodeURIComponent(redirectPath), sessionExpired: 'true' },
	});
}
