<script lang="ts" setup>
import { computed } from 'vue';
import type { InstanceAiAgentNode, InstanceAiTaskRun, InstanceAiToolCallState } from '@n8n/api-types';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import BuilderCard from './BuilderCard.vue';
import DataTableCard from './DataTableCard.vue';
import ResearchCard from './ResearchCard.vue';
import AgentNodeSection from './AgentNodeSection.vue';
import DelegateCard from './DelegateCard.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		compact?: boolean;
		messageGroupId?: string | null;
	}>(),
	{
		compact: false,
		messageGroupId: null,
	},
);

defineSlots<{
	'after-tool-call'?: (props: { toolCall: InstanceAiToolCallState }) => unknown;
}>();

const store = useInstanceAiStore();

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

const visibleTimeline = computed(() =>
	props.agentNode.timeline.map((entry, index) => ({ entry, index })),
);

function getTaskRunForChild(agentNode: InstanceAiAgentNode): InstanceAiTaskRun | null {
	return (
		store.getTaskRun(agentNode.taskId) ??
		store.currentTaskRuns.find((taskRun) => taskRun.agentId === agentNode.agentId) ??
		null
	);
}

function isRenderableTaskRun(taskRun: InstanceAiTaskRun): boolean {
	return (
		taskRun.kind === 'workflow-build' ||
		taskRun.kind === 'data-table' ||
		taskRun.kind === 'research'
	);
}

const renderedTaskRunIds = computed(() => {
	const taskIds = new Set<string>();

	for (const child of props.agentNode.children) {
		const taskRun = getTaskRunForChild(child);
		if (taskRun) {
			taskIds.add(taskRun.taskId);
			continue;
		}

		if (child.taskId) {
			taskIds.add(child.taskId);
		}
	}

	return taskIds;
});

const orphanTaskRuns = computed(() => {
	if (!props.messageGroupId) return [];

	return store
		.getTaskRunsForMessageGroup(props.messageGroupId)
		.filter(
			(taskRun) =>
				isRenderableTaskRun(taskRun) && !renderedTaskRunIds.value.has(taskRun.taskId),
		);
});
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="{ entry, index } in visibleTimeline" :key="index">
			<!-- Text segment -->
			<div
				v-if="entry.type === 'text'"
				:class="[$style.textContent, props.compact && $style.compactText]"
			>
				<InstanceAiMarkdown :content="entry.content" />
			</div>

			<!-- Tool call -->
			<template v-else-if="entry.type === 'tool-call' && toolCallsById[entry.toolCallId]">
				<template
					v-if="
						toolCallsById[entry.toolCallId].renderHint === 'tasks' ||
						toolCallsById[entry.toolCallId].renderHint === 'plan'
					"
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
						:task-run="getTaskRunForChild(childrenById[entry.agentId])"
					/>
					<DataTableCard
						v-else-if="
							childrenById[entry.agentId].kind === 'data-table' ||
							childrenById[entry.agentId].role === 'data-table-manager'
						"
						:agent-node="childrenById[entry.agentId]"
						:task-run="getTaskRunForChild(childrenById[entry.agentId])"
					/>
					<ResearchCard
						v-else-if="
							childrenById[entry.agentId].kind === 'researcher' ||
							childrenById[entry.agentId].role === 'web-researcher'
						"
						:agent-node="childrenById[entry.agentId]"
						:task-run="getTaskRunForChild(childrenById[entry.agentId])"
					/>
					<AgentNodeSection v-else :agent-node="childrenById[entry.agentId]" />
				</template>
			</template>

			<template v-for="taskRun in orphanTaskRuns" :key="taskRun.taskId">
				<BuilderCard v-if="taskRun.kind === 'workflow-build'" :task-run="taskRun" />
				<DataTableCard v-else-if="taskRun.kind === 'data-table'" :task-run="taskRun" />
				<ResearchCard v-else-if="taskRun.kind === 'research'" :task-run="taskRun" />
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
	color: var(--color--text);
}

.compactText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
