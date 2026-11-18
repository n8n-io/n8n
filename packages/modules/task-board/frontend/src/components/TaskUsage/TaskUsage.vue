<script setup lang="ts">
import type { TaskBoardUsageTotals } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatCost, formatTokenCount } from '../../task-board.format';

/** The tokens of agent runs, with the price when a provider reported one. */
const props = defineProps<{
	usage: TaskBoardUsageTotals;
	size: 'xsmall' | 'small';
}>();
const i18n = useI18n();

const tokens = computed(() =>
	i18n.baseText('taskBoard.usage.tokens', {
		adjustToNumber: props.usage.totalTokens,
		interpolate: { count: formatTokenCount(props.usage.totalTokens) },
	}),
);
const cost = computed(() => (props.usage.cost === null ? null : formatCost(props.usage.cost)));
</script>

<template>
	<span v-if="usage.totalTokens > 0" :class="$style.usage" data-test-id="task-board-task-usage">
		<N8nText :size="size" color="text-light" data-test-id="task-board-task-usage-tokens">
			{{ tokens }}
		</N8nText>
		<template v-if="cost !== null">
			<N8nText :size="size" color="text-light" aria-hidden="true">·</N8nText>
			<N8nText :size="size" color="text-base" data-test-id="task-board-task-usage-cost">
				{{ cost }}
			</N8nText>
		</template>
	</span>
</template>

<style lang="scss" module>
.usage {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}
</style>
