/**
 * Check if given element is visible
 *
 * @param element
 */
export function isVisible(element: HTMLElement): boolean {
	return (
		Boolean(element) &&
		Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length)
	);
}
