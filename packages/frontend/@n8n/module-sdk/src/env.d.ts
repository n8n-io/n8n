/// <reference types="vite/client" />

// Ambient shims for the virtual modules the design-system source references.
// Included so `vue-tsc` can follow design-system types (shipped from source).

declare module 'markdown-it-task-lists' {
	import type { PluginWithOptions } from 'markdown-it';

	declare namespace markdownItTaskLists {
		interface Config {
			enabled?: boolean;
			label?: boolean;
			labelAfter?: boolean;
		}
	}

	declare const markdownItTaskLists: PluginWithOptions<markdownItTaskLists.Config>;

	export = markdownItTaskLists;
}

declare module '~icons/*' {
	import type { FunctionalComponent, SVGAttributes } from 'vue';

	const component: FunctionalComponent<SVGAttributes>;
	export default component;
}
