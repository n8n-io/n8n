import type { IconName } from '@n8n/design-system';
import { i18n, type BaseTextKey } from '@n8n/i18n';
import type { ChainedCommands, Editor, Range } from '@tiptap/core';

/** `range` covers the `/` and the query that the user typed. */
export type SlashCommandContext = { editor: Editor; range: Range };

export type SlashCommand = {
	id: string;
	icon: IconName;
	title: BaseTextKey;
	description: BaseTextKey;
	/** More words that find the command. Lower case. */
	keywords: string[];
	/**
	 * Applies the command. It must remove `range`, or the typed query stays in the page.
	 * The menu closes at once and does not wait for a returned promise.
	 */
	run: (context: SlashCommandContext) => void | Promise<void>;
};

type Translate = (key: BaseTextKey) => string;

/** Builds a `run` that removes the typed query and then applies `change` in the same step. */
function replaceQueryWith(change: (chain: ChainedCommands) => ChainedCommands) {
	return ({ editor, range }: SlashCommandContext): void => {
		change(editor.chain().focus().deleteRange(range)).run();
	};
}

/**
 * Inserts markdown at the selection as formatted content.
 * Does nothing when the editor was destroyed, so a late answer of an async command is safe.
 */
export function insertMarkdownAtSelection(editor: Editor, markdown: string): void {
	if (!editor.isDestroyed) {
		editor.chain().focus().insertContent(markdown, { contentType: 'markdown' }).run();
	}
}

/** The commands that the `/` menu of a page offers, in menu order. */
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
	{
		id: 'heading1',
		icon: 'heading-1',
		title: 'page.slash.heading1.title',
		description: 'page.slash.heading1.description',
		keywords: ['h1', 'title', '#'],
		run: replaceQueryWith((chain) => chain.setNode('heading', { level: 1 })),
	},
	{
		id: 'heading2',
		icon: 'heading-2',
		title: 'page.slash.heading2.title',
		description: 'page.slash.heading2.description',
		keywords: ['h2', 'subtitle', '##'],
		run: replaceQueryWith((chain) => chain.setNode('heading', { level: 2 })),
	},
	{
		id: 'heading3',
		icon: 'heading-3',
		title: 'page.slash.heading3.title',
		description: 'page.slash.heading3.description',
		keywords: ['h3', '###'],
		run: replaceQueryWith((chain) => chain.setNode('heading', { level: 3 })),
	},
	{
		id: 'bulletList',
		icon: 'list',
		title: 'page.slash.bulletList.title',
		description: 'page.slash.bulletList.description',
		keywords: ['ul', 'unordered', 'bullets', '-'],
		run: replaceQueryWith((chain) => chain.toggleList('bulletList', 'listItem')),
	},
	{
		id: 'orderedList',
		icon: 'list-ordered',
		title: 'page.slash.orderedList.title',
		description: 'page.slash.orderedList.description',
		keywords: ['ol', 'ordered', 'steps', '1.'],
		run: replaceQueryWith((chain) => chain.toggleList('orderedList', 'listItem')),
	},
	{
		id: 'taskList',
		icon: 'list-checks',
		title: 'page.slash.taskList.title',
		description: 'page.slash.taskList.description',
		keywords: ['todo', 'task', 'checkbox', 'checklist', '[]'],
		run: replaceQueryWith((chain) => chain.toggleList('taskList', 'taskItem')),
	},
	{
		id: 'quote',
		icon: 'quote',
		title: 'page.slash.quote.title',
		description: 'page.slash.quote.description',
		keywords: ['blockquote', 'citation', '>'],
		run: replaceQueryWith((chain) => chain.wrapIn('blockquote')),
	},
	{
		id: 'codeBlock',
		icon: 'file-code',
		title: 'page.slash.codeBlock.title',
		description: 'page.slash.codeBlock.description',
		keywords: ['code', 'snippet', 'pre', '```'],
		run: replaceQueryWith((chain) => chain.setNode('codeBlock')),
	},
	{
		id: 'divider',
		icon: 'minus',
		title: 'page.slash.divider.title',
		description: 'page.slash.divider.description',
		keywords: ['hr', 'rule', 'line', 'separator', '---'],
		run: replaceQueryWith((chain) => chain.insertContent({ type: 'horizontalRule' })),
	},
	{
		id: 'mention',
		icon: 'at-sign',
		title: 'page.slash.mention.title',
		description: 'page.slash.mention.description',
		keywords: ['link', 'reference', 'workflow', 'node', 'page', 'credential', 'table', '@'],
		run: replaceQueryWith((chain) => chain.insertContent('@')),
	},
];

function normalize(text: string): string {
	return text.trim().toLowerCase();
}

/**
 * Keeps the commands whose title contains `query` or that have a keyword starting with it.
 * The order stays. An empty query keeps every command.
 */
export function filterSlashCommands(
	commands: SlashCommand[],
	query: string,
	translate: Translate = (key) => i18n.baseText(key),
): SlashCommand[] {
	const needle = normalize(query);
	return commands.filter(
		({ title, keywords }) =>
			normalize(translate(title)).includes(needle) ||
			keywords.some((keyword) => keyword.startsWith(needle)),
	);
}
