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
	if (document.visibilityState === 'visible') {
		// The browser holds frames while the tab is hidden, so a tab that goes
		// hidden before the next frame ends the wait.
		await new Promise<void>((resolve) => {
			const done = () => {
				document.removeEventListener('visibilitychange', done);
				resolve();
			};
			document.addEventListener('visibilitychange', done);
			requestAnimationFrame(done);
		});
	}
	return {
		atEpochMs: instanceAiResponseNow(),
		tabVisible: document.visibilityState === 'visible',
	};
}
