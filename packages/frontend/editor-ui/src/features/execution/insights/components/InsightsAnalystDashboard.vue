<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import { getLocalTimeZone, today } from '@internationalized/date';
import type { InsightsAnalystHighlight, InsightsSummaryType } from '@n8n/api-types';
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

const getMetricValue = (highlight: InsightsAnalystHighlight) => {
	if (highlight.unit === 'minute') return formatInsightsTimeSavedLabel(highlight.value);
	if (highlight.unit === 'ratio') {
		return i18n.baseText('insights.analyst.citation.percent', {
			interpolate: { count: smartDecimal(highlight.value * 100) },
		});
	}
	return smartDecimal(highlight.value).toLocaleString('en-US');
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
									<span>{{ getMetricValue(highlight) }}</span>
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
									<span>{{ formatInsightsTimeSavedLabel(workflow.timeSaved) }}</span>
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
.view {
	flex: 1;
	overflow: auto;
}

.container {
	width: 100%;
	max-width: var(--content-container--width);
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--2xl);
}

.title {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--lg);
	margin-bottom: var(--spacing--lg);

	p {
		margin: var(--spacing--2xs) 0 0;
		color: var(--text-color--subtle);
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
	grid-template-columns: minmax(0, 1fr) minmax(0, 32%);
	gap: var(--spacing--lg);
	align-items: start;
}

.main {
	display: grid;
	gap: var(--spacing--lg);
}

.highlights,
.lowImpactGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
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
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
}

.highlightHeader,
.highlightFooter,
.rankingRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
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
	justify-content: space-between;
	font-weight: var(--font-weight--bold);
}

.openWorkflow,
.openInline {
	color: var(--color--primary);
	font-weight: var(--font-weight--regular);
	text-decoration: none;
}

.chartCard {
	height: calc(
		var(--spacing--5xl) + var(--spacing--5xl) + var(--spacing--5xl) + var(--spacing--xl)
	);
	padding: var(--spacing--lg);
}

.rankings {
	display: grid;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
}

.rankingRow {
	position: relative;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	color: var(--text-color);
	text-decoration: none;

	&:hover .openInline,
	&:focus-visible .openInline {
		opacity: 1;
	}

	small {
		display: block;
		color: var(--text-color--subtle);
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
}
</style>
