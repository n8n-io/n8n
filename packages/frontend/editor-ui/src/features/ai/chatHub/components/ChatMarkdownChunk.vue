<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import { ref } from 'vue';
import type { ChatMessageContentChunk } from '@n8n/api-types';
import ChatButtons from './ChatButtons.vue';

const {
	source,
	singlePre = false,
	isButtonsDisabled = false,
	footnoteStyle = 'pill',
} = defineProps<{
	source: ChatMessageContentChunk;
	singlePre?: boolean;
	isButtonsDisabled?: boolean;
	footnoteStyle?: 'pill' | 'normal';
}>();

const emit = defineEmits<{ openArtifact: [title: string] }>();

const codeBlockActionsClassName = 'n8n-markdown-code-block-actions';
const tableContainerClassName = 'n8n-markdown-table-container';
const footnoteRefClassName = footnoteStyle === 'pill' ? 'n8n-markdown-footnote-ref' : null;

const markdown = useChatHubMarkdownOptions(
	codeBlockActionsClassName,
	tableContainerClassName,
	footnoteRefClassName,
);
const hoveredCodeBlockActions = ref<HTMLElement | null>(null);

function getHoveredCodeBlockContent() {
	const idx = hoveredCodeBlockActions.value?.getAttribute('data-markdown-token-idx');
	return idx ? markdown.codeBlockContents.value?.get(idx) : undefined;
}

function handleMouseMove(e: MouseEvent | FocusEvent) {
	const container =
		e.target instanceof HTMLElement || e.target instanceof SVGElement
			? e.target.closest('pre')?.querySelector(`.${codeBlockActionsClassName}`)
			: null;

	hoveredCodeBlockActions.value = container instanceof HTMLElement ? container : null;
}

function handleMouseLeave() {
	hoveredCodeBlockActions.value = null;
}

defineExpose({
	hoveredCodeBlockActions,
	getHoveredCodeBlockContent,
});
</script>

<template>
	<VueMarkdown
		v-if="source.type === 'text'"
		:key="markdown.forceReRenderKey.value"
		:source="source.content"
		:class="['n8n-markdown', { 'n8n-markdown--single-pre': singlePre }]"
		:options="markdown.options"
		:plugins="markdown.plugins.value"
		@mousemove="handleMouseMove"
		@mouseleave="handleMouseLeave"
	/>
	<div v-else-if="source.type === 'with-buttons'" :class="$style.container">
		<VueMarkdown
			:key="markdown.forceReRenderKey.value"
			:source="source.content"
			class="n8n-markdown"
			:options="markdown.options"
			:plugins="markdown.plugins.value"
			@mousemove="handleMouseMove"
			@mouseleave="handleMouseLeave"
		/>
		<ChatButtons :buttons="source.buttons" :is-disabled="isButtonsDisabled" />
	</div>
	<div v-else-if="source.type === 'hidden'" />
	<button
		v-else-if="source.type === 'artifact-edit' && !source.isIncomplete"
		:class="$style.command"
		@click="emit('openArtifact', source.command.title)"
	>
		Updated <b>{{ source.command.title }}</b>
	</button>
	<button
		v-else-if="source.type === 'artifact-create' && !source.isIncomplete"
		:class="$style.command"
		@click="emit('openArtifact', source.command.title)"
	>
		Created <b>{{ source.command.title }}</b>
	</button>
</template>

<style lang="scss">
@use '@n8n/design-system/css/markdown.scss';
</style>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;

	> *:first-child > *:first-child {
		margin-top: 0;
	}
}

.command {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
	background-color: transparent;
	display: block;
	width: 100%;
	text-align: left;
	font-weight: var(--font-weight--regular);
	cursor: pointer;
}
</style>
