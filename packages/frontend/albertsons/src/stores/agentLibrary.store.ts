import { defineStore } from 'pinia';
import { albertsonsRestApiRequest } from '@src/utils/albertsonsRestApiRequest';

export const useAgentLibraryStore = defineStore('albertsonsAgentLibrary', {
	state: () => ({
		agents: [] as Array<any>,
	}),

	actions: {
		async fetchAgents() {
			// IMPORTANT: await the request and log it
			const result = await albertsonsRestApiRequest('GET', '/v1/agent-library/all');

			console.log('agent-library/all result', result);

			// If backend returns { status, data }, match that shape
			if (result && Array.isArray(result.data)) {
				this.agents = result.data;
			} else if (Array.isArray(result)) {
				// or if it returns a plain array like templates
				this.agents = result;
			} else {
				this.agents = [];
			}
		},

		getAgents() {
			return this.agents;
		},
	},
});
