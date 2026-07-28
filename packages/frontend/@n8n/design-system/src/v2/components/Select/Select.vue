<script
	setup
	lang="ts"
	generic="
		T extends Array<SelectItem>,
		VK extends GetItemKeys<T> = 'value',
		M extends boolean = false
	"
>
import { reactiveOmit, reactivePick } from '@vueuse/core';
import {
	SelectValue as RSelectValue,
	SelectContent,
	SelectGroup,
	SelectLabel,
	SelectPortal,
	SelectRoot,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectViewport,
	useForwardPropsEmits,
} from 'reka-ui';
import type { AcceptableValue } from 'reka-ui';
import { computed, nextTick, ref, useAttrs, useCssModule, useTemplateRef, watch } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nInput from '@n8n/design-system/components/N8nInput';
import { useI18n } from '@n8n/design-system/composables/useI18n';
import { get } from '@n8n/design-system/v2/utils';
import type { GetItemKeys, GetModelValue } from '@n8n/design-system/v2/utils/types';

import {
	isRekaAcceptableValue,
	isSelectItemProps,
	type SelectEmits,
	type SelectItem,
	type SelectItemProps,
	type SelectProps,
	type SelectSizes,
	type SelectSlots,
	type SelectVariants,
} from './Select.types';
import N8nSelectItem from './SelectItem.vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const triggerClass = () => attrs.class;
const triggerAttrs = () => reactiveOmit(attrs, ['class']);

const $style = useCssModule();
const { t } = useI18n();

const props = withDefaults(defineProps<SelectProps<T, VK, M>>(), {
	variant: 'default',
	size: 'default',
	position: 'popper',
	side: 'bottom',
	sideOffset: 5,
	clearable: false,
	searchable: false,
});
const emit = defineEmits<SelectEmits<T, VK, M>>();
defineSlots<SelectSlots<T, VK, M>>();

const rootProps = useForwardPropsEmits(
	reactivePick(props, 'open', 'defaultOpen', 'disabled', 'required', 'multiple'),
	emit,
);

const triggerRef = useTemplateRef<InstanceType<typeof SelectTrigger>>('trigger');
const searchInputRef = useTemplateRef<InstanceType<typeof N8nInput>>('searchInput');
const internalSearchQuery = ref('');

const resolvedSearchQuery = computed(() => props.searchQuery ?? internalSearchQuery.value);

function setSearchQuery(value: string | number) {
	const next = String(value);
	internalSearchQuery.value = next;
	emit('update:searchQuery', next);
}

function clearSearch() {
	setSearchQuery('');
}

/**
 * Keep typing in the search field from driving Reka's typeahead on the list,
 * but let Escape bubble so the select can close.
 */
function onSearchKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		return;
	}

	event.stopPropagation();
}

async function handleOpenUpdate(isOpen: boolean) {
	emit('update:open', isOpen);

	if (!isOpen) {
		clearSearch();
		return;
	}

	if (props.searchable) {
		await nextTick();
		searchInputRef.value?.focus();
	}
}

watch(
	() => props.searchQuery,
	(value) => {
		if (value !== undefined) {
			internalSearchQuery.value = value;
		}
	},
);

defineExpose({
	triggerRef,
});

const sizeClasses: Record<SelectSizes, string> = {
	mini: $style.mini,
	default: $style.defaultSize,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};

const variantClasses: Record<SelectVariants, string> = {
	default: $style.variantDefault,
	ghost: $style.variantGhost,
	flush: $style.variantFlush,
};

function resolvedPlaceholder() {
	return props.placeholder ?? t('nds.select.placeholder');
}

function iconStrokeWidth() {
	return props.size === 'mini' || props.size === 'default' ? 1 : 1.5;
}

function hasValue() {
	const value = props.modelValue;
	if (value === undefined || value === null || value === '') {
		return false;
	}

	if (Array.isArray(value)) {
		return value.length > 0;
	}

	return true;
}

function showClearButton() {
	return props.clearable && !props.disabled && hasValue();
}

function isClearedMultipleValue(value: unknown): value is GetModelValue<T, VK, M> {
	return Array.isArray(value) && value.length === 0;
}

function onClear(event: Event) {
	event.preventDefault();
	event.stopPropagation();

	if (props.multiple) {
		const empty: unknown = [];
		if (isClearedMultipleValue(empty)) {
			emit('update:modelValue', empty);
		}
	} else {
		emit('update:modelValue', undefined);
	}

	emit('clear');
}

function toRootValue(
	value?: GetModelValue<T, VK, M>,
): AcceptableValue | AcceptableValue[] | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		return value.filter(isRekaAcceptableValue);
	}

	if (isRekaAcceptableValue(value)) {
		return value;
	}

	return undefined;
}

function isModelValue(value: unknown): value is GetModelValue<T, VK, M> {
	return value !== undefined;
}

function handleModelValueUpdate(value: AcceptableValue | AcceptableValue[]) {
	if (isModelValue(value)) {
		emit('update:modelValue', value);
	}
}

function mapItem(item: SelectItem): SelectItemProps {
	if (isSelectItemProps(item)) {
		return {
			...item,
			value: get(item, props.valueKey?.toString() ?? 'value'),
			label: get(item, props.labelKey?.toString() ?? 'label'),
			class: [$style.selectItem, item.class],
			strokeWidth: iconStrokeWidth(),
		};
	}

	return {
		value: item,
		label: String(item),
		class: $style.selectItem,
		strokeWidth: iconStrokeWidth(),
	};
}

function groups(): SelectItemProps[] {
	return visibleItems().map(mapItem);
}

function hasSelectableItems() {
	return groups().some((item) => item.type !== 'label' && item.type !== 'separator');
}

function filterGroupedItems(items: SelectItem[], query: string): SelectItem[] {
	const normalizedQuery = query.toLowerCase().trim();
	if (!normalizedQuery) {
		return items;
	}

	const result: SelectItem[] = [];
	let pendingLabel: SelectItem | undefined;
	let pendingSeparator: SelectItem | undefined;

	for (const item of items) {
		if (isSelectItemProps(item) && item.type === 'label') {
			pendingLabel = item;
			continue;
		}

		if (isSelectItemProps(item) && item.type === 'separator') {
			pendingSeparator = item;
			continue;
		}

		const label = itemLabel(item)?.toLowerCase() ?? '';
		if (!label.includes(normalizedQuery)) {
			continue;
		}

		if (pendingSeparator) {
			result.push(pendingSeparator);
			pendingSeparator = undefined;
		}

		if (pendingLabel) {
			result.push(pendingLabel);
			pendingLabel = undefined;
		}

		result.push(item);
	}

	return result;
}

function visibleItems(): SelectItem[] {
	const items = props.items ?? [];
	if (!props.searchable) {
		return items;
	}

	return filterGroupedItems(items, resolvedSearchQuery.value);
}

function resolvedSearchPlaceholder() {
	return props.searchPlaceholder ?? t('nds.select.searchPlaceholder');
}

function itemValue(item: SelectItem): unknown {
	if (isSelectItemProps(item)) {
		return get(item, props.valueKey?.toString() ?? 'value');
	}

	return item;
}

function itemLabel(item: SelectItem): string | undefined {
	if (isSelectItemProps(item)) {
		if (item.type === 'label' || item.type === 'separator') {
			return undefined;
		}

		const label = get(item, props.labelKey?.toString() ?? 'label');
		if (typeof label === 'string' && label.length > 0) {
			return label;
		}

		const value = itemValue(item);
		return value == null ? undefined : String(value);
	}

	return String(item);
}

/**
 * Resolve trigger text from `items` so the label does not depend on Reka's
 * options registry (which briefly clears while the menu remounts on close).
 */
function resolveDisplayValue(value: unknown): string | undefined {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}

	const items = props.items ?? [];

	if (Array.isArray(value)) {
		const labels = value
			.map((entry) => {
				const found = items.find((item) => itemValue(item) === entry);
				return found !== undefined ? itemLabel(found) : String(entry);
			})
			.filter((label): label is string => Boolean(label));

		return labels.length > 0 ? labels.join(', ') : undefined;
	}

	const found = items.find((item) => itemValue(item) === value);
	if (found !== undefined) {
		return itemLabel(found);
	}

	return String(value);
}
</script>

<template>
	<SelectRoot
		v-slot="{ open, modelValue: selectedValue }"
		v-bind="rootProps"
		:name="name"
		:autocomplete="autocomplete"
		:default-value="toRootValue(defaultValue)"
		:model-value="toRootValue(modelValue)"
		@update:model-value="handleModelValueUpdate"
		@update:open="handleOpenUpdate"
	>
		<SelectTrigger
			:id="id"
			ref="trigger"
			data-test-id="select-trigger"
			v-bind="triggerAttrs()"
			:class="[$style.selectTrigger, variantClasses[variant], sizeClasses[size], triggerClass()]"
			:aria-label="attrs['aria-label'] ?? resolvedPlaceholder()"
		>
			<Icon
				v-if="icon"
				:icon="icon"
				:class="$style.selectedIcon"
				color="text-base"
				:stroke-width="iconStrokeWidth()"
			/>
			<RSelectValue :placeholder="resolvedPlaceholder()" :class="$style.selectValue">
				<slot :model-value="selectedValue" :open="open">
					{{ resolveDisplayValue(selectedValue) ?? resolvedPlaceholder() }}
				</slot>
			</RSelectValue>
			<span
				v-if="showClearButton()"
				role="button"
				tabindex="-1"
				data-test-id="select-clear"
				:class="$style.clearButton"
				:aria-label="t('nds.select.clear')"
				@click="onClear"
				@pointerdown.stop.prevent
			>
				<Icon icon="x" color="text-light" aria-hidden="true" />
			</span>
			<Icon
				icon="chevron-down"
				:class="$style.trailingIcon"
				color="text-light"
				aria-hidden="true"
			/>
		</SelectTrigger>

		<SelectPortal>
			<SelectContent
				data-test-id="select-content"
				:class="[$style.selectContent, contentClass]"
				:position="position"
				:side="side"
				:side-offset="sideOffset"
			>
				<div v-if="searchable" :class="$style.searchHeader" data-test-id="select-search">
					<N8nInput
						ref="searchInput"
						:model-value="resolvedSearchQuery"
						:placeholder="resolvedSearchPlaceholder()"
						size="medium"
						clearable
						:class="$style.searchInput"
						@update:model-value="setSearchQuery"
						@click.stop
						@keydown="onSearchKeydown"
					/>
				</div>

				<slot name="header" />

				<div :class="$style.viewportRegion">
					<SelectScrollUpButton
						:class="[$style.selectScrollButton, $style.selectScrollButtonUp]"
						data-test-id="select-scroll-up"
					>
						<Icon icon="chevron-up" aria-hidden="true" />
					</SelectScrollUpButton>

					<SelectViewport :class="$style.selectViewport">
						<div v-if="!hasSelectableItems()" :class="$style.empty" data-test-id="select-empty">
							<slot name="empty">
								{{ t('nds.select.noResults') }}
							</slot>
						</div>
						<SelectGroup v-else>
							<template v-for="(item, index) in groups()" :key="`group-${index}`">
								<SelectLabel v-if="item.type === 'label'" :class="$style.selectLabel">
									<slot name="label" :item="item">
										{{ item.label }}
									</slot>
								</SelectLabel>

								<SelectSeparator
									v-else-if="item.type === 'separator'"
									:class="$style.selectSeparator"
									role="separator"
								/>

								<slot v-else name="item" :item="item">
									<N8nSelectItem v-bind="item">
										<template #item-leading="{ ui }">
											<slot name="item-leading" :item="item" :ui="ui" />
										</template>
										<template #item-label>
											<slot name="item-label" :item="item" />
										</template>
										<template #item-trailing="{ ui }">
											<slot name="item-trailing" :item="item" :ui="ui" />
										</template>
									</N8nSelectItem>
								</slot>
							</template>
						</SelectGroup>
					</SelectViewport>

					<SelectScrollDownButton
						:class="[$style.selectScrollButton, $style.selectScrollButtonDown]"
						data-test-id="select-scroll-down"
					>
						<Icon icon="chevron-down" aria-hidden="true" />
					</SelectScrollDownButton>
				</div>

				<div v-if="$slots.footer" :class="$style.footer">
					<slot name="footer" />
				</div>
			</SelectContent>
		</SelectPortal>
	</SelectRoot>
</template>

<style lang="scss" module>
@use '../../../css/common/var';
@use '../../../css/mixins/focus';
@use '../../../css/mixins/input' as input-mixin;

.selectTrigger {
	@include input-mixin.size-variables('small');
	@include input-mixin.theme-variables(var(--border-color));

	display: inline-flex;
	align-items: center;
	justify-content: flex-start;
	gap: var(--spacing--4xs);
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	border-radius: var(--input--radius);
	font-size: var(--input--font-size);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	border: 1px solid var(--input--border-color);
	background-color: var(--input--color--background);
	color: var(--input--color--text);
	position: relative;
	outline: none;
	box-shadow: var(--input--shadow);

	@include focus.focus-visible-ring;

	&:hover:not([data-disabled]):not(:focus-visible) {
		border-color: var(--input--border-color--hover);
		box-shadow: var(--input--shadow--hover);
		cursor: pointer;
	}

	&:focus-visible {
		border-color: var(--input--border-color--focus);
		box-shadow: var(--input--shadow--focus);
		z-index: 1;
	}

	&[data-placeholder] {
		color: var(--input--placeholder--color);
	}

	&[data-disabled] {
		color: var(--input--color--disabled);
		background-color: var(--input--color--background--disabled);
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.variantDefault {
	/** border color from input theme variables */
}

.variantGhost {
	border-color: transparent;
	background-color: transparent;
	box-shadow: none;

	&:hover:not([data-disabled]):not(:focus-visible) {
		border-color: transparent;
		background-color: var(--background--hover);
		box-shadow: none;
	}

	&:focus-visible {
		border-color: transparent;
		box-shadow: none;
	}

	&[data-disabled] {
		background-color: transparent;
	}
}

/* Borderless, paddingless trigger for dense contexts (e.g. table cells). */
.variantFlush {
	border-color: transparent;
	background-color: transparent;
	box-shadow: none;
	padding: 0;
	min-height: auto;

	&:hover:not([data-disabled]):not(:focus-visible) {
		border-color: transparent;
		background-color: transparent;
		box-shadow: none;
	}

	&:focus-visible {
		border-color: transparent;
		box-shadow: none;
	}

	&[data-disabled] {
		background-color: transparent;
	}
}

.mini {
	@include input-mixin.size-variables('mini');
}

.defaultSize {
	@include input-mixin.size-variables('small');
}

.medium {
	@include input-mixin.size-variables('medium');
}

.large {
	@include input-mixin.size-variables('large');
}

.xlarge {
	@include input-mixin.size-variables('xlarge');
}

.selectedIcon {
	flex-shrink: 0;
}

.clearButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-left: auto;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	border-radius: var(--radius--sm);
	color: var(--color--text--tint-1);

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.clearButton + .trailingIcon {
	margin-left: 0;
}

.trailingIcon {
	margin-left: auto;
	flex-shrink: 0;
}

.selectContent {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: max-content;
	min-width: var(--reka-select-trigger-width);
	max-height: min(var(--reka-select-content-available-height, 50vh), calc(var(--height--5xl) * 3));
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	--shadow-color--outline: var(--border-color);
	box-shadow: var(--shadow--md), var(--shadow--outline);
	z-index: var.$index-popper;
	scrollbar-width: none;
}

.viewportRegion {
	position: relative;
	display: flex;
	flex-direction: column;
	min-height: 0;
	flex: 1 1 auto;
}

.selectViewport {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
}

.empty {
	padding: var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	text-align: center;
}

.searchHeader {
	flex-shrink: 0;
	border-bottom: var(--border);
}

.searchInput {
	width: 100%;
	/* Match footer action row height (--height--xl / 40px) */
	--input--height: var(--height--xl);
	--input--radius--top-left: var(--radius--xs);
	--input--radius--top-right: var(--radius--xs);
	--input--radius--bottom-right: 0;
	--input--radius--bottom-left: 0;
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--border-color--focus: transparent;
	--input--border--shadow--focus: 0 0 0 0 transparent;
	--focus--outline-color: transparent;
}

.footer {
	flex-shrink: 0;
	min-height: var(--height--xl);
	display: flex;
	align-items: stretch;
	border-top: var(--border);

	> * {
		flex: 1;
		min-height: var(--height--xl);
	}
}

.selectValue {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	line-height: var(--line-height--md);
}

.selectItem {
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	border-radius: var(--radius--2xs);
	display: flex;
	align-items: center;
	min-height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--text-color);
	gap: var(--spacing--4xs);
	outline: none;

	/*
	 * Highlight via data-highlighted only (Reka sets it on focus from pointer or keyboard).
	 * Avoid :hover so keyboard navigation doesn't leave a hovered item highlighted too.
	 */
	&:not([data-disabled])[data-highlighted] {
		background-color: var(--background--hover);
		cursor: pointer;
	}

	&:not([data-disabled]) {
		cursor: pointer;
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.selectLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.selectSeparator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--5xs) calc(var(--spacing--4xs) * -1);
}

.selectScrollButton {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--spacing--xl);
	cursor: pointer;
	color: var(--color--text--tint-1);

	&:hover {
		color: var(--color--text--shade-1);
	}

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
	}
}

.selectScrollButtonUp {
	top: 0;

	&::before {
		background: linear-gradient(
			to bottom,
			var(--background--surface) 0%,
			color-mix(in srgb, var(--background--surface) 0%, transparent) 100%
		);
	}
}

.selectScrollButtonDown {
	bottom: 0;

	&::before {
		background: linear-gradient(
			to top,
			var(--background--surface) 0%,
			color-mix(in srgb, var(--background--surface) 0%, transparent) 100%
		);
	}
}
</style>
