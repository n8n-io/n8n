import { ref } from 'vue';
import { useZoomAdjustedValues } from './useZoomAdjustedValues';

describe(useZoomAdjustedValues, () => {
	const createViewport = (zoom: number) => ref({ x: 0, y: 0, zoom });

	describe('calculateZoomAdjustedValue', () => {
		it('should return baseValue when zoom >= 1.0', () => {
			const viewport = createViewport(1.0);
			const { calculateZoomAdjustedValue } = useZoomAdjustedValues(viewport);

			expect(calculateZoomAdjustedValue(1.0, 0.84, 0.6)).toBe(0.84);
			expect(calculateZoomAdjustedValue(1.5, 0.84, 0.6)).toBe(0.84);
			expect(calculateZoomAdjustedValue(2.0, 0.5, 1.0)).toBe(0.5);
		});

		it('should return maxValue when zoom <= minZoom', () => {
			const viewport = createViewport(0.2);
			const { calculateZoomAdjustedValue } = useZoomAdjustedValues(viewport);

			expect(calculateZoomAdjustedValue(0.2, 0.84, 0.6)).toBe(0.6);
			expect(calculateZoomAdjustedValue(0.1, 0.84, 0.6)).toBe(0.6);
			expect(calculateZoomAdjustedValue(0, 0.5, 1.0)).toBe(1.0);
		});

		it('should interpolate values between minZoom and 1.0 with gamma correction', () => {
			const viewport = createViewport(0.5);
			const { calculateZoomAdjustedValue } = useZoomAdjustedValues(viewport);

			// At zoom 0.5, t = (1.0 - 0.5) / (1.0 - 0.2) = 0.625
			// tGamma = 0.625^2.2 ≈ 0.352
			// result = 0.84 + 0.352 * (0.6 - 0.84) = 0.84 - 0.0845 ≈ 0.755
			const result = calculateZoomAdjustedValue(0.5, 0.84, 0.6);
			expect(result).toBeCloseTo(0.755, 2);
		});

		it('should respect custom minZoom parameter', () => {
			const viewport = createViewport(0.5);
			const { calculateZoomAdjustedValue } = useZoomAdjustedValues(viewport);

			// With minZoom = 0.5, zoom at exactly minZoom should return maxValue
			expect(calculateZoomAdjustedValue(0.5, 0.84, 0.6, 0.5)).toBe(0.6);
			// Zoom below minZoom should also return maxValue
			expect(calculateZoomAdjustedValue(0.3, 0.84, 0.6, 0.5)).toBe(0.6);
		});

		it('should respect custom gamma parameter', () => {
			const viewport = createViewport(0.5);
			const { calculateZoomAdjustedValue } = useZoomAdjustedValues(viewport);

			// With gamma = 1.0 (linear), t = 0.625 should give linear interpolation
			// result = 0.84 + 0.625 * (0.6 - 0.84) = 0.84 - 0.15 = 0.69
			const linearResult = calculateZoomAdjustedValue(0.5, 0.84, 0.6, 0.2, 1.0);
			expect(linearResult).toBeCloseTo(0.69, 2);

			// Higher gamma should give smaller adjustment at same zoom
			const highGammaResult = calculateZoomAdjustedValue(0.5, 0.84, 0.6, 0.2, 3.0);
			expect(highGammaResult).toBeGreaterThan(linearResult);
		});

		it('should handle case where maxValue > baseValue', () => {
			const viewport = createViewport(0.5);
			const { calculateZoomAdjustedValue } = useZoomAdjustedValues(viewport);

			// Dark mode lightness increases as zoom decreases
			const result = calculateZoomAdjustedValue(0.5, 0.42, 0.66);
			expect(result).toBeGreaterThan(0.42);
			expect(result).toBeLessThan(0.66);
		});
	});

	describe('calculateEdgeLightness', () => {
		it('should return base lightness values at zoom 1.0', () => {
			const viewport = createViewport(1.0);
			const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

			const lightness = calculateEdgeLightness();
			expect(lightness.value.light).toBe('0.840');
			expect(lightness.value.dark).toBe('0.420');
		});

		it('should return max lightness values at minimum zoom', () => {
			const viewport = createViewport(0.2);
			const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

			const lightness = calculateEdgeLightness();
			expect(lightness.value.light).toBe('0.600');
			expect(lightness.value.dark).toBe('0.660');
		});

		it('should darken light mode and lighten dark mode on hover', () => {
			const viewport = createViewport(1.0);
			const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

			const hovered = ref(false);
			const lightness = calculateEdgeLightness(hovered);

			expect(lightness.value.light).toBe('0.840');
			expect(lightness.value.dark).toBe('0.420');

			hovered.value = true;

			// Light mode: 0.84 - 0.3 = 0.54
			expect(lightness.value.light).toBe('0.540');
			// Dark mode: 0.42 + 0.2 = 0.62
			expect(lightness.value.dark).toBe('0.620');
		});

		it('should clamp hover adjustments to valid range', () => {
			const viewport = createViewport(0.2);
			const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

			const hovered = ref(true);
			const lightness = calculateEdgeLightness(hovered);

			// Light mode: max(0, 0.6 - 0.3) = 0.3
			expect(parseFloat(lightness.value.light)).toBeGreaterThanOrEqual(0);
			// Dark mode: min(1, 0.66 + 0.1) = 0.76
			expect(parseFloat(lightness.value.dark)).toBeLessThanOrEqual(1);
		});

		it('should be reactive to viewport changes', () => {
			const viewport = ref({ x: 0, y: 0, zoom: 1.0 });
			const { calculateEdgeLightness } = useZoomAdjustedValues(viewport);

			const lightness = calculateEdgeLightness();
			expect(lightness.value.light).toBe('0.840');

			viewport.value = { x: 0, y: 0, zoom: 0.2 };
			expect(lightness.value.light).toBe('0.600');
		});
	});

	describe('calculateHandleLightness', () => {
		it('should return base lightness values at zoom 1.0', () => {
			const viewport = createViewport(1.0);
			const { calculateHandleLightness } = useZoomAdjustedValues(viewport);

			const lightness = calculateHandleLightness();
			expect(lightness.value.light).toBe('0.680');
			expect(lightness.value.dark).toBe('0.500');
		});

		it('should return max lightness values at minimum zoom', () => {
			const viewport = createViewport(0.2);
			const { calculateHandleLightness } = useZoomAdjustedValues(viewport);

			const lightness = calculateHandleLightness();
			expect(lightness.value.light).toBe('0.300');
			expect(lightness.value.dark).toBe('0.700');
		});
	});

	describe('calculateNodeBorderOpacity', () => {
		it('should return base opacity values at zoom 1.0', () => {
			const viewport = createViewport(1.0);
			const { calculateNodeBorderOpacity } = useZoomAdjustedValues(viewport);

			const opacity = calculateNodeBorderOpacity();
			expect(opacity.value.light).toBe('0.100');
			expect(opacity.value.dark).toBe('0.200');
		});

		it('should return max opacity values at minimum zoom', () => {
			const viewport = createViewport(0.2);
			const { calculateNodeBorderOpacity } = useZoomAdjustedValues(viewport);

			const opacity = calculateNodeBorderOpacity();
			expect(opacity.value.light).toBe('0.700');
			expect(opacity.value.dark).toBe('0.700');
		});
	});
});
