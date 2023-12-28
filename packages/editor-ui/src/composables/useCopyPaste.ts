import { onBeforeUnmount, onMounted, ref } from 'vue';
import { debounce } from 'lodash-es';

/**
 * Determine user's browser type
 * @source https://www.lucidchart.com/techblog/2014/12/02/definitive-guide-copying-pasting-javascript/
 */
const isSafari =
	navigator.appVersion.search('Safari') !== -1 &&
	navigator.appVersion.search('Chrome') === -1 &&
	navigator.appVersion.search('CrMo') === -1 &&
	navigator.appVersion.search('CriOS') === -1;
const isInternetExplorer =
	navigator.userAgent.toLowerCase().indexOf('msie') !== -1 ||
	navigator.userAgent.toLowerCase().indexOf('trident') !== -1;

type ClipboardEventFn = (data: string, event?: ClipboardEvent) => void;

export function useCopyPaste(
	options: {
		onClipboardPasteEvent: ClipboardEventFn;
	} = {
		onClipboardPasteEvent() {},
	},
) {
	const initialized = ref(false);

	const hiddenInputRef = ref<HTMLInputElement | null>(null);
	const hiddenIEClipboardRef = ref<HTMLDivElement | null>(null);

	const onBeforePaste = ref<(() => void) | null>(null);
	const onPaste = ref<((e: ClipboardEvent) => void) | null>(null);
	const onClipboardPasteEvent = ref<ClipboardEventFn | null>(options.onClipboardPasteEvent || null);

	/**
	 * Focuses an element to be ready for copy/paste (used exclusively for IE)
	 */
	function focusHiddenIEClipboardElement() {
		if (!hiddenIEClipboardRef.value) {
			return;
		}

		hiddenIEClipboardRef.value.focus();
		const range = document.createRange();
		// @ts-expect-error IE specific
		range.selectNodeContents(hiddenIEClipboardRef.value.get(0));
		const selection = window.getSelection();
		if (selection !== null) {
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}

	/**
	 * In order to ensure that the browser will fire clipboard events,
	 * we always need to have something selected
	 */
	function focusHiddenInput() {
		if (!hiddenInputRef.value) {
			return;
		}

		hiddenInputRef.value.value = ' ';
		hiddenInputRef.value.focus();
		hiddenInputRef.value.select();
	}

	/**
	 * Copies given data to clipboard
	 *
	 * @source https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
	 * @param value
	 */
	function copyToClipboard(value: string = ''): void {
		const element = document.createElement('textarea'); // Create a <textarea> element
		element.value = value; // Set its value to the string that you want copied
		element.setAttribute('readonly', ''); // Make it readonly to be tamper-proof
		element.style.position = 'absolute';
		element.style.left = '-9999px'; // Move outside the screen to make it invisible
		document.body.appendChild(element); // Append the <textarea> element to the HTML document

		const selection = document.getSelection();
		if (selection === null) {
			return;
		}

		const selected =
			selection.rangeCount > 0 // Check if there is any content selected previously
				? selection.getRangeAt(0) // Store selection if found
				: false; // Mark as false to know no selection existed before
		element.select(); // Select the <textarea> content
		document.execCommand('copy'); // Copy - only works as a result of a user action (e.g. click events)
		document.body.removeChild(element); // Remove the <textarea> element
		if (selected) {
			// If a selection existed before copying
			selection.removeAllRanges(); // Unselect everything on the HTML document
			selection.addRange(selected); // Restore the original selection
		}
	}

	/**
	 * Handles copy/paste events
	 * @param eventType
	 * @param event
	 */
	function onGenericClipboardEvent(eventType: string, event: ClipboardEvent) {
		if (!onClipboardPasteEvent.value) {
			return;
		}

		if (hiddenIEClipboardRef.value) {
			/**
			 * For IE, we can get/set Text or URL just as we normally would
			 */
			// @ts-expect-error IE specific
			const clipboardData = window.clipboardData;
			if (eventType === 'paste') {
				const clipboardValue = clipboardData.getData('Text');
				// @ts-expect-error IE specific
				hiddenIEClipboardRef.value.empty();
				onClipboardPasteEvent.value(clipboardValue, event);
			}
		} else {
			/**
			 * For every browser except IE, we can easily get and set data on the clipboard
			 */
			const clipboardData = event.clipboardData;
			if (clipboardData !== null && eventType === 'paste') {
				const clipboardValue = clipboardData.getData('text/plain');
				onClipboardPasteEvent.value(clipboardValue, event);
			}
		}
	}

	/**
	 * Initialize copy/paste elements and events
	 */
	onMounted(() => {
		if (initialized.value) {
			return;
		}

		/**
		 * Append hidden input to body
		 */
		const inputElement = document.createElement('input');
		inputElement.setAttribute('type', 'text');
		inputElement.setAttribute('id', 'hidden-input-copy-paste');
		inputElement.setAttribute('class', 'hidden-copy-paste');
		inputElement.setAttribute('data-test-id', 'hidden-copy-paste');
		hiddenInputRef.value = inputElement;
		document.body.append(inputElement);

		/**
		 * Create and focus a hidden div before paste in Internet Explorer
		 */
		let ieClipboardElement: HTMLDivElement | null = null;
		if (isInternetExplorer) {
			ieClipboardElement = document.createElement('div');
			ieClipboardElement.setAttribute('id', 'hidden-ie-clipboard-copy-paste');
			ieClipboardElement.setAttribute('class', 'hidden-copy-paste');
			ieClipboardElement.setAttribute('contenteditable', 'true');
			hiddenIEClipboardRef.value = ieClipboardElement;
			document.body.append(ieClipboardElement);

			onBeforePaste.value = () => {
				// @ts-expect-error IE specific
				if (hiddenInputRef.value?.is(':focus')) {
					focusHiddenIEClipboardElement();
				}
			};

			document.addEventListener('beforepaste', onBeforePaste.value, true);
		}

		let userInput = '';
		hiddenInputRef.value.addEventListener('input', () => {
			if (!hiddenInputRef.value) {
				return;
			}

			const value = hiddenInputRef.value.value;
			userInput += value;

			// There is a bug (sometimes) with Safari and the input area can't be updated during
			// the input event, so we update the input area after the event is done being processed
			if (isSafari) {
				hiddenInputRef.value.focus();
				setTimeout(() => {
					focusHiddenInput();
				}, 0);
			} else {
				focusHiddenInput();
			}
		});

		onPaste.value = debounce(
			(event: ClipboardEvent) => {
				const eventName = 'paste';

				// Check if the event got emitted from a message box or from something
				// else which should ignore the copy/paste
				// @ts-expect-error IE specific
				const path = event.path || event.composedPath?.();
				for (let index = 0; index < path.length; index++) {
					if (
						path[index].className &&
						typeof path[index].className === 'string' &&
						(path[index].className.includes('el-message-box') ||
							path[index].className.includes('ignore-key-press'))
					) {
						return;
					}
				}

				if (isInternetExplorer) {
					onGenericClipboardEvent(eventName, event);
				} else {
					onGenericClipboardEvent(eventName, event);
					if (
						!document.activeElement ||
						(document.activeElement &&
							// @ts-expect-error Element type exists only on specific elements
							['textarea', 'text', 'email', 'password'].indexOf(document.activeElement.type) === -1)
					) {
						// That it still allows to paste into text, email, password & textarea-fields we
						// check if we can identify the active element and if so only
						// run it if something else is selected.
						focusHiddenInput();
						event.preventDefault();
					}
				}
			},
			1000,
			{ leading: true },
		);

		// Set clipboard event listeners on the document.
		document.addEventListener('paste', onPaste.value);

		initialized.value = true;
	});

	/**
	 * Remove copy/paste elements and events
	 */
	onBeforeUnmount(() => {
		if (hiddenInputRef.value) {
			hiddenInputRef.value.remove();
			hiddenInputRef.value = null;
		}

		if (onPaste.value) {
			document.removeEventListener('paste', onPaste.value);
		}

		if (onBeforePaste.value) {
			document.removeEventListener('beforepaste', onBeforePaste.value);
		}
	});

	return {
		copyToClipboard,
		onClipboardPasteEvent,
	};
}
