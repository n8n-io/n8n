export function isFocusable(element: HTMLElement): boolean {
	if (
		element.tabIndex > 0 ||
		(element.tabIndex === 0 && element.getAttribute('tabIndex') !== null)
	) {
		return true;
	}

	if ((element as HTMLFormElement).disabled) {
		return false;
	}

	switch (element.nodeName) {
		case 'A':
			return !!(element as HTMLAnchorElement).href && (element as any).rel !== 'ignore';
		case 'INPUT':
			return (
				(element as HTMLFormElement).type !== 'hidden' &&
				(element as HTMLFormElement).type !== 'file'
			);
		case 'BUTTON':
		case 'SELECT':
		case 'TEXTAREA':
			return true;
		default:
			return false;
	}
}
