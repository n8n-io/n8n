export function removeEventListenerBinding(
	element: HTMLElement | Document | Window,
	event: string,
	handler: any,
): void {
	if (element && event) {
		element.removeEventListener(event, handler, false);
	}
}

export function detachEventBinding(
	element: HTMLElement | Document | Window,
	event: string,
	handler: any,
): void {
	if (element && event) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		(element as any).detachEvent('on' + event, handler);
	}
}

export const _off = () => {
	if (typeof window === 'undefined') {
		return () => {};
	}

	if (typeof window.document.removeEventListener !== 'undefined') {
		return removeEventListenerBinding;
	} else {
		return detachEventBinding;
	}
};

export const off = _off();
