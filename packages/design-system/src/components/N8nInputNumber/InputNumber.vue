<script setup lang="ts">
import type { ElementPlusSizePropType, InputSize } from '@/types';
import { ElInputNumber } from 'element-plus';
import { computed } from 'vue';

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
	precision: 0,
	min: -Infinity,
	max: Infinity,
});

const resolvedSize = computed(() => props.size as ElementPlusSizePropType);
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
