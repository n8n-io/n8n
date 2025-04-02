<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { useI18n } from '@/composables/useI18n';
import type { InsightsSummary } from '@n8n/api-types';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import {
	INSIGHT_IMPACT_TYPES,
	INSIGHTS_UNIT_IMPACT_MAPPING,
} from '@/features/insights/insights.constants';

defineProps<{
	summary: InsightsSummaryDisplay;
	loading?: boolean;
}>();

const i18n = useI18n();
const $style = useCssModule();

const summaryTitles = computed<Record<keyof InsightsSummary, string>>(() => ({
	total: i18n.baseText('insights.banner.title.total'),
	failed: i18n.baseText('insights.banner.title.failed'),
	failureRate: i18n.baseText('insights.banner.title.failureRate'),
	timeSaved: i18n.baseText('insights.banner.title.timeSaved'),
	averageRunTime: i18n.baseText('insights.banner.title.averageRunTime'),
}));

const getSign = (n: number) => (n > 0 ? '+' : undefined);
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
</script>

<template>
	<div v-if="summary.length" :class="$style.insights">
		<N8nHeading bold tag="h3" size="small" color="text-light" class="mb-xs">{{
			i18n.baseText('insights.banner.title', { interpolate: { count: 7 } })
		}}</N8nHeading>
		<N8nLoading v-if="loading" :class="$style.loading" :cols="5" />
		<ul v-else data-test-id="insights-summary-tabs">
			<li
				v-for="{ id, value, deviation, unit } in summary"
				:key="id"
				:data-test-id="`insights-summary-tab-${id}`"
			>
				<p>
					<strong>{{ summaryTitles[id] }}</strong>
					<span v-if="value === 0 && id === 'timeSaved'" :class="$style.empty">
						<em>--</em>
						<small>
							<N8nTooltip placement="bottom">
								<template #content>
									<i18n-t keypath="insights.banner.timeSaved.tooltip">
										<template #link>
											<a href="#">{{
												i18n.baseText('insights.banner.timeSaved.tooltip.link.text')
											}}</a>
										</template>
									</i18n-t>
								</template>
								<N8nIcon :class="$style.icon" icon="info-circle" />
							</N8nTooltip>
						</small>
					</span>
					<span v-else>
						<em
							>{{ smartDecimal(value) }} <i>{{ unit }}</i></em
						>
						<small v-if="deviation !== null" :class="getImpactStyle(id, deviation)">
							<N8nIcon
								:class="[$style.icon, getImpactStyle(id, deviation)]"
								:icon="deviation === 0 ? 'caret-right' : deviation > 0 ? 'caret-up' : 'caret-down'"
							/>
							{{ getSign(deviation) }}{{ smartDecimal(deviation) }}
						</small>
					</span>
				</p>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.insights {
	display: grid;
	grid-template-rows: auto 1fr;
	padding: var(--spacing-xs) 0 var(--spacing-2xl);

	ul {
		display: flex;
		height: 91px;
		align-items: stretch;
		justify-content: flex-start;
		border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
		border-radius: 6px;
		list-style: none;
		background-color: var(--color-background-xlight);
		overflow-x: auto;

		li {
			display: flex;
			justify-content: flex-start;
			align-items: center;
			flex: 1;
			border-left: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
			padding: 0 var(--spacing-xl) 0 var(--spacing-l);

			&:first-child {
				border-left: 0;
			}
		}

		p {
			display: grid;

			strong {
				color: var(--color-text-dark);
				font-size: var(--font-size-s);
				font-weight: 400;
				white-space: nowrap;
				margin-bottom: var(--spacing-2xs);
			}

			span {
				display: flex;
				align-items: baseline;
				gap: var(--spacing-xs);

				&.empty {
					em {
						color: var(--color-text-lighter);
					}
					small {
						padding: 0;
						height: 21px;
						font-weight: var(--font-weight-bold);

						.icon {
							height: 20px;
							width: 8px;
							top: -3px;
							transform: translateY(0);
							color: var(--color-text-light);
						}
					}
				}
			}

			em {
				display: flex;
				align-items: baseline;
				justify-content: flex-start;
				color: var(--color-text-dark);
				font-size: var(--font-size-2xl);
				line-height: 100%;
				font-weight: 600;
				font-style: normal;
				gap: var(--spacing-5xs);

				i {
					color: var(--color-text-light);
					font-size: 22px;
					font-style: normal;
				}
			}

			small {
				position: relative;
				display: flex;
				align-items: center;
				padding: 0 0 0 18px;
				font-size: 14px;
				font-weight: 400;
				white-space: nowrap;
			}
		}
	}
}

.positive {
	color: var(--color-success);
}

.negative {
	color: var(--color-danger);
}

.neutral {
	color: var(--color-text-light);

	.icon {
		font-size: 23px;
	}
}

.icon {
	position: absolute;
	font-size: 32px;
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
	}
}
</style>
