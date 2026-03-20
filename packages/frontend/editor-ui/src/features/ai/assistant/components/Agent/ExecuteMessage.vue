<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';

import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch, type WatchStopHandle } from 'vue';
import { useRouter } from 'vue-router';

import NodeIssueItem from './NodeIssueItem.vue';
import CredentialsSetupCard from './CredentialsSetupCard.vue';
import CanvasRunWorkflowButton from '@/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
import { useLogsStore } from '@/app/stores/logs.store';
import { watchExecutionCompletion } from '@/features/ai/assistant/composables/useExecutionWatcher';
import { isChatNode } from '@/app/utils/aiUtils';
import { useToast } from '@/app/composables/useToast';
import { N8nTooltip, N8nIcon, N8nButton } from '@n8n/design-system';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { SETUP_CREDENTIALS_MODAL_KEY } from '@/app/constants';
import type { WorkflowValidationIssue } from '@/Interface';

interface Emits {
	/** Emitted when workflow execution completes */
	workflowExecuted: [];
	/** Emitted when user clicks "Execute with mock data" follow-up */
	executeWithMockData: [];
}

const emit = defineEmits<Emits>();

// Initialize composables and stores
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const workflowId = useInjectWorkflowId();
const workflowDocumentStore = computed(() =>
	workflowId.value
		? useWorkflowDocumentStore(createWorkflowDocumentId(workflowId.value))
		: undefined,
);
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const i18n = useI18n();
const logsStore = useLogsStore();
const toast = useToast();
const builderStore = useBuilderStore();

// Workflow execution composable
const { runWorkflow } = useRunWorkflow({ router });

let executionWatcherStop: WatchStopHandle | undefined;

const containerRef = ref<HTMLElement>();

const stopExecutionWatcher = () => {
	if (executionWatcherStop) {
		executionWatcherStop();
		executionWatcherStop = undefined;
	}
};

/**
 * Sets up a watcher that fires exactly once per execution cycle.
 */
const ensureExecutionWatcher = () => {
	if (executionWatcherStop) return;

	executionWatcherStop = watchExecutionCompletion(() => {
		stopExecutionWatcher();
		emit('workflowExecuted');
	});
};

const hasValidationIssues = computed(() => builderStore.workflowTodos.length > 0);
const triggerNodes = computed(() =>
	(workflowDocumentStore.value?.allNodes ?? []).filter((node) =>
		nodeTypesStore.isTriggerNode(node.type),
	),
);

const issuesByType = computed(() => {
	const credentials: WorkflowValidationIssue[] = [];
	const other: WorkflowValidationIssue[] = [];

	for (const issue of builderStore.workflowTodos) {
		(issue.type === 'credentials' ? credentials : other).push(issue);
	}

	return { credentials, other };
});

/**
 * Converts a locale string pattern with placeholders into a regex.
 * E.g., "Credentials for {type} are not set." → /Credentials for .+ are not set\./i
 */
function localePatternToRegex(localeKey: BaseTextKey): RegExp {
	const pattern = i18n.baseText(localeKey, { interpolate: { type: '.+' } });
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const withPlaceholder = escaped.replace('\\.\\+', '.+');
	return new RegExp(withPlaceholder, 'i');
}

const credentialsNotSetPattern = localePatternToRegex('nodeIssues.credentials.notSet');
const parameterRequiredPattern = /Parameter\s+".+"\s+is\s+required/i;

/**
 * Custom formatter for issue messages in the execute panel.
 * Transforms verbose validation messages into user-friendly action prompts.
 */
function formatIssueMessage(issue: string | string[]): string {
	const baseMessage = workflowsStore.formatIssueMessage(issue);

	// Transform "Parameter "X" is required" → "Choose model" (for Model) or keep original
	if (parameterRequiredPattern.test(baseMessage)) {
		// Extract parameter name and check if it's "Model"
		const match = baseMessage.match(/Parameter\s+"(.+)"\s+is\s+required/i);
		if (match?.[1]?.toLowerCase() === 'model') {
			return i18n.baseText('aiAssistant.builder.executeMessage.chooseModel' as BaseTextKey);
		}
	}

	// Transform "Credentials for '...' are not set" → "Choose credentials"
	if (credentialsNotSetPattern.test(baseMessage)) {
		return i18n.baseText('aiAssistant.builder.executeMessage.chooseCredentials' as BaseTextKey);
	}

	return baseMessage;
}

// Helper to get node type
function getNodeTypeByName(nodeName: string) {
	const node = workflowDocumentStore.value?.getNodeByName(nodeName);

	if (!node) return null;
	return nodeTypesStore.getNodeType(node.type);
}

// Reactive workflow state
const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);
/**
 * Determines available trigger nodes for execution
 * Excludes trigger nodes when there are validation issues to prevent dropdown rendering
 */
const availableTriggerNodes = computed(() => (hasValidationIssues.value ? [] : triggerNodes.value));
const executeButtonTooltip = computed(() =>
	hasValidationIssues.value
		? i18n.baseText('aiAssistant.builder.executeMessage.validationTooltip')
		: '',
);

const showUnpinSection = computed(
	() =>
		(builderStore.isCodeBuilder || builderStore.testDataWasApplied) &&
		builderStore.hasTodosHiddenByPinnedData &&
		builderStore.hasHadSuccessfulExecution,
);

const showFollowUps = computed(() => builderStore.hasDeferredPinData);

const showPostExecutionFollowUps = computed(
	() =>
		builderStore.testDataWasApplied &&
		builderStore.hasHadSuccessfulExecution &&
		builderStore.hasTodosHiddenByPinnedData &&
		!builderStore.hasDeferredPinData,
);

const followUpsTitle = computed(() =>
	i18n.baseText('aiAssistant.builder.followUps.title' as BaseTextKey),
);
const executeWithMockDataLabel = computed(() =>
	i18n.baseText('aiAssistant.builder.followUps.executeWithMockData' as BaseTextKey),
);
const unpinTestDataLabel = computed(() =>
	i18n.baseText('aiAssistant.builder.followUps.unpinTestData' as BaseTextKey),
);
const executeAndRefineLabel = computed(() =>
	i18n.baseText('aiAssistant.builder.followUps.executeAndRefine' as BaseTextKey),
);
const executeWithConfiguredDataLabel = computed(() =>
	i18n.baseText('aiAssistant.builder.followUps.executeWithConfiguredData' as BaseTextKey),
);

function onUnpinAll() {
	builderStore.unpinAllNodes();
	builderStore.trackWorkflowBuilderJourney('user_clicked_unpin_all');
}

function onExecuteWithMockData() {
	builderStore.trackWorkflowBuilderJourney('user_clicked_run_with_test_data');
	emit('executeWithMockData');
}

async function onExecute() {
	if (hasValidationIssues.value) {
		return;
	}

	ensureExecutionWatcher();

	const selectedTriggerNode =
		workflowsStore.selectedTriggerNodeName ?? availableTriggerNodes.value[0]?.name;
	const selectedTriggerNodeType = selectedTriggerNode
		? workflowDocumentStore.value?.getNodeByName(selectedTriggerNode)
		: null;

	// If the selected trigger is a chat node, open logs panel instead of executing
	// the execution will be handled by the chat node itself
	if (selectedTriggerNodeType && isChatNode(selectedTriggerNodeType)) {
		toast.showMessage({
			title: i18n.baseText('aiAssistant.builder.toast.title'),
			message: i18n.baseText('aiAssistant.builder.toast.description'),
			type: 'info',
		});
		logsStore.toggleOpen(true);
		return;
	}

	const runOptions: Parameters<typeof runWorkflow>[0] = {};
	if (selectedTriggerNode) {
		runOptions.triggerNode = selectedTriggerNode;
	}

	await runWorkflow(runOptions);
}

function scrollIntoView() {
	containerRef.value?.scrollIntoView({
		behavior: 'smooth',
		block: 'nearest',
		inline: 'nearest',
	});
}

function trackBuilderPlaceholders(issue: WorkflowValidationIssue) {
	builderStore.trackWorkflowBuilderJourney('user_clicked_todo', {
		node_type: workflowDocumentStore.value?.getNodeByName(issue.node)?.type,
		type: issue.type,
	});
}

function openCredentialsModal() {
	uiStore.openModalWithData({ name: SETUP_CREDENTIALS_MODAL_KEY, data: { source: 'builder' } });
	builderStore.trackWorkflowBuilderJourney('user_clicked_todo', {
		type: 'credentials',
		count: issuesByType.value.credentials.length,
		source: 'builder',
	});
}

onMounted(scrollIntoView);

// Track when all todos are resolved while the component is visible
watch(hasValidationIssues, (hasIssues, hadIssues) => {
	if (hadIssues && !hasIssues) {
		builderStore.trackWorkflowBuilderJourney('no_placeholder_values_left');
	}
});

onBeforeUnmount(() => {
	stopExecutionWatcher();
});
</script>

<template>
	<div
		ref="containerRef"
		:class="$style.container"
		role="region"
		aria-label="Workflow execution panel"
	>
		<!-- Validation Issues Section -->
		<template v-if="hasValidationIssues">
			<p :class="$style.description">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.description') }}
			</p>
			<div :class="$style.issuesBox">
				<CredentialsSetupCard
					v-if="issuesByType.credentials.length > 0"
					:issues="issuesByType.credentials"
					:get-node-type="getNodeTypeByName"
					@click="openCredentialsModal"
				/>

				<TransitionGroup
					v-if="issuesByType.other.length > 0"
					name="fade"
					tag="ul"
					:class="$style.issuesList"
					role="list"
					aria-label="Workflow validation issues"
				>
					<NodeIssueItem
						v-for="issue in issuesByType.other"
						:key="`${formatIssueMessage(issue.value)}_${issue.node}`"
						:issue="issue"
						:get-node-type="getNodeTypeByName"
						:format-issue-message="formatIssueMessage"
						@click="() => trackBuilderPlaceholders(issue)"
					/>
				</TransitionGroup>
			</div>
		</template>

		<!-- No Issues Section -->
		<template v-else-if="triggerNodes.length > 0">
			<p :class="$style.noIssuesMessage">
				{{
					builderStore.hasTodosHiddenByPinnedData
						? i18n.baseText('aiAssistant.builder.executeMessage.noIssuesWithPinData')
						: i18n.baseText('aiAssistant.builder.executeMessage.noIssues')
				}}
				<N8nTooltip v-if="builderStore.hasTodosHiddenByPinnedData" placement="top">
					<template #content>
						{{ i18n.baseText('aiAssistant.builder.executeMessage.unpinTooltip') }}
					</template>
					<N8nIcon icon="circle-help" size="small" :class="$style.infoIcon" />
				</N8nTooltip>
			</p>
		</template>

		<!-- Execution Button (hidden when follow-ups are shown instead) -->
		<N8nTooltip
			v-if="triggerNodes.length > 0 && !showFollowUps && !showPostExecutionFollowUps"
			:disabled="!hasValidationIssues"
			:content="executeButtonTooltip"
			placement="left"
		>
			<CanvasRunWorkflowButton
				:class="$style.runButton"
				:disabled="hasValidationIssues || builderStore.hasNoCreditsRemaining"
				:waiting-for-webhook="isExecutionWaitingForWebhook"
				:hide-tooltip="true"
				:label="i18n.baseText('aiAssistant.builder.executeMessage.execute')"
				:executing="isWorkflowRunning"
				:include-chat-trigger="true"
				size="medium"
				:trigger-nodes="availableTriggerNodes"
				:get-node-type="nodeTypesStore.getNodeType"
				:selected-trigger-node-name="workflowsStore.selectedTriggerNodeName"
				@execute="onExecute"
				@select-trigger-node="workflowsStore.setSelectedTriggerNodeName"
			/>
		</N8nTooltip>

		<!-- Unpin All Section (hidden when post-execution follow-ups provide the same actions) -->
		<div v-if="showUnpinSection && !showPostExecutionFollowUps" :class="$style.unpinSection">
			<N8nButton
				type="secondary"
				size="medium"
				icon="pin"
				:label="i18n.baseText('aiAssistant.builder.executeMessage.unpinAll')"
				@click="onUnpinAll"
			/>
			<span :class="$style.unpinIndividuallyText">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.unpinIndividually') }}
				<N8nTooltip placement="top">
					<template #content>
						{{ i18n.baseText('aiAssistant.builder.executeMessage.unpinTooltip') }}
					</template>
					<N8nIcon icon="circle-help" size="small" :class="$style.infoIcon" />
				</N8nTooltip>
			</span>
		</div>

		<!-- Pre-execution Follow-ups -->
		<div v-if="showFollowUps" :class="$style.followUpsSection">
			<span :class="$style.followUpsTitle">
				{{ followUpsTitle }}
			</span>
			<div
				:class="$style.followUpItem"
				role="button"
				tabindex="0"
				data-test-id="follow-up-execute-with-mock-data"
				@click="onExecuteWithMockData"
				@keydown.enter="onExecuteWithMockData"
			>
				<N8nIcon :class="$style.followUpIcon" icon="flask-conical" :size="14" />
				<span :class="$style.followUpText">
					{{ executeWithMockDataLabel }}
				</span>
			</div>
			<N8nTooltip :disabled="!hasValidationIssues" :content="executeButtonTooltip" placement="top">
				<div
					:class="[$style.followUpItem, { [$style.followUpItemDisabled]: hasValidationIssues }]"
					role="button"
					:tabindex="hasValidationIssues ? -1 : 0"
					:aria-disabled="hasValidationIssues"
					data-test-id="follow-up-execute-with-configured-data"
					@click="onExecute"
					@keydown.enter="onExecute"
				>
					<N8nIcon :class="$style.followUpIcon" icon="play" :size="14" />
					<span :class="$style.followUpText">
						{{ executeWithConfiguredDataLabel }}
					</span>
				</div>
			</N8nTooltip>
		</div>

		<!-- Post-execution Follow-ups -->
		<div v-if="showPostExecutionFollowUps" :class="$style.followUpsSection">
			<span :class="$style.followUpsTitle">
				{{ followUpsTitle }}
			</span>
			<div
				:class="$style.followUpItem"
				role="button"
				tabindex="0"
				data-test-id="follow-up-unpin-test-data"
				@click="onUnpinAll"
				@keydown.enter="onUnpinAll"
			>
				<N8nIcon :class="$style.followUpIcon" icon="pin" :size="14" />
				<span :class="$style.followUpText">
					{{ unpinTestDataLabel }}
				</span>
			</div>
			<div
				:class="$style.followUpItem"
				role="button"
				tabindex="0"
				data-test-id="follow-up-execute-and-refine"
				@click="onExecute"
				@keydown.enter="onExecute"
			>
				<N8nIcon :class="$style.followUpIcon" icon="play" :size="14" />
				<span :class="$style.followUpText">
					{{ executeAndRefineLabel }}
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
/* Fade transition animations for issue list */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	line-height: var(--line-height--lg);
	position: relative;
	font-size: var(--font-size--sm);
}

.description {
	margin: 0;
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
}

.noIssuesMessage {
	margin: 0;
	color: var(--color--text--shade-1);
}

.issuesBox {
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.issuesList {
	margin: 0;
	padding: 0;
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.runButton {
	align-self: stretch;
}

.unpinSection {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}

.unpinIndividuallyText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.infoIcon {
	color: var(--color--text--tint-1);
	cursor: help;
}

.followUpsSection {
	display: flex;
	flex-direction: column;
	border-top: var(--border);
	padding-top: var(--spacing--xs);
}

.followUpsTitle {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: 1.45;
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.followUpItem {
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs) 0;
	cursor: pointer;
	color: var(--color--text);

	&:hover {
		color: var(--color--primary);
	}
}

.followUpItemDisabled {
	cursor: not-allowed;
	opacity: 0.5;

	&:hover {
		color: var(--color--text);
	}
}

.followUpIcon {
	margin-right: var(--spacing--2xs);
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.followUpText {
	font-size: var(--font-size--sm);
}
</style>
