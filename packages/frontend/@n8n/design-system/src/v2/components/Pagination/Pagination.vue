<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, ref, useAttrs, useCssModule, watch } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
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
	itemsPerPage: 10,
	pageSizes: () => [10, 20, 30, 40, 50, 100],
	showTotal: true,
	showSizes: true,
	showJumper: true,
	hideOnSinglePage: false,
	defaultPage: 1,
	disabled: false,
	siblingCount: 1,
	showEdges: true,
});

const emit = defineEmits<PaginationEmits>();
defineSlots<PaginationSlots>();

const { t } = useI18n();

const rootProps = useForwardProps(reactivePick(props, 'disabled', 'showEdges', 'siblingCount'));

// Local page state is only for uncontrolled mode; a supplied `page` stays authoritative
const isControlled = computed(() => props.page !== undefined);
const uncontrolledPage = ref(props.defaultPage);
const currentPage = computed(() => {
	if (props.page !== undefined) return props.page;
	return uncontrolledPage.value;
});
const jumperValue = ref(String(currentPage.value));

watch(currentPage, (page) => {
	jumperValue.value = String(page);
});

function resolvedPageCount() {
	if (props.pageCount !== undefined) return props.pageCount;
	if (!props.total || !props.itemsPerPage) return 1;
	return Math.ceil(props.total / props.itemsPerPage);
}

// pageCount takes precedence over total per DS-323
function resolvedTotalItems() {
	if (props.pageCount !== undefined) {
		return props.pageCount * props.itemsPerPage;
	}
	if (props.total !== undefined) return props.total;
	return 0;
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
		label: String(s),
	}));
}

function handlePageUpdate(newPage: number) {
	if (props.disabled) return;
	if (!isControlled.value) {
		uncontrolledPage.value = newPage;
	}
	emit('update:page', newPage);
}

function handleItemsPerPageUpdate(newSize: number | string) {
	if (props.disabled) return;

	const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
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

	// Controlled: keep jumper aligned with the supplied page until the parent accepts
	if (isControlled.value) {
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
	const onMouseUp = (mouseEvent: MouseEvent) => {
		mouseEvent.preventDefault();
		input.select();
		cleanup();
	};
	const cleanup = () => {
		input.removeEventListener('mouseup', onMouseUp);
		input.removeEventListener('blur', cleanup);
	};
	input.addEventListener('mouseup', onMouseUp);
	input.addEventListener('blur', cleanup);
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
			{{ total === undefined ? '' : t('pagination.total', { total }) }}
		</div>

		<PaginationRoot
			v-slot="{ page: rootPage, pageCount }"
			v-bind="rootProps"
			:page="currentPage"
			:items-per-page="itemsPerPage"
			:total="resolvedTotalItems()"
			@update:page="handlePageUpdate"
		>
			<PaginationList
				v-slot="{ items }"
				:class="$style.paginationList"
				data-test-id="pagination-list"
				@keydown="handlePagerKeydown"
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
					<slot name="next" :disabled="isNextDisabled(rootPage, pageCount)">
						<N8nButton
							variant="ghost"
							icon-only
							icon="chevron-right"
							:size="size"
							:disabled="isNextDisabled(rootPage, pageCount)"
							:aria-label="t('pagination.nextPage')"
							data-test-id="pagination-next"
						/>
					</slot>
				</PaginationNext>
			</PaginationList>
		</PaginationRoot>

		<N8nSelect
			v-if="showSizes"
			:class="$style.pageSizes"
			:model-value="String(itemsPerPage)"
			:items="pageSizeItems()"
			:size="size"
			:disabled="disabled"
			:aria-label="t('pagination.pageSize')"
			data-test-id="pagination-sizes"
			@update:model-value="handleItemsPerPageUpdate"
		/>

		<div
			v-if="showJumper"
			:class="$style.jumper"
			:style="{ '--jumper-digits': Math.max(String(jumperValue).length, 1) }"
			data-test-id="pagination-jumper"
		>
			<span :class="$style.jumperPrefix">{{ t('pagination.goTo') }}</span>
			<input
				v-model="jumperValue"
				type="number"
				:min="1"
				:max="resolvedPageCount()"
				step="1"
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
	field-sizing: content;
	outline: none;
	appearance: textfield;
	-moz-appearance: textfield;

	&:disabled {
		cursor: not-allowed;
		color: var(--color--text--tint-1);
	}

	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		display: none;
		appearance: none;
		margin: 0;
		pointer-events: none;
		height: 0;
		width: 0;
	}

	@supports (field-sizing: content) {
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
