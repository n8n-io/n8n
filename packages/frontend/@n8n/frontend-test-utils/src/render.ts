import { N8nPlugin } from '@n8n/design-system';
import { i18nInstance } from '@n8n/i18n';
import type { TestingPinia } from '@pinia/testing';
import { render, type RenderOptions as TestingLibraryRenderOptions } from '@testing-library/vue';
import isPlainObject from 'lodash/isPlainObject';
import mergeWith from 'lodash/mergeWith';
import { PiniaVuePlugin, type Pinia } from 'pinia';
import { isProxy, isRef, type Plugin } from 'vue';

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
 * True for the values a render option carries as identity rather than as data: a store, any
 * `reactive()`/`readonly()` object, and any ref.
 *
 * `isPlainObject` is not enough on its own. A `reactive()` proxy — which is what `useSomeStore()`
 * returns — reports `[object Object]` and inherits from `Object.prototype`, so lodash calls it
 * plain and a deep copy would walk into it. A copy of a store is a different store.
 */
function isIdentity(value: unknown): boolean {
	return isRef(value) || isProxy(value);
}

/**
 * Copies the plain objects and arrays a deep merge would otherwise write into, and carries
 * everything else over by reference.
 */
function copyContainers<T>(value: T): T {
	// Before the array check: `reactive([])` is an array *and* a proxy, and copying it would hand
	// the component a different array than the one the test holds.
	if (isIdentity(value)) {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(copyContainers) as T;
	}
	if (!isPlainObject(value)) {
		return value;
	}

	const source = value as Record<string | symbol, unknown>;
	const copy: Record<string | symbol, unknown> = {};
	// `Reflect.ownKeys`, not `Object.keys`: every injection key in the shell is a symbol, and a
	// symbol-keyed `provide` entry has to survive the copy.
	for (const key of Reflect.ownKeys(source)) {
		copy[key] = copyContainers(source[key]);
	}
	return copy as T;
}

/**
 * `mergeWith` customizer that keeps a store, a reactive object or a ref out of the deep merge.
 *
 * Two directions, both needed. A store arriving in `options` would otherwise be copied the same
 * way lodash copies any plain object. And a plain object arriving over a store already in the
 * defaults would otherwise be merged *into* that store, writing into shared state.
 */
function keepIdentity(objValue: unknown, srcValue: unknown): unknown {
	if (isIdentity(srcValue)) {
		return srcValue;
	}
	if (isIdentity(objValue)) {
		return srcValue === undefined ? objValue : srcValue;
	}
	return undefined;
}

/**
 * Deep-merges a render call's options over the renderer's defaults.
 *
 * The merge runs against a copy, because `merge` writes into its first argument: merging into
 * `defaultOptions` would leak each call's props, stubs and provides into the shared defaults, and
 * every later render in the file would inherit them.
 *
 * `pinia` is resolved outside the merge — it is a plugin instance the render installs, so the two
 * candidates replace each other rather than merging.
 *
 * `mergeWith` reads string keys only, so a symbol-keyed entry in `options` does not override the
 * default of the same key. Pass such an override without `{ merge: true }`, where the plain spread
 * in `renderComponent` handles it.
 */
function mergeOptions<T>(
	defaultOptions: RenderOptions<T>,
	options: RenderOptions<T>,
): RenderOptions<T> {
	const { pinia: defaultPinia, ...mergeableDefaults } = defaultOptions;
	const { pinia, ...mergeableOptions } = options;

	const merged: RenderOptions<T> = mergeWith(
		copyContainers(mergeableDefaults),
		mergeableOptions,
		keepIdentity,
	);
	const resolvedPinia = pinia ?? defaultPinia;

	return resolvedPinia ? { ...merged, pinia: resolvedPinia } : merged;
}

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
					? mergeOptions(defaultOptions, options)
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
