<script setup lang="ts">
import { N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useTasksShell } from './useTasksShell';
import ActiveTaskBoard from '../../components/ActiveTaskBoard/ActiveTaskBoard.vue';
import NewBoardDialog from '../../components/NewBoardDialog/NewBoardDialog.vue';
import TasksSidebar from '../../components/TasksSidebar/TasksSidebar.vue';

const i18n = useI18n();
const {
	boardRef,
	boardId,
	boardItems,
	pageItems,
	footerItems,
	activePage,
	loading,
	creating,
	canCreate,
	newBoardDialogOpen,
	selectBoard,
	createBoard,
} = useTasksShell();
</script>

<template>
	<div :class="$style.shell" data-test-id="tasks-shell">
		<TasksSidebar
			:board-id="boardId"
			:board-items="boardItems"
			:page-items="pageItems"
			:footer-items="footerItems"
			:active-page="activePage"
			@select-board="selectBoard"
		/>
		<div :class="$style.content">
			<ActiveTaskBoard
				v-if="boardRef"
				:project-id="boardRef.projectId"
				:board-id="boardRef.boardId"
			>
				<RouterView />
			</ActiveTaskBoard>
			<div v-else :class="$style.state">
				<N8nLoading v-if="loading" :rows="3" variant="p" />
				<N8nEmptyState
					v-else
					:icon="{ type: 'icon', value: 'list-checks' }"
					:heading="i18n.baseText('taskBoard.list.empty.heading')"
					:description="i18n.baseText('taskBoard.list.empty.description')"
					:button-text="i18n.baseText('taskBoard.list.newBoard')"
					:button-disabled="!canCreate"
					data-test-id="task-boards-empty-state"
					@click:button="newBoardDialogOpen = true"
				/>
			</div>
		</div>
		<NewBoardDialog v-model:open="newBoardDialogOpen" :creating="creating" @submit="createBoard" />
	</div>
</template>

<style lang="scss" module>
.shell {
	display: flex;
	width: 100%;
	height: 100%;
	min-height: 0;
	background-color: var(--color--background--light-2);
}

.content {
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.state {
	width: 100%;
	padding: var(--spacing--lg) var(--spacing--2xl);
}
</style>
