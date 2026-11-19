<script setup lang="ts">
import type { TaskBoardSummary } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon, N8nInfoTip, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{ board: TaskBoardSummary }>();
const emit = defineEmits<{ newTask: [] }>();
const i18n = useI18n();
</script>

<template>
	<header :class="$style.header" data-test-id="task-board-header">
		<div :class="$style.titleBlock">
			<div :class="$style.titleRow">
				<N8nHeading tag="h1" size="xlarge" bold>{{ board.name }}</N8nHeading>
				<N8nInfoTip type="tooltip" tooltip-placement="bottom">
					{{ i18n.baseText('taskBoard.board.perBoardHint') }}
				</N8nInfoTip>
			</div>
			<div :class="$style.automation">
				<N8nIcon icon="workflow" size="small" color="text-light" />
				<N8nLink
					v-if="board.workflowId"
					:to="`/workflow/${board.workflowId}`"
					size="small"
					data-test-id="task-board-workflow-link"
				>
					{{ i18n.baseText('taskBoard.board.workflowLink') }}
				</N8nLink>
				<N8nText v-else size="small" color="text-light" data-test-id="task-board-no-workflow">
					{{ i18n.baseText('taskBoard.board.noWorkflow') }}
				</N8nText>
			</div>
		</div>
		<N8nButton
			variant="solid"
			icon="plus"
			:label="i18n.baseText('taskBoard.board.newTask')"
			data-test-id="task-board-new-task-button"
			@click="emit('newTask')"
		/>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.automation {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
