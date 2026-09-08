<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { IconSize } from '../../types';
import type { InputSize } from '../../types/input';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nTooltip from '../N8nTooltip';

interface CopyInputProps {
	/** Full value written to the clipboard. */
	value: string;
	/** Accessible name of the field, e.g. "API key". */
	label: string;
	/**
	 * Optional display override, e.g. a middle-truncated secret. Copying — via the
	 * button or Cmd/Ctrl+C — always yields the full `value`.
	 */
	displayValue?: string;
	size?: InputSize;
	disabled?: boolean;
	/** Tooltip and accessible label of the copy button in its resting state. */
	copyLabel?: string;
	/** Tooltip and accessible label of the copy button while the copied feedback shows. */
	copiedLabel?: string;
	/** How long the check-mark feedback lingers, in milliseconds. */
	feedbackDurationMs?: number;
}

defineOptions({ name: 'N8nCopyInput' });

const props = withDefaults(defineProps<CopyInputProps>(), {
	displayValue: undefined,
	size: 'large',
	disabled: false,
	copyLabel: undefined,
	copiedLabel: undefined,
	feedbackDurationMs: 2000,
});

const emit = defineEmits<{
	/** Emitted after the value has been written to the clipboard. */
	copy: [value: string];
	/** Emitted when the clipboard rejected the write; no copied feedback is shown. */
	error: [error: Error];
}>();

const { t } = useI18n();
const $style = useCssModule();

const inputRef = ref<InstanceType<typeof N8nInput>>();
const isInputFocused = ref(false);
const showCopiedFeedback = ref(false);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(feedbackTimer));

const buttonLabel = computed(() =>
	showCopiedFeedback.value
		? (props.copiedLabel ?? t('copyInput.copied'))
		: (props.copyLabel ?? t('copyInput.copy')),
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
	},
]);

function legacyCopy(text: string): boolean {
	if (typeof document.execCommand !== 'function') return false;

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	document.body.appendChild(textarea);
	textarea.select();

	try {
		return document.execCommand('copy');
	} finally {
		textarea.remove();
	}
}

async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
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
	if (!event.clipboardData) return;

	// The visible text may be a truncated display value; the clipboard always gets the real one.
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
		:model-value="displayValue ?? value"
		:size="size"
		:disabled="disabled"
		:aria-label="label"
		readonly
		:class="containerClasses"
		@focus="onInputFocus"
		@blur="onInputBlur"
		@click="selectValue"
		@copy="onNativeCopy"
	>
		<template #append>
			<N8nTooltip :content="buttonLabel" :disabled="disabled" as-child>
				<N8nButton
					variant="ghost"
					:size="size"
					:disabled="disabled"
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
		text-overflow: ellipsis;
	}

	> span {
		align-self: stretch;
		margin: 0;
		padding: 0;
		background-color: transparent;
		border-left: var(--border);

		button {
			border-radius: 0 var(--input--radius) var(--input--radius) 0;
		}
	}

	// The container fades the whole field once; the inner parts must not fade again.
	&.disabled > div,
	&.disabled button {
		opacity: 1;
	}
}

.iconSwap {
	// The surface-level 4px default dissolves a glyph this small instead of morphing it.
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
