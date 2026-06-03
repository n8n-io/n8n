<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';

import { useAutosizeTextarea } from '../../composables/useAutosizeTextarea';
import { useCharacterLimit } from '../../composables/useCharacterLimit';
import { useI18n } from '../../composables/useI18n';
import N8nCallout from '../N8nCallout/Callout.vue';
import N8nSendStopButton from '../N8nSendStopButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

defineOptions({
	name: 'N8nChatInput',
	inheritAttrs: false,
});

export interface N8nChatInputProps {
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
	autosize?: boolean | { minRows: number; maxRows: number };
	submitDisabled?: boolean;
	sendButtonTestId?: string;
	stopButtonTestId?: string;
}

const INFINITE_CREDITS = -1;

const props = withDefaults(defineProps<N8nChatInputProps>(), {
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
	autosize: true,
	submitDisabled: undefined,
	sendButtonTestId: 'send-message-button',
	stopButtonTestId: 'send-message-button',
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
const isFocused = ref(false);
const textValue = ref(props.modelValue || '');
const autosizeRows = computed(() =>
	typeof props.autosize === 'object'
		? props.autosize
		: { minRows: 1, maxRows: props.maxLinesBeforeScroll },
);
const isAutosizeEnabled = computed(
	() => props.layout !== 'single-line' && props.autosize !== false,
);
const { textareaStyles, calculateTextareaHeight, clearTextareaHeight } = useAutosizeTextarea({
	textarea: textareaRef,
	enabled: isAutosizeEnabled,
	rows: autosizeRows,
});

const { characterCount, isOverLimit, isAtLimit } = useCharacterLimit({
	value: textValue,
	maxLength: toRef(props, 'maxLength'),
});

const showWarningBanner = computed(() => isAtLimit.value);
const sendDisabled = computed(
	() =>
		props.submitDisabled ??
		(!textValue.value.trim() ||
			props.streaming ||
			props.disabled ||
			isOverLimit.value ||
			props.creditsRemaining === 0),
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

const textareaStyle = computed(() => (isAutosizeEnabled.value ? textareaStyles.value : undefined));

function adjustHeight() {
	if (!isAutosizeEnabled.value) {
		clearTextareaHeight();
		return;
	}

	calculateTextareaHeight();
}

watch(
	() => props.modelValue,
	async (newValue) => {
		textValue.value = newValue || '';
		await nextTick();
		if (props.layout === 'single-line' || props.autosize === false) return;

		// Wait for an additional animation frame to ensure DOM has fully updated
		await new Promise(requestAnimationFrame);
		adjustHeight();
	},
);

watch([() => props.layout, () => props.autosize], ([layout, autosize]) => {
	if (layout === 'single-line' || autosize === false) {
		clearTextareaHeight();
		return;
	}

	void nextTick(() => adjustHeight());
});

watch(textValue, (newValue, oldValue) => {
	emit('update:modelValue', newValue);
	// Single-line layout has fixed height; only multiline needs autosizing.
	if (props.layout === 'single-line' || props.autosize === false) return;

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
	if (props.layout === 'single-line' && event.key === 'Enter' && !event.isComposing) {
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
	const isSubmitKey = event.key === 'Enter' && !event.shiftKey && !event.isComposing;
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
				<slot name="leading" />
				<!-- Warning banner when character limit is reached -->
				<N8nCallout v-if="showWarningBanner" slim icon="info" theme="warning">
					{{ t('assistantChat.characterLimit', { limit: maxLength.toString() }) }}
				</N8nCallout>

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
					@input="layout === 'single-line' || autosize === false ? undefined : adjustHeight"
					@click="handleFocusableRegionClick"
				/>
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
								:streaming="streaming"
								:disabled="sendDisabled"
								:label="buttonLabel"
								:send-button-test-id="sendButtonTestId"
								:stop-button-test-id="stopButtonTestId"
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

.textarea {
	width: 100%;
	border: none;
	background: transparent;
	resize: none;
	outline: none;
	font-family: var(--font-family);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xs);
	color: var(--text-color);
	padding: var(--spacing--3xs);
	margin-bottom: 0;
	box-sizing: border-box;
	display: block;
	overflow-y: hidden;

	&:not(.singleLineTextarea) {
		line-height: var(--line-height--xl);
	}

	scrollbar-width: none;
	scrollbar-color: transparent transparent;

	&::-webkit-scrollbar {
		display: none;
	}

	&::placeholder {
		color: var(--text-color--subtler);
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

.leading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	overflow-x: auto;
}
</style>
