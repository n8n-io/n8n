<script lang="ts" setup>
import { N8nHoverCard, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, ref } from 'vue';

import type { TimelineTurnUsage } from '../../session-timeline.types';
import { formatDuration } from '../../session-timeline.utils';
import { SESSION_TIMELINE_SHOW_COST_KEY } from '../agentChatInjectionKeys';
import SessionUsageBreakdown from './SessionUsageBreakdown.vue';

/**
 * The token count of one turn. Hovering, focusing or clicking it shows where the
 * tokens went: input with its prompt cache reads and writes, and output.
 */
const props = defineProps<{ usage: TimelineTurnUsage }>();

const i18n = useI18n();
const showCost = inject(SESSION_TIMELINE_SHOW_COST_KEY, () => true);
const isOpen = ref(false);

const compactFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1,
});
const numberFormatter = new Intl.NumberFormat('en-US');
const costFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 4,
});

const compactTotal = computed(() => compactFormatter.format(props.usage.totalTokens).toUpperCase());

const duration = computed(() => {
	const { startedAt, stoppedAt } = props.usage;
	return startedAt !== null && stoppedAt !== null ? formatDuration(stoppedAt - startedAt) : '';
});

const price = computed(() =>
	showCost() && props.usage.cost !== null
		? {
				label: i18n.baseText('agentSessions.timeline.usage.cost'),
				value: costFormatter.format(props.usage.cost),
			}
		: undefined,
);
</script>

<template>
	<N8nHoverCard
		v-model:open="isOpen"
		:open-delay="200"
		:close-delay="100"
		side="bottom"
		align="end"
		:side-offset="6"
		max-width="22rem"
	>
		<template #trigger>
			<button
				type="button"
				:class="$style.trigger"
				:aria-label="
					i18n.baseText('agentSessions.timeline.usage.trigger', {
						interpolate: { count: numberFormatter.format(props.usage.totalTokens) },
					})
				"
				data-testid="session-turn-usage"
				@click.stop="isOpen = !isOpen"
			>
				<N8nIcon icon="hash" :size="12" />
				<span>{{ compactTotal }}</span>
			</button>
		</template>
		<template #content>
			<SessionUsageBreakdown
				:usage="props.usage"
				:title="i18n.baseText('agentSessions.timeline.usage.title')"
				:meta="duration"
				:price="price"
				:no-cache-data-text="i18n.baseText('agentSessions.timeline.usage.noCacheData')"
				data-testid="session-turn-usage-detail"
			/>
		</template>
	</N8nHoverCard>
</template>

<style module lang="scss">
.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background: transparent;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
	line-height: 1;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--text-color);
		background-color: var(--background--hover);
	}
}
</style>
