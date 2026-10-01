<script lang="ts" setup>
import type { IconSize } from '../../types';
import N8nIcon from '../N8nIcon';

const TYPE = ['dots', 'ring', 'grid', 'blocks'] as const;

const gridPositions = ['0 0', '4 0', '0 4', '4 4'];

/** Match N8nIcon sizes, including sizes without a design token. */
const gridSizes: Record<IconSize, number> = {
	xsmall: 10,
	small: 12,
	medium: 14,
	large: 16,
	xlarge: 20,
	xxlarge: 40,
};

interface SpinnerProps {
	/** Set the icon size for dots and grid spinners. */
	size?: IconSize;
	/** Select the loading indicator shape. */
	type?: (typeof TYPE)[number];
}

defineOptions({ name: 'N8nSpinner' });
withDefaults(defineProps<SpinnerProps>(), {
	type: 'blocks',
	size: 'medium',
});
</script>

<template>
	<span class="n8n-spinner">
		<div v-if="type === 'ring'" class="lds-ring">
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
		<svg
			v-else-if="type === 'grid'"
			aria-hidden="true"
			focusable="false"
			fill="currentColor"
			role="presentation"
			viewBox="0 0 7.5 7.5"
			:width="gridSizes[size]"
			:height="gridSizes[size]"
			:style="{ width: `${gridSizes[size]}px`, height: `${gridSizes[size]}px` }"
			data-spinner="grid"
		>
			<path
				v-for="(position, index) in gridPositions"
				:key="position"
				d="M0 0h1.5v1.5H0zM2 0h1.5v1.5H2zM0 2h1.5v1.5H0zM2 2h1.5v1.5H2z"
				:transform="`translate(${position})`"
				:style="{ '--spinner-step': index }"
			/>
		</svg>
		<div
			v-else-if="type === 'blocks'"
			:class="['blocks-spinner', `blocks-spinner--${size}`]"
			aria-label="Loading"
			role="status"
		>
			<div v-for="block in 9" :key="block" class="blocks-spinner__block"></div>
		</div>
		<N8nIcon v-else icon="spinner" :size="size" spin />
	</span>
</template>

<style lang="scss">
@use '../../css/mixins/motion';

.n8n-spinner:has(> svg[data-spinner='grid']) {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	line-height: 0;
}

.n8n-spinner > svg[data-spinner='grid'] {
	display: block;
	flex-shrink: 0;
	aspect-ratio: 1;
}

.n8n-spinner > svg[data-spinner='grid'] > path {
	opacity: 0.5;
	animation: n8n-spinner-grid calc(var(--duration--slowest) * 2) linear infinite;
	animation-delay: calc(var(--spinner-step) * var(--duration--slowest) / 6);

	@include motion.reduced-motion;
}

@keyframes n8n-spinner-grid {
	0%,
	25%,
	100% {
		opacity: 0.5;
	}
	12.5% {
		opacity: 1;
	}
}

.lds-ring {
	display: inline-block;
	position: relative;
	width: 48px;
	height: 48px;
}
.lds-ring div {
	box-sizing: border-box;
	display: block;
	position: absolute;
	width: 48px;
	height: 48px;
	border: 4px solid var(--color--foreground--tint-2);
	border-radius: 50%;
	animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
	border-color: var(--color--primary) transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
	animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
	animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
	animation-delay: -0.15s;
}
@keyframes lds-ring {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.blocks-spinner {
	--n8n-spinner-block--size: 14px;

	display: grid;
	grid-template-columns: repeat(3, calc(var(--n8n-spinner-block--size) / 3));
	gap: 1px;
	width: var(--n8n-spinner-block--size);
	height: var(--n8n-spinner-block--size);
}

.blocks-spinner--xsmall {
	--n8n-spinner-block--size: 10px;
}

.blocks-spinner--small {
	--n8n-spinner-block--size: 12px;
}

.blocks-spinner--large {
	--n8n-spinner-block--size: 16px;
}

.blocks-spinner--xlarge {
	--n8n-spinner-block--size: 20px;
}

.blocks-spinner--xxlarge {
	--n8n-spinner-block--size: 40px;
}

.blocks-spinner__block {
	--ld-duration: 900ms;
	--ld-step: 0;

	width: calc(var(--n8n-spinner-block--size) / 3);
	height: calc(var(--n8n-spinner-block--size) / 3);
	border-radius: 1px;
	background: var(--color--primary);
	animation: blocks-spinner-opacity var(--ld-duration) var(--easing--spring) infinite;
	animation-delay: calc(var(--ld-duration) / -9 * var(--ld-step));
}

.blocks-spinner__block:nth-child(2) {
	--ld-step: 7;
}

.blocks-spinner__block:nth-child(3) {
	--ld-step: 6;
}

.blocks-spinner__block:nth-child(4) {
	--ld-step: 1;
}

.blocks-spinner__block:nth-child(5) {
	--ld-step: 8;
}

.blocks-spinner__block:nth-child(6) {
	--ld-step: 5;
}

.blocks-spinner__block:nth-child(7) {
	--ld-step: 2;
}

.blocks-spinner__block:nth-child(8) {
	--ld-step: 3;
}

.blocks-spinner__block:nth-child(9) {
	--ld-step: 4;
}

@keyframes blocks-spinner-opacity {
	0%,
	100% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
}
</style>
