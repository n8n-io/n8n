<script setup lang="ts">
import type {
	PublishJudgeReviewItem,
	PublishJudgeReviewSummary,
	PublishJudgeReviewVerdict,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nSettingsSection, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { fetchJudgeReviews, fetchJudgeReviewSummary } from './publish-judge.api';

/** Stack order, bottom to top. Allowed reviews are left out: the page shows what a judge stopped. */
const VERDICTS: Array<Exclude<PublishJudgeReviewVerdict, 'allowed'>> = ['noAnswer', 'refused'];
const CHART_HEIGHT_PX = 120;

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const rootStore = useRootStore();

const summary = ref<PublishJudgeReviewSummary | null>(null);
const reviews = ref<PublishJudgeReviewItem[]>([]);
const isLoading = ref(false);

const dayLabel = new Intl.DateTimeFormat(undefined, {
	weekday: 'short',
	day: 'numeric',
	timeZone: 'UTC',
});
const timeLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const verdictText = (verdict: PublishJudgeReviewVerdict) =>
	i18n.baseText(`publishJudge.monitoring.verdict.${verdict}`);

const tiles = computed(() => {
	const totals = summary.value?.totals;
	const median = summary.value?.medianDurationMs;

	return [
		{ id: 'refused' as const, value: String(totals?.refused ?? 0) },
		{ id: 'blocked' as const, value: String(totals?.blocked ?? 0) },
		{ id: 'wouldBlock' as const, value: String(totals?.wouldBlock ?? 0) },
		{ id: 'noAnswer' as const, value: String(totals?.noAnswer ?? 0) },
		{
			id: 'median' as const,
			value: median === null || median === undefined ? '–' : seconds(median),
		},
	];
});
const bars = computed(() => {
	const days = summary.value?.byDay ?? [];
	const highest = Math.max(1, ...days.map((day) => day.refused + day.noAnswer));

	return days.map((day) => {
		const total = day.refused + day.noAnswer;
		return {
			date: day.date,
			label: dayLabel.format(new Date(`${day.date}T00:00:00Z`)),
			total,
			segments: VERDICTS.filter((verdict) => day[verdict] > 0).map((verdict) => ({
				verdict,
				count: day[verdict],
				heightPx: Math.max(3, Math.round((day[verdict] / highest) * CHART_HEIGHT_PX)),
			})),
			tooltip: VERDICTS.map((verdict) => `${verdictText(verdict)}: ${day[verdict]}`).join(' · '),
		};
	});
});

function outcomeText(review: PublishJudgeReviewItem) {
	if (review.dryRun) {
		return i18n.baseText(
			review.blocked
				? 'publishJudge.monitoring.outcome.wouldBlock'
				: 'publishJudge.monitoring.outcome.dryRunAllowed',
		);
	}

	return i18n.baseText(
		review.blocked
			? 'publishJudge.monitoring.outcome.blocked'
			: 'publishJudge.monitoring.outcome.passed',
	);
}

/** The judge run: an execution of a judge workflow, or a session of a judge agent. */
function runLink(review: PublishJudgeReviewItem): string | undefined {
	if (!review.runRef) return undefined;
	if (review.judgeType === 'workflow')
		return `/workflow/${review.judgeId}/executions/${review.runRef}`;
	if (!review.judgeProjectId) return undefined;

	return `/projects/${review.judgeProjectId}/agents/${review.judgeId}/sessions/${review.runRef}`;
}

function openRun(review: PublishJudgeReviewItem) {
	const link = runLink(review);
	if (link) void router.push(link);
}

async function load() {
	isLoading.value = true;
	try {
		[summary.value, reviews.value] = await Promise.all([
			fetchJudgeReviewSummary(rootStore.restApiContext),
			fetchJudgeReviews(rootStore.restApiContext),
		]);
	} catch (error) {
		toast.showError(error, i18n.baseText('publishJudge.monitoring.loadError'));
	} finally {
		isLoading.value = false;
	}
}

onMounted(load);
</script>

<template>
	<div data-test-id="publish-judge-monitoring">
		<N8nSettingsSection
			:title="
				i18n.baseText('publishJudge.monitoring.period', {
					interpolate: { days: String(summary?.days ?? 7) },
				})
			"
		>
			<div :class="$style.tiles">
				<div
					v-for="tile in tiles"
					:key="tile.id"
					:class="$style.tile"
					:data-test-id="`publish-judge-tile-${tile.id}`"
				>
					<N8nText tag="span" size="small" color="text-light">
						{{ i18n.baseText(`publishJudge.monitoring.tile.${tile.id}`) }}
					</N8nText>
					<N8nText tag="span" size="xlarge" bold>{{ tile.value }}</N8nText>
				</div>
			</div>
			<div
				:class="$style.chart"
				role="img"
				:aria-label="i18n.baseText('publishJudge.monitoring.chart.label')"
			>
				<N8nTooltip v-for="bar in bars" :key="bar.date" :content="bar.tooltip" placement="top">
					<div :class="$style.day" :data-test-id="`publish-judge-day-${bar.date}`">
						<N8nText tag="span" size="xsmall" color="text-light">{{ bar.total || '' }}</N8nText>
						<div :class="$style.stack">
							<span
								v-for="segment in bar.segments"
								:key="segment.verdict"
								:class="[$style.segment, $style[segment.verdict]]"
								:style="{ height: `${segment.heightPx}px` }"
							/>
						</div>
						<N8nText tag="span" size="xsmall" color="text-light">{{ bar.label }}</N8nText>
					</div>
				</N8nTooltip>
			</div>
			<div :class="$style.legend">
				<span v-for="verdict in VERDICTS" :key="verdict" :class="$style.legendItem">
					<span :class="[$style.swatch, $style[verdict]]" />
					<N8nText tag="span" size="small">{{ verdictText(verdict) }}</N8nText>
				</span>
			</div>
		</N8nSettingsSection>
		<N8nSettingsSection :title="i18n.baseText('publishJudge.monitoring.list.title')">
			<div :class="$style.listHeader">
				<N8nText tag="p" size="small" color="text-light">
					{{ i18n.baseText('publishJudge.monitoring.list.description') }}
				</N8nText>
				<N8nButton
					variant="outline"
					size="small"
					icon="refresh-cw"
					:label="i18n.baseText('publishJudge.monitoring.refresh')"
					:loading="isLoading"
					data-test-id="publish-judge-monitoring-refresh"
					@click="load"
				/>
			</div>
			<N8nText v-if="reviews.length === 0" tag="p" color="text-light">
				{{ i18n.baseText('publishJudge.monitoring.list.empty') }}
			</N8nText>
			<table v-else :class="$style.table" data-test-id="publish-judge-reviews">
				<thead>
					<tr>
						<th :class="$style.narrow">
							{{ i18n.baseText('publishJudge.monitoring.column.when') }}
						</th>
						<th>{{ i18n.baseText('publishJudge.monitoring.column.what') }}</th>
						<th :class="$style.narrow">
							{{ i18n.baseText('publishJudge.monitoring.column.event') }}
						</th>
						<th>{{ i18n.baseText('publishJudge.monitoring.column.judge') }}</th>
						<th :class="$style.narrow">
							{{ i18n.baseText('publishJudge.monitoring.column.verdict') }}
						</th>
						<th :class="$style.wide">
							{{ i18n.baseText('publishJudge.monitoring.column.reason') }}
						</th>
						<th :class="$style.narrow" />
					</tr>
				</thead>
				<tbody>
					<tr v-for="review in reviews" :key="review.id" data-test-id="publish-judge-review">
						<td>{{ timeLabel.format(new Date(review.createdAt)) }}</td>
						<td>
							<N8nText tag="div" size="small" bold>{{ review.subjectName }}</N8nText>
						</td>
						<td data-test-id="publish-judge-review-event">
							{{ i18n.baseText(`publishJudge.events.${review.event}`) }}
						</td>
						<td>
							<N8nText tag="div" size="small">{{ review.judgeName }}</N8nText>
							<N8nText tag="div" size="xsmall" color="text-light">
								{{ i18n.baseText(`publishJudge.monitoring.scope.${review.judgeScope}`) }}
								· {{ seconds(review.durationMs) }}
							</N8nText>
						</td>
						<td>
							<span :class="$style.legendItem">
								<span :class="[$style.swatch, $style[review.verdict]]" />
								<N8nText tag="span" size="small">{{ verdictText(review.verdict) }}</N8nText>
							</span>
							<N8nText tag="div" size="xsmall" color="text-light">{{
								outcomeText(review)
							}}</N8nText>
						</td>
						<td>{{ review.reason ?? '–' }}</td>
						<td>
							<N8nButton
								v-if="runLink(review)"
								variant="ghost"
								size="small"
								:label="i18n.baseText('publishJudge.monitoring.openRun')"
								data-test-id="publish-judge-review-run"
								@click="openRun(review)"
							/>
						</td>
					</tr>
				</tbody>
			</table>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
.tiles {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--lg);
}

.tile {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.chart {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 1fr;
	align-items: end;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--2xs);
	border-bottom: var(--border);
}

.day {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
}

.stack {
	display: flex;
	flex-direction: column-reverse;
	/* The gap shows the surface between segments, so they never touch. */
	gap: 2px;
	width: var(--spacing--xl);
	min-height: 2px;

	/* Only the data end of the bar is rounded. The baseline stays flat. */
	> .segment:last-child {
		border-radius: var(--radius--sm) var(--radius--sm) 0 0;
	}
}

.segment {
	display: block;
	width: 100%;
}

/* Steps checked for colour-blind separation on the light surface. */
.noAnswer {
	background: var(--color--yellow-600);
}

.refused {
	background: var(--color--red-600);
}

.legend {
	display: flex;
	gap: var(--spacing--md);
	margin-top: var(--spacing--xs);
}

.legendItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.swatch {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--sm);
}

.listHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--xs);
}

.table {
	width: 100%;
	/* Fixed, so long names wrap inside their column and do not squeeze the others. */
	table-layout: fixed;
	border-collapse: collapse;
	font-size: var(--font-size--sm);
	color: var(--color--text);

	th {
		padding: var(--spacing--2xs) var(--spacing--xs);
		font-weight: var(--font-weight--medium);
		color: var(--color--text--tint-1);
		text-align: left;
		border-bottom: var(--border);
	}

	td {
		padding: var(--spacing--xs);
		vertical-align: top;
		border-bottom: var(--border);
	}
}

.narrow {
	width: 13%;
}

.wide {
	width: 26%;
}
</style>
