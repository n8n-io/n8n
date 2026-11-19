<script setup lang="ts">
import { useTaskBoardView } from './useTaskBoardView';
import CreateTaskDialog from '../../components/CreateTaskDialog/CreateTaskDialog.vue';
import TaskBoardColumn from '../../components/TaskBoardColumn/TaskBoardColumn.vue';
import TaskBoardHeader from '../../components/TaskBoardHeader/TaskBoardHeader.vue';
import TaskPanelLayout from '../../components/TaskPanelLayout/TaskPanelLayout.vue';

const {
	board,
	columns,
	tasksByColumnId,
	assigneeItems,
	tagSuggestions,
	taskLocation,
	selectedTaskId,
	selectTask,
	moveTask,
	createDialogOpen,
	creatingTask,
	createTask,
} = useTaskBoardView();
</script>

<template>
	<TaskPanelLayout v-if="board" data-test-id="task-board-view">
		<TaskBoardHeader :board="board" @new-task="createDialogOpen = true" />
		<div :class="$style.columns" data-test-id="task-board-columns">
			<TaskBoardColumn
				v-for="column in columns"
				:key="column.id"
				:column="column"
				:tasks="tasksByColumnId.get(column.id) ?? []"
				:selected-task-id="selectedTaskId"
				:task-location="taskLocation"
				@select="selectTask"
				@drop-task="moveTask($event, column.id)"
			/>
		</div>
		<CreateTaskDialog
			v-model:open="createDialogOpen"
			:assignee-items="assigneeItems"
			:tag-suggestions="tagSuggestions"
			:creating="creatingTask"
			@submit="createTask"
		/>
	</TaskPanelLayout>
</template>

<style lang="scss" module>
.columns {
	display: flex;
	flex: 1;
	align-items: flex-start;
	gap: var(--spacing--sm);
	min-height: 0;
	overflow-x: auto;
	padding-bottom: var(--spacing--xs);
}
</style>
