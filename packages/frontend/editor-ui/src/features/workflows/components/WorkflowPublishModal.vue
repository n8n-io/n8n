<script setup lang="ts">
import {
	computed,
	ref,
	h,
	onMounted,
	onBeforeUnmount,
	useTemplateRef,
	type DeepReadonly,
} from 'vue';
import type { VNode } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { VIEWS, WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout, N8nButton, N8nLink, N8nText } from '@n8n/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useToast } from '@n8n/composables/useToast';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import WorkflowActivationErrorMessage from '@/app/components/WorkflowActivationErrorMessage.vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useUsersStore } from '@n8n/stores/users.store';
import {
	formatTimestamp,
	generateVersionLabelFromId,
} from '@/features/workflows/workflowHistory/utils';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import type { WorkflowChangelog } from '@n8n/rest-api-client/api/workflowHistory';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();
const workflowHistoryStore = useWorkflowHistoryStore();
const usersStore = useUsersStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const credentialsStore = useCredentialsStore();
const { showMessage } = useToast();
const workflowActivate = useWorkflowActivate();
const publishing = ref(false);

const publishForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('publishForm');

const description = ref('');
const versionName = ref('');

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowDocumentStore.value.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const wfHasAnyChanges = computed(() => {
	return (
		workflowDocumentStore.value?.versionId !== workflowDocumentStore.value?.activeVersion?.versionId
	);
});

const isReattempt = computed(
	() =>
		workflowDocumentStore.value.publicationStatus === 'partial' ||
		workflowDocumentStore.value.publicationStatus === 'failed',
);

const nodesWithValidationIssues = computed(
	() => workflowDocumentStore.value.nodesWithValidationIssues,
);

const hasNodeIssues = computed(() => workflowDocumentStore.value.hasPublishBlockingIssues);

const inputsDisabled = computed(() => {
	return (
		!(wfHasAnyChanges.value || isReattempt.value) ||
		!containsTrigger.value ||
		hasNodeIssues.value ||
		publishing.value
	);
});

const isPublishDisabled = computed(() => {
	return inputsDisabled.value || versionName.value.trim().length === 0;
});

type WorkflowPublishCalloutId = 'noTrigger' | 'nodeIssues' | 'noChanges' | 'reattempt';

const activeCalloutId = computed<WorkflowPublishCalloutId | null>(() => {
	if (!containsTrigger.value) {
		return 'noTrigger';
	}

	if (hasNodeIssues.value) {
		return 'nodeIssues';
	}

	if (isReattempt.value) {
		return 'reattempt';
	}

	if (!wfHasAnyChanges.value) {
		return 'noChanges';
	}

	return null;
});

function onModalOpened() {
	publishForm.value?.focusInput();
}

const changelog = ref<WorkflowChangelog>(null);
const usersLoaded = ref(false);

// The changelog is informational; publishing works when any of this fails
async function loadChangelog() {
	if (!workflowDocumentStore.value.activeVersion?.versionId) return;

	// Users are only fetched to detect a single-user instance
	const loadUsers = usersStore.fetchUsers({ take: 2 }).then(() => {
		usersLoaded.value = true;
	});
	const loadSummary = workflowHistoryStore
		.getWorkflowChangelog(workflowDocumentStore.value.workflowId)
		.then((summary) => {
			changelog.value = summary;
		});

	await Promise.allSettled([loadUsers, loadSummary]);
}

const changelogSummary = computed(() => {
	if (!changelog.value) return null;

	const from = formatTimestamp(changelog.value.from).date;
	const to = formatTimestamp(changelog.value.to).date;

	// Authors add no information on a single-user instance.
	// Show them unless a successful lookup confirmed there is only one user.
	if (usersLoaded.value && usersStore.allUsers.length <= 1) {
		return i18n.baseText('workflows.publishModal.changelogNoAuthors', {
			interpolate: { from, to },
		});
	}

	return i18n.baseText('workflows.publishModal.changelog', {
		interpolate: { from, to, authors: changelog.value.authors.join(', ') },
	});
});

onMounted(() => {
	const currentVersionData = workflowDocumentStore.value?.versionData;

	if (!versionName.value) {
		if (currentVersionData?.name) {
			versionName.value = currentVersionData.name;
		} else {
			versionName.value = generateVersionLabelFromId(workflowDocumentStore.value?.versionId ?? '');
		}
	}

	if (!description.value && currentVersionData?.description) {
		description.value = currentVersionData.description;
	}

	modalBus.on('opened', onModalOpened);

	void loadChangelog();
});

onBeforeUnmount(() => {
	modalBus.off('opened', onModalOpened);
});

function findManagedOpenAiCredentialId(
	usedCredentials: DeepReadonly<Record<string, IUsedCredential>>,
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
	const usedCredentials = workflowDocumentStore.value?.usedCredentials;
	if (!usedCredentials) return false;

	const managedOpenAiCredentialId = findManagedOpenAiCredentialId(usedCredentials);
	if (!managedOpenAiCredentialId) return false;

	return hasActiveNodeUsingCredential(
		workflowDocumentStore.value?.allNodes ?? [],
		managedOpenAiCredentialId,
	);
});

async function displayActivationError() {
	let errorMessage: string | VNode;
	try {
		const errorData = await workflowsStore.getActivationError(
			workflowDocumentStore.value.workflowId,
		);

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

	publishing.value = true;

	// Activate the workflow
	const { success, errorHandled } = await workflowActivate.publishWorkflow(
		workflowDocumentStore.value.workflowId,
		workflowDocumentStore.value?.versionId ?? '',
		{
			name: versionName.value,
			description: description.value,
		},
	);

	if (success) {
		workflowDocumentStore.value?.setVersionData({
			versionId: workflowDocumentStore.value?.versionId ?? '',
			name: versionName.value,
			description: description.value,
		});

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
			workflow_id: workflowDocumentStore.value.workflowId,
		});

		// For now, just close the modal after successful activation
		modalBus.emit('close');
	} else {
		// Display activation error if it fails
		if (!errorHandled) {
			await displayActivationError();
		}
	}

	publishing.value = false;
}
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:name="WORKFLOW_PUBLISH_MODAL_KEY"
		:center="true"
		:show-close="true"
		:close-on-click-modal="false"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.publishModal.title') }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nCallout
					v-if="activeCalloutId === 'noTrigger'"
					theme="danger"
					icon="status-error"
					data-test-id="workflow-publish-callout-no-trigger"
				>
					{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
				</N8nCallout>
				<N8nCallout
					v-else-if="activeCalloutId === 'nodeIssues'"
					theme="danger"
					icon="status-error"
					data-test-id="workflow-publish-callout-node-issues"
				>
					{{
						i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
							interpolate: { count: nodesWithValidationIssues.length },
							adjustToNumber: nodesWithValidationIssues.length,
						})
					}}
					<ul :class="$style.nodeLinks">
						<li v-for="node in nodesWithValidationIssues" :key="node.id">
							<N8nLink
								size="small"
								:to="`/workflow/${workflowDocumentStore.workflowId}/${node.id}`"
								@click="modalBus.emit('close')"
								>{{ node.name }}</N8nLink
							>
						</li>
					</ul>
				</N8nCallout>
				<N8nCallout
					v-else-if="activeCalloutId === 'reattempt'"
					theme="info"
					data-test-id="workflow-publish-callout-reattempt"
				>
					{{ i18n.baseText('workflows.publishModal.reattempt') }}
				</N8nCallout>
				<N8nCallout
					v-else-if="activeCalloutId === 'noChanges'"
					theme="warning"
					data-test-id="workflow-publish-callout-no-changes"
				>
					{{ i18n.baseText('workflows.publishModal.noChanges') }}
				</N8nCallout>
				<WorkflowVersionForm
					ref="publishForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:disabled="inputsDisabled"
					version-name-test-id="workflow-publish-version-name-input"
					description-test-id="workflow-publish-description-input"
					@submit="handlePublish"
				/>
				<N8nText
					v-if="changelogSummary"
					size="small"
					color="text-base"
					data-test-id="workflow-publish-changelog"
				>
					{{ changelogSummary }}
					<N8nLink
						size="small"
						:to="{
							name: VIEWS.WORKFLOW_HISTORY,
							params: { workflowId: workflowDocumentStore.workflowId },
						}"
						data-test-id="workflow-publish-changelog-history-link"
						@click="modalBus.emit('close')"
					>
						{{ i18n.baseText('workflows.publishModal.goToHistory') }}
					</N8nLink>
				</N8nText>
				<div :class="$style.actions">
					<N8nButton
						variant="subtle"
						:disabled="publishing"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="workflow-publish-cancel-button"
						@click="modalBus.emit('close')"
					/>
					<N8nButton
						:disabled="isPublishDisabled"
						:loading="publishing"
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

.nodeLinks {
	list-style-type: disc;
	margin-top: var(--spacing--4xs);
	padding-left: var(--spacing--sm);
}

.nodeLinks li {
	margin-bottom: var(--spacing--4xs);
}

.nodeLinks a span {
	text-decoration: underline;
	color: var(--callout--color--text--danger);
}
</style>
