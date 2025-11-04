<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import {
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nPopoverReka,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

type Props = {
	workflowId: string;
	workflowDescription?: string;
};

const props = withDefaults(defineProps<Props>(), {
	workflowDescription: '',
});

const i18n = useI18n();

const settingsStore = useSettingsStore();
const workflowStore = useWorkflowsStore();

const descriptionValue = ref(props.workflowDescription);
const popoverOpen = ref(false);
const descriptionInput = useTemplateRef<HTMLInputElement>('descriptionInput');

const isMcpEnabled = computed(() => settingsStore.isModuleActive('mcp'));

const hasWebhooks = computed(() => {
	const workflow = workflowStore.workflow;
	if (!workflow) return false;
	return workflow.nodes.some((node) => !node.disabled && node.type === WEBHOOK_NODE_TYPE);
});

const textareaTip = computed(() => {
	const baseTooltip = i18n.baseText('workflow.description.tooltip');
	if (!isMcpEnabled.value) {
		return i18n.baseText('workflow.description.tooltip');
	}
	const mcpTooltip = i18n.baseText('workflow.description.placehoder.mcp');
	const webhookNotice = hasWebhooks.value
		? i18n.baseText('workflow.description.placehoder.mcp.webhook')
		: '';
	return `${baseTooltip}. ${mcpTooltip}.\n${webhookNotice}`;
});

const handlePopoverOpenChange = async (open: boolean) => {
	popoverOpen.value = open;
	if (open) {
		await nextTick();
		descriptionInput.value?.focus();
	}
};
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
							/>
						</N8nInputLabel>
					</div>
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
</style>
