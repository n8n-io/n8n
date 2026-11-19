<script setup lang="ts">
import type { TaskBoardTask } from '@n8n/api-types';
import {
	N8nCallout,
	N8nChatInput,
	N8nHeading,
	N8nLoading,
	N8nMarkdown,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TaskComment from './components/TaskComment/TaskComment.vue';
import { useTaskTicket } from './useTaskTicket';
import { useScrollToNewest } from '../../composables/useScrollToNewest';
import TaskEditableText from '../TaskEditableText/TaskEditableText.vue';
import TaskFields from '../TaskFields/TaskFields.vue';
import TaskMeta from '../TaskMeta/TaskMeta.vue';
import TaskTicketLayout from '../TaskTicketLayout/TaskTicketLayout.vue';

/**
 * One task: its title, description and comment thread, with its fields in a side column.
 * The side panel shows it in the `stacked` form and the task page in the `columns` form.
 */
const props = defineProps<{
	task: TaskBoardTask;
	variant: 'columns' | 'stacked';
}>();
const i18n = useI18n();

const {
	comments,
	loading,
	posting,
	draft,
	addComment,
	canEdit,
	columns,
	column,
	working,
	assignee,
	assigneeItems,
	tagSuggestions,
	usageByAgent,
	move,
	assign,
	rename,
	describe,
	setSeverity,
	setTags,
} = useTaskTicket(() => props.task);

// The working row counts, so the thread scrolls to it when an agent starts.
const { anchor } = useScrollToNewest(() => comments.value.length + (working.value ? 1 : 0));
</script>

<template>
	<TaskTicketLayout :variant="variant" data-test-id="task-board-ticket">
		<template #header>
			<N8nCallout
				v-if="column?.role === 'needs_input'"
				theme="warning"
				icon="message-circle"
				data-test-id="task-board-needs-input"
			>
				{{ i18n.baseText('taskBoard.task.needsInput') }}
			</N8nCallout>
			<TaskEditableText
				:value="task.title"
				:editable="canEdit"
				:edit-label="i18n.baseText('taskBoard.task.editTitle')"
				:maxlength="255"
				required
				test-id="task-board-task-title"
				@save="rename"
			>
				<N8nHeading tag="h2" :size="variant === 'columns' ? 'xlarge' : 'large'" bold>
					{{ task.title }}
				</N8nHeading>
			</TaskEditableText>
		</template>
		<template #side>
			<div :class="$style.side">
				<TaskFields
					id-prefix="task-board-task"
					:column-id="task.columnId"
					:columns="columns"
					:assignee="assignee"
					:assignee-items="assigneeItems"
					:severity="task.severity"
					:tags="task.tags"
					:tag-suggestions="tagSuggestions"
					:disabled="!canEdit"
					@move="move"
					@assign="assign"
					@update:severity="setSeverity"
					@update:tags="setTags"
				/>
				<TaskMeta :task="task" :usage-by-agent="usageByAgent" />
			</div>
		</template>
		<template #main>
			<TaskEditableText
				:value="task.description"
				:editable="canEdit"
				:edit-label="
					i18n.baseText(
						task.description ? 'taskBoard.task.editDescription' : 'taskBoard.task.addDescription',
					)
				"
				:maxlength="65535"
				:placeholder="i18n.baseText('taskBoard.task.descriptionPlaceholder')"
				multiline
				test-id="task-board-task-description"
				@save="describe"
			>
				<N8nMarkdown v-if="task.description" :content="task.description" />
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('taskBoard.task.noDescription') }}
				</N8nText>
			</TaskEditableText>
			<section :class="$style.thread">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('taskBoard.thread.title') }}
				</N8nHeading>
				<N8nLoading v-if="loading" :rows="2" variant="p" />
				<N8nText v-else-if="comments.length === 0" size="small" color="text-light">
					{{ i18n.baseText('taskBoard.thread.empty') }}
				</N8nText>
				<TaskComment v-for="comment in comments" :key="comment.id" :comment="comment" />
				<div
					v-if="working"
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
				<div ref="anchor" />
			</section>
		</template>
		<template #footer>
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
		</template>
	</TaskTicketLayout>
</template>

<style lang="scss" module>
.working {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.side {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.thread {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}
</style>
