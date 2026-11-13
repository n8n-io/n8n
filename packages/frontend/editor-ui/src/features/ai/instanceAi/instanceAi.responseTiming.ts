import { nextTick } from 'vue';

/** A high-resolution timestamp that remains comparable across browser windows. */
export function instanceAiResponseNow(): number {
	return performance.timeOrigin + performance.now();
}

/**
 * Waits until a response renders and returns the time of the render. A hidden
 * tab paints no frames, so it reads the time after the DOM update.
 */
export async function observeInstanceAiResponseRender(): Promise<{
	atEpochMs: number;
	tabVisible: boolean;
}> {
	await nextTick();
	const tabVisible = document.visibilityState === 'visible';
	if (tabVisible) {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}
	return { atEpochMs: instanceAiResponseNow(), tabVisible };
}
