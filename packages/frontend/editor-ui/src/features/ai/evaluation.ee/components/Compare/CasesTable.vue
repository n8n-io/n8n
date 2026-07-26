<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { CompareCaseCell, CompareCaseRow } from '../../composables/useCompareCases';
import type { CompareVersion } from '../../composables/useCompareData';
import { computeDelta, formatDeltaPercent, formatMetricPercent } from '../../evaluation.utils';
import { versionColorVar } from '../shared/versionPalette';

const props = defineProps<{
	versions: CompareVersion[];
	caseRows: CompareCaseRow[];
	// While the run is in progress, a case whose input hasn't loaded yet shows a
	// skeleton rather than a blank cell.
	isRunning?: boolean;
}>();

const emit = defineEmits<{
	drilldown: [caseIndex: number];
}>();

const i18n = useI18n();

// Below this fraction a score reads as a critical regression (mirrors the hero
// chart threshold).
const CRITICAL_THRESHOLD = 0.6;

type SortKey = 'spread' | 'index' | 'best';
// Default to the biggest regressions first, so the cases that moved most surface
// at the top without scrolling. "spread" = the gap between a case's best and
// worst version, which is what the "Δ vs best" header sorts on.
const sort = ref<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'spread', dir: 'desc' });

function toggleSort(key: SortKey) {
	if (sort.value.key === key) {
		sort.value = { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' };
	} else {
		sort.value = { key, dir: key === 'index' ? 'asc' : 'desc' };
	}
}

// `aria-sort` for a sortable header: the active direction, or 'none' otherwise.
function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
	if (sort.value.key !== key) return 'none';
	return sort.value.dir === 'asc' ? 'ascending' : 'descending';
}

function bestScore(row: CompareCaseRow): number | null {
	if (row.bestVersionIndex === null) return null;
	return row.cells[row.bestVersionIndex].score;
}

// Spread between the best and worst scored version — the "regression size" the
// default sort ranks by.
function scoreSpread(row: CompareCaseRow): number {
	const scores = row.cells.map((cell) => cell.score).filter((s): s is number => s !== null);
	if (scores.length < 2) return 0;
	return Math.max(...scores) - Math.min(...scores);
}

const sortedRows = computed(() => {
	const rows = [...props.caseRows];
	const dir = sort.value.dir === 'asc' ? 1 : -1;
	const value = (row: CompareCaseRow) => {
		if (sort.value.key === 'index') return row.index;
		if (sort.value.key === 'best') return bestScore(row) ?? -1;
		return scoreSpread(row);
	};
	return rows.sort((a, b) => (value(a) - value(b)) * dir);
});

function isCritical(score: number | null): boolean {
	return score !== null && score < CRITICAL_THRESHOLD;
}

// A scored cell shows its percentage; an unscored one is either still running
// (the case exists — `testCaseId` set — but hasn't produced a metric yet, shown
// as a neutral dash) or genuinely absent from this version's run (dataset
// drift → `⊘`).
function scoreLabel(cell: CompareCaseCell): string {
	if (cell.score !== null) return formatMetricPercent(cell.score);
	return cell.testCaseId !== null ? '–' : '⊘';
}

// Non-winning versions' delta vs the best, for the "Δ vs best" column.
function deltas(row: CompareCaseRow) {
	const best = bestScore(row);
	if (best === null || row.bestVersionIndex === null) return [];
	return row.cells
		.filter((cell) => cell.versionIndex !== row.bestVersionIndex && cell.score !== null)
		.map((cell) => ({
			versionIndex: cell.versionIndex,
			letter: props.versions[cell.versionIndex]?.letter ?? '',
			delta: formatDeltaPercent(computeDelta(cell.score ?? undefined, best)),
		}));
}
</script>

<template>
	<table :class="$style.table" data-test-id="compare-cases-table">
		<thead>
			<tr>
				<th
					:class="$style.num"
					role="button"
					tabindex="0"
					:aria-sort="ariaSort('index')"
					@click="toggleSort('index')"
					@keydown.enter="toggleSort('index')"
					@keydown.space.prevent="toggleSort('index')"
				>
					{{ i18n.baseText('evaluation.compare.cases.col.index') }}
				</th>
				<th>{{ i18n.baseText('evaluation.compare.cases.col.input') }}</th>
				<th v-for="version in versions" :key="version.testRunId" :class="$style.score">
					{{ version.letter }}
				</th>
				<th
					role="button"
					tabindex="0"
					:aria-sort="ariaSort('best')"
					@click="toggleSort('best')"
					@keydown.enter="toggleSort('best')"
					@keydown.space.prevent="toggleSort('best')"
				>
					{{ i18n.baseText('evaluation.compare.cases.col.best') }}
				</th>
				<th
					role="button"
					tabindex="0"
					:aria-sort="ariaSort('spread')"
					@click="toggleSort('spread')"
					@keydown.enter="toggleSort('spread')"
					@keydown.space.prevent="toggleSort('spread')"
				>
					{{ i18n.baseText('evaluation.compare.cases.col.deltaVsBest') }}
				</th>
				<th :class="$style.chevronCol" />
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="row in sortedRows"
				:key="row.index"
				:class="$style.row"
				tabindex="0"
				data-test-id="compare-cases-row"
				@click="emit('drilldown', row.index)"
				@keydown.enter="emit('drilldown', row.index)"
			>
				<td :class="$style.num">{{ row.displayIndex }}</td>
				<td :class="$style.input" :title="row.inputPreview">
					<span v-if="row.inputPreview">{{ row.inputPreview }}</span>
					<span
						v-else-if="isRunning"
						:class="$style.inputSkeleton"
						data-test-id="compare-cases-input-skeleton"
						aria-hidden="true"
					/>
				</td>
				<td v-for="cell in row.cells" :key="cell.versionIndex" :class="$style.score">
					<span :class="$style.chip">
						<span :class="$style.dot" :style="{ background: versionColorVar(cell.versionIndex) }" />
						<N8nText size="xsmall" :color="isCritical(cell.score) ? 'danger' : 'text-base'" bold>
							{{ scoreLabel(cell) }}
						</N8nText>
					</span>
				</td>
				<td>
					<span v-if="row.bestVersionIndex !== null" :class="$style.bestPill">
						<N8nText size="xsmall" color="success" bold>
							{{
								i18n.baseText('evaluation.compare.cases.bestPill', {
									interpolate: { letter: versions[row.bestVersionIndex]?.letter ?? '' },
								})
							}}
						</N8nText>
					</span>
				</td>
				<td>
					<span :class="$style.deltas">
						<N8nText
							v-for="d in deltas(row)"
							:key="d.versionIndex"
							size="xsmall"
							color="text-light"
						>
							{{ d.letter }} {{ d.delta }}
						</N8nText>
					</span>
				</td>
				<td :class="$style.chevronCol">
					<N8nIcon icon="chevron-right" size="small" color="text-light" />
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--xs);

	th {
		text-align: left;
		padding: var(--spacing--2xs) var(--spacing--xs);
		color: var(--text-color--subtle);
		font-weight: var(--font-weight--medium);
		border-bottom: 1px solid var(--border-color--subtle);
		white-space: nowrap;

		&[role='button'] {
			cursor: pointer;
			user-select: none;
		}
	}

	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: 1px solid var(--border-color--subtle);
		vertical-align: middle;
	}
}

.row {
	cursor: pointer;

	&:hover {
		background: var(--background--subtle);
	}
}

.num {
	width: 40px;
	color: var(--text-color--subtle);
}

.input {
	max-width: 320px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.inputSkeleton {
	display: inline-block;
	width: 60%;
	min-width: 80px;
	height: 0.9em;
	vertical-align: middle;
	border-radius: var(--radius);
	background: var(--background--subtle);
	// Shared design-system pulse (reduced-motion handled by the mixin).
	@include motion.skeleton-pulse;
}

.score {
	text-align: center;
	white-space: nowrap;
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: var(--radius--full);
	flex-shrink: 0;
}

.bestPill {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	border: 1px solid var(--border-color--success);
	white-space: nowrap;
}

.deltas {
	display: inline-flex;
	gap: var(--spacing--2xs);
	white-space: nowrap;
}

.chevronCol {
	width: 32px;
	text-align: right;
}
</style>
