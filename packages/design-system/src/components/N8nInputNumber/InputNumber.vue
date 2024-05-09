<script setup lang="ts">
import type { InputSize } from '@/types';
import { ElInputNumber } from 'element-plus';

type InputNumberProps = {
	size?: InputSize;
	min?: number;
	max?: number;
	step?: number;
	precision?: number;
};

defineProps<InputNumberProps>();
</script>

<template>
	<ElInputNumber v-bind="{ ...$props, ...$attrs }" />
</template>
