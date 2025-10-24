<script
	setup
	lang="ts"
	generic="
		T extends ArrayOrNested<SelectItem>,
		VK extends GetItemKeys<T> = 'value',
		M extends boolean = false
	"
>
import { reactivePick } from '@vueuse/core';
import {
	SelectItem as RSelectItem,
	SelectValue as RSelectValue,
	SelectContent,
	SelectGroup,
	SelectItemIndicator,
	SelectItemText,
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
import { get, isArrayOfArray } from '@n8n/design-system/v2/utils';
import type {
	ArrayOrNested,
	GetItemKeys,
	GetModelValue,
	NestedItem,
} from '@n8n/design-system/v2/utils/types';

import type {
	SelectEmits,
	SelectItem,
	SelectProps,
	SelectSlots,
	SelectValue,
	SelectSizes,
	SelectVariants,
} from './Select.types';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();

const props = withDefaults(defineProps<SelectProps<T, VK, M>>(), {
	valueKey: 'value' as never,
	labelKey: 'label' as never,
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

const groups = computed<SelectItem[][]>(() => {
	if (!props.items?.length) return [];
	return isArrayOfArray(props.items) ? props.items : [props.items];
});

const triggerRef = useTemplateRef<InstanceType<typeof SelectTrigger>>('trigger');

function isSelectItem(item: SelectItem): item is Exclude<SelectItem, SelectValue> {
	return typeof item === 'object' && item !== null;
}

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
			<Icon v-if="icon" :icon="icon" />
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
					<SelectGroup v-for="(group, groupIndex) in groups" :key="`group-${groupIndex}`">
						<template v-for="(item, index) in group" :key="`group-${groupIndex}-${index}`">
							<SelectLabel
								v-if="isSelectItem(item) && item.type === 'label'"
								:class="$style.SelectLabel"
							>
								{{ get(item, props.labelKey as string) }}
							</SelectLabel>

							<SelectSeparator
								v-else-if="isSelectItem(item) && item.type === 'separator'"
								:class="$style.SelectSeparator"
								role="separator"
							/>

							<RSelectItem
								v-else
								:disabled="isSelectItem(item) && item.disabled"
								:value="isSelectItem(item) ? get(item, props.valueKey as string) : item"
								:class="$style.SelectItem"
								@select="isSelectItem(item) && item.onSelect?.($event)"
							>
								<slot name="item" :item="item as NestedItem<T>" :index="index">
									<slot name="item-leading" :item="item as NestedItem<T>" :index="index">
										<Icon v-if="isSelectItem(item) && item.icon" :icon="item.icon" />
									</slot>

									<SelectItemText>
										<slot name="item-label" :item="item as NestedItem<T>" :index="index">
											{{ isSelectItem(item) ? get(item, props.labelKey as string) : item }}
										</slot>
									</SelectItemText>

									<span :class="$style.ItemTrailing">
										<slot name="item-trailing" :item="item as NestedItem<T>" :index="index" />

										<SelectItemIndicator as-child>
											<Icon icon="check" />
										</SelectItemIndicator>
									</span>
								</slot>
							</RSelectItem>
						</template>

						<SelectSeparator
							v-if="groups.length > 1 && groupIndex < groups.length - 1"
							:class="$style.SelectSeparator"
							role="separator"
						/>
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
	height: 24px;
	position: relative;
	gap: 6px;
	color: var(--text--color);

	&:focus {
		box-shadow: 0 0 0 2px var(--color--secondary);
		z-index: 1;
	}

	&:not([data-disabled]):hover {
		background-color: var(--color--background--light-1);
		cursor: pointer;
	}

	&[data-placeholder] {
		color: var(--color--text--tint-1);
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
	min-height: 24px;
	padding: 0 8px;
}

.Small {
	min-height: 28px;
	padding: 0 10px;
}

.Medium {
	min-height: 36px;
	padding: 0 12px;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--sm);
}

.TrailingIcon {
	margin-left: auto;
	flex-shrink: 0;
}

.ItemTrailing {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.SelectContent {
	overflow: hidden;
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
	/**
	 * This is a very high z-index value to ensure the select component is always on top
	 * we should remove this and use the auto z-index management system later on
	 * i doubt this will cause issues given that if the content is visible it's the only thing a user can interact with
	 */
	z-index: 999999;
}

.SelectViewport {
	padding: 5px;
	background:
		linear-gradient(var(--color--background--light-2) 30%, rgba(255, 255, 255, 0)) center top,
		linear-gradient(rgba(255, 255, 255, 0), var(--color--background--light-2) 70%) center bottom,
		radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0)) center top,
		radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0)) center bottom;

	background-repeat: no-repeat;
	background-size:
		100% 40px,
		100% 40px,
		100% 5px,
		100% 5px;
	background-attachment: local, local, scroll, scroll;
}

.SelectValue {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.SelectItem {
	font-size: 13px;
	line-height: 1;
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	height: 24px;
	padding: 0 8px;
	position: relative;
	user-select: none;
	color: var(--text--color);
	gap: 6px;
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
	padding: 6px 8px 4px;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.SelectSeparator {
	height: 1px;
	background-color: var(--border-color);
	margin: 6px;
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
	height: 24px;
	cursor: default;
}
</style>
