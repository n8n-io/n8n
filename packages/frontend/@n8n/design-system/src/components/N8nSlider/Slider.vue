<script setup lang="ts">
import { computed, ref } from 'vue';
import type { InputSize } from '@n8n/design-system/types';

type SliderProps = {
	modelValue?: number;
	size?: InputSize;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	showInput?: boolean;
	showInputControls?: boolean;
	showStops?: boolean;
	showTooltip?: boolean;
	marks?: Record<number, string>;
	vertical?: boolean;
	height?: string;
	range?: boolean;
	formatTooltip?: (value: number) => string;
};

defineOptions({ name: 'N8nSlider' });

const props = withDefaults(defineProps<SliderProps>(), {
	modelValue: 0,
	size: 'large',
	min: 0,
	max: 100,
	step: 1,
	disabled: false,
	showInput: true,
	showInputControls: true,
	showStops: false,
	showTooltip: true,
	marks: undefined,
	vertical: false,
	height: '200px',
	range: false,
	formatTooltip: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: number | number[]];
	change: [value: number | number[]];
	input: [value: number | number[]];
}>();

const sliderRef = ref<HTMLInputElement>();
const inputRef = ref<HTMLInputElement>();

const currentValue = computed({
	get: () => props.modelValue || 0,
	set: (value: number) => {
		emit('update:modelValue', value);
		emit('change', value);
		emit('input', value);
	},
});

const defaultFormatTooltip = (value: number) => {
	// Auto format as percentage if min is 0 and max is 100
	if (props.min === 0 && props.max === 100) {
		return `${value}%`;
	}
	return String(value);
};

const tooltipText = computed(() => {
	const formatter = props.formatTooltip || defaultFormatTooltip;
	return formatter(currentValue.value);
});

const progressPercentage = computed(() => {
	const range = props.max - props.min;
	const value = currentValue.value - props.min;
	return (value / range) * 100;
});

const onSliderChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	currentValue.value = Number(target.value);
};

const onInputChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = Number(target.value);
	if (value >= props.min && value <= props.max) {
		currentValue.value = value;
	}
};

const increment = () => {
	if (currentValue.value < props.max) {
		currentValue.value = Math.min(props.max, currentValue.value + props.step);
	}
};

const decrement = () => {
	if (currentValue.value > props.min) {
		currentValue.value = Math.max(props.min, currentValue.value - props.step);
	}
};

const focus = () => {
	sliderRef.value?.focus();
};

defineExpose({
	focus,
	focusOnInput: focus,
});
</script>

<template>
	<div
		:class="[
			'n8n-slider',
			$style.component,
			{ [$style.vertical]: vertical, [$style.disabled]: disabled },
		]"
	>
		<div v-if="!vertical" :class="$style.horizontal">
			<div :class="$style.sliderContainer">
				<input
					ref="sliderRef"
					:class="$style.slider"
					type="range"
					:min="min"
					:max="max"
					:step="step"
					:value="currentValue"
					:disabled="disabled"
					:style="{
						background: `linear-gradient(to right, #718EBF 0%, #718EBF ${progressPercentage}%, #ddd ${progressPercentage}%, #ddd 100%)`,
					}"
					@input="onSliderChange"
					@change="onSliderChange"
				/>
				<div v-if="showTooltip" :class="$style.tooltip" :style="{ left: `${progressPercentage}%` }">
					{{ tooltipText }}
				</div>
			</div>

			<div v-if="showInput" :class="$style.inputContainer">
				<button
					v-if="showInputControls"
					:class="$style.controlButton"
					:disabled="disabled || currentValue <= min"
					@click="decrement"
				>
					-
				</button>
				<input
					ref="inputRef"
					:class="$style.numberInput"
					type="number"
					:min="min"
					:max="max"
					:step="step"
					:value="currentValue"
					:disabled="disabled"
					@input="onInputChange"
					@change="onInputChange"
				/>
				<button
					v-if="showInputControls"
					:class="$style.controlButton"
					:disabled="disabled || currentValue >= max"
					@click="increment"
				>
					+
				</button>
			</div>
		</div>

		<div v-else :class="$style.verticalContainer" :style="{ height }">
			<input
				ref="sliderRef"
				:class="[$style.slider, $style.verticalSlider]"
				type="range"
				:min="min"
				:max="max"
				:step="step"
				:value="currentValue"
				:disabled="disabled"
				orient="vertical"
				@input="onSliderChange"
				@change="onSliderChange"
			/>
			<div v-if="showTooltip" :class="$style.verticalTooltip">
				{{ tooltipText }}
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.component {
	font-family: var(--font-family);

	&.disabled {
		opacity: 0.6;
		pointer-events: none;
	}
}

.horizontal {
	display: flex;
	align-items: center;
	gap: 16px;
	width: 100%;
}

.sliderContainer {
	position: relative;
	flex: 1;
	height: 24px;
	display: flex;
	align-items: center;
}

.slider {
	width: 100%;
	height: 12px;
	border-radius: 6px;
	outline: none;
	-webkit-appearance: none;
	appearance: none;
	background: #ddd;
	cursor: pointer;

	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-background-xlight, #ffffff);
		border: 2px solid #718ebf;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			transform: scale(1.2);
		}
	}

	&::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-background-xlight, #ffffff);
		border: 2px solid #718ebf;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			transform: scale(1.2);
		}
	}

	&:disabled {
		cursor: not-allowed;

		&::-webkit-slider-thumb {
			cursor: not-allowed;
			transform: none;
		}

		&::-moz-range-thumb {
			cursor: not-allowed;
			transform: none;
		}
	}
}

.tooltip {
	position: absolute;
	top: -35px;
	transform: translateX(-50%);
	background: var(--color-text-dark);
	color: var(--color-text-xlight);
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	white-space: nowrap;
	pointer-events: none;

	&::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 4px solid transparent;
		border-top-color: var(--color-text-dark);
	}
}

.inputContainer {
	display: flex;
	align-items: center;
	gap: 4px;
	min-width: 130px;
}

.controlButton {
	width: 20px;
	height: 20px;
	border: 1px solid var(--color-foreground-base);
	border-radius: 4px;
	background: var(--color-background-xlight);
	color: var(--color-text-base);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	font-size: 14px;
	font-weight: bold;

	&:hover:not(:disabled) {
		background: var(--color-background-light);
		border-color: #718ebf;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.numberInput {
	width: 70px;
	padding: 4px 8px;
	border: 1px solid var(--color-foreground-base);
	border-radius: 4px;
	text-align: center;
	font-size: 13px;

	&:focus {
		outline: none;
		border-color: #718ebf;
		box-shadow: 0 0 0 2px rgba(113, 142, 191, 0.2);
	}

	&:disabled {
		background: var(--color-background-light);
		cursor: not-allowed;
	}
}

.vertical {
	height: 100%;
}

.verticalContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 40px;
	position: relative;
}

.verticalSlider {
	writing-mode: bt-lr; /* IE */
	-webkit-appearance: slider-vertical; /* WebKit */
	width: 20px;
	height: 100%;
	background: #ddd;
	outline: none;
}

.verticalTooltip {
	position: absolute;
	right: 25px;
	top: 50%;
	transform: translateY(-50%);
	background: var(--color-text-dark);
	color: var(--color-text-xlight);
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	white-space: nowrap;
}
</style>
