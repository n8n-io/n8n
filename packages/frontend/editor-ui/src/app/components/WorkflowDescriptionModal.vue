<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '../constants';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';
import { onMounted } from 'vue';

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		workflowDescription?: string | null;
		onSave?: (description: string | null) => void;
	};
}>();

const modalBus = createEventBus();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const settingsStore = useSettingsStore();
const workflowStore = useWorkflowsStore();

const descriptionValue = ref(props.data.workflowDescription ?? '');
const descriptionInput = useTemplateRef<HTMLInputElement>('descriptionInput');
const isSaving = ref(false);

const normalizedCurrentValue = computed(() => (descriptionValue.value ?? '').trim());
const normalizedLastSaved = computed(() => (props.data.workflowDescription ?? '').trim());

const canSave = computed(() => normalizedCurrentValue.value !== normalizedLastSaved.value);

const isMcpEnabled = computed(
	() => settingsStore.isModuleActive('mcp') && settingsStore.moduleSettings.mcp?.mcpAccessEnabled,
);

// Descriptive message that educates the user that the description is relevant for MCP
// Updated based on MCP presence
const textareaTip = computed(() =>
	isMcpEnabled.value
		? i18n.baseText('workflow.description.mcp')
		: i18n.baseText('workflow.description.nomcp'),
);

const saveDescription = async () => {
	isSaving.value = true;

	try {
		await workflowStore.saveWorkflowDescription(
			props.data.workflowId,
			normalizedCurrentValue.value ?? null,
		);

		props.data.onSave?.(normalizedCurrentValue.value ?? null);

		telemetry.track('User set workflow description', {
			workflow_id: props.data.workflowId,
			description: normalizedCurrentValue.value ?? null,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('workflow.description.error.title'));
	} finally {
		isSaving.value = false;
	}
};

const cancel = () => {
	modalBus.emit('close');
};

const save = async () => {
	await saveDescription();
	modalBus.emit('close');
};

const handleKeyDown = async (event: KeyboardEvent) => {
	// Escape - cancel editing
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		cancel();
	}

	// Enter (without Shift) - save and close
	if (event.key === 'Enter' && !event.shiftKey) {
		if (!canSave.value) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		await save();
	}
};

onMounted(() => {
	setTimeout(() => {
		descriptionInput.value?.focus();
	}, 150);
});
</script>

<template>
	<Modal
		:name="WORKFLOW_DESCRIPTION_MODAL_KEY"
		:title="i18n.baseText('generic.description')"
		width="500"
		:class="$style.container"
		:event-bus="modalBus"
		:close-on-click-modal="false"
	>
		<template #content>
			<div
				:class="$style['description-edit-content']"
				data-test-id="workflow-description-edit-content"
			>
				<N8nText color="text-base" data-test-id="descriptionTooltip">{{ textareaTip }}</N8nText>
				<N8nInput
					ref="descriptionInput"
					v-model="descriptionValue"
					:rows="6"
					data-test-id="workflow-description-input"
					type="textarea"
					@keydown="handleKeyDown"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style['popover-footer']">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					:size="'small'"
					:disabled="isSaving"
					data-test-id="workflow-description-cancel-button"
					@click="cancel"
				/>
				<N8nButton
					variant="solid"
					:label="i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText')"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					data-test-id="workflow-description-save-button"
					@click="save"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.description-edit-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--s);
}

.popover-footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
