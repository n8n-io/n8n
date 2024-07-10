import { STORES } from '@/constants';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const MAX_CHAT_WIDTH = 425;
const MIN_CHAT_WIDTH = 250;

export const useAssistantStore = defineStore(STORES.ASSISTANT, () => {
	const chatEnabled = ref<boolean>(false);
	const chatWidth = ref<number>(275);

	const chatWindowOpen = ref<boolean>(false);

	function closeChat() {
		chatWindowOpen.value = false;
	}

	function openChat() {
		chatWindowOpen.value = false;
	}

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	return {
		chatEnabled,
		chatWidth,
		closeChat,
		openChat,
		updateWindowWidth,
	};
});
