<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { computed, useCssModule, useTemplateRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

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
							<Icon icon="x" size="small" />
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
	--tag--padding: 0 var(--spacing--5xs) 1px var(--spacing--4xs);
	--tag--radius: var(--radius--4xs);
	--tag--font-size: var(--font-size--3xs);
	--tag--delete--offset: 1px;
}

.small {
	@include input-mixin.size-variables('small');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--4xs);
	--tag--padding: 0 var(--spacing--4xs) var(--spacing--5xs) var(--spacing--3xs);
	--tag--radius: var(--radius--4xs);
	--tag--font-size: var(--font-size--2xs);
	--tag--delete--offset: 2px;
}

.medium {
	@include input-mixin.size-variables('medium');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--4xs);
	--tag--padding: 0 var(--spacing--4xs) var(--spacing--5xs) var(--spacing--3xs);
	--tag--radius: var(--radius--4xs);
	--tag--font-size: var(--font-size--2xs);
	--tag--delete--offset: var(--spacing--5xs);
}

.large {
	@include input-mixin.size-variables('large');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--3xs);
	--tag--padding: 0 var(--spacing--4xs) var(--spacing--5xs) var(--spacing--3xs);
	--tag--radius: var(--radius--3xs);
	--tag--font-size: var(--font-size--xs);
	--tag--delete--offset: var(--spacing--5xs);
}

.xlarge {
	@include input-mixin.size-variables('xlarge');

	--tags-input--padding: var(--spacing--4xs);
	--tags-input--input--padding-inline-start: var(--spacing--2xs);
	--tag--padding: 0 var(--spacing--4xs) var(--spacing--5xs) var(--spacing--2xs);
	--tag--radius: var(--radius--3xs);
	--tag--font-size: var(--font-size--xs);
	--tag--delete--offset: var(--spacing--5xs);
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
	gap: var(--spacing--5xs);
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
		background-color: var(--tag--color--background--hover);
		border-color: var(--tag--border-color--hover);
	}
}

.tagText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: normal;
}

.tagDelete {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: 0;
	border: none;
	border-radius: var(--radius--full);
	background: transparent;
	color: var(--icon-color);
	cursor: pointer;
	margin-top: var(--tag--delete--offset);

	&:hover,
	&:focus {
		outline: none;
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
