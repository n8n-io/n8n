/// <reference types="vite-plugin-comlink/client" />

import type { VNode, ComponentPublicInstance } from 'vue';
import type { PartialDeep } from 'type-fest';
import type { ExternalHooks } from '@/types/externalHooks';
import type { FrontendSettings } from '@n8n/api-types';

export {};

declare global {
	interface ImportMeta {
		env: {
			DEV: boolean;
			PROD: boolean;
			NODE_ENV: 'development' | 'production';
			VUE_APP_URL_BASE_API: string;
			VUE_SCAN: boolean;
		};
	}

	interface Window {
		BASE_PATH: string;
		REST_ENDPOINT: string;
		sentry?: { dsn?: string; environment: string; release: string; serverName?: string };
		n8nExternalHooks?: PartialDeep<ExternalHooks>;
		preventNodeViewBeforeUnload?: boolean;
		maxPinnedDataSize?: number;
	}

	namespace JSX {
		interface Element extends VNode {}
		interface ElementClass extends ComponentPublicInstance {}
		interface IntrinsicElements {
			[elem: string]: any;
		}
	}

	interface Array<T> {
		findLast(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T;
	}
}
