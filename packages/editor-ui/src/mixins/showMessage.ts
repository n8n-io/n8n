// @ts-ignore
import type { ElNotificationComponent, ElNotificationOptions } from 'element-ui/types/notification';
import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/mixins/externalHooks';
import type { IExecuteContextData, IRunExecutionData } from 'n8n-workflow';
import type { ElMessageBoxOptions } from 'element-ui/types/message-box';
import type { ElMessageComponent, ElMessageOptions, MessageType } from 'element-ui/types/message';
import { sanitizeHtml } from '@/utils';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';

let stickyNotificationQueue: ElNotificationComponent[] = [];

export const showMessage = mixins(externalHooks).extend({
	computed: {
		...mapStores(useWorkflowsStore),
	},
	methods: {
		$showMessage(
			messageData: Omit<ElNotificationOptions, 'message'> & { message?: string },
			track = true,
		) {
			messageData.dangerouslyUseHTMLString = true;
			messageData.message = messageData.message
				? sanitizeHtml(messageData.message)
				: messageData.message;

			if (messageData.position === undefined) {
				messageData.position = 'bottom-right';
			}

			const notification = this.$notify(messageData as ElNotificationOptions);

			if (messageData.duration === 0) {
				stickyNotificationQueue.push(notification);
			}

			if (messageData.type === 'error' && track) {
				this.$telemetry.track('Instance FE emitted error', {
					error_title: messageData.title,
					error_message: messageData.message,
					caused_by_credential: this.causedByCredential(messageData.message),
					workflow_id: this.workflowsStore.workflowId,
				});
			}

			return notification;
		},

		$showToast(config: {
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

		$showAlert(config: ElMessageOptions): ElMessageComponent {
			return this.$message(config);
		},

		$getExecutionError(data: IRunExecutionData | IExecuteContextData) {
			const error = data.resultData.error;

			let errorMessage: string;

			if (data.resultData.lastNodeExecuted && error) {
				errorMessage = error.message || error.description;
			} else {
				errorMessage = 'There was a problem executing the workflow!';

				if (error && error.message) {
					let nodeName: string | undefined;
					if ('node' in error) {
						nodeName = typeof error.node === 'string' ? error.node : error.node!.name;
					}

					const receivedError = nodeName ? `${nodeName}: ${error.message}` : error.message;
					errorMessage = `There was a problem executing the workflow:<br /><strong>"${receivedError}"</strong>`;
				}
			}

			return errorMessage;
		},

		$showError(e: Error | unknown, title: string, message?: string) {
			const error = e as Error;
			const messageLine = message ? `${message}<br/>` : '';
			this.$showMessage(
				{
					title,
					message: `
					${messageLine}
					<i>${error.message}</i>
					${this.collapsableDetails(error)}`,
					type: 'error',
					duration: 0,
				},
				false,
			);

			this.$externalHooks().run('showMessage.showError', {
				title,
				message,
				errorMessage: error.message,
			});

			this.$telemetry.track('Instance FE emitted error', {
				error_title: title,
				error_description: message,
				error_message: error.message,
				caused_by_credential: this.causedByCredential(error.message),
				workflow_id: this.workflowsStore.workflowId,
			});
		},

		async confirmMessage(
			message: string,
			headline: string,
			type: MessageType | null = 'warning',
			confirmButtonText?: string,
			cancelButtonText?: string,
		): Promise<boolean> {
			try {
				const options: ElMessageBoxOptions = {
					confirmButtonText: confirmButtonText || this.$locale.baseText('showMessage.ok'),
					cancelButtonText: cancelButtonText || this.$locale.baseText('showMessage.cancel'),
					dangerouslyUseHTMLString: true,
					...(type && { type }),
				};

				const sanitizedMessage = sanitizeHtml(message);
				await this.$confirm(sanitizedMessage, headline, options);
				return true;
			} catch (e) {
				return false;
			}
		},

		async confirmModal(
			message: string,
			headline: string,
			type: MessageType | null = 'warning',
			confirmButtonText?: string,
			cancelButtonText?: string,
			showClose = false,
		): Promise<string> {
			try {
				const options: ElMessageBoxOptions = {
					confirmButtonText: confirmButtonText || this.$locale.baseText('showMessage.ok'),
					cancelButtonText: cancelButtonText || this.$locale.baseText('showMessage.cancel'),
					dangerouslyUseHTMLString: true,
					showClose,
					...(type && { type }),
				};

				const sanitizedMessage = sanitizeHtml(message);
				await this.$confirm(sanitizedMessage, headline, options);
				return 'confirmed';
			} catch (e) {
				return e as string;
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
				description.length > 500 ? `${description.slice(0, 500)}...` : description;

			return `
				<br>
				<br>
				<details>
					<summary
						style="color: #ff6d5a; font-weight: bold; cursor: pointer;"
					>
						${this.$locale.baseText('showMessage.showDetails')}
					</summary>
					<p>${node.name}: ${errorDescription}</p>
				</details>
			`;
		},

		/**
		 * Whether a workflow execution error was caused by a credential issue, as reflected by the error message.
		 */
		causedByCredential(message: string | undefined) {
			if (!message) return false;

			return message.includes('Credentials for') && message.includes('are not set');
		},
	},
});
