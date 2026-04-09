/**
 * node-canvas compatibility layer for @napi-rs/canvas.
 *
 * Provides a drop-in replacement API matching the `canvas` (node-canvas) npm package.
 * Quality values for JPEG/WebP use the node-canvas 0-1 scale and are automatically
 * converted to @napi-rs/canvas's 0-100 scale internally.
 *
 * @example
 * ```typescript
 * // Drop-in replacement: change this import
 * // import { createCanvas, registerFont, loadImage } from 'canvas'
 * // to this:
 * import { createCanvas, registerFont, loadImage } from '@napi-rs/canvas/node-canvas'
 * ```
 */

import { Readable } from 'node:stream'

// Re-export types from @napi-rs/canvas that are API-compatible
import {
  Image as NapiImage,
  ImageData as NapiImageData,
  Path2D as NapiPath2D,
  DOMPoint as NapiDOMPoint,
  DOMMatrix as NapiDOMMatrix,
  DOMRect as NapiDOMRect,
  SKRSContext2D,
  Canvas as NapiCanvas,
  SvgCanvas,
  SvgExportFlag,
  IGlobalFonts,
  PDFDocument,
} from './index'

// ---------------------------------------------------------------------------
// Config interfaces (node-canvas conventions)
// ---------------------------------------------------------------------------

export interface PngConfig {
  /** ZLIB compression level (0-9). Accepted for compatibility; Skia uses its own encoder. */
  compressionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  /** PNG filter flags. Accepted for compatibility; Skia uses its own encoder. */
  filters?: number
  /** Palette for indexed PNGs. Not supported by Skia backend. */
  palette?: Uint8ClampedArray
  /** Background color index for indexed PNGs. Not supported by Skia backend. */
  backgroundIndex?: number
  /** Pixels per inch. Accepted for compatibility. */
  resolution?: number
}

export interface JpegConfig {
  /** Quality between 0 and 1. Defaults to 0.75. Converted to 0-100 for Skia. */
  quality?: number
  /** Progressive encoding. Accepted for compatibility; not supported by Skia backend. */
  progressive?: boolean
  /** 2x2 chroma subsampling. Accepted for compatibility; not supported by Skia backend. */
  chromaSubsampling?: boolean
}

// ---------------------------------------------------------------------------
// Canvas class (with node-canvas compatible methods)
// ---------------------------------------------------------------------------

export interface Canvas extends Omit<NapiCanvas, 'toBuffer' | 'toDataURL'> {
  /**
   * Encode the canvas as a PNG and return a Node.js Readable stream.
   * @param config PNG encoding options (accepted for compatibility)
   */
  createPNGStream(config?: PngConfig): PNGStream

  /**
   * Encode the canvas as a JPEG and return a Node.js Readable stream.
   * @param config JPEG encoding options. Quality is 0-1 (default 0.75).
   */
  createJPEGStream(config?: JpegConfig): JPEGStream

  // --- toBuffer overloads (node-canvas conventions) ---

  /** Encode as PNG (default). */
  toBuffer(): Buffer
  toBuffer(mimeType: 'image/png', config?: PngConfig): Buffer
  /** Encode as JPEG. Quality in config is 0-1 (default 0.75). */
  toBuffer(mimeType: 'image/jpeg', config?: JpegConfig): Buffer
  /** Get raw unencoded pixel data. */
  toBuffer(mimeType: 'raw'): Buffer

  /** Async: encode as PNG (default) via callback. */
  toBuffer(cb: (err: Error | null, result: Buffer) => void): void
  toBuffer(cb: (err: Error | null, result: Buffer) => void, mimeType: 'image/png', config?: PngConfig): void
  /** Async: encode as JPEG via callback. Quality in config is 0-1 (default 0.75). */
  toBuffer(cb: (err: Error | null, result: Buffer) => void, mimeType: 'image/jpeg', config?: JpegConfig): void

  // --- toDataURL overloads (node-canvas conventions) ---

  /** Encode as PNG data URL (default). */
  toDataURL(): string
  toDataURL(mimeType: 'image/png'): string
  /** Encode as JPEG data URL. Quality is 0-1. */
  toDataURL(mimeType: 'image/jpeg', quality?: number): string
  /** Async: encode as data URL via callback. */
  toDataURL(cb: (err: Error | null, result: string) => void): void
  toDataURL(mimeType: 'image/png', cb: (err: Error | null, result: string) => void): void
  toDataURL(mimeType: 'image/jpeg', cb: (err: Error | null, result: string) => void): void
  toDataURL(mimeType: 'image/jpeg', quality: number, cb: (err: Error | null, result: string) => void): void
}

// ---------------------------------------------------------------------------
// Stream classes
// ---------------------------------------------------------------------------

/** Readable stream that emits PNG-encoded data. */
export class PNGStream extends Readable {}

/** Readable stream that emits JPEG-encoded data. */
export class JPEGStream extends Readable {}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create a new canvas with node-canvas compatible API.
 * Canvas instances created through this function have `createPNGStream()`,
 * `createJPEGStream()`, and node-canvas compatible `toBuffer()` overloads.
 *
 * When `type` is `'svg'`, returns a `SvgCanvas` which produces vector output
 * via `getContent()` instead of raster encoding methods.
 *
 * @param width  Canvas width in pixels
 * @param height Canvas height in pixels
 * @param type   Canvas type: 'image' (default) or 'svg'
 */
export function createCanvas(width: number, height: number, type: 'svg'): SvgCanvas
export function createCanvas(width: number, height: number, type?: 'image'): Canvas

/**
 * Create an ImageData instance.
 * @param data   Pixel data array
 * @param width  Width in pixels
 * @param height Height in pixels (calculated from data length if omitted)
 */
export function createImageData(data: Uint8ClampedArray, width: number, height?: number): NapiImageData
export function createImageData(width: number, height: number): NapiImageData

/**
 * Load an image from a file path, URL, Buffer, or other source.
 * Returns a Promise that resolves to an Image instance.
 */
export function loadImage(
  source: string | URL | Buffer | ArrayBufferLike | Uint8Array | NapiImage | import('stream').Readable,
  options?: { alt?: string; maxRedirects?: number; requestOptions?: import('http').RequestOptions },
): Promise<NapiImage>

// ---------------------------------------------------------------------------
// Font registration (node-canvas convention)
// ---------------------------------------------------------------------------

/**
 * Register a font file for use in canvas text rendering.
 * Compatible with node-canvas's `registerFont()`.
 *
 * Note: @napi-rs/canvas auto-detects weight and style from font file metadata
 * (matching browser behavior). The `weight` and `style` properties in fontFace
 * are accepted for API compatibility.
 *
 * @param path     Absolute path to the font file (.ttf, .otf, etc.)
 * @param fontFace Font face properties matching CSS @font-face descriptors
 */
export function registerFont(path: string, fontFace: { family: string; weight?: string; style?: string }): void

/**
 * Deregister all previously registered fonts.
 * Compatible with node-canvas's `deregisterAllFonts()`.
 */
export function deregisterAllFonts(): void

// ---------------------------------------------------------------------------
// Re-exported classes & values
// ---------------------------------------------------------------------------

// Canvas is exported both as a type (the compat interface above) and as a
// value (constructor that returns compat Canvas instances at runtime).
export declare const Canvas: {
  new (width: number, height: number): Canvas
  new (width: number, height: number, flag: SvgExportFlag): SvgCanvas
  prototype: NapiCanvas
}

export { NapiImage as Image }
export { NapiImageData as ImageData }
export { NapiPath2D as Path2D }
export { NapiDOMPoint as DOMPoint }
export { NapiDOMMatrix as DOMMatrix }
export { NapiDOMRect as DOMRect }

// SKRSContext2D is an interface in index.d.ts but a class value at runtime.
// Declare as const to export the value for instanceof checks and re-export the type.
export type CanvasRenderingContext2D = SKRSContext2D
export declare const CanvasRenderingContext2D: { prototype: SKRSContext2D }
/** Legacy alias for CanvasRenderingContext2D. */
export type Context2d = SKRSContext2D
export declare const Context2d: { prototype: SKRSContext2D }

// ---------------------------------------------------------------------------
// @napi-rs/canvas extras (not part of node-canvas, but useful)
// ---------------------------------------------------------------------------

export { IGlobalFonts }
export declare const GlobalFonts: IGlobalFonts & {
  /** Reload system fonts. Available at runtime but not declared in IGlobalFonts. */
  loadSystemFonts(): number
}
export { PDFDocument }
export { NapiCanvas as CanvasElement }
export { SvgCanvas as SVGCanvas }
