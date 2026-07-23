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
import N8nSelect from '@n8n/design-system/v2/components/Select/Select.vue';

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
defineSlots<PaginationSlots>();

const { t } = useI18n();

const page = computed(
	() => props.currentPage ?? props.page ?? props.defaultCurrentPage ?? props.defaultPage,
);
const itemsPerPage = ref(props.pageSize ?? props.itemsPerPage ?? props.defaultPageSize ?? 10);

watch(
	() => props.pageSize ?? props.itemsPerPage,
	(newSize: number | undefined) => {
		if (newSize !== undefined && newSize !== itemsPerPage.value) {
			itemsPerPage.value = newSize;
		}
	},
);

// Map Element+ pagerCount (odd total page buttons) to Reka siblingCount.
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

// pageCount takes precedence over total (DS-323); synthesize Reka total when needed.
const totalItems = computed(() => {
	if (props.pageCount !== undefined) {
		return props.pageCount * itemsPerPage.value;
	}
	if (props.total !== undefined) return props.total;
	return 0;
});

const shouldHide = computed(() => props.hideOnSinglePage && pageCount.value <= 1);

const layoutParts = computed(() => props.layout?.split(',').map((s) => s.trim()) ?? []);

// Collapse prev/pager/next into one pager-group at the first pager-related part.
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
		} else {
			result.push(part);
		}
	}
	return result;
});

const rootProps = useForwardPropsEmits(reactivePick(props, 'disabled', 'showEdges'), emit);

const internalPageSize = ref(itemsPerPage.value);

const prevPage = ref(page.value);
const jumperValue = ref(String(page.value ?? 1));

watch(
	() => page.value,
	(newPage) => {
		if (newPage === undefined) return;
		prevPage.value = newPage;
		jumperValue.value = String(newPage);
	},
);

const handlePageUpdate = (newPage: number) => {
	if (props.disabled) return;

	if (newPage < prevPage.value) {
		emit('prev-click', newPage);
	} else if (newPage > prevPage.value) {
		emit('next-click', newPage);
	}

	prevPage.value = newPage;
	jumperValue.value = String(newPage);

	emit('update:page', newPage);
	emit('update:currentPage', newPage);
	emit('current-change', newPage);
};

const handlePageSizeUpdate = (newSize: number | string) => {
	if (props.disabled) return;

	const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
	internalPageSize.value = size;
	emit('update:pageSize', size);
	emit('size-change', size);

	handlePageUpdate(1);
};

const sizes: Record<PaginationSizes, string> = {
	medium: $style.medium,
	small: $style.small,
};
const sizeClass = computed(() => sizes[props.size]);

const pageSizeItems = computed(() =>
	props.pageSizes.map((s) => ({
		value: String(s),
		label: t('pagination.pageSize', { size: s }),
	})),
);

const commitJumperValue = () => {
	if (props.disabled) return;

	const parsed = parseInt(jumperValue.value, 10);
	if (isNaN(parsed)) {
		jumperValue.value = String(prevPage.value);
		return;
	}

	const targetPage = Math.min(Math.max(parsed, 1), pageCount.value);
	jumperValue.value = String(targetPage);

	if (targetPage !== prevPage.value) {
		handlePageUpdate(targetPage);
	}
};

const onJumperKeydown = (event: KeyboardEvent) => {
	if (event.key !== 'Enter') return;
	if (!(event.target instanceof HTMLInputElement)) return;
	event.target.blur();
};

const onJumperFocus = (event: FocusEvent) => {
	if (!(event.target instanceof HTMLInputElement)) return;
	event.target.select();
};

const onJumperBlur = () => {
	commitJumperValue();
};

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
		:class="[
			'n8n-pagination',
			$style.paginationContainer,
			sizeClass,
			{ [$style.isDisabled]: disabled },
		]"
		data-test-id="pagination"
		v-bind="$attrs"
	>
		<template v-for="part in deduplicatedLayoutParts" :key="part">
			<div v-if="part === 'total'" :class="$style.total" data-test-id="pagination-total">
				{{ total === undefined ? '' : t('pagination.total', { total }) }}
			</div>

			<N8nSelect
				v-else-if="part === 'sizes'"
				:model-value="String(internalPageSize)"
				:items="pageSizeItems"
				:size="size"
				:disabled="disabled"
				data-test-id="pagination-sizes"
				@update:model-value="handlePageSizeUpdate"
			/>

			<PaginationRoot
				v-else-if="part === 'pager-group'"
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
					<PaginationPrev v-if="layoutParts.includes('prev')" as-child>
						<slot name="prev">
							<N8nButton
								v-if="prevText"
								variant="ghost"
								:size="size"
								:aria-label="t('pagination.previousPage')"
								data-test-id="pagination-prev"
							>
								{{ prevText }}
							</N8nButton>
							<N8nButton
								v-else
								variant="ghost"
								icon-only
								:icon="prevIcon"
								:size="size"
								:aria-label="t('pagination.previousPage')"
								data-test-id="pagination-prev"
							/>
						</slot>
					</PaginationPrev>

					<template v-if="layoutParts.includes('pager')">
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
					</template>

					<PaginationNext v-if="layoutParts.includes('next')" as-child>
						<slot name="next">
							<N8nButton
								v-if="nextText"
								variant="ghost"
								:size="size"
								:aria-label="t('pagination.nextPage')"
								data-test-id="pagination-next"
							>
								{{ nextText }}
							</N8nButton>
							<N8nButton
								v-else
								variant="ghost"
								icon-only
								:icon="nextIcon"
								:size="size"
								:aria-label="t('pagination.nextPage')"
								data-test-id="pagination-next"
							/>
						</slot>
					</PaginationNext>
				</PaginationList>
			</PaginationRoot>

			<div
				v-else-if="part === 'jumper'"
				:class="$style.jumper"
				:style="{ '--jumper-digits': Math.max(String(jumperValue).length, 1) }"
				data-test-id="pagination-jumper"
			>
				<span :class="$style.jumperPrefix">{{ t('pagination.goTo') }}</span>
				<input
					v-model="jumperValue"
					type="number"
					:min="1"
					:max="pageCount"
					step="1"
					:class="$style.jumperInput"
					:disabled="disabled"
					:aria-label="t('pagination.goToPage')"
					data-test-id="pagination-jumper-input"
					@focus="onJumperFocus"
					@blur="onJumperBlur"
					@keydown="onJumperKeydown"
				/>
			</div>
		</template>
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

	.total {
		font-size: var(--font-size--2xs);
	}

	.jumper {
		--jumper-height: var(--height--md);
		--jumper-inset: var(--spacing--xs);
		--jumper-font-size: var(--font-size--sm);
		--jumper-radius: var(--radius--3xs);
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

	.total {
		font-size: var(--font-size--3xs);
	}

	.jumper {
		--jumper-height: var(--height--sm);
		--jumper-inset: var(--spacing--2xs);
		--jumper-font-size: var(--font-size--xs);
		--jumper-radius: var(--radius--3xs);
	}
}

.isDisabled {
	pointer-events: none;
}

.total {
	color: var(--text-color--subtler);
}

.paginationList {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.jumper {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	width: max-content;
	min-height: var(--jumper-height, var(--height--md));
	gap: var(--jumper-inset, var(--spacing--xs));
	padding-inline: var(--jumper-inset, var(--spacing--xs));
	border-radius: var(--jumper-radius, var(--radius--3xs));
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	box-shadow: inset 0 0 0 1px var(--border-color);
	font-size: var(--jumper-font-size, var(--font-size--sm));

	@include focus.focus-within-ring;

	&:hover:not(:focus-within) {
		box-shadow: inset 0 0 0 1px var(--border-color--strong);
	}

	&:focus-within {
		box-shadow: inset 0 0 0 1px var(--focus--border-color);
	}
}

.jumperPrefix {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.jumperInput {
	flex: 0 0 auto;
	box-sizing: content-box;
	width: calc(var(--jumper-digits, 1) * 1ch);
	min-width: 1ch;
	min-height: var(--jumper-height, var(--height--md));
	padding: 0;
	border: none;
	background: transparent;
	text-align: start;
	appearance: textfield;
	-moz-appearance: textfield;
	field-sizing: content;
	outline: none;

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		appearance: none;
		-webkit-appearance: none;
		margin: 0;
	}
}

@supports (field-sizing: content) {
	.jumperInput {
		width: auto;
	}
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
