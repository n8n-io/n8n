import Vue, { VNode } from 'vue';
import type { Store } from 'pinia';
import type { IDataObject } from 'n8n-workflow';

declare module 'markdown-it-link-attributes';
declare module 'markdown-it-emoji';
declare module 'markdown-it-task-lists';

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
		n8nExternalHooks?: Record<
			string,
			Record<string, Array<(store: Store, metadata?: IDataObject) => Promise<void>>>
		>;
	}

	namespace JSX {
		interface Element extends VNode {}
		interface ElementClass extends Vue {}
		interface IntrinsicElements {
			[elem: string]: any;
		}
	}

	interface Array<T> {
		findLast(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T;
	}
}
