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
	 * Hide the list/ID mode selector and render the list picker on its own. Used
	 * on the canvas card, where the agent is always picked from the list.
	 */
	hideModeSelector?: boolean;
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
	hideModeSelector: false,
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

// The create action is hidden until AGENT-277 wires the eager-create + Agent
// Builder navigation. The handler (`onAddResourceClicked`) and label stay
// implemented so re-enabling it is a one-line change.
const isAgentCreationEnabled = false;

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
		return i18n.baseText('agentSelector.mode.list.placeholder');
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

function onAddResourceClicked() {
	hideDropdown();
	// The eager-create + Agent Builder navigation is wired by AGENT-277. Here we
	// only surface the intent so the parent can drive the create round-trip.
	emit('agentCreateRequested');
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
					[$style.multipleModes]: !hideModeSelector,
					[$style.singleMode]: hideModeSelector,
				}"
			>
				<div v-if="!hideModeSelector" :class="$style.modeSelector">
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

// Without the mode selector the input stands alone, so restore the left corner
// radii that the multi-mode layout squares off to butt against the selector.
.singleMode {
	.inputContainer {
		--input--radius--top-left: var(--radius);
		--input--radius--bottom-left: var(--radius);
	}
}
</style>
