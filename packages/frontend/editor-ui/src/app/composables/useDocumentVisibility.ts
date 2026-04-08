import type { Ref } from 'vue';
import { ref, onMounted, onUnmounted } from 'vue';

type VisibilityHandler = () => void;

type DocumentVisibilityResult = {
	isVisible: Ref<boolean>;
	onDocumentVisible: (handler: VisibilityHandler) => void;
	onDocumentHidden: (handler: VisibilityHandler) => void;
};

export function useDocumentVisibility(): DocumentVisibilityResult {
	const isVisible = ref<boolean>(!document.hidden);
	const visibleHandlers = ref<VisibilityHandler[]>([]);
	const hiddenHandlers = ref<VisibilityHandler[]>([]);

	const onVisibilityChange = (): void => {
		const newVisibilityState = !document.hidden;
		isVisible.value = newVisibilityState;

		if (newVisibilityState) {
			visibleHandlers.value.forEach((handler) => handler());
		} else {
			hiddenHandlers.value.forEach((handler) => handler());
		}
	};

	const onDocumentVisible = (handler: VisibilityHandler): void => {
		visibleHandlers.value.push(handler);
	};

	const onDocumentHidden = (handler: VisibilityHandler): void => {
		hiddenHandlers.value.push(handler);
	};

	onMounted((): void => {
		document.addEventListener('visibilitychange', onVisibilityChange);
	});

	onUnmounted((): void => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
		// Clear handlers on unmount
		visibleHandlers.value = [];
		hiddenHandlers.value = [];
	});

	return {
		isVisible,
		onDocumentVisible,
		onDocumentHidden,
	};
}
