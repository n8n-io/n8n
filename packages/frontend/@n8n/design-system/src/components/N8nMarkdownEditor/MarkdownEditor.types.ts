import type { Editor, Extension, EditorOptions } from '@tiptap/core';

export type MarkdownEditorVariant = 'default' | 'textbox';

export type N8nMarkdownEditorProps = {
	modelValue: string;
	variant?: MarkdownEditorVariant;
	placeholder?: string;
	disabled?: boolean;
	readonly?: boolean;
	showToolbar?: boolean;
	maxHeight?: string | number;
	extensions?: Extension[];
	editorProps?: EditorOptions['editorProps'];
	containerClass?: string;
};

export type N8nMarkdownEditorEmits = {
	'update:modelValue': [value: string];
	input: [value: string];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
	ready: [editor: Editor];
};
