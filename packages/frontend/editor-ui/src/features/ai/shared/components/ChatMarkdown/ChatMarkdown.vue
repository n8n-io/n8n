<script setup lang="ts">
import { N8nMarkdown } from '@n8n/design-system';
import { ref } from 'vue';
import type { PluginSimple } from 'markdown-it';
import { useChatMarkdownOptions, type ChatMarkdownOptions } from './useChatMarkdownOptions';

const {
	content,
	options = {},
	singlePre = false,
	plugins = [],
} = defineProps<{
	content: string;
	options?: ChatMarkdownOptions;
	singlePre?: boolean;
	plugins?: PluginSimple[];
}>();
const markdown = useChatMarkdownOptions(options);
const hoveredCodeBlockActions = ref<HTMLElement | null>(null);

function handleMouseMove(event: MouseEvent | FocusEvent) {
	const container =
		event.target instanceof Element
			? event.target.closest('pre')?.querySelector('.n8n-markdown-code-block-actions')
			: null;
	hoveredCodeBlockActions.value = container instanceof HTMLElement ? container : null;
}

function handleMouseLeave() {
	hoveredCodeBlockActions.value = null;
}

function getHoveredCodeBlockContent() {
	const index = hoveredCodeBlockActions.value?.getAttribute('data-markdown-token-idx');
	return index ? markdown.codeBlockContents.value?.get(index) : undefined;
}

defineExpose({ hoveredCodeBlockActions, getHoveredCodeBlockContent });
</script>

<template>
	<N8nMarkdown
		:key="markdown.forceReRenderKey.value"
		:content="content"
		class="n8n-markdown"
		:class="{ 'n8n-markdown--single-pre': singlePre }"
		:options="markdown.options"
		:plugins="[...markdown.plugins.value, ...plugins]"
		@mousemove="handleMouseMove"
		@focusin="handleMouseMove"
		@mouseleave="handleMouseLeave"
		@focusout="handleMouseLeave"
	/>
</template>

<style lang="scss">
@use '@n8n/design-system/css/markdown.scss';
</style>

<style scoped>
.n8n-markdown {
	--n8n-markdown--font-size--base: var(--chat--font-size);
	font-size: var(--n8n-markdown--font-size--base);
}
.n8n-markdown :deep(.n8n-markdown-footnote-block) {
	display: none;
}
</style>
