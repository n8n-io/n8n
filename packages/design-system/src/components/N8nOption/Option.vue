<script setup lang="ts">
import { ElOption } from 'element-plus';

defineProps({
	...ElOption.props,
	value: { type: [String, Number], required: true },
});
</script>

<template>
	<ElOption v-bind="{ ...$props, ...$attrs }" :value="value"><slot /></ElOption>
</template>
