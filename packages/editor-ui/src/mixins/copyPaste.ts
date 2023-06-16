/**
 * Captures any pasted data and sends it to method "receivedCopyPasteData" which has to be
 * defined on the component which uses this mixin
 */
import { defineComponent } from 'vue';
import { debounce } from 'lodash-es';

export const copyPaste = defineComponent({
	data() {
		return {
			copyPasteElementsGotCreated: false,
			hiddenInput: null as null | Element,
			onPaste: null as null | Function,
			onBeforePaste: null as null | Function,
		};
	},
	mounted() {
		if (this.copyPasteElementsGotCreated === true) {
			return;
		}

		this.copyPasteElementsGotCreated = true;
		// Define the style of the html elements that get created to make
		// sure that they are not visible
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = `
			.hidden-copy-paste {
			position: absolute;
			bottom: 0;
			left: 0;
			width: 10px;
			height: 10px;
			display: block;
			font-size: 1px;
			z-index: -1;
			color: transparent;
			background: transparent;
			overflow: hidden;
			border: none;
			padding: 0;
			resize: none;
			outline: none;
			-webkit-user-select: text;
			user-select: text;
		}
		`;
		document.getElementsByTagName('head')[0].appendChild(style);

		// Code is mainly from
		// https://www.lucidchart.com/techblog/2014/12/02/definitive-guide-copying-pasting-javascript/
		const isSafari =
			navigator.appVersion.search('Safari') !== -1 &&
			navigator.appVersion.search('Chrome') === -1 &&
			navigator.appVersion.search('CrMo') === -1 &&
			navigator.appVersion.search('CriOS') === -1;
		const isIe =
			navigator.userAgent.toLowerCase().indexOf('msie') !== -1 ||
			navigator.userAgent.toLowerCase().indexOf('trident') !== -1;

		const hiddenInput = document.createElement('input');
		hiddenInput.setAttribute('type', 'text');
		hiddenInput.setAttribute('id', 'hidden-input-copy-paste');
		hiddenInput.setAttribute('class', 'hidden-copy-paste');
		hiddenInput.setAttribute('data-test-id', 'hidden-copy-paste');
		this.hiddenInput = hiddenInput;

		document.body.append(hiddenInput);

		let ieClipboardDiv: HTMLDivElement | null = null;
		if (isIe) {
			ieClipboardDiv = document.createElement('div');
			ieClipboardDiv.setAttribute('id', 'hidden-ie-clipboard-copy-paste');
			ieClipboardDiv.setAttribute('class', 'hidden-copy-paste');
			ieClipboardDiv.setAttribute('contenteditable', 'true');
			document.body.append(ieClipboardDiv);

			this.onBeforePaste = () => {
				// @ts-ignore
				if (hiddenInput.is(':focus')) {
					this.focusIeClipboardDiv(ieClipboardDiv as HTMLDivElement);
				}
			};
			// @ts-ignore
			document.addEventListener('beforepaste', this.onBeforePaste, true);
		}

		let userInput = '';
		const hiddenInputListener = (text: string) => {};

		hiddenInput.addEventListener('input', (e) => {
			const value = hiddenInput.value;
			userInput += value;
			hiddenInputListener(userInput);

			// There is a bug (sometimes) with Safari and the input area can't be updated during
			// the input event, so we update the input area after the event is done being processed
			if (isSafari) {
				hiddenInput.focus();
				setTimeout(() => {
					this.focusHiddenArea(hiddenInput);
				}, 0);
			} else {
				this.focusHiddenArea(hiddenInput);
			}
		});

		this.onPaste = debounce(
			(e) => {
				const event = 'paste';
				// Check if the event got emitted from a message box or from something
				// else which should ignore the copy/paste
				// @ts-ignore
				const path = e.path || (e.composedPath && e.composedPath());
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

				if (ieClipboardDiv !== null) {
					this.ieClipboardEvent(event, ieClipboardDiv);
				} else {
					this.standardClipboardEvent(event, e as ClipboardEvent);
					// @ts-ignore
					if (
						!document.activeElement ||
						(document.activeElement &&
							['textarea', 'text', 'email', 'password'].indexOf(document.activeElement.type) === -1)
					) {
						// That it still allows to paste into text, email, password & textarea-fields we
						// check if we can identify the active element and if so only
						// run it if something else is selected.
						this.focusHiddenArea(hiddenInput);
						e.preventDefault();
					}
				}
			},
			1000,
			{ leading: true },
		);

		// Set clipboard event listeners on the document.
		// @ts-ignore
		document.addEventListener('paste', this.onPaste);
	},
	methods: {
		receivedCopyPasteData(plainTextData: string, event?: ClipboardEvent): void {
			// THIS HAS TO BE DEFINED IN COMPONENT!
		},

		// For every browser except IE, we can easily get and set data on the clipboard
		standardClipboardEvent(clipboardEventName: string, event: ClipboardEvent) {
			const clipboardData = event.clipboardData;
			if (clipboardData !== null && clipboardEventName === 'paste') {
				const clipboardText = clipboardData.getData('text/plain');
				this.receivedCopyPasteData(clipboardText, event);
			}
		},

		// For IE, we can get/set Text or URL just as we normally would
		ieClipboardEvent(clipboardEventName: string, ieClipboardDiv: HTMLDivElement) {
			// @ts-ignore
			const clipboardData = window.clipboardData;
			if (clipboardEventName === 'paste') {
				const clipboardText = clipboardData.getData('Text');
				// @ts-ignore
				ieClipboardDiv.empty();
				this.receivedCopyPasteData(clipboardText);
			}
		},

		// Focuses an element to be ready for copy/paste (used exclusively for IE)
		focusIeClipboardDiv(ieClipboardDiv: HTMLDivElement) {
			ieClipboardDiv.focus();
			const range = document.createRange();
			// @ts-ignore
			range.selectNodeContents(ieClipboardDiv.get(0));
			const selection = window.getSelection();
			if (selection !== null) {
				selection.removeAllRanges();
				selection.addRange(range);
			}
		},

		focusHiddenArea(hiddenInput: HTMLInputElement) {
			// In order to ensure that the browser will fire clipboard events, we always need to have something selected
			hiddenInput.value = ' ';
			hiddenInput.focus();
			hiddenInput.select();
		},

		/**
		 * Copies given data to clipboard
		 */
		copyToClipboard(value: string): void {
			// FROM: https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
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
		},
	},
	beforeDestroy() {
		if (this.hiddenInput) {
			this.hiddenInput.remove();
		}
		if (this.onPaste) {
			// @ts-ignore
			document.removeEventListener('paste', this.onPaste);
		}
		if (this.onBeforePaste) {
			// @ts-ignore
			document.removeEventListener('beforepaste', this.onBeforePaste);
		}
	},
});
