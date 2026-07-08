<script setup lang="ts">
/**
 * Unified "Advanced" section for the AI Agent node's NDV Parameters tab.
 *
 * Mimics the collection-parameter section UX (`CollectionParameterNew`) but with
 * a combined "Add option" dropdown: the node's own advanced options (values in
 * node parameters, persisted with the workflow) alongside agent-specific
 * settings (values in the shared agent config, autosaved via `PUT .../config`).
 *
 * Which agent options are surfaced is visibility-only UI state, persisted in
 * the node's hidden `agentOptions` parameter so it survives NDV close/reopen
 * like any call-site parameter. They start hidden — even when the config holds
 * non-default values — and removing one only hides the control again, never
 * resetting the shared agent config (a reset would apply globally, everywhere
 * the agent is used).
 */
import { computed, inject, ref } from 'vue';
import { deepCopy, isINodeProperties } from 'n8n-workflow';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import get from 'lodash/get';

import { N8nIconButton, N8nOption, N8nSectionHeader, N8nSelect } from '@n8n/design-system';
import { BaseTextKey, useI18n } from '@n8n/i18n';

import type { IUpdateInformation } from '@/Interface';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import AgentMemoryPanel from '@/features/agents/components/AgentMemoryPanel.vue';
import AgentAdvancedPanel, {
	type AgentAdvancedPanelField,
} from '@/features/agents/components/AgentAdvancedPanel.vue';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

type AgentOption = 'episodicMemory' | AgentAdvancedPanelField;

const AGENT_OPTION_PREFIX = 'agent:';
const NODE_OPTION_PREFIX = 'node:';

const props = defineProps<{
	/** The node's `advanced` collection parameter definition. */
	parameter: INodeProperties;
	nodeValues: INodeParameters;
	isReadOnly?: boolean;
}>();

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
	parameterBlur: [value: string];
}>();

const i18n = useI18n();
const ndvStore = injectNDVStore();
const nodeHelpers = useNodeHelpers();
const ndv = inject(NdvAgentConfigKey);

const activeNode = computed(() => ndvStore.value.activeNode);
const collectionPath = computed(() => `parameters.${props.parameter.name}`);

const localConfig = computed(() => ndv?.localConfig.value ?? null);
// A read-only NDV must not edit the shared agent, regardless of agent:update.
const canUpdate = computed(() => (ndv?.canUpdate.value ?? false) && !props.isReadOnly);
// The NDV lives outside the agent routes — pass the orchestrator's resolved
// scope down so panels don't fall back to the route/personal project.
const projectId = computed(() => ndv?.projectId?.value ?? '');

// Agent settings need a loaded, editable agent config to write to.
const agentOptionsAvailable = computed(
	() =>
		Boolean(ndv?.isAgentNode.value) &&
		Boolean(ndv?.agentId.value) &&
		!(ndv?.isUnavailable.value ?? false) &&
		canUpdate.value &&
		localConfig.value !== null,
);

// ---------------------------------------------------------------------------
// Node options (mirrors CollectionParameterNew)
// ---------------------------------------------------------------------------

const advancedValues = computed(
	() => get(props.nodeValues, collectionPath.value, {}) as INodeParameters,
);
const chosenNodeOptionNames = computed(() => Object.keys(advancedValues.value));
const newlyAddedParameters = ref<Set<string>>(new Set());

function displayNodeParameter(parameter: INodeProperties) {
	if (parameter.type === 'hidden') return false;
	if (parameter.displayOptions === undefined) return true;
	return nodeHelpers.displayParameter(
		props.nodeValues,
		parameter,
		collectionPath.value,
		activeNode.value,
	);
}

// The AI Agent node's advanced options are flat single-value properties; the
// multi-value / nested-collection cases CollectionParameterNew handles don't
// occur here.
const nodeOptions = computed(() =>
	(props.parameter.options ?? []).filter(isINodeProperties).filter(displayNodeParameter),
);

const chosenNodeProperties = computed(() =>
	chosenNodeOptionNames.value
		.map((name) => nodeOptions.value.find((option) => option.name === name))
		.filter((option): option is INodeProperties => option !== undefined),
);

// ---------------------------------------------------------------------------
// Agent options — visibility state persisted in the hidden `agentOptions`
// node parameter (survives NDV close/reopen like any call-site parameter)
// ---------------------------------------------------------------------------

const AGENT_OPTIONS_PARAMETER = 'parameters.agentOptions';

const AGENT_OPTIONS = [
	{ id: 'episodicMemory', labelKey: 'agents.builder.memory.episodicMemory.label' },
	{ id: 'webSearch', labelKey: 'agents.builder.advanced.webSearch.label' },
	{ id: 'thinking', labelKey: 'agents.builder.advanced.thinking.label' },
	{ id: 'toolCallConcurrency', labelKey: 'agents.builder.advanced.concurrency.label' },
	{ id: 'maxIterations', labelKey: 'agents.builder.advanced.maxIterations.label' },
] as const satisfies ReadonlyArray<{ id: AgentOption; labelKey: BaseTextKey }>;

function isAgentOption(value: unknown): value is AgentOption {
	return typeof value === 'string' && AGENT_OPTIONS.some((option) => option.id === value);
}

const addedAgentOptions = computed<AgentOption[]>(() => {
	const raw = get(props.nodeValues, AGENT_OPTIONS_PARAMETER, []);
	return Array.isArray(raw) ? raw.filter(isAgentOption) : [];
});

// Persisted options render whenever the referenced agent's config is on hand;
// `disabled` (not hidden) covers the no-update-permission case.
const showAgentRows = computed(
	() =>
		Boolean(ndv?.agentId.value) &&
		localConfig.value !== null &&
		!(ndv?.isUnavailable.value ?? false),
);

function persistAgentOptions(options: AgentOption[]) {
	emit('valueChanged', { name: AGENT_OPTIONS_PARAMETER, value: options });
}

function advancedPanelFields(option: AgentOption): AgentAdvancedPanelField[] {
	return option === 'episodicMemory' ? [] : [option];
}

function removeAgentOption(option: AgentOption) {
	persistAgentOptions(addedAgentOptions.value.filter((added) => added !== option));
}

// ---------------------------------------------------------------------------
// Combined "Add option" select (same control as the standard collection's)
// ---------------------------------------------------------------------------

const selectedOption = ref<string | undefined>(undefined);

const addableOptions = computed((): Array<{ id: string; label: string }> => {
	const nodeItems = nodeOptions.value
		.filter((option) => !chosenNodeOptionNames.value.includes(option.name))
		.map((option) => ({
			id: `${NODE_OPTION_PREFIX}${option.name}`,
			label: option.displayName,
		}));

	const agentItems = agentOptionsAvailable.value
		? AGENT_OPTIONS.filter((option) => !addedAgentOptions.value.includes(option.id)).map(
				(option) => ({
					id: `${AGENT_OPTION_PREFIX}${option.id}`,
					label: i18n.baseText(option.labelKey),
				}),
			)
		: [];

	return [...nodeItems, ...agentItems];
});

const isAddDisabled = computed(() => addableOptions.value.length === 0);

const addLabel = computed(
	() =>
		i18n.nodeText(activeNode.value?.type).placeholder(props.parameter, 'parameters') ||
		i18n.baseText('collectionParameter.addItem'),
);

const sectionTitle = computed(() =>
	i18n.nodeText(activeNode.value?.type).inputLabelDisplayName(props.parameter, 'parameters'),
);

function optionSelected(id: string) {
	if (id.startsWith(AGENT_OPTION_PREFIX)) {
		const option = id.slice(AGENT_OPTION_PREFIX.length);
		if (isAgentOption(option) && !addedAgentOptions.value.includes(option)) {
			persistAgentOptions([...addedAgentOptions.value, option]);
		}
		return;
	}

	const name = id.slice(NODE_OPTION_PREFIX.length);
	const option = nodeOptions.value.find((candidate) => candidate.name === name);
	if (!option) return;

	emit('valueChanged', {
		name: `${collectionPath.value}.${option.name}`,
		value: deepCopy(option.default),
	});
	newlyAddedParameters.value.add(option.name);
}

function onAddOptionSelected(id: string) {
	optionSelected(id);
	// Clear the selection after emitting so the placeholder returns and another
	// option can be added (mirrors the standard collection's add select).
	selectedOption.value = undefined;
}

// Keep typing in the embedded controls from triggering canvas shortcuts, but
// let Escape through — the NDV's document-level Escape-to-close listens at the
// bubble phase and a blanket stop would silently disable it here.
function onSectionKeydown(event: KeyboardEvent) {
	if (event.key !== 'Escape') event.stopPropagation();
}
</script>

<template>
	<div
		:class="$style.advancedSection"
		data-test-id="agent-ndv-advanced-section"
		@keydown="onSectionKeydown"
	>
		<N8nSectionHeader :title="sectionTitle" bordered :class="$style.sectionHeader" />

		<Suspense v-if="chosenNodeProperties.length > 0">
			<ParameterInputList
				:class="$style.parameterList"
				:parameters="chosenNodeProperties"
				:node-values="nodeValues"
				:path="collectionPath"
				:is-read-only="isReadOnly"
				:is-nested="true"
				:indent="true"
				:newly-added-parameters="newlyAddedParameters"
				@value-changed="emit('valueChanged', $event)"
				@parameter-blur="emit('parameterBlur', $event)"
			/>
		</Suspense>

		<template v-if="showAgentRows">
			<div
				v-for="option in addedAgentOptions"
				:key="option"
				:class="$style.agentOptionRow"
				:data-test-id="`agent-ndv-advanced-option-${option}`"
			>
				<N8nIconButton
					v-if="!isReadOnly"
					variant="ghost"
					size="small"
					icon="trash-2"
					:class="$style.removeAgentOption"
					:title="i18n.baseText('agentNode.ndv.advanced.removeOption')"
					data-test-id="agent-ndv-advanced-remove-option"
					@click="removeAgentOption(option)"
				/>
				<AgentMemoryPanel
					v-if="option === 'episodicMemory'"
					:config="localConfig"
					:disabled="!canUpdate"
					:project-id="projectId"
					embedded
					stacked
					@update:config="ndv?.scheduleConfigUpdate"
				/>
				<AgentAdvancedPanel
					v-else
					:config="localConfig"
					:disabled="!canUpdate"
					:fields="advancedPanelFields(option)"
					@update:config="ndv?.scheduleConfigUpdate"
				/>
			</div>
		</template>

		<div v-if="!isReadOnly && !isAddDisabled" :class="$style.paramOptions">
			<div :class="$style.addOption">
				<N8nSelect
					v-model="selectedOption"
					:placeholder="addLabel"
					size="small"
					filterable
					data-test-id="agent-ndv-advanced-add"
					@update:model-value="onAddOptionSelected"
				>
					<N8nOption
						v-for="item in addableOptions"
						:key="item.id"
						:label="item.label"
						:value="item.id"
						data-test-id="agent-ndv-advanced-add-option"
					/>
				</N8nSelect>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.advancedSection {
	display: flex;
	flex-direction: column;
	width: 100%;
	margin-top: var(--spacing--lg);
}

.sectionHeader {
	margin-bottom: var(--spacing--xs);
}

// Same geometry as ParameterInputList's indented items: content shifted right
// by --spacing--sm, hover-delete floating in the gutter on the left.
.agentOptionRow {
	position: relative;
	margin: var(--spacing--xs) 0;
	padding-left: var(--spacing--sm);
	padding-top: 2px;

	&:hover .removeAgentOption {
		opacity: 1;
	}
}

.removeAgentOption {
	position: absolute;
	top: -3px;
	left: calc(-0.5 * var(--spacing--xs));
	opacity: 0;
	transition: opacity 100ms ease-in;

	&:focus-visible {
		opacity: 1;
	}
}

.paramOptions {
	margin-top: var(--spacing--xs);
	padding-left: var(--spacing--sm);
}

// The select styled as the standard collection's "Add Option" control
// (copied from CollectionParameterLegacy).
.addOption {
	> * {
		border: none;
	}

	:global(.el-select .el-input:not(.is-disabled) .el-input__icon) {
		color: var(--color--text--shade-1);
	}
	:global(.el-input .el-input__inner) {
		text-align: center;
	}
	:global(.el-input:not(.is-disabled) .el-input__inner) {
		&,
		&:hover,
		&:focus {
			padding-left: 35px;
			border-radius: var(--radius);
			color: var(--color--text--shade-1);
			background-color: var(--color--background);
			border-color: var(--color--foreground);
			text-align: center;
		}

		&::placeholder {
			color: var(--color--text--shade-1);
			opacity: 1;
		}
	}
}
</style>
