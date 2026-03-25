<script lang="ts" setup>
import { computed } from 'vue';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import BuilderCard from './BuilderCard.vue';
import DataTableCard from './DataTableCard.vue';
import ResearchCard from './ResearchCard.vue';
import AgentNodeSection from './AgentNodeSection.vue';
import DelegateCard from './DelegateCard.vue';
import TaskChecklist from './TaskChecklist.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		compact?: boolean;
	}>(),
	{
		compact: false,
	},
);

defineSlots<{
	'after-tool-call'?: (props: { toolCall: InstanceAiToolCallState }) => unknown;
}>();

/** Index tool calls by ID for O(1) lookup and proper reactivity tracking. */
const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});

const store = useInstanceAiStore();

function handlePlanConfirm(tc: InstanceAiToolCallState, approved: boolean, feedback?: string) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved, undefined, undefined, undefined, feedback);
}
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="(entry, idx) in props.agentNode.timeline" :key="idx">
			<!-- Text segment -->
			<div
				v-if="entry.type === 'text'"
				:class="[$style.textContent, props.compact && $style.compactText]"
			>
				<InstanceAiMarkdown :content="entry.content" />
			</div>

			<!-- Tool call -->
			<template v-else-if="entry.type === 'tool-call' && toolCallsById[entry.toolCallId]">
				<TaskChecklist
					v-if="toolCallsById[entry.toolCallId].renderHint === 'tasks'"
					:tasks="props.agentNode.tasks"
				/>
				<DelegateCard
					v-else-if="toolCallsById[entry.toolCallId].renderHint === 'delegate'"
					:args="toolCallsById[entry.toolCallId].args"
					:result="toolCallsById[entry.toolCallId].result"
					:is-loading="toolCallsById[entry.toolCallId].isLoading"
					:tool-call-id="toolCallsById[entry.toolCallId].toolCallId"
				/>
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'builder'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'data-table'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'researcher'" />
				<!-- Answered questions (read-only after resolution) -->
				<AnsweredQuestions
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						!toolCallsById[entry.toolCallId].isLoading
					"
					:tool-call="toolCallsById[entry.toolCallId]"
				/>
				<!-- Plan review: always render inline (interactive while pending, read-only after) -->
				<PlanReviewPanel
					v-else-if="toolCallsById[entry.toolCallId].confirmation?.inputType === 'plan-review'"
					:planned-tasks="
						(toolCallsById[entry.toolCallId].args?.tasks as PlannedTaskArg[] | undefined) ?? []
					"
					:read-only="!toolCallsById[entry.toolCallId].isLoading"
					@approve="handlePlanConfirm(toolCallsById[entry.toolCallId], true)"
					@request-changes="(fb) => handlePlanConfirm(toolCallsById[entry.toolCallId], false, fb)"
				/>
				<!-- Suppress default tool call while questions are pending -->
				<template
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						toolCallsById[entry.toolCallId].isLoading
					"
				/>
				<template v-else>
					<InstanceAiToolCall :tool-call="toolCallsById[entry.toolCallId]" />
					<slot name="after-tool-call" :tool-call="toolCallsById[entry.toolCallId]" />
				</template>
			</template>

			<!-- Child agent -->
			<template v-else-if="entry.type === 'child' && childrenById[entry.agentId]">
				<BuilderCard
					v-if="
						childrenById[entry.agentId].kind === 'builder' ||
						childrenById[entry.agentId].role === 'workflow-builder'
					"
					:agent-node="childrenById[entry.agentId]"
				/>
				<DataTableCard
					v-else-if="
						childrenById[entry.agentId].kind === 'data-table' ||
						childrenById[entry.agentId].role === 'data-table-manager'
					"
					:agent-node="childrenById[entry.agentId]"
				/>
				<ResearchCard
					v-else-if="
						childrenById[entry.agentId].kind === 'researcher' ||
						childrenById[entry.agentId].role === 'web-researcher'
					"
					:agent-node="childrenById[entry.agentId]"
				/>
				<AgentNodeSection v-else :agent-node="childrenById[entry.agentId]" />
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.timeline {
	width: 100%;
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.compactText {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
</style>
