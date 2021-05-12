import Vue from 'vue';

import { Notification } from 'element-ui';
import { ElNotificationOptions } from 'element-ui/types/notification';
import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/components/mixins/externalHooks';


// export const showMessage = {
export const showMessage = mixins(externalHooks).extend({
	methods: {
		$showMessage (messageData: ElNotificationOptions) {
			messageData.dangerouslyUseHTMLString = true;
			if (messageData.position === undefined) {
				messageData.position = 'bottom-right';
			}

			return Notification(messageData);
		},
		$showError (error: Error, title: string, message: string) {

			// @ts-ignore
			if (error.description) {
				error.description = error.description.length > 500 ? `${error.description.slice(0, 500)}...` : error.description;

				// @ts-ignore
				error.description = `
					<br/>
					<br/>
					<details>
						<summary style="color: #ff6d5a; font-weight: bold; cursor: pointer;">Show Details</summary>
						<p>${error.description}</p>
					</details>
					`;
			}

			this.$showMessage({
				title,
				message: `${message}<br /><i>${error.message}</i>${error.description || ''}`,
				type: 'error',
				duration: 0,
			});
			this.$externalHooks().run('showMessage.showError', { title, message, errorMessage: error.message });
		},
	},
});
