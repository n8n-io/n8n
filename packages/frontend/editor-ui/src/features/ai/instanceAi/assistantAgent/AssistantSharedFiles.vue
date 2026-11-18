<script setup lang="ts">
import { computed } from 'vue';

import AgentChatMessageAttachments from '@/features/agents/components/AgentChatMessageAttachments.vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { ASSISTANT_AGENT_ID } from './assistantAgentThreads';
import { getSharedFiles } from './assistantSharedFiles';

const props = defineProps<{ toolCall: ToolCall }>();

const files = computed(() => getSharedFiles(props.toolCall));
</script>

<template>
	<!-- The chat panel provides the download URLs of the system channel, so no project is needed. -->
	<AgentChatMessageAttachments
		v-if="files.length"
		:attachments="files"
		project-id=""
		:agent-id="ASSISTANT_AGENT_ID"
		data-testid="assistant-shared-files"
	/>
</template>
