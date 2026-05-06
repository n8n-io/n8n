import type { Editor, Extension, EditorOptions } from '@tiptap/core';

export type MarkdownEditorVariant = 'default' | 'textbox';
export type MarkdownEditorToolbarMode = 'never' | 'hover' | 'always';

export type N8nMarkdownEditorProps = {
	modelValue: string;
	variant?: MarkdownEditorVariant;
	placeholder?: string;
	disabled?: boolean;
	readonly?: boolean;
	showToolbar?: MarkdownEditorToolbarMode;
	maxHeight?: string | number;
	extensions?: Extension[];
	editorProps?: EditorOptions['editorProps'];
	containerClass?: string;
};

export type N8nMarkdownEditorEmits = {
	'update:modelValue': [value: string];
	input: [value: string];
	change: [value: string];
	focus: [event: FocusEvent];
	blur: [value: string, event: FocusEvent];
	ready: [editor: Editor];
};
