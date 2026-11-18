<script setup lang="ts">
import { useCanvasSleep, CANVAS_SLEEP_DELAY } from './useCanvasSleep';

const props = withDefaults(
	defineProps<{
		eligible: boolean;
		delay?: number;
		reducedMotion?: boolean;
		showControls?: boolean;
		sleepLabel?: string;
		wakeLabel?: string;
	}>(),
	{ delay: CANVAS_SLEEP_DELAY },
);
const { sleeping, sleepNow, wake } = useCanvasSleep(
	() => props.eligible,
	() => props.delay,
);
defineExpose({ sleepNow, wake, sleeping });
</script>

<template>
	<div
		class="canvas-sleep-effect"
		:data-sleeping="sleeping"
		:data-reduced-motion="reducedMotion"
		data-testid="canvas-sleep-effect"
	>
		<div v-if="sleeping" class="sleep-glyphs" aria-hidden="true">
			<span>z</span><span>z</span><span>z</span>
		</div>
		<div v-if="showControls && eligible" class="sleep-controls nodrag nopan">
			<button
				type="button"
				@pointerdown.stop
				@dblclick.stop
				@click.stop="sleeping ? wake() : sleepNow()"
			>
				{{ sleeping ? wakeLabel : sleepLabel }}
			</button>
		</div>
	</div>
</template>

<style lang="scss">
@use '../../../../../../../@n8n/design-system/src/css/mixins/motion.scss' as motion;

/* These slow loops are reserved for the opt-in canvas demo. */
.canvas-sleep-effect {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	pointer-events: none;
	--sleep-cycle: 3200ms;
	--sleep-ink: var(--color--secondary, #a995e9);
}
*:has(> .canvas-sleep-effect[data-sleeping='true']) {
	animation: canvas-sleep-breathe 3200ms ease-in-out infinite;
	@include motion.reduced-motion;
}
*:has(> .canvas-sleep-effect[data-reduced-motion='true']) {
	animation: none;
}
.sleep-glyphs {
	position: absolute;
	right: 0;
	top: calc(-1 * var(--spacing--lg));
	color: var(--sleep-ink);
	font-family: Georgia, serif;
	font-style: italic;
	font-weight: var(--font-weight--bold, 700);
	font-size: var(--font-size--lg);
}
.sleep-glyphs span {
	position: absolute;
	animation: canvas-sleep-drift var(--sleep-cycle) ease-out infinite;
	@include motion.reduced-motion;
}
.sleep-glyphs span:nth-child(2) {
	animation-delay: -1066ms;
}
.sleep-glyphs span:nth-child(3) {
	animation-delay: -2132ms;
}
[data-reduced-motion='true'] .sleep-glyphs span {
	animation: none;
}
@media (prefers-reduced-motion: reduce) {
	.sleep-glyphs span:not(:first-child) {
		display: none;
	}
}
[data-reduced-motion='true'] .sleep-glyphs span:not(:first-child) {
	display: none;
}
.sleep-controls {
	position: absolute;
	bottom: calc(100% + var(--spacing--sm));
	left: 0;
	pointer-events: auto;
	white-space: nowrap;
}
.sleep-controls button {
	font: inherit;
	font-size: var(--font-size--xs);
	color: var(--color--text);
	background: var(--background--surface);
	border: var(--border-width--base, 1px) solid var(--color--foreground);
	border-radius: var(--radius--xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	cursor: pointer;
}
@keyframes canvas-sleep-breathe {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.025) rotate(-0.5deg);
	}
}
@keyframes canvas-sleep-drift {
	0% {
		opacity: 0;
		transform: translate(0, 0) scale(0.7);
	}
	25% {
		opacity: 0.85;
	}
	100% {
		opacity: 0;
		transform: translate(var(--spacing--xl), calc(-1 * var(--spacing--2xl))) scale(1.2);
	}
}
</style>
