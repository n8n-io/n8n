<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/vue-3';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import { computed, nextTick, ref, watch } from 'vue';

import { useMarkdownEditor } from './composables/useMarkdownEditor';
import type { N8nMarkdownEditorEmits, N8nMarkdownEditorProps } from './MarkdownEditor.types';
import MarkdownEditorToolbar from './MarkdownEditorToolbar.vue';
import { setEditorContent } from './markdownEditorUtils';
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nTooltip from '../N8nTooltip';

const COLLAPSED_MAX_HEIGHT_OVERRIDE = 256;

const props = withDefaults(defineProps<N8nMarkdownEditorProps>(), {
	modelValue: '',
	variant: 'contained',
	placeholder: '',
	disabled: false,
	readonly: false,
	showToolbar: 'always',
	maxHeight: '480px',
	isCollapsible: false,
	containerClass: '',
});

const emit = defineEmits<N8nMarkdownEditorEmits>();

const collapsed = ref(true);
const { t } = useI18n();
const explicitHeight = ref<string>();

const maxHeight = computed(() =>
	typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
);

const containerHeightStyle = computed(() =>
	explicitHeight.value ? { height: explicitHeight.value } : undefined,
);
const expandButtonLabel = computed(() =>
	collapsed.value ? t('markdownEditor.expand') : t('markdownEditor.collapse'),
);
const expandButtonIcon = computed(() => (collapsed.value ? 'arrow-down' : 'arrow-up'));

const shouldShowInlineToolbar = computed(() => ['always', 'hover'].includes(props.showToolbar));
const toolbarMode = computed(() => (props.showToolbar === 'always' ? 'always' : 'hover'));
const shouldPadContentTop = computed(() => props.showToolbar === 'always');

const editor = useMarkdownEditor(props, emit);
const isRawMode = ref(false);
const rawMarkdown = ref(props.modelValue);
const container = ref<HTMLElement>();
const rawEditor = ref<HTMLTextAreaElement>();
const rawContentHeight = ref<string>();

function getScrollableElement() {
	return isRawMode.value
		? rawEditor.value
		: container.value?.querySelector<HTMLElement>('.n8n-markdown');
}

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

function getBubbleMenuContainer() {
	return document.body;
}

const contentExceedsCollapsedHeight = ref(false);
const expandedContentHeight = ref(COLLAPSED_MAX_HEIGHT_OVERRIDE);
const shouldBeCollapsable = computed(function getShouldBeCollapsable() {
	return props.isCollapsible && contentExceedsCollapsedHeight.value;
});

watch(
	[
		container,
		editor,
		isRawMode,
		rawMarkdown,
		function getModelValue() {
			return props.modelValue;
		},
		function getIsCollapsible() {
			return props.isCollapsible;
		},
		function getShowToolbar() {
			return props.showToolbar;
		},
	],
	function observeContentHeight(_value, _oldValue, onCleanup) {
		if (!props.isCollapsible || !container.value) {
			contentExceedsCollapsedHeight.value = false;
			return;
		}
		const root = container.value;

		function updateContentHeight() {
			const scrollable = getScrollableElement();
			if (!scrollable) {
				contentExceedsCollapsedHeight.value = false;
				return;
			}

			const { height, maxHeight } = scrollable.style;
			const { scrollTop } = scrollable;

			/** Measure the content without the fixed textarea or transition height. */
			scrollable.style.height = isRawMode.value ? '0' : 'auto';
			scrollable.style.maxHeight = 'none';
			expandedContentHeight.value = scrollable.scrollHeight;
			contentExceedsCollapsedHeight.value =
				expandedContentHeight.value > COLLAPSED_MAX_HEIGHT_OVERRIDE;
			scrollable.style.height = height;
			scrollable.style.maxHeight = maxHeight;
			scrollable.scrollTop = scrollTop;
		}

		const resizeObserver = new ResizeObserver(updateContentHeight);
		function observeContentElements() {
			resizeObserver.disconnect();
			resizeObserver.observe(root);
			const scrollable = getScrollableElement();
			if (scrollable) {
				resizeObserver.observe(scrollable);
				for (const child of scrollable.children) {
					resizeObserver.observe(child);
				}
			}
			updateContentHeight();
		}

		/** Tiptap inserts the editor DOM after the parent component renders. */
		const mutationObserver = new MutationObserver(observeContentElements);
		mutationObserver.observe(root, { childList: true, characterData: true, subtree: true });
		observeContentElements();

		onCleanup(function stopObservingContent() {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		});
	},
	{ flush: 'post', immediate: true },
);

/** Override maxHeight for collapsible state to ensure we properly trim the content */
const setMaxHeight = computed(function getMaxHeightStyle() {
	if (!props.isCollapsible) return `--markdown-editor-max-height: ${maxHeight.value}`;

	const collapsibleMaxHeight = collapsed.value
		? `${COLLAPSED_MAX_HEIGHT_OVERRIDE}px`
		: `${expandedContentHeight.value}px`;
	return `--markdown-editor-max-height: ${collapsibleMaxHeight}`;
});

function hasHeightTransition(element: HTMLElement) {
	const styles = window.getComputedStyle(element);
	const properties = styles.transitionProperty.split(',').map(function trimProperty(property) {
		return property.trim();
	});
	const durations = styles.transitionDuration.split(',').map(function parseDuration(duration) {
		const value = Number.parseFloat(duration);
		return duration.trim().endsWith('ms') ? value : value * 1000;
	});

	return properties.some(function isActiveHeightTransition(property, index) {
		const duration = durations[index % durations.length];
		return (property === 'height' || property === 'all') && duration > 0;
	});
}

async function toggleCollapsed() {
	const transitionElement = container.value;
	const scrollable = getScrollableElement();
	if (!transitionElement || !scrollable) return;

	explicitHeight.value = `${transitionElement.getBoundingClientRect().height}px`;
	await nextTick();
	void transitionElement.offsetHeight;

	collapsed.value = !collapsed.value;
	emit('update:collapsed', collapsed.value);
	await nextTick();

	const contentTargetHeight = collapsed.value
		? scrollable.getBoundingClientRect().height
		: scrollable.scrollHeight;
	if (isRawMode.value) {
		rawContentHeight.value = `${contentTargetHeight}px`;
		await nextTick();
	}

	explicitHeight.value = `${transitionElement.scrollHeight}px`;
	if (!hasHeightTransition(transitionElement)) {
		explicitHeight.value = undefined;
	}
}

function onHeightTransitionEnd(event: TransitionEvent) {
	if (event.propertyName === 'height' && event.target === container.value) {
		explicitHeight.value = undefined;
	}
}

const bubbleMenuOptions = computed(function getBubbleMenuOptions() {
	return {
		placement: 'top' as const,
		offset: 8,
		flip: true,
		shift: true,
		scrollTarget: container.value?.querySelector<HTMLElement>('.n8n-markdown') ?? undefined,
	};
});

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
			shouldBeCollapsable && collapsed ? $style.collapsed : '',
		]"
		:style="[setMaxHeight, containerHeightStyle]"
		data-test-id="n8n-markdown-editor"
		@transitionend="onHeightTransitionEnd"
	>
		<div
			v-if="isRawMode"
			data-markdown-editor-content-wrapper
			:class="[$style.content, shouldPadContentTop ? $style.padTop : '']"
		>
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
			data-markdown-editor-content-wrapper
			:editor="editor"
			:class="[$style.content, shouldPadContentTop ? $style.padTop : '']"
		/>
		<MarkdownEditorToolbar
			v-if="shouldShowInlineToolbar && editor"
			:editor="editor"
			:disabled="props.disabled || props.readonly"
			:is-raw-mode="isRawMode"
			:mode="toolbarMode"
			:variant="props.variant"
			@update:is-raw-mode="toggleRawMode"
		/>
		<BubbleMenu
			v-if="props.showToolbar === 'floating' && editor && !isRawMode"
			:editor="editor"
			:options="bubbleMenuOptions"
			:append-to="getBubbleMenuContainer"
			:class="$style.bubbleMenu"
		>
			<MarkdownEditorToolbar
				:editor="editor"
				:disabled="props.disabled || props.readonly"
				:is-raw-mode="false"
				mode="floating"
				:variant="props.variant"
				@update:is-raw-mode="toggleRawMode"
			/>
		</BubbleMenu>
		<div v-if="shouldBeCollapsable" :class="$style.expandButtonContainer">
			<N8nTooltip :content="expandButtonLabel">
				<N8nButton
					size="small"
					:icon="expandButtonIcon"
					icon-only
					icon-size="medium"
					variant="subtle"
					:class="$style.expandButton"
					:aria-label="expandButtonLabel"
					@click="toggleCollapsed"
				/>
			</N8nTooltip>
		</div>
	</div>
</template>

<style lang="scss">
@use '../../css/markdown.scss';
</style>

<style lang="scss" module>
@use '../../css/common/var';
@use '../../css/mixins/focus';
@use '../../css/mixins/motion';
@use '../../css/mixins/mixins' as scrollMixins;

.bubbleMenu {
	z-index: var.$index-popper;
}

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
	box-shadow: var(--input--shadow), var(--input--border--shadow);

	@include focus.focus-within-ring;

	&:hover:not(.disabled):not(:focus-within) {
		box-shadow: var(--input--shadow--hover), var(--input--border--shadow--hover);
	}

	&:focus-within {
		box-shadow: var(--input--shadow--focus), var(--input--border--shadow--focus);
	}
}
.content {
	@include motion.max-height-transition;
	height: 100%;
	max-height: var(--markdown-editor-max-height);
	overflow: hidden;
	flex: 1;

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

	:global(.n8n-markdown .is-editor-empty::before) {
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

.collapsed {
	@include scrollMixins.scroll-mask(bottom);
	overflow-y: hidden;

	> *,
	:global(.n8n-markdown) {
		overflow-y: hidden;
	}
}

.expandButtonContainer {
	display: grid;
	place-items: center;
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 2;
	padding: var(--spacing--xs);
	pointer-events: none;
}

.expandButton {
	opacity: 0;
	pointer-events: auto;
	background-color: var(--color--neutral-black);
	color: var(--color--neutral-white);

	--button--color--background: var(--color--neutral-black);
	--button--color: var(--color--neutral-white);

	&:hover {
		background-color: color-mix(
			in oklch,
			var(--color--neutral-black) 90%,
			var(--color--neutral-white) 10%
		);
	}
}
.collapsed .expandButton {
	opacity: 1;
	pointer-events: auto;
}

.container:hover .expandButton {
	opacity: 1;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}

.rawContent {
	@include motion.max-height-transition;
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
