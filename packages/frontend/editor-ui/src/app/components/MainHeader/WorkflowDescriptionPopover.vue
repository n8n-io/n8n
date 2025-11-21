<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import {
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nPopoverReka,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

type Props = {
	workflowId: string;
	workflowDescription?: string | null;
};

const props = withDefaults(defineProps<Props>(), {
	workflowDescription: '',
});

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const settingsStore = useSettingsStore();
const workflowStore = useWorkflowsStore();
const uiStore = useUIStore();

const descriptionValue = ref(props.workflowDescription);
const popoverOpen = ref(false);
const descriptionInput = useTemplateRef<HTMLInputElement>('descriptionInput');
const isSaving = ref(false);
const lastSavedDescription = ref(props.workflowDescription);

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
			props.workflowId,
			normalizedCurrentValue.value ?? null,
		);
		lastSavedDescription.value = descriptionValue.value;
		uiStore.stateIsDirty = false;
		telemetry.track('User set workflow description', {
			workflow_id: props.workflowId,
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

const handlePopoverOpenChange = async (open: boolean) => {
	popoverOpen.value = open;
	if (open) {
		await nextTick();
		descriptionInput.value?.focus();
	} else {
		await saveDescription();
	}
};

const handleKeyDown = async (event: KeyboardEvent) => {
	// Escape - cancel editing
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		await cancel();
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

const cancel = async () => {
	descriptionValue.value = lastSavedDescription.value;
	uiStore.stateIsDirty = false;
	popoverOpen.value = false;
};

const save = async () => {
	await saveDescription();
	popoverOpen.value = false;
};

// Sync with external prop changes
watch(
	() => props.workflowDescription,
	(newValue) => {
		descriptionValue.value = newValue;
		lastSavedDescription.value = newValue;
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
	<N8nTooltip :disabled="popoverOpen" :content="i18n.baseText('workflow.description.tooltip')">
		<div :class="$style['description-popover-wrapper']" data-test-id="workflow-description-popover">
			<N8nPopoverReka
				id="workflow-description-popover"
				:open="popoverOpen"
				@update:open="handlePopoverOpenChange"
			>
				<template #trigger>
					<N8nIconButton
						:class="{ [$style['description-button']]: true, [$style.active]: popoverOpen }"
						:square="true"
						data-test-id="workflow-description-button"
						icon="notebook-pen"
						type="tertiary"
						size="small"
						:aria-label="i18n.baseText('workflow.description.tooltip')"
					/>
				</template>
				<template #content>
					<div
						:class="$style['description-edit-content']"
						data-test-id="workflow-description-edit-content"
					>
						<N8nInputLabel
							:label="i18n.baseText('generic.description')"
							:tooltip-text="textareaTip"
						>
							<N8nInput
								ref="descriptionInput"
								v-model="descriptionValue"
								:placeholder="textareaTip"
								:rows="6"
								data-test-id="workflow-description-input"
								type="textarea"
								@keydown="handleKeyDown"
							/>
						</N8nInputLabel>
					</div>
					<footer :class="$style['popover-footer']">
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
					</footer>
				</template>
			</N8nPopoverReka>
		</div>
	</N8nTooltip>
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
	padding: var(--spacing--xs);
	width: 400px;
}

.popover-footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}
</style>
