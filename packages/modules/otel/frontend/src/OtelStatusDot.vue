<template>
	<span :class="$style.dot" aria-hidden="true" />
</template>

<style lang="scss" module>
/*
 * No status-dot primitive exists in the design system (N8nPulse is a fixed-size
 * hero element), so this stays a tokens-only local component. Green + pulse only:
 * the disabled state renders a plain "Enable" action button with no dot at all.
 */
.dot {
	display: inline-block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	flex-shrink: 0;
	border-radius: var(--radius--full);
	background-color: var(--color--success);
	animation: status-dot-pulse calc(var(--duration--slow) * 2) var(--easing--ease-out) infinite;
}

@keyframes status-dot-pulse {
	from {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--color--success) 55%, transparent);
	}

	to {
		box-shadow: 0 0 0 var(--spacing--3xs) color-mix(in srgb, var(--color--success) 0%, transparent);
	}
}

@media (prefers-reduced-motion: reduce) {
	.dot {
		animation: none;
	}
}
</style>
