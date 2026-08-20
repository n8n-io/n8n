<script setup lang="ts" generic="M extends boolean = false">
import { reactivePick } from '@vueuse/core';
import {
	SelectValue as RSelectValue,
	SelectContent,
	SelectGroup,
	SelectLabel as RSelectLabel,
	SelectPortal,
	SelectRoot,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator as RSelectSeparator,
	SelectTrigger,
	SelectViewport,
	useForwardProps,
} from 'reka-ui';
import type { AcceptableValue } from 'reka-ui';
import { computed, getCurrentInstance, ref, useAttrs, useCssModule, useTemplateRef } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';

import type {
	SelectEmits,
	SelectGroupItem,
	SelectItem,
	SelectModelValue,
	SelectOptionBase,
	SelectProps,
	SelectSeparatorItem,
	SelectSizes,
	SelectSlots,
	SelectValue,
	SelectVariants,
} from './Select.types';
import N8nSelectItem from './SelectItem.vue';
import Icon from '../../../components/N8nIcon/Icon.vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

function triggerClass() {
	return attrs.class;
}

function triggerAttrs() {
	const rest = { ...attrs };
	delete rest.class;
	return rest;
}

const $style = useCssModule();
const { t } = useI18n();

const props = withDefaults(defineProps<SelectProps<M>>(), {
	variant: 'default',
	size: 'small',
	position: 'item-aligned',
	sideOffset: 4,
	clearable: false,
});
const emit = defineEmits<SelectEmits<M>>();
defineSlots<SelectSlots<M>>();

const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const isModelControlled = 'modelValue' in vnodeProps || 'model-value' in vnodeProps;
const internalValue = ref<SelectModelValue<M> | undefined>(props.defaultValue);

const rootModelValue = computed(() => (isModelControlled ? props.modelValue : internalValue.value));

const forwardedRootProps = useForwardProps(
	reactivePick(props, 'open', 'defaultOpen', 'disabled', 'required', 'multiple'),
);

function rootBind() {
	return {
		...forwardedRootProps.value,
		name: props.name,
		autocomplete: props.autocomplete,
		dir: props.dir,
	};
}

const triggerRef = useTemplateRef<InstanceType<typeof SelectTrigger>>('trigger');

defineExpose({
	triggerRef,
});

const sizes: Record<SelectSizes, string> = {
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};
const size = computed(() => sizes[props.size]);

const variantClasses: Record<SelectVariants, string | undefined> = {
	default: undefined,
	ghost: $style.variantGhost,
	flush: $style.variantFlush,
};

function isSelectValue(value: unknown): value is SelectValue {
	return typeof value === 'string' || typeof value === 'number';
}

function isGroupItem(item: SelectItem): item is SelectGroupItem {
	return item.type === 'group';
}

function isSeparatorItem(item: SelectItem): item is SelectSeparatorItem {
	return item.type === 'separator';
}

function stringifyPrimitive(value: unknown): string | undefined {
	switch (typeof value) {
		case 'string':
			return value;
		case 'number':
		case 'bigint':
			return String(value);
		default:
			return undefined;
	}
}

function warnInvalidItem(message: string, item: SelectItem | SelectOptionBase) {
	if (!import.meta.env.DEV) {
		return;
	}

	// eslint-disable-next-line no-console
	console.warn(`[N8nSelect2] ${message}`, item);
}

function normaliseOption(item: SelectOptionBase): SelectOptionBase | undefined {
	if (item.value === '') {
		warnInvalidItem(
			'Skipping item: "value" is missing or empty. Every selectable item needs a non-empty value.',
			item,
		);
		return undefined;
	}

	if (!item.label) {
		warnInvalidItem(
			'Skipping item: "label" is missing or empty. Every selectable item needs a label.',
			item,
		);
		return undefined;
	}

	return {
		...item,
		textValue: item.textValue ?? item.label,
	};
}

type SelectSection =
	| {
			type: 'group';
			/** Present when this section came from an explicit `type: 'group'` entry. */
			group?: SelectGroupItem;
			label?: string;
			items: SelectOptionBase[];
	  }
	| { type: 'separator' };

const sections = computed<SelectSection[]>(() => {
	if (!props.items?.length) {
		return [];
	}

	const result: SelectSection[] = [];
	let pendingOptions: SelectOptionBase[] = [];

	const flushPendingOptions = () => {
		if (pendingOptions.length === 0) {
			return;
		}
		result.push({ type: 'group', items: pendingOptions });
		pendingOptions = [];
	};

	for (const item of props.items) {
		if (isGroupItem(item)) {
			flushPendingOptions();

			const groupItems: SelectOptionBase[] = [];
			for (const child of item.items) {
				const normalised = normaliseOption(child);
				if (normalised) {
					groupItems.push(normalised);
				}
			}

			const label = item.label || undefined;
			if (item.label !== undefined && !item.label) {
				warnInvalidItem('Skipping group label: "label" is empty.', item);
			}

			result.push({
				type: 'group',
				group: item,
				label,
				items: groupItems,
			});
			continue;
		}

		if (isSeparatorItem(item)) {
			flushPendingOptions();
			result.push({ type: 'separator' });
			continue;
		}

		const normalised = normaliseOption(item);
		if (normalised) {
			pendingOptions.push(normalised);
		}
	}

	flushPendingOptions();
	return result;
});

const optionItems = computed(() =>
	sections.value.flatMap((section) => (section.type === 'group' ? section.items : [])),
);

const hasSelectableItems = computed(() =>
	sections.value.some((section) => section.type === 'group' && section.items.length > 0),
);

function hasValue(value: unknown): boolean {
	if (Array.isArray(value)) {
		return value.length > 0;
	}

	return value !== undefined && value !== null && value !== '';
}

function showClearButton(value: unknown): boolean {
	return Boolean(props.clearable && !props.disabled && hasValue(value));
}

function resolvedPlaceholder() {
	return props.placeholder ?? t('nds.select.placeholder');
}

function iconStrokeWidth() {
	return props.size === 'mini' || props.size === 'small' ? 1 : 1.5;
}

function selectedIconUi() {
	return { class: $style.selectedIconGlyph, strokeWidth: iconStrokeWidth() };
}

function getSelectedItem(
	value: AcceptableValue | AcceptableValue[] | undefined | null,
): SelectOptionBase | undefined {
	if (props.multiple) {
		return undefined;
	}

	if (value === undefined || value === null || Array.isArray(value)) {
		return undefined;
	}

	return optionItems.value.find((item) => item.value === value);
}

function isModelValue(value: unknown): value is SelectModelValue<M> {
	if (props.multiple) {
		return Array.isArray(value) && value.every(isSelectValue);
	}

	return isSelectValue(value);
}

function setSelectedValue(value: SelectModelValue<M> | undefined) {
	if (!isModelControlled) {
		internalValue.value = value;
	}

	emit('update:modelValue', value);
}

function onClear() {
	if (props.multiple) {
		const empty: unknown = [];
		if (isModelValue(empty)) {
			setSelectedValue(empty);
		}
	} else {
		setSelectedValue(undefined);
	}

	emit('clear');
}

function handleModelValueUpdate(value: AcceptableValue | AcceptableValue[]) {
	if (!isModelValue(value)) {
		return;
	}

	setSelectedValue(value);
}

function slotModelValue(value: AcceptableValue | AcceptableValue[] | null | undefined) {
	if (value === null || value === undefined) {
		return undefined;
	}
	return isModelValue(value) ? value : undefined;
}

function resolveDisplayValue(value: unknown): string | undefined {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}

	const items = optionItems.value;

	if (Array.isArray(value)) {
		const labels = value
			.map((entry: unknown) => {
				const found = items.find((item) => item.value === entry);
				return found?.label ?? stringifyPrimitive(entry);
			})
			.filter((label): label is string => Boolean(label));

		return labels.length > 0 ? labels.join(', ') : undefined;
	}

	const found = items.find((item) => item.value === value);
	if (found !== undefined) {
		return found.label;
	}

	return stringifyPrimitive(value);
}
</script>

<template>
	<SelectRoot
		v-slot="{ open: isMenuOpen, modelValue: selectedValue }"
		v-bind="rootBind()"
		:model-value="rootModelValue"
		@update:model-value="handleModelValueUpdate"
		@update:open="emit('update:open', $event)"
	>
		<SelectTrigger
			:id="id"
			ref="trigger"
			as="div"
			data-test-id="select-trigger"
			v-bind="triggerAttrs()"
			:tabindex="disabled ? undefined : 0"
			:class="[$style.selectTrigger, variantClasses[variant], size, triggerClass()]"
		>
			<template
				v-for="selectedItem in [getSelectedItem(selectedValue)]"
				:key="selectedItem?.value ?? 'none'"
			>
				<span
					v-if="!multiple && selectedItem && (selectedItem.icon || $slots['item-leading'])"
					:class="$style.selectedIcon"
				>
					<slot name="item-leading" :item="selectedItem" :ui="selectedIconUi()">
						<Icon
							v-if="selectedItem.icon"
							:icon="selectedItem.icon"
							color="text-base"
							v-bind="selectedIconUi()"
						/>
					</slot>
				</span>
				<span v-else-if="icon" :class="$style.selectedIcon">
					<Icon :icon="icon" color="text-base" v-bind="selectedIconUi()" />
				</span>
			</template>
			<RSelectValue :placeholder="resolvedPlaceholder()" :class="$style.selectValue">
				<slot :model-value="slotModelValue(selectedValue)" :open="isMenuOpen">
					{{ resolveDisplayValue(selectedValue) ?? resolvedPlaceholder() }}
				</slot>
			</RSelectValue>
			<button
				v-if="showClearButton(selectedValue)"
				type="button"
				data-test-id="select-clear"
				:class="$style.clearButton"
				:aria-label="t('nds.select.clear')"
				@mousedown.prevent
				@pointerdown.stop.prevent
				@click.stop="onClear"
			>
				<Icon icon="x" size="small" />
			</button>
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
				:class="[$style.selectContent, size, contentClass]"
				:position="position"
				side="bottom"
				:side-offset="sideOffset"
			>
				<slot name="header" />

				<div :class="$style.viewportRegion">
					<SelectScrollUpButton
						v-if="hasSelectableItems"
						:class="[$style.selectScrollButton, $style.selectScrollButtonUp]"
						data-test-id="select-scroll-up"
					>
						<Icon icon="chevron-up" aria-hidden="true" />
					</SelectScrollUpButton>

					<SelectViewport :class="$style.selectViewport">
						<div v-if="!hasSelectableItems" :class="$style.empty" data-test-id="select-empty">
							<slot name="empty">
								{{ t('nds.select.noResults') }}
							</slot>
						</div>
						<template v-else>
							<template
								v-for="(section, sectionIndex) in sections"
								:key="`section-${sectionIndex}`"
							>
								<RSelectSeparator
									v-if="section.type === 'separator'"
									:class="$style.selectSeparator"
									aria-hidden="true"
								/>

								<SelectGroup v-else>
									<RSelectLabel v-if="section.label && section.group" :class="$style.selectLabel">
										<slot name="label" :item="section.group">
											{{ section.label }}
										</slot>
									</RSelectLabel>

									<template
										v-for="item in section.items"
										:key="`section-${sectionIndex}-item-${String(item.value)}`"
									>
										<slot name="item" :item="item">
											<N8nSelectItem
												v-bind="item"
												:class="$style.selectItem"
												:stroke-width="iconStrokeWidth()"
											>
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
							</template>
						</template>
					</SelectViewport>

					<SelectScrollDownButton
						v-if="hasSelectableItems"
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
	@include input-mixin.theme-variables(var(--border-color));

	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
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

	&:hover:not([data-disabled]):not(:focus-visible):not(:has(.clearButton:hover)) {
		border-color: var(--input--border-color--hover);
		box-shadow: var(--input--shadow--hover);
		cursor: pointer;
	}

	&:not([data-disabled]) {
		@include focus.focus-visible-ring;

		&:focus-visible {
			border-color: var(--input--border-color--focus);
			box-shadow: var(--input--shadow--focus);
			z-index: 1;
		}
	}

	&[data-placeholder] {
		color: var(--input--placeholder--color);
	}

	&[data-disabled] {
		color: var(--input--color--disabled);
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.variantGhost {
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--shadow--hover: 0 0 0 0 transparent;

	border-color: transparent;
	background-color: transparent;
	box-shadow: none;

	&:hover:not([data-disabled]):not(:focus-visible) {
		background-color: var(--background--hover);
	}
}

.variantFlush {
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--border-color--focus: transparent;
	--input--shadow--hover: 0 0 0 0 transparent;
	--input--shadow--focus: 0 0 0 0 transparent;

	border-color: transparent;
	background-color: transparent;
	box-shadow: none;
	padding: 0;
	min-height: auto;
	color: var(--text-color--subtle);

	&:hover:not([data-disabled]):not(:focus-visible) {
		background-color: transparent;
		color: var(--text-color);
	}

	&:focus-visible {
		border-color: transparent;
		box-shadow: none;
	}
}

.mini {
	@include input-mixin.size-variables('mini');
}

.small {
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
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	line-height: 0;
}

.selectedIconGlyph {
	display: block;
	flex-shrink: 0;
}

.clearButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	padding: 0;
	border: none;
	border-radius: var(--radius--full);
	background: transparent;
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}

	&:focus {
		outline: none;
		background-color: var(--background--hover);
		color: var(--text-color);
	}
}

.trailingIcon {
	margin-left: auto;
	flex-shrink: 0;
}

.selectContent {
	--select-viewport--padding: var(--spacing--4xs);

	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: max-content;
	min-width: max(var(--reka-select-trigger-width, 0px), var(--spacing--4xl));
	max-height: min(var(--reka-select-content-available-height, 50vh), calc(var(--height--5xl) * 3));
	border-radius: var(--input--radius);
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
	padding: var(--select-viewport--padding);
}

.empty {
	padding: var(--spacing--2xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	text-align: center;
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
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	line-height: var(--line-height--md);
}

.selectItem {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	border-radius: var(--input--radius);
	display: flex;
	align-items: flex-start;
	min-height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	user-select: none;
	color: var(--text-color);
	gap: var(--spacing--4xs);
	outline: none;

	&:not([data-disabled]) {
		cursor: pointer;
	}

	&:not([data-disabled])[data-highlighted] {
		background-color: var(--background--hover);
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.selectLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.selectSeparator {
	--select-separator-outline-inset: 1px;

	margin-block: var(--select-viewport--padding);
	margin-inline: calc(-1 * var(--select-viewport--padding) + var(--select-separator-outline-inset));
	border-top: var(--border);
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
	color: var(--text-color--subtler);

	&:hover {
		color: var(--text-color);
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
