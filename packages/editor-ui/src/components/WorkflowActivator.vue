<script lang="ts" setup>
import { useToast } from '@/composables/useToast';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getActivatableTriggerNodes } from '@/utils/nodeTypesUtils';
import type { VNode } from 'vue';
import { computed, h } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { PermissionsRecord } from '@/permissions';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import WorkflowActivationErrorMessage from './WorkflowActivationErrorMessage.vue';

const props = defineProps<{
	workflowActive: boolean;
	workflowId: string;
	workflowPermissions: PermissionsRecord['workflow'];
}>();
const { showMessage } = useToast();
const workflowActivate = useWorkflowActivate();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

const isWorkflowActive = computed((): boolean => {
	const activeWorkflows = workflowsStore.activeWorkflows;
	return activeWorkflows.includes(props.workflowId);
});
const couldNotBeStarted = computed((): boolean => {
	return props.workflowActive && isWorkflowActive.value !== props.workflowActive;
});
const getActiveColor = computed((): string => {
	if (couldNotBeStarted.value) {
		return '#ff4949';
	}
	return '#13ce66';
});
const isCurrentWorkflow = computed((): boolean => {
	return workflowsStore.workflowId === props.workflowId;
});

const containsTrigger = computed((): boolean => {
	const foundTriggers = getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes);
	return foundTriggers.length > 0;
});

const containsOnlyExecuteWorkflowTrigger = computed((): boolean => {
	const foundActiveTriggers = workflowsStore.workflowTriggerNodes.filter(
		(trigger) => !trigger.disabled,
	);
	const foundTriggers = foundActiveTriggers.filter(
		(trigger) => trigger.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	);

	return foundTriggers.length > 0 && foundTriggers.length === foundActiveTriggers.length;
});

const isNewWorkflow = computed(
	() =>
		!props.workflowId ||
		props.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
		props.workflowId === 'new',
);

const disabled = computed((): boolean => {
	if (isNewWorkflow.value || isCurrentWorkflow.value) {
		return !props.workflowActive && !containsTrigger.value;
	}

	return false;
});

async function activeChanged(newActiveState: boolean) {
	return await workflowActivate.updateWorkflowActivation(props.workflowId, newActiveState);
}

async function displayActivationError() {
	let errorMessage: string | VNode;
	try {
		const errorData = await workflowsStore.getActivationError(props.workflowId);

		if (errorData === undefined) {
			errorMessage = i18n.baseText(
				'workflowActivator.showMessage.displayActivationError.message.errorDataUndefined',
			);
		} else {
			errorMessage = h(WorkflowActivationErrorMessage, {
				message: errorData,
			});
		}
	} catch (error) {
		errorMessage = i18n.baseText(
			'workflowActivator.showMessage.displayActivationError.message.catchBlock',
		);
	}

	showMessage({
		title: i18n.baseText('workflowActivator.showMessage.displayActivationError.title'),
		message: errorMessage,
		type: 'warning',
		duration: 0,
	});
}
</script>

<template>
	<div class="workflow-activator">
		<div :class="$style.activeStatusText" data-test-id="workflow-activator-status">
			<n8n-text
				v-if="workflowActive"
				:color="couldNotBeStarted ? 'danger' : 'success'"
				size="small"
				bold
			>
				{{ i18n.baseText('workflowActivator.active') }}
			</n8n-text>
			<n8n-text v-else color="text-base" size="small" bold>
				{{ i18n.baseText('workflowActivator.inactive') }}
			</n8n-text>
		</div>
		<n8n-tooltip :disabled="!disabled" placement="bottom">
			<template #content>
				<div>
					{{
						i18n.baseText(
							containsOnlyExecuteWorkflowTrigger
								? 'workflowActivator.thisWorkflowHasOnlyOneExecuteWorkflowTriggerNode'
								: 'workflowActivator.thisWorkflowHasNoTriggerNodes',
						)
					}}
				</div>
			</template>
			<el-switch
				v-loading="workflowActivate.updatingWorkflowActivation.value"
				:model-value="workflowActive"
				:title="
					workflowActive
						? i18n.baseText('workflowActivator.deactivateWorkflow')
						: i18n.baseText('workflowActivator.activateWorkflow')
				"
				:disabled="
					disabled ||
					workflowActivate.updatingWorkflowActivation.value ||
					(!isNewWorkflow && !workflowPermissions.update)
				"
				:active-color="getActiveColor"
				inactive-color="#8899AA"
				data-test-id="workflow-activate-switch"
				@update:model-value="activeChanged"
			>
			</el-switch>
		</n8n-tooltip>

		<div v-if="couldNotBeStarted" class="could-not-be-started">
			<n8n-tooltip placement="top">
				<template #content>
					<div
						@click="displayActivationError"
						v-n8n-html="i18n.baseText('workflowActivator.theWorkflowIsSetToBeActiveBut')"
					></div>
				</template>
				<font-awesome-icon icon="exclamation-triangle" @click="displayActivationError" />
			</n8n-tooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.activeStatusText {
	width: 64px; // Required to avoid jumping when changing active state
	padding-right: var(--spacing-2xs);
	box-sizing: border-box;
	display: inline-block;
	text-align: right;
}
</style>

<style lang="scss" scoped>
.workflow-activator {
	display: inline-flex;
	flex-wrap: nowrap;
	align-items: center;
}

.could-not-be-started {
	display: inline-block;
	color: var(--color-text-danger);
	margin-left: 0.5em;
}
</style>
