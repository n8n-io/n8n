<script setup lang="ts">
import {
	PaginationRoot,
	PaginationList,
	PaginationPrev,
	PaginationListItem,
	PaginationEllipsis,
	PaginationNext,
} from 'reka-ui';
import { computed, ref, useCssModule, watch } from 'vue';

import N8nOption from '../../../components/N8nOption';
import N8nSelect from '../../../components/N8nSelect';
import { useI18n } from '../../../composables/useI18n';
import type { PaginationProps } from './Pagination.types';

const $style = useCssModule();
const { t } = useI18n();

const props = withDefaults(defineProps<PaginationProps>(), {
	total: 0,
	currentPage: undefined,
	pageSize: undefined,
	pageSizes: () => [10, 20, 50, 100],
	background: false,
	hideOnSinglePage: false,
	pagerCount: 7,
	layout: 'prev, pager, next',
});

const emit = defineEmits<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:current-page': [page: number];
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:page-size': [size: number];
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'size-change': [size: number];
}>();

const page = ref(props.currentPage ?? 1);
const itemsPerPage = ref(props.pageSize ?? 10);

const totalPages = computed(() => Math.ceil(props.total / itemsPerPage.value));
const siblingCount = computed(() => Math.floor((props.pagerCount - 1) / 2));

const shouldShowPagination = computed(() => {
	if (!props.hideOnSinglePage) return true;
	return totalPages.value > 1;
});

const layoutParts = computed(() => {
	return props.layout.split(',').map((part) => part.trim());
});

const showTotal = computed(() => layoutParts.value.includes('total'));
const showSizes = computed(() => layoutParts.value.includes('sizes'));

watch(
	() => props.currentPage,
	(newValue) => {
		if (newValue !== undefined && newValue !== page.value) {
			page.value = newValue;
		}
	},
);

watch(
	() => props.pageSize,
	(newValue) => {
		if (newValue !== undefined && newValue !== itemsPerPage.value) {
			itemsPerPage.value = newValue;
		}
	},
);

// Handle page changes and emit events
function handlePageChange(newPage: number) {
	page.value = newPage;
	emit('update:current-page', newPage);
}

// Handle page size changes
function handlePageSizeChange(newSize: number) {
	itemsPerPage.value = newSize;
	page.value = 1; // Reset to first page
	emit('update:page-size', newSize);
	emit('size-change', newSize);
	emit('update:current-page', 1);
}
</script>

<template>
	<div
		v-if="shouldShowPagination"
		:class="[$style.Wrapper, { [$style.HasBackground]: background }]"
	>
		<span v-if="showTotal" :class="$style.Total">
			{{ t('pagination.total', { total }) }}
		</span>

		<PaginationRoot
			:total="total"
			:items-per-page="itemsPerPage"
			:page="page"
			:sibling-count="siblingCount"
			:show-edges="true"
			:class="$style.Pagination"
			@update:page="handlePageChange"
		>
			<PaginationList v-slot="{ items }" :class="$style.List">
				<PaginationPrev :class="[$style.Button, $style.ButtonPrev]">
					<slot name="prev-icon">
						<span>‹</span>
					</slot>
				</PaginationPrev>

				<template v-for="(item, index) in items" :key="index">
					<PaginationListItem
						v-if="item.type === 'page'"
						:value="item.value"
						:class="[$style.Button, $style.ButtonPage, { [$style.IsActive]: item.value === page }]"
					>
						{{ item.value }}
					</PaginationListItem>
					<PaginationEllipsis v-else :index="index" :class="$style.Ellipsis">
						&#8230;
					</PaginationEllipsis>
				</template>

				<PaginationNext :class="[$style.Button, $style.ButtonNext]">
					<slot name="next-icon">
						<span>›</span>
					</slot>
				</PaginationNext>
			</PaginationList>
		</PaginationRoot>

		<N8nSelect
			v-if="showSizes"
			:model-value="itemsPerPage"
			:class="$style.PageSizes"
			size="small"
			@update:model-value="handlePageSizeChange"
		>
			<N8nOption
				v-for="size in pageSizes"
				:key="size"
				:value="size"
				:label="`${size} / ${t('pagination.page')}`"
			/>
		</N8nSelect>
	</div>
</template>

<style module>
.Wrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--sm);
	height: 32px;
}

.Wrapper.HasBackground .Button {
	background: var(--color--background--light-2) !important;
}

.Wrapper.HasBackground .Button.IsActive {
	background: var(--color--primary--tint-3) !important;
}

.Total {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	margin-right: var(--spacing--4xs);
}

.List {
	display: flex;
	align-items: center;
	gap: 6px;
}

.Pagination {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: var(--font-size--sm);
	height: 32px;
	padding: 2px 0;
}

.Pagination.IsDisabled {
	opacity: 0.6;
	pointer-events: none;
}

.Button {
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
}

.Button :deep(button) {
	color: inherit;
	padding: 0;
}

.Button:hover:not(:disabled):not(.IsActive):not(.ButtonPrev):not(.ButtonNext):not(.ButtonFirst):not(
		.ButtonLast
	) {
	background: var(--color--background--light-3) !important;
	color: var(--color--primary);
	border: 1px solid var(--color--foreground);
}

.Button:hover:not(:disabled):not(.IsActive):not(.ButtonPrev):not(.ButtonNext):not(.ButtonFirst):not(
		.ButtonLast
	)
	:deep(button) {
	color: var(--color--primary);
	border: 1px solid var(--color--foreground);
}

.Button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.ButtonNext {
	margin-right: 8px;
}

.Button.IsActive {
	color: var(--color--primary);
	border: 1px solid var(--color--primary);
}

.Button.IsActive :deep(button) {
	color: var(--color--primary);
	border: 1px solid var(--color--primary);
}

.Button.IsActive:hover {
	background: var(--color--background--light-3) !important;
}

.Button.IsActive:hover :deep(button) {
	background: var(--color--background--light-3) !important;
}

.Ellipsis {
	min-width: 28px;
	height: 28px;
	color: var(--color--text--inverse);
	display: inline-block;
	text-align: center;
	user-select: none;
}

.PageSizes {
	min-width: 120px;
}
</style>
