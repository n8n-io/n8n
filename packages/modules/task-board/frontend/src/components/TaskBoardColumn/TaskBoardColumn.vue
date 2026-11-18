<script setup lang="ts">
import type { TaskBoardColumn, TaskBoardTask } from '@n8n/api-types';
import {
	N8nBadge,
	N8nHeading,
	N8nIcon,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import { TASK_DRAG_TYPE } from '../../task-board.constants';
import { isAgentWorking } from '../../task-board.utils';
import TaskCard from '../TaskCard/TaskCard.vue';

defineProps<{
	column: TaskBoardColumn;
	tasks: TaskBoardTask[];
	selectedTaskId: string | undefined;
}>();
const emit = defineEmits<{ select: [taskId: string]; dropTask: [taskId: string] }>();
const i18n = useI18n();

const isDropTarget = ref(false);

function carriesTask(event: DragEvent) {
	return event.dataTransfer?.types.includes(TASK_DRAG_TYPE) === true;
}

// A drop is only possible when `dragover` is cancelled, so other drags stay refused.
function onDragOver(event: DragEvent) {
	if (!carriesTask(event) || !event.dataTransfer) return;
	event.preventDefault();
	event.dataTransfer.dropEffect = 'move';
	isDropTarget.value = true;
}

// `dragleave` also fires when the pointer moves onto a child of the column.
function onDragLeave(event: DragEvent) {
	const { currentTarget, relatedTarget } = event;
	if (
		currentTarget instanceof Node &&
		relatedTarget instanceof Node &&
		currentTarget.contains(relatedTarget)
	) {
		return;
	}
	isDropTarget.value = false;
}

function onDrop(event: DragEvent) {
	isDropTarget.value = false;
	const taskId = event.dataTransfer?.getData(TASK_DRAG_TYPE);
	if (!taskId) return;
	event.preventDefault();
	emit('dropTask', taskId);
}
</script>

<template>
	<section
		:class="[
			$style.column,
			{ [$style.needsInput]: column.role === 'needs_input', [$style.dropTarget]: isDropTarget },
		]"
		:aria-label="column.name"
		:data-role="column.role ?? undefined"
		data-test-id="task-board-column"
		@dragover="onDragOver"
		@dragleave="onDragLeave"
		@drop="onDrop"
	>
		<header :class="$style.header">
			<N8nHeading tag="h3" size="small" bold :class="$style.name">{{ column.name }}</N8nHeading>
			<N8nTooltip
				v-if="column.role === 'needs_input'"
				:content="i18n.baseText('taskBoard.column.needsInputHint')"
			>
				<N8nIcon icon="message-circle" size="small" color="warning" />
			</N8nTooltip>
			<N8nBadge :variant="column.role === 'needs_input' && tasks.length > 0 ? 'warning' : 'subtle'">
				{{ tasks.length }}
			</N8nBadge>
		</header>
		<N8nScrollArea :class="$style.scroll" type="hover">
			<ul :class="$style.list">
				<li v-for="task in tasks" :key="task.id">
					<TaskCard
						:task="task"
						:selected="task.id === selectedTaskId"
						:working="isAgentWorking(task, column)"
						draggable
						@select="emit('select', task.id)"
					/>
				</li>
			</ul>
			<N8nText v-if="tasks.length === 0" size="small" color="text-light" :class="$style.empty">
				{{ i18n.baseText('taskBoard.column.empty') }}
			</N8nText>
		</N8nScrollArea>
	</section>
</template>

<style lang="scss" module>
.column {
	display: flex;
	flex-direction: column;
	flex: 0 0 auto;
	/* Columns keep one width so that a board reads as a grid. No token is this wide. */
	width: 18rem;
	min-height: 0;
	max-height: 100%;
	border-radius: var(--radius--lg);
	background-color: var(--background--subtle);
	border: var(--border-width) solid transparent;
}

.needsInput {
	border-color: var(--callout--border-color--warning);
}

.dropTarget {
	border-color: var(--color--primary);
	background-color: var(--background--hover);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--2xs);
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.scroll {
	flex: 1;
	min-height: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
	list-style: none;
}

.empty {
	display: block;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}
</style>
