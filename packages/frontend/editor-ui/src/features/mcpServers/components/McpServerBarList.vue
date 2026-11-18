<script lang="ts" setup>
import type { McpServerCountDto } from '@n8n/api-types';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import { formatNumber } from '../mcpServers.utils';

const props = defineProps<{
	title: string;
	items: McpServerCountDto[];
	emptyText: string;
	mono?: boolean;
}>();

const max = computed(() => Math.max(1, ...props.items.map((item) => item.count)));
</script>

<template>
	<section :class="$style.list">
		<N8nHeading tag="h4" size="small" bold>{{ title }}</N8nHeading>
		<N8nText v-if="items.length === 0" size="small" color="text-light">{{ emptyText }}</N8nText>
		<div v-for="item in items" :key="item.name" :class="$style.row">
			<span :class="[$style.label, { [$style.mono]: mono }]" :title="item.name">{{
				item.name
			}}</span>
			<div :class="$style.track">
				<div :class="$style.bar" :style="{ width: `${(item.count / max) * 100}%` }" />
			</div>
			<span :class="$style.count">{{ formatNumber(item.count) }}</span>
		</div>
	</section>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	min-width: 0;
}

.row {
	display: grid;
	grid-template-columns: minmax(0, 40%) 1fr auto;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--2xs);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mono {
	font-family: var(--font-family--monospace);
}

.track {
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	overflow: hidden;
}

.bar {
	height: 100%;
	border-radius: var(--radius--full);
	background: var(--color--secondary);
}

.count {
	color: var(--text-color--subtle);
	font-variant-numeric: tabular-nums;
}
</style>
