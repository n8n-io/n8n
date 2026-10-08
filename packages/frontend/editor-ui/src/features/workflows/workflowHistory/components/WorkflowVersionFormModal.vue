<script setup lang="ts">
import { N8nButton, N8nDialog, N8nDialogBody } from '@n8n/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { ref, computed, onMounted, watch, nextTick, useTemplateRef } from 'vue';
import { generateVersionLabelFromId } from '@/features/workflows/workflowHistory/utils';
import type { EventBus } from '@n8n/utils/event-bus';

export type WorkflowVersionFormModalEventBusEvents = {
	submit: { versionId: string; name: string; description: string };
	cancel: undefined;
};

export type WorkflowVersionFormModalData = {
	versionId: string;
	versionName?: string;
	description?: string;
	modalTitle: string;
	submitButtonLabel: string;
	submitting?: boolean;
	eventBus: EventBus<WorkflowVersionFormModalEventBusEvents>;
};

const props = defineProps<{
	modalName: string;
	data: WorkflowVersionFormModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const versionForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('versionForm');

const versionName = ref('');
const description = ref('');

const submitting = computed(() => props.data.submitting ?? false);

function onModalOpened() {
	versionForm.value?.focusInput();
}

onMounted(() => {
	if (props.data.versionName) {
		versionName.value = props.data.versionName;
	} else if (props.data.versionId) {
		versionName.value = generateVersionLabelFromId(props.data.versionId);
	}

	if (props.data.description) {
		description.value = props.data.description;
	}
});

watch(
	modalOpen,
	(open) => {
		if (!open) return;
		void nextTick(() => {
			void nextTick(() => {
				onModalOpened();
			});
		});
	},
	{ immediate: true },
);

const onCancel = (): boolean | void => {
	props.data.eventBus.emit('cancel');
};

async function closeDialog() {
	if (uiStore.modalsById[props.modalName]?.open !== true) return;
	const shouldClose = await onCancel();
	if (shouldClose === false) return;
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

const handleSubmit = () => {
	if (versionName.value.trim().length === 0) {
		return;
	}

	props.data.eventBus.emit('submit', {
		versionId: props.data.versionId,
		name: versionName.value,
		description: description.value,
	});
};
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:container-class="$style.dialog"
		:header="data.modalTitle"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div :class="$style.content" :data-test-id="`${modalName}-modal`">
				<WorkflowVersionForm
					ref="versionForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:version-name-test-id="`${modalName}-version-name-input`"
					:description-test-id="`${modalName}-description-input`"
					@submit="handleSubmit"
				/>
				<div :class="$style.actions">
					<N8nButton
						variant="subtle"
						:disabled="submitting"
						:label="i18n.baseText('generic.cancel')"
						:data-test-id="`${modalName}-cancel-button`"
						@click="closeDialog"
					/>
					<N8nButton
						:loading="submitting"
						:disabled="versionName.trim().length === 0"
						:label="data.submitButtonLabel"
						:data-test-id="`${modalName}-submit-button`"
						@click="handleSubmit"
					/>
				</div>
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>
<style lang="scss" module>
.dialog {
	display: flex;
	flex-direction: column;
	max-height: 85vh;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-height: 0;
	overflow-y: auto;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
