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
}>();
</script>

<template>
	<AgentTimeline :agent-node="props.agentNode" />
</template>
