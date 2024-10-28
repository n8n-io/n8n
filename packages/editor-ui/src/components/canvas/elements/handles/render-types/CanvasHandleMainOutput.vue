<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeHandleKey } from '@/constants';

const handle = inject(CanvasNodeHandleKey);

// const group = svg.node('g');
// const containerBorder = svg.node('rect', {
// 	rx: 3,
// 	'stroke-width': 2,
// 	fillOpacity: 0,
// 	height: ep.params.dimensions - 2,
// 	width: ep.params.dimensions - 2,
// 	y: 1,
// 	x: 1,
// });
// const plusPath = svg.node('path', {
// 	d: 'm16.40655,10.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z',
// });
// if (ep.params.size !== 'medium') {
// 	ep.addClass(ep.params.size);
// }
// group.appendChild(containerBorder);
// group.appendChild(plusPath);
//
// ep.setupOverlays();
// ep.setVisible(false);
// return group;

const $style = useCssModule();

const label = computed(() => handle?.label.value ?? '');
</script>
<template>
	<div :class="['canvas-node-handle-main-output', $style.handle]">
		<div :class="$style.label">{{ label }}</div>
		<div :class="$style.circle" />
		<!-- @TODO Determine whether handle is connected and find a way to make it work without pointer-events: none -->
		<!--		<svg :class="$style.plus" viewBox="0 0 70 24">-->
		<!--			<line x1="0" y1="12" x2="46" y2="12" stroke="var(&#45;&#45;color-foreground-xdark)" />-->
		<!--			<rect-->
		<!--				x="46"-->
		<!--				y="2"-->
		<!--				width="20"-->
		<!--				height="20"-->
		<!--				stroke="var(&#45;&#45;color-foreground-xdark)"-->
		<!--				stroke-width="2"-->
		<!--				rx="4"-->
		<!--				fill="#ffffff"-->
		<!--			/>-->
		<!--			<g transform="translate(44, 0)">-->
		<!--				<path-->
		<!--					fill="var(&#45;&#45;color-foreground-xdark)"-->
		<!--					d="m16.40655,10.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z"-->
		<!--				></path>-->
		<!--			</g>-->
		<!--		</svg>-->
	</div>
</template>

<style lang="scss" module>
.handle {
	width: 16px;
	height: 16px;
}

.circle {
	width: 16px;
	height: 16px;
	border-radius: 100%;
	background: var(--color-foreground-xdark);

	&:hover {
		background: var(--color-primary);
	}
}

.plus {
	position: absolute;
	left: 16px;
	top: 50%;
	transform: translate(0, -50%);
	width: 70px;
	height: 24px;

	:global(.vue-flow__handle.connecting) & {
		display: none;
	}
}

.label {
	position: absolute;
	top: 50%;
	left: 20px;
	transform: translate(0, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
}
</style>
