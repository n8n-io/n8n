<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';

import N8nSendStopButton from './N8nSendStopButton.vue';
import { useCharacterLimit } from '../../composables/useCharacterLimit';
import { useI18n } from '../../composables/useI18n';
import N8nCallout from '../N8nCallout/Callout.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nLink from '../N8nLink';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export interface N8nPromptInputProps {
	modelValue?: string;
	placeholder?: string;
	maxLength?: number;
	maxLinesBeforeScroll?: number;
	streaming?: boolean;
	disabled?: boolean;
	creditsQuota?: number;
	creditsClaimed?: number;
	onUpgradeClick: () => void;
}

const props = withDefaults(defineProps<N8nPromptInputProps>(), {
	modelValue: '',
	placeholder: '',
	maxLength: 1000,
	maxLinesBeforeScroll: 6,
	streaming: false,
	disabled: false,
	creditsQuota: undefined,
	creditsClaimed: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	stop: [];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
}>();

const { t } = useI18n();

const textareaRef = ref<HTMLTextAreaElement>();
const containerRef = ref<HTMLDivElement>();
const isFocused = ref(false);
const textValue = ref(props.modelValue || '');
const textareaHeight = ref<number>(24);
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
		creditsRemaining.value === 0,
);

const containerStyle = computed(() => {
	return { minHeight: isMultiline.value ? '80px' : '40px' };
});

const creditsRemaining = computed(() => {
	if (props.creditsQuota === undefined || props.creditsClaimed === undefined) {
		return undefined;
	}
	return props.creditsQuota - props.creditsClaimed;
});

const showCredits = computed(() => {
	return (
		props.creditsQuota !== undefined &&
		props.creditsClaimed !== undefined &&
		props.creditsQuota !== -1
	);
});

const creditsInfo = computed(() => {
	if (!showCredits.value || creditsRemaining.value === undefined) return '';
	return t('promptInput.creditsInfo', {
		remaining: creditsRemaining.value,
		total: props.creditsQuota,
	});
});

const characterLimitMessage = computed(() => {
	return t('promptInput.characterLimitReached', { limit: props.maxLength });
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
			count: creditsRemaining.value || 0,
		}),
		t('promptInput.monthlyCredits', {
			count: props.creditsQuota || 0,
		}),
		t('promptInput.creditsRenew', { date: nextMonthDate }),
		t('promptInput.creditsExpire', { date: nextMonthDate }),
	];

	return lines.join('<br />');
});

const hasNoCredits = computed(() => {
	return showCredits.value && creditsRemaining.value === 0;
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
	const singleLineHeight = 24;

	// If text is empty, revert to single-line mode
	if (!textValue.value || textValue.value.trim() === '') {
		isMultiline.value = false;
		textareaHeight.value = singleLineHeight;
		if (textareaRef.value) {
			textareaRef.value.style.height = `${singleLineHeight}px`;
		}
		return;
	}

	// Measure the natural height
	if (!textareaRef.value) return;
	textareaRef.value.style.height = '0';
	const scrollHeight = textareaRef.value.scrollHeight;

	// Check if we need multiline mode
	// Switch to multiline when text would wrap or when there's actual line breaks
	const shouldBeMultiline = scrollHeight > singleLineHeight || textValue.value.includes('\n');

	// Update height tracking
	textareaHeight.value = scrollHeight;
	isMultiline.value = shouldBeMultiline;

	// Apply the appropriate height
	if (!isMultiline.value) {
		textareaRef.value.style.height = `${singleLineHeight}px`;
	} else {
		// For multiline, set exact scrollHeight
		textareaRef.value.style.height = `${scrollHeight}px`;
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
	(newValue) => {
		textValue.value = newValue || '';
		void nextTick(() => adjustHeight());
	},
);

watch(textValue, (newValue, oldValue) => {
	emit('update:modelValue', newValue);
	// Only adjust height if value actually changed
	if (newValue !== oldValue) {
		void nextTick(() => adjustHeight());
	}
});

function handleSubmit() {
	emit('submit');
}

function handleStop() {
	emit('stop');
}

function handleKeyDown(event: KeyboardEvent) {
	// Prevent adding characters if at max length (but allow deletions/navigation)
	if (
		characterCount.value >= props.maxLength &&
		event.key.length === 1 &&
		!event.ctrlKey &&
		!event.metaKey &&
		event.key !== 'Backspace' &&
		event.key !== 'Delete'
	) {
		event.preventDefault();
		return;
	}

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
	<div :class="$style.wrapper">
		<div
			ref="containerRef"
			:class="[
				$style.container,
				{
					[$style.focused]: isFocused,
					[$style.multiline]: isMultiline,
					[$style.disabled]: disabled || streaming || hasNoCredits,
					[$style.withBottomBorder]: !!showCredits,
				},
			]"
			:style="containerStyle"
		>
			<!-- Warning banner when character limit is reached -->
			<N8nCallout
				v-if="showWarningBanner"
				icon="info"
				theme="warning"
				:class="$style.warningCallout"
			>
				{{ characterLimitMessage }}
			</N8nCallout>

			<!-- Single line mode: input and button side by side -->
			<div v-if="!isMultiline" :class="$style.singleLineWrapper">
				<textarea
					ref="textareaRef"
					v-model="textValue"
					:class="$style.singleLineTextarea"
					:placeholder="placeholder"
					:disabled="disabled || streaming || hasNoCredits"
					:maxlength="maxLength"
					rows="1"
					@keydown="handleKeyDown"
					@focus="handleFocus"
					@blur="handleBlur"
					@input="adjustHeight"
				/>
				<div :class="$style.inlineActions">
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
				<!-- Use ScrollArea when content exceeds max height -->
				<N8nScrollArea
					:class="$style.scrollAreaWrapper"
					:max-height="`${textAreaMaxHeight}px`"
					type="auto"
				>
					<textarea
						ref="textareaRef"
						v-model="textValue"
						:class="$style.multilineTextarea"
						:style="textareaStyle"
						:placeholder="placeholder"
						:disabled="disabled || streaming || hasNoCredits"
						:maxlength="maxLength"
						@keydown="handleKeyDown"
						@focus="handleFocus"
						@blur="handleBlur"
						@input="adjustHeight"
					/>
				</N8nScrollArea>
				<div :class="$style.bottomActions">
					<N8nSendStopButton
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
			<N8nTooltip
				:content="creditsTooltipContent"
				:popper-class="$style.infoPopper"
				placement="top"
			>
				<div :class="$style.creditsInfoWrapper">
					<span
						v-n8n-html="creditsInfo"
						:class="[$style.creditsInfo, { [$style.noCredits]: hasNoCredits }]"
					></span>
					<N8nIcon icon="info" size="small" :class="$style.infoIcon" />
				</div>
			</N8nTooltip>
			<N8nLink size="small" color="text-base" theme="text" @click="onUpgradeClick">
				{{ t('promptInput.getMore') }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-large);
}

.container {
	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--color-background-xlight);
	border: none;
	border-radius: var(--border-radius-large);
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease;
	padding: var(--spacing-2xs);
	box-sizing: border-box;
	border-bottom: 1px transparent solid;

	&.withBottomBorder {
		border-bottom: var(--border-base);
	}

	&.focused {
		box-shadow: 0 0 0 1px var(--color-secondary);
		border-bottom: 1px transparent solid;
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

.warningCallout {
	margin: 0 0 var(--spacing-xs) 0;
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
	font-size: var(--font-size-2xs);
	line-height: 18px;
	color: var(--color-text-dark);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	margin-bottom: 0;
	box-sizing: border-box;
	display: block;
	overflow-y: hidden;

	&::placeholder {
		color: var(--color-text-light);
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

// Credits bar below input
.creditsBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-2xs) var(--spacing-xs);
	border: none;
	margin-top: -1px;
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease;
}

.creditsInfoWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	cursor: pointer;
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);

	b {
		font-weight: var(--font-weight-bold);
	}
}

.getMoreButton,
.getMoreLink {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	cursor: pointer;
}

.infoPopper {
	min-width: 200px;
	line-height: 18px;

	b {
		font-weight: var(--font-weight-bold);
	}
}

// No credits danger styling
.noCredits {
	color: var(--color-danger) !important;
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
