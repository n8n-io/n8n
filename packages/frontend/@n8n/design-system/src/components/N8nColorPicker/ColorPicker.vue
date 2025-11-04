<script lang="ts" setup>
import { ElColorPicker } from 'element-plus';
import { computed, ref } from 'vue';

import { uid } from '../../utils';
import N8nInput from '../N8nInput';

export type ColorPickerProps = {
	disabled?: boolean;
	size?: 'small' | 'large';
	showAlpha?: boolean;
	colorFormat?: 'hex' | 'rgb' | 'hsl' | 'hsv';
	popperClass?: string;
	predefine?: string[];
	modelValue?: string;
	showInput?: boolean;
	name?: string;
};

defineOptions({ name: 'N8nColorPicker' });
const props = withDefaults(defineProps<ColorPickerProps>(), {
	disabled: false,
	size: 'large',
	showAlpha: false,
	colorFormat: 'hex',
	popperClass: '',
	predefine: undefined,
	modelValue: undefined,
	showInput: true,
	name: uid('color-picker'),
});

const color = ref(props.modelValue);
const colorPickerProps = computed(() => {
	const { showInput, modelValue, size, ...rest } = props;
	return rest;
});

const emit = defineEmits<{
	'update:modelValue': [value: string | null];
	change: [value: string | null];
	'active-change': [value: string | null];
}>();

const onChange = (value: string | null) => {
	emit('change', value);
};

const onInput = (value: string) => {
	color.value = value;
};

const onActiveChange = (value: string | null) => {
	emit('active-change', value);
};

const onColorSelect = (value: string | null) => {
	emit('update:modelValue', value);
};
</script>

<template>
	<span :class="['n8n-color-picker', $style.component]">
		<ElColorPicker
			v-bind="colorPickerProps"
			:model-value="modelValue"
			:size="props.size"
			@change="onChange"
			@active-change="onActiveChange"
			@update:model-value="onColorSelect"
		/>
		<N8nInput
			v-if="showInput"
			:class="$style.input"
			:disabled="props.disabled"
			:size="props.size"
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
	margin-left: var(--spacing--3xs);
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
