import { defineAsyncComponent, type Component } from 'vue';

/**
 * `defineAsyncComponent` wrappers, kept per factory. A fresh wrapper on every
 * computed re-evaluation would remount the component on unrelated state changes.
 */
const asyncComponentCache = new WeakMap<() => Promise<Component>, Component>();

/**
 * Returns a component that a module contributed, ready to render.
 * A lazy factory gets one `defineAsyncComponent` wrapper, which later calls reuse.
 */
export function resolveContributedComponent(
	component: Component | (() => Promise<Component>),
): Component {
	if (typeof component !== 'function') return component;

	const factory = component as () => Promise<Component>;
	let resolved = asyncComponentCache.get(factory);
	if (!resolved) {
		resolved = defineAsyncComponent(factory);
		asyncComponentCache.set(factory, resolved);
	}

	return resolved;
}
