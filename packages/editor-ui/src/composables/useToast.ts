import { Notification } from 'element-ui';
import type { ElNotificationComponent, ElNotificationOptions } from 'element-ui/types/notification';
import type { MessageType } from 'element-ui/types/message';
import { sanitizeHtml } from '@/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores';
import { useI18n } from './useI18n';
import { useExternalHooks } from './useExternalHooks';

const messageDefaults: Partial<Omit<ElNotificationOptions, 'message'>> = {
	dangerouslyUseHTMLString: true,
	position: 'bottom-right',
};

const stickyNotificationQueue: ElNotificationComponent[] = [];

export function useToast() {
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const externalHooks = useExternalHooks();
	const { i18n } = useI18n();

	function showMessage(
		messageData: Omit<ElNotificationOptions, 'message'> & { message?: string },
		track = true,
	) {
		messageData = { ...messageDefaults, ...messageData };
		messageData.message = messageData.message
			? sanitizeHtml(messageData.message)
			: messageData.message;

		const notification = Notification(messageData as ElNotificationOptions);

		if (messageData.duration === 0) {
			stickyNotificationQueue.push(notification);
		}

		if (messageData.type === 'error' && track) {
			telemetry.track('Instance FE emitted error', {
				error_title: messageData.title,
				error_message: messageData.message,
				workflow_id: workflowsStore.workflowId,
			});
		}

		return notification;
	}

	function showToast(config: {
		title: string;
		message: string;
		onClick?: () => void;
		onClose?: () => void;
		duration?: number;
		customClass?: string;
		closeOnClick?: boolean;
		type?: MessageType;
	}) {
		// eslint-disable-next-line prefer-const
		let notification: ElNotificationComponent;
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

	function collapsableDetails({ description, node }: Error) {
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
		const error = e as Error;
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

		externalHooks.run('showMessage.showError', {
			title,
			message,
			errorMessage: error.message,
		});

		telemetry.track('Instance FE emitted error', {
			error_title: title,
			error_description: message,
			error_message: error.message,
			workflow_id: workflowsStore.workflowId,
		});
	}

	return {
		showMessage,
		showToast,
		showError,
	};
}
