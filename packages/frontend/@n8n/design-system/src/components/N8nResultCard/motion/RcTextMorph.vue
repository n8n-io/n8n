<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { readMs, reflow } from './motionTokens';

/**
 * Text morph (transitions.dev): the letters both strings share stay put; only
 * the differing middle cross-blurs while its box resizes. "Decline" → "Declined"
 * keeps "Decline" still and grows a "d". Used for day names and toggle labels.
 */
const props = defineProps<{ text: string }>();

interface Morph {
	prefix: string;
	old: string;
	next: string;
	suffix: string;
}

const swapEl = ref<HTMLElement | null>(null);
const oldEl = ref<HTMLElement | null>(null);
const newEl = ref<HTMLElement | null>(null);
const settled = ref(props.text);
const morph = ref<Morph | null>(null);
const morphing = ref(false);
const width = ref<string | undefined>(undefined);
let timer: ReturnType<typeof setTimeout> | undefined;
let target = props.text;

function diff(prev: string, next: string): Morph {
	let a = 0;
	while (a < prev.length && a < next.length && prev[a] === next[a]) a++;
	let b = 0;
	while (
		b < prev.length - a &&
		b < next.length - a &&
		prev[prev.length - 1 - b] === next[next.length - 1 - b]
	) {
		b++;
	}
	return {
		prefix: next.slice(0, a),
		old: prev.slice(a, prev.length - b),
		next: next.slice(a, next.length - b),
		suffix: next.slice(next.length - b),
	};
}

watch(
	() => props.text,
	async (next) => {
		if (target === next) return;
		const prev = target;
		target = next;
		clearTimeout(timer);
		morphing.value = false;
		width.value = undefined;
		morph.value = diff(prev, next);
		await nextTick();
		const w0 = oldEl.value?.getBoundingClientRect().width ?? 0;
		const w1 = newEl.value?.getBoundingClientRect().width ?? 0;
		width.value = `${w0}px`;
		await nextTick();
		reflow(swapEl.value);
		morphing.value = true;
		width.value = `${w1}px`;
		const settle =
			Math.max(
				readMs(swapEl.value, '--rc-text-morph-dur', 180),
				readMs(swapEl.value, '--rc-text-morph-resize-dur', 240),
			) + 40;
		timer = setTimeout(() => {
			settled.value = next;
			morph.value = null;
			morphing.value = false;
			width.value = undefined;
		}, settle);
	},
);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<span :class="$style.morph">
		<template v-if="morph"
			>{{ morph.prefix
			}}<span
				ref="swapEl"
				:class="[$style.swap, { [$style.morphing]: morphing }]"
				:style="{ width }"
				><span ref="oldEl" :class="$style.old" aria-hidden="true">{{ morph.old }}</span
				><span ref="newEl" :class="$style.new">{{ morph.next }}</span></span
			>{{ morph.suffix }}</template
		>
		<template v-else>{{ settled }}</template>
	</span>
</template>

<style lang="scss" module>
.morph {
	white-space: nowrap;
}
.swap {
	display: inline-grid;
	vertical-align: bottom;
	justify-items: start;
	transition: width var(--rc-text-morph-resize-dur, 240ms)
		var(--rc-text-morph-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.swap > span {
	grid-area: 1 / 1;
	white-space: pre;
	transition:
		opacity var(--rc-text-morph-dur, 180ms)
			var(--rc-text-morph-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		filter var(--rc-text-morph-dur, 180ms) var(--rc-text-morph-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.new {
	opacity: 0;
	filter: blur(var(--rc-text-morph-blur, 2px));
}
.morphing .old {
	opacity: 0;
	filter: blur(var(--rc-text-morph-blur, 2px));
}
.morphing .new {
	opacity: 1;
	filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {
	.swap,
	.swap > span {
		transition: none !important;
	}
}
</style>
