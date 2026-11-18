<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * A field of dots to drag a color handle around in. Left to right walks the
 * color wheel; top to bottom goes from light to deep. A faint wash under the
 * dots shows what each spot stands for, and the handle itself takes on the
 * picked color. One control, two values, no numbers to read.
 */

const HUE_STEP = 8;
const TONE_STEP = 5;

/**
 * How far the handle's center stays from the field's edge: its radius plus
 * room for the focus ring, so neither is cut off at the ends of the range.
 */
const HANDLE_INSET = 18;

const props = defineProps<{
	hue: number;
	tone: number;
	/** The color the handle shows; what the current spot stands for. */
	swatch: string;
	label: string;
	/** Spoken value, e.g. "Hue 210°, tone 40%". */
	valueText: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	change: [value: { hue: number; tone: number }];
}>();

const field = ref<HTMLElement | null>(null);
const dragging = ref(false);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const fieldStyle = { '--color-field--inset': `${HANDLE_INSET}px` };

const handleStyle = computed(() => ({
	'--color-field--x': String(clamp(props.hue, 0, 360) / 360),
	'--color-field--y': String(1 - clamp(props.tone, 0, 100) / 100),
	backgroundColor: props.swatch,
}));

const pick = (clientX: number, clientY: number) => {
	const rect = field.value?.getBoundingClientRect();
	if (!rect) return;
	const width = rect.width - 2 * HANDLE_INSET;
	const height = rect.height - 2 * HANDLE_INSET;
	if (width <= 0 || height <= 0) return;
	const x = clamp((clientX - rect.left - HANDLE_INSET) / width, 0, 1);
	const y = clamp((clientY - rect.top - HANDLE_INSET) / height, 0, 1);
	emit('change', { hue: Math.round(x * 360), tone: Math.round((1 - y) * 100) });
};

const onPointerDown = (event: PointerEvent) => {
	if (props.disabled || event.button !== 0) return;
	event.preventDefault();
	field.value?.setPointerCapture(event.pointerId);
	dragging.value = true;
	pick(event.clientX, event.clientY);
};

const onPointerMove = (event: PointerEvent) => {
	if (!dragging.value) return;
	pick(event.clientX, event.clientY);
};

const onPointerUp = (event: PointerEvent) => {
	if (!dragging.value) return;
	dragging.value = false;
	field.value?.releasePointerCapture(event.pointerId);
};

const onKeydown = (event: KeyboardEvent) => {
	if (props.disabled) return;
	const big = event.shiftKey ? 3 : 1;
	const moves: Record<string, { hue?: number; tone?: number }> = {
		ArrowLeft: { hue: props.hue - HUE_STEP * big },
		ArrowRight: { hue: props.hue + HUE_STEP * big },
		ArrowUp: { tone: props.tone + TONE_STEP * big },
		ArrowDown: { tone: props.tone - TONE_STEP * big },
		Home: { hue: 0 },
		End: { hue: 360 },
	};
	const move = moves[event.key];
	if (!move) return;
	event.preventDefault();
	emit('change', {
		hue: clamp(move.hue ?? props.hue, 0, 360),
		tone: clamp(move.tone ?? props.tone, 0, 100),
	});
};
</script>

<template>
	<div
		ref="field"
		:class="[$style.field, { [$style.dragging]: dragging, [$style.disabled]: disabled }]"
		:style="fieldStyle"
		data-test-id="avatar-color-field"
		@pointerdown="onPointerDown"
		@pointermove="onPointerMove"
		@pointerup="onPointerUp"
		@pointercancel="onPointerUp"
	>
		<div
			:class="$style.handle"
			:style="handleStyle"
			role="slider"
			:tabindex="disabled ? -1 : 0"
			:aria-label="label"
			:aria-valuemin="0"
			:aria-valuemax="360"
			:aria-valuenow="Math.round(hue)"
			:aria-valuetext="valueText"
			:aria-disabled="disabled || undefined"
			data-test-id="avatar-color-handle"
			@keydown="onKeydown"
		></div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

/* The brand's dot grid, at the product's own 16px increment. */
$grid: 16px;

.field {
	position: relative;
	height: 132px;
	border-radius: var(--radius--lg);
	background-color: var(--background--subtle);
	overflow: hidden;
	cursor: crosshair;
	touch-action: none;
	user-select: none;
	isolation: isolate;
	/* Lets the handle place itself in the field's own units (cqw, cqh). */
	container-type: size;

	/*
	 * A faint walk around the wheel, so a spot on the field means something
	 * before it is touched. Kept quiet on purpose: the dot grid is the surface,
	 * the color is a hint, and the handle carries the actual pick. Each stop
	 * sits where the handle picks that hue, and neighbors blend in OKLCH so
	 * they meet in a clear color instead of a gray one.
	 */
	&::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg in oklch,
			hsl(0 86% 66%) var(--color-field--inset),
			hsl(30 86% 64%),
			hsl(60 86% 58%),
			hsl(90 70% 54%),
			hsl(120 62% 54%),
			hsl(150 62% 52%),
			hsl(180 66% 50%),
			hsl(210 80% 60%),
			hsl(240 80% 68%),
			hsl(270 76% 68%),
			hsl(300 70% 64%),
			hsl(330 80% 66%),
			hsl(360 86% 66%) calc(100% - var(--color-field--inset))
		);
		opacity: 0.34;
		/*
		 * The hint fades where the surface already says the tone: toward the
		 * pale end on a light surface, toward the deep end on a dark one.
		 * Washing it out with white or black instead turns it gray and brown.
		 */
		mask-image: linear-gradient(
			180deg,
			light-dark(rgba(0, 0, 0, 0.45), #000) var(--color-field--inset),
			light-dark(#000, rgba(0, 0, 0, 0.2)) calc(100% - var(--color-field--inset))
		);
	}

	/* Light to deep, top to bottom, with the dot grid laid over everything. */
	&::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(
				circle,
				light-dark(rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.3)) 1px,
				transparent 1.4px
			),
			linear-gradient(
				180deg,
				light-dark(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.04)) var(--color-field--inset),
				transparent 50%,
				light-dark(rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.18)) calc(100% - var(--color-field--inset))
			);
		background-size:
			$grid $grid,
			100% 100%;
		background-position:
			calc($grid / 2) calc($grid / 2),
			0 0;
	}
}

.dragging {
	cursor: grabbing;
}

.disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

.handle {
	position: absolute;
	z-index: 1;
	top: 0;
	left: 0;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	/* The whole range fits inside the field, inset from each edge. */
	translate: calc(
			var(--color-field--inset) + (100cqw - 2 * var(--color-field--inset)) * var(--color-field--x) -
				50%
		)
		calc(
			var(--color-field--inset) + (100cqh - 2 * var(--color-field--inset)) * var(--color-field--y) -
				50%
		);
	border: 3px solid var(--color--neutral-white);
	box-shadow:
		0 0 0 1px var(--color--black-alpha-100),
		0 2px 6px var(--color--black-alpha-300);
	cursor: grab;
	transition:
		translate var(--duration--snappy) var(--easing--ease-out-quint),
		background-color var(--duration--snappy) var(--easing--ease-out),
		scale var(--duration--snappy) var(--easing--ease-out-quint);

	.dragging & {
		cursor: grabbing;
		scale: 1.12;
		transition:
			background-color 60ms linear,
			scale var(--duration--snappy) var(--easing--ease-out-quint);
	}

	@include focus.focus-visible-ring-offset;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}
</style>
