<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElColorPicker } from 'element-plus';
import N8nInput from '../N8nInput';

export type Props = {
	disabled?: boolean;
	size?: 'small' | 'medium' | 'mini';
	showAlpha?: boolean;
	colorFormat?: 'hex' | 'rgb' | 'hsl' | 'hsv';
	popperClass?: string;
	predefine?: string[];
	modelValue?: string;
	showInput?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	size: 'medium',
	showAlpha: false,
	colorFormat: 'hex',
	popperClass: '',
	showInput: true,
	modelValue: null,
});

const color = ref(props.modelValue);

const colorPickerProps = computed(() => {
	const { value, showInput, ...rest } = props;
	return rest;
});

const emit = defineEmits<{
	(event: 'update:modelValue', value: string): void;
	(event: 'change', value: string): void;
	(event: 'active-change', value: string): void;
}>();

const model = computed({
	get() {
		return color.value;
	},
	set(value: string) {
		color.value = value;
		emit('update:modelValue', value);
	},
});

const onChange = (value: string) => {
	emit('change', value);
};

const onInput = (value: string) => {
	color.value = value;
};

const onActiveChange = (value: string) => {
	emit('active-change', value);
};
</script>
<template>
	<span :class="['n8n-color-picker', $style.component]">
		<el-color-picker
			v-model="model"
			v-bind="colorPickerProps"
			@change="onChange"
			@active-change="onActiveChange"
		/>
		<n8n-input
			v-if="showInput"
			:class="$style.input"
			:disabled="props.disabled"
			:size="props.size"
			:modelValue="color"
			@update:modelValue="onInput"
			type="text"
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
