<script lang="ts" setup>
import WorkflowExecutionAnnotationPanel from '@/components/executions/workflow/WorkflowExecutionAnnotationPanel.ee.vue';
import WorkflowExecutionAnnotationTags from '@/components/executions/workflow/WorkflowExecutionAnnotationTags.ee.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import type { IExecutionUIData } from '@/composables/useExecutionHelpers';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/constants';
import { getResourcePermissions } from '@n8n/permissions';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import type { AnnotationVote, ExecutionSummary } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useExecutionsStore } from '@/stores/executions.store';

type RetryDropdownRef = InstanceType<typeof ElDropdown>;

const props = defineProps<{
	execution: ExecutionSummary;
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
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const retryDropdownRef = ref<RetryDropdownRef | null>(null);
const workflowId = computed(() => route.params.name as string);
const workflowPermissions = computed(
	() => getResourcePermissions(workflowsStore.getWorkflowById(workflowId.value)?.scopes).workflow,
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

const isAnnotationEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);

const hasAnnotation = computed(
	() =>
		!!props.execution?.annotation &&
		(props.execution?.annotation.vote || props.execution?.annotation.tags.length > 0),
);

const executionsStore = useExecutionsStore();

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
	emit('retryExecution', { execution: props.execution, command });
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
		<N8nButton class="mt-l" type="tertiary" @click="handleStopClick">
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
			data-test-id="stop-execution"
			class="mt-l"
			type="tertiary"
			:disabled="!workflowPermissions.execute"
			@click="handleStopClick"
		>
			{{ locale.baseText('executionsList.stopExecution') }}
		</N8nButton>
	</div>
	<div v-else-if="executionUIDetails" :class="$style.previewContainer">
		<div
			v-if="execution"
			:class="$style.executionDetails"
			:data-test-id="`execution-preview-details-${executionId}`"
		>
			<div :class="$style.executionDetailsLeft">
				<div :class="$style.executionTitle">
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
					</N8nText>
					<N8nText
						v-else-if="executionUIDetails.name === 'running'"
						color="text-base"
						size="medium"
					>
						{{
							locale.baseText('executionDetails.runningTimeRunning', {
								interpolate: { time: executionUIDetails?.runningTime },
							})
						}}
						| ID#{{ execution.id }}
					</N8nText>
					<N8nText
						v-else-if="executionUIDetails.name !== 'waiting'"
						color="text-base"
						size="medium"
						data-test-id="execution-preview-id"
					>
						{{
							locale.baseText('executionDetails.runningTimeFinished', {
								interpolate: { time: executionUIDetails?.runningTime ?? 'unknown' },
							})
						}}
						| ID#{{ execution.id }}
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
					:to="{
						name: VIEWS.EXECUTION_DEBUG,
						params: {
							name: execution.workflowId,
							executionId: execution.id,
						},
					}"
				>
					<N8nButton
						size="medium"
						:type="debugButtonData.type"
						:class="$style.debugLink"
						:disabled="!workflowPermissions.update"
					>
						<span
							data-test-id="execution-debug-button"
							@click="executionDebugging.handleDebugLinkClick"
							>{{ debugButtonData.text }}</span
						>
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
							size="medium"
							type="tertiary"
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
					:title="locale.baseText('executionDetails.deleteExecution')"
					:disabled="!workflowPermissions.update"
					icon="trash-2"
					size="medium"
					type="tertiary"
					data-test-id="execution-preview-delete-button"
					@click="onDeleteExecution"
				/>
			</div>
		</div>
		<WorkflowPreview
			:key="executionId"
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
	padding: var(--spacing-m);
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
	gap: var(--spacing-5xs);
}

.executionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
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
	color: var(--color-warning);
}
.waiting {
	color: var(--color-secondary);
}
.success {
	color: var(--color-success);
}
.error {
	color: var(--color-danger);
}

.newInfo,
.runningInfo {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing-4xl);
}

.newMessage,
.runningMessage {
	width: 240px;
	margin-top: var(--spacing-l);
	text-align: center;
}

.debugLink {
	a > span {
		display: block;
		padding: var(--button-padding-vertical, var(--spacing-xs))
			var(--button-padding-horizontal, var(--spacing-m));
	}
}

.actions {
	display: flex;
	gap: var(--spacing-2xs);
}

.highlightDataButton {
	height: 30px;
	width: 30px;
}

.highlightDataButtonActive {
	width: auto;
}

.highlightDataButtonOpen {
	color: var(--color-primary);
	background-color: var(--color-button-secondary-hover-background);
	border-color: var(--color-button-secondary-hover-active-focus-border);
}

.badge {
	border: 0;
}
</style>
