<script setup lang="ts">
import { paginationProps, ElPagination } from 'element-plus';

defineProps({
	...paginationProps,
});
</script>

<template>
	<ElPagination
		class="is-background"
		layout="prev, pager, next"
		v-bind="{ ...$props, ...$attrs }"
	/>
</template>
