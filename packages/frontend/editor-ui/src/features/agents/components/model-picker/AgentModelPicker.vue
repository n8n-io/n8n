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
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nListbox,
	N8nListboxItem,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import sortBy from 'lodash/sortBy';
import {
	computed,
	defineAsyncComponent,
	nextTick,
	reactive,
	ref,
	useTemplateRef,
	watch,
} from 'vue';

import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	AGENT_MODEL_PROVIDERS,
	getProviderCredentialTypes,
	isAgentModelProvider,
	type AgentModelProvider,
} from '../../model-providers';
import AgentModalMultiStep from '../modals/AgentModalMultiStep.vue';
import ModelSelectorTriggerIcon from '../model-selector/ModelSelectorTriggerIcon.vue';
import { FAKE_MODEL_CATALOG } from './fakeModelCatalog';
import { MODEL_PICKER_SCENARIOS, useModelPickerScenario } from './modelPickerScenarios';
import {
	connectionsForModel,
	filterModels,
	getPresets,
	MODEL_PICKER_FEATURES,
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

/** Loaded on first use. It brings the credential editor, which the model list does not need. */
const ModelPickerCredentialForm = defineAsyncComponent(
	async () => await import('./ModelPickerCredentialForm.vue'),
);

const PRESET_LABELS: Record<ModelPickerPresetId, BaseTextKey> = {
	recommended: 'agents.modelPicker.preset.recommended',
	cheaper: 'agents.modelPicker.preset.cheaper',
	largestContext: 'agents.modelPicker.preset.largestContext',
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
		/** Gateway credits and credentials that can pay for model calls. The prototype scenario sets them when omitted. */
		connections?: ModelPickerConnection[];
		disabled?: boolean;
	}>(),
	{
		models: () => FAKE_MODEL_CATALOG,
		connections: undefined,
		disabled: false,
	},
);

/** The model and the connection that pays for it. Kept in the picker when the host does not bind it. */
const selection = defineModel<ModelPickerSelection | null>('selection', { default: null });

const i18n = useI18n();
const searchInput = useTemplateRef('searchInput');
const credentialForm = useTemplateRef('credentialForm');

const open = ref(false);
const step = ref<'select' | 'list' | 'credential'>('select');

const { scenario, skipKeyCheck } = useModelPickerScenario();
const startConnections = computed(
	() => props.connections ?? MODEL_PICKER_SCENARIOS[scenario.value].connections,
);

/** Credentials created in the picker. The fake connections do not come from the server, so the picker keeps them. */
const createdConnections = ref<ModelPickerConnection[]>([]);
const allConnections = computed(() => [...startConnections.value, ...createdConnections.value]);

/** All gateways, and the first credential of each provider. A provider uses one credential at a time. */
function defaultEnabledIds(list: ModelPickerConnection[]): string[] {
	return list
		.filter(
			(connection, index, all) =>
				connection.kind !== 'credential' ||
				all.findIndex(
					(other) => other.kind === 'credential' && other.providers[0] === connection.providers[0],
				) === index,
		)
		.map((connection) => connection.id);
}
const enabledConnectionIds = ref(defaultEnabledIds(startConnections.value));
const filters = reactive<ModelPickerFilters>({ search: '', features: [], cost: 'any' });

const enabledConnections = computed(() =>
	allConnections.value.filter((connection) => enabledConnectionIds.value.includes(connection.id)),
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

/**
 * The first page: the selected model first when it is not a suggestion, so the
 * active model is always in view, then the suggestions.
 */
const suggestionRows = computed(() => {
	const model = selectedModel.value;
	if (!model || presetRows.value.some((row) => row.model.id === model.id)) {
		return presetRows.value;
	}
	return [
		{ model, presetLabel: i18n.baseText('agents.modelPicker.preset.selected') },
		...presetRows.value,
	];
});

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
	allConnections.value.find((connection) => connection.id === selection.value?.connectionId),
);
const triggerIconCredentialType = computed(() => {
	const lab = selectedModel.value?.lab;
	return lab && isAgentModelProvider(lab) ? getProviderCredentialTypes(lab)[0] : null;
});

const CREATE_CONNECTION_ID = 'create';

/** Every provider, with the ones that serve the selected model first. */
const createProviders = computed(() => {
	const serving = selectedModel.value?.providers ?? [];
	return [...serving, ...AGENT_MODEL_PROVIDERS.filter((provider) => !serving.includes(provider))];
});

/** Connections that can serve the selected model, then a way to add a credential. */
const connectionItems = computed<DropdownMenuItemProps[]>(() =>
	selectedModel.value
		? [
				...connectionsForModel(selectedModel.value, enabledConnections.value).map((connection) => ({
					id: connection.id,
					label: connection.name,
					checked: connection.id === selection.value?.connectionId,
				})),
				{
					id: CREATE_CONNECTION_ID,
					label: i18n.baseText('agents.modelSelector.configureCredentials'),
					icon: { type: 'icon', value: 'plus' },
					divided: true,
					suppressCloseAutoFocus: true,
				},
			]
		: [],
);

const featureItems = computed<DropdownMenuItemProps[]>(() =>
	(Object.keys(MODEL_PICKER_FEATURES) as ModelPickerFeature[]).map((feature) => ({
		id: feature,
		label: i18n.baseText(MODEL_PICKER_FEATURES[feature].labelKey),
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
	credentialFlow.value = null;
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
	if (connectionId === CREATE_CONNECTION_ID) {
		startCredential(createProviders.value, null);
		return;
	}
	if (selection.value) selection.value = { ...selection.value, connectionId };
}

/** Shows the whole list again. */
function clearFilters() {
	filters.search = '';
	filters.features = [];
	filters.cost = 'any';
	searchInput.value?.focus();
}

function toggleFeature(id: string) {
	if (!(id in MODEL_PICKER_FEATURES)) return;
	const feature = id as ModelPickerFeature;
	filters.features = filters.features.includes(feature)
		? filters.features.filter((candidate) => candidate !== feature)
		: [...filters.features, feature];
}

/**
 * Creating a credential: the providers to choose from, the chosen one, and the
 * step to return to. No return step means the flow started outside the dialog,
 * so saving closes it.
 */
const credentialFlow = ref<{
	providers: AgentModelProvider[];
	provider?: AgentModelProvider;
	returnStep: 'select' | 'list' | null;
} | null>(null);

const credentialProvider = computed(() => credentialFlow.value?.provider);

/** Narrows the provider choice by name. */
const providerSearch = ref('');
const providerSearchInput = useTemplateRef('providerSearchInput');
const providerChoices = computed(() => {
	const query = providerSearch.value.trim().toLowerCase();
	const providers = credentialFlow.value?.providers ?? [];
	if (!query) return providers;
	return providers.filter((provider) =>
		AGENT_MODEL_PROVIDER_DEFINITIONS[provider].displayName.toLowerCase().includes(query),
	);
});

/** The search takes focus whenever the provider choice appears, so typing filters at once. */
async function focusProviderSearch() {
	providerSearch.value = '';
	await nextTick();
	providerSearchInput.value?.focus();
}

/** Enter in the search picks the first match. */
function chooseFirstProvider() {
	const [first] = providerChoices.value;
	if (first) chooseCredentialProvider(first);
}

function startCredential(
	providers: readonly AgentModelProvider[],
	returnStep: 'select' | 'list' | null,
) {
	const choices = providers.length > 0 ? [...providers] : [...AGENT_MODEL_PROVIDERS];
	credentialFlow.value = {
		providers: choices,
		provider: choices.length === 1 ? choices[0] : undefined,
		returnStep,
	};
	step.value = 'credential';
	open.value = true;
	if (!credentialFlow.value.provider) void focusProviderSearch();
}

/** Starts from the Providers menu, which can open on either step. */
function onProvidersCreate(provider?: AgentModelProvider) {
	if (step.value === 'credential') return;
	startCredential(provider ? [provider] : [], step.value);
}

function chooseCredentialProvider(provider: string | undefined) {
	const flow = credentialFlow.value;
	if (flow && provider && isAgentModelProvider(provider)) flow.provider = provider;
}

const canGoBack = computed(() => {
	if (step.value === 'list') return true;
	const flow = credentialFlow.value;
	if (step.value !== 'credential' || !flow) return false;
	return Boolean(flow.returnStep) || (Boolean(flow.provider) && flow.providers.length > 1);
});

function goBack() {
	const flow = credentialFlow.value;
	if (step.value !== 'credential' || !flow) {
		step.value = 'select';
		return;
	}
	if (flow.provider && flow.providers.length > 1) {
		flow.provider = undefined;
		void focusProviderSearch();
		return;
	}
	step.value = flow.returnStep ?? 'select';
	credentialFlow.value = null;
}

const credentialTitle = computed(() =>
	credentialProvider.value
		? i18n.baseText('agents.modelSelector.connectTo', {
				interpolate: {
					provider: AGENT_MODEL_PROVIDER_DEFINITIONS[credentialProvider.value].displayName,
				},
			})
		: i18n.baseText('agents.modelSelector.configureCredentials'),
);

/** Adds the new credential, makes it the one its provider uses, and selects it when it serves the model. */
function onCredentialCreated(credential: ICredentialsResponse) {
	const flow = credentialFlow.value;
	const provider = flow?.provider;
	if (!flow || !provider) return;

	const connection: ModelPickerConnection = {
		id: credential.id,
		name: credential.name,
		kind: 'credential',
		providers: [provider],
	};
	createdConnections.value = [...createdConnections.value, connection];
	const sameProvider = allConnections.value
		.filter((other) => other.kind === 'credential' && other.providers[0] === provider)
		.map((other) => other.id);
	enabledConnectionIds.value = [
		...enabledConnectionIds.value.filter((id) => !sameProvider.includes(id)),
		connection.id,
	];

	const model = selectedModel.value;
	const servesModel = model?.providers.includes(provider);
	const selectionOff = !enabledConnectionIds.value.includes(selection.value?.connectionId ?? '');
	if (model && servesModel && (flow.returnStep === null || selectionOff)) {
		selection.value = { modelId: model.id, connectionId: connection.id };
	}

	credentialFlow.value = null;
	if (flow.returnStep) step.value = flow.returnStep;
	else open.value = false;
}

/** A new scenario starts the walkthrough again: nothing created, nothing selected. */
watch(startConnections, (list) => {
	open.value = false;
	step.value = 'select';
	credentialFlow.value = null;
	createdConnections.value = [];
	enabledConnectionIds.value = defaultEnabledIds(list);
	selection.value = null;
	selectRecommended();
});

/**
 * With providers connected, the agent starts on the recommended model, like the
 * product's default when a credential can run it. With none, it stays a draft.
 */
function selectRecommended() {
	if (selection.value) return;
	const recommended = getPresets(availableModels.value).find(({ id }) => id === 'recommended');
	const connection = recommended && pickConnection(recommended.model, enabledConnections.value);
	if (recommended && connection) {
		selection.value = { modelId: recommended.model.id, connectionId: connection.id };
	}
}
selectRecommended();

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
				<template #item-trailing="{ item, ui }">
					<!-- Room for the menu's tick on unticked rows, so the menu keeps its width when the tick moves. -->
					<N8nIcon
						v-if="item.checked === false"
						icon="check"
						size="large"
						:class="[ui.class, $style.tickSpace]"
						aria-hidden="true"
					/>
				</template>
			</N8nDropdownMenu>

			<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
		</div>

		<AgentModalMultiStep
			:open="open"
			:step="step"
			:title="
				step === 'credential' ? credentialTitle : i18n.baseText('agents.builder.agent.model.label')
			"
			:show-back="canGoBack"
			:show-footer="step === 'credential' && Boolean(credentialProvider)"
			:busy="credentialForm?.isSaving ?? false"
			data-testid="agent-model-picker-modal"
			@update:open="open = $event"
			@back="goBack"
		>
			<template v-if="step === 'credential' && credentialProvider" #titlePrefix>
				<ModelSelectorTriggerIcon
					:credential-type-name="getProviderCredentialTypes(credentialProvider)[0]"
				/>
			</template>

			<template #headerActions>
				<!--
					Hidden, not removed, on the credential step. The dialog's focus trap
					remembers this button while its menu is open. If the button left the
					page, the trap would pull focus out of the provider search.
				-->
				<span v-show="step !== 'credential'" :class="$style.providersAction">
					<ModelPickerProviders
						v-model="enabledConnectionIds"
						:connections="allConnections"
						@create-credential="onProvidersCreate"
					/>
				</span>
			</template>

			<div v-if="step === 'credential' && credentialFlow" :class="$style.credentialStep">
				<ModelPickerCredentialForm
					v-if="credentialFlow.provider"
					ref="credentialForm"
					:key="credentialFlow.provider"
					:check-key="!skipKeyCheck"
					:provider="credentialFlow.provider"
					@created="onCredentialCreated"
				/>
				<div v-else :class="$style.providerChoice">
					<N8nInput
						ref="providerSearchInput"
						v-model="providerSearch"
						:placeholder="i18n.baseText('agents.modelPicker.credential.searchProviders')"
						clearable
						data-testid="agent-model-picker-provider-search"
						@keydown.enter.prevent="chooseFirstProvider"
					>
						<template #prefix><N8nIcon icon="search" /></template>
					</N8nInput>
					<N8nListbox
						v-if="providerChoices.length > 0"
						:label="i18n.baseText('agents.modelPicker.credential.chooseProvider')"
						@update:model-value="chooseCredentialProvider"
					>
						<N8nListboxItem
							v-for="provider in providerChoices"
							:key="provider"
							:value="provider"
							:data-testid="`agent-model-picker-credential-provider-${provider}`"
						>
							<template #leading>
								<ModelSelectorTriggerIcon
									:credential-type-name="getProviderCredentialTypes(provider)[0]"
								/>
							</template>
							<N8nText size="medium" color="text-dark">
								{{ AGENT_MODEL_PROVIDER_DEFINITIONS[provider].displayName }}
							</N8nText>
							<template #trailing>
								<N8nIcon icon="chevron-right" size="small" color="text-light" />
							</template>
						</N8nListboxItem>
					</N8nListbox>
					<N8nEmptyState
						v-else
						:icon="{ type: 'icon', value: 'search' }"
						:heading="i18n.baseText('agents.modelPicker.credential.noProviders')"
						:description="i18n.baseText('agents.modelPicker.credential.noProvidersHint')"
						:class="$style.emptyState"
					/>
				</div>
			</div>

			<!-- Both steps stay mounted, so Back keeps the search, the filters, and the scroll position. -->
			<div v-show="step === 'select'" :class="$style.step">
				<N8nEmptyState
					v-if="allConnections.length === 0"
					:icon="{ type: 'icon', value: 'key-round' }"
					:heading="i18n.baseText('agents.modelPicker.empty.heading')"
					:description="i18n.baseText('agents.modelPicker.empty.description')"
					:button-text="i18n.baseText('agents.modelSelector.configureCredentials')"
					button-icon="plus"
					:class="$style.emptyState"
					data-testid="agent-model-picker-empty"
					@click:button="startCredential([], 'select')"
				/>
				<ModelPickerList
					v-else-if="suggestionRows.length > 0"
					variant="presets"
					:rows="suggestionRows"
					:label="i18n.baseText('agents.modelPicker.suggested')"
					:selected-model-id="selection?.modelId"
					:maxima="maxima"
					@select="selectModel"
				/>
				<N8nEmptyState
					v-else
					:icon="{ type: 'icon', value: 'key-round' }"
					:heading="i18n.baseText('agents.modelPicker.noProviders.heading')"
					:description="i18n.baseText('agents.modelPicker.noProviders.description')"
					:class="$style.emptyState"
					data-testid="agent-model-picker-no-providers"
				/>
				<div v-if="allConnections.length > 0" :class="$style.allModelsRow">
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
						:page-size="100"
						@select="selectModel"
					/>
					<N8nEmptyState
						v-else-if="availableModels.length > 0"
						:icon="{ type: 'icon', value: 'search' }"
						:heading="i18n.baseText('agents.modelPicker.noMatch.heading')"
						:description="i18n.baseText('agents.modelPicker.noMatch.description')"
						:button-text="i18n.baseText('agents.modelPicker.noMatch.clear')"
						button-variant="outline"
						:class="$style.emptyState"
						data-testid="agent-model-picker-no-match"
						@click:button="clearFilters"
					/>
					<N8nEmptyState
						v-else
						:icon="{ type: 'icon', value: 'key-round' }"
						:heading="i18n.baseText('agents.modelPicker.noProviders.heading')"
						:description="i18n.baseText('agents.modelPicker.noProviders.description')"
						:class="$style.emptyState"
					/>
				</div>
			</div>

			<template v-if="step === 'credential' && credentialProvider" #footerActions>
				<N8nButton
					variant="solid"
					:loading="credentialForm?.isSaving ?? false"
					data-testid="agent-model-picker-credential-save"
					@click="credentialForm?.save()"
				>
					{{ i18n.baseText('generic.save') }}
				</N8nButton>
			</template>
		</AgentModalMultiStep>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

/* The credential step sits in the same dialog as the model list. */
.tickSpace {
	visibility: hidden;
}

.providersAction {
	display: inline-flex;
}

.providerChoice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	/* The same height as the model steps, so the dialog does not shrink while the search filters. */
	min-height: min(60dvh, calc(var(--height--5xl) * 5));
}

.credentialStep {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

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

/* The empty state fills the first page, centred like the other empty pages. */
.emptyState {
	flex: 1;
	justify-content: center;
	padding: var(--spacing--xl) 0;
}

/* A subtle divider sets the full list apart from the suggestions. The step gap is the space above it. */
.allModelsRow {
	padding-top: var(--spacing--2xs);
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
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
</style>
