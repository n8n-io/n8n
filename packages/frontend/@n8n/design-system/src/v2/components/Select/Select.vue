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
	mini: $style.mini,
	xsmall: $style.xsmall,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};
const size = computed(() => sizes[props.size]);

const strokeWidths: Record<SelectSizes, number> = {
	mini: 1,
	xsmall: 1,
	small: 1,
	medium: 1.5,
	large: 1.5,
	xlarge: 1.5,
};

const iconStrokeWidth = computed(() => strokeWidths[props.size]);

const labelSizes: Record<SelectSizes, string> = {
	mini: $style.selectLabelMini,
	xsmall: $style.selectLabelXsmall,
	small: $style.selectLabelSmall,
	medium: $style.selectLabelMedium,
	large: $style.selectLabelLarge,
	xlarge: $style.selectLabelXlarge,
};
const labelSize = computed(() => labelSizes[props.size]);

const groups = computed<SelectItemProps[]>(() => {
	if (!props.items?.length) return [];
	return props.items.map((item) => {
		return isSelectItem(item)
			? {
					...item,
					value: get(item, props.valueKey?.toString() ?? 'value'),
					label: get(item, props.labelKey?.toString() ?? 'label'),
					class: [$style.selectItem, item.class, size.value],
					strokeWidth: iconStrokeWidth.value,
				}
			: {
					value: item,
					label: String(item),
					class: [$style.selectItem, size.value],
				};
	});
});

const hasSelectedValue = computed(() => {
	if (Array.isArray(props.modelValue)) {
		return props.modelValue.length > 0;
	}

	return props.modelValue !== undefined && props.modelValue !== null && props.modelValue !== '';
});

const showClearButton = computed(
	() => props.clearable && hasSelectedValue.value && !props.disabled,
);

function clearValue() {
	if (props.multiple) {
		emit('update:modelValue', [] as GetModelValue<T, VK, M>);
	} else {
		emit('update:modelValue', undefined as GetModelValue<T, VK, M>);
	}

	emit('clear');
}

function onClearClick(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	clearValue();
}
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
			<Icon v-if="icon" :icon="icon" :class="$style.selectedIcon" :stroke-width="iconStrokeWidth" />
			<slot name="prefix" />
			<RSelectValue :placeholder="placeholder" :class="$style.selectValue">
				<slot :model-value="modelValue" :open="open" />
			</RSelectValue>
			<button
				v-if="showClearButton"
				type="button"
				:class="$style.clearButton"
				aria-label="Clear selection"
				@click="onClearClick"
			>
				<Icon icon="x" size="xsmall" />
			</button>
			<Icon
				icon="chevron-down"
				:class="[$style.trailingIcon, { [$style.trailingIconWithAuto]: !showClearButton }]"
			/>
		</SelectTrigger>

		<SelectPortal>
			<SelectContent
				:class="[$style.selectContent, contentClass]"
				position="popper"
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
							<SelectLabel v-if="item.type === 'label'" :class="[$style.selectLabel, labelSize]">
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

<style module lang="scss">
@use '../../../css/mixins/focus';

.selectTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: flex-start;

	--n8n-select--height: var(--height--md);
	--n8n-select--radius: var(--radius--3xs);
	--n8n-select--font-size: var(--font-size--2xs);
	--n8n-select--padding: var(--spacing--xs);

	--n8n-select--border-color: var(--border-color);
	--n8n-select--border-color-hover: var(--border-color--strong);
	--n8n-select--border-color-focus: var(--focus--border-color);
	--n8n-select--border-shadow: 0 0 0 1px var(--n8n-select--border-color);
	--n8n-select--border-shadow-hover: 0 0 0 1px var(--n8n-select--border-color-hover);
	--n8n-select--border-shadow-focus: 0 0 0 1px var(--n8n-select--border-color-focus);

	border-radius: var(--n8n-select--radius);
	font-size: var(--n8n-select--font-size);
	font-style: normal;
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	border: none;
	background-color: var(--background--surface);
	min-height: var(--n8n-select--height);
	position: relative;
	gap: var(--spacing--3xs);
	padding: 0 var(--n8n-select--padding);
	color: var(--color--text--shade-1);
	box-shadow: var(--n8n-select--border-shadow);
	min-width: var(--spacing--4xl);

	@include focus.focus-within-ring;

	&:not([data-disabled]):hover {
		background-color: var(--background--hover);
		cursor: pointer;
		box-shadow: var(--n8n-select--border-shadow-hover);
	}

	&:focus-within {
		box-shadow: var(--n8n-select--border-shadow-focus);
	}

	&[data-placeholder] {
		color: var(--text-color--subtler);
	}

	&[data-disabled] {
		color: var(--text-color--subtler);
		cursor: not-allowed;
	}
}

.xsmall {
	--n8n-select--height: var(--height--xs);
	--n8n-select--radius: var(--radius--3xs);
	--n8n-select--font-size: var(--font-size--2xs);
	--n8n-select--padding: var(--spacing--2xs);
}

.small {
	--n8n-select--height: var(--height--md);
	--n8n-select--radius: var(--radius--3xs);
	--n8n-select--font-size: var(--font-size--2xs);
	--n8n-select--padding: var(--spacing--xs);
}

.medium {
	--n8n-select--height: var(--height--lg);
	--n8n-select--radius: var(--radius--2xs);
	--n8n-select--font-size: var(--font-size--sm);
	--n8n-select--padding: var(--spacing--xs);
}

.large {
	--n8n-select--height: var(--height--xl);
	--n8n-select--radius: var(--radius--2xs);
	--n8n-select--font-size: var(--font-size--sm);
	--n8n-select--padding: var(--spacing--sm);
}

.xlarge {
	--n8n-select--height: var(--height--2xl);
	--n8n-select--radius: var(--radius--sm);
	--n8n-select--font-size: var(--font-size--md);
	--n8n-select--padding: var(--spacing--sm);
}

.mini {
	--n8n-select--height: var(--height--xs);
	--n8n-select--radius: var(--radius--3xs);
	--n8n-select--font-size: var(--font-size--2xs);
	--n8n-select--padding: var(--spacing--2xs);
}

.selectedIcon {
	flex-shrink: 0;
}

.clearButton {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color--subtle);

	&:not([disabled]) {
		cursor: pointer;
	}
}

.trailingIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.trailingIconWithAuto {
	margin-left: auto;
}

.selectContent {
	--n8n-select-popover--offset--slide-x: 0;
	--n8n-select-popover--offset--slide-y: 0;
	--n8n-select-popover--offset--origin-x: center;
	--n8n-select-popover--offset--origin-y: center;

	width: var(--reka-select-trigger-width);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	border: var(--border);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	will-change: transform, opacity;
	transform-origin: var(--n8n-select-popover--offset--origin-x)
		var(--n8n-select-popover--offset--origin-y);

	animation-duration: var(--duration--snappy);
	animation-timing-function: var(--easing--ease-out);

	&[data-state='open'] {
		animation-name: popoverIn;
	}

	&[data-state='closed'] {
		display: none;
	}
}

.selectContent[data-state='open'][data-side='top'] {
	--n8n-select-popover--offset--slide-y: -2px;
	--n8n-select-popover--offset--origin-y: bottom;
}

.selectContent[data-state='open'][data-side='right'] {
	--n8n-select-popover--offset--slide-x: 2px;
	--n8n-select-popover--offset--origin-x: left;
}

.selectContent[data-state='open'][data-side='bottom'] {
	--n8n-select-popover--offset--slide-y: 2px;
	--n8n-select-popover--offset--origin-y: top;
}

.selectContent[data-state='open'][data-side='left'] {
	--n8n-select-popover--offset--slide-x: -2px;
	--n8n-select-popover--offset--origin-x: right;
}

.selectContent[data-state='open'][data-side='top'][data-align='start'],
.selectContent[data-state='open'][data-side='bottom'][data-align='start'] {
	--n8n-select-popover--offset--slide-x: -2px;
	--n8n-select-popover--offset--origin-x: left;
}

.selectContent[data-state='open'][data-side='top'][data-align='end'],
.selectContent[data-state='open'][data-side='bottom'][data-align='end'] {
	--n8n-select-popover--offset--slide-x: 2px;
	--n8n-select-popover--offset--origin-x: right;
}

.selectContent[data-state='open'][data-side='left'][data-align='start'],
.selectContent[data-state='open'][data-side='right'][data-align='start'] {
	--n8n-select-popover--offset--slide-y: -2px;
	--n8n-select-popover--offset--origin-y: top;
}

.selectContent[data-state='open'][data-side='left'][data-align='end'],
.selectContent[data-state='open'][data-side='right'][data-align='end'] {
	--n8n-select-popover--offset--slide-y: 2px;
	--n8n-select-popover--offset--origin-y: bottom;
}

@keyframes popoverIn {
	from {
		opacity: 0;
		transform: translate(
				var(--n8n-select-popover--offset--slide-x),
				var(--n8n-select-popover--offset--slide-y)
			)
			scale(0.96);
	}
	to {
		opacity: 1;
		transform: translate(0, 0) scale(1);
	}
}

.selectViewport {
	padding: var(--spacing--4xs);
}

.selectValue {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.selectItem {
	--n8n-select-item--height: var(--height--md);
	--n8n-select-item--radius: var(--radius--3xs);
	--n8n-select-item--font-size: var(--font-size--xs);
	--n8n-select-item--padding: var(--spacing--2xs);

	font-size: var(--n8n-select-item--font-size);
	line-height: 1;
	border-radius: var(--n8n-select-item--radius);
	display: flex;
	align-items: center;
	height: var(--n8n-select-item--height);
	padding: 0 var(--n8n-select-item--padding);
	position: relative;
	user-select: none;
	color: var(--color--text--shade-1);
	gap: var(--spacing--3xs);

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted] {
			background-color: var(--color--background--light-1);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.selectLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--color--text--tint-1);
}

.selectLabelMedium {
	font-size: var(--font-size--2xs);
}

.selectLabelSmall {
	font-size: var(--font-size--2xs);
}

.selectLabelXsmall {
	font-size: var(--font-size--2xs);
}

.selectLabelLarge {
	font-size: var(--font-size--2xs);
}

.selectLabelXlarge {
	font-size: var(--font-size--2xs);
}

.selectLabelMini {
	font-size: var(--font-size--2xs);
}

.selectSeparator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--3xs);
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
	--n8n-select-scroll-button--height: var(--height--md);

	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--n8n-select-scroll-button--height);
	cursor: default;
}
</style>
