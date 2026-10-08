import { watch, type Ref } from 'vue';

/** The parts of the chat composer that the focus handling uses. */
export interface FocusableComposer {
	focus: (options?: FocusOptions) => void;
	getInputElement: () => HTMLTextAreaElement | undefined;
}

/**
 * Keeps the keyboard focus in the chat composer across a send.
 *
 * The chat disables the composer while a send prepares, and a disabled
 * textarea loses the focus. This remembers the focus that the composer had
 * when the send started, and a focus request that came during the send. When
 * the composer is enabled again, the focus goes back to it. The focus stays
 * on another control if the user moved it there in the meantime.
 */
export function useComposerFocus(
	getComposer: () => FocusableComposer | null | undefined,
	isDisabled: Readonly<Ref<boolean>>,
) {
	let pending: { options?: FocusOptions } | undefined;

	function getInput(): HTMLTextAreaElement | undefined {
		return getComposer()?.getInputElement();
	}

	function hasFocus(): boolean {
		const input = getInput();
		return input !== undefined && input === document.activeElement;
	}

	/** True when no other control holds the focus. */
	function isFocusFree(): boolean {
		const active = document.activeElement;
		return active === null || active === document.body || active === getInput();
	}

	function focus(options?: FocusOptions): void {
		if (isDisabled.value) {
			pending = { options };
			return;
		}
		getComposer()?.focus(options);
		// The textarea stays disabled until the next render. Try again after it.
		if (getInput()?.disabled) pending = { options };
	}

	function restore(): void {
		const request = pending;
		pending = undefined;
		if (!request || !isFocusFree()) return;
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
