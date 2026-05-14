<script lang="ts" setup>
import WorkflowExecutionAnnotationPanel from './WorkflowExecutionAnnotationPanel.ee.vue';
import WorkflowExecutionAnnotationTags from './WorkflowExecutionAnnotationTags.ee.vue';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useExecutionDebugging } from '../../composables/useExecutionDebugging';
import type { IExecutionUIData } from '../../composables/useExecutionHelpers';
import { useExecutionHelpers } from '../../composables/useExecutionHelpers';
import type { WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { getResourcePermissions } from '@n8n/permissions';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { AnnotationVote, ExecutionSummary, ITaskData } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useExecutionsStore } from '../../executions.store';
import type { SingleNodeExecutionSummaryExtras } from '../../executions.types';
import {
	getSingleNodeHeadline,
	getCallerDisplay,
	getCallerNameSuffix,
} from '../../executions.utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';

import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import { N8nButton, N8nIconButton, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
import CallerKindBadge from '../CallerKindBadge.vue';
import SingleNodeExecutionDetail from './SingleNodeExecutionDetail.vue';
import VoteButtons from './VoteButtons.vue';

type RetryDropdownRef = InstanceType<typeof ElDropdown>;

const props = defineProps<{
	execution?: ExecutionSummary & SingleNodeExecutionSummaryExtras;
}>();

const emit = defineEmits<{
	deleteCurrentExecution: [];
	retryExecution: Array<{ execution: ExecutionSummary; command: string }>;
	stopExecution: [];
}>();

const route = useRoute();
const locale = useI18n();
const { showError } = useToast();

const executionHelpers = useExecutionHelpers();
const message = useMessage();
const executionDebugging = useExecutionDebugging();
const workflowsListStore = useWorkflowsListStore();
const settingsStore = useSettingsStore();
const retryDropdownRef = ref<RetryDropdownRef | null>(null);
const workflowId = useInjectWorkflowId();
const workflowPermissions = computed(
	() =>
		getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow,
);
const executionId = computed(() => route.params.executionId as string);
const nodeId = computed(() => route.params.nodeId as string);
const executionUIDetails = computed<IExecutionUIData | null>(() =>
	props.execution ? executionHelpers.getUIDetails(props.execution) : null,
);
const debugButtonData = computed(() =>
	props.execution?.status === 'success'
		? {
				text: locale.baseText('executionsList.debug.button.copyToEditor'),
				type: 'secondary' as const,
			}
		: {
				text: locale.baseText('executionsList.debug.button.debugInEditor'),
				type: 'primary' as const,
			},
);
const isRetriable = computed(
	() => !!props.execution && executionHelpers.isExecutionRetriable(props.execution),
);

/**
 * Single-node executions (n8n Hub Phase 5.3) don't map to a saved workflow,
 * so the detail view swaps the "Workflow: <name>" header for caller-attribution
 * and hides workflow-editing affordances.
 */
const isSingleNodeExecution = computed(() => props.execution?.mode === 'single-node');

/**
 * Hub placeholders execute exactly one node, conventionally named "Action".
 * Fall back to "Action" when the summary doesn't surface an explicit node name.
 *
 * The store types `activeExecution` as `ExecutionSummary`, but at runtime
 * `WorkflowExecutionsView` assigns the full `IExecutionResponse` to it, which
 * carries `executedNode` and `data.resultData.runData`. Narrow via an
 * intersection so we can read those fields without ad-hoc `as` casts at the
 * call sites.
 */
type ExecutionWithRunData = ExecutionSummary & {
	executedNode?: string;
	data?: { resultData?: { runData?: Record<string, ITaskData[]> } };
	workflowData?: { nodes?: Array<{ name: string; type: string; parameters?: unknown }> };
};

const activeExecutionWithRunData = computed(
	() => executionsStore.activeExecution as ExecutionWithRunData | null,
);

const executedNodeName = computed(
	() =>
		(props.execution as ExecutionWithRunData | undefined)?.executedNode ??
		activeExecutionWithRunData.value?.executedNode ??
		'Action',
);

/**
 * Pull the run data off the fully-fetched execution stored in the executions
 * store. The summary passed via the `execution` prop only covers metadata.
 */
const executionRunData = computed(
	() => activeExecutionWithRunData.value?.data?.resultData?.runData,
);

/**
 * The workflow snapshot stored alongside the execution. For Hub single-node
 * executions, this carries the placeholder `Action` node whose `parameters`
 * are the configured inputs we want to render in the detail view. Passing
 * the node list explicitly avoids re-fetching the workflow or relying on
 * the workflow store, which is keyed by the live workflow id.
 */
const executionWorkflowNodes = computed(
	() => activeExecutionWithRunData.value?.workflowData?.nodes,
);

/**
 * Header parts for the single-node detail view. Split into three slots so the
 * caller kind can render as an {@link CallerKindBadge} instead of inline text,
 * matching the list-row treatment.
 */
const singleNodeHeader = computed(() => {
	if (!isSingleNodeExecution.value || !props.execution) {
		return { prefix: '', kind: undefined, nameSuffix: '' };
	}
	const action = getSingleNodeHeadline(props.execution, '');
	const callerSegment = getCallerDisplay(props.execution.caller);
	const kind = props.execution.caller?.kind;
	const nameSuffix = getCallerNameSuffix(props.execution.caller);
	if (action && callerSegment) {
		return {
			prefix: locale.baseText('executionDetails.singleNode.headerNodeOnly', {
				interpolate: { nodeType: action },
			}),
			suffixPrefix: locale.baseText('executionsList.singleNode.viaPrefix'),
			kind,
			nameSuffix,
		};
	}
	if (action) {
		return {
			prefix: locale.baseText('executionDetails.singleNode.headerNoCaller', {
				interpolate: { nodeType: action },
			}),
			suffixPrefix: '',
			kind: undefined,
			nameSuffix: '',
		};
	}
	return {
		prefix: locale.baseText('executionDetails.singleNode.fallbackHeader'),
		suffixPrefix: '',
		kind: undefined,
		nameSuffix: '',
	};
});

const credentialsStore = useCredentialsStore();

/**
 * Cross-link back to the credential used by this hub call. Falls back through
 * three states: known credential → link, deleted/inaccessible → plain text id,
 * no `credentialId` on the summary → omit entirely.
 */
const credentialInfo = computed<{ id: string; name?: string; deleted: boolean } | null>(() => {
	if (!isSingleNodeExecution.value || !props.execution?.credentialId) return null;
	const credential = credentialsStore.getCredentialById(props.execution.credentialId);
	return {
		id: props.execution.credentialId,
		name: credential?.name,
		deleted: !credential,
	};
});

const isAnnotationEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);

const hasAnnotation = computed(
	() =>
		!!props.execution?.annotation &&
		(props.execution?.annotation.vote || props.execution?.annotation.tags.length > 0),
);

const executionsStore = useExecutionsStore();
const workflowHistoryStore = useWorkflowHistoryStore();

const workflowVersion = ref<WorkflowVersion | null>(null);

const workflowVersionLabel = computed(() => {
	if (!workflowVersion.value) return undefined;

	return workflowVersion.value.name ?? locale.baseText('executionDetails.versionAutosave');
});

const workflowVersionTooltip = computed(() => {
	if (!workflowVersion.value) return undefined;

	const { date, time } = convertToDisplayDate(workflowVersion.value.createdAt);

	return locale.baseText('executionDetails.versionTooltip', {
		interpolate: { date: `${date} ${time}` },
	});
});

const workflowVersionRoute = computed(() => {
	if (!workflowVersion.value) return null;

	return {
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: workflowVersion.value.workflowId,
			versionId: workflowVersion.value.versionId,
		},
	};
});

const executionMetaText = computed(() => {
	if (!executionUIDetails.value) return null;

	if (executionUIDetails.value.showTimestamp === false) {
		return null;
	}

	if (executionUIDetails.value.name === 'running') {
		return locale.baseText('executionDetails.runningTimeRunning', {
			interpolate: { time: executionUIDetails.value.runningTime },
		});
	}

	if (executionUIDetails.value.name !== 'waiting') {
		return locale.baseText('executionDetails.runningTimeFinished', {
			interpolate: { time: executionUIDetails.value.runningTime ?? 'unknown' },
		});
	}

	return null;
});

watch(
	() => props.execution?.workflowVersionId,
	async (versionId) => {
		workflowVersion.value = null;
		if (!versionId || !props.execution?.workflowId) return;
		try {
			const version = await workflowHistoryStore.getWorkflowVersion(
				props.execution.workflowId,
				versionId,
			);
			// Guard against stale response if execution changed during fetch
			if (props.execution?.workflowVersionId === versionId) {
				workflowVersion.value = version;
			}
		} catch {
			// Version may have been pruned — silently ignore
		}
	},
	{ immediate: true },
);

const activeExecution = computed(() => {
	return executionsStore.activeExecution as ExecutionSummary & {
		customData?: Record<string, string>;
	};
});

const vote = computed(() => activeExecution.value?.annotation?.vote || null);

async function onDeleteExecution(): Promise<void> {
	// Prepend the message with a note about annotations if they exist
	const confirmationText = [
		hasAnnotation.value && locale.baseText('executionDetails.confirmMessage.annotationsNote'),
		locale.baseText('executionDetails.confirmMessage.message'),
	]
		.filter(Boolean)
		.join(' ');

	const deleteConfirmed = await message.confirm(
		confirmationText,
		locale.baseText('executionDetails.confirmMessage.headline'),
		{
			type: 'warning',
			confirmButtonText: locale.baseText('executionDetails.confirmMessage.confirmButtonText'),
			cancelButtonText: '',
		},
	);
	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}
	emit('deleteCurrentExecution');
}

function handleRetryClick(command: string) {
	if (props.execution) {
		emit('retryExecution', { execution: props.execution, command });
	}
}

function handleStopClick() {
	emit('stopExecution');
}

function onRetryButtonBlur(event: FocusEvent) {
	// Hide dropdown when clicking outside of current document
	if (retryDropdownRef.value && event.relatedTarget === null) {
		retryDropdownRef.value.handleClose();
	}
}

const onVoteClick = async (voteValue: AnnotationVote) => {
	if (!activeExecution.value) {
		return;
	}

	const voteToSet = voteValue === vote.value ? null : voteValue;

	try {
		await executionsStore.annotateExecution(activeExecution.value.id, { vote: voteToSet });
	} catch (e) {
		showError(e, 'executionAnnotationView.vote.error');
	}
};
</script>

<template>
	<div v-if="executionUIDetails?.name === 'new'" :class="$style.newInfo">
		<N8nText :class="$style.newMessage" color="text-light">
			{{ locale.baseText('executionDetails.newMessage') }}
		</N8nText>
		<N8nButton variant="subtle" class="mt-l" @click="handleStopClick">
			{{ locale.baseText('executionsList.stopExecution') }}
		</N8nButton>
	</div>
	<div v-else-if="executionUIDetails?.name === 'running'" :class="$style.runningInfo">
		<div :class="$style.spinner">
			<N8nSpinner type="ring" />
		</div>
		<N8nText :class="$style.runningMessage" color="text-light">
			{{ locale.baseText('executionDetails.runningMessage') }}
		</N8nText>
		<N8nButton
			variant="subtle"
			data-test-id="stop-execution"
			class="mt-l"
			:disabled="!workflowPermissions.execute"
			@click="handleStopClick"
		>
			{{ locale.baseText('executionsList.stopExecution') }}
		</N8nButton>
	</div>
	<div
		v-else-if="executionUIDetails && isSingleNodeExecution && execution"
		:class="$style.previewContainer"
		:data-test-id="`execution-preview-details-${executionId}`"
	>
		<SingleNodeExecutionDetail
			:execution="execution"
			:run-data="executionRunData"
			:executed-node-name="executedNodeName"
			:workflow-nodes="executionWorkflowNodes"
		/>
	</div>
	<div v-else-if="executionUIDetails" :class="$style.previewContainer">
		<div
			v-if="execution"
			:class="$style.executionDetails"
			:data-test-id="`execution-preview-details-${executionId}`"
		>
			<div :class="$style.executionDetailsLeft">
				<div v-if="isSingleNodeExecution" :class="$style.singleNodeHeader">
					<div
						:class="$style.singleNodeHeaderTitle"
						data-test-id="execution-preview-single-node-header"
					>
						<N8nText size="large" color="text-dark" :bold="true">
							{{ singleNodeHeader.prefix }}
						</N8nText>
						<template v-if="singleNodeHeader.kind">
							<N8nText size="large" color="text-dark" :bold="true">
								{{ singleNodeHeader.suffixPrefix }}
							</N8nText>
							<CallerKindBadge :kind="singleNodeHeader.kind" />
							<N8nText
								v-if="singleNodeHeader.nameSuffix"
								size="large"
								color="text-dark"
								:bold="true"
							>
								{{ singleNodeHeader.nameSuffix }}
							</N8nText>
						</template>
					</div>
					<div
						v-if="credentialInfo"
						:class="$style.singleNodeCredential"
						data-test-id="execution-preview-credential"
					>
						<N8nText size="medium" color="text-base">
							{{ locale.baseText('executionDetails.singleNode.credentialLabel') }}:
						</N8nText>
						{{ ' ' }}
						<N8nText v-if="credentialInfo.deleted" size="medium" color="text-light">
							{{ locale.baseText('executionDetails.singleNode.credentialDeleted') }}
							({{ credentialInfo.id }})
						</N8nText>
						<RouterLink
							v-else
							:to="{
								name: VIEWS.CREDENTIALS,
								params: { credentialId: credentialInfo.id },
							}"
							:class="$style.credentialLink"
						>
							{{ credentialInfo.name ?? credentialInfo.id }}
						</RouterLink>
					</div>
				</div>
				<div v-else :class="$style.executionTitle">
					<N8nText size="large" color="text-dark" :bold="true" data-test-id="execution-time">{{
						executionUIDetails?.startTime
					}}</N8nText
					><VoteButtons
						v-if="isAnnotationEnabled && execution"
						data-test-id="execution-preview-vote-buttons"
						:vote="vote"
						:class="$style.voteButtons"
						@vote-click="onVoteClick"
					/>
				</div>
				<div :class="$style.executionDetailsInfo">
					<N8nSpinner
						v-if="executionUIDetails?.name === 'running'"
						size="small"
						:class="[$style.spinner, 'mr-4xs']"
					/>
					<N8nText
						size="medium"
						:class="[$style.status, $style[executionUIDetails.name]]"
						data-test-id="execution-preview-label"
					>
						{{ executionUIDetails.label }}
					</N8nText>
					{{ ' ' }}
					<N8nText
						v-if="executionUIDetails?.showTimestamp === false"
						color="text-base"
						size="medium"
					>
						| ID#{{ execution.id }}
						<template v-if="workflowVersionLabel && workflowVersionRoute">
							|
							<N8nText color="text-light">
								<N8nTooltip :content="workflowVersionTooltip" placement="bottom">
									<RouterLink
										:class="$style.versionLink"
										data-test-id="execution-preview-version-link"
										:to="workflowVersionRoute"
									>
										{{ workflowVersionLabel }}
									</RouterLink>
								</N8nTooltip>
							</N8nText>
						</template>
					</N8nText>
					<N8nText
						v-else-if="executionMetaText"
						color="text-base"
						size="medium"
						data-test-id="execution-preview-id"
					>
						{{ executionMetaText }}
						| ID#{{ execution.id }}
						<template v-if="workflowVersionLabel && workflowVersionRoute">
							|
							<N8nText color="text-light">
								<N8nTooltip :content="workflowVersionTooltip" placement="bottom">
									<RouterLink
										:class="$style.versionLink"
										data-test-id="execution-preview-version-link"
										:to="workflowVersionRoute"
									>
										{{ workflowVersionLabel }}
									</RouterLink>
								</N8nTooltip>
							</N8nText>
						</template>
					</N8nText>
				</div>
				<div v-if="execution.mode === 'retry'" :class="$style.executionDetailsRetry">
					<N8nText color="text-base" size="small">
						{{ locale.baseText('executionDetails.retry') }}
						<RouterLink
							:class="$style.executionLink"
							:to="{
								name: VIEWS.EXECUTION_PREVIEW,
								params: {
									workflowId: execution.workflowId,
									executionId: execution.retryOf,
								},
							}"
						>
							#{{ execution.retryOf }}
						</RouterLink>
					</N8nText>
				</div>
				<WorkflowExecutionAnnotationTags
					v-if="isAnnotationEnabled && execution"
					:execution="execution"
				/>
			</div>

			<div :class="$style.actions">
				<RouterLink
					v-if="!isSingleNodeExecution"
					:to="{
						name: VIEWS.EXECUTION_DEBUG,
						params: {
							workflowId: execution.workflowId,
							executionId: execution.id,
						},
					}"
				>
					<N8nButton
						size="medium"
						variant="subtle"
						:class="$style.debugLink"
						:disabled="!workflowPermissions.update"
					>
						<span
							data-test-id="execution-debug-button"
							@click="executionDebugging.handleDebugLinkClick"
						>
							{{ debugButtonData.text }}
						</span>
					</N8nButton>
				</RouterLink>

				<ElDropdown
					v-if="isRetriable"
					ref="retryDropdown"
					trigger="click"
					@command="handleRetryClick"
				>
					<span class="retry-button">
						<N8nIconButton
							variant="subtle"
							size="medium"
							:title="locale.baseText('executionsList.retryExecution')"
							:disabled="!workflowPermissions.update"
							icon="redo-2"
							data-test-id="execution-preview-retry-button"
							@blur="onRetryButtonBlur"
						/>
					</span>

					<template #dropdown>
						<ElDropdownMenu>
							<ElDropdownItem command="current-workflow">
								{{ locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
							</ElDropdownItem>
							<ElDropdownItem command="original-workflow">
								{{ locale.baseText('executionsList.retryWithOriginalWorkflow') }}
							</ElDropdownItem>
						</ElDropdownMenu>
					</template>
				</ElDropdown>

				<WorkflowExecutionAnnotationPanel
					v-if="isAnnotationEnabled && activeExecution"
					:execution="activeExecution"
				/>

				<N8nIconButton
					variant="subtle"
					:title="locale.baseText('executionDetails.deleteExecution')"
					:disabled="!workflowPermissions.update"
					icon="trash-2"
					size="medium"
					data-test-id="execution-preview-delete-button"
					@click="onDeleteExecution"
				/>
			</div>
		</div>

		<WorkflowPreview
			:key="executionId"
			data-test-id="workflow-preview"
			mode="execution"
			loader-type="spinner"
			:execution-id="executionId"
			:execution-mode="execution?.mode || ''"
			:node-id="nodeId"
		/>
	</div>
</template>

<style module lang="scss">
.previewContainer {
	position: relative;
	height: 100%;
	overflow: hidden;
}

.executionDetails {
	position: absolute;
	padding: var(--spacing--md);
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	transition: all 150ms ease-in-out;
	pointer-events: none;

	> div:last-child {
		display: flex;
		align-items: center;
	}

	& * {
		pointer-events: all;
	}
}

.executionDetailsLeft {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.executionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.singleNodeHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.singleNodeHeaderTitle {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.singleNodeCredential {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}

.credentialLink {
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.voteButtons {
	margin-bottom: 2px;
}

.spinner {
	div div {
		width: 30px;
		height: 30px;
		border-width: 2px;
	}
}

.running,
.spinner {
	color: var(--color--warning);
}

.waiting {
	color: var(--color--secondary);
}

.success {
	color: var(--color--success);
}

.error {
	color: var(--color--danger);
}

.newInfo,
.runningInfo {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing--4xl);
}

.newMessage,
.runningMessage {
	width: 240px;
	margin-top: var(--spacing--lg);
	text-align: center;
}

.debugLink {
	a > span {
		display: block;
		padding: var(--button--padding--vertical, var(--spacing--xs))
			var(--button--padding--horizontal, var(--spacing--md));
	}
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.highlightDataButton {
	height: 30px;
	width: 30px;
}

.highlightDataButtonActive {
	width: auto;
}

.highlightDataButtonOpen {
	color: var(--color--primary);
	background-color: var(--button--color--background--secondary--hover);
	border-color: var(--button--border-color--secondary--hover-active-focus);
}

.versionLink {
	color: var(--color--text--tint-1);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.badge {
	border: 0;
}
</style>
