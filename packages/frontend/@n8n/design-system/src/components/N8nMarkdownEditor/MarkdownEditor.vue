<script setup lang="ts">
import type { Editor, EditorOptions, Extension } from '@tiptap/core';
/** These probably should be lazy loaded */
import Link from '@tiptap/extension-link';
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
import { computed, watch, type PropType } from 'vue';

import type { MarkdownEditorVariant } from './MarkdownEditor.types';

const props = defineProps({
	modelValue: {
		type: String,
		default: '',
	},
	variant: {
		type: String as PropType<MarkdownEditorVariant>,
		default: 'default',
	},
	placeholder: {
		type: String,
		default: '',
	},
	disabled: {
		type: Boolean,
		default: false,
	},
	readonly: {
		type: Boolean,
		default: false,
	},
	showToolbar: {
		type: Boolean,
		default: true,
	},
	maxHeight: {
		type: [String, Number] as PropType<string | number>,
		default: '480px',
	},
	extensions: {
		type: Array as PropType<Extension[]>,
		default: undefined,
	},
	editorProps: {
		type: Object as PropType<EditorOptions['editorProps']>,
		default: undefined,
	},
	containerClass: {
		type: String,
		default: '',
	},
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

const baseExtensions = [
	StarterKit,
	Strike,
	Link.configure({
		openOnClick: false,
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
	content: props.modelValue,
	contentType: 'markdown',
	extensions: [...baseExtensions, ...(props.extensions ?? [])],
	editable: !props.disabled && !props.readonly,
	editorProps: {
		attributes: {
			class: 'n8n-markdown',
			'data-testid': 'n8n-markdown-editor-content',
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

		editor.value.commands.setContent(value ?? '', {
			contentType: 'markdown',
			emitUpdate: false,
		});
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
			$style.container,
			props.variant === 'default' ? $style.default : $style.textbox,
			props.containerClass,
			props.disabled ? $style.disabled : '',
		]"
		:style="maxHeightStyle"
		data-testid="n8n-markdown-editor"
	>
		<div v-if="showToolbar && editor" :class="$style.toolbar">
			<p>Toolbar Goes Here</p>
		</div>

		<EditorContent
			:editor="editor"
			:class="[$style.content, props.showToolbar ? $style.padTop : '']"
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
.toolbar {
	position: absolute;
	background-color: var(--background--surface);
	border-bottom: var(--border);
	top: 1px;
	inset-inline: 1px;
	z-index: 1;
}

.content {
	height: 100%;
	max-height: var(--markdown-editor-max-height);
	overflow: hidden;

	&.padTop {
		padding-top: 32px;
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

	:global(.n8n-markdown > *:first-child) {
		margin-top: 0;
	}

	:global(.n8n-markdown > *:last-child) {
		margin-bottom: 0;
	}
}
</style>
