/// <reference types="vite/client" />

export {};

declare global {
	interface ImportMeta {
		env: {
			VUE_APP_URL_BASE_API: string;
		};
	}

	interface Window {
		BASE_PATH: string;
		REST_ENDPOINT: string;
	}
}
