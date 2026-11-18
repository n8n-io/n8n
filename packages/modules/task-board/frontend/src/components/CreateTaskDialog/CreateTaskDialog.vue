<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	type SelectItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';

import { useCreateTaskForm } from './useCreateTaskForm';
import type { CreateTaskPayload } from '../../task-board.types';
import TaskFields from '../TaskFields/TaskFields.vue';
import TaskTicketLayout from '../TaskTicketLayout/TaskTicketLayout.vue';

const props = defineProps<{
	assigneeItems: SelectItem[];
	/** The tags that the board already uses. */
	tagSuggestions: string[];
	creating: boolean;
}>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ submit: [payload: CreateTaskPayload] }>();
const i18n = useI18n();

const { title, description, assignee, severity, tags, isValid, reset, toPayload } =
	useCreateTaskForm();
const canSubmit = computed(() => isValid.value && !props.creating);

watch(open, (isOpen) => {
	if (isOpen) reset();
});

function onSubmit() {
	if (canSubmit.value) emit('submit', toPayload());
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="2xlarge"
		:header="i18n.baseText('taskBoard.task.createTitle')"
		data-test-id="task-board-create-task-dialog"
	>
		<N8nDialogBody>
			<TaskTicketLayout variant="columns" :class="$style.ticket">
				<template #header>
					<N8nInputLabel
						:label="i18n.baseText('taskBoard.task.title')"
						input-name="task-board-new-task-title"
						required
						size="small"
						color="text-dark"
					>
						<N8nInput
							id="task-board-new-task-title"
							v-model="title"
							:maxlength="255"
							:placeholder="i18n.baseText('taskBoard.task.titlePlaceholder')"
							autofocus
							data-test-id="task-board-new-task-title"
							@keydown.enter.prevent="onSubmit"
						/>
					</N8nInputLabel>
				</template>
				<template #main>
					<N8nInputLabel
						:label="i18n.baseText('taskBoard.task.description')"
						input-name="task-board-new-task-description"
						size="small"
						color="text-dark"
					>
						<N8nInput
							id="task-board-new-task-description"
							v-model="description"
							type="textarea"
							:rows="10"
							:maxlength="65535"
							:placeholder="i18n.baseText('taskBoard.task.descriptionPlaceholder')"
							data-test-id="task-board-new-task-description"
						/>
					</N8nInputLabel>
				</template>
				<template #side>
					<TaskFields
						id-prefix="task-board-new-task"
						:assignee="assignee"
						:assignee-items="assigneeItems"
						:severity="severity"
						:tags="tags"
						:tag-suggestions="tagSuggestions"
						@assign="assignee = $event"
						@update:severity="severity = $event"
						@update:tags="tags = $event"
					/>
				</template>
			</TaskTicketLayout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="creating"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('taskBoard.task.createSubmit')"
				:loading="creating"
				:disabled="!canSubmit"
				data-test-id="task-board-new-task-submit"
				@click="onSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.ticket {
	flex: 0 0 auto;
	/* The columns bring their own padding and the line between them. */
	border: var(--border);
	border-radius: var(--radius);
}
</style>
