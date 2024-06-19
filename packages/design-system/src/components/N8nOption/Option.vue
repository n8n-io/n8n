<script setup lang="ts">
import { ElOption, type IOptionProps } from 'element-plus';

defineOptions({ name: 'N8nOption' });

interface Props extends Partial<IOptionProps> {
	value: string | number;
}
defineProps<Props>();
</script>

<template>
	<ElOption v-bind="{ ...$props, ...$attrs }" :value="value"><slot /></ElOption>
</template>
