<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElDropdown } from 'element-plus';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import { useMessage } from '@/composables/useMessage';
import WorkflowExecutionAnnotationPanel from '@/components/executions/workflow/WorkflowExecutionAnnotationPanel.ee.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/constants';
import type { ExecutionSummary } from 'n8n-workflow';
import type { IExecutionUIData } from '@/composables/useExecutionHelpers';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@/composables/useI18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { getResourcePermissions } from '@/permissions';
import { useSettingsStore } from '@/stores/settings.store';
import type { ButtonType } from '@n8n/design-system';
import { useExecutionsStore } from '@/stores/executions.store';
import ProjectCreateResource from '@/components/Projects/ProjectCreateResource.vue';
import { useToast } from '@/composables/useToast';

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
const router = useRouter();
const locale = useI18n();

const executionHelpers = useExecutionHelpers();
const message = useMessage();
const toast = useToast();
const executionDebugging = useExecutionDebugging();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const testDefinitionStore = useTestDefinitionStore();
const executionsStore = useExecutionsStore();
const retryDropdownRef = ref<RetryDropdownRef | null>(null);
const actionToggleRef = ref<InstanceType<typeof ProjectCreateResource> | null>(null);
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
				type: 'secondary',
			}
		: {
				text: locale.baseText('executionsList.debug.button.debugInEditor'),
				type: 'primary',
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

const testDefinitions = computed(
	() => testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId.value],
);

const testDefinition = computed(() =>
	testDefinitions.value.find((test) => test.id === route.query.testId),
);

const addToTestActions = computed(() => {
	const testAction = testDefinitions.value
		.filter((test) => test.annotationTagId)
		.map((test) => {
			const isAlreadyAdded = isTagAlreadyAdded(test.annotationTagId ?? '');
			return {
				label: `${test.name}`,
				value: test.annotationTagId ?? '',
				disabled: !workflowPermissions.value.update || isAlreadyAdded,
			};
		});

	const newTestAction = {
		label: '+ New Test',
		value: 'new',
		disabled: !workflowPermissions.value.update,
	};

	return [newTestAction, ...testAction];
});

function getTestButtonLabel(isAdded: boolean): string {
	if (isAdded) {
		return locale.baseText('testDefinition.executions.addedTo', {
			interpolate: { name: testDefinition.value?.name ?? '' },
		});
	}
	return testDefinition.value
		? locale.baseText('testDefinition.executions.addTo.existing', {
				interpolate: { name: testDefinition.value.name },
			})
		: locale.baseText('testDefinition.executions.addTo.new');
}

const addTestButtonData = computed<{ label: string; type: ButtonType }>(() => {
	const isAdded = isTagAlreadyAdded(route.query.tag as string);
	return {
		label: getTestButtonLabel(isAdded),
		type: route.query.testId ? 'primary' : 'secondary',
		disabled: !workflowPermissions.value.update || isAdded,
	};
});

function isTagAlreadyAdded(tagId?: string | null) {
	return Boolean(tagId && props.execution?.annotation?.tags.some((tag) => tag.id === tagId));
}

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

async function handleAddToTestAction(actionValue: string) {
	if (actionValue === 'new') {
		await router.push({
			name: VIEWS.NEW_TEST_DEFINITION,
			params: {
				name: workflowId.value,
			},
		});
		return;
	}
	const currentTags = props.execution?.annotation?.tags ?? [];
	const newTags = [...currentTags.map((t) => t.id), actionValue];
	await executionsStore.annotateExecution(props.execution.id, { tags: newTags });
	toast.showMessage({
		title: locale.baseText('testDefinition.executions.toast.addedTo.title'),
		message: locale.baseText('testDefinition.executions.toast.addedTo', {
			interpolate: { name: testDefinition.value?.name ?? '' },
		}),
		type: 'success',
	});
}

async function handleEvaluationButton() {
	if (!testDefinition.value) {
		actionToggleRef.value?.openActionToggle(true);
	} else {
		await handleAddToTestAction(route.query.tag as string);
	}
}

onMounted(async () => {
	await testDefinitionStore.fetchTestDefinitionsByWorkflowId(workflowId.value);
});
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
			<WorkflowExecutionAnnotationPanel v-if="isAnnotationEnabled && execution" />
			<div>
				<N8nText size="large" color="text-base" :bold="true" data-test-id="execution-time">{{
					executionUIDetails?.startTime
				}}</N8nText
				><br />
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
				<N8nText v-if="executionUIDetails?.showTimestamp === false" color="text-base" size="medium">
					| ID#{{ execution.id }}
				</N8nText>
				<N8nText v-else-if="executionUIDetails.name === 'running'" color="text-base" size="medium">
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
				<br /><N8nText v-if="execution.mode === 'retry'" color="text-base" size="medium">
					{{ locale.baseText('executionDetails.retry') }}
					<router-link
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
					</router-link>
				</N8nText>
			</div>
			<div :class="$style.actions">
				<ProjectCreateResource
					v-if="testDefinitions && testDefinitions.length"
					ref="actionToggleRef"
					:actions="addToTestActions"
					:type="addTestButtonData.type"
					@action="handleAddToTestAction"
				>
					<N8nButton
						data-test-id="add-to-test-button"
						v-bind="addTestButtonData"
						@click="handleEvaluationButton"
					/>
				</ProjectCreateResource>
				<router-link
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
				</router-link>

				<ElDropdown
					v-if="isRetriable"
					ref="retryDropdown"
					trigger="click"
					class="mr-xs"
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
	padding-right: var(--spacing-xl);
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
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
	gap: var(--spacing-xs);
}
</style>
