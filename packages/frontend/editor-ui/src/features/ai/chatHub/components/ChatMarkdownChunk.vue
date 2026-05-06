<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import { ref, useCssModule } from 'vue';
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

const styles = useCssModule();
const markdown = useChatHubMarkdownOptions(
	styles.codeBlockActions,
	styles.tableContainer,
	footnoteStyle === 'pill' ? styles.footnoteRef : null,
);
const hoveredCodeBlockActions = ref<HTMLElement | null>(null);

function getHoveredCodeBlockContent() {
	const idx = hoveredCodeBlockActions.value?.getAttribute('data-markdown-token-idx');
	return idx ? markdown.codeBlockContents.value?.get(idx) : undefined;
}

function handleMouseMove(e: MouseEvent | FocusEvent) {
	const container =
		e.target instanceof HTMLElement || e.target instanceof SVGElement
			? e.target.closest('pre')?.querySelector(`.${styles.codeBlockActions}`)
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
		:class="[$style.chatMessageMarkdown, { [$style.singlePre]: singlePre }]"
		:options="markdown.options"
		:plugins="markdown.plugins.value"
		@mousemove="handleMouseMove"
		@mouseleave="handleMouseLeave"
	/>
	<div v-else-if="source.type === 'with-buttons'" :class="$style.container">
		<VueMarkdown
			:key="markdown.forceReRenderKey.value"
			:source="source.content"
			:class="$style.chatMessageMarkdown"
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

<style lang="scss" module>
@use '@n8n/design-system/css/mixins' as ds-mixins;

.container {
	display: flex;
	flex-direction: column;

	> *:first-child > *:first-child {
		margin-top: 0;
	}
}

.chatMessageMarkdown {
	@include ds-mixins.markdown-content;

	pre {
		& .codeBlockActions {
			position: sticky;
			top: var(--markdown--spacing);
			right: var(--markdown--spacing);
			height: 0;
			display: flex;
			justify-content: flex-end;
			pointer-events: none;
			z-index: 1;

			& > * {
				pointer-events: auto;
			}
		}
	}

	&.singlePre pre {
		background: transparent;
		margin: 0;
		border-radius: 0;
	}
	// Footnote pill
	.footnoteRef {
		display: inline-block;
		font-size: var(--font-size--3xs);
		line-height: 1;
		color: var(--color--text);
		background: var(--color--foreground--tint-1);
		border-radius: var(--radius--xl);
		padding: var(--spacing--4xs) var(--spacing--2xs);
		margin-inline: var(--spacing--5xs);
		vertical-align: middle;
		white-space: nowrap;
		font-weight: var(--font-weight--regular);
	}

	// Tables
	.tableContainer {
		width: 100%;
		overflow-x: auto;
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
