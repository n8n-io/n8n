<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/vue-3';
import { computed } from 'vue';

import MarkdownEditorToolbar from './MarkdownEditorToolbar.vue';
import type { N8nMarkdownEditorEmits, N8nMarkdownEditorProps } from './MarkdownEditor.types';
import { useMarkdownEditor } from './composables/useMarkdownEditor';

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

const emit = defineEmits<N8nMarkdownEditorEmits>();

const maxHeightStyle = computed(() => ({
	'--markdown-editor-max-height':
		typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
}));

const shouldShowToolbar = computed(() => props.showToolbar !== 'never');
const toolbarMode = computed(() => (props.showToolbar === 'always' ? 'always' : 'hover'));
const shouldPadContent = computed(() => props.showToolbar === 'always');

const editor = useMarkdownEditor(props, emit);

function focus() {
	editor.value?.commands.focus();
}

function blur() {
	editor.value?.commands.blur();
}

function getMarkdown() {
	return editor.value?.getMarkdown() ?? '';
}

function getEditor(): Editor | undefined {
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
