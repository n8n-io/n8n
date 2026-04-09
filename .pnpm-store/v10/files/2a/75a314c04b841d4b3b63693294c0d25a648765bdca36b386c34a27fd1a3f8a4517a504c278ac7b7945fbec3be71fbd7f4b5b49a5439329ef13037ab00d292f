import type { Chart, Point, FontSpec, CanvasFontSpec, PointStyle, RenderTextOpts } from '../types/index.js';
import type { TRBL, SplinePoint, RoundedRect, TRBLCorners } from '../types/geometric.js';
/**
 * Converts the given font object into a CSS font string.
 * @param font - A font object.
 * @return The CSS font string. See https://developer.mozilla.org/en-US/docs/Web/CSS/font
 * @private
 */
export declare function toFontString(font: FontSpec): string;
/**
 * @private
 */
export declare function _measureText(ctx: CanvasRenderingContext2D, data: Record<string, number>, gc: string[], longest: number, string: string): number;
type Thing = string | undefined | null;
type Things = (Thing | Thing[])[];
/**
 * @private
 */
export declare function _longestText(ctx: CanvasRenderingContext2D, font: string, arrayOfThings: Things, cache?: {
    data?: Record<string, number>;
    garbageCollect?: string[];
    font?: string;
}): number;
/**
 * Returns the aligned pixel value to avoid anti-aliasing blur
 * @param chart - The chart instance.
 * @param pixel - A pixel value.
 * @param width - The width of the element.
 * @returns The aligned pixel value.
 * @private
 */
export declare function _alignPixel(chart: Chart, pixel: number, width: number): number;
/**
 * Clears the entire canvas.
 */
export declare function clearCanvas(canvas?: HTMLCanvasElement, ctx?: CanvasRenderingContext2D): void;
export interface DrawPointOptions {
    pointStyle: PointStyle;
    rotation?: number;
    radius: number;
    borderWidth: number;
}
export declare function drawPoint(ctx: CanvasRenderingContext2D, options: DrawPointOptions, x: number, y: number): void;
export declare function drawPointLegend(ctx: CanvasRenderingContext2D, options: DrawPointOptions, x: number, y: number, w: number): void;
/**
 * Returns true if the point is inside the rectangle
 * @param point - The point to test
 * @param area - The rectangle
 * @param margin - allowed margin
 * @private
 */
export declare function _isPointInArea(point: Point, area: TRBL, margin?: number): boolean;
export declare function clipArea(ctx: CanvasRenderingContext2D, area: TRBL): void;
export declare function unclipArea(ctx: CanvasRenderingContext2D): void;
/**
 * @private
 */
export declare function _steppedLineTo(ctx: CanvasRenderingContext2D, previous: Point, target: Point, flip?: boolean, mode?: string): void;
/**
 * @private
 */
export declare function _bezierCurveTo(ctx: CanvasRenderingContext2D, previous: SplinePoint, target: SplinePoint, flip?: boolean): void;
/**
 * Render text onto the canvas
 */
export declare function renderText(ctx: CanvasRenderingContext2D, text: string | string[], x: number, y: number, font: CanvasFontSpec, opts?: RenderTextOpts): void;
/**
 * Add a path of a rectangle with rounded corners to the current sub-path
 * @param ctx - Context
 * @param rect - Bounding rect
 */
export declare function addRoundedRectPath(ctx: CanvasRenderingContext2D, rect: RoundedRect & {
    radius: TRBLCorners;
}): void;
export {};
