export function isMiddleMouseButton(event: MouseEvent) {
	return event.which === 2 || event.button === 1;
}
