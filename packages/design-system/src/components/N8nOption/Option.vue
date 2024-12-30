<script setup lang="ts">
import { ElOption } from 'element-plus';

const props = defineProps({
	...ElOption.props,
	value: { type: [String, Number, Boolean, Object], required: true },
});
</script>

<template>
	<ElOption v-bind="{ ...$props, ...$attrs }" :value="props.value"><slot /></ElOption>
</template>
