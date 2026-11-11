<script lang="ts" setup>
import { usePreferredReducedMotion, useRafFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { IconSize } from '../../types';
import N8nIcon from '../N8nIcon';

const { t } = useI18n();

const TYPE = ['dots', 'ring', 'grid', 'brand'] as const;

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
	/** Set the icon size. Brand uses this height with a 336:160 aspect ratio. */
	size?: IconSize;
	/** Select the loading indicator shape. */
	type?: (typeof TYPE)[number];
}

defineOptions({ name: 'N8nSpinner' });
const props = withDefaults(defineProps<SpinnerProps>(), {
	type: 'grid',
	size: 'medium',
});

const reducedMotion = usePreferredReducedMotion();
const progress = ref(0.375);
const stems = computed(() =>
	Array.from({ length: 6 }, (_, index) => {
		const x = -56 + index * 112 + progress.value * 112;
		const edge = Math.max(0, Math.min(1, (x + 14) / 112, (434 - x) / 112));
		return { x, scale: edge * edge * (3 - 2 * edge) };
	}),
);
let elapsed = 0;

/** Keep position and scale on the same clock to match the prototype. */
function advanceBrand({ delta }: { delta: number }) {
	elapsed = (elapsed + Math.min(delta, 64)) % 900;
	const phase = Math.max(0, (elapsed - 500) / 400);
	progress.value = (0.375 + (1 - Math.cos(Math.PI * phase)) / 2) % 1;
}

const { pause, resume } = useRafFn(advanceBrand, { immediate: false });
watch([() => props.type, reducedMotion], updateBrandMotion, { immediate: true });

function updateBrandMotion() {
	pause();
	elapsed = 0;
	progress.value = 0.375;
	if (props.type === 'brand' && reducedMotion.value !== 'reduce') resume();
}
</script>

<template>
	<span
		class="n8n-spinner"
		:role="type === 'grid' || type === 'brand' ? 'status' : undefined"
		:aria-label="type === 'grid' || type === 'brand' ? t('spinner.loading') : undefined"
	>
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
		<svg
			v-else-if="type === 'brand'"
			data-spinner="brand"
			aria-hidden="true"
			focusable="false"
			viewBox="42 0 336 160"
			:width="(gridSizes[size] * 336) / 160"
			:height="gridSizes[size]"
			:style="{ width: `${(gridSizes[size] * 336) / 160}px`, height: `${gridSizes[size]}px` }"
		>
			<rect x="0" y="71" width="420" height="18" />
			<g v-for="(stem, index) in stems" :key="index" :transform="`translate(${stem.x} 80)`">
				<g :transform="`scale(1 ${stem.scale})`">
					<path
						d="M-40-9C-17-9-9-17-9-40V-68H9V-40C9-17 17-9 40-9V9C17 9 9 17 9 40V68H-9V40C-9 17-17 9-40 9Z"
					/>
				</g>
			</g>
		</svg>
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

/** The SVG viewport clips the mark without shared document IDs. */
.n8n-spinner > svg[data-spinner='brand'] {
	display: inline-block;
	vertical-align: middle;
	flex-shrink: 0;
	overflow: hidden;
	fill: var(--background--brand);
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

	@include motion.reduced-motion;
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
</style>
