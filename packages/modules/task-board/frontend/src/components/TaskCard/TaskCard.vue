<script setup lang="ts">
import type { TaskBoardTask } from '@n8n/api-types';
import { N8nCard, N8nSpinner, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { TASK_DRAG_TYPE } from '../../task-board.constants';
import TaskActor from '../TaskActor/TaskActor.vue';

const props = defineProps<{
	task: TaskBoardTask;
	selected: boolean;
	draggable?: boolean;
	/** An agent works on the task now. */
	working?: boolean;
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
			<N8nText size="xsmall" color="text-light">#{{ task.number }}</N8nText>
			<N8nText size="small" bold :class="$style.title">{{ task.title }}</N8nText>
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

.title {
	overflow-wrap: anywhere;
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
