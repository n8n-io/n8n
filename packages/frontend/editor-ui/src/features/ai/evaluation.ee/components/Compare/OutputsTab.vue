<script setup lang="ts">
import { normalizeMetricScore, type MetricScale } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';

import type { CompareCaseRow } from '../../composables/useCompareCases';
import type { CompareVersion } from '../../composables/useCompareData';
import {
	extractAnswerText,
	formatMetricLabel,
	formatMetricPercent,
	getUserDefinedMetricNames,
} from '../../evaluation.utils';
import VersionAvatar from '../shared/VersionAvatar.vue';

const props = defineProps<{
	versions: CompareVersion[];
	caseRows: CompareCaseRow[];
	selectedIndex: number;
	workflowId: string;
	// metric name → scale, so a raw value normalizes to a percent (a 1–5 judge 3 → 60%).
	metricScales?: Record<string, MetricScale>;
}>();

const router = useRouter();

// Open the source execution in a new tab so the user keeps their place in the compare.
function openExecution(executionId: string | null) {
	if (!executionId) return;
	const { href } = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { workflowId: props.workflowId, executionId },
	});
	window.open(href, '_blank');
}

const emit = defineEmits<{
	'update:selectedIndex': [index: number];
}>();

const i18n = useI18n();

const selectedRow = computed(
	() => props.caseRows.find((row) => row.index === props.selectedIndex) ?? props.caseRows[0],
);

function metricEntries(
	metrics: Record<string, number> | undefined,
	scales: Record<string, MetricScale> | undefined,
) {
	if (!metrics) return [];
	return getUserDefinedMetricNames(metrics).map((key) => {
		// Normalize by the metric's scale so a raw judge value never shows as a bare percent.
		const normalized = normalizeMetricScore(key, metrics[key], scales?.[key]);
		return {
			key,
			label: formatMetricLabel(key),
			value: formatMetricPercent(normalized ?? undefined),
		};
	});
}
</script>

<template>
	<div :class="$style.outputs" data-test-id="compare-outputs-tab">
		<aside :class="$style.sidebar">
			<N8nText size="xsmall" bold color="text-light" :class="$style.sidebarTitle">
				{{ i18n.baseText('evaluation.compare.outputs.casesSidebarTitle') }}
			</N8nText>
			<button
				v-for="row in caseRows"
				:key="row.index"
				type="button"
				:class="[$style.caseItem, { [$style.caseItemActive]: row.index === selectedRow?.index }]"
				data-test-id="compare-outputs-case"
				@click="emit('update:selectedIndex', row.index)"
			>
				<N8nText size="xsmall" bold>#{{ row.displayIndex }}</N8nText>
				<N8nText size="xsmall" color="text-light" :class="$style.caseItemInput">
					{{ row.inputPreview }}
				</N8nText>
			</button>
		</aside>

		<section v-if="selectedRow" :class="$style.main">
			<div :class="$style.inputRow">
				<N8nText size="xsmall" bold color="text-light">
					{{ i18n.baseText('evaluation.compare.outputs.input') }}
				</N8nText>
				<N8nText size="small">{{ selectedRow.inputPreview }}</N8nText>
			</div>

			<div :class="$style.columns">
				<article
					v-for="cell in selectedRow.cells"
					:key="cell.versionIndex"
					:class="$style.column"
					data-test-id="compare-outputs-column"
				>
					<header :class="$style.columnHeader">
						<VersionAvatar :index="cell.versionIndex" variant="square" size="small" />
						<N8nText size="xsmall" color="text-light">
							{{ versions[cell.versionIndex]?.label }}
						</N8nText>
						<button
							v-if="cell.executionId"
							type="button"
							:class="$style.inspect"
							data-test-id="compare-outputs-inspect"
							@click="openExecution(cell.executionId)"
						>
							<N8nText size="xsmall">
								{{ i18n.baseText('evaluation.compare.outputs.inspectRun') }}
							</N8nText>
							<N8nIcon icon="external-link" size="xsmall" />
						</button>
					</header>

					<div :class="$style.answer">
						<N8nText v-if="cell.outputs !== undefined" size="small">
							{{ extractAnswerText(cell.outputs) }}
						</N8nText>
						<N8nText v-else size="small" color="text-light">
							{{ i18n.baseText('evaluation.compare.outputs.noOutput') }}
						</N8nText>
					</div>

					<footer :class="$style.metrics">
						<span
							v-for="metric in metricEntries(
								cell.metrics,
								versions[cell.versionIndex]?.metricScales ?? metricScales,
							)"
							:key="metric.key"
							:class="$style.metric"
						>
							<N8nText size="xsmall" color="text-light">{{ metric.label }}</N8nText>
							<N8nText size="xsmall" bold>{{ metric.value }}</N8nText>
						</span>
					</footer>
				</article>
			</div>
		</section>
	</div>
</template>

<style module lang="scss">
.outputs {
	display: flex;
	gap: var(--spacing--md);
	align-items: flex-start;
}

.sidebar {
	width: 240px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-height: 480px;
	overflow-y: auto;
}

.sidebarTitle {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.caseItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	align-items: flex-start;
	text-align: left;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;

	&:hover {
		background: var(--background--subtle);
	}
}

// Primary wash + left accent bar, distinct from the hover tint, marks the open case.
.caseItemActive,
.caseItemActive:hover {
	background: var(--color--primary--tint-3);
	box-shadow: inset 2px 0 0 var(--color--primary);
}

.caseItemInput {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.inputRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.columns {
	display: flex;
	gap: var(--spacing--sm);
	overflow-x: auto;
}

.column {
	flex: 1;
	min-width: 220px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
}

.columnHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.inspect {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	border: none;
	background: none;
	padding: 0;
	color: var(--color--primary);
	cursor: pointer;
	font: inherit;

	&:hover {
		text-decoration: underline;
	}
}

.answer {
	max-height: 240px;
	overflow-y: auto;
	white-space: pre-wrap;
	word-break: break-word;
}

.metrics {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--border-color--subtle);
}

.metric {
	display: inline-flex;
	gap: var(--spacing--4xs);
	align-items: baseline;
}
</style>
