<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { EmptyStateCardIcon } from './types';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';

interface EmptyStateIconCardsProps {
	centerIcon: IconName | (string & {});
	sideIcons: EmptyStateCardIcon[];
	animated?: boolean;
}

defineOptions({ name: 'N8nEmptyStateIconCards' });
const props = withDefaults(defineProps<EmptyStateIconCardsProps>(), { animated: true });

// The right card swaps half a cycle after the left one and starts halfway around the icon
// list, so the two sides never show the same icon at once.
const FADE_MS = 300;
const STAGGER_MS = 1500;
const CYCLE_MS = 3000;

const count = computed(() => props.sideIcons.length);
const leftIndex = ref(0);
const rightIndex = ref(Math.floor(props.sideIcons.length / 2));
const leftFading = ref(false);
const rightFading = ref(false);

const leftIcon = computed(() =>
	count.value > 0 ? props.sideIcons[leftIndex.value % count.value] : undefined,
);
const rightIcon = computed(() =>
	count.value > 0 ? props.sideIcons[rightIndex.value % count.value] : undefined,
);

const isIconName = (icon: EmptyStateCardIcon): icon is IconName | (string & {}) =>
	typeof icon === 'string';

// Deliberately a one-shot check (not reactive), matching how the CSS media query gates
// the declarative transitions.
const prefersReducedMotion = () =>
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let cycleTimer = 0;
let staggerTimer = 0;
let leftSwapTimer = 0;
let rightSwapTimer = 0;

const swapLeft = () => {
	leftFading.value = true;
	leftSwapTimer = window.setTimeout(() => {
		leftIndex.value = (leftIndex.value + 1) % count.value;
		leftFading.value = false;
	}, FADE_MS);
};
const swapRight = () => {
	rightFading.value = true;
	rightSwapTimer = window.setTimeout(() => {
		rightIndex.value = (rightIndex.value + 1) % count.value;
		rightFading.value = false;
	}, FADE_MS);
};

const stopCycling = () => {
	window.clearInterval(cycleTimer);
	window.clearTimeout(staggerTimer);
	window.clearTimeout(leftSwapTimer);
	window.clearTimeout(rightSwapTimer);
};

// With fewer than three side icons there is nothing meaningful to cycle through, so the
// cards render statically.
const shouldCycle = computed(() => props.animated && count.value >= 3);

const startCycling = () => {
	stopCycling();
	leftIndex.value = 0;
	rightIndex.value = shouldCycle.value ? Math.floor(count.value / 2) : count.value > 1 ? 1 : 0;
	leftFading.value = false;
	rightFading.value = false;
	if (!shouldCycle.value || prefersReducedMotion()) return;
	cycleTimer = window.setInterval(() => {
		swapLeft();
		staggerTimer = window.setTimeout(swapRight, STAGGER_MS);
	}, CYCLE_MS);
};

onMounted(startCycling);
watch([count, () => props.animated], startCycling);
onBeforeUnmount(stopCycling);
</script>

<template>
	<!-- Purely decorative: the surrounding empty state carries the meaning. -->
	<div
		:class="$style.cards"
		:style="{ '--empty-state-icon-cards--fade-duration': `${FADE_MS}ms` }"
		aria-hidden="true"
	>
		<div :class="$style.card">
			<span
				v-if="leftIcon !== undefined"
				:class="[$style.sideIcon, { [$style.fading]: leftFading }]"
			>
				<N8nIcon v-if="isIconName(leftIcon)" :icon="leftIcon" />
				<component :is="leftIcon" v-else />
			</span>
		</div>
		<div :class="$style.card">
			<N8nIcon :icon="centerIcon" color="text-light" />
		</div>
		<div :class="$style.card">
			<span
				v-if="rightIcon !== undefined"
				:class="[$style.sideIcon, { [$style.fading]: rightFading }]"
			>
				<N8nIcon v-if="isIconName(rightIcon)" :icon="rightIcon" />
				<component :is="rightIcon" v-else />
			</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.cards {
	display: flex;
	align-items: center;
	justify-content: center;
}

.card {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: calc(var(--spacing--md) * 2);
	height: calc(var(--spacing--md) * 2);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
	box-shadow: var(--shadow--xs);
	overflow: hidden;
	// The font-size sizes both 1em-SVG custom marks and the (sizeless) N8nIcons.
	font-size: var(--font-size--xl);
	color: var(--text-color--subtle);

	&:first-child {
		transform: rotate(-8deg);
	}

	&:nth-child(2) {
		z-index: 1;
		transform: translateY(calc(-1 * var(--spacing--4xs)));
	}

	&:last-child {
		transform: rotate(8deg);
	}
}

.sideIcon {
	display: inline-flex;
	opacity: 1;
	filter: blur(0);
	transition:
		opacity var(--empty-state-icon-cards--fade-duration) var(--easing--ease-in-out),
		filter var(--empty-state-icon-cards--fade-duration) var(--easing--ease-in-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.fading {
	opacity: 0;
	filter: blur(4px);
}
</style>
