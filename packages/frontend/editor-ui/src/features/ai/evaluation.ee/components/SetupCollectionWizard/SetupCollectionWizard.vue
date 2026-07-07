<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import { useEvaluationStore } from '../../evaluation.store';
import type { EvalVersionEntry } from '../../evalCollections.types';

import DatasetPicker from './DatasetPicker.vue';
import VersionsTable from './VersionsTable.vue';
import { versionRowKey } from './versionRowKey';
import { buildVersionEntries, isReusableRun } from './buildVersionEntries';

// State machine matches the setup flow. We collapse INITIAL/NAME_PROVIDED into
// a single user-facing step ("fill the form"); the meaningful transitions are
// loading the versions table and submitting.
type WizardState = 'collecting' | 'versionsLoading' | 'submitting' | 'done';

const props = defineProps<{
	open: boolean;
	workflowId: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	created: [collectionId: string];
}>();

const i18n = useI18n();
const store = useEvalCollectionsStore();
const evaluationStore = useEvaluationStore();
const toast = useToast();

const name = ref('');
const selectedConfigId = ref<string | null>(null);
const selectedVersionKeys = ref<Set<string>>(new Set());
const state = ref<WizardState>('collecting');

// Filters the user can apply on the versions table. `Source: All` is the
// default — narrows by the `sourceLabel` returned on each version row.
const sourceFilter = ref<string>('all');
const sortOrder = ref<'recent' | 'oldest'>('recent');

// N8nSelect emits a broadly-typed value; narrow it back to our refs.
const onSourceChange = (value: string | number | boolean) => {
	sourceFilter.value = String(value);
};
const onSortChange = (value: string | number | boolean) => {
	sortOrder.value = value === 'oldest' ? 'oldest' : 'recent';
};

// Evaluation configs are owned by the evaluation store; each config maps to
// one dataset in the picker. The collection pins `evaluationConfigId` so its
// runs stay comparable.
const configs = computed(
	() => evaluationStore.evaluationConfigsByWorkflowId[props.workflowId] ?? [],
);
const versionsResponse = computed(() =>
	selectedConfigId.value ? store.getVersions(selectedConfigId.value) : null,
);

const allVersions = computed<EvalVersionEntry[]>(() => versionsResponse.value?.versions ?? []);
const datasetLabel = computed(() => {
	if (!selectedConfigId.value) return '';
	return configs.value.find((c) => c.id === selectedConfigId.value)?.name ?? '';
});

// The config's metrics, all of which are recorded for every version in the
// collection. Shown read-only — there's no backend field to scope a subset
// yet, so a per-metric toggle would be a no-op affordance.
const allMetricNames = computed<string[]>(() => {
	if (!selectedConfigId.value) return [];
	const cfg = configs.value.find((c) => c.id === selectedConfigId.value);
	return (cfg?.metrics ?? []).map((m) => m.name);
});

const sourceOptions = computed(() => {
	const seen = new Set<string>();
	const opts: Array<{ value: string; label: string }> = [
		{ value: 'all', label: i18n.baseText('evaluation.setup.versions.filter.all') },
	];
	for (const v of allVersions.value) {
		if (v.sourceLabel && !seen.has(v.sourceLabel)) {
			seen.add(v.sourceLabel);
			opts.push({ value: v.sourceLabel, label: v.sourceLabel });
		}
	}
	return opts;
});

// Row order in the table: filter by source, then sort. Version *colors* are
// NOT tied to this order — they key off `versionColorByKey` (a version's
// stable position) so changing the sort doesn't recolor rows. Matching those
// colors to the list-view card needs a shared stable key and is deferred to
// the compare view work.
const visibleVersions = computed<EvalVersionEntry[]>(() => {
	const filtered =
		sourceFilter.value === 'all'
			? allVersions.value
			: allVersions.value.filter((v) => v.sourceLabel === sourceFilter.value);

	const sorted = [...filtered];
	sorted.sort((a, b) => {
		const aTs = a.lastRun ? new Date(a.lastRun.runAt).getTime() : 0;
		const bTs = b.lastRun ? new Date(b.lastRun.runAt).getTime() : 0;
		return sortOrder.value === 'recent' ? bTs - aTs : aTs - bTs;
	});
	return sorted;
});

// A version's color follows its stable position in the unfiltered list, so the
// avatar color stays put when the user re-sorts or filters the table.
const versionColorByKey = computed<Record<string, number>>(() => {
	const map: Record<string, number> = {};
	allVersions.value.forEach((v, index) => {
		map[versionRowKey(v)] = index;
	});
	return map;
});

const selectedVersions = computed<EvalVersionEntry[]>(() =>
	allVersions.value.filter((v) => selectedVersionKeys.value.has(versionRowKey(v))),
);

const selectedCount = computed(() => selectedVersionKeys.value.size);

const reuseCount = computed(
	() => selectedVersions.value.filter((v) => isReusableRun(v.lastRun)).length,
);

const newRunCount = computed(() => selectedCount.value - reuseCount.value);

const canSubmit = computed(
	() =>
		state.value === 'collecting' &&
		name.value.trim().length > 0 &&
		selectedConfigId.value !== null &&
		selectedCount.value >= 2,
);

const footerSummaryText = computed(() => {
	if (selectedCount.value < 2) {
		return i18n.baseText('evaluation.setup.footer.summary.pickMore');
	}
	if (newRunCount.value === 0) {
		return i18n.baseText('evaluation.setup.footer.summary.reuse', {
			adjustToNumber: selectedCount.value,
		});
	}
	return i18n.baseText('evaluation.setup.footer.summary.mixed', {
		interpolate: { total: String(selectedCount.value), newCount: String(newRunCount.value) },
	});
});

const footerExplainText = computed(() => {
	if (selectedCount.value < 2) return '';
	if (newRunCount.value === 0) {
		return i18n.baseText('evaluation.setup.footer.runsExplain.reuse', {
			interpolate: { dataset: datasetLabel.value },
		});
	}
	return i18n.baseText('evaluation.setup.footer.runsExplain.mixed', {
		interpolate: {
			newCount: String(newRunCount.value),
			dataset: datasetLabel.value,
		},
	});
});

const ctaText = computed(() => {
	if (newRunCount.value === 0) {
		return i18n.baseText('evaluation.setup.footer.cta.compare', {
			adjustToNumber: selectedCount.value,
		});
	}
	return i18n.baseText('evaluation.setup.footer.cta.runAndCompare', {
		adjustToNumber: selectedCount.value,
	});
});

const onSelectConfig = async (configId: string) => {
	selectedConfigId.value = configId;
	selectedVersionKeys.value = new Set();
	sourceFilter.value = 'all';
	state.value = 'versionsLoading';
	try {
		await store.fetchEvalVersions(props.workflowId, configId);
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.setup.errors.loadVersionsFailed'));
	} finally {
		state.value = 'collecting';
	}
};

const onToggleVersion = (versionKey: string) => {
	const next = new Set(selectedVersionKeys.value);
	if (next.has(versionKey)) next.delete(versionKey);
	else next.add(versionKey);
	selectedVersionKeys.value = next;
};

const close = () => {
	emit('update:open', false);
};

const reset = () => {
	name.value = '';
	selectedConfigId.value = null;
	selectedVersionKeys.value = new Set();
	state.value = 'collecting';
	sourceFilter.value = 'all';
	sortOrder.value = 'recent';
};

watch(
	() => props.open,
	async (isOpen) => {
		if (!isOpen) return;
		reset();
		try {
			await evaluationStore.fetchEvaluationConfigs(props.workflowId);
		} catch (error) {
			toast.showError(error, i18n.baseText('evaluation.setup.errors.loadDatasetsFailed'));
		}
	},
	{ immediate: true },
);

const onSubmit = async () => {
	if (!canSubmit.value || !selectedConfigId.value) return;
	state.value = 'submitting';
	const entries = buildVersionEntries(selectedVersions.value);

	try {
		const result = await store.createCollection(props.workflowId, {
			name: name.value.trim(),
			evaluationConfigId: selectedConfigId.value,
			versions: entries,
		});
		state.value = 'done';
		emit('created', result.id);
		close();
	} catch (error) {
		state.value = 'collecting';
		toast.showError(error, i18n.baseText('evaluation.setup.errors.createFailed'));
	}
};
</script>

<template>
	<N8nDialog
		:open="open"
		size="2xlarge"
		:show-close-button="true"
		:header="i18n.baseText('evaluation.setup.title')"
		:description="i18n.baseText('evaluation.setup.subtitle')"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body" data-test-id="setup-collection-wizard">
			<div :class="$style.field">
				<N8nText size="small" color="text-base" bold>
					{{ i18n.baseText('evaluation.setup.collectionName') }}
				</N8nText>
				<N8nInput
					v-model="name"
					:placeholder="i18n.baseText('evaluation.setup.collectionName.placeholder')"
					size="medium"
					data-test-id="setup-collection-wizard-name"
				/>
			</div>

			<div :class="$style.field">
				<div :class="$style.labelRow">
					<N8nText size="small" color="text-base" bold>
						{{ i18n.baseText('evaluation.setup.dataset') }}
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('evaluation.setup.dataset.helper') }}
					</N8nText>
				</div>
				<DatasetPicker
					:options="configs.map((c) => ({ id: c.id, label: c.name }))"
					:selected-id="selectedConfigId"
					:matching-versions-count="allVersions.length"
					:has-selection="selectedConfigId !== null && state !== 'versionsLoading'"
					@update:selected-id="onSelectConfig"
				/>
			</div>

			<div v-if="selectedConfigId" :class="$style.field">
				<div :class="$style.labelRow">
					<N8nText size="small" color="text-base" bold>
						{{ i18n.baseText('evaluation.setup.versions') }}
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('evaluation.setup.versions.helper') }}
					</N8nText>
				</div>

				<div :class="$style.tableControls">
					<div :class="$style.controlChip">
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('evaluation.setup.versions.filter.source') }}
						</N8nText>
						<N8nSelect
							:model-value="sourceFilter"
							size="small"
							:class="$style.controlSelect"
							@update:model-value="onSourceChange"
						>
							<N8nOption
								v-for="opt in sourceOptions"
								:key="opt.value"
								:value="opt.value"
								:label="opt.label"
							/>
						</N8nSelect>
					</div>
					<div :class="$style.controlChip">
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('evaluation.setup.versions.sort.label') }}
						</N8nText>
						<N8nSelect
							:model-value="sortOrder"
							size="small"
							:class="$style.controlSelect"
							@update:model-value="onSortChange"
						>
							<N8nOption
								value="recent"
								:label="i18n.baseText('evaluation.setup.versions.sort.recent')"
							/>
							<N8nOption
								value="oldest"
								:label="i18n.baseText('evaluation.setup.versions.sort.oldest')"
							/>
						</N8nSelect>
					</div>
				</div>

				<VersionsTable
					:versions="visibleVersions"
					:selected-version-ids="selectedVersionKeys"
					:dataset-label="datasetLabel"
					:workflow-id="workflowId"
					:color-index-by-key="versionColorByKey"
					@toggle-version="onToggleVersion"
				/>
			</div>

			<div v-if="selectedConfigId" :class="$style.field">
				<div :class="$style.labelRow">
					<N8nText size="small" color="text-base" bold>
						{{ i18n.baseText('evaluation.setup.metrics') }}
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('evaluation.setup.metrics.helper') }}
					</N8nText>
				</div>
				<div :class="$style.metricsRow">
					<span
						v-for="metric in allMetricNames"
						:key="metric"
						:class="[$style.metricPill, $style.metricPill_static]"
						data-test-id="setup-collection-wizard-metric"
					>
						<N8nIcon icon="check" size="xsmall" />
						<span>{{ metric }}</span>
					</span>
					<N8nTooltip
						v-if="allMetricNames.length > 0"
						placement="top"
						:content="i18n.baseText('evaluation.setup.metrics.addComingSoon')"
					>
						<button
							type="button"
							disabled
							:class="[$style.metricPill, $style.metricPill_add]"
							data-test-id="setup-collection-wizard-add-metric"
						>
							<N8nIcon icon="plus" size="xsmall" />
							<span>{{ i18n.baseText('evaluation.setup.metrics.addMetric') }}</span>
						</button>
					</N8nTooltip>
					<N8nText v-if="allMetricNames.length === 0" size="xsmall" color="text-light">
						{{ i18n.baseText('evaluation.setup.metrics.empty') }}
					</N8nText>
				</div>
			</div>
		</div>

		<footer :class="$style.footer">
			<div :class="$style.footerSummary">
				<N8nText size="small" color="text-base" bold>{{ footerSummaryText }}</N8nText>
				<N8nText v-if="footerExplainText" size="xsmall" color="text-light">
					{{ footerExplainText }}
				</N8nText>
			</div>
			<div :class="$style.footerActions">
				<N8nButton
					variant="ghost"
					:label="i18n.baseText('evaluation.setup.footer.cancel')"
					data-test-id="setup-collection-wizard-cancel"
					@click="close"
				/>
				<N8nButton
					variant="solid"
					:label="ctaText"
					:disabled="!canSubmit"
					:loading="state === 'submitting'"
					data-test-id="setup-collection-wizard-submit"
					@click="onSubmit"
				/>
			</div>
		</footer>
	</N8nDialog>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
	// N8nDialog has no intrinsic max-height, so a tall versions table pushes the
	// footer past the viewport. Cap the body and scroll it, leaving room for the
	// dialog's header, footer, and padding so the CTA stays visible.
	max-height: calc(100dvh - 16rem);
	overflow-y: auto;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.labelRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.tableControls {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--2xs);
}

.controlChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.controlSelect {
	min-width: 140px;
}

.metricsRow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.metricPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: 1.2;
}

// Read-only chip: every listed metric is recorded for the collection.
.metricPill_static {
	background: var(--background--success);
	border-color: var(--border-color--success);
	color: var(--text-color--success);
}

.metricPill_add {
	border-style: dashed;
	color: var(--text-color--subtler);
	cursor: not-allowed;
	opacity: 0.7;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding-top: var(--spacing--sm);
	border-top: 1px solid var(--border-color--subtle);
	margin-top: var(--spacing--sm);
}

.footerSummary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.footerActions {
	display: inline-flex;
	gap: var(--spacing--2xs);
}
</style>
