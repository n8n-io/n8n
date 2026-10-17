<script lang="ts" setup>
import { PopOutWindowKey } from '@n8n/composables/injectionKeys';
import { computed, inject, onBeforeUnmount, ref, useCssModule } from 'vue';

import type { CopyInputEmits, CopyInputProps, CopyInputSlots } from './CopyInput.types';
import { useI18n } from '../../composables/useI18n';
import type { IconSize } from '../../types';
import type { InputSize } from '../../types/input';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nLoading from '../N8nLoading';
import N8nTooltip from '../N8nTooltip';

defineOptions({ name: 'N8nCopyInput' });

const props = withDefaults(defineProps<CopyInputProps>(), {
	displayValue: undefined,
	size: 'large',
	disabled: false,
	loading: false,
	allowCopy: true,
	redact: false,
	copyLabel: undefined,
	copiedLabel: undefined,
	feedbackDurationMs: 2000,
});

const emit = defineEmits<CopyInputEmits>();
const slots = defineSlots<CopyInputSlots>();

const { t } = useI18n();
const $style = useCssModule();

// The NDV can be popped out into its own window and `navigator.clipboard` is
// per window, so copying has to target the window the field is rendered in.
const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());

const inputRef = ref<InstanceType<typeof N8nInput>>();
const isInputFocused = ref(false);
const showCopiedFeedback = ref(false);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(feedbackTimer));

const canCopy = computed(() => props.allowCopy && !props.disabled && !props.loading);
const hasAppend = computed(() => props.allowCopy || !!slots.actions);

const buttonLabel = computed(() =>
	showCopiedFeedback.value
		? (props.copiedLabel ?? t('generic.copiedToClipboard'))
		: (props.copyLabel ?? t('generic.copy')),
);

const iconSizes: Record<InputSize, IconSize> = {
	mini: 'xsmall',
	small: 'xsmall',
	medium: 'small',
	large: 'medium',
	xlarge: 'large',
};

const iconSize = computed(() => iconSizes[props.size]);

const containerClasses = computed(() => [
	$style.copyInput,
	{
		[$style.focused]: isInputFocused.value,
		[$style.disabled]: props.disabled,
		[$style.loading]: props.loading,
		'ph-no-capture': props.redact,
	},
]);

function getTargetWindow(): Window {
	return popOutWindow.value ?? window;
}

function legacyCopy(text: string): boolean {
	const { document: doc } = getTargetWindow();
	if (typeof doc.execCommand !== 'function') return false;

	const textarea = doc.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	doc.body.appendChild(textarea);
	textarea.select();

	try {
		return doc.execCommand('copy');
	} finally {
		textarea.remove();
	}
}

async function copyToClipboard(text: string): Promise<void> {
	const clipboard = getTargetWindow().navigator.clipboard;
	if (clipboard?.writeText) {
		try {
			await clipboard.writeText(text);
			return;
		} catch {
			// Insecure origin or denied permission — try the legacy command below.
		}
	}

	if (!legacyCopy(text)) {
		throw new Error('Copying to the clipboard was blocked');
	}
}

function showFeedback() {
	showCopiedFeedback.value = true;
	clearTimeout(feedbackTimer);
	feedbackTimer = setTimeout(() => {
		showCopiedFeedback.value = false;
	}, props.feedbackDurationMs);
}

async function onCopyClick() {
	try {
		await copyToClipboard(props.value);
	} catch (error) {
		emit('error', error instanceof Error ? error : new Error(String(error)));
		return;
	}

	emit('copy', props.value);
	showFeedback();
}

function onNativeCopy(event: ClipboardEvent) {
	// Without the copy affordance the field behaves like plain text: Cmd/Ctrl+C
	// copies what is visible, never the full value behind a truncated display.
	if (!canCopy.value || !event.clipboardData) return;

	event.preventDefault();
	event.clipboardData.setData('text/plain', props.value);
	emit('copy', props.value);
	showFeedback();
}

function selectValue() {
	inputRef.value?.select();
}

function onInputFocus() {
	isInputFocused.value = true;
	selectValue();
}

function onInputBlur() {
	isInputFocused.value = false;
}
</script>

<template>
	<N8nInput
		ref="inputRef"
		:model-value="loading ? '' : (displayValue ?? value)"
		:size="size"
		:disabled="disabled"
		:aria-label="label"
		:aria-busy="loading || undefined"
		readonly
		:class="containerClasses"
		@focus="onInputFocus"
		@blur="onInputBlur"
		@click="selectValue"
		@copy="onNativeCopy"
	>
		<template v-if="loading" #prefix>
			<N8nLoading variant="custom" data-test-id="copy-input-skeleton" />
		</template>
		<template v-if="hasAppend" #append>
			<slot name="actions" />
			<N8nTooltip v-if="allowCopy" :content="buttonLabel" :disabled="!canCopy" as-child>
				<N8nButton
					variant="ghost"
					:size="size"
					:disabled="!canCopy"
					icon-only
					:aria-label="buttonLabel"
					data-test-id="copy-input-button"
					@click="onCopyClick"
				>
					<template #icon>
						<span :class="$style.iconSwap">
							<Transition
								:enter-active-class="$style.swapEnterActive"
								:leave-active-class="$style.swapLeaveActive"
							>
								<N8nIcon v-if="showCopiedFeedback" key="check" icon="check" :size="iconSize" />
								<N8nIcon v-else key="copy" icon="copy" :size="iconSize" />
							</Transition>
						</span>
					</template>
				</N8nButton>
			</N8nTooltip>
		</template>
	</N8nInput>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/motion';

.copyInput {
	gap: 0;
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: inset var(--input--border--shadow);

	&:hover:not(.disabled):not(.focused) {
		box-shadow: inset var(--input--border--shadow--hover);
	}

	&.focused {
		@include focus.focus-ring;
		box-shadow: inset var(--input--border--shadow--focus);
	}

	&.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	// The input wrapper keeps its layout but hands border, background and focus
	// ring over to this container, through the variables it already consumes.
	> div {
		--input--color--background: transparent;
		--input--shadow: 0 0 0 0 transparent;
		--input--shadow--hover: 0 0 0 0 transparent;
		--input--shadow--focus: 0 0 0 0 transparent;
		--input--border--shadow: 0 0 0 0 transparent;
		--input--border--shadow--hover: 0 0 0 0 transparent;
		--input--border--shadow--focus: 0 0 0 0 transparent;

		&:focus-within {
			outline: none;
		}
	}

	input {
		font-family: var(--font-family--monospace);
		text-overflow: ellipsis;
	}

	// Actions and the copy button form one flush segment behind the divider.
	> span {
		align-self: stretch;
		margin: 0;
		padding: 0;
		background-color: transparent;
		border-left: var(--border-width) var(--border-style) var(--input--border-color);

		> * {
			border-radius: 0;
		}

		> * + * {
			border-left: var(--border-width) var(--border-style) var(--input--border-color);
		}

		> :last-child {
			border-radius: 0 var(--input--radius) var(--input--radius) 0;
		}
	}

	// The container fades the whole field once; the inner parts must not fade again.
	&.disabled > div,
	&.disabled button {
		opacity: 1;
	}

	// Loading: the prefix slot carries the skeleton, laid over the (empty) value.
	&.loading > div {
		position: relative;

		> span:first-child {
			position: absolute;
			inset: 25% var(--input--padding);
			margin: 0;
			padding: 0;
			opacity: 1;
		}
	}
}

/*
 * Copy -> check swap: both icons overlap in the same spot (the leaving one is
 * absolutely positioned) and crossfade through the blur-swap motion. The blur
 * is tightened for icon-sized glyphs — the surface-level 4px default dissolves
 * a glyph this small instead of morphing it.
 */
.iconSwap {
	--animation--blur-swap--blur: 2px;

	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.swapEnterActive {
	@include motion.blur-swap-in;
}

.swapLeaveActive {
	position: absolute;
	@include motion.blur-swap-out;
}
</style>
