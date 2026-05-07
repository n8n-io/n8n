import type { Editor } from '@tiptap/core';
import type { Range } from '@tiptap/core';

import { t } from '../../../../locale';
import type { MarkdownSlashCommand } from './types';

const translate = (path: string) => t(path, undefined);

const deleteSuggestionRange = (editor: Editor, range?: Range) => {
	if (!range) return editor.chain().focus();

	return editor.chain().focus().deleteRange(range);
};

export const createMarkdownSlashCommands = (): Map<string, MarkdownSlashCommand> =>
	new Map([
		[
			'paragraph',
			{
				id: 'paragraph',
				label: translate('markdownEditor.text'),
				icon: 'type',
				aliases: ['text', 'normal', 'paragraph'],
				command: ({ editor, range }) => deleteSuggestionRange(editor, range).setParagraph().run(),
			},
		],
		[
			'heading-1',
			{
				id: 'heading-1',
				label: translate('markdownEditor.heading1'),
				icon: 'heading-1',
				aliases: ['heading', 'h1', 'large', 'title'],
				command: ({ editor, range }) =>
					deleteSuggestionRange(editor, range).toggleHeading({ level: 1 }).run(),
			},
		],
		[
			'heading-2',
			{
				id: 'heading-2',
				label: translate('markdownEditor.heading2'),
				icon: 'heading-2',
				aliases: ['heading', 'h2', 'medium', 'subtitle'],
				command: ({ editor, range }) =>
					deleteSuggestionRange(editor, range).toggleHeading({ level: 2 }).run(),
			},
		],
		[
			'heading-3',
			{
				id: 'heading-3',
				label: translate('markdownEditor.heading3'),
				icon: 'heading-3',
				aliases: ['heading', 'h3', 'small'],
				command: ({ editor, range }) =>
					deleteSuggestionRange(editor, range).toggleHeading({ level: 3 }).run(),
			},
		],
		[
			'bold',
			{
				id: 'bold',
				label: translate('markdownEditor.bold'),
				icon: 'bold',
				aliases: ['strong'],
				command: ({ editor, range }) => deleteSuggestionRange(editor, range).toggleBold().run(),
			},
		],
		[
			'italic',
			{
				id: 'italic',
				label: translate('markdownEditor.italic'),
				icon: 'italic',
				aliases: ['emphasis', 'em'],
				command: ({ editor, range }) => deleteSuggestionRange(editor, range).toggleItalic().run(),
			},
		],
		[
			'strike',
			{
				id: 'strike',
				label: translate('markdownEditor.strikethrough'),
				icon: 'strikethrough',
				aliases: ['strikethrough', 's'],
				command: ({ editor, range }) => deleteSuggestionRange(editor, range).toggleStrike().run(),
			},
		],
		[
			'bulletList',
			{
				id: 'bulletList',
				label: translate('markdownEditor.bulletList'),
				icon: 'list',
				aliases: ['list', 'ul', 'unordered'],
				command: ({ editor, range }) =>
					deleteSuggestionRange(editor, range).toggleBulletList().run(),
			},
		],
		[
			'taskList',
			{
				id: 'taskList',
				label: translate('markdownEditor.taskList'),
				icon: 'list-checks',
				aliases: ['task', 'todo', 'checklist'],
				command: ({ editor, range }) => deleteSuggestionRange(editor, range).toggleTaskList().run(),
			},
		],
		[
			'codeBlock',
			{
				id: 'codeBlock',
				label: translate('markdownEditor.codeBlock'),
				icon: 'file-code',
				aliases: ['code', 'pre'],
				command: ({ editor, range }) =>
					deleteSuggestionRange(editor, range).toggleCodeBlock().run(),
			},
		],
		[
			'blockquote',
			{
				id: 'blockquote',
				label: translate('markdownEditor.blockquote'),
				icon: 'quote',
				aliases: ['quote', 'callout'],
				command: ({ editor, range }) =>
					deleteSuggestionRange(editor, range).toggleBlockquote().run(),
			},
		],
		[
			'link',
			{
				id: 'link',
				label: translate('markdownEditor.link'),
				icon: 'link',
				aliases: ['url', 'href'],
				command: ({ editor, range }) => deleteSuggestionRange(editor, range).run(),
			},
		],
	]);

export const getDefaultMarkdownSlashCommands = () => [...createMarkdownSlashCommands().values()];
