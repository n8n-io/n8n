<script lang="ts" setup>
import { computed } from 'vue';
import { ColorPicker } from 'element-ui';

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv';

export type IN8nColorPicker = {
	disabled?: boolean;
	size?: 'small' | 'medium' | 'mini';
	showAlpha?: boolean;
	colorFormat?: ColorFormat;
	popperClass?: string;
	predefine?: ColorFormat[];
	modelValue: string;
};

const colorPickerProps = defineProps<IN8nColorPicker>();

const emit = defineEmits<{
	(event: 'update:modelValue', value: unknown): void;
}>();

const value = computed({
	get: () => colorPickerProps.modelValue,
	set: (newValue: IN8nColorPicker['value']) => {
		emit('update:modelValue', newValue);
	},
});
</script>
<template>
	<span>
		<color-picker v-model="value" v-bind="colorPickerProps" />
	</span>
</template>
