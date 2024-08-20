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
