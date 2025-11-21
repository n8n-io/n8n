<script setup lang="ts">
import { computed, ref, h, onMounted, onBeforeUnmount } from 'vue';
import type { VNode } from 'vue';
import Modal from '@/app/components/Modal.vue';
import {
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
} from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout, N8nInput, N8nButton, N8nInputLabel } from '@n8n/design-system';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import WorkflowActivationErrorMessage from '@/app/components/WorkflowActivationErrorMessage.vue';
import { generateVersionName } from '@/features/workflows/workflowHistory/utils';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const { showMessage } = useToast();
const workflowActivate = useWorkflowActivate();
const workflowHelpers = useWorkflowHelpers();

const description = ref('');
const versionName = ref('');

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const wfHasAnyChanges = computed(() => {
	return (
		uiStore.stateIsDirty ||
		workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId
	);
});

const hasNodeIssues = computed(() => workflowsStore.nodesIssuesExist);

const inputsDisabled = computed(() => {
	return !wfHasAnyChanges.value || !containsTrigger.value || hasNodeIssues.value;
});

const isPublishDisabled = computed(() => {
	return inputsDisabled.value || versionName.value.trim().length === 0;
});

const hasPublishedVersion = computed(() => {
	return !!workflowsStore.workflow.activeVersion;
});

const showOverwriteActiveVersionWarning = computed(() => {
	return (
		hasPublishedVersion.value &&
		wfHasAnyChanges.value &&
		containsTrigger.value &&
		!hasNodeIssues.value
	);
});

type WorkflowPublishCalloutId =
	| 'noTrigger'
	| 'nodeIssues'
	| 'noChanges'
	| 'noPublishedVersion'
	| 'overwriteActiveVersionWarning';

const activeCalloutId = computed<WorkflowPublishCalloutId | null>(() => {
	if (!containsTrigger.value) {
		return 'noTrigger';
	}

	if (hasNodeIssues.value) {
		return 'nodeIssues';
	}

	if (!wfHasAnyChanges.value) {
		return 'noChanges';
	}

	if (!hasPublishedVersion.value) {
		return 'noPublishedVersion';
	}

	if (showOverwriteActiveVersionWarning.value) {
		return 'overwriteActiveVersionWarning';
	}

	return null;
});

function handleModalOpened() {
	if (!versionName.value) {
		versionName.value = generateVersionName();
	}
}

onMounted(() => {
	handleModalOpened();
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

async function displayActivationError() {
	let errorMessage: string | VNode;
	try {
		const errorData = await workflowsStore.getActivationError(workflowsStore.workflow.id);

		if (errorData === undefined) {
			errorMessage = i18n.baseText(
				'workflowActivator.showMessage.displayActivationError.message.errorDataUndefined',
			);
		} else {
			errorMessage = h(WorkflowActivationErrorMessage, {
				message: errorData,
			});
		}
	} catch {
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

async function handlePublish() {
	// Check for conflicting webhooks before activating
	const conflictData = await workflowHelpers.checkConflictingWebhooks(workflowsStore.workflow.id);

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

	// Activate the workflow
	const success = await workflowActivate.publishWorkflowFromCanvas(workflowsStore.workflow.id, {
		name: versionName.value,
		description: description.value,
	});

	if (success) {
		// Show AI credits warning if applicable
		if (shouldShowFreeAiCreditsWarning.value) {
			showMessage({
				title: i18n.baseText('freeAi.credits.showWarning.workflow.activation.title'),
				message: i18n.baseText('freeAi.credits.showWarning.workflow.activation.description'),
				type: 'warning',
				duration: 0,
			});
		}

		// For now, just close the modal after successful activation
		modalBus.emit('close');
	} else {
		// Display activation error if it fails
		await displayActivationError();
	}
}
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:name="WORKFLOW_PUBLISH_MODAL_KEY"
		:center="true"
		:show-close="true"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.publishModal.title') }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nCallout v-if="activeCalloutId === 'noTrigger'" theme="danger" icon="status-error">
					{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'nodeIssues'" theme="danger" icon="status-error">
					<strong>
						{{
							i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title')
						}}
					</strong>
					<br />
					{{
						i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message')
					}}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'noChanges'" theme="danger" icon="status-error">
					{{ i18n.baseText('workflows.publishModal.noChanges') }}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'noPublishedVersion'" theme="secondary">
					{{ i18n.baseText('workflows.publishModal.noPublishedVersionMessage') }}
				</N8nCallout>
				<N8nCallout
					v-else-if="activeCalloutId === 'overwriteActiveVersionWarning'"
					theme="warning"
					icon="triangle-alert"
				>
					{{
						i18n.baseText('workflows.publishModal.overwriteActiveVersionWarning' as any, {
							interpolate: {
								versionName: workflowsStore.workflow.activeVersion?.name ?? '',
							},
						})
					}}
				</N8nCallout>
				<div :class="$style.inputButtonContainer">
					<N8nInputLabel
						input-name="workflow-version-name"
						:label="i18n.baseText('workflows.publishModal.versionNameLabel' as any)"
						:required="true"
						:class="$style.versionNameInput"
					>
						<N8nInput
							id="workflow-version-name"
							v-model="versionName"
							:disabled="inputsDisabled"
							size="large"
							data-test-id="workflow-publish-version-name-input"
						/>
					</N8nInputLabel>
				</div>
				<div :class="$style.descriptionContainer">
					<N8nInputLabel
						input-name="workflow-version-description"
						:label="i18n.baseText('workflows.publishModal.descriptionPlaceholder')"
					>
						<N8nInput
							id="workflow-version-description"
							v-model="description"
							type="textarea"
							:rows="4"
							:disabled="inputsDisabled"
							size="large"
							data-test-id="workflow-publish-description-input"
						/>
					</N8nInputLabel>
				</div>
				<div :class="$style.actions">
					<N8nButton
						type="secondary"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="workflow-publish-cancel-button"
						@click="modalBus.emit('close')"
					/>
					<N8nButton
						:disabled="isPublishDisabled"
						:label="i18n.baseText('workflows.publish')"
						data-test-id="workflow-publish-button"
						@click="handlePublish"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.inputButtonContainer {
	display: flex;
	gap: var(--spacing--xs);
}

.descriptionContainer {
	width: 100%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.versionNameInput {
	width: 100%;
}
</style>
