<script setup lang="ts">
import { useTelemetry } from '@/app/composables/useTelemetry';
import { VIEWS } from '@/app/constants';
import {
	INSIGHT_TYPES,
	INSIGHT_IMPACT_TYPES,
	INSIGHTS_UNIT_IMPACT_MAPPING,
	type InsightsViewType,
} from '@/features/execution/insights/insights.constants';
import type { InsightsSummaryDisplay } from '@/features/execution/insights/insights.types';
import type { DateValue } from '@internationalized/date';
import type { InsightsSummary } from '@n8n/api-types';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { computed, useCssModule } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { formatDateRange, getMatchingPreset, getTimeRangeLabels } from '../insights.utils';

const props = defineProps<{
	summary: InsightsSummaryDisplay;
	startDate?: DateValue;
	endDate?: DateValue;
	loading?: boolean;
}>();

const i18n = useI18n();
const route = useRoute();
const $style = useCssModule();
const telemetry = useTelemetry();

const timeRangeLabels = getTimeRangeLabels();

const displayDateRangeLabel = computed(() => {
	const timeRangeKey = getMatchingPreset({
		start: props.startDate,
		end: props.endDate,
	});

	if (timeRangeKey) {
		return timeRangeLabels[timeRangeKey];
	}

	return formatDateRange({ start: props.startDate, end: props.endDate });
});

const summaryTitles = computed<Record<InsightsViewType, string>>(() => ({
	total: i18n.baseText('insights.banner.title.total'),
	failed: i18n.baseText('insights.banner.title.failed'),
	failureRate: i18n.baseText('insights.banner.title.failureRate'),
	timeSaved: i18n.baseText('insights.banner.title.timeSaved'),
	averageRunTime: i18n.baseText('insights.banner.title.averageRunTime'),
	schedule: i18n.baseText('insights.banner.title.schedule'),
}));

const summaryHasNoData = computed(() => {
	const summaryValues = Object.values(props.summary);
	return summaryValues.length > 0 && summaryValues.every((summary) => !summary.value);
});

const summaryWithRouteLocations = computed(() => [
	...props.summary.map((s) => ({
		kind: 'summary' as const,
		...s,
		to: { name: VIEWS.INSIGHTS, params: { insightType: s.id }, query: route.query },
	})),
	{
		kind: 'schedule' as const,
		id: INSIGHT_TYPES.SCHEDULE,
		to: {
			name: VIEWS.INSIGHTS,
			params: { insightType: INSIGHT_TYPES.SCHEDULE },
			query: route.query,
		},
	},
]);

const getImpactStyle = (id: keyof InsightsSummary, value: number) => {
	const impact = INSIGHTS_UNIT_IMPACT_MAPPING[id];
	if (value === 0 || impact === INSIGHT_IMPACT_TYPES.NEUTRAL) {
		return $style.neutral;
	}
	if (impact === INSIGHT_IMPACT_TYPES.POSITIVE) {
		return value > 0 ? $style.positive : $style.negative;
	}
	if (impact === INSIGHT_IMPACT_TYPES.NEGATIVE) {
		return value < 0 ? $style.positive : $style.negative;
	}
	return $style.neutral;
};

const trackTabClick = (insightType: InsightsViewType) => {
	telemetry.track(`User clicked ${summaryTitles.value[insightType]}`, {
		referrer: route.name === VIEWS.INSIGHTS ? 'Dashboard' : 'Overview',
	});
};
</script>

<template>
	<div :class="$style.insightsWrapper">
		<div :class="$style.insights">
			<ul data-test-id="insights-summary-tabs">
				<li
					v-for="tab in summaryWithRouteLocations"
					:key="tab.id"
					:data-test-id="`insights-summary-tab-${tab.id}`"
				>
					<N8nTooltip
						:placement="route.name === VIEWS.INSIGHTS ? 'bottom' : 'top'"
						:disabled="!(summaryHasNoData && tab.id === 'total')"
						:show-after="500"
					>
						<template #content>
							<I18nT keypath="insights.banner.noData.tooltip" scope="global">
								<template #link>
									<a
										:href="i18n.baseText('insights.banner.noData.tooltip.link.url')"
										target="_blank"
									>
										{{ i18n.baseText('insights.banner.noData.tooltip.link') }}
									</a>
								</template>
							</I18nT>
						</template>
						<RouterLink
							:to="tab.to"
							:exact-active-class="$style.activeTab"
							@click="trackTabClick(tab.id)"
						>
							<strong>
								<N8nTooltip placement="bottom" :disabled="tab.id !== 'timeSaved'">
									<template #content>
										{{ i18n.baseText('insights.banner.title.timeSaved.tooltip') }}
									</template>
									{{ summaryTitles[tab.id] }}
								</N8nTooltip>
							</strong>
							<small :class="$style.days">
								{{ displayDateRangeLabel }}
							</small>
							<span v-if="tab.kind === 'schedule'" :class="$style.scheduleSummary">
								<em>{{ i18n.baseText('insights.banner.schedule.label') }}</em>
								<small :class="$style.neutral">
									{{ i18n.baseText('insights.banner.schedule.subtitle') }}
								</small>
							</span>
							<span v-else-if="tab.value === 0 && tab.id === 'timeSaved'" :class="$style.empty">
								<em>--</em>
								<small>
									<N8nTooltip placement="bottom">
										<template #content>
											<I18nT keypath="insights.banner.timeSaved.tooltip" scope="global">
												<template #link>{{
													i18n.baseText('insights.banner.timeSaved.tooltip.link.text')
												}}</template>
											</I18nT>
										</template>
										<N8nIcon :class="$style.icon" icon="info" size="medium" />
									</N8nTooltip>
								</small>
							</span>
							<span v-else>
								<em
									>{{ smartDecimal(tab.value).toLocaleString('en-US') }} <i>{{ tab.unit }}</i></em
								>
								<small v-if="tab.deviation !== null" :class="getImpactStyle(tab.id, tab.deviation)">
									<N8nIcon
										:class="[$style.icon, getImpactStyle(tab.id, tab.deviation)]"
										:icon="
											tab.deviation === 0
												? 'chevron-right'
												: tab.deviation > 0
													? 'chevron-up'
													: 'chevron-down'
										"
									/>
									<N8nTooltip placement="bottom" :disabled="tab.id !== 'failureRate'">
										<template #content>
											{{ i18n.baseText('insights.banner.failureRate.deviation.tooltip') }}
										</template>
										{{ smartDecimal(Math.abs(tab.deviation)).toLocaleString('en-US')
										}}{{ tab.deviationUnit }}
									</N8nTooltip>
								</small>
							</span>
						</RouterLink>
					</N8nTooltip>
				</li>
			</ul>
		</div>
		<!-- TODO: This should be removed after some time when the number issue is behind us -->
	</div>
</template>

<style lang="scss" module>
.insightsWrapper {
	position: relative;
	padding: var(--spacing--xs) 0 0;
	margin-bottom: var(--spacing--2xl);
}

.insights {
	display: grid;
	grid-template-rows: auto 1fr;

	ul {
		display: flex;
		min-height: 101px;
		align-items: stretch;
		justify-content: space-evenly;
		border: var(--border-width) var(--border-style) var(--color--foreground);
		border-radius: 6px;
		list-style: none;
		overflow-x: auto;

		li {
			display: flex;
			justify-content: stretch;
			align-items: stretch;
			flex: 1 0;
			border-left: var(--border-width) var(--border-style) var(--color--foreground);

			&:first-child {
				border-left: 0;
			}

			&[data-test-id='insights-summary-tab-schedule'] a {
				align-content: start;
			}

			> span {
				display: flex;
				width: 100%;
				height: 100%;
			}
		}

		a {
			display: grid;
			align-items: center;
			align-content: center;
			width: 100%;
			min-height: 100%;
			padding: var(--spacing--3xs) var(--spacing--lg) 0;
			border-bottom: 3px solid transparent;
			gap: var(--spacing--4xs);

			&:hover {
				background-color: var(--color--background--light-3);
				transition: background-color 0.3s;
			}

			&.activeTab {
				background-color: var(--color--background--light-3);
				border-color: var(--color--primary);
				transition: background-color 0.3s ease-in-out;
			}

			strong {
				justify-self: flex-start;
				color: var(--color--text--shade-1);
				font-size: var(--font-size--sm);
				font-weight: 400;
				white-space: nowrap;
				margin-bottom: var(--spacing--3xs);
			}

			.days {
				padding: 0;
				margin: 0 0 var(--spacing--xs);
				color: var(--color--text--tint-1);
				font-size: var(--font-size--2xs);
				font-weight: var(--font-weight--regular);
			}

			span {
				display: flex;
				align-items: baseline;
				min-width: 0;

				&.empty {
					em {
						color: var(--color--text--tint-2);
						body[data-theme='dark'] & {
							color: var(--color--text--tint-1);
						}
					}
					small {
						padding: 0;
						height: 21px;
						font-weight: var(--font-weight--bold);

						.icon {
							top: 5px;
							transform: translateY(0);
							color: var(--color--text--tint-1);
						}
					}
				}

				&.scheduleSummary {
					display: grid;
					align-items: start;
					justify-items: start;
					gap: var(--spacing--4xs);

					em {
						font-size: var(--font-size--md);
						line-height: 1.2;
					}

					small {
						padding: 0;
						margin: 0;
						white-space: normal;
					}
				}
			}

			em {
				display: flex;
				align-items: baseline;
				justify-content: flex-start;
				color: var(--color--text--shade-1);
				font-size: 24px;
				line-height: 100%;
				font-weight: 600;
				font-style: normal;
				gap: var(--spacing--5xs);

				i {
					font-size: 22px;
					font-style: normal;
				}
			}

			small {
				position: relative;
				display: flex;
				align-items: center;
				padding: 0 0 0 14px;
				margin: 0 0 0 var(--spacing--xs);
				font-size: var(--font-size--2xs);
				font-weight: var(--font-weight--bold);
				white-space: nowrap;
			}
		}
	}

	.noData {
		em {
			color: var(--color--text--tint-1);
			font-size: var(--font-size--md);
		}
	}
}
@media (max-width: 960px) {
	.insights {
		ul {
			height: auto;

			a {
				padding: var(--spacing--3xs) var(--spacing--sm) var(--spacing--xs);
			}
		}
	}
}

.positive {
	color: var(--color--success);
}

.negative {
	color: var(--color--danger);
}

.neutral {
	color: var(--color--text--tint-1);

	.icon {
		font-size: 17px;
	}
}

.icon {
	position: absolute;
	font-size: 17px;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
}

.loading {
	display: flex;
	align-self: stretch;
	align-items: stretch;

	> div {
		margin: 0;
		height: auto;
		border-radius: inherit;
	}
}

.queueModeWarning {
	margin-bottom: var(--spacing--xs);

	a {
		text-decoration: none;

		.underlined {
			text-decoration: underline;
		}
	}
}
</style>
