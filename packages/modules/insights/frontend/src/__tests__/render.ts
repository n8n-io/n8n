import { N8nPlugin } from '@n8n/design-system';
import { i18nInstance } from '@n8n/i18n';
import type { TestingPinia } from '@pinia/testing';
import { render, type RenderOptions as TestingLibraryRenderOptions } from '@testing-library/vue';
import merge from 'lodash/merge';
import { PiniaVuePlugin, type Pinia } from 'pinia';
import type { Plugin } from 'vue';

/**
 * This module's render harness.
 *
 * It is not the shell's `@/__tests__/render`: that one also provides the workflow
 * document store and installs the touch-events directive, both of which belong to
 * the editor core and neither of which any insights component reads. The shared
 * harness (`@n8n/vitest-config/setup/frontend`) cannot host this one — it must not
 * import vue, pinia or i18n, or the turbo graph gains a cycle.
 */
export type RenderOptions<T> = Omit<TestingLibraryRenderOptions<T>, 'props'> & {
	pinia?: TestingPinia | Pinia;
	props?: Partial<TestingLibraryRenderOptions<T>['props']>;
};

const TelemetryPlugin: Plugin = {
	install(app) {
		app.config.globalProperties.$telemetry = { track() {} };
	},
};

const defaultOptions = {
	global: {
		stubs: {
			RouterLink: {
				template: '<a><slot /></a>',
			},
		},
		plugins: [i18nInstance, PiniaVuePlugin, N8nPlugin, TelemetryPlugin],
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
