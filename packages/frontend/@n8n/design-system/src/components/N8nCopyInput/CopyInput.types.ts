import type { InputSize } from '../../types/input';

export interface CopyInputProps {
	/** Full value written to the clipboard. */
	value: string;
	/** Accessible name of the field, e.g. "API key". Rendered as `aria-label`; pair with a visible `N8nInputLabel` at the call site. */
	label: string;
	/**
	 * Optional display override, e.g. a middle-truncated secret. Copying — via the
	 * button or Cmd/Ctrl+C — always yields the full `value`.
	 * @defaultValue the `value` prop
	 */
	displayValue?: string;
	/**
	 * Size of the field, shared by the input and the copy button.
	 * @defaultValue 'large'
	 */
	size?: InputSize;
	/**
	 * Disables the field and the copy button, and fades the whole field.
	 * @defaultValue false
	 */
	disabled?: boolean;
	/**
	 * Shows a skeleton in place of the value, marks the field busy and disables copying.
	 * `#actions` stay visible.
	 * @defaultValue false
	 */
	loading?: boolean;
	/**
	 * When `false`, hides the copy button; the field itself stays enabled.
	 * Cmd/Ctrl+C copies the visible text only.
	 * @defaultValue true
	 */
	allowCopy?: boolean;
	/**
	 * Adds `ph-no-capture` to the root so the value is excluded from session recordings.
	 * @defaultValue false
	 */
	redact?: boolean;
	/**
	 * Tooltip and accessible label of the copy button in its resting state.
	 * @defaultValue localized `generic.copy`
	 */
	copyLabel?: string;
	/**
	 * Tooltip and accessible label of the copy button while the copied feedback shows.
	 * @defaultValue localized `generic.copiedToClipboard`
	 */
	copiedLabel?: string;
	/**
	 * How long the check-mark feedback lingers, in milliseconds.
	 * @defaultValue 2000
	 */
	feedbackDurationMs?: number;
}

export interface CopyInputEmits {
	/** Emitted after the value has been written to the clipboard. */
	copy: [value: string];
	/** Emitted when the clipboard rejected the write; no copied feedback is shown. */
	error: [error: Error];
}

export interface CopyInputSlots {
	/** Extra controls rendered inside the field, before the copy button (e.g. a rotate-key button). */
	actions?: () => unknown;
}
