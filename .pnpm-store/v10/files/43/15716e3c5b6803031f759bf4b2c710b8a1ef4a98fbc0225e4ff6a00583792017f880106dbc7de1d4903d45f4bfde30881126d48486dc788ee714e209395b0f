export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
export type RefProxy = {
    num: number;
    gen: number;
};
/**
 * Document initialization / loading parameters object.
 */
export type DocumentInitParameters = {
    /**
     * - The URL of the PDF.
     */
    url?: string | URL | undefined;
    /**
     * -
     * Binary PDF data.
     * Use TypedArrays (Uint8Array) to improve the memory usage. If PDF data is
     * BASE64-encoded, use `atob()` to convert it to a binary string first.
     *
     * NOTE: If TypedArrays are used they will generally be transferred to the
     * worker-thread. This will help reduce main-thread memory usage, however
     * it will take ownership of the TypedArrays.
     */
    data?: string | number[] | ArrayBuffer | TypedArray | undefined;
    /**
     * - Basic authentication headers.
     */
    httpHeaders?: Object | undefined;
    /**
     * - Indicates whether or not
     * cross-site Access-Control requests should be made using credentials such
     * as cookies or authorization headers. The default is `false`.
     */
    withCredentials?: boolean | undefined;
    /**
     * - For decrypting password-protected PDFs.
     */
    password?: string | undefined;
    /**
     * - The PDF file length. It's used for progress
     * reports and range requests operations.
     */
    length?: number | undefined;
    /**
     * - Allows for using a custom range
     * transport implementation.
     */
    range?: PDFDataRangeTransport | undefined;
    /**
     * - Specify maximum number of bytes fetched
     * per range request. The default value is 65536 (= 2^16).
     */
    rangeChunkSize?: number | undefined;
    /**
     * - The worker that will be used for loading and
     * parsing the PDF data.
     */
    worker?: PDFWorker | undefined;
    /**
     * - Controls the logging level; the constants
     * from {@link VerbosityLevel} should be used.
     */
    verbosity?: number | undefined;
    /**
     * - The base URL of the document, used when
     * attempting to recover valid absolute URLs for annotations, and outline
     * items, that (incorrectly) only specify relative URLs.
     */
    docBaseUrl?: string | undefined;
    /**
     * - The URL where the predefined Adobe CMaps are
     * located. Include the trailing slash.
     */
    cMapUrl?: string | undefined;
    /**
     * - Specifies if the Adobe CMaps are binary
     * packed or not. The default value is `true`.
     */
    cMapPacked?: boolean | undefined;
    /**
     * - The factory that will be used when
     * reading built-in CMap files.
     * The default value is {DOMCMapReaderFactory}.
     */
    CMapReaderFactory?: Object | undefined;
    /**
     * - The URL where the predefined ICC profiles are
     * located. Include the trailing slash.
     */
    iccUrl?: string | undefined;
    /**
     * - When `true`, fonts that aren't
     * embedded in the PDF document will fallback to a system font.
     * The default value is `true` in web environments and `false` in Node.js;
     * unless `disableFontFace === true` in which case this defaults to `false`
     * regardless of the environment (to prevent completely broken fonts).
     */
    useSystemFonts?: boolean | undefined;
    /**
     * - The URL where the standard font
     * files are located. Include the trailing slash.
     */
    standardFontDataUrl?: string | undefined;
    /**
     * - The factory that will be used
     * when reading the standard font files.
     * The default value is {DOMStandardFontDataFactory}.
     */
    StandardFontDataFactory?: Object | undefined;
    /**
     * - The URL where the wasm files are located.
     * Include the trailing slash.
     */
    wasmUrl?: string | undefined;
    /**
     * - The factory that will be used
     * when reading the wasm files.
     * The default value is {DOMWasmFactory}.
     */
    WasmFactory?: Object | undefined;
    /**
     * - Enable using the Fetch API in the
     * worker-thread when reading CMap and standard font files. When `true`,
     * the `CMapReaderFactory`, `StandardFontDataFactory`, and `WasmFactory`
     * options are ignored.
     * The default value is `true` in web environments and `false` in Node.js.
     */
    useWorkerFetch?: boolean | undefined;
    /**
     * - Attempt to use WebAssembly in order to
     * improve e.g. image decoding performance.
     * The default value is `true`.
     */
    useWasm?: boolean | undefined;
    /**
     * - Reject certain promises, e.g.
     * `getOperatorList`, `getTextContent`, and `RenderTask`, when the associated
     * PDF data cannot be successfully parsed, instead of attempting to recover
     * whatever possible of the data. The default value is `false`.
     */
    stopAtErrors?: boolean | undefined;
    /**
     * - The maximum allowed image size in total
     * pixels, i.e. width * height. Images above this value will not be rendered.
     * Use -1 for no limit, which is also the default value.
     */
    maxImageSize?: number | undefined;
    /**
     * - Determines if we can evaluate strings
     * as JavaScript. Primarily used to improve performance of PDF functions.
     * The default value is `true`.
     */
    isEvalSupported?: boolean | undefined;
    /**
     * - Determines if we can use
     * `OffscreenCanvas` in the worker. Primarily used to improve performance of
     * image conversion/rendering.
     * The default value is `true` in web environments and `false` in Node.js.
     */
    isOffscreenCanvasSupported?: boolean | undefined;
    /**
     * - Determines if we can use
     * `ImageDecoder` in the worker. Primarily used to improve performance of
     * image conversion/rendering.
     * The default value is `true` in web environments and `false` in Node.js.
     *
     * NOTE: Also temporarily disabled in Chromium browsers, until we no longer
     * support the affected browser versions, because of various bugs:
     *
     * - Crashes when using the BMP decoder with huge images, e.g. issue6741.pdf;
     * see https://issues.chromium.org/issues/374807001
     *
     * - Broken images when using the JPEG decoder with images that have custom
     * colour profiles, e.g. GitHub discussion 19030;
     * see https://issues.chromium.org/issues/378869810
     */
    isImageDecoderSupported?: boolean | undefined;
    /**
     * - The integer value is used to
     * know when an image must be resized (uses `OffscreenCanvas` in the worker).
     * If it's -1 then a possibly slow algorithm is used to guess the max value.
     */
    canvasMaxAreaInBytes?: number | undefined;
    /**
     * - By default fonts are converted to
     * OpenType fonts and loaded via the Font Loading API or `@font-face` rules.
     * If disabled, fonts will be rendered using a built-in font renderer that
     * constructs the glyphs with primitive path commands.
     * The default value is `false` in web environments and `true` in Node.js.
     */
    disableFontFace?: boolean | undefined;
    /**
     * - Include additional properties,
     * which are unused during rendering of PDF documents, when exporting the
     * parsed font data from the worker-thread. This may be useful for debugging
     * purposes (and backwards compatibility), but note that it will lead to
     * increased memory usage. The default value is `false`.
     */
    fontExtraProperties?: boolean | undefined;
    /**
     * - Render Xfa forms if any.
     * The default value is `false`.
     */
    enableXfa?: boolean | undefined;
    /**
     * - Specify an explicit document
     * context to create elements with and to load resources, such as fonts,
     * into. Defaults to the current document.
     */
    ownerDocument?: HTMLDocument | undefined;
    /**
     * - Disable range request loading of PDF
     * files. When enabled, and if the server supports partial content requests,
     * then the PDF will be fetched in chunks. The default value is `false`.
     */
    disableRange?: boolean | undefined;
    /**
     * - Disable streaming of PDF file data.
     * By default PDF.js attempts to load PDF files in chunks. The default value
     * is `false`.
     */
    disableStream?: boolean | undefined;
    /**
     * - Disable pre-fetching of PDF file
     * data. When range requests are enabled PDF.js will automatically keep
     * fetching more data even if it isn't needed to display the current page.
     * The default value is `false`.
     *
     * NOTE: It is also necessary to disable streaming, see above, in order for
     * disabling of pre-fetching to work correctly.
     */
    disableAutoFetch?: boolean | undefined;
    /**
     * - Enables special hooks for debugging PDF.js
     * (see `web/debugger.js`). The default value is `false`.
     */
    pdfBug?: boolean | undefined;
    /**
     * - The factory that will be used when
     * creating canvases. The default value is {DOMCanvasFactory}.
     */
    CanvasFactory?: Object | undefined;
    /**
     * - The factory that will be used to
     * create SVG filters when rendering some images on the main canvas.
     * The default value is {DOMFilterFactory}.
     */
    FilterFactory?: Object | undefined;
    /**
     * - Enables hardware acceleration for
     * rendering. The default value is `false`.
     */
    enableHWA?: boolean | undefined;
};
export type OnProgressParameters = {
    /**
     * - Currently loaded number of bytes.
     */
    loaded: number;
    /**
     * - Total number of bytes in the PDF file.
     */
    total: number;
};
/**
 * Page getViewport parameters.
 */
export type GetViewportParameters = {
    /**
     * - The desired scale of the viewport.
     */
    scale: number;
    /**
     * - The desired rotation, in degrees, of
     * the viewport. If omitted it defaults to the page rotation.
     */
    rotation?: number | undefined;
    /**
     * - The horizontal, i.e. x-axis, offset.
     * The default value is `0`.
     */
    offsetX?: number | undefined;
    /**
     * - The vertical, i.e. y-axis, offset.
     * The default value is `0`.
     */
    offsetY?: number | undefined;
    /**
     * - If true, the y-axis will not be
     * flipped. The default value is `false`.
     */
    dontFlip?: boolean | undefined;
};
/**
 * Page getTextContent parameters.
 */
export type getTextContentParameters = {
    /**
     * - When true include marked
     * content items in the items array of TextContent. The default is `false`.
     */
    includeMarkedContent?: boolean | undefined;
    /**
     * - When true the text is *not*
     * normalized in the worker-thread. The default is `false`.
     */
    disableNormalization?: boolean | undefined;
};
/**
 * Page text content.
 */
export type TextContent = {
    /**
     * - Array of
     * {@link TextItem} and {@link TextMarkedContent} objects. TextMarkedContent
     * items are included when includeMarkedContent is true.
     */
    items: Array<TextItem | TextMarkedContent>;
    /**
     * - {@link TextStyle} objects,
     * indexed by font name.
     */
    styles: {
        [x: string]: TextStyle;
    };
    /**
     * - The document /Lang attribute.
     */
    lang: string | null;
};
/**
 * Page text content part.
 */
export type TextItem = {
    /**
     * - Text content.
     */
    str: string;
    /**
     * - Text direction: 'ttb', 'ltr' or 'rtl'.
     */
    dir: string;
    /**
     * - Transformation matrix.
     */
    transform: Array<any>;
    /**
     * - Width in device space.
     */
    width: number;
    /**
     * - Height in device space.
     */
    height: number;
    /**
     * - Font name used by PDF.js for converted font.
     */
    fontName: string;
    /**
     * - Indicating if the text content is followed by a
     * line-break.
     */
    hasEOL: boolean;
};
/**
 * Page text marked content part.
 */
export type TextMarkedContent = {
    /**
     * - Either 'beginMarkedContent',
     * 'beginMarkedContentProps', or 'endMarkedContent'.
     */
    type: string;
    /**
     * - The marked content identifier. Only used for type
     * 'beginMarkedContentProps'.
     */
    id: string;
};
/**
 * Text style.
 */
export type TextStyle = {
    /**
     * - Font ascent.
     */
    ascent: number;
    /**
     * - Font descent.
     */
    descent: number;
    /**
     * - Whether or not the text is in vertical mode.
     */
    vertical: boolean;
    /**
     * - The possible font family.
     */
    fontFamily: string;
};
/**
 * Page annotation parameters.
 */
export type GetAnnotationsParameters = {
    /**
     * - Determines the annotations that are fetched,
     * can be 'display' (viewable annotations), 'print' (printable annotations),
     * or 'any' (all annotations). The default value is 'display'.
     */
    intent?: string | undefined;
};
/**
 * Page render parameters.
 */
export type RenderParameters = {
    /**
     * - A 2D context of a DOM
     * Canvas object.
     */
    canvasContext: CanvasRenderingContext2D;
    /**
     * - Rendering viewport obtained by calling
     * the `PDFPageProxy.getViewport` method.
     */
    viewport: PageViewport;
    /**
     * - Rendering intent, can be 'display', 'print',
     * or 'any'. The default value is 'display'.
     */
    intent?: string | undefined;
    /**
     * Controls which annotations are rendered
     * onto the canvas, for annotations with appearance-data; the values from
     * {@link AnnotationMode} should be used. The following values are supported:
     * - `AnnotationMode.DISABLE`, which disables all annotations.
     * - `AnnotationMode.ENABLE`, which includes all possible annotations (thus
     * it also depends on the `intent`-option, see above).
     * - `AnnotationMode.ENABLE_FORMS`, which excludes annotations that contain
     * interactive form elements (those will be rendered in the display layer).
     * - `AnnotationMode.ENABLE_STORAGE`, which includes all possible annotations
     * (as above) but where interactive form elements are updated with data
     * from the {@link AnnotationStorage}-instance; useful e.g. for printing.
     * The default value is `AnnotationMode.ENABLE`.
     */
    annotationMode?: number | undefined;
    /**
     * - Additional transform, applied just
     * before viewport transform.
     */
    transform?: any[] | undefined;
    /**
     * - Background
     * to use for the canvas.
     * Any valid `canvas.fillStyle` can be used: a `DOMString` parsed as CSS
     * <color> value, a `CanvasGradient` object (a linear or radial gradient) or
     * a `CanvasPattern` object (a repetitive image). The default value is
     * 'rgb(255,255,255)'.
     *
     * NOTE: This option may be partially, or completely, ignored when the
     * `pageColors`-option is used.
     */
    background?: string | CanvasGradient | CanvasPattern | undefined;
    /**
     * - Overwrites background and foreground colors
     * with user defined ones in order to improve readability in high contrast
     * mode.
     */
    pageColors?: Object | undefined;
    /**
     * -
     * A promise that should resolve with an {@link OptionalContentConfig}created from `PDFDocumentProxy.getOptionalContentConfig`. If `null`,
     * the configuration will be fetched automatically with the default visibility
     * states set.
     */
    optionalContentConfigPromise?: Promise<OptionalContentConfig> | undefined;
    /**
     * - Map some
     * annotation ids with canvases used to render them.
     */
    annotationCanvasMap?: Map<string, HTMLCanvasElement> | undefined;
    printAnnotationStorage?: PrintAnnotationStorage | undefined;
    /**
     * - Render the page in editing mode.
     */
    isEditing?: boolean | undefined;
};
/**
 * Page getOperatorList parameters.
 */
export type GetOperatorListParameters = {
    /**
     * - Rendering intent, can be 'display', 'print',
     * or 'any'. The default value is 'display'.
     */
    intent?: string | undefined;
    /**
     * Controls which annotations are included
     * in the operatorList, for annotations with appearance-data; the values from
     * {@link AnnotationMode} should be used. The following values are supported:
     * - `AnnotationMode.DISABLE`, which disables all annotations.
     * - `AnnotationMode.ENABLE`, which includes all possible annotations (thus
     * it also depends on the `intent`-option, see above).
     * - `AnnotationMode.ENABLE_FORMS`, which excludes annotations that contain
     * interactive form elements (those will be rendered in the display layer).
     * - `AnnotationMode.ENABLE_STORAGE`, which includes all possible annotations
     * (as above) but where interactive form elements are updated with data
     * from the {@link AnnotationStorage}-instance; useful e.g. for printing.
     * The default value is `AnnotationMode.ENABLE`.
     */
    annotationMode?: number | undefined;
    printAnnotationStorage?: PrintAnnotationStorage | undefined;
    /**
     * - Render the page in editing mode.
     */
    isEditing?: boolean | undefined;
};
/**
 * Structure tree node. The root node will have a role "Root".
 */
export type StructTreeNode = {
    /**
     * - Array of
     * {@link StructTreeNode} and {@link StructTreeContent} objects.
     */
    children: Array<StructTreeNode | StructTreeContent>;
    /**
     * - element's role, already mapped if a role map exists
     * in the PDF.
     */
    role: string;
};
/**
 * Structure tree content.
 */
export type StructTreeContent = {
    /**
     * - either "content" for page and stream structure
     * elements or "object" for object references.
     */
    type: string;
    /**
     * - unique id that will map to the text layer.
     */
    id: string;
};
/**
 * PDF page operator list.
 */
export type PDFOperatorList = {
    /**
     * - Array containing the operator functions.
     */
    fnArray: Array<number>;
    /**
     * - Array containing the arguments of the
     * functions.
     */
    argsArray: Array<any>;
};
export type PDFWorkerParameters = {
    /**
     * - The name of the worker.
     */
    name?: string | undefined;
    /**
     * - The `workerPort` object.
     */
    port?: Worker | undefined;
    /**
     * - Controls the logging level;
     * the constants from {@link VerbosityLevel} should be used.
     */
    verbosity?: number | undefined;
};
/** @type {string} */
export const build: string;
/**
 * @typedef { Int8Array | Uint8Array | Uint8ClampedArray |
 *            Int16Array | Uint16Array |
 *            Int32Array | Uint32Array | Float32Array |
 *            Float64Array
 * } TypedArray
 */
/**
 * @typedef {Object} RefProxy
 * @property {number} num
 * @property {number} gen
 */
/**
 * Document initialization / loading parameters object.
 *
 * @typedef {Object} DocumentInitParameters
 * @property {string | URL} [url] - The URL of the PDF.
 * @property {TypedArray | ArrayBuffer | Array<number> | string} [data] -
 *   Binary PDF data.
 *   Use TypedArrays (Uint8Array) to improve the memory usage. If PDF data is
 *   BASE64-encoded, use `atob()` to convert it to a binary string first.
 *
 *   NOTE: If TypedArrays are used they will generally be transferred to the
 *   worker-thread. This will help reduce main-thread memory usage, however
 *   it will take ownership of the TypedArrays.
 * @property {Object} [httpHeaders] - Basic authentication headers.
 * @property {boolean} [withCredentials] - Indicates whether or not
 *   cross-site Access-Control requests should be made using credentials such
 *   as cookies or authorization headers. The default is `false`.
 * @property {string} [password] - For decrypting password-protected PDFs.
 * @property {number} [length] - The PDF file length. It's used for progress
 *   reports and range requests operations.
 * @property {PDFDataRangeTransport} [range] - Allows for using a custom range
 *   transport implementation.
 * @property {number} [rangeChunkSize] - Specify maximum number of bytes fetched
 *   per range request. The default value is 65536 (= 2^16).
 * @property {PDFWorker} [worker] - The worker that will be used for loading and
 *   parsing the PDF data.
 * @property {number} [verbosity] - Controls the logging level; the constants
 *   from {@link VerbosityLevel} should be used.
 * @property {string} [docBaseUrl] - The base URL of the document, used when
 *   attempting to recover valid absolute URLs for annotations, and outline
 *   items, that (incorrectly) only specify relative URLs.
 * @property {string} [cMapUrl] - The URL where the predefined Adobe CMaps are
 *   located. Include the trailing slash.
 * @property {boolean} [cMapPacked] - Specifies if the Adobe CMaps are binary
 *   packed or not. The default value is `true`.
 * @property {Object} [CMapReaderFactory] - The factory that will be used when
 *   reading built-in CMap files.
 *   The default value is {DOMCMapReaderFactory}.
 * @property {string} [iccUrl] - The URL where the predefined ICC profiles are
 *   located. Include the trailing slash.
 * @property {boolean} [useSystemFonts] - When `true`, fonts that aren't
 *   embedded in the PDF document will fallback to a system font.
 *   The default value is `true` in web environments and `false` in Node.js;
 *   unless `disableFontFace === true` in which case this defaults to `false`
 *   regardless of the environment (to prevent completely broken fonts).
 * @property {string} [standardFontDataUrl] - The URL where the standard font
 *   files are located. Include the trailing slash.
 * @property {Object} [StandardFontDataFactory] - The factory that will be used
 *   when reading the standard font files.
 *   The default value is {DOMStandardFontDataFactory}.
 * @property {string} [wasmUrl] - The URL where the wasm files are located.
 *   Include the trailing slash.
 * @property {Object} [WasmFactory] - The factory that will be used
 *   when reading the wasm files.
 *   The default value is {DOMWasmFactory}.
 * @property {boolean} [useWorkerFetch] - Enable using the Fetch API in the
 *   worker-thread when reading CMap and standard font files. When `true`,
 *   the `CMapReaderFactory`, `StandardFontDataFactory`, and `WasmFactory`
 *   options are ignored.
 *   The default value is `true` in web environments and `false` in Node.js.
 * @property {boolean} [useWasm] - Attempt to use WebAssembly in order to
 *    improve e.g. image decoding performance.
 *    The default value is `true`.
 * @property {boolean} [stopAtErrors] - Reject certain promises, e.g.
 *   `getOperatorList`, `getTextContent`, and `RenderTask`, when the associated
 *   PDF data cannot be successfully parsed, instead of attempting to recover
 *   whatever possible of the data. The default value is `false`.
 * @property {number} [maxImageSize] - The maximum allowed image size in total
 *   pixels, i.e. width * height. Images above this value will not be rendered.
 *   Use -1 for no limit, which is also the default value.
 * @property {boolean} [isEvalSupported] - Determines if we can evaluate strings
 *   as JavaScript. Primarily used to improve performance of PDF functions.
 *   The default value is `true`.
 * @property {boolean} [isOffscreenCanvasSupported] - Determines if we can use
 *   `OffscreenCanvas` in the worker. Primarily used to improve performance of
 *   image conversion/rendering.
 *   The default value is `true` in web environments and `false` in Node.js.
 * @property {boolean} [isImageDecoderSupported] - Determines if we can use
 *   `ImageDecoder` in the worker. Primarily used to improve performance of
 *   image conversion/rendering.
 *   The default value is `true` in web environments and `false` in Node.js.
 *
 *   NOTE: Also temporarily disabled in Chromium browsers, until we no longer
 *   support the affected browser versions, because of various bugs:
 *
 *    - Crashes when using the BMP decoder with huge images, e.g. issue6741.pdf;
 *      see https://issues.chromium.org/issues/374807001
 *
 *    - Broken images when using the JPEG decoder with images that have custom
 *      colour profiles, e.g. GitHub discussion 19030;
 *      see https://issues.chromium.org/issues/378869810
 *
 * @property {number} [canvasMaxAreaInBytes] - The integer value is used to
 *   know when an image must be resized (uses `OffscreenCanvas` in the worker).
 *   If it's -1 then a possibly slow algorithm is used to guess the max value.
 * @property {boolean} [disableFontFace] - By default fonts are converted to
 *   OpenType fonts and loaded via the Font Loading API or `@font-face` rules.
 *   If disabled, fonts will be rendered using a built-in font renderer that
 *   constructs the glyphs with primitive path commands.
 *   The default value is `false` in web environments and `true` in Node.js.
 * @property {boolean} [fontExtraProperties] - Include additional properties,
 *   which are unused during rendering of PDF documents, when exporting the
 *   parsed font data from the worker-thread. This may be useful for debugging
 *   purposes (and backwards compatibility), but note that it will lead to
 *   increased memory usage. The default value is `false`.
 * @property {boolean} [enableXfa] - Render Xfa forms if any.
 *   The default value is `false`.
 * @property {HTMLDocument} [ownerDocument] - Specify an explicit document
 *   context to create elements with and to load resources, such as fonts,
 *   into. Defaults to the current document.
 * @property {boolean} [disableRange] - Disable range request loading of PDF
 *   files. When enabled, and if the server supports partial content requests,
 *   then the PDF will be fetched in chunks. The default value is `false`.
 * @property {boolean} [disableStream] - Disable streaming of PDF file data.
 *   By default PDF.js attempts to load PDF files in chunks. The default value
 *   is `false`.
 * @property {boolean} [disableAutoFetch] - Disable pre-fetching of PDF file
 *   data. When range requests are enabled PDF.js will automatically keep
 *   fetching more data even if it isn't needed to display the current page.
 *   The default value is `false`.
 *
 *   NOTE: It is also necessary to disable streaming, see above, in order for
 *   disabling of pre-fetching to work correctly.
 * @property {boolean} [pdfBug] - Enables special hooks for debugging PDF.js
 *   (see `web/debugger.js`). The default value is `false`.
 * @property {Object} [CanvasFactory] - The factory that will be used when
 *    creating canvases. The default value is {DOMCanvasFactory}.
 * @property {Object} [FilterFactory] - The factory that will be used to
 *    create SVG filters when rendering some images on the main canvas.
 *    The default value is {DOMFilterFactory}.
 * @property {boolean} [enableHWA] - Enables hardware acceleration for
 *   rendering. The default value is `false`.
 */
/**
 * This is the main entry point for loading a PDF and interacting with it.
 *
 * NOTE: If a URL is used to fetch the PDF data a standard Fetch API call (or
 * XHR as fallback) is used, which means it must follow same origin rules,
 * e.g. no cross-domain requests without CORS.
 *
 * @param {string | URL | TypedArray | ArrayBuffer | DocumentInitParameters}
 *   src - Can be a URL where a PDF file is located, a typed array (Uint8Array)
 *         already populated with data, or a parameter object.
 * @returns {PDFDocumentLoadingTask}
 */
export function getDocument(src?: string | URL | TypedArray | ArrayBuffer | DocumentInitParameters): PDFDocumentLoadingTask;
/**
 * Abstract class to support range requests file loading.
 *
 * NOTE: The TypedArrays passed to the constructor and relevant methods below
 * will generally be transferred to the worker-thread. This will help reduce
 * main-thread memory usage, however it will take ownership of the TypedArrays.
 */
export class PDFDataRangeTransport {
    /**
     * @param {number} length
     * @param {Uint8Array|null} initialData
     * @param {boolean} [progressiveDone]
     * @param {string} [contentDispositionFilename]
     */
    constructor(length: number, initialData: Uint8Array | null, progressiveDone?: boolean, contentDispositionFilename?: string);
    length: number;
    initialData: Uint8Array<ArrayBufferLike> | null;
    progressiveDone: boolean;
    contentDispositionFilename: string;
    /**
     * @param {function} listener
     */
    addRangeListener(listener: Function): void;
    /**
     * @param {function} listener
     */
    addProgressListener(listener: Function): void;
    /**
     * @param {function} listener
     */
    addProgressiveReadListener(listener: Function): void;
    /**
     * @param {function} listener
     */
    addProgressiveDoneListener(listener: Function): void;
    /**
     * @param {number} begin
     * @param {Uint8Array|null} chunk
     */
    onDataRange(begin: number, chunk: Uint8Array | null): void;
    /**
     * @param {number} loaded
     * @param {number|undefined} total
     */
    onDataProgress(loaded: number, total: number | undefined): void;
    /**
     * @param {Uint8Array|null} chunk
     */
    onDataProgressiveRead(chunk: Uint8Array | null): void;
    onDataProgressiveDone(): void;
    transportReady(): void;
    /**
     * @param {number} begin
     * @param {number} end
     */
    requestDataRange(begin: number, end: number): void;
    abort(): void;
    #private;
}
/**
 * @typedef {Object} OnProgressParameters
 * @property {number} loaded - Currently loaded number of bytes.
 * @property {number} total - Total number of bytes in the PDF file.
 */
/**
 * The loading task controls the operations required to load a PDF document
 * (such as network requests) and provides a way to listen for completion,
 * after which individual pages can be rendered.
 */
export class PDFDocumentLoadingTask {
    static "__#57@#docId": number;
    /**
     * @private
     */
    private _capability;
    /**
     * @private
     */
    private _transport;
    /**
     * @private
     */
    private _worker;
    /**
     * Unique identifier for the document loading task.
     * @type {string}
     */
    docId: string;
    /**
     * Whether the loading task is destroyed or not.
     * @type {boolean}
     */
    destroyed: boolean;
    /**
     * Callback to request a password if a wrong or no password was provided.
     * The callback receives two parameters: a function that should be called
     * with the new password, and a reason (see {@link PasswordResponses}).
     * @type {function}
     */
    onPassword: Function;
    /**
     * Callback to be able to monitor the loading progress of the PDF file
     * (necessary to implement e.g. a loading bar).
     * The callback receives an {@link OnProgressParameters} argument.
     * @type {function}
     */
    onProgress: Function;
    /**
     * Promise for document loading task completion.
     * @type {Promise<PDFDocumentProxy>}
     */
    get promise(): Promise<PDFDocumentProxy>;
    /**
     * Abort all network requests and destroy the worker.
     * @returns {Promise<void>} A promise that is resolved when destruction is
     *   completed.
     */
    destroy(): Promise<void>;
    /**
     * Attempt to fetch the raw data of the PDF document, when e.g.
     *  - An exception was thrown during document initialization.
     *  - An `onPassword` callback is delaying initialization.
     * @returns {Promise<Uint8Array>}
     */
    getData(): Promise<Uint8Array>;
}
/**
 * Proxy to a `PDFDocument` in the worker thread.
 */
export class PDFDocumentProxy {
    constructor(pdfInfo: any, transport: any);
    _pdfInfo: any;
    _transport: any;
    /**
     * @type {AnnotationStorage} Storage for annotation data in forms.
     */
    get annotationStorage(): AnnotationStorage;
    /**
     * @type {Object} The canvas factory instance.
     */
    get canvasFactory(): Object;
    /**
     * @type {Object} The filter factory instance.
     */
    get filterFactory(): Object;
    /**
     * @type {number} Total number of pages in the PDF file.
     */
    get numPages(): number;
    /**
     * @type {Array<string | null>} A (not guaranteed to be) unique ID to identify
     *   the PDF document.
     *   NOTE: The first element will always be defined for all PDF documents,
     *   whereas the second element is only defined for *modified* PDF documents.
     */
    get fingerprints(): Array<string | null>;
    /**
     * @type {boolean} True if only XFA form.
     */
    get isPureXfa(): boolean;
    /**
     * NOTE: This is (mostly) intended to support printing of XFA forms.
     *
     * @type {Object | null} An object representing a HTML tree structure
     *   to render the XFA, or `null` when no XFA form exists.
     */
    get allXfaHtml(): Object | null;
    /**
     * @param {number} pageNumber - The page number to get. The first page is 1.
     * @returns {Promise<PDFPageProxy>} A promise that is resolved with
     *   a {@link PDFPageProxy} object.
     */
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    /**
     * @param {RefProxy} ref - The page reference.
     * @returns {Promise<number>} A promise that is resolved with the page index,
     *   starting from zero, that is associated with the reference.
     */
    getPageIndex(ref: RefProxy): Promise<number>;
    /**
     * @returns {Promise<Object<string, Array<any>>>} A promise that is resolved
     *   with a mapping from named destinations to references.
     *
     * This can be slow for large documents. Use `getDestination` instead.
     */
    getDestinations(): Promise<{
        [x: string]: Array<any>;
    }>;
    /**
     * @param {string} id - The named destination to get.
     * @returns {Promise<Array<any> | null>} A promise that is resolved with all
     *   information of the given named destination, or `null` when the named
     *   destination is not present in the PDF file.
     */
    getDestination(id: string): Promise<Array<any> | null>;
    /**
     * @returns {Promise<Array<string> | null>} A promise that is resolved with
     *   an {Array} containing the page labels that correspond to the page
     *   indexes, or `null` when no page labels are present in the PDF file.
     */
    getPageLabels(): Promise<Array<string> | null>;
    /**
     * @returns {Promise<string>} A promise that is resolved with a {string}
     *   containing the page layout name.
     */
    getPageLayout(): Promise<string>;
    /**
     * @returns {Promise<string>} A promise that is resolved with a {string}
     *   containing the page mode name.
     */
    getPageMode(): Promise<string>;
    /**
     * @returns {Promise<Object | null>} A promise that is resolved with an
     *   {Object} containing the viewer preferences, or `null` when no viewer
     *   preferences are present in the PDF file.
     */
    getViewerPreferences(): Promise<Object | null>;
    /**
     * @returns {Promise<any | null>} A promise that is resolved with an {Array}
     *   containing the destination, or `null` when no open action is present
     *   in the PDF.
     */
    getOpenAction(): Promise<any | null>;
    /**
     * @returns {Promise<any>} A promise that is resolved with a lookup table
     *   for mapping named attachments to their content.
     */
    getAttachments(): Promise<any>;
    /**
     * @returns {Promise<Object | null>} A promise that is resolved with
     *   an {Object} with the JavaScript actions:
     *     - from the name tree.
     *     - from A or AA entries in the catalog dictionary.
     *   , or `null` if no JavaScript exists.
     */
    getJSActions(): Promise<Object | null>;
    /**
     * @typedef {Object} OutlineNode
     * @property {string} title
     * @property {boolean} bold
     * @property {boolean} italic
     * @property {Uint8ClampedArray} color - The color in RGB format to use for
     *   display purposes.
     * @property {string | Array<any> | null} dest
     * @property {string | null} url
     * @property {string | undefined} unsafeUrl
     * @property {boolean | undefined} newWindow
     * @property {number | undefined} count
     * @property {Array<OutlineNode>} items
     */
    /**
     * @returns {Promise<Array<OutlineNode>>} A promise that is resolved with an
     *   {Array} that is a tree outline (if it has one) of the PDF file.
     */
    getOutline(): Promise<Array<{
        title: string;
        bold: boolean;
        italic: boolean;
        /**
         * - The color in RGB format to use for
         * display purposes.
         */
        color: Uint8ClampedArray;
        dest: string | Array<any> | null;
        url: string | null;
        unsafeUrl: string | undefined;
        newWindow: boolean | undefined;
        count: number | undefined;
        items: Array</*elided*/ any>;
    }>>;
    /**
     * @typedef {Object} GetOptionalContentConfigParameters
     * @property {string} [intent] - Determines the optional content groups that
     *   are visible by default; valid values are:
     *    - 'display' (viewable groups).
     *    - 'print' (printable groups).
     *    - 'any' (all groups).
     *   The default value is 'display'.
     */
    /**
     * @param {GetOptionalContentConfigParameters} [params] - Optional content
     *   config parameters.
     * @returns {Promise<OptionalContentConfig>} A promise that is resolved with
     *   an {@link OptionalContentConfig} that contains all the optional content
     *   groups (assuming that the document has any).
     */
    getOptionalContentConfig({ intent }?: {
        /**
         * - Determines the optional content groups that
         * are visible by default; valid values are:
         * - 'display' (viewable groups).
         * - 'print' (printable groups).
         * - 'any' (all groups).
         * The default value is 'display'.
         */
        intent?: string | undefined;
    }): Promise<OptionalContentConfig>;
    /**
     * @returns {Promise<Array<number> | null>} A promise that is resolved with
     *   an {Array} that contains the permission flags for the PDF document, or
     *   `null` when no permissions are present in the PDF file.
     */
    getPermissions(): Promise<Array<number> | null>;
    /**
     * @returns {Promise<{ info: Object, metadata: Metadata }>} A promise that is
     *   resolved with an {Object} that has `info` and `metadata` properties.
     *   `info` is an {Object} filled with anything available in the information
     *   dictionary and similarly `metadata` is a {Metadata} object with
     *   information from the metadata section of the PDF.
     */
    getMetadata(): Promise<{
        info: Object;
        metadata: Metadata;
    }>;
    /**
     * @typedef {Object} MarkInfo
     * Properties correspond to Table 321 of the PDF 32000-1:2008 spec.
     * @property {boolean} Marked
     * @property {boolean} UserProperties
     * @property {boolean} Suspects
     */
    /**
     * @returns {Promise<MarkInfo | null>} A promise that is resolved with
     *   a {MarkInfo} object that contains the MarkInfo flags for the PDF
     *   document, or `null` when no MarkInfo values are present in the PDF file.
     */
    getMarkInfo(): Promise<{
        Marked: boolean;
        UserProperties: boolean;
        Suspects: boolean;
    } | null>;
    /**
     * @returns {Promise<Uint8Array>} A promise that is resolved with a
     *   {Uint8Array} containing the raw data of the PDF document.
     */
    getData(): Promise<Uint8Array>;
    /**
     * @returns {Promise<Uint8Array>} A promise that is resolved with a
     *   {Uint8Array} containing the full data of the saved document.
     */
    saveDocument(): Promise<Uint8Array>;
    /**
     * @returns {Promise<{ length: number }>} A promise that is resolved when the
     *   document's data is loaded. It is resolved with an {Object} that contains
     *   the `length` property that indicates size of the PDF data in bytes.
     */
    getDownloadInfo(): Promise<{
        length: number;
    }>;
    /**
     * Cleans up resources allocated by the document on both the main and worker
     * threads.
     *
     * NOTE: Do not, under any circumstances, call this method when rendering is
     * currently ongoing since that may lead to rendering errors.
     *
     * @param {boolean} [keepLoadedFonts] - Let fonts remain attached to the DOM.
     *   NOTE: This will increase persistent memory usage, hence don't use this
     *   option unless absolutely necessary. The default value is `false`.
     * @returns {Promise} A promise that is resolved when clean-up has finished.
     */
    cleanup(keepLoadedFonts?: boolean): Promise<any>;
    /**
     * Destroys the current document instance and terminates the worker.
     */
    destroy(): Promise<void>;
    /**
     * @param {RefProxy} ref - The page reference.
     * @returns {number | null} The page number, if it's cached.
     */
    cachedPageNumber(ref: RefProxy): number | null;
    /**
     * @type {DocumentInitParameters} A subset of the current
     *   {DocumentInitParameters}, which are needed in the viewer.
     */
    get loadingParams(): DocumentInitParameters;
    /**
     * @type {PDFDocumentLoadingTask} The loadingTask for the current document.
     */
    get loadingTask(): PDFDocumentLoadingTask;
    /**
     * @returns {Promise<Object<string, Array<Object>> | null>} A promise that is
     *   resolved with an {Object} containing /AcroForm field data for the JS
     *   sandbox, or `null` when no field data is present in the PDF file.
     */
    getFieldObjects(): Promise<{
        [x: string]: Array<Object>;
    } | null>;
    /**
     * @returns {Promise<boolean>} A promise that is resolved with `true`
     *   if some /AcroForm fields have JavaScript actions.
     */
    hasJSActions(): Promise<boolean>;
    /**
     * @returns {Promise<Array<string> | null>} A promise that is resolved with an
     *   {Array<string>} containing IDs of annotations that have a calculation
     *   action, or `null` when no such annotations are present in the PDF file.
     */
    getCalculationOrderIds(): Promise<Array<string> | null>;
}
/**
 * Page getViewport parameters.
 *
 * @typedef {Object} GetViewportParameters
 * @property {number} scale - The desired scale of the viewport.
 * @property {number} [rotation] - The desired rotation, in degrees, of
 *   the viewport. If omitted it defaults to the page rotation.
 * @property {number} [offsetX] - The horizontal, i.e. x-axis, offset.
 *   The default value is `0`.
 * @property {number} [offsetY] - The vertical, i.e. y-axis, offset.
 *   The default value is `0`.
 * @property {boolean} [dontFlip] - If true, the y-axis will not be
 *   flipped. The default value is `false`.
 */
/**
 * Page getTextContent parameters.
 *
 * @typedef {Object} getTextContentParameters
 * @property {boolean} [includeMarkedContent] - When true include marked
 *   content items in the items array of TextContent. The default is `false`.
 * @property {boolean} [disableNormalization] - When true the text is *not*
 *   normalized in the worker-thread. The default is `false`.
 */
/**
 * Page text content.
 *
 * @typedef {Object} TextContent
 * @property {Array<TextItem | TextMarkedContent>} items - Array of
 *   {@link TextItem} and {@link TextMarkedContent} objects. TextMarkedContent
 *   items are included when includeMarkedContent is true.
 * @property {Object<string, TextStyle>} styles - {@link TextStyle} objects,
 *   indexed by font name.
 * @property {string | null} lang - The document /Lang attribute.
 */
/**
 * Page text content part.
 *
 * @typedef {Object} TextItem
 * @property {string} str - Text content.
 * @property {string} dir - Text direction: 'ttb', 'ltr' or 'rtl'.
 * @property {Array<any>} transform - Transformation matrix.
 * @property {number} width - Width in device space.
 * @property {number} height - Height in device space.
 * @property {string} fontName - Font name used by PDF.js for converted font.
 * @property {boolean} hasEOL - Indicating if the text content is followed by a
 *   line-break.
 */
/**
 * Page text marked content part.
 *
 * @typedef {Object} TextMarkedContent
 * @property {string} type - Either 'beginMarkedContent',
 *   'beginMarkedContentProps', or 'endMarkedContent'.
 * @property {string} id - The marked content identifier. Only used for type
 *   'beginMarkedContentProps'.
 */
/**
 * Text style.
 *
 * @typedef {Object} TextStyle
 * @property {number} ascent - Font ascent.
 * @property {number} descent - Font descent.
 * @property {boolean} vertical - Whether or not the text is in vertical mode.
 * @property {string} fontFamily - The possible font family.
 */
/**
 * Page annotation parameters.
 *
 * @typedef {Object} GetAnnotationsParameters
 * @property {string} [intent] - Determines the annotations that are fetched,
 *   can be 'display' (viewable annotations), 'print' (printable annotations),
 *   or 'any' (all annotations). The default value is 'display'.
 */
/**
 * Page render parameters.
 *
 * @typedef {Object} RenderParameters
 * @property {CanvasRenderingContext2D} canvasContext - A 2D context of a DOM
 *   Canvas object.
 * @property {PageViewport} viewport - Rendering viewport obtained by calling
 *   the `PDFPageProxy.getViewport` method.
 * @property {string} [intent] - Rendering intent, can be 'display', 'print',
 *   or 'any'. The default value is 'display'.
 * @property {number} [annotationMode] Controls which annotations are rendered
 *   onto the canvas, for annotations with appearance-data; the values from
 *   {@link AnnotationMode} should be used. The following values are supported:
 *    - `AnnotationMode.DISABLE`, which disables all annotations.
 *    - `AnnotationMode.ENABLE`, which includes all possible annotations (thus
 *      it also depends on the `intent`-option, see above).
 *    - `AnnotationMode.ENABLE_FORMS`, which excludes annotations that contain
 *      interactive form elements (those will be rendered in the display layer).
 *    - `AnnotationMode.ENABLE_STORAGE`, which includes all possible annotations
 *      (as above) but where interactive form elements are updated with data
 *      from the {@link AnnotationStorage}-instance; useful e.g. for printing.
 *   The default value is `AnnotationMode.ENABLE`.
 * @property {Array<any>} [transform] - Additional transform, applied just
 *   before viewport transform.
 * @property {CanvasGradient | CanvasPattern | string} [background] - Background
 *   to use for the canvas.
 *   Any valid `canvas.fillStyle` can be used: a `DOMString` parsed as CSS
 *   <color> value, a `CanvasGradient` object (a linear or radial gradient) or
 *   a `CanvasPattern` object (a repetitive image). The default value is
 *   'rgb(255,255,255)'.
 *
 *   NOTE: This option may be partially, or completely, ignored when the
 *   `pageColors`-option is used.
 * @property {Object} [pageColors] - Overwrites background and foreground colors
 *   with user defined ones in order to improve readability in high contrast
 *   mode.
 * @property {Promise<OptionalContentConfig>} [optionalContentConfigPromise] -
 *   A promise that should resolve with an {@link OptionalContentConfig}
 *   created from `PDFDocumentProxy.getOptionalContentConfig`. If `null`,
 *   the configuration will be fetched automatically with the default visibility
 *   states set.
 * @property {Map<string, HTMLCanvasElement>} [annotationCanvasMap] - Map some
 *   annotation ids with canvases used to render them.
 * @property {PrintAnnotationStorage} [printAnnotationStorage]
 * @property {boolean} [isEditing] - Render the page in editing mode.
 */
/**
 * Page getOperatorList parameters.
 *
 * @typedef {Object} GetOperatorListParameters
 * @property {string} [intent] - Rendering intent, can be 'display', 'print',
 *   or 'any'. The default value is 'display'.
 * @property {number} [annotationMode] Controls which annotations are included
 *   in the operatorList, for annotations with appearance-data; the values from
 *   {@link AnnotationMode} should be used. The following values are supported:
 *    - `AnnotationMode.DISABLE`, which disables all annotations.
 *    - `AnnotationMode.ENABLE`, which includes all possible annotations (thus
 *      it also depends on the `intent`-option, see above).
 *    - `AnnotationMode.ENABLE_FORMS`, which excludes annotations that contain
 *      interactive form elements (those will be rendered in the display layer).
 *    - `AnnotationMode.ENABLE_STORAGE`, which includes all possible annotations
 *      (as above) but where interactive form elements are updated with data
 *      from the {@link AnnotationStorage}-instance; useful e.g. for printing.
 *   The default value is `AnnotationMode.ENABLE`.
 * @property {PrintAnnotationStorage} [printAnnotationStorage]
 * @property {boolean} [isEditing] - Render the page in editing mode.
 */
/**
 * Structure tree node. The root node will have a role "Root".
 *
 * @typedef {Object} StructTreeNode
 * @property {Array<StructTreeNode | StructTreeContent>} children - Array of
 *   {@link StructTreeNode} and {@link StructTreeContent} objects.
 * @property {string} role - element's role, already mapped if a role map exists
 * in the PDF.
 */
/**
 * Structure tree content.
 *
 * @typedef {Object} StructTreeContent
 * @property {string} type - either "content" for page and stream structure
 *   elements or "object" for object references.
 * @property {string} id - unique id that will map to the text layer.
 */
/**
 * PDF page operator list.
 *
 * @typedef {Object} PDFOperatorList
 * @property {Array<number>} fnArray - Array containing the operator functions.
 * @property {Array<any>} argsArray - Array containing the arguments of the
 *   functions.
 */
/**
 * Proxy to a `PDFPage` in the worker thread.
 */
export class PDFPageProxy {
    constructor(pageIndex: any, pageInfo: any, transport: any, pdfBug?: boolean);
    _pageIndex: any;
    _pageInfo: any;
    _transport: any;
    _stats: StatTimer | null;
    _pdfBug: boolean;
    /** @type {PDFObjects} */
    commonObjs: PDFObjects;
    objs: PDFObjects;
    _intentStates: Map<any, any>;
    destroyed: boolean;
    /**
     * @type {number} Page number of the page. First page is 1.
     */
    get pageNumber(): number;
    /**
     * @type {number} The number of degrees the page is rotated clockwise.
     */
    get rotate(): number;
    /**
     * @type {RefProxy | null} The reference that points to this page.
     */
    get ref(): RefProxy | null;
    /**
     * @type {number} The default size of units in 1/72nds of an inch.
     */
    get userUnit(): number;
    /**
     * @type {Array<number>} An array of the visible portion of the PDF page in
     *   user space units [x1, y1, x2, y2].
     */
    get view(): Array<number>;
    /**
     * @param {GetViewportParameters} params - Viewport parameters.
     * @returns {PageViewport} Contains 'width' and 'height' properties
     *   along with transforms required for rendering.
     */
    getViewport({ scale, rotation, offsetX, offsetY, dontFlip, }?: GetViewportParameters): PageViewport;
    /**
     * @param {GetAnnotationsParameters} [params] - Annotation parameters.
     * @returns {Promise<Array<any>>} A promise that is resolved with an
     *   {Array} of the annotation objects.
     */
    getAnnotations({ intent }?: GetAnnotationsParameters): Promise<Array<any>>;
    /**
     * @returns {Promise<Object>} A promise that is resolved with an
     *   {Object} with JS actions.
     */
    getJSActions(): Promise<Object>;
    /**
     * @type {Object} The filter factory instance.
     */
    get filterFactory(): Object;
    /**
     * @type {boolean} True if only XFA form.
     */
    get isPureXfa(): boolean;
    /**
     * @returns {Promise<Object | null>} A promise that is resolved with
     *   an {Object} with a fake DOM object (a tree structure where elements
     *   are {Object} with a name, attributes (class, style, ...), value and
     *   children, very similar to a HTML DOM tree), or `null` if no XFA exists.
     */
    getXfa(): Promise<Object | null>;
    /**
     * Begins the process of rendering a page to the desired context.
     *
     * @param {RenderParameters} params - Page render parameters.
     * @returns {RenderTask} An object that contains a promise that is
     *   resolved when the page finishes rendering.
     */
    render({ canvasContext, viewport, intent, annotationMode, transform, background, optionalContentConfigPromise, annotationCanvasMap, pageColors, printAnnotationStorage, isEditing, }: RenderParameters): RenderTask;
    /**
     * @param {GetOperatorListParameters} params - Page getOperatorList
     *   parameters.
     * @returns {Promise<PDFOperatorList>} A promise resolved with an
     *   {@link PDFOperatorList} object that represents the page's operator list.
     */
    getOperatorList({ intent, annotationMode, printAnnotationStorage, isEditing, }?: GetOperatorListParameters): Promise<PDFOperatorList>;
    /**
     * NOTE: All occurrences of whitespace will be replaced by
     * standard spaces (0x20).
     *
     * @param {getTextContentParameters} params - getTextContent parameters.
     * @returns {ReadableStream} Stream for reading text content chunks.
     */
    streamTextContent({ includeMarkedContent, disableNormalization, }?: getTextContentParameters): ReadableStream;
    /**
     * NOTE: All occurrences of whitespace will be replaced by
     * standard spaces (0x20).
     *
     * @param {getTextContentParameters} params - getTextContent parameters.
     * @returns {Promise<TextContent>} A promise that is resolved with a
     *   {@link TextContent} object that represents the page's text content.
     */
    getTextContent(params?: getTextContentParameters): Promise<TextContent>;
    /**
     * @returns {Promise<StructTreeNode>} A promise that is resolved with a
     *   {@link StructTreeNode} object that represents the page's structure tree,
     *   or `null` when no structure tree is present for the current page.
     */
    getStructTree(): Promise<StructTreeNode>;
    /**
     * Destroys the page object.
     * @private
     */
    private _destroy;
    /**
     * Cleans up resources allocated by the page.
     *
     * @param {boolean} [resetStats] - Reset page stats, if enabled.
     *   The default value is `false`.
     * @returns {boolean} Indicates if clean-up was successfully run.
     */
    cleanup(resetStats?: boolean): boolean;
    /**
     * @private
     */
    private _startRenderPage;
    /**
     * @private
     */
    private _renderPageChunk;
    /**
     * @private
     */
    private _pumpOperatorList;
    /**
     * @private
     */
    private _abortOperatorList;
    /**
     * @type {StatTimer | null} Returns page stats, if enabled; returns `null`
     *   otherwise.
     */
    get stats(): StatTimer | null;
    #private;
}
/**
 * @typedef {Object} PDFWorkerParameters
 * @property {string} [name] - The name of the worker.
 * @property {Worker} [port] - The `workerPort` object.
 * @property {number} [verbosity] - Controls the logging level;
 *   the constants from {@link VerbosityLevel} should be used.
 */
/**
 * PDF.js web worker abstraction that controls the instantiation of PDF
 * documents. Message handlers are used to pass information from the main
 * thread to the worker thread and vice versa. If the creation of a web
 * worker is not possible, a "fake" worker will be used instead.
 *
 * @param {PDFWorkerParameters} params - The worker initialization parameters.
 */
export class PDFWorker {
    static "__#60@#fakeWorkerId": number;
    static "__#60@#isWorkerDisabled": boolean;
    static "__#60@#workerPorts": WeakMap<object, any>;
    /**
     * @param {PDFWorkerParameters} params - The worker initialization parameters.
     * @returns {PDFWorker}
     */
    static create(params: PDFWorkerParameters): PDFWorker;
    /**
     * The current `workerSrc`, when it exists.
     * @type {string}
     */
    static get workerSrc(): string;
    static get "__#60@#mainThreadWorkerMessageHandler"(): any;
    static get _setupFakeWorkerGlobal(): any;
    constructor({ name, port, verbosity, }?: {
        name?: null | undefined;
        port?: null | undefined;
        verbosity?: number | undefined;
    });
    name: any;
    destroyed: boolean;
    verbosity: number;
    /**
     * Promise for worker initialization completion.
     * @type {Promise<void>}
     */
    get promise(): Promise<void>;
    /**
     * The current `workerPort`, when it exists.
     * @type {Worker}
     */
    get port(): Worker;
    /**
     * The current MessageHandler-instance.
     * @type {MessageHandler}
     */
    get messageHandler(): MessageHandler;
    /**
     * Destroys the worker instance.
     */
    destroy(): void;
    #private;
}
/**
 * Allows controlling of the rendering tasks.
 */
export class RenderTask {
    constructor(internalRenderTask: any);
    /**
     * Callback for incremental rendering -- a function that will be called
     * each time the rendering is paused.  To continue rendering call the
     * function that is the first argument to the callback.
     * @type {function}
     */
    onContinue: Function;
    /**
     * A function that will be synchronously called when the rendering tasks
     * finishes with an error (either because of an actual error, or because the
     * rendering is cancelled).
     *
     * @type {function}
     * @param {Error} error
     */
    onError: Function;
    /**
     * Promise for rendering task completion.
     * @type {Promise<void>}
     */
    get promise(): Promise<void>;
    /**
     * Cancels the rendering task. If the task is currently rendering it will
     * not be cancelled until graphics pauses with a timeout. The promise that
     * this object extends will be rejected when cancelled.
     *
     * @param {number} [extraDelay]
     */
    cancel(extraDelay?: number): void;
    /**
     * Whether form fields are rendered separately from the main operatorList.
     * @type {boolean}
     */
    get separateAnnots(): boolean;
    #private;
}
/** @type {string} */
export const version: string;
import { PageViewport } from "./display_utils.js";
import { OptionalContentConfig } from "./optional_content_config.js";
import { PrintAnnotationStorage } from "./annotation_storage.js";
import { AnnotationStorage } from "./annotation_storage.js";
import { Metadata } from "./metadata.js";
import { StatTimer } from "./display_utils.js";
import { PDFObjects } from "./pdf_objects.js";
import { MessageHandler } from "../shared/message_handler.js";
