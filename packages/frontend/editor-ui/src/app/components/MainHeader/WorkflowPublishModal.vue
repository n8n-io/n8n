<script setup lang="ts">
import { computed, ref, h, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import type { VNode } from 'vue';
import Modal from '@/app/components/Modal.vue';
import {
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
} from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout, N8nButton } from '@n8n/design-system';
import WorkflowPublishForm from '@/app/components/WorkflowPublishForm.vue';
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

const publishForm = useTemplateRef<InstanceType<typeof WorkflowPublishForm>>('publishForm');

const description = ref('');
const versionName = ref('');

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const wfHasAnyChanges = computed(() => {
	return workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId;
});

const hasNodeIssues = computed(() => workflowsStore.nodesIssuesExist);

const inputsDisabled = computed(() => {
	return !wfHasAnyChanges.value || !containsTrigger.value || hasNodeIssues.value;
});

const isPublishDisabled = computed(() => {
	return inputsDisabled.value || versionName.value.trim().length === 0;
});

type WorkflowPublishCalloutId = 'noTrigger' | 'nodeIssues' | 'noChanges';

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

	return null;
});

function onModalOpened() {
	publishForm.value?.focusInput();
}

onMounted(() => {
	if (!versionName.value && !inputsDisabled.value) {
		versionName.value = generateVersionName(workflowsStore.workflow.versionId);
	}
	modalBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalBus.off('opened', onModalOpened);
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
	if (isPublishDisabled.value) {
		return;
	}

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
	const success = await workflowActivate.publishWorkflow(
		workflowsStore.workflow.id,
		workflowsStore.workflow.versionId,
		{
			name: versionName.value,
			description: description.value,
		},
	);

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

		telemetry.track('User published version from canvas', {
			workflow_id: workflowsStore.workflow.id,
		});

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
				<N8nCallout v-else-if="activeCalloutId === 'noChanges'" theme="warning">
					{{ i18n.baseText('workflows.publishModal.noChanges') }}
				</N8nCallout>
				<WorkflowPublishForm
					ref="publishForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:disabled="inputsDisabled"
					version-name-test-id="workflow-publish-version-name-input"
					description-test-id="workflow-publish-description-input"
					@submit="handlePublish"
				/>
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

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
