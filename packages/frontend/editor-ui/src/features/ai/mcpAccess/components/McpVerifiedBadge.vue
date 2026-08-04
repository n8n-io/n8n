<script setup lang="ts">
import { N8nBadge, N8nIcon, N8nTooltip } from '@n8n/design-system';

// Shown for CIMD clients: their identity was fetched from a published metadata
// document, so it's verifiable rather than self-asserted.
defineProps<{
	label: string;
	tooltip: string;
}>();
</script>

<template>
	<N8nTooltip :content="tooltip">
		<N8nBadge theme="success" data-test-id="cimd-verified-badge">
			<span :class="$style.content">
				<N8nIcon icon="badge-check" size="xsmall" />
				{{ label }}
			</span>
		</N8nBadge>
	</N8nTooltip>
</template>

<style lang="scss" module>
.content {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}
</style>
