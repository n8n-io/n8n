import { ElNotification as Notification } from 'element-plus';
import type { NotificationHandle, MessageBoxState } from 'element-plus';
import type { NotificationOptions } from '@/Interface';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from './useI18n';
import { useExternalHooks } from './useExternalHooks';
import { VIEWS } from '@/constants';

export interface NotificationErrorWithNodeAndDescription extends Error {
	node: {
		name: string;
	};
	description: string;
}

const messageDefaults: Partial<Omit<NotificationOptions, 'message'>> = {
	dangerouslyUseHTMLString: true,
	position: 'bottom-right',
};

const stickyNotificationQueue: NotificationHandle[] = [];

export function useToast() {
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const externalHooks = useExternalHooks();
	const i18n = useI18n();

	function showMessage(messageData: Partial<NotificationOptions>, track = true) {
		messageData = { ...messageDefaults, ...messageData };

		Object.defineProperty(messageData, 'message', {
			value:
				typeof messageData.message === 'string'
					? sanitizeHtml(messageData.message)
					: messageData.message,
			writable: true,
			enumerable: true,
		});

		const notification = Notification(messageData);

		if (messageData.duration === 0) {
			stickyNotificationQueue.push(notification);
		}

		if (messageData.type === 'error' && track) {
			telemetry.track('Instance FE emitted error', {
				error_title: messageData.title,
				error_message: messageData.message,
				caused_by_credential: causedByCredential(messageData.message as string),
				workflow_id: workflowsStore.workflowId,
			});
		}

		return notification;
	}

	function showToast(config: {
		title: string;
		message: NotificationOptions['message'];
		onClick?: () => void;
		onClose?: () => void;
		duration?: number;
		customClass?: string;
		closeOnClick?: boolean;
		type?: MessageBoxState['type'];
		dangerouslyUseHTMLString?: boolean;
	}) {
		// eslint-disable-next-line prefer-const
		let notification: NotificationHandle;
		if (config.closeOnClick) {
			const cb = config.onClick;
			config.onClick = () => {
				if (notification) {
					notification.close();
				}

				if (cb) {
					cb();
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
			dangerouslyUseHTMLString: config.dangerouslyUseHTMLString ?? true,
		});

		return notification;
	}

	function collapsableDetails({ description, node }: NotificationErrorWithNodeAndDescription) {
		if (!description) return '';

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
					<p>${node.name}: ${errorDescription}</p>
				</details>
			`;
	}

	function showError(e: Error | unknown, title: string, message?: string) {
		const error = e as NotificationErrorWithNodeAndDescription;
		const messageLine = message ? `${message}<br/>` : '';
		showMessage(
			{
				title,
				message: `
					${messageLine}
					<i>${error.message}</i>
					${collapsableDetails(error)}`,
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
			workflow_id: workflowsStore.workflowId,
		});
	}

	function showAlert(config: NotificationOptions): NotificationHandle {
		return Notification(config);
	}

	function causedByCredential(message: string | undefined) {
		if (!message) return false;

		return message.includes('Credentials for') && message.includes('are not set');
	}

	function clearAllStickyNotifications() {
		stickyNotificationQueue.forEach((notification) => {
			if (notification) {
				notification.close();
			}
		});

		stickyNotificationQueue.length = 0;
	}

	// Pick up and display notifications for the given list of views
	function showNotificationForViews(views: VIEWS[]) {
		const notifications: NotificationOptions[] = [];
		views.forEach((view) => {
			notifications.push(...(uiStore.pendingNotificationsForViews[view] ?? []));
		});
		if (notifications.length) {
			notifications.forEach(async (notification) => {
				// Notifications show on top of each other without this timeout
				setTimeout(() => {
					showMessage(notification);
				}, 5);
			});
			// Clear the queue once all notifications are shown
			uiStore.setNotificationsForView(VIEWS.WORKFLOW, []);
		}
	}

	return {
		showMessage,
		showToast,
		showError,
		showAlert,
		clearAllStickyNotifications,
		showNotificationForViews,
	};
}
