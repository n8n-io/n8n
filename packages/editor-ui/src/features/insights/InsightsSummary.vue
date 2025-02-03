<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { N8nIcon } from 'n8n-design-system';
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

const getSign = (count: number) => (count > 0 ? '+' : undefined);
</script>

<template>
	<div class="insights-summary">
		<RouterLink
			v-for="{ id, title, count, sign, deviation, to, evaluation } in summaries"
			:key="id"
			class="insight-summary"
			:to="to"
			exact-active-class="insight-summary--active"
		>
			<div class="insight-summary__title">{{ title }}</div>
			<div class="insight-summary__count">
				<div>
					{{ count }} <span class="insight-summary__count__sign">{{ sign }}</span>
				</div>
				<div
					class="insight-summary__deviation"
					:class="{ [`insight-summary__deviation--${evaluation}`]: Boolean(evaluation) }"
				>
					<N8nIcon icon="caret-up"></N8nIcon>
					{{ getSign(deviation) }} {{ deviation }} {{ sign }}
				</div>
			</div>
		</RouterLink>
	</div>
</template>

<style lang="scss" scoped>
.insights-summary {
	display: flex;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-radius: 6px;
	overflow-x: auto;
	scrollbar-color: var(--color-foreground-base) transparent;
	min-height: 94px;
}

.insight-summary {
	position: relative;
	display: flex;
	flex-direction: column;
	padding: 18px 24px;
	background-color: var(--color-background-xlight);
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	flex-basis: 169px;
	flex-shrink: 0;

	&:first-child {
		border-top-left-radius: inherit;
		border-bottom-left-radius: inherit;
	}

	&::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		width: 100%;
		background: currentColor;
		pointer-events: none;
		opacity: 0;
	}

	&--active {
		&::after {
			opacity: 1;
		}
	}

	& &__title {
		color: var(--color-text-dark);
		font-size: 14px;
		font-weight: 400;
		margin-bottom: 10px;
		white-space: nowrap;
	}

	& &__count {
		color: var(--color-text-dark);
		font-size: 32px;
		font-weight: 600;

		display: flex;
		align-items: baseline;
		justify-content: space-between;

		&__sign {
			color: var(--color-text-light);
			font-size: 20px;
		}
	}

	& &__deviation {
		color: var(--color-text-light);
		font-size: 14px;
		font-weight: 400;
		white-space: nowrap;

		&--positive {
			color: green;
		}

		&--negative {
			color: red;
		}
	}
}
</style>
