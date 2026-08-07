import { computed, type Plugin } from 'vue';
import { render, type RenderOptions as TestingLibraryRenderOptions } from '@testing-library/vue';
import { i18nInstance } from '@n8n/i18n';
import { GlobalDirectivesPlugin } from '@/app/plugins/directives';
import { N8nPlugin } from '@n8n/design-system';
import type { Pinia } from 'pinia';
import { PiniaVuePlugin } from 'pinia';
import type { Telemetry } from '@/app/plugins/telemetry';
import vueJsonPretty from 'vue-json-pretty';
import merge from 'lodash/merge';
import type { TestingPinia } from '@pinia/testing';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

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
			provide: {
				// Mirror App.vue, which always provides the workflow document store.
				// injectNDVStore()/injectWorkflowDocumentStore() resolve strictly from
				// this key, so a default keeps components that don't set up their own
				// scope working (replicates the former workflowId-based fallback).
				// Tests override it by passing their own `global.provide`.
				[WorkflowDocumentStoreKey as symbol]: computed(() =>
					useWorkflowDocumentStore(createWorkflowDocumentId(useWorkflowsStore().workflowId)),
				),
				...(renderOptions.global?.provide ?? {}),
			},
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
