<script lang="ts" setup>
import WorkflowExecutionAnnotationPanel from '@/components/executions/workflow/WorkflowExecutionAnnotationPanel.ee.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import type { IExecutionUIData } from '@/composables/useExecutionHelpers';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@/composables/useI18n';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/constants';
import { getResourcePermissions } from '@/permissions';
import { useExecutionsStore } from '@/stores/executions.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import { N8nButton, N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed, h, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

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

const testDefinitions = computed(
	() => testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId.value] ?? [],
);

const testDefinition = computed(() =>
	testDefinitions.value.find((test) => test.id === route.query.testId),
);

const disableAddToTestTooltip = computed(() => {
	if (props.execution.mode === 'evaluation') {
		return locale.baseText('testDefinition.executions.tooltip.noExecutions');
	}

	if (props.execution.status !== 'success') {
		return locale.baseText('testDefinition.executions.tooltip.onlySuccess');
	}

	return '';
});

type Command = {
	type: 'addTag' | 'removeTag' | 'createTest';
	id: string;
	name: string;
};

const getTagIds = (tags?: Array<{ id: string; name: string }>) => (tags ?? []).map((t) => t.id);

const addExecutionTag = async (annotationTagId: string) => {
	const newTags = [...getTagIds(props.execution?.annotation?.tags), annotationTagId];
	await executionsStore.annotateExecution(props.execution.id, { tags: newTags });
	toast.showToast({
		title: locale.baseText('testDefinition.executions.toast.addedTo.title'),
		message: h(
			N8nText,
			{
				color: 'primary',
				style: { cursor: 'pointer ' },
			},
			() => locale.baseText('testDefinition.executions.toast.closeTab'),
		),
		closeOnClick: false,
		onClick() {
			window.close();
		},
		type: 'success',
	});
};

const removeExecutionTag = async (annotationTagId: string) => {
	const newTags = getTagIds(props.execution?.annotation?.tags).filter(
		(id) => id !== annotationTagId,
	);
	await executionsStore.annotateExecution(props.execution.id, { tags: newTags });
	toast.showMessage({
		title: locale.baseText('testDefinition.executions.toast.removedFrom.title'),
		type: 'success',
	});
};

const createTestForExecution = async (id: string) => {
	await router.push({
		name: VIEWS.NEW_TEST_DEFINITION,
		params: {
			name: workflowId.value,
		},
		query: {
			executionId: id,
			annotationTags: getTagIds(props.execution?.annotation?.tags),
		},
	});
};

const commandCallbacks = {
	addTag: addExecutionTag,
	removeTag: removeExecutionTag,
	createTest: createTestForExecution,
} as const;

const handleCommand = async (command: Command) => {
	const action = commandCallbacks[command.type];
	return await action(command.id);
};

const testList = computed(() => {
	return testDefinitions.value.reduce<
		Array<{ label: string; value: string; added: boolean; command: Command }>
	>((acc, test) => {
		if (!test.annotationTagId) return acc;

		const added = isTagAlreadyAdded(test.annotationTagId);

		acc.push({
			label: test.name,
			value: test.annotationTagId,
			added,
			command: { type: added ? 'removeTag' : 'addTag', id: test.annotationTagId, name: test.name },
		});

		return acc;
	}, []);
});

function isTagAlreadyAdded(tagId?: string | null) {
	return Boolean(tagId && props.execution?.annotation?.tags.some((tag) => tag.id === tagId));
}

const executionHasTestTag = computed(() =>
	isTagAlreadyAdded(testDefinition.value?.annotationTagId),
);

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
			<div :class="$style.actions">
				<N8nTooltip
					placement="top"
					:content="disableAddToTestTooltip"
					:disabled="!disableAddToTestTooltip"
				>
					<ElDropdown
						trigger="click"
						placement="bottom-end"
						data-test-id="test-execution-crud"
						@command="handleCommand"
					>
						<div v-if="testDefinition" :class="$style.buttonGroup">
							<N8nButton
								v-if="executionHasTestTag"
								:disabled="!!disableAddToTestTooltip"
								type="secondary"
								data-test-id="test-execution-remove"
								@click.stop="removeExecutionTag(testDefinition.annotationTagId!)"
							>
								{{
									locale.baseText('testDefinition.executions.removeFrom', {
										interpolate: { name: testDefinition.name },
									})
								}}
							</N8nButton>

							<N8nButton
								v-else
								:disabled="!!disableAddToTestTooltip"
								type="primary"
								data-test-id="test-execution-add"
								@click.stop="addExecutionTag(testDefinition.annotationTagId!)"
							>
								{{
									locale.baseText('testDefinition.executions.addTo.existing', {
										interpolate: { name: testDefinition.name },
									})
								}}
							</N8nButton>
							<N8nIconButton
								:disabled="!!disableAddToTestTooltip"
								icon="angle-down"
								:type="executionHasTestTag ? 'secondary' : 'primary'"
								data-test-id="test-execution-toggle"
							/>
						</div>

						<N8nButton
							v-else
							:disabled="!!disableAddToTestTooltip"
							type="secondary"
							data-test-id="test-execution-toggle"
						>
							{{ locale.baseText('testDefinition.executions.addTo.new') }}
							<N8nIcon icon="angle-down" size="small" class="ml-2xs" />
						</N8nButton>

						<template #dropdown>
							<ElDropdownMenu :class="$style.testDropdownMenu">
								<div :class="$style.testDropdownMenuScroll">
									<ElDropdownItem
										v-for="test in testList"
										:key="test.value"
										:command="test.command"
										data-test-id="test-execution-add-to"
									>
										<N8nText
											:color="test.added ? 'primary' : 'text-dark'"
											:class="$style.fontMedium"
										>
											<N8nIcon v-if="test.added" icon="check" color="primary" />
											{{ test.label }}
										</N8nText>
									</ElDropdownItem>
								</div>
								<ElDropdownItem
									:class="$style.createTestButton"
									:command="{ type: 'createTest', id: execution.id }"
									:disabled="!workflowPermissions.update"
									data-test-id="test-execution-create"
								>
									<N8nText :class="$style.fontMedium">
										<N8nIcon icon="plus" />
										{{ locale.baseText('testDefinition.executions.tooltip.addTo') }}
									</N8nText>
								</ElDropdownItem>
							</ElDropdownMenu>
						</template>
					</ElDropdown>
				</N8nTooltip>

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

.testDropdownMenu {
	padding: 0;
}

.testDropdownMenuScroll {
	max-height: 274px;
	overflow-y: auto;
	overflow-x: hidden;
}

.createTestButton {
	border-top: 1px solid var(--color-foreground-base);
	background-color: var(--color-background-light-base);
	border-bottom-left-radius: var(--border-radius-base);
	border-bottom-right-radius: var(--border-radius-base);
	&:not(.is-disabled):hover {
		color: var(--color-primary);
	}
}

.fontMedium {
	font-weight: 600;
}

.buttonGroup {
	display: inline-flex;
	:global(.button:first-child) {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}
	:global(.button:last-child) {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: 0;
	}
}
</style>
