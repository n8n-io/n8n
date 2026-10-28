<script lang="ts" setup>
import ChatMarkdown from '@/features/ai/shared/components/ChatMarkdown/ChatMarkdown.vue';
import type { AgentTestTarget } from '@/features/agents/utils/agentTestUrl';
import { inject } from 'vue';
import { useThread } from '../instanceAi.store';
defineProps<{ content: string; streaming?: boolean; agentPreviewTarget?: AgentTestTarget }>();
const thread = useThread();
const openWorkflowPreview = inject<((id: string) => boolean) | undefined>(
	'openWorkflowPreview',
	undefined,
);
const openDataTablePreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openDataTablePreview',
	undefined,
);
const openAgentPreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openAgentPreview',
	undefined,
);
const openAgentChatPreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openAgentChatPreview',
	undefined,
);
</script>
<template>
	<ChatMarkdown
		:content="content"
		:streaming="streaming"
		:resources="[...thread.resourceNameIndex.values()]"
		:linkable-resources="[...thread.linkableResourceNameIndex.values()]"
		:agent-preview-target="agentPreviewTarget"
		:open-workflow-preview="openWorkflowPreview"
		:open-data-table-preview="openDataTablePreview"
		:open-agent-preview="openAgentPreview"
		:open-agent-chat-preview="openAgentChatPreview"
		:options="{ math: true, footnotes: 'pill' }"
		:filter-internal-blocks="true"
	/>
</template>
