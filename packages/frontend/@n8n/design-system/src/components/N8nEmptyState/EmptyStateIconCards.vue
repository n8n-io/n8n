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

// Swaps alternate between the two side cards, one per beat, so each card holds its icon for
// two beats. The right card starts halfway around the icon list, so the two sides never show
// the same icon at once.
const FADE_MS = 300;
const BEAT_MS = 1500;
// The first swap lands half a beat after mount: long enough to register the opening trio,
// short enough that the cards read as already cycling instead of sitting still for two beats.
const LEAD_IN_MS = BEAT_MS / 2;

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

let leadInTimer = 0;
let beatTimer = 0;
let leftSwapTimer = 0;
let rightSwapTimer = 0;
let nextSide: 'left' | 'right' = 'left';

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
const beat = () => {
	if (nextSide === 'left') {
		swapLeft();
		nextSide = 'right';
	} else {
		swapRight();
		nextSide = 'left';
	}
};

const stopCycling = () => {
	window.clearTimeout(leadInTimer);
	window.clearInterval(beatTimer);
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
	nextSide = 'left';
	if (!shouldCycle.value || prefersReducedMotion()) return;
	leadInTimer = window.setTimeout(() => {
		beat();
		beatTimer = window.setInterval(beat, BEAT_MS);
	}, LEAD_IN_MS);
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
			<N8nIcon :icon="centerIcon" />
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
	// Consumers whose side icons are fixed-colour brand marks can pin the tiles to a light
	// surface (and a matching dark icon colour) so the marks stay legible on the dark theme.
	background: var(--empty-state-icon-cards--tile-background, var(--background--surface));
	box-shadow: var(--shadow--xs);
	overflow: hidden;
	// The font-size sizes both 1em-SVG custom marks and the (sizeless) N8nIcons.
	font-size: var(--font-size--xl);
	color: var(--empty-state-icon-cards--tile-color, var(--text-color--subtle));

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

	// Custom marks are meant to be 1em SVGs; sizing bare `<svg>` and `<img>` roots here lets
	// plain imported `.svg?component` assets and raster logos track the card's font-size too.
	> svg,
	> img {
		width: 1em;
		height: 1em;
	}

	> img {
		object-fit: contain;
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.fading {
	opacity: 0;
	filter: blur(4px);
}
</style>
