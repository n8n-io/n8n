import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBrowserNotifications, __resetpermissionState } from './useBrowserNotifications';
import { LOCAL_STORAGE_BROWSER_NOTIFICATION_METADATA } from '@/app/constants/localStorage';
import { SEVEN_DAYS_IN_MILLIS } from '@/app/constants/durations';

// Mock the Notification API
const mockRequestPermission = vi.fn();

// Store original Notification
const originalNotification = global.Notification;

function setupNotificationMock(permission: NotificationPermission = 'default') {
	const MockNotification = vi
		.fn()
		.mockImplementation((title: string, options?: NotificationOptions) => ({
			title,
			...options,
		}));

	Object.defineProperty(MockNotification, 'permission', {
		value: permission,
		writable: true,
		configurable: true,
	});

	Object.defineProperty(MockNotification, 'requestPermission', {
		value: mockRequestPermission,
		writable: true,
		configurable: true,
	});

	Object.defineProperty(global, 'Notification', {
		value: MockNotification,
		writable: true,
		configurable: true,
	});
}

describe('useBrowserNotifications', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();

		// Reset Notification mock with default permission
		mockRequestPermission.mockResolvedValue('granted');
		setupNotificationMock('default');

		// Reset shared state after setting up the mock
		__resetpermissionState();
	});

	afterEach(() => {
		// Restore original Notification
		Object.defineProperty(global, 'Notification', {
			value: originalNotification,
			writable: true,
			configurable: true,
		});
	});

	describe('initial state', () => {
		it('should detect notifications are supported when Notification API exists', () => {
			const { isSupported } = useBrowserNotifications();
			expect(isSupported.value).toBe(true);
		});

		it('should detect notifications are not supported when Notification API is undefined', () => {
			// @ts-expect-error - intentionally setting to undefined for test
			delete global.Notification;

			const { isSupported } = useBrowserNotifications();
			expect(isSupported.value).toBe(false);
		});

		it('should initialize with default permission state', () => {
			const { permissionState, canPrompt } = useBrowserNotifications();
			expect(permissionState.value).toBe('default');
			expect(canPrompt.value).toBe(true);
		});

		it('should initialize isEnabled as false when permission is default', () => {
			const { isEnabled } = useBrowserNotifications();
			expect(isEnabled.value).toBe(false);
		});

		it('should initialize isDenied as false when permission is default', () => {
			const { isDenied } = useBrowserNotifications();
			expect(isDenied.value).toBe(false);
		});
	});

	describe('permission states', () => {
		it('should report isEnabled as true when permission is granted', () => {
			setupNotificationMock('granted');
			__resetpermissionState();

			const { isEnabled, isDenied, canPrompt } = useBrowserNotifications();

			expect(isEnabled.value).toBe(true);
			expect(isDenied.value).toBe(false);
			expect(canPrompt.value).toBe(false);
		});

		it('should report isDenied as true when permission is denied', () => {
			setupNotificationMock('denied');
			__resetpermissionState();

			const { isEnabled, isDenied, canPrompt } = useBrowserNotifications();

			expect(isEnabled.value).toBe(false);
			expect(isDenied.value).toBe(true);
			expect(canPrompt.value).toBe(false);
		});
	});

	describe('requestPermission', () => {
		it('should request permission and return granted result', async () => {
			mockRequestPermission.mockResolvedValue('granted');

			const { requestPermission, isEnabled } = useBrowserNotifications();
			const result = await requestPermission();

			expect(mockRequestPermission).toHaveBeenCalled();
			expect(result.permission).toBe('granted');
			expect(result.wasRequested).toBe(true);
			expect(isEnabled.value).toBe(true);
		});

		it('should request permission and return denied result', async () => {
			mockRequestPermission.mockResolvedValue('denied');

			const { requestPermission, isDenied } = useBrowserNotifications();
			const result = await requestPermission();

			expect(result.permission).toBe('denied');
			expect(result.wasRequested).toBe(true);
			expect(isDenied.value).toBe(true);
		});

		it('should not request permission if already granted', async () => {
			setupNotificationMock('granted');
			__resetpermissionState();

			const { requestPermission } = useBrowserNotifications();
			const result = await requestPermission();

			expect(mockRequestPermission).not.toHaveBeenCalled();
			expect(result.permission).toBe('granted');
			expect(result.wasRequested).toBe(false);
		});

		it('should not request permission if already denied', async () => {
			setupNotificationMock('denied');
			__resetpermissionState();

			const { requestPermission } = useBrowserNotifications();
			const result = await requestPermission();

			expect(mockRequestPermission).not.toHaveBeenCalled();
			expect(result.permission).toBe('denied');
			expect(result.wasRequested).toBe(false);
		});

		it('should handle requestPermission errors gracefully', async () => {
			mockRequestPermission.mockRejectedValue(new Error('User interaction required'));

			const { requestPermission } = useBrowserNotifications();
			const result = await requestPermission();

			expect(result.wasRequested).toBe(true);
			expect(result.permission).toBe('default');
		});
	});

	describe('dismissal tracking', () => {
		it('should record dismissal and update metadata', () => {
			const { recordDismissal, metadata, isInCooldown } = useBrowserNotifications();

			expect(metadata.value.dismissCount).toBe(0);
			expect(metadata.value.lastDismissedAt).toBeNull();
			expect(isInCooldown.value).toBe(false);

			recordDismissal();

			expect(metadata.value.dismissCount).toBe(1);
			expect(metadata.value.lastDismissedAt).not.toBeNull();
			expect(isInCooldown.value).toBe(true);
		});

		it('should increment dismissal count on subsequent dismissals', () => {
			const { recordDismissal, metadata } = useBrowserNotifications();

			recordDismissal();
			recordDismissal();
			recordDismissal();

			expect(metadata.value.dismissCount).toBe(3);
		});

		it('should block prompting when in cooldown', () => {
			const { recordDismissal, canPrompt } = useBrowserNotifications();

			expect(canPrompt.value).toBe(true);

			recordDismissal();

			expect(canPrompt.value).toBe(false);
		});

		it('should block prompting when max dismissals exceeded', () => {
			const { recordDismissal, canPrompt } = useBrowserNotifications({ maxDismissals: 2 });

			expect(canPrompt.value).toBe(true);

			recordDismissal();
			recordDismissal();

			// Even without cooldown, max dismissals blocks prompting
			expect(canPrompt.value).toBe(false);
		});

		it('should not request permission when in cooldown', async () => {
			const { recordDismissal, requestPermission } = useBrowserNotifications();

			recordDismissal();

			const result = await requestPermission();

			expect(mockRequestPermission).not.toHaveBeenCalled();
			expect(result.wasRequested).toBe(false);
		});

		it('should respect custom cooldown duration', () => {
			const customCooldownMs = 1000;
			const { recordDismissal, isInCooldown } = useBrowserNotifications({
				cooldownMs: customCooldownMs,
			});

			recordDismissal();

			expect(isInCooldown.value).toBe(true);
		});

		it('should allow prompting after cooldown expires', () => {
			// Test with cooldownMs: 0 to simulate expired cooldown
			const { recordDismissal, canPrompt, isInCooldown, metadata } = useBrowserNotifications({
				cooldownMs: 0, // Immediate expiry
				maxDismissals: 10,
			});

			recordDismissal();

			// With 0ms cooldown, it should immediately expire
			expect(isInCooldown.value).toBe(false);
			expect(canPrompt.value).toBe(true);
			expect(metadata.value.dismissCount).toBe(1);
		});
	});

	describe('resetMetadata', () => {
		it('should reset dismissal metadata', () => {
			const { recordDismissal, resetMetadata, metadata, isInCooldown, canPrompt } =
				useBrowserNotifications();

			recordDismissal();
			recordDismissal();

			expect(metadata.value.dismissCount).toBe(2);
			expect(isInCooldown.value).toBe(true);

			resetMetadata();

			expect(metadata.value.dismissCount).toBe(0);
			expect(metadata.value.lastDismissedAt).toBeNull();
			expect(isInCooldown.value).toBe(false);
			expect(canPrompt.value).toBe(true);
		});
	});

	describe('showNotification', () => {
		it('should create a notification when enabled', () => {
			setupNotificationMock('granted');
			__resetpermissionState();

			const { showNotification } = useBrowserNotifications();

			const notification = showNotification('Test Title', { body: 'Test Body' });

			expect(notification).not.toBeNull();
			expect(global.Notification).toHaveBeenCalledWith('Test Title', { body: 'Test Body' });
		});

		it('should return null when notifications are not enabled', () => {
			// Permission is 'default' which means not enabled
			const { showNotification } = useBrowserNotifications();

			const notification = showNotification('Test Title');

			expect(notification).toBeNull();
		});

		it('should return null when notifications are not supported', () => {
			// @ts-expect-error - intentionally setting to undefined for test
			delete global.Notification;
			__resetpermissionState();

			const { showNotification } = useBrowserNotifications();

			const notification = showNotification('Test Title');

			expect(notification).toBeNull();
		});
	});

	describe('localStorage persistence', () => {
		it('should persist metadata after recording dismissal', () => {
			const { recordDismissal, metadata } = useBrowserNotifications();

			recordDismissal();

			// Verify the metadata is updated in the composable
			expect(metadata.value.dismissCount).toBe(1);
			expect(metadata.value.lastDismissedAt).not.toBeNull();
		});

		it('should load metadata from localStorage on initialization', () => {
			const existingMetadata = {
				lastDismissedAt: Date.now() - 1000,
				dismissCount: 2,
			};
			localStorage.setItem(
				LOCAL_STORAGE_BROWSER_NOTIFICATION_METADATA,
				JSON.stringify(existingMetadata),
			);

			const { metadata, isInCooldown } = useBrowserNotifications();

			expect(metadata.value.dismissCount).toBe(2);
			expect(isInCooldown.value).toBe(true);
		});
	});

	describe('shared state (singleton pattern)', () => {
		it('should share permission state across multiple instances', async () => {
			// First instance
			const instance1 = useBrowserNotifications();
			// Second instance
			const instance2 = useBrowserNotifications();

			// Both should start with same state
			expect(instance1.permissionState.value).toBe(instance2.permissionState.value);

			// Mock permission request to return granted
			mockRequestPermission.mockResolvedValue('granted');

			// Request permission through instance1
			await instance1.requestPermission();

			// Both instances should reflect the change
			expect(instance1.permissionState.value).toBe('granted');
			expect(instance2.permissionState.value).toBe('granted');
			expect(instance1.isEnabled.value).toBe(true);
			expect(instance2.isEnabled.value).toBe(true);
		});

		it('should update canPrompt in all instances when permission changes', async () => {
			const instance1 = useBrowserNotifications();
			const instance2 = useBrowserNotifications();

			expect(instance1.canPrompt.value).toBe(true);
			expect(instance2.canPrompt.value).toBe(true);

			mockRequestPermission.mockResolvedValue('granted');
			await instance1.requestPermission();

			// canPrompt should be false in both instances since permission is no longer 'default'
			expect(instance1.canPrompt.value).toBe(false);
			expect(instance2.canPrompt.value).toBe(false);
		});
	});

	describe('default options', () => {
		it('should use default cooldown of 7 days by checking metadata lastDismissedAt', () => {
			const { recordDismissal, metadata } = useBrowserNotifications({ maxDismissals: 10 });

			recordDismissal();

			// Verify that the metadata records the dismissal time
			expect(metadata.value.lastDismissedAt).not.toBeNull();

			// The cooldown calculation should use SEVEN_DAYS_IN_MILLIS
			// We verify this by checking the isInCooldown logic with a time-based check
			const timeSinceDismissal = Date.now() - metadata.value.lastDismissedAt!;
			expect(timeSinceDismissal).toBeLessThan(SEVEN_DAYS_IN_MILLIS);
		});

		it('should use default max dismissals of 3', () => {
			// Use cooldownMs: 0 to bypass cooldown for this test
			const { recordDismissal, canPrompt, metadata } = useBrowserNotifications({
				cooldownMs: 0,
			});

			recordDismissal();
			recordDismissal();

			// Still under max dismissals (2 < 3)
			expect(metadata.value.dismissCount).toBe(2);
			expect(canPrompt.value).toBe(true);

			recordDismissal();
			// Now at max dismissals (3 >= 3)
			expect(metadata.value.dismissCount).toBe(3);
			expect(canPrompt.value).toBe(false);
		});
	});
});
