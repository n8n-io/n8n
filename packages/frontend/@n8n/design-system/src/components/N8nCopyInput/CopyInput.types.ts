import type { InputSize } from '../../types/input';

export interface CopyInputProps {
	/** Full value written to the clipboard. */
	value: string;
	/** Accessible name of the field, e.g. "API key". Rendered as `aria-label`; pair with a visible `N8nInputLabel` at the call site. */
	label: string;
	/**
	 * Optional display override, e.g. a middle-truncated secret. Copying — via the
	 * button or Cmd/Ctrl+C — always yields the full `value`.
	 */
	displayValue?: string;
	size?: InputSize;
	/** Disables the field and the copy button, and fades the whole field. */
	disabled?: boolean;
	/** Shows a skeleton in place of the value, marks the field busy and disables copying. `#actions` stay visible. */
	loading?: boolean;
	/** When `false`, hides the copy button; the field itself stays enabled. Cmd/Ctrl+C copies the visible text only. */
	allowCopy?: boolean;
	/** Adds `ph-no-capture` to the root so the value is excluded from session recordings. */
	redact?: boolean;
	/** Tooltip and accessible label of the copy button in its resting state. */
	copyLabel?: string;
	/** Tooltip and accessible label of the copy button while the copied feedback shows. */
	copiedLabel?: string;
	/** How long the check-mark feedback lingers, in milliseconds. */
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
