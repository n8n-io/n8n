import type { AnyExtension } from '@tiptap/core';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { i18n } from '@n8n/i18n';

import { Callout } from './callout';

/**
 * The extension set of N8nMarkdownEditor (design system), plus callouts and toggles.
 * ponytail: copied, because the design system does not export its list. Export it there if a third editor needs it.
 */
export const createDocPageBaseExtensions = (): AnyExtension[] => [
	// StarterKit 3 already includes Link and Underline.
	StarterKit.configure({ link: { openOnClick: false } }),
	Placeholder.configure({ placeholder: () => i18n.baseText('docPages.editor.placeholder') }),
	Table.configure({ resizable: true }),
	TableRow,
	TableHeader,
	TableCell,
	TaskList,
	TaskItem.configure({ nested: true }),
	Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
	Details.configure({
		persist: true,
		renderToggleButton: ({ element, isOpen }) => {
			element.setAttribute(
				'aria-label',
				i18n.baseText(isOpen ? 'docPages.editor.collapseToggle' : 'docPages.editor.expandToggle'),
			);
		},
	}),
	DetailsSummary,
	DetailsContent,
	Callout,
];
