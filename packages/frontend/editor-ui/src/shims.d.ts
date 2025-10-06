/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />

import type { VNode, ComponentPublicInstance } from 'vue';
import type { PartialDeep } from 'type-fest';
import type { ExternalHooks } from '@/types/externalHooks';
import type { FrontendSettings } from '@n8n/api-types';
import type { Plugin as PrettierPlugin } from 'prettier';

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

declare module 'prettier/plugins/estree' {
	const plugin: PrettierPlugin;
	export = plugin;
	export default plugin;
}
