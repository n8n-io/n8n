interface Image {
    data: Buffer | Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
}
interface CoreOptions {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    aaColor?: [number, number, number];
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
    diffMask?: boolean;
    fastBufferCheck?: boolean;
}
/**
 * Compare two images pixel-by-pixel and return the number of different pixels.
 *
 * Uses YIQ color space for perceptually accurate color comparison and includes
 * anti-aliasing detection. Implements block-based optimization for 20% better
 * performance than traditional pixel-by-pixel comparison.
 *
 * @param image1 - First image data (RGBA format, 4 bytes per pixel)
 * @param image2 - Second image data (RGBA format, 4 bytes per pixel)
 * @param output - Optional output buffer for diff visualization. If provided, will be filled with:
 *                 - Grayscale for unchanged pixels (with alpha blending)
 *                 - aaColor for anti-aliased pixels (if includeAA is false)
 *                 - diffColor/diffColorAlt for different pixels
 *                 - Transparent for unchanged pixels (if diffMask is true)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Comparison options
 * @param options.threshold - Color difference threshold (0-1). Lower values = more sensitive.
 *                           Default: 0.1. Recommended: 0.05 for strict, 0.2+ for loose.
 * @param options.alpha - Background opacity for unchanged pixels in output (0-1). Default: 0.1
 * @param options.aaColor - RGB color for anti-aliased pixels. Default: [255, 255, 0] (yellow)
 * @param options.diffColor - RGB color for different pixels. Default: [255, 0, 0] (red)
 * @param options.diffColorAlt - Optional RGB color for dark differences. Helps distinguish
 *                               lightening vs darkening changes.
 * @param options.includeAA - Whether to count anti-aliased pixels as differences. Default: false
 * @param options.diffMask - If true, output only shows differences (transparent background).
 *                          Useful for overlay masks. Default: false
 * @param options.fastBufferCheck - Use Buffer.compare() for fast identical-buffer detection.
 *                                  Set to false if images are processed differently but look similar.
 *                                  Default: true
 * @returns The number of different pixels (excluding anti-aliased pixels unless includeAA is true)
 *
 * @throws {Error} If image data is not Uint8Array, Uint8ClampedArray, or Buffer
 * @throws {Error} If image sizes don't match
 * @throws {Error} If image data size doesn't match width × height × 4
 *
 * @example
 * ```typescript
 * import { diff } from '@blazediff/core';
 *
 * // Basic comparison
 * const diffCount = diff(image1, image2, undefined, 800, 600);
 *
 * // With visualization output
 * const output = new Uint8ClampedArray(800 * 600 * 4);
 * const diffCount = diff(image1, image2, output, 800, 600, {
 *   threshold: 0.1,
 *   diffColor: [255, 0, 0],
 *   aaColor: [255, 255, 0]
 * });
 *
 * // Strict comparison with diff mask
 * const diffCount = diff(image1, image2, output, 800, 600, {
 *   threshold: 0.05,
 *   diffMask: true,
 *   includeAA: true
 * });
 * ```
 *
 * @see {@link https://blazediff.dev | Documentation}
 * @see {@link ./FORMULA.md | Algorithm and Mathematical Foundation}
 */
declare function diff(image1: Image["data"], image2: Image["data"], output: Image["data"] | undefined, width: number, height: number, { threshold, alpha, aaColor, diffColor, includeAA, diffColorAlt, diffMask, fastBufferCheck, }?: CoreOptions): number;
/** Check if array is valid pixel data */
declare function isValidImage(arr: unknown): arr is Image["data"];
declare function calculateOptimalBlockSize(width: number, height: number): number;
/**
 * Calculate color difference according to the paper "Measuring perceived color difference
 * using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos
 *
 * https://doaj.org/article/b2e3b5088ba943eebd9af2927fef08ad
 */
declare function colorDelta(image1: Image["data"], image2: Image["data"], k: number, m: number): number;
/**
 * Calculate brightness difference according to the paper "Measuring perceived color difference
 * using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos
 *
 * https://doaj.org/article/b2e3b5088ba943eebd9af2927fef08ad
 */
declare function brightnessDelta(image1: Image["data"], image2: Image["data"], k: number, m: number): number;
/**
 * Check if a pixel is likely a part of anti-aliasing;
 * based on "Anti-aliased Pixel and Intensity Slope Detector" paper by V. Vysniauskas, 2009
 */
declare function antialiased(image: Image["data"], x1: number, y1: number, width: number, height: number, a32: Uint32Array, b32: Uint32Array): boolean;
/**
 * Draw a grayscale pixel to the output buffer
 */
declare function drawGrayPixel(image: Image["data"], index: number, alpha: number, output: Image["data"]): void;
/**
 * Draw a colored pixel to the output buffer
 */
declare function drawPixel(output: Image["data"], position: number, r: number, g: number, b: number): void;

export { type CoreOptions, type Image, antialiased, brightnessDelta, calculateOptimalBlockSize, colorDelta, diff as default, diff, drawGrayPixel, drawPixel, isValidImage };
