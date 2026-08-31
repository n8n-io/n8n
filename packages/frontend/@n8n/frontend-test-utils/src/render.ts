import { N8nPlugin } from '@n8n/design-system';
import { i18nInstance } from '@n8n/i18n';
import type { TestingPinia } from '@pinia/testing';
import { render, type RenderOptions as TestingLibraryRenderOptions } from '@testing-library/vue';
import merge from 'lodash/merge';
import { PiniaVuePlugin, type Pinia } from 'pinia';
import type { Plugin } from 'vue';

export type RenderOptions<T> = Omit<TestingLibraryRenderOptions<T>, 'props'> & {
	pinia?: TestingPinia | Pinia;
	props?: Partial<TestingLibraryRenderOptions<T>['props']>;
};

export interface RendererExtension {
	/** Installed after the base plugins, so a later plugin wins on a shared global property. */
	plugins?: Plugin[];
	stubs?: Record<string, unknown>;
	/**
	 * A thunk, not an object. The shell provides the workflow document store here, and
	 * `useWorkflowDocumentStore()` has to run per render, inside the pinia that render activated.
	 * An object would freeze one store instance at import time and leak it between tests.
	 */
	provide?: () => Record<string | symbol, unknown>;
}

export interface Renderer {
	renderComponent: <T>(component: T, options?: RenderOptions<T>) => ReturnType<typeof render>;
	createComponentRenderer: <T>(
		component: T,
		defaultOptions?: RenderOptions<T>,
	) => (
		options?: RenderOptions<T>,
		rendererOptions?: { merge?: boolean },
	) => ReturnType<typeof render>;
}

/**
 * `$telemetry` is a shell global property. A component that calls `track()` must not throw in a
 * package that has no telemetry plugin, so the base installs a no-op.
 *
 * The cast avoids the shell's `ComponentCustomProperties` augmentation: when this file compiles
 * inside editor-ui's program, that augmentation types `$telemetry` as the full `Telemetry`, and a
 * test only ever reads `track`.
 */
const TelemetryStubPlugin: Plugin = {
	install(app) {
		(app.config.globalProperties as Record<string, unknown>).$telemetry = { track() {} };
	},
};

/**
 * Builds a renderer from the base every frontend package shares, plus the extension a consumer
 * needs. The base is i18n, pinia, the design system, a `RouterLink` stub and a no-op `$telemetry`.
 *
 * A module package uses the zero-config `createComponentRenderer` this module also exports. The
 * shell calls `defineRenderer` with its editor-core additions — the touch-events directive, the
 * `VueJsonPretty` stub and the workflow document store. Those are an extension, not a flag: a
 * module never wants them, and a flag would put shell imports in every module's test graph.
 */
export function defineRenderer(extension: RendererExtension = {}): Renderer {
	const baseOptions = {
		global: {
			stubs: {
				// A stub map is keyed by component name, so PascalCase is the format Vue requires.
				// eslint-disable-next-line @typescript-eslint/naming-convention
				RouterLink: { template: '<a><slot /></a>' },
				...extension.stubs,
			},
			plugins: [
				i18nInstance,
				PiniaVuePlugin,
				N8nPlugin,
				TelemetryStubPlugin,
				...(extension.plugins ?? []),
			],
		},
	};

	function renderComponent<T>(component: T, options: RenderOptions<T> = {}) {
		const { pinia, ...renderOptions } = options;

		return render(component, {
			...baseOptions,
			...renderOptions,
			global: {
				...baseOptions.global,
				...renderOptions.global,
				stubs: { ...baseOptions.global.stubs, ...(renderOptions.global?.stubs ?? {}) },
				plugins: [
					...baseOptions.global.plugins,
					...(renderOptions.global?.plugins ?? []),
					...(pinia ? [pinia] : []),
				],
				provide: {
					...extension.provide?.(),
					...(renderOptions.global?.provide ?? {}),
				},
			},
		} as TestingLibraryRenderOptions<T>);
	}

	function createComponentRenderer<T>(component: T, defaultOptions: RenderOptions<T> = {}) {
		return (options: RenderOptions<T> = {}, rendererOptions: { merge?: boolean } = {}) =>
			renderComponent(
				component,
				rendererOptions.merge
					? // KNOWN DEFECT, carried over from the shell verbatim: `merge` writes into its
						// first argument, so each `{ merge: true }` call leaks its props, stubs and
						// provides into the renderer's defaults, and every later render inherits them.
						//
						// `merge({}, defaultOptions, options)` is the fix. It is not applied here yet:
						// three editor-ui suites only pass because of the leak, and two of their tests
						// already fail in isolation on `master`. Correcting the helper and those tests
						// is one scoped change that this package should not smuggle in.
						merge(defaultOptions, options)
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

	return { renderComponent, createComponentRenderer };
}

let sharedRenderer: Renderer | undefined;

/**
 * The zero-config renderer, built on first use rather than at import.
 *
 * `index.ts` re-exports this module, so a test that only wants `mockedStore` imports this file
 * too. Building the renderer eagerly would read `N8nPlugin` and `i18nInstance` at that moment,
 * and a test that replaces `@n8n/design-system` or `@n8n/i18n` with a `vi.mock` factory has no
 * such export to give. Building on first render keeps those tests working.
 */
const shared = (): Renderer => {
	sharedRenderer ??= defineRenderer();
	return sharedRenderer;
};

export function renderComponent<T>(component: T, options: RenderOptions<T> = {}) {
	return shared().renderComponent(component, options);
}

export function createComponentRenderer<T>(component: T, defaultOptions: RenderOptions<T> = {}) {
	return shared().createComponentRenderer(component, defaultOptions);
}
