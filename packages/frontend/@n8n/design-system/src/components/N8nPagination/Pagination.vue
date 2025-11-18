<script setup lang="ts">
import {
	PaginationRoot,
	PaginationList,
	PaginationFirst,
	PaginationPrev,
	PaginationListItem,
	PaginationEllipsis,
	PaginationNext,
	PaginationLast,
} from 'reka-ui';
import { computed, ref, watch, type Component } from 'vue';

interface Props {
	currentPage?: number;
	defaultCurrentPage?: number;
	pageSize?: number;
	defaultPageSize?: number;
	total: number;
	pageCount?: number;

	pagerCount?: number; // Maps to siblingCount in Reka UI
	layout?: string; // Controls which buttons to show
	pageSizes?: number[]; // Not used by pagination itself, but kept for compatibility

	small?: boolean;
	background?: boolean;
	disabled?: boolean;
	hideOnSinglePage?: boolean;

	prevText?: string;
	prevIcon?: string | Component;
	nextText?: string;
	nextIcon?: string | Component;
}

const props = withDefaults(defineProps<Props>(), {
	currentPage: undefined,
	defaultCurrentPage: 1,
	pageSize: undefined,
	defaultPageSize: 10,
	pagerCount: 7,
	layout: 'prev, pager, next',
	pageSizes: () => [10, 20, 30, 40, 50, 100],
	small: false,
	background: true,
	disabled: false,
	hideOnSinglePage: false,
	prevText: '',
	nextText: '',
});

const emit = defineEmits<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:current-page': [page: number];
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:page-size': [pageSize: number];
	'current-change': [page: number];
	'size-change': [pageSize: number];
	'prev-click': [page: number];
	'next-click': [page: number];
}>();

const pageModel = defineModel<number>('currentPage', {
	default: undefined,
});

const page = ref(props.currentPage ?? pageModel.value ?? props.defaultCurrentPage ?? 1);

watch(
	() => props.currentPage,
	(newValue) => {
		if (newValue !== undefined && newValue !== page.value) {
			page.value = newValue;
		}
	},
);

watch(pageModel, (newValue) => {
	if (newValue !== undefined && newValue !== page.value) {
		page.value = newValue;
	}
});

const pageSizeModel = defineModel<number>('pageSize', {
	default: undefined,
});

const itemsPerPage = ref(props.pageSize ?? pageSizeModel.value ?? props.defaultPageSize ?? 10);

watch(
	() => props.pageSize,
	(newValue) => {
		if (newValue !== undefined && newValue !== itemsPerPage.value) {
			itemsPerPage.value = newValue;
		}
	},
);

watch(pageSizeModel, (newValue) => {
	if (newValue !== undefined && newValue !== itemsPerPage.value) {
		itemsPerPage.value = newValue;
	}
});

// ensures 2 sibling elements exist around the central selected item in larger lists.
const siblingCount = computed(() => {
	const maxSiblingCount = 2;
	const calculated = Math.max(1, Math.floor((props.pagerCount - 1) / 2));
	return Math.min(calculated, maxSiblingCount);
});

// Parse layout string to determine which components to show
const layoutParts = computed(() => {
	const parts = props.layout.split(',').map((p) => p.trim().toLowerCase());
	return {
		showFirst: parts.includes('first'),
		showPrev: parts.includes('prev'),
		showPager: parts.includes('pager'),
		showNext: parts.includes('next'),
		showLast: parts.includes('last'),
	};
});

// Handle page changes and emit events
function handlePageChange(newPage: number) {
	page.value = newPage;
	if (pageModel.value !== undefined) {
		pageModel.value = newPage;
	}
	emit('update:current-page', newPage);
	emit('current-change', newPage);
}

function handlePrevClick(currentPage: number) {
	emit('prev-click', currentPage);
}

function handleNextClick(currentPage: number) {
	emit('next-click', currentPage);
}

const shouldShowPagination = computed(() => {
	if (props.hideOnSinglePage) {
		const totalPages = Math.ceil(props.total / itemsPerPage.value);
		return totalPages > 1;
	}
	return true;
});
</script>

<template>
	<PaginationRoot
		v-if="shouldShowPagination"
		:total="total"
		:items-per-page="itemsPerPage"
		:page="page"
		:sibling-count="siblingCount"
		:show-edges="true"
		:disabled="disabled"
		:class="{
			'n8n-pagination': true,
			'is-background': background,
			'is-small': small,
			'is-disabled': disabled,
		}"
		@update:page="handlePageChange"
	>
		<PaginationList v-slot="{ items }">
			<PaginationFirst
				v-if="layoutParts.showFirst"
				class="n8n-pagination__button n8n-pagination__button--first"
				@click="handlePrevClick(page)"
			>
				<slot name="prev-icon" :disabled="disabled">
					{{ prevText || '«' }}
				</slot>
			</PaginationFirst>

			<PaginationPrev
				v-if="layoutParts.showPrev"
				class="n8n-pagination__button n8n-pagination__button--prev"
				@click="handlePrevClick(page)"
			>
				<slot name="prev-icon" :disabled="disabled">
					<component v-if="prevIcon" :is="prevIcon" />
					<span v-else>{{ prevText || '‹' }}</span>
				</slot>
			</PaginationPrev>

			<template v-if="layoutParts.showPager">
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
			</template>

			<PaginationNext
				v-if="layoutParts.showNext"
				class="n8n-pagination__button n8n-pagination__button--next"
				@click="handleNextClick(page)"
			>
				<slot name="next-icon" :disabled="disabled">
					<component v-if="nextIcon" :is="nextIcon" />
					<span v-else>{{ nextText || '›' }}</span>
				</slot>
			</PaginationNext>

			<PaginationLast
				v-if="layoutParts.showLast"
				class="n8n-pagination__button n8n-pagination__button--last"
				@click="handleNextClick(page)"
			>
				<slot name="next-icon" :disabled="disabled">
					{{ nextText || '»' }}
				</slot>
			</PaginationLast>
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

// Override Reka UI default styles and any button elements
:deep(button),
:deep([data-pagination-root]),
:deep([data-pagination-list]),
:deep([data-pagination-item]),
:deep([data-pagination-ellipsis]),
:deep([data-pagination-first]),
:deep([data-pagination-prev]),
:deep([data-pagination-next]),
:deep([data-pagination-last]) {
	background: transparent !important;
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
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--inverse);
	transition: color 0.2s ease;
	user-select: none;

	:deep(button) {
		color: inherit;
		padding: 0;
	}

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

	&:active:not(:disabled) {
		transform: scale(0.98);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&--prev,
	&--next,
	&--first,
	&--last {
		font-size: 14px;
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
	display: inline-flex;
	align-items: center;
	justify-content: center;
	user-select: none;
}
</style>
