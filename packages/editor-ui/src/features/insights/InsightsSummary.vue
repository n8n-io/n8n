<script setup lang="ts">
import { N8nHeading } from 'n8n-design-system';

type Summary = {
	id: string;
	title: string;
	count: number;
	sign?: string;
	deviation: number;
	evaluation?: 'positive' | 'negative';
};
defineProps<{
	summaries: Summary[];
}>();

const getSign = (count: number) => (count > 0 ? '+' : undefined);
</script>

<template>
	<div :class="$style.insights">
		<N8nHeading bold tag="h3" size="medium" class="mb-xs"
			>Insights from the last 30 days</N8nHeading
		>
		<ul>
			<li v-for="{ id, title, count, sign, deviation, evaluation } in summaries" :key="id">
				<p>
					<strong>{{ title }}</strong>
					<em
						>{{ count }} <i>{{ sign }}</i></em
					>
					<small>
						<N8nIcon
							:class="$style.icon"
							:icon="evaluation === 'positive' ? 'caret-up' : 'caret-down'"
							color="text-light"
						/>
						{{ getSign(deviation) }} {{ deviation }} {{ sign }}
					</small>
				</p>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.insights {
	padding: var(--spacing-xs) 0 var(--spacing-2xl);

	ul {
		display: flex;
		height: 132px;
		justify-content: space-between;
		align-items: center;
		padding: 0 var(--spacing-xl);
		border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
		border-radius: 6px;
		list-style: none;
		background-color: var(--color-background-xlight);

		p {
			display: grid;

			strong {
				color: var(--color-text-dark);
				font-size: 14px;
				font-weight: 400;
				white-space: nowrap;
				margin-bottom: var(--spacing-2xs);
			}

			em {
				display: flex;
				align-items: baseline;
				justify-content: flex-start;
				color: var(--color-text-dark);
				font-size: 32px;
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
				color: var(--color-text-light);
				font-size: 14px;
				font-weight: 400;
				white-space: nowrap;
			}
		}
	}
}

.icon {
	position: absolute;
	font-size: 32px;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
}
</style>
