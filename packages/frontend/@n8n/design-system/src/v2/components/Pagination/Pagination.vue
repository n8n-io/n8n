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

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';

import type {
	PaginationEmits,
	PaginationProps,
	PaginationSlots,
	PaginationSizes,
} from './Pagination.types';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();

const props = withDefaults(defineProps<PaginationProps>(), {
	size: 'medium',
	hideOnSinglePage: false,
	defaultPage: 1,
	disabled: false,
	siblingCount: 1,
	showEdges: true,
});

const emit = defineEmits<PaginationEmits>();
defineSlots<PaginationSlots>();

const { t } = useI18n();

const internalPage = ref(
	props.currentPage ?? props.page ?? props.defaultCurrentPage ?? props.defaultPage ?? 1,
);
const itemsPerPage = ref(props.pageSize ?? props.itemsPerPage ?? props.defaultPageSize ?? 10);

const page = computed(() => props.currentPage ?? props.page ?? internalPage.value);

watch(
	() => props.currentPage ?? props.page,
	(controlledPage: number | undefined) => {
		if (controlledPage !== undefined) {
			internalPage.value = controlledPage;
		}
	},
);

watch(
	() => props.pageSize ?? props.itemsPerPage,
	(newSize: number | undefined) => {
		if (newSize !== undefined && newSize !== itemsPerPage.value) {
			itemsPerPage.value = newSize;
		}
	},
);

// pagerCount is an odd number in Element+ (e.g. 7 page buttons).
// siblingCount in Reka is pages on each side of the current page.
const siblingCount = computed(() => {
	if (props.pagerCount !== undefined) {
		return Math.floor((props.pagerCount - 1) / 2);
	}
	return props.siblingCount ?? 1;
});

const pageCount = computed(() => {
	if (props.pageCount !== undefined) return props.pageCount;
	if (!props.total || !itemsPerPage.value) return 1;
	return Math.ceil(props.total / itemsPerPage.value);
});

// pageCount takes precedence over total per DS-323
const totalItems = computed(() => {
	if (props.pageCount !== undefined) {
		return props.pageCount * itemsPerPage.value;
	}
	if (props.total !== undefined) return props.total;
	return 0;
});

const shouldHide = computed(() => props.hideOnSinglePage && pageCount.value <= 1);

const rootProps = useForwardPropsEmits(reactivePick(props, 'disabled', 'showEdges'), emit);

const prevPage = ref(page.value);

watch(
	() => page.value,
	(newPage) => {
		if (newPage === undefined) return;
		prevPage.value = newPage;
	},
);

const handlePageUpdate = (newPage: number) => {
	if (props.disabled) return;

	if (newPage < prevPage.value) {
		emit('prev-click', newPage);
	} else if (newPage > prevPage.value) {
		emit('next-click', newPage);
	}

	if (props.currentPage === undefined && props.page === undefined) {
		internalPage.value = newPage;
	}

	prevPage.value = newPage;

	emit('update:page', newPage);
	emit('update:currentPage', newPage);
	emit('current-change', newPage);
};

const sizes: Record<PaginationSizes, string> = {
	medium: $style.medium,
	small: $style.small,
};
const sizeClass = computed(() => sizes[props.size]);

const isPrevDisabled = computed(() => props.disabled || (page.value ?? 1) <= 1);
const isNextDisabled = computed(() => props.disabled || (page.value ?? 1) >= pageCount.value);

const handlePagerKeydown = (event: KeyboardEvent) => {
	if (props.disabled) return;
	if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

	const list = event.currentTarget;
	if (!(list instanceof HTMLElement)) return;

	const buttons = Array.from(list.querySelectorAll<HTMLElement>('button:not(:disabled)'));
	if (buttons.length === 0) return;

	const active = document.activeElement;
	const currentIndex = buttons.findIndex((button) => button === active || button.contains(active));
	if (currentIndex === -1) return;

	const nextIndex =
		event.key === 'ArrowRight'
			? Math.min(currentIndex + 1, buttons.length - 1)
			: Math.max(currentIndex - 1, 0);

	if (nextIndex === currentIndex) return;

	event.preventDefault();
	buttons[nextIndex]?.focus();
};
</script>

<template>
	<div
		v-if="!shouldHide"
		:class="['n8n-pagination', $style.paginationContainer, sizeClass]"
		data-test-id="pagination"
		v-bind="$attrs"
	>
		<PaginationRoot
			v-bind="rootProps"
			:page="page"
			:items-per-page="itemsPerPage"
			:total="totalItems"
			:sibling-count="siblingCount"
			:show-edges="showEdges"
			:disabled="disabled"
			@update:page="handlePageUpdate"
		>
			<PaginationList
				v-slot="{ items }"
				:class="$style.paginationList"
				data-test-id="pagination-list"
				@keydown="handlePagerKeydown"
			>
				<PaginationPrev as-child>
					<slot name="prev" :disabled="isPrevDisabled">
						<N8nButton
							v-if="prevText"
							variant="ghost"
							:size="size"
							:disabled="isPrevDisabled"
							:aria-label="t('pagination.previousPage')"
							data-test-id="pagination-prev"
						>
							{{ prevText }}
						</N8nButton>
						<N8nButton
							v-else
							variant="ghost"
							icon-only
							icon="chevron-left"
							:size="size"
							:disabled="isPrevDisabled"
							:aria-label="t('pagination.previousPage')"
							data-test-id="pagination-prev"
						/>
					</slot>
				</PaginationPrev>

				<template
					v-for="(item, index) in items"
					:key="item.type === 'ellipsis' ? `ellipsis-${index}` : item.value"
				>
					<PaginationEllipsis
						v-if="item.type === 'ellipsis'"
						:index="index"
						:class="$style.paginationEllipsis"
						data-test-id="pagination-ellipsis"
					>
						<span aria-hidden="true">&#8230;</span>
					</PaginationEllipsis>
					<PaginationListItem
						v-else
						:value="item.value"
						:class="$style.paginationItem"
						data-test-id="pagination-item"
					>
						{{ item.value }}
					</PaginationListItem>
				</template>

				<PaginationNext as-child>
					<slot name="next" :disabled="isNextDisabled">
						<N8nButton
							v-if="nextText"
							variant="ghost"
							:size="size"
							:disabled="isNextDisabled"
							:aria-label="t('pagination.nextPage')"
							data-test-id="pagination-next"
						>
							{{ nextText }}
						</N8nButton>
						<N8nButton
							v-else
							variant="ghost"
							icon-only
							icon="chevron-right"
							:size="size"
							:disabled="isNextDisabled"
							:aria-label="t('pagination.nextPage')"
							data-test-id="pagination-next"
						/>
					</slot>
				</PaginationNext>
			</PaginationList>
		</PaginationRoot>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.paginationContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.medium {
	.paginationItem,
	.paginationEllipsis {
		height: var(--height--md);
		min-width: var(--height--md);
	}
}

.small {
	font-size: var(--font-size--2xs);

	.paginationItem,
	.paginationEllipsis {
		height: var(--height--sm);
		min-width: var(--height--sm);
		font-size: var(--font-size--2xs);
	}
}

.paginationList {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.paginationItem,
.paginationEllipsis {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 var(--spacing--3xs);
	border: none;
	border-radius: var(--radius--3xs);
	background-color: transparent;
	user-select: none;
}

.paginationItem {
	cursor: pointer;
	font-weight: var(--font-weight--regular);
	box-shadow: inset 0 0 0 1px transparent;

	&:hover:not([data-selected]):not(:disabled) {
		background-color: var(--background--hover);
	}

	&[data-selected] {
		background-color: var(--background--active);
		cursor: default;
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
		box-shadow: inset 0 0 0 1px var(--focus--border-color);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.paginationEllipsis {
	pointer-events: none;
}
</style>
