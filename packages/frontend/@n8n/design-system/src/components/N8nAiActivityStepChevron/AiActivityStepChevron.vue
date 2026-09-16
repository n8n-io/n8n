<script lang="ts" setup>
import N8nIcon from '../N8nIcon';

withDefaults(
	defineProps<{
		/** Whether the disclosure content is visible. */
		open: boolean;
		/** Direction of the chevron when the disclosure is closed. */
		direction?: 'right' | 'down';
	}>(),
	{ direction: 'right' },
);
</script>

<template>
	<N8nIcon
		icon="chevron-right"
		size="large"
		:class="[$style.chevron, direction === 'down' && $style.down, open && $style.open]"
		aria-hidden="true"
	/>
</template>

<style lang="scss" module>
.chevron {
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	transform-origin: center;
}

.open {
	transform: rotate(90deg);
}

.down {
	transform: rotate(90deg);

	&.open {
		transform: rotate(270deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
