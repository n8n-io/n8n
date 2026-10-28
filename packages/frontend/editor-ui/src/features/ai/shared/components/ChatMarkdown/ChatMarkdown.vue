<script setup lang="ts">
import { N8nCodeBlock, N8nMarkdown } from '@n8n/design-system';
import ChatResourceLink from './ChatResourceLink.vue';
import { computed } from 'vue';
import type { PluginSimple } from 'markdown-it';
import { decorateResourceNames, type ChatResource } from './ChatMarkdown.utils';
import type { AgentTestTarget } from '@/features/agents/utils/agentTestUrl';
import { useChatMarkdownOptions, type ChatMarkdownOptions } from './useChatMarkdownOptions';

const props = withDefaults(
	defineProps<{
		content: string;
		options?: ChatMarkdownOptions;
		singlePre?: boolean;
		plugins?: PluginSimple[];
		streaming?: boolean;
		filterInternalBlocks?: boolean;
		resources?: readonly ChatResource[];
		linkableResources?: readonly ChatResource[];
		agentPreviewTarget?: AgentTestTarget;
		openWorkflowPreview?: (id: string) => boolean;
		openDataTablePreview?: (id: string, projectId: string) => boolean;
		openAgentPreview?: (id: string, projectId: string) => boolean;
		openAgentChatPreview?: (id: string, projectId: string) => boolean;
	}>(),
	{ options: () => ({}), singlePre: false },
);
const processedContent = computed(() => {
	const content = props.filterInternalBlocks
		? props.content
				.replace(
					/<(planning-blueprint|planned-task-follow-up|background-task-completed|running-tasks)\b[^>]*>[\s\S]*?<\/\1>/g,
					'',
				)
				.trim()
		: props.content;
	return props.streaming ? content : decorateResourceNames(content, props.linkableResources ?? []);
});
const markdown = useChatMarkdownOptions(() => props.options);
</script>

<template>
	<N8nMarkdown
		:content="processedContent"
		class="n8n-markdown"
		:class="{ 'n8n-markdown--single-pre': props.singlePre }"
		:options="markdown.options"
		:plugins="[...markdown.plugins.value, ...(props.plugins ?? [])]"
	>
		<template #link="link">
			<ChatResourceLink
				v-bind="link"
				:resources="props.resources"
				:agent-preview-target="props.agentPreviewTarget"
				:open-workflow-preview="props.openWorkflowPreview"
				:open-data-table-preview="props.openDataTablePreview"
				:open-agent-preview="props.openAgentPreview"
				:open-agent-chat-preview="props.openAgentChatPreview"
			/>
		</template>
		<template #code-block="{ code, language }">
			<N8nCodeBlock :code="code" :language="language || 'auto'" />
		</template>
	</N8nMarkdown>
</template>

<style lang="scss">
@use '@n8n/design-system/css/markdown.scss';
</style>

<style scoped>
.n8n-markdown :deep(.n8n-markdown-footnote-block) {
	display: none;
}
</style>
