import type { I18nClass } from '@/plugins/i18n';
import type { Route } from 'vue-router';
import type { Telemetry } from '@/plugins/telemetry';

declare module 'vue' {
	interface ComponentCustomOptions {
		beforeRouteEnter?(to: Route, from: Route, next: () => void): void;
		beforeRouteLeave?(to: Route, from: Route, next: () => void): void;
		beforeRouteUpdate?(to: Route, from: Route, next: () => void): void;
	}

	interface ComponentCustomProperties {
		$style: Record<string, string>;
		$locale: I18nClass;
		$telemetry: Telemetry;
	}
}

/**
 * @docs https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties
 */
export {};
