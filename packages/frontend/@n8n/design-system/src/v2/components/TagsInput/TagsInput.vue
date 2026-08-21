<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { computed, useCssModule, useTemplateRef } from 'vue';

import {
	TagsInputInput,
	TagsInputItem,
	TagsInputItemDelete,
	TagsInputItemText,
	TagsInputRoot,
	useForwardPropsEmits,
} from './reka-ui';
import type {
	TagsInputEmits,
	TagsInputProps,
	TagsInputSizes,
	TagsInputSlots,
	TagsInputValue,
} from './TagsInput.types';
import Icon from '../../../components/N8nIcon/Icon.vue';
import type { IconSize } from '../../../types/icon';

defineOptions({ inheritAttrs: false });

const $style = useCssModule();

const props = withDefaults(defineProps<TagsInputProps>(), {
	placeholder: 'Add a tag...',
	size: 'large',
	delimiter: ',',
	disabled: false,
});

const emit = defineEmits<TagsInputEmits>();

defineSlots<TagsInputSlots>();

const sizes: Record<TagsInputSizes, string> = {
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};

const deleteIconSize = computed(
	(): IconSize => (props.size === 'mini' || props.size === 'small' ? 'xsmall' : 'small'),
);

const rootRef = useTemplateRef<HTMLElement>('root');

const forwarded = useForwardPropsEmits(
	reactivePick(
		props,
		'modelValue',
		'defaultValue',
		'disabled',
		'delimiter',
		'addOnPaste',
		'addOnBlur',
		'addOnTab',
		'duplicate',
		'max',
		'convertValue',
		'name',
		'required',
		'id',
	),
	emit,
);

/** Handle `invalid` ourselves so duplicates can move to the end without emitting. */
const rootProps = computed(() => {
	const { onInvalid: _, ...rest } = forwarded.value;
	return rest;
});

function getTagKey(value: TagsInputValue, index: number): string {
	return typeof value === 'string' ? `${value}-${index}` : `tag-${index}`;
}

function getDisplayValue(value: TagsInputValue): string {
	if (props.displayValue) {
		return props.displayValue(value);
	}

	if (typeof value === 'string') {
		return value;
	}

	if ('label' in value && typeof value.label === 'string') {
		return value.label;
	}

	return '';
}

function clearDraftInput() {
	const rootEl = rootRef.value;
	if (!(rootEl instanceof HTMLElement)) {
		return;
	}

	const input = rootEl.querySelector('input');
	if (!(input instanceof HTMLInputElement) || input.value === '') {
		return;
	}

	input.value = '';
	input.dispatchEvent(new InputEvent('input', { bubbles: true, data: null }));
}

function findDuplicateTagIndex(tags: TagsInputValue[], value: TagsInputValue): number {
	const exactIndex = tags.findIndex((tag) => tag === value);
	if (exactIndex !== -1) {
		return exactIndex;
	}

	const label = getDisplayValue(value);
	if (!label) {
		return -1;
	}

	return tags.findIndex((tag) => getDisplayValue(tag) === label);
}

/** When duplicates are blocked, move the existing tag to the end instead of rejecting. */
function moveDuplicateToEnd(value: TagsInputValue): boolean {
	const tags = props.modelValue;
	if (!Array.isArray(tags)) {
		return false;
	}

	const index = findDuplicateTagIndex(tags, value);
	if (index === -1) {
		return false;
	}

	emit('update:modelValue', [...tags.slice(0, index), ...tags.slice(index + 1), tags[index]]);
	return true;
}

/** Reka keeps the draft text on duplicate/max; clear it. Duplicates are moved to the end. */
function onInvalid(value: TagsInputValue) {
	clearDraftInput();

	if (moveDuplicateToEnd(value)) {
		return;
	}

	emit('invalid', value);
}

function getInputClass(isEmpty: boolean): string {
	return [$style.input, isEmpty && $style.inputEmpty].filter(Boolean).join(' ');
}
</script>

<template>
	<div ref="root" :class="[$style.root, sizes[props.size]]">
		<TagsInputRoot
			v-bind="{ ...$attrs, ...rootProps }"
			:display-value="getDisplayValue"
			:class="$style.tags"
			@invalid="onInvalid"
		>
			<template #default="{ modelValue }">
				<TagsInputItem
					v-for="(tag, index) in modelValue"
					:key="getTagKey(tag, index)"
					:value="tag"
					:class="$style.tag"
				>
					<slot
						name="tag"
						:value="tag"
						:display-value="getDisplayValue(tag)"
						:index="index"
						:disabled="props.disabled"
						:ui="{ text: $style.tagText, delete: $style.tagDelete }"
					>
						<TagsInputItemText :class="$style.tagText" />
						<TagsInputItemDelete :class="$style.tagDelete" :disabled="props.disabled">
							<Icon icon="x" :size="deleteIconSize" />
						</TagsInputItemDelete>
					</slot>
				</TagsInputItem>

				<slot
					:id="props.id"
					name="input"
					:placeholder="modelValue.length ? '' : props.placeholder"
					:auto-focus="props.autoFocus"
					:disabled="props.disabled"
					:class="getInputClass(modelValue.length === 0)"
				>
					<TagsInputInput
						:id="props.id"
						:class="getInputClass(modelValue.length === 0)"
						:placeholder="modelValue.length ? '' : props.placeholder"
						:auto-focus="props.autoFocus"
						:disabled="props.disabled"
					/>
				</slot>
			</template>
		</TagsInputRoot>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/input' as input-mixin;

.root {
	@include input-mixin.size-variables('large');
	@include input-mixin.theme-variables(var(--border-color));

	--tags-input--gap: calc(var(--tags-input--padding) - 1px);
	--tag--height: calc(var(--input--height) - 2 * var(--tags-input--padding));
	--tag--gap: var(--spacing--4xs);
	--tag--delete--size: max(var(--height--4xs), calc(var(--tag--height) - 2 * var(--spacing--4xs)));
	--tag--padding-inline-end: calc((var(--tag--height) - var(--tag--delete--size) - 2px) / 2);

	display: flex;
	flex: 1;
	width: 100%;
	min-height: var(--input--height);
	max-height: var(--tags-input--max-height, none);
	padding: 1px;
	overflow: hidden;
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);
	color: var(--input--color--text);
	font-size: var(--input--font-size);

	@include focus.focus-within-ring;

	&:not(:has([data-disabled])):hover:not(:focus-within) {
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

	&:has([data-disabled]) {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.mini {
	@include input-mixin.size-variables('mini');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--5xs);
	--tag--padding-block-end: 1px;
	--tag--padding: 0 var(--tag--padding-inline-end) 0 var(--spacing--4xs);
	--tag--radius: var(--radius--4xs);
	--tag--font-size: var(--font-size--3xs);
}

.small {
	@include input-mixin.size-variables('small');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--4xs);
	--tag--padding-block-end: var(--spacing--5xs);
	--tag--padding: 0 var(--tag--padding-inline-end) 0 var(--spacing--3xs);
	--tag--radius: var(--radius--4xs);
	--tag--font-size: var(--font-size--2xs);
}

.medium {
	@include input-mixin.size-variables('medium');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--4xs);
	--tag--padding-block-end: var(--spacing--5xs);
	--tag--padding: 0 var(--tag--padding-inline-end) 0 var(--spacing--3xs);
	--tag--radius: var(--radius--4xs);
	--tag--font-size: var(--font-size--2xs);
}

.large {
	@include input-mixin.size-variables('large');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--3xs);
	--tag--padding-block-end: var(--spacing--5xs);
	--tag--padding: 0 var(--tag--padding-inline-end) 0 var(--spacing--3xs);
	--tag--radius: var(--radius--3xs);
	--tag--font-size: var(--font-size--xs);
}

.xlarge {
	@include input-mixin.size-variables('xlarge');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--2xs);
	--tag--padding-block-end: var(--spacing--5xs);
	--tag--padding: 0 var(--tag--padding-inline-end) 0 var(--spacing--2xs);
	--tag--radius: var(--radius--3xs);
	--tag--font-size: var(--font-size--xs);
}

.tags {
	display: flex;
	flex: 1;
	flex-wrap: wrap;
	align-items: center;
	align-content: flex-start;
	gap: var(--tags-input--gap);
	min-width: 0;
	min-height: 0;
	width: 100%;
	padding: calc(var(--tags-input--padding) - 1px);
	overflow: auto;
}

.tag {
	display: inline-flex;
	align-items: center;
	gap: var(--tag--gap);
	max-width: 100%;
	min-width: 0;
	height: var(--tag--height);
	padding: var(--tag--padding);
	border: 1px solid var(--tag--border-color);
	border-radius: var(--tag--radius);
	background-color: var(--tag--color--background);
	color: var(--tag--color--text);
	font-size: var(--tag--font-size);
	font-weight: var(--tag--font-weight);
	line-height: var(--tag--line-height);

	&[data-state='active'],
	&[aria-current='true'] {
		background-color: var(--tag--color--background--active);
		border-color: var(--tag--border-color--active);
	}
}

.tagText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: normal;
	padding-block-end: var(--tag--padding-block-end);
}

.tagDelete {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--tag--delete--size);
	height: var(--tag--delete--size);
	padding: 0;
	border: none;
	border-radius: var(--radius--4xs);
	background: transparent;
	color: var(--icon-color);
	cursor: pointer;

	@media (hover: hover) {
		&:hover {
			background-color: var(--background--hover);
			color: var(--icon-color--strong);
		}
	}

	&:focus,
	&:focus-visible {
		outline: none;
		background-color: var(--background--hover);
		color: var(--icon-color--strong);
	}

	&:disabled,
	&[data-disabled] {
		cursor: not-allowed;
		pointer-events: none;
	}
}

.input {
	flex: 1;
	align-self: center;
	min-width: var(--spacing--2xl);
	min-height: var(--tag--height);
	padding: 0;
	padding-inline-start: var(--tags-input--input--padding-inline-start);
	border: none;
	background: transparent;
	outline: none;

	@supports (field-sizing: content) {
		flex: 1 0 auto;
		field-sizing: content;
		width: auto;
	}

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

	&.inputEmpty {
		padding-inline: calc(var(--input--padding) - var(--tags-input--padding));
	}
}
</style>
