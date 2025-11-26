<script setup lang="ts">
import { computed, ref, useCssModule, watch, nextTick, onMounted } from 'vue';

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

// Autosize textarea functionality
const textareaHeight = ref<string | undefined>(undefined);

const calculateTextareaHeight = () => {
	if (props.type !== 'textarea' || !props.autosize || !inputRef.value) return;

	const textarea = inputRef.value as HTMLTextAreaElement;
	const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;

	// Reset height to auto to get scrollHeight
	textarea.style.height = 'auto';
	const scrollHeight = textarea.scrollHeight;

	let minHeight: number | undefined;
	let maxHeight: number | undefined;

	if (typeof props.autosize === 'object') {
		if (props.autosize.minRows) {
			minHeight = props.autosize.minRows * lineHeight;
		}
		if (props.autosize.maxRows) {
			maxHeight = props.autosize.maxRows * lineHeight;
		}
	}

	let newHeight = scrollHeight;
	if (minHeight && newHeight < minHeight) {
		newHeight = minHeight;
	}
	if (maxHeight && newHeight > maxHeight) {
		newHeight = maxHeight;
	}

	textareaHeight.value = `${newHeight}px`;
	textarea.style.height = textareaHeight.value;
};

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
			:style="autosize ? { height: textareaHeight, resize: 'none' } : undefined"
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
