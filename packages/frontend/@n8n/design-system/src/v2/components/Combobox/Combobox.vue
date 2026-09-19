<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import {
	computed,
	getCurrentInstance,
	nextTick,
	ref,
	useAttrs,
	useCssModule,
	useId,
	useTemplateRef,
	watch,
} from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';

import { N8nTagsInput2, TagsInputInput, type TagsInputValue } from '../TagsInput';
import type {
	ComboboxEmits,
	ComboboxHeaderItem,
	ComboboxItem,
	ComboboxOptionBase,
	ComboboxProps,
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
	ComboboxTrigger,
	ComboboxViewport,
	useForwardPropsEmits,
} from './reka-ui';

defineOptions({ inheritAttrs: false });
defineSlots<ComboboxSlots>();
const emit = defineEmits<ComboboxEmits>();

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

const { t } = useI18n();

const placeholder = computed(() => props.placeholder ?? t('combobox.placeholder'));
const emptyText = computed(() => props.emptyText ?? t('combobox.emptyText'));
const generatedId = useId();
const inputId = computed(() => props.id ?? generatedId);

const inputAttrs = computed(() =>
	Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('aria-'))),
);

const anchorAttrs = computed(() =>
	Object.fromEntries(Object.entries(attrs).filter(([key]) => !key.startsWith('aria-'))),
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
);

const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const isModelControlled = 'modelValue' in vnodeProps || 'model-value' in vnodeProps;

const internalValue = ref<ComboboxValue | ComboboxValue[] | undefined>(props.defaultValue);

const rootModelValue = computed(() => (isModelControlled ? props.modelValue : internalValue.value));

const inputRef = useTemplateRef<
	InstanceType<typeof ComboboxInput> | InstanceType<typeof TagsInputInput>
>('input');

function getInputElement(): HTMLInputElement | undefined {
	const element: unknown = inputRef.value?.$el;
	return element instanceof HTMLInputElement ? element : undefined;
}

function clearSearchInput() {
	void nextTick(() => {
		const element = getInputElement();
		if (!element) {
			return;
		}

		element.value = '';
		element.dispatchEvent(new InputEvent('input', { bubbles: true, data: null }));
	});
}

function onModelValueUpdate(value: ComboboxValue | ComboboxValue[] | undefined) {
	if (!isModelControlled) {
		internalValue.value = value;
	}
	emit('update:modelValue', value);

	if (props.multiple) {
		clearSearchInput();
	}
}

function setSelectedValue(value: ComboboxValue | ComboboxValue[] | undefined) {
	onModelValueUpdate(value);
}

function isHeaderItem(item: ComboboxItem): item is ComboboxHeaderItem {
	return item.header === true;
}

function warnInvalidItem(message: string, item: ComboboxItem) {
	if (!import.meta.env.DEV) {
		return;
	}

	// eslint-disable-next-line no-console
	console.warn(`[N8nCombobox2] ${message}`, item);
}

function normaliseOption(item: ComboboxOptionBase): ComboboxOptionBase | undefined {
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

type ComboboxSection = {
	header?: ComboboxHeaderItem;
	divided: boolean;
	items: ComboboxOptionBase[];
};

const sections = computed<ComboboxSection[]>(() => {
	if (!props.items?.length) return [];

	const result: ComboboxSection[] = [];
	let currentSection: ComboboxSection = { divided: false, items: [] };

	const flushSection = () => {
		if (currentSection.items.length === 0) {
			return;
		}
		result.push(currentSection);
		currentSection = { divided: false, items: [] };
	};

	for (const item of props.items) {
		if (isHeaderItem(item)) {
			flushSection();
			if (!item.label) {
				warnInvalidItem('Skipping header: "label" is missing or empty.', item);
				continue;
			}
			currentSection = { header: item, divided: item.divided ?? false, items: [] };
			continue;
		}

		if (item.divided) {
			flushSection();
			currentSection.divided = true;
		}

		const normalised = normaliseOption(item);
		if (normalised) {
			currentSection.items.push(normalised);
		}
	}

	flushSection();
	return result;
});

const optionItems = computed(() => sections.value.flatMap((section) => section.items));

const anchorRef = useTemplateRef<InstanceType<typeof ComboboxAnchor>>('anchor');

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

function getDisplayValue(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (Array.isArray(value)) {
		return '';
	}

	const matchedItem = optionItems.value.find((item) => item.value === value);
	if (matchedItem) {
		return matchedItem.label;
	}

	if (typeof value === 'string') {
		return value;
	}

	return '';
}

const searchTerm = ref(getDisplayValue(rootModelValue.value));

function hasValue(value: ComboboxValue | ComboboxValue[] | undefined): boolean {
	if (props.multiple) {
		return Array.isArray(value) && value.length > 0;
	}

	return value !== undefined && value !== null && value !== '';
}

function getSelectedItem(
	value: ComboboxValue | ComboboxValue[] | undefined,
): ComboboxOptionBase | undefined {
	if (props.multiple) {
		return undefined;
	}

	if (value === undefined || value === null || Array.isArray(value)) {
		return undefined;
	}

	return optionItems.value.find((item) => item.value === value);
}

/**
 * Reka only reapplies `displayValue` when `modelValue` changes, not when `items`
 * do. Sync the closed input once a matching label becomes available so a value
 * set before async items load does not stay as the raw id.
 */
watch(
	optionItems,
	() => {
		const label = getSelectedItem(rootModelValue.value)?.label;
		if (!label) {
			return;
		}

		const element = getInputElement();
		if ((element && document.activeElement === element) || searchTerm.value === label) {
			return;
		}

		searchTerm.value = label;
	},
	{ flush: 'post' },
);

function showClearButton(value: ComboboxValue | ComboboxValue[] | undefined): boolean {
	return props.clearable && !props.disabled && hasValue(value);
}

function onClear() {
	setSelectedValue(props.multiple ? [] : undefined);

	void nextTick(() => {
		const element = getInputElement();
		if (!element) {
			return;
		}

		element.value = '';
		element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		element.focus();
	});
}

function onTagsUpdate(value: TagsInputValue[]) {
	setSelectedValue(value.filter((tag): tag is string => typeof tag === 'string'));
}
</script>

<template>
	<ComboboxRoot
		v-slot="{ modelValue: selectedValue }"
		:name="props.name"
		v-bind="rootProps"
		:model-value="rootModelValue"
		:default-value="isModelControlled ? props.defaultValue : undefined"
		:open-on-focus="true"
		@update:model-value="onModelValueUpdate"
		@update:open="emit('update:open', $event)"
		@highlight="emit('highlight', $event)"
	>
		<ComboboxAnchor
			ref="anchor"
			data-test-id="combobox"
			v-bind="anchorAttrs"
			:class="[$style.comboboxAnchor, sizeClass, props.multiple && $style.multiple]"
			:data-disabled="props.disabled || undefined"
			:data-multiple="props.multiple || undefined"
			:data-empty="hasValue(selectedValue) ? undefined : true"
		>
			<template
				v-for="selectedItem in [getSelectedItem(selectedValue)]"
				:key="selectedItem?.value ?? 'none'"
			>
				<span v-if="!props.multiple && selectedItem?.icon" :class="$style.leadingIcon">
					<slot name="item-leading" :item="selectedItem" :ui="{ class: $style.leadingIconGlyph }">
						<Icon :icon="selectedItem.icon" :class="$style.leadingIconGlyph" size="large" />
					</slot>
				</span>
				<span v-else-if="!props.multiple && props.icon" :class="$style.leadingIcon">
					<Icon :icon="props.icon" :class="$style.leadingIconGlyph" size="large" />
				</span>
			</template>

			<N8nTagsInput2
				v-if="props.multiple"
				:id="inputId"
				:embedded="true"
				:model-value="Array.isArray(selectedValue) ? selectedValue : []"
				:size="props.size"
				:disabled="props.disabled"
				:display-value="getDisplayValue"
				:placeholder="placeholder"
				:auto-focus="props.autoFocus"
				@update:model-value="onTagsUpdate"
			>
				<template #input="inputProps">
					<ComboboxInput
						:id="inputId"
						as-child
						:display-value="getDisplayValue"
						v-bind="inputAttrs"
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
				v-model="searchTerm"
				:class="$style.comboboxInput"
				:placeholder="placeholder"
				:auto-focus="props.autoFocus"
				:display-value="getDisplayValue"
				v-bind="inputAttrs"
			/>

			<button
				v-if="showClearButton(selectedValue)"
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
				<ComboboxViewport :class="$style.comboboxViewport">
					<ComboboxEmpty :class="$style.comboboxEmpty" role="status">
						{{ emptyText }}
					</ComboboxEmpty>

					<ComboboxGroup
						v-for="(section, sectionIndex) in sections"
						:key="`section-${sectionIndex}`"
						:class="[$style.comboboxGroup, section.divided && $style.divided]"
					>
						<ComboboxLabel v-if="section.header" :class="$style.comboboxLabel">
							<slot name="label" :item="section.header">
								{{ section.header.label }}
							</slot>
						</ComboboxLabel>

						<template
							v-for="item in section.items"
							:key="`section-${sectionIndex}-item-${String(item.value)}`"
						>
							<slot name="item" :item="item">
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
		var(--reka-combobox-content-available-height, 75dvh)
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

.comboboxGroup {
	--combobox-separator-outline-inset: 1px;

	&:not([hidden]) ~ &.divided:not([hidden]) {
		border-top: 1px solid var(--border-color);
		margin-block-start: var(--combobox-viewport--padding);
		margin-inline: calc(
			-1 * var(--combobox-viewport--padding) + var(--combobox-separator-outline-inset)
		);
		padding-block-start: var(--combobox-viewport--padding);
		padding-inline: calc(
			var(--combobox-viewport--padding) - var(--combobox-separator-outline-inset)
		);
	}
}
</style>
