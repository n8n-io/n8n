<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { ref, computed, useCssModule, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { InputProps, InputEmits, InputSlots, Input2Size } from './Input.types';

defineOptions({ name: 'N8nInput2' });

const $style = useCssModule();

const props = withDefaults(defineProps<InputProps>(), {
	modelValue: '',
	type: 'text',
	size: 'large',
	placeholder: '',
	disabled: false,
	clearable: false,
	rows: 2,
	maxlength: undefined,
	autosize: false,
	autofocus: false,
	autocomplete: 'off',
});

const emit = defineEmits<InputEmits>();
defineSlots<InputSlots>();

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

// Size class mapping
const sizes: Record<Input2Size, string> = {
	xlarge: $style.XLarge,
	large: $style.Large,
	medium: $style.Medium,
	small: $style.Small,
	mini: $style.Mini,
};

const sizeClass = computed(() => sizes[props.size]);

// Classes for password type (PostHog privacy)
const containerClasses = computed(() => [
	$style.InputContainer,
	sizeClass.value,
	{
		[$style.Disabled]: props.disabled,
		[$style.Focused]: isFocused.value,
		'ph-no-capture': props.type === 'password',
	},
]);

// Track focus state
const isFocused = ref(false);

// Handle input event
const onInput = (event: Event) => {
	const target = event.target as HTMLInputElement | HTMLTextAreaElement;
	emit('update:modelValue', target.value);
};

// Handle blur event
const onBlur = (event: FocusEvent) => {
	isFocused.value = false;
	emit('blur', event);
};

// Handle focus event
const onFocus = () => {
	isFocused.value = true;
};

// Handle keydown event
const onKeydown = (event: KeyboardEvent) => {
	emit('keydown', event);
};

// Clear input
const onClear = () => {
	emit('update:modelValue', '');
	focus();
};

// Show clear button
const showClearButton = computed(() => {
	return props.clearable && !props.disabled && props.modelValue !== '' && props.modelValue !== null;
});

// Autosize textarea functionality using hidden textarea measurement (Element+ approach)
const textareaStyles = ref<{ height?: string; minHeight?: string }>({});
let hiddenTextarea: HTMLTextAreaElement | undefined;

const CONTEXT_STYLE_PROPS = [
	'letter-spacing',
	'line-height',
	'padding-top',
	'padding-bottom',
	'font-family',
	'font-weight',
	'font-size',
	'text-rendering',
	'text-transform',
	'width',
	'text-indent',
	'padding-left',
	'padding-right',
	'border-width',
	'box-sizing',
];

function calcTextareaHeight(
	targetElement: HTMLTextAreaElement,
	minRows?: number,
	maxRows?: number,
): { height: string; minHeight?: string } {
	if (!hiddenTextarea) {
		hiddenTextarea = document.createElement('textarea');
		document.body.appendChild(hiddenTextarea);
	}

	const style = window.getComputedStyle(targetElement);
	const boxSizing = style.getPropertyValue('box-sizing');
	const paddingSize =
		parseFloat(style.getPropertyValue('padding-bottom')) +
		parseFloat(style.getPropertyValue('padding-top'));
	const borderSize =
		parseFloat(style.getPropertyValue('border-bottom-width')) +
		parseFloat(style.getPropertyValue('border-top-width'));
	const contextStyle = CONTEXT_STYLE_PROPS.map(
		(name) => `${name}:${style.getPropertyValue(name)}`,
	).join(';');

	const hiddenStyle = `
		height:0 !important;
		visibility:hidden !important;
		overflow:hidden !important;
		position:absolute !important;
		z-index:-1000 !important;
		top:0 !important;
		right:0 !important;
	`;
	hiddenTextarea.setAttribute('style', `${contextStyle};${hiddenStyle}`);
	hiddenTextarea.value = targetElement.value || targetElement.placeholder || '';

	let height = hiddenTextarea.scrollHeight;
	const result: { height: string; minHeight?: string } = { height: '' };

	if (boxSizing === 'border-box') {
		height = height + borderSize;
	} else if (boxSizing === 'content-box') {
		height = height - paddingSize;
	}

	// Calculate single row height
	hiddenTextarea.value = '';
	const singleRowHeight = hiddenTextarea.scrollHeight - paddingSize;

	if (minRows !== undefined) {
		let minHeight = singleRowHeight * minRows;
		if (boxSizing === 'border-box') {
			minHeight = minHeight + paddingSize + borderSize;
		}
		height = Math.max(minHeight, height);
		result.minHeight = `${minHeight}px`;
	}

	if (maxRows !== undefined) {
		let maxHeight = singleRowHeight * maxRows;
		if (boxSizing === 'border-box') {
			maxHeight = maxHeight + paddingSize + borderSize;
		}
		height = Math.min(maxHeight, height);
	}

	result.height = `${height}px`;
	return result;
}

function cleanupHiddenTextarea() {
	if (hiddenTextarea?.parentNode) {
		hiddenTextarea.parentNode.removeChild(hiddenTextarea);
		hiddenTextarea = undefined;
	}
}

const calculateTextareaHeight = () => {
	if (props.type !== 'textarea' || !props.autosize || !inputRef.value) return;

	const textarea = inputRef.value as HTMLTextAreaElement;
	const minRows = typeof props.autosize === 'object' ? props.autosize.minRows : undefined;
	const maxRows = typeof props.autosize === 'object' ? props.autosize.maxRows : undefined;

	textareaStyles.value = calcTextareaHeight(textarea, minRows, maxRows);
	cleanupHiddenTextarea();
};

// Use ResizeObserver for responsive behavior
useResizeObserver(
	computed(() => (props.type === 'textarea' && props.autosize ? inputRef.value : null)),
	() => {
		calculateTextareaHeight();
	},
);

onBeforeUnmount(() => {
	cleanupHiddenTextarea();
});

// Watch for value changes to recalculate height
watch(
	() => props.modelValue,
	() => {
		if (props.type === 'textarea' && props.autosize) {
			void nextTick(calculateTextareaHeight);
		}
	},
);

// Initial height calculation
onMounted(() => {
	if (props.autofocus) {
		focus();
	}
	if (props.type === 'textarea' && props.autosize) {
		void nextTick(calculateTextareaHeight);
	}
});

// Exposed methods
const focus = () => inputRef.value?.focus();
const blur = () => inputRef.value?.blur();
const select = () => inputRef.value?.select();

defineExpose({ focus, blur, select });
</script>

<template>
	<div :class="containerClasses">
		<!-- Prefix slot -->
		<span v-if="$slots.prefix" :class="$style.Prefix">
			<slot name="prefix" />
		</span>

		<!-- Input element -->
		<input
			v-if="type !== 'textarea'"
			ref="inputRef"
			:type="type"
			:value="modelValue ?? ''"
			:class="$style.Input"
			:placeholder="placeholder"
			:disabled="disabled"
			:maxlength="maxlength"
			:autocomplete="autocomplete"
			@input="onInput"
			@blur="onBlur"
			@focus="onFocus"
			@keydown="onKeydown"
		/>

		<!-- Textarea element -->
		<textarea
			v-else
			ref="inputRef"
			:value="modelValue ?? ''"
			:class="[$style.Input, $style.Textarea]"
			:placeholder="placeholder"
			:disabled="disabled"
			:rows="autosize ? undefined : rows"
			:maxlength="maxlength"
			:autocomplete="autocomplete"
			:style="autosize ? { ...textareaStyles, resize: 'none', overflow: 'hidden' } : undefined"
			@input="onInput"
			@blur="onBlur"
			@focus="onFocus"
			@keydown="onKeydown"
		/>

		<!-- Suffix slot -->
		<span v-if="$slots.suffix" :class="$style.Suffix">
			<slot name="suffix" />
		</span>

		<!-- Clear button -->
		<button
			v-if="showClearButton"
			type="button"
			:class="$style.ClearButton"
			tabindex="-1"
			@click="onClear"
		>
			<Icon icon="x" size="small" />
		</button>
	</div>
</template>

<style module>
.InputContainer {
	display: inline-flex;
	align-items: center;
	width: 100%;
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	transition:
		border-color 0.2s,
		box-shadow 0.2s;
	gap: var(--spacing--3xs);
}

.InputContainer:hover:not(.Disabled) {
	border-color: var(--color--foreground--shade-1);
}

.Focused {
	border-color: var(--color--secondary);
	box-shadow: 0 0 0 2px var(--color--secondary--tint-2);
}

.Disabled {
	background-color: var(--color--background--light-3);
	cursor: not-allowed;
	opacity: 0.6;
}

/* Size variants */
.XLarge {
	min-height: 48px;
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--md);
}

.Large {
	min-height: 40px;
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--sm);
}

.Medium {
	min-height: 36px;
	padding: 0 var(--spacing--2xs);
	font-size: var(--font-size--sm);
}

.Small {
	min-height: 28px;
	padding: 0 var(--spacing--2xs);
	font-size: var(--font-size--2xs);
}

.Mini {
	min-height: 22px;
	padding: 0 var(--spacing--3xs);
	font-size: var(--font-size--3xs);
}

.Input {
	flex: 1;
	min-width: 0;
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	font-size: inherit;
	color: var(--color--text--shade-1);
	padding: 0;
}

.Input::placeholder {
	color: var(--color--text--tint-1);
}

.Input:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.Textarea {
	resize: vertical;
	line-height: var(--line-height--md);
	padding: var(--spacing--2xs) 0;
}

.Prefix,
.Suffix {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.ClearButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
	border-radius: var(--radius--sm);
	transition: color 0.2s;
}

.ClearButton:hover {
	color: var(--color--text--shade-1);
}

.ClearButton:focus {
	outline: none;
}
</style>
