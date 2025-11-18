<script setup lang="ts">
import { computed, ref, watchEffect, h } from 'vue';
import type { VNode } from 'vue';
import dateformat from 'dateformat';
import { toDayMonth } from '@/app/utils/formatters/dateFormatter';
import Modal from '@/app/components/Modal.vue';
import {
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
} from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout, N8nText, N8nInput, N8nButton, N8nBadge } from '@n8n/design-system';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import WorkflowActivationErrorMessage from '@/app/components/WorkflowActivationErrorMessage.vue';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const { showMessage } = useToast();
const workflowActivate = useWorkflowActivate();
const workflowHelpers = useWorkflowHelpers();

// TODO: we should use workflow publish history here instead but that table is not yet implemented
const workflowHistoryStore = useWorkflowHistoryStore();
const hasAnyPublishedVersions = ref(false);
const description = ref('');

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const hasPublishedVersion = computed(() => {
	return !!workflowsStore.workflow.activeVersion;
});

const wfHasAnyChanges = computed(() => {
	return workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId;
});

const actionText = computed(() => {
	if (!hasPublishedVersion.value && wfHasAnyChanges.value) {
		return i18n.baseText('generic.create');
	}
	return '';
});

const currentVersionText = computed(() => {
	if (hasPublishedVersion.value) {
		// TODO: this should be using the workflow publish history
		return 'Version X';
	}
	return '';
});

const newVersionText = computed(() => {
	if (!hasPublishedVersion.value) {
		return 'Version 1';
	}

	if (wfHasAnyChanges.value) {
		// TODO: this should be using the workflow publish history
		return 'Version Y';
	}
	return '';
});

const isPublishDisabled = computed(() => {
	return !wfHasAnyChanges.value || !containsTrigger.value;
});

const publishedInfoText = computed(() => {
	if (!hasPublishedVersion.value || !workflowsStore.workflow.activeVersion) {
		return i18n.baseText('workflows.publishModal.noPublishedVersionMessage');
	}

	const activeVersion = workflowsStore.workflow.activeVersion;
	const authorName = activeVersion.authors.split(', ')[0];
	const date = toDayMonth(activeVersion.createdAt);
	const time = dateformat(activeVersion.createdAt, 'HH:MM');

	return i18n.baseText('workflows.publishModal.lastPublished', {
		interpolate: {
			author: authorName,
			date,
			time,
		},
	});
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
	try {
		await workflowActivate.updateWorkflowActivation(workflowsStore.workflow.id, true);

		// Show AI credits warning if applicable
		if (shouldShowFreeAiCreditsWarning.value) {
			showMessage({
				title: i18n.baseText('freeAi.credits.showWarning.workflow.activation.title'),
				message: i18n.baseText('freeAi.credits.showWarning.workflow.activation.description'),
				type: 'warning',
				duration: 0,
			});
		}

		// TODO: Save the description and create a publish version entry
		// For now, just close the modal after successful activation
		modalBus.emit('close');
	} catch {
		// Display activation error if it fails
		await displayActivationError();
	}
}

watchEffect(async () => {
	const workflowHistory = await workflowHistoryStore.getWorkflowHistory(
		workflowsStore.workflow.id,
		{ take: 1 },
	);
	hasAnyPublishedVersions.value = workflowHistory.length > 1;
});
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
				<N8nCallout v-if="!containsTrigger" theme="danger" icon="status-error">
					{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
				</N8nCallout>
				<div :class="$style.versionTextContainer">
					<div :class="$style.versionRow">
						<N8nText v-if="actionText" color="text-light">{{ actionText }}</N8nText>
						<N8nText v-if="currentVersionText">
							{{ currentVersionText }}
						</N8nText>
						<N8nBadge v-if="currentVersionText && !wfHasAnyChanges" theme="tertiary" size="small">
							{{ i18n.baseText('workflows.publishModal.noChanges') }}
						</N8nBadge>
						<N8nText
							v-if="currentVersionText && newVersionText"
							color="text-light"
							:class="$style.versionSeparator"
						>
							->
						</N8nText>
						<N8nText color="text-dark">
							{{ newVersionText }}
						</N8nText>
						<N8nBadge v-if="currentVersionText && newVersionText" theme="warning" size="small">
							{{ i18n.baseText('workflows.publishModal.modified') }}
						</N8nBadge>
					</div>
					<div>
						<N8nText color="text-light" size="small">
							{{ publishedInfoText }}
						</N8nText>
					</div>
				</div>
				<div :class="$style.inputButtonContainer">
					<N8nInput
						v-model="description"
						:placeholder="i18n.baseText('workflows.publishModal.descriptionPlaceholder')"
						:class="$style.descriptionInput"
						:disabled="isPublishDisabled"
						size="small"
						data-test-id="workflow-publish-description-input"
					/>
					<N8nButton
						:disabled="isPublishDisabled"
						:label="i18n.baseText('workflows.publish')"
						size="small"
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
.versionTextContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.versionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.versionSeparator {
	margin: 0 var(--spacing--2xs);
}

.inputButtonContainer {
	display: flex;
	gap: var(--spacing--xs);
}

.descriptionInput {
	flex: 1;
}
</style>
