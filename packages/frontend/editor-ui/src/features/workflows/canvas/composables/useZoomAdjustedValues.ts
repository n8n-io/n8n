import { computed, ref, type Ref } from 'vue';
import type { ViewportTransform } from '@vue-flow/core';

/**
 * Composable for calculating zoom-adjusted visual values (lightness, opacity, etc.)
 * Uses gamma correction for perceptually smooth transitions
 */
export function useZoomAdjustedValues(viewport: Ref<ViewportTransform>) {
	/**
	 * Core calculation function with gamma correction
	 * @param zoom - Current zoom level
	 * @param baseValue - Value at 100% zoom
	 * @param maxValue - Value at minimum zoom
	 * @param minZoom - Minimum zoom threshold (default: 0.2)
	 * @param gamma - Gamma correction for perceptual smoothness (default: 2.2)
	 */
	function calculateZoomAdjustedValue(
		zoom: number,
		baseValue: number,
		maxValue: number,
		minZoom = 0.2,
		gamma = 2.2,
	): number {
		if (zoom >= 1.0) {
			return baseValue;
		} else if (zoom <= minZoom) {
			return maxValue;
		} else {
			const t = (1.0 - zoom) / (1.0 - minZoom);
			const tGamma = Math.pow(t, gamma);
			return baseValue + tGamma * (maxValue - baseValue);
		}
	}

	/**
	 * Calculate edge lightness values for light and dark modes
	 * @param hovered - Whether the edge is hovered (optional, defaults to false)
	 */
	function calculateEdgeLightness(hovered: Ref<boolean> = ref(false)) {
		return computed(() => {
			const zoom = viewport.value.zoom;
			let lightnessLight = calculateZoomAdjustedValue(zoom, 0.84, 0.6);
			let lightnessDark = calculateZoomAdjustedValue(zoom, 0.42, 0.66);

			if (hovered.value) {
				lightnessLight = Math.max(0, lightnessLight - 0.3); // Darken by 30%
				lightnessDark = Math.min(1, lightnessDark + 0.2); // Lighten by 20%
			}

			return {
				light: lightnessLight.toFixed(3),
				dark: lightnessDark.toFixed(3),
			};
		});
	}

	/**
	 * Calculate handle border lightness values for light and dark modes
	 */
	function calculateHandleLightness() {
		return computed(() => {
			const zoom = viewport.value.zoom;
			const lightnessLight = calculateZoomAdjustedValue(zoom, 0.68, 0.3);
			const lightnessDark = calculateZoomAdjustedValue(zoom, 0.5, 0.7);

			return {
				light: lightnessLight.toFixed(3),
				dark: lightnessDark.toFixed(3),
			};
		});
	}

	/**
	 * Calculate node border opacity values for light and dark modes
	 */
	function calculateNodeBorderOpacity() {
		return computed(() => {
			const zoom = viewport.value.zoom;
			const opacityLight = calculateZoomAdjustedValue(zoom, 0.1, 0.7);
			const opacityDark = calculateZoomAdjustedValue(zoom, 0.2, 0.7);

			return {
				light: opacityLight.toFixed(3),
				dark: opacityDark.toFixed(3),
			};
		});
	}

	return {
		calculateZoomAdjustedValue,
		calculateEdgeLightness,
		calculateHandleLightness,
		calculateNodeBorderOpacity,
	};
}
