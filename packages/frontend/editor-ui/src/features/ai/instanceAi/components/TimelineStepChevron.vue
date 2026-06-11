<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';

defineProps<{
	open: boolean;
}>();
</script>

<template>
	<N8nIcon icon="chevron-right" size="large" :class="[$style.chevron, open && $style.open]" />
</template>

<style lang="scss" module>
.chevron {
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	transform-origin: center;
}

.open {
	transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
