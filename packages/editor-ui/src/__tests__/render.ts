import type { Plugin } from 'vue';
import { render } from '@testing-library/vue';
import { i18nInstance, I18nPlugin } from '@/plugins/i18n';
import { GlobalComponentsPlugin } from '@/plugins/components';
import { GlobalDirectivesPlugin } from '@/plugins/directives';
import { FontAwesomePlugin } from '@/plugins/icons';
import type { Pinia } from 'pinia';
import { PiniaVuePlugin } from 'pinia';
import type { Telemetry } from '@/plugins/telemetry';
import vueJsonPretty from 'vue-json-pretty';
import { merge } from 'lodash-es';
import type { TestingPinia } from '@pinia/testing';

export type RenderComponent = Parameters<typeof render>[0];
export type RenderOptions = Parameters<typeof render>[1] & {
	pinia?: TestingPinia | Pinia;
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
			'router-link': true,
			'vue-json-pretty': vueJsonPretty,
		},
		plugins: [
			I18nPlugin,
			i18nInstance,
			PiniaVuePlugin,
			FontAwesomePlugin,
			GlobalComponentsPlugin,
			GlobalDirectivesPlugin,
			TelemetryPlugin,
		],
	},
};

export function renderComponent(component: RenderComponent, options: RenderOptions = {}) {
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
	});
}

export function createComponentRenderer(
	component: RenderComponent,
	defaultOptions: RenderOptions = {},
) {
	return (options: RenderOptions = {}, rendererOptions: { merge?: boolean } = {}) =>
		renderComponent(
			component,
			rendererOptions.merge
				? merge(defaultOptions, options)
				: {
						...defaultOptions,
						...options,
						props: {
							...defaultOptions.props,
							...options.props,
						},
						global: {
							...defaultOptions.global,
							...options.global,
						},
					},
		);
}
