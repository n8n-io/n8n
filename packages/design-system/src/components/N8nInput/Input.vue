<template>
	<ElInput
		ref="innerInput"
		:model-value="modelValue"
		:type="type"
		:size="resolvedSize"
		:class="['n8n-input', ...classes]"
		:autocomplete="autocomplete"
		:name="name"
		:placeholder="placeholder"
		:disabled="disabled"
		:readonly="readonly"
		:clearable="clearable"
		:rows="rows"
		:title="title"
		v-bind="$attrs"
	>
		<template v-if="$slots.prepend" #prepend>
			<slot name="prepend" />
		</template>
		<template v-if="$slots.append" #append>
			<slot name="append" />
		</template>
		<template v-if="$slots.prefix" #prefix>
			<slot name="prefix" />
		</template>
		<template v-if="$slots.suffix" #suffix>
			<slot name="suffix" />
		</template>
	</ElInput>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElInput } from 'element-plus';
import { uid } from '../../utils';
import type { InputSize, InputType } from '@/types/input';
import type { ElementPlusSizePropType, InputAutocompletePropType } from '@/types';

interface InputProps {
	modelValue?: string | number;
	type?: InputType;
	size?: InputSize;
	placeholder?: string;
	disabled?: boolean;
	readonly?: boolean;
	clearable?: boolean;
	rows?: number;
	maxlength?: number;
	title?: string;
	name?: string;
	autocomplete?: InputAutocompletePropType;
}

defineOptions({ name: 'N8nInput' });
const props = withDefaults(defineProps<InputProps>(), {
	modelValue: '',
	type: 'text',
	size: 'large',
	placeholder: '',
	disabled: false,
	readonly: false,
	clearable: false,
	rows: 2,
	maxlength: Infinity,
	title: '',
	name: () => uid('input'),
	autocomplete: 'off',
});

const resolvedSize = computed(
	() => (props.size === 'xlarge' ? undefined : props.size) as ElementPlusSizePropType,
);

const classes = computed(() => {
	const applied: string[] = [];
	if (props.size === 'xlarge') {
		applied.push('xlarge');
	}
	if (props.type === 'password') {
		applied.push('ph-no-capture');
	}
	return applied;
});

const innerInput = ref<InstanceType<typeof ElInput>>();
const inputElement = computed(() => {
	if (!innerInput?.value) return;
	const inputType = props.type === 'textarea' ? 'textarea' : 'input';
	return (innerInput.value.$el as HTMLElement).querySelector(inputType);
});

const focus = () => inputElement.value?.focus();
const blur = () => inputElement.value?.blur();
const select = () => inputElement.value?.select();
defineExpose({ focus, blur, select });
</script>

<style lang="scss" module>
.xlarge {
	--input-font-size: var(--font-size-m);
	input {
		height: 48px;
	}
}
</style>
