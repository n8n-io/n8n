<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import {
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nKeyboardShortcut,
	N8nPopoverReka,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

type Props = {
	workflowId: string;
	workflowDescription?: string;
};

const props = withDefaults(defineProps<Props>(), {
	workflowDescription: '',
});

const i18n = useI18n();
const toast = useToast();

const settingsStore = useSettingsStore();
const workflowStore = useWorkflowsStore();
const uiStore = useUIStore();

const descriptionValue = ref(props.workflowDescription);
const popoverOpen = ref(false);
const descriptionInput = useTemplateRef<HTMLInputElement>('descriptionInput');
const isSaving = ref(false);

const lastSavedDescription = ref(props.workflowDescription);

const isMcpEnabled = computed(() => settingsStore.isModuleActive('mcp'));

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
	const normalizedCurrentValue = descriptionValue.value || '';
	const normalizedLastSaved = lastSavedDescription.value || '';

	if (normalizedCurrentValue === normalizedLastSaved) {
		return;
	}

	isSaving.value = true;
	uiStore.addActiveAction('workflowSaving');

	try {
		await workflowStore.saveWorkflowDescription(props.workflowId, descriptionValue.value || null);
		lastSavedDescription.value = descriptionValue.value;
		uiStore.stateIsDirty = false;
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
		descriptionValue.value = lastSavedDescription.value;
		uiStore.stateIsDirty = false;
		popoverOpen.value = false;
	}

	// Enter (without Shift) - save and close
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();
		await saveDescription();
		popoverOpen.value = false;
	}
	// Shift + Enter - allow default behavior (new line in textarea)
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
	const normalizedNewValue = newValue || '';
	const normalizedLastSaved = lastSavedDescription.value || '';

	if (normalizedNewValue !== normalizedLastSaved) {
		uiStore.stateIsDirty = true;
	} else {
		uiStore.stateIsDirty = false;
	}
});
</script>
<template>
	<N8nTooltip :disabled="popoverOpen" :content="i18n.baseText('workflow.description.tooltip')">
		<div :class="$style['description-popover-wrapper']">
			<N8nPopoverReka
				id="workflow-description-popover"
				:open="popoverOpen"
				@update:open="handlePopoverOpenChange"
			>
				<template #trigger>
					<N8nIconButton
						:class="{ [$style['description-button']]: true, [$style.active]: popoverOpen }"
						:square="true"
						icon="notebook-pen"
						type="tertiary"
						size="small"
						:aria-label="i18n.baseText('workflow.description.tooltip')"
					/>
				</template>
				<template #content>
					<div :class="$style['description-edit-content']">
						<N8nInputLabel
							:label="i18n.baseText('generic.description')"
							:tooltip-text="textareaTip"
						>
							<N8nInput
								ref="descriptionInput"
								v-model="descriptionValue"
								:placeholder="textareaTip"
								type="textarea"
								:rows="6"
								@keydown="handleKeyDown"
							/>
						</N8nInputLabel>
					</div>
					<footer :class="$style['popover-footer']">
						<div :class="$style.shortcut">
							<N8nKeyboardShortcut :keys="['Enter']" />
							<N8nText color="text-light">{{
								i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText')
							}}</N8nText>
						</div>
						<div :class="$style.shortcut">
							<N8nKeyboardShortcut :keys="['Esc']" />
							<N8nText color="text-light">{{ i18n.baseText('generic.cancel') }}</N8nText>
						</div>
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
	top: var(--spacing--5xs);

	&.active {
		color: var(--color--background--shade-2);
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
	justify-content: space-between;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.shortcut {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
