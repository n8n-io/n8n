<script setup lang="ts">
import { N8nEmptyState, N8nHeading, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useTaskInboxView } from './useTaskInboxView';
import TaskCard from '../../components/TaskCard/TaskCard.vue';
import TaskPanelLayout from '../../components/TaskPanelLayout/TaskPanelLayout.vue';

const i18n = useI18n();
const { tasks, selectedTaskId, selectTask } = useTaskInboxView();
</script>

<template>
	<TaskPanelLayout data-test-id="task-inbox-view">
		<header :class="$style.intro">
			<N8nHeading tag="h1" size="xlarge" bold>{{
				i18n.baseText('taskBoard.inbox.title')
			}}</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('taskBoard.inbox.description') }}
			</N8nText>
		</header>
		<N8nEmptyState
			v-if="tasks.length === 0"
			:icon="{ type: 'icon', value: 'inbox' }"
			:heading="i18n.baseText('taskBoard.inbox.empty.heading')"
			:description="i18n.baseText('taskBoard.inbox.empty.description')"
			data-test-id="task-inbox-empty"
		/>
		<N8nScrollArea v-else :class="$style.scroll" type="hover">
			<ul :class="$style.list" data-test-id="task-inbox-list">
				<li v-for="task in tasks" :key="task.id">
					<TaskCard
						:task="task"
						:selected="task.id === selectedTaskId"
						@select="selectTask(task.id)"
					/>
				</li>
			</ul>
		</N8nScrollArea>
	</TaskPanelLayout>
</template>

<style lang="scss" module>
.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.scroll {
	flex: 1;
	min-height: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	/* A readable line length for a list of tasks. The spacing scale has no token this wide. */
	max-width: 48rem;
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
