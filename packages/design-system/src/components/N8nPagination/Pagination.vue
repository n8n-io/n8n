<script setup lang="ts">
import { ElPagination, type PaginationProps } from 'element-plus';

interface Props extends Partial<Omit<PaginationProps, 'layout'>> {}
defineProps<Props>();
defineOptions({ name: 'N8nPagination' });
</script>

<template>
	<ElPagination
		class="is-background"
		layout="prev, pager, next"
		v-bind="{ ...$props, ...$attrs }"
	/>
</template>
