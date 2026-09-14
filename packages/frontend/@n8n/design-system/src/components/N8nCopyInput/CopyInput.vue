<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
import { computed, onBeforeUnmount, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { InputSize } from '../../types/input';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nTooltip from '../N8nTooltip';

interface CopyInputProps {
	/** Full value written to the clipboard. */
	value: string;
	/**
	 * Optional display override, e.g. a middle-truncated secret. The copy button
	 * always copies the full `value`.
	 */
	displayValue?: string;
	size?: InputSize;
	/** Accessible label of the copy button in its resting state. */
	copyLabel?: string;
	/** Accessible label of the copy button while the copied feedback shows. */
	copiedLabel?: string;
	/** How long the check-mark feedback lingers, in milliseconds. */
	feedbackDurationMs?: number;
}

defineOptions({ name: 'N8nCopyInput' });

const props = withDefaults(defineProps<CopyInputProps>(), {
	displayValue: undefined,
	size: 'large',
	copyLabel: undefined,
	copiedLabel: undefined,
	feedbackDurationMs: 2000,
});

const { t } = useI18n();

const emit = defineEmits<{
	copy: [value: string];
}>();

const clipboard = useClipboard({ legacy: true });

const showCopiedFeedback = ref(false);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(feedbackTimer));

async function onCopyClick() {
	await clipboard.copy(props.value);
	emit('copy', props.value);
	showCopiedFeedback.value = true;
	clearTimeout(feedbackTimer);
	feedbackTimer = setTimeout(() => {
		showCopiedFeedback.value = false;
	}, props.feedbackDurationMs);
}

const buttonSize = computed(() => {
	switch (props.size) {
		case 'mini':
		case 'small':
			return 'small';
		case 'large':
		case 'xlarge':
			return 'large';
		default:
			return 'medium';
	}
});

const copyButtonLabel = computed(() =>
	showCopiedFeedback.value
		? (props.copiedLabel ?? t('generic.copiedToClipboard'))
		: (props.copyLabel ?? t('generic.copy')),
);
</script>

<template>
	<N8nInput :model-value="displayValue ?? value" :size="size" readonly :class="$style.copyInput">
		<template #append>
			<N8nTooltip :content="copyButtonLabel">
				<N8nIconButton
					variant="ghost"
					:size="buttonSize"
					icon="copy"
					:aria-label="copyButtonLabel"
					data-test-id="copy-input-button"
					:class="$style.button"
					@click="onCopyClick"
				>
					<template #icon>
						<span :class="$style.iconSwap">
							<Transition
								:enter-active-class="$style.swapEnterActive"
								:leave-active-class="$style.swapLeaveActive"
							>
								<N8nIcon v-if="showCopiedFeedback" key="check" icon="check" :size="buttonSize" />
								<N8nIcon v-else key="copy" icon="copy" :size="buttonSize" />
							</Transition>
						</span>
					</template>
				</N8nIconButton>
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
	overflow: hidden;

	&:focus-within {
		@include focus.focus-ring;
		box-shadow: inset var(--input--border--shadow--focus);
	}

	:global(.n8n-input__wrapper) {
		background-color: transparent;

		&,
		&:hover:not(.disabled):not(:focus-within),
		&:focus-within {
			box-shadow: none;
		}
	}

	:global(.n8n-input__wrapper) + span {
		background-color: transparent;
		border-left: var(--border-width) var(--border-style) var(--input--border-color);
		margin: 0;
		padding: 0;
	}
}

.button {
	/** Overrides radius so that hover state doesnt leave gaps in left corners **/
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
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
