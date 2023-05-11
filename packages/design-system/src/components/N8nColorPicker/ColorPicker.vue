<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ColorPicker } from 'element-ui';
import N8nInput from '../N8nInput';

export type Props = {
	disabled?: boolean;
	size?: 'small' | 'medium' | 'mini';
	showAlpha?: boolean;
	colorFormat?: 'hex' | 'rgb' | 'hsl' | 'hsv';
	popperClass?: string;
	predefine?: string[];
	value?: string;
	showInput?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	size: 'medium',
	showAlpha: false,
	colorFormat: 'hex',
	popperClass: '',
	showInput: true,
	value: null,
});

const color = ref(props.value);

const colorPickerProps = computed(() => {
	const { value, showInput, ...rest } = props;
	return rest;
});

const emit = defineEmits<{
	(event: 'input', value: string): void;
	(event: 'change', value: string): void;
	(event: 'active-change', value: string): void;
}>();

const model = computed({
	get() {
		return color.value;
	},
	set(value: string) {
		color.value = value;
		emit('input', value);
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
		<color-picker
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
			:value="color"
			@input="onInput"
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
