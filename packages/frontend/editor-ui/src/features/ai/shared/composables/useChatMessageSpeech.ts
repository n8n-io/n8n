import { useSpeechSynthesis } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

interface ChatMessageSpeechOptions {
	getText: (messageId: string) => string;
}

const activeSpeechToken = ref<symbol | null>(null);
let stopActiveSpeech: (() => void) | null = null;

export function useChatMessageSpeech(options: ChatMessageSpeechOptions) {
	const speechToken = Symbol('chat-message-speech');
	const activeMessageId = ref<string | null>(null);
	const activeText = computed(function getActiveText() {
		if (!activeMessageId.value) return '';
		return options.getText(activeMessageId.value);
	});
	const speech = useSpeechSynthesis(activeText, {
		pitch: 1,
		rate: 1,
		volume: 1,
	});
	const isSupported = computed(function isSpeechSupported() {
		return speech.isSupported.value;
	});

	function ownsActiveSpeech() {
		return activeSpeechToken.value === speechToken;
	}

	function stop() {
		if (!ownsActiveSpeech()) {
			activeMessageId.value = null;
			return;
		}

		speech.stop();
		activeMessageId.value = null;
		activeSpeechToken.value = null;
		stopActiveSpeech = null;
	}

	function isSpeaking(messageId: string) {
		return (
			ownsActiveSpeech() && activeMessageId.value === messageId && speech.status.value === 'play'
		);
	}

	function toggle(messageId: string) {
		if (!isSupported.value) return;

		if (ownsActiveSpeech() && activeMessageId.value === messageId) {
			stop();
			return;
		}

		stopActiveSpeech?.();
		activeMessageId.value = messageId;
		activeSpeechToken.value = speechToken;
		stopActiveSpeech = stop;
		speech.speak();
	}

	watch(
		function getSpeechStatus() {
			return speech.status.value;
		},
		function clearCompletedSpeech(status) {
			if (status === 'end' && ownsActiveSpeech()) stop();
		},
	);

	watch(activeText, function stopEmptySpeech(value) {
		if (!value && ownsActiveSpeech()) stop();
	});

	onBeforeUnmount(function stopSpeechOnUnmount() {
		if (ownsActiveSpeech()) stop();
	});

	return {
		isSupported,
		isSpeaking,
		toggle,
		stop,
	};
}
