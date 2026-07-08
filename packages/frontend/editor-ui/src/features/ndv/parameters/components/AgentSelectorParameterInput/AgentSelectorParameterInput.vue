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
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { useDebounce } from '@/app/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';

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
	parameterIssues: () => [],
	hideModeSelector: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: INodeParameterResourceLocator];
	drop: [data: string];
	modalOpenerClick: [];
	focus: [];
	blur: [];
}>();

const i18n = useI18n();
const projectStore = useProjectsStore();
const { onDocumentVisible } = useDocumentVisibility();
const { debounce } = useDebounce();

const container = ref<HTMLDivElement>();
const dropdown = ref<ComponentPublicInstance<typeof ResourceLocatorDropdown>>();
const inputRef = ref<HTMLInputElement | undefined>();
const width = ref(0);

// Scope to the workflow's owning project so the picker only lists agents that
// execution can resolve. Shared with the canvas card and the NDV orchestrator
// so every surface reads/writes the same agent record.
const projectId = useAgentScopeProjectId();

// Resolve a project by id from the stores the picker already has loaded, so the
// per-agent subtitle stays consistent with the `projectId` the catalog is
// scoped to.
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
	refreshAgentName,
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

// Build and emit the RL value. Discrete actions (selection, create) call this
// directly so the reference commits to the workflow synchronously; free-text
// typing goes through the debounced wrapper below.
function emitValue(agentId: NodeParameterValue): void {
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

// Debounce free-text input (id/expression mode) so we don't write to the
// workflow on every keystroke — the list/workflow selectors debounce the same
// path. Flushed on blur/unmount so the final value is never dropped.
const emitValueDebounced = debounce(emitValue, {
	debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
	trailing: true,
});

function onInputChange(agentId: NodeParameterValue): void {
	emitValueDebounced(agentId);
}

function onListItemSelected(value: NodeParameterValue) {
	emitValue(value);
	hideDropdown();
}

function onInputFocus(): void {
	setWidth();
	emit('focus');
}

function onInputBlur(): void {
	emitValueDebounced.flush();
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

// Heal a stale `cachedResultName` (e.g. the agent was renamed in the builder) by
// re-fetching its current name and re-emitting the reference. Mirrors the
// sub-workflow picker's refreshCachedWorkflow.
async function refreshCachedAgent() {
	// Read-only surfaces (execution preview, history) must never write the param.
	if (props.isReadOnly) return;
	const modelValue = props.modelValue;
	if (modelValue?.mode !== 'list' || typeof modelValue.value !== 'string' || !modelValue.value) {
		return;
	}
	const freshName = await refreshAgentName(modelValue.value);
	// The selection may have changed while the fetch was in flight — re-emitting
	// the captured value would silently revert the user's newer pick.
	if (props.modelValue?.value !== modelValue.value || props.modelValue?.mode !== 'list') {
		return;
	}
	if (freshName && freshName !== modelValue.cachedResultName) {
		emit('update:modelValue', {
			__rl: true,
			value: modelValue.value,
			mode: 'list',
			cachedResultName: freshName,
		});
	}
}

async function onRetry() {
	await setAgentsResources();
}

// Refresh when the tab regains focus, so a rename made in the builder (other
// tab/route) reflects without reopening the NDV.
onDocumentVisible(refreshCachedAgent);

onMounted(() => {
	window.addEventListener('resize', setWidth);
	setWidth();
	void setAgentsResources();
	void refreshCachedAgent();
});

onUnmounted(() => {
	emitValueDebounced.flush();
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
			:width="width"
			:event-bus="eventBus"
			:model-value="modelValue"
			:disable-inactive-items="false"
			@update:model-value="onListItemSelected"
			@filter="onSearchFilter"
			@load-more="loadMore"
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
