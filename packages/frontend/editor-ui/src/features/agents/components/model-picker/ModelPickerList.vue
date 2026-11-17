<script setup lang="ts">
import {
	N8nIcon,
	N8nListbox,
	N8nListboxItem,
	N8nText,
	N8nTooltip,
	N8nVisuallyHidden,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useIntersectionObserver } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';

import { getProviderCredentialTypes, isAgentModelProvider } from '../../model-providers';
import ModelSelectorTriggerIcon from '../model-selector/ModelSelectorTriggerIcon.vue';
import {
	formatContext,
	formatCost,
	meterRatio,
	MODEL_PICKER_FEATURES,
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
	/** Rows to show at first, and to add each time the end of the list scrolls into view. All when unset. */
	pageSize?: number;
}>();

const emit = defineEmits<{ select: [modelId: string] }>();

const i18n = useI18n();

const FEATURES = (Object.keys(MODEL_PICKER_FEATURES) as ModelPickerFeature[]).map((id) => ({
	id,
	...MODEL_PICKER_FEATURES[id],
}));

const columns = computed<Array<{ id: keyof ModelPickerMaxima; label: string }>>(() => [
	{ id: 'context', label: i18n.baseText('agents.modelPicker.column.context') },
	{ id: 'input', label: i18n.baseText('agents.modelPicker.column.input') },
	{ id: 'output', label: i18n.baseText('agents.modelPicker.column.output') },
]);

type MetricId = keyof ModelPickerMaxima;

function metricValue(model: ModelPickerModel, id: MetricId): number | undefined {
	return id === 'context' ? model.limits?.context : model.cost?.[id];
}

function metric(model: ModelPickerModel, id: MetricId) {
	const value = metricValue(model, id);
	if (value === undefined) return null;
	return {
		text: id === 'context' ? formatContext(value) : formatCost(value),
		width: `${meterRatio(value, props.maxima[id]) * 100}%`,
	};
}

/** Both lists sort. Like the Design System data table: high to low, low to high, then off. */
const sort = ref<{ id: MetricId; desc: boolean } | null>(null);

function toggleSort(id: MetricId) {
	if (sort.value?.id !== id) sort.value = { id, desc: true };
	else if (sort.value.desc) sort.value = { id, desc: false };
	else sort.value = null;
}

/** Spoken after the column name, since the arrow is hidden from screen readers. */
function sortState(id: MetricId): string {
	if (sort.value?.id !== id) return '';
	return i18n.baseText(
		sort.value.desc ? 'agents.modelPicker.sort.descending' : 'agents.modelPicker.sort.ascending',
	);
}

/** The rows in sort order. Models without a value for the column go last in both directions. */
const sortedRows = computed(() => {
	const current = sort.value;
	if (!current) return props.rows;
	const direction = current.desc ? -1 : 1;
	return [...props.rows].sort((a, b) => {
		const left = metricValue(a.model, current.id);
		const right = metricValue(b.model, current.id);
		if (left === undefined || right === undefined) {
			return Number(left === undefined) - Number(right === undefined);
		}
		return (left - right) * direction;
	});
});

/** How many rows are drawn. A long catalog draws a page at a time, like the earlier prototype. */
const limit = ref(props.pageSize ?? Infinity);
watch([() => props.rows, sort], () => {
	limit.value = props.pageSize ?? Infinity;
});
const hasMore = computed(() => sortedRows.value.length > limit.value);

/** Reaching the end of the drawn rows draws the next page. There is nothing to click. */
const moreSentinel = useTemplateRef('moreSentinel');
useIntersectionObserver(moreSentinel, ([entry]) => {
	if (entry?.isIntersecting && hasMore.value) limit.value += props.pageSize ?? Infinity;
});

const displayRows = computed(() =>
	sortedRows.value.slice(0, limit.value).map(({ model, presetLabel }) => ({
		model,
		presetLabel,
		// Labs that are also agent providers have an icon. Other labs get the default icon.
		iconCredentialType: isAgentModelProvider(model.lab)
			? getProviderCredentialTypes(model.lab)[0]
			: null,
		features: FEATURES.filter((feature) => feature.has(model)),
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
			<template v-for="column in columns" :key="column.id">
				<button
					type="button"
					:class="$style.sortButton"
					:data-testid="`agent-model-picker-sort-${column.id}`"
					@click="toggleSort(column.id)"
				>
					<N8nText size="xsmall" :color="sort?.id === column.id ? 'text-dark' : 'text-light'">
						{{ column.label }}
						<span v-if="sort?.id === column.id" aria-hidden="true">
							{{ sort.desc ? '↓' : '↑' }}
						</span>
						<N8nVisuallyHidden v-if="sort?.id === column.id">
							{{ sortState(column.id) }}
						</N8nVisuallyHidden>
					</N8nText>
				</button>
			</template>
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
								:enterable="false"
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
							:enterable="false"
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
						<!-- An empty track keeps the row's rhythm when the catalog lists no value. -->
						<span :class="$style.meter" aria-hidden="true">
							<span
								v-if="column.value"
								:class="$style.meterFill"
								:style="{ width: column.value.width }"
							/>
						</span>
						<N8nText size="xsmall" color="text-light" :class="$style.metricValue">
							<N8nVisuallyHidden>{{ column.label }}</N8nVisuallyHidden>
							<template v-if="column.value">{{ column.value.text }}</template>
							<template v-else>
								<span aria-hidden="true" :class="$style.missing">
									{{ i18n.baseText('agents.modelPicker.metric.missingMark') }}
								</span>
								<N8nVisuallyHidden>
									{{ i18n.baseText('agents.modelPicker.metric.missing') }}
								</N8nVisuallyHidden>
							</template>
						</N8nText>
					</div>

					<!-- The option owns the selected state. This tick, like the one in the menus, only shows it. -->
					<div :class="$style.status">
						<N8nIcon
							v-if="row.model.id === props.selectedModelId"
							icon="check"
							size="large"
							color="text-light"
							aria-hidden="true"
							data-testid="agent-model-picker-selected"
						/>
					</div>
				</div>
			</N8nListboxItem>
		</N8nListbox>
		<div v-if="hasMore" ref="moreSentinel" :class="$style.moreSentinel" aria-hidden="true" />
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

/* Close to the end of the drawn rows, so the next page is ready before the user reaches it. */
.moreSentinel {
	height: var(--spacing--5xl);
	margin-top: calc(-1 * var(--spacing--5xl));
	pointer-events: none;
}

.list {
	--model-picker--metric-width: calc(var(--spacing--2xl) * 2);
	/* Room for the selected tick, the large check icon of the menus. */
	--model-picker--status-width: var(--spacing--md);
	--model-picker--columns: minmax(0, 1fr) repeat(3, var(--model-picker--metric-width))
		var(--model-picker--status-width);
}

.all {
	/* Room for four feature icons. A model with more shows them on a second line. */
	--model-picker--columns: minmax(0, 1fr) calc(var(--spacing--3xl) + var(--spacing--md))
		repeat(3, var(--model-picker--metric-width)) var(--model-picker--status-width);
}

.grid {
	display: grid;
	grid-template-columns: var(--model-picker--columns);
	align-items: center;
	gap: var(--spacing--2xs);
}

/*
 * Plain labels over a subtle line, like the product's selectable lists. The header
 * stays above the rows when the list scrolls, so it takes the dialog's own background.
 */
.header {
	position: sticky;
	top: 0;
	z-index: 1;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
	background-color: light-dark(var(--background--surface), var(--background--subtle));
}

/* The same space below the header line as above and below the other dividers in the picker. */
.header + * {
	padding-top: var(--spacing--2xs);
}

/* A header label that sorts the list. It looks like the plain labels until hovered. */
.sortButton {
	display: flex;
	padding: 0;
	border: none;
	background: none;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:hover span {
		color: var(--text-color);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
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

.missing {
	color: var(--text-color--subtler);
}

.metricValue {
	font-variant-numeric: tabular-nums;
}

/* A narrow dialog keeps the numbers and the tick, and drops the bars and the features. */
@media (max-width: 480px) {
	.list {
		--model-picker--metric-width: var(--spacing--2xl);
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
	.meter {
		display: none;
	}
}
</style>
