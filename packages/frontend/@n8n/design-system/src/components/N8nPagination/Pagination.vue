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
	// Core props
	currentPage?: number;
	defaultCurrentPage?: number;
	pageSize?: number;
	defaultPageSize?: number;
	total: number;
	pageCount?: number;

	// Configuration
	pagerCount?: number; // Maps to siblingCount in Reka UI
	layout?: string; // Controls which buttons to show
	pageSizes?: number[]; // Not used by pagination itself, but kept for compatibility

	// Appearance
	small?: boolean;
	background?: boolean;
	disabled?: boolean;
	hideOnSinglePage?: boolean;

	// Text/Icons
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

// Use v-model for currentPage (1-based to match ElementPlus API)
const pageModel = defineModel<number>('currentPage', {
	default: undefined,
});

// Internal page state (1-based to match ElementPlus API)
const page = ref(props.currentPage ?? pageModel.value ?? props.defaultCurrentPage ?? 1);

// Sync page with prop changes
watch(
	() => props.currentPage,
	(newValue) => {
		if (newValue !== undefined && newValue !== page.value) {
			page.value = newValue;
		}
	},
);

// Sync page with model changes
watch(pageModel, (newValue) => {
	if (newValue !== undefined && newValue !== page.value) {
		page.value = newValue;
	}
});

// Use v-model for pageSize
const pageSizeModel = defineModel<number>('pageSize', {
	default: undefined,
});

// Internal itemsPerPage state
const itemsPerPage = ref(props.pageSize ?? pageSizeModel.value ?? props.defaultPageSize ?? 10);

// Sync itemsPerPage with prop changes
watch(
	() => props.pageSize,
	(newValue) => {
		if (newValue !== undefined && newValue !== itemsPerPage.value) {
			itemsPerPage.value = newValue;
		}
	},
);

// Sync itemsPerPage with model changes
watch(pageSizeModel, (newValue) => {
	if (newValue !== undefined && newValue !== itemsPerPage.value) {
		itemsPerPage.value = newValue;
	}
});

// Compute siblingCount from pagerCount
// pagerCount in ElementPlus is total visible page numbers
// siblingCount in Reka UI is pages on each side of current
// Approximate conversion: siblingCount ≈ (pagerCount - 1) / 2
const siblingCount = computed(() => {
	return Math.max(1, Math.floor((props.pagerCount - 1) / 2));
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
	// Update model if using v-model
	if (pageModel.value !== undefined) {
		pageModel.value = newPage;
	}
	emit('update:current-page', newPage);
	emit('current-change', newPage);
}

// Handle prev/next clicks
function handlePrevClick(currentPage: number) {
	emit('prev-click', currentPage);
}

function handleNextClick(currentPage: number) {
	emit('next-click', currentPage);
}

// Check if pagination should be hidden
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
			<!-- First button -->
			<PaginationFirst
				v-if="layoutParts.showFirst"
				class="n8n-pagination__button n8n-pagination__button--first"
				@click="handlePrevClick(page)"
			>
				<slot name="prev-icon" :disabled="disabled">
					{{ prevText || '«' }}
				</slot>
			</PaginationFirst>

			<!-- Previous button -->
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

			<!-- Page numbers -->
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

			<!-- Next button -->
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

			<!-- Last button -->
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
	gap: 4px;
	font-size: var(--font-size--sm);

	&.is-small {
		font-size: 12px;

		.n8n-pagination__button {
			min-width: 28px;
			height: 28px;
			font-size: 12px;
		}
	}

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
	min-width: 32px;
	height: 32px;
	padding: 0 8px;
	border: none;
	background: transparent !important;
	border-radius: var(--radius);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--sm);
	color: var(--color--text--inverse);
	transition: color 0.2s ease;
	user-select: none;

	// Override any nested button or element styles
	:deep(button) {
		background: transparent !important;
		color: inherit;
		border: none;
		padding: 0;
	}

	&:hover:not(:disabled):not(.is-active) {
		background: transparent !important;
		color: var(--color--primary);

		:deep(button) {
			background: transparent !important;
			color: var(--color--primary);
		}
	}

	&:active:not(:disabled) {
		transform: scale(0.98);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&.is-active {
		background: transparent !important;
		color: var(--color--primary);
		border: none;
		font-weight: 600;

		:deep(button) {
			background: transparent !important;
			color: var(--color--primary);
			border: none;
		}

		&:hover {
			background: transparent !important;
			color: var(--color--primary);

			:deep(button) {
				background: transparent !important;
				color: var(--color--primary);
			}
		}
	}
}

.n8n-pagination__ellipsis {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 32px;
	height: 32px;
	color: var(--color--text--inverse);
	user-select: none;
	background: transparent !important;
}
</style>
