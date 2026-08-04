import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import type { Router } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { getSanitizedCurrentPath } from '@/app/utils/urlUtils';

let handled = false;

// Captured pre-suppress so restoreNotificationSuppression() can restore it, not hardcode false.
let priorSuppression: { suppressed: boolean; allowErrors: boolean } | undefined;

// Called on successful login so a future expiry is handled again; also used by tests.
export function resetSessionExpiredHandledFlag(): void {
	handled = false;
}

// Called from SigninView.vue on a login attempt or on unmount; safe to call more than once.
export function restoreNotificationSuppression(): void {
	const notificationsStore = useNotificationsStore();
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

	if (handled || !usersStore.currentUser || baseURL !== useRootStore().restApiContext.baseUrl) {
		return;
	}
	handled = true;

	// Set before any `await` so the triggering request's own toast is suppressed too.
	const notificationsStore = useNotificationsStore();
	priorSuppression = {
		suppressed: notificationsStore.areNotificationsSuppressed,
		allowErrors: notificationsStore.allowErrorNotificationsWhenSuppressed,
	};
	notificationsStore.setNotificationsSuppressed(true);

	const redirectPath = getSanitizedCurrentPath();

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
