import { VIEWS } from '@n8n/frontend-constants/views';
import { APP_Z_INDEXES } from '@n8n/frontend-constants/z-indexes';
import { sanitizeHtml } from '@n8n/frontend-utils/htmlUtils';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import type { NotificationOptions, NotificationType } from './types/notification';
import { useExternalHooks } from './useExternalHooks';
import { useTelemetry } from './useTelemetry';

export type {
	NotificationOptions,
	NotificationPosition,
	NotificationType,
} from './types/notification';

/**
 * Handle returned by the notification function. Declared locally so the DTS
 * build stays free of the full element-plus type graph.
 */
export interface NotificationHandle {
	close: () => void;
}

/**
 * Notification function contract — the app's wrapper around `ElNotification`.
 * Registered at bootstrap via {@link setNotify}; this package owns only the
 * contract.
 *
 * Returning `undefined` means the app declined to show this notification — today
 * that is notification suppression, which lives at the registration site rather
 * than here. `showMessage` treats it as "dropped": no sticky-queue
 * entry, no error telemetry, and a no-op handle to the caller.
 */
type NotifyFn = (options: Record<string, unknown>) => NotificationHandle | undefined;

let registeredNotify: NotifyFn | undefined;

/**
 * Register the notification function. Called once at bootstrap by
 * `editor-ui` (passing a suppression-aware wrapper around `ElNotification`) so
 * `useToast` can issue notifications without importing element-plus directly —
 * keeping the DTS build lightweight.
 *
 * This is the *only* toast dependency the app registers. Whether a notification
 * is actually shown is the notifier's decision, so if you are chasing a toast
 * that never appeared, look at the registration site, not here.
 */
export function setNotify(fn: NotifyFn): void {
	registeredNotify = fn;
}

const noopHandle: NotificationHandle = { close() {} };
const noopNotify: NotifyFn = () => noopHandle;

let warnedAboutMissingNotify = false;

function resolveNotify(): NotifyFn {
	if (registeredNotify) return registeredNotify;

	// Falling back means bootstrap never registered. The toast is dropped rather
	// than shown, so warn once in dev instead of failing silent.
	if (import.meta.env.DEV && !warnedAboutMissingNotify) {
		warnedAboutMissingNotify = true;
		console.warn(
			'[useToast] No notification function registered; toasts will not render. Call setNotify() at app bootstrap.',
		);
	}
	return noopNotify;
}

const stickyNotificationQueue: NotificationHandle[] = [];

export function useToast() {
	const telemetry = useTelemetry();
	const route = useRoute();
	const workflowId = computed(() => {
		if (route?.name === VIEWS.DEMO || route?.name === VIEWS.DEMO_DIFF) return 'demo';
		const id = route?.params?.workflowId;
		return (Array.isArray(id) ? id[0] : id) ?? '';
	});
	const externalHooks = useExternalHooks();
	const i18n = useI18n();

	function causedByCredential(message: string | undefined) {
		if (!message || typeof message !== 'string') return false;

		return message.includes('Credentials for') && message.includes('are not set');
	}

	function showMessage(messageData: Partial<NotificationOptions>, track = true) {
		// Resolved per call, not once per `useToast()`: a composable captured before
		// bootstrap registers would otherwise stay bound to the no-op for its whole
		// lifetime, silently dropping toasts.
		const notify = resolveNotify();

		const messageDefaults: Partial<Omit<NotificationOptions, 'message'>> = {
			dangerouslyUseHTMLString: true,
			position: 'bottom-right',
			// Layer above NDV and modal overlays, sourced from the shared scale.
			zIndex: APP_Z_INDEXES.TOASTS,
			appendTo: '#n8n-app',
			customClass: 'content-toast',
		};
		const { message, title } = messageData;
		const params = { ...messageDefaults, ...messageData };

		if (typeof message === 'string') {
			params.message = sanitizeHtml(message);
		}

		if (typeof title === 'string') {
			params.title = sanitizeHtml(title);
		}

		const notification = notify(params as unknown as Record<string, unknown>);

		// The app declined to show it (suppression). Return before the sticky queue
		// and before error telemetry, so a dropped toast leaves no trace — exactly
		// what the removed in-package suppression branch did.
		if (!notification) return noopHandle;

		if (params.duration === 0) {
			stickyNotificationQueue.push(notification);
		}

		if (params.type === 'error' && track) {
			// Extract string message for telemetry - don't send VNode objects as they have circular refs
			let messageForTelemetry: string;
			if (typeof params.message === 'string') {
				messageForTelemetry = params.message;
			} else if (
				params.message &&
				typeof params.message === 'object' &&
				'props' in params.message &&
				params.message.props
			) {
				// Extract error message from VNode props (e.g., NodeExecutionErrorMessage component)
				const props = params.message.props;
				const hasErrorMessage =
					typeof props === 'object' && props !== null && 'errorMessage' in props;
				const hasMessage = typeof props === 'object' && props !== null && 'message' in props;

				if (hasErrorMessage) {
					messageForTelemetry = String(props.errorMessage);
				} else if (hasMessage) {
					messageForTelemetry = String(props.message);
				} else {
					messageForTelemetry = 'Unknown error';
				}
			} else {
				messageForTelemetry = 'Unknown error';
			}

			telemetry.track('Instance FE emitted error', {
				error_title: params.title,
				error_message: messageForTelemetry,
				caused_by_credential: causedByCredential(messageForTelemetry),
				workflow_id: workflowId.value,
			});
		}

		return notification;
	}

	function showToast(config: {
		title: string;
		message: NotificationOptions['message'];
		onClick?: (event?: MouseEvent) => void;
		onClose?: () => void;
		duration?: number;
		customClass?: string;
		closeOnClick?: boolean;
		type?: NotificationType;
	}) {
		// eslint-disable-next-line prefer-const
		let notification: NotificationHandle;
		if (config.closeOnClick) {
			const originalOnClick = config.onClick;
			config.onClick = () => {
				if (notification) {
					notification.close();
				}

				if (originalOnClick) {
					originalOnClick();
				}
			};
		}

		notification = showMessage({
			title: config.title,
			message: config.message,
			onClick: config.onClick,
			onClose: config.onClose,
			duration: config.duration,
			customClass: config.customClass,
			type: config.type,
		});

		return notification;
	}

	function collapsableDetails(description: string) {
		const errorDescription =
			description.length > 500 ? `${description.slice(0, 500)}...` : description;

		return `
				<br>
				<br>
				<details>
					<summary
						style="color: #ff6d5a; font-weight: bold; cursor: pointer;"
					>
						${i18n.baseText('showMessage.showDetails')}
					</summary>
					<p>${errorDescription}</p>
				</details>
			`;
	}

	function showError(
		e: unknown,
		title: string,
		options?: { message?: string; description?: string },
	) {
		const error = e as Error & { description?: string };
		const message = options?.message;
		const description = options?.description ?? error.description;
		const messageLine = message ? `${message}<br/>` : '';
		showMessage(
			{
				title,
				message: `
					${messageLine}
					<i>${error.message}</i>
					${description ? collapsableDetails(description) : ''}`,
				type: 'error',
				duration: 0,
			},
			false,
		);

		void externalHooks.run('showMessage.showError', {
			title,
			message,
			errorMessage: error.message,
		});

		telemetry.track('Instance FE emitted error', {
			error_title: title,
			error_description: message,
			error_message: error.message,
			caused_by_credential: causedByCredential(error.message),
			workflow_id: workflowId.value,
		});
	}

	function clearAllStickyNotifications() {
		stickyNotificationQueue.forEach((notification) => {
			if (notification) {
				notification.close();
			}
		});

		stickyNotificationQueue.length = 0;
	}

	return {
		showMessage,
		showToast,
		showError,
		clearAllStickyNotifications,
	};
}
