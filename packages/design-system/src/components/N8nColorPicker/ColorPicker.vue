<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ColorPicker } from 'element-ui';

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv';

export type IN8nColorPicker = {
	disabled?: boolean;
	size?: 'small' | 'medium' | 'mini';
	showAlpha?: boolean;
	colorFormat?: ColorFormat;
	popperClass?: string;
	predefine?: ColorFormat[];
	value: string;
};

const colorPickerProps = defineProps<IN8nColorPicker>();

const emit = defineEmits<{
	(event: 'input', value: unknown): void;
}>();

const internalValue = ref<IN8nColorPicker['value']>(colorPickerProps.value);

const value = computed({
	get: () => internalValue.value,
	set: (newValue: IN8nColorPicker['value']) => {
		internalValue.value = newValue;
		emit('input', newValue);
	},
});
</script>
<template>
	<span>
		<color-picker v-model="value" v-bind="colorPickerProps" />
	</span>
</template>
