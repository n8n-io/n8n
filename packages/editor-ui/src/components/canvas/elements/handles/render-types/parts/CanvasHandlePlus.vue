<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

const props = withDefaults(
	defineProps<{
		position?: 'top' | 'right' | 'bottom' | 'left';
	}>(),
	{
		position: 'right',
	},
);

const emit = defineEmits<{
	'click:plus': [event: MouseEvent];
}>();

const style = useCssModule();

const classes = computed(() => [style.wrapper, style[props.position]]);

function onClick(event: MouseEvent) {
	emit('click:plus', event);
}
</script>

<template>
	<div :class="classes">
		<svg :class="$style.line" viewBox="0 0 46 24">
			<line
				x1="0"
				y1="12"
				x2="46"
				y2="12"
				stroke="var(--color-foreground-xdark)"
				stroke-width="2"
			/>
		</svg>
		<svg :class="$style.plus" viewBox="0 0 24 24" @click="onClick">
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
.wrapper {
	position: relative;
	width: 70px;
	height: 24px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.line {
	width: 46px;
	height: 24px;
}

.plus {
	width: 24px;
	height: 24px;
	margin-left: -1px;

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
</style>
