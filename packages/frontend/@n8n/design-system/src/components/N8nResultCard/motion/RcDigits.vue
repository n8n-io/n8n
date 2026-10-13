<script lang="ts" setup>
import { ref, watch } from 'vue';

/**
 * Number pop-in (transitions.dev): when the value changes, only the characters
 * that differ re-enter — from below, with a blur — and the last two are
 * staggered so the number reads as counting up rather than redrawing.
 */
const props = withDefaults(defineProps<{ value: string; animated?: boolean }>(), {
	animated: true,
});

interface Digit {
	key: string;
	char: string;
	same: boolean;
	stagger: 0 | 1 | 2;
}

/** Bumped on every change so the characters re-mount and the CSS animation restarts. */
const generation = ref(0);
const digits = ref<Digit[]>(build(props.value, props.value, 0));
const animating = ref(false);

function build(prev: string, next: string, gen: number): Digit[] {
	let same = 0;
	while (same < prev.length && same < next.length && prev[same] === next[same]) same++;
	const chars = next.split('');
	return chars.map((char, index) => ({
		key: `${gen}-${index}`,
		char,
		same: index < same,
		stagger: index === chars.length - 2 ? 1 : index === chars.length - 1 ? 2 : 0,
	}));
}

watch(
	() => props.value,
	(next, prev) => {
		if (next === prev) return;
		generation.value += 1;
		digits.value = build(prev ?? '', next, generation.value);
		animating.value = props.animated;
	},
);
</script>

<template>
	<span
		:class="[$style.group, { [$style.animating]: animating }]"
		:data-generation="generation"
		aria-live="polite"
		aria-atomic="true"
	>
		<span
			v-for="digit in digits"
			:key="digit.key"
			:class="$style.digit"
			:data-same="digit.same ? '' : undefined"
			:data-stagger="digit.stagger || undefined"
			>{{ digit.char }}</span
		>
	</span>
</template>

<style lang="scss" module>
@keyframes rc-digit-pop-in {
	0% {
		transform: translate(
			calc(var(--rc-digit-distance, 8px) * var(--rc-digit-dir-x, 0)),
			calc(var(--rc-digit-distance, 8px) * var(--rc-digit-dir-y, 1))
		);
		opacity: 0;
		filter: blur(var(--rc-digit-blur, 2px));
	}
	100% {
		transform: translate(0, 0);
		opacity: 1;
		filter: blur(0);
	}
}

.group {
	display: inline-flex;
	align-items: baseline;
	font-variant-numeric: tabular-nums;
}
.digit {
	display: inline-block;
	will-change: transform, opacity, filter;
}
.animating .digit {
	animation: rc-digit-pop-in var(--rc-digit-dur, 500ms)
		var(--rc-digit-ease, cubic-bezier(0.34, 1.45, 0.64, 1)) both;
}
.animating .digit[data-stagger='1'] {
	animation-delay: var(--rc-digit-stagger, 70ms);
}
.animating .digit[data-stagger='2'] {
	animation-delay: calc(var(--rc-digit-stagger, 70ms) * 2);
}
.animating .digit[data-same] {
	animation: none;
}

@media (prefers-reduced-motion: reduce) {
	.group .digit {
		animation: none !important;
	}
}
</style>
