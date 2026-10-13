<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import RcGlyph from './RcGlyph.vue';
import { reflow } from './motionTokens';

/**
 * Tabs sliding (transitions.dev): a pill slides under the selected tab,
 * resizing to fit it. `strip` is the weather card's bottom bar (icon over
 * label, 48px tall); `segmented` the chart card's compact period picker.
 */
export interface RcTabOption {
	key: string;
	label: string;
	icon?: string;
}

const props = withDefaults(
	defineProps<{
		options: RcTabOption[];
		modelValue: string;
		variant?: 'strip' | 'segmented';
		label?: string;
		/** id of the panel the tabs control */
		controls?: string;
	}>(),
	{ variant: 'strip', label: undefined, controls: undefined },
);
const emit = defineEmits<{ 'update:modelValue': [key: string] }>();

const bar = ref<HTMLElement | null>(null);
const pill = ref<HTMLElement | null>(null);
const tabEls = ref<HTMLButtonElement[]>([]);
const pillStyle = ref<{ transform: string; width: string }>({
	transform: 'translateX(0)',
	width: '0',
});
const noTransition = ref(true);
let observer: ResizeObserver | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

function setTabRef(el: unknown, index: number) {
	if (el instanceof HTMLButtonElement) tabEls.value[index] = el;
}

function activeIndex(): number {
	const index = props.options.findIndex((option) => option.key === props.modelValue);
	return index < 0 ? 0 : index;
}

function moveTo(animate: boolean) {
	const tab = tabEls.value[activeIndex()];
	if (!tab) return;
	noTransition.value = !animate;
	pillStyle.value = { transform: `translateX(${tab.offsetLeft}px)`, width: `${tab.offsetWidth}px` };
	if (!animate) {
		reflow(pill.value);
		void nextTick(() => {
			noTransition.value = false;
		});
	}
}

function select(index: number, focus: boolean) {
	const option = props.options[index];
	if (!option || option.key === props.modelValue) return;
	emit('update:modelValue', option.key);
	if (focus) tabEls.value[index]?.focus();
}

function onKeydown(event: KeyboardEvent) {
	const count = props.options.length;
	if (event.key === 'ArrowRight') {
		event.preventDefault();
		select((activeIndex() + 1) % count, true);
	} else if (event.key === 'ArrowLeft') {
		event.preventDefault();
		select((activeIndex() - 1 + count) % count, true);
	}
}

onMounted(() => {
	requestAnimationFrame(() => moveTo(false));
	// fonts and icons may still be settling on first paint; the reference re-measures once
	settleTimer = setTimeout(() => moveTo(false), 120);
	if (typeof ResizeObserver !== 'undefined' && bar.value) {
		observer = new ResizeObserver(() => moveTo(false));
		observer.observe(bar.value);
	}
});
onBeforeUnmount(() => {
	observer?.disconnect();
	clearTimeout(settleTimer);
});

watch(
	() => props.modelValue,
	async () => {
		await nextTick();
		moveTo(true);
	},
);
watch(
	() => props.options.map((option) => option.key + option.label).join('|'),
	async () => {
		await nextTick();
		moveTo(false);
	},
);
</script>

<template>
	<div
		ref="bar"
		:class="[$style.tabs, $style[variant]]"
		role="tablist"
		:aria-label="label"
		@keydown="onKeydown"
	>
		<span
			ref="pill"
			:class="[$style.pill, { [$style.still]: noTransition }]"
			:style="pillStyle"
			aria-hidden="true"
		/>
		<button
			v-for="(option, index) in options"
			:key="option.key"
			:ref="(el) => setTabRef(el, index)"
			type="button"
			role="tab"
			:class="$style.tab"
			:aria-selected="option.key === modelValue"
			:aria-controls="controls"
			:tabindex="option.key === modelValue ? 0 : -1"
			:data-key="option.key"
			@click="select(index, false)"
		>
			<RcGlyph v-if="variant === 'strip' && option.icon" :name="option.icon" :size="16" />
			<span :class="$style.text">{{ option.label }}</span>
		</button>
	</div>
</template>

<style lang="scss" module>
@use './tokens';

/* colours resolve through overridable hooks so a sky-backed card can restyle the strip from outside */
.tabs {
	position: relative;
	display: flex;
	align-items: center;
	padding: 3px;
	background: var(--rc-tabs-bar-bg, var(--rc-chip));
}
.strip {
	gap: 3px;
	border-radius: 15px;
}
.segmented {
	display: inline-flex;
	gap: 2px;
	border-radius: 48px;
	flex: none;
}

.tab {
	@include tokens.rc-button-reset;
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	line-height: 16px;
	font-weight: 500;
	color: var(--rc-tabs-text-muted, var(--rc-muted));
	transition:
		color var(--rc-tabs-dur, 250ms) var(--rc-tabs-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		transform var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out, cubic-bezier(0.22, 1, 0.36, 1));
	&:active {
		transform: scale(var(--rc-press-scale, 0.99));
		transition:
			color var(--rc-tabs-dur, 250ms) var(--rc-tabs-ease, cubic-bezier(0.22, 1, 0.36, 1)),
			transform 0ms;
	}
	&[aria-selected='true'] {
		color: var(--rc-tabs-text-active, var(--rc-fg));
	}
	&:focus-visible {
		@include tokens.rc-focus-ring;
	}
}
.strip .tab {
	flex: 1;
	min-width: 0;
	height: 48px;
	flex-direction: column;
	gap: 2px;
	border-radius: 12px;
	&:focus-visible {
		box-shadow: none;
		outline: 2px solid var(--rc-tabs-text-active, var(--rc-fg));
		outline-offset: -2px;
	}
}
.segmented .tab {
	--rc-press-scale: 0.97;
	height: 26px;
	padding: 0 10px;
	border-radius: 48px;
}
@media (hover: hover) and (pointer: fine) {
	.tab:not([aria-selected='true']):hover {
		color: var(--rc-tabs-text-active, var(--rc-fg));
	}
}
.text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.pill {
	position: absolute;
	top: 3px;
	left: 0;
	width: 0;
	background: var(--rc-tabs-pill-bg, var(--rc-surface));
	box-shadow: var(--rc-tabs-pill-shadow, var(--rc-pill-shadow));
	transform: translateX(0);
	transition:
		transform var(--rc-tabs-dur, 250ms) var(--rc-tabs-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		width var(--rc-tabs-dur, 250ms) var(--rc-tabs-ease, cubic-bezier(0.22, 1, 0.36, 1));
	will-change: transform, width;
	z-index: 0;
	pointer-events: none;
}
.strip .pill {
	height: 48px;
	border-radius: 12px;
}
.segmented .pill {
	height: 26px;
	border-radius: 48px;
}
.still {
	transition: none;
}

@media (prefers-reduced-motion: reduce) {
	.pill,
	.tab {
		transition: none !important;
	}
	.tab:active {
		transform: none;
	}
}
</style>
