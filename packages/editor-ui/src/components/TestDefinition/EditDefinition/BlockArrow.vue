<script setup lang="ts">
import { computed, useCssModule } from 'vue';

const props = defineProps<{
	state?: 'default' | 'error' | 'success';
	hoverable?: boolean;
}>();

const css = useCssModule();

const classes = computed(() => ({
	[css.arrowConnector]: true,
	[css.hoverable]: props.hoverable,
	[css.error]: props.state === 'error',
	[css.success]: props.state === 'success',
}));
</script>

<template>
	<div :class="classes">
		<div :class="$style.stalk"></div>
		<div :class="$style.arrowHead"></div>
	</div>
</template>

<style module lang="scss">
.arrowConnector {
	position: relative;
	height: var(--arrow-height, 3rem);
	margin: 0.1rem 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stalk {
	position: relative;
	width: var(--stalk-width, 0.125rem);
	height: calc(100% - var(--arrow-tip-height, 0.5rem));
	background-color: var(--arrow-color, var(--color-text-dark));
	transition: all 0.2s ease;

	&::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 1rem;
		height: 100%;
		cursor: pointer;
	}
}

.arrowHead {
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 0;
	height: 0;
	border-left: calc(var(--arrow-tip-width, 0.75rem) / 2) solid transparent;
	border-right: calc(var(--arrow-tip-width, 0.75rem) / 2) solid transparent;
	border-top: var(--arrow-tip-height, 0.5rem) solid var(--arrow-color, var(--color-text-dark));
	transition: all 0.2s ease;

	&::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 1.5rem;
		height: 1.5rem;
		cursor: pointer;
	}
}

.hoverable {
	--hover-scale: var(--arrow-hover-scale, 1.8);
	cursor: pointer;

	&:hover {
		.stalk {
			width: calc(var(--stalk-width, 0.125rem) * var(--hover-scale));
			background-color: var(--arrow-hover-color, var(--arrow-color, var(--color-text-dark)));
		}

		.arrowHead {
			border-left-width: calc(var(--arrow-tip-width, 0.75rem) / 2 * var(--hover-scale));
			border-right-width: calc(var(--arrow-tip-width, 0.75rem) / 2 * var(--hover-scale));
			border-top-width: calc(var(--arrow-tip-height, 0.5rem) * var(--hover-scale));
			border-top-color: var(--arrow-hover-color, var(--arrow-color, var(--color-text-dark)));
		}
	}
}

.error {
	--stalk-width: 0.1875rem;
	--arrow-color: var(--color-danger);
	--arrow-tip-width: 1rem;
	--arrow-tip-height: 0.625rem;
}

.success {
	--stalk-width: 0.1875rem;
	--arrow-color: var(--color-success);
	--arrow-tip-width: 1rem;
	--arrow-tip-height: 0.625rem;

	.stalk {
		position: relative;

		&::after {
			content: '✓';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			font-size: 1rem;
			color: var(--arrow-color, var(--color-success));
		}
	}
}
</style>
