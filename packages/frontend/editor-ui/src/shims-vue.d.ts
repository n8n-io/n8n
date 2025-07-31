import 'vue-router';
import type { I18nClass } from '@n8n/i18n';
import type { Route, Router, RouteLocation } from 'vue-router';
import type { Telemetry } from '@/plugins/telemetry';
import type { VIEWS } from '@/constants';
import type { IPermissions } from '@/Interface';
import type { MiddlewareOptions, RouterMiddlewareType } from '@/types/router';

export {};

/**
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
	}
}
