import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Holds the page that the side panel shows. No page means that the panel is closed. */
export const usePagePeekStore = defineStore('pagePeek', () => {
	const pageId = ref<string>();

	function open(peekedPageId: string): void {
		pageId.value = peekedPageId;
	}

	function close(): void {
		pageId.value = undefined;
	}

	return { pageId, open, close };
});
