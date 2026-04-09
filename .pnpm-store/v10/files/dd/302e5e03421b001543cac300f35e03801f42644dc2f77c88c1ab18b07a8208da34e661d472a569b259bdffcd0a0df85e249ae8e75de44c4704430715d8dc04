'use strict'

const { Readable } = require('node:stream')

const {
  createCanvas: _createCanvas,
  Canvas,
  CanvasElement,
  SVGCanvas,
  GlobalFonts,
  Image,
  ImageData,
  Path2D,
  DOMPoint,
  DOMMatrix,
  DOMRect,
  loadImage,
  PDFDocument,
  SvgExportFlag,
} = require('./index.js')

// CanvasRenderingContext2D is not re-exported by index.js, grab from native bindings
const { CanvasRenderingContext2D } = require('./js-binding')

// node-canvas defaults JPEG quality to 0.75 across all paths.
// @napi-rs/canvas native default is 0.92 (matching Blink/Chrome).
const NODE_CANVAS_DEFAULT_QUALITY = 0.75

// ---------------------------------------------------------------------------
// Stream classes (node-canvas returns Node.js Readable streams)
// ---------------------------------------------------------------------------

class PNGStream extends Readable {
  constructor(canvas, options) {
    super()
    this._canvas = canvas
    this._options = options || {}
    this._done = false
  }

  _read() {
    if (this._done) return
    this._done = true
    this._canvas
      .encode('png')
      .then((buf) => {
        this.push(buf)
        this.push(null)
      })
      .catch((err) => {
        this.destroy(err)
      })
  }
}

class JPEGStream extends Readable {
  constructor(canvas, options) {
    super()
    this._canvas = canvas
    const opts = options || {}
    // node-canvas quality: 0-1 (default 0.75), encode() expects 0-100
    this._quality = Math.round((opts.quality != null ? opts.quality : NODE_CANVAS_DEFAULT_QUALITY) * 100)
    this._done = false
  }

  _read() {
    if (this._done) return
    this._done = true
    this._canvas
      .encode('jpeg', this._quality)
      .then((buf) => {
        this.push(buf)
        this.push(null)
      })
      .catch((err) => {
        this.destroy(err)
      })
  }
}

// ---------------------------------------------------------------------------
// Quality normalization helpers
// ---------------------------------------------------------------------------

const MIME_FORMAT_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

/**
 * Extract quality from a node-canvas config object or number.
 * Returns the raw 0-1 quality value, defaulting to NODE_CANVAS_DEFAULT_QUALITY
 * for JPEG/WebP when not specified.
 *
 * @param {string} mime
 * @param {number|object|undefined} configOrQuality
 * @returns {number|undefined}  0-1 scale for JPEG/WebP, undefined for other mimes
 */
function _extractQuality(mime, configOrQuality) {
  if (mime !== 'image/jpeg' && mime !== 'image/webp') return undefined
  if (configOrQuality == null) return NODE_CANVAS_DEFAULT_QUALITY
  if (typeof configOrQuality === 'number') return configOrQuality
  if (typeof configOrQuality === 'object' && configOrQuality.quality != null) {
    return configOrQuality.quality
  }
  return NODE_CANVAS_DEFAULT_QUALITY
}

// ---------------------------------------------------------------------------
// Compat methods added to each canvas instance created via this module
// ---------------------------------------------------------------------------

// Keep references to the original prototype methods
const _origToBuffer = CanvasElement.prototype.toBuffer
const _origToDataURL = CanvasElement.prototype.toDataURL

function _compatCreatePNGStream(options) {
  return new PNGStream(this, options)
}

function _compatCreateJPEGStream(options) {
  return new JPEGStream(this, options)
}

/**
 * node-canvas compatible toBuffer:
 * - toBuffer()                           → PNG (sync)
 * - toBuffer('image/png', config?)       → PNG (sync)
 * - toBuffer('image/jpeg', config?)      → JPEG (sync, quality 0-1)
 * - toBuffer('raw')                      → raw pixel data (sync)
 * - toBuffer(callback)                   → PNG (async)
 * - toBuffer(callback, mime, config?)    → specified format (async)
 */
function _compatToBuffer(mimeOrCallback, configOrQuality) {
  // Callback form: toBuffer(callback) or toBuffer(callback, mime, config)
  if (typeof mimeOrCallback === 'function') {
    const callback = mimeOrCallback
    const mime = typeof configOrQuality === 'string' ? configOrQuality : 'image/png'
    const config = arguments[2]

    if (mime === 'raw') {
      let buf
      try {
        buf = this.data()
      } catch (err) {
        callback(err)
        return
      }
      callback(null, buf)
      return
    }

    const format = MIME_FORMAT_MAP[mime]
    if (!format) {
      callback(new TypeError(`Unsupported MIME type "${mime}". Supported: ${Object.keys(MIME_FORMAT_MAP).join(', ')}`))
      return
    }
    const q = _extractQuality(mime, config)
    this.encode(format, q != null ? Math.round(q * 100) : undefined).then(
      (buf) => callback(null, buf),
      (err) => callback(err),
    )
    return
  }

  // Sync: no args → PNG
  if (mimeOrCallback === undefined) {
    return _origToBuffer.call(this, 'image/png')
  }

  // Sync: raw pixel data
  if (mimeOrCallback === 'raw') {
    return this.data()
  }

  // Sync: extract quality (0-1) and scale to 0-100 for native toBuffer
  const q = _extractQuality(mimeOrCallback, configOrQuality)
  return _origToBuffer.call(this, mimeOrCallback, q != null ? Math.round(q * 100) : undefined)
}

/**
 * node-canvas compatible toDataURL:
 * - toDataURL()                              → PNG data URL (sync)
 * - toDataURL('image/jpeg', quality)         → JPEG data URL, quality 0-1 (sync)
 * - toDataURL(callback)                      → PNG data URL (async)
 * - toDataURL(mime, callback)                → data URL (async)
 * - toDataURL(mime, quality, callback)       → data URL with quality (async)
 */
function _compatToDataURL(mimeOrCallback, qualityOrCallback) {
  // toDataURL(callback)
  if (typeof mimeOrCallback === 'function') {
    this.toDataURLAsync('image/png').then(
      (url) => mimeOrCallback(null, url),
      (err) => mimeOrCallback(err),
    )
    return
  }
  // toDataURL(mime, callback)
  if (typeof qualityOrCallback === 'function') {
    this.toDataURLAsync(mimeOrCallback, _extractQuality(mimeOrCallback, undefined)).then(
      (url) => qualityOrCallback(null, url),
      (err) => qualityOrCallback(err),
    )
    return
  }
  // toDataURL(mime, quality, callback)
  const cb = arguments[2]
  if (typeof cb === 'function') {
    // Native toDataURLAsync expects 0-1 (f64) — pass quality through as-is
    const quality = _extractQuality(mimeOrCallback, qualityOrCallback)
    this.toDataURLAsync(mimeOrCallback, quality).then(
      (url) => cb(null, url),
      (err) => cb(err),
    )
    return
  }

  // Sync form: native toDataURL expects 0-1 (f64) — pass quality through as-is
  const quality = _extractQuality(mimeOrCallback, qualityOrCallback)
  return _origToDataURL.call(this, mimeOrCallback, quality)
}

/**
 * Attach node-canvas compatible methods to a CanvasElement instance.
 */
function _addCompatMethods(canvas) {
  canvas.createPNGStream = _compatCreatePNGStream
  canvas.createJPEGStream = _compatCreateJPEGStream
  canvas.toBuffer = _compatToBuffer
  canvas.toDataURL = _compatToDataURL
  return canvas
}

// ---------------------------------------------------------------------------
// Public API: registerFont / deregisterAllFonts
// ---------------------------------------------------------------------------

// Track FontKeys from registerFont() so deregisterAllFonts() can remove
// only user-registered fonts (matching node-canvas behavior which leaves
// system fonts untouched).
const _registeredFontKeys = []

/**
 * Register a font file with the specified font face properties.
 * Compatible with node-canvas's registerFont(path, { family, weight?, style? }).
 *
 * Note: @napi-rs/canvas auto-detects weight and style from font file metadata
 * (matching browser behavior). The weight and style properties in fontFace are
 * accepted for API compatibility but the actual values are read from the font.
 *
 * @param {string} path   Absolute path to the font file (.ttf, .otf, etc.)
 * @param {{ family: string, weight?: string, style?: string }} fontFace
 */
function registerFont(path, fontFace) {
  if (!fontFace || typeof fontFace.family !== 'string') {
    throw new TypeError('registerFont requires a fontFace with a "family" property')
  }
  const key = GlobalFonts.registerFromPath(path, fontFace.family)
  if (!key) {
    throw new Error(`Failed to register font from "${path}" with family "${fontFace.family}"`)
  }
  _registeredFontKeys.push(key)
}

/**
 * Deregister all fonts previously registered via registerFont().
 * Compatible with node-canvas's deregisterAllFonts() which only removes
 * user-registered fonts and leaves system fonts untouched.
 */
function deregisterAllFonts() {
  if (_registeredFontKeys.length > 0) {
    GlobalFonts.removeBatch(_registeredFontKeys)
    _registeredFontKeys.length = 0
  }
}

// ---------------------------------------------------------------------------
// Public API: createCanvas / createImageData
// ---------------------------------------------------------------------------

/**
 * Create a new canvas instance with node-canvas compatible API.
 *
 * @param {number} width
 * @param {number} height
 * @param {'image'|'svg'} [type='image']
 * @returns {Canvas}
 */
function createCanvas(width, height, type) {
  if (type === 'svg') {
    // SvgExportFlag enum requires a valid variant; NoPrettyXML (0x02) is the
    // least impactful on rendering behavior (only affects XML whitespace).
    return _createCanvas(width, height, SvgExportFlag.NoPrettyXML)
  }
  if (type === 'pdf') {
    throw new Error(
      'createCanvas with type "pdf" is not supported. Use the PDFDocument class from @napi-rs/canvas directly.',
    )
  }
  if (type != null && type !== 'image') {
    throw new TypeError(`createCanvas: unknown type "${type}". Supported types: "image", "svg".`)
  }
  return _addCompatMethods(_createCanvas(width, height))
}

/**
 * Create an ImageData instance.
 * Compatible with node-canvas's createImageData().
 *
 * @param {Uint8ClampedArray|number} dataOrWidth
 * @param {number} widthOrHeight
 * @param {number} [height]
 * @returns {ImageData}
 */
function createImageData(dataOrWidth, widthOrHeight, height) {
  if (typeof dataOrWidth === 'number') {
    return new ImageData(dataOrWidth, widthOrHeight)
  }
  if (height != null) {
    return new ImageData(dataOrWidth, widthOrHeight, height)
  }
  return new ImageData(dataOrWidth, widthOrHeight)
}

// ---------------------------------------------------------------------------
// Canvas constructor wrapper
// ---------------------------------------------------------------------------

// In node-canvas, `new Canvas(w, h)` and `createCanvas(w, h)` produce
// equivalent canvases. Wrap the native Canvas constructor so that
// `new Canvas(w, h)` also gets compat methods, without polluting the
// prototype (which would affect @napi-rs/canvas users who don't use
// this compat layer).
const CompatCanvas = new Proxy(Canvas, {
  construct(target, args) {
    const canvas = new target(...args)
    if (canvas instanceof CanvasElement) {
      return _addCompatMethods(canvas)
    }
    return canvas
  },
})

// ---------------------------------------------------------------------------
// Exports (matches node-canvas export shape)
// ---------------------------------------------------------------------------

module.exports = {
  // Factory functions
  Canvas: CompatCanvas,
  createCanvas,
  createImageData,
  loadImage,
  registerFont,
  deregisterAllFonts,

  // Classes
  Image,
  ImageData,
  CanvasRenderingContext2D,
  Context2d: CanvasRenderingContext2D,
  PNGStream,
  JPEGStream,
  Path2D,

  // Geometry
  DOMPoint,
  DOMMatrix,
  DOMRect,

  // @napi-rs/canvas extras (available but not part of node-canvas)
  GlobalFonts,
  PDFDocument,
  CanvasElement,
  SVGCanvas,
}
