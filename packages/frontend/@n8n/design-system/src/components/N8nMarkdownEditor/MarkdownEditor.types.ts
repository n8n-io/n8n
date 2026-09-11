import type { Editor, Extension, EditorOptions } from '@tiptap/core';

export type MarkdownEditorVariant = 'ghost' | 'contained';
export type MarkdownEditorToolbarMode = 'never' | 'hover' | 'always' | 'floating';

export type N8nMarkdownEditorProps = {
	modelValue: string;
	variant?: MarkdownEditorVariant;
	placeholder?: string;
	disabled?: boolean;
	readonly?: boolean;
	showToolbar?: MarkdownEditorToolbarMode;
	maxHeight?: string | number;
	/** Whether content should expand/collapse. Overwrites maxHeight. */
	isCollapsible?: boolean;
	extensions?: Extension[];
	editorProps?: EditorOptions['editorProps'];
	containerClass?: string;
};

export type N8nMarkdownEditorEmits = {
	'update:modelValue': [value: string];
	'update:collapsed': [collapsed: boolean];
	input: [value: string];
	focus: [event: FocusEvent];
	blur: [value: string, event: FocusEvent];
	ready: [editor: Editor];
};
