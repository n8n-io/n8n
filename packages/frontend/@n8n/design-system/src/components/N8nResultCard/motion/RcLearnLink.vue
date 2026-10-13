<script lang="ts" setup>
/**
 * Learn-more hover (transitions.dev): an inline link whose chevron nudges
 * right while its two arms spread apart, like a hint of an arrow.
 */
defineProps<{ href?: string; label: string }>();
</script>

<template>
	<component
		:is="href ? 'a' : 'button'"
		:href="href"
		:type="href ? undefined : 'button'"
		:target="href ? '_blank' : undefined"
		:rel="href ? 'noopener noreferrer' : undefined"
		:class="$style.learn"
		data-test-id="result-card-learn-link"
	>
		{{ label }}
		<span :class="$style.chevron">
			<svg
				viewBox="0 0 16 16"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path :class="[$style.arm, $style.top]" d="M6 4L10 8" />
				<path :class="[$style.arm, $style.bottom]" d="M10 8L6 12" />
			</svg>
		</span>
	</component>
</template>

<style lang="scss" module>
@use './tokens';

.learn {
	@include tokens.rc-button-reset;
	flex: none;
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: 13px;
	line-height: 20px;
	font-weight: 500;
	color: var(--rc-link);
	padding: 2px 0;
	text-decoration: none;
	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
		border-radius: 4px;
	}
}
.chevron {
	display: inline-flex;
	transform: translateX(0);
	transition: transform var(--rc-learn-out, 350ms)
		var(--rc-learn-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.arm {
	transform-box: view-box;
	transform-origin: 10px 8px;
	vector-effect: non-scaling-stroke;
	transition: transform var(--rc-learn-out, 350ms)
		var(--rc-learn-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
@media (hover: hover) and (pointer: fine) {
	.learn:hover .chevron {
		transform: translateX(var(--rc-learn-shift, 2px));
		transition-duration: var(--rc-learn-in, 350ms);
	}
	.learn:hover .arm {
		transition-duration: var(--rc-learn-in, 350ms);
	}
	.learn:hover .top {
		transform: rotate(var(--rc-learn-spread, 8deg));
	}
	.learn:hover .bottom {
		transform: rotate(calc(var(--rc-learn-spread, 8deg) * -1));
	}
}

@media (prefers-reduced-motion: reduce) {
	.chevron,
	.arm {
		transition: none !important;
	}
}
</style>
