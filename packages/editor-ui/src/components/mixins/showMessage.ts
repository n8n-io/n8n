import Vue from 'vue';

import { Notification } from 'element-ui';
import { ElNotificationOptions } from 'element-ui/types/notification';

// export const showMessage = {
export const showMessage = Vue.extend({
	methods: {
		$showMessage (messageData: ElNotificationOptions) {
			messageData.dangerouslyUseHTMLString = true;
			if (messageData.position === undefined) {
				messageData.position = 'bottom-right';
			}

			return Notification(messageData);
		},
		$showError (error: Error, title: string, message: string) {
			this.$showMessage({
				title,
				message: `${message}<br /><i>${error.message}</i>`,
				type: 'error',
				duration: 0,
			});
		},
	},
});
