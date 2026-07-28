<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
import { computed, onBeforeUnmount, ref } from 'vue';

import type { InputSize } from '../../types/input';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';

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
	copyLabel: 'Copy',
	copiedLabel: 'Copied to clipboard',
	feedbackDurationMs: 2000,
});

const emit = defineEmits<{
	/** Emitted after the value has been written to the clipboard. */
	copy: [value: string];
}>();

// legacy: falls back to document.execCommand on insecure origins (plain-http
// self-hosted instances), where navigator.clipboard is unavailable.
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
</script>

<template>
	<N8nInput :model-value="displayValue ?? value" :size="size" readonly :class="$style.copyInput">
		<template #append>
			<N8nButton
				variant="ghost"
				:size="buttonSize"
				icon-only
				:aria-label="showCopiedFeedback ? copiedLabel : copyLabel"
				data-test-id="copy-input-button"
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
			</N8nButton>
		</template>
	</N8nInput>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

/*
 * One continuous bordered field (the instance-settings copy-field pattern):
 * border, radius and background move onto the input CONTAINER (with overflow
 * hidden so the append segment is clipped by the outer radius), the wrapper
 * drops its own border so it doesn't double up, and the append becomes a
 * transparent, full-height button segment separated from the value by a single
 * border-left divider. Focus indication is unaffected — the design system
 * draws it with outline, not box-shadow.
 */
.copyInput {
	gap: 0;
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: inset var(--input--border--shadow);
	overflow: hidden;

	:global(.n8n-input__wrapper) {
		box-shadow: none;
		background-color: transparent;
	}

	:global(.n8n-input__wrapper) + span {
		background-color: transparent;
		border-left: var(--border);
		margin: 0;
		padding: 0;
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
