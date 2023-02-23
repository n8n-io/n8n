export function addEventListenerBinding(
	element: HTMLElement | Document | Window,
	event: string,
	handler: any,
): void {
	if (element && event && handler) {
		element.addEventListener(event, handler, false);
	}
}

export function attachEventBinding(
	element: HTMLElement | Document | Window,
	event: string,
	handler: any,
): void {
	if (element && event && handler) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		(element as any).attachEvent('on' + event, handler);
	}
}

export const _on = () => {
	if (typeof window === 'undefined') {
		return () => {};
	}

	if (typeof window.document.addEventListener !== 'undefined') {
		return addEventListenerBinding;
	} else {
		return attachEventBinding;
	}
};

export const on = _on();
