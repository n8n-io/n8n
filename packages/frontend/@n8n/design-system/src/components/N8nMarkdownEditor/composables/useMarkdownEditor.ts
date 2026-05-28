/** These probably should be lazy loaded */
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from '@tiptap/markdown';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import { useEditor } from '@tiptap/vue-3';
import { watch } from 'vue';
import type { SetupContext } from 'vue';

import type { N8nMarkdownEditorEmits, N8nMarkdownEditorProps } from '../MarkdownEditor.types';
import {
	copyMarkdown,
	getEditorContent,
	pasteMarkdown,
	setEditorContent,
} from '../markdownEditorUtils';

type EditorProps = NonNullable<N8nMarkdownEditorProps['editorProps']>;
type EditorAttributes = EditorProps['attributes'];
type AttributeMap = Record<string, string>;

const mergeMarkdownAttributes = (attributes: AttributeMap = {}) => ({
	...attributes,
	class: ['n8n-markdown', attributes.class].filter(Boolean).join(' '),
	'data-test-id': 'n8n-markdown-editor-content',
});

const getMarkdownAttributes = (attributes: EditorAttributes): EditorAttributes => {
	if (typeof attributes === 'function') {
		return (state: EditorState) => mergeMarkdownAttributes(attributes(state));
	}

	return mergeMarkdownAttributes(attributes);
};

export const useMarkdownEditor = (
	props: Readonly<N8nMarkdownEditorProps>,
	emit: SetupContext<N8nMarkdownEditorEmits>['emit'],
) => {
	const baseExtensions = [
		StarterKit,
		Link.configure({
			openOnClick: false,
		}),
		Placeholder.configure({
			placeholder: () => props.placeholder ?? '',
			showOnlyCurrent: false,
		}),
		Table.configure({
			resizable: true,
		}),
		TableRow,
		TableHeader,
		TableCell,
		TaskList,
		TaskItem.configure({
			nested: true,
		}),
		Markdown.configure({
			markedOptions: {
				gfm: true,
				breaks: false,
			},
		}),
	];

	const editor = useEditor({
		content: getEditorContent(props.modelValue),
		contentType: props.modelValue ? 'markdown' : undefined,
		extensions: [...baseExtensions, ...(props.extensions ?? [])],
		editable: !props.disabled && !props.readonly,
		editorProps: {
			...props.editorProps,
			attributes: getMarkdownAttributes(props.editorProps?.attributes),
			handleDOMEvents: {
				...props.editorProps?.handleDOMEvents,
				copy: (view: EditorView, event: ClipboardEvent) =>
					props.editorProps?.handleDOMEvents?.copy?.(view, event) ||
					(editor.value ? copyMarkdown(editor.value, event) : false),
				paste: (view: EditorView, event: ClipboardEvent) =>
					props.editorProps?.handleDOMEvents?.paste?.(view, event) ||
					(editor.value ? pasteMarkdown(editor.value, event) : false),
			},
		},
		onCreate: ({ editor }) => {
			emit('ready', editor);
		},
		onUpdate: ({ editor }) => {
			const markdown = editor.getMarkdown();

			emit('update:modelValue', markdown);
			emit('input', markdown);
		},
		onFocus: ({ event }) => {
			emit('focus', event);
		},
		onBlur: ({ editor, event }) => {
			emit('blur', editor.getMarkdown(), event);
		},
	});

	watch(
		() => props.modelValue,
		(value) => {
			if (!editor.value) return;

			const currentMarkdown = editor.value.getMarkdown();

			if (currentMarkdown === value) return;

			setEditorContent(editor.value, value ?? '');
		},
	);

	watch(
		() => [props.disabled, props.readonly] as const,
		([disabled, readonly]) => {
			editor.value?.setEditable(!disabled && !readonly);
		},
	);

	return editor;
};
