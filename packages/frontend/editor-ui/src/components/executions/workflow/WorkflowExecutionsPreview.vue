<script lang="ts" setup>
import WorkflowExecutionAnnotationPanel from '@/components/executions/workflow/WorkflowExecutionAnnotationPanel.ee.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import type { IExecutionUIData } from '@/composables/useExecutionHelpers';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/constants';
import { getResourcePermissions } from '@/permissions';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import type { AnnotationVote, ExecutionSummary } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useExecutionsStore } from '@/stores/executions.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useTelemetry } from '@/composables/useTelemetry';
import AnnotationTagsDropdown from '@/components/AnnotationTagsDropdown.ee.vue';

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
const telemetry = useTelemetry();
const { showError } = useToast();

const executionHelpers = useExecutionHelpers();
const message = useMessage();
const executionDebugging = useExecutionDebugging();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const retryDropdownRef = ref<RetryDropdownRef | null>(null);
const annotationDropdownRef = ref<RetryDropdownRef | null>(null);
const isDropdownVisible = ref(false);
const workflowId = computed(() => route.params.name as string);
const workflowPermissions = computed(
	() => getResourcePermissions(workflowsStore.getWorkflowById(workflowId.value)?.scopes).workflow,
);
const executionId = computed(() => route.params.executionId as string);
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

const tagIds = computed(() => activeExecution.value?.annotation?.tags.map((tag) => tag.id) ?? []);
const tags = computed(() => activeExecution.value?.annotation?.tags);
const tagsEventBus = createEventBus();
const isTagsEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsSaving = ref(false);

const customDataLength = computed(() => {
	return activeExecution.value?.customData
		? Object.keys(activeExecution.value.customData).length
		: 0;
});

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

function onEllipsisButtonBlur(event: FocusEvent) {
	// Hide dropdown when clicking outside of current document
	if (annotationDropdownRef.value && event.relatedTarget === null) {
		annotationDropdownRef.value.handleClose();
	}
}

function onDropdownVisibleChange(visible: boolean) {
	isDropdownVisible.value = visible;
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

const tagsHasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

const onTagsEditEnable = () => {
	appliedTagIds.value = tagIds.value;
	isTagsEditEnabled.value = true;

	setTimeout(() => {
		tagsEventBus.emit('focus');
	}, 0);
};

const onTagsBlur = async () => {
	if (!activeExecution.value) {
		return;
	}

	const currentTagIds = tagIds.value ?? [];
	const newTagIds = appliedTagIds.value;

	if (!tagsHasChanged(currentTagIds, newTagIds)) {
		isTagsEditEnabled.value = false;
		return;
	}

	if (tagsSaving.value) {
		return;
	}

	tagsSaving.value = true;

	try {
		await executionsStore.annotateExecution(activeExecution.value.id, { tags: newTagIds });

		if (newTagIds.length > 0) {
			telemetry.track('User added execution annotation tag', {
				tag_ids: newTagIds,
				execution_id: activeExecution.value.id,
			});
		}
	} catch (e) {
		showError(e, 'executionAnnotationView.tag.error');
	}

	tagsSaving.value = false;
	isTagsEditEnabled.value = false;
};

const onTagsEditEsc = () => {
	isTagsEditEnabled.value = false;
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
				<div :class="$style.executionDetailsRetry" v-if="execution.mode === 'retry'">
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
				<div :class="$style.executionDetailsTags" v-if="isAnnotationEnabled && execution">
					<span :class="$style.tags" data-test-id="annotation-tags-container">
						<AnnotationTagsDropdown
							v-if="isTagsEditEnabled"
							ref="dropdown"
							v-model="appliedTagIds"
							:create-enabled="true"
							:event-bus="tagsEventBus"
							:placeholder="locale.baseText('executionAnnotationView.chooseOrCreateATag')"
							class="tags-edit"
							data-test-id="workflow-tags-dropdown"
							@blur="onTagsBlur"
							@esc="onTagsEditEsc"
						/>
						<div v-else-if="tagIds.length === 0">
							<N8nButton
								:class="[$style.addTagButton, 'clickable']"
								:label="locale.baseText('executionAnnotationView.addTag')"
								type="secondary"
								size="mini"
								:outline="false"
								:text="true"
								@click="onTagsEditEnable"
								data-test-id="new-tag-link"
								icon="plus"
							/>
						</div>

						<span
							v-else
							:class="[
								'tags-container', // FIXME: There are some global styles for tags relying on this classname
								$style.tagsContainer,
							]"
							data-test-id="execution-annotation-tags"
							@click="onTagsEditEnable"
						>
							<span v-for="tag in tags" :key="tag.id" class="clickable">
								<el-tag :title="tag.name" type="info" size="small" :disable-transitions="true">
									{{ tag.name }}
								</el-tag>
							</span>
							<span :class="$style.addTagWrapper">
								<N8nButton
									:class="[$style.addTagButton, $style.addTagButtonIconOnly, 'clickable']"
									type="secondary"
									size="mini"
									:outline="false"
									:text="true"
									@click="onTagsEditEnable"
									data-test-id="new-tag-link"
									icon="plus"
								/>
							</span>
						</span>
					</span>
				</div>
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
							icon="redo"
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

				<ElDropdown
					v-if="isAnnotationEnabled && execution"
					ref="annotationDropdownRef"
					trigger="click"
					@visible-change="onDropdownVisibleChange"
				>
					<N8nButton
						:title="locale.baseText('executionDetails.additionalActions')"
						:disabled="!workflowPermissions.update"
						icon="tasks"
						:class="[
							$style.highlightDataButton,
							customDataLength > 0 ? $style.highlightDataButtonActive : '',
							isDropdownVisible ? $style.highlightDataButtonOpen : '',
						]"
						size="small"
						type="secondary"
						data-test-id="execution-preview-ellipsis-button"
						@blur="onEllipsisButtonBlur"
					>
						<n8n-badge :class="$style.badge" theme="primary" v-if="customDataLength > 0">
							{{ customDataLength.toString() }}
						</n8n-badge>
					</N8nButton>
					<template #dropdown>
						<WorkflowExecutionAnnotationPanel v-if="execution" />
					</template>
				</ElDropdown>

				<N8nIconButton
					:title="locale.baseText('executionDetails.deleteExecution')"
					:disabled="!workflowPermissions.update"
					icon="trash"
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

.tags {
	display: block;
	margin-top: var(--spacing-4xs);
}

.addTagButton {
	height: 24px;
	font-size: var(--font-size-2xs);
	white-space: nowrap;
	padding: var(--spacing-4xs) var(--spacing-3xs);
	background-color: var(--color-button-secondary-background);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-regular);

	&:hover {
		color: $color-primary;
		text-decoration: none;
		background-color: var(--color-button-secondary-hover-background);
		border: 1px solid var(--color-button-secondary-hover-active-focus-border);
		border-radius: var(--border-radius-base);
	}

	span + span {
		margin-left: var(--spacing-4xs);
	}
}
.addTagButtonIconOnly {
	height: 22px;
	width: 22px;
}

.tagsContainer {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-4xs);
	max-width: 360px;

	:global(.el-tag) {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: max-content;
		height: var(--tag-height);
		padding: var(--tag-padding);
		line-height: var(--tag-line-height);
		color: var(--tag-text-color);
		background-color: var(--tag-background-color);
		border: 1px solid var(--tag-border-color);
		border-radius: var(--tag-border-radius);
		font-size: var(--tag-font-size);
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
