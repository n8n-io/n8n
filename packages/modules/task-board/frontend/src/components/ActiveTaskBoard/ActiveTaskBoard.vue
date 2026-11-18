<script setup lang="ts">
import { N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { provideActiveTaskBoard } from '../../composables/useActiveTaskBoard';

/** Loads one board and renders its page when the board is ready. */
const props = defineProps<{ projectId: string; boardId: string }>();
const i18n = useI18n();

const { board, loading, loadFailed, reload } = provideActiveTaskBoard(() => ({
	projectId: props.projectId,
	boardId: props.boardId,
}));
</script>

<template>
	<div :class="$style.root">
		<slot v-if="board" />
		<div v-else :class="$style.state" data-test-id="task-board-loading">
			<N8nLoading v-if="loading" :rows="4" variant="p" />
			<N8nEmptyState
				v-else
				:icon="{ type: 'icon', value: 'triangle-alert' }"
				:heading="i18n.baseText('taskBoard.board.loadError')"
				:button-text="loadFailed ? i18n.baseText('taskBoard.board.retry') : undefined"
				@click:button="reload"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
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
