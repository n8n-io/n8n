<script setup lang="ts">
// The reference `.mini-spin`: a 13px ring spinning at .7s. The `light` variant
// (white track + accent-on-white top) reads against the coral send button.
withDefaults(defineProps<{ light?: boolean; size?: number }>(), {
	light: false,
	size: 13,
});
</script>

<template>
	<span
		:class="[$style.spinner, { [$style.light]: light }]"
		:style="{ width: `${size}px`, height: `${size}px` }"
	/>
</template>

<style module>
.spinner {
	display: inline-block;
	border: 2px solid var(--da-border-strong);
	border-top-color: var(--da-accent);
	border-radius: 50%;
	animation: mini-spin 0.7s linear infinite;
}

/* On the coral send button the ring is white with a lighter, translucent track. */
.light {
	border-color: rgba(255, 255, 255, 0.45);
	border-top-color: #fff;
}

@keyframes mini-spin {
	to {
		transform: rotate(360deg);
	}
}

/* Respect a user's reduced-motion preference: the spinner is decorative
   (aria-hidden) and the adjacent live-region text carries the meaning. */
@media (prefers-reduced-motion: reduce) {
	.spinner {
		animation: none;
	}
}
</style>
