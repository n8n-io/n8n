<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';

interface TopEvent {
	event_name: string;
	count: number;
}

interface Props {
	events: TopEvent[];
	loading?: boolean;
	limit?: number;
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
	limit: 10,
});

const displayEvents = computed(() => {
	return props.events.slice(0, props.limit);
});

const maxCount = computed(() => {
	if (props.events.length === 0) return 0;
	return Math.max(...props.events.map((e) => e.count));
});

function getBarWidth(count: number): number {
	if (maxCount.value === 0) return 0;
	return (count / maxCount.value) * 100;
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="loading" :class="$style.loading">加载中...</div>

		<div v-else-if="displayEvents.length === 0" :class="$style.empty">
			<N8nIcon icon="inbox" size="xlarge" />
			<p>暂无数据</p>
		</div>

		<div v-else :class="$style.list">
			<div v-for="(event, index) in displayEvents" :key="event.event_name" :class="$style.item">
				<div :class="$style.rank">{{ index + 1 }}</div>
				<div :class="$style.info">
					<div :class="$style.name">{{ event.event_name }}</div>
					<div :class="$style.barContainer">
						<div :class="$style.bar" :style="{ width: `${getBarWidth(event.count)}%` }"></div>
					</div>
				</div>
				<div :class="$style.count">{{ event.count.toLocaleString() }}</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
}

.loading,
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xl);
	color: var(--color--text--tint-2);
	gap: var(--spacing--sm);
	font-size: var(--font-size--lg);

	svg {
		font-size: 48px;
	}
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-radius: var(--radius);
	transition: background 0.2s;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.rank {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	background: var(--color--foreground--tint-2);
	border-radius: 50%;
	flex-shrink: 0;
}

.info {
	flex: 1;
	min-width: 0;
}

.name {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	margin-bottom: var(--spacing--3xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.barContainer {
	height: 6px;
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.bar {
	height: 100%;
	background: linear-gradient(90deg, var(--color--primary) 0%, var(--color--primary--tint-1) 100%);
	transition: width 0.3s ease;
}

.count {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	flex-shrink: 0;
	min-width: 60px;
	text-align: right;
}
</style>
