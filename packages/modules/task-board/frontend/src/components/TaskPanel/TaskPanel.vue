<script setup lang="ts">
import type { TaskBoardTask } from '@n8n/api-types';
import { N8nButton, N8nLink, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { RouteLocationRaw } from 'vue-router';

import TaskTicket from '../TaskTicket/TaskTicket.vue';

/** The selected task beside the board: the ticket in its narrow form. */
defineProps<{
	task: TaskBoardTask;
	/** The page of the task. */
	taskLocation: RouteLocationRaw;
}>();
const emit = defineEmits<{ close: []; openFullPage: [] }>();
const i18n = useI18n();
</script>

<template>
	<aside :class="$style.panel" data-test-id="task-board-task-panel">
		<header :class="$style.header">
			<N8nLink
				:to="taskLocation"
				theme="text"
				size="small"
				data-test-id="task-board-task-panel-link"
			>
				#{{ task.number }}
			</N8nLink>
			<div :class="$style.actions">
				<N8nTooltip :content="i18n.baseText('taskBoard.task.openFullPage')">
					<N8nButton
						variant="ghost"
						icon="maximize-2"
						icon-only
						:aria-label="i18n.baseText('taskBoard.task.openFullPage')"
						data-test-id="task-board-task-panel-open-page"
						@click="emit('openFullPage')"
					/>
				</N8nTooltip>
				<N8nButton
					variant="ghost"
					icon="x"
					icon-only
					:aria-label="i18n.baseText('taskBoard.task.close')"
					data-test-id="task-board-task-panel-close"
					@click="emit('close')"
				/>
			</div>
		</header>
		<TaskTicket :task="task" variant="stacked" />
	</aside>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	border-left: var(--border);
	background-color: var(--background--surface);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--xs) 0 var(--spacing--md);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
