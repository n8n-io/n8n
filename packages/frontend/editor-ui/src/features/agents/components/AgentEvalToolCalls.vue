<script setup lang="ts">
/**
 * The tool-call disclosure on a reviewed case.
 *
 * Wraps the chat's own renderer rather than reimplementing it, adapting the
 * persisted blob on the way in. `executionId` and `canFixWithAssistant` are
 * deliberately left unset: an eval result has no execution to fix from, and
 * without them the "Fix with assistant" callout is unreachable.
 */
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { EvalDisplayToolCall } from '../utils/agent-eval-tool-calls';

import AgentChatToolSteps from './AgentChatToolSteps.vue';

const props = defineProps<{
	toolCalls: EvalDisplayToolCall[];
	projectId?: string;
}>();

const i18n = useI18n();
const displayCalls = computed(() =>
	props.toolCalls.map((call) => {
		if (
			!call.mocked ||
			!call.interceptedRequests?.length ||
			call.state !== TOOL_CALL_STATE.RUNNING
		) {
			return call;
		}
		return {
			...call,
			displaySummary: i18n.baseText('agents.builder.agentEvals.checks.mockedRequestRunning', {
				adjustToNumber: call.interceptedRequests.length,
			}),
		};
	}),
);
const additionalData = computed(() =>
	Object.fromEntries(
		props.toolCalls
			.filter((call) => call.mocked && call.interceptedRequests?.length)
			.map((call) => [
				call.toolCallId,
				[
					{
						label: i18n.baseText('agents.builder.agentEvals.checks.mockedRequests'),
						value: call.interceptedRequests,
					},
				],
			]),
	),
);
</script>

<template>
	<div :class="$style.toolCalls" data-testid="agent-eval-tool-calls">
		<AgentChatToolSteps
			:tool-calls="displayCalls"
			:additional-data="additionalData"
			:project-id="projectId"
		/>
	</div>
</template>

<style lang="scss" module>
/* The chat renderer carries a bottom margin for its message flow; the row
   controls its own spacing with a flex gap. */
.toolCalls > * {
	margin-bottom: 0;
}
</style>
