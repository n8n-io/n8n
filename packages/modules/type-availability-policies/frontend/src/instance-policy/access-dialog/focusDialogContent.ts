/**
 * Puts the focus on the dialog itself when it opens. By default the dialog focuses its first
 * control, the Access select, and selects the text of it, which reads as a pending choice.
 */
export function focusDialogContent(event: Event) {
	event.preventDefault();
	if (event.target instanceof HTMLElement) event.target.focus();
}
