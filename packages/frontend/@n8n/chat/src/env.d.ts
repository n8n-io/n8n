/// <reference types="vite/client" />

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
