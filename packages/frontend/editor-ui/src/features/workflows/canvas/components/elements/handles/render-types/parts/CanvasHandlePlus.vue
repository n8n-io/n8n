<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useCanvas } from '../../../../../composables/useCanvas';
import { useZoomAdjustedValues } from '../../../../../composables/useZoomAdjustedValues';

const props = withDefaults(
	defineProps<{
		position?: 'top' | 'right' | 'bottom' | 'left';
		handleClasses?: string;
		plusSize?: number;
		lineSize?: number;
		type?: 'success' | 'secondary' | 'default';
	}>(),
	{
		position: 'right',
		handleClasses: undefined,
		plusSize: 24,
		lineSize: 46,
		type: 'default',
	},
);

const { viewport } = useCanvas();
const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

const lineLightness = calculateEdgeLightness();

const emit = defineEmits<{
	'click:plus': [event: MouseEvent];
}>();

const style = useCssModule();

const classes = computed(() => [
	'canvas-handle-plus',
	style.container,
	style[props.position],
	props.handleClasses,
]);

const viewBox = computed(() => {
	switch (props.position) {
		case 'bottom':
		case 'top':
			return {
				width: props.plusSize,
				height: props.lineSize + props.plusSize,
			};
		default:
			return {
				width: props.lineSize + props.plusSize,
				height: props.plusSize,
			};
	}
});

const svgStyles = computed(() => ({
	width: `${viewBox.value.width}px`,
	height: `${viewBox.value.height}px`,
	'--canvas-handle-plus-line--color--lightness--light': lineLightness.value.light,
	'--canvas-handle-plus-line--color--lightness--dark': lineLightness.value.dark,
}));

const linePosition = computed(() => {
	switch (props.position) {
		case 'top':
			return [
				[viewBox.value.width / 2, viewBox.value.height - props.lineSize + 1],
				[viewBox.value.width / 2, viewBox.value.height],
			];
		case 'bottom':
			return [
				[viewBox.value.width / 2, 0],
				[viewBox.value.width / 2, props.lineSize + 1],
			];
		case 'left':
			return [
				[viewBox.value.width - props.lineSize - 1, viewBox.value.height / 2],
				[viewBox.value.width, viewBox.value.height / 2],
			];
		default:
			return [
				[0, viewBox.value.height / 2],
				[props.lineSize + 1, viewBox.value.height / 2],
			];
	}
});

const plusPosition = computed(() => {
	switch (props.position) {
		case 'bottom':
			return [0, viewBox.value.height - props.plusSize];
		case 'top':
			return [0, 0];
		case 'left':
			return [0, 0];
		default:
			return [viewBox.value.width - props.plusSize, 0];
	}
});

function onClick(event: MouseEvent) {
	emit('click:plus', event);
}
</script>

<template>
	<div :class="classes" data-test-id="canvas-handle-plus-wrapper">
		<svg
			:class="[$style.wrapper, $style[position], $style[type]]"
			:style="svgStyles"
			:viewBox="`0 0 ${viewBox.width} ${viewBox.height}`"
		>
			<line
				:class="[handleClasses, $style.line]"
				:x1="linePosition[0][0]"
				:y1="linePosition[0][1]"
				:x2="linePosition[1][0]"
				:y2="linePosition[1][1]"
				stroke-width="2"
			/>
			<g
				data-test-id="canvas-handle-plus"
				:class="[$style.plus, handleClasses, 'clickable']"
				:transform="`translate(${plusPosition[0]}, ${plusPosition[1]})`"
				@click.stop="onClick"
			>
				<rect
					:class="[handleClasses, 'clickable']"
					x="2"
					y="2"
					width="20"
					height="20"
					stroke="light-dark(var(--color--neutral-200), var(--color--neutral-850))"
					stroke-width="2"
					rx="4"
					fill="light-dark(var(--color--neutral-200), var(--color--neutral-850))"
				/>
				<path
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M8 12h8m-4-4v8"
					class="source clickable"
				/>
			</g>
		</svg>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;

	// Creates an invisible barrier around the handle from to prevent edge hover states (like the delete icon from nearby edges)
	// from coming to the forefront when the user moves their mouse over the plus button.
	// Only needed for bottom position (e.g. Ai Agent Node Output).
	&.bottom::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 200%;
		height: 120%;
		pointer-events: auto;
		/* stylelint-disable-next-line @n8n/css-var-naming */
		transform: translate(-50%, -50%) scale(var(--canvas-zoom-compensation-factor, 1));
	}
}

.wrapper {
	position: relative;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: scale(var(--canvas-zoom-compensation-factor, 1));

	&.right {
		transform-origin: center left;
	}

	&.bottom {
		transform-origin: top center;
	}

	.line {
		stroke: light-dark(
			oklch(var(--canvas-handle-plus-line--color--lightness--light) 0 0),
			oklch(var(--canvas-handle-plus-line--color--lightness--dark) 0 0)
		);
	}

	&.success {
		.line {
			stroke: var(--color--success);
		}
	}

	.plus {
		color: light-dark(var(--color--neutral-700), var(--color--neutral-250));

		&:hover {
			cursor: pointer;
			color: light-dark(var(--color--neutral-850), var(--color--neutral-150));

			path {
				fill: light-dark(var(--color--neutral-250), var(--color--neutral-800));
			}

			rect {
				stroke: light-dark(var(--color--neutral-250), var(--color--neutral-800));
				fill: light-dark(var(--color--neutral-250), var(--color--neutral-800));
			}
		}
	}
}
</style>
