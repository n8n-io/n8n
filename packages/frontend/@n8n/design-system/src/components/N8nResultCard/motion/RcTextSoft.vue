<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { readMs, reflow } from './motionTokens';

/**
 * Text swap soft (transitions.dev): the whole value cross-blurs in place while
 * its box eases to the new width. For totals, legend values and date ranges,
 * where a travelling swap would be too loud.
 */
const props = withDefaults(defineProps<{ text: string; align?: 'start' | 'end' | 'center' }>(), {
	align: 'start',
});

const el = ref<HTMLElement | null>(null);
const newEl = ref<HTMLElement | null>(null);
const settled = ref(props.text);
const pair = ref<{ old: string; next: string } | null>(null);
const swapping = ref(false);
const width = ref<string | undefined>(undefined);
let timer: ReturnType<typeof setTimeout> | undefined;
let target = props.text;

watch(
	() => props.text,
	async (next) => {
		if (target === next) return;
		const prev = target;
		target = next;
		clearTimeout(timer);
		const w0 = el.value?.getBoundingClientRect().width ?? 0;
		swapping.value = false;
		width.value = undefined;
		pair.value = { old: prev, next };
		await nextTick();
		const w1 = newEl.value?.getBoundingClientRect().width ?? 0;
		width.value = `${w0}px`;
		await nextTick();
		reflow(el.value);
		swapping.value = true;
		width.value = `${w1}px`;
		const settle =
			Math.max(
				readMs(el.value, '--rc-text-soft-dur', 200),
				readMs(el.value, '--rc-text-soft-resize-dur', 240),
			) + 40;
		timer = setTimeout(() => {
			settled.value = next;
			pair.value = null;
			swapping.value = false;
			width.value = undefined;
		}, settle);
	},
);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<span
		ref="el"
		:class="[$style.soft, { [$style.swapping]: swapping }]"
		:style="{ width, '--rc-text-soft-align': align }"
	>
		<template v-if="pair"
			><span :class="$style.old" aria-hidden="true">{{ pair.old }}</span
			><span ref="newEl" :class="$style.new">{{ pair.next }}</span></template
		>
		<template v-else>{{ settled }}</template>
	</span>
</template>

<style lang="scss" module>
.soft {
	display: inline-grid;
	justify-items: var(--rc-text-soft-align, start);
	white-space: nowrap;
	transition: width var(--rc-text-soft-resize-dur, 240ms)
		var(--rc-text-soft-resize-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.soft > span {
	grid-area: 1 / 1;
	white-space: pre;
	transition:
		filter var(--rc-text-soft-dur, 200ms) var(--rc-text-soft-ease, ease-in-out),
		opacity var(--rc-text-soft-dur, 200ms) var(--rc-text-soft-ease, ease-in-out);
}
.new {
	opacity: 0;
	filter: blur(var(--rc-text-soft-blur, 2px));
}
.swapping .old {
	opacity: 0;
	filter: blur(var(--rc-text-soft-blur, 2px));
}
.swapping .new {
	opacity: 1;
	filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {
	.soft,
	.soft > span {
		transition: none !important;
	}
}
</style>
