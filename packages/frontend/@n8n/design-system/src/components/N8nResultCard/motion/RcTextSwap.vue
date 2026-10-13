<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { readMs, reflow } from './motionTokens';

/**
 * Text states swap (transitions.dev): the old label exits upward with a blur,
 * the new one enters from below. Used for condition labels and button states
 * ("Join call" → "Connecting…").
 */
const props = defineProps<{ text: string }>();

const el = ref<HTMLElement | null>(null);
const shown = ref(props.text);
const phase = ref<'idle' | 'exit' | 'enterStart'>('idle');
let timer: ReturnType<typeof setTimeout> | undefined;
let target = props.text;

watch(
	() => props.text,
	(next) => {
		if (target === next) return;
		target = next;
		clearTimeout(timer);
		phase.value = 'exit';
		timer = setTimeout(
			async () => {
				shown.value = next;
				phase.value = 'enterStart';
				await nextTick();
				reflow(el.value);
				phase.value = 'idle';
			},
			readMs(el.value, '--rc-text-swap-dur', 150),
		);
	},
);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<span
		ref="el"
		:class="[
			$style.swap,
			{ [$style.exit]: phase === 'exit', [$style.enterStart]: phase === 'enterStart' },
		]"
		>{{ shown }}</span
	>
</template>

<style lang="scss" module>
.swap {
	display: inline-block;
	transform: translateY(0);
	filter: blur(0);
	opacity: 1;
	transition:
		transform var(--rc-text-swap-dur, 150ms) var(--rc-text-swap-ease, ease-in-out),
		filter var(--rc-text-swap-dur, 150ms) var(--rc-text-swap-ease, ease-in-out),
		opacity var(--rc-text-swap-dur, 150ms) var(--rc-text-swap-ease, ease-in-out);
	will-change: transform, filter, opacity;
}
.exit {
	transform: translateY(calc(var(--rc-text-swap-translate-y, 4px) * -1));
	filter: blur(var(--rc-text-swap-blur, 2px));
	opacity: 0;
}
.enterStart {
	transform: translateY(var(--rc-text-swap-translate-y, 4px));
	filter: blur(var(--rc-text-swap-blur, 2px));
	opacity: 0;
	transition: none;
}

@media (prefers-reduced-motion: reduce) {
	.swap {
		transition: none !important;
	}
}
</style>
