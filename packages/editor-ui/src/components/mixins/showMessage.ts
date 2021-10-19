// @ts-ignore
import { ElNotificationComponent, ElNotificationOptions } from 'element-ui/types/notification';
import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/components/mixins/externalHooks';
import { ExecutionError } from 'n8n-workflow';
import { ElMessageBoxOptions } from 'element-ui/types/message-box';
import { MessageType } from 'element-ui/types/message';
import { isChildOf } from './helpers';

let stickyNotificationQueue: ElNotificationComponent[] = [];

export const showMessage = mixins(externalHooks).extend({
	methods: {
		$showMessage(messageData: ElNotificationOptions, track = true) {
			messageData.dangerouslyUseHTMLString = true;
			if (messageData.position === undefined) {
				messageData.position = 'bottom-right';
			}

			const notification = this.$notify(messageData);

			if (messageData.duration === 0) {
				stickyNotificationQueue.push(notification);
			}

			if(messageData.type === 'error' && track) {
				this.$telemetry.track('Instance FE emitted error', { error_title: messageData.title, error_message: messageData.message, workflow_id: this.$store.getters.workflowId });
			}

			return notification;
		},

		$showToast(config: {
				title: string,
				message: string,
				onClick?: () => void,
				onClose?: () => void,
				duration?: number,
				customClass?: string,
				closeOnClick?: boolean,
				onLinkClick?: (e: HTMLLinkElement) => void,
				type?: MessageType,
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

			if (config.onLinkClick) {
				const onLinkClick = (e: MouseEvent) => {
					if (e && e.target && config.onLinkClick && isChildOf(notification.$el, e.target as Element)) {
						const target = e.target as HTMLElement;
						if (target && target.tagName === 'A') {
							config.onLinkClick(e.target as HTMLLinkElement);
						}
					}
				};
				window.addEventListener('click', onLinkClick);

				const cb = config.onClose;
				config.onClose = () => {
					window.removeEventListener('click', onLinkClick);
					if (cb) {
						cb();
					}
				};
			}

			notification = this.$showMessage({
				title: config.title,
				message: config.message,
				onClick: config.onClick,
				onClose: config.onClose,
				duration: config.duration,
				customClass: config.customClass,
				type: config.type,
			});

			return notification;
		},

		$getExecutionError(error?: ExecutionError) {
			// There was a problem with executing the workflow
			let errorMessage = 'There was a problem executing the workflow!';

			if (error && error.message) {
				let nodeName: string | undefined;
				if (error.node) {
					nodeName = typeof error.node === 'string'
						? error.node
						: error.node.name;
				}

				const receivedError = nodeName
					? `${nodeName}: ${error.message}`
					: error.message;
				errorMessage = `There was a problem executing the workflow:<br /><strong>"${receivedError}"</strong>`;
			}

			return errorMessage;
		},

		$showError(error: Error, title: string, message?: string) {
			const messageLine = message ? `${message}<br/>` : '';
			this.$showMessage({
				title,
				message: `
					${messageLine}
					<i>${error.message}</i>
					${this.collapsableDetails(error)}`,
				type: 'error',
				duration: 0,
			}, false);

			this.$externalHooks().run('showMessage.showError', {
				title,
				message,
				errorMessage: error.message,
			});
			this.$telemetry.track('Instance FE emitted error', { error_title: title, error_description: message, error_message: error.message, workflow_id: this.$store.getters.workflowId });
		},

		async confirmMessage (message: string, headline: string, type: MessageType | null = 'warning', confirmButtonText = 'OK', cancelButtonText = 'Cancel'): Promise<boolean> {
			try {
				const options: ElMessageBoxOptions  = {
					confirmButtonText,
					cancelButtonText,
					dangerouslyUseHTMLString: true,
					...(type && { type }),
				};

				await this.$confirm(message, headline, options);
				return true;
			} catch (e) {
				return false;
			}
		},

		clearAllStickyNotifications() {
			stickyNotificationQueue.map((notification: ElNotificationComponent) => {
				if (notification) {
					notification.close();
				}
			});

			stickyNotificationQueue = [];
		},

		// @ts-ignore
		collapsableDetails({ description, node }: Error) {
			if (!description) return '';

			const errorDescription =
				description.length > 500
					? `${description.slice(0, 500)}...`
					: description;

			return `
				<br>
				<br>
				<details>
					<summary
						style="color: #ff6d5a; font-weight: bold; cursor: pointer;"
					>
						Show Details
					</summary>
					<p>${node.name}: ${errorDescription}</p>
				</details>
			`;
		},
	},
});
