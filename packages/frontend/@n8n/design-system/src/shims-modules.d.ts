declare module 'markdown-it-task-lists' {
	import type { PluginWithOptions } from 'markdown-it';

	// The option shape lives in an emitted module, because public prop types name
	// it and this file never reaches `dist`.
	import type { TaskListsConfig } from './components/N8nMarkdown/taskLists';

	declare const markdownItTaskLists: PluginWithOptions<TaskListsConfig>;

	export = markdownItTaskLists;
}
