<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

defineProps<{
	status: 'success' | 'error';
	iterations?: number;
	size?: 'small' | 'medium' | 'large';
}>();
</script>

<template>
	<div
		v-if="status === 'success'"
		:class="[$style.mark, $style.success]"
		data-test-id="canvas-node-status-mark-success"
	>
		<N8nIcon icon="node-success" :size="size ?? 'large'" />
		<span v-if="iterations !== undefined && iterations > 1" :class="$style.count">
			{{ iterations }}
		</span>
	</div>
	<div v-else :class="[$style.mark, $style.error]" data-test-id="canvas-node-status-mark-error">
		<N8nIcon icon="node-execution-error" :size="size ?? 'large'" />
	</div>
</template>

<style lang="scss" module>
.mark {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-weight: var(--font-weight--bold);
}

.success {
	color: var(--color--success);
}

.error {
	color: var(--color--danger);
}

.count {
	font-size: var(--font-size--sm);
}
</style>
