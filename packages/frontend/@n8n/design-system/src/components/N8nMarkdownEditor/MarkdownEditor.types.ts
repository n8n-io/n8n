import type { Editor, Extension, EditorOptions } from '@tiptap/core';

export type MarkdownEditorVariant = 'ghost' | 'contained';
export type MarkdownEditorToolbarMode = 'never' | 'hover' | 'always' | 'floating';

export type N8nMarkdownEditorProps = {
	/** Markdown content for the editor. */
	modelValue: string;
	/** Visual style for the editor container. */
	variant?: MarkdownEditorVariant;
	/** Text to show when the editor is empty. */
	placeholder?: string;
	/** Whether users cannot interact with the editor. */
	disabled?: boolean;
	/** Whether users can view but cannot change the content. */
	readonly?: boolean;
	/** Toolbar mode to use in the inline view. */
	showToolbar?: MarkdownEditorToolbarMode;
	/** Maximum editor height in pixels or as a CSS value. */
	maxHeight?: string | number;
	/** Whether content should expand or collapse. This overwrites maxHeight. */
	isCollapsible?: boolean;
	/** Whether the editor can open in an expanded dialog. */
	allowExpandedView?: boolean;
	/** Toolbar mode to use in the expanded view. Defaults to showToolbar. */
	expandedViewToolbarMode?: MarkdownEditorToolbarMode;
	/** Additional TipTap extensions to add to the editor. */
	extensions?: Extension[];
	/** TipTap editor view options. */
	editorProps?: EditorOptions['editorProps'];
	/** Additional class names for the editor container. */
	containerClass?: string;
};

export type N8nMarkdownEditorEmits = {
	/** Emitted when the Markdown content changes. */
	'update:modelValue': [value: string];
	/** Emitted when the collapsed state changes. */
	'update:collapsed': [collapsed: boolean];
	/** Emitted when the user changes the Markdown content. */
	input: [value: string];
	/** Emitted when the editor receives focus. */
	focus: [event: FocusEvent];
	/** Emitted when the editor loses focus. */
	blur: [value: string, event: FocusEvent];
	/** Emitted when the TipTap editor is ready. */
	ready: [editor: Editor];
};
