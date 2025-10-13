<script setup lang="ts">
import { useTelemetry } from '@/composables/useTelemetry';
import { VIEWS } from '@/constants';
import {
	INSIGHT_IMPACT_TYPES,
	INSIGHTS_UNIT_IMPACT_MAPPING,
} from '@/features/insights/insights.constants';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import type { InsightsDateRange, InsightsSummary } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { computed, useCssModule } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { getTimeRangeLabels } from '../insights.utils';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
const props = defineProps<{
	summary: InsightsSummaryDisplay;
	timeRange: InsightsDateRange['key'];
	loading?: boolean;
}>();

const i18n = useI18n();
const route = useRoute();
const $style = useCssModule();
const telemetry = useTelemetry();

const timeRangeLabels = getTimeRangeLabels();

const summaryTitles = computed<Record<keyof InsightsSummary, string>>(() => ({
	total: i18n.baseText('insights.banner.title.total'),
	failed: i18n.baseText('insights.banner.title.failed'),
	failureRate: i18n.baseText('insights.banner.title.failureRate'),
	timeSaved: i18n.baseText('insights.banner.title.timeSaved'),
	averageRunTime: i18n.baseText('insights.banner.title.averageRunTime'),
}));

const summaryHasNoData = computed(() => {
	const summaryValues = Object.values(props.summary);
	return summaryValues.length > 0 && summaryValues.every((summary) => !summary.value);
});

const summaryWithRouteLocations = computed(() =>
	props.summary.map((s) => ({
		...s,
		to: { name: VIEWS.INSIGHTS, params: { insightType: s.id }, query: route.query },
	})),
);

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

const trackTabClick = (insightType: keyof InsightsSummary) => {
	telemetry.track(`User clicked ${summaryTitles.value[insightType]}`, {
		referrer: route.name === VIEWS.INSIGHTS ? 'Dashboard' : 'Overview',
	});
};
</script>

<template>
	<div :class="$style.insights">
		<ul data-test-id="insights-summary-tabs">
			<li
				v-for="{ id, value, deviation, deviationUnit, unit, to } in summaryWithRouteLocations"
				:key="id"
				:data-test-id="`insights-summary-tab-${id}`"
			>
				<N8nTooltip placement="top" :disabled="!(summaryHasNoData && id === 'total')">
					<template #content>
						<I18nT keypath="insights.banner.noData.tooltip" scope="global">
							<template #link>
								<a :href="i18n.baseText('insights.banner.noData.tooltip.link.url')" target="_blank">
									{{ i18n.baseText('insights.banner.noData.tooltip.link') }}
								</a>
							</template>
						</I18nT>
					</template>
					<RouterLink :to="to" :exact-active-class="$style.activeTab" @click="trackTabClick(id)">
						<strong>
							<N8nTooltip placement="bottom" :disabled="id !== 'timeSaved'">
								<template #content>
									{{ i18n.baseText('insights.banner.title.timeSaved.tooltip') }}
								</template>
								{{ summaryTitles[id] }}
							</N8nTooltip>
						</strong>
						<small :class="$style.days">
							{{ timeRangeLabels[timeRange] }}
						</small>
						<span v-if="value === 0 && id === 'timeSaved'" :class="$style.empty">
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
								>{{ smartDecimal(value).toLocaleString('en-US') }} <i>{{ unit }}</i></em
							>
							<small v-if="deviation !== null" :class="getImpactStyle(id, deviation)">
								<N8nIcon
									:class="[$style.icon, getImpactStyle(id, deviation)]"
									:icon="
										deviation === 0
											? 'chevron-right'
											: deviation > 0
												? 'chevron-up'
												: 'chevron-down'
									"
								/>
								<N8nTooltip placement="bottom" :disabled="id !== 'failureRate'">
									<template #content>
										{{ i18n.baseText('insights.banner.failureRate.deviation.tooltip') }}
									</template>
									{{ smartDecimal(Math.abs(deviation)).toLocaleString('en-US') }}{{ deviationUnit }}
								</N8nTooltip>
							</small>
						</span>
					</RouterLink>
				</N8nTooltip>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.insights {
	display: grid;
	grid-template-rows: auto 1fr;
	padding: var(--spacing--xs) 0 var(--spacing--2xl);

	ul {
		display: flex;
		height: 101px;
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
		}

		a {
			display: grid;
			align-items: center;
			align-content: center;
			width: 100%;
			height: 100%;
			padding: var(--spacing--3xs) var(--spacing--lg) 0;
			border-bottom: 3px solid transparent;

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
				font-weight: var(--font-weight-normal);
			}

			span {
				display: flex;
				align-items: baseline;

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
</style>
