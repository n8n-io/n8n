<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import AgentTimeline from './AgentTimeline.vue';

/**
 * Root agent activity renderer. Thinking-trace grouping and collapsing is
 * handled inside AgentTimeline (see buildTimelineBlocks), so live and
 * completed runs render identically.
 */
const props = defineProps<{
	agentNode: InstanceAiAgentNode;
	/** The message this tree belongs to — cards act only on the latest turn. */
	messageId?: string;
	/** The run this tree belongs to — cards append their facts to it. */
	runId?: string;
}>();
</script>

<template>
	<AgentTimeline
		:agent-node="props.agentNode"
		:message-id="props.messageId"
		:run-id="props.runId"
	/>
</template>
