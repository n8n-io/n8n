import { defineStore } from 'pinia';
import { albertsonsRestApiRequest } from '@src/utils/albertsonsRestApiRequest';

export const useUserAgentMappingsStore = defineStore('albertsonsUserAgentMappings', {
	state: () => ({
		userAgentMappings: [] as Array<any>,
	}),

	actions: {
		async fetchUserAgentMappings() {
			// IMPORTANT: await the request and log it
			const result = await albertsonsRestApiRequest('GET', '/v1/userAgentMappings/all');

			console.log('userAgentMappings/all result', result);

			// If backend returns { status, data }, match that shape
			if (result) {
				this.userAgentMappings = result;
			} else {
				this.userAgentMappings = [];
			}
		},

		getUserAgentMappings() {
			return this.userAgentMappings;
		},
	},
});
