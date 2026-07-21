<script setup lang="ts">
import { isRecord } from '@n8n/utils/is-record';
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

import { N8nTagsInput2, TagsInputInput, type TagsInputValue } from '../TagsInput';
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
});
const emit = defineEmits<ComboboxEmits>();
defineSlots<ComboboxSlots>();
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
		'openOnClick',
		'highlightOnHover',
	),
	emit,
);

function isPrimitiveComboboxValue(item: ComboboxItem): item is string {
	return typeof item === 'string';
}

const anchorRef = useTemplateRef<InstanceType<typeof ComboboxAnchor>>('anchor');
const inputRef = useTemplateRef<
	InstanceType<typeof ComboboxInput> | InstanceType<typeof TagsInputInput>
>('input');

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
			return {
				value: item,
				label: item,
				textValue: item,
			};
		}

		return {
			...item,
			value: get<AcceptableValue>(item, props.valueKey) ?? '',
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
		return '';
	}

	if (isRecord(value)) {
		return String(get(value, props.labelKey) ?? '');
	}

	const matchedItem = groups.value.find((item) => item.value === value);
	if (matchedItem?.label !== undefined) {
		return matchedItem.label;
	}

	if (typeof value === 'string') {
		return value;
	}

	return '';
}

function getTagLabel(value: TagsInputValue): string {
	return getDisplayValue(value);
}

const selectedTags = computed<TagsInputValue[]>(() => {
	if (!props.multiple || !Array.isArray(props.modelValue)) {
		return [];
	}

	return props.modelValue;
});

const hasValue = computed(() => {
	const { modelValue, multiple } = props;

	if (multiple) {
		return Array.isArray(modelValue) && modelValue.length > 0;
	}

	return modelValue !== undefined && modelValue !== null && modelValue !== '';
});

const showClearButton = computed(() => props.clearable && !props.disabled && hasValue.value);

const selectedItem = computed(() => {
	if (props.multiple) {
		return undefined;
	}

	const { modelValue } = props;
	if (modelValue === undefined || modelValue === null || Array.isArray(modelValue)) {
		return undefined;
	}

	return groups.value.find(
		(item) => item.type !== 'label' && item.type !== 'separator' && item.value === modelValue,
	);
});

const leadingIcon = computed(() => selectedItem.value?.icon ?? props.icon);

function onClear() {
	emit('update:modelValue', props.multiple ? [] : undefined);

	void nextTick(() => {
		const element = inputRef.value?.$el;
		if (!(element instanceof HTMLInputElement)) {
			return;
		}

		element.value = '';
		element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		element.focus();
	});
}

function onTagsUpdate(value: TagsInputValue[]) {
	emit('update:modelValue', value);
}

function onInput(event: Event) {
	if (props.multiple || !hasValue.value) return;
	if (!(event.target instanceof HTMLInputElement)) return;

	if (event.target.value === '') {
		emit('update:modelValue', undefined);
	}
}
</script>

<template>
	<ComboboxRoot
		:name="props.name"
		v-bind="rootProps"
		:disabled="props.disabled"
		:default-value="props.defaultValue"
		:model-value="props.modelValue"
		:open-on-focus="true"
	>
		<ComboboxAnchor
			ref="anchor"
			data-test-id="combobox"
			v-bind="$attrs"
			:class="[$style.comboboxAnchor, sizeClass, props.multiple && $style.multiple]"
			:data-disabled="props.disabled || undefined"
			:data-multiple="props.multiple || undefined"
			:data-empty="hasValue ? undefined : true"
		>
			<span v-if="!props.multiple && leadingIcon" :class="$style.leadingIcon">
				<slot
					v-if="selectedItem?.icon"
					name="item-leading"
					:item="selectedItem"
					:ui="{ class: $style.leadingIconGlyph }"
				>
					<Icon :icon="selectedItem.icon" :class="$style.leadingIconGlyph" size="large" />
				</slot>
				<Icon v-else :icon="leadingIcon" :class="$style.leadingIconGlyph" size="large" />
			</span>

			<N8nTagsInput2
				v-if="props.multiple"
				:embedded="true"
				:model-value="selectedTags"
				:size="props.size"
				:disabled="props.disabled"
				:display-value="getTagLabel"
				:placeholder="props.placeholder"
				:auto-focus="props.autoFocus"
				@update:model-value="onTagsUpdate"
			>
				<template #input="inputProps">
					<ComboboxInput
						:id="props.id"
						as-child
						:display-value="getDisplayValue"
						:aria-label="$attrs['aria-label'] ?? props.placeholder"
					>
						<TagsInputInput
							:id="inputProps.id"
							ref="input"
							:class="inputProps.class"
							:placeholder="inputProps.placeholder"
							:auto-focus="inputProps.autoFocus"
							:disabled="inputProps.disabled"
							@keydown.enter.prevent
						/>
					</ComboboxInput>
				</template>
			</N8nTagsInput2>

			<ComboboxInput
				v-else
				:id="props.id"
				ref="input"
				:class="$style.comboboxInput"
				:placeholder="props.placeholder"
				:auto-focus="props.autoFocus"
				:display-value="getDisplayValue"
				:aria-label="$attrs['aria-label'] ?? props.placeholder"
				@input="onInput"
			/>

			<button
				v-if="showClearButton"
				type="button"
				:class="$style.clearButton"
				:aria-label="t('combobox.clearSelection')"
				@mousedown.prevent
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

	&.multiple {
		--tags-input--padding: var(--spacing--4xs);
		padding: var(--tags-input--padding);
		padding-inline-end: var(--input--padding);
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
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	line-height: 0;
}

.leadingIconGlyph {
	display: block;
	flex-shrink: 0;
}

.comboboxInput {
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
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;

	&::after {
		content: '';
		position: absolute;
		width: var(--input--height);
		height: var(--input--height);
		inset-block-start: 50%;
		inset-inline-start: 50%;
		transform: translate(-50%, -50%);
	}

	&:disabled {
		cursor: not-allowed;
	}
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
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover {
		color: var(--color--text--shade-1);
	}

	&:focus {
		outline: none;
		background-color: var(--background--hover);
		color: var(--color--text--shade-1);
	}
}

.trailingIcon {
	flex-shrink: 0;
	color: var(--input--color--text);
}

.comboboxAnchor[data-empty] .trailingIcon {
	color: var(--input--placeholder--color);
}

.comboboxAnchor:not([data-disabled])[data-empty] .comboboxTrigger:hover .trailingIcon {
	color: var(--color--text--shade-1);
}

.comboboxAnchor[data-disabled][data-empty] .trailingIcon {
	color: var(--input--placeholder--color--disabled);
}

.comboboxAnchor[data-disabled]:not([data-empty]) .trailingIcon {
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
	font-size: var(--font-size--xs);
	color: var(--text-color--subtler);
	text-align: center;
}

.comboboxLabel {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.comboboxSeparator {
	--combobox-separator-outline-inset: 1px;

	margin-block: var(--combobox-viewport--padding);
	margin-inline: calc(
		-1 * var(--combobox-viewport--padding) + var(--combobox-separator-outline-inset)
	);
	border-top: 1px solid var(--border-color);
}
</style>
