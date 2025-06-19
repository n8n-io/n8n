<script setup lang="ts">
import { ElInputNumber } from 'element-plus';
import { computed } from 'vue';

import type { ElementPlusSizePropType, InputSize } from '@n8n/design-system/types';

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
