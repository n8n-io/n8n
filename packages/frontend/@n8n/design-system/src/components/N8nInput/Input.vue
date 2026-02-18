<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import {
	ref,
	computed,
	useCssModule,
	watch,
	nextTick,
	onMounted,
	onBeforeUnmount,
	useAttrs,
} from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { InputProps, InputEmits, InputSlots, InputSize } from './Input.types';

defineOptions({ name: 'N8nInput', inheritAttrs: false });

const $style = useCssModule();
const slots = defineSlots<InputSlots>();

const props = withDefaults(defineProps<InputProps>(), {
	modelValue: '',
	type: 'text',
	size: 'large',
	placeholder: '',
	disabled: false,
	readonly: false,
	clearable: false,
	rows: 2,
	maxlength: undefined,
	autosize: false,
	autofocus: false,
	autocomplete: 'off',
	name: undefined,
});

const emit = defineEmits<InputEmits>();

const attrs = useAttrs();
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

// Check if attr should go to input element
// - id: needed for <label for="..."> association
// - title: tooltip/accessibility attribute
// - data-*, aria-*: semantic/accessibility attributes
// - on*: event handlers
const isInputAttr = (key: string) =>
	key === 'id' ||
	key === 'title' ||
	key.startsWith('data-') ||
	key.startsWith('aria-') ||
	key.startsWith('on');

// Separate attrs for container vs input element
// data-*, aria-*, title, id and event handlers (on*) go to the input, rest to container
const inputAttrs = computed(() => {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(attrs)) {
		if (isInputAttr(key)) {
			result[key] = value;
		}
	}
	return result;
});

const containerAttrs = computed(() => {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(attrs)) {
		if (!isInputAttr(key)) {
			result[key] = value;
		}
	}
	return result;
});

// Size class mapping
const sizes: Record<InputSize, string> = {
	xlarge: $style.xlarge,
	large: $style.large,
	medium: $style.medium,
	small: $style.small,
	mini: $style.mini,
};

const sizeClass = computed(() => sizes[props.size]);

// Classes for password type (PostHog privacy)
const isTextarea = computed(() => props.type === 'textarea');

const containerClasses = computed(() => [
	'n8n-input', // Global class for backwards compatibility
	$style.inputContainer,
	sizeClass.value,
	{
		[$style.disabled]: props.disabled,
		[$style.readonly]: props.readonly,
		[$style.hasPrepend]: !!slots.prepend,
		[$style.hasAppend]: !!slots.append,
		[$style.isTextarea]: isTextarea.value,
		'ph-no-capture': props.type === 'password',
	},
]);

const inputWrapperClasses = computed(() => [
	$style.inputWrapper,
	{
		[$style.disabled]: props.disabled,
		[$style.readonly]: props.readonly,
		[$style.isTextarea]: isTextarea.value,
	},
]);

// Track focus state for blur/focus events
const isFocused = ref(false);

// Handle input event
const onInput = (event: Event) => {
	const target = event.target as HTMLInputElement | HTMLTextAreaElement;
	emit('update:modelValue', target.value);
	emit('input', target.value);
};

// Handle blur event
const onBlur = (event: FocusEvent) => {
	isFocused.value = false;
	emit('blur', event);
};

// Handle focus event
const onFocus = (event: FocusEvent) => {
	isFocused.value = true;
	emit('focus', event);
};

// Handle keydown event
const onKeydown = (event: KeyboardEvent) => {
	emit('keydown', event);
};

// Handle mousedown event
const onMousedown = (event: MouseEvent) => {
	emit('mousedown', event);
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

	hiddenTextarea.className = $style.hiddenTextarea;
	hiddenTextarea.setAttribute('style', contextStyle);
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
	<div :class="containerClasses" v-bind="containerAttrs">
		<!-- Prepend slot (outside input container, before) -->
		<span v-if="$slots.prepend" :class="$style.prepend">
			<slot name="prepend" />
		</span>

		<!-- Input wrapper (holds border, contains prefix/input/suffix) -->
		<div :class="inputWrapperClasses" @click="focus">
			<!-- Prefix slot -->
			<span v-if="$slots.prefix" :class="$style.prefix">
				<slot name="prefix" />
			</span>

			<!-- Input element -->
			<input
				v-if="type !== 'textarea'"
				ref="inputRef"
				:type="type"
				:value="modelValue ?? ''"
				:class="$style.input"
				:placeholder="placeholder"
				:disabled="disabled"
				:readonly="readonly"
				:maxlength="maxlength"
				:autocomplete="autocomplete"
				:name="name"
				v-bind="inputAttrs"
				@input="onInput"
				@blur="onBlur"
				@focus="onFocus"
				@keydown="onKeydown"
				@mousedown="onMousedown"
			/>

			<!-- Textarea element -->
			<textarea
				v-else
				ref="inputRef"
				:value="modelValue ?? ''"
				:class="[$style.input, $style.textarea]"
				:placeholder="placeholder"
				:disabled="disabled"
				:readonly="readonly"
				:rows="autosize ? undefined : rows"
				:maxlength="maxlength"
				:autocomplete="autocomplete"
				:name="name"
				:style="autosize ? { ...textareaStyles, resize: 'none', overflow: 'hidden' } : undefined"
				v-bind="inputAttrs"
				@input="onInput"
				@blur="onBlur"
				@focus="onFocus"
				@keydown="onKeydown"
				@mousedown="onMousedown"
			/>

			<!-- Suffix slot -->
			<span v-if="$slots.suffix" :class="$style.suffix">
				<slot name="suffix" />
			</span>

			<!-- Clear button -->
			<button
				v-if="showClearButton"
				type="button"
				:class="$style.clearButton"
				tabindex="-1"
				@click="onClear"
			>
				<Icon icon="x" size="small" />
			</button>
		</div>

		<!-- Append slot (outside input container, after) -->
		<span v-if="$slots.append" :class="$style.append">
			<slot name="append" />
		</span>
	</div>
</template>

<style module lang="scss">
.inputContainer {
	display: inline-flex;
	align-items: center;
	width: 100%;
	gap: var(--spacing--3xs);
}

.inputWrapper {
	display: inline-flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--3xs);
	border-radius: var(--input--radius--top-left, var(--input--radius, var(--radius)))
		var(--input--radius--top-right, var(--input--radius, var(--radius)))
		var(--input--radius--bottom-right, var(--input--radius, var(--radius)))
		var(--input--radius--bottom-left, var(--input--radius, var(--radius)));
	border: var(--input--border-width, var(--border-width))
		var(--input--border-style, var(--border-style)) var(--input--border-color, var(--border-color));
	background-color: var(--input--color--background, var(--color--background--light-2));

	&:hover:not(.disabled):not(:focus-within) {
		border-color: var(--input--border-color--hover, var(--color--foreground--shade-1));
	}

	&:focus-within {
		border-color: var(--input--border-color--focus, var(--color--secondary));
	}

	&.disabled {
		background-color: var(--color--background--light-3);
		cursor: not-allowed;
		opacity: 0.6;
	}

	&.readonly {
		background-color: var(--color--background--light-3);
	}
}

.isTextarea {
	align-items: flex-start;
}

.disabled {
	cursor: not-allowed;
}

.readonly {
	cursor: default;
}

.hasPrepend .inputWrapper {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.hasAppend .inputWrapper {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

/* Size variants - padding on wrapper, height on input */
.xlarge .inputWrapper {
	padding: 0 var(--spacing--xs);
}

.xlarge .input {
	min-height: 48px;
	font-size: var(--input--font-size, var(--font-size--md));
}

.xlarge .textarea {
	padding: var(--spacing--2xs) 0;
	font-size: var(--input--font-size, var(--font-size--md));
}

.large .inputWrapper {
	padding: 0 var(--spacing--xs);
}

.large .input {
	min-height: 40px;
	font-size: var(--input--font-size, var(--font-size--sm));
}

.large .textarea {
	padding: var(--spacing--2xs) 0;
	font-size: var(--input--font-size, var(--font-size--sm));
}

.medium .inputWrapper {
	padding: 0 var(--spacing--2xs);
}

.medium .input {
	min-height: 36px;
	font-size: var(--input--font-size, var(--font-size--sm));
}

.medium .textarea {
	padding: var(--spacing--2xs) 0;
	font-size: var(--input--font-size, var(--font-size--sm));
}

.small .inputWrapper {
	padding: 0 var(--spacing--2xs);
}

.small .input {
	min-height: 28px;
	font-size: var(--input--font-size, var(--font-size--2xs));
}

.small .textarea {
	padding: var(--spacing--2xs) 0;
	font-size: var(--input--font-size, var(--font-size--2xs));
}

.mini .inputWrapper {
	padding: 0 var(--spacing--3xs);
}

.mini .input {
	min-height: 22px;
	font-size: var(--input--font-size, var(--font-size--3xs));
}

.mini .textarea {
	padding: var(--spacing--3xs) 0;
	font-size: var(--input--font-size, var(--font-size--3xs));
}

.input {
	flex: 1;
	min-width: 0;
	padding: 0;
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	color: var(--color--text--shade-1);
}

.input::placeholder {
	color: var(--color--text--tint-1);
}

.input:read-only {
	cursor: default;
}

.input:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.textarea {
	flex: 1;
	min-width: 0;
	resize: vertical;
	line-height: var(--line-height--md);
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	color: var(--color--text--shade-1);
}

.textarea::placeholder {
	color: var(--color--text--tint-1);
}

.textarea:read-only {
	cursor: default;
}

.textarea:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.prefix,
.suffix {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
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
	border-radius: var(--radius--sm);
	transition: color 0.2s;
}

.clearButton:hover {
	color: var(--color--text--shade-1);
}

.clearButton:focus {
	outline: none;
}

.prepend,
.append {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	background-color: var(--color--background--light-3);
	padding: 0 var(--spacing--xs);
}

.prepend {
	border-right: var(--border);
	margin-left: calc(-1 * var(--spacing--xs));
}

.append {
	border-left: var(--border);
	margin-right: calc(-1 * var(--spacing--xs));
}

.hiddenTextarea {
	height: 0 !important;
	visibility: hidden !important;
	overflow: hidden !important;
	position: absolute !important;
	z-index: -1000 !important;
	top: 0 !important;
	right: 0 !important;
}
</style>
