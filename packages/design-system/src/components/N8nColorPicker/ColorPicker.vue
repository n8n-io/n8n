<script lang="ts" setup>
import { computed, ref } from 'vue';
import { uid } from '../../utils';
import { ElColorPicker } from 'element-plus';
import N8nInput from '../N8nInput';

export type ColorPickerProps = {
	disabled?: boolean;
	size?: 'small' | 'medium' | 'mini';
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
	size: 'medium',
	showAlpha: false,
	colorFormat: 'hex',
	popperClass: '',
	showInput: true,
	name: uid('color-picker'),
});

const color = ref(props.modelValue);

const colorPickerProps = computed(() => {
	const { showInput, ...rest } = props;
	return rest;
});

const emit = defineEmits<{
	(event: 'update:modelValue', value: string): void;
	(event: 'change', value: string): void;
	(event: 'active-change', value: string): void;
}>();

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
			size="default"
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
