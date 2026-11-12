<script setup lang="ts">
import {
	N8nIcon,
	N8nListbox,
	N8nListboxItem,
	N8nText,
	N8nTooltip,
	N8nVisuallyHidden,
	type IconName,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { getProviderCredentialTypes, isAgentModelProvider } from '../../model-providers';
import ModelSelectorTriggerIcon from '../model-selector/ModelSelectorTriggerIcon.vue';
import {
	formatContext,
	formatCost,
	meterRatio,
	type ModelPickerFeature,
	type ModelPickerModel,
} from './modelPicker.utils';

export interface ModelPickerRow {
	model: ModelPickerModel;
	/** Name of the preset that suggests this model. */
	presetLabel?: string;
}

export interface ModelPickerMaxima {
	context: number;
	input: number;
	output: number;
}

const props = defineProps<{
	rows: ModelPickerRow[];
	/** `presets` shows the preset name as a column. `all` adds the features column. */
	variant: 'presets' | 'all';
	/** Accessible name of the list. */
	label: string;
	selectedModelId?: string;
	/** Largest value of each metric in the catalog. The bars scale against it. */
	maxima: ModelPickerMaxima;
}>();

const emit = defineEmits<{ select: [modelId: string] }>();

const i18n = useI18n();

const FEATURES: Array<{ id: ModelPickerFeature; icon: IconName; labelKey: BaseTextKey }> = [
	{ id: 'vision', icon: 'image', labelKey: 'agents.modelPicker.feature.vision' },
	{ id: 'reasoning', icon: 'brain', labelKey: 'agents.modelPicker.feature.reasoning' },
];

const columns = computed<Array<{ id: keyof ModelPickerMaxima; label: string }>>(() => [
	{ id: 'context', label: i18n.baseText('agents.modelPicker.column.context') },
	{ id: 'input', label: i18n.baseText('agents.modelPicker.column.input') },
	{ id: 'output', label: i18n.baseText('agents.modelPicker.column.output') },
]);

function metric(model: ModelPickerModel, id: keyof ModelPickerMaxima) {
	const value = id === 'context' ? model.limits?.context : model.cost?.[id];
	if (value === undefined) return null;
	return {
		text: id === 'context' ? formatContext(value) : formatCost(value),
		width: `${meterRatio(value, props.maxima[id]) * 100}%`,
	};
}

const displayRows = computed(() =>
	props.rows.map(({ model, presetLabel }) => ({
		model,
		presetLabel,
		// Labs that are also agent providers have an icon. Other labs get the default icon.
		iconCredentialType: isAgentModelProvider(model.lab)
			? getProviderCredentialTypes(model.lab)[0]
			: null,
		features: FEATURES.filter((feature) => model[feature.id]),
		metrics: columns.value.map((column) => ({ ...column, value: metric(model, column.id) })),
	})),
);

function onSelect(modelId: string | undefined) {
	if (modelId) emit('select', modelId);
}
</script>

<template>
	<div :class="[$style.list, $style[props.variant]]">
		<div :class="[$style.grid, $style.header]">
			<N8nText size="xsmall" color="text-light">
				{{ props.variant === 'all' ? i18n.baseText('agents.modelPicker.column.model') : '' }}
			</N8nText>
			<N8nText
				v-if="props.variant === 'all'"
				size="xsmall"
				color="text-light"
				:class="$style.features"
			>
				{{ i18n.baseText('agents.modelPicker.column.features') }}
			</N8nText>
			<N8nText v-for="column in columns" :key="column.id" size="xsmall" color="text-light">
				{{ column.label }}
			</N8nText>
		</div>

		<N8nListbox
			:model-value="props.selectedModelId"
			:label="props.label"
			@update:model-value="onSelect"
		>
			<N8nListboxItem
				v-for="row in displayRows"
				:key="row.model.id"
				:value="row.model.id"
				data-testid="agent-model-picker-row"
			>
				<div :class="$style.grid">
					<div :class="$style.identity">
						<N8nText
							v-if="props.variant === 'presets'"
							size="small"
							bold
							:class="$style.presetLabel"
						>
							{{ row.presetLabel }}
						</N8nText>
						<div :class="$style.model">
							<span :class="$style.icon">
								<ModelSelectorTriggerIcon :credential-type-name="row.iconCredentialType" />
							</span>
							<N8nText size="small" :class="$style.name" :title="row.model.name">
								{{ row.model.name }}
							</N8nText>
							<N8nTooltip
								v-if="props.variant === 'all' && row.presetLabel"
								:content="row.presetLabel"
								placement="top"
							>
								<N8nIcon
									icon="star"
									size="small"
									color="text-light"
									:aria-label="row.presetLabel"
								/>
							</N8nTooltip>
						</div>
					</div>

					<div v-if="props.variant === 'all'" :class="$style.features">
						<N8nTooltip
							v-for="feature in row.features"
							:key="feature.id"
							:content="i18n.baseText(feature.labelKey)"
							placement="top"
						>
							<N8nIcon
								:icon="feature.icon"
								size="small"
								color="text-light"
								:aria-label="i18n.baseText(feature.labelKey)"
							/>
						</N8nTooltip>
					</div>

					<div v-for="column in row.metrics" :key="column.id" :class="$style.metric">
						<template v-if="column.value">
							<span :class="$style.meter" aria-hidden="true">
								<span :class="$style.meterFill" :style="{ width: column.value.width }" />
							</span>
							<N8nText size="xsmall" color="text-light" :class="$style.metricValue">
								<N8nVisuallyHidden>{{ column.label }}</N8nVisuallyHidden>
								{{ column.value.text }}
							</N8nText>
						</template>
					</div>

					<div :class="$style.status">
						<template v-if="row.model.id === props.selectedModelId">
							<N8nIcon icon="check" size="small" color="success" />
							<N8nText size="xsmall" color="text-light" :class="$style.statusText">
								{{ i18n.baseText('agents.modelSelector.connected') }}
							</N8nText>
						</template>
					</div>
				</div>
			</N8nListboxItem>
		</N8nListbox>
	</div>
</template>

<style module lang="scss">
.list {
	--model-picker--metric-width: calc(var(--spacing--2xl) * 2);
	--model-picker--status-width: calc(var(--spacing--2xl) * 2);
	--model-picker--columns: minmax(0, 1fr) repeat(3, var(--model-picker--metric-width))
		var(--model-picker--status-width);
}

.all {
	--model-picker--columns: minmax(0, 1fr) var(--spacing--3xl)
		repeat(3, var(--model-picker--metric-width)) var(--model-picker--status-width);
}

.grid {
	display: grid;
	grid-template-columns: var(--model-picker--columns);
	align-items: center;
	gap: var(--spacing--2xs);
}

/* The header stays above the rows when the list scrolls, with the same inset as an item. */
.header {
	position: sticky;
	top: 0;
	z-index: 1;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--background--surface);
}

.identity {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.presets .identity {
	grid-template-columns: var(--spacing--4xl) minmax(0, 1fr);
}

.model {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

/* The provider icons and the fallback icon have different widths. One slot keeps the names in line. */
.icon {
	display: inline-flex;
	flex-shrink: 0;
	justify-content: center;
	width: var(--spacing--md);
}

.presetLabel,
.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.features,
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.metric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.meter {
	display: block;
	height: var(--spacing--4xs);
	border-radius: var(--radius--full);
	background-color: var(--border-color--subtle);
	overflow: hidden;
}

.meterFill {
	display: block;
	height: 100%;
	border-radius: var(--radius--full);
	background-color: var(--text-color--subtler);
}

.metricValue {
	font-variant-numeric: tabular-nums;
}

/* A narrow dialog keeps the numbers and drops the bars, the features, and the status text. */
@media (max-width: 480px) {
	.list {
		--model-picker--metric-width: var(--spacing--2xl);
		--model-picker--status-width: var(--spacing--sm);
	}

	.all {
		--model-picker--columns: minmax(0, 1fr) repeat(3, var(--model-picker--metric-width))
			var(--model-picker--status-width);
	}

	.presets .identity {
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing--5xs);
	}

	/* A cut name can hide the difference between two models. */
	.name {
		overflow-wrap: anywhere;
		white-space: normal;
	}

	.features,
	.meter,
	.statusText {
		display: none;
	}
}
</style>
