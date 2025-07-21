<script setup lang="ts">
import type { ComponentInstance } from 'vue';
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type {
	INodeParameterResourceLocator,
	INodeProperties,
	NodeParameterValue,
	ResourceLocatorModes,
} from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import ResourceLocatorDropdown from '@/components/ResourceLocator/ResourceLocatorDropdown.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { onClickOutside } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useWorkflowResourceLocatorDropdown } from './useWorkflowResourceLocatorDropdown';
import { useWorkflowResourceLocatorModes } from './useWorkflowResourceLocatorModes';
import { useWorkflowResourcesLocator } from './useWorkflowResourcesLocator';
import { useProjectsStore } from '@/stores/projects.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { VIEWS } from '@/constants';
import { SAMPLE_SUBWORKFLOW_TRIGGER_ID, SAMPLE_SUBWORKFLOW_WORKFLOW } from '@/constants.workflows';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
import { useDocumentVisibility } from '@/composables/useDocumentVisibility';

export interface Props {
	modelValue: INodeParameterResourceLocator;
	eventBus?: EventBus;
	inputSize?: 'small' | 'mini' | 'medium' | 'large' | 'xlarge';
	isValueExpression?: boolean;
	isReadOnly?: boolean;
	path: string;
	expressionDisplayValue?: string;
	forceShowExpression?: boolean;
	parameterIssues?: string[];
	parameter: INodeProperties;
	sampleWorkflow?: WorkflowDataCreate;
	newResourceLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
	eventBus: () => createEventBus(),
	inputSize: 'small',
	isValueExpression: false,
	isReadOnly: false,
	forceShowExpression: false,
	expressionDisplayValue: '',
	newResourceLabel: '',
	parameterIssues: () => [],
	sampleWorkflow: () => SAMPLE_SUBWORKFLOW_WORKFLOW,
});

const emit = defineEmits<{
	'update:modelValue': [value: INodeParameterResourceLocator];
	drop: [data: string];
	modalOpenerClick: [];
	focus: [];
	blur: [];
	workflowCreated: [workflowId: string];
}>();

const workflowsStore = useWorkflowsStore();
const projectStore = useProjectsStore();

const router = useRouter();
const i18n = useI18n();
const container = ref<HTMLDivElement>();
const dropdown = ref<ComponentInstance<typeof ResourceLocatorDropdown>>();
const telemetry = useTelemetry();

const width = ref(0);
const inputRef = ref<HTMLInputElement | undefined>();

const { isListMode, getUpdatedModePayload, selectedMode, supportedModes, getModeLabel } =
	useWorkflowResourceLocatorModes(
		computed(() => props.modelValue),
		router,
	);
const { hideDropdown, isDropdownVisible, showDropdown } = useWorkflowResourceLocatorDropdown(
	isListMode,
	inputRef,
);

const { onDocumentVisible } = useDocumentVisibility();

const {
	hasMoreWorkflowsToLoad,
	isLoadingResources,
	filteredResources,
	searchFilter,
	onSearchFilter,
	getWorkflowName,
	populateNextWorkflowsPage,
	setWorkflowsResources,
	reloadWorkflows,
	getWorkflowUrl,
} = useWorkflowResourcesLocator(router);

const currentProjectName = computed(() => {
	if (!projectStore.isTeamProjectFeatureEnabled) return '';

	if (!projectStore?.currentProject || projectStore.currentProject?.type === 'personal') {
		return `'${i18n.baseText('projects.menu.personal')}'`;
	}

	return `'${projectStore.currentProject?.name}'`;
});

const getCreateResourceLabel = computed(() => {
	if (props.newResourceLabel) {
		return props.newResourceLabel;
	}

	if (!currentProjectName.value) {
		return i18n.baseText('executeWorkflowTrigger.createNewSubworkflow.noProject');
	}

	return i18n.baseText('executeWorkflowTrigger.createNewSubworkflow', {
		interpolate: { projectName: currentProjectName.value },
	});
});

const valueToDisplay = computed<INodeParameterResourceLocator['value']>(() => {
	if (typeof props.modelValue !== 'object') {
		return props.modelValue ?? '';
	}

	if (isListMode.value) {
		return props.modelValue ? (props.modelValue.cachedResultName ?? props.modelValue.value) : '';
	}

	return props.modelValue ? props.modelValue.value : '';
});

const placeholder = computed(() => {
	if (isListMode.value) {
		return i18n.baseText('resourceLocator.mode.list.placeholder');
	}

	return i18n.baseText('resourceLocator.id.placeholder');
});

const showOpenResourceLink = computed(() => {
	return !props.isValueExpression && props.modelValue.value;
});

function setWidth() {
	const containerRef = container.value as HTMLElement | undefined;
	if (containerRef) {
		width.value = containerRef?.offsetWidth;
	}
}

function onInputChange(workflowId: NodeParameterValue): void {
	if (typeof workflowId !== 'string') return;

	const params: INodeParameterResourceLocator = {
		__rl: true,
		value: workflowId,
		mode: selectedMode.value,
	};
	if (isListMode.value) {
		const resource = workflowsStore.getWorkflowById(workflowId);
		if (resource?.name) {
			params.cachedResultName = getWorkflowName(workflowId);
		}
	}
	emit('update:modelValue', params);
}

function onListItemSelected(value: NodeParameterValue) {
	telemetry.track('User chose sub-workflow', {});
	onInputChange(value);
	hideDropdown();
}

function onInputFocus(): void {
	setWidth();
	emit('focus');
}

function onInputBlur(): void {
	emit('blur');
}

async function onDrop(data: string) {
	emit('drop', data);
}

function onModeSwitched(mode: ResourceLocatorModes) {
	emit('update:modelValue', getUpdatedModePayload(mode));
}
function onKeyDown(e: KeyboardEvent) {
	if (isDropdownVisible.value) {
		props.eventBus.emit('keyDown', e);
	}
}

function openWorkflow() {
	window.open(getWorkflowUrl(props.modelValue.value?.toString() ?? ''), '_blank');
}

async function refreshCachedWorkflow() {
	if (!props.modelValue || props.modelValue.mode !== 'list' || !props.modelValue.value) {
		return;
	}

	const workflowId = props.modelValue.value;
	try {
		await workflowsStore.fetchWorkflow(`${workflowId}`);
		onInputChange(workflowId);
	} catch (e) {
		// keep old cached value
	}
}

onDocumentVisible(refreshCachedWorkflow);

onMounted(() => {
	void refreshCachedWorkflow();
	window.addEventListener('resize', setWidth);
	setWidth();
	void setWorkflowsResources();
});

onUnmounted(() => {
	window.removeEventListener('resize', setWidth);
});

watch(
	() => props.isValueExpression,
	(isValueExpression) => {
		// Expressions are always in ID mode
		if (isValueExpression) {
			onModeSwitched('id');
		}
	},
);

onClickOutside(dropdown, () => {
	isDropdownVisible.value = false;
});

const onAddResourceClicked = async () => {
	const projectId = projectStore.currentProjectId;
	const sampleWorkflow = props.sampleWorkflow;
	const workflowName = sampleWorkflow.name ?? 'My Sub-Workflow';
	const sampleSubWorkflows = workflowsStore.allWorkflows.filter(
		(w) => w.name && new RegExp(workflowName).test(w.name),
	);

	const workflow: WorkflowDataCreate = {
		...sampleWorkflow,
		name: `${workflowName} ${sampleSubWorkflows.length + 1}`,
	};
	if (projectId) {
		workflow.projectId = projectId;
	}
	telemetry.track('User clicked create new sub-workflow button', {});

	const newWorkflow = await workflowsStore.createNewWorkflow(workflow);
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW,
		params: { name: newWorkflow.id, nodeId: SAMPLE_SUBWORKFLOW_TRIGGER_ID },
	});
	await reloadWorkflows();
	onInputChange(newWorkflow.id);
	hideDropdown();

	window.open(href, '_blank');

	emit('workflowCreated', newWorkflow.id);
};
</script>
<template>
	<div
		ref="container"
		:class="$style.container"
		:data-test-id="`resource-locator-${parameter.name}`"
	>
		<ResourceLocatorDropdown
			ref="dropdown"
			:show="isDropdownVisible"
			:filterable="true"
			:filter-required="false"
			:resources="filteredResources"
			:loading="isLoadingResources"
			:filter="searchFilter"
			:has-more="hasMoreWorkflowsToLoad"
			:error-view="false"
			:allow-new-resources="{
				label: getCreateResourceLabel,
			}"
			:width="width"
			:event-bus="eventBus"
			:model-value="modelValue.value"
			@update:model-value="onListItemSelected"
			@filter="onSearchFilter"
			@load-more="populateNextWorkflowsPage"
			@add-resource-click="onAddResourceClicked"
		>
			<template #error>
				<div :class="$style.error" data-test-id="rlc-error-container">
					<n8n-text color="text-dark" align="center" tag="div">
						{{ i18n.baseText('resourceLocator.mode.list.error.title') }}
					</n8n-text>
				</div>
			</template>
			<div
				:class="{
					[$style.resourceLocator]: true,
					[$style.multipleModes]: true,
				}"
			>
				<div
					:class="{
						[$style.background]: true,
						[$style.backgroundWithIssuesAndShowResourceLink]:
							showOpenResourceLink && parameterIssues?.length,
					}"
				/>
				<div :class="$style.modeSelector">
					<n8n-select
						:model-value="selectedMode"
						:size="inputSize"
						:disabled="isReadOnly"
						:placeholder="i18n.baseText('resourceLocator.modeSelector.placeholder')"
						data-test-id="rlc-mode-selector"
						@update:model-value="onModeSwitched"
					>
						<n8n-option
							v-for="mode in supportedModes"
							:key="mode.name"
							:value="mode.name"
							:label="getModeLabel(mode)"
							:disabled="isValueExpression && mode.name === 'list'"
							:title="
								isValueExpression && mode.name === 'list'
									? i18n.baseText('resourceLocator.mode.list.disabled.title')
									: ''
							"
						>
							{{ getModeLabel(mode) }}
						</n8n-option>
					</n8n-select>
				</div>

				<div :class="$style.inputContainer" data-test-id="rlc-input-container">
					<DraggableTarget
						type="mapping"
						:sticky="true"
						:sticky-offset="isValueExpression ? [26, 3] : [3, 3]"
						@drop="onDrop"
					>
						<template #default="{ droppable, activeDrop }">
							<div
								:class="{
									[$style.listModeInputContainer]: isListMode,
									[$style.droppable]: droppable,
									[$style.activeDrop]: activeDrop,
								}"
								@keydown.stop="onKeyDown"
							>
								<ExpressionParameterInput
									v-if="isValueExpression || forceShowExpression"
									ref="input"
									:model-value="expressionDisplayValue"
									:path="path"
									:is-read-only="isReadOnly"
									:rows="3"
									@update:model-value="onInputChange"
									@modal-opener-click="emit('modalOpenerClick')"
								/>
								<n8n-input
									v-else
									ref="input"
									:class="{ [$style.selectInput]: isListMode }"
									:size="inputSize"
									:model-value="valueToDisplay"
									:disabled="isReadOnly"
									:readonly="isListMode"
									:placeholder="placeholder"
									type="text"
									data-test-id="rlc-input"
									@update:model-value="onInputChange"
									@click="showDropdown"
									@focus="onInputFocus"
									@blur="onInputBlur"
								>
									<template v-if="isListMode" #suffix>
										<i
											:class="{
												['el-input__icon']: true,
												['el-icon-arrow-down']: true,
												[$style.selectIcon]: true,
												[$style.isReverse]: isDropdownVisible,
											}"
										/>
									</template>
								</n8n-input>
							</div>
						</template>
					</DraggableTarget>

					<ParameterIssues
						v-if="parameterIssues && parameterIssues.length"
						:issues="parameterIssues"
						:class="$style['parameter-issues']"
					/>
					<div
						v-if="showOpenResourceLink"
						:class="$style.openResourceLink"
						data-test-id="rlc-open-resource-link"
					>
						<n8n-link theme="text" @click.stop="openWorkflow()">
							<n8n-icon icon="external-link" :title="'Open resource link'" />
						</n8n-link>
					</div>
				</div>
			</div>
		</ResourceLocatorDropdown>
	</div>
</template>

<style lang="scss" module>
@import '@/components/ResourceLocator/resourceLocator.scss';
</style>
