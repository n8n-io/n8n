<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';

interface Props {
	title: string;
	value: number | string;
	icon?: string;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
});

const formattedValue = computed(() => {
	if (typeof props.value === 'number') {
		return props.value.toLocaleString();
	}
	return props.value;
});

const trendClass = computed(() => {
	if (!props.trend) return '';
	return props.trend.isPositive ? 'positive' : 'negative';
});
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.header">
			<span :class="$style.title">{{ title }}</span>
			<div v-if="icon" :class="$style.icon">
				<N8nIcon :icon="icon" size="medium" />
			</div>
		</div>

		<div v-if="loading" :class="$style.loading">
			<N8nIcon icon="spinner" size="large" />
		</div>

		<div v-else :class="$style.content">
			<div :class="$style.value">{{ formattedValue }}</div>
			<div v-if="trend" :class="[$style.trend, $style[trendClass]]">
				<N8nIcon :icon="trend.isPositive ? 'arrow-up' : 'arrow-down'" size="small" />
				{{ Math.abs(trend.value) }}%
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
	transition: all 0.2s ease;

	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--md);
}

.title {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
	font-weight: var(--font-weight--regular);
}

.icon {
	font-size: 20px;
	color: var(--color--primary);
	opacity: 0.6;
}

.content {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
}

.value {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	line-height: 1;
}

.trend {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	&.positive {
		color: var(--color--success);
	}

	&.negative {
		color: var(--color--danger);
	}
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 60px;
	font-size: 24px;
	color: var(--color--text--tint-2);
}
</style>
