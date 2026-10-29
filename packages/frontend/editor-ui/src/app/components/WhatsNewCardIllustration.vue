<script setup lang="ts">
import { computed, useId } from 'vue';

/**
 * Stand-in artwork for a what's new article without an image: a dotted canvas
 * with one of three small scenes. The article id picks the scene, so the same
 * article always gets the same picture and neighbours in the stack differ.
 */
const props = defineProps<{ seed: number }>();

const SCENES = ['agent', 'chat', 'list'] as const;

const scene = computed(() => SCENES[Math.abs(props.seed) % SCENES.length]);
const patternId = useId();
</script>

<template>
	<svg
		:class="$style.illustration"
		viewBox="0 0 176 84"
		preserveAspectRatio="xMidYMid slice"
		aria-hidden="true"
		focusable="false"
	>
		<defs>
			<pattern :id="patternId" width="8" height="8" patternUnits="userSpaceOnUse">
				<circle cx="1" cy="1" r="0.9" :class="$style.dot" />
			</pattern>
		</defs>
		<rect width="176" height="84" :class="$style.background" />
		<rect width="176" height="84" :fill="`url(#${patternId})`" />

		<g v-if="scene === 'agent'">
			<path d="M88 42 C 88 58, 46 50, 46 62" :class="$style.wire" stroke-dasharray="3 3" />
			<path d="M88 42 L 88 62" :class="$style.wire" stroke-dasharray="3 3" />
			<path d="M88 42 C 88 58, 130 50, 130 62" :class="$style.wire" stroke-dasharray="3 3" />
			<path d="M30 29 L 70 29" :class="$style.wire" />
			<path d="M106 29 L 146 29" :class="$style.wire" />
			<circle cx="30" cy="29" r="2" :class="$style.wireDot" />
			<path d="M143 26 L 147 29 L 143 32" :class="$style.wire" />
			<rect x="70" y="16" width="36" height="26" rx="6" :class="$style.node" />
			<path
				transform="translate(82 22)"
				d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z"
				:class="$style.accent"
			/>
			<circle cx="46" cy="70" r="9" :class="$style.node" />
			<circle cx="88" cy="70" r="9" :class="[$style.node, $style.nodeAccent]" />
			<path
				transform="translate(83 65) scale(0.85)"
				d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z"
				:class="$style.accent"
			/>
			<circle cx="130" cy="70" r="9" :class="$style.node" />
		</g>

		<g v-else-if="scene === 'chat'">
			<rect x="22" y="14" width="62" height="20" rx="10" :class="$style.bubble" />
			<rect x="32" y="22" width="40" height="4" rx="2" :class="$style.line" />
			<rect x="62" y="42" width="92" height="30" rx="10" :class="$style.node" />
			<rect x="72" y="50" width="56" height="4" rx="2" :class="$style.line" />
			<rect x="72" y="59" width="40" height="4" rx="2" :class="$style.line" />
			<rect x="115" y="57" width="5" height="8" rx="1" :class="$style.accent" />
		</g>

		<g v-else>
			<template v-for="(y, index) in [14, 36, 58]" :key="y">
				<rect x="22" :y="y" width="132" height="16" rx="5" :class="$style.node" />
				<rect x="30" :y="y + 6" :width="50 - index * 10" height="4" rx="2" :class="$style.line" />
				<rect x="124" :y="y + 3" width="22" height="10" rx="5" :class="$style.accent" />
				<circle cx="141" :cy="y + 8" r="3.5" :class="$style.knob" />
			</template>
		</g>
	</svg>
</template>

<style lang="scss" module>
.illustration {
	display: block;
	width: 100%;
	height: 100%;
}

.background {
	fill: var(--background--subtle);
}

.dot {
	fill: var(--border-color--strong);
}

.node {
	fill: var(--background--surface);
	stroke: var(--border-color--strong);
}

.nodeAccent {
	stroke: var(--background--brand);
	stroke-width: 1.5;
}

.wire {
	fill: none;
	stroke: var(--border-color--stronger);
}

.wireDot {
	fill: var(--border-color--stronger);
}

.bubble {
	fill: var(--background--active);
}

.line {
	fill: var(--color--text--tint-1);
	opacity: 0.6;
}

.accent {
	fill: var(--background--brand);
}

.knob {
	fill: var(--color--neutral-white);
}
</style>
