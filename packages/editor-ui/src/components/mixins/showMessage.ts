// @ts-ignore
import { ElNotificationComponent, ElNotificationOptions } from 'element-ui/types/notification';
import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/components/mixins/externalHooks';
import { ExecutionError } from 'n8n-workflow';

export const showMessage = mixins(externalHooks).extend({
	methods: {
		$showMessage(messageData: ElNotificationOptions) {
			messageData.dangerouslyUseHTMLString = true;
			if (messageData.position === undefined) {
				messageData.position = 'bottom-right';
			}

			return this.$notify(messageData);
		},

		$showWarning(title: string, message: string,  config?: {onClick?: () => void, duration?: number, customClass?: string, closeOnClick?: boolean}) {
			// eslint-disable-next-line prefer-const
			let notification: ElNotificationComponent;
			if (config && config.closeOnClick) {
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
				title,
				message,
				type: 'warning',
				...(config || {}),
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
			});

			this.$externalHooks().run('showMessage.showError', {
				title,
				message,
				errorMessage: error.message,
			});
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
