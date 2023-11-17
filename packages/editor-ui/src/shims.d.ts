import { VNode, ComponentPublicInstance } from 'vue';
import { PartialDeep } from 'type-fest';
import { ExternalHooks } from '@/types/externalHooks';

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
			VUE_APP_MAX_PINNED_DATA_SIZE: string;
		};
	}

	interface Window {
		BASE_PATH: string;
		REST_ENDPOINT: string;
		n8nExternalHooks?: PartialDeep<ExternalHooks>;
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
