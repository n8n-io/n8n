<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, nextTick, ref, useAttrs, useCssModule, useTemplateRef, watch } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nTooltip from '@n8n/design-system/components/N8nTooltip/Tooltip.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';
import N8nSelect from '@n8n/design-system/v2/components/Select/Select.vue';

import type { PaginationEmits, PaginationProps, PaginationSlots } from './Pagination.types';
import {
	PaginationRoot,
	PaginationList,
	PaginationListItem,
	PaginationPrev,
	PaginationNext,
	PaginationEllipsis,
	useForwardProps,
} from './reka-ui';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const $style = useCssModule();

const props = withDefaults(defineProps<PaginationProps>(), {
	size: 'medium',
	pageSizes: () => [10, 20, 30, 40, 50, 100],
	showTotal: true,
	showSizes: true,
	showJumper: false,
	hideOnSinglePage: false,
	defaultPage: 1,
	defaultItemsPerPage: 10,
	disabled: false,
	siblingCount: 1,
	showEdges: true,
});

const emit = defineEmits<PaginationEmits>();
defineSlots<PaginationSlots>();

const { t } = useI18n();

const rootProps = useForwardProps(reactivePick(props, 'disabled', 'showEdges', 'siblingCount'));

function resolveItemsPerPageDefault(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 10;
}

// Local state only for uncontrolled mode; supplied props stay authoritative until the parent updates them
const isPageControlled = computed(() => props.page !== undefined);
const uncontrolledPage = ref(props.defaultPage);
const currentPage = computed(() => {
	if (props.page !== undefined) return props.page;
	return uncontrolledPage.value;
});

const isItemsPerPageControlled = computed(() => props.itemsPerPage !== undefined);
const uncontrolledItemsPerPage = ref(resolveItemsPerPageDefault(props.defaultItemsPerPage));
const currentItemsPerPage = computed(() => {
	if (props.itemsPerPage !== undefined) return props.itemsPerPage;
	return uncontrolledItemsPerPage.value;
});

const jumperValue = ref(String(currentPage.value));
const jumperInputRef = useTemplateRef<HTMLInputElement>('jumperInput');

watch(currentPage, (page) => {
	jumperValue.value = String(page);
});

function syncJumperInputWidth() {
	const input = jumperInputRef.value;
	if (!input) return;

	input.style.width = '0px';
	input.style.width = `${Math.max(input.scrollWidth, 1) + 1}px`;
}

watch(jumperValue, async (value) => {
	const digitsOnly = value.replace(/\D/g, '');
	if (digitsOnly !== value) {
		jumperValue.value = digitsOnly;
		return;
	}

	await nextTick();
	syncJumperInputWidth();
});

watch(
	() => props.showJumper,
	async (show) => {
		if (!show) return;
		await nextTick();
		syncJumperInputWidth();
	},
	{ immediate: true },
);

function resolvedPageCount() {
	if (!props.total || !currentItemsPerPage.value) return 1;
	return Math.ceil(props.total / currentItemsPerPage.value);
}

function shouldHide() {
	return props.hideOnSinglePage && resolvedPageCount() <= 1;
}

function isPrevDisabled(page: number) {
	return props.disabled || page <= 1;
}

function isNextDisabled(page: number, pageCount: number) {
	return props.disabled || page >= pageCount;
}

function pageSizeItems() {
	return props.pageSizes.map((s) => ({
		value: String(s),
		label: t('pagination.pageSizeOption', { size: s }),
	}));
}

function handlePageUpdate(newPage: number) {
	if (props.disabled) return;
	if (!isPageControlled.value) {
		uncontrolledPage.value = newPage;
	}
	emit('update:page', newPage);
}

function handleItemsPerPageUpdate(newSize: number | string) {
	if (props.disabled) return;

	const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
	if (!isItemsPerPageControlled.value) {
		uncontrolledItemsPerPage.value = size;
	}
	emit('update:itemsPerPage', size);
	handlePageUpdate(1);
}

function commitJumperValue() {
	if (props.disabled) return;

	const parsed = parseInt(jumperValue.value, 10);
	if (Number.isNaN(parsed)) {
		jumperValue.value = String(currentPage.value);
		return;
	}

	const targetPage = Math.min(Math.max(parsed, 1), resolvedPageCount());

	if (targetPage === currentPage.value) {
		jumperValue.value = String(currentPage.value);
		return;
	}

	handlePageUpdate(targetPage);

	if (isPageControlled.value) {
		jumperValue.value = String(currentPage.value);
	}
}

function onJumperKeydown(event: KeyboardEvent) {
	if (event.key !== 'Enter') return;
	if (!(event.target instanceof HTMLInputElement)) return;
	event.target.blur();
}

function onJumperFocus(event: FocusEvent) {
	if (!(event.target instanceof HTMLInputElement)) return;
	const input = event.target;
	input.select();

	// Click-focus: mouseup after focus collapses select() to a caret. Block the next one.
	const listeners = {
		onMouseUp: (mouseEvent: MouseEvent) => {
			mouseEvent.preventDefault();
			input.select();
			input.removeEventListener('mouseup', listeners.onMouseUp);
			input.removeEventListener('blur', listeners.onBlur);
		},
		onBlur: () => {
			input.removeEventListener('mouseup', listeners.onMouseUp);
			input.removeEventListener('blur', listeners.onBlur);
		},
	};
	input.addEventListener('mouseup', listeners.onMouseUp);
	input.addEventListener('blur', listeners.onBlur);
}

function handlePagerKeydown(event: KeyboardEvent) {
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
}
</script>

<template>
	<div
		v-if="!shouldHide()"
		:class="[
			'n8n-pagination',
			$style.paginationContainer,
			$style[size],
			{ [$style.isDisabled]: disabled },
			rootClass,
		]"
		data-test-id="pagination"
		v-bind="rootAttrs"
	>
		<div v-if="showTotal" :class="$style.total" data-test-id="pagination-total">
			{{ t('pagination.total', { total }) }}
		</div>

		<PaginationRoot
			v-slot="{ page: rootPage, pageCount: rootPageCount }"
			v-bind="rootProps"
			:page="currentPage"
			:items-per-page="currentItemsPerPage"
			:total="total"
			@update:page="handlePageUpdate"
		>
			<PaginationList
				v-slot="{ items }"
				:class="$style.paginationList"
				data-test-id="pagination-list"
				@keydown="handlePagerKeydown"
			>
				<N8nTooltip
					:content="t('pagination.previousPage')"
					:disabled="!!$slots.prev || isPrevDisabled(rootPage)"
				>
					<PaginationPrev as-child>
						<slot name="prev" :disabled="isPrevDisabled(rootPage)">
							<N8nButton
								variant="ghost"
								icon-only
								icon="chevron-left"
								:size="size"
								:disabled="isPrevDisabled(rootPage)"
								:aria-label="t('pagination.previousPage')"
								data-test-id="pagination-prev"
							/>
						</slot>
					</PaginationPrev>
				</N8nTooltip>

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

				<N8nTooltip
					:content="t('pagination.nextPage')"
					:disabled="!!$slots.next || isNextDisabled(rootPage, rootPageCount)"
				>
					<PaginationNext as-child>
						<slot name="next" :disabled="isNextDisabled(rootPage, rootPageCount)">
							<N8nButton
								variant="ghost"
								icon-only
								icon="chevron-right"
								:size="size"
								:disabled="isNextDisabled(rootPage, rootPageCount)"
								:aria-label="t('pagination.nextPage')"
								data-test-id="pagination-next"
							/>
						</slot>
					</PaginationNext>
				</N8nTooltip>
			</PaginationList>
		</PaginationRoot>

		<N8nSelect
			v-if="showSizes"
			:class="$style.pageSizes"
			:model-value="String(currentItemsPerPage)"
			:items="pageSizeItems()"
			:size="size"
			:disabled="disabled"
			:aria-label="t('pagination.pageSize')"
			data-test-id="pagination-sizes"
			@update:model-value="handleItemsPerPageUpdate"
		/>

		<div v-if="showJumper" :class="$style.jumper" data-test-id="pagination-jumper">
			<span :class="$style.jumperPrefix">{{ t('pagination.goTo') }}</span>
			<input
				ref="jumperInput"
				v-model="jumperValue"
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				autocomplete="off"
				:class="$style.jumperInput"
				:disabled="disabled"
				:aria-label="t('pagination.goToPage')"
				data-test-id="pagination-jumper-input"
				@focus="onJumperFocus"
				@blur="commitJumperValue"
				@keydown="onJumperKeydown"
			/>
		</div>
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
		font-size: var(--font-size--sm);
	}

	.jumper {
		--jumper-height: var(--height--md);
		--jumper-inset: var(--spacing--xs);
		--jumper-font-size: var(--font-size--sm);
		--jumper-radius: var(--radius--3xs);
	}

	// Temporary: Select medium is 36px; match jumper / --height--md (32px)
	.pageSizes {
		height: var(--height--md);
		min-height: var(--height--md);
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
		font-size: var(--font-size--xs);
	}

	.jumper {
		--jumper-height: var(--height--sm);
		--jumper-inset: var(--spacing--2xs);
		--jumper-font-size: var(--font-size--xs);
		--jumper-radius: var(--radius--3xs);
	}

	// Temporary: match jumper / --height--sm until Select size tokens align
	.pageSizes {
		height: var(--height--sm);
		min-height: var(--height--sm);
	}
}

.isDisabled {
	pointer-events: none;

	.paginationEllipsis {
		opacity: 0.5;
	}
}

.total {
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.paginationList {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.jumper {
	display: inline-flex;
	align-items: center;
	margin-inline-start: calc(var(--spacing--2xs) - var(--spacing--xs));
	min-height: var(--jumper-height, var(--height--md));
	border-radius: var(--jumper-radius, var(--radius--3xs));
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	box-shadow: inset 0 0 0 1px var(--border-color);
	font-size: var(--jumper-font-size, var(--font-size--sm));

	@include focus.focus-within-ring;

	&:hover:not(:focus-within):not(:has(:disabled)) {
		box-shadow: inset 0 0 0 1px var(--border-color--strong);
	}

	&:focus-within {
		box-shadow: inset 0 0 0 1px var(--focus--border-color);
	}

	&:has(:disabled) {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.jumperPrefix {
	padding-inline-start: var(--jumper-inset, var(--spacing--xs));
	color: var(--text-color--subtler);
}

.jumperInput {
	min-height: var(--jumper-height, var(--height--md));
	padding-inline: var(--jumper-inset, var(--spacing--xs));
	border: none;
	background: transparent;
	outline: none;
	overflow: hidden;
	font-variant-numeric: tabular-nums;

	&:disabled {
		cursor: not-allowed;
		color: var(--color--text--tint-1);
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
