import { computed, ref } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { hasPermission } from '@/app/utils/rbac/permissions';

export const CLOUD_CONSOLE_COACHMARK_KEY = 'cloud-console-moved-coachmark';

/** The account menu shipped in 2.49.0 and 3.3.0; accounts created later never saw the old row. */
const ACCOUNT_MENU_RELEASED_AT = Date.parse('2026-11-17T00:00:00Z');

/** Local-only switch for reviewing the coachmark: skips the account-age and dismissal checks. */
const PREVIEW_STORAGE_KEY = 'N8N_PREVIEW_CLOUD_CONSOLE_COACHMARK';

function isPreviewForced() {
	return import.meta.env.DEV && window.localStorage.getItem(PREVIEW_STORAGE_KEY) === 'true';
}

export function useCloudConsoleCoachmark() {
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const versionsStore = useVersionsStore();
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();

	const canOpenCloudConsole = computed(
		() => settingsStore.isCloudDeployment && hasPermission(['instanceOwner']),
	);

	// Without a creation date the account is treated as existing, so it can still learn the move.
	const usedPreviousSidebar = computed(() => {
		const createdAt = usersStore.currentUser?.createdAt;
		if (!createdAt) return true;
		return Date.parse(createdAt) < ACCOUNT_MENU_RELEASED_AT;
	});

	// The preview switch ignores the stored dismissal, so this keeps "Got it" working until reload.
	const isDismissed = ref(false);

	const shouldShow = computed(() => {
		if (!canOpenCloudConsole.value || isDismissed.value) return false;
		// The What's new toast takes the same corner; the coachmark waits until it is closed.
		if (versionsStore.isWhatsNewCalloutOpen) return false;
		if (isPreviewForced()) return true;
		return usedPreviousSidebar.value && !isCalloutDismissed(CLOUD_CONSOLE_COACHMARK_KEY);
	});

	// The menu calls this on every open, so it only writes while there is something to dismiss.
	async function dismiss() {
		if (isDismissed.value || !canOpenCloudConsole.value) return;
		if (!isPreviewForced()) {
			if (!usedPreviousSidebar.value || isCalloutDismissed(CLOUD_CONSOLE_COACHMARK_KEY)) return;
		}
		isDismissed.value = true;
		await dismissCallout(CLOUD_CONSOLE_COACHMARK_KEY);
	}

	return { shouldShow, dismiss };
}
