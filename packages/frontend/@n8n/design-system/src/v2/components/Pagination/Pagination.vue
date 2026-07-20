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
	size: 'default',
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

const shouldHide = computed(() => props.hideOnSinglePage && pageCount.value <= 1);

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

	// Reset to first page when page size changes
	handlePageUpdate(1);
};

const sizes: Record<PaginationSizes, string> = {
	default: $style.default,
	small: $style.small,
};
const size = computed(() => sizes[props.size]);

const navButtonSize = computed(() => (props.size === 'small' ? 'xsmall' : 'medium'));
const navIconSize = computed(() => (props.size === 'small' ? 'small' : 'medium'));

const pageSizeItems = computed(() =>
	props.pageSizes.map((s) => ({ value: String(s), label: `${s} / page` })),
);

const totalText = computed(() => {
	if (props.total === undefined) return '';
	return `Total ${props.total}`;
});

const handleJumperSubmit = (input: HTMLInputElement) => {
	if (props.disabled) return;

	const parsed = parseInt(jumperValue.value, 10);
	if (isNaN(parsed)) {
		jumperValue.value = String(prevPage.value);
		input.blur();
		return;
	}

	const targetPage = Math.min(Math.max(parsed, 1), pageCount.value);
	jumperValue.value = String(targetPage);
	handlePageUpdate(targetPage);
	input.blur();
};

const onJumperKeydown = (event: KeyboardEvent) => {
	if (event.key !== 'Enter') return;
	if (!(event.target instanceof HTMLInputElement)) return;

	handleJumperSubmit(event.target);
};

const onJumperFocus = (event: FocusEvent) => {
	if (!(event.target instanceof HTMLInputElement)) return;
	event.target.select();
};

const onJumperBlur = () => {
	jumperValue.value = String(prevPage.value);
};

const jumperInputStyle = computed(() => {
	const digits = Math.max(String(jumperValue.value).length, 1);
	return { width: `calc(${digits}ch + var(--spacing--xs))` };
});

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
		:class="['n8n-pagination', $style.paginationContainer, size, { [$style.isDisabled]: disabled }]"
		v-bind="$attrs"
	>
		<template v-for="part in deduplicatedLayoutParts" :key="part">
			<div v-if="part === 'total'" :class="$style.total">
				{{ totalText }}
			</div>

			<N8nSelect
				v-else-if="part === 'sizes'"
				:model-value="String(internalPageSize)"
				:items="pageSizeItems"
				:size="props.size === 'small' ? 'xsmall' : 'small'"
				:disabled="disabled"
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
					@keydown="handlePagerKeydown"
				>
					<PaginationPrev v-if="showPrev" as-child>
						<slot name="prev">
							<N8nButton
								v-if="prevText"
								variant="ghost"
								:size="navButtonSize"
								aria-label="Previous page"
							>
								{{ prevText }}
							</N8nButton>
							<N8nButton
								v-else
								variant="ghost"
								icon-only
								:icon="prevIcon"
								:icon-size="navIconSize"
								:size="navButtonSize"
								aria-label="Previous page"
							/>
						</slot>
					</PaginationPrev>

					<template v-if="showPager">
						<template
							v-for="(item, index) in items"
							:key="item.type === 'ellipsis' ? `ellipsis-${index}` : item.value"
						>
							<PaginationEllipsis
								v-if="item.type === 'ellipsis'"
								:index="index"
								:class="$style.paginationEllipsis"
							>
								<span aria-hidden="true">&#8230;</span>
							</PaginationEllipsis>
							<PaginationListItem v-else :value="item.value" :class="$style.paginationItem">
								{{ item.value }}
							</PaginationListItem>
						</template>
					</template>

					<PaginationNext v-if="showNext" as-child>
						<slot name="next">
							<N8nButton
								v-if="nextText"
								variant="ghost"
								:size="navButtonSize"
								aria-label="Next page"
							>
								{{ nextText }}
							</N8nButton>
							<N8nButton
								v-else
								variant="ghost"
								icon-only
								:icon="nextIcon"
								:icon-size="navIconSize"
								:size="navButtonSize"
								aria-label="Next page"
							/>
						</slot>
					</PaginationNext>
				</PaginationList>
			</PaginationRoot>

			<div v-else-if="part === 'jumper'" :class="$style.jumper">
				<span :class="$style.jumperAddon">{{ t('pagination.goTo') }}</span>
				<input
					v-model="jumperValue"
					type="number"
					:min="1"
					:max="pageCount"
					:class="$style.jumperInput"
					:style="jumperInputStyle"
					:disabled="disabled"
					:aria-label="t('pagination.goToPage')"
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
@use '@n8n/design-system/css/mixins/input' as input-mixin;

.paginationContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.default {
	.paginationItem,
	.paginationEllipsis {
		height: var(--height--md);
		min-width: var(--height--md);
	}

	.total {
		font-size: var(--font-size--2xs);
	}

	.jumper {
		@include input-mixin.size-variables('medium');
	}
}

.small {
	font-size: var(--font-size--3xs);

	.paginationItem,
	.paginationEllipsis {
		height: var(--height--xs);
		min-width: var(--height--xs);
		font-size: var(--font-size--3xs);
		padding-top: 1px;
	}

	.total {
		font-size: var(--font-size--4xs);
	}

	.jumper {
		@include input-mixin.size-variables('mini');
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
	@include input-mixin.theme-variables(var(--border-color));

	display: inline-flex;
	align-items: stretch;

	&:hover:not(:focus-within) .jumperAddon,
	&:hover:not(:focus-within) .jumperInput:not(:disabled) {
		box-shadow:
			var(--input--shadow--hover),
			inset var(--input--border--shadow--hover);
	}

	&:focus-within .jumperAddon,
	&:focus-within .jumperInput {
		box-shadow:
			var(--input--shadow--focus),
			inset var(--input--border--shadow--focus);
	}
}

.jumperAddon {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding: 0 var(--input--padding);
	border-radius: var(--input--radius) 0 0 var(--input--radius);
	background-color: light-dark(var(--color--neutral-150), var(--color--neutral-800));
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);
	color: var(--text-color--subtler);
	font-size: var(--input--font-size);
	white-space: nowrap;
	margin-right: -1px;
}

.jumperInput {
	height: var(--input--height);
	padding: 0;
	border: none;
	border-radius: 0 var(--input--radius) var(--input--radius) 0;
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);
	color: var(--text-color);
	font-size: var(--input--font-size);
	text-align: center;
	appearance: textfield;
	-moz-appearance: textfield;

	@include focus.focus-within-ring;

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
	color: var(--text-color--subtle);
	cursor: pointer;
	font-weight: var(--font-weight--regular);
	box-shadow: inset 0 0 0 1px transparent;

	&:hover:not([data-selected]):not(:disabled) {
		color: var(--text-color);
		background-color: var(--background--hover);
	}

	&[data-selected] {
		color: var(--text-color);
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
	color: var(--text-color--subtler);
	pointer-events: none;
	cursor: default;
}
</style>
