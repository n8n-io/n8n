/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />

import 'vue-router';
import type { VNode, ComponentPublicInstance } from 'vue';
import type { PartialDeep } from 'type-fest';
import type { ExternalHooks } from '@/app/types/externalHooks';
import type { FrontendSettings } from '@n8n/api-types';
import type { Plugin as PrettierPlugin } from 'prettier';
import type { I18nClass } from '@n8n/i18n';
import type { Route, Router, RouteLocation } from 'vue-router';
import type { Telemetry } from '@/app/plugins/telemetry';
import type { VIEWS } from '@/app/constants';
import type { IPermissions } from '@/Interface';
import type { MiddlewareOptions, RouterMiddlewareType } from '@/app/types/router';

/**
 * File types
 */

declare module '*.json';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';

declare module '*?raw' {
	const content: string;
	export default content;
}

/**
 * Global
 */

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

export {};

/**
 * Vue Runtime
 * @docs https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties
 */

declare module '@vue/runtime-core' {
	interface ComponentCustomOptions {
		beforeRouteEnter?(to: Route, from: Route, next: () => void): void;
		beforeRouteLeave?(to: Route, from: Route, next: () => void): void;
		beforeRouteUpdate?(to: Route, from: Route, next: () => void): void;
	}

	interface ComponentCustomProperties {
		$style: Record<string, string>;
		$telemetry: Telemetry;
		$route: RouteLocation;
		$router: Router;
	}
}

/**
 * Vue Router
 * @docs https://router.vuejs.org/guide/advanced/meta
 */

declare module 'vue-router' {
	interface RouteMeta {
		nodeView?: boolean;
		templatesEnabled?: boolean;
		getRedirect?:
			| (() => { name: string } | false)
			| ((defaultRedirect: VIEWS[keyof VIEWS]) => { name: string } | false);
		permissions?: IPermissions;
		middleware?: RouterMiddlewareType[];
		middlewareOptions?: Partial<MiddlewareOptions>;
		telemetry?: {
			disabled?: true;
			pageCategory?: string;
			getProperties?: (route: RouteLocation) => Record<string, unknown>;
		};
		scrollOffset?: number;
		setScrollPosition?: (position: number) => void;
		readOnlyCanvas?: boolean;
		layout?: 'default' | 'auth' | 'workflow' | 'settings' | 'demo' | 'chat';
		layoutProps?: Record<string, unknown>;
	}
}
