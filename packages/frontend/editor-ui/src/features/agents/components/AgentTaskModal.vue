<script setup lang="ts">
import {
	AGENT_TASK_NAME_MAX_LENGTH,
	type AgentConfigValidationIssue,
	type AgentTaskDto,
} from '@n8n/api-types';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import AgentTaskForm from './AgentTaskForm.vue';
import AgentTestButton from './AgentTestButton.vue';
import AgentModal from './modals/AgentModal.vue';

export type AgentTaskModalData = {
	projectId: string;
	agentId: string;
	ensureAgentPersisted?: () => Promise<void>;
	task?: AgentTaskDto | null;
	isPublished: boolean;
	isRunnable?: boolean;
	validationIssues?: AgentConfigValidationIssue[];
	getPreviewDisabledReason?: () => string | undefined;
	taskState?: {
		enabled: boolean;
	};
	onPreview?: (instructions: string) => void;
	onSaved: () => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentTaskModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const formRef = ref<InstanceType<typeof AgentTaskForm>>();
const name = ref('');
const isEditing = computed(() => Boolean(props.data.task));

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onPreview() {
	const objective = formRef.value?.previewObjective();
	if (!objective || !props.data.onPreview || props.data.getPreviewDisabledReason?.()) return;

	closeModal();
	props.data.onPreview(objective);
}

async function onDelete() {
	if (!(await formRef.value?.remove())) return;
	props.data.onSaved();
	closeModal();
}

async function onSave() {
	if (!(await formRef.value?.save())) return;
	props.data.onSaved();
	closeModal();
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="name"
		:title-placeholder="i18n.baseText('agents.builder.tasks.name.placeholder')"
		:title-max-length="AGENT_TASK_NAME_MAX_LENGTH"
		:title-error="formRef?.visibleNameError ?? ''"
		:busy="formRef?.saving || formRef?.deleting"
		editable-title
		data-testid="agent-task-modal"
		@update:open="!$event && closeModal()"
		@update:title="name = $event"
	>
		<AgentTaskForm
			ref="formRef"
			v-model:name="name"
			:project-id="data.projectId"
			:agent-id="data.agentId"
			:task="data.task ?? null"
			:is-published="data.isPublished"
			:enabled="data.taskState?.enabled ?? true"
			:ensure-agent-persisted="data.ensureAgentPersisted"
		/>

		<template v-if="isEditing" #footerLeft>
			<N8nButton
				variant="ghost"
				:loading="formRef?.deleting"
				data-testid="agent-task-delete"
				@click="onDelete"
			>
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.tasks.delete') }}
			</N8nButton>
		</template>
		<template #footerBeforeCancel>
			<AgentTestButton
				:disabled-reason="data.getPreviewDisabledReason?.()"
				:is-runnable="data.isRunnable === true"
				:validation-issues="data.validationIssues ?? []"
				variant="ghost"
				test-id="agent-task-preview"
				@open-preview="onPreview"
			/>
		</template>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:disabled="formRef?.saving"
				:loading="formRef?.saving"
				data-testid="agent-task-save"
				@click="onSave"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>
