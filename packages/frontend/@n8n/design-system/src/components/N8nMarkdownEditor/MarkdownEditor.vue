<script setup lang="ts">
import type { Content, Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
/** These probably should be lazy loaded */
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Table } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, watch } from 'vue';

import MarkdownEditorToolbar from './MarkdownEditorToolbar.vue';
import { MarkdownSlashCommandExtension, renderSlashCommandMenu } from './extensions';
import type { N8nMarkdownEditorProps } from './MarkdownEditor.types';

const props = withDefaults(defineProps<N8nMarkdownEditorProps>(), {
	modelValue: '',
	variant: 'default',
	placeholder: '',
	disabled: false,
	readonly: false,
	showToolbar: 'hover',
	maxHeight: '480px',
	containerClass: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	input: [value: string];
	change: [value: string];
	focus: [event: FocusEvent];
	blur: [value: string, event: FocusEvent];
	ready: [editor: Editor];
}>();

const maxHeightStyle = computed(() => ({
	'--markdown-editor-max-height':
		typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
}));

const emptyEditorContent: Content = {
	type: 'doc',
	content: [{ type: 'paragraph' }],
};

const getEditorContent = (markdown: string): Content => markdown || emptyEditorContent;

const setEditorContent = (editor: Editor, markdown: string) => {
	if (markdown) {
		editor.commands.setContent(markdown, {
			contentType: 'markdown',
			emitUpdate: false,
		});

		return;
	}

	editor.commands.setContent(emptyEditorContent, {
		emitUpdate: false,
	});
};

const shouldShowToolbar = computed(() => props.showToolbar !== 'never');
const toolbarMode = computed(() => (props.showToolbar === 'always' ? 'always' : 'hover'));
const shouldPadContent = computed(() => props.showToolbar === 'always');

const baseExtensions = [
	StarterKit,
	Strike,
	Link.configure({
		openOnClick: false,
	}),
	Placeholder.configure({
		placeholder: () => props.placeholder,
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
	MarkdownSlashCommandExtension.configure({
		render: renderSlashCommandMenu,
	}),
];

function copyMarkdown(event: ClipboardEvent) {
	if (!editor.value || !event.clipboardData) return false;

	event.clipboardData.setData('text/plain', editor.value.getMarkdown());
	event.preventDefault();

	return true;
}

function pasteMarkdown(event: ClipboardEvent) {
	if (!editor.value || !event.clipboardData) return false;

	const plainText = event.clipboardData.getData('text/plain');

	if (!plainText) return false;

	const command =
		editor.value.getMarkdown().trim() === ''
			? editor.value.commands.setContent
			: editor.value.commands.insertContent;

	command(plainText, {
		contentType: 'markdown',
	});
	event.preventDefault();

	return true;
}

function handleCopy(view: EditorView, event: ClipboardEvent) {
	return props.editorProps?.handleDOMEvents?.copy?.(view, event) || copyMarkdown(event);
}

function handlePaste(view: EditorView, event: ClipboardEvent) {
	return props.editorProps?.handleDOMEvents?.paste?.(view, event) || pasteMarkdown(event);
}

const editor = useEditor({
	content: getEditorContent(props.modelValue),
	contentType: props.modelValue ? 'markdown' : undefined,
	extensions: [...baseExtensions, ...(props.extensions ?? [])],
	editable: !props.disabled && !props.readonly,
	editorProps: {
		...props.editorProps,
		attributes: {
			class: 'n8n-markdown',
			'data-test-id': 'n8n-markdown-editor-content',
			...props.editorProps?.attributes,
		},
		handleDOMEvents: {
			...props.editorProps?.handleDOMEvents,
			copy: handleCopy,
			paste: handlePaste,
		},
	},
	onCreate: ({ editor }) => {
		emit('ready', editor);
	},
	onUpdate: ({ editor }) => {
		const markdown = editor.getMarkdown();

		emit('update:modelValue', markdown);
		emit('input', markdown);
		emit('change', markdown);
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

function focus() {
	editor.value?.commands.focus();
}

function blur() {
	editor.value?.commands.blur();
}

function getMarkdown() {
	return editor.value?.getMarkdown() ?? '';
}

function getEditor() {
	return editor.value;
}

defineExpose({
	focus,
	blur,
	getMarkdown,
	getEditor,
});
</script>

<template>
	<div
		:class="[
			'n8n-markdown-editor-container',
			$style.container,
			props.variant === 'default' ? $style.default : $style.textbox,
			props.containerClass,
			props.disabled ? $style.disabled : '',
		]"
		:style="maxHeightStyle"
		data-test-id="n8n-markdown-editor"
	>
		<EditorContent
			:editor="editor"
			:class="[$style.content, shouldPadContent ? $style.padBottom : '']"
		/>
		<MarkdownEditorToolbar
			v-if="shouldShowToolbar && editor"
			:editor="editor"
			:disabled="props.disabled || props.readonly"
			:mode="toolbarMode"
			:variant="props.variant"
		/>
	</div>
</template>

<style lang="scss">
@use '../../css/markdown.scss';
</style>

<style lang="scss" module>
@use '../../css/mixins/focus';

.disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

.container {
	position: relative;
	isolation: isolate;
	overflow: hidden;
	min-height: var(--spacing--3xl);
	background-color: transparent;
}

.default {
	background-color: transparent;
}

.textbox {
	--input--height: var(--height--lg);
	--input--radius: var(--radius--2xs);
	--input--font-size: var(--font-size--sm);
	--input--padding: var(--spacing--xs);
	--input--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	--input--shadow: 0 0 0 0 transparent;
	--input--shadow--hover: 0 0 0 0 transparent;
	--input--shadow--focus: 0 0 0 0 transparent;
	--input--border-color: var(--border-color);
	--input--border-color--hover: var(--border-color--strong);
	--input--border-color--focus: var(--focus--border-color);
	--input--border--shadow: 0 0 0 1px var(--input--border-color);
	--input--border--shadow--hover: 0 0 0 1px var(--input--border-color--hover);
	--input--border--shadow--focus: 0 0 0 1px var(--input--border-color--focus);

	min-height: var(--input--height);
	padding: 1px;
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);

	@include focus.focus-within-ring;

	&:hover:not(.disabled):not(:focus-within) {
		box-shadow:
			var(--input--shadow--hover),
			inset var(--input--border--shadow--hover);
	}

	&:focus-within {
		box-shadow:
			var(--input--shadow--focus),
			inset var(--input--border--shadow--focus);
	}
}
.content {
	height: 100%;
	max-height: var(--markdown-editor-max-height);
	overflow: hidden;

	/** NOTE (@heymynameisrob): Adds clearing for Toolbar **/
	&.padBottom :global(.n8n-markdown > *:first-child) {
		scroll-padding-bottom: var(--height--lg);
	}

	:global(.n8n-markdown) {
		overflow-y: scroll;
		scrollbar-width: thin;
		scrollbar-color: var(--border-color) transparent;
		display: block;
		box-sizing: border-box;
		max-height: var(--markdown-editor-max-height);
		min-height: var(--spacing--3xl);
		outline: none;
		padding: var(--spacing--xs);
		font-family: inherit;
		font-size: var(--input--font-size, inherit);
	}

	:global(.n8n-markdown .is-empty::before) {
		content: attr(data-placeholder);
		float: left;
		height: 0;
		color: var(--text-color--subtler);
		pointer-events: none;
	}

	:global(.n8n-markdown > *:first-child) {
		margin-top: 0;
	}

	:global(.n8n-markdown > *:last-child) {
		margin-bottom: 0;
	}
}
</style>
