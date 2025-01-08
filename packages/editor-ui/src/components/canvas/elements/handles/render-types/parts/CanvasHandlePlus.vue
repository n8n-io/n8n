<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

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

const emit = defineEmits<{
	'click:plus': [event: MouseEvent];
}>();

const style = useCssModule();

const classes = computed(() => [
	style.wrapper,
	style[props.position],
	style[props.type],
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

const styles = computed(() => ({
	width: `${viewBox.value.width}px`,
	height: `${viewBox.value.height}px`,
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
	<svg :class="classes" :viewBox="`0 0 ${viewBox.width} ${viewBox.height}`" :style="styles">
		<line
			:class="[handleClasses, $style.line]"
			:x1="linePosition[0][0]"
			:y1="linePosition[0][1]"
			:x2="linePosition[1][0]"
			:y2="linePosition[1][1]"
			stroke="var(--color-foreground-xdark)"
			stroke-width="2"
		/>
		<g
			:class="[$style.plus, handleClasses, 'clickable']"
			:transform="`translate(${plusPosition[0]}, ${plusPosition[1]})`"
			@click="onClick"
		>
			<rect
				:class="[handleClasses, 'clickable']"
				x="2"
				y="2"
				width="20"
				height="20"
				stroke="var(--color-foreground-xdark)"
				stroke-width="2"
				rx="4"
				fill="var(--color-foreground-xlight)"
			/>
			<path
				:class="[handleClasses, 'clickable']"
				fill="var(--color-foreground-xdark)"
				d="m16.40655,10.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z"
			></path>
		</g>
	</svg>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;

	&.secondary {
		.line {
			stroke: var(--node-type-supplemental-color);
		}

		.plus {
			path {
				fill: var(--node-type-supplemental-color);
			}

			rect {
				stroke: var(--node-type-supplemental-color);
			}
		}
	}

	&.success {
		.line {
			stroke: var(--color-success);
		}
	}

	.plus {
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
}
</style>
