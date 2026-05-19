<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import { getLocalTimeZone, today } from '@internationalized/date';
import type {
	InsightsAnalystHighlight,
	InsightsAnalystLowImpactWorkflow,
	InsightsSummaryType,
} from '@n8n/api-types';
import { N8nHeading, N8nIcon, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import InsightsDataRangePicker from '@/features/execution/insights/components/InsightsDataRangePicker.vue';
import InsightsAnalystPanel from '@/features/execution/insights/components/InsightsAnalystPanel.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { INSIGHT_TYPES } from '@/features/execution/insights/insights.constants';
import {
	formatInsightsTimeSavedLabel,
	getTimeRangeLabels,
	timeRangeMappings,
	transformInsightsSummary,
} from '@/features/execution/insights/insights.utils';

const InsightsChartTotal = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartTotal.vue'),
);
const InsightsChartFailed = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartFailed.vue'),
);
const InsightsChartFailureRate = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartFailureRate.vue'),
);
const InsightsChartTimeSaved = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartTimeSaved.vue'),
);
const InsightsChartAverageRuntime = defineAsyncComponent(
	async () =>
		await import('@/features/execution/insights/components/charts/InsightsChartAverageRuntime.vue'),
);

const i18n = useI18n();
const insightsStore = useInsightsStore();
const selectedInsightType = ref<InsightsSummaryType>(INSIGHT_TYPES.TOTAL);
const maxDate = today(getLocalTimeZone());
const range = shallowRef({
	start: maxDate.copy().subtract({ days: 30 }),
	end: maxDate.copy(),
});
const timeRangeLabels = getTimeRangeLabels();
const presets = computed(() =>
	insightsStore.dateRanges.map((item) => ({
		value: timeRangeMappings[item.key],
		label: timeRangeLabels[item.key],
		disabled: false,
	})),
);

const overview = computed(() => insightsStore.analystOverview.state);
const summary = computed(() => transformInsightsSummary(overview.value?.summary ?? null));
const workflowRows = computed(() => overview.value?.byWorkflow.data ?? []);
const chartComponents = computed(() => ({
	total: InsightsChartTotal,
	failed: InsightsChartFailed,
	failureRate: InsightsChartFailureRate,
	timeSaved: InsightsChartTimeSaved,
	averageRunTime: InsightsChartAverageRuntime,
}));

const getHighlightMetricValue = (highlight: InsightsAnalystHighlight) => {
	if (highlight.id === 'lowest-impact' && highlight.unit === 'minute') {
		return formatTimeSavedPerRunLabel(highlight.value);
	}
	if (highlight.unit === 'minute') return formatInsightsTimeSavedLabel(highlight.value);
	if (highlight.unit === 'ratio') {
		return i18n.baseText('insights.analyst.citation.percent', {
			interpolate: { count: smartDecimal(highlight.value * 100) },
		});
	}
	if (highlight.id === 'needs-attention' && highlight.unit === 'count') {
		return i18n.baseText('insights.analyst.highlight.failedExecutions', {
			interpolate: { count: smartDecimal(highlight.value).toLocaleString('en-US') },
			adjustToNumber: highlight.value,
		});
	}
	return smartDecimal(highlight.value).toLocaleString('en-US');
};

const getTimeSavedPerRunValue = (workflow: InsightsAnalystLowImpactWorkflow) => {
	const minutesPerRun = workflow.total > 0 ? workflow.timeSaved / workflow.total : 0;

	return formatTimeSavedPerRunLabel(minutesPerRun);
};

const formatTimeSavedPerRunLabel = (minutes: number) => {
	return i18n.baseText('insights.analyst.lowImpact.timeSavedPerRun', {
		interpolate: { count: smartDecimal(minutes).toLocaleString('en-US') },
	});
};

onMounted(async () => {
	useDocumentTitle().set(i18n.baseText('insights.analyst.title'));
	await insightsStore.analystOverview.execute();
});
</script>

<template>
	<div :class="$style.view" data-test-id="insights-analyst-dashboard">
		<div :class="$style.container">
			<header :class="$style.title">
				<div>
					<N8nHeading bold tag="h2" size="xlarge">
						{{ i18n.baseText('insights.analyst.title') }}
					</N8nHeading>
					<p>{{ i18n.baseText('insights.analyst.description') }}</p>
				</div>
				<InsightsDataRangePicker
					v-model="range"
					:max-value="maxDate"
					:min-value="maxDate.copy().subtract({ days: 30 })"
					:presets
				/>
			</header>

			<div v-if="insightsStore.analystOverview.isLoading" :class="$style.loading">
				<N8nSpinner />
				<span>{{ i18n.baseText('insights.analyst.loading') }}</span>
			</div>

			<template v-else-if="overview">
				<InsightsSummary
					:summary="summary"
					:start-date="range.start"
					:end-date="range.end"
					:active-insight-type="selectedInsightType"
					link-variant="static"
					:class="$style.summary"
					@select="selectedInsightType = $event"
				/>

				<section :class="$style.layout">
					<div :class="$style.main">
						<div :class="$style.highlights" aria-label="Insights Analyst highlights">
							<article
								v-for="highlight in overview.highlights"
								:key="highlight.id"
								:class="$style.highlight"
							>
								<div :class="$style.highlightHeader">
									<span :class="[$style.trend, $style[highlight.trend]]">
										<N8nIcon icon="sparkles" size="small" />
									</span>
									<strong>{{ highlight.title }}</strong>
								</div>
								<p>{{ highlight.description }}</p>
								<div :class="$style.highlightFooter">
									<span>{{ getHighlightMetricValue(highlight) }}</span>
									<RouterLink
										:to="{ name: VIEWS.WORKFLOW, params: { workflowId: highlight.workflowId } }"
										:class="$style.openWorkflow"
									>
										{{ i18n.baseText('insights.analyst.openWorkflow') }}
									</RouterLink>
								</div>
							</article>
						</div>

						<div :class="$style.chartCard">
							<component
								:is="chartComponents[selectedInsightType]"
								:type="selectedInsightType"
								:data="overview.byTime"
								granularity="day"
								:start-date="range.start.toString()"
								:end-date="range.end.toString()"
							/>
						</div>

						<section :class="$style.rankings">
							<N8nHeading bold tag="h3" size="medium">
								{{ i18n.baseText('insights.analyst.ranking.title') }}
							</N8nHeading>
							<RouterLink
								v-for="(workflow, index) in workflowRows"
								:key="workflow.workflowId ?? workflow.workflowName"
								:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.workflowId } }"
								:class="$style.rankingRow"
							>
								<span :class="$style.rank">{{ index + 1 }}</span>
								<span>
									<strong>{{ workflow.workflowName }}</strong>
									<small>{{ formatInsightsTimeSavedLabel(workflow.timeSaved) }}</small>
								</span>
								<span :class="$style.trendChip">
									{{ i18n.baseText('insights.analyst.ranking.trend') }}
								</span>
								<span :class="$style.openInline">
									{{ i18n.baseText('insights.analyst.openWorkflow') }}
								</span>
							</RouterLink>
						</section>

						<section :class="$style.lowImpact">
							<N8nHeading bold tag="h3" size="medium">
								{{ i18n.baseText('insights.analyst.lowImpact.title') }}
							</N8nHeading>
							<div :class="$style.lowImpactGrid">
								<article
									v-for="workflow in overview.lowImpactWorkflows"
									:key="workflow.workflowId"
									:class="$style.lowImpactTile"
								>
									<strong>{{ workflow.workflowName }}</strong>
									<p>{{ workflow.description }}</p>
									<span>{{ getTimeSavedPerRunValue(workflow) }}</span>
								</article>
							</div>
						</section>
					</div>

					<InsightsAnalystPanel
						:suggested-prompts="overview.suggestedPrompts"
						:class="$style.chat"
					/>
				</section>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as vars;

.view {
	flex: 1;
	overflow: auto;
}

.container {
	width: 100%;
	max-width: calc(var(--content-container--width) + var(--spacing--5xl) + var(--spacing--5xl));
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--2xl);

	@media (max-width: vars.$breakpoint-sm) {
		padding: var(--spacing--md) var(--spacing--lg);
	}

	@media (max-width: vars.$breakpoint-xs) {
		padding: var(--spacing--sm);
	}
}

.title {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--lg);
	margin-bottom: var(--spacing--lg);

	> div {
		min-width: 0;
	}

	p {
		margin: var(--spacing--2xs) 0 0;
		color: var(--text-color--subtle);
		font-size: var(--font-size--md);
		line-height: var(--line-height--lg);
	}

	@media (max-width: vars.$breakpoint-xs) {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--sm);
	}
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xl);
	color: var(--text-color--subtle);
}

.summary {
	margin-bottom: var(--spacing--lg);
}

.layout {
	display: grid;
	grid-template-columns:
		minmax(0, 1fr)
		minmax(
			calc(var(--spacing--5xl) + var(--spacing--xl) + var(--spacing--xl)),
			calc(var(--spacing--5xl) + var(--spacing--3xl) + var(--spacing--xl))
		);
	gap: var(--spacing--xl);
	align-items: start;

	// The analyst rail needs enough room to sit beside the dashboard without
	// compressing cards or charts. Stack earlier than the regular Insights
	// page so medium desktop and laptop widths stay clean.
	@media (max-width: vars.$breakpoint-lg) {
		grid-template-columns: minmax(0, 1fr);
	}
}

.main {
	display: grid;
	gap: var(--spacing--lg);
	min-width: 0;
}

.highlights,
.lowImpactGrid {
	display: grid;
	grid-template-columns: repeat(
		auto-fit,
		minmax(min(100%, calc(var(--spacing--5xl) + var(--spacing--xl))), 1fr)
	);
	gap: var(--spacing--sm);
}

.highlight,
.chartCard,
.rankings,
.lowImpactTile {
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
}

.highlight,
.lowImpactTile {
	display: grid;
	grid-template-rows: auto 1fr auto;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
}

.highlightHeader {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: start;
	gap: var(--spacing--sm);

	strong {
		line-height: var(--line-height--sm);
	}
}

.highlight p,
.lowImpactTile p {
	margin: 0;
	color: var(--text-color--subtle);
}

.trend {
	display: inline-flex;
	color: var(--color--primary);
}

.negative {
	color: var(--color--danger);
}

.neutral {
	color: var(--text-color--subtle);
}

.highlightFooter {
	display: grid;
	gap: var(--spacing--2xs);
	align-content: end;
	font-weight: var(--font-weight--bold);

	> span {
		white-space: nowrap;
	}
}

.openWorkflow,
.openInline {
	color: var(--color--primary);
	font-weight: var(--font-weight--regular);
	text-decoration: none;
}

.openWorkflow {
	justify-self: start;
	max-width: 100%;
}

.chartCard {
	height: clamp(
		calc(var(--spacing--5xl) + var(--spacing--xl)),
		45vh,
		calc(var(--spacing--5xl) + var(--spacing--5xl))
	);
	min-width: 0;
	overflow: hidden;
	padding: var(--spacing--lg);

	@media (max-width: vars.$breakpoint-xs) {
		padding: var(--spacing--sm);
	}
}

.rankings {
	display: grid;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
}

.rankingRow {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	color: var(--text-color);
	text-decoration: none;
	min-width: 0;

	> span:nth-child(2) {
		min-width: 0;
		flex: 1 1 auto;

		strong {
			display: block;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	&:hover .openInline,
	&:focus-visible .openInline {
		opacity: 1;
	}

	small {
		display: block;
		color: var(--text-color--subtle);
	}

	@media (max-width: vars.$breakpoint-xs) {
		flex-wrap: wrap;
		align-items: flex-start;

		> span:nth-child(2) {
			flex-basis: calc(100% - var(--spacing--xl) - var(--spacing--sm));
		}

		.trendChip {
			display: none;
		}
	}
}

.rank {
	display: inline-grid;
	place-items: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	font-weight: var(--font-weight--bold);
}

.trendChip {
	margin-left: auto;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}

.openInline {
	opacity: 0;

	@media (max-width: vars.$breakpoint-sm) {
		display: none;
	}
}

.lowImpact {
	display: grid;
	gap: var(--spacing--sm);
}

.lowImpactTile span {
	font-weight: var(--font-weight--bold);
}

.chat {
	position: sticky;
	top: var(--spacing--lg);
	align-self: start;
	min-width: 0;

	// Once the dashboard collapses to a single column, the chat sits
	// below the main content and shouldn't try to stick to the viewport.
	@media (max-width: vars.$breakpoint-lg) {
		position: static;
	}
}
</style>
