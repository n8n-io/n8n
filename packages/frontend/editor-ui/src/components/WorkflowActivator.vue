<script lang="ts" setup>
import { useToast } from '@/composables/useToast';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getActivatableTriggerNodes } from '@/utils/nodeTypesUtils';
import type { VNode } from 'vue';
import { computed, h, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import {
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
} from '@/constants';
import WorkflowActivationErrorMessage from './WorkflowActivationErrorMessage.vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { INodeUi, IUsedCredential } from '@/Interface';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';

import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

const props = defineProps<{
	isArchived: boolean;
	workflowActive: boolean;
	workflowId: string;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const emit = defineEmits<{
	'update:workflowActive': [value: { id: string; active: boolean }];
}>();

const { showMessage } = useToast();
const workflowActivate = useWorkflowActivate();

const uiStore = useUIStore();

const workflowHelpers = useWorkflowHelpers();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();

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

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
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
	if (props.isArchived) {
		return true;
	}

	if (isNewWorkflow.value || isCurrentWorkflow.value) {
		return !props.workflowActive && !containsTrigger.value;
	}

	return false;
});

function findManagedOpenAiCredentialId(
	usedCredentials: Record<string, IUsedCredential>,
): string | undefined {
	return Object.keys(usedCredentials).find((credentialId) => {
		const credential = credentialsStore.state.credentials[credentialId];
		return credential.isManaged && credential.type === OPEN_AI_API_CREDENTIAL_TYPE;
	});
}

function hasActiveNodeUsingCredential(nodes: INodeUi[], credentialId: string): boolean {
	return nodes.some(
		(node) =>
			node?.credentials?.[OPEN_AI_API_CREDENTIAL_TYPE]?.id === credentialId && !node.disabled,
	);
}

/**
 * Determines if the warning for free AI credits should be shown in the workflow.
 *
 * This computed property evaluates whether to display a warning about free AI credits
 * in the workflow. The warning is shown when both conditions are met:
 * 1. The workflow uses managed OpenAI API credentials
 * 2. Those credentials are associated with at least one enabled node
 *
 */
const shouldShowFreeAiCreditsWarning = computed((): boolean => {
	const usedCredentials = workflowsStore?.usedCredentials;
	if (!usedCredentials) return false;

	const managedOpenAiCredentialId = findManagedOpenAiCredentialId(usedCredentials);
	if (!managedOpenAiCredentialId) return false;

	return hasActiveNodeUsingCredential(workflowsStore.allNodes, managedOpenAiCredentialId);
});

async function activeChanged(newActiveState: boolean) {
	if (!isWorkflowActive.value) {
		const conflictData = await workflowHelpers.checkConflictingWebhooks(props.workflowId);

		if (conflictData) {
			const { trigger, conflict } = conflictData;
			const conflictingWorkflow = await workflowsStore.fetchWorkflow(conflict.workflowId);

			uiStore.openModalWithData({
				name: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
				data: {
					triggerType: trigger.type,
					workflowName: conflictingWorkflow.name,
					...conflict,
				},
			});

			return;
		}
	}

	const newState = await workflowActivate.updateWorkflowActivation(
		props.workflowId,
		newActiveState,
	);

	emit('update:workflowActive', { id: props.workflowId, active: newState });
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

watch(
	() => props.workflowActive,
	(workflowActive) => {
		if (workflowActive && shouldShowFreeAiCreditsWarning.value) {
			showMessage({
				title: i18n.baseText('freeAi.credits.showWarning.workflow.activation.title'),
				message: i18n.baseText('freeAi.credits.showWarning.workflow.activation.description'),
				type: 'warning',
				duration: 0,
			});
		}
	},
);
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
							isArchived
								? 'workflowActivator.thisWorkflowIsArchived'
								: containsOnlyExecuteWorkflowTrigger
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
						v-n8n-html="i18n.baseText('workflowActivator.theWorkflowIsSetToBeActiveBut')"
						@click="displayActivationError"
					></div>
				</template>
				<n8n-icon icon="triangle-alert" @click="displayActivationError" />
			</n8n-tooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.activeStatusText {
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
