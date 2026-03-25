export type PageViewportParameters = {
    /**
     * - The xMin, yMin, xMax and
     * yMax coordinates.
     */
    viewBox: Array<number>;
    /**
     * - The size of units.
     */
    userUnit: number;
    /**
     * - The scale of the viewport.
     */
    scale: number;
    /**
     * - The rotation, in degrees, of the viewport.
     */
    rotation: number;
    /**
     * - The horizontal, i.e. x-axis, offset. The
     * default value is `0`.
     */
    offsetX?: number | undefined;
    /**
     * - The vertical, i.e. y-axis, offset. The
     * default value is `0`.
     */
    offsetY?: number | undefined;
    /**
     * - If true, the y-axis will not be flipped.
     * The default value is `false`.
     */
    dontFlip?: boolean | undefined;
};
export type PageViewportCloneParameters = {
    /**
     * - The scale, overriding the one in the cloned
     * viewport. The default value is `this.scale`.
     */
    scale?: number | undefined;
    /**
     * - The rotation, in degrees, overriding the one
     * in the cloned viewport. The default value is `this.rotation`.
     */
    rotation?: number | undefined;
    /**
     * - The horizontal, i.e. x-axis, offset.
     * The default value is `this.offsetX`.
     */
    offsetX?: number | undefined;
    /**
     * - The vertical, i.e. y-axis, offset.
     * The default value is `this.offsetY`.
     */
    offsetY?: number | undefined;
    /**
     * - If true, the x-axis will not be flipped.
     * The default value is `false`.
     */
    dontFlip?: boolean | undefined;
};
export function deprecated(details: any): void;
export function fetchData(url: any, type?: string): Promise<any>;
export function getColorValues(colors: any): void;
export function getCurrentTransform(ctx: any): any[];
export function getCurrentTransformInverse(ctx: any): any[];
/**
 * Gets the filename from a given URL.
 * @param {string} url
 * @returns {string}
 */
export function getFilenameFromUrl(url: string): string;
/**
 * Returns the filename or guessed filename from the url (see issue 3455).
 * @param {string} url - The original PDF location.
 * @param {string} defaultFilename - The value returned if the filename is
 *   unknown, or the protocol is unsupported.
 * @returns {string} Guessed PDF filename.
 */
export function getPdfFilenameFromUrl(url: string, defaultFilename?: string): string;
export function getRGB(color: any): any;
/**
 * NOTE: This is (mostly) intended to support printing of XFA forms.
 */
export function getXfaPageViewport(xfaPage: any, { scale, rotation }: {
    scale?: number | undefined;
    rotation?: number | undefined;
}): PageViewport;
export function isDataScheme(url: any): boolean;
export function isPdfFile(filename: any): boolean;
export function isValidFetchUrl(url: any, baseUrl: any): boolean;
/**
 * Event handler to suppress context menu.
 */
export function noContextMenu(e: any): void;
/**
 * Scale factors for the canvas, necessary with HiDPI displays.
 */
export class OutputScale {
    static get pixelRatio(): number;
    static capPixels(maxPixels: any, capAreaFactor: any): any;
    /**
     * @type {number} Horizontal scale.
     */
    sx: number;
    /**
     * @type {number} Vertical scale.
     */
    sy: number;
    /**
     * @type {boolean} Returns `true` when scaling is required, `false` otherwise.
     */
    get scaled(): boolean;
    /**
     * @type {boolean} Returns `true` when scaling is symmetric,
     *   `false` otherwise.
     */
    get symmetric(): boolean;
    /**
     * @returns {boolean} Returns `true` if scaling was limited,
     *   `false` otherwise.
     */
    limitCanvas(width: any, height: any, maxPixels: any, maxDim: any, capAreaFactor?: number): boolean;
}
/**
 * @typedef {Object} PageViewportParameters
 * @property {Array<number>} viewBox - The xMin, yMin, xMax and
 *   yMax coordinates.
 * @property {number} userUnit - The size of units.
 * @property {number} scale - The scale of the viewport.
 * @property {number} rotation - The rotation, in degrees, of the viewport.
 * @property {number} [offsetX] - The horizontal, i.e. x-axis, offset. The
 *   default value is `0`.
 * @property {number} [offsetY] - The vertical, i.e. y-axis, offset. The
 *   default value is `0`.
 * @property {boolean} [dontFlip] - If true, the y-axis will not be flipped.
 *   The default value is `false`.
 */
/**
 * @typedef {Object} PageViewportCloneParameters
 * @property {number} [scale] - The scale, overriding the one in the cloned
 *   viewport. The default value is `this.scale`.
 * @property {number} [rotation] - The rotation, in degrees, overriding the one
 *   in the cloned viewport. The default value is `this.rotation`.
 * @property {number} [offsetX] - The horizontal, i.e. x-axis, offset.
 *   The default value is `this.offsetX`.
 * @property {number} [offsetY] - The vertical, i.e. y-axis, offset.
 *   The default value is `this.offsetY`.
 * @property {boolean} [dontFlip] - If true, the x-axis will not be flipped.
 *   The default value is `false`.
 */
/**
 * PDF page viewport created based on scale, rotation and offset.
 */
export class PageViewport {
    /**
     * @param {PageViewportParameters}
     */
    constructor({ viewBox, userUnit, scale, rotation, offsetX, offsetY, dontFlip, }: PageViewportParameters);
    viewBox: number[];
    userUnit: number;
    scale: number;
    rotation: number;
    offsetX: number;
    offsetY: number;
    transform: number[];
    width: number;
    height: number;
    /**
     * The original, un-scaled, viewport dimensions.
     * @type {Object}
     */
    get rawDims(): Object;
    /**
     * Clones viewport, with optional additional properties.
     * @param {PageViewportCloneParameters} [params]
     * @returns {PageViewport} Cloned viewport.
     */
    clone({ scale, rotation, offsetX, offsetY, dontFlip, }?: PageViewportCloneParameters): PageViewport;
    /**
     * Converts PDF point to the viewport coordinates. For examples, useful for
     * converting PDF location into canvas pixel coordinates.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {Array} Array containing `x`- and `y`-coordinates of the
     *   point in the viewport coordinate space.
     * @see {@link convertToPdfPoint}
     * @see {@link convertToViewportRectangle}
     */
    convertToViewportPoint(x: number, y: number): any[];
    /**
     * Converts PDF rectangle to the viewport coordinates.
     * @param {Array} rect - The xMin, yMin, xMax and yMax coordinates.
     * @returns {Array} Array containing corresponding coordinates of the
     *   rectangle in the viewport coordinate space.
     * @see {@link convertToViewportPoint}
     */
    convertToViewportRectangle(rect: any[]): any[];
    /**
     * Converts viewport coordinates to the PDF location. For examples, useful
     * for converting canvas pixel location into PDF one.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {Array} Array containing `x`- and `y`-coordinates of the
     *   point in the PDF coordinate space.
     * @see {@link convertToViewportPoint}
     */
    convertToPdfPoint(x: number, y: number): any[];
}
export class PDFDateString {
    static "__#2@#regex": any;
    /**
     * Convert a PDF date string to a JavaScript `Date` object.
     *
     * The PDF date string format is described in section 7.9.4 of the official
     * PDF 32000-1:2008 specification. However, in the PDF 1.7 reference (sixth
     * edition) Adobe describes the same format including a trailing apostrophe.
     * This syntax in incorrect, but Adobe Acrobat creates PDF files that contain
     * them. We ignore all apostrophes as they are not necessary for date parsing.
     *
     * Moreover, Adobe Acrobat doesn't handle changing the date to universal time
     * and doesn't use the user's time zone (effectively ignoring the HH' and mm'
     * parts of the date string).
     *
     * @param {string} input
     * @returns {Date|null}
     */
    static toDateObject(input: string): Date | null;
}
export class PixelsPerInch {
    static CSS: number;
    static PDF: number;
    static PDF_TO_CSS_UNITS: number;
}
declare const RenderingCancelledException_base: any;
export class RenderingCancelledException extends RenderingCancelledException_base {
    [x: string]: any;
    constructor(msg: any, extraDelay?: number);
    extraDelay: number;
}
/**
 * @param {HTMLDivElement} div
 * @param {PageViewport} viewport
 * @param {boolean} mustFlip
 * @param {boolean} mustRotate
 */
export function setLayerDimensions(div: HTMLDivElement, viewport: PageViewport, mustFlip?: boolean, mustRotate?: boolean): void;
export class StatTimer {
    started: any;
    times: any[];
    time(name: any): void;
    timeEnd(name: any): void;
    toString(): string;
}
export function stopEvent(e: any): void;
export const SupportedImageMimeTypes: string[];
export const SVG_NS: "http://www.w3.org/2000/svg";
export {};
