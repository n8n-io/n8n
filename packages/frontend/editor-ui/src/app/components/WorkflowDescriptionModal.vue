<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '../constants';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		workflowDescription?: string | null;
	};
}>();

const modalBus = createEventBus();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const settingsStore = useSettingsStore();
const workflowStore = useWorkflowsStore();
const uiStore = useUIStore();

const descriptionValue = ref(props.data.workflowDescription ?? '');
const descriptionInput = useTemplateRef<HTMLInputElement>('descriptionInput');
const isSaving = ref(false);
const lastSavedDescription = ref(props.data.workflowDescription ?? '');

const normalizedCurrentValue = computed(() => (descriptionValue.value ?? '').trim());
const normalizedLastSaved = computed(() => (lastSavedDescription.value ?? '').trim());

const canSave = computed(() => normalizedCurrentValue.value !== normalizedLastSaved.value);

const isMcpEnabled = computed(
	() => settingsStore.isModuleActive('mcp') && settingsStore.moduleSettings.mcp?.mcpAccessEnabled,
);

const hasWebhooks = computed(() => {
	const workflow = workflowStore.workflow;
	if (!workflow) return false;
	return workflow.nodes.some((node) => !node.disabled && node.type === WEBHOOK_NODE_TYPE);
});

// Descriptive tip that will be used as textarea placeholder and input label tooltip
// Updated based on MCP and webhook presence
const textareaTip = computed(() => {
	const baseTooltip = i18n.baseText('workflow.description.tooltip');
	if (!isMcpEnabled.value) {
		return i18n.baseText('workflow.description.tooltip');
	}
	const mcpTooltip = i18n.baseText('workflow.description.placeholder.mcp');
	const webhookNotice = hasWebhooks.value
		? i18n.baseText('workflow.description.placeholder.mcp.webhook')
		: '';
	return `${baseTooltip}. ${mcpTooltip}.\n${webhookNotice}`;
});

const saveDescription = async () => {
	isSaving.value = true;
	uiStore.addActiveAction('workflowSaving');

	try {
		await workflowStore.saveWorkflowDescription(
			props.data.workflowId,
			normalizedCurrentValue.value ?? null,
		);
		lastSavedDescription.value = descriptionValue.value;
		uiStore.stateIsDirty = false;
		telemetry.track('User set workflow description', {
			workflow_id: props.data.workflowId,
			description: normalizedCurrentValue.value ?? null,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('workflow.description.error.title'));
		descriptionValue.value = lastSavedDescription.value;
	} finally {
		isSaving.value = false;
		uiStore.removeActiveAction('workflowSaving');
	}
};

const cancel = () => {
	descriptionValue.value = lastSavedDescription.value;
	uiStore.stateIsDirty = false;
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

// Sync with external prop changes
watch(
	() => props.data.workflowDescription,
	(newValue) => {
		descriptionValue.value = newValue ?? '';
		lastSavedDescription.value = newValue ?? '';
	},
);

// Set dirty flag when text changes
watch(descriptionValue, (newValue) => {
	const normalizedNewValue = (newValue ?? '').trim();

	if (normalizedNewValue !== normalizedLastSaved.value) {
		uiStore.stateIsDirty = true;
	} else {
		uiStore.stateIsDirty = false;
	}
});
</script>
<template>
	<Modal
		:name="WORKFLOW_DESCRIPTION_MODAL_KEY"
		:title="i18n.baseText('generic.description')"
		width="450"
		:class="$style.container"
		:event-bus="modalBus"
	>
		<template #content>
			<div
				:class="$style['description-edit-content']"
				data-test-id="workflow-description-edit-content"
			>
				<N8nText size="small" color="text-light">{{ textareaTip }}</N8nText>
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
					:label="i18n.baseText('generic.cancel')"
					:size="'small'"
					:disabled="isSaving"
					type="tertiary"
					data-test-id="workflow-description-cancel-button"
					@click="cancel"
				/>
				<N8nButton
					:label="i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText')"
					:size="'small'"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					type="primary"
					data-test-id="workflow-description-save-button"
					@click="save"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.description-button {
	border: none;
	position: relative;

	&.active {
		color: var(--color--background--shade-2);
	}

	&:hover,
	&:focus,
	&:focus-visible,
	&:active {
		background: none;
		background-color: transparent !important;
		outline: none !important;
		color: var(--color--background--shade-2) !important;
	}
}

.description-edit-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 400px;
}

.popover-footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}
</style>
