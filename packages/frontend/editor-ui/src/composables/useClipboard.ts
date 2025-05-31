import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { useClipboard as useClipboardCore, useThrottleFn } from '@vueuse/core';
import { PiPWindowSymbol } from '@/constants';

type ClipboardEventFn = (data: string, event?: ClipboardEvent) => void;

export function useClipboard({
	onPaste: onPasteFn = () => {},
}: {
	onPaste?: ClipboardEventFn;
} = {}) {
	const pipWindow = inject(PiPWindowSymbol, ref<Window | undefined>());
	const { copy, copied, isSupported, text } = useClipboardCore({
		navigator: pipWindow?.value?.navigator ?? window.navigator,
		legacy: true,
	});

	const ignoreClasses = ['el-messsage-box', 'ignore-key-press-canvas'];
	const initialized = ref(false);

	const onPasteCallback = ref<ClipboardEventFn | null>(onPasteFn || null);

	/**
	 * Handles copy/paste events
	 * @param event
	 */
	function onPaste(event: ClipboardEvent) {
		if (!onPasteCallback.value) {
			return;
		}

		// Check if the event got emitted from a message box or from something
		// else which should ignore the copy/paste
		const path = event.composedPath?.() as HTMLElement[];
		for (const pathElement of path) {
			if (
				pathElement.className &&
				ignoreClasses.some((className) => pathElement.className.includes?.(className))
			) {
				return;
			}
		}

		const clipboardData = event.clipboardData;
		if (clipboardData !== null) {
			const clipboardValue = clipboardData.getData('text/plain');
			onPasteCallback.value(clipboardValue, event);
		}
	}

	const throttledOnPaste = useThrottleFn(onPaste, 1000);

	/**
	 * Initialize copy/paste elements and events
	 */
	onMounted(() => {
		if (initialized.value) {
			return;
		}

		document.addEventListener('paste', throttledOnPaste);

		initialized.value = true;
	});

	/**
	 * Remove copy/paste elements and events
	 */
	onBeforeUnmount(() => {
		if (initialized.value) {
			document.removeEventListener('paste', throttledOnPaste);
		}
	});

	return {
		copy,
		copied,
		isSupported,
		text,
		onPaste: onPasteCallback,
	};
}
