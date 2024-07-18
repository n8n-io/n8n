<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';

const emit = defineEmits<{
	add: [];
}>();

const { label, connected } = useCanvasNodeHandle();

function onClickAdd() {
	emit('add');
}
</script>
<template>
	<div :class="['canvas-node-handle-main-output', $style.handle]">
		<div :class="$style.label">{{ label }}</div>
		<!-- @TODO Determine whether handle is connected and find a way to make it work without pointer-events: none -->
		<svg v-if="!connected" :class="$style.line" viewBox="0 0 46 24">
			<line
				x1="0"
				y1="12"
				x2="46"
				y2="12"
				stroke="var(--color-foreground-xdark)"
				stroke-width="2"
			/>
		</svg>
		<svg v-if="!connected" :class="$style.plus" viewBox="0 0 24 24" @click="onClickAdd">
			<rect
				x="2"
				y="2"
				width="20"
				height="20"
				stroke="var(--color-foreground-xdark)"
				stroke-width="2"
				rx="4"
				fill="#ffffff"
			/>
			<g transform="translate(0, 0)">
				<path
					fill="var(--color-foreground-xdark)"
					d="m16.40655,10.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z"
				></path>
			</g>
		</svg>
	</div>
</template>

<style lang="scss" module>
.handle {
	width: 70px;
	height: 24px;

	:global(.vue-flow__handle:not(.connectionindicator)) + & {
		display: none;
	}
}

.line {
	position: absolute;
	width: 46px;
	height: 24px;
	left: 8px;
}

.plus {
	position: absolute;
	width: 24px;
	height: 24px;
	right: 0;

	&:hover {
		cursor: pointer;

		path {
			fill: var(--color-primary);
		}

		rect {
			stroke: var(--color-primary);
		}
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
