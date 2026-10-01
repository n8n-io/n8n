<script setup lang="ts">
/**
 * The count slider above the suggested checks: the count as a label, then a
 * thin brand track with a knob, all in one row so the CTA below never moves.
 * Arrow keys step by one; dragging sets the count.
 */
import { computed } from 'vue';

const props = defineProps<{
	max: number;
	label: string;
	accessibleLabel: string;
}>();

const count = defineModel<number>({ required: true });

const percent = computed(() => (props.max > 0 ? (count.value / props.max) * 100 : 0));

const clamp = (value: number) => Math.min(props.max, Math.max(1, value));

const setFromPointer = (event: PointerEvent) => {
	const el = event.currentTarget;
	if (!(el instanceof HTMLElement)) return;
	const rect = el.getBoundingClientRect();
	count.value = clamp(Math.ceil(((event.clientX - rect.left) / rect.width) * props.max));
};

const onPointerDown = (event: PointerEvent) => {
	const el = event.currentTarget;
	if (!(el instanceof HTMLElement)) return;
	el.setPointerCapture(event.pointerId);
	setFromPointer(event);
};

const onPointerMove = (event: PointerEvent) => {
	const el = event.currentTarget;
	if (el instanceof HTMLElement && el.hasPointerCapture(event.pointerId)) setFromPointer(event);
};

const onKey = (event: KeyboardEvent) => {
	const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
	const step = steps[event.key];
	if (!step) return;
	event.preventDefault();
	count.value = clamp(count.value + step);
};
</script>

<template>
	<div :class="$style.row">
		<span :class="$style.label">{{ label }}</span>
		<div
			:class="$style.track"
			role="slider"
			tabindex="0"
			:aria-label="accessibleLabel"
			aria-valuemin="1"
			:aria-valuemax="max"
			:aria-valuenow="count"
			:aria-valuetext="label"
			data-testid="agent-check-slider"
			@keydown="onKey"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
		>
			<div :class="$style.fill" :style="{ width: `${percent}%` }">
				<span :class="$style.knob" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-height: var(--height--xs);
}

.label {
	flex-shrink: 0;
	min-width: 96px;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	font-variant-numeric: tabular-nums;
}

.track {
	position: relative;
	flex: 1;
	height: 6px;
	margin-right: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--hover);
	cursor: ew-resize;
	touch-action: none;
	user-select: none;

	// A taller hit area than the 6px track.
	&::before {
		content: '';
		position: absolute;
		inset: -9px -8px;
	}

	&:focus-visible .knob {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color--primary) 25%, transparent);
	}
}

.fill {
	position: absolute;
	inset: 0 auto 0 0;
	border-radius: inherit;
	background: var(--color--primary);
	transition: width 0.18s ease;
}

.knob {
	position: absolute;
	top: 50%;
	right: -8px;
	width: 16px;
	height: 16px;
	border: 1.5px solid var(--color--primary);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	box-shadow: var(--shadow--xs);
	transform: translateY(-50%);
}

@media (prefers-reduced-motion: reduce) {
	.fill {
		transition: none;
	}
}
</style>
