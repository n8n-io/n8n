<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root -- Keep the disabled effect free of layout wrappers. */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
	enabled: boolean;
	disabled?: boolean;
	label: string;
	deletionOnly?: boolean;
	reducedMotion?: boolean;
}>();
const active = ref(false);
const systemReducedMotion = ref(false);
const reduced = computed(() => props.reducedMotion || systemReducedMotion.value);
const duration = computed(() => (reduced.value ? 650 : 3400));
let timer: ReturnType<typeof setTimeout> | undefined;
let media: MediaQueryList | undefined;
function updateMotion() {
	systemReducedMotion.value = media?.matches ?? false;
	cancel();
}
function cancel() {
	clearTimeout(timer);
	timer = undefined;
	active.value = false;
}
function fold() {
	if (!props.enabled || props.disabled || active.value) return;
	active.value = true;
	timer = setTimeout(cancel, duration.value);
}
watch(() => [props.enabled, props.disabled, props.reducedMotion], cancel);
onMounted(() => {
	media = window.matchMedia('(prefers-reduced-motion: reduce)');
	systemReducedMotion.value = media.matches;
	media.addEventListener('change', updateMotion);
});
onBeforeUnmount(() => {
	cancel();
	media?.removeEventListener('change', updateMotion);
});
defineExpose({ fold, cancel, active });
</script>

<template>
	<slot v-if="!enabled" />
	<div
		v-else
		class="canvas-origami"
		:class="{ 'is-folding': active, 'is-reduced': reduced }"
		:style="{ '--origami-duration': `${duration}ms` }"
		data-testid="canvas-origami"
		:data-folding="active"
		:data-deletion-enabled="!disabled"
	>
		<div class="origami-paper"><slot /></div>
		<button
			v-if="enabled && !disabled && !deletionOnly"
			class="origami-corner nodrag nopan"
			type="button"
			:aria-label="label"
			:title="label"
			:disabled="active"
			@pointerdown.stop
			@dblclick.stop
			@click.stop="fold"
		>
			<svg viewBox="0 0 32 32" aria-hidden="true">
				<path d="M0 0h32v32z" fill="currentColor" />
				<path d="M0 0v32h32z" fill="currentColor" opacity=".2" />
			</svg>
		</button>
		<div class="origami-flight" aria-hidden="true" data-testid="origami-bird">
			<svg viewBox="0 0 180 140" class="origami-bird">
				<path d="M80 83 11 42 61 103Z" fill="#b89b50" />
				<path class="origami-wing far" d="M76 88 49 8 126 66Z" fill="#f1d789" />
				<path d="M60 103 126 66 151 48 141 74 166 80 139 85 101 112Z" fill="#fff0b5" />
				<path d="m126 66 13 19-38 27-41-9Z" fill="#dec16e" />
				<path
					class="origami-wing near"
					d="M69 99 30 25 127 82Z"
					fill="#ffe8a1"
					stroke="#f9edbd"
					stroke-width="1"
				/>
				<path d="m69 99 58-17-26 30Z" fill="#c9a951" />
				<path d="m151 48-12 37 27-5-25-6Z" fill="#f4d984" />
			</svg>
		</div>
	</div>
</template>

<style lang="scss">
@use '../../../../../../../@n8n/design-system/src/css/mixins/motion.scss' as motion;
.canvas-origami {
	position: relative;
	width: fit-content;
	isolation: isolate;
}
.origami-paper {
	transform-origin: 90% 10%;
}
.origami-corner {
	position: absolute;
	top: 0;
	right: 0;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	padding: 0;
	border: 0;
	color: var(--color--text--tint-1, #887039);
	background: transparent;
	cursor: pointer;
	opacity: 0.55;
	z-index: 2;
}
.origami-corner svg {
	display: block;
	width: 100%;
	height: 100%;
}
.origami-corner:hover,
.origami-corner:focus-visible {
	opacity: 1;
}
.origami-corner:focus-visible {
	outline: var(--spacing--5xs) solid var(--color--primary);
}
.is-folding .origami-corner {
	visibility: hidden;
}
.is-folding:not(.is-reduced) .origami-paper {
	animation: origami-fold var(--origami-duration) ease-in-out both;
	@include motion.reduced-motion;
}
.origami-flight {
	visibility: hidden;
	position: absolute;
	top: 0;
	right: 0;
	width: var(--spacing--4xl);
	height: var(--spacing--4xl);
	pointer-events: none;
	z-index: 3;
	animation: origami-flight var(--origami-duration) cubic-bezier(0.4, 0, 0.2, 1) both;
	@include motion.reduced-motion;
}
.is-folding .origami-flight {
	visibility: visible;
}
.origami-bird {
	width: 100%;
	height: 100%;
	overflow: visible;
}
.origami-wing {
	transform-origin: 100px 88px;
	animation: origami-flap 600ms ease-in-out infinite alternate;
	@include motion.reduced-motion;
}
.origami-wing.far {
	animation-delay: -100ms;
}
.is-reduced .origami-flight,
.is-reduced .origami-wing {
	animation: none;
}
@keyframes origami-fold {
	0%,
	100% {
		transform: none;
		opacity: 1;
	}
	12% {
		transform: scale(0.12) rotate(-18deg) skewY(-12deg);
		opacity: 0;
	}
	82% {
		transform: scale(0.12) rotate(-18deg);
		opacity: 0;
	}
}
/* The flight returns to its origin. The note never leaves the document. */
@keyframes origami-flight {
	0%,
	7% {
		opacity: 0;
		transform: translate(0, 0) scale(0.3) rotate(-18deg);
	}
	17% {
		opacity: 1;
		transform: translate(0, calc(-1 * var(--spacing--xl))) scale(1) rotate(-12deg);
	}
	42% {
		opacity: 1;
		transform: translate(var(--spacing--4xl), calc(-1 * var(--spacing--4xl))) rotate(-8deg);
	}
	62% {
		opacity: 1;
		transform: translate(calc(-1 * var(--spacing--4xl)), calc(-1 * var(--spacing--4xl)))
			rotate(12deg);
	}
	80% {
		opacity: 1;
		transform: translate(0, calc(-1 * var(--spacing--xl))) scale(0.9) rotate(12deg);
	}
	92%,
	100% {
		opacity: 0;
		transform: translate(0, 0) scale(0.3);
	}
}
@keyframes origami-flap {
	from {
		transform: scaleY(1);
	}
	to {
		transform: scaleY(0.42);
	}
}
</style>

<style lang="scss">
.canvas-origami-deletion {
	position: absolute;
	pointer-events: none;
}
.is-folding.is-deleting:not(.is-reduced) .origami-paper {
	animation: origami-delete-fold var(--origami-duration) ease-in both;
}
.is-deleting .origami-flight {
	animation-name: origami-delete-flight;
}
.is-deleting.is-reduced .origami-paper {
	visibility: hidden;
	animation: none;
}
@keyframes origami-delete-fold {
	0% {
		transform: none;
		opacity: 1;
	}
	25%,
	100% {
		transform: scale(0.12) rotate(-18deg) skewY(-12deg);
		opacity: 0;
	}
}
@keyframes origami-delete-flight {
	0%,
	12% {
		opacity: 0;
		transform: scale(0.3) rotate(-18deg);
	}
	28% {
		opacity: 1;
		transform: translate(0, calc(-1 * var(--spacing--xl))) rotate(-12deg);
	}
	75% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate(calc(4 * var(--spacing--4xl)), calc(-4 * var(--spacing--4xl)))
			rotate(-20deg) scale(0.5);
	}
}
@media (prefers-reduced-motion: reduce) {
	.is-deleting .origami-paper {
		visibility: hidden;
		animation: none;
	}
	.is-deleting .origami-flight {
		animation: none;
	}
}
</style>
