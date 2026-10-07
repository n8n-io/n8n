<script setup lang="ts">
import { N8nSpinner, N8nText, N8nVisuallyHidden } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useIntervalFn } from '@vueuse/core';
import { ref } from 'vue';

import { TIME } from '@/app/constants/durations';

const i18n = useI18n();

const lobes = [
	{ x: 50, width: 24, height: 95 },
	{ x: 78, width: 17, height: 82 },
	{ x: 24, width: 19, height: 76 },
	{ x: 12, width: 16, height: 88 },
	{ x: 86, width: 17, height: 76 },
	{ x: 65, width: 21, height: 63 },
	{ x: 35, width: 18, height: 57 },
	{ x: 96, width: 15, height: 76 },
	{ x: 4, width: 13, height: 82 },
];
const waves = lobes.map((lobe, index) => ({
	'--wave-position': `${lobe.x}% 100%`,
	'--wave-width': `${lobe.width}%`,
	'--wave-depth': `${lobe.height / 100}`,
	'--wave-color': `var(--n8n-wave--color-${(index % 9) + 1})`,
	'--wave-delay': `calc(var(--n8n-wave--duration) * ${-index / 7})`,
	'--wave-duration': `calc(var(--n8n-wave--duration) * ${1 + (index % 3) * 0.17})`,
}));

const whimsicalLabels: BaseTextKey[] = [
	'instanceAi.agentPreview.building.imagining',
	'instanceAi.agentPreview.building.tinkering',
	'instanceAi.agentPreview.building.pondering',
	'instanceAi.agentPreview.building.brewing',
	'instanceAi.agentPreview.building.hatching',
	'instanceAi.agentPreview.building.concocting',
	'instanceAi.agentPreview.building.sparkling',
	'instanceAi.agentPreview.building.noodling',
	'instanceAi.agentPreview.building.percolating',
	'instanceAi.agentPreview.building.doodling',
];

function generateWhimsicalLabel(): BaseTextKey {
	return (
		whimsicalLabels[Math.floor(Math.random() * whimsicalLabels.length)] ??
		'instanceAi.agentPreview.building'
	);
}

const whimsicalLabel = ref(generateWhimsicalLabel());

useIntervalFn(() => {
	whimsicalLabel.value = generateWhimsicalLabel();
}, 5 * TIME.SECOND);
</script>

<template>
	<div :class="$style.wave">
		<div
			:class="$style.buildingIndicator"
			role="status"
			aria-live="polite"
			:aria-label="i18n.baseText('instanceAi.agentPreview.building')"
			data-test-id="instance-ai-agent-building-indicator"
		>
			<N8nSpinner type="grid" size="large" aria-hidden="true" />
			<N8nVisuallyHidden>
				{{ i18n.baseText('instanceAi.agentPreview.building') }}
			</N8nVisuallyHidden>
			<div :class="$style.buildingLabel" aria-hidden="true">
				<Transition
					:enter-active-class="$style.labelEnterActive"
					:leave-active-class="$style.labelLeaveActive"
					:enter-from-class="$style.labelEnterFrom"
					:leave-to-class="$style.labelLeaveTo"
				>
					<N8nText :key="whimsicalLabel" step="md" bold :class="$style.labelWord">
						{{ i18n.baseText(whimsicalLabel) }}
					</N8nText>
				</Transition>
			</div>
		</div>
		<div
			v-for="layer in ['inner', 'ring', 'bloom', 'highlight']"
			:key="layer"
			:class="[$style.waveLayer, $style[layer]]"
			aria-hidden="true"
		>
			<div v-for="(wave, index) in waves" :key="index" :class="$style.waveLight" :style="wave" />
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.wave {
	--n8n-wave--duration: calc(var(--duration--slowest) * 2);
	--n8n-wave--size: var(--spacing--xl);
	--n8n-wave--border: var(--border-width, 1px);
	--n8n-wave--glow: var(--spacing--lg);
	--n8n-wave--color-1: var(--color--red-500);
	--n8n-wave--color-2: var(--color--blue-400);
	--n8n-wave--color-3: var(--color--green-500);
	--n8n-wave--color-4: var(--color--purple-500);
	--n8n-wave--color-5: var(--color--gold-400);
	--n8n-wave--color-6: var(--color--purple-600);
	--n8n-wave--color-7: var(--color--blue-500);
	--n8n-wave--color-8: var(--color--pink-500);
	--n8n-wave--color-9: var(--color--mint-500);

	display: grid;
	place-items: center;
	position: absolute;
	bottom: 0;
	inset-inline: 0;
	z-index: 10;
	isolation: isolate;
	border-bottom: 1px solid var(--n8n-wave--border);
	pointer-events: none;
	@include motion.fade-in-up;
	animation-fill-mode: backwards;
}

.buildingIndicator {
	position: relative;
	z-index: 5;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-inline: var(--spacing--sm);
	height: var(--height--xl);
	border-radius: var(--radius--full);
	background: var(--color--neutral-black);
	color: var(--color--neutral-white);
	box-shadow:
		inset 0 0 0 1px light-dark(var(--color--white-alpha-200), var(--color--white-alpha-100)),
		0 0 0 1px var(--color--neutral-black),
		var(--shadow--xl);
	pointer-events: none;
	white-space: nowrap;
	width: fit-content;
	will-change: width;
	transition:
		width,
		transform var(--duration--base);

	--animation--fade-in-up--end: calc(var(--spacing--lg) * -1);
	transform: translateY(var(--animation--fade-in-up--end));
	@include motion.fade-in-up;
	animation-delay: 1s;
	animation-fill-mode: backwards;
}

.buildingLabel {
	display: grid;
	padding-right: var(--spacing--5xs);
}

.labelWord {
	grid-area: 1 / 1;
}

.labelEnterActive,
.labelLeaveActive {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out),
		filter var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.labelEnterFrom,
.labelLeaveTo {
	opacity: 0;
	filter: blur(var(--spacing--3xs));
}

.labelEnterFrom {
	transform: translateY(var(--spacing--2xs));
}

.labelLeaveTo {
	transform: translateY(calc(-1 * var(--spacing--2xs)));
}

.waveLayer {
	position: absolute;
	inset: 0;
	overflow: hidden;
	border-radius: inherit;
	pointer-events: none;
}

.ring {
	z-index: 3;
	padding: var(--n8n-wave--border);
	mask:
		linear-gradient(#fff 0 0) content-box,
		linear-gradient(#fff 0 0);
	mask-composite: exclude;
	-webkit-mask:
		linear-gradient(#fff 0 0) content-box,
		linear-gradient(#fff 0 0);
	-webkit-mask-composite: xor;
}

.inner {
	opacity: 0.5;
	mix-blend-mode: multiply;

	.waveLight {
		filter: blur(var(--spacing--5xs));
	}
}

.bloom {
	z-index: 1;
	filter: blur(var(--n8n-wave--glow));
	opacity: 0.5;
	mix-blend-mode: multiply;
}

.highlight {
	z-index: 4;
	filter: blur(var(--spacing--2xs));
	opacity: 0.95;
	mix-blend-mode: screen;

	.waveLight {
		background: radial-gradient(
			ellipse calc(var(--wave-width) * 0.4) calc(var(--n8n-wave--size) * var(--wave-depth) * 1.25)
				at var(--wave-position),
			#fff 0%,
			light-dark(rgb(255 255 255 / 90%), rgb(255 255 255 / 50%)) 12%,
			rgb(255 255 255 / 35%) 42%,
			transparent 100%
		);
		mix-blend-mode: screen;
	}
}

.waveLight {
	position: absolute;
	inset: 0;
	background: radial-gradient(
		ellipse var(--wave-width) calc(var(--n8n-wave--size) * var(--wave-depth)) at
			var(--wave-position),
		var(--wave-color) 0%,
		color-mix(in srgb, var(--wave-color) 45%, transparent) 35%,
		transparent 100%
	);
	transform-origin: var(--wave-position);
	animation: wave-breathe var(--wave-duration) ease-in-out infinite;
	animation-delay: var(--wave-delay);
	mix-blend-mode: multiply;
}

@keyframes wave-breathe {
	0%,
	100% {
		transform: scaleY(0.25);
		opacity: 0.5;
	}
	25% {
		transform: scaleY(0.85);
		opacity: 0.9;
	}
	50% {
		transform: scaleY(0.45);
		opacity: 0.65;
	}
	75% {
		transform: scaleY(1);
		opacity: 1;
	}
}

@media (prefers-reduced-motion: reduce) {
	.waveLight {
		animation: none;
	}
}
</style>
