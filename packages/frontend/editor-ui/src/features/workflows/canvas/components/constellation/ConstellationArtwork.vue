<script setup lang="ts">
import { useId } from 'vue';
import { backgroundStars, type ConstellationGraph } from './graph';

defineProps<{
	graph: ConstellationGraph;
	labels: boolean;
	grid: boolean;
	title: string;
	caption: string;
	accessibleTitle: string;
}>();
const id = useId().replaceAll(':', '-');

function labelLines(name: string) {
	const words = name.split(' ');
	if (words.length < 2) return [name];
	let split = 1;
	for (let index = 2; index < words.length; index++) {
		if (
			Math.abs(words.slice(0, index).join(' ').length - name.length / 2) <
			Math.abs(words.slice(0, split).join(' ').length - name.length / 2)
		)
			split = index;
	}
	return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
}
</script>

<template>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 1600 1000"
		width="1600"
		height="1000"
		role="img"
		:aria-labelledby="`${id}-title`"
		class="constellation-artwork"
	>
		<title :id="`${id}-title`">{{ accessibleTitle }}</title>
		<defs>
			<radialGradient :id="`${id}-sky`" cx="52%" cy="43%" r="70%">
				<stop offset="0" stop-color="#18233f" />
				<stop offset="0.5" stop-color="#0c1428" />
				<stop offset="1" stop-color="#050a15" />
			</radialGradient>
			<radialGradient :id="`${id}-halo`">
				<stop offset="0" stop-color="#c4d8ff" stop-opacity="0.45" />
				<stop offset="0.25" stop-color="#9dbaff" stop-opacity="0.16" />
				<stop offset="1" stop-color="#8bb2ff" stop-opacity="0" />
			</radialGradient>
		</defs>
		<rect width="1600" height="1000" :fill="`url(#${id}-sky)`" />
		<g fill="#d5e3ff" aria-hidden="true">
			<circle
				v-for="(star, index) in backgroundStars"
				:key="index"
				:cx="star.x"
				:cy="star.y"
				:r="star.r"
				:opacity="0.15 + (index % 5) * 0.1"
				:class="{ 'constellation-twinkle': index % 7 === 0 }"
				:style="{ animationDelay: `${-(index % 9)}s` }"
			/>
		</g>
		<g
			v-if="grid"
			fill="none"
			stroke="#91a9d5"
			stroke-width="0.7"
			opacity="0.13"
			aria-hidden="true"
		>
			<ellipse cx="800" cy="485" rx="640" ry="320" />
			<ellipse cx="800" cy="485" rx="640" ry="160" />
			<ellipse cx="800" cy="485" rx="320" ry="320" />
			<path d="M160 485H1440 M800 165V805" />
			<ellipse
				cx="800"
				cy="485"
				rx="640"
				ry="320"
				transform="rotate(-18 800 485)"
				stroke-dasharray="2 8"
			/>
		</g>
		<g fill="none" stroke="#94b4e4" stroke-width="1.3">
			<line
				v-for="(edge, index) in graph.connections"
				:key="index"
				:x1="graph.stars[edge.from].x"
				:y1="graph.stars[edge.from].y"
				:x2="graph.stars[edge.to].x"
				:y2="graph.stars[edge.to].y"
				:stroke-dasharray="edge.auxiliary ? '3 7' : undefined"
				:opacity="edge.auxiliary ? 0.38 : 0.65"
			/>
		</g>
		<g
			v-for="(star, index) in graph.stars"
			:key="index"
			:transform="`translate(${star.x} ${star.y})`"
		>
			<circle :r="38 + Math.min(star.degree, 5) * 6" :fill="`url(#${id}-halo)`" />
			<g fill="none" stroke="#e9f0ff" stroke-width="0.8" :opacity="star.degree > 2 ? 0.8 : 0.45">
				<path d="M-14 0H14 M0 -14V14" />
			</g>
			<circle :r="2.6 + Math.min(star.degree, 5) * 0.45" fill="#f5f5e9" />
			<circle
				v-if="star.degree > 2"
				r="9"
				fill="none"
				stroke="#c8d8f1"
				stroke-width="0.5"
				opacity="0.5"
			/>
			<text
				v-if="labels"
				x="0"
				y="30"
				text-anchor="middle"
				fill="#b9c8df"
				font-family="system-ui, sans-serif"
				font-size="11"
			>
				<tspan
					v-for="(line, lineIndex) in labelLines(star.name)"
					:key="lineIndex"
					x="0"
					:dy="lineIndex ? 14 : 0"
				>
					{{ line }}
				</tspan>
			</text>
		</g>
		<g fill="#b6c5de" font-family="system-ui, sans-serif" text-anchor="middle">
			<text x="800" y="86" font-size="11" letter-spacing="5">N / 0°</text>
			<path
				d="M800 105V125 M793 118L800 105L807 118"
				fill="none"
				stroke="#b6c5de"
				stroke-width="0.8"
			/>
			<text
				x="800"
				y="875"
				font-family="Georgia, serif"
				font-size="36"
				letter-spacing="1"
				fill="#e5e9f1"
			>
				{{ title }}
			</text>
			<text x="800" y="913" font-size="11" letter-spacing="3">{{ caption }}</text>
			<path d="M760 940H840" stroke="#8b9cb8" stroke-width="0.7" />
		</g>
		<rect
			x="36"
			y="36"
			width="1528"
			height="928"
			rx="2"
			fill="none"
			stroke="#94a9cb"
			stroke-opacity="0.2"
		/>
	</svg>
</template>

<style scoped lang="scss">
@use '../../../../../../../@n8n/design-system/src/css/mixins/motion' as motion;

.constellation-artwork {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}
.constellation-twinkle {
	// This slow, decorative pulse is specific to the night-sky artwork.
	--animation--opacity-pulse--duration: 7s;
	--animation--opacity-pulse--opacity-start: 0.2;
	--animation--opacity-pulse--opacity-end: 0.6;
	@include motion.opacity-pulse;
}
@keyframes opacityPulse {
	0%,
	100% {
		opacity: 0.2;
	}
	50% {
		opacity: 0.6;
	}
}
</style>
