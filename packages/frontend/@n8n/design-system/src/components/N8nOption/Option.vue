<script setup lang="ts">
import { ElOption } from 'element-plus';

/**
 * @see https://element-plus.org/en-US/component/select.html#option-attributes
 */
type OptionProps = {
	value: string | number | boolean | object;
	label?: string | number;
	disabled?: boolean;
};
const props = defineProps<OptionProps>();
</script>

<template>
	<ElOption v-bind="props"><slot /></ElOption>
</template>
