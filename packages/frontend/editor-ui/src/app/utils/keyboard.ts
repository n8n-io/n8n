export function dispatchClickOnKeyboardActivation(event: KeyboardEvent) {
	if (!(event.currentTarget instanceof Element)) return;
	event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function dispatchDoubleClickOnKeyboardActivation(event: KeyboardEvent) {
	if (!(event.currentTarget instanceof Element)) return;
	event.currentTarget.dispatchEvent(
		new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
	);
}
