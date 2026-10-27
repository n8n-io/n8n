<script setup lang="ts">
/**
 * The tool-call disclosure on a reviewed case.
 *
 * Wraps the chat's own renderer rather than reimplementing it, adapting the
 * persisted blob on the way in. `executionId` and `canFixWithAssistant` are
 * deliberately left unset: an eval result has no execution to fix from, and
 * without them the "Fix with assistant" callout is unreachable.
 */
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import AgentChatToolSteps from './AgentChatToolSteps.vue';

defineProps<{
	toolCalls: ToolCall[];
	projectId?: string;
}>();
</script>

<template>
	<div :class="$style.toolCalls" data-testid="agent-eval-tool-calls">
		<AgentChatToolSteps :tool-calls="toolCalls" :project-id="projectId" />
	</div>
</template>

<style lang="scss" module>
/* The chat renderer carries a bottom margin for its message flow; the row
   controls its own spacing with a flex gap. */
.toolCalls > * {
	margin-bottom: 0;
}
</style>
