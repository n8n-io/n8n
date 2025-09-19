<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import N8nSendStopButton from './N8nSendStopButton.vue';

export interface N8nPromptInputProps {
	modelValue?: string;
	placeholder?: string;
	maxHeight?: number;
	maxLength?: number;
	loading?: boolean;
	streaming?: boolean;
	disabled?: boolean;
	showCharacterCount?: boolean;
	rows?: number;
}

const props = withDefaults(defineProps<N8nPromptInputProps>(), {
	modelValue: '',
	placeholder: '',
	maxHeight: 200,
	maxLength: 1000,
	loading: false,
	streaming: false,
	disabled: false,
	showCharacterCount: false,
	rows: 1,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	stop: [];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const isFocused = ref(false);
const textValue = ref(props.modelValue || '');
const textareaHeight = ref<number>(24);
const isMultiline = ref(false);

// Constants
const LINE_HEIGHT = 18;
const SINGLE_LINE_HEIGHT = 24;
const MAX_LINES_BEFORE_SCROLL = 6;
const TEXTAREA_MAX_HEIGHT = MAX_LINES_BEFORE_SCROLL * LINE_HEIGHT;

const characterCount = computed(() => textValue.value.length);
const remainingCharacters = computed(() => props.maxLength - characterCount.value);
const isOverLimit = computed(() => characterCount.value > props.maxLength);
const sendDisabled = computed(
	() => !textValue.value.trim() || props.streaming || props.disabled || isOverLimit.value,
);

const containerStyle = computed(() => {
	if (!isMultiline.value) {
		return {
			minHeight: '40px',
		};
	}

	// In multiline mode, let content size naturally
	// Container will expand based on textarea + margin + button
	return {
		minHeight: '80px',
		maxHeight: `${props.maxHeight}px`,
	};
});

const textareaStyle = computed(() => {
	if (!isMultiline.value) {
		return {};
	}

	const height = Math.min(textareaHeight.value, TEXTAREA_MAX_HEIGHT);
	return {
		height: `${height}px`,
		overflowY: textareaHeight.value > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden',
	};
});

function adjustHeight() {
	if (!textareaRef.value) return;

	// Store focus state before potential mode change
	const wasFocused = document.activeElement === textareaRef.value;
	const wasMultiline = isMultiline.value;

	// If text is empty, revert to single-line mode
	if (!textValue.value || textValue.value.trim() === '') {
		isMultiline.value = false;
		textareaHeight.value = SINGLE_LINE_HEIGHT;
		if (textareaRef.value) {
			textareaRef.value.style.height = `${SINGLE_LINE_HEIGHT}px`;
		}
		// Restore focus if mode changed
		if (wasMultiline && !isMultiline.value && wasFocused) {
			void nextTick(() => {
				textareaRef.value?.focus();
			});
		}
		return;
	}

	// Save current height to compare
	const oldHeight = textareaRef.value.style.height;

	// Measure the natural height
	textareaRef.value.style.height = '0';
	const scrollHeight = textareaRef.value.scrollHeight;

	// Check if we need multiline mode
	// Switch to multiline when text would wrap or when there's actual line breaks
	const shouldBeMultiline = scrollHeight > SINGLE_LINE_HEIGHT || textValue.value.includes('\n');

	// Update height tracking
	textareaHeight.value = scrollHeight;
	isMultiline.value = shouldBeMultiline;

	// Apply the appropriate height
	if (!isMultiline.value) {
		textareaRef.value.style.height = `${SINGLE_LINE_HEIGHT}px`;
	} else {
		// For multiline, set exact scrollHeight
		textareaRef.value.style.height = `${scrollHeight}px`;
	}

	// Restore focus if mode changed
	if (wasMultiline !== isMultiline.value && wasFocused) {
		void nextTick(() => {
			textareaRef.value?.focus();
		});
	}
}

watch(
	() => props.modelValue,
	(newValue) => {
		textValue.value = newValue || '';
		void nextTick(() => adjustHeight());
	},
);

watch(textValue, (newValue) => {
	emit('update:modelValue', newValue);
	void nextTick(() => adjustHeight());
});

function handleSubmit() {
	if (sendDisabled.value) return;
	emit('submit');
}

function handleStop() {
	emit('stop');
}

function handleKeyDown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
		event.preventDefault();
		handleSubmit();
	}
}

function handleFocus(event: FocusEvent) {
	isFocused.value = true;
	emit('focus', event);
}

function handleBlur(event: FocusEvent) {
	isFocused.value = false;
	emit('blur', event);
}

function focusInput() {
	textareaRef.value?.focus();
}

onMounted(() => {
	// Only adjust height if there's initial content
	if (textValue.value) {
		void nextTick(() => adjustHeight());
	}
});

defineExpose({
	focusInput,
});
</script>

<template>
	<div
		ref="containerRef"
		:class="[
			$style.container,
			{
				[$style.focused]: isFocused,
				[$style.multiline]: isMultiline,
				[$style.disabled]: disabled || streaming,
			},
		]"
		:style="containerStyle"
	>
		<!-- Single line mode: input and button side by side -->
		<div v-if="!isMultiline" :class="$style.singleLineWrapper">
			<textarea
				ref="textareaRef"
				v-model="textValue"
				:class="$style.singleLineTextarea"
				:placeholder="placeholder"
				:disabled="disabled || streaming"
				:maxlength="maxLength"
				rows="1"
				@keydown="handleKeyDown"
				@focus="handleFocus"
				@blur="handleBlur"
				@input="adjustHeight"
			/>
			<div :class="$style.inlineActions">
				<div v-if="showCharacterCount && !streaming" :class="$style.characterCount">
					<span :class="{ [$style.overLimit]: isOverLimit }">
						{{ remainingCharacters }}
					</span>
				</div>
				<N8nSendStopButton
					:streaming="streaming"
					:disabled="sendDisabled"
					@send="handleSubmit"
					@stop="handleStop"
				/>
			</div>
		</div>

		<!-- Multiline mode: textarea full width with button below -->
		<template v-else>
			<textarea
				ref="textareaRef"
				v-model="textValue"
				:class="$style.multilineTextarea"
				:style="textareaStyle"
				:placeholder="placeholder"
				:disabled="disabled || streaming"
				:maxlength="maxLength"
				@keydown="handleKeyDown"
				@focus="handleFocus"
				@blur="handleBlur"
				@input="adjustHeight"
			/>
			<div :class="$style.bottomActions">
				<div v-if="showCharacterCount && !streaming" :class="$style.characterCount">
					<span :class="{ [$style.overLimit]: isOverLimit }">
						{{ remainingCharacters }}
					</span>
				</div>
				<N8nSendStopButton
					:streaming="streaming"
					:disabled="sendDisabled"
					@send="handleSubmit"
					@stop="handleStop"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-large);
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease;
	padding: var(--spacing-2xs);
	box-sizing: border-box;

	&.focused {
		border-color: var(--color-secondary);
		box-shadow: 0 0 0 1px var(--color-secondary-tint-2);
	}

	&.multiline {
		padding-bottom: 0;
	}

	&.disabled {
		background-color: var(--color-foreground-xlight);
		cursor: not-allowed;

		textarea {
			cursor: not-allowed;
			color: var(--color-text-light);
		}
	}
}

// Single line mode
.singleLineWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	width: 100%;
}

.singleLineTextarea {
	flex: 1;
	border: none;
	background: transparent;
	resize: none;
	outline: none;
	font-family: var(--font-family), sans-serif;
	font-size: var(--font-size-2xs);
	line-height: 24px;
	color: var(--color-text-dark);
	padding: 0 var(--spacing-2xs);
	height: 24px;
	overflow: hidden;
	box-sizing: border-box;
	display: block;

	&::placeholder {
		color: var(--color-text-light);
	}
}

.inlineActions {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

// Multiline mode
.multilineTextarea {
	width: 100%;
	border: none;
	background: transparent;
	resize: none;
	outline: none;
	font-family: var(--font-family), sans-serif;
	font-size: var(--font-size-2xs);
	line-height: 18px;
	color: var(--color-text-dark);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	margin-bottom: 0;
	box-sizing: border-box;
	display: block;
	overflow-y: hidden; // Changed dynamically via style binding

	&::placeholder {
		color: var(--color-text-light);
	}

	// Custom scrollbar when scrolling
	@supports not (selector(::-webkit-scrollbar)) {
		scrollbar-width: thin;
	}
	@supports selector(::-webkit-scrollbar) {
		&::-webkit-scrollbar {
			width: 6px;
		}
		&::-webkit-scrollbar-thumb {
			border-radius: 3px;
			background: var(--color-foreground-dark);
		}
		&::-webkit-scrollbar-track {
			background: transparent;
		}
	}
}

.bottomActions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing-3xs);
	padding: var(--spacing-2xs) 0 var(--spacing-2xs) var(--spacing-2xs);
	margin-top: auto;
}

// Common styles
.characterCount {
	font-size: var(--font-size-3xs);
	color: var(--color-text-light);
	padding: 0 var(--spacing-3xs);

	.overLimit {
		color: var(--color-danger);
		font-weight: var(--font-weight-bold);
	}
}
</style>
