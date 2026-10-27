<script setup lang="ts">
import { N8nCodeBlock, N8nMarkdown } from '@n8n/design-system';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
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

const tableContainerClassName = 'n8n-markdown-table-container';
const footnoteRefClassName = footnoteStyle === 'pill' ? 'n8n-markdown-footnote-ref' : null;

const markdown = useChatHubMarkdownOptions(tableContainerClassName, footnoteRefClassName);
</script>

<template>
	<N8nMarkdown
		v-if="source.type === 'text'"
		:content="source.content"
		:class="['n8n-markdown', { 'n8n-markdown--single-pre': singlePre }]"
		:options="markdown.options"
		:plugins="markdown.plugins.value"
	>
		<template #code-block="{ code, language }">
			<N8nCodeBlock :code="code" :language="language || 'auto'" />
		</template>
	</N8nMarkdown>
	<div v-else-if="source.type === 'with-buttons'" :class="$style.container">
		<N8nMarkdown
			:content="source.content"
			class="n8n-markdown"
			:options="markdown.options"
			:plugins="markdown.plugins.value"
		>
			<template #code-block="{ code, language }">
				<N8nCodeBlock :code="code" :language="language || 'auto'" />
			</template>
		</N8nMarkdown>
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
