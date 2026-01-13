import type { Rect, SetViewport, ViewportTransform } from '@vue-flow/core';
import { type Ref, ref, watch } from 'vue';

/**
 * When canvas is resized (via window resize or toggling logs panel), adjust viewport to maintain center
 */
export function useViewportAutoAdjust(
	viewportRef: Ref<HTMLElement | null>,
	viewport: Ref<ViewportTransform>,
	setViewport: SetViewport,
) {
	const canvasRect = ref<Rect>();

	watch(
		viewportRef,
		(vp, _, onCleanUp) => {
			if (!vp) {
				return;
			}

			const resizeObserver = new ResizeObserver((entries) => {
				const entry = entries[0];

				if (entry) {
					canvasRect.value = entry.contentRect;
				}
			});

			canvasRect.value = {
				x: vp.offsetLeft,
				y: vp.offsetTop,
				width: vp.offsetWidth,
				height: vp.offsetHeight,
			};
			resizeObserver.observe(vp);
			onCleanUp(() => resizeObserver.disconnect());
		},
		{ immediate: true },
	);

	watch(canvasRect, async (newRect, oldRect) => {
		if (!newRect || !oldRect) {
			return;
		}

		await setViewport({
			x: viewport.value.x + (newRect.width - oldRect.width) / 2,
			y: viewport.value.y + (newRect.height - oldRect.height) / 2,
			zoom: viewport.value.zoom,
		});
	});
}
