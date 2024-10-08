<script setup lang="ts">
import { ElPagination } from 'element-plus';

defineProps<{
	background?: boolean;
	pagerCount?: number;
	pageSize?: number;
	total?: number;
	currentPage?: number;
	layout?: string;
}>();

defineEmits<{
	'update:currentPage': [page: number];
}>();
</script>

<template>
	<ElPagination
		class="is-background"
		:background="background"
		:pager-count="pagerCount"
		:page-size="pageSize"
		:total="total"
		:current-page="currentPage"
		:layout="layout"
		@update:current-page="(page) => $emit('update:currentPage', page)"
	/>
</template>
