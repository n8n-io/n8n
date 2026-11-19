<script setup lang="ts">
import { N8nButton, N8nHeading, N8nLink, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useTaskBoardSettingsView } from './useTaskBoardSettingsView';

const i18n = useI18n();
const { board, canDelete, deleting, deleteBoard } = useTaskBoardSettingsView();
</script>

<template>
	<div v-if="board" :class="$style.page" data-test-id="task-board-settings-view">
		<header :class="$style.intro">
			<N8nHeading tag="h1" size="xlarge" bold>
				{{ i18n.baseText('taskBoard.settings.title') }}
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('taskBoard.settings.description') }}
			</N8nText>
		</header>
		<dl :class="$style.fields">
			<N8nText tag="dt" size="small" color="text-light">
				{{ i18n.baseText('taskBoard.settings.name') }}
			</N8nText>
			<N8nText tag="dd">{{ board.name }}</N8nText>

			<N8nText tag="dt" size="small" color="text-light">
				{{ i18n.baseText('taskBoard.task.description') }}
			</N8nText>
			<N8nText tag="dd" :color="board.description ? undefined : 'text-light'">
				{{ board.description || i18n.baseText('taskBoard.task.noDescription') }}
			</N8nText>

			<N8nText tag="dt" size="small" color="text-light">
				{{ i18n.baseText('taskBoard.settings.automation') }}
			</N8nText>
			<dd>
				<N8nLink
					v-if="board.workflowId"
					:to="`/workflow/${board.workflowId}`"
					data-test-id="task-board-settings-workflow-link"
				>
					{{ i18n.baseText('taskBoard.settings.openWorkflow') }}
				</N8nLink>
				<N8nText v-else color="text-light">
					{{ i18n.baseText('taskBoard.board.noWorkflow') }}
				</N8nText>
			</dd>

			<N8nText tag="dt" size="small" color="text-light">
				{{ i18n.baseText('taskBoard.settings.tasks') }}
			</N8nText>
			<N8nText tag="dd">{{ board.tasks.length }}</N8nText>

			<N8nText tag="dt" size="small" color="text-light">
				{{ i18n.baseText('taskBoard.settings.created') }}
			</N8nText>
			<N8nText tag="dd"><N8nTimeAgo :date="board.createdAt" /></N8nText>
		</dl>
		<section :class="$style.danger">
			<div :class="$style.intro">
				<N8nHeading tag="h2" size="medium" bold>
					{{ i18n.baseText('taskBoard.settings.delete.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('taskBoard.settings.delete.description') }}
				</N8nText>
			</div>
			<N8nButton
				variant="destructive"
				icon="trash-2"
				:label="i18n.baseText('taskBoard.settings.delete.confirm')"
				:disabled="!canDelete"
				:loading="deleting"
				data-test-id="task-board-delete-button"
				@click="deleteBoard"
			/>
		</section>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	height: 100%;
	padding: var(--spacing--lg) var(--spacing--2xl);
	overflow: auto;

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--sm);
	}
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.fields {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: var(--spacing--sm) var(--spacing--xl);
	margin: 0;

	dd {
		margin: 0;
	}
}

.danger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	/* The same line length as the Inbox list. The spacing scale has no token this wide. */
	max-width: 48rem;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
}
</style>
