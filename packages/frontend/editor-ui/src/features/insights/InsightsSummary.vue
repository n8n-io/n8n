<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { useI18n } from '@/composables/useI18n';

type Summary = {
	id: string;
	title: string;
	count: number;
	sign?: string;
	deviation: number;
	evaluation?: 'positive' | 'negative';
	to: RouteLocationRaw;
};
defineProps<{
	summaries: Summary[];
}>();

const i18n = useI18n();

const getSign = (count: number) => (count > 0 ? '+' : undefined);
</script>

<template>
	<div :class="$style.insights">
		<N8nHeading bold tag="h3" size="small" color="text-light" class="mb-xs">{{
			i18n.baseText('insights.banner.title', { interpolate: { count: 7 } })
		}}</N8nHeading>
		<ul>
			<li v-for="{ id, title, count, sign, deviation, evaluation, to } in summaries" :key="id">
				<RouterLink class="insight-summary" :to="to" exact-active-class="insight-summary--active">
					<strong>{{ title }}</strong>
					<span v-if="count === 0 && id === 'timeSaved'" :class="$style.empty">
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
							>{{ count }} <i>{{ sign }}</i></em
						>
						<small :class="evaluation === 'positive' ? $style.up : $style.down">
							<N8nIcon
								:class="[$style.icon, evaluation === 'positive' ? $style.up : $style.down]"
								:icon="evaluation === 'positive' ? 'caret-up' : 'caret-down'"
								color="text-light"
							/>
							{{ getSign(deviation) }} {{ deviation }}
						</small>
					</span>
				</RouterLink>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.insights {
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

		li {
			display: flex;
			justify-content: center;
			align-items: center;
			border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
			padding: 0 var(--spacing-xl) 0 var(--spacing-l);
		}

		a {
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

.up {
	color: var(--color-success);
}

.down {
	color: var(--color-danger);
}

.icon {
	position: absolute;
	font-size: 32px;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
}
</style>
