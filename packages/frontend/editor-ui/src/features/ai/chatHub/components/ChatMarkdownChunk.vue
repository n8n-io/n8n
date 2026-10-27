<script setup lang="ts">
import ChatMarkdown from '@/features/ai/shared/components/ChatMarkdown/ChatMarkdown.vue';
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
</script>

<template>
	<ChatMarkdown
		v-if="source.type === 'text'"
		:content="source.content"
		:single-pre="singlePre"
		:options="{ math: true, footnotes: footnoteStyle }"
	/>
	<div v-else-if="source.type === 'with-buttons'" :class="$style.container">
		<ChatMarkdown :content="source.content" :options="{ math: true, footnotes: footnoteStyle }" />
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

.n8n-markdown .n8n-markdown-footnote-block {
	display: none;
}
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
