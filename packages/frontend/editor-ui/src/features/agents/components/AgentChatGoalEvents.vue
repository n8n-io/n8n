<script setup lang="ts">
import { N8nBadge } from '@n8n/design-system';

import type { GoalEventChip } from '@/features/ai/shared/agentsChat/goalEvents';

defineProps<{ events: GoalEventChip[] }>();
</script>

<template>
	<div :class="$style.chips" data-testid="agent-chat-goal-events">
		<N8nBadge v-for="chip in events" :key="chip.id" :theme="chip.theme" size="xsmall">
			{{ chip.label }}
		</N8nBadge>
	</div>
</template>

<style lang="scss" module>
.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--2xs);
}
</style>
