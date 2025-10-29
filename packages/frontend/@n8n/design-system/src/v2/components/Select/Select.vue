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
	default: $style.Default,
	ghost: $style.Ghost,
};

const variant = computed(() => variants[props.variant]);

const sizes: Record<SelectSizes, string> = {
	xsmall: $style.XSmall,
	small: $style.Small,
	medium: $style.Medium,
};
const size = computed(() => sizes[props.size]);

const strokeWidths = {
	xsmall: 1,
	small: 1,
	medium: 1.5,
};

const iconStrokeWidth = computed(() => strokeWidths[props.size]);

const labelSizes: Record<SelectSizes, string> = {
	xsmall: $style.SelectLabelXSmall,
	small: $style.SelectLabelSmall,
	medium: $style.SelectLabelMedium,
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
					class: [$style.SelectItem, item.class, size.value],
					strokeWidth: iconStrokeWidth.value,
				}
			: {
					value: item,
					label: String(item),
					class: [$style.SelectItem, size.value],
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
			:class="[$style.SelectTrigger, variant, size]"
			:aria-label="$attrs['aria-label'] ?? placeholder"
		>
			<Icon v-if="icon" :icon="icon" :class="$style.SelectedIcon" :stroke-width="iconStrokeWidth" />
			<RSelectValue :placeholder="placeholder" :class="$style.SelectValue">
				<slot :model-value="modelValue" :open="open" />
			</RSelectValue>
			<Icon icon="chevron-down" :class="$style.TrailingIcon" />
		</SelectTrigger>

		<SelectPortal>
			<SelectContent :class="$style.SelectContent">
				<SelectScrollUpButton :class="$style.SelectScrollButton">
					<Icon icon="chevron-up" />
				</SelectScrollUpButton>

				<SelectViewport :class="$style.SelectViewport">
					<SelectGroup>
						<template v-for="(item, index) in groups" :key="`group-${index}`">
							<SelectLabel v-if="item.type === 'label'" :class="[$style.SelectLabel, labelSize]">
								{{ item.label }}
							</SelectLabel>

							<SelectSeparator
								v-else-if="item.type === 'separator'"
								:class="$style.SelectSeparator"
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

				<SelectScrollDownButton :class="$style.SelectScrollButton">
					<Icon icon="chevron-down" />
				</SelectScrollDownButton>
			</SelectContent>
		</SelectPortal>
	</SelectRoot>
</template>

<style module>
.SelectTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: flex-start;

	border-radius: var(--radius);
	font-size: var(--font-size--xs);
	font-style: normal;
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	border: 1px solid transparent;
	background-color: var(--color--background--light-2);
	height: var(--spacing--lg);
	position: relative;
	gap: var(--spacing--3xs);
	color: var(--color--text--shade-1);

	&:focus {
		box-shadow: 0 0 0 2px var(--color--secondary);
		z-index: 1;
	}

	&:not([data-disabled]):hover {
		background-color: var(--color--background--light-1);
		cursor: pointer;
	}

	&[data-placeholder] {
		color: var(--color--text);
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.Default {
	border: var(--border);
}

.Ghost {
	/** nothing to see here */
}

.XSmall {
	min-height: var(--spacing--lg);
	padding: 0 var(--spacing--2xs);
	font-size: var(--font-size--2xs);
}

.Small {
	min-height: 28px;
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--2xs);
}

.Medium {
	min-height: 36px;
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--sm);
}

.SelectedIcon {
	flex-shrink: 0;
}

.TrailingIcon {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--color--text--shade-1);
}

.SelectContent {
	overflow: hidden;
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
	/**
	 * High z-index to ensure select dropdown is above other elements
	 * TODO: Replace with design system z-index variable when available
	 */
	z-index: 999999;
}

.SelectViewport {
	padding: var(--spacing--4xs);
}

.SelectValue {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.SelectItem {
	font-size: var(--font-size--xs);
	line-height: 1;
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	height: var(--spacing--lg);
	padding: 0 var(--spacing--2xs);
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

.SelectLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--color--text--tint-1);
}

.SelectLabelMedium {
	font-size: var(--font-size--2xs);
}

.SelectLabelSmall {
	font-size: var(--font-size--2xs);
}

.SelectLabelXSmall {
	font-size: var(--font-size--2xs);
}

.SelectSeparator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--3xs);
}

.SelectItemIndicator {
	position: absolute;
	left: 0;
	width: 25px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.SelectScrollButton {
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--spacing--lg);
	cursor: default;
}
</style>
