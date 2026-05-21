import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { LOCAL_STORAGE_BROWSER_NOTIFICATION_METADATA } from '@/app/constants/localStorage';
import { SEVEN_DAYS_IN_MILLIS } from '@/app/constants/durations';

interface BrowserNotificationMetadata {
	lastDismissedAt: number | null;
	dismissCount: number;
}

export interface PermissionRequestResult {
	permission: NotificationPermission;
	wasRequested: boolean;
}

export interface UseBrowserNotificationsOptions {
	cooldownMs?: number;
	maxDismissals?: number;
}

const DEFAULT_MAX_DISMISSALS = 3;

const permissionState = ref<NotificationPermission>(
	typeof Notification !== 'undefined' ? Notification.permission : 'denied',
);

/**
 * Reset shared permission state. Only for testing purposes.
 * @internal
 */
export function __resetpermissionState(): void {
	permissionState.value = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

/**
 * Composable for managing browser notification permissions.
 *
 * Provides a clean API for:
 * - Checking if notifications are supported/enabled
 * - Requesting notification permission
 * - Handling cooldown logic after dismissals
 * - Showing native browser notifications
 *
 * @example
 * ```typescript
 * const { isEnabled, canPrompt, requestPermission, showNotification } = useBrowserNotifications();
 *
 * if (canPrompt.value) {
 *   await requestPermission();
 * }
 *
 * if (isEnabled.value) {
 *   showNotification('Workflow Complete', { body: 'Your workflow finished successfully' });
 * }
 * ```
 */
export function useBrowserNotifications(options: UseBrowserNotificationsOptions = {}) {
	const { cooldownMs = SEVEN_DAYS_IN_MILLIS, maxDismissals = DEFAULT_MAX_DISMISSALS } = options;

	const metadata = useLocalStorage<BrowserNotificationMetadata>(
		LOCAL_STORAGE_BROWSER_NOTIFICATION_METADATA,
		{ lastDismissedAt: null, dismissCount: 0 },
		{ writeDefaults: false },
	);

	const isSupported = computed(() => typeof Notification !== 'undefined');
	const isEnabled = computed(() => permissionState.value === 'granted');
	const isDenied = computed(() => permissionState.value === 'denied');

	const isInCooldown = computed(() => {
		if (!metadata.value.lastDismissedAt) return false;
		const timeSinceDismissal = Date.now() - metadata.value.lastDismissedAt;
		return timeSinceDismissal < cooldownMs;
	});

	const hasExceededMaxDismissals = computed(() => {
		return metadata.value.dismissCount >= maxDismissals;
	});

	const canPrompt = computed(() => {
		return (
			isSupported.value &&
			permissionState.value === 'default' &&
			!isInCooldown.value &&
			!hasExceededMaxDismissals.value
		);
	});

	function refreshPermissionState(): void {
		if (typeof Notification !== 'undefined') {
			permissionState.value = Notification.permission;
		}
	}

	/**
	 * Request notification permission from the browser.
	 * Respects cooldown and denial states.
	 *
	 * @returns Result with permission state and whether request was actually made
	 */
	async function requestPermission(): Promise<PermissionRequestResult> {
		refreshPermissionState();

		if (permissionState.value === 'granted') {
			return { permission: 'granted', wasRequested: false };
		}

		if (permissionState.value === 'denied') {
			return { permission: 'denied', wasRequested: false };
		}

		if (isInCooldown.value || hasExceededMaxDismissals.value) {
			return { permission: permissionState.value, wasRequested: false };
		}

		try {
			const result = await Notification.requestPermission();
			permissionState.value = result;
			return { permission: result, wasRequested: true };
		} catch {
			refreshPermissionState();
			return { permission: permissionState.value, wasRequested: true };
		}
	}

	function recordDismissal(): void {
		metadata.value = {
			lastDismissedAt: Date.now(),
			dismissCount: metadata.value.dismissCount + 1,
		};
	}

	function resetMetadata(): void {
		metadata.value = { lastDismissedAt: null, dismissCount: 0 };
	}

	function showNotification(
		title: string,
		notificationOptions?: NotificationOptions,
	): Notification | null {
		if (!isEnabled.value || !isSupported.value) {
			return null;
		}
		return new Notification(title, notificationOptions);
	}

	return {
		permissionState,

		isSupported,
		isEnabled,
		isDenied,
		isInCooldown,
		canPrompt,

		requestPermission,
		recordDismissal,
		resetMetadata,
		refreshPermissionState,
		showNotification,

		metadata: computed(() => metadata.value),
	};
}
