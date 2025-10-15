import type { Plugin } from 'vue';
import { render, type RenderOptions as TestingLibraryRenderOptions } from '@testing-library/vue';
import { i18nInstance } from '@n8n/i18n';
import { GlobalDirectivesPlugin } from '@/plugins/directives';
import { N8nPlugin } from '@n8n/design-system';
import type { Pinia } from 'pinia';
import { PiniaVuePlugin } from 'pinia';
import type { Telemetry } from '@/plugins/telemetry';
import vueJsonPretty from 'vue-json-pretty';
import merge from 'lodash/merge';
import type { TestingPinia } from '@pinia/testing';

export type RenderOptions<T> = Omit<TestingLibraryRenderOptions<T>, 'props'> & {
	pinia?: TestingPinia | Pinia;
	props?: Partial<TestingLibraryRenderOptions<T>['props']>;
};

const TelemetryPlugin: Plugin<{}> = {
	install(app) {
		app.config.globalProperties.$telemetry = {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			track(..._: unknown[]) {},
		} as Telemetry;
	},
};

const defaultOptions = {
	global: {
		stubs: {
			RouterLink: {
				template: '<a><slot /></a>',
			},
			VueJsonPretty: vueJsonPretty,
		},
		plugins: [i18nInstance, PiniaVuePlugin, N8nPlugin, GlobalDirectivesPlugin, TelemetryPlugin],
	},
};

export function renderComponent<T>(component: T, options: RenderOptions<T> = {}) {
	const { pinia, ...renderOptions } = options;

	return render(component, {
		...defaultOptions,
		...renderOptions,
		global: {
			...defaultOptions.global,
			...renderOptions.global,
			stubs: { ...defaultOptions.global.stubs, ...(renderOptions.global?.stubs ?? {}) },
			plugins: [
				...defaultOptions.global.plugins,
				...(renderOptions.global?.plugins ?? []),
				...(pinia ? [pinia] : []),
			],
		},
	} as TestingLibraryRenderOptions<T>);
}

export function createComponentRenderer<T>(component: T, defaultOptions: RenderOptions<T> = {}) {
	return (options: RenderOptions<T> = {}, rendererOptions: { merge?: boolean } = {}) =>
		renderComponent(
			component,
			rendererOptions.merge
				? merge(defaultOptions, options)
				: ({
						...defaultOptions,
						...options,
						props: {
							...(defaultOptions.props ?? {}),
							...(options.props ?? {}),
						},
						global: {
							...defaultOptions.global,
							...options.global,
							provide: {
								...defaultOptions.global?.provide,
								...options.global?.provide,
							},
						},
					} as RenderOptions<T>),
		);
}
