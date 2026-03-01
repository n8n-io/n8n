<script setup lang="ts">
import { ElInputNumber } from 'element-plus';
import { computed } from 'vue';

import type { ElementPlusSizePropType, InputSize } from '../../types';

type InputNumberProps = {
	size?: InputSize;
	min?: number;
	max?: number;
	step?: number;
	precision?: number;
};

const props = withDefaults(defineProps<InputNumberProps>(), {
	size: undefined,
	step: 1,
	precision: undefined,
	min: -Infinity,
	max: Infinity,
});

const sizeMap: Record<InputSize, ElementPlusSizePropType> = {
	mini: 'small',
	small: 'small',
	medium: 'default',
	large: 'large',
	xlarge: 'large',
};

const resolvedSize = computed(() => (props.size ? sizeMap[props.size] : undefined));
</script>

<template>
	<ElInputNumber
		:size="resolvedSize"
		:min="min"
		:max="max"
		:step="step"
		:precision="precision"
		v-bind="$attrs"
	/>
</template>
