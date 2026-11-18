<script setup lang="ts">
import type { TaskBoardTask } from '@n8n/api-types';
import { N8nCard, N8nLink, N8nSpinner, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { RouteLocationRaw } from 'vue-router';

import { CARD_TAG_LIMIT, TASK_DRAG_TYPE } from '../../task-board.constants';
import TaskActor from '../TaskActor/TaskActor.vue';
import TaskSeverityBadge from '../TaskSeverityBadge/TaskSeverityBadge.vue';
import TaskTags from '../TaskTags/TaskTags.vue';
import TaskUsage from '../TaskUsage/TaskUsage.vue';

const props = defineProps<{
	task: TaskBoardTask;
	selected: boolean;
	draggable?: boolean;
	/** An agent works on the task now. */
	working?: boolean;
	/** The page of the task. With it, the task number is a link. */
	to?: RouteLocationRaw;
}>();
const emit = defineEmits<{ select: [] }>();
const i18n = useI18n();

function onDragStart(event: DragEvent) {
	if (!event.dataTransfer) return;
	event.dataTransfer.setData(TASK_DRAG_TYPE, props.task.id);
	event.dataTransfer.effectAllowed = 'move';
}
</script>

<template>
	<N8nCard
		:class="[$style.card, { [$style.selected]: selected, [$style.draggable]: draggable }]"
		:draggable="draggable ? 'true' : undefined"
		role="button"
		tabindex="0"
		:aria-current="selected ? 'true' : undefined"
		data-test-id="task-board-task-card"
		@dragstart="onDragStart"
		@click="emit('select')"
		@keydown.enter.prevent="emit('select')"
		@keydown.space.prevent="emit('select')"
	>
		<div :class="$style.content">
			<div :class="$style.top">
				<!-- A click on the link opens the page. It must not also select the card. -->
				<span v-if="to" @click.stop @keydown.stop>
					<N8nLink :to="to" theme="text" size="xsmall" data-test-id="task-board-task-card-link">
						#{{ task.number }}
					</N8nLink>
				</span>
				<N8nText v-else size="xsmall" color="text-light">#{{ task.number }}</N8nText>
				<TaskSeverityBadge v-if="task.severity" :severity="task.severity" />
			</div>
			<N8nText size="small" bold :class="$style.title">{{ task.title }}</N8nText>
			<TaskTags :tags="task.tags" :limit="CARD_TAG_LIMIT" :class="$style.tags" />
			<div
				v-if="working"
				:class="$style.working"
				role="status"
				data-test-id="task-board-task-working"
			>
				<N8nSpinner type="dots" size="small" />
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('taskBoard.task.agentWorking') }}
				</N8nText>
			</div>
			<div :class="$style.meta">
				<TaskActor :actor="task.assignee" size="xsmall" />
				<N8nText size="xsmall" color="text-light" :class="$style.time">
					<N8nTimeAgo :date="task.updatedAt" />
				</N8nText>
			</div>
			<TaskUsage :usage="task.usage" size="xsmall" />
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	align-items: stretch;

	&:hover:not(.selected) {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		border-color: var(--focus--border-color);
	}
}

.draggable:active {
	cursor: grabbing;
}

.selected {
	background-color: var(--background--active);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	width: 100%;
}

.top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.title {
	overflow-wrap: anywhere;
}

.tags {
	margin-top: var(--spacing--4xs);
}

.working {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
}

.meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
	min-width: 0;
}

.time {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
