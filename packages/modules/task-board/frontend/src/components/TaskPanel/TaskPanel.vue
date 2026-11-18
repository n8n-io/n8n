<script setup lang="ts">
import type { TaskBoardColumn, TaskBoardTask } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nChatInput,
	N8nHeading,
	N8nLoading,
	N8nMarkdown,
	N8nScrollArea,
	N8nSpinner,
	N8nText,
	type SelectItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TaskComment from './components/TaskComment/TaskComment.vue';
import TaskFields from './components/TaskFields/TaskFields.vue';
import { useScrollToNewest } from '../../composables/useScrollToNewest';
import { useTaskThread } from '../../composables/useTaskThread';
import { encodeAssignee, isAgentWorking } from '../../task-board.utils';

const props = defineProps<{
	projectId: string;
	task: TaskBoardTask;
	columns: TaskBoardColumn[];
	assigneeItems: SelectItem[];
}>();
const emit = defineEmits<{ close: []; move: [columnId: string]; assign: [value: string] }>();
const i18n = useI18n();

const { detail, comments, loading, posting, draft, addComment } = useTaskThread(() => ({
	projectId: props.projectId,
	boardId: props.task.boardId,
	taskId: props.task.id,
}));

const { anchor } = useScrollToNewest(() => comments.value.length);

const column = computed(() => props.columns.find((c) => c.id === props.task.columnId));
const working = computed(() => isAgentWorking(props.task, column.value));
const description = computed(() => detail.value?.description ?? props.task.description);
</script>

<template>
	<aside :class="$style.panel" data-test-id="task-board-task-panel">
		<header :class="$style.header">
			<div :class="$style.title">
				<N8nText size="small" color="text-light">#{{ task.number }}</N8nText>
				<N8nHeading tag="h2" size="large" bold>{{ task.title }}</N8nHeading>
			</div>
			<N8nButton
				variant="ghost"
				icon="x"
				icon-only
				:aria-label="i18n.baseText('taskBoard.task.close')"
				data-test-id="task-board-task-panel-close"
				@click="emit('close')"
			/>
		</header>
		<N8nScrollArea :class="$style.scroll" type="hover">
			<div :class="$style.body">
				<N8nCallout
					v-if="column?.role === 'needs_input'"
					theme="warning"
					icon="message-circle"
					data-test-id="task-board-needs-input"
				>
					{{ i18n.baseText('taskBoard.task.needsInput') }}
				</N8nCallout>
				<div
					v-else-if="working"
					:class="$style.working"
					role="status"
					data-test-id="task-board-agent-working"
				>
					<N8nSpinner type="dots" size="small" />
					<N8nText size="small" color="text-base">
						{{
							i18n.baseText('taskBoard.task.agentWorkingHint', {
								interpolate: { name: task.assignee?.name ?? '' },
							})
						}}
					</N8nText>
				</div>
				<TaskFields
					:column-id="task.columnId"
					:columns="columns"
					:assignee="encodeAssignee(task.assignee)"
					:assignee-items="assigneeItems"
					@move="emit('move', $event)"
					@assign="emit('assign', $event)"
				/>
				<N8nMarkdown v-if="description" :content="description" />
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('taskBoard.task.noDescription') }}
				</N8nText>
				<section :class="$style.thread">
					<N8nHeading tag="h3" size="small" bold>
						{{ i18n.baseText('taskBoard.thread.title') }}
					</N8nHeading>
					<N8nLoading v-if="loading" :rows="2" variant="p" />
					<N8nText v-else-if="comments.length === 0" size="small" color="text-light">
						{{ i18n.baseText('taskBoard.thread.empty') }}
					</N8nText>
					<TaskComment v-for="comment in comments" :key="comment.id" :comment="comment" />
					<div ref="anchor" />
				</section>
			</div>
		</N8nScrollArea>
		<footer :class="$style.composer">
			<N8nChatInput
				v-model="draft"
				layout="adaptive"
				:max-length="65535"
				:placeholder="i18n.baseText('taskBoard.thread.placeholder')"
				:submit-disabled="posting || draft.trim().length === 0"
				refocus-after-send
				data-test-id="task-board-comment-composer"
				@submit="addComment"
			/>
		</footer>
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
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--md) var(--spacing--md) var(--spacing--sm);
}

.title {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow-wrap: anywhere;
}

.scroll {
	flex: 1;
	min-height: 0;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: 0 var(--spacing--md) var(--spacing--md);
}

.working {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.thread {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.composer {
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--md);
	border-top: var(--border);
}
</style>
