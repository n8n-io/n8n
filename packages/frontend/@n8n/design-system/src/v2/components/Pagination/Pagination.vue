<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import {
	PaginationRoot,
	PaginationList,
	PaginationListItem,
	PaginationPrev,
	PaginationNext,
	PaginationEllipsis,
	useForwardPropsEmits,
} from 'reka-ui';
import { computed, useCssModule, ref, watch } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nSelect from '@n8n/design-system/v2/components/Select/Select.vue';

import type {
	PaginationEmits,
	PaginationProps,
	PaginationSlots,
	PaginationSizes,
	PaginationVariants,
} from './Pagination.types';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();

const props = withDefaults(defineProps<PaginationProps>(), {
	variant: 'default',
	size: 'small',
	background: false,
	layout: 'prev, pager, next',
	pageSizes: () => [10, 20, 30, 40, 50, 100],
	hideOnSinglePage: false,
	prevIcon: 'chevron-left',
	nextIcon: 'chevron-right',
	defaultPage: 1,
	disabled: false,
	siblingCount: 1,
	showEdges: false,
});

const emit = defineEmits<PaginationEmits>();
const slots = defineSlots<PaginationSlots>();

// Prop mapping: Element+ → Reka UI
const page = computed(
	() => props.currentPage ?? props.page ?? props.defaultCurrentPage ?? props.defaultPage,
);
const itemsPerPage = ref(props.pageSize ?? props.itemsPerPage ?? props.defaultPageSize ?? 10);

// Watch for external pageSize/itemsPerPage changes and sync
watch(
	() => props.pageSize ?? props.itemsPerPage,
	(newSize: number | undefined) => {
		if (newSize !== undefined && newSize !== itemsPerPage.value) {
			itemsPerPage.value = newSize;
		}
	},
);

// pagerCount is odd number in Element+ (e.g., 7 means show 7 buttons total: prev + 5 pages + next)
// siblingCount in Reka UI means pages on each side of current page
// pagerCount 7 = 1 current + 2*siblingCount + prev + next, so siblingCount = (7-1)/2 = 3
// But actually pagerCount includes only the page numbers, not prev/next buttons
// pagerCount 7 means: [1] [ellipsis] [5] [6] [7] [8] [9] [ellipsis] [10]
// So if pagerCount is 7, we want to show current + 3 on each side = siblingCount of 3
const siblingCount = computed(() => {
	if (props.pagerCount !== undefined) {
		// pagerCount is total page buttons shown, including current
		// For odd pagerCount, siblingCount = (pagerCount - 1) / 2
		return Math.floor((props.pagerCount - 1) / 2);
	}
	return props.siblingCount ?? 1;
});

// Calculate total pages
const pageCount = computed(() => {
	if (props.pageCount !== undefined) return props.pageCount;
	if (!props.total || !itemsPerPage.value) return 1;
	return Math.ceil(props.total / itemsPerPage.value);
});

// Calculate total items for Reka UI (when using pageCount, we need to synthesize total)
// pageCount takes precedence over total per DS-323 requirement
const totalItems = computed(() => {
	if (props.pageCount !== undefined) {
		// Synthesize total from pageCount * itemsPerPage
		return props.pageCount * itemsPerPage.value;
	}
	if (props.total !== undefined) return props.total;
	return 0;
});

// Hide component when only one page
const shouldHide = computed(() => props.hideOnSinglePage && pageCount.value <= 1);

// Layout parsing
const layoutParts = computed(() => props.layout?.split(',').map((s) => s.trim()) ?? []);
const showPrev = computed(() => layoutParts.value.includes('prev'));
const showNext = computed(() => layoutParts.value.includes('next'));
const showPager = computed(() => layoutParts.value.includes('pager'));

// Deduplicated layout parts - group prev/pager/next into single 'pager-group' entry
// The pager group renders at the position of the first pager-related part encountered
const deduplicatedLayoutParts = computed(() => {
	const pagerParts = new Set(['prev', 'pager', 'next']);
	const result: string[] = [];
	let pagerGroupAdded = false;

	for (const part of layoutParts.value) {
		if (pagerParts.has(part)) {
			if (!pagerGroupAdded) {
				result.push('pager-group');
				pagerGroupAdded = true;
			}
			// Skip subsequent pager parts
		} else {
			result.push(part);
		}
	}
	return result;
});

// Forward props to Reka UI
const rootProps = useForwardPropsEmits(reactivePick(props, 'disabled', 'showEdges'), emit);

// Internal page size state for v-model:page-size
const internalPageSize = ref(itemsPerPage.value);

// Track previous page for directional events
const prevPage = ref(page.value);

// Handle page updates
const handlePageUpdate = (newPage: number) => {
	// Emit directional events based on page change
	if (newPage < prevPage.value) {
		emit('prev-click', newPage);
	} else if (newPage > prevPage.value) {
		emit('next-click', newPage);
	}

	prevPage.value = newPage;

	emit('update:page', newPage);
	emit('update:currentPage', newPage);
	emit('current-change', newPage);
};

// Handle page size updates
const handlePageSizeUpdate = (newSize: number | string) => {
	const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
	internalPageSize.value = size;
	emit('update:pageSize', size);
	emit('size-change', size);

	// Reset to first page when page size changes
	handlePageUpdate(1);
};

// Styles
const variants: Record<PaginationVariants, string> = {
	default: $style.default,
	ghost: $style.ghost,
};
const variant = computed(() => variants[props.variant]);

const sizes: Record<PaginationSizes, string> = {
	small: $style.small,
	medium: $style.medium,
};
const size = computed(() => sizes[props.size]);

// Background class
const backgroundClass = computed(() => (props.background ? $style.background : ''));

// Page size selector items
const pageSizeItems = computed(() =>
	props.pageSizes.map((s) => ({ value: String(s), label: `${s} / page` })),
);

// Total text
const totalText = computed(() => {
	if (props.total === undefined) return '';
	return `Total ${props.total}`;
});

// Jumper state
const jumperValue = ref<string>('');
const handleJumperSubmit = () => {
	const targetPage = parseInt(jumperValue.value, 10);
	if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= pageCount.value) {
		handlePageUpdate(targetPage);
		jumperValue.value = '';
	}
};
</script>

<template>
	<div
		v-if="!shouldHide"
		:class="['n8n-pagination', $style.paginationContainer, variant, size, backgroundClass]"
		v-bind="$attrs"
	>
		<!-- Render layout parts in order specified by layout prop -->
		<template v-for="part in deduplicatedLayoutParts" :key="part">
			<!-- Total count -->
			<div v-if="part === 'total'" :class="$style.total">
				{{ totalText }}
			</div>

			<!-- Page size selector -->
			<N8nSelect
				v-else-if="part === 'sizes'"
				:model-value="String(internalPageSize)"
				:items="pageSizeItems"
				:size="props.size === 'small' ? 'xsmall' : 'small'"
				:variant="props.variant === 'ghost' ? 'ghost' : 'default'"
				:disabled="disabled"
				:class="$style.pageSizeSelect"
				@update:model-value="handlePageSizeUpdate"
			/>

			<!-- Pager (prev, pages, next) -->
			<PaginationRoot
				v-else-if="part === 'pager-group'"
				v-bind="rootProps"
				:page="page"
				:items-per-page="itemsPerPage"
				:total="totalItems"
				:sibling-count="siblingCount"
				:show-edges="showEdges"
				@update:page="handlePageUpdate"
			>
				<PaginationList v-slot="{ items }" :class="$style.paginationList">
					<!-- Previous button -->
					<PaginationPrev v-if="showPrev" v-slot="slotProps" :class="$style.paginationButton">
						<slot name="prev" v-bind="slotProps">
							<span v-if="prevText">{{ prevText }}</span>
							<Icon v-else :icon="prevIcon" />
						</slot>
					</PaginationPrev>

					<!-- Page items -->
					<template v-if="showPager">
						<template
							v-for="(item, index) in items"
							:key="item.type === 'ellipsis' ? `ellipsis-${index}` : item.value"
						>
							<!-- Ellipsis button -->
							<PaginationEllipsis
								v-if="item.type === 'ellipsis'"
								:index="index"
								:class="[$style.paginationEllipsis, $style.paginationButton]"
							>
								<span aria-hidden="true">&#8230;</span>
							</PaginationEllipsis>
							<PaginationListItem v-else :value="item.value" :class="$style.paginationItem">
								{{ item.value }}
							</PaginationListItem>
						</template>
					</template>

					<!-- Next button -->
					<PaginationNext v-if="showNext" v-slot="slotProps" :class="$style.paginationButton">
						<slot name="next" v-bind="slotProps">
							<span v-if="nextText">{{ nextText }}</span>
							<Icon v-else :icon="nextIcon" />
						</slot>
					</PaginationNext>
				</PaginationList>
			</PaginationRoot>

			<!-- Page jumper -->
			<div v-else-if="part === 'jumper'" :class="$style.jumper">
				<span :class="$style.jumperText">Go to</span>
				<input
					v-model="jumperValue"
					type="number"
					:min="1"
					:max="pageCount"
					:class="$style.jumperInput"
					:disabled="disabled"
					@keyup.enter="handleJumperSubmit"
				/>
			</div>
		</template>
	</div>
</template>

<style module>
.paginationContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.default {
	/* Default styling */
}

.ghost {
	/* Ghost variant */
}

.small {
	font-size: var(--font-size--2xs);
}

.medium {
	font-size: var(--font-size--xs);
}

.background {
	/* Applied when background prop is true */
}

.total {
	color: var(--color--text--tint-1);
	margin-right: var(--spacing--2xs);
}

.pageSizeSelect {
	margin-right: var(--spacing--2xs);
}

.paginationList {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* Prev/Next buttons - minimal style like Element+ */
.paginationButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius);
	border: none;
	background-color: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
	user-select: none;
	transition: color 0.2s;

	&:hover:not([data-disabled]) {
		color: var(--color--primary);
	}

	&[data-disabled] {
		cursor: not-allowed;
		color: var(--color--text--tint-2);
	}
}

/* Page number buttons - minimal style like Element+ */
.paginationItem {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius);
	border: 1px solid transparent;
	background-color: transparent;
	color: var(--color--text--shade-1);
	cursor: pointer;
	user-select: none;
	transition: all 0.2s;
	font-weight: var(--font-weight--regular);

	&:hover:not([data-selected]):not([data-disabled]) {
		color: var(--color--primary);
	}

	&[data-selected] {
		border-color: var(--color--primary);
		color: var(--color--primary);
		font-weight: var(--font-weight--bold);
		cursor: default;
	}

	&[data-disabled] {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

/* Background variant - filled style */
.background .paginationItem {
	background-color: var(--color--background--light-2);
	border-color: var(--color--foreground);

	&[data-selected] {
		background-color: var(--color--primary);
		border-color: var(--color--primary);
		color: white;
	}
}

/* Ellipsis - minimal style */
.paginationEllipsis {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: var(--spacing--lg);
	height: var(--spacing--lg);
	color: var(--color--text--tint-1);
	user-select: none;
	border: none;
	background: transparent;

	&:not([disabled]) {
		cursor: pointer;

		&:hover {
			color: var(--color--primary);
		}
	}
}

.jumper {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-left: var(--spacing--2xs);
}

.jumperText {
	color: var(--color--text--tint-1);
}

.jumperInput {
	width: 50px;
	height: var(--spacing--lg);
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-3);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--2xs);
	text-align: center;

	&:focus {
		outline: none;
		border-color: var(--color--primary);
		box-shadow: 0 0 0 2px var(--color--secondary);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		background-color: var(--color--background--light-2);
	}

	/* Hide number input spinners */
	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	&[type='number'] {
		-moz-appearance: textfield;
	}
}

.medium .paginationButton,
.medium .paginationItem,
.medium .jumperInput {
	height: 36px;
	min-width: 36px;
}
</style>
