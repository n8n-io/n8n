import { ElNotification as Notification } from 'element-plus';
import type { NotificationHandle, MessageBoxState } from 'element-plus';
import type { NotificationOptions } from '@/Interface';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@n8n/i18n';
import { useExternalHooks } from './useExternalHooks';
import { VIEWS, VISIBLE_LOGS_VIEWS } from '@/constants';
import type { ApplicationError } from 'n8n-workflow';
import { useStyles } from './useStyles';
import { useSettingsStore } from '@/stores/settings.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useLogsStore } from '@/stores/logs.store';
import { LOGS_PANEL_STATE } from '@/features/logs/logs.constants';

export interface NotificationErrorWithNodeAndDescription extends ApplicationError {
	node: {
		name: string;
	};
	description: string;
}

const stickyNotificationQueue: NotificationHandle[] = [];

export function useToast() {
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const externalHooks = useExternalHooks();
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const { APP_Z_INDEXES } = useStyles();
	const logsStore = useLogsStore();
	const ndvStore = useNDVStore();

	function determineToastOffset() {
		const assistantOffset = settingsStore.isAiAssistantEnabled ? 64 : 0;
		const logsOffset =
			VISIBLE_LOGS_VIEWS.includes(uiStore.currentView as VIEWS) &&
			ndvStore.activeNode === null &&
			logsStore.state !== LOGS_PANEL_STATE.FLOATING
				? logsStore.height
				: 0;

		return assistantOffset + logsOffset;
	}

	function showMessage(messageData: Partial<NotificationOptions>, track = true) {
		const messageDefaults: Partial<Omit<NotificationOptions, 'message'>> = {
			dangerouslyUseHTMLString: true,
			position: 'bottom-right',
			zIndex: APP_Z_INDEXES.TOASTS, // above NDV and modal overlays
			offset: determineToastOffset(),
			appendTo: '#app-grid',
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

		const notification = Notification(params);

		if (params.duration === 0) {
			stickyNotificationQueue.push(notification);
		}

		if (params.type === 'error' && track) {
			telemetry.track('Instance FE emitted error', {
				error_title: params.title,
				error_message: params.message,
				caused_by_credential: causedByCredential(params.message as string),
				workflow_id: workflowsStore.workflowId,
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
		type?: MessageBoxState['type'];
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

	function causedByCredential(message: string | undefined) {
		if (!message || typeof message !== 'string') return false;

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
		clearAllStickyNotifications,
		showNotificationForViews,
		determineToastOffset,
	};
}
