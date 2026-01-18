<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import { ElPagination } from 'element-plus';
import { N8nOption, N8nSelect } from '@n8n/design-system';
const { pageSize, total, currentPage } = defineProps<{
	pageSize: number;
	total: number;
	currentPage: number;
}>();

const emit = defineEmits<{ 'update:current-page': [number]; 'update:page-size': [number] }>();

const i18n = useI18n();
const pageSizes = [1, 10, 25, 50, 100];
</script>

<template>
	<div :class="$style.pagination" data-test-id="ndv-data-pagination">
		<ElPagination
			background
			:hide-on-single-page="true"
			:current-page="currentPage"
			:pager-count="5"
			:page-size="pageSize"
			layout="prev, pager, next"
			:total="total"
			@update:current-page="(value: number) => emit('update:current-page', value)"
		>
		</ElPagination>

		<div :class="$style.pageSizeSelector">
			<N8nSelect
				size="mini"
				:model-value="pageSize"
				teleported
				@update:model-value="(value: number) => emit('update:page-size', value)"
			>
				<template #prepend>{{ i18n.baseText('ndv.output.pageSize') }}</template>
				<N8nOption v-for="size in pageSizes" :key="size" :label="size" :value="size"> </N8nOption>
				<N8nOption :label="i18n.baseText('ndv.output.all')" :value="total"> </N8nOption>
			</N8nSelect>
		</div>
	</div>
</template>

<style lang="scss" module>
.pagination {
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 5px;
	overflow-y: hidden;
	flex-shrink: 0;
	flex-grow: 0;
}

.pageSizeSelector {
	text-transform: capitalize;
	max-width: 150px;
	flex: 0 1 auto;
}
</style>
