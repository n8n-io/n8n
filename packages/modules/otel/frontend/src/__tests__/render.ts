import { N8nPlugin } from '@n8n/design-system';
import { i18nInstance } from '@n8n/i18n';
import { render, type RenderOptions as TestingLibraryRenderOptions } from '@testing-library/vue';
import type { Pinia } from 'pinia';
import { PiniaVuePlugin } from 'pinia';

/**
 * The shell's `@/__tests__/render` cannot come with the module: it provides the
 * workflow-document store and installs shell-only plugins. This module renders one
 * settings view built from design-system components, so it needs the design-system
 * directives, i18n and a pinia — nothing else.
 */
export type RenderOptions<T> = Omit<TestingLibraryRenderOptions<T>, 'props'> & {
	pinia?: Pinia;
	props?: Partial<TestingLibraryRenderOptions<T>['props']>;
};

export function createComponentRenderer<T>(component: T, defaultOptions: RenderOptions<T> = {}) {
	return (options: RenderOptions<T> = {}) => {
		const { pinia, ...renderOptions } = { ...defaultOptions, ...options };

		return render(component, {
			...renderOptions,
			global: {
				...renderOptions.global,
				plugins: [
					i18nInstance,
					PiniaVuePlugin,
					N8nPlugin,
					...(renderOptions.global?.plugins ?? []),
					...(pinia ? [pinia] : []),
				],
			},
		} as TestingLibraryRenderOptions<T>);
	};
}
