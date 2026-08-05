<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import type { IconSize } from '@n8n/design-system/types';

const STATUS_ICONS = {
	success: 'node-success',
	error: 'node-execution-error',
	warning: 'node-dirty',
} as const;

const {
	status,
	iterations = 0,
	size = 'large',
} = defineProps<{
	status: keyof typeof STATUS_ICONS;
	iterations?: number;
	size?: IconSize;
}>();
</script>

<template>
	<div :class="[$style.mark, $style[status]]" :data-test-id="`canvas-node-status-mark-${status}`">
		<N8nIcon :icon="STATUS_ICONS[status]" :size="size" />
		<span v-if="status !== 'error' && iterations > 1" :class="$style.count">
			{{ iterations }}
		</span>
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

.warning {
	color: var(--color--warning);
}

.count {
	font-size: var(--font-size--sm);
}
</style>
