<script setup lang="ts">
import { ToggleGroupRoot, type AcceptableValue } from 'reka-ui';

import type { ButtonProps } from '../../types/button';

export interface ToggleGroupProps {
	modelValue?: AcceptableValue | AcceptableValue[];
	defaultValue?: AcceptableValue | AcceptableValue[];
	type?: 'single' | 'multiple';
	orientation?: 'horizontal' | 'vertical';
	disabled?: boolean;
	loop?: boolean;
	rovingFocus?: boolean;
	name?: string;
	required?: boolean;
	variant?: ButtonProps['variant'];
	size?: ButtonProps['size'];
}

withDefaults(defineProps<ToggleGroupProps>(), {
	type: 'single',
	orientation: 'horizontal',
	disabled: false,
	loop: true,
	rovingFocus: true,
	variant: 'solid',
	size: 'medium',
});

const emit = defineEmits<{
	'update:modelValue': [value: AcceptableValue | AcceptableValue[]];
}>();
</script>

<template>
	<ToggleGroupRoot
		:class="$style.group"
		:model-value="modelValue"
		:default-value="defaultValue"
		:type="type"
		:orientation="orientation"
		:disabled="disabled"
		:loop="loop"
		:roving-focus="rovingFocus"
		:name="name"
		:required="required"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<slot :variant="variant" :size="size" />
	</ToggleGroupRoot>
</template>

<style lang="scss" module>
.group {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
