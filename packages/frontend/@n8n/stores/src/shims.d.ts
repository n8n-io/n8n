/// <reference types="vite/client" />

import type { FrontendSettings } from '@n8n/api-types';

declare global {
	interface ImportMeta {
		env: {
			DEV: boolean;
			PROD: boolean;
			NODE_ENV: 'development' | 'production';
			VUE_APP_URL_BASE_API: string;
		};
	}

	interface Window {
		BASE_PATH: string;
		REST_ENDPOINT: string;
		/** Public settings that the backend embeds in the page. See `EMBEDDED_SETTINGS_GLOBAL`. */
		__n8nSettings?: FrontendSettings;
	}
}
