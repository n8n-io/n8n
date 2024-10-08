<script setup lang="ts">
import { ElOption } from 'element-plus';

defineProps<{
	value: string | number | boolean;
	label?: string;
	disabled?: boolean;
}>();
</script>

<template>
	<ElOption v-bind="{ ...$props, ...$attrs }" :value="value"><slot /></ElOption>
</template>
