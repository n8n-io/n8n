import { IRestApiContext } from '@/Interface';
import { defineStore } from 'pinia';

// TODO: Use imported interface when done
interface RootState {
	sessionId: string;
	baseUrl: string;
}

export const useRootStore = defineStore('root', {
	state: (): RootState => ({
		sessionId: Math.random().toString(36).substring(2, 15),
		// @ts-ignore
		baseUrl: import.meta.env.VUE_APP_URL_BASE_API ? import.meta.env.VUE_APP_URL_BASE_API : (window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH),
	}),
	getters: {
		getRestApiContext(state): IRestApiContext {
			let endpoint = 'rest';
			if (import.meta.env.VUE_APP_ENDPOINT_REST) {
				endpoint = process.env.VUE_APP_ENDPOINT_REST;
			}
			return {
				baseUrl: `${state.baseUrl}${endpoint}`,
				sessionId: state.sessionId,
			};
		},
	},
	actions: {

	},
});
