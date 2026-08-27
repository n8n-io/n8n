<script lang="ts" setup>
import type { StatusDotProps } from './StatusDot.types';

defineOptions({ name: 'N8nStatusDot' });

withDefaults(defineProps<StatusDotProps>(), {
	variant: 'success',
	pulse: false,
});
</script>

<template>
	<span :class="[$style[variant], { [$style.pulse]: pulse }]" aria-hidden="true" />
</template>

<style lang="scss" module>
// A single per-variant custom property drives both the fill and the pulse ring,
// so the animation automatically picks up the variant color.
.dot {
	--status-dot--color: var(--color--success);
	display: inline-block;
	flex: 0 0 auto;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--status-dot--color);
}

.success {
	composes: dot;
}

.warning {
	composes: dot;
	--status-dot--color: var(--color--warning);
}

.danger {
	composes: dot;
	--status-dot--color: var(--color--danger);
}

// Expanding and fading box-shadow ring, tinted with the dot's own color.
.pulse {
	animation: statusDotPulse var(--duration--slowest) var(--easing--ease-out) infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes statusDotPulse {
	0% {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--status-dot--color) 55%, transparent);
	}
	70% {
		box-shadow: 0 0 0 var(--spacing--3xs) transparent;
	}
	100% {
		box-shadow: 0 0 0 0 transparent;
	}
}
</style>
