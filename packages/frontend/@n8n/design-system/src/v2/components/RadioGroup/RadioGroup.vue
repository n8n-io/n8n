<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { RadioGroupRoot, useForwardPropsEmits } from './reka-ui';

import type { RadioGroupEmits, RadioGroupProps, RadioGroupSlots } from './RadioGroup.types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<RadioGroupProps>(), {
	orientation: 'vertical',
	disabled: false,
});

const emit = defineEmits<RadioGroupEmits>();
defineSlots<RadioGroupSlots>();

const modelValue = defineModel<RadioGroupProps['modelValue']>();

const rootProps = useForwardPropsEmits(
	reactivePick(props, 'disabled', 'orientation', 'name', 'required', 'loop', 'dir', 'defaultValue'),
	emit,
);
</script>

<template>
	<RadioGroupRoot
		v-bind="rootProps"
		v-model="modelValue"
		:class="[$style.root, $style[orientation]]"
	>
		<slot />
	</RadioGroupRoot>
</template>

<style module>
.root {
	display: flex;
	gap: var(--spacing--xs);
}

.vertical {
	flex-direction: column;
	align-items: flex-start;
}

.horizontal {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
}
</style>
