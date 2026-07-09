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
} from 'reka-ui';
import { computed, nextTick, useCssModule, useTemplateRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';
import { get } from '@n8n/design-system/v2/utils';

import type {
	AcceptableValue,
	ComboboxEmits,
	ComboboxItem,
	ComboboxListItem,
	ComboboxProps,
	ComboboxSizes,
	ComboboxSlots,
} from './Combobox.types';
import N8nComboboxItem from './ComboboxItem.vue';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();

const props = withDefaults(defineProps<ComboboxProps>(), {
	placeholder: 'Select an option',
	emptyText: 'No results found.',
	size: 'large',
	side: 'bottom',
	sideOffset: 4,
	align: 'start',
	valueKey: 'value',
	labelKey: 'label',
	clearable: false,
	teleported: true,
	openOnFocus: true,
});
const emit = defineEmits<ComboboxEmits>();
const slots = defineSlots<ComboboxSlots>();
const { t } = useI18n();

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

function isPrimitiveComboboxValue(item: ComboboxItem): item is string | number | bigint | null {
	return item === null || typeof item !== 'object';
}

function stringifyAcceptableValue(value: string | number | bigint | null): string {
	if (typeof value === 'string') {
		return value;
	}

	return value === null ? 'null' : value.toString();
}

const anchorRef = useTemplateRef<InstanceType<typeof ComboboxAnchor>>('anchor');
const inputRef = useTemplateRef<InstanceType<typeof ComboboxInput>>('input');

defineExpose({
	anchorRef,
});

const sizes: Record<ComboboxSizes, string> = {
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};

const sizeClass = computed(() => sizes[props.size]);

const groups = computed<ComboboxListItem[]>(() => {
	if (!props.items?.length) return [];
	return props.items.map((item) => {
		if (isPrimitiveComboboxValue(item)) {
			const label = stringifyAcceptableValue(item);

			return {
				value: item,
				label,
				textValue: label,
			};
		}

		return {
			...item,
			value: get<AcceptableValue>(item, props.valueKey) ?? null,
			label: get<string>(item, props.labelKey),
			textValue: get<string>(item, props.labelKey),
		};
	});
});

function getDisplayValue(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (Array.isArray(value)) {
		return value.map((item) => getDisplayValue(item)).join(', ');
	}

	if (typeof value === 'object') {
		return String(get(value as Record<string, unknown>, props.labelKey) ?? '');
	}

	const matchedItem = groups.value.find((item) => item.value === value);
	if (matchedItem?.label !== undefined) {
		return matchedItem.label;
	}

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return value.toString();
	}

	return '';
}

const hasValue = computed(() => {
	const { modelValue, multiple } = props;

	if (multiple) {
		return Array.isArray(modelValue) && modelValue.length > 0;
	}

	return modelValue !== undefined && modelValue !== null && modelValue !== '';
});

const showClearButton = computed(() => props.clearable && !props.disabled && hasValue.value);

function focusInput() {
	void nextTick(() => {
		const element = inputRef.value?.$el;
		if (element instanceof HTMLInputElement) {
			element.focus();
		}
	});
}

function onClear() {
	emit('update:modelValue', props.multiple ? [] : undefined);
	focusInput();
}
</script>

<template>
	<ComboboxRoot
		v-slot="{ open }"
		:name="props.name"
		v-bind="rootProps"
		:disabled="props.disabled"
		:default-value="props.defaultValue"
		:model-value="props.modelValue"
	>
		<ComboboxAnchor
			ref="anchor"
			data-test-id="combobox"
			v-bind="$attrs"
			:class="[$style.comboboxAnchor, sizeClass]"
			:data-disabled="props.disabled || undefined"
		>
			<Icon v-if="props.icon" :icon="props.icon" :class="$style.leadingIcon" />
			<ComboboxInput
				:id="props.id"
				ref="input"
				:class="$style.comboboxInput"
				:placeholder="props.placeholder"
				:auto-focus="props.autoFocus"
				:display-value="getDisplayValue"
				:aria-label="$attrs['aria-label'] ?? props.placeholder"
			>
				<slot :model-value="props.modelValue" :open="open" />
			</ComboboxInput>
			<button
				v-if="showClearButton"
				type="button"
				:class="$style.clearButton"
				tabindex="-1"
				:aria-label="t('combobox.clearSelection')"
				@click.stop="onClear"
			>
				<Icon icon="x" size="small" />
			</button>
			<ComboboxTrigger :class="$style.comboboxTrigger" tabindex="-1">
				<Icon icon="chevron-down" :class="$style.trailingIcon" />
			</ComboboxTrigger>
		</ComboboxAnchor>

		<ComboboxPortal
			:disabled="!props.teleported && !props.portalTarget"
			v-bind="props.portalTarget ? { to: props.portalTarget } : {}"
		>
			<ComboboxContent
				position="popper"
				:class="[$style.comboboxContent, props.contentClass]"
				:align="props.align"
				:side="props.side"
				:side-offset="props.sideOffset"
			>
				<slot name="header" />

				<ComboboxViewport :class="$style.comboboxViewport">
					<ComboboxEmpty :class="$style.comboboxEmpty">
						{{ props.emptyText }}
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
									<template v-if="$slots['item-leading']" #item-leading="{ ui }">
										<slot name="item-leading" :item="item" :ui="ui" />
									</template>
									<template #item-label>
										<slot name="item-label" :item="item">
											{{ item.label }}
										</slot>
									</template>
									<template v-if="$slots['item-trailing']" #item-trailing="{ ui }">
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
@use '@n8n/design-system/css/mixins/popover' as popover;

.comboboxAnchor {
	@include input-mixin.size-variables('large');
	@include input-mixin.theme-variables(var(--border-color));

	display: inline-flex;
	align-items: center;
	justify-content: flex-start;
	position: relative;
	gap: var(--spacing--3xs);
	width: 100%;
	border-radius: var(--input--radius--top-left, var(--input--radius))
		var(--input--radius--top-right, var(--input--radius))
		var(--input--radius--bottom-right, var(--input--radius))
		var(--input--radius--bottom-left, var(--input--radius));
	font-size: var(--input--font-size);
	background-color: var(--input--color--background);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	color: var(--input--color--text);

	@include focus.focus-within-ring;

	&:not([data-disabled]):hover:not(:focus-within):not(:has(.clearButton:hover)) {
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
		cursor: not-allowed;
		opacity: 0.6;
		box-shadow:
			var(--input--shadow),
			inset var(--input--border--shadow);

		&:focus-within {
			outline: none;
			box-shadow:
				var(--input--shadow),
				inset var(--input--border--shadow);
		}
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

.leadingIcon {
	flex-shrink: 0;
}

.comboboxInput,
.comboboxAnchor :where(input[role='combobox']) {
	flex: 1;
	align-self: stretch;
	min-width: 0;
	width: 100%;
	min-height: var(--input--height);
	padding: 0;
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	font-size: inherit;
	color: inherit;

	&::placeholder {
		color: var(--input--placeholder--color);
	}

	&:focus,
	&:focus-visible {
		outline: none;
	}

	&:disabled {
		cursor: not-allowed;
		color: var(--input--color--disabled);

		&::placeholder {
			color: var(--input--placeholder--color--disabled);
		}
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

	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
	}
}

.clearButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.trailingIcon {
	flex-shrink: 0;
	color: var(--input--color--text);
}

.comboboxAnchor:has(input:placeholder-shown) .trailingIcon {
	color: var(--input--placeholder--color);
}

.comboboxAnchor[data-disabled]:has(input:placeholder-shown) .trailingIcon {
	color: var(--input--placeholder--color--disabled);
}

.comboboxAnchor[data-disabled]:has(input:not(:placeholder-shown)) .trailingIcon {
	color: var(--input--color--disabled);
}

.comboboxContent {
	--combobox-content--radius: var(--radius--xs);
	--popover-content--radius: var(--combobox-content--radius);

	@include popover.popover-surface;
	@include popover.popover-placement-offsets;

	--combobox-content--max-height: 500px;

	display: flex;
	flex-direction: column;
	min-width: var(--reka-combobox-trigger-width);
	max-height: min(
		var(--combobox-content--max-height),
		var(--reka-combobox-content-available-height, 100dvh)
	);
}

.comboboxViewport {
	--combobox-viewport--padding: var(--spacing--4xs);

	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	padding: var(--combobox-viewport--padding);
}

.comboboxEmpty {
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	text-align: center;
}

.comboboxLabel {
	padding: var(--spacing--3xs) var(--input--padding) var(--spacing--2xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
}

.comboboxSeparator {
	--combobox-separator-outline-inset: 1px;

	width: calc(
		100% + 2 * var(--combobox-viewport--padding) - 2 * var(--combobox-separator-outline-inset)
	);
	margin-block: var(--combobox-viewport--padding);
	margin-inline: calc(
		-1 * var(--combobox-viewport--padding) + var(--combobox-separator-outline-inset)
	);
	border-top: 1px solid var(--border-color);
}
</style>
