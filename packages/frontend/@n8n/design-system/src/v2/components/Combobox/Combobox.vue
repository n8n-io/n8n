<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxLabel,
	ComboboxPortal,
	ComboboxRoot,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxViewport,
	useForwardPropsEmits,
} from './Combobox.reka';
import { computed, useCssModule, useTemplateRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { get } from '@n8n/design-system/v2/utils';

import type {
	ComboboxEmits,
	ComboboxItem,
	ComboboxListItem,
	ComboboxProps,
	ComboboxSizes,
	ComboboxSlots,
	ComboboxVariants,
} from './Combobox.types';
import N8nComboboxItem from './ComboboxItem.vue';

defineOptions({ inheritAttrs: false });

type N8nComboboxUiProps = {
	id?: string;
	placeholder?: string;
	emptyText?: string;
	size?: ComboboxSizes;
	valueKey?: string;
	labelKey?: string;
	items?: ComboboxItem[];
	variant?: ComboboxVariants;
	icon?: IconName;
	side?: 'top' | 'right' | 'bottom' | 'left';
	sideOffset?: number;
	contentClass?: string;
};

const $style = useCssModule();

const props = withDefaults(defineProps<ComboboxProps & N8nComboboxUiProps>(), {
	placeholder: 'Select an option',
	emptyText: 'No results found.',
	variant: 'default',
	size: 'large',
	side: 'bottom',
	sideOffset: 4,
	valueKey: 'value',
	labelKey: 'label',
});
const emit = defineEmits<ComboboxEmits>();
const slots = defineSlots<ComboboxSlots>();

const rootProps = useForwardPropsEmits(
	reactivePick(
		props,
		'open',
		'defaultOpen',
		'disabled',
		'required',
		'multiple',
		'ignoreFilter',
		'resetSearchTermOnBlur',
		'resetSearchTermOnSelect',
		'openOnFocus',
		'openOnClick',
		'highlightOnHover',
	),
	emit,
);

function isComboboxListItem(item: ComboboxItem): item is ComboboxListItem {
	return typeof item === 'object' && item !== null;
}

const anchorRef = useTemplateRef<InstanceType<typeof ComboboxAnchor>>('anchor');

defineExpose({
	anchorRef,
});

const variants: Record<ComboboxVariants, string> = {
	default: $style.default,
	ghost: $style.ghost,
};

const variant = computed(() => variants[props.variant]);

const sizes: Record<ComboboxSizes, string> = {
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};
const size = computed(() => sizes[props.size]);

const groups = computed<ComboboxListItem[]>(() => {
	if (!props.items?.length) return [];
	return props.items.map((item) => {
		return isComboboxListItem(item)
			? {
					...item,
					value: get(item, props.valueKey),
					label: get(item, props.labelKey),
					textValue: get(item, props.labelKey),
					size: item.size ?? props.size,
				}
			: {
					value: item,
					label: String(item),
					textValue: String(item),
					size: props.size,
				};
	});
});

function getDisplayValue(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value !== 'object') {
		return String(value);
	}

	return String(get(value as Record<string, unknown>, props.labelKey) ?? '');
}
</script>

<template>
	<ComboboxRoot
		v-slot="{ open }"
		:name="name"
		v-bind="rootProps"
		:disabled="disabled"
		:default-value="defaultValue"
		:model-value="modelValue"
	>
		<ComboboxAnchor
			ref="anchor"
			data-test-id="combobox"
			v-bind="$attrs"
			:class="[$style.comboboxAnchor, variant, size]"
		>
			<Icon v-if="icon" :icon="icon" :class="$style.leadingIcon" />
			<ComboboxInput
				:id="id"
				:class="$style.comboboxInput"
				:placeholder="placeholder"
				:display-value="getDisplayValue"
				:aria-label="$attrs['aria-label'] ?? placeholder"
			>
				<slot :model-value="modelValue" :open="open" />
			</ComboboxInput>
			<ComboboxTrigger :class="$style.comboboxTrigger" tabindex="-1">
				<Icon icon="chevron-down" :class="$style.trailingIcon" />
			</ComboboxTrigger>
		</ComboboxAnchor>

		<ComboboxPortal>
			<ComboboxContent
				position="popper"
				align="start"
				:class="[$style.comboboxContent, contentClass]"
				:side="side"
				:side-offset="sideOffset"
			>
				<slot name="header" />

				<ComboboxViewport :class="$style.comboboxViewport">
					<ComboboxEmpty :class="$style.comboboxEmpty">
						{{ emptyText }}
					</ComboboxEmpty>

					<ComboboxGroup>
						<template v-for="(item, index) in groups" :key="`group-${index}`">
							<ComboboxLabel v-if="item.type === 'label'" :class="$style.comboboxLabel">
								<slot name="label" :item="item">
									{{ item.label }}
								</slot>
							</ComboboxLabel>

							<ComboboxSeparator
								v-else-if="item.type === 'separator'"
								:class="$style.comboboxSeparator"
								role="separator"
							/>

							<slot v-else name="item" :item="item">
								<N8nComboboxItem v-bind="item">
									<template #item-leading="{ ui }">
										<slot name="item-leading" :item="item" :ui="ui" />
									</template>
									<template #item-label>
										<slot name="item-label" :item="item">
											{{ item.label }}
										</slot>
									</template>
									<template #item-trailing="{ ui }">
										<slot name="item-trailing" :item="item" :ui="ui" />
									</template>
								</N8nComboboxItem>
							</slot>
						</template>
					</ComboboxGroup>
				</ComboboxViewport>

				<slot name="footer" />
			</ComboboxContent>
		</ComboboxPortal>
	</ComboboxRoot>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/input' as input-mixin;
@use '@n8n/design-system/css/mixins/motion';

.comboboxAnchor {
	display: inline-flex;
	align-items: center;
	justify-content: flex-start;

	@include input-mixin.size-variables('large');

	--input--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	--input--shadow: 0 0 0 0 transparent;
	--input--shadow--hover: 0 0 0 0 transparent;
	--input--shadow--focus: 0 0 0 0 transparent;
	--input--border-color: transparent;
	--input--border-color--hover: var(--border-color--strong);
	--input--border-color--focus: var(--focus--border-color);
	--input--border--shadow: 0 0 0 1px var(--input--border-color);
	--input--border--shadow--hover: 0 0 0 1px var(--input--border-color--hover);
	--input--border--shadow--focus: 0 0 0 1px var(--input--border-color--focus);

	border-radius: var(--input--radius--top-left, var(--input--radius))
		var(--input--radius--top-right, var(--input--radius))
		var(--input--radius--bottom-right, var(--input--radius))
		var(--input--radius--bottom-left, var(--input--radius));
	font-size: var(--input--font-size);
	font-style: normal;
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	background-color: var(--input--color--background);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	position: relative;
	gap: var(--spacing--3xs);
	color: var(--color--text--shade-1);

	@include focus.focus-within-ring;

	&:not([data-disabled]):hover:not(:focus-within) {
		cursor: text;
		box-shadow:
			var(--input--shadow--hover),
			inset var(--input--border--shadow--hover);
	}

	&:focus-within {
		box-shadow:
			var(--input--shadow--focus),
			inset var(--input--border--shadow--focus);
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.default {
	--input--border-color: var(--border-color);
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

.leadingIcon {
	flex-shrink: 0;
}

.comboboxInput {
	flex: 1;
	min-width: 0;
	padding: 0;
	border: none;
	background: transparent;
	outline: none;
	font: inherit;

	&::placeholder {
		color: var(--color--text);
	}

	&:disabled {
		cursor: not-allowed;
	}
}

.comboboxTrigger {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--color--text--shade-1);
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
	}
}

.trailingIcon {
	flex-shrink: 0;
	color: var(--color--text--shade-1);
}

.comboboxContent {
	--n8n--dropdown--offset--slide-x: 0;
	--n8n--dropdown--offset--slide-y: 0;
	--n8n--dropdown--offset--origin-x: center;
	--n8n--dropdown--offset--origin-y: center;
	--animation--popover-in--translate-x: var(--n8n--dropdown--offset--slide-x);
	--animation--popover-in--translate-y: var(--n8n--dropdown--offset--slide-y);

	overflow: hidden;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	--shadow-color--outline: var(--border-color);
	box-shadow:
		var(--shadow--md),
		inset var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--n8n--dropdown--offset--origin-x) var(--n8n--dropdown--offset--origin-y);
	/**
	 * High z-index to ensure combobox dropdown is above other elements
	 * TODO: Replace with design system z-index variable when available
	 */
	z-index: 999999;

	min-width: var(--reka-combobox-trigger-width);
	max-height: var(--reka-combobox-content-available-height);

	&[data-state='open'] {
		@include motion.popover-in;
	}

	&[data-state='closed'] {
		display: none;
	}

	&[data-state='open'][data-side='top'] {
		--n8n--dropdown--offset--slide-y: -2px;
		--n8n--dropdown--offset--origin-y: bottom;
	}

	&[data-state='open'][data-side='right'] {
		--n8n--dropdown--offset--slide-x: 2px;
		--n8n--dropdown--offset--origin-x: left;
	}

	&[data-state='open'][data-side='bottom'] {
		--n8n--dropdown--offset--slide-y: 2px;
		--n8n--dropdown--offset--origin-y: top;
	}

	&[data-state='open'][data-side='left'] {
		--n8n--dropdown--offset--slide-x: -2px;
		--n8n--dropdown--offset--origin-x: right;
	}

	&[data-state='open'][data-side='top'][data-align='start'],
	&[data-state='open'][data-side='bottom'][data-align='start'] {
		--n8n--dropdown--offset--slide-x: -2px;
		--n8n--dropdown--offset--origin-x: left;
	}

	&[data-state='open'][data-side='top'][data-align='end'],
	&[data-state='open'][data-side='bottom'][data-align='end'] {
		--n8n--dropdown--offset--slide-x: 2px;
		--n8n--dropdown--offset--origin-x: right;
	}

	&[data-state='open'][data-side='left'][data-align='start'],
	&[data-state='open'][data-side='right'][data-align='start'] {
		--n8n--dropdown--offset--slide-y: -2px;
		--n8n--dropdown--offset--origin-y: top;
	}

	&[data-state='open'][data-side='left'][data-align='end'],
	&[data-state='open'][data-side='right'][data-align='end'] {
		--n8n--dropdown--offset--slide-y: 2px;
		--n8n--dropdown--offset--origin-y: bottom;
	}
}

.comboboxViewport {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
}

.comboboxEmpty {
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	text-align: center;
}

.comboboxLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.comboboxSeparator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--5xs) calc(var(--spacing--4xs) * -1);
}
</style>
