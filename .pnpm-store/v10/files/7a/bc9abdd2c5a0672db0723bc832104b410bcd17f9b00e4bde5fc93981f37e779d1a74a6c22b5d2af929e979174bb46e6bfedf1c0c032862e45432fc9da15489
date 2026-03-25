/**
 * Compare two equally sized images, pixel by pixel.
 *
 * @param {Uint8Array | Uint8ClampedArray} img1 First image data.
 * @param {Uint8Array | Uint8ClampedArray} img2 Second image data.
 * @param {Uint8Array | Uint8ClampedArray | void} output Image data to write the diff to, if provided.
 * @param {number} width Input images width.
 * @param {number} height Input images height.
 *
 * @param {Object} [options]
 * @param {number} [options.threshold=0.1] Matching threshold (0 to 1); smaller is more sensitive.
 * @param {boolean} [options.includeAA=false] Whether to skip anti-aliasing detection.
 * @param {number} [options.alpha=0.1] Opacity of original image in diff output.
 * @param {[number, number, number]} [options.aaColor=[255, 255, 0]] Color of anti-aliased pixels in diff output.
 * @param {[number, number, number]} [options.diffColor=[255, 0, 0]] Color of different pixels in diff output.
 * @param {[number, number, number]} [options.diffColorAlt=options.diffColor] Whether to detect dark on light differences between img1 and img2 and set an alternative color to differentiate between the two.
 * @param {boolean} [options.diffMask=false] Draw the diff over a transparent background (a mask).
 *
 * @return {number} The number of mismatched pixels.
 */
export default function pixelmatch(img1: Uint8Array | Uint8ClampedArray, img2: Uint8Array | Uint8ClampedArray, output: Uint8Array | Uint8ClampedArray | void, width: number, height: number, options?: {
    threshold?: number | undefined;
    includeAA?: boolean | undefined;
    alpha?: number | undefined;
    aaColor?: [number, number, number] | undefined;
    diffColor?: [number, number, number] | undefined;
    diffColorAlt?: [number, number, number] | undefined;
    diffMask?: boolean | undefined;
}): number;
