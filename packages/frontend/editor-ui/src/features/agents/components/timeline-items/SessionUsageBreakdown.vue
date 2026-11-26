<script lang="ts" setup>
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { TimelineTokenBreakdown } from '../../session-timeline.types';

/**
 * Where the tokens of a turn or a thread went: input with its prompt cache reads
 * and writes, and output. The turn pill and the thread header both show it.
 */
const props = defineProps<{
	usage: TimelineTokenBreakdown;
	title: string;
	/** Quiet text on the right of the title, such as the duration. */
	meta?: string;
	/** The row under the total, such as the cost or the credits. */
	price?: { label: string; value: string };
	/** Shown when the model reported no cache reads or writes. */
	noCacheDataText: string;
}>();

const i18n = useI18n();

const numberFormatter = new Intl.NumberFormat('en-US');
const percentFormatter = new Intl.NumberFormat('en-US', {
	style: 'percent',
	maximumFractionDigits: 0,
});

function share(part: number, whole: number): string {
	return whole > 0 ? percentFormatter.format(part / whole) : '';
}

const hasCacheData = computed(
	() => props.usage.cacheReadTokens !== null || props.usage.cacheWriteTokens !== null,
);
const cacheRead = computed(() => props.usage.cacheReadTokens ?? 0);
const cacheWrite = computed(() => props.usage.cacheWriteTokens ?? 0);
const uncachedInput = computed(() =>
	Math.max(0, props.usage.inputTokens - cacheRead.value - cacheWrite.value),
);

const inputRows = computed(() => {
	if (!hasCacheData.value) return [];
	return [
		{
			key: 'cacheRead',
			label: i18n.baseText('agentSessions.timeline.usage.cacheRead'),
			value: cacheRead.value,
		},
		{
			key: 'cacheWrite',
			label: i18n.baseText('agentSessions.timeline.usage.cacheWrite'),
			value: cacheWrite.value,
		},
		{
			key: 'uncached',
			label: i18n.baseText('agentSessions.timeline.usage.uncached'),
			value: uncachedInput.value,
		},
	];
});
</script>

<template>
	<div :class="$style.card" data-testid="session-usage-breakdown">
		<div :class="$style.cardHeader">
			<N8nText step="sm" bold>{{ props.title }}</N8nText>
			<N8nText v-if="props.meta" step="xs" color="text-light">{{ props.meta }}</N8nText>
		</div>

		<dl :class="$style.grid">
			<dt :class="$style.strong">{{ i18n.baseText('agentSessions.timeline.usage.input') }}</dt>
			<dd :class="$style.share">{{ share(props.usage.inputTokens, props.usage.totalTokens) }}</dd>
			<dd>{{ numberFormatter.format(props.usage.inputTokens) }}</dd>

			<template v-for="row in inputRows" :key="row.key">
				<dt :class="$style.nested">{{ row.label }}</dt>
				<dd :class="$style.share">{{ share(row.value, props.usage.inputTokens) }}</dd>
				<dd :class="$style.muted">{{ numberFormatter.format(row.value) }}</dd>
			</template>

			<dt :class="$style.strong">{{ i18n.baseText('agentSessions.timeline.usage.output') }}</dt>
			<dd :class="$style.share">{{ share(props.usage.outputTokens, props.usage.totalTokens) }}</dd>
			<dd>{{ numberFormatter.format(props.usage.outputTokens) }}</dd>

			<dt :class="[$style.strong, $style.total]">
				{{ i18n.baseText('agentSessions.timeline.usage.total') }}
			</dt>
			<dd :class="[$style.share, $style.total]" />
			<dd :class="[$style.strong, $style.total]">
				{{ numberFormatter.format(props.usage.totalTokens) }}
			</dd>

			<template v-if="props.price">
				<dt>{{ props.price.label }}</dt>
				<dd />
				<dd>{{ props.price.value }}</dd>
			</template>
		</dl>

		<N8nText v-if="!hasCacheData" step="xs" color="text-light">
			{{ props.noCacheDataText }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	min-width: 16rem;
}

.cardHeader {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.grid {
	display: grid;
	grid-template-columns: 1fr auto auto;
	column-gap: var(--spacing--sm);
	row-gap: var(--spacing--4xs);
	margin: 0;
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;

	dt {
		color: var(--text-color--subtle);
	}

	dd {
		margin: 0;
		text-align: right;
	}
}

.strong {
	color: var(--text-color);
	font-weight: var(--font-weight--bold);
}

.nested {
	padding-left: var(--spacing--sm);
}

.share {
	color: var(--text-color--subtler);
}

.muted {
	color: var(--text-color--subtle);
}

.total {
	padding-top: var(--spacing--4xs);
	border-top: var(--border);
}
</style>
