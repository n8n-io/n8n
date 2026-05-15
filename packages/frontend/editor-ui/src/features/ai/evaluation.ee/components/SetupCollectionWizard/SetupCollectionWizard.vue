<script setup lang="ts">
import { N8nButton, N8nDialog, N8nIcon, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import type { EvalCollectionVersionEntry, EvalVersionEntry } from '../../evalCollections.types';

import DatasetPicker from './DatasetPicker.vue';
import QuickViewDrawer from './QuickViewDrawer.vue';
import VersionsTable from './VersionsTable.vue';

// State machine matches spec §3.5. We collapse INITIAL/NAME_PROVIDED into a
// single user-facing step ("fill the form"); the meaningful transitions are
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
const toast = useToast();

const name = ref('');
const selectedConfigId = ref<string | null>(null);
const selectedVersionKeys = ref<Set<string>>(new Set());
const state = ref<WizardState>('collecting');
const quickViewVersionKey = ref<string | null>(null);

// Filters the user can apply on the versions table. `Source: All` is the
// default — narrows by the `sourceLabel` returned on each version row.
const sourceFilter = ref<string>('all');
const sortOrder = ref<'recent' | 'oldest'>('recent');

const configs = computed(() => store.getEvaluationConfigs(props.workflowId));
const versionsResponse = computed(() =>
	selectedConfigId.value ? store.getVersions(selectedConfigId.value) : null,
);

const allVersions = computed<EvalVersionEntry[]>(() => versionsResponse.value?.versions ?? []);
const datasetLabel = computed(() => {
	if (!selectedConfigId.value) return '';
	return configs.value.find((c) => c.id === selectedConfigId.value)?.name ?? '';
});

const allMetricNames = computed<string[]>(() => {
	if (!selectedConfigId.value) return [];
	const cfg = configs.value.find((c) => c.id === selectedConfigId.value);
	return (cfg?.metrics ?? []).map((m) => m.name);
});

// User-toggleable subset of the config's metrics. Defaults to all-selected
// because the create flow always records every metric in the collection
// today (no backend payload field carries a subset yet). Deselecting acts
// as a visual filter on the eventual compare view; selection state is kept
// in the wizard locally so the user can scope down before submit.
const selectedMetricNames = ref<Set<string>>(new Set());

watch(allMetricNames, (next) => {
	selectedMetricNames.value = new Set(next);
});

const toggleMetric = (name: string) => {
	const next = new Set(selectedMetricNames.value);
	if (next.has(name)) next.delete(name);
	else next.add(name);
	selectedMetricNames.value = next;
};

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

// Apply source filter + sort, then expose to the table. Sort happens after
// filter so the `VersionAvatar` index in the table matches what the user
// sees (and consequently what colors a version gets on the list view card).
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

const rowKey = (v: EvalVersionEntry) => v.workflowVersionId ?? '__draft__';

const selectedVersions = computed<EvalVersionEntry[]>(() =>
	allVersions.value.filter((v) => selectedVersionKeys.value.has(rowKey(v))),
);

const selectedCount = computed(() => selectedVersionKeys.value.size);

const reuseCount = computed(
	() => selectedVersions.value.filter((v) => v.lastRun?.testRunId).length,
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
		interpolate: {
			newCount: String(newRunCount.value),
			total: String(selectedCount.value),
		},
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

const onOpenQuickView = (versionKey: string) => {
	quickViewVersionKey.value = versionKey;
};

const quickViewVersion = computed<EvalVersionEntry | null>(() => {
	if (!quickViewVersionKey.value) return null;
	return allVersions.value.find((v) => rowKey(v) === quickViewVersionKey.value) ?? null;
});

const onCloseQuickView = () => {
	quickViewVersionKey.value = null;
};

const close = () => {
	emit('update:open', false);
};

const reset = () => {
	name.value = '';
	selectedConfigId.value = null;
	selectedVersionKeys.value = new Set();
	selectedMetricNames.value = new Set();
	state.value = 'collecting';
	sourceFilter.value = 'all';
	sortOrder.value = 'recent';
	quickViewVersionKey.value = null;
};

watch(
	() => props.open,
	async (isOpen) => {
		if (!isOpen) return;
		reset();
		try {
			await store.fetchEvaluationConfigs(props.workflowId);
		} catch (error) {
			toast.showError(error, i18n.baseText('evaluation.setup.errors.loadDatasetsFailed'));
		}
	},
	{ immediate: true },
);

const onSubmit = async () => {
	if (!canSubmit.value || !selectedConfigId.value) return;
	state.value = 'submitting';
	const entries: EvalCollectionVersionEntry[] = selectedVersions.value.map((v) => ({
		workflowVersionId: v.workflowVersionId,
		existingTestRunId: v.lastRun?.testRunId,
	}));

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
		size="xlarge"
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
					:options="configs.map((c) => ({ id: c.id, label: c.name, lastEditedAt: c.updatedAt }))"
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
					<label :class="$style.controlChip">
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('evaluation.setup.versions.filter.source') }}
						</N8nText>
						<select v-model="sourceFilter" :class="$style.controlNative">
							<option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
								{{ opt.label }}
							</option>
						</select>
					</label>
					<label :class="$style.controlChip">
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('evaluation.setup.versions.sort.label') }}
						</N8nText>
						<select v-model="sortOrder" :class="$style.controlNative">
							<option value="recent">
								{{ i18n.baseText('evaluation.setup.versions.sort.recent') }}
							</option>
							<option value="oldest">
								{{ i18n.baseText('evaluation.setup.versions.sort.oldest') }}
							</option>
						</select>
					</label>
				</div>

				<VersionsTable
					:versions="visibleVersions"
					:selected-version-ids="selectedVersionKeys"
					:dataset-label="datasetLabel"
					@toggle-version="onToggleVersion"
					@open-quick-view="onOpenQuickView"
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
					<button
						v-for="metric in allMetricNames"
						:key="metric"
						type="button"
						:class="[
							$style.metricPill,
							selectedMetricNames.has(metric) && $style.metricPill_selected,
						]"
						:aria-pressed="selectedMetricNames.has(metric)"
						data-test-id="setup-collection-wizard-metric"
						@click="toggleMetric(metric)"
					>
						<N8nIcon :icon="selectedMetricNames.has(metric) ? 'check' : 'plus'" size="xsmall" />
						<span>{{ metric }}</span>
					</button>
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

		<QuickViewDrawer
			:open="quickViewVersion !== null"
			:version="quickViewVersion"
			:dataset-label="datasetLabel"
			@update:open="onCloseQuickView"
		/>
	</N8nDialog>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
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
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 1px solid var(--border-color--base);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	cursor: pointer;
}

.controlNative {
	border: none;
	background: none;
	font-size: var(--font-size--xs);
	color: var(--text-color);
	cursor: pointer;
	padding: 0;
}

.metricsRow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.metricPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: 1px solid var(--border-color--base, var(--color--neutral-200));
	border-radius: var(--radius--full);
	background: var(--background--surface);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	transition:
		background-color var(--transition-duration--fast) ease,
		border-color var(--transition-duration--fast) ease,
		color var(--transition-duration--fast) ease;

	&:hover {
		border-color: var(--border-color--strong, var(--color--neutral-300));
	}
}

.metricPill_selected {
	background: var(--background--success, var(--color--green-50));
	border-color: var(--border-color--success, var(--color--green-200));
	color: var(--text-color--success, var(--color--green-800));
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
	gap: 2px;
	min-width: 0;
}

.footerActions {
	display: inline-flex;
	gap: var(--spacing--2xs);
}
</style>
