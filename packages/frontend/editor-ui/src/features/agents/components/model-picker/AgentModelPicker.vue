<script setup lang="ts">
/**
 * Model picker for the agent builder: a trigger row that opens a dialog with
 * suggested models and the full, filterable model list.
 */
import {
	N8nBadge,
	N8nButton,
	N8nCheckbox,
	N8nDropdownMenu,
	N8nIcon,
	N8nInput,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import sortBy from 'lodash/sortBy';
import { computed, nextTick, reactive, ref, useTemplateRef } from 'vue';

import {
	getProviderCredentialTypes,
	isAgentModelProvider,
	type AgentModelProvider,
} from '../../model-providers';
import AgentModalMultiStep from '../modals/AgentModalMultiStep.vue';
import ModelSelectorTriggerIcon from '../model-selector/ModelSelectorTriggerIcon.vue';
import { FAKE_MODEL_CATALOG, FAKE_MODEL_CONNECTIONS } from './fakeModelCatalog';
import {
	connectionsForModel,
	filterModels,
	getPresets,
	pickConnection,
	type ModelPickerConnection,
	type ModelPickerCostFilter,
	type ModelPickerFeature,
	type ModelPickerFilters,
	type ModelPickerModel,
	type ModelPickerPresetId,
	type ModelPickerSelection,
} from './modelPicker.utils';
import ModelPickerList from './ModelPickerList.vue';
import ModelPickerProviders from './ModelPickerProviders.vue';

const PRESET_LABELS: Record<ModelPickerPresetId, BaseTextKey> = {
	recommended: 'agents.modelPicker.preset.recommended',
	cheaper: 'agents.modelPicker.preset.cheaper',
	largestContext: 'agents.modelPicker.preset.largestContext',
};
const FEATURE_LABELS: Record<ModelPickerFeature, BaseTextKey> = {
	vision: 'agents.modelPicker.feature.vision',
	reasoning: 'agents.modelPicker.feature.reasoning',
};
const COST_LABELS: Record<ModelPickerCostFilter, BaseTextKey> = {
	any: 'agents.modelPicker.cost.any',
	free: 'agents.modelPicker.cost.free',
	upTo1: 'agents.modelPicker.cost.upTo1',
	upTo5: 'agents.modelPicker.cost.upTo5',
};

const props = withDefaults(
	defineProps<{
		/** Models to offer. The fake catalog is the default until the real catalog is connected. */
		models?: ModelPickerModel[];
		/** Gateway credits and credentials that can pay for model calls. */
		connections?: ModelPickerConnection[];
		disabled?: boolean;
	}>(),
	{
		models: () => FAKE_MODEL_CATALOG,
		connections: () => FAKE_MODEL_CONNECTIONS,
		disabled: false,
	},
);

/** The model and the connection that pays for it. Kept in the picker when the host does not bind it. */
const selection = defineModel<ModelPickerSelection | null>('selection', { default: null });

const emit = defineEmits<{
	createCredential: [provider?: AgentModelProvider];
}>();

const i18n = useI18n();
const searchInput = useTemplateRef('searchInput');

const open = ref(false);
const step = ref<'select' | 'list'>('select');
const enabledConnectionIds = ref(props.connections.map((connection) => connection.id));
const filters = reactive<ModelPickerFilters>({ search: '', features: [], cost: 'any' });

const enabledConnections = computed(() =>
	props.connections.filter((connection) => enabledConnectionIds.value.includes(connection.id)),
);
const availableModels = computed(() =>
	props.models.filter((model) => connectionsForModel(model, enabledConnections.value).length > 0),
);

const presetRows = computed(() =>
	getPresets(availableModels.value).map(({ id, model }) => ({
		model,
		presetLabel: i18n.baseText(PRESET_LABELS[id]),
	})),
);

/** The filtered list, with the suggested models first, in the order of the suggestions. */
const allRows = computed(() => {
	const presetIds = presetRows.value.map((row) => row.model.id);
	return sortBy(
		filterModels(availableModels.value, filters).map((model) => ({
			model,
			presetLabel: presetRows.value[presetIds.indexOf(model.id)]?.presetLabel,
		})),
		({ model }) => (presetIds.includes(model.id) ? presetIds.indexOf(model.id) : presetIds.length),
	);
});

const maxima = computed(() => ({
	context: Math.max(0, ...props.models.map((model) => model.limits?.context ?? 0)),
	input: Math.max(0, ...props.models.map((model) => model.cost?.input ?? 0)),
	output: Math.max(0, ...props.models.map((model) => model.cost?.output ?? 0)),
}));

const selectedModel = computed(() =>
	props.models.find((model) => model.id === selection.value?.modelId),
);
const selectedConnection = computed(() =>
	props.connections.find((connection) => connection.id === selection.value?.connectionId),
);
const triggerIconCredentialType = computed(() => {
	const lab = selectedModel.value?.lab;
	return lab && isAgentModelProvider(lab) ? getProviderCredentialTypes(lab)[0] : null;
});

/** Connections that can serve the selected model. */
const connectionItems = computed<DropdownMenuItemProps[]>(() =>
	selectedModel.value
		? connectionsForModel(selectedModel.value, enabledConnections.value).map((connection) => ({
				id: connection.id,
				label: connection.name,
				checked: connection.id === selection.value?.connectionId,
			}))
		: [],
);

const featureItems = computed<Array<DropdownMenuItemProps<ModelPickerFeature>>>(() =>
	(['vision', 'reasoning'] as const).map((feature) => ({
		id: feature,
		label: i18n.baseText(FEATURE_LABELS[feature]),
		checkbox: true,
		checked: filters.features.includes(feature),
		keepOpen: true,
	})),
);

const costItems = computed<Array<DropdownMenuItemProps<ModelPickerCostFilter>>>(() =>
	(['any', 'free', 'upTo1', 'upTo5'] as const).map((cost) => ({
		id: cost,
		label: i18n.baseText(COST_LABELS[cost]),
		checked: filters.cost === cost,
	})),
);

function openPicker() {
	if (props.disabled) return;
	step.value = 'select';
	open.value = true;
}

async function showAllModels() {
	step.value = 'list';
	await nextTick();
	searchInput.value?.focus();
}

function selectModel(modelId: string) {
	const model = props.models.find((candidate) => candidate.id === modelId);
	const connection =
		model && pickConnection(model, enabledConnections.value, selection.value?.connectionId);
	if (!connection) return;
	selection.value = { modelId, connectionId: connection.id };
	open.value = false;
}

function selectConnection(connectionId: string) {
	if (selection.value) selection.value = { ...selection.value, connectionId };
}

function toggleFeature(feature: ModelPickerFeature) {
	filters.features = filters.features.includes(feature)
		? filters.features.filter((candidate) => candidate !== feature)
		: [...filters.features, feature];
}

defineExpose({ open: openPicker });
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.trigger" :data-disabled="props.disabled ? '' : undefined">
			<button
				type="button"
				:class="$style.open"
				:disabled="props.disabled"
				data-testid="agent-model-picker-trigger"
				@click="openPicker"
			>
				<ModelSelectorTriggerIcon :credential-type-name="triggerIconCredentialType" />
				<N8nText size="small" bold :class="$style.selectedName">
					{{ selectedModel?.name ?? i18n.baseText('agents.modelSelector.defaultLabel') }}
				</N8nText>
			</button>

			<N8nDropdownMenu
				v-if="selectedConnection"
				:items="connectionItems"
				:disabled="props.disabled"
				placement="bottom-start"
				@select="selectConnection"
			>
				<template #trigger>
					<N8nBadge
						clickable
						trailing-icon="chevron-down"
						:disabled="props.disabled"
						:class="$style.connection"
						:aria-label="
							i18n.baseText('agents.modelPicker.connection', {
								interpolate: { name: selectedConnection.name },
							})
						"
						data-testid="agent-model-picker-connection"
					>
						{{ selectedConnection.name }}
					</N8nBadge>
				</template>
			</N8nDropdownMenu>

			<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
		</div>

		<AgentModalMultiStep
			:open="open"
			:step="step"
			:title="i18n.baseText('agents.builder.agent.model.label')"
			:show-back="step === 'list'"
			:show-footer="false"
			data-testid="agent-model-picker-modal"
			@update:open="open = $event"
			@back="step = 'select'"
		>
			<template #headerActions>
				<ModelPickerProviders
					v-model="enabledConnectionIds"
					:connections="props.connections"
					@create-credential="emit('createCredential', $event)"
				/>
			</template>

			<!-- Both steps stay mounted, so Back keeps the search, the filters, and the scroll position. -->
			<div v-show="step === 'select'" :class="$style.step">
				<ModelPickerList
					v-if="presetRows.length > 0"
					variant="presets"
					:rows="presetRows"
					:label="i18n.baseText('agents.modelPicker.suggested')"
					:selected-model-id="selection?.modelId"
					:maxima="maxima"
					@select="selectModel"
				/>
				<N8nText v-else size="small" color="text-light" :class="$style.empty">
					{{ i18n.baseText('agents.modelPicker.noProviders') }}
				</N8nText>
				<N8nButton
					variant="ghost"
					:class="$style.allModels"
					:disabled="availableModels.length === 0"
					data-agent-modal-autofocus
					data-testid="agent-model-picker-show-all"
					@click="showAllModels"
				>
					{{
						i18n.baseText('agents.modelPicker.allModels', {
							adjustToNumber: availableModels.length,
							interpolate: { count: String(availableModels.length) },
						})
					}}
					<N8nIcon icon="arrow-right" size="small" />
				</N8nButton>
			</div>

			<div v-show="step === 'list'" :class="[$style.step, $style.listStep]">
				<div :class="$style.toolbar">
					<N8nInput
						ref="searchInput"
						v-model="filters.search"
						:class="$style.search"
						:placeholder="i18n.baseText('agents.modelPicker.search.placeholder')"
						clearable
						data-testid="agent-model-picker-search"
					>
						<template #prefix><N8nIcon icon="search" /></template>
					</N8nInput>

					<N8nDropdownMenu :items="featureItems" placement="bottom-end" @select="toggleFeature">
						<template #trigger>
							<N8nButton variant="outline" data-testid="agent-model-picker-features">
								{{
									filters.features.length > 0
										? i18n.baseText('agents.modelPicker.filter.featuresCount', {
												interpolate: { count: String(filters.features.length) },
											})
										: i18n.baseText('agents.modelPicker.filter.features')
								}}
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
						</template>
						<template #item-leading="{ item, ui }">
							<!-- The menu item owns the checked state. This box only shows it. -->
							<N8nCheckbox
								:model-value="item.checked"
								:class="[ui.class, $style.passive]"
								tabindex="-1"
								aria-hidden="true"
							/>
						</template>
					</N8nDropdownMenu>

					<N8nDropdownMenu
						:items="costItems"
						placement="bottom-end"
						@select="filters.cost = $event"
					>
						<template #trigger>
							<N8nButton variant="outline" data-testid="agent-model-picker-cost">
								{{
									i18n.baseText(
										filters.cost === 'any'
											? 'agents.modelPicker.filter.cost'
											: COST_LABELS[filters.cost],
									)
								}}
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</div>

				<div :class="$style.scroll">
					<ModelPickerList
						v-if="allRows.length > 0"
						variant="all"
						:rows="allRows"
						:label="i18n.baseText('agents.modelPicker.allModelsLabel')"
						:selected-model-id="selection?.modelId"
						:maxima="maxima"
						@select="selectModel"
					/>
					<N8nText v-else size="small" color="text-light" :class="$style.empty">
						{{
							i18n.baseText(
								availableModels.length > 0
									? 'agents.modelSelector.noMatch'
									: 'agents.modelPicker.noProviders',
							)
						}}
					</N8nText>
				</div>
			</div>
		</AgentModalMultiStep>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

/* The dialog is a sibling of the trigger. The wrapper must not change the host layout. */
.root {
	display: contents;
}

.trigger {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	height: var(--height--xl);
	padding: 0 var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--2xs);
	background-color: var(--background--surface);

	&:hover:not([data-disabled]) {
		background-color: color-mix(in srgb, var(--background--surface) 90%, black 5%);
	}

	&:has(.open:focus-visible) {
		@include focus.focus-ring;
	}

	&[data-disabled] {
		opacity: 0.5;
	}
}

/* The button covers the row, so a click anywhere but the credential opens the dialog. */
.open {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	cursor: pointer;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	&:focus-visible {
		outline: none;
	}

	&:disabled {
		cursor: not-allowed;
	}
}

.selectedName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.connection {
	position: relative;
	z-index: 1;
	flex-shrink: 0;
	max-width: 50%;
}

.arrow {
	flex-shrink: 0;
	margin-left: auto;
	color: var(--text-color--subtler);
}

.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* The same height as the step frame of the dialog, so the list scrolls inside it. */
.listStep {
	height: min(60dvh, calc(var(--height--5xl) * 5));
}

.allModels {
	justify-content: space-between;
	width: 100%;
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.search {
	flex: 1;
	min-width: var(--spacing--4xl);
}

.scroll {
	flex: 1;
	min-height: 0;
	overflow-y: auto;

	@include scrollbar-mixins.scroll-bar;
}

.passive {
	pointer-events: none;
}

.empty {
	padding: var(--spacing--xl) 0;
	text-align: center;
}
</style>
