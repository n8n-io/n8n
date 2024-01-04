import { onBeforeUnmount, onMounted, ref } from 'vue';
import { debounce } from 'lodash-es';
import { useClipboard as useClipboardCore } from '@vueuse/core';

type ClipboardEventFn = (data: string, event?: ClipboardEvent) => void;

export function useClipboard(
	options: {
		onPaste: ClipboardEventFn;
	} = {
		onPaste() {},
	},
) {
	const { copy, copied, isSupported, text } = useClipboardCore();

	const ignoreClasses = ['el-messsage-box', 'ignore-key-press'];
	const initialized = ref(false);

	const onPasteCallback = ref<ClipboardEventFn | null>(options.onPaste || null);

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

	const debouncedOnPaste = debounce(onPaste, 1000, { leading: true });

	/**
	 * Initialize copy/paste elements and events
	 */
	onMounted(() => {
		if (initialized.value) {
			return;
		}

		document.addEventListener('paste', debouncedOnPaste);

		initialized.value = true;
	});

	/**
	 * Remove copy/paste elements and events
	 */
	onBeforeUnmount(() => {
		if (initialized.value) {
			document.removeEventListener('paste', debouncedOnPaste);
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
