<script setup lang="ts">
import { N8nBadge } from '@n8n/design-system';

export type AiGatewayBalancePillValue = {
	text: string;
	type: 'default' | 'danger' | 'info';
};

defineProps<{
	pill: AiGatewayBalancePillValue;
}>();
</script>

<template>
	<N8nBadge
		size="xxsmall"
		:variant="pill.type === 'default' ? 'success' : pill.type"
		:class="$style.pill"
	>
		{{ pill.text }}
	</N8nBadge>
</template>

<style lang="scss" module>
// Re-skin the badge to a neutral pill. The global class outranks the badge's own
// single-class rules regardless of stylesheet order.
.pill:global(.n8n-badge) {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius);
	// N8nBadge draws a 1px border tinted to its variant; keep it transparent so the
	// re-skinned pill stays fully neutral (box size unchanged).
	border-color: transparent;
	background-color: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	color: light-dark(var(--color--neutral-750), var(--color--neutral-150));
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
}
</style>
