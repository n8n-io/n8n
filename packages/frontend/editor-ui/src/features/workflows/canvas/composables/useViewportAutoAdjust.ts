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
	// Track whether the last recorded rect came from a hidden tab. When the
	// browser tab is in the background, offsetWidth/offsetHeight can be 0 or a
	// VueFlow fallback (500×500). The first resize after the tab becomes visible
	// is not a real user-initiated resize — applying the delta would shift the
	// viewport that fitView just positioned correctly.
	let lastRectWasHidden = document.hidden;

	watch(
		viewportRef,
		(vp, _, onCleanUp) => {
			if (!vp) {
				return;
			}

			const resizeObserver = new ResizeObserver((entries) => {
				const entry = entries[0];

				if (entry) {
					if (document.hidden) {
						lastRectWasHidden = true;
					}
					canvasRect.value = entry.contentRect;
				}
			});

			lastRectWasHidden = document.hidden;
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

		// Skip the adjustment when the old rect was captured while the tab was
		// hidden — the delta would be meaningless (e.g. 500→769) and would shift
		// the viewport away from where fitView just placed it.
		if (lastRectWasHidden) {
			lastRectWasHidden = false;
			return;
		}

		await setViewport({
			x: viewport.value.x + (newRect.width - oldRect.width) / 2,
			y: viewport.value.y + (newRect.height - oldRect.height) / 2,
			zoom: viewport.value.zoom,
		});
	});
}
