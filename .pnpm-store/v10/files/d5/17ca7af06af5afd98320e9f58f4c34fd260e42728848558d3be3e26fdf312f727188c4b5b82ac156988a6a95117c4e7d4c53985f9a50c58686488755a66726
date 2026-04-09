const { platform, homedir } = require('os')
const { join } = require('path')

const {
  clearAllCache,
  CanvasRenderingContext2D,
  CanvasElement,
  SVGCanvas,
  Path: Path2D,
  ImageData,
  Image,
  FontKey,
  GlobalFonts,
  PathOp,
  FillType,
  StrokeJoin,
  StrokeCap,
  convertSVGTextToPath,
  PdfDocument,
  GifEncoder,
  GifDisposal,
  LottieAnimation,
} = require('./js-binding')

const { DOMPoint, DOMMatrix, DOMRect } = require('./geometry')

const loadImage = require('./load-image')

// Add Symbol.dispose support for GifEncoder (ECMAScript 2024 Explicit Resource Management)
if (GifEncoder && typeof Symbol.dispose !== 'undefined') {
  GifEncoder.prototype[Symbol.dispose] = function () {
    this.dispose()
  }
}

const SvgExportFlag = {
  ConvertTextToPaths: 0x01,
  NoPrettyXML: 0x02,
  RelativePathEncoding: 0x04,
}

if (!('families' in GlobalFonts)) {
  Object.defineProperty(GlobalFonts, 'families', {
    get: function () {
      return JSON.parse(GlobalFonts.getFamilies().toString())
    },
  })
}

if (!('has' in GlobalFonts)) {
  Object.defineProperty(GlobalFonts, 'has', {
    value: function has(name) {
      return !!JSON.parse(GlobalFonts.getFamilies().toString()).find(({ family }) => family === name)
    },
    configurable: false,
    enumerable: false,
    writable: false,
  })
}

const _toBlob = CanvasElement.prototype.toBlob
const _convertToBlob = CanvasElement.prototype.convertToBlob
if ('Blob' in globalThis) {
  CanvasElement.prototype.toBlob = function toBlob(callback, mimeType, quality) {
    _toBlob.call(
      this,
      function (/** @type {Uint8Array} */ imageBuffer) {
        const blob = new Blob([imageBuffer.buffer], { type: mimeType })
        callback(blob)
      },
      mimeType,
      quality,
    )
  }
  CanvasElement.prototype.convertToBlob = function convertToBlob(options) {
    return _convertToBlob.call(this, options).then((/** @type {Uint8Array} */ imageBuffer) => {
      const blob = new Blob([imageBuffer.buffer], { type: options?.mime || 'image/png' })
      return blob
    })
  }
} else {
  // oxlint-disable-next-line no-unused-vars
  CanvasElement.prototype.toBlob = function toBlob(callback, mimeType, quality) {
    callback(null)
  }
  // oxlint-disable-next-line no-unused-vars
  CanvasElement.prototype.convertToBlob = function convertToBlob(options) {
    return Promise.reject(new Error('Blob is not supported in this environment'))
  }
}

const _getTransform = CanvasRenderingContext2D.prototype.getTransform

CanvasRenderingContext2D.prototype.getTransform = function getTransform() {
  const transform = _getTransform.apply(this, arguments)
  // monkey patched, skip
  if (transform instanceof DOMMatrix) {
    return transform
  }
  const { a, b, c, d, e, f } = transform
  return new DOMMatrix([a, b, c, d, e, f])
}

// Workaround for webpack bundling issue with drawImage
// Store the original drawImage method
const _drawImage = CanvasRenderingContext2D.prototype.drawImage

// Override drawImage to ensure proper type recognition in bundled environments
CanvasRenderingContext2D.prototype.drawImage = function drawImage(image, ...args) {
  // If the image is a Canvas-like object but not recognized due to bundling,
  // we need to ensure it's properly identified
  if (image && typeof image === 'object') {
    // First check if it's a wrapped canvas object
    if (image.canvas instanceof CanvasElement || image.canvas instanceof SVGCanvas) {
      image = image.canvas
    } else if (image._canvas instanceof CanvasElement || image._canvas instanceof SVGCanvas) {
      image = image._canvas
    }
    // Then check if it's a Canvas-like object by checking for getContext method
    else if (typeof image.getContext === 'function' && image.width && image.height) {
      // If it has canvas properties but isn't recognized as CanvasElement or SVGCanvas,
      // try to correct the prototype chain
      if (!(image instanceof CanvasElement) && !(image instanceof SVGCanvas)) {
        // Try to create a proper CanvasElement from the canvas-like object
        // This helps when webpack has transformed the prototype chain
        Object.setPrototypeOf(image, CanvasElement.prototype)
      }
    }
  }

  // Call the original drawImage with the potentially corrected image
  return _drawImage.apply(this, [image, ...args])
}

function createCanvas(width, height, flag) {
  const isSvgBackend = typeof flag !== 'undefined'
  return isSvgBackend ? new SVGCanvas(width, height, flag) : new CanvasElement(width, height)
}

class Canvas {
  constructor(width, height, flag) {
    return createCanvas(width, height, flag)
  }

  static [Symbol.hasInstance](instance) {
    return instance instanceof CanvasElement || instance instanceof SVGCanvas
  }
}

if (!process.env.DISABLE_SYSTEM_FONTS_LOAD) {
  GlobalFonts.loadSystemFonts()
  const platformName = platform()
  const homedirPath = homedir()
  switch (platformName) {
    case 'win32':
      GlobalFonts.loadFontsFromDir(join(homedirPath, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'))
      break
    case 'darwin':
      GlobalFonts.loadFontsFromDir(join(homedirPath, 'Library', 'Fonts'))
      break
    case 'linux':
      GlobalFonts.loadFontsFromDir(join('usr', 'local', 'share', 'fonts'))
      GlobalFonts.loadFontsFromDir(join(homedirPath, '.fonts'))
      break
  }
}

module.exports = {
  clearAllCache,
  Canvas,
  createCanvas,
  Path2D,
  ImageData,
  Image,
  PathOp,
  FillType,
  StrokeCap,
  StrokeJoin,
  SvgExportFlag,
  GlobalFonts: GlobalFonts,
  convertSVGTextToPath,
  DOMPoint,
  DOMMatrix,
  DOMRect,
  loadImage,
  FontKey,
  // Export these for better webpack compatibility
  CanvasElement,
  SVGCanvas,
  PDFDocument: PdfDocument,
  // GIF encoding
  GifEncoder,
  GifDisposal,
  // Lottie animation
  LottieAnimation,
}
