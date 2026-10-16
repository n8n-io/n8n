<script setup lang="ts">
/**
 * The working bands of the Assistant's building indicator, cut to card size: its
 * first five lobes along the bottom edge of a box that runs an AI step. The
 * parent positions it (absolute, bottom edge) and clips it with its own corners.
 */
const lobes = [
	{ x: 50, width: 24, height: 95 },
	{ x: 78, width: 17, height: 82 },
	{ x: 24, width: 19, height: 76 },
	{ x: 12, width: 16, height: 88 },
	{ x: 86, width: 17, height: 76 },
];
const waves = lobes.map((lobe, index) => ({
	'--wave-position': `${lobe.x}% 100%`,
	'--wave-width': `${lobe.width}%`,
	'--wave-depth': `${lobe.height / 100}`,
	'--wave-color': `var(--ai-bands--color-${index + 1})`,
	'--wave-delay': `calc(var(--ai-bands--duration) * ${-index / 7})`,
	'--wave-duration': `calc(var(--ai-bands--duration) * ${1 + (index % 3) * 0.17})`,
}));
</script>

<template>
	<div :class="$style.bands" aria-hidden="true" data-test-id="agent-ai-working-bands">
		<div
			v-for="layer in ['inner', 'bloom', 'highlight']"
			:key="layer"
			:class="[$style.layer, $style[layer]]"
		>
			<div v-for="(wave, index) in waves" :key="index" :class="$style.light" :style="wave" />
		</div>
	</div>
</template>

<style lang="scss" module>
.bands {
	--ai-bands--duration: calc(var(--duration--slowest) * 2);
	--ai-bands--size: 36px;
	--ai-bands--color-1: var(--color--red-500);
	--ai-bands--color-2: var(--color--blue-400);
	--ai-bands--color-3: var(--color--green-500);
	--ai-bands--color-4: var(--color--purple-500);
	--ai-bands--color-5: var(--color--gold-400);

	position: absolute;
	inset-inline: 0;
	bottom: 0;
	height: 56px;
	isolation: isolate;
	pointer-events: none;
}

.layer {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

.inner {
	opacity: 0.5;
	mix-blend-mode: multiply;

	.light {
		filter: blur(var(--spacing--5xs));
	}
}

.bloom {
	z-index: 1;
	filter: blur(var(--spacing--sm));
	opacity: 0.5;
	mix-blend-mode: multiply;
}

.highlight {
	z-index: 2;
	filter: blur(var(--spacing--2xs));
	opacity: 0.95;
	mix-blend-mode: screen;

	.light {
		background: radial-gradient(
			ellipse calc(var(--wave-width) * 0.4) calc(var(--ai-bands--size) * var(--wave-depth) * 1.25)
				at var(--wave-position),
			#fff 0%,
			rgb(255 255 255 / 90%) 12%,
			rgb(255 255 255 / 35%) 42%,
			transparent 100%
		);
		mix-blend-mode: screen;
	}
}

.light {
	position: absolute;
	inset: 0;
	background: radial-gradient(
		ellipse var(--wave-width) calc(var(--ai-bands--size) * var(--wave-depth)) at
			var(--wave-position),
		var(--wave-color) 0%,
		color-mix(in srgb, var(--wave-color) 45%, transparent) 35%,
		transparent 100%
	);
	transform-origin: var(--wave-position);
	animation: bands-breathe var(--wave-duration) ease-in-out infinite;
	animation-delay: var(--wave-delay);
	mix-blend-mode: multiply;
}

// Multiply darkens to mud on a dark ground, so the colour layers add light there
// and the white cores stay faint.
@mixin on-dark {
	.inner,
	.bloom,
	.light {
		mix-blend-mode: plus-lighter;
	}

	.inner {
		opacity: 0.9;
	}

	.bloom {
		opacity: 0.7;
	}

	.highlight {
		opacity: 0.1;
	}
}

:global(body[data-theme='dark']) {
	@include on-dark;
}

@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) {
		@include on-dark;
	}
}

@keyframes bands-breathe {
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
	.light {
		animation: none;
	}
}
</style>
