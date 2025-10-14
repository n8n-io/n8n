<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';

import { useCharacterLimit } from '../../composables/useCharacterLimit';
import { useI18n } from '../../composables/useI18n';
import N8nCallout from '../N8nCallout/Callout.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nLink from '../N8nLink';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import N8nSendStopButton from '../N8nSendStopButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export interface N8nPromptInputProps {
	modelValue?: string;
	placeholder?: string;
	maxLength?: number;
	maxLinesBeforeScroll?: number;
	minLines?: number;
	streaming?: boolean;
	disabled?: boolean;
	creditsQuota?: number;
	creditsRemaining?: number;
	showAskOwnerTooltip?: boolean;
	refocusAfterSend?: boolean;
}

const INFINITE_CREDITS = -1;

const props = withDefaults(defineProps<N8nPromptInputProps>(), {
	modelValue: '',
	placeholder: '',
	maxLength: 1000,
	maxLinesBeforeScroll: 6,
	minLines: 1,
	streaming: false,
	disabled: false,
	creditsQuota: undefined,
	creditsRemaining: undefined,
	showAskOwnerTooltip: false,
	refocusAfterSend: false,
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
const containerRef = ref<HTMLDivElement>();
const isFocused = ref(false);
const textValue = ref(props.modelValue || '');
const singleLineHeight = 24;
const lineHeight = 18; // Height per line in multiline mode
const textareaHeight = ref<number>(
	props.minLines > 1 ? lineHeight * props.minLines : singleLineHeight,
);
const isMultiline = ref(props.minLines > 1);

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
	return { minHeight: isMultiline.value ? '80px' : '40px' };
});

const showCredits = computed(() => {
	return (
		props.creditsQuota !== undefined &&
		props.creditsRemaining !== undefined &&
		props.creditsQuota !== INFINITE_CREDITS
	);
});

const creditsInfo = computed(() => {
	if (!showCredits.value || props.creditsRemaining === undefined) return '';
	return t('promptInput.creditsInfo', {
		remaining: props.creditsRemaining,
		total: props.creditsQuota,
	});
});

const getNextMonth = () => {
	const now = new Date();
	const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
	return nextMonth.toLocaleDateString('en-US', options);
};

const creditsTooltipContent = computed(() => {
	if (!showCredits.value) return '';

	const nextMonthDate = getNextMonth();

	const lines = [
		t('promptInput.remainingCredits', {
			count: props.creditsRemaining ?? 0,
		}),
		t('promptInput.monthlyCredits', {
			count: props.creditsQuota ?? 0,
		}),
		t('promptInput.creditsRenew', { date: nextMonthDate }),
		t('promptInput.creditsExpire', { date: nextMonthDate }),
	];

	return lines.join('<br />');
});

const hasNoCredits = computed(() => {
	return showCredits.value && props.creditsRemaining === 0;
});

const textareaStyle = computed<{ height?: string; overflowY?: 'hidden' }>(() => {
	if (!isMultiline.value) {
		return {};
	}

	const height = Math.min(textareaHeight.value, textAreaMaxHeight.value);
	return {
		height: `${height}px`,
		overflowY: 'hidden',
	};
});

function adjustHeight() {
	// Store focus state and scroll position before potential mode change
	const wasFocused = document.activeElement === textareaRef.value;
	const wasMultiline = isMultiline.value;
	const minHeight = props.minLines > 1 ? lineHeight * props.minLines : singleLineHeight;

	// If text is completely empty (not just whitespace), use minimum height
	if (!textValue.value || textValue.value === '') {
		// Respect minLines prop
		if (props.minLines > 1) {
			isMultiline.value = true;
			textareaHeight.value = minHeight;
			if (textareaRef.value) {
				textareaRef.value.style.height = `${minHeight}px`;
			}
		} else {
			isMultiline.value = false;
			textareaHeight.value = singleLineHeight;
			if (textareaRef.value) {
				textareaRef.value.style.height = `${singleLineHeight}px`;
			}
		}
		return;
	}

	// Measure the natural height
	if (!textareaRef.value) return;
	textareaRef.value.style.height = '0';
	const scrollHeight = textareaRef.value.scrollHeight;

	// Check if we need multiline mode
	// Switch to multiline when text would wrap, when there's actual line breaks, or when minLines > 1
	const shouldBeMultiline =
		props.minLines > 1 || scrollHeight > singleLineHeight || textValue.value.includes('\n');

	// Update height tracking - use at least the minimum height
	textareaHeight.value = Math.max(scrollHeight, minHeight);
	isMultiline.value = shouldBeMultiline;

	// Apply the appropriate height
	if (!isMultiline.value) {
		textareaRef.value.style.height = `${singleLineHeight}px`;
	} else {
		// For multiline, set at least minHeight
		textareaRef.value.style.height = `${Math.max(scrollHeight, minHeight)}px`;
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
		// Wait for an additional animation frame to ensure DOM has fully updated
		await new Promise(requestAnimationFrame);
		adjustHeight();
	},
);

watch(textValue, (newValue, oldValue) => {
	emit('update:modelValue', newValue);
	// Only adjust height if value actually changed
	if (newValue !== oldValue) {
		void nextTick(() => adjustHeight());
	}
});

async function refocusTextArea() {
	await nextTick();
	await new Promise(requestAnimationFrame);
	textareaRef.value?.focus();
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
	const hasModifier = event.ctrlKey || event.metaKey;
	const isPrintableChar = event.key.length === 1 && !hasModifier;
	const isDeletionKey = event.key === 'Backspace' || event.key === 'Delete';
	const atMaxLength = characterCount.value >= props.maxLength;
	const isSubmitKey = event.key === 'Enter' && (event.ctrlKey || event.metaKey || event.shiftKey);

	// Prevent adding characters if at max length (but allow deletions/navigation)
	if (atMaxLength && isPrintableChar && !isDeletionKey) {
		event.preventDefault();
		return;
	}

	// Submit on Ctrl/Cmd+Enter. If send disabled, don't submit.
	if (isSubmitKey) {
		event.preventDefault();
		if (!sendDisabled.value) {
			await handleSubmit();
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

function focusInput() {
	textareaRef.value?.focus();
}

onMounted(() => {
	// Adjust height on mount to respect minLines or initial content
	void nextTick(() => adjustHeight());
});

defineExpose({
	focusInput,
});
</script>

<template>
	<div :class="$style.wrapper">
		<div
			ref="containerRef"
			:class="[
				$style.container,
				{
					[$style.focused]: isFocused,
					[$style.multiline]: isMultiline,
					[$style.disabled]: disabled || hasNoCredits,
					[$style.withBottomBorder]: !!showCredits,
				},
			]"
			:style="containerStyle"
		>
			<!-- Warning banner when character limit is reached -->
			<N8nCallout
				v-if="showWarningBanner"
				slim
				icon="info"
				theme="warning"
				:class="$style.warningCallout"
			>
				{{ t('assistantChat.characterLimit', { limit: maxLength.toString() }) }}
			</N8nCallout>

			<!-- Single line mode: input and button side by side -->
			<div v-if="!isMultiline" :class="$style.singleLineWrapper">
				<textarea
					ref="textareaRef"
					v-model="textValue"
					:class="[
						$style.singleLineTextarea,
						'ignore-key-press-node-creator',
						'ignore-key-press-canvas',
					]"
					:placeholder="hasNoCredits ? '' : placeholder"
					:disabled="disabled || hasNoCredits"
					:maxlength="maxLength"
					rows="1"
					@keydown="handleKeyDown"
					@focus="handleFocus"
					@blur="handleBlur"
					@input="adjustHeight"
				/>
				<div :class="$style.inlineActions">
					<N8nSendStopButton
						data-test-id="send-message-button"
						:streaming="streaming"
						:disabled="sendDisabled"
						@send="handleSubmit"
						@stop="handleStop"
					/>
				</div>
			</div>

			<!-- Multiline mode: textarea full width with button below -->
			<template v-else>
				<!-- Use ScrollArea when content exceeds max height -->
				<N8nScrollArea
					:class="$style.scrollAreaWrapper"
					:max-height="`${textAreaMaxHeight}px`"
					type="auto"
				>
					<textarea
						ref="textareaRef"
						v-model="textValue"
						:class="[
							$style.multilineTextarea,
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
						@input="adjustHeight"
					/>
				</N8nScrollArea>
				<div :class="$style.bottomActions">
					<N8nSendStopButton
						data-test-id="send-message-button"
						:streaming="streaming"
						:disabled="sendDisabled"
						@send="handleSubmit"
						@stop="handleStop"
					/>
				</div>
			</template>
		</div>

		<!-- Credits bar below input -->
		<div v-if="showCredits" :class="$style.creditsBar">
			<div :class="$style.creditsInfoWrapper">
				<span v-n8n-html="creditsInfo" :class="{ [$style.noCredits]: hasNoCredits }"></span>
				<N8nTooltip
					:content="creditsTooltipContent"
					:popper-class="$style.infoPopper"
					placement="top"
				>
					<N8nIcon icon="info" size="small" />
				</N8nTooltip>
			</div>
			<N8nTooltip
				:disabled="!showAskOwnerTooltip"
				:content="t('promptInput.askAdminToUpgrade')"
				placement="top"
			>
				<N8nLink size="small" theme="text" @click="() => emit('upgrade-click')">
					{{ t('promptInput.getMore') }}
				</N8nLink>
			</N8nTooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
}

.container {
	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-3);
	border: none;
	border-bottom: 1px transparent solid;
	border-radius: var(--radius--lg);
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease;
	padding: var(--spacing--2xs);
	box-sizing: border-box;

	// if credit bar is showing
	&.withBottomBorder {
		border-bottom: var(--border);
	}

	&.focused {
		box-shadow: 0 0 0 1px var(--color--secondary);
		border-bottom: 1px transparent solid;
	}

	&.multiline {
		padding-bottom: 0;
	}

	&.disabled {
		background-color: var(--color--background);
		cursor: not-allowed;

		textarea {
			cursor: not-allowed;
			color: var(--color--text--tint-1);
		}
	}
}

.warningCallout {
	margin: 0 var(--spacing--3xs) var(--spacing--2xs) var(--spacing--3xs);
}

// Single line mode
.singleLineWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.singleLineTextarea {
	flex: 1;
	border: none;
	background: transparent;
	resize: none;
	outline: none;
	font-family: var(--font-family), sans-serif;
	font-size: var(--font-size--2xs);
	line-height: 24px;
	color: var(--color--text--shade-1);
	padding: 0 var(--spacing--2xs);
	height: 24px;
	overflow: hidden;
	box-sizing: border-box;
	display: block;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.inlineActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

// Multiline mode
.scrollAreaWrapper {
	width: 100%;
	margin-bottom: 0;
}

.multilineTextarea {
	width: 100%;
	border: none;
	background: transparent;
	resize: none;
	outline: none;
	font-family: var(--font-family), sans-serif;
	font-size: var(--font-size--2xs);
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
	justify-content: flex-end;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) 0 var(--spacing--2xs) var(--spacing--2xs);
	margin-top: auto;
}

// Credits bar below input
.creditsBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
}

.creditsInfoWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--text);
	font-size: var(--font-size--2xs);

	b {
		font-weight: var(--font-weight--bold);
	}
}

.infoPopper {
	min-width: 200px;
	line-height: 18px;

	b {
		font-weight: var(--font-weight--bold);
	}
}

.noCredits {
	color: var(--color--danger);
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
</style>
