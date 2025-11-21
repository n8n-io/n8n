<script setup lang="ts">
import {
	PaginationRoot,
	PaginationList,
	PaginationPrev,
	PaginationListItem,
	PaginationEllipsis,
	PaginationNext,
} from 'reka-ui';
import { ref } from 'vue';
import type { PaginationProps } from './Pagination.types';

const props = withDefaults(defineProps<PaginationProps>(), {
	total: 0,
	currentPage: undefined,
	pageSize: undefined,
});

const emit = defineEmits<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:current-page': [page: number];
}>();

const page = ref(props.currentPage ?? 1);
const itemsPerPage = ref(props.pageSize ?? 10);

// Handle page changes and emit events
function handlePageChange(newPage: number) {
	page.value = newPage;

	emit('update:current-page', newPage);
}
</script>

<template>
	<PaginationRoot
		:total="total"
		:items-per-page="itemsPerPage"
		:page="props.currentPage"
		:sibling-count="2"
		:show-edges="true"
		:class="{
			'n8n-pagination': true,
		}"
		@update:page="handlePageChange"
	>
		<PaginationList v-slot="{ items }">
			<PaginationPrev class="n8n-pagination__button n8n-pagination__button--prev">
				<slot name="prev-icon">
					<span>‹</span>
				</slot>
			</PaginationPrev>

			<template v-for="(item, index) in items" :key="index">
				<PaginationListItem
					v-if="item.type === 'page'"
					:value="item.value"
					:class="{
						'n8n-pagination__button': true,
						'n8n-pagination__button--page': true,
						'is-active': item.value === page,
					}"
				>
					{{ item.value }}
				</PaginationListItem>
				<PaginationEllipsis v-else :index="index" class="n8n-pagination__ellipsis">
					&#8230;
				</PaginationEllipsis>
			</template>

			<PaginationNext class="n8n-pagination__button n8n-pagination__button--next">
				<slot name="next-icon">
					<span>›</span>
				</slot>
			</PaginationNext>
		</PaginationList>
	</PaginationRoot>
</template>

<style lang="scss" scoped>
.n8n-pagination {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: var(--font-size--sm);
	height: 32px;
	padding: 2px 0;
	&.is-disabled {
		opacity: 0.6;
		pointer-events: none;
	}
}

.n8n-pagination__button {
	min-width: 28px;
	height: 28px;
	padding: 0 6px;
	margin: 0 2px;
	border: none;
	background: transparent !important;
	border-radius: var(--radius);
	cursor: pointer;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--inverse);
	transition: color 0.2s ease;
	user-select: none;

	&:hover:not(:disabled):not(.is-active):not(.n8n-pagination__button--prev):not(
			.n8n-pagination__button--next
		):not(.n8n-pagination__button--first):not(.n8n-pagination__button--last) {
		background: var(--color--background--light-3) !important;
		color: var(--color--primary);
		border: 1px solid var(--color--foreground);
		:deep(button) {
			color: var(--color--primary);
			border: 1px solid var(--color--foreground);
		}
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&--next {
		margin-right: 8px;
	}

	&.is-active {
		color: var(--color--primary);
		border: 1px solid var(--color--primary);
		:deep(button) {
			color: var(--color--primary);
			border: 1px solid var(--color--primary);
		}
		&:hover {
			background: var(--color--background--light-3) !important;
			:deep(button) {
				background: var(--color--background--light-3) !important;
			}
		}
	}
}

.n8n-pagination__ellipsis {
	min-width: 28px;
	height: 28px;
	color: var(--color--text--inverse);
	display: inline-block;
	text-align: center;
	user-select: none;
}
</style>
