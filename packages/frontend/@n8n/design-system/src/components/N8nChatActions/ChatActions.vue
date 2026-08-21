<script setup lang="ts">
import { useClipboard, useSpeechSynthesis } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip';
import type { ChatActionsProps } from './ChatActions.types';

defineOptions({ name: 'N8nChatActions' });

const { t } = useI18n();
const props = withDefaults(defineProps<ChatActionsProps>(), {
	showCopy: true,
	showReadAloud: true,
});

const COPY_FEEDBACK_DURATION_MS = 2000;

defineSlots<{
	default(): unknown;
}>();

const clipboard = useClipboard({ legacy: true });
const showCopiedFeedback = ref(false);
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;
const speech = useSpeechSynthesis(toRef(props, 'content'), {
	pitch: 1,
	rate: 1,
	volume: 1,
});
const wasStoppedByUser = ref(false);
const isReadingAloud = speech.isPlaying;
const canReadAloud = computed(function getCanReadAloud() {
	return props.showReadAloud && speech.isSupported.value;
});
const readAloudActionLabel = computed(function getReadAloudActionLabel() {
	return isReadingAloud.value
		? (props.stopReadingLabel ?? t('assistantChat.stopReading'))
		: (props.readAloudLabel ?? t('assistantChat.readAloud'));
});

async function copyMessage() {
	try {
		await clipboard.copy(props.content);
		props.onCopy?.({ text: props.content, status: 'success' });
		showCopiedFeedback.value = true;
		clearTimeout(copyFeedbackTimer);
		copyFeedbackTimer = setTimeout(function hideCopiedFeedback() {
			showCopiedFeedback.value = false;
		}, COPY_FEEDBACK_DURATION_MS);
	} catch {
		props.onCopy?.({ text: props.content, status: 'error' });
	}
}

function readMessageAloud() {
	if (isReadingAloud.value) {
		wasStoppedByUser.value = true;
		speech.stop();
		props.onReadAloud?.({ text: props.content, status: 'stopped' });
		return;
	}

	wasStoppedByUser.value = false;
	speech.speak();
	props.onReadAloud?.({ text: props.content, status: 'started' });
}

watch(
	function getSpeechStatus() {
		return speech.status.value;
	},
	function reportCompletedSpeech(status) {
		if (status === 'end' && !wasStoppedByUser.value) {
			props.onReadAloud?.({ text: props.content, status: 'ended' });
		}
	},
);

watch(
	function getContent() {
		return props.content;
	},
	function stopChangedContent() {
		if (isReadingAloud.value) speech.stop();
	},
);

onBeforeUnmount(function cleanUpActions() {
	clearTimeout(copyFeedbackTimer);
	if (isReadingAloud.value) speech.stop();
});
</script>

<template>
	<div :class="$style.actions" role="group" :aria-label="t('assistantChat.messageActions')">
		<N8nTooltip
			v-if="showCopy"
			:content="
				showCopiedFeedback ? t('assistantChat.copied') : (copyLabel ?? t('assistantChat.copy'))
			"
			placement="bottom"
		>
			<N8nButton
				variant="ghost"
				size="small"
				icon-only
				:aria-label="
					showCopiedFeedback ? t('assistantChat.copied') : (copyLabel ?? t('assistantChat.copy'))
				"
				:data-test-id="copyTestId"
				@click="copyMessage"
			>
				<template #icon>
					<span :class="$style.iconSwap">
						<Transition
							:enter-active-class="$style.swapEnterActive"
							:leave-active-class="$style.swapLeaveActive"
						>
							<N8nIcon v-if="showCopiedFeedback" key="check" icon="check" size="medium" />
							<N8nIcon v-else key="copy" icon="copy" size="medium" />
						</Transition>
					</span>
				</template>
			</N8nButton>
		</N8nTooltip>
		<N8nTooltip v-if="canReadAloud" :content="readAloudActionLabel" placement="bottom">
			<N8nIconButton
				:icon="isReadingAloud ? 'volume-x' : 'volume-2'"
				variant="ghost"
				size="small"
				icon-size="medium"
				:aria-label="readAloudActionLabel"
				:aria-pressed="isReadingAloud"
				:data-test-id="readAloudTestId"
				@click="readMessageAloud"
			/>
		</N8nTooltip>
		<slot />
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

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
