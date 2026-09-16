const INTERACTIVE_ELEMENT_SELECTOR = [
	'a[href]',
	'button',
	'input',
	'select',
	'textarea',
	'summary',
	'[role="button"]',
	'[role="checkbox"]',
	'[role="combobox"]',
	'[role="link"]',
	'[role="listbox"]',
	'[role="menuitem"]',
	'[role="option"]',
	'[role="radio"]',
	'[role="slider"]',
	'[role="switch"]',
	'[role="tab"]',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

export function isInteractiveElementInFocus(): boolean {
	const focusedElement = document.activeElement;
	if (!(focusedElement instanceof HTMLElement)) return false;

	return (
		focusedElement.isContentEditable ||
		focusedElement.closest(INTERACTIVE_ELEMENT_SELECTOR) !== null
	);
}
