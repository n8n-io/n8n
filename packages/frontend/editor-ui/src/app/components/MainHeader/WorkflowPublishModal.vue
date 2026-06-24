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
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout, N8nButton, N8nLink } from '@n8n/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { INodeUi } from '@/Interface';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import WorkflowActivationErrorMessage from '@/app/components/WorkflowActivationErrorMessage.vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { generateVersionLabelFromId } from '@/features/workflows/workflowHistory/utils';
import { useEnvironmentsStore } from '@/features/environments/environments.store';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const environmentsStore = useEnvironmentsStore();
const { showMessage, showError } = useToast();
const workflowActivate = useWorkflowActivate();
const publishing = ref(false);
const publishingEnvId = ref<string | null>(null);

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

const nodesWithValidationIssues = computed(
	() => workflowDocumentStore.value.nodesWithValidationIssues,
);

const hasNodeIssues = computed(() => workflowDocumentStore.value.hasPublishBlockingIssues);

const inputsDisabled = computed(() => {
	return (
		!wfHasAnyChanges.value || !containsTrigger.value || hasNodeIssues.value || publishing.value
	);
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

async function onModalOpened() {
	publishForm.value?.focusInput();
	const workflowId = workflowDocumentStore.value.workflowId;
	const projectId = workflowDocumentStore.value.homeProject?.id;
	await Promise.all([
		workflowId ? environmentsStore.fetchPublishedVersions(workflowId) : Promise.resolve(),
		projectId ? environmentsStore.fetchEnvironments(projectId) : Promise.resolve(),
	]);

	if (projectId && environmentsStore.environments.length > 0) {
		await Promise.all(
			environmentsStore.environments.map((env) =>
				environmentsStore.fetchCredentialBindings(projectId, env.id),
			),
		);
	}
}

/** Credential IDs used by enabled nodes in the current workflow version */
const workflowCredentialIds = computed((): Set<string> => {
	const ids = new Set<string>();
	for (const node of workflowDocumentStore.value?.allNodes ?? []) {
		if (node.disabled) continue;
		for (const cred of Object.values(node.credentials ?? {})) {
			if (cred.id) ids.add(cred.id);
		}
	}
	return ids;
});

/** Returns true when an environment has all required credentials bound */
function envHasAllBindings(envId: string): boolean {
	if (workflowCredentialIds.value.size === 0) return true;
	const bindings = environmentsStore.credentialBindings[envId] ?? [];
	const boundSources = new Set(bindings.map((b) => b.sourceCredentialId));
	return [...workflowCredentialIds.value].every((id) => boundSources.has(id));
}

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

const aiGatewayWarningNodes = computed((): INodeUi[] => {
	if (!settingsStore.isAiGatewayEnabled) return [];
	return (workflowDocumentStore.value?.allNodes ?? []).filter(
		(node) =>
			!node.disabled &&
			Object.values(node.credentials ?? {}).some((cred) => cred.__aiGatewayManaged === true),
	);
});

const aiGatewayWarningNodeNames = computed(() =>
	aiGatewayWarningNodes.value.map((n) => n.name).join(', '),
);

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

function envFreshness(envId: string): 'current' | 'stale' | 'never' {
	const publishedVersionId = environmentsStore.publishedVersions[envId];
	if (!publishedVersionId) return 'never';
	return publishedVersionId === workflowDocumentStore.value?.versionId ? 'current' : 'stale';
}

async function handlePublishToEnvironment(envId: string) {
	const workflowId = workflowDocumentStore.value.workflowId;
	const versionId = workflowDocumentStore.value?.versionId;
	if (!workflowId || !versionId) return;

	publishingEnvId.value = envId;
	try {
		await environmentsStore.publishToEnvironment(workflowId, envId, versionId);
		showMessage({
			title: 'Published to environment',
			type: 'success',
		});
	} catch (error) {
		showError(error, 'Failed to publish to environment');
	} finally {
		publishingEnvId.value = null;
	}
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
					v-if="aiGatewayWarningNodes.length > 0"
					theme="warning"
					:iconless="true"
					data-test-id="workflow-publish-ai-gateway-warning"
				>
					{{
						i18n.baseText('workflows.publishModal.aiGatewayWarning.header', {
							adjustToNumber: aiGatewayWarningNodes.length,
						})
					}}
					<strong>{{ aiGatewayWarningNodeNames }}</strong>
					{{
						i18n.baseText('workflows.publishModal.aiGatewayWarning.body', {
							adjustToNumber: aiGatewayWarningNodes.length,
						})
					}}
				</N8nCallout>
				<N8nCallout v-if="activeCalloutId === 'noTrigger'" theme="danger" icon="status-error">
					{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'nodeIssues'" theme="danger" icon="status-error">
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
				<N8nCallout v-else-if="activeCalloutId === 'noChanges'" theme="warning">
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
				<div
					v-if="environmentsStore.environments.length > 0"
					:class="$style.envSlots"
					data-test-id="publish-env-slots"
				>
					<p :class="$style.envSlotsLabel">Publish to environment</p>
					<div v-for="env in environmentsStore.environments" :key="env.id" :class="$style.envSlot">
						<span :class="[$style.envFreshness, $style[`envFreshness--${envFreshness(env.id)}`]]" />
						<span :class="$style.envName">{{ env.name }}</span>
						<span
							v-if="!envHasAllBindings(env.id)"
							:class="$style.missingBindingsBadge"
							title="Some credentials are not bound for this environment"
							>⚠</span
						>
						<N8nButton
							size="small"
							variant="subtle"
							:loading="publishingEnvId === env.id"
							:disabled="publishingEnvId !== null || !envHasAllBindings(env.id)"
							:label="`Publish to ${env.name}`"
							:data-test-id="`publish-to-env-${env.id}`"
							@click="handlePublishToEnvironment(env.id)"
						/>
					</div>
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

.envSlots {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	border-top: 1px solid var(--color-foreground-base);
	padding-top: var(--spacing--sm);
}

.envSlotsLabel {
	font-size: var(--font-size--xs);
	color: var(--color-text-light);
	margin: 0;
}

.envSlot {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.envName {
	flex: 1;
	font-size: var(--font-size--s);
}

.envFreshness {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex-shrink: 0;
}

.envFreshness--current {
	background-color: var(--color-success);
}

.envFreshness--stale {
	background-color: var(--color-warning);
}

.envFreshness--never {
	background-color: var(--color-foreground-dark);
}

.missingBindingsBadge {
	color: var(--color-warning);
	font-size: var(--font-size-xs);
	line-height: 1;
}
</style>
