<script lang="ts" setup>
import { computed, ref } from 'vue';
import { uid } from '../../utils';
import { ElColorPicker } from 'element-plus';
import N8nInput from '../N8nInput';
import type { ElementPlusSizePropType } from '@/types';

export type ColorPickerProps = {
	disabled?: boolean;
	size?: 'default' | 'small' | 'medium' | 'mini';
	showAlpha?: boolean;
	colorFormat?: 'hex' | 'rgb' | 'hsl' | 'hsv';
	popperClass?: string;
	predefine?: string[];
	modelValue?: string;
	showInput?: boolean;
	name?: string;
};

type InputSize = 'small' | 'medium' | 'mini' | 'large' | 'xlarge' | undefined;

defineOptions({ name: 'N8nColorPicker' });
const props = withDefaults(defineProps<ColorPickerProps>(), {
	disabled: false,
	size: 'default',
	showAlpha: false,
	colorFormat: 'hex',
	popperClass: '',
	predefine: undefined,
	modelValue: undefined,
	showInput: true,
	name: uid('color-picker'),
});

const color = ref(props.modelValue);

function isInputSize(size: unknown): size is InputSize {
	return typeof size === 'string' && ['small', 'medium', 'mini', 'large', 'xlarge'].includes(size);
}

let inputSize: InputSize = undefined;
if (isInputSize(props.size)) {
	inputSize = props.size;
}

const colorPickerProps = computed(() => {
	const { showInput, modelValue, size, ...rest } = props;
	return rest;
});

const emit = defineEmits<{
	(event: 'update:modelValue', value: string): void;
	(event: 'change', value: string): void;
	(event: 'active-change', value: string): void;
}>();

const resolvedSize = computed(() => props.size as ElementPlusSizePropType);

const onChange = (value: string) => {
	emit('change', value);
};

const onInput = (value: string) => {
	color.value = value;
};

const onActiveChange = (value: string) => {
	emit('active-change', value);
};

const onColorSelect = (value: string) => {
	emit('update:modelValue', value);
};
</script>

<template>
	<span :class="['n8n-color-picker', $style.component]">
		<ElColorPicker
			v-bind="colorPickerProps"
			:model-value="modelValue"
			:size="resolvedSize"
			@change="onChange"
			@active-change="onActiveChange"
			@update:model-value="onColorSelect"
		/>
		<N8nInput
			v-if="showInput"
			:class="$style.input"
			:disabled="props.disabled"
			:size="inputSize"
			:model-value="color"
			:name="name"
			type="text"
			@update:model-value="onInput"
		/>
	</span>
</template>

<style lang="scss" module>
.component {
	display: inline-flex;
	align-items: center;
}

.input {
	margin-left: var(--spacing-3xs);
}
</style>

<style lang="scss" scoped>
:deep(.el-color-picker) {
	.el-color-picker__empty,
	.el-color-picker__icon {
		display: none;
	}
}
</style>
