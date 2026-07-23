<script
	setup
	lang="ts"
	generic="
		T extends Array<SelectItem>,
		VK extends GetItemKeys<T> = 'value',
		M extends boolean = false
	"
>
import { reactivePick } from '@vueuse/core';
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
import { computed, useCssModule, useTemplateRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { get } from '@n8n/design-system/v2/utils';
import type { GetItemKeys, GetModelValue } from '@n8n/design-system/v2/utils/types';

import type {
	SelectEmits,
	SelectItem,
	SelectProps,
	SelectSlots,
	SelectValue,
	SelectSizes,
	SelectVariants,
	SelectItemProps,
} from './Select.types';
import N8nSelectItem from './SelectItem.vue';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();

const props = withDefaults(defineProps<SelectProps<T, VK, M>>(), {
	placeholder: 'Select an option',
	variant: 'default',
	size: 'small',
	position: 'item-aligned',
	side: 'bottom',
	sideOffset: 4,
});
const emit = defineEmits<SelectEmits<T, VK, M>>();
const slots = defineSlots<SelectSlots<T, VK, M>>();

const rootProps = useForwardPropsEmits(
	reactivePick(props, 'open', 'defaultOpen', 'disabled', 'autocomplete', 'required', 'multiple'),
	emit,
);

function isSelectItem(item: SelectItem): item is Exclude<SelectItem, SelectValue> {
	return typeof item === 'object' && item !== null;
}

const triggerRef = useTemplateRef<InstanceType<typeof SelectTrigger>>('trigger');

function castToSelectItemValue(
	value?: GetModelValue<T, VK, M>,
): Exclude<SelectItem, boolean> | Array<Exclude<SelectItem, boolean>> | undefined {
	return value as Exclude<SelectItem, boolean> | Array<Exclude<SelectItem, boolean>> | undefined;
}

defineExpose({
	triggerRef,
});

const variants: Record<SelectVariants, string> = {
	default: $style.default,
	ghost: $style.ghost,
};

const variant = computed(() => variants[props.variant]);

const sizes: Record<SelectSizes, string> = {
	xsmall: $style.xsmall,
	small: $style.small,
	medium: $style.medium,
};
const size = computed(() => sizes[props.size]);

const contentPosition = computed(() => {
	if (slots.prefix || slots.suffix) return 'popper';
	return props.position;
});

const strokeWidths = {
	xsmall: 1,
	small: 1,
	medium: 1.5,
};

const iconStrokeWidth = computed(() => strokeWidths[props.size]);

function getItemValue(item: SelectItem) {
	return isSelectItem(item) ? get(item, props.valueKey?.toString() ?? 'value') : item;
}

function getItemLabel(item: SelectItem) {
	if (!isSelectItem(item)) return String(item);
	const label = get(item, props.labelKey?.toString() ?? 'label');
	if (label !== undefined && label !== null && label !== '') return String(label);
	const value = getItemValue(item);
	return value === undefined || value === null ? '' : String(value);
}

function matchesSelectValue(itemValue: unknown, current: unknown) {
	if (Array.isArray(current)) {
		return current.some((value) => String(value) === String(itemValue));
	}
	return String(current) === String(itemValue);
}

/** Resolve trigger text from items so we don't flash placeholder when options unmount on close. */
const selectedDisplayLabel = computed(() => {
	const current = props.modelValue ?? props.defaultValue;
	if (current === undefined || current === null) return '';
	if (Array.isArray(current) && current.length === 0) return '';

	const items = props.items ?? [];
	if (Array.isArray(current)) {
		return current
			.map((value) => {
				const match = items.find((item) => matchesSelectValue(getItemValue(item), value));
				return match ? getItemLabel(match) : String(value);
			})
			.filter(Boolean)
			.join(', ');
	}

	const match = items.find((item) => matchesSelectValue(getItemValue(item), current));
	return match ? getItemLabel(match) : String(current);
});

const groups = computed<SelectItemProps[]>(() => {
	if (!props.items?.length) return [];
	return props.items.map((item) => {
		return isSelectItem(item)
			? {
					...item,
					value: get(item, props.valueKey?.toString() ?? 'value'),
					label: get(item, props.labelKey?.toString() ?? 'label'),
					class: [$style.selectItem, item.class],
					strokeWidth: iconStrokeWidth.value,
				}
			: {
					value: item,
					label: String(item),
					class: [$style.selectItem],
				};
	});
});
</script>

<template>
	<SelectRoot
		v-slot="{ open }"
		:name="name"
		v-bind="rootProps"
		:autocomplete="autocomplete"
		:disabled="disabled"
		:default-value="castToSelectItemValue(defaultValue)"
		:model-value="castToSelectItemValue(modelValue)"
	>
		<SelectTrigger
			:id="id"
			ref="trigger"
			v-bind="$attrs"
			:class="[$style.selectTrigger, variant, size]"
			:aria-label="$attrs['aria-label'] ?? placeholder"
		>
			<span v-if="slots.prefix" :class="$style.prefix">
				<slot name="prefix" />
			</span>
			<Icon v-if="icon" :icon="icon" :class="$style.selectedIcon" :stroke-width="iconStrokeWidth" />
			<RSelectValue :placeholder="placeholder" :class="$style.selectValue">
				<slot v-if="slots.default" :model-value="modelValue" :open="open" />
				<template v-else>{{ selectedDisplayLabel || placeholder }}</template>
			</RSelectValue>
			<span v-if="slots.suffix" :class="$style.suffix">
				<slot name="suffix" />
			</span>
			<Icon icon="chevron-down" :class="$style.trailingIcon" />
		</SelectTrigger>

		<SelectPortal>
			<SelectContent
				:class="[$style.selectContent, size, contentClass]"
				:position="contentPosition"
				:side="side"
				:side-offset="sideOffset"
			>
				<slot name="header" />

				<SelectScrollUpButton :class="$style.selectScrollButton">
					<Icon icon="chevron-up" />
				</SelectScrollUpButton>

				<SelectViewport :class="$style.selectViewport">
					<SelectGroup>
						<template v-for="(item, index) in groups" :key="`group-${index}`">
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

				<slot name="footer" />

				<SelectScrollDownButton :class="$style.selectScrollButton">
					<Icon icon="chevron-down" />
				</SelectScrollDownButton>
			</SelectContent>
		</SelectPortal>
	</SelectRoot>
</template>

<style lang="scss" module>
@use '../../../css/mixins/motion';
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/input' as input-mixin;

.selectTrigger {
	@include input-mixin.size-variables('small');
	@include input-mixin.theme-variables(var(--border-color));

	display: inline-flex;
	align-items: center;
	justify-content: flex-start;

	border: none;
	border-radius: var(--input--radius);
	font-size: var(--input--font-size);
	font-style: normal;
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	background-color: var(--input--color--background);
	height: var(--input--height);
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	position: relative;
	gap: var(--spacing--3xs);
	color: var(--color--text--shade-1);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);

	&:focus {
		@include focus.focus-ring;

		box-shadow:
			var(--input--shadow--focus),
			inset var(--input--border--shadow--focus);
		z-index: 1;
	}

	&:not([data-disabled]):hover:not(:focus) {
		background-color: var(--color--background--light-1);
		cursor: pointer;
		box-shadow:
			var(--input--shadow--hover),
			inset var(--input--border--shadow--hover);
	}

	&[data-placeholder] {
		color: var(--color--text);
	}

	&[data-disabled] {
		color: var(--input--color--disabled);
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.default {
	--input--border-color: var(--border-color);
}

.ghost {
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
}

.xsmall {
	@include input-mixin.size-variables('mini');
}

.small {
	@include input-mixin.size-variables('small');
}

.medium {
	@include input-mixin.size-variables('medium');
}

.selectedIcon {
	flex-shrink: 0;
}

.prefix,
.suffix {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--shade-1);
	opacity: 0.7;
	white-space: nowrap;
	translate: 0 -1px;

	svg {
		width: var(--spacing--sm);
		height: var(--spacing--sm);
	}
}

.prefix {
	/* Match Input prefix→value spacing while keeping a tighter value→chevron gap */
	margin-inline-end: calc(var(--input--padding) - var(--spacing--3xs));
}

.trailingIcon {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--color--text--shade-1);
	translate: 0 1px;
}

.selectContent {
	--shadow-color--outline: var(--border-color);
	--n8n--dropdown--offset--slide-x: 0;
	--n8n--dropdown--offset--slide-y: 0;
	--n8n--dropdown--offset--origin-x: center;
	--n8n--dropdown--offset--origin-y: center;
	--animation--popover-in--translate-x: var(--n8n--dropdown--offset--slide-x);
	--animation--popover-in--translate-y: var(--n8n--dropdown--offset--slide-y);

	display: flex;
	flex-direction: column;
	overflow: hidden;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--md), var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--n8n--dropdown--offset--origin-x) var(--n8n--dropdown--offset--origin-y);
	font-size: var(--input--font-size);
	/**
	 * High z-index to ensure select dropdown is above other elements
	 * TODO: Replace with design system z-index variable when available
	 */
	z-index: 9999;
	scrollbar-width: none;

	/* When in popper mode, match full trigger width (incl. prefix/suffix) */
	&[data-side] {
		width: var(--reka-select-trigger-width);
		min-width: var(--reka-select-trigger-width);
		max-height: var(--reka-select-content-available-height);
	}

	&[data-state='open'] {
		@include motion.popover-in;
	}

	&[data-state='open'][data-side='top'] {
		--n8n--dropdown--offset--slide-y: -2px;
		--n8n--dropdown--offset--origin-y: bottom;
	}

	&[data-state='open'][data-side='bottom'] {
		--n8n--dropdown--offset--slide-y: 2px;
		--n8n--dropdown--offset--origin-y: top;
	}

	&[data-state='open'][data-side='left'] {
		--n8n--dropdown--offset--slide-x: -2px;
		--n8n--dropdown--offset--origin-x: right;
	}

	&[data-state='open'][data-side='right'] {
		--n8n--dropdown--offset--slide-x: 2px;
		--n8n--dropdown--offset--origin-x: left;
	}
}

.selectViewport {
	padding: var(--spacing--4xs);
	scrollbar-width: none;
}

.selectValue {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.selectItem {
	font-size: var(--input--font-size);
	line-height: 1;
	border-radius: var(--radius--2xs);
	display: flex;
	align-items: center;
	min-height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--text-color);
	gap: var(--spacing--2xs);
	outline: none;

	&:not([data-disabled]) {
		cursor: pointer;

		/* Only highlight via data-highlighted (pointer + keyboard). Avoid :hover so a
		   hovered item doesn't stay lit when keyboard focus moves elsewhere. */
		&[data-highlighted] {
			background-color: var(--background--hover);
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.selectLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--input--font-size);
}

.selectSeparator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--5xs) calc(var(--spacing--4xs) * -1);
}

.selectItemIndicator {
	position: absolute;
	left: 0;
	width: 25px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.selectScrollButton {
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--spacing--lg);
	cursor: default;
}
</style>
