<script setup lang="ts">
import type { InputSize } from '@/types';
import { ElInputNumber } from 'element-plus';
import { computed } from 'vue';

type InputNumberProps = {
	size?: InputSize;
	min?: number;
	max?: number;
	step?: number;
	precision?: number;
};

const props = defineProps<InputNumberProps>();

const elSize = computed(() => props.size as 'small' | 'large');
</script>

<template>
	<ElInputNumber :size="elSize" v-bind="{ ...$props, ...$attrs }" />
</template>
