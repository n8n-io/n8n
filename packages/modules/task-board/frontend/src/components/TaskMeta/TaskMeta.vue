<script setup lang="ts">
import type { TaskBoardAgentUsage, TaskBoardTask } from '@n8n/api-types';
import { N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TaskActor from '../TaskActor/TaskActor.vue';
import TaskFieldRow from '../TaskFieldRow/TaskFieldRow.vue';
import TaskUsage from '../TaskUsage/TaskUsage.vue';

/** The facts of a task that nobody edits: what its agent runs used, who made it, and when. */
const props = defineProps<{
	task: TaskBoardTask;
	usageByAgent: TaskBoardAgentUsage[];
}>();
const i18n = useI18n();

/** The agent that used the most tokens comes first. */
const agents = computed(() =>
	[...props.usageByAgent].sort((a, b) => b.totalTokens - a.totalTokens),
);
</script>

<template>
	<div :class="$style.meta" data-test-id="task-board-task-meta">
		<TaskFieldRow :label="i18n.baseText('taskBoard.usage.label')">
			<TaskUsage v-if="task.usage.totalTokens > 0" :usage="task.usage" size="small" />
			<N8nText v-else size="small" color="text-light" data-test-id="task-board-task-no-usage">
				{{ i18n.baseText('taskBoard.usage.empty') }}
			</N8nText>
			<ul v-if="agents.length > 0" :class="$style.agents" data-test-id="task-board-usage-by-agent">
				<li
					v-for="agent in agents"
					:key="agent.agentId"
					:class="$style.agent"
					data-test-id="task-board-agent-usage"
				>
					<span :class="$style.agentName">
						<N8nIcon icon="bot" size="small" color="text-light" />
						<N8nText size="xsmall" color="text-base" :class="$style.ellipsis">
							{{ agent.agentName }}
						</N8nText>
						<N8nText size="xsmall" color="text-light" :class="$style.runs">
							{{
								i18n.baseText('taskBoard.usage.runs', {
									adjustToNumber: agent.runs,
									interpolate: { count: agent.runs },
								})
							}}
						</N8nText>
					</span>
					<TaskUsage :usage="agent" size="xsmall" />
				</li>
			</ul>
		</TaskFieldRow>
		<TaskFieldRow :label="i18n.baseText('taskBoard.task.createdBy')">
			<TaskActor :actor="task.createdBy" size="small" />
		</TaskFieldRow>
		<TaskFieldRow :label="i18n.baseText('taskBoard.task.created')">
			<N8nText size="small" color="text-base"><N8nTimeAgo :date="task.createdAt" /></N8nText>
		</TaskFieldRow>
		<TaskFieldRow :label="i18n.baseText('taskBoard.task.updated')">
			<N8nText size="small" color="text-base"><N8nTimeAgo :date="task.updatedAt" /></N8nText>
		</TaskFieldRow>
	</div>
</template>

<style lang="scss" module>
.meta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.agents {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0 0 var(--spacing--3xs);
	list-style: none;
}

.agent {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	justify-content: space-between;
	column-gap: var(--spacing--2xs);
	min-width: 0;
}

.agentName {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.runs {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
