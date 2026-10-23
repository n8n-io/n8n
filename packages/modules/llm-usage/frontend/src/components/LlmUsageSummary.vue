<script setup lang="ts">
import type { LlmUsageTotals } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatCompact, formatCount, formatUsd } from '../llm-usage.format';

const props = defineProps<{ totals: LlmUsageTotals }>();

const i18n = useI18n();

const tiles = computed(() => {
	const { costUsd, calls, inputTokens, outputTokens, cacheReadTokens, unpricedCalls } =
		props.totals;
	const pricedCalls = calls - unpricedCalls;
	return [
		{
			id: 'cost',
			title: i18n.baseText('settings.llmUsage.summary.spend'),
			value: formatUsd(costUsd),
			hint: unpricedCalls
				? i18n.baseText('settings.llmUsage.summary.unpriced', {
						interpolate: { count: formatCount(unpricedCalls) },
					})
				: undefined,
		},
		{
			id: 'calls',
			title: i18n.baseText('settings.llmUsage.summary.calls'),
			value: formatCount(calls),
		},
		{
			id: 'average',
			title: i18n.baseText('settings.llmUsage.summary.average'),
			value: formatUsd(pricedCalls ? costUsd / pricedCalls : 0),
		},
		{
			id: 'input',
			title: i18n.baseText('settings.llmUsage.summary.inputTokens'),
			value: formatCompact(inputTokens),
			hint: cacheReadTokens
				? i18n.baseText('settings.llmUsage.summary.cached', {
						interpolate: { count: formatCompact(cacheReadTokens) },
					})
				: undefined,
		},
		{
			id: 'output',
			title: i18n.baseText('settings.llmUsage.summary.outputTokens'),
			value: formatCompact(outputTokens),
		},
	];
});
</script>

<template>
	<ul :class="$style.tiles">
		<li
			v-for="tile in tiles"
			:key="tile.id"
			:class="$style.tile"
			:data-test-id="`llm-usage-total-${tile.id}`"
		>
			<N8nText size="small" color="text-base">{{ tile.title }}</N8nText>
			<span :class="$style.value">{{ tile.value }}</span>
			<N8nText v-if="tile.hint" size="xsmall" color="text-light">{{ tile.hint }}</N8nText>
		</li>
	</ul>
</template>

<style lang="scss" module>
.tiles {
	display: grid;
	/* The narrowest tile that keeps its value on one line; no size token fits. */
	grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	margin: 0;
	padding: 0;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: hidden;
}

.tile {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--md) var(--spacing--lg);
	border-left: var(--border);

	&:first-child {
		border-left: 0;
	}
}

.value {
	color: var(--text-color);
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
}
</style>
