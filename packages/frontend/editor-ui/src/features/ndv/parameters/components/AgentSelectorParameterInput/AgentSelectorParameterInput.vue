<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type {
	INodeParameterResourceLocator,
	INodeProperties,
	NodeParameterValue,
	ResourceLocatorModes,
} from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { onClickOutside } from '@vueuse/core';
import DraggableTarget from '@/app/components/DraggableTarget.vue';
import ExpressionParameterInput from '../ExpressionParameterInput.vue';
import ResourceLocatorDropdown from '../ResourceLocator/ResourceLocatorDropdown.vue';
import ParameterIssues from '../ParameterIssues.vue';
import { useResourceLocatorDropdown } from '../../composables/useResourceLocatorDropdown';
import { useResourceLocatorModes } from '../../composables/useResourceLocatorModes';
import { useAgentResourcesLocator } from '../../composables/useAgentResourcesLocator';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectNDVStoreIfProvided } from '@/features/ndv/shared/ndv.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { createAgent } from '@/features/agents/composables/useAgentApi';
import { upsertProjectAgentsListCache } from '@/features/agents/composables/useProjectAgentsList';
import { useAgentNavigation } from '@/features/agents/composables/useAgentNavigation';

import { N8nButton, N8nIcon, N8nInput, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';

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
	newResourceLabel?: string;
	/**
	 * Origin node id for the "Back to workflow" return context. Set by the canvas
	 * agent card (AGENT-274), which renders this picker outside the NDV; in the
	 * NDV the active node is resolved from the NDV store instead.
	 */
	originNodeId?: string;
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
});

const emit = defineEmits<{
	'update:modelValue': [value: INodeParameterResourceLocator];
	drop: [data: string];
	modalOpenerClick: [];
	focus: [];
	blur: [];
	agentCreateRequested: [];
}>();

const i18n = useI18n();
const projectStore = useProjectsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const ndvStore = injectNDVStoreIfProvided();
const rootStore = useRootStore();
const toast = useToast();
const telemetry = useTelemetry();
const nav = useAgentNavigation();

const container = ref<HTMLDivElement>();
const dropdown = ref<ComponentPublicInstance<typeof ResourceLocatorDropdown>>();
const inputRef = ref<HTMLInputElement | undefined>();
const width = ref(0);

// Scope to the workflow's owning project so the picker only lists agents that
// execution can resolve. Falls back to the workflow's home project (shared
// personal workflows have no `currentProject`) and finally the personal
// project, mirroring how execution resolves the agent's owning project.
const projectId = computed(
	() =>
		projectStore.currentProjectId ??
		workflowDocumentStore.value?.homeProject?.id ??
		projectStore.personalProject?.id ??
		'',
);

// Resolve a project by id from the stores the picker already has loaded, so the
// "+ Create agent" label and the per-agent subtitle stay consistent with the
// `projectId` the catalog is scoped to.
function findProject(id: string) {
	if (!id) return null;
	if (projectStore.currentProject?.id === id) return projectStore.currentProject;
	if (projectStore.personalProject?.id === id) return projectStore.personalProject;
	return projectStore.myProjects.find((candidate) => candidate.id === id) ?? null;
}

function resolveProjectName(id: string): string | null {
	// Only surface a project subtitle for non-personal team projects
	if (!projectStore.isTeamProjectFeatureEnabled) return null;
	const project = findProject(id);
	if (!project || project.type === 'personal') return null;
	return project.name ?? null;
}

const {
	agentsResources,
	isLoadingResources,
	loadError,
	hasMoreAgentsToLoad,
	searchFilter,
	onSearchFilter,
	getAgentName,
	loadMore,
	setAgentsResources,
} = useAgentResourcesLocator(projectId, resolveProjectName);

const { isListMode, getUpdatedModePayload, selectedMode, supportedModes, getModeLabel } =
	useResourceLocatorModes(
		computed(() => props.modelValue),
		getAgentName,
	);

const { hideDropdown, isDropdownVisible, showDropdown } = useResourceLocatorDropdown(
	isListMode,
	inputRef,
);

const currentProjectName = computed(() => {
	if (!projectStore.isTeamProjectFeatureEnabled) return '';

	const project = findProject(projectId.value);
	if (!project || project.type === 'personal') {
		return `'${i18n.baseText('projects.menu.personal')}'`;
	}

	return `'${project.name}'`;
});

const getCreateResourceLabel = computed(() => {
	if (props.newResourceLabel) {
		return props.newResourceLabel;
	}

	if (!currentProjectName.value) {
		return i18n.baseText('agentSelector.createNewAgent.noProject');
	}

	return i18n.baseText('agentSelector.createNewAgent', {
		interpolate: { projectName: currentProjectName.value },
	});
});

const isAgentCreationEnabled = true;

const newResourceOptions = computed(() =>
	isAgentCreationEnabled ? { label: getCreateResourceLabel.value } : {},
);

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

function setWidth() {
	const containerRef = container.value as HTMLElement | undefined;
	if (containerRef) {
		width.value = containerRef?.offsetWidth;
	}
}

function onInputChange(agentId: NodeParameterValue): void {
	if (typeof agentId !== 'string') return;

	const params: INodeParameterResourceLocator = {
		__rl: true,
		value: agentId,
		mode: selectedMode.value,
	};
	if (isListMode.value) {
		const name = getAgentName(agentId);
		if (name && name !== agentId) {
			params.cachedResultName = name;
		}
	}
	emit('update:modelValue', params);
}

function onListItemSelected(value: NodeParameterValue) {
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

// Eagerly create a draft agent primitive, reference it on the node, and open the
// Agent Builder for it — mirroring the sub-workflow "+ Create" flow in
// WorkflowSelectorParameterInput. An abandoned create leaves a harmless draft in
// the catalog (the draft/published model keeps production executions safe).
async function onAddResourceClicked() {
	hideDropdown();
	if (!projectId.value) {
		toast.showError(
			new Error(i18n.baseText('agentSelector.createAgentFailed')),
			i18n.baseText('agentSelector.createAgentFailed'),
		);
		return;
	}

	try {
		const agent = await createAgent(
			rootStore.restApiContext,
			projectId.value,
			i18n.baseText('agents.new.defaultName'),
		);
		upsertProjectAgentsListCache(projectId.value, agent);
		emit('update:modelValue', {
			__rl: true,
			value: agent.id,
			mode: selectedMode.value,
			cachedResultName: agent.name,
		});
		// Keep the picker's own list consistent if it is reopened.
		void setAgentsResources();
		telemetry.track('User created agent', { agent_id: agent.id, source: 'node_picker' });
		emit('agentCreateRequested');
		await nav.openBuilder(
			projectId.value,
			agent.id,
			props.originNodeId ?? ndvStore.value?.activeNode?.id,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSelector.createAgentFailed'));
	}
}

async function onRetry() {
	await setAgentsResources();
}

onMounted(() => {
	window.addEventListener('resize', setWidth);
	setWidth();
	void setAgentsResources();
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

defineExpose({ showDropdown });
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
			:resources="agentsResources"
			:loading="isLoadingResources"
			:filter="searchFilter"
			:has-more="hasMoreAgentsToLoad"
			:error-view="!!loadError"
			:allow-new-resources="newResourceOptions"
			:width="width"
			:event-bus="eventBus"
			:model-value="modelValue"
			:disable-inactive-items="false"
			@update:model-value="onListItemSelected"
			@filter="onSearchFilter"
			@load-more="loadMore"
			@add-resource-click="onAddResourceClicked"
		>
			<template #error>
				<div :class="$style.errorContainer" data-test-id="rlc-error-container">
					<N8nText color="text-dark" align="center" tag="div">
						{{ i18n.baseText('resourceLocator.mode.list.error.title') }}
					</N8nText>
					<N8nButton
						type="tertiary"
						size="small"
						:label="i18n.baseText('generic.retry')"
						data-test-id="rlc-error-retry"
						@click="onRetry"
					/>
				</div>
			</template>
			<div
				:class="{
					[$style.resourceLocator]: true,
					[$style.multipleModes]: true,
				}"
			>
				<div :class="$style.modeSelector">
					<N8nSelect
						:model-value="selectedMode"
						:size="inputSize"
						:disabled="isReadOnly"
						:placeholder="i18n.baseText('resourceLocator.modeSelector.placeholder')"
						data-test-id="rlc-mode-selector"
						@update:model-value="onModeSwitched"
					>
						<N8nOption
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
						</N8nOption>
					</N8nSelect>
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
								<N8nInput
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
										<N8nIcon
											icon="chevron-down"
											:class="{
												[$style.selectIcon]: true,
												[$style.isReverse]: isDropdownVisible,
											}"
										/>
									</template>
								</N8nInput>
							</div>
						</template>
					</DraggableTarget>

					<ParameterIssues
						v-if="parameterIssues && parameterIssues.length"
						:issues="parameterIssues"
						:class="$style['parameter-issues']"
					/>
				</div>
			</div>
		</ResourceLocatorDropdown>
	</div>
</template>

<style lang="scss" module>
@use '../ResourceLocator/resourceLocator.scss';
</style>
