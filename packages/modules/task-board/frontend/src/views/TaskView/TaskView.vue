<script setup lang="ts">
import { N8nEmptyState, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useTaskView } from './useTaskView';
import TaskTicket from '../../components/TaskTicket/TaskTicket.vue';

const i18n = useI18n();
const { task, boardName, backLocation, backToBoard } = useTaskView();
</script>

<template>
	<div :class="$style.page" data-test-id="task-view">
		<header :class="$style.header">
			<N8nLink
				:to="backLocation"
				theme="text"
				size="small"
				:title="i18n.baseText('taskBoard.task.backToBoard')"
				data-test-id="task-view-back"
			>
				<span :class="$style.back">
					<N8nIcon icon="arrow-left" size="small" />
					{{ boardName }}
				</span>
			</N8nLink>
			<template v-if="task">
				<N8nText size="small" color="text-light" aria-hidden="true">/</N8nText>
				<N8nText size="small" color="text-light" data-test-id="task-view-number">
					#{{ task.number }}
				</N8nText>
			</template>
		</header>
		<TaskTicket v-if="task" :key="task.id" :task="task" variant="columns" />
		<N8nEmptyState
			v-else
			:class="$style.empty"
			:icon="{ type: 'icon', value: 'list-checks' }"
			:heading="i18n.baseText('taskBoard.task.notFound.heading')"
			:description="i18n.baseText('taskBoard.task.notFound.description')"
			:button-text="i18n.baseText('taskBoard.task.backToBoard')"
			data-test-id="task-view-not-found"
			@click:button="backToBoard"
		/>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	background-color: var(--background--surface);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border);
}

.back {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.empty {
	padding: var(--spacing--lg) var(--spacing--2xl);
}
</style>
