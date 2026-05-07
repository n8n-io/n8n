<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/vue-3';
import { computed, nextTick, ref, watch } from 'vue';

import MarkdownEditorToolbar from './MarkdownEditorToolbar.vue';
import type { N8nMarkdownEditorEmits, N8nMarkdownEditorProps } from './MarkdownEditor.types';
import { useMarkdownEditor } from './composables/useMarkdownEditor';
import { setEditorContent } from './markdownEditorUtils';

const props = withDefaults(defineProps<N8nMarkdownEditorProps>(), {
	modelValue: '',
	variant: 'contained',
	placeholder: '',
	disabled: false,
	readonly: false,
	showToolbar: 'always',
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
const shouldPadContentTop = computed(() => props.showToolbar === 'always');

const editor = useMarkdownEditor(props, emit);
const isRawMode = ref(false);
const rawMarkdown = ref(props.modelValue);
const container = ref<HTMLElement>();
const rawEditor = ref<HTMLTextAreaElement>();
const rawContentHeight = ref<string>();

watch(
	() => props.modelValue,
	(value) => {
		if (isRawMode.value) {
			rawMarkdown.value = value ?? '';
		}
	},
);

function getRenderedContentHeight() {
	const renderedContent = container.value?.querySelector<HTMLElement>('.n8n-markdown');

	return renderedContent ? `${renderedContent.clientHeight}px` : undefined;
}

async function toggleRawMode(value: boolean) {
	if (value) {
		rawMarkdown.value = editor.value?.getMarkdown() ?? props.modelValue;
		rawContentHeight.value = getRenderedContentHeight();
		isRawMode.value = true;
		await nextTick();
		rawEditor.value?.focus();
		return;
	}

	if (editor.value) {
		setEditorContent(editor.value, rawMarkdown.value);
	}

	isRawMode.value = false;
	rawContentHeight.value = undefined;
	await nextTick();
	editor.value?.commands.focus();
}

function updateRawMarkdown(event: Event) {
	const value = (event.target as HTMLTextAreaElement).value;

	rawMarkdown.value = value;
	emit('update:modelValue', value);
	emit('input', value);
}

function handleRawFocus(event: FocusEvent) {
	emit('focus', event);
}

function handleRawBlur(event: FocusEvent) {
	emit('blur', rawMarkdown.value, event);
}

function focus() {
	if (isRawMode.value) {
		rawEditor.value?.focus();
		return;
	}

	editor.value?.commands.focus();
}

function blur() {
	if (isRawMode.value) {
		rawEditor.value?.blur();
		return;
	}

	editor.value?.commands.blur();
}

function getMarkdown() {
	return isRawMode.value ? rawMarkdown.value : (editor.value?.getMarkdown() ?? '');
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
		ref="container"
		:class="[
			'n8n-markdown-editor-container',
			$style.container,
			props.variant === 'ghost' ? $style.ghost : $style.contained,
			props.containerClass,
			props.disabled ? $style.disabled : '',
		]"
		:style="maxHeightStyle"
		data-test-id="n8n-markdown-editor"
	>
		<MarkdownEditorToolbar
			v-if="shouldShowToolbar && editor"
			:editor="editor"
			:disabled="props.disabled || props.readonly"
			:is-raw-mode="isRawMode"
			:mode="toolbarMode"
			:variant="props.variant"
			@update:is-raw-mode="toggleRawMode"
		/>
		<div v-if="isRawMode" :class="[$style.content, shouldPadContentTop ? $style.padTop : '']">
			<textarea
				ref="rawEditor"
				:value="rawMarkdown"
				:class="[$style.rawContent, shouldPadContentTop ? $style.padTop : '']"
				:style="{ '--markdown-editor-raw-height': rawContentHeight }"
				:placeholder="props.placeholder"
				:disabled="props.disabled"
				:readonly="props.readonly"
				data-test-id="n8n-markdown-editor-raw-content"
				@input="updateRawMarkdown"
				@focus="handleRawFocus"
				@blur="handleRawBlur"
			/>
		</div>
		<EditorContent
			v-else
			:editor="editor"
			:class="[$style.content, shouldPadContentTop ? $style.padTop : '']"
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

.ghost {
	--n8n--markdown-editor--background-color: transparent;

	background-color: transparent;
}

.contained {
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

	&.padTop :global(.n8n-markdown) {
		padding-top: calc(var(--height--lg) + var(--spacing--xs));
		scroll-padding-top: calc(var(--height--lg) + var(--spacing--xs));
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

.rawContent {
	display: block;
	box-sizing: border-box;
	width: 100%;
	height: var(--markdown-editor-raw-height, auto);
	min-height: var(--spacing--3xl);
	max-height: var(--markdown-editor-max-height);
	padding: var(--spacing--xs);
	border: 0;
	outline: none;
	resize: none;
	overflow-y: scroll;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	background-color: transparent;
	color: inherit;
	font-family: inherit;
	font-size: var(--input--font-size, inherit);
	line-height: 1.5em;

	&::placeholder {
		color: var(--text-color--subtler);
	}

	&:disabled {
		cursor: not-allowed;
	}

	&.padTop {
		padding-top: calc(var(--height--lg) + var(--spacing--xs));
		scroll-padding-top: calc(var(--height--lg) + var(--spacing--xs));
	}
}
</style>
