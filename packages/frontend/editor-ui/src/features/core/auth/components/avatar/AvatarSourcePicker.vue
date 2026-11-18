<script setup lang="ts">
import { N8nAvatar, N8nIcon, N8nText, type UserAvatarVariant } from '@n8n/design-system';

import { vShortestTurn } from './avatarMorph';

/**
 * The row of orbs at the top of the avatar dialog: one per picture the user
 * can be shown with. Each orb is a live preview of its option, and the chosen
 * one grows to full size with the selection ring, so the row is at once the
 * picker and the preview of what "Save" will produce.
 */

export type AvatarSource = 'sso' | 'generated' | 'upload';

export type AvatarOrbFace =
	| { kind: 'image'; url: string; backdrop?: string }
	| { kind: 'crop'; url: string; style: Record<string, string>; backdrop?: string }
	| {
			kind: 'generated';
			variant: UserAvatarVariant;
			seed: string;
			colors: string[];
			/** Whose initials sit on the artwork. */
			firstName?: string | null;
			lastName?: string | null;
			/** Ease the artwork into its next arrangement instead of cutting to it. */
			morphing?: boolean;
	  }
	/** An upload slot with nothing in it yet. */
	| { kind: 'empty' };

export interface AvatarOrbOption {
	value: AvatarSource;
	label: string;
	face: AvatarOrbFace;
}

const props = defineProps<{
	modelValue: AvatarSource;
	options: AvatarOrbOption[];
	label: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: AvatarSource];
}>();

const select = (value: AvatarSource) => {
	if (value !== props.modelValue) emit('update:modelValue', value);
};

const ARROW_STEPS: Record<string, number> = {
	ArrowRight: 1,
	ArrowDown: 1,
	ArrowLeft: -1,
	ArrowUp: -1,
};

/**
 * A radio group is one tab stop: the arrow keys move to the neighbouring orb
 * and choose it, wrapping at the ends, and Home and End jump to the first and
 * last. Handled on the orb itself, so it works inside a dialog that keeps key
 * presses from reaching the window.
 */
const onKeydown = (event: KeyboardEvent, index: number) => {
	const count = props.options.length;
	let next: number;
	if (event.key in ARROW_STEPS) next = (index + ARROW_STEPS[event.key] + count) % count;
	else if (event.key === 'Home') next = 0;
	else if (event.key === 'End') next = count - 1;
	else return;

	event.preventDefault();
	select(props.options[next].value);
	const orbs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>(
		'[role="radio"]',
	);
	orbs?.[next]?.focus();
};
</script>

<template>
	<div
		role="radiogroup"
		aria-orientation="horizontal"
		:aria-label="label"
		:aria-disabled="disabled || undefined"
		:class="$style.orbs"
		data-test-id="avatar-source-picker"
	>
		<button
			v-for="(option, index) in options"
			:key="option.value"
			type="button"
			role="radio"
			:aria-checked="option.value === modelValue"
			:aria-label="option.label"
			:tabindex="option.value === modelValue ? 0 : -1"
			:disabled="disabled"
			:data-state="option.value === modelValue ? 'checked' : 'unchecked'"
			:class="$style.orb"
			:data-test-id="`avatar-source-${option.value}`"
			:data-face-kind="option.face.kind"
			@click="select(option.value)"
			@keydown="onKeydown($event, index)"
		>
			<span :class="$style.face" aria-hidden="true">
				<span
					v-if="option.face.kind === 'crop'"
					:class="$style.faceCrop"
					:style="{ backgroundColor: option.face.backdrop }"
				>
					<img :src="option.face.url" alt="" :style="option.face.style" draggable="false" />
				</span>
				<img
					v-else-if="option.face.kind === 'image'"
					:src="option.face.url"
					alt=""
					:class="$style.faceImage"
					:style="{ backgroundColor: option.face.backdrop }"
					draggable="false"
				/>
				<N8nAvatar
					v-else-if="option.face.kind === 'generated'"
					v-shortest-turn
					size="xlarge"
					:variant="option.face.variant"
					:seed="option.face.seed"
					:colors="option.face.colors"
					:first-name="option.face.firstName"
					:last-name="option.face.lastName"
					:class="{ [$style.faceMorphing]: option.face.morphing }"
				/>
				<span v-else :class="$style.faceEmpty">
					<N8nIcon icon="image" :size="28" />
				</span>
			</span>
			<N8nText size="medium" bold :class="$style.label">{{ option.label }}</N8nText>
		</button>
	</div>
</template>

<style lang="scss" module>
@use 'sass:math';
@use '@n8n/design-system/css/mixins/focus';

$face: 96px;

.orbs {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.orb {
	--orb-scale: 0.6;

	appearance: none;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	width: $face + 24px;
	padding: var(--spacing--4xs) 0;
	border: none;
	border-radius: var(--radius--md);
	background: transparent;
	cursor: pointer;

	/* A tap leaves hover stuck on touch screens, so only a real pointer swells an orb. */
	@media (hover: hover) and (pointer: fine) {
		&:hover:not(:disabled):not([data-state='checked']) {
			--orb-scale: 0.68;
		}
	}

	&[data-state='checked'] {
		--orb-scale: 1;

		cursor: default;
	}

	&:disabled {
		cursor: not-allowed;
	}

	@include focus.focus-visible-ring-offset;
}

.face {
	display: inline-flex;
	width: $face;
	height: $face;
	border-radius: 50%;
	overflow: hidden;
	transform: scale(var(--orb-scale));
	/* The dialog background can be close to the lighter backdrops; a hairline keeps the circle visible. */
	box-shadow: 0 0 0 1px var(--border-color--subtle);
	transition:
		transform var(--duration--base) var(--easing--ease-out-quint),
		box-shadow var(--duration--snappy) var(--easing--ease-out);

	.orb[data-state='checked'] & {
		box-shadow:
			0 0 0 3px var(--avatar-dialog--surface, var(--background--surface)),
			0 0 0 5px var(--color--primary);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.faceCrop {
	position: relative;
	display: block;
	width: 100%;
	height: 100%;
	overflow: hidden;

	/* Sized and placed by `cropPreviewStyle`; the global image caps must not interfere. */
	img {
		position: absolute;
		display: block;
		max-width: none;
		max-height: none;
	}
}

.faceImage {
	width: 100%;
	height: 100%;
	object-fit: cover;
	user-select: none;
}

/*
 * The generated artwork is an SVG whose shapes are placed and coloured by
 * attributes. While morphing, those attribute changes are eased, so a shuffle
 * glides the blobs and colours into their new arrangement instead of cutting
 * to it; dragging the colour pad leaves this off so the orb tracks the pointer.
 * The beat is set by the dialog, which the shuffle button's icon shares.
 */
.faceMorphing :global(svg) :is(rect, path) {
	transition:
		fill var(--avatar-morph--duration, var(--duration--base))
			var(--avatar-morph--easing, var(--easing--ease-in-out)),
		transform var(--avatar-morph--duration, var(--duration--base))
			var(--avatar-morph--easing, var(--easing--ease-in-out));

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

/*
 * The upload slot with nothing in it: a quiet disc with a picture icon. It
 * gets the same hairline as every other face from `.face`, and the selection
 * ring when chosen; only the icon darkens on hover.
 */
.faceEmpty {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	border-radius: 50%;
	color: var(--text-color--subtle);
	background-color: var(--background--subtle);
	transition: color var(--duration--snappy) var(--easing--ease-out);

	.orb:hover:not(:disabled) &,
	.orb[data-state='checked'] & {
		color: var(--color--primary);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

/*
 * The face keeps its full-size box while a small orb is drawn inside it, so
 * the label is pulled up by the slack to sit just under the orb at any size,
 * on the same curve as the orb. Size and weight stay put and only the color
 * marks the chosen label, so switching orbs never reflows the text.
 */
.label {
	max-width: 100%;
	padding-inline: var(--spacing--4xs);
	color: var(--text-color--subtle);
	/* A company's own provider is shown by host, which can run long. */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transform: translateY(calc((var(--orb-scale) - 1) * #{math.div($face, 2)}));
	transition:
		transform var(--duration--base) var(--easing--ease-out-quint),
		color var(--duration--snappy) var(--easing--ease-out);

	.orb[data-state='checked'] & {
		color: var(--text-color);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}
</style>
