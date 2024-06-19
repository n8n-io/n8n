<script setup lang="ts">
import { computed } from 'vue';
import { ElInputNumber } from 'element-plus';
import type { InputSize } from '../../types/input';
import type { ElementPlusSizePropType } from '../../types/form';

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
