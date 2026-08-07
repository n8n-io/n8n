<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, nextTick, ref, useAttrs, useCssModule, useId, useTemplateRef, watch } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';

import { N8nTagsInput2, TagsInputInput, type TagsInputValue } from '../TagsInput';
import type {
	ComboboxEmits,
	ComboboxItem,
	ComboboxLabelItem,
	ComboboxOptionBase,
	ComboboxProps,
	ComboboxSeparatorItem,
	ComboboxSizes,
	ComboboxSlots,
	ComboboxValue,
} from './Combobox.types';
import N8nComboboxItem from './ComboboxItem.vue';
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
} from './reka-ui';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();
const attrs = useAttrs();

const props = withDefaults(defineProps<ComboboxProps>(), {
	size: 'large',
	side: 'bottom',
	sideOffset: 4,
	align: 'start',
	clearable: false,
	teleported: true,
});
const emit = defineEmits<ComboboxEmits>();
defineSlots<ComboboxSlots>();
const { t } = useI18n();

const placeholder = computed(() => props.placeholder ?? t('combobox.placeholder'));
const emptyText = computed(() => props.emptyText ?? t('combobox.emptyText'));
const generatedId = useId();
const inputId = computed(() => props.id ?? generatedId);

const inputNameAttrs = reactivePick(
	attrs,
	'aria-label',
	'aria-labelledby',
	'aria-describedby',
	'aria-errormessage',
	'aria-invalid',
);
const anchorAttrs = reactiveOmit(
	attrs,
	'aria-label',
	'aria-labelledby',
	'aria-describedby',
	'aria-errormessage',
	'aria-invalid',
);

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
	(event, ...args) => {
		// Handled by onModelValueUpdate so uncontrolled defaultValue stays in sync.
		if (event === 'update:modelValue') {
			return;
		}

		if (event === 'update:open') {
			emit('update:open', args[0] as boolean);
			return;
		}

		if (event === 'highlight') {
			emit('highlight', args[0] as ComboboxEmits['highlight'][0]);
		}
	},
);

const selectedValue = ref<ComboboxValue | ComboboxValue[] | undefined>(
	props.modelValue ?? props.defaultValue,
);

watch(
	() => props.modelValue,
	(value) => {
		selectedValue.value = value;
	},
);

function onModelValueUpdate(value: ComboboxValue | ComboboxValue[] | undefined) {
	selectedValue.value = value;
	emit('update:modelValue', value);
}

function isStructuralItem(item: ComboboxItem): item is ComboboxLabelItem | ComboboxSeparatorItem {
	return item.type === 'label' || item.type === 'separator';
}

function isOptionItem(item: ComboboxItem): item is ComboboxOptionBase {
	return !isStructuralItem(item);
}

function hasResolvableValue(value: ComboboxValue): boolean {
	return value !== '';
}

function warnInvalidItem(message: string, item: ComboboxItem) {
	if (!import.meta.env.DEV) {
		return;
	}

	// eslint-disable-next-line no-console
	console.warn(`[N8nCombobox2] ${message}`, item);
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

const groups = computed<ComboboxItem[]>(() => {
	if (!props.items?.length) return [];

	const result: ComboboxItem[] = [];

	for (const item of props.items) {
		if (item.type === 'label') {
			if (!item.label) {
				warnInvalidItem('Skipping label item: "label" is missing or empty.', item);
				continue;
			}
			result.push(item);
			continue;
		}

		if (item.type === 'separator') {
			result.push(item);
			continue;
		}

		if (!hasResolvableValue(item.value)) {
			warnInvalidItem(
				'Skipping item: "value" is missing or empty. Every selectable item needs a non-empty value.',
				item,
			);
			continue;
		}

		if (!item.label) {
			warnInvalidItem(
				'Skipping item: "label" is missing or empty. Every selectable item needs a label.',
				item,
			);
			continue;
		}

		result.push({
			...item,
			textValue: item.textValue ?? item.label,
		});
	}

	return result;
});

type ComboboxSection = {
	label?: ComboboxLabelItem;
	items: Array<ComboboxOptionBase | ComboboxSeparatorItem>;
};

const sections = computed<ComboboxSection[]>(() => {
	const result: ComboboxSection[] = [];
	let current: ComboboxSection = { items: [] };

	for (const item of groups.value) {
		if (item.type === 'label') {
			if (current.label || current.items.length > 0) {
				result.push(current);
			}
			current = { label: item, items: [] };
			continue;
		}

		current.items.push(item);
	}

	if (current.label || current.items.length > 0) {
		result.push(current);
	}

	return result;
});

function getDisplayValue(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (Array.isArray(value)) {
		return '';
	}

	const matchedItem = groups.value.find(
		(item): item is ComboboxOptionBase => isOptionItem(item) && item.value === value,
	);
	if (matchedItem) {
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

const selectedTags = computed(() => {
	if (!props.multiple || !Array.isArray(selectedValue.value)) {
		return [];
	}

	return selectedValue.value;
});

const hasValue = computed(() => {
	const value = selectedValue.value;

	if (props.multiple) {
		return Array.isArray(value) && value.length > 0;
	}

	return value !== undefined && value !== null && value !== '';
});

const showClearButton = computed(() => props.clearable && !props.disabled && hasValue.value);

const selectedItem = computed(() => {
	if (props.multiple) {
		return undefined;
	}

	const value = selectedValue.value;
	if (value === undefined || value === null || Array.isArray(value)) {
		return undefined;
	}

	return groups.value.find(
		(item): item is ComboboxOptionBase => isOptionItem(item) && item.value === value,
	);
});

const leadingIcon = computed(() => selectedItem.value?.icon ?? props.icon);

function onClear() {
	onModelValueUpdate(props.multiple ? [] : undefined);

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
	const nextValue: ComboboxValue[] = [];
	for (const tag of value) {
		if (typeof tag === 'string') {
			nextValue.push(tag);
		}
	}
	onModelValueUpdate(nextValue);
}
</script>

<template>
	<ComboboxRoot
		:name="props.name"
		v-bind="rootProps"
		:disabled="props.disabled"
		:model-value="selectedValue"
		:open-on-focus="true"
		@update:model-value="onModelValueUpdate"
	>
		<ComboboxAnchor
			ref="anchor"
			data-test-id="combobox"
			v-bind="anchorAttrs"
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
				:id="inputId"
				:embedded="true"
				:model-value="selectedTags"
				:size="props.size"
				:disabled="props.disabled"
				:display-value="getTagLabel"
				:placeholder="placeholder"
				:auto-focus="props.autoFocus"
				@update:model-value="onTagsUpdate"
			>
				<template #input="inputProps">
					<ComboboxInput
						:id="inputId"
						as-child
						:display-value="getDisplayValue"
						v-bind="inputNameAttrs"
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
				:id="inputId"
				ref="input"
				:class="$style.comboboxInput"
				:placeholder="placeholder"
				:auto-focus="props.autoFocus"
				:display-value="getDisplayValue"
				v-bind="inputNameAttrs"
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
			<ComboboxTrigger as-child>
				<button
					type="button"
					:class="$style.comboboxTrigger"
					tabindex="-1"
					:aria-label="t('combobox.showPopup')"
					@mousedown.prevent
				>
					<Icon icon="chevron-down" :class="$style.trailingIcon" />
				</button>
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
					<ComboboxEmpty :class="$style.comboboxEmpty" role="status">
						{{ emptyText }}
					</ComboboxEmpty>

					<ComboboxGroup
						v-for="(section, sectionIndex) in sections"
						:key="`section-${sectionIndex}`"
					>
						<ComboboxLabel v-if="section.label" :class="$style.comboboxLabel">
							<slot name="label" :item="section.label">
								{{ section.label.label }}
							</slot>
						</ComboboxLabel>

						<template
							v-for="(item, index) in section.items"
							:key="`section-${sectionIndex}-item-${index}`"
						>
							<ComboboxSeparator
								v-if="item.type === 'separator'"
								:class="$style.comboboxSeparator"
								aria-hidden="true"
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
	color: var(--text-color--subtle);
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
