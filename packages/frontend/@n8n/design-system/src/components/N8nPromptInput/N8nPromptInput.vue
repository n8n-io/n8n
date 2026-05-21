<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';

import { useCharacterLimit } from '../../composables/useCharacterLimit';
import { useI18n } from '../../composables/useI18n';
import N8nCallout from '../N8nCallout/Callout.vue';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import N8nSendStopButton from '../N8nSendStopButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

defineOptions({
	inheritAttrs: false,
});

export interface N8nPromptInputProps {
	modelValue?: string;
	placeholder?: string;
	maxLength?: number;
	maxLinesBeforeScroll?: number;
	streaming?: boolean;
	disabled?: boolean;
	disabledTooltip?: string;
	/** @deprecated Use disabled/disabledTooltip and leading or trailing slots for credit UI. */
	creditsQuota?: number;
	/** @deprecated Use disabled/disabledTooltip and leading or trailing slots for credit UI. */
	creditsRemaining?: number;
	/** @deprecated Use disabled/disabledTooltip and leading or trailing slots for credit UI. */
	showAskOwnerTooltip?: boolean;
	refocusAfterSend?: boolean;
	autofocus?: boolean;
	buttonLabel?: string;
	layout?: 'multiline' | 'single-line';
}

const INFINITE_CREDITS = -1;

const props = withDefaults(defineProps<N8nPromptInputProps>(), {
	modelValue: '',
	placeholder: '',
	maxLength: 5000,
	maxLinesBeforeScroll: 10,
	streaming: false,
	disabled: false,
	disabledTooltip: undefined,
	creditsQuota: undefined,
	creditsRemaining: undefined,
	showAskOwnerTooltip: false,
	refocusAfterSend: false,
	autofocus: false,
	buttonLabel: undefined,
	layout: 'multiline',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	stop: [];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
	'upgrade-click': [];
}>();

const { t } = useI18n();

const textareaRef = ref<HTMLTextAreaElement>();
const scrollAreaRef = ref<InstanceType<typeof N8nScrollArea>>();
const isFocused = ref(false);
const textValue = ref(props.modelValue || '');
const singleLineHeight = 24;
const textareaHeight = ref<number>(singleLineHeight);
const isMultiline = ref(false);

const textAreaMaxHeight = computed(() => {
	return props.maxLinesBeforeScroll * 18;
});

const { characterCount, isOverLimit, isAtLimit } = useCharacterLimit({
	value: textValue,
	maxLength: toRef(props, 'maxLength'),
});

const showWarningBanner = computed(() => isAtLimit.value);
const sendDisabled = computed(
	() =>
		!textValue.value.trim() ||
		props.streaming ||
		props.disabled ||
		isOverLimit.value ||
		props.creditsRemaining === 0,
);

const containerStyle = computed(() => {
	return props.layout === 'single-line' ? undefined : { minHeight: '80px' };
});

const hasNoCredits = computed(() => {
	return (
		props.creditsQuota !== undefined &&
		props.creditsRemaining !== undefined &&
		props.creditsQuota !== INFINITE_CREDITS &&
		props.creditsRemaining === 0
	);
});

const textareaStyle = computed(() =>
	props.layout === 'single-line'
		? undefined
		: {
				height: `${textareaHeight.value}px`,
				overflowY: 'hidden' as const,
			},
);

function clearTextareaHeight() {
	if (!textareaRef.value) return;
	textareaRef.value.style.height = '';
	textareaRef.value.style.overflowY = '';
}

function adjustHeight() {
	if (props.layout === 'single-line') {
		clearTextareaHeight();
		return;
	}

	// Store focus state and scroll position before potential mode change
	const wasFocused = document.activeElement === textareaRef.value;
	const wasMultiline = isMultiline.value;
	const minHeight = singleLineHeight;

	// If text is completely empty (not just whitespace), use minimum height
	if (!textValue.value || textValue.value === '') {
		isMultiline.value = false;
		textareaHeight.value = singleLineHeight;
		if (textareaRef.value) {
			textareaRef.value.style.height = `${singleLineHeight}px`;
		}
		return;
	}

	if (!textareaRef.value) return;

	// Save scroll position BEFORE any measurements or height changes
	// Only save if we're in multiline mode and have a scroll area
	let viewportEl: HTMLElement | null = null;
	let savedScrollTop = 0;

	if (wasMultiline && scrollAreaRef.value) {
		const scrollAreaElement = scrollAreaRef.value.$el as HTMLElement | undefined;
		viewportEl = scrollAreaElement?.querySelector(
			'[data-reka-scroll-area-viewport]',
		) as HTMLElement | null;
		if (viewportEl) {
			savedScrollTop = viewportEl.scrollTop;
		}
	}

	// Measure required height using 'auto' instead of '0' to minimize visual disruption
	const currentHeight = textareaRef.value.style.height;
	textareaRef.value.style.height = 'auto';
	const scrollHeight = textareaRef.value.scrollHeight;
	textareaRef.value.style.height = currentHeight; // Restore immediately to minimize flash

	// Check if we need multiline mode
	const shouldBeMultiline = scrollHeight > singleLineHeight || textValue.value.includes('\n');

	// Update height tracking
	const newHeight = Math.max(scrollHeight, minHeight);
	textareaHeight.value = newHeight;
	isMultiline.value = shouldBeMultiline;

	// Apply the appropriate height
	if (!isMultiline.value) {
		textareaRef.value.style.height = `${singleLineHeight}px`;
	} else {
		textareaRef.value.style.height = `${newHeight}px`;

		// Restore scroll position immediately after setting height
		// This needs to happen before browser recalculates layout
		if (viewportEl && wasMultiline && savedScrollTop > 0) {
			viewportEl.scrollTop = savedScrollTop;
		}
	}

	// Restore focus if mode changed or if scrollbar appeared/disappeared
	if (wasMultiline !== isMultiline.value || wasFocused) {
		void nextTick(() => {
			textareaRef.value?.focus();
		});
	}
}

watch(
	() => props.modelValue,
	async (newValue) => {
		textValue.value = newValue || '';
		await nextTick();
		if (props.layout === 'single-line') return;

		// Wait for an additional animation frame to ensure DOM has fully updated
		await new Promise(requestAnimationFrame);
		adjustHeight();
	},
);

watch(
	() => props.layout,
	(layout) => {
		if (layout === 'single-line') {
			clearTextareaHeight();
			return;
		}

		void nextTick(() => adjustHeight());
	},
);

watch(textValue, (newValue, oldValue) => {
	emit('update:modelValue', newValue);
	// Single-line layout has fixed height; only multiline needs autosizing.
	if (props.layout === 'single-line') return;

	// Only adjust height if value actually changed
	if (newValue !== oldValue) {
		void nextTick(() => adjustHeight());
	}
});

async function refocusTextArea() {
	await nextTick();
	await new Promise(requestAnimationFrame);
	focusInput();
}

async function handleSubmit() {
	emit('submit');
	if (props.refocusAfterSend) {
		await refocusTextArea();
	}
}

async function handleStop() {
	emit('stop');
	if (props.refocusAfterSend) {
		await refocusTextArea();
	}
}

async function handleKeyDown(event: KeyboardEvent) {
	if (props.layout === 'single-line' && event.key === 'Enter') {
		event.preventDefault();
		if (!sendDisabled.value) {
			await handleSubmit();
		}
		return;
	}

	const hasModifier = event.ctrlKey || event.metaKey;
	const isPrintableChar = event.key.length === 1 && !hasModifier;
	const isDeletionKey = event.key === 'Backspace' || event.key === 'Delete';
	const atMaxLength = characterCount.value >= props.maxLength;
	const isSubmitKey = event.key === 'Enter' && !event.shiftKey;
	const isNewlineKey = event.key === 'Enter' && event.shiftKey;

	// Prevent adding characters if at max length (but allow deletions/navigation)
	if (atMaxLength && isPrintableChar && !isDeletionKey) {
		event.preventDefault();
		return;
	}

	// Submit on plain Enter - if send disabled, don't submit
	if (isSubmitKey) {
		event.preventDefault();
		if (!sendDisabled.value) {
			await handleSubmit();
		}
	}

	// Insert newline on Shift+Enter
	if (isNewlineKey) {
		event.preventDefault();
		const textarea = event.target as HTMLTextAreaElement;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		textValue.value = textValue.value.substring(0, start) + '\n' + textValue.value.substring(end);
		// Set cursor position after the newline
		await nextTick();
		if (textareaRef.value) {
			textareaRef.value.selectionStart = textareaRef.value.selectionEnd = start + 1;
		}
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

function handleContainerClick() {
	if (isFocused.value || props.disabled || hasNoCredits.value) return;
	focusInput();
}

function handleFocusableRegionClick(event: MouseEvent) {
	if (event.target !== event.currentTarget) return;
	handleContainerClick();
}

function focusInput() {
	textareaRef.value?.focus();
}

onMounted(() => {
	// Adjust height on mount to respect initial content
	void nextTick(() => adjustHeight());

	if (props.autofocus) {
		focusInput();
	}
});

defineExpose({
	focusInput,
});
</script>

<template>
	<N8nTooltip :disabled="!disabled || !disabledTooltip" :content="disabledTooltip" placement="top">
		<div v-bind="$attrs" :class="$style.wrapper">
			<div
				v-if="(showWarningBanner || $slots.leading) && layout !== 'single-line'"
				:class="$style.leading"
			>
				<slot name="leading" />
			</div>
			<div
				:class="[
					$style.container,
					{
						[$style.focused]: isFocused,
						[$style.disabled]: disabled || hasNoCredits,
						[$style.singleLineContainer]: layout === 'single-line',
					},
				]"
				:style="containerStyle"
				@click.self="handleContainerClick"
			>
				<!-- Warning banner when character limit is reached -->
				<N8nCallout v-if="showWarningBanner" slim icon="info" theme="warning">
					{{ t('assistantChat.characterLimit', { limit: maxLength.toString() }) }}
				</N8nCallout>

				<!-- Use ScrollArea when content exceeds max height -->
				<N8nScrollArea
					ref="scrollAreaRef"
					:class="[
						$style.scrollAreaWrapper,
						{ [$style.singleLineScrollArea]: layout === 'single-line' },
					]"
					:max-height="layout === 'single-line' ? undefined : `${textAreaMaxHeight}px`"
					type="auto"
					@click="handleFocusableRegionClick"
				>
					<!-- Textarea -->
					<textarea
						ref="textareaRef"
						v-model="textValue"
						:class="[
							$style.textarea,
							{ [$style.singleLineTextarea]: layout === 'single-line' },
							'ignore-key-press-node-creator',
							'ignore-key-press-canvas',
						]"
						:style="textareaStyle"
						:placeholder="hasNoCredits ? '' : placeholder"
						:disabled="disabled || hasNoCredits"
						:maxlength="maxLength"
						@keydown="handleKeyDown"
						@focus="handleFocus"
						@blur="handleBlur"
						@input="layout === 'single-line' ? undefined : adjustHeight"
					/>
				</N8nScrollArea>
				<div
					:class="[$style.bottomActions, { [$style.singleLineActions]: layout === 'single-line' }]"
					@click="handleFocusableRegionClick"
				>
					<div
						v-if="$slots['left-actions'] || $slots.actions || $slots['extra-actions']"
						:class="$style.leftActions"
						@click.stop
					>
						<slot name="left-actions">
							<slot name="actions">
								<slot name="extra-actions" />
							</slot>
						</slot>
					</div>
					<div :class="$style.rightActions">
						<div v-if="$slots['right-actions']" :class="$style.actionsContent" @click.stop>
							<slot name="right-actions" />
						</div>
						<div :class="$style.actionsContent" @click.stop>
							<N8nSendStopButton
								data-test-id="send-message-button"
								:streaming="streaming"
								:disabled="sendDisabled"
								:label="buttonLabel"
								@send="handleSubmit"
								@stop="handleStop"
							/>
						</div>
					</div>
				</div>
			</div>
			<div v-if="$slots.trailing && layout !== 'single-line'" :class="$style.trailing">
				<slot name="trailing" />
			</div>
		</div>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.wrapper {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	border-radius: var(--radius--lg);
	padding: var(--spacing--2xs);

	&.focused {
		@include focus.focus-ring;
		box-shadow:
			0 0 0 1px var(--focus--border-color),
			var(--shadow--xs);
	}

	&.disabled {
		cursor: not-allowed;

		textarea,
		input {
			cursor: not-allowed;
			color: var(--color--text--tint-1);
		}
	}
}

.singleLineContainer {
	flex-direction: row;
	align-items: center;
}

.scrollAreaWrapper {
	width: 100%;
	margin-bottom: 0;
}

.textarea {
	width: 100%;
	border: none;
	background: transparent;
	resize: none;
	outline: none;
	font-family: var(--font-family), sans-serif;
	font-size: var(--font-size--sm);
	line-height: 18px;
	color: var(--color--text--shade-1);
	padding: var(--spacing--3xs);
	margin-bottom: 0;
	box-sizing: border-box;
	display: block;
	overflow-y: hidden;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.bottomActions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-top: auto;
}

.leftActions,
.rightActions,
.actionsContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.rightActions {
	margin-left: auto;
}

// Common styles
.characterCount {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	padding: 0 var(--spacing--3xs);

	.overLimit {
		color: var(--color--danger);
		font-weight: var(--font-weight--bold);
	}
}

.singleLineTextarea {
	height: var(--height--sm);
}

.singleLineActions {
	padding: 0;
}
</style>
