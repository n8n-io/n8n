import { createApp, type Component } from 'vue';

export interface VueToolHandle {
	element: HTMLElement;
	destroy: () => void;
}

/**
 * Mounts a Vue component into a fresh DOM node for an Editor.js custom tool's
 * `render()`. Detached from the app's own component tree — Pinia's active
 * instance and `useI18n()`'s singleton are both plain module-level state, so
 * stores and translations work here without installing any plugin.
 */
export function mountVueTool<Props extends Record<string, unknown>>(
	component: Component,
	props: Props,
): VueToolHandle {
	const element = document.createElement('div');
	const app = createApp(component, props);
	app.mount(element);
	return {
		element,
		destroy: () => app.unmount(),
	};
}
