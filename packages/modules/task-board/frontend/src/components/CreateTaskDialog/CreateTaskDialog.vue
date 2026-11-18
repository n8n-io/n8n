<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nSelect2,
	type SelectItem,
	type SelectValue,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { UNASSIGNED_VALUE } from '../../task-board.constants';
import type { CreateTaskPayload } from '../../task-board.types';
import { decodeAssignee } from '../../task-board.utils';

const props = defineProps<{ assigneeItems: SelectItem[]; creating: boolean }>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ submit: [payload: CreateTaskPayload] }>();
const i18n = useI18n();

const title = ref('');
const description = ref('');
const assignee = ref<SelectValue>(UNASSIGNED_VALUE);
const canSubmit = computed(() => title.value.trim().length > 0 && !props.creating);

watch(open, (isOpen) => {
	if (!isOpen) return;
	title.value = '';
	description.value = '';
	assignee.value = UNASSIGNED_VALUE;
});

function onSubmit() {
	if (!canSubmit.value) return;
	const chosen = decodeAssignee(String(assignee.value));
	emit('submit', {
		title: title.value.trim(),
		description: description.value.trim() || undefined,
		assignee: chosen ?? undefined,
	});
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="i18n.baseText('taskBoard.task.createTitle')"
		data-test-id="task-board-create-task-dialog"
	>
		<N8nDialogBody :class="$style.body">
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
					data-test-id="task-board-new-task-title"
					@keydown.enter.prevent="onSubmit"
				/>
			</N8nInputLabel>
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
					:rows="5"
					:placeholder="i18n.baseText('taskBoard.task.descriptionPlaceholder')"
					data-test-id="task-board-new-task-description"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('taskBoard.task.assignee')"
				input-name="task-board-new-task-assignee"
				size="small"
				color="text-dark"
			>
				<N8nSelect2
					id="task-board-new-task-assignee"
					v-model="assignee"
					:items="assigneeItems"
					size="medium"
					data-test-id="task-board-new-task-assignee"
				/>
			</N8nInputLabel>
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
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
