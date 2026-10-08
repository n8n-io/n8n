import { watch, type Ref } from 'vue';

/** The parts of the chat composer that the focus handling uses. */
export interface FocusableComposer {
	focus: (options?: FocusOptions) => void;
	getInputElement: () => HTMLTextAreaElement | undefined;
}

interface FocusRequest {
	options?: FocusOptions;
	/** The element that had the focus when the request came. */
	from?: Element | null;
}

/**
 * Keeps the keyboard focus in the chat composer across a send.
 *
 * The chat disables the composer while a send prepares, and a disabled
 * textarea loses the focus. This remembers the focus that the composer had
 * when the send started, and a focus request that came during the send. When
 * the composer is enabled again, the focus goes back to it. A request also
 * takes the focus from the control that had it when the request came. The
 * focus stays on another control if the user moved it there in the meantime.
 */
export function useComposerFocus(
	getComposer: () => FocusableComposer | null | undefined,
	isDisabled: Readonly<Ref<boolean>>,
) {
	let pending: FocusRequest | undefined;

	function getInput(): HTMLTextAreaElement | undefined {
		return getComposer()?.getInputElement();
	}

	function hasFocus(): boolean {
		const input = getInput();
		return input !== undefined && input === document.activeElement;
	}

	/**
	 * True when the focus did not move to another control after the request.
	 * The control that asked can keep the focus until it leaves the DOM, for
	 * example a button in a panel with a leave transition.
	 */
	function canTakeFocus(request: FocusRequest): boolean {
		const active = document.activeElement;
		if (active === null || active === document.body || active === getInput()) return true;
		return active === request.from;
	}

	function defer(options?: FocusOptions): void {
		pending = { options, from: document.activeElement };
	}

	function focus(options?: FocusOptions): void {
		if (isDisabled.value) {
			defer(options);
			return;
		}
		getComposer()?.focus(options);
		// The textarea stays disabled until the next render. Try again after it.
		if (getInput()?.disabled) defer(options);
	}

	function restore(): void {
		const request = pending;
		pending = undefined;
		if (!request || !canTakeFocus(request)) return;
		getComposer()?.focus(request.options);
	}

	// Read the focus before the render disables the textarea.
	watch(
		isDisabled,
		(disabled) => {
			if (disabled && hasFocus()) pending = {};
		},
		{ flush: 'sync' },
	);

	// Give the focus back after the render enables the textarea.
	watch(
		isDisabled,
		(disabled) => {
			if (!disabled) restore();
		},
		{ flush: 'post' },
	);

	return { focus };
}
