import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

type PointerPosition = Pick<MouseEventInit, 'clientX' | 'clientY'>;

/** The test DOM does not measure the wrapper size used at the start of a drag. */
export async function startResize(
	handle: HTMLElement,
	size: { width?: number; height?: number },
	position: PointerPosition,
): Promise<void> {
	const wrapper = handle.parentElement;
	if (!wrapper) throw new Error('The resize handle must have a wrapper.');

	Object.defineProperties(wrapper, {
		offsetWidth: { configurable: true, value: size.width ?? 0 },
		offsetHeight: { configurable: true, value: size.height ?? 0 },
	});
	await fireEvent.mouseDown(handle, position);
}

/** Wait for the resize frame and the resulting Vue render before checking the panel. */
export async function moveResize(position: PointerPosition): Promise<void> {
	await fireEvent.mouseMove(window, position);
	await new Promise<void>(function waitForFrame(resolve) {
		window.requestAnimationFrame(function onFrame() {
			resolve();
		});
	});
	await nextTick();
}
