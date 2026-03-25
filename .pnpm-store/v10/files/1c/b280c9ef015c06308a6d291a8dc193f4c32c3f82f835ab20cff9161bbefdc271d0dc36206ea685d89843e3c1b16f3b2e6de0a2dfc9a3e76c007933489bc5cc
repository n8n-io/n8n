/* Copyright 2017 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("pdfjs-dist/build/pdf", [], factory);
	else if(typeof exports === 'object')
		exports["pdfjs-dist/build/pdf"] = factory();
	else
		root["pdfjs-dist/build/pdf"] = root.pdfjsDistBuildPdf = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __w_pdfjs_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __w_pdfjs_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__w_pdfjs_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__w_pdfjs_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__w_pdfjs_require__.d = function(exports, name, getter) {
/******/ 		if(!__w_pdfjs_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__w_pdfjs_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__w_pdfjs_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__w_pdfjs_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__w_pdfjs_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __w_pdfjs_require__(__w_pdfjs_require__.s = 75);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unreachable = exports.warn = exports.utf8StringToString = exports.stringToUTF8String = exports.stringToPDFString = exports.stringToBytes = exports.string32 = exports.shadow = exports.setVerbosityLevel = exports.ReadableStream = exports.removeNullCharacters = exports.readUint32 = exports.readUint16 = exports.readInt8 = exports.log2 = exports.loadJpegStream = exports.isEvalSupported = exports.isLittleEndian = exports.createValidAbsoluteUrl = exports.isSameOrigin = exports.isNodeJS = exports.isSpace = exports.isString = exports.isNum = exports.isEmptyObj = exports.isBool = exports.isArrayBuffer = exports.info = exports.getVerbosityLevel = exports.getLookupTableFactory = exports.deprecated = exports.createObjectURL = exports.createPromiseCapability = exports.createBlob = exports.bytesToString = exports.assert = exports.arraysToBytes = exports.arrayByteLength = exports.FormatError = exports.XRefParseException = exports.Util = exports.UnknownErrorException = exports.UnexpectedResponseException = exports.TextRenderingMode = exports.StreamType = exports.StatTimer = exports.PasswordResponses = exports.PasswordException = exports.PageViewport = exports.NotImplementedException = exports.NativeImageDecoding = exports.MissingPDFException = exports.MissingDataException = exports.MessageHandler = exports.InvalidPDFException = exports.AbortException = exports.CMapCompressionType = exports.ImageKind = exports.FontType = exports.AnnotationType = exports.AnnotationFlag = exports.AnnotationFieldFlag = exports.AnnotationBorderStyleType = exports.UNSUPPORTED_FEATURES = exports.VERBOSITY_LEVELS = exports.OPS = exports.IDENTITY_MATRIX = exports.FONT_IDENTITY_MATRIX = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

__w_pdfjs_require__(76);

var _streams_polyfill = __w_pdfjs_require__(115);

var FONT_IDENTITY_MATRIX = [0.001, 0, 0, 0.001, 0, 0];
var NativeImageDecoding = {
  NONE: 'none',
  DECODE: 'decode',
  DISPLAY: 'display'
};
var TextRenderingMode = {
  FILL: 0,
  STROKE: 1,
  FILL_STROKE: 2,
  INVISIBLE: 3,
  FILL_ADD_TO_PATH: 4,
  STROKE_ADD_TO_PATH: 5,
  FILL_STROKE_ADD_TO_PATH: 6,
  ADD_TO_PATH: 7,
  FILL_STROKE_MASK: 3,
  ADD_TO_PATH_FLAG: 4
};
var ImageKind = {
  GRAYSCALE_1BPP: 1,
  RGB_24BPP: 2,
  RGBA_32BPP: 3
};
var AnnotationType = {
  TEXT: 1,
  LINK: 2,
  FREETEXT: 3,
  LINE: 4,
  SQUARE: 5,
  CIRCLE: 6,
  POLYGON: 7,
  POLYLINE: 8,
  HIGHLIGHT: 9,
  UNDERLINE: 10,
  SQUIGGLY: 11,
  STRIKEOUT: 12,
  STAMP: 13,
  CARET: 14,
  INK: 15,
  POPUP: 16,
  FILEATTACHMENT: 17,
  SOUND: 18,
  MOVIE: 19,
  WIDGET: 20,
  SCREEN: 21,
  PRINTERMARK: 22,
  TRAPNET: 23,
  WATERMARK: 24,
  THREED: 25,
  REDACT: 26
};
var AnnotationFlag = {
  INVISIBLE: 0x01,
  HIDDEN: 0x02,
  PRINT: 0x04,
  NOZOOM: 0x08,
  NOROTATE: 0x10,
  NOVIEW: 0x20,
  READONLY: 0x40,
  LOCKED: 0x80,
  TOGGLENOVIEW: 0x100,
  LOCKEDCONTENTS: 0x200
};
var AnnotationFieldFlag = {
  READONLY: 0x0000001,
  REQUIRED: 0x0000002,
  NOEXPORT: 0x0000004,
  MULTILINE: 0x0001000,
  PASSWORD: 0x0002000,
  NOTOGGLETOOFF: 0x0004000,
  RADIO: 0x0008000,
  PUSHBUTTON: 0x0010000,
  COMBO: 0x0020000,
  EDIT: 0x0040000,
  SORT: 0x0080000,
  FILESELECT: 0x0100000,
  MULTISELECT: 0x0200000,
  DONOTSPELLCHECK: 0x0400000,
  DONOTSCROLL: 0x0800000,
  COMB: 0x1000000,
  RICHTEXT: 0x2000000,
  RADIOSINUNISON: 0x2000000,
  COMMITONSELCHANGE: 0x4000000
};
var AnnotationBorderStyleType = {
  SOLID: 1,
  DASHED: 2,
  BEVELED: 3,
  INSET: 4,
  UNDERLINE: 5
};
var StreamType = {
  UNKNOWN: 0,
  FLATE: 1,
  LZW: 2,
  DCT: 3,
  JPX: 4,
  JBIG: 5,
  A85: 6,
  AHX: 7,
  CCF: 8,
  RL: 9
};
var FontType = {
  UNKNOWN: 0,
  TYPE1: 1,
  TYPE1C: 2,
  CIDFONTTYPE0: 3,
  CIDFONTTYPE0C: 4,
  TRUETYPE: 5,
  CIDFONTTYPE2: 6,
  TYPE3: 7,
  OPENTYPE: 8,
  TYPE0: 9,
  MMTYPE1: 10
};
var VERBOSITY_LEVELS = {
  errors: 0,
  warnings: 1,
  infos: 5
};
var CMapCompressionType = {
  NONE: 0,
  BINARY: 1,
  STREAM: 2
};
var OPS = {
  dependency: 1,
  setLineWidth: 2,
  setLineCap: 3,
  setLineJoin: 4,
  setMiterLimit: 5,
  setDash: 6,
  setRenderingIntent: 7,
  setFlatness: 8,
  setGState: 9,
  save: 10,
  restore: 11,
  transform: 12,
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  curveTo2: 16,
  curveTo3: 17,
  closePath: 18,
  rectangle: 19,
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  clip: 29,
  eoClip: 30,
  beginText: 31,
  endText: 32,
  setCharSpacing: 33,
  setWordSpacing: 34,
  setHScale: 35,
  setLeading: 36,
  setFont: 37,
  setTextRenderingMode: 38,
  setTextRise: 39,
  moveText: 40,
  setLeadingMoveText: 41,
  setTextMatrix: 42,
  nextLine: 43,
  showText: 44,
  showSpacedText: 45,
  nextLineShowText: 46,
  nextLineSetSpacingShowText: 47,
  setCharWidth: 48,
  setCharWidthAndBounds: 49,
  setStrokeColorSpace: 50,
  setFillColorSpace: 51,
  setStrokeColor: 52,
  setStrokeColorN: 53,
  setFillColor: 54,
  setFillColorN: 55,
  setStrokeGray: 56,
  setFillGray: 57,
  setStrokeRGBColor: 58,
  setFillRGBColor: 59,
  setStrokeCMYKColor: 60,
  setFillCMYKColor: 61,
  shadingFill: 62,
  beginInlineImage: 63,
  beginImageData: 64,
  endInlineImage: 65,
  paintXObject: 66,
  markPoint: 67,
  markPointProps: 68,
  beginMarkedContent: 69,
  beginMarkedContentProps: 70,
  endMarkedContent: 71,
  beginCompat: 72,
  endCompat: 73,
  paintFormXObjectBegin: 74,
  paintFormXObjectEnd: 75,
  beginGroup: 76,
  endGroup: 77,
  beginAnnotations: 78,
  endAnnotations: 79,
  beginAnnotation: 80,
  endAnnotation: 81,
  paintJpegXObject: 82,
  paintImageMaskXObject: 83,
  paintImageMaskXObjectGroup: 84,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintInlineImageXObjectGroup: 87,
  paintImageXObjectRepeat: 88,
  paintImageMaskXObjectRepeat: 89,
  paintSolidColorImageMask: 90,
  constructPath: 91
};
var verbosity = VERBOSITY_LEVELS.warnings;
function setVerbosityLevel(level) {
  verbosity = level;
}
function getVerbosityLevel() {
  return verbosity;
}
function info(msg) {
  if (verbosity >= VERBOSITY_LEVELS.infos) {
    console.log('Info: ' + msg);
  }
}
function warn(msg) {
  if (verbosity >= VERBOSITY_LEVELS.warnings) {
    console.log('Warning: ' + msg);
  }
}
function deprecated(details) {
  console.log('Deprecated API usage: ' + details);
}
function unreachable(msg) {
  throw new Error(msg);
}
function assert(cond, msg) {
  if (!cond) {
    unreachable(msg);
  }
}
var UNSUPPORTED_FEATURES = {
  unknown: 'unknown',
  forms: 'forms',
  javaScript: 'javaScript',
  smask: 'smask',
  shadingPattern: 'shadingPattern',
  font: 'font'
};
function isSameOrigin(baseUrl, otherUrl) {
  try {
    var base = new URL(baseUrl);
    if (!base.origin || base.origin === 'null') {
      return false;
    }
  } catch (e) {
    return false;
  }
  var other = new URL(otherUrl, base);
  return base.origin === other.origin;
}
function isValidProtocol(url) {
  if (!url) {
    return false;
  }
  switch (url.protocol) {
    case 'http:':
    case 'https:':
    case 'ftp:':
    case 'mailto:':
    case 'tel:':
      return true;
    default:
      return false;
  }
}
function createValidAbsoluteUrl(url, baseUrl) {
  if (!url) {
    return null;
  }
  try {
    var absoluteUrl = baseUrl ? new URL(url, baseUrl) : new URL(url);
    if (isValidProtocol(absoluteUrl)) {
      return absoluteUrl;
    }
  } catch (ex) {}
  return null;
}
function shadow(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    value: value,
    enumerable: true,
    configurable: true,
    writable: false
  });
  return value;
}
function getLookupTableFactory(initializer) {
  var lookup;
  return function () {
    if (initializer) {
      lookup = Object.create(null);
      initializer(lookup);
      initializer = null;
    }
    return lookup;
  };
}
var PasswordResponses = {
  NEED_PASSWORD: 1,
  INCORRECT_PASSWORD: 2
};
var PasswordException = function PasswordExceptionClosure() {
  function PasswordException(msg, code) {
    this.name = 'PasswordException';
    this.message = msg;
    this.code = code;
  }
  PasswordException.prototype = new Error();
  PasswordException.constructor = PasswordException;
  return PasswordException;
}();
var UnknownErrorException = function UnknownErrorExceptionClosure() {
  function UnknownErrorException(msg, details) {
    this.name = 'UnknownErrorException';
    this.message = msg;
    this.details = details;
  }
  UnknownErrorException.prototype = new Error();
  UnknownErrorException.constructor = UnknownErrorException;
  return UnknownErrorException;
}();
var InvalidPDFException = function InvalidPDFExceptionClosure() {
  function InvalidPDFException(msg) {
    this.name = 'InvalidPDFException';
    this.message = msg;
  }
  InvalidPDFException.prototype = new Error();
  InvalidPDFException.constructor = InvalidPDFException;
  return InvalidPDFException;
}();
var MissingPDFException = function MissingPDFExceptionClosure() {
  function MissingPDFException(msg) {
    this.name = 'MissingPDFException';
    this.message = msg;
  }
  MissingPDFException.prototype = new Error();
  MissingPDFException.constructor = MissingPDFException;
  return MissingPDFException;
}();
var UnexpectedResponseException = function UnexpectedResponseExceptionClosure() {
  function UnexpectedResponseException(msg, status) {
    this.name = 'UnexpectedResponseException';
    this.message = msg;
    this.status = status;
  }
  UnexpectedResponseException.prototype = new Error();
  UnexpectedResponseException.constructor = UnexpectedResponseException;
  return UnexpectedResponseException;
}();
var NotImplementedException = function NotImplementedExceptionClosure() {
  function NotImplementedException(msg) {
    this.message = msg;
  }
  NotImplementedException.prototype = new Error();
  NotImplementedException.prototype.name = 'NotImplementedException';
  NotImplementedException.constructor = NotImplementedException;
  return NotImplementedException;
}();
var MissingDataException = function MissingDataExceptionClosure() {
  function MissingDataException(begin, end) {
    this.begin = begin;
    this.end = end;
    this.message = 'Missing data [' + begin + ', ' + end + ')';
  }
  MissingDataException.prototype = new Error();
  MissingDataException.prototype.name = 'MissingDataException';
  MissingDataException.constructor = MissingDataException;
  return MissingDataException;
}();
var XRefParseException = function XRefParseExceptionClosure() {
  function XRefParseException(msg) {
    this.message = msg;
  }
  XRefParseException.prototype = new Error();
  XRefParseException.prototype.name = 'XRefParseException';
  XRefParseException.constructor = XRefParseException;
  return XRefParseException;
}();
var FormatError = function FormatErrorClosure() {
  function FormatError(msg) {
    this.message = msg;
  }
  FormatError.prototype = new Error();
  FormatError.prototype.name = 'FormatError';
  FormatError.constructor = FormatError;
  return FormatError;
}();
var AbortException = function AbortExceptionClosure() {
  function AbortException(msg) {
    this.name = 'AbortException';
    this.message = msg;
  }
  AbortException.prototype = new Error();
  AbortException.constructor = AbortException;
  return AbortException;
}();
var NullCharactersRegExp = /\x00/g;
function removeNullCharacters(str) {
  if (typeof str !== 'string') {
    warn('The argument for removeNullCharacters must be a string.');
    return str;
  }
  return str.replace(NullCharactersRegExp, '');
}
function bytesToString(bytes) {
  assert(bytes !== null && (typeof bytes === 'undefined' ? 'undefined' : _typeof(bytes)) === 'object' && bytes.length !== undefined, 'Invalid argument for bytesToString');
  var length = bytes.length;
  var MAX_ARGUMENT_COUNT = 8192;
  if (length < MAX_ARGUMENT_COUNT) {
    return String.fromCharCode.apply(null, bytes);
  }
  var strBuf = [];
  for (var i = 0; i < length; i += MAX_ARGUMENT_COUNT) {
    var chunkEnd = Math.min(i + MAX_ARGUMENT_COUNT, length);
    var chunk = bytes.subarray(i, chunkEnd);
    strBuf.push(String.fromCharCode.apply(null, chunk));
  }
  return strBuf.join('');
}
function stringToBytes(str) {
  assert(typeof str === 'string', 'Invalid argument for stringToBytes');
  var length = str.length;
  var bytes = new Uint8Array(length);
  for (var i = 0; i < length; ++i) {
    bytes[i] = str.charCodeAt(i) & 0xFF;
  }
  return bytes;
}
function arrayByteLength(arr) {
  if (arr.length !== undefined) {
    return arr.length;
  }
  assert(arr.byteLength !== undefined);
  return arr.byteLength;
}
function arraysToBytes(arr) {
  if (arr.length === 1 && arr[0] instanceof Uint8Array) {
    return arr[0];
  }
  var resultLength = 0;
  var i,
      ii = arr.length;
  var item, itemLength;
  for (i = 0; i < ii; i++) {
    item = arr[i];
    itemLength = arrayByteLength(item);
    resultLength += itemLength;
  }
  var pos = 0;
  var data = new Uint8Array(resultLength);
  for (i = 0; i < ii; i++) {
    item = arr[i];
    if (!(item instanceof Uint8Array)) {
      if (typeof item === 'string') {
        item = stringToBytes(item);
      } else {
        item = new Uint8Array(item);
      }
    }
    itemLength = item.byteLength;
    data.set(item, pos);
    pos += itemLength;
  }
  return data;
}
function string32(value) {
  return String.fromCharCode(value >> 24 & 0xff, value >> 16 & 0xff, value >> 8 & 0xff, value & 0xff);
}
function log2(x) {
  var n = 1,
      i = 0;
  while (x > n) {
    n <<= 1;
    i++;
  }
  return i;
}
function readInt8(data, start) {
  return data[start] << 24 >> 24;
}
function readUint16(data, offset) {
  return data[offset] << 8 | data[offset + 1];
}
function readUint32(data, offset) {
  return (data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3]) >>> 0;
}
function isLittleEndian() {
  var buffer8 = new Uint8Array(4);
  buffer8[0] = 1;
  var view32 = new Uint32Array(buffer8.buffer, 0, 1);
  return view32[0] === 1;
}
function isEvalSupported() {
  try {
    new Function('');
    return true;
  } catch (e) {
    return false;
  }
}
var IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];
var Util = function UtilClosure() {
  function Util() {}
  var rgbBuf = ['rgb(', 0, ',', 0, ',', 0, ')'];
  Util.makeCssRgb = function Util_makeCssRgb(r, g, b) {
    rgbBuf[1] = r;
    rgbBuf[3] = g;
    rgbBuf[5] = b;
    return rgbBuf.join('');
  };
  Util.transform = function Util_transform(m1, m2) {
    return [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1], m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3], m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
  };
  Util.applyTransform = function Util_applyTransform(p, m) {
    var xt = p[0] * m[0] + p[1] * m[2] + m[4];
    var yt = p[0] * m[1] + p[1] * m[3] + m[5];
    return [xt, yt];
  };
  Util.applyInverseTransform = function Util_applyInverseTransform(p, m) {
    var d = m[0] * m[3] - m[1] * m[2];
    var xt = (p[0] * m[3] - p[1] * m[2] + m[2] * m[5] - m[4] * m[3]) / d;
    var yt = (-p[0] * m[1] + p[1] * m[0] + m[4] * m[1] - m[5] * m[0]) / d;
    return [xt, yt];
  };
  Util.getAxialAlignedBoundingBox = function Util_getAxialAlignedBoundingBox(r, m) {
    var p1 = Util.applyTransform(r, m);
    var p2 = Util.applyTransform(r.slice(2, 4), m);
    var p3 = Util.applyTransform([r[0], r[3]], m);
    var p4 = Util.applyTransform([r[2], r[1]], m);
    return [Math.min(p1[0], p2[0], p3[0], p4[0]), Math.min(p1[1], p2[1], p3[1], p4[1]), Math.max(p1[0], p2[0], p3[0], p4[0]), Math.max(p1[1], p2[1], p3[1], p4[1])];
  };
  Util.inverseTransform = function Util_inverseTransform(m) {
    var d = m[0] * m[3] - m[1] * m[2];
    return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[4] * m[3]) / d, (m[4] * m[1] - m[5] * m[0]) / d];
  };
  Util.apply3dTransform = function Util_apply3dTransform(m, v) {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  };
  Util.singularValueDecompose2dScale = function Util_singularValueDecompose2dScale(m) {
    var transpose = [m[0], m[2], m[1], m[3]];
    var a = m[0] * transpose[0] + m[1] * transpose[2];
    var b = m[0] * transpose[1] + m[1] * transpose[3];
    var c = m[2] * transpose[0] + m[3] * transpose[2];
    var d = m[2] * transpose[1] + m[3] * transpose[3];
    var first = (a + d) / 2;
    var second = Math.sqrt((a + d) * (a + d) - 4 * (a * d - c * b)) / 2;
    var sx = first + second || 1;
    var sy = first - second || 1;
    return [Math.sqrt(sx), Math.sqrt(sy)];
  };
  Util.normalizeRect = function Util_normalizeRect(rect) {
    var r = rect.slice(0);
    if (rect[0] > rect[2]) {
      r[0] = rect[2];
      r[2] = rect[0];
    }
    if (rect[1] > rect[3]) {
      r[1] = rect[3];
      r[3] = rect[1];
    }
    return r;
  };
  Util.intersect = function Util_intersect(rect1, rect2) {
    function compare(a, b) {
      return a - b;
    }
    var orderedX = [rect1[0], rect1[2], rect2[0], rect2[2]].sort(compare),
        orderedY = [rect1[1], rect1[3], rect2[1], rect2[3]].sort(compare),
        result = [];
    rect1 = Util.normalizeRect(rect1);
    rect2 = Util.normalizeRect(rect2);
    if (orderedX[0] === rect1[0] && orderedX[1] === rect2[0] || orderedX[0] === rect2[0] && orderedX[1] === rect1[0]) {
      result[0] = orderedX[1];
      result[2] = orderedX[2];
    } else {
      return false;
    }
    if (orderedY[0] === rect1[1] && orderedY[1] === rect2[1] || orderedY[0] === rect2[1] && orderedY[1] === rect1[1]) {
      result[1] = orderedY[1];
      result[3] = orderedY[2];
    } else {
      return false;
    }
    return result;
  };
  var ROMAN_NUMBER_MAP = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM', '', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC', '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  Util.toRoman = function Util_toRoman(number, lowerCase) {
    assert(Number.isInteger(number) && number > 0, 'The number should be a positive integer.');
    var pos,
        romanBuf = [];
    while (number >= 1000) {
      number -= 1000;
      romanBuf.push('M');
    }
    pos = number / 100 | 0;
    number %= 100;
    romanBuf.push(ROMAN_NUMBER_MAP[pos]);
    pos = number / 10 | 0;
    number %= 10;
    romanBuf.push(ROMAN_NUMBER_MAP[10 + pos]);
    romanBuf.push(ROMAN_NUMBER_MAP[20 + number]);
    var romanStr = romanBuf.join('');
    return lowerCase ? romanStr.toLowerCase() : romanStr;
  };
  Util.appendToArray = function Util_appendToArray(arr1, arr2) {
    Array.prototype.push.apply(arr1, arr2);
  };
  Util.prependToArray = function Util_prependToArray(arr1, arr2) {
    Array.prototype.unshift.apply(arr1, arr2);
  };
  Util.extendObj = function extendObj(obj1, obj2) {
    for (var key in obj2) {
      obj1[key] = obj2[key];
    }
  };
  Util.getInheritableProperty = function Util_getInheritableProperty(dict, name, getArray) {
    while (dict && !dict.has(name)) {
      dict = dict.get('Parent');
    }
    if (!dict) {
      return null;
    }
    return getArray ? dict.getArray(name) : dict.get(name);
  };
  Util.inherit = function Util_inherit(sub, base, prototype) {
    sub.prototype = Object.create(base.prototype);
    sub.prototype.constructor = sub;
    for (var prop in prototype) {
      sub.prototype[prop] = prototype[prop];
    }
  };
  Util.loadScript = function Util_loadScript(src, callback) {
    var script = document.createElement('script');
    var loaded = false;
    script.setAttribute('src', src);
    if (callback) {
      script.onload = function () {
        if (!loaded) {
          callback();
        }
        loaded = true;
      };
    }
    document.getElementsByTagName('head')[0].appendChild(script);
  };
  return Util;
}();
var PageViewport = function PageViewportClosure() {
  function PageViewport(viewBox, scale, rotation, offsetX, offsetY, dontFlip) {
    this.viewBox = viewBox;
    this.scale = scale;
    this.rotation = rotation;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    var centerX = (viewBox[2] + viewBox[0]) / 2;
    var centerY = (viewBox[3] + viewBox[1]) / 2;
    var rotateA, rotateB, rotateC, rotateD;
    rotation = rotation % 360;
    rotation = rotation < 0 ? rotation + 360 : rotation;
    switch (rotation) {
      case 180:
        rotateA = -1;
        rotateB = 0;
        rotateC = 0;
        rotateD = 1;
        break;
      case 90:
        rotateA = 0;
        rotateB = 1;
        rotateC = 1;
        rotateD = 0;
        break;
      case 270:
        rotateA = 0;
        rotateB = -1;
        rotateC = -1;
        rotateD = 0;
        break;
      default:
        rotateA = 1;
        rotateB = 0;
        rotateC = 0;
        rotateD = -1;
        break;
    }
    if (dontFlip) {
      rotateC = -rotateC;
      rotateD = -rotateD;
    }
    var offsetCanvasX, offsetCanvasY;
    var width, height;
    if (rotateA === 0) {
      offsetCanvasX = Math.abs(centerY - viewBox[1]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerX - viewBox[0]) * scale + offsetY;
      width = Math.abs(viewBox[3] - viewBox[1]) * scale;
      height = Math.abs(viewBox[2] - viewBox[0]) * scale;
    } else {
      offsetCanvasX = Math.abs(centerX - viewBox[0]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerY - viewBox[1]) * scale + offsetY;
      width = Math.abs(viewBox[2] - viewBox[0]) * scale;
      height = Math.abs(viewBox[3] - viewBox[1]) * scale;
    }
    this.transform = [rotateA * scale, rotateB * scale, rotateC * scale, rotateD * scale, offsetCanvasX - rotateA * scale * centerX - rotateC * scale * centerY, offsetCanvasY - rotateB * scale * centerX - rotateD * scale * centerY];
    this.width = width;
    this.height = height;
    this.fontScale = scale;
  }
  PageViewport.prototype = {
    clone: function PageViewPort_clone(args) {
      args = args || {};
      var scale = 'scale' in args ? args.scale : this.scale;
      var rotation = 'rotation' in args ? args.rotation : this.rotation;
      return new PageViewport(this.viewBox.slice(), scale, rotation, this.offsetX, this.offsetY, args.dontFlip);
    },
    convertToViewportPoint: function PageViewport_convertToViewportPoint(x, y) {
      return Util.applyTransform([x, y], this.transform);
    },
    convertToViewportRectangle: function PageViewport_convertToViewportRectangle(rect) {
      var tl = Util.applyTransform([rect[0], rect[1]], this.transform);
      var br = Util.applyTransform([rect[2], rect[3]], this.transform);
      return [tl[0], tl[1], br[0], br[1]];
    },
    convertToPdfPoint: function PageViewport_convertToPdfPoint(x, y) {
      return Util.applyInverseTransform([x, y], this.transform);
    }
  };
  return PageViewport;
}();
var PDFStringTranslateTable = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x2D8, 0x2C7, 0x2C6, 0x2D9, 0x2DD, 0x2DB, 0x2DA, 0x2DC, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x2022, 0x2020, 0x2021, 0x2026, 0x2014, 0x2013, 0x192, 0x2044, 0x2039, 0x203A, 0x2212, 0x2030, 0x201E, 0x201C, 0x201D, 0x2018, 0x2019, 0x201A, 0x2122, 0xFB01, 0xFB02, 0x141, 0x152, 0x160, 0x178, 0x17D, 0x131, 0x142, 0x153, 0x161, 0x17E, 0, 0x20AC];
function stringToPDFString(str) {
  var i,
      n = str.length,
      strBuf = [];
  if (str[0] === '\xFE' && str[1] === '\xFF') {
    for (i = 2; i < n; i += 2) {
      strBuf.push(String.fromCharCode(str.charCodeAt(i) << 8 | str.charCodeAt(i + 1)));
    }
  } else {
    for (i = 0; i < n; ++i) {
      var code = PDFStringTranslateTable[str.charCodeAt(i)];
      strBuf.push(code ? String.fromCharCode(code) : str.charAt(i));
    }
  }
  return strBuf.join('');
}
function stringToUTF8String(str) {
  return decodeURIComponent(escape(str));
}
function utf8StringToString(str) {
  return unescape(encodeURIComponent(str));
}
function isEmptyObj(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
}
function isBool(v) {
  return typeof v === 'boolean';
}
function isNum(v) {
  return typeof v === 'number';
}
function isString(v) {
  return typeof v === 'string';
}
function isArrayBuffer(v) {
  return (typeof v === 'undefined' ? 'undefined' : _typeof(v)) === 'object' && v !== null && v.byteLength !== undefined;
}
function isSpace(ch) {
  return ch === 0x20 || ch === 0x09 || ch === 0x0D || ch === 0x0A;
}
function isNodeJS() {
  return (typeof process === 'undefined' ? 'undefined' : _typeof(process)) === 'object' && process + '' === '[object process]';
}
function createPromiseCapability() {
  var capability = {};
  capability.promise = new Promise(function (resolve, reject) {
    capability.resolve = resolve;
    capability.reject = reject;
  });
  return capability;
}
var StatTimer = function StatTimerClosure() {
  function rpad(str, pad, length) {
    while (str.length < length) {
      str += pad;
    }
    return str;
  }
  function StatTimer() {
    this.started = Object.create(null);
    this.times = [];
    this.enabled = true;
  }
  StatTimer.prototype = {
    time: function StatTimer_time(name) {
      if (!this.enabled) {
        return;
      }
      if (name in this.started) {
        warn('Timer is already running for ' + name);
      }
      this.started[name] = Date.now();
    },
    timeEnd: function StatTimer_timeEnd(name) {
      if (!this.enabled) {
        return;
      }
      if (!(name in this.started)) {
        warn('Timer has not been started for ' + name);
      }
      this.times.push({
        'name': name,
        'start': this.started[name],
        'end': Date.now()
      });
      delete this.started[name];
    },
    toString: function StatTimer_toString() {
      var i, ii;
      var times = this.times;
      var out = '';
      var longest = 0;
      for (i = 0, ii = times.length; i < ii; ++i) {
        var name = times[i]['name'];
        if (name.length > longest) {
          longest = name.length;
        }
      }
      for (i = 0, ii = times.length; i < ii; ++i) {
        var span = times[i];
        var duration = span.end - span.start;
        out += rpad(span['name'], ' ', longest) + ' ' + duration + 'ms\n';
      }
      return out;
    }
  };
  return StatTimer;
}();
var createBlob = function createBlob(data, contentType) {
  if (typeof Blob !== 'undefined') {
    return new Blob([data], { type: contentType });
  }
  throw new Error('The "Blob" constructor is not supported.');
};
var createObjectURL = function createObjectURLClosure() {
  var digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  return function createObjectURL(data, contentType) {
    var forceDataSchema = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    if (!forceDataSchema && URL.createObjectURL) {
      var blob = createBlob(data, contentType);
      return URL.createObjectURL(blob);
    }
    var buffer = 'data:' + contentType + ';base64,';
    for (var i = 0, ii = data.length; i < ii; i += 3) {
      var b1 = data[i] & 0xFF;
      var b2 = data[i + 1] & 0xFF;
      var b3 = data[i + 2] & 0xFF;
      var d1 = b1 >> 2,
          d2 = (b1 & 3) << 4 | b2 >> 4;
      var d3 = i + 1 < ii ? (b2 & 0xF) << 2 | b3 >> 6 : 64;
      var d4 = i + 2 < ii ? b3 & 0x3F : 64;
      buffer += digits[d1] + digits[d2] + digits[d3] + digits[d4];
    }
    return buffer;
  };
}();
function resolveCall(fn, args) {
  var thisArg = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  if (!fn) {
    return Promise.resolve(undefined);
  }
  return new Promise(function (resolve, reject) {
    resolve(fn.apply(thisArg, args));
  });
}
function wrapReason(reason) {
  if ((typeof reason === 'undefined' ? 'undefined' : _typeof(reason)) !== 'object') {
    return reason;
  }
  switch (reason.name) {
    case 'AbortException':
      return new AbortException(reason.message);
    case 'MissingPDFException':
      return new MissingPDFException(reason.message);
    case 'UnexpectedResponseException':
      return new UnexpectedResponseException(reason.message, reason.status);
    default:
      return new UnknownErrorException(reason.message, reason.details);
  }
}
function makeReasonSerializable(reason) {
  if (!(reason instanceof Error) || reason instanceof AbortException || reason instanceof MissingPDFException || reason instanceof UnexpectedResponseException || reason instanceof UnknownErrorException) {
    return reason;
  }
  return new UnknownErrorException(reason.message, reason.toString());
}
function resolveOrReject(capability, success, reason) {
  if (success) {
    capability.resolve();
  } else {
    capability.reject(reason);
  }
}
function finalize(promise) {
  return Promise.resolve(promise).catch(function () {});
}
function MessageHandler(sourceName, targetName, comObj) {
  var _this = this;

  this.sourceName = sourceName;
  this.targetName = targetName;
  this.comObj = comObj;
  this.callbackId = 1;
  this.streamId = 1;
  this.postMessageTransfers = true;
  this.streamSinks = Object.create(null);
  this.streamControllers = Object.create(null);
  var callbacksCapabilities = this.callbacksCapabilities = Object.create(null);
  var ah = this.actionHandler = Object.create(null);
  this._onComObjOnMessage = function (event) {
    var data = event.data;
    if (data.targetName !== _this.sourceName) {
      return;
    }
    if (data.stream) {
      _this._processStreamMessage(data);
    } else if (data.isReply) {
      var callbackId = data.callbackId;
      if (data.callbackId in callbacksCapabilities) {
        var callback = callbacksCapabilities[callbackId];
        delete callbacksCapabilities[callbackId];
        if ('error' in data) {
          callback.reject(wrapReason(data.error));
        } else {
          callback.resolve(data.data);
        }
      } else {
        throw new Error('Cannot resolve callback ' + callbackId);
      }
    } else if (data.action in ah) {
      var action = ah[data.action];
      if (data.callbackId) {
        var _sourceName = _this.sourceName;
        var _targetName = data.sourceName;
        Promise.resolve().then(function () {
          return action[0].call(action[1], data.data);
        }).then(function (result) {
          comObj.postMessage({
            sourceName: _sourceName,
            targetName: _targetName,
            isReply: true,
            callbackId: data.callbackId,
            data: result
          });
        }, function (reason) {
          comObj.postMessage({
            sourceName: _sourceName,
            targetName: _targetName,
            isReply: true,
            callbackId: data.callbackId,
            error: makeReasonSerializable(reason)
          });
        });
      } else if (data.streamId) {
        _this._createStreamSink(data);
      } else {
        action[0].call(action[1], data.data);
      }
    } else {
      throw new Error('Unknown action from worker: ' + data.action);
    }
  };
  comObj.addEventListener('message', this._onComObjOnMessage);
}
MessageHandler.prototype = {
  on: function on(actionName, handler, scope) {
    var ah = this.actionHandler;
    if (ah[actionName]) {
      throw new Error('There is already an actionName called "' + actionName + '"');
    }
    ah[actionName] = [handler, scope];
  },
  send: function send(actionName, data, transfers) {
    var message = {
      sourceName: this.sourceName,
      targetName: this.targetName,
      action: actionName,
      data: data
    };
    this.postMessage(message, transfers);
  },
  sendWithPromise: function sendWithPromise(actionName, data, transfers) {
    var callbackId = this.callbackId++;
    var message = {
      sourceName: this.sourceName,
      targetName: this.targetName,
      action: actionName,
      data: data,
      callbackId: callbackId
    };
    var capability = createPromiseCapability();
    this.callbacksCapabilities[callbackId] = capability;
    try {
      this.postMessage(message, transfers);
    } catch (e) {
      capability.reject(e);
    }
    return capability.promise;
  },
  sendWithStream: function sendWithStream(actionName, data, queueingStrategy, transfers) {
    var _this2 = this;

    var streamId = this.streamId++;
    var sourceName = this.sourceName;
    var targetName = this.targetName;
    return new _streams_polyfill.ReadableStream({
      start: function start(controller) {
        var startCapability = createPromiseCapability();
        _this2.streamControllers[streamId] = {
          controller: controller,
          startCall: startCapability,
          isClosed: false
        };
        _this2.postMessage({
          sourceName: sourceName,
          targetName: targetName,
          action: actionName,
          streamId: streamId,
          data: data,
          desiredSize: controller.desiredSize
        });
        return startCapability.promise;
      },
      pull: function pull(controller) {
        var pullCapability = createPromiseCapability();
        _this2.streamControllers[streamId].pullCall = pullCapability;
        _this2.postMessage({
          sourceName: sourceName,
          targetName: targetName,
          stream: 'pull',
          streamId: streamId,
          desiredSize: controller.desiredSize
        });
        return pullCapability.promise;
      },
      cancel: function cancel(reason) {
        var cancelCapability = createPromiseCapability();
        _this2.streamControllers[streamId].cancelCall = cancelCapability;
        _this2.streamControllers[streamId].isClosed = true;
        _this2.postMessage({
          sourceName: sourceName,
          targetName: targetName,
          stream: 'cancel',
          reason: reason,
          streamId: streamId
        });
        return cancelCapability.promise;
      }
    }, queueingStrategy);
  },
  _createStreamSink: function _createStreamSink(data) {
    var _this3 = this;

    var self = this;
    var action = this.actionHandler[data.action];
    var streamId = data.streamId;
    var desiredSize = data.desiredSize;
    var sourceName = this.sourceName;
    var targetName = data.sourceName;
    var capability = createPromiseCapability();
    var sendStreamRequest = function sendStreamRequest(_ref) {
      var stream = _ref.stream,
          chunk = _ref.chunk,
          transfers = _ref.transfers,
          success = _ref.success,
          reason = _ref.reason;

      _this3.postMessage({
        sourceName: sourceName,
        targetName: targetName,
        stream: stream,
        streamId: streamId,
        chunk: chunk,
        success: success,
        reason: reason
      }, transfers);
    };
    var streamSink = {
      enqueue: function enqueue(chunk) {
        var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
        var transfers = arguments[2];

        if (this.isCancelled) {
          return;
        }
        var lastDesiredSize = this.desiredSize;
        this.desiredSize -= size;
        if (lastDesiredSize > 0 && this.desiredSize <= 0) {
          this.sinkCapability = createPromiseCapability();
          this.ready = this.sinkCapability.promise;
        }
        sendStreamRequest({
          stream: 'enqueue',
          chunk: chunk,
          transfers: transfers
        });
      },
      close: function close() {
        if (this.isCancelled) {
          return;
        }
        this.isCancelled = true;
        sendStreamRequest({ stream: 'close' });
        delete self.streamSinks[streamId];
      },
      error: function error(reason) {
        if (this.isCancelled) {
          return;
        }
        this.isCancelled = true;
        sendStreamRequest({
          stream: 'error',
          reason: reason
        });
      },

      sinkCapability: capability,
      onPull: null,
      onCancel: null,
      isCancelled: false,
      desiredSize: desiredSize,
      ready: null
    };
    streamSink.sinkCapability.resolve();
    streamSink.ready = streamSink.sinkCapability.promise;
    this.streamSinks[streamId] = streamSink;
    resolveCall(action[0], [data.data, streamSink], action[1]).then(function () {
      sendStreamRequest({
        stream: 'start_complete',
        success: true
      });
    }, function (reason) {
      sendStreamRequest({
        stream: 'start_complete',
        success: false,
        reason: reason
      });
    });
  },
  _processStreamMessage: function _processStreamMessage(data) {
    var _this4 = this;

    var sourceName = this.sourceName;
    var targetName = data.sourceName;
    var streamId = data.streamId;
    var sendStreamResponse = function sendStreamResponse(_ref2) {
      var stream = _ref2.stream,
          success = _ref2.success,
          reason = _ref2.reason;

      _this4.comObj.postMessage({
        sourceName: sourceName,
        targetName: targetName,
        stream: stream,
        success: success,
        streamId: streamId,
        reason: reason
      });
    };
    var deleteStreamController = function deleteStreamController() {
      Promise.all([_this4.streamControllers[data.streamId].startCall, _this4.streamControllers[data.streamId].pullCall, _this4.streamControllers[data.streamId].cancelCall].map(function (capability) {
        return capability && finalize(capability.promise);
      })).then(function () {
        delete _this4.streamControllers[data.streamId];
      });
    };
    switch (data.stream) {
      case 'start_complete':
        resolveOrReject(this.streamControllers[data.streamId].startCall, data.success, wrapReason(data.reason));
        break;
      case 'pull_complete':
        resolveOrReject(this.streamControllers[data.streamId].pullCall, data.success, wrapReason(data.reason));
        break;
      case 'pull':
        if (!this.streamSinks[data.streamId]) {
          sendStreamResponse({
            stream: 'pull_complete',
            success: true
          });
          break;
        }
        if (this.streamSinks[data.streamId].desiredSize <= 0 && data.desiredSize > 0) {
          this.streamSinks[data.streamId].sinkCapability.resolve();
        }
        this.streamSinks[data.streamId].desiredSize = data.desiredSize;
        resolveCall(this.streamSinks[data.streamId].onPull).then(function () {
          sendStreamResponse({
            stream: 'pull_complete',
            success: true
          });
        }, function (reason) {
          sendStreamResponse({
            stream: 'pull_complete',
            success: false,
            reason: reason
          });
        });
        break;
      case 'enqueue':
        assert(this.streamControllers[data.streamId], 'enqueue should have stream controller');
        if (!this.streamControllers[data.streamId].isClosed) {
          this.streamControllers[data.streamId].controller.enqueue(data.chunk);
        }
        break;
      case 'close':
        assert(this.streamControllers[data.streamId], 'close should have stream controller');
        if (this.streamControllers[data.streamId].isClosed) {
          break;
        }
        this.streamControllers[data.streamId].isClosed = true;
        this.streamControllers[data.streamId].controller.close();
        deleteStreamController();
        break;
      case 'error':
        assert(this.streamControllers[data.streamId], 'error should have stream controller');
        this.streamControllers[data.streamId].controller.error(wrapReason(data.reason));
        deleteStreamController();
        break;
      case 'cancel_complete':
        resolveOrReject(this.streamControllers[data.streamId].cancelCall, data.success, wrapReason(data.reason));
        deleteStreamController();
        break;
      case 'cancel':
        if (!this.streamSinks[data.streamId]) {
          break;
        }
        resolveCall(this.streamSinks[data.streamId].onCancel, [wrapReason(data.reason)]).then(function () {
          sendStreamResponse({
            stream: 'cancel_complete',
            success: true
          });
        }, function (reason) {
          sendStreamResponse({
            stream: 'cancel_complete',
            success: false,
            reason: reason
          });
        });
        this.streamSinks[data.streamId].sinkCapability.reject(wrapReason(data.reason));
        this.streamSinks[data.streamId].isCancelled = true;
        delete this.streamSinks[data.streamId];
        break;
      default:
        throw new Error('Unexpected stream case');
    }
  },
  postMessage: function postMessage(message, transfers) {
    if (transfers && this.postMessageTransfers) {
      this.comObj.postMessage(message, transfers);
    } else {
      this.comObj.postMessage(message);
    }
  },
  destroy: function destroy() {
    this.comObj.removeEventListener('message', this._onComObjOnMessage);
  }
};
function loadJpegStream(id, imageUrl, objs) {
  var img = new Image();
  img.onload = function loadJpegStream_onloadClosure() {
    objs.resolve(id, img);
  };
  img.onerror = function loadJpegStream_onerrorClosure() {
    objs.resolve(id, null);
    warn('Error during JPEG image loading');
  };
  img.src = imageUrl;
}
exports.FONT_IDENTITY_MATRIX = FONT_IDENTITY_MATRIX;
exports.IDENTITY_MATRIX = IDENTITY_MATRIX;
exports.OPS = OPS;
exports.VERBOSITY_LEVELS = VERBOSITY_LEVELS;
exports.UNSUPPORTED_FEATURES = UNSUPPORTED_FEATURES;
exports.AnnotationBorderStyleType = AnnotationBorderStyleType;
exports.AnnotationFieldFlag = AnnotationFieldFlag;
exports.AnnotationFlag = AnnotationFlag;
exports.AnnotationType = AnnotationType;
exports.FontType = FontType;
exports.ImageKind = ImageKind;
exports.CMapCompressionType = CMapCompressionType;
exports.AbortException = AbortException;
exports.InvalidPDFException = InvalidPDFException;
exports.MessageHandler = MessageHandler;
exports.MissingDataException = MissingDataException;
exports.MissingPDFException = MissingPDFException;
exports.NativeImageDecoding = NativeImageDecoding;
exports.NotImplementedException = NotImplementedException;
exports.PageViewport = PageViewport;
exports.PasswordException = PasswordException;
exports.PasswordResponses = PasswordResponses;
exports.StatTimer = StatTimer;
exports.StreamType = StreamType;
exports.TextRenderingMode = TextRenderingMode;
exports.UnexpectedResponseException = UnexpectedResponseException;
exports.UnknownErrorException = UnknownErrorException;
exports.Util = Util;
exports.XRefParseException = XRefParseException;
exports.FormatError = FormatError;
exports.arrayByteLength = arrayByteLength;
exports.arraysToBytes = arraysToBytes;
exports.assert = assert;
exports.bytesToString = bytesToString;
exports.createBlob = createBlob;
exports.createPromiseCapability = createPromiseCapability;
exports.createObjectURL = createObjectURL;
exports.deprecated = deprecated;
exports.getLookupTableFactory = getLookupTableFactory;
exports.getVerbosityLevel = getVerbosityLevel;
exports.info = info;
exports.isArrayBuffer = isArrayBuffer;
exports.isBool = isBool;
exports.isEmptyObj = isEmptyObj;
exports.isNum = isNum;
exports.isString = isString;
exports.isSpace = isSpace;
exports.isNodeJS = isNodeJS;
exports.isSameOrigin = isSameOrigin;
exports.createValidAbsoluteUrl = createValidAbsoluteUrl;
exports.isLittleEndian = isLittleEndian;
exports.isEvalSupported = isEvalSupported;
exports.loadJpegStream = loadJpegStream;
exports.log2 = log2;
exports.readInt8 = readInt8;
exports.readUint16 = readUint16;
exports.readUint32 = readUint32;
exports.removeNullCharacters = removeNullCharacters;
exports.ReadableStream = _streams_polyfill.ReadableStream;
exports.setVerbosityLevel = setVerbosityLevel;
exports.shadow = shadow;
exports.string32 = string32;
exports.stringToBytes = stringToBytes;
exports.stringToPDFString = stringToPDFString;
exports.stringToUTF8String = stringToUTF8String;
exports.utf8StringToString = utf8StringToString;
exports.warn = warn;
exports.unreachable = unreachable;

/***/ }),
/* 1 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if (typeof __g == 'number') __g = global;

/***/ }),
/* 2 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function (it) {
  return (typeof it === 'undefined' ? 'undefined' : _typeof(it)) === 'object' ? it !== null : typeof it === 'function';
};

/***/ }),
/* 3 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var store = __w_pdfjs_require__(51)('wks');
var uid = __w_pdfjs_require__(16);
var _Symbol = __w_pdfjs_require__(1).Symbol;
var USE_SYMBOL = typeof _Symbol == 'function';
var $exports = module.exports = function (name) {
  return store[name] || (store[name] = USE_SYMBOL && _Symbol[name] || (USE_SYMBOL ? _Symbol : uid)('Symbol.' + name));
};
$exports.store = store;

/***/ }),
/* 4 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var core = __w_pdfjs_require__(5);
var hide = __w_pdfjs_require__(6);
var redefine = __w_pdfjs_require__(15);
var ctx = __w_pdfjs_require__(11);
var PROTOTYPE = 'prototype';
var $export = function $export(type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var target = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE];
  var exports = IS_GLOBAL ? core : core[name] || (core[name] = {});
  var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
  var key, own, out, exp;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    own = !IS_FORCED && target && target[key] !== undefined;
    out = (own ? target : source)[key];
    exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    if (target) redefine(target, key, out, type & $export.U);
    if (exports[key] != out) hide(exports, key, exp);
    if (IS_PROTO && expProto[key] != out) expProto[key] = out;
  }
};
global.core = core;
$export.F = 1;
$export.G = 2;
$export.S = 4;
$export.P = 8;
$export.B = 16;
$export.W = 32;
$export.U = 64;
$export.R = 128;
module.exports = $export;

/***/ }),
/* 5 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var core = module.exports = { version: '2.5.1' };
if (typeof __e == 'number') __e = core;

/***/ }),
/* 6 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var dP = __w_pdfjs_require__(14);
var createDesc = __w_pdfjs_require__(27);
module.exports = __w_pdfjs_require__(9) ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

/***/ }),
/* 7 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

/***/ }),
/* 8 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

/***/ }),
/* 9 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = !__w_pdfjs_require__(10)(function () {
  return Object.defineProperty({}, 'a', {
    get: function get() {
      return 7;
    }
  }).a != 7;
});

/***/ }),
/* 10 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

/***/ }),
/* 11 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var aFunction = __w_pdfjs_require__(21);
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1:
      return function (a) {
        return fn.call(that, a);
      };
    case 2:
      return function (a, b) {
        return fn.call(that, a, b);
      };
    case 3:
      return function (a, b, c) {
        return fn.call(that, a, b, c);
      };
  }
  return function () {
    return fn.apply(that, arguments);
  };
};

/***/ }),
/* 12 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toInteger = __w_pdfjs_require__(17);
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
};

/***/ }),
/* 13 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SimpleXMLParser = exports.DOMSVGFactory = exports.DOMCMapReaderFactory = exports.DOMCanvasFactory = exports.DEFAULT_LINK_REL = exports.getDefaultSetting = exports.LinkTarget = exports.getFilenameFromUrl = exports.isValidUrl = exports.isExternalLinkTargetSet = exports.addLinkAttributes = exports.RenderingCancelledException = exports.CustomStyle = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __w_pdfjs_require__(0);

var _global_scope = __w_pdfjs_require__(20);

var _global_scope2 = _interopRequireDefault(_global_scope);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_LINK_REL = 'noopener noreferrer nofollow';
var SVG_NS = 'http://www.w3.org/2000/svg';

var DOMCanvasFactory = function () {
  function DOMCanvasFactory() {
    _classCallCheck(this, DOMCanvasFactory);
  }

  _createClass(DOMCanvasFactory, [{
    key: 'create',
    value: function create(width, height) {
      if (width <= 0 || height <= 0) {
        throw new Error('invalid canvas size');
      }
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      return {
        canvas: canvas,
        context: context
      };
    }
  }, {
    key: 'reset',
    value: function reset(canvasAndContext, width, height) {
      if (!canvasAndContext.canvas) {
        throw new Error('canvas is not specified');
      }
      if (width <= 0 || height <= 0) {
        throw new Error('invalid canvas size');
      }
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    }
  }, {
    key: 'destroy',
    value: function destroy(canvasAndContext) {
      if (!canvasAndContext.canvas) {
        throw new Error('canvas is not specified');
      }
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    }
  }]);

  return DOMCanvasFactory;
}();

var DOMCMapReaderFactory = function () {
  function DOMCMapReaderFactory(_ref) {
    var _ref$baseUrl = _ref.baseUrl,
        baseUrl = _ref$baseUrl === undefined ? null : _ref$baseUrl,
        _ref$isCompressed = _ref.isCompressed,
        isCompressed = _ref$isCompressed === undefined ? false : _ref$isCompressed;

    _classCallCheck(this, DOMCMapReaderFactory);

    this.baseUrl = baseUrl;
    this.isCompressed = isCompressed;
  }

  _createClass(DOMCMapReaderFactory, [{
    key: 'fetch',
    value: function fetch(_ref2) {
      var _this = this;

      var name = _ref2.name;

      if (!this.baseUrl) {
        return Promise.reject(new Error('CMap baseUrl must be specified, ' + 'see "PDFJS.cMapUrl" (and also "PDFJS.cMapPacked").'));
      }
      if (!name) {
        return Promise.reject(new Error('CMap name must be specified.'));
      }
      return new Promise(function (resolve, reject) {
        var url = _this.baseUrl + name + (_this.isCompressed ? '.bcmap' : '');
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        if (_this.isCompressed) {
          request.responseType = 'arraybuffer';
        }
        request.onreadystatechange = function () {
          if (request.readyState !== XMLHttpRequest.DONE) {
            return;
          }
          if (request.status === 200 || request.status === 0) {
            var data = void 0;
            if (_this.isCompressed && request.response) {
              data = new Uint8Array(request.response);
            } else if (!_this.isCompressed && request.responseText) {
              data = (0, _util.stringToBytes)(request.responseText);
            }
            if (data) {
              resolve({
                cMapData: data,
                compressionType: _this.isCompressed ? _util.CMapCompressionType.BINARY : _util.CMapCompressionType.NONE
              });
              return;
            }
          }
          reject(new Error('Unable to load ' + (_this.isCompressed ? 'binary ' : '') + 'CMap at: ' + url));
        };
        request.send(null);
      });
    }
  }]);

  return DOMCMapReaderFactory;
}();

var DOMSVGFactory = function () {
  function DOMSVGFactory() {
    _classCallCheck(this, DOMSVGFactory);
  }

  _createClass(DOMSVGFactory, [{
    key: 'create',
    value: function create(width, height) {
      (0, _util.assert)(width > 0 && height > 0, 'Invalid SVG dimensions');
      var svg = document.createElementNS(SVG_NS, 'svg:svg');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('width', width + 'px');
      svg.setAttribute('height', height + 'px');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      return svg;
    }
  }, {
    key: 'createElement',
    value: function createElement(type) {
      (0, _util.assert)(typeof type === 'string', 'Invalid SVG element type');
      return document.createElementNS(SVG_NS, type);
    }
  }]);

  return DOMSVGFactory;
}();

var SimpleDOMNode = function () {
  function SimpleDOMNode(nodeName, nodeValue) {
    _classCallCheck(this, SimpleDOMNode);

    this.nodeName = nodeName;
    this.nodeValue = nodeValue;
    Object.defineProperty(this, 'parentNode', {
      value: null,
      writable: true
    });
  }

  _createClass(SimpleDOMNode, [{
    key: 'hasChildNodes',
    value: function hasChildNodes() {
      return this.childNodes && this.childNodes.length > 0;
    }
  }, {
    key: 'firstChild',
    get: function get() {
      return this.childNodes[0];
    }
  }, {
    key: 'nextSibling',
    get: function get() {
      var index = this.parentNode.childNodes.indexOf(this);
      return this.parentNode.childNodes[index + 1];
    }
  }, {
    key: 'textContent',
    get: function get() {
      if (!this.childNodes) {
        return this.nodeValue || '';
      }
      return this.childNodes.map(function (child) {
        return child.textContent;
      }).join('');
    }
  }]);

  return SimpleDOMNode;
}();

var SimpleXMLParser = function () {
  function SimpleXMLParser() {
    _classCallCheck(this, SimpleXMLParser);
  }

  _createClass(SimpleXMLParser, [{
    key: 'parseFromString',
    value: function parseFromString(data) {
      var _this2 = this;

      var nodes = [];
      data = data.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->/g, '').trim();
      data = data.replace(/<!DOCTYPE[^>\[]+(\[[^\]]+)?[^>]+>/g, '').trim();
      data = data.replace(/>([^<][\s\S]*?)</g, function (all, text) {
        var length = nodes.length;
        var node = new SimpleDOMNode('#text', _this2._decodeXML(text));
        nodes.push(node);
        if (node.textContent.trim().length === 0) {
          return '><';
        }
        return '>' + length + ',<';
      });
      data = data.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, function (all, text) {
        var length = nodes.length;
        var node = new SimpleDOMNode('#text', text);
        nodes.push(node);
        return length + ',';
      });
      var regex = /<([\w\:]+)((?:[\s\w:=]|'[^']*'|"[^"]*")*)(?:\/>|>([\d,]*)<\/[^>]+>)/g;
      var lastLength = void 0;
      do {
        lastLength = nodes.length;
        data = data.replace(regex, function (all, name, attrs, data) {
          var length = nodes.length;
          var node = new SimpleDOMNode(name);
          var children = [];
          if (data) {
            data = data.split(',');
            data.pop();
            data.forEach(function (child) {
              var childNode = nodes[+child];
              childNode.parentNode = node;
              children.push(childNode);
            });
          }
          node.childNodes = children;
          nodes.push(node);
          return length + ',';
        });
      } while (lastLength < nodes.length);
      return { documentElement: nodes.pop() };
    }
  }, {
    key: '_decodeXML',
    value: function _decodeXML(text) {
      if (text.indexOf('&') < 0) {
        return text;
      }
      return text.replace(/&(#(x[0-9a-f]+|\d+)|\w+);/gi, function (all, entityName, number) {
        if (number) {
          if (number[0] === 'x') {
            number = parseInt(number.substring(1), 16);
          } else {
            number = +number;
          }
          return String.fromCharCode(number);
        }
        switch (entityName) {
          case 'amp':
            return '&';
          case 'lt':
            return '<';
          case 'gt':
            return '>';
          case 'quot':
            return '\"';
          case 'apos':
            return '\'';
        }
        return '&' + entityName + ';';
      });
    }
  }]);

  return SimpleXMLParser;
}();

var CustomStyle = function CustomStyleClosure() {
  var prefixes = ['ms', 'Moz', 'Webkit', 'O'];
  var _cache = Object.create(null);
  function CustomStyle() {}
  CustomStyle.getProp = function get(propName, element) {
    if (arguments.length === 1 && typeof _cache[propName] === 'string') {
      return _cache[propName];
    }
    element = element || document.documentElement;
    var style = element.style,
        prefixed,
        uPropName;
    if (typeof style[propName] === 'string') {
      return _cache[propName] = propName;
    }
    uPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
    for (var i = 0, l = prefixes.length; i < l; i++) {
      prefixed = prefixes[i] + uPropName;
      if (typeof style[prefixed] === 'string') {
        return _cache[propName] = prefixed;
      }
    }
    return _cache[propName] = 'undefined';
  };
  CustomStyle.setProp = function set(propName, element, str) {
    var prop = this.getProp(propName);
    if (prop !== 'undefined') {
      element.style[prop] = str;
    }
  };
  return CustomStyle;
}();
var RenderingCancelledException = function RenderingCancelledException() {
  function RenderingCancelledException(msg, type) {
    this.message = msg;
    this.type = type;
  }
  RenderingCancelledException.prototype = new Error();
  RenderingCancelledException.prototype.name = 'RenderingCancelledException';
  RenderingCancelledException.constructor = RenderingCancelledException;
  return RenderingCancelledException;
}();
var LinkTarget = {
  NONE: 0,
  SELF: 1,
  BLANK: 2,
  PARENT: 3,
  TOP: 4
};
var LinkTargetStringMap = ['', '_self', '_blank', '_parent', '_top'];
function addLinkAttributes(link, params) {
  var url = params && params.url;
  link.href = link.title = url ? (0, _util.removeNullCharacters)(url) : '';
  if (url) {
    var target = params.target;
    if (typeof target === 'undefined') {
      target = getDefaultSetting('externalLinkTarget');
    }
    link.target = LinkTargetStringMap[target];
    var rel = params.rel;
    if (typeof rel === 'undefined') {
      rel = getDefaultSetting('externalLinkRel');
    }
    link.rel = rel;
  }
}
function getFilenameFromUrl(url) {
  var anchor = url.indexOf('#');
  var query = url.indexOf('?');
  var end = Math.min(anchor > 0 ? anchor : url.length, query > 0 ? query : url.length);
  return url.substring(url.lastIndexOf('/', end) + 1, end);
}
function getDefaultSetting(id) {
  var globalSettings = _global_scope2.default.PDFJS;
  switch (id) {
    case 'pdfBug':
      return globalSettings ? globalSettings.pdfBug : false;
    case 'disableAutoFetch':
      return globalSettings ? globalSettings.disableAutoFetch : false;
    case 'disableStream':
      return globalSettings ? globalSettings.disableStream : false;
    case 'disableRange':
      return globalSettings ? globalSettings.disableRange : false;
    case 'disableFontFace':
      return globalSettings ? globalSettings.disableFontFace : false;
    case 'disableCreateObjectURL':
      return globalSettings ? globalSettings.disableCreateObjectURL : false;
    case 'disableWebGL':
      return globalSettings ? globalSettings.disableWebGL : true;
    case 'cMapUrl':
      return globalSettings ? globalSettings.cMapUrl : null;
    case 'cMapPacked':
      return globalSettings ? globalSettings.cMapPacked : false;
    case 'postMessageTransfers':
      return globalSettings ? globalSettings.postMessageTransfers : true;
    case 'workerPort':
      return globalSettings ? globalSettings.workerPort : null;
    case 'workerSrc':
      return globalSettings ? globalSettings.workerSrc : null;
    case 'disableWorker':
      return globalSettings ? globalSettings.disableWorker : false;
    case 'maxImageSize':
      return globalSettings ? globalSettings.maxImageSize : -1;
    case 'imageResourcesPath':
      return globalSettings ? globalSettings.imageResourcesPath : '';
    case 'isEvalSupported':
      return globalSettings ? globalSettings.isEvalSupported : true;
    case 'externalLinkTarget':
      if (!globalSettings) {
        return LinkTarget.NONE;
      }
      switch (globalSettings.externalLinkTarget) {
        case LinkTarget.NONE:
        case LinkTarget.SELF:
        case LinkTarget.BLANK:
        case LinkTarget.PARENT:
        case LinkTarget.TOP:
          return globalSettings.externalLinkTarget;
      }
      (0, _util.warn)('PDFJS.externalLinkTarget is invalid: ' + globalSettings.externalLinkTarget);
      globalSettings.externalLinkTarget = LinkTarget.NONE;
      return LinkTarget.NONE;
    case 'externalLinkRel':
      return globalSettings ? globalSettings.externalLinkRel : DEFAULT_LINK_REL;
    case 'enableStats':
      return !!(globalSettings && globalSettings.enableStats);
    case 'pdfjsNext':
      return !!(globalSettings && globalSettings.pdfjsNext);
    default:
      throw new Error('Unknown default setting: ' + id);
  }
}
function isExternalLinkTargetSet() {
  var externalLinkTarget = getDefaultSetting('externalLinkTarget');
  switch (externalLinkTarget) {
    case LinkTarget.NONE:
      return false;
    case LinkTarget.SELF:
    case LinkTarget.BLANK:
    case LinkTarget.PARENT:
    case LinkTarget.TOP:
      return true;
  }
}
function isValidUrl(url, allowRelative) {
  (0, _util.deprecated)('isValidUrl(), please use createValidAbsoluteUrl() instead.');
  var baseUrl = allowRelative ? 'http://example.com' : null;
  return (0, _util.createValidAbsoluteUrl)(url, baseUrl) !== null;
}
exports.CustomStyle = CustomStyle;
exports.RenderingCancelledException = RenderingCancelledException;
exports.addLinkAttributes = addLinkAttributes;
exports.isExternalLinkTargetSet = isExternalLinkTargetSet;
exports.isValidUrl = isValidUrl;
exports.getFilenameFromUrl = getFilenameFromUrl;
exports.LinkTarget = LinkTarget;
exports.getDefaultSetting = getDefaultSetting;
exports.DEFAULT_LINK_REL = DEFAULT_LINK_REL;
exports.DOMCanvasFactory = DOMCanvasFactory;
exports.DOMCMapReaderFactory = DOMCMapReaderFactory;
exports.DOMSVGFactory = DOMSVGFactory;
exports.SimpleXMLParser = SimpleXMLParser;

/***/ }),
/* 14 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var anObject = __w_pdfjs_require__(7);
var IE8_DOM_DEFINE = __w_pdfjs_require__(45);
var toPrimitive = __w_pdfjs_require__(33);
var dP = Object.defineProperty;
exports.f = __w_pdfjs_require__(9) ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return dP(O, P, Attributes);
  } catch (e) {}
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

/***/ }),
/* 15 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var hide = __w_pdfjs_require__(6);
var has = __w_pdfjs_require__(8);
var SRC = __w_pdfjs_require__(16)('src');
var TO_STRING = 'toString';
var $toString = Function[TO_STRING];
var TPL = ('' + $toString).split(TO_STRING);
__w_pdfjs_require__(5).inspectSource = function (it) {
  return $toString.call(it);
};
(module.exports = function (O, key, val, safe) {
  var isFunction = typeof val == 'function';
  if (isFunction) has(val, 'name') || hide(val, 'name', key);
  if (O[key] === val) return;
  if (isFunction) has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
  if (O === global) {
    O[key] = val;
  } else if (!safe) {
    delete O[key];
    hide(O, key, val);
  } else if (O[key]) {
    O[key] = val;
  } else {
    hide(O, key, val);
  }
})(Function.prototype, TO_STRING, function toString() {
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});

/***/ }),
/* 16 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

/***/ }),
/* 17 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

/***/ }),
/* 18 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var defined = __w_pdfjs_require__(35);
module.exports = function (it) {
  return Object(defined(it));
};

/***/ }),
/* 19 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = {};

/***/ }),
/* 20 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = typeof window !== 'undefined' && window.Math === Math ? window : typeof global !== 'undefined' && global.Math === Math ? global : typeof self !== 'undefined' && self.Math === Math ? self : {};

/***/ }),
/* 21 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

/***/ }),
/* 22 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var redefine = __w_pdfjs_require__(15);
module.exports = function (target, src, safe) {
  for (var key in src) {
    redefine(target, key, src[key], safe);
  }return target;
};

/***/ }),
/* 23 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (it, Constructor, name, forbiddenField) {
  if (!(it instanceof Constructor) || forbiddenField !== undefined && forbiddenField in it) {
    throw TypeError(name + ': incorrect invocation!');
  }
  return it;
};

/***/ }),
/* 24 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toString = {}.toString;
module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

/***/ }),
/* 25 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var def = __w_pdfjs_require__(14).f;
var has = __w_pdfjs_require__(8);
var TAG = __w_pdfjs_require__(3)('toStringTag');
module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, {
    configurable: true,
    value: tag
  });
};

/***/ }),
/* 26 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = false;

/***/ }),
/* 27 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

/***/ }),
/* 28 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var IObject = __w_pdfjs_require__(34);
var defined = __w_pdfjs_require__(35);
module.exports = function (it) {
  return IObject(defined(it));
};

/***/ }),
/* 29 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toInteger = __w_pdfjs_require__(17);
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

/***/ }),
/* 30 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var cof = __w_pdfjs_require__(24);
var TAG = __w_pdfjs_require__(3)('toStringTag');
var ARG = cof(function () {
  return arguments;
}()) == 'Arguments';
var tryGet = function tryGet(it, key) {
  try {
    return it[key];
  } catch (e) {}
};
module.exports = function (it) {
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null' : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T : ARG ? cof(O) : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

/***/ }),
/* 31 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var ctx = __w_pdfjs_require__(11);
var call = __w_pdfjs_require__(98);
var isArrayIter = __w_pdfjs_require__(53);
var anObject = __w_pdfjs_require__(7);
var toLength = __w_pdfjs_require__(12);
var getIterFn = __w_pdfjs_require__(57);
var BREAK = {};
var RETURN = {};
var _exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
  var iterFn = ITERATOR ? function () {
    return iterable;
  } : getIterFn(iterable);
  var f = ctx(fn, that, entries ? 2 : 1);
  var index = 0;
  var length, step, iterator, result;
  if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
  if (isArrayIter(iterFn)) for (length = toLength(iterable.length); length > index; index++) {
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if (result === BREAK || result === RETURN) return result;
  } else for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
    result = call(iterator, f, step.value, entries);
    if (result === BREAK || result === RETURN) return result;
  }
};
_exports.BREAK = BREAK;
_exports.RETURN = RETURN;

/***/ }),
/* 32 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
var document = __w_pdfjs_require__(1).document;
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};

/***/ }),
/* 33 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

/***/ }),
/* 34 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var cof = __w_pdfjs_require__(24);
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};

/***/ }),
/* 35 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

/***/ }),
/* 36 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var shared = __w_pdfjs_require__(51)('keys');
var uid = __w_pdfjs_require__(16);
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};

/***/ }),
/* 37 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'.split(',');

/***/ }),
/* 38 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $keys = __w_pdfjs_require__(49);
var enumBugKeys = __w_pdfjs_require__(37);
module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};

/***/ }),
/* 39 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var ctx = __w_pdfjs_require__(11);
var IObject = __w_pdfjs_require__(34);
var toObject = __w_pdfjs_require__(18);
var toLength = __w_pdfjs_require__(12);
var asc = __w_pdfjs_require__(82);
module.exports = function (TYPE, $create) {
  var IS_MAP = TYPE == 1;
  var IS_FILTER = TYPE == 2;
  var IS_SOME = TYPE == 3;
  var IS_EVERY = TYPE == 4;
  var IS_FIND_INDEX = TYPE == 6;
  var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
  var create = $create || asc;
  return function ($this, callbackfn, that) {
    var O = toObject($this);
    var self = IObject(O);
    var f = ctx(callbackfn, that, 3);
    var length = toLength(self.length);
    var index = 0;
    var result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
    var val, res;
    for (; length > index; index++) {
      if (NO_HOLES || index in self) {
        val = self[index];
        res = f(val, index, O);
        if (TYPE) {
          if (IS_MAP) result[index] = res;else if (res) switch (TYPE) {
            case 3:
              return true;
            case 5:
              return val;
            case 6:
              return index;
            case 2:
              result.push(val);
          } else if (IS_EVERY) return false;
        }
      }
    }return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};

/***/ }),
/* 40 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var anObject = __w_pdfjs_require__(7);
var aFunction = __w_pdfjs_require__(21);
var SPECIES = __w_pdfjs_require__(3)('species');
module.exports = function (O, D) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};

/***/ }),
/* 41 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var ITERATOR = __w_pdfjs_require__(3)('iterator');
var SAFE_CLOSING = false;
try {
  var riter = [7][ITERATOR]();
  riter['return'] = function () {
    SAFE_CLOSING = true;
  };
  Array.from(riter, function () {
    throw 2;
  });
} catch (e) {}
module.exports = function (exec, skipClosing) {
  if (!skipClosing && !SAFE_CLOSING) return false;
  var safe = false;
  try {
    var arr = [7];
    var iter = arr[ITERATOR]();
    iter.next = function () {
      return { done: safe = true };
    };
    arr[ITERATOR] = function () {
      return iter;
    };
    exec(arr);
  } catch (e) {}
  return safe;
};

/***/ }),
/* 42 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var aFunction = __w_pdfjs_require__(21);
function PromiseCapability(C) {
  var resolve, reject;
  this.promise = new C(function ($$resolve, $$reject) {
    if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject = aFunction(reject);
}
module.exports.f = function (C) {
  return new PromiseCapability(C);
};

/***/ }),
/* 43 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var META = __w_pdfjs_require__(16)('meta');
var isObject = __w_pdfjs_require__(2);
var has = __w_pdfjs_require__(8);
var setDesc = __w_pdfjs_require__(14).f;
var id = 0;
var isExtensible = Object.isExtensible || function () {
  return true;
};
var FREEZE = !__w_pdfjs_require__(10)(function () {
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function setMeta(it) {
  setDesc(it, META, {
    value: {
      i: 'O' + ++id,
      w: {}
    }
  });
};
var fastKey = function fastKey(it, create) {
  if (!isObject(it)) return (typeof it === 'undefined' ? 'undefined' : _typeof(it)) == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if (!has(it, META)) {
    if (!isExtensible(it)) return 'F';
    if (!create) return 'E';
    setMeta(it);
  }
  return it[META].i;
};
var getWeak = function getWeak(it, create) {
  if (!has(it, META)) {
    if (!isExtensible(it)) return true;
    if (!create) return false;
    setMeta(it);
  }
  return it[META].w;
};
var onFreeze = function onFreeze(it) {
  if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY: META,
  NEED: false,
  fastKey: fastKey,
  getWeak: getWeak,
  onFreeze: onFreeze
};

/***/ }),
/* 44 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateResponseStatus = exports.validateRangeRequestCapabilities = exports.createResponseStatusError = undefined;

var _util = __w_pdfjs_require__(0);

function validateRangeRequestCapabilities(_ref) {
  var getResponseHeader = _ref.getResponseHeader,
      isHttp = _ref.isHttp,
      rangeChunkSize = _ref.rangeChunkSize,
      disableRange = _ref.disableRange;

  (0, _util.assert)(rangeChunkSize > 0);
  var returnValues = {
    allowRangeRequests: false,
    suggestedLength: undefined
  };
  if (disableRange || !isHttp) {
    return returnValues;
  }
  if (getResponseHeader('Accept-Ranges') !== 'bytes') {
    return returnValues;
  }
  var contentEncoding = getResponseHeader('Content-Encoding') || 'identity';
  if (contentEncoding !== 'identity') {
    return returnValues;
  }
  var length = parseInt(getResponseHeader('Content-Length'), 10);
  if (!Number.isInteger(length)) {
    return returnValues;
  }
  returnValues.suggestedLength = length;
  if (length <= 2 * rangeChunkSize) {
    return returnValues;
  }
  returnValues.allowRangeRequests = true;
  return returnValues;
}
function createResponseStatusError(status, url) {
  if (status === 404 || status === 0 && /^file:/.test(url)) {
    return new _util.MissingPDFException('Missing PDF "' + url + '".');
  }
  return new _util.UnexpectedResponseException('Unexpected server response (' + status + ') while retrieving PDF "' + url + '".', status);
}
function validateResponseStatus(status) {
  return status === 200 || status === 206;
}
exports.createResponseStatusError = createResponseStatusError;
exports.validateRangeRequestCapabilities = validateRangeRequestCapabilities;
exports.validateResponseStatus = validateResponseStatus;

/***/ }),
/* 45 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = !__w_pdfjs_require__(9) && !__w_pdfjs_require__(10)(function () {
  return Object.defineProperty(__w_pdfjs_require__(32)('div'), 'a', {
    get: function get() {
      return 7;
    }
  }).a != 7;
});

/***/ }),
/* 46 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var hide = __w_pdfjs_require__(6);
var uid = __w_pdfjs_require__(16);
var TYPED = uid('typed_array');
var VIEW = uid('view');
var ABV = !!(global.ArrayBuffer && global.DataView);
var CONSTR = ABV;
var i = 0;
var l = 9;
var Typed;
var TypedArrayConstructors = 'Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array'.split(',');
while (i < l) {
  if (Typed = global[TypedArrayConstructors[i++]]) {
    hide(Typed.prototype, TYPED, true);
    hide(Typed.prototype, VIEW, true);
  } else CONSTR = false;
}
module.exports = {
  ABV: ABV,
  CONSTR: CONSTR,
  TYPED: TYPED,
  VIEW: VIEW
};

/***/ }),
/* 47 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toInteger = __w_pdfjs_require__(17);
var toLength = __w_pdfjs_require__(12);
module.exports = function (it) {
  if (it === undefined) return 0;
  var number = toInteger(it);
  var length = toLength(number);
  if (number !== length) throw RangeError('Wrong length!');
  return length;
};

/***/ }),
/* 48 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $keys = __w_pdfjs_require__(49);
var hiddenKeys = __w_pdfjs_require__(37).concat('length', 'prototype');
exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return $keys(O, hiddenKeys);
};

/***/ }),
/* 49 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var has = __w_pdfjs_require__(8);
var toIObject = __w_pdfjs_require__(28);
var arrayIndexOf = __w_pdfjs_require__(50)(false);
var IE_PROTO = __w_pdfjs_require__(36)('IE_PROTO');
module.exports = function (object, names) {
  var O = toIObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) {
    if (key != IE_PROTO) has(O, key) && result.push(key);
  }while (names.length > i) {
    if (has(O, key = names[i++])) {
      ~arrayIndexOf(result, key) || result.push(key);
    }
  }return result;
};

/***/ }),
/* 50 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toIObject = __w_pdfjs_require__(28);
var toLength = __w_pdfjs_require__(12);
var toAbsoluteIndex = __w_pdfjs_require__(29);
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      if (value != value) return true;
    } else for (; length > index; index++) {
      if (IS_INCLUDES || index in O) {
        if (O[index] === el) return IS_INCLUDES || index || 0;
      }
    }return !IS_INCLUDES && -1;
  };
};

/***/ }),
/* 51 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});
module.exports = function (key) {
  return store[key] || (store[key] = {});
};

/***/ }),
/* 52 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toObject = __w_pdfjs_require__(18);
var toAbsoluteIndex = __w_pdfjs_require__(29);
var toLength = __w_pdfjs_require__(12);
module.exports = function fill(value) {
  var O = toObject(this);
  var length = toLength(O.length);
  var aLen = arguments.length;
  var index = toAbsoluteIndex(aLen > 1 ? arguments[1] : undefined, length);
  var end = aLen > 2 ? arguments[2] : undefined;
  var endPos = end === undefined ? length : toAbsoluteIndex(end, length);
  while (endPos > index) {
    O[index++] = value;
  }return O;
};

/***/ }),
/* 53 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var Iterators = __w_pdfjs_require__(19);
var ITERATOR = __w_pdfjs_require__(3)('iterator');
var ArrayProto = Array.prototype;
module.exports = function (it) {
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};

/***/ }),
/* 54 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var anObject = __w_pdfjs_require__(7);
var dPs = __w_pdfjs_require__(81);
var enumBugKeys = __w_pdfjs_require__(37);
var IE_PROTO = __w_pdfjs_require__(36)('IE_PROTO');
var Empty = function Empty() {};
var PROTOTYPE = 'prototype';
var _createDict = function createDict() {
  var iframe = __w_pdfjs_require__(32)('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  __w_pdfjs_require__(55).appendChild(iframe);
  iframe.src = 'javascript:';
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  _createDict = iframeDocument.F;
  while (i--) {
    delete _createDict[PROTOTYPE][enumBugKeys[i]];
  }return _createDict();
};
module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    result[IE_PROTO] = O;
  } else result = _createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

/***/ }),
/* 55 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var document = __w_pdfjs_require__(1).document;
module.exports = document && document.documentElement;

/***/ }),
/* 56 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var has = __w_pdfjs_require__(8);
var toObject = __w_pdfjs_require__(18);
var IE_PROTO = __w_pdfjs_require__(36)('IE_PROTO');
var ObjectProto = Object.prototype;
module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  }
  return O instanceof Object ? ObjectProto : null;
};

/***/ }),
/* 57 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var classof = __w_pdfjs_require__(30);
var ITERATOR = __w_pdfjs_require__(3)('iterator');
var Iterators = __w_pdfjs_require__(19);
module.exports = __w_pdfjs_require__(5).getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
};

/***/ }),
/* 58 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var addToUnscopables = __w_pdfjs_require__(85);
var step = __w_pdfjs_require__(86);
var Iterators = __w_pdfjs_require__(19);
var toIObject = __w_pdfjs_require__(28);
module.exports = __w_pdfjs_require__(59)(Array, 'Array', function (iterated, kind) {
  this._t = toIObject(iterated);
  this._i = 0;
  this._k = kind;
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return step(1);
  }
  if (kind == 'keys') return step(0, index);
  if (kind == 'values') return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');
Iterators.Arguments = Iterators.Array;
addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

/***/ }),
/* 59 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var LIBRARY = __w_pdfjs_require__(26);
var $export = __w_pdfjs_require__(4);
var redefine = __w_pdfjs_require__(15);
var hide = __w_pdfjs_require__(6);
var has = __w_pdfjs_require__(8);
var Iterators = __w_pdfjs_require__(19);
var $iterCreate = __w_pdfjs_require__(87);
var setToStringTag = __w_pdfjs_require__(25);
var getPrototypeOf = __w_pdfjs_require__(56);
var ITERATOR = __w_pdfjs_require__(3)('iterator');
var BUGGY = !([].keys && 'next' in [].keys());
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';
var returnThis = function returnThis() {
  return this;
};
module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  $iterCreate(Constructor, NAME, next);
  var getMethod = function getMethod(kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS:
        return function keys() {
          return new Constructor(this, kind);
        };
      case VALUES:
        return function values() {
          return new Constructor(this, kind);
        };
    }
    return function entries() {
      return new Constructor(this, kind);
    };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = $native || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  if ($anyNative) {
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      setToStringTag(IteratorPrototype, TAG, true);
      if (!LIBRARY && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() {
      return $native.call(this);
    };
  }
  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    hide(proto, ITERATOR, $default);
  }
  Iterators[NAME] = $default;
  Iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

/***/ }),
/* 60 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var dP = __w_pdfjs_require__(14);
var DESCRIPTORS = __w_pdfjs_require__(9);
var SPECIES = __w_pdfjs_require__(3)('species');
module.exports = function (KEY) {
  var C = global[KEY];
  if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
    configurable: true,
    get: function get() {
      return this;
    }
  });
};

/***/ }),
/* 61 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var pIE = __w_pdfjs_require__(62);
var createDesc = __w_pdfjs_require__(27);
var toIObject = __w_pdfjs_require__(28);
var toPrimitive = __w_pdfjs_require__(33);
var has = __w_pdfjs_require__(8);
var IE8_DOM_DEFINE = __w_pdfjs_require__(45);
var gOPD = Object.getOwnPropertyDescriptor;
exports.f = __w_pdfjs_require__(9) ? gOPD : function getOwnPropertyDescriptor(O, P) {
  O = toIObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return gOPD(O, P);
  } catch (e) {}
  if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
};

/***/ }),
/* 62 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


exports.f = {}.propertyIsEnumerable;

/***/ }),
/* 63 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var classof = __w_pdfjs_require__(30);
var test = {};
test[__w_pdfjs_require__(3)('toStringTag')] = 'z';
if (test + '' != '[object z]') {
  __w_pdfjs_require__(15)(Object.prototype, 'toString', function toString() {
    return '[object ' + classof(this) + ']';
  }, true);
}

/***/ }),
/* 64 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $iterators = __w_pdfjs_require__(58);
var getKeys = __w_pdfjs_require__(38);
var redefine = __w_pdfjs_require__(15);
var global = __w_pdfjs_require__(1);
var hide = __w_pdfjs_require__(6);
var Iterators = __w_pdfjs_require__(19);
var wks = __w_pdfjs_require__(3);
var ITERATOR = wks('iterator');
var TO_STRING_TAG = wks('toStringTag');
var ArrayValues = Iterators.Array;
var DOMIterables = {
  CSSRuleList: true,
  CSSStyleDeclaration: false,
  CSSValueList: false,
  ClientRectList: false,
  DOMRectList: false,
  DOMStringList: false,
  DOMTokenList: true,
  DataTransferItemList: false,
  FileList: false,
  HTMLAllCollection: false,
  HTMLCollection: false,
  HTMLFormElement: false,
  HTMLSelectElement: false,
  MediaList: true,
  MimeTypeArray: false,
  NamedNodeMap: false,
  NodeList: true,
  PaintRequestList: false,
  Plugin: false,
  PluginArray: false,
  SVGLengthList: false,
  SVGNumberList: false,
  SVGPathSegList: false,
  SVGPointList: false,
  SVGStringList: false,
  SVGTransformList: false,
  SourceBufferList: false,
  StyleSheetList: true,
  TextTrackCueList: false,
  TextTrackList: false,
  TouchList: false
};
for (var collections = getKeys(DOMIterables), i = 0; i < collections.length; i++) {
  var NAME = collections[i];
  var explicit = DOMIterables[NAME];
  var Collection = global[NAME];
  var proto = Collection && Collection.prototype;
  var key;
  if (proto) {
    if (!proto[ITERATOR]) hide(proto, ITERATOR, ArrayValues);
    if (!proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
    Iterators[NAME] = ArrayValues;
    if (explicit) for (key in $iterators) {
      if (!proto[key]) redefine(proto, key, $iterators[key], true);
    }
  }
}

/***/ }),
/* 65 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var ctx = __w_pdfjs_require__(11);
var invoke = __w_pdfjs_require__(99);
var html = __w_pdfjs_require__(55);
var cel = __w_pdfjs_require__(32);
var global = __w_pdfjs_require__(1);
var process = global.process;
var setTask = global.setImmediate;
var clearTask = global.clearImmediate;
var MessageChannel = global.MessageChannel;
var Dispatch = global.Dispatch;
var counter = 0;
var queue = {};
var ONREADYSTATECHANGE = 'onreadystatechange';
var defer, channel, port;
var run = function run() {
  var id = +this;
  if (queue.hasOwnProperty(id)) {
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function listener(event) {
  run.call(event.data);
};
if (!setTask || !clearTask) {
  setTask = function setImmediate(fn) {
    var args = [];
    var i = 1;
    while (arguments.length > i) {
      args.push(arguments[i++]);
    }queue[++counter] = function () {
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id) {
    delete queue[id];
  };
  if (__w_pdfjs_require__(24)(process) == 'process') {
    defer = function defer(id) {
      process.nextTick(ctx(run, id, 1));
    };
  } else if (Dispatch && Dispatch.now) {
    defer = function defer(id) {
      Dispatch.now(ctx(run, id, 1));
    };
  } else if (MessageChannel) {
    channel = new MessageChannel();
    port = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
    defer = function defer(id) {
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  } else if (ONREADYSTATECHANGE in cel('script')) {
    defer = function defer(id) {
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function () {
        html.removeChild(this);
        run.call(id);
      };
    };
  } else {
    defer = function defer(id) {
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set: setTask,
  clear: clearTask
};

/***/ }),
/* 66 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (exec) {
  try {
    return {
      e: false,
      v: exec()
    };
  } catch (e) {
    return {
      e: true,
      v: e
    };
  }
};

/***/ }),
/* 67 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var anObject = __w_pdfjs_require__(7);
var isObject = __w_pdfjs_require__(2);
var newPromiseCapability = __w_pdfjs_require__(42);
module.exports = function (C, x) {
  anObject(C);
  if (isObject(x) && x.constructor === C) return x;
  var promiseCapability = newPromiseCapability.f(C);
  var resolve = promiseCapability.resolve;
  resolve(x);
  return promiseCapability.promise;
};

/***/ }),
/* 68 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
module.exports = function (it, TYPE) {
  if (!isObject(it) || it._t !== TYPE) throw TypeError('Incompatible receiver, ' + TYPE + ' required!');
  return it;
};

/***/ }),
/* 69 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.build = exports.version = exports._UnsupportedManager = exports.setPDFNetworkStreamClass = exports.PDFPageProxy = exports.PDFDocumentProxy = exports.PDFWorker = exports.PDFDataRangeTransport = exports.LoopbackPort = exports.getDocument = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _util = __w_pdfjs_require__(0);

var _dom_utils = __w_pdfjs_require__(13);

var _font_loader = __w_pdfjs_require__(118);

var _canvas = __w_pdfjs_require__(119);

var _global_scope = __w_pdfjs_require__(20);

var _global_scope2 = _interopRequireDefault(_global_scope);

var _metadata = __w_pdfjs_require__(71);

var _transport_stream = __w_pdfjs_require__(121);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_RANGE_CHUNK_SIZE = 65536;
var isWorkerDisabled = false;
var workerSrc;
var isPostMessageTransfersDisabled = false;
var pdfjsFilePath = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null;
var fakeWorkerFilesLoader = null;
var useRequireEnsure = false;
{
  if (typeof window === 'undefined') {
    isWorkerDisabled = true;
    if (typeof require.ensure === 'undefined') {
      require.ensure = require('node-ensure');
    }
    useRequireEnsure = true;
  } else if (typeof require !== 'undefined' && typeof require.ensure === 'function') {
    useRequireEnsure = true;
  }
  if (typeof requirejs !== 'undefined' && requirejs.toUrl) {
    workerSrc = requirejs.toUrl('pdfjs-dist/build/pdf.worker.js');
  }
  var dynamicLoaderSupported = typeof requirejs !== 'undefined' && requirejs.load;
  fakeWorkerFilesLoader = useRequireEnsure ? function (callback) {
    require.ensure([], function () {
      var worker;
      worker = require('./pdf.worker.js');
      callback(worker.WorkerMessageHandler);
    });
  } : dynamicLoaderSupported ? function (callback) {
    requirejs(['pdfjs-dist/build/pdf.worker'], function (worker) {
      callback(worker.WorkerMessageHandler);
    });
  } : null;
}
var PDFNetworkStream;
function setPDFNetworkStreamClass(cls) {
  PDFNetworkStream = cls;
}
function getDocument(src, pdfDataRangeTransport, passwordCallback, progressCallback) {
  var task = new PDFDocumentLoadingTask();
  if (arguments.length > 1) {
    (0, _util.deprecated)('getDocument is called with pdfDataRangeTransport, ' + 'passwordCallback or progressCallback argument');
  }
  if (pdfDataRangeTransport) {
    if (!(pdfDataRangeTransport instanceof PDFDataRangeTransport)) {
      pdfDataRangeTransport = Object.create(pdfDataRangeTransport);
      pdfDataRangeTransport.length = src.length;
      pdfDataRangeTransport.initialData = src.initialData;
      if (!pdfDataRangeTransport.abort) {
        pdfDataRangeTransport.abort = function () {};
      }
    }
    src = Object.create(src);
    src.range = pdfDataRangeTransport;
  }
  task.onPassword = passwordCallback || null;
  task.onProgress = progressCallback || null;
  var source;
  if (typeof src === 'string') {
    source = { url: src };
  } else if ((0, _util.isArrayBuffer)(src)) {
    source = { data: src };
  } else if (src instanceof PDFDataRangeTransport) {
    source = { range: src };
  } else {
    if ((typeof src === 'undefined' ? 'undefined' : _typeof(src)) !== 'object') {
      throw new Error('Invalid parameter in getDocument, ' + 'need either Uint8Array, string or a parameter object');
    }
    if (!src.url && !src.data && !src.range) {
      throw new Error('Invalid parameter object: need either .data, .range or .url');
    }
    source = src;
  }
  var params = {};
  var rangeTransport = null;
  var worker = null;
  var CMapReaderFactory = _dom_utils.DOMCMapReaderFactory;
  for (var key in source) {
    if (key === 'url' && typeof window !== 'undefined') {
      params[key] = new URL(source[key], window.location).href;
      continue;
    } else if (key === 'range') {
      rangeTransport = source[key];
      continue;
    } else if (key === 'worker') {
      worker = source[key];
      continue;
    } else if (key === 'data' && !(source[key] instanceof Uint8Array)) {
      var pdfBytes = source[key];
      if (typeof pdfBytes === 'string') {
        params[key] = (0, _util.stringToBytes)(pdfBytes);
      } else if ((typeof pdfBytes === 'undefined' ? 'undefined' : _typeof(pdfBytes)) === 'object' && pdfBytes !== null && !isNaN(pdfBytes.length)) {
        params[key] = new Uint8Array(pdfBytes);
      } else if ((0, _util.isArrayBuffer)(pdfBytes)) {
        params[key] = new Uint8Array(pdfBytes);
      } else {
        throw new Error('Invalid PDF binary data: either typed array, ' + 'string or array-like object is expected in the ' + 'data property.');
      }
      continue;
    } else if (key === 'CMapReaderFactory') {
      CMapReaderFactory = source[key];
      continue;
    }
    params[key] = source[key];
  }
  params.rangeChunkSize = params.rangeChunkSize || DEFAULT_RANGE_CHUNK_SIZE;
  params.ignoreErrors = params.stopAtErrors !== true;
  if (params.disableNativeImageDecoder !== undefined) {
    (0, _util.deprecated)('parameter disableNativeImageDecoder, ' + 'use nativeImageDecoderSupport instead');
  }
  params.nativeImageDecoderSupport = params.nativeImageDecoderSupport || (params.disableNativeImageDecoder === true ? _util.NativeImageDecoding.NONE : _util.NativeImageDecoding.DECODE);
  if (params.nativeImageDecoderSupport !== _util.NativeImageDecoding.DECODE && params.nativeImageDecoderSupport !== _util.NativeImageDecoding.NONE && params.nativeImageDecoderSupport !== _util.NativeImageDecoding.DISPLAY) {
    (0, _util.warn)('Invalid parameter nativeImageDecoderSupport: ' + 'need a state of enum {NativeImageDecoding}');
    params.nativeImageDecoderSupport = _util.NativeImageDecoding.DECODE;
  }
  if (!worker) {
    var workerPort = (0, _dom_utils.getDefaultSetting)('workerPort');
    worker = workerPort ? PDFWorker.fromPort(workerPort) : new PDFWorker();
    task._worker = worker;
  }
  var docId = task.docId;
  worker.promise.then(function () {
    if (task.destroyed) {
      throw new Error('Loading aborted');
    }
    return _fetchDocument(worker, params, rangeTransport, docId).then(function (workerId) {
      if (task.destroyed) {
        throw new Error('Loading aborted');
      }
      var networkStream = void 0;
      if (rangeTransport) {
        networkStream = new _transport_stream.PDFDataTransportStream(params, rangeTransport);
      } else if (!params.data) {
        networkStream = new PDFNetworkStream({
          source: params,
          disableRange: (0, _dom_utils.getDefaultSetting)('disableRange')
        });
      }
      var messageHandler = new _util.MessageHandler(docId, workerId, worker.port);
      messageHandler.postMessageTransfers = worker.postMessageTransfers;
      var transport = new WorkerTransport(messageHandler, task, networkStream, CMapReaderFactory);
      task._transport = transport;
      messageHandler.send('Ready', null);
    });
  }).catch(task._capability.reject);
  return task;
}
function _fetchDocument(worker, source, pdfDataRangeTransport, docId) {
  if (worker.destroyed) {
    return Promise.reject(new Error('Worker was destroyed'));
  }
  var apiVersion = '1.10.88';
  source.disableAutoFetch = (0, _dom_utils.getDefaultSetting)('disableAutoFetch');
  source.disableStream = (0, _dom_utils.getDefaultSetting)('disableStream');
  source.chunkedViewerLoading = !!pdfDataRangeTransport;
  if (pdfDataRangeTransport) {
    source.length = pdfDataRangeTransport.length;
    source.initialData = pdfDataRangeTransport.initialData;
  }
  return worker.messageHandler.sendWithPromise('GetDocRequest', {
    docId: docId,
    apiVersion: apiVersion,
    source: {
      data: source.data,
      url: source.url,
      password: source.password,
      disableAutoFetch: source.disableAutoFetch,
      rangeChunkSize: source.rangeChunkSize,
      length: source.length
    },
    maxImageSize: (0, _dom_utils.getDefaultSetting)('maxImageSize'),
    disableFontFace: (0, _dom_utils.getDefaultSetting)('disableFontFace'),
    disableCreateObjectURL: (0, _dom_utils.getDefaultSetting)('disableCreateObjectURL'),
    postMessageTransfers: (0, _dom_utils.getDefaultSetting)('postMessageTransfers') && !isPostMessageTransfersDisabled,
    docBaseUrl: source.docBaseUrl,
    nativeImageDecoderSupport: source.nativeImageDecoderSupport,
    ignoreErrors: source.ignoreErrors,
    isEvalSupported: (0, _dom_utils.getDefaultSetting)('isEvalSupported')
  }).then(function (workerId) {
    if (worker.destroyed) {
      throw new Error('Worker was destroyed');
    }
    return workerId;
  });
}
var PDFDocumentLoadingTask = function PDFDocumentLoadingTaskClosure() {
  var nextDocumentId = 0;
  function PDFDocumentLoadingTask() {
    this._capability = (0, _util.createPromiseCapability)();
    this._transport = null;
    this._worker = null;
    this.docId = 'd' + nextDocumentId++;
    this.destroyed = false;
    this.onPassword = null;
    this.onProgress = null;
    this.onUnsupportedFeature = null;
  }
  PDFDocumentLoadingTask.prototype = {
    get promise() {
      return this._capability.promise;
    },
    destroy: function destroy() {
      var _this = this;

      this.destroyed = true;
      var transportDestroyed = !this._transport ? Promise.resolve() : this._transport.destroy();
      return transportDestroyed.then(function () {
        _this._transport = null;
        if (_this._worker) {
          _this._worker.destroy();
          _this._worker = null;
        }
      });
    },

    then: function PDFDocumentLoadingTask_then(onFulfilled, onRejected) {
      return this.promise.then.apply(this.promise, arguments);
    }
  };
  return PDFDocumentLoadingTask;
}();
var PDFDataRangeTransport = function pdfDataRangeTransportClosure() {
  function PDFDataRangeTransport(length, initialData) {
    this.length = length;
    this.initialData = initialData;
    this._rangeListeners = [];
    this._progressListeners = [];
    this._progressiveReadListeners = [];
    this._readyCapability = (0, _util.createPromiseCapability)();
  }
  PDFDataRangeTransport.prototype = {
    addRangeListener: function PDFDataRangeTransport_addRangeListener(listener) {
      this._rangeListeners.push(listener);
    },
    addProgressListener: function PDFDataRangeTransport_addProgressListener(listener) {
      this._progressListeners.push(listener);
    },
    addProgressiveReadListener: function PDFDataRangeTransport_addProgressiveReadListener(listener) {
      this._progressiveReadListeners.push(listener);
    },
    onDataRange: function PDFDataRangeTransport_onDataRange(begin, chunk) {
      var listeners = this._rangeListeners;
      for (var i = 0, n = listeners.length; i < n; ++i) {
        listeners[i](begin, chunk);
      }
    },
    onDataProgress: function PDFDataRangeTransport_onDataProgress(loaded) {
      var _this2 = this;

      this._readyCapability.promise.then(function () {
        var listeners = _this2._progressListeners;
        for (var i = 0, n = listeners.length; i < n; ++i) {
          listeners[i](loaded);
        }
      });
    },
    onDataProgressiveRead: function PDFDataRangeTransport_onDataProgress(chunk) {
      var _this3 = this;

      this._readyCapability.promise.then(function () {
        var listeners = _this3._progressiveReadListeners;
        for (var i = 0, n = listeners.length; i < n; ++i) {
          listeners[i](chunk);
        }
      });
    },
    transportReady: function PDFDataRangeTransport_transportReady() {
      this._readyCapability.resolve();
    },
    requestDataRange: function PDFDataRangeTransport_requestDataRange(begin, end) {
      throw new Error('Abstract method PDFDataRangeTransport.requestDataRange');
    },
    abort: function PDFDataRangeTransport_abort() {}
  };
  return PDFDataRangeTransport;
}();
var PDFDocumentProxy = function PDFDocumentProxyClosure() {
  function PDFDocumentProxy(pdfInfo, transport, loadingTask) {
    this.pdfInfo = pdfInfo;
    this.transport = transport;
    this.loadingTask = loadingTask;
  }
  PDFDocumentProxy.prototype = {
    get numPages() {
      return this.pdfInfo.numPages;
    },
    get fingerprint() {
      return this.pdfInfo.fingerprint;
    },
    getPage: function PDFDocumentProxy_getPage(pageNumber) {
      return this.transport.getPage(pageNumber);
    },
    getPageIndex: function PDFDocumentProxy_getPageIndex(ref) {
      return this.transport.getPageIndex(ref);
    },
    getDestinations: function PDFDocumentProxy_getDestinations() {
      return this.transport.getDestinations();
    },
    getDestination: function PDFDocumentProxy_getDestination(id) {
      return this.transport.getDestination(id);
    },
    getPageLabels: function PDFDocumentProxy_getPageLabels() {
      return this.transport.getPageLabels();
    },
    getPageMode: function getPageMode() {
      return this.transport.getPageMode();
    },

    getAttachments: function PDFDocumentProxy_getAttachments() {
      return this.transport.getAttachments();
    },
    getJavaScript: function PDFDocumentProxy_getJavaScript() {
      return this.transport.getJavaScript();
    },
    getOutline: function PDFDocumentProxy_getOutline() {
      return this.transport.getOutline();
    },
    getMetadata: function PDFDocumentProxy_getMetadata() {
      return this.transport.getMetadata();
    },
    getData: function PDFDocumentProxy_getData() {
      return this.transport.getData();
    },
    getDownloadInfo: function PDFDocumentProxy_getDownloadInfo() {
      return this.transport.downloadInfoCapability.promise;
    },
    getStats: function PDFDocumentProxy_getStats() {
      return this.transport.getStats();
    },
    cleanup: function PDFDocumentProxy_cleanup() {
      this.transport.startCleanup();
    },
    destroy: function PDFDocumentProxy_destroy() {
      return this.loadingTask.destroy();
    }
  };
  return PDFDocumentProxy;
}();
var PDFPageProxy = function PDFPageProxyClosure() {
  function PDFPageProxy(pageIndex, pageInfo, transport) {
    this.pageIndex = pageIndex;
    this.pageInfo = pageInfo;
    this.transport = transport;
    this.stats = new _util.StatTimer();
    this.stats.enabled = (0, _dom_utils.getDefaultSetting)('enableStats');
    this.commonObjs = transport.commonObjs;
    this.objs = new PDFObjects();
    this.cleanupAfterRender = false;
    this.pendingCleanup = false;
    this.intentStates = Object.create(null);
    this.destroyed = false;
  }
  PDFPageProxy.prototype = {
    get pageNumber() {
      return this.pageIndex + 1;
    },
    get rotate() {
      return this.pageInfo.rotate;
    },
    get ref() {
      return this.pageInfo.ref;
    },
    get userUnit() {
      return this.pageInfo.userUnit;
    },
    get view() {
      return this.pageInfo.view;
    },
    getViewport: function PDFPageProxy_getViewport(scale, rotate) {
      if (arguments.length < 2) {
        rotate = this.rotate;
      }
      return new _util.PageViewport(this.view, scale, rotate, 0, 0);
    },
    getAnnotations: function PDFPageProxy_getAnnotations(params) {
      var intent = params && params.intent || null;
      if (!this.annotationsPromise || this.annotationsIntent !== intent) {
        this.annotationsPromise = this.transport.getAnnotations(this.pageIndex, intent);
        this.annotationsIntent = intent;
      }
      return this.annotationsPromise;
    },
    render: function PDFPageProxy_render(params) {
      var _this4 = this;

      var stats = this.stats;
      stats.time('Overall');
      this.pendingCleanup = false;
      var renderingIntent = params.intent === 'print' ? 'print' : 'display';
      var canvasFactory = params.canvasFactory || new _dom_utils.DOMCanvasFactory();
      if (!this.intentStates[renderingIntent]) {
        this.intentStates[renderingIntent] = Object.create(null);
      }
      var intentState = this.intentStates[renderingIntent];
      if (!intentState.displayReadyCapability) {
        intentState.receivingOperatorList = true;
        intentState.displayReadyCapability = (0, _util.createPromiseCapability)();
        intentState.operatorList = {
          fnArray: [],
          argsArray: [],
          lastChunk: false
        };
        this.stats.time('Page Request');
        this.transport.messageHandler.send('RenderPageRequest', {
          pageIndex: this.pageNumber - 1,
          intent: renderingIntent,
          renderInteractiveForms: params.renderInteractiveForms === true
        });
      }
      var complete = function complete(error) {
        var i = intentState.renderTasks.indexOf(internalRenderTask);
        if (i >= 0) {
          intentState.renderTasks.splice(i, 1);
        }
        if (_this4.cleanupAfterRender) {
          _this4.pendingCleanup = true;
        }
        _this4._tryCleanup();
        if (error) {
          internalRenderTask.capability.reject(error);
        } else {
          internalRenderTask.capability.resolve();
        }
        stats.timeEnd('Rendering');
        stats.timeEnd('Overall');
      };
      var internalRenderTask = new InternalRenderTask(complete, params, this.objs, this.commonObjs, intentState.operatorList, this.pageNumber, canvasFactory);
      internalRenderTask.useRequestAnimationFrame = renderingIntent !== 'print';
      if (!intentState.renderTasks) {
        intentState.renderTasks = [];
      }
      intentState.renderTasks.push(internalRenderTask);
      var renderTask = internalRenderTask.task;
      if (params.continueCallback) {
        (0, _util.deprecated)('render is used with continueCallback parameter');
        renderTask.onContinue = params.continueCallback;
      }
      intentState.displayReadyCapability.promise.then(function (transparency) {
        if (_this4.pendingCleanup) {
          complete();
          return;
        }
        stats.time('Rendering');
        internalRenderTask.initializeGraphics(transparency);
        internalRenderTask.operatorListChanged();
      }).catch(complete);
      return renderTask;
    },
    getOperatorList: function PDFPageProxy_getOperatorList() {
      function operatorListChanged() {
        if (intentState.operatorList.lastChunk) {
          intentState.opListReadCapability.resolve(intentState.operatorList);
          var i = intentState.renderTasks.indexOf(opListTask);
          if (i >= 0) {
            intentState.renderTasks.splice(i, 1);
          }
        }
      }
      var renderingIntent = 'oplist';
      if (!this.intentStates[renderingIntent]) {
        this.intentStates[renderingIntent] = Object.create(null);
      }
      var intentState = this.intentStates[renderingIntent];
      var opListTask;
      if (!intentState.opListReadCapability) {
        opListTask = {};
        opListTask.operatorListChanged = operatorListChanged;
        intentState.receivingOperatorList = true;
        intentState.opListReadCapability = (0, _util.createPromiseCapability)();
        intentState.renderTasks = [];
        intentState.renderTasks.push(opListTask);
        intentState.operatorList = {
          fnArray: [],
          argsArray: [],
          lastChunk: false
        };
        this.transport.messageHandler.send('RenderPageRequest', {
          pageIndex: this.pageIndex,
          intent: renderingIntent
        });
      }
      return intentState.opListReadCapability.promise;
    },
    streamTextContent: function streamTextContent() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var TEXT_CONTENT_CHUNK_SIZE = 100;
      return this.transport.messageHandler.sendWithStream('GetTextContent', {
        pageIndex: this.pageNumber - 1,
        normalizeWhitespace: params.normalizeWhitespace === true,
        combineTextItems: params.disableCombineTextItems !== true
      }, {
        highWaterMark: TEXT_CONTENT_CHUNK_SIZE,
        size: function size(textContent) {
          return textContent.items.length;
        }
      });
    },

    getTextContent: function PDFPageProxy_getTextContent(params) {
      params = params || {};
      var readableStream = this.streamTextContent(params);
      return new Promise(function (resolve, reject) {
        function pump() {
          reader.read().then(function (_ref) {
            var value = _ref.value,
                done = _ref.done;

            if (done) {
              resolve(textContent);
              return;
            }
            _util.Util.extendObj(textContent.styles, value.styles);
            _util.Util.appendToArray(textContent.items, value.items);
            pump();
          }, reject);
        }
        var reader = readableStream.getReader();
        var textContent = {
          items: [],
          styles: Object.create(null)
        };
        pump();
      });
    },
    _destroy: function PDFPageProxy_destroy() {
      this.destroyed = true;
      this.transport.pageCache[this.pageIndex] = null;
      var waitOn = [];
      Object.keys(this.intentStates).forEach(function (intent) {
        if (intent === 'oplist') {
          return;
        }
        var intentState = this.intentStates[intent];
        intentState.renderTasks.forEach(function (renderTask) {
          var renderCompleted = renderTask.capability.promise.catch(function () {});
          waitOn.push(renderCompleted);
          renderTask.cancel();
        });
      }, this);
      this.objs.clear();
      this.annotationsPromise = null;
      this.pendingCleanup = false;
      return Promise.all(waitOn);
    },
    destroy: function destroy() {
      (0, _util.deprecated)('page destroy method, use cleanup() instead');
      this.cleanup();
    },

    cleanup: function PDFPageProxy_cleanup() {
      this.pendingCleanup = true;
      this._tryCleanup();
    },
    _tryCleanup: function PDFPageProxy_tryCleanup() {
      if (!this.pendingCleanup || Object.keys(this.intentStates).some(function (intent) {
        var intentState = this.intentStates[intent];
        return intentState.renderTasks.length !== 0 || intentState.receivingOperatorList;
      }, this)) {
        return;
      }
      Object.keys(this.intentStates).forEach(function (intent) {
        delete this.intentStates[intent];
      }, this);
      this.objs.clear();
      this.annotationsPromise = null;
      this.pendingCleanup = false;
    },
    _startRenderPage: function PDFPageProxy_startRenderPage(transparency, intent) {
      var intentState = this.intentStates[intent];
      if (intentState.displayReadyCapability) {
        intentState.displayReadyCapability.resolve(transparency);
      }
    },
    _renderPageChunk: function PDFPageProxy_renderPageChunk(operatorListChunk, intent) {
      var intentState = this.intentStates[intent];
      var i, ii;
      for (i = 0, ii = operatorListChunk.length; i < ii; i++) {
        intentState.operatorList.fnArray.push(operatorListChunk.fnArray[i]);
        intentState.operatorList.argsArray.push(operatorListChunk.argsArray[i]);
      }
      intentState.operatorList.lastChunk = operatorListChunk.lastChunk;
      for (i = 0; i < intentState.renderTasks.length; i++) {
        intentState.renderTasks[i].operatorListChanged();
      }
      if (operatorListChunk.lastChunk) {
        intentState.receivingOperatorList = false;
        this._tryCleanup();
      }
    }
  };
  return PDFPageProxy;
}();

var LoopbackPort = function () {
  function LoopbackPort(defer) {
    _classCallCheck(this, LoopbackPort);

    this._listeners = [];
    this._defer = defer;
    this._deferred = Promise.resolve(undefined);
  }

  _createClass(LoopbackPort, [{
    key: 'postMessage',
    value: function postMessage(obj, transfers) {
      var _this5 = this;

      function cloneValue(value) {
        if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object' || value === null) {
          return value;
        }
        if (cloned.has(value)) {
          return cloned.get(value);
        }
        var result;
        var buffer;
        if ((buffer = value.buffer) && (0, _util.isArrayBuffer)(buffer)) {
          var transferable = transfers && transfers.indexOf(buffer) >= 0;
          if (value === buffer) {
            result = value;
          } else if (transferable) {
            result = new value.constructor(buffer, value.byteOffset, value.byteLength);
          } else {
            result = new value.constructor(value);
          }
          cloned.set(value, result);
          return result;
        }
        result = Array.isArray(value) ? [] : {};
        cloned.set(value, result);
        for (var i in value) {
          var desc,
              p = value;
          while (!(desc = Object.getOwnPropertyDescriptor(p, i))) {
            p = Object.getPrototypeOf(p);
          }
          if (typeof desc.value === 'undefined' || typeof desc.value === 'function') {
            continue;
          }
          result[i] = cloneValue(desc.value);
        }
        return result;
      }
      if (!this._defer) {
        this._listeners.forEach(function (listener) {
          listener.call(this, { data: obj });
        }, this);
        return;
      }
      var cloned = new WeakMap();
      var e = { data: cloneValue(obj) };
      this._deferred.then(function () {
        _this5._listeners.forEach(function (listener) {
          listener.call(this, e);
        }, _this5);
      });
    }
  }, {
    key: 'addEventListener',
    value: function addEventListener(name, listener) {
      this._listeners.push(listener);
    }
  }, {
    key: 'removeEventListener',
    value: function removeEventListener(name, listener) {
      var i = this._listeners.indexOf(listener);
      this._listeners.splice(i, 1);
    }
  }, {
    key: 'terminate',
    value: function terminate() {
      this._listeners = [];
    }
  }]);

  return LoopbackPort;
}();

var PDFWorker = function PDFWorkerClosure() {
  var nextFakeWorkerId = 0;
  function getWorkerSrc() {
    if (typeof workerSrc !== 'undefined') {
      return workerSrc;
    }
    if ((0, _dom_utils.getDefaultSetting)('workerSrc')) {
      return (0, _dom_utils.getDefaultSetting)('workerSrc');
    }
    if (pdfjsFilePath) {
      return pdfjsFilePath.replace(/(\.(?:min\.)?js)(\?.*)?$/i, '.worker$1$2');
    }
    throw new Error('No PDFJS.workerSrc specified');
  }
  var fakeWorkerFilesLoadedCapability = void 0;
  function setupFakeWorkerGlobal() {
    var WorkerMessageHandler;
    if (fakeWorkerFilesLoadedCapability) {
      return fakeWorkerFilesLoadedCapability.promise;
    }
    fakeWorkerFilesLoadedCapability = (0, _util.createPromiseCapability)();
    var loader = fakeWorkerFilesLoader || function (callback) {
      _util.Util.loadScript(getWorkerSrc(), function () {
        callback(window.pdfjsDistBuildPdfWorker.WorkerMessageHandler);
      });
    };
    loader(fakeWorkerFilesLoadedCapability.resolve);
    return fakeWorkerFilesLoadedCapability.promise;
  }
  function createCDNWrapper(url) {
    var wrapper = 'importScripts(\'' + url + '\');';
    return URL.createObjectURL(new Blob([wrapper]));
  }
  var pdfWorkerPorts = new WeakMap();
  function PDFWorker(name, port) {
    if (port && pdfWorkerPorts.has(port)) {
      throw new Error('Cannot use more than one PDFWorker per port');
    }
    this.name = name;
    this.destroyed = false;
    this.postMessageTransfers = true;
    this._readyCapability = (0, _util.createPromiseCapability)();
    this._port = null;
    this._webWorker = null;
    this._messageHandler = null;
    if (port) {
      pdfWorkerPorts.set(port, this);
      this._initializeFromPort(port);
      return;
    }
    this._initialize();
  }
  PDFWorker.prototype = {
    get promise() {
      return this._readyCapability.promise;
    },
    get port() {
      return this._port;
    },
    get messageHandler() {
      return this._messageHandler;
    },
    _initializeFromPort: function PDFWorker_initializeFromPort(port) {
      this._port = port;
      this._messageHandler = new _util.MessageHandler('main', 'worker', port);
      this._messageHandler.on('ready', function () {});
      this._readyCapability.resolve();
    },
    _initialize: function PDFWorker_initialize() {
      var _this6 = this;

      if (!isWorkerDisabled && !(0, _dom_utils.getDefaultSetting)('disableWorker') && typeof Worker !== 'undefined') {
        var workerSrc = getWorkerSrc();
        try {
          if (!(0, _util.isSameOrigin)(window.location.href, workerSrc)) {
            workerSrc = createCDNWrapper(new URL(workerSrc, window.location).href);
          }
          var worker = new Worker(workerSrc);
          var messageHandler = new _util.MessageHandler('main', 'worker', worker);
          var terminateEarly = function terminateEarly() {
            worker.removeEventListener('error', onWorkerError);
            messageHandler.destroy();
            worker.terminate();
            if (_this6.destroyed) {
              _this6._readyCapability.reject(new Error('Worker was destroyed'));
            } else {
              _this6._setupFakeWorker();
            }
          };
          var onWorkerError = function onWorkerError() {
            if (!_this6._webWorker) {
              terminateEarly();
            }
          };
          worker.addEventListener('error', onWorkerError);
          messageHandler.on('test', function (data) {
            worker.removeEventListener('error', onWorkerError);
            if (_this6.destroyed) {
              terminateEarly();
              return;
            }
            var supportTypedArray = data && data.supportTypedArray;
            if (supportTypedArray) {
              _this6._messageHandler = messageHandler;
              _this6._port = worker;
              _this6._webWorker = worker;
              if (!data.supportTransfers) {
                _this6.postMessageTransfers = false;
                isPostMessageTransfersDisabled = true;
              }
              _this6._readyCapability.resolve();
              messageHandler.send('configure', { verbosity: (0, _util.getVerbosityLevel)() });
            } else {
              _this6._setupFakeWorker();
              messageHandler.destroy();
              worker.terminate();
            }
          });
          messageHandler.on('console_log', function (data) {
            console.log.apply(console, data);
          });
          messageHandler.on('console_error', function (data) {
            console.error.apply(console, data);
          });
          messageHandler.on('ready', function (data) {
            worker.removeEventListener('error', onWorkerError);
            if (_this6.destroyed) {
              terminateEarly();
              return;
            }
            try {
              sendTest();
            } catch (e) {
              _this6._setupFakeWorker();
            }
          });
          var sendTest = function sendTest() {
            var postMessageTransfers = (0, _dom_utils.getDefaultSetting)('postMessageTransfers') && !isPostMessageTransfersDisabled;
            var testObj = new Uint8Array([postMessageTransfers ? 255 : 0]);
            try {
              messageHandler.send('test', testObj, [testObj.buffer]);
            } catch (ex) {
              (0, _util.info)('Cannot use postMessage transfers');
              testObj[0] = 0;
              messageHandler.send('test', testObj);
            }
          };
          sendTest();
          return;
        } catch (e) {
          (0, _util.info)('The worker has been disabled.');
        }
      }
      this._setupFakeWorker();
    },
    _setupFakeWorker: function PDFWorker_setupFakeWorker() {
      var _this7 = this;

      if (!isWorkerDisabled && !(0, _dom_utils.getDefaultSetting)('disableWorker')) {
        (0, _util.warn)('Setting up fake worker.');
        isWorkerDisabled = true;
      }
      setupFakeWorkerGlobal().then(function (WorkerMessageHandler) {
        if (_this7.destroyed) {
          _this7._readyCapability.reject(new Error('Worker was destroyed'));
          return;
        }
        var isTypedArraysPresent = Uint8Array !== Float32Array;
        var port = new LoopbackPort(isTypedArraysPresent);
        _this7._port = port;
        var id = 'fake' + nextFakeWorkerId++;
        var workerHandler = new _util.MessageHandler(id + '_worker', id, port);
        WorkerMessageHandler.setup(workerHandler, port);
        var messageHandler = new _util.MessageHandler(id, id + '_worker', port);
        _this7._messageHandler = messageHandler;
        _this7._readyCapability.resolve();
      });
    },
    destroy: function PDFWorker_destroy() {
      this.destroyed = true;
      if (this._webWorker) {
        this._webWorker.terminate();
        this._webWorker = null;
      }
      pdfWorkerPorts.delete(this._port);
      this._port = null;
      if (this._messageHandler) {
        this._messageHandler.destroy();
        this._messageHandler = null;
      }
    }
  };
  PDFWorker.fromPort = function (port) {
    if (pdfWorkerPorts.has(port)) {
      return pdfWorkerPorts.get(port);
    }
    return new PDFWorker(null, port);
  };
  return PDFWorker;
}();
var WorkerTransport = function WorkerTransportClosure() {
  function WorkerTransport(messageHandler, loadingTask, networkStream, CMapReaderFactory) {
    this.messageHandler = messageHandler;
    this.loadingTask = loadingTask;
    this.commonObjs = new PDFObjects();
    this.fontLoader = new _font_loader.FontLoader(loadingTask.docId);
    this.CMapReaderFactory = new CMapReaderFactory({
      baseUrl: (0, _dom_utils.getDefaultSetting)('cMapUrl'),
      isCompressed: (0, _dom_utils.getDefaultSetting)('cMapPacked')
    });
    this.destroyed = false;
    this.destroyCapability = null;
    this._passwordCapability = null;
    this._networkStream = networkStream;
    this._fullReader = null;
    this._lastProgress = null;
    this.pageCache = [];
    this.pagePromises = [];
    this.downloadInfoCapability = (0, _util.createPromiseCapability)();
    this.setupMessageHandler();
  }
  WorkerTransport.prototype = {
    destroy: function WorkerTransport_destroy() {
      var _this8 = this;

      if (this.destroyCapability) {
        return this.destroyCapability.promise;
      }
      this.destroyed = true;
      this.destroyCapability = (0, _util.createPromiseCapability)();
      if (this._passwordCapability) {
        this._passwordCapability.reject(new Error('Worker was destroyed during onPassword callback'));
      }
      var waitOn = [];
      this.pageCache.forEach(function (page) {
        if (page) {
          waitOn.push(page._destroy());
        }
      });
      this.pageCache = [];
      this.pagePromises = [];
      var terminated = this.messageHandler.sendWithPromise('Terminate', null);
      waitOn.push(terminated);
      Promise.all(waitOn).then(function () {
        _this8.fontLoader.clear();
        if (_this8._networkStream) {
          _this8._networkStream.cancelAllRequests();
        }
        if (_this8.messageHandler) {
          _this8.messageHandler.destroy();
          _this8.messageHandler = null;
        }
        _this8.destroyCapability.resolve();
      }, this.destroyCapability.reject);
      return this.destroyCapability.promise;
    },
    setupMessageHandler: function WorkerTransport_setupMessageHandler() {
      var messageHandler = this.messageHandler;
      var loadingTask = this.loadingTask;
      messageHandler.on('GetReader', function (data, sink) {
        var _this9 = this;

        (0, _util.assert)(this._networkStream);
        this._fullReader = this._networkStream.getFullReader();
        this._fullReader.onProgress = function (evt) {
          _this9._lastProgress = {
            loaded: evt.loaded,
            total: evt.total
          };
        };
        sink.onPull = function () {
          _this9._fullReader.read().then(function (_ref2) {
            var value = _ref2.value,
                done = _ref2.done;

            if (done) {
              sink.close();
              return;
            }
            (0, _util.assert)((0, _util.isArrayBuffer)(value));
            sink.enqueue(new Uint8Array(value), 1, [value]);
          }).catch(function (reason) {
            sink.error(reason);
          });
        };
        sink.onCancel = function (reason) {
          _this9._fullReader.cancel(reason);
        };
      }, this);
      messageHandler.on('ReaderHeadersReady', function (data) {
        var _this10 = this;

        var headersCapability = (0, _util.createPromiseCapability)();
        var fullReader = this._fullReader;
        fullReader.headersReady.then(function () {
          if (!fullReader.isStreamingSupported || !fullReader.isRangeSupported) {
            if (_this10._lastProgress) {
              var _loadingTask = _this10.loadingTask;
              if (_loadingTask.onProgress) {
                _loadingTask.onProgress(_this10._lastProgress);
              }
            }
            fullReader.onProgress = function (evt) {
              var loadingTask = _this10.loadingTask;
              if (loadingTask.onProgress) {
                loadingTask.onProgress({
                  loaded: evt.loaded,
                  total: evt.total
                });
              }
            };
          }
          headersCapability.resolve({
            isStreamingSupported: fullReader.isStreamingSupported,
            isRangeSupported: fullReader.isRangeSupported,
            contentLength: fullReader.contentLength
          });
        }, headersCapability.reject);
        return headersCapability.promise;
      }, this);
      messageHandler.on('GetRangeReader', function (data, sink) {
        (0, _util.assert)(this._networkStream);
        var _rangeReader = this._networkStream.getRangeReader(data.begin, data.end);
        sink.onPull = function () {
          _rangeReader.read().then(function (_ref3) {
            var value = _ref3.value,
                done = _ref3.done;

            if (done) {
              sink.close();
              return;
            }
            (0, _util.assert)((0, _util.isArrayBuffer)(value));
            sink.enqueue(new Uint8Array(value), 1, [value]);
          }).catch(function (reason) {
            sink.error(reason);
          });
        };
        sink.onCancel = function (reason) {
          _rangeReader.cancel(reason);
        };
      }, this);
      messageHandler.on('GetDoc', function transportDoc(data) {
        var pdfInfo = data.pdfInfo;
        this.numPages = data.pdfInfo.numPages;
        var loadingTask = this.loadingTask;
        var pdfDocument = new PDFDocumentProxy(pdfInfo, this, loadingTask);
        this.pdfDocument = pdfDocument;
        loadingTask._capability.resolve(pdfDocument);
      }, this);
      messageHandler.on('PasswordRequest', function transportPasswordRequest(exception) {
        var _this11 = this;

        this._passwordCapability = (0, _util.createPromiseCapability)();
        if (loadingTask.onPassword) {
          var updatePassword = function updatePassword(password) {
            _this11._passwordCapability.resolve({ password: password });
          };
          loadingTask.onPassword(updatePassword, exception.code);
        } else {
          this._passwordCapability.reject(new _util.PasswordException(exception.message, exception.code));
        }
        return this._passwordCapability.promise;
      }, this);
      messageHandler.on('PasswordException', function transportPasswordException(exception) {
        loadingTask._capability.reject(new _util.PasswordException(exception.message, exception.code));
      }, this);
      messageHandler.on('InvalidPDF', function transportInvalidPDF(exception) {
        this.loadingTask._capability.reject(new _util.InvalidPDFException(exception.message));
      }, this);
      messageHandler.on('MissingPDF', function transportMissingPDF(exception) {
        this.loadingTask._capability.reject(new _util.MissingPDFException(exception.message));
      }, this);
      messageHandler.on('UnexpectedResponse', function transportUnexpectedResponse(exception) {
        this.loadingTask._capability.reject(new _util.UnexpectedResponseException(exception.message, exception.status));
      }, this);
      messageHandler.on('UnknownError', function transportUnknownError(exception) {
        this.loadingTask._capability.reject(new _util.UnknownErrorException(exception.message, exception.details));
      }, this);
      messageHandler.on('DataLoaded', function transportPage(data) {
        this.downloadInfoCapability.resolve(data);
      }, this);
      messageHandler.on('PDFManagerReady', function transportPage(data) {}, this);
      messageHandler.on('StartRenderPage', function transportRender(data) {
        if (this.destroyed) {
          return;
        }
        var page = this.pageCache[data.pageIndex];
        page.stats.timeEnd('Page Request');
        page._startRenderPage(data.transparency, data.intent);
      }, this);
      messageHandler.on('RenderPageChunk', function transportRender(data) {
        if (this.destroyed) {
          return;
        }
        var page = this.pageCache[data.pageIndex];
        page._renderPageChunk(data.operatorList, data.intent);
      }, this);
      messageHandler.on('commonobj', function transportObj(data) {
        var _this12 = this;

        if (this.destroyed) {
          return;
        }
        var id = data[0];
        var type = data[1];
        if (this.commonObjs.hasData(id)) {
          return;
        }
        switch (type) {
          case 'Font':
            var exportedData = data[2];
            if ('error' in exportedData) {
              var exportedError = exportedData.error;
              (0, _util.warn)('Error during font loading: ' + exportedError);
              this.commonObjs.resolve(id, exportedError);
              break;
            }
            var fontRegistry = null;
            if ((0, _dom_utils.getDefaultSetting)('pdfBug') && _global_scope2.default.FontInspector && _global_scope2.default['FontInspector'].enabled) {
              fontRegistry = {
                registerFont: function registerFont(font, url) {
                  _global_scope2.default['FontInspector'].fontAdded(font, url);
                }
              };
            }
            var font = new _font_loader.FontFaceObject(exportedData, {
              isEvalSupported: (0, _dom_utils.getDefaultSetting)('isEvalSupported'),
              disableFontFace: (0, _dom_utils.getDefaultSetting)('disableFontFace'),
              fontRegistry: fontRegistry
            });
            var fontReady = function fontReady(fontObjs) {
              _this12.commonObjs.resolve(id, font);
            };
            this.fontLoader.bind([font], fontReady);
            break;
          case 'FontPath':
            this.commonObjs.resolve(id, data[2]);
            break;
          default:
            throw new Error('Got unknown common object type ' + type);
        }
      }, this);
      messageHandler.on('obj', function transportObj(data) {
        if (this.destroyed) {
          return;
        }
        var id = data[0];
        var pageIndex = data[1];
        var type = data[2];
        var pageProxy = this.pageCache[pageIndex];
        var imageData;
        if (pageProxy.objs.hasData(id)) {
          return;
        }
        switch (type) {
          case 'JpegStream':
            imageData = data[3];
            (0, _util.loadJpegStream)(id, imageData, pageProxy.objs);
            break;
          case 'Image':
            imageData = data[3];
            pageProxy.objs.resolve(id, imageData);
            var MAX_IMAGE_SIZE_TO_STORE = 8000000;
            if (imageData && 'data' in imageData && imageData.data.length > MAX_IMAGE_SIZE_TO_STORE) {
              pageProxy.cleanupAfterRender = true;
            }
            break;
          default:
            throw new Error('Got unknown object type ' + type);
        }
      }, this);
      messageHandler.on('DocProgress', function transportDocProgress(data) {
        if (this.destroyed) {
          return;
        }
        var loadingTask = this.loadingTask;
        if (loadingTask.onProgress) {
          loadingTask.onProgress({
            loaded: data.loaded,
            total: data.total
          });
        }
      }, this);
      messageHandler.on('PageError', function transportError(data) {
        if (this.destroyed) {
          return;
        }
        var page = this.pageCache[data.pageNum - 1];
        var intentState = page.intentStates[data.intent];
        if (intentState.displayReadyCapability) {
          intentState.displayReadyCapability.reject(data.error);
        } else {
          throw new Error(data.error);
        }
        if (intentState.operatorList) {
          intentState.operatorList.lastChunk = true;
          for (var i = 0; i < intentState.renderTasks.length; i++) {
            intentState.renderTasks[i].operatorListChanged();
          }
        }
      }, this);
      messageHandler.on('UnsupportedFeature', function transportUnsupportedFeature(data) {
        if (this.destroyed) {
          return;
        }
        var featureId = data.featureId;
        var loadingTask = this.loadingTask;
        if (loadingTask.onUnsupportedFeature) {
          loadingTask.onUnsupportedFeature(featureId);
        }
        _UnsupportedManager.notify(featureId);
      }, this);
      messageHandler.on('JpegDecode', function (data) {
        if (this.destroyed) {
          return Promise.reject(new Error('Worker was destroyed'));
        }
        if (typeof document === 'undefined') {
          return Promise.reject(new Error('"document" is not defined.'));
        }
        var imageUrl = data[0];
        var components = data[1];
        if (components !== 3 && components !== 1) {
          return Promise.reject(new Error('Only 3 components or 1 component can be returned'));
        }
        return new Promise(function (resolve, reject) {
          var img = new Image();
          img.onload = function () {
            var width = img.width;
            var height = img.height;
            var size = width * height;
            var rgbaLength = size * 4;
            var buf = new Uint8Array(size * components);
            var tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;
            var tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.drawImage(img, 0, 0);
            var data = tmpCtx.getImageData(0, 0, width, height).data;
            var i, j;
            if (components === 3) {
              for (i = 0, j = 0; i < rgbaLength; i += 4, j += 3) {
                buf[j] = data[i];
                buf[j + 1] = data[i + 1];
                buf[j + 2] = data[i + 2];
              }
            } else if (components === 1) {
              for (i = 0, j = 0; i < rgbaLength; i += 4, j++) {
                buf[j] = data[i];
              }
            }
            resolve({
              data: buf,
              width: width,
              height: height
            });
          };
          img.onerror = function () {
            reject(new Error('JpegDecode failed to load image'));
          };
          img.src = imageUrl;
        });
      }, this);
      messageHandler.on('FetchBuiltInCMap', function (data) {
        if (this.destroyed) {
          return Promise.reject(new Error('Worker was destroyed'));
        }
        return this.CMapReaderFactory.fetch({ name: data.name });
      }, this);
    },
    getData: function WorkerTransport_getData() {
      return this.messageHandler.sendWithPromise('GetData', null);
    },
    getPage: function WorkerTransport_getPage(pageNumber, capability) {
      var _this13 = this;

      if (!Number.isInteger(pageNumber) || pageNumber <= 0 || pageNumber > this.numPages) {
        return Promise.reject(new Error('Invalid page request'));
      }
      var pageIndex = pageNumber - 1;
      if (pageIndex in this.pagePromises) {
        return this.pagePromises[pageIndex];
      }
      var promise = this.messageHandler.sendWithPromise('GetPage', { pageIndex: pageIndex }).then(function (pageInfo) {
        if (_this13.destroyed) {
          throw new Error('Transport destroyed');
        }
        var page = new PDFPageProxy(pageIndex, pageInfo, _this13);
        _this13.pageCache[pageIndex] = page;
        return page;
      });
      this.pagePromises[pageIndex] = promise;
      return promise;
    },
    getPageIndex: function WorkerTransport_getPageIndexByRef(ref) {
      return this.messageHandler.sendWithPromise('GetPageIndex', { ref: ref }).catch(function (reason) {
        return Promise.reject(new Error(reason));
      });
    },
    getAnnotations: function WorkerTransport_getAnnotations(pageIndex, intent) {
      return this.messageHandler.sendWithPromise('GetAnnotations', {
        pageIndex: pageIndex,
        intent: intent
      });
    },
    getDestinations: function WorkerTransport_getDestinations() {
      return this.messageHandler.sendWithPromise('GetDestinations', null);
    },
    getDestination: function WorkerTransport_getDestination(id) {
      return this.messageHandler.sendWithPromise('GetDestination', { id: id });
    },
    getPageLabels: function WorkerTransport_getPageLabels() {
      return this.messageHandler.sendWithPromise('GetPageLabels', null);
    },
    getPageMode: function getPageMode() {
      return this.messageHandler.sendWithPromise('GetPageMode', null);
    },

    getAttachments: function WorkerTransport_getAttachments() {
      return this.messageHandler.sendWithPromise('GetAttachments', null);
    },
    getJavaScript: function WorkerTransport_getJavaScript() {
      return this.messageHandler.sendWithPromise('GetJavaScript', null);
    },
    getOutline: function WorkerTransport_getOutline() {
      return this.messageHandler.sendWithPromise('GetOutline', null);
    },
    getMetadata: function WorkerTransport_getMetadata() {
      return this.messageHandler.sendWithPromise('GetMetadata', null).then(function transportMetadata(results) {
        return {
          info: results[0],
          metadata: results[1] ? new _metadata.Metadata(results[1]) : null
        };
      });
    },
    getStats: function WorkerTransport_getStats() {
      return this.messageHandler.sendWithPromise('GetStats', null);
    },
    startCleanup: function WorkerTransport_startCleanup() {
      var _this14 = this;

      this.messageHandler.sendWithPromise('Cleanup', null).then(function () {
        for (var i = 0, ii = _this14.pageCache.length; i < ii; i++) {
          var page = _this14.pageCache[i];
          if (page) {
            page.cleanup();
          }
        }
        _this14.commonObjs.clear();
        _this14.fontLoader.clear();
      });
    }
  };
  return WorkerTransport;
}();
var PDFObjects = function PDFObjectsClosure() {
  function PDFObjects() {
    this.objs = Object.create(null);
  }
  PDFObjects.prototype = {
    ensureObj: function PDFObjects_ensureObj(objId) {
      if (this.objs[objId]) {
        return this.objs[objId];
      }
      var obj = {
        capability: (0, _util.createPromiseCapability)(),
        data: null,
        resolved: false
      };
      this.objs[objId] = obj;
      return obj;
    },
    get: function PDFObjects_get(objId, callback) {
      if (callback) {
        this.ensureObj(objId).capability.promise.then(callback);
        return null;
      }
      var obj = this.objs[objId];
      if (!obj || !obj.resolved) {
        throw new Error('Requesting object that isn\'t resolved yet ' + objId);
      }
      return obj.data;
    },
    resolve: function PDFObjects_resolve(objId, data) {
      var obj = this.ensureObj(objId);
      obj.resolved = true;
      obj.data = data;
      obj.capability.resolve(data);
    },
    isResolved: function PDFObjects_isResolved(objId) {
      var objs = this.objs;
      if (!objs[objId]) {
        return false;
      }
      return objs[objId].resolved;
    },
    hasData: function PDFObjects_hasData(objId) {
      return this.isResolved(objId);
    },
    getData: function PDFObjects_getData(objId) {
      var objs = this.objs;
      if (!objs[objId] || !objs[objId].resolved) {
        return null;
      }
      return objs[objId].data;
    },
    clear: function PDFObjects_clear() {
      this.objs = Object.create(null);
    }
  };
  return PDFObjects;
}();
var RenderTask = function RenderTaskClosure() {
  function RenderTask(internalRenderTask) {
    this._internalRenderTask = internalRenderTask;
    this.onContinue = null;
  }
  RenderTask.prototype = {
    get promise() {
      return this._internalRenderTask.capability.promise;
    },
    cancel: function RenderTask_cancel() {
      this._internalRenderTask.cancel();
    },
    then: function RenderTask_then(onFulfilled, onRejected) {
      return this.promise.then.apply(this.promise, arguments);
    }
  };
  return RenderTask;
}();
var InternalRenderTask = function InternalRenderTaskClosure() {
  var canvasInRendering = new WeakMap();
  function InternalRenderTask(callback, params, objs, commonObjs, operatorList, pageNumber, canvasFactory) {
    this.callback = callback;
    this.params = params;
    this.objs = objs;
    this.commonObjs = commonObjs;
    this.operatorListIdx = null;
    this.operatorList = operatorList;
    this.pageNumber = pageNumber;
    this.canvasFactory = canvasFactory;
    this.running = false;
    this.graphicsReadyCallback = null;
    this.graphicsReady = false;
    this.useRequestAnimationFrame = false;
    this.cancelled = false;
    this.capability = (0, _util.createPromiseCapability)();
    this.task = new RenderTask(this);
    this._continueBound = this._continue.bind(this);
    this._scheduleNextBound = this._scheduleNext.bind(this);
    this._nextBound = this._next.bind(this);
    this._canvas = params.canvasContext.canvas;
  }
  InternalRenderTask.prototype = {
    initializeGraphics: function InternalRenderTask_initializeGraphics(transparency) {
      if (this._canvas) {
        if (canvasInRendering.has(this._canvas)) {
          throw new Error('Cannot use the same canvas during multiple render() operations. ' + 'Use different canvas or ensure previous operations were ' + 'cancelled or completed.');
        }
        canvasInRendering.set(this._canvas, this);
      }
      if (this.cancelled) {
        return;
      }
      if ((0, _dom_utils.getDefaultSetting)('pdfBug') && _global_scope2.default.StepperManager && _global_scope2.default.StepperManager.enabled) {
        this.stepper = _global_scope2.default.StepperManager.create(this.pageNumber - 1);
        this.stepper.init(this.operatorList);
        this.stepper.nextBreakPoint = this.stepper.getNextBreakPoint();
      }
      var params = this.params;
      this.gfx = new _canvas.CanvasGraphics(params.canvasContext, this.commonObjs, this.objs, this.canvasFactory, params.imageLayer);
      this.gfx.beginDrawing({
        transform: params.transform,
        viewport: params.viewport,
        transparency: transparency,
        background: params.background
      });
      this.operatorListIdx = 0;
      this.graphicsReady = true;
      if (this.graphicsReadyCallback) {
        this.graphicsReadyCallback();
      }
    },
    cancel: function InternalRenderTask_cancel() {
      this.running = false;
      this.cancelled = true;
      if (this._canvas) {
        canvasInRendering.delete(this._canvas);
      }
      if ((0, _dom_utils.getDefaultSetting)('pdfjsNext')) {
        this.callback(new _dom_utils.RenderingCancelledException('Rendering cancelled, page ' + this.pageNumber, 'canvas'));
      } else {
        this.callback('cancelled');
      }
    },
    operatorListChanged: function InternalRenderTask_operatorListChanged() {
      if (!this.graphicsReady) {
        if (!this.graphicsReadyCallback) {
          this.graphicsReadyCallback = this._continueBound;
        }
        return;
      }
      if (this.stepper) {
        this.stepper.updateOperatorList(this.operatorList);
      }
      if (this.running) {
        return;
      }
      this._continue();
    },
    _continue: function InternalRenderTask__continue() {
      this.running = true;
      if (this.cancelled) {
        return;
      }
      if (this.task.onContinue) {
        this.task.onContinue(this._scheduleNextBound);
      } else {
        this._scheduleNext();
      }
    },
    _scheduleNext: function InternalRenderTask__scheduleNext() {
      if (this.useRequestAnimationFrame && typeof window !== 'undefined') {
        window.requestAnimationFrame(this._nextBound);
      } else {
        Promise.resolve(undefined).then(this._nextBound);
      }
    },
    _next: function InternalRenderTask__next() {
      if (this.cancelled) {
        return;
      }
      this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList, this.operatorListIdx, this._continueBound, this.stepper);
      if (this.operatorListIdx === this.operatorList.argsArray.length) {
        this.running = false;
        if (this.operatorList.lastChunk) {
          this.gfx.endDrawing();
          if (this._canvas) {
            canvasInRendering.delete(this._canvas);
          }
          this.callback();
        }
      }
    }
  };
  return InternalRenderTask;
}();
var _UnsupportedManager = function UnsupportedManagerClosure() {
  var listeners = [];
  return {
    listen: function listen(cb) {
      (0, _util.deprecated)('Global UnsupportedManager.listen is used: ' + ' use PDFDocumentLoadingTask.onUnsupportedFeature instead');
      listeners.push(cb);
    },
    notify: function notify(featureId) {
      for (var i = 0, ii = listeners.length; i < ii; i++) {
        listeners[i](featureId);
      }
    }
  };
}();
var version, build;
{
  exports.version = version = '1.10.88';
  exports.build = build = 'c62a1938';
}
exports.getDocument = getDocument;
exports.LoopbackPort = LoopbackPort;
exports.PDFDataRangeTransport = PDFDataRangeTransport;
exports.PDFWorker = PDFWorker;
exports.PDFDocumentProxy = PDFDocumentProxy;
exports.PDFPageProxy = PDFPageProxy;
exports.setPDFNetworkStreamClass = setPDFNetworkStreamClass;
exports._UnsupportedManager = _UnsupportedManager;
exports.version = version;
exports.build = build;

/***/ }),
/* 70 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebGLUtils = undefined;

var _dom_utils = __w_pdfjs_require__(13);

var _util = __w_pdfjs_require__(0);

var WebGLUtils = function WebGLUtilsClosure() {
  function loadShader(gl, code, shaderType) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      var errorMsg = gl.getShaderInfoLog(shader);
      throw new Error('Error during shader compilation: ' + errorMsg);
    }
    return shader;
  }
  function createVertexShader(gl, code) {
    return loadShader(gl, code, gl.VERTEX_SHADER);
  }
  function createFragmentShader(gl, code) {
    return loadShader(gl, code, gl.FRAGMENT_SHADER);
  }
  function createProgram(gl, shaders) {
    var program = gl.createProgram();
    for (var i = 0, ii = shaders.length; i < ii; ++i) {
      gl.attachShader(program, shaders[i]);
    }
    gl.linkProgram(program);
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      var errorMsg = gl.getProgramInfoLog(program);
      throw new Error('Error during program linking: ' + errorMsg);
    }
    return program;
  }
  function createTexture(gl, image, textureId) {
    gl.activeTexture(textureId);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return texture;
  }
  var currentGL, currentCanvas;
  function generateGL() {
    if (currentGL) {
      return;
    }
    currentCanvas = document.createElement('canvas');
    currentGL = currentCanvas.getContext('webgl', { premultipliedalpha: false });
  }
  var smaskVertexShaderCode = '\
  attribute vec2 a_position;                                    \
  attribute vec2 a_texCoord;                                    \
                                                                \
  uniform vec2 u_resolution;                                    \
                                                                \
  varying vec2 v_texCoord;                                      \
                                                                \
  void main() {                                                 \
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;   \
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);          \
                                                                \
    v_texCoord = a_texCoord;                                    \
  }                                                             ';
  var smaskFragmentShaderCode = '\
  precision mediump float;                                      \
                                                                \
  uniform vec4 u_backdrop;                                      \
  uniform int u_subtype;                                        \
  uniform sampler2D u_image;                                    \
  uniform sampler2D u_mask;                                     \
                                                                \
  varying vec2 v_texCoord;                                      \
                                                                \
  void main() {                                                 \
    vec4 imageColor = texture2D(u_image, v_texCoord);           \
    vec4 maskColor = texture2D(u_mask, v_texCoord);             \
    if (u_backdrop.a > 0.0) {                                   \
      maskColor.rgb = maskColor.rgb * maskColor.a +             \
                      u_backdrop.rgb * (1.0 - maskColor.a);     \
    }                                                           \
    float lum;                                                  \
    if (u_subtype == 0) {                                       \
      lum = maskColor.a;                                        \
    } else {                                                    \
      lum = maskColor.r * 0.3 + maskColor.g * 0.59 +            \
            maskColor.b * 0.11;                                 \
    }                                                           \
    imageColor.a *= lum;                                        \
    imageColor.rgb *= imageColor.a;                             \
    gl_FragColor = imageColor;                                  \
  }                                                             ';
  var smaskCache = null;
  function initSmaskGL() {
    var canvas, gl;
    generateGL();
    canvas = currentCanvas;
    currentCanvas = null;
    gl = currentGL;
    currentGL = null;
    var vertexShader = createVertexShader(gl, smaskVertexShaderCode);
    var fragmentShader = createFragmentShader(gl, smaskFragmentShaderCode);
    var program = createProgram(gl, [vertexShader, fragmentShader]);
    gl.useProgram(program);
    var cache = {};
    cache.gl = gl;
    cache.canvas = canvas;
    cache.resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    cache.positionLocation = gl.getAttribLocation(program, 'a_position');
    cache.backdropLocation = gl.getUniformLocation(program, 'u_backdrop');
    cache.subtypeLocation = gl.getUniformLocation(program, 'u_subtype');
    var texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    var texLayerLocation = gl.getUniformLocation(program, 'u_image');
    var texMaskLocation = gl.getUniformLocation(program, 'u_mask');
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(texLayerLocation, 0);
    gl.uniform1i(texMaskLocation, 1);
    smaskCache = cache;
  }
  function composeSMask(layer, mask, properties) {
    var width = layer.width,
        height = layer.height;
    if (!smaskCache) {
      initSmaskGL();
    }
    var cache = smaskCache,
        canvas = cache.canvas,
        gl = cache.gl;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(cache.resolutionLocation, width, height);
    if (properties.backdrop) {
      gl.uniform4f(cache.resolutionLocation, properties.backdrop[0], properties.backdrop[1], properties.backdrop[2], 1);
    } else {
      gl.uniform4f(cache.resolutionLocation, 0, 0, 0, 0);
    }
    gl.uniform1i(cache.subtypeLocation, properties.subtype === 'Luminosity' ? 1 : 0);
    var texture = createTexture(gl, layer, gl.TEXTURE0);
    var maskTexture = createTexture(gl, mask, gl.TEXTURE1);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, width, 0, 0, height, 0, height, width, 0, width, height]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(cache.positionLocation);
    gl.vertexAttribPointer(cache.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
    gl.deleteTexture(texture);
    gl.deleteTexture(maskTexture);
    gl.deleteBuffer(buffer);
    return canvas;
  }
  var figuresVertexShaderCode = '\
  attribute vec2 a_position;                                    \
  attribute vec3 a_color;                                       \
                                                                \
  uniform vec2 u_resolution;                                    \
  uniform vec2 u_scale;                                         \
  uniform vec2 u_offset;                                        \
                                                                \
  varying vec4 v_color;                                         \
                                                                \
  void main() {                                                 \
    vec2 position = (a_position + u_offset) * u_scale;          \
    vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;     \
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);          \
                                                                \
    v_color = vec4(a_color / 255.0, 1.0);                       \
  }                                                             ';
  var figuresFragmentShaderCode = '\
  precision mediump float;                                      \
                                                                \
  varying vec4 v_color;                                         \
                                                                \
  void main() {                                                 \
    gl_FragColor = v_color;                                     \
  }                                                             ';
  var figuresCache = null;
  function initFiguresGL() {
    var canvas, gl;
    generateGL();
    canvas = currentCanvas;
    currentCanvas = null;
    gl = currentGL;
    currentGL = null;
    var vertexShader = createVertexShader(gl, figuresVertexShaderCode);
    var fragmentShader = createFragmentShader(gl, figuresFragmentShaderCode);
    var program = createProgram(gl, [vertexShader, fragmentShader]);
    gl.useProgram(program);
    var cache = {};
    cache.gl = gl;
    cache.canvas = canvas;
    cache.resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    cache.scaleLocation = gl.getUniformLocation(program, 'u_scale');
    cache.offsetLocation = gl.getUniformLocation(program, 'u_offset');
    cache.positionLocation = gl.getAttribLocation(program, 'a_position');
    cache.colorLocation = gl.getAttribLocation(program, 'a_color');
    figuresCache = cache;
  }
  function drawFigures(width, height, backgroundColor, figures, context) {
    if (!figuresCache) {
      initFiguresGL();
    }
    var cache = figuresCache,
        canvas = cache.canvas,
        gl = cache.gl;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(cache.resolutionLocation, width, height);
    var count = 0;
    var i, ii, rows;
    for (i = 0, ii = figures.length; i < ii; i++) {
      switch (figures[i].type) {
        case 'lattice':
          rows = figures[i].coords.length / figures[i].verticesPerRow | 0;
          count += (rows - 1) * (figures[i].verticesPerRow - 1) * 6;
          break;
        case 'triangles':
          count += figures[i].coords.length;
          break;
      }
    }
    var coords = new Float32Array(count * 2);
    var colors = new Uint8Array(count * 3);
    var coordsMap = context.coords,
        colorsMap = context.colors;
    var pIndex = 0,
        cIndex = 0;
    for (i = 0, ii = figures.length; i < ii; i++) {
      var figure = figures[i],
          ps = figure.coords,
          cs = figure.colors;
      switch (figure.type) {
        case 'lattice':
          var cols = figure.verticesPerRow;
          rows = ps.length / cols | 0;
          for (var row = 1; row < rows; row++) {
            var offset = row * cols + 1;
            for (var col = 1; col < cols; col++, offset++) {
              coords[pIndex] = coordsMap[ps[offset - cols - 1]];
              coords[pIndex + 1] = coordsMap[ps[offset - cols - 1] + 1];
              coords[pIndex + 2] = coordsMap[ps[offset - cols]];
              coords[pIndex + 3] = coordsMap[ps[offset - cols] + 1];
              coords[pIndex + 4] = coordsMap[ps[offset - 1]];
              coords[pIndex + 5] = coordsMap[ps[offset - 1] + 1];
              colors[cIndex] = colorsMap[cs[offset - cols - 1]];
              colors[cIndex + 1] = colorsMap[cs[offset - cols - 1] + 1];
              colors[cIndex + 2] = colorsMap[cs[offset - cols - 1] + 2];
              colors[cIndex + 3] = colorsMap[cs[offset - cols]];
              colors[cIndex + 4] = colorsMap[cs[offset - cols] + 1];
              colors[cIndex + 5] = colorsMap[cs[offset - cols] + 2];
              colors[cIndex + 6] = colorsMap[cs[offset - 1]];
              colors[cIndex + 7] = colorsMap[cs[offset - 1] + 1];
              colors[cIndex + 8] = colorsMap[cs[offset - 1] + 2];
              coords[pIndex + 6] = coords[pIndex + 2];
              coords[pIndex + 7] = coords[pIndex + 3];
              coords[pIndex + 8] = coords[pIndex + 4];
              coords[pIndex + 9] = coords[pIndex + 5];
              coords[pIndex + 10] = coordsMap[ps[offset]];
              coords[pIndex + 11] = coordsMap[ps[offset] + 1];
              colors[cIndex + 9] = colors[cIndex + 3];
              colors[cIndex + 10] = colors[cIndex + 4];
              colors[cIndex + 11] = colors[cIndex + 5];
              colors[cIndex + 12] = colors[cIndex + 6];
              colors[cIndex + 13] = colors[cIndex + 7];
              colors[cIndex + 14] = colors[cIndex + 8];
              colors[cIndex + 15] = colorsMap[cs[offset]];
              colors[cIndex + 16] = colorsMap[cs[offset] + 1];
              colors[cIndex + 17] = colorsMap[cs[offset] + 2];
              pIndex += 12;
              cIndex += 18;
            }
          }
          break;
        case 'triangles':
          for (var j = 0, jj = ps.length; j < jj; j++) {
            coords[pIndex] = coordsMap[ps[j]];
            coords[pIndex + 1] = coordsMap[ps[j] + 1];
            colors[cIndex] = colorsMap[cs[j]];
            colors[cIndex + 1] = colorsMap[cs[j] + 1];
            colors[cIndex + 2] = colorsMap[cs[j] + 2];
            pIndex += 2;
            cIndex += 3;
          }
          break;
      }
    }
    if (backgroundColor) {
      gl.clearColor(backgroundColor[0] / 255, backgroundColor[1] / 255, backgroundColor[2] / 255, 1.0);
    } else {
      gl.clearColor(0, 0, 0, 0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    var coordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(cache.positionLocation);
    gl.vertexAttribPointer(cache.positionLocation, 2, gl.FLOAT, false, 0, 0);
    var colorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(cache.colorLocation);
    gl.vertexAttribPointer(cache.colorLocation, 3, gl.UNSIGNED_BYTE, false, 0, 0);
    gl.uniform2f(cache.scaleLocation, context.scaleX, context.scaleY);
    gl.uniform2f(cache.offsetLocation, context.offsetX, context.offsetY);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    gl.flush();
    gl.deleteBuffer(coordsBuffer);
    gl.deleteBuffer(colorsBuffer);
    return canvas;
  }
  function cleanup() {
    if (smaskCache && smaskCache.canvas) {
      smaskCache.canvas.width = 0;
      smaskCache.canvas.height = 0;
    }
    if (figuresCache && figuresCache.canvas) {
      figuresCache.canvas.width = 0;
      figuresCache.canvas.height = 0;
    }
    smaskCache = null;
    figuresCache = null;
  }
  return {
    get isEnabled() {
      if ((0, _dom_utils.getDefaultSetting)('disableWebGL')) {
        return false;
      }
      var enabled = false;
      try {
        generateGL();
        enabled = !!currentGL;
      } catch (e) {}
      return (0, _util.shadow)(this, 'isEnabled', enabled);
    },
    composeSMask: composeSMask,
    drawFigures: drawFigures,
    clear: cleanup
  };
}();
exports.WebGLUtils = WebGLUtils;

/***/ }),
/* 71 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Metadata = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __w_pdfjs_require__(0);

var _dom_utils = __w_pdfjs_require__(13);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Metadata = function () {
  function Metadata(data) {
    _classCallCheck(this, Metadata);

    (0, _util.assert)(typeof data === 'string', 'Metadata: input is not a string');
    data = this._repair(data);
    var parser = new _dom_utils.SimpleXMLParser();
    data = parser.parseFromString(data);
    this._metadata = Object.create(null);
    this._parse(data);
  }

  _createClass(Metadata, [{
    key: '_repair',
    value: function _repair(data) {
      return data.replace(/>\\376\\377([^<]+)/g, function (all, codes) {
        var bytes = codes.replace(/\\([0-3])([0-7])([0-7])/g, function (code, d1, d2, d3) {
          return String.fromCharCode(d1 * 64 + d2 * 8 + d3 * 1);
        });
        var chars = '';
        for (var i = 0, ii = bytes.length; i < ii; i += 2) {
          var code = bytes.charCodeAt(i) * 256 + bytes.charCodeAt(i + 1);
          if (code >= 32 && code < 127 && code !== 60 && code !== 62 && code !== 38) {
            chars += String.fromCharCode(code);
          } else {
            chars += '&#x' + (0x10000 + code).toString(16).substring(1) + ';';
          }
        }
        return '>' + chars;
      });
    }
  }, {
    key: '_parse',
    value: function _parse(domDocument) {
      var rdf = domDocument.documentElement;
      if (rdf.nodeName.toLowerCase() !== 'rdf:rdf') {
        rdf = rdf.firstChild;
        while (rdf && rdf.nodeName.toLowerCase() !== 'rdf:rdf') {
          rdf = rdf.nextSibling;
        }
      }
      var nodeName = rdf ? rdf.nodeName.toLowerCase() : null;
      if (!rdf || nodeName !== 'rdf:rdf' || !rdf.hasChildNodes()) {
        return;
      }
      var children = rdf.childNodes;
      for (var i = 0, ii = children.length; i < ii; i++) {
        var desc = children[i];
        if (desc.nodeName.toLowerCase() !== 'rdf:description') {
          continue;
        }
        for (var j = 0, jj = desc.childNodes.length; j < jj; j++) {
          if (desc.childNodes[j].nodeName.toLowerCase() !== '#text') {
            var entry = desc.childNodes[j];
            var name = entry.nodeName.toLowerCase();
            this._metadata[name] = entry.textContent.trim();
          }
        }
      }
    }
  }, {
    key: 'get',
    value: function get(name) {
      return this._metadata[name] || null;
    }
  }, {
    key: 'getAll',
    value: function getAll() {
      return this._metadata;
    }
  }, {
    key: 'has',
    value: function has(name) {
      return typeof this._metadata[name] !== 'undefined';
    }
  }, {
    key: 'metadata',
    get: function get() {
      (0, _util.deprecated)('`metadata` getter; use `getAll()` instead.');
      return this.getAll();
    }
  }]);

  return Metadata;
}();

exports.Metadata = Metadata;

/***/ }),
/* 72 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnnotationLayer = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dom_utils = __w_pdfjs_require__(13);

var _util = __w_pdfjs_require__(0);

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AnnotationElementFactory = function () {
  function AnnotationElementFactory() {
    _classCallCheck(this, AnnotationElementFactory);
  }

  _createClass(AnnotationElementFactory, null, [{
    key: 'create',
    value: function create(parameters) {
      var subtype = parameters.data.annotationType;
      switch (subtype) {
        case _util.AnnotationType.LINK:
          return new LinkAnnotationElement(parameters);
        case _util.AnnotationType.TEXT:
          return new TextAnnotationElement(parameters);
        case _util.AnnotationType.WIDGET:
          var fieldType = parameters.data.fieldType;
          switch (fieldType) {
            case 'Tx':
              return new TextWidgetAnnotationElement(parameters);
            case 'Btn':
              if (parameters.data.radioButton) {
                return new RadioButtonWidgetAnnotationElement(parameters);
              } else if (parameters.data.checkBox) {
                return new CheckboxWidgetAnnotationElement(parameters);
              }
              (0, _util.warn)('Unimplemented button widget annotation: pushbutton');
              break;
            case 'Ch':
              return new ChoiceWidgetAnnotationElement(parameters);
          }
          return new WidgetAnnotationElement(parameters);
        case _util.AnnotationType.POPUP:
          return new PopupAnnotationElement(parameters);
        case _util.AnnotationType.LINE:
          return new LineAnnotationElement(parameters);
        case _util.AnnotationType.SQUARE:
          return new SquareAnnotationElement(parameters);
        case _util.AnnotationType.CIRCLE:
          return new CircleAnnotationElement(parameters);
        case _util.AnnotationType.POLYLINE:
          return new PolylineAnnotationElement(parameters);
        case _util.AnnotationType.POLYGON:
          return new PolygonAnnotationElement(parameters);
        case _util.AnnotationType.HIGHLIGHT:
          return new HighlightAnnotationElement(parameters);
        case _util.AnnotationType.UNDERLINE:
          return new UnderlineAnnotationElement(parameters);
        case _util.AnnotationType.SQUIGGLY:
          return new SquigglyAnnotationElement(parameters);
        case _util.AnnotationType.STRIKEOUT:
          return new StrikeOutAnnotationElement(parameters);
        case _util.AnnotationType.STAMP:
          return new StampAnnotationElement(parameters);
        case _util.AnnotationType.FILEATTACHMENT:
          return new FileAttachmentAnnotationElement(parameters);
        default:
          return new AnnotationElement(parameters);
      }
    }
  }]);

  return AnnotationElementFactory;
}();

var AnnotationElement = function () {
  function AnnotationElement(parameters) {
    var isRenderable = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var ignoreBorder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    _classCallCheck(this, AnnotationElement);

    this.isRenderable = isRenderable;
    this.data = parameters.data;
    this.layer = parameters.layer;
    this.page = parameters.page;
    this.viewport = parameters.viewport;
    this.linkService = parameters.linkService;
    this.downloadManager = parameters.downloadManager;
    this.imageResourcesPath = parameters.imageResourcesPath;
    this.renderInteractiveForms = parameters.renderInteractiveForms;
    this.svgFactory = parameters.svgFactory;
    if (isRenderable) {
      this.container = this._createContainer(ignoreBorder);
    }
  }

  _createClass(AnnotationElement, [{
    key: '_createContainer',
    value: function _createContainer() {
      var ignoreBorder = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      var data = this.data,
          page = this.page,
          viewport = this.viewport;
      var container = document.createElement('section');
      var width = data.rect[2] - data.rect[0];
      var height = data.rect[3] - data.rect[1];
      container.setAttribute('data-annotation-id', data.id);
      var rect = _util.Util.normalizeRect([data.rect[0], page.view[3] - data.rect[1] + page.view[1], data.rect[2], page.view[3] - data.rect[3] + page.view[1]]);
      _dom_utils.CustomStyle.setProp('transform', container, 'matrix(' + viewport.transform.join(',') + ')');
      _dom_utils.CustomStyle.setProp('transformOrigin', container, -rect[0] + 'px ' + -rect[1] + 'px');
      if (!ignoreBorder && data.borderStyle.width > 0) {
        container.style.borderWidth = data.borderStyle.width + 'px';
        if (data.borderStyle.style !== _util.AnnotationBorderStyleType.UNDERLINE) {
          width = width - 2 * data.borderStyle.width;
          height = height - 2 * data.borderStyle.width;
        }
        var horizontalRadius = data.borderStyle.horizontalCornerRadius;
        var verticalRadius = data.borderStyle.verticalCornerRadius;
        if (horizontalRadius > 0 || verticalRadius > 0) {
          var radius = horizontalRadius + 'px / ' + verticalRadius + 'px';
          _dom_utils.CustomStyle.setProp('borderRadius', container, radius);
        }
        switch (data.borderStyle.style) {
          case _util.AnnotationBorderStyleType.SOLID:
            container.style.borderStyle = 'solid';
            break;
          case _util.AnnotationBorderStyleType.DASHED:
            container.style.borderStyle = 'dashed';
            break;
          case _util.AnnotationBorderStyleType.BEVELED:
            (0, _util.warn)('Unimplemented border style: beveled');
            break;
          case _util.AnnotationBorderStyleType.INSET:
            (0, _util.warn)('Unimplemented border style: inset');
            break;
          case _util.AnnotationBorderStyleType.UNDERLINE:
            container.style.borderBottomStyle = 'solid';
            break;
          default:
            break;
        }
        if (data.color) {
          container.style.borderColor = _util.Util.makeCssRgb(data.color[0] | 0, data.color[1] | 0, data.color[2] | 0);
        } else {
          container.style.borderWidth = 0;
        }
      }
      container.style.left = rect[0] + 'px';
      container.style.top = rect[1] + 'px';
      container.style.width = width + 'px';
      container.style.height = height + 'px';
      return container;
    }
  }, {
    key: '_createPopup',
    value: function _createPopup(container, trigger, data) {
      if (!trigger) {
        trigger = document.createElement('div');
        trigger.style.height = container.style.height;
        trigger.style.width = container.style.width;
        container.appendChild(trigger);
      }
      var popupElement = new PopupElement({
        container: container,
        trigger: trigger,
        color: data.color,
        title: data.title,
        contents: data.contents,
        hideWrapper: true
      });
      var popup = popupElement.render();
      popup.style.left = container.style.width;
      container.appendChild(popup);
    }
  }, {
    key: 'render',
    value: function render() {
      throw new Error('Abstract method `AnnotationElement.render` called');
    }
  }]);

  return AnnotationElement;
}();

var LinkAnnotationElement = function (_AnnotationElement) {
  _inherits(LinkAnnotationElement, _AnnotationElement);

  function LinkAnnotationElement(parameters) {
    _classCallCheck(this, LinkAnnotationElement);

    var isRenderable = !!(parameters.data.url || parameters.data.dest || parameters.data.action);
    return _possibleConstructorReturn(this, (LinkAnnotationElement.__proto__ || Object.getPrototypeOf(LinkAnnotationElement)).call(this, parameters, isRenderable));
  }

  _createClass(LinkAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'linkAnnotation';
      var link = document.createElement('a');
      (0, _dom_utils.addLinkAttributes)(link, {
        url: this.data.url,
        target: this.data.newWindow ? _dom_utils.LinkTarget.BLANK : undefined
      });
      if (!this.data.url) {
        if (this.data.action) {
          this._bindNamedAction(link, this.data.action);
        } else {
          this._bindLink(link, this.data.dest);
        }
      }
      this.container.appendChild(link);
      return this.container;
    }
  }, {
    key: '_bindLink',
    value: function _bindLink(link, destination) {
      var _this2 = this;

      link.href = this.linkService.getDestinationHash(destination);
      link.onclick = function () {
        if (destination) {
          _this2.linkService.navigateTo(destination);
        }
        return false;
      };
      if (destination) {
        link.className = 'internalLink';
      }
    }
  }, {
    key: '_bindNamedAction',
    value: function _bindNamedAction(link, action) {
      var _this3 = this;

      link.href = this.linkService.getAnchorUrl('');
      link.onclick = function () {
        _this3.linkService.executeNamedAction(action);
        return false;
      };
      link.className = 'internalLink';
    }
  }]);

  return LinkAnnotationElement;
}(AnnotationElement);

var TextAnnotationElement = function (_AnnotationElement2) {
  _inherits(TextAnnotationElement, _AnnotationElement2);

  function TextAnnotationElement(parameters) {
    _classCallCheck(this, TextAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (TextAnnotationElement.__proto__ || Object.getPrototypeOf(TextAnnotationElement)).call(this, parameters, isRenderable));
  }

  _createClass(TextAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'textAnnotation';
      var image = document.createElement('img');
      image.style.height = this.container.style.height;
      image.style.width = this.container.style.width;
      image.src = this.imageResourcesPath + 'annotation-' + this.data.name.toLowerCase() + '.svg';
      image.alt = '[{{type}} Annotation]';
      image.dataset.l10nId = 'text_annotation_type';
      image.dataset.l10nArgs = JSON.stringify({ type: this.data.name });
      if (!this.data.hasPopup) {
        this._createPopup(this.container, image, this.data);
      }
      this.container.appendChild(image);
      return this.container;
    }
  }]);

  return TextAnnotationElement;
}(AnnotationElement);

var WidgetAnnotationElement = function (_AnnotationElement3) {
  _inherits(WidgetAnnotationElement, _AnnotationElement3);

  function WidgetAnnotationElement() {
    _classCallCheck(this, WidgetAnnotationElement);

    return _possibleConstructorReturn(this, (WidgetAnnotationElement.__proto__ || Object.getPrototypeOf(WidgetAnnotationElement)).apply(this, arguments));
  }

  _createClass(WidgetAnnotationElement, [{
    key: 'render',
    value: function render() {
      return this.container;
    }
  }]);

  return WidgetAnnotationElement;
}(AnnotationElement);

var TextWidgetAnnotationElement = function (_WidgetAnnotationElem) {
  _inherits(TextWidgetAnnotationElement, _WidgetAnnotationElem);

  function TextWidgetAnnotationElement(parameters) {
    _classCallCheck(this, TextWidgetAnnotationElement);

    var isRenderable = parameters.renderInteractiveForms || !parameters.data.hasAppearance && !!parameters.data.fieldValue;
    return _possibleConstructorReturn(this, (TextWidgetAnnotationElement.__proto__ || Object.getPrototypeOf(TextWidgetAnnotationElement)).call(this, parameters, isRenderable));
  }

  _createClass(TextWidgetAnnotationElement, [{
    key: 'render',
    value: function render() {
      var TEXT_ALIGNMENT = ['left', 'center', 'right'];
      this.container.className = 'textWidgetAnnotation';
      var element = null;
      if (this.renderInteractiveForms) {
        if (this.data.multiLine) {
          element = document.createElement('textarea');
          element.textContent = this.data.fieldValue;
        } else {
          element = document.createElement('input');
          element.type = 'text';
          element.setAttribute('value', this.data.fieldValue);
        }
        element.disabled = this.data.readOnly;
        if (this.data.maxLen !== null) {
          element.maxLength = this.data.maxLen;
        }
        if (this.data.comb) {
          var fieldWidth = this.data.rect[2] - this.data.rect[0];
          var combWidth = fieldWidth / this.data.maxLen;
          element.classList.add('comb');
          element.style.letterSpacing = 'calc(' + combWidth + 'px - 1ch)';
        }
      } else {
        element = document.createElement('div');
        element.textContent = this.data.fieldValue;
        element.style.verticalAlign = 'middle';
        element.style.display = 'table-cell';
        var font = null;
        if (this.data.fontRefName) {
          font = this.page.commonObjs.getData(this.data.fontRefName);
        }
        this._setTextStyle(element, font);
      }
      if (this.data.textAlignment !== null) {
        element.style.textAlign = TEXT_ALIGNMENT[this.data.textAlignment];
      }
      this.container.appendChild(element);
      return this.container;
    }
  }, {
    key: '_setTextStyle',
    value: function _setTextStyle(element, font) {
      var style = element.style;
      style.fontSize = this.data.fontSize + 'px';
      style.direction = this.data.fontDirection < 0 ? 'rtl' : 'ltr';
      if (!font) {
        return;
      }
      style.fontWeight = font.black ? font.bold ? '900' : 'bold' : font.bold ? 'bold' : 'normal';
      style.fontStyle = font.italic ? 'italic' : 'normal';
      var fontFamily = font.loadedName ? '"' + font.loadedName + '", ' : '';
      var fallbackName = font.fallbackName || 'Helvetica, sans-serif';
      style.fontFamily = fontFamily + fallbackName;
    }
  }]);

  return TextWidgetAnnotationElement;
}(WidgetAnnotationElement);

var CheckboxWidgetAnnotationElement = function (_WidgetAnnotationElem2) {
  _inherits(CheckboxWidgetAnnotationElement, _WidgetAnnotationElem2);

  function CheckboxWidgetAnnotationElement(parameters) {
    _classCallCheck(this, CheckboxWidgetAnnotationElement);

    return _possibleConstructorReturn(this, (CheckboxWidgetAnnotationElement.__proto__ || Object.getPrototypeOf(CheckboxWidgetAnnotationElement)).call(this, parameters, parameters.renderInteractiveForms));
  }

  _createClass(CheckboxWidgetAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'buttonWidgetAnnotation checkBox';
      var element = document.createElement('input');
      element.disabled = this.data.readOnly;
      element.type = 'checkbox';
      if (this.data.fieldValue && this.data.fieldValue !== 'Off') {
        element.setAttribute('checked', true);
      }
      this.container.appendChild(element);
      return this.container;
    }
  }]);

  return CheckboxWidgetAnnotationElement;
}(WidgetAnnotationElement);

var RadioButtonWidgetAnnotationElement = function (_WidgetAnnotationElem3) {
  _inherits(RadioButtonWidgetAnnotationElement, _WidgetAnnotationElem3);

  function RadioButtonWidgetAnnotationElement(parameters) {
    _classCallCheck(this, RadioButtonWidgetAnnotationElement);

    return _possibleConstructorReturn(this, (RadioButtonWidgetAnnotationElement.__proto__ || Object.getPrototypeOf(RadioButtonWidgetAnnotationElement)).call(this, parameters, parameters.renderInteractiveForms));
  }

  _createClass(RadioButtonWidgetAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'buttonWidgetAnnotation radioButton';
      var element = document.createElement('input');
      element.disabled = this.data.readOnly;
      element.type = 'radio';
      element.name = this.data.fieldName;
      if (this.data.fieldValue === this.data.buttonValue) {
        element.setAttribute('checked', true);
      }
      this.container.appendChild(element);
      return this.container;
    }
  }]);

  return RadioButtonWidgetAnnotationElement;
}(WidgetAnnotationElement);

var ChoiceWidgetAnnotationElement = function (_WidgetAnnotationElem4) {
  _inherits(ChoiceWidgetAnnotationElement, _WidgetAnnotationElem4);

  function ChoiceWidgetAnnotationElement(parameters) {
    _classCallCheck(this, ChoiceWidgetAnnotationElement);

    return _possibleConstructorReturn(this, (ChoiceWidgetAnnotationElement.__proto__ || Object.getPrototypeOf(ChoiceWidgetAnnotationElement)).call(this, parameters, parameters.renderInteractiveForms));
  }

  _createClass(ChoiceWidgetAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'choiceWidgetAnnotation';
      var selectElement = document.createElement('select');
      selectElement.disabled = this.data.readOnly;
      if (!this.data.combo) {
        selectElement.size = this.data.options.length;
        if (this.data.multiSelect) {
          selectElement.multiple = true;
        }
      }
      for (var i = 0, ii = this.data.options.length; i < ii; i++) {
        var option = this.data.options[i];
        var optionElement = document.createElement('option');
        optionElement.textContent = option.displayValue;
        optionElement.value = option.exportValue;
        if (this.data.fieldValue.indexOf(option.displayValue) >= 0) {
          optionElement.setAttribute('selected', true);
        }
        selectElement.appendChild(optionElement);
      }
      this.container.appendChild(selectElement);
      return this.container;
    }
  }]);

  return ChoiceWidgetAnnotationElement;
}(WidgetAnnotationElement);

var PopupAnnotationElement = function (_AnnotationElement4) {
  _inherits(PopupAnnotationElement, _AnnotationElement4);

  function PopupAnnotationElement(parameters) {
    _classCallCheck(this, PopupAnnotationElement);

    var isRenderable = !!(parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (PopupAnnotationElement.__proto__ || Object.getPrototypeOf(PopupAnnotationElement)).call(this, parameters, isRenderable));
  }

  _createClass(PopupAnnotationElement, [{
    key: 'render',
    value: function render() {
      var IGNORE_TYPES = ['Line', 'Square', 'Circle', 'PolyLine', 'Polygon'];
      this.container.className = 'popupAnnotation';
      if (IGNORE_TYPES.indexOf(this.data.parentType) >= 0) {
        return this.container;
      }
      var selector = '[data-annotation-id="' + this.data.parentId + '"]';
      var parentElement = this.layer.querySelector(selector);
      if (!parentElement) {
        return this.container;
      }
      var popup = new PopupElement({
        container: this.container,
        trigger: parentElement,
        color: this.data.color,
        title: this.data.title,
        contents: this.data.contents
      });
      var parentLeft = parseFloat(parentElement.style.left);
      var parentWidth = parseFloat(parentElement.style.width);
      _dom_utils.CustomStyle.setProp('transformOrigin', this.container, -(parentLeft + parentWidth) + 'px -' + parentElement.style.top);
      this.container.style.left = parentLeft + parentWidth + 'px';
      this.container.appendChild(popup.render());
      return this.container;
    }
  }]);

  return PopupAnnotationElement;
}(AnnotationElement);

var PopupElement = function () {
  function PopupElement(parameters) {
    _classCallCheck(this, PopupElement);

    this.container = parameters.container;
    this.trigger = parameters.trigger;
    this.color = parameters.color;
    this.title = parameters.title;
    this.contents = parameters.contents;
    this.hideWrapper = parameters.hideWrapper || false;
    this.pinned = false;
  }

  _createClass(PopupElement, [{
    key: 'render',
    value: function render() {
      var BACKGROUND_ENLIGHT = 0.7;
      var wrapper = document.createElement('div');
      wrapper.className = 'popupWrapper';
      this.hideElement = this.hideWrapper ? wrapper : this.container;
      this.hideElement.setAttribute('hidden', true);
      var popup = document.createElement('div');
      popup.className = 'popup';
      var color = this.color;
      if (color) {
        var r = BACKGROUND_ENLIGHT * (255 - color[0]) + color[0];
        var g = BACKGROUND_ENLIGHT * (255 - color[1]) + color[1];
        var b = BACKGROUND_ENLIGHT * (255 - color[2]) + color[2];
        popup.style.backgroundColor = _util.Util.makeCssRgb(r | 0, g | 0, b | 0);
      }
      var contents = this._formatContents(this.contents);
      var title = document.createElement('h1');
      title.textContent = this.title;
      this.trigger.addEventListener('click', this._toggle.bind(this));
      this.trigger.addEventListener('mouseover', this._show.bind(this, false));
      this.trigger.addEventListener('mouseout', this._hide.bind(this, false));
      popup.addEventListener('click', this._hide.bind(this, true));
      popup.appendChild(title);
      popup.appendChild(contents);
      wrapper.appendChild(popup);
      return wrapper;
    }
  }, {
    key: '_formatContents',
    value: function _formatContents(contents) {
      var p = document.createElement('p');
      var lines = contents.split(/(?:\r\n?|\n)/);
      for (var i = 0, ii = lines.length; i < ii; ++i) {
        var line = lines[i];
        p.appendChild(document.createTextNode(line));
        if (i < ii - 1) {
          p.appendChild(document.createElement('br'));
        }
      }
      return p;
    }
  }, {
    key: '_toggle',
    value: function _toggle() {
      if (this.pinned) {
        this._hide(true);
      } else {
        this._show(true);
      }
    }
  }, {
    key: '_show',
    value: function _show() {
      var pin = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (pin) {
        this.pinned = true;
      }
      if (this.hideElement.hasAttribute('hidden')) {
        this.hideElement.removeAttribute('hidden');
        this.container.style.zIndex += 1;
      }
    }
  }, {
    key: '_hide',
    value: function _hide() {
      var unpin = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      if (unpin) {
        this.pinned = false;
      }
      if (!this.hideElement.hasAttribute('hidden') && !this.pinned) {
        this.hideElement.setAttribute('hidden', true);
        this.container.style.zIndex -= 1;
      }
    }
  }]);

  return PopupElement;
}();

var LineAnnotationElement = function (_AnnotationElement5) {
  _inherits(LineAnnotationElement, _AnnotationElement5);

  function LineAnnotationElement(parameters) {
    _classCallCheck(this, LineAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (LineAnnotationElement.__proto__ || Object.getPrototypeOf(LineAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(LineAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'lineAnnotation';
      var data = this.data;
      var width = data.rect[2] - data.rect[0];
      var height = data.rect[3] - data.rect[1];
      var svg = this.svgFactory.create(width, height);
      var line = this.svgFactory.createElement('svg:line');
      line.setAttribute('x1', data.rect[2] - data.lineCoordinates[0]);
      line.setAttribute('y1', data.rect[3] - data.lineCoordinates[1]);
      line.setAttribute('x2', data.rect[2] - data.lineCoordinates[2]);
      line.setAttribute('y2', data.rect[3] - data.lineCoordinates[3]);
      line.setAttribute('stroke-width', data.borderStyle.width);
      line.setAttribute('stroke', 'transparent');
      svg.appendChild(line);
      this.container.append(svg);
      this._createPopup(this.container, line, data);
      return this.container;
    }
  }]);

  return LineAnnotationElement;
}(AnnotationElement);

var SquareAnnotationElement = function (_AnnotationElement6) {
  _inherits(SquareAnnotationElement, _AnnotationElement6);

  function SquareAnnotationElement(parameters) {
    _classCallCheck(this, SquareAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (SquareAnnotationElement.__proto__ || Object.getPrototypeOf(SquareAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(SquareAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'squareAnnotation';
      var data = this.data;
      var width = data.rect[2] - data.rect[0];
      var height = data.rect[3] - data.rect[1];
      var svg = this.svgFactory.create(width, height);
      var borderWidth = data.borderStyle.width;
      var square = this.svgFactory.createElement('svg:rect');
      square.setAttribute('x', borderWidth / 2);
      square.setAttribute('y', borderWidth / 2);
      square.setAttribute('width', width - borderWidth);
      square.setAttribute('height', height - borderWidth);
      square.setAttribute('stroke-width', borderWidth);
      square.setAttribute('stroke', 'transparent');
      square.setAttribute('fill', 'none');
      svg.appendChild(square);
      this.container.append(svg);
      this._createPopup(this.container, square, data);
      return this.container;
    }
  }]);

  return SquareAnnotationElement;
}(AnnotationElement);

var CircleAnnotationElement = function (_AnnotationElement7) {
  _inherits(CircleAnnotationElement, _AnnotationElement7);

  function CircleAnnotationElement(parameters) {
    _classCallCheck(this, CircleAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (CircleAnnotationElement.__proto__ || Object.getPrototypeOf(CircleAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(CircleAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'circleAnnotation';
      var data = this.data;
      var width = data.rect[2] - data.rect[0];
      var height = data.rect[3] - data.rect[1];
      var svg = this.svgFactory.create(width, height);
      var borderWidth = data.borderStyle.width;
      var circle = this.svgFactory.createElement('svg:ellipse');
      circle.setAttribute('cx', width / 2);
      circle.setAttribute('cy', height / 2);
      circle.setAttribute('rx', width / 2 - borderWidth / 2);
      circle.setAttribute('ry', height / 2 - borderWidth / 2);
      circle.setAttribute('stroke-width', borderWidth);
      circle.setAttribute('stroke', 'transparent');
      circle.setAttribute('fill', 'none');
      svg.appendChild(circle);
      this.container.append(svg);
      this._createPopup(this.container, circle, data);
      return this.container;
    }
  }]);

  return CircleAnnotationElement;
}(AnnotationElement);

var PolylineAnnotationElement = function (_AnnotationElement8) {
  _inherits(PolylineAnnotationElement, _AnnotationElement8);

  function PolylineAnnotationElement(parameters) {
    _classCallCheck(this, PolylineAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);

    var _this14 = _possibleConstructorReturn(this, (PolylineAnnotationElement.__proto__ || Object.getPrototypeOf(PolylineAnnotationElement)).call(this, parameters, isRenderable, true));

    _this14.containerClassName = 'polylineAnnotation';
    _this14.svgElementName = 'svg:polyline';
    return _this14;
  }

  _createClass(PolylineAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = this.containerClassName;
      var data = this.data;
      var width = data.rect[2] - data.rect[0];
      var height = data.rect[3] - data.rect[1];
      var svg = this.svgFactory.create(width, height);
      var vertices = data.vertices;
      var points = [];
      for (var i = 0, ii = vertices.length; i < ii; i++) {
        var x = vertices[i].x - data.rect[0];
        var y = data.rect[3] - vertices[i].y;
        points.push(x + ',' + y);
      }
      points = points.join(' ');
      var borderWidth = data.borderStyle.width;
      var polyline = this.svgFactory.createElement(this.svgElementName);
      polyline.setAttribute('points', points);
      polyline.setAttribute('stroke-width', borderWidth);
      polyline.setAttribute('stroke', 'transparent');
      polyline.setAttribute('fill', 'none');
      svg.appendChild(polyline);
      this.container.append(svg);
      this._createPopup(this.container, polyline, data);
      return this.container;
    }
  }]);

  return PolylineAnnotationElement;
}(AnnotationElement);

var PolygonAnnotationElement = function (_PolylineAnnotationEl) {
  _inherits(PolygonAnnotationElement, _PolylineAnnotationEl);

  function PolygonAnnotationElement(parameters) {
    _classCallCheck(this, PolygonAnnotationElement);

    var _this15 = _possibleConstructorReturn(this, (PolygonAnnotationElement.__proto__ || Object.getPrototypeOf(PolygonAnnotationElement)).call(this, parameters));

    _this15.containerClassName = 'polygonAnnotation';
    _this15.svgElementName = 'svg:polygon';
    return _this15;
  }

  return PolygonAnnotationElement;
}(PolylineAnnotationElement);

var HighlightAnnotationElement = function (_AnnotationElement9) {
  _inherits(HighlightAnnotationElement, _AnnotationElement9);

  function HighlightAnnotationElement(parameters) {
    _classCallCheck(this, HighlightAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (HighlightAnnotationElement.__proto__ || Object.getPrototypeOf(HighlightAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(HighlightAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'highlightAnnotation';
      if (!this.data.hasPopup) {
        this._createPopup(this.container, null, this.data);
      }
      return this.container;
    }
  }]);

  return HighlightAnnotationElement;
}(AnnotationElement);

var UnderlineAnnotationElement = function (_AnnotationElement10) {
  _inherits(UnderlineAnnotationElement, _AnnotationElement10);

  function UnderlineAnnotationElement(parameters) {
    _classCallCheck(this, UnderlineAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (UnderlineAnnotationElement.__proto__ || Object.getPrototypeOf(UnderlineAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(UnderlineAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'underlineAnnotation';
      if (!this.data.hasPopup) {
        this._createPopup(this.container, null, this.data);
      }
      return this.container;
    }
  }]);

  return UnderlineAnnotationElement;
}(AnnotationElement);

var SquigglyAnnotationElement = function (_AnnotationElement11) {
  _inherits(SquigglyAnnotationElement, _AnnotationElement11);

  function SquigglyAnnotationElement(parameters) {
    _classCallCheck(this, SquigglyAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (SquigglyAnnotationElement.__proto__ || Object.getPrototypeOf(SquigglyAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(SquigglyAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'squigglyAnnotation';
      if (!this.data.hasPopup) {
        this._createPopup(this.container, null, this.data);
      }
      return this.container;
    }
  }]);

  return SquigglyAnnotationElement;
}(AnnotationElement);

var StrikeOutAnnotationElement = function (_AnnotationElement12) {
  _inherits(StrikeOutAnnotationElement, _AnnotationElement12);

  function StrikeOutAnnotationElement(parameters) {
    _classCallCheck(this, StrikeOutAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (StrikeOutAnnotationElement.__proto__ || Object.getPrototypeOf(StrikeOutAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(StrikeOutAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'strikeoutAnnotation';
      if (!this.data.hasPopup) {
        this._createPopup(this.container, null, this.data);
      }
      return this.container;
    }
  }]);

  return StrikeOutAnnotationElement;
}(AnnotationElement);

var StampAnnotationElement = function (_AnnotationElement13) {
  _inherits(StampAnnotationElement, _AnnotationElement13);

  function StampAnnotationElement(parameters) {
    _classCallCheck(this, StampAnnotationElement);

    var isRenderable = !!(parameters.data.hasPopup || parameters.data.title || parameters.data.contents);
    return _possibleConstructorReturn(this, (StampAnnotationElement.__proto__ || Object.getPrototypeOf(StampAnnotationElement)).call(this, parameters, isRenderable, true));
  }

  _createClass(StampAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'stampAnnotation';
      if (!this.data.hasPopup) {
        this._createPopup(this.container, null, this.data);
      }
      return this.container;
    }
  }]);

  return StampAnnotationElement;
}(AnnotationElement);

var FileAttachmentAnnotationElement = function (_AnnotationElement14) {
  _inherits(FileAttachmentAnnotationElement, _AnnotationElement14);

  function FileAttachmentAnnotationElement(parameters) {
    _classCallCheck(this, FileAttachmentAnnotationElement);

    var _this21 = _possibleConstructorReturn(this, (FileAttachmentAnnotationElement.__proto__ || Object.getPrototypeOf(FileAttachmentAnnotationElement)).call(this, parameters, true));

    var file = _this21.data.file;
    _this21.filename = (0, _dom_utils.getFilenameFromUrl)(file.filename);
    _this21.content = file.content;
    _this21.linkService.onFileAttachmentAnnotation({
      id: (0, _util.stringToPDFString)(file.filename),
      filename: file.filename,
      content: file.content
    });
    return _this21;
  }

  _createClass(FileAttachmentAnnotationElement, [{
    key: 'render',
    value: function render() {
      this.container.className = 'fileAttachmentAnnotation';
      var trigger = document.createElement('div');
      trigger.style.height = this.container.style.height;
      trigger.style.width = this.container.style.width;
      trigger.addEventListener('dblclick', this._download.bind(this));
      if (!this.data.hasPopup && (this.data.title || this.data.contents)) {
        this._createPopup(this.container, trigger, this.data);
      }
      this.container.appendChild(trigger);
      return this.container;
    }
  }, {
    key: '_download',
    value: function _download() {
      if (!this.downloadManager) {
        (0, _util.warn)('Download cannot be started due to unavailable download manager');
        return;
      }
      this.downloadManager.downloadData(this.content, this.filename, '');
    }
  }]);

  return FileAttachmentAnnotationElement;
}(AnnotationElement);

var AnnotationLayer = function () {
  function AnnotationLayer() {
    _classCallCheck(this, AnnotationLayer);
  }

  _createClass(AnnotationLayer, null, [{
    key: 'render',
    value: function render(parameters) {
      for (var i = 0, ii = parameters.annotations.length; i < ii; i++) {
        var data = parameters.annotations[i];
        if (!data) {
          continue;
        }
        var element = AnnotationElementFactory.create({
          data: data,
          layer: parameters.div,
          page: parameters.page,
          viewport: parameters.viewport,
          linkService: parameters.linkService,
          downloadManager: parameters.downloadManager,
          imageResourcesPath: parameters.imageResourcesPath || (0, _dom_utils.getDefaultSetting)('imageResourcesPath'),
          renderInteractiveForms: parameters.renderInteractiveForms || false,
          svgFactory: new _dom_utils.DOMSVGFactory()
        });
        if (element.isRenderable) {
          parameters.div.appendChild(element.render());
        }
      }
    }
  }, {
    key: 'update',
    value: function update(parameters) {
      for (var i = 0, ii = parameters.annotations.length; i < ii; i++) {
        var data = parameters.annotations[i];
        var element = parameters.div.querySelector('[data-annotation-id="' + data.id + '"]');
        if (element) {
          _dom_utils.CustomStyle.setProp('transform', element, 'matrix(' + parameters.viewport.transform.join(',') + ')');
        }
      }
      parameters.div.removeAttribute('hidden');
    }
  }]);

  return AnnotationLayer;
}();

exports.AnnotationLayer = AnnotationLayer;

/***/ }),
/* 73 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderTextLayer = undefined;

var _util = __w_pdfjs_require__(0);

var _dom_utils = __w_pdfjs_require__(13);

var renderTextLayer = function renderTextLayerClosure() {
  var MAX_TEXT_DIVS_TO_RENDER = 100000;
  var NonWhitespaceRegexp = /\S/;
  function isAllWhitespace(str) {
    return !NonWhitespaceRegexp.test(str);
  }
  var styleBuf = ['left: ', 0, 'px; top: ', 0, 'px; font-size: ', 0, 'px; font-family: ', '', ';'];
  function appendText(task, geom, styles) {
    var textDiv = document.createElement('div');
    var textDivProperties = {
      style: null,
      angle: 0,
      canvasWidth: 0,
      isWhitespace: false,
      originalTransform: null,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 0,
      scale: 1
    };
    task._textDivs.push(textDiv);
    if (isAllWhitespace(geom.str)) {
      textDivProperties.isWhitespace = true;
      task._textDivProperties.set(textDiv, textDivProperties);
      return;
    }
    var tx = _util.Util.transform(task._viewport.transform, geom.transform);
    var angle = Math.atan2(tx[1], tx[0]);
    var style = styles[geom.fontName];
    if (style.vertical) {
      angle += Math.PI / 2;
    }
    var fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    var fontAscent = fontHeight;
    if (style.ascent) {
      fontAscent = style.ascent * fontAscent;
    } else if (style.descent) {
      fontAscent = (1 + style.descent) * fontAscent;
    }
    var left;
    var top;
    if (angle === 0) {
      left = tx[4];
      top = tx[5] - fontAscent;
    } else {
      left = tx[4] + fontAscent * Math.sin(angle);
      top = tx[5] - fontAscent * Math.cos(angle);
    }
    styleBuf[1] = left;
    styleBuf[3] = top;
    styleBuf[5] = fontHeight;
    styleBuf[7] = style.fontFamily;
    textDivProperties.style = styleBuf.join('');
    textDiv.setAttribute('style', textDivProperties.style);
    textDiv.textContent = geom.str;
    if ((0, _dom_utils.getDefaultSetting)('pdfBug')) {
      textDiv.dataset.fontName = geom.fontName;
    }
    if (angle !== 0) {
      textDivProperties.angle = angle * (180 / Math.PI);
    }
    if (geom.str.length > 1) {
      if (style.vertical) {
        textDivProperties.canvasWidth = geom.height * task._viewport.scale;
      } else {
        textDivProperties.canvasWidth = geom.width * task._viewport.scale;
      }
    }
    task._textDivProperties.set(textDiv, textDivProperties);
    if (task._textContentStream) {
      task._layoutText(textDiv);
    }
    if (task._enhanceTextSelection) {
      var angleCos = 1,
          angleSin = 0;
      if (angle !== 0) {
        angleCos = Math.cos(angle);
        angleSin = Math.sin(angle);
      }
      var divWidth = (style.vertical ? geom.height : geom.width) * task._viewport.scale;
      var divHeight = fontHeight;
      var m, b;
      if (angle !== 0) {
        m = [angleCos, angleSin, -angleSin, angleCos, left, top];
        b = _util.Util.getAxialAlignedBoundingBox([0, 0, divWidth, divHeight], m);
      } else {
        b = [left, top, left + divWidth, top + divHeight];
      }
      task._bounds.push({
        left: b[0],
        top: b[1],
        right: b[2],
        bottom: b[3],
        div: textDiv,
        size: [divWidth, divHeight],
        m: m
      });
    }
  }
  function render(task) {
    if (task._canceled) {
      return;
    }
    var textDivs = task._textDivs;
    var capability = task._capability;
    var textDivsLength = textDivs.length;
    if (textDivsLength > MAX_TEXT_DIVS_TO_RENDER) {
      task._renderingDone = true;
      capability.resolve();
      return;
    }
    if (!task._textContentStream) {
      for (var i = 0; i < textDivsLength; i++) {
        task._layoutText(textDivs[i]);
      }
    }
    task._renderingDone = true;
    capability.resolve();
  }
  function expand(task) {
    var bounds = task._bounds;
    var viewport = task._viewport;
    var expanded = expandBounds(viewport.width, viewport.height, bounds);
    for (var i = 0; i < expanded.length; i++) {
      var div = bounds[i].div;
      var divProperties = task._textDivProperties.get(div);
      if (divProperties.angle === 0) {
        divProperties.paddingLeft = bounds[i].left - expanded[i].left;
        divProperties.paddingTop = bounds[i].top - expanded[i].top;
        divProperties.paddingRight = expanded[i].right - bounds[i].right;
        divProperties.paddingBottom = expanded[i].bottom - bounds[i].bottom;
        task._textDivProperties.set(div, divProperties);
        continue;
      }
      var e = expanded[i],
          b = bounds[i];
      var m = b.m,
          c = m[0],
          s = m[1];
      var points = [[0, 0], [0, b.size[1]], [b.size[0], 0], b.size];
      var ts = new Float64Array(64);
      points.forEach(function (p, i) {
        var t = _util.Util.applyTransform(p, m);
        ts[i + 0] = c && (e.left - t[0]) / c;
        ts[i + 4] = s && (e.top - t[1]) / s;
        ts[i + 8] = c && (e.right - t[0]) / c;
        ts[i + 12] = s && (e.bottom - t[1]) / s;
        ts[i + 16] = s && (e.left - t[0]) / -s;
        ts[i + 20] = c && (e.top - t[1]) / c;
        ts[i + 24] = s && (e.right - t[0]) / -s;
        ts[i + 28] = c && (e.bottom - t[1]) / c;
        ts[i + 32] = c && (e.left - t[0]) / -c;
        ts[i + 36] = s && (e.top - t[1]) / -s;
        ts[i + 40] = c && (e.right - t[0]) / -c;
        ts[i + 44] = s && (e.bottom - t[1]) / -s;
        ts[i + 48] = s && (e.left - t[0]) / s;
        ts[i + 52] = c && (e.top - t[1]) / -c;
        ts[i + 56] = s && (e.right - t[0]) / s;
        ts[i + 60] = c && (e.bottom - t[1]) / -c;
      });
      var findPositiveMin = function findPositiveMin(ts, offset, count) {
        var result = 0;
        for (var i = 0; i < count; i++) {
          var t = ts[offset++];
          if (t > 0) {
            result = result ? Math.min(t, result) : t;
          }
        }
        return result;
      };
      var boxScale = 1 + Math.min(Math.abs(c), Math.abs(s));
      divProperties.paddingLeft = findPositiveMin(ts, 32, 16) / boxScale;
      divProperties.paddingTop = findPositiveMin(ts, 48, 16) / boxScale;
      divProperties.paddingRight = findPositiveMin(ts, 0, 16) / boxScale;
      divProperties.paddingBottom = findPositiveMin(ts, 16, 16) / boxScale;
      task._textDivProperties.set(div, divProperties);
    }
  }
  function expandBounds(width, height, boxes) {
    var bounds = boxes.map(function (box, i) {
      return {
        x1: box.left,
        y1: box.top,
        x2: box.right,
        y2: box.bottom,
        index: i,
        x1New: undefined,
        x2New: undefined
      };
    });
    expandBoundsLTR(width, bounds);
    var expanded = new Array(boxes.length);
    bounds.forEach(function (b) {
      var i = b.index;
      expanded[i] = {
        left: b.x1New,
        top: 0,
        right: b.x2New,
        bottom: 0
      };
    });
    boxes.map(function (box, i) {
      var e = expanded[i],
          b = bounds[i];
      b.x1 = box.top;
      b.y1 = width - e.right;
      b.x2 = box.bottom;
      b.y2 = width - e.left;
      b.index = i;
      b.x1New = undefined;
      b.x2New = undefined;
    });
    expandBoundsLTR(height, bounds);
    bounds.forEach(function (b) {
      var i = b.index;
      expanded[i].top = b.x1New;
      expanded[i].bottom = b.x2New;
    });
    return expanded;
  }
  function expandBoundsLTR(width, bounds) {
    bounds.sort(function (a, b) {
      return a.x1 - b.x1 || a.index - b.index;
    });
    var fakeBoundary = {
      x1: -Infinity,
      y1: -Infinity,
      x2: 0,
      y2: Infinity,
      index: -1,
      x1New: 0,
      x2New: 0
    };
    var horizon = [{
      start: -Infinity,
      end: Infinity,
      boundary: fakeBoundary
    }];
    bounds.forEach(function (boundary) {
      var i = 0;
      while (i < horizon.length && horizon[i].end <= boundary.y1) {
        i++;
      }
      var j = horizon.length - 1;
      while (j >= 0 && horizon[j].start >= boundary.y2) {
        j--;
      }
      var horizonPart, affectedBoundary;
      var q,
          k,
          maxXNew = -Infinity;
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        var xNew;
        if (affectedBoundary.x2 > boundary.x1) {
          xNew = affectedBoundary.index > boundary.index ? affectedBoundary.x1New : boundary.x1;
        } else if (affectedBoundary.x2New === undefined) {
          xNew = (affectedBoundary.x2 + boundary.x1) / 2;
        } else {
          xNew = affectedBoundary.x2New;
        }
        if (xNew > maxXNew) {
          maxXNew = xNew;
        }
      }
      boundary.x1New = maxXNew;
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        if (affectedBoundary.x2New === undefined) {
          if (affectedBoundary.x2 > boundary.x1) {
            if (affectedBoundary.index > boundary.index) {
              affectedBoundary.x2New = affectedBoundary.x2;
            }
          } else {
            affectedBoundary.x2New = maxXNew;
          }
        } else if (affectedBoundary.x2New > maxXNew) {
          affectedBoundary.x2New = Math.max(maxXNew, affectedBoundary.x2);
        }
      }
      var changedHorizon = [],
          lastBoundary = null;
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        var useBoundary = affectedBoundary.x2 > boundary.x2 ? affectedBoundary : boundary;
        if (lastBoundary === useBoundary) {
          changedHorizon[changedHorizon.length - 1].end = horizonPart.end;
        } else {
          changedHorizon.push({
            start: horizonPart.start,
            end: horizonPart.end,
            boundary: useBoundary
          });
          lastBoundary = useBoundary;
        }
      }
      if (horizon[i].start < boundary.y1) {
        changedHorizon[0].start = boundary.y1;
        changedHorizon.unshift({
          start: horizon[i].start,
          end: boundary.y1,
          boundary: horizon[i].boundary
        });
      }
      if (boundary.y2 < horizon[j].end) {
        changedHorizon[changedHorizon.length - 1].end = boundary.y2;
        changedHorizon.push({
          start: boundary.y2,
          end: horizon[j].end,
          boundary: horizon[j].boundary
        });
      }
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        if (affectedBoundary.x2New !== undefined) {
          continue;
        }
        var used = false;
        for (k = i - 1; !used && k >= 0 && horizon[k].start >= affectedBoundary.y1; k--) {
          used = horizon[k].boundary === affectedBoundary;
        }
        for (k = j + 1; !used && k < horizon.length && horizon[k].end <= affectedBoundary.y2; k++) {
          used = horizon[k].boundary === affectedBoundary;
        }
        for (k = 0; !used && k < changedHorizon.length; k++) {
          used = changedHorizon[k].boundary === affectedBoundary;
        }
        if (!used) {
          affectedBoundary.x2New = maxXNew;
        }
      }
      Array.prototype.splice.apply(horizon, [i, j - i + 1].concat(changedHorizon));
    });
    horizon.forEach(function (horizonPart) {
      var affectedBoundary = horizonPart.boundary;
      if (affectedBoundary.x2New === undefined) {
        affectedBoundary.x2New = Math.max(width, affectedBoundary.x2);
      }
    });
  }
  function TextLayerRenderTask(_ref) {
    var textContent = _ref.textContent,
        textContentStream = _ref.textContentStream,
        container = _ref.container,
        viewport = _ref.viewport,
        textDivs = _ref.textDivs,
        textContentItemsStr = _ref.textContentItemsStr,
        enhanceTextSelection = _ref.enhanceTextSelection;

    this._textContent = textContent;
    this._textContentStream = textContentStream;
    this._container = container;
    this._viewport = viewport;
    this._textDivs = textDivs || [];
    this._textContentItemsStr = textContentItemsStr || [];
    this._enhanceTextSelection = !!enhanceTextSelection;
    this._reader = null;
    this._layoutTextLastFontSize = null;
    this._layoutTextLastFontFamily = null;
    this._layoutTextCtx = null;
    this._textDivProperties = new WeakMap();
    this._renderingDone = false;
    this._canceled = false;
    this._capability = (0, _util.createPromiseCapability)();
    this._renderTimer = null;
    this._bounds = [];
  }
  TextLayerRenderTask.prototype = {
    get promise() {
      return this._capability.promise;
    },
    cancel: function TextLayer_cancel() {
      if (this._reader) {
        this._reader.cancel(new _util.AbortException('text layer task cancelled'));
        this._reader = null;
      }
      this._canceled = true;
      if (this._renderTimer !== null) {
        clearTimeout(this._renderTimer);
        this._renderTimer = null;
      }
      this._capability.reject('canceled');
    },
    _processItems: function _processItems(items, styleCache) {
      for (var i = 0, len = items.length; i < len; i++) {
        this._textContentItemsStr.push(items[i].str);
        appendText(this, items[i], styleCache);
      }
    },
    _layoutText: function _layoutText(textDiv) {
      var textLayerFrag = this._container;
      var textDivProperties = this._textDivProperties.get(textDiv);
      if (textDivProperties.isWhitespace) {
        return;
      }
      var fontSize = textDiv.style.fontSize;
      var fontFamily = textDiv.style.fontFamily;
      if (fontSize !== this._layoutTextLastFontSize || fontFamily !== this._layoutTextLastFontFamily) {
        this._layoutTextCtx.font = fontSize + ' ' + fontFamily;
        this._lastFontSize = fontSize;
        this._lastFontFamily = fontFamily;
      }
      var width = this._layoutTextCtx.measureText(textDiv.textContent).width;
      var transform = '';
      if (textDivProperties.canvasWidth !== 0 && width > 0) {
        textDivProperties.scale = textDivProperties.canvasWidth / width;
        transform = 'scaleX(' + textDivProperties.scale + ')';
      }
      if (textDivProperties.angle !== 0) {
        transform = 'rotate(' + textDivProperties.angle + 'deg) ' + transform;
      }
      if (transform !== '') {
        textDivProperties.originalTransform = transform;
        _dom_utils.CustomStyle.setProp('transform', textDiv, transform);
      }
      this._textDivProperties.set(textDiv, textDivProperties);
      textLayerFrag.appendChild(textDiv);
    },

    _render: function TextLayer_render(timeout) {
      var _this = this;

      var capability = (0, _util.createPromiseCapability)();
      var styleCache = Object.create(null);
      var canvas = document.createElement('canvas');
      canvas.mozOpaque = true;
      this._layoutTextCtx = canvas.getContext('2d', { alpha: false });
      if (this._textContent) {
        var textItems = this._textContent.items;
        var textStyles = this._textContent.styles;
        this._processItems(textItems, textStyles);
        capability.resolve();
      } else if (this._textContentStream) {
        var pump = function pump() {
          _this._reader.read().then(function (_ref2) {
            var value = _ref2.value,
                done = _ref2.done;

            if (done) {
              capability.resolve();
              return;
            }
            _util.Util.extendObj(styleCache, value.styles);
            _this._processItems(value.items, styleCache);
            pump();
          }, capability.reject);
        };
        this._reader = this._textContentStream.getReader();
        pump();
      } else {
        throw new Error('Neither "textContent" nor "textContentStream"' + ' parameters specified.');
      }
      capability.promise.then(function () {
        styleCache = null;
        if (!timeout) {
          render(_this);
        } else {
          _this._renderTimer = setTimeout(function () {
            render(_this);
            _this._renderTimer = null;
          }, timeout);
        }
      }, this._capability.reject);
    },
    expandTextDivs: function TextLayer_expandTextDivs(expandDivs) {
      if (!this._enhanceTextSelection || !this._renderingDone) {
        return;
      }
      if (this._bounds !== null) {
        expand(this);
        this._bounds = null;
      }
      for (var i = 0, ii = this._textDivs.length; i < ii; i++) {
        var div = this._textDivs[i];
        var divProperties = this._textDivProperties.get(div);
        if (divProperties.isWhitespace) {
          continue;
        }
        if (expandDivs) {
          var transform = '',
              padding = '';
          if (divProperties.scale !== 1) {
            transform = 'scaleX(' + divProperties.scale + ')';
          }
          if (divProperties.angle !== 0) {
            transform = 'rotate(' + divProperties.angle + 'deg) ' + transform;
          }
          if (divProperties.paddingLeft !== 0) {
            padding += ' padding-left: ' + divProperties.paddingLeft / divProperties.scale + 'px;';
            transform += ' translateX(' + -divProperties.paddingLeft / divProperties.scale + 'px)';
          }
          if (divProperties.paddingTop !== 0) {
            padding += ' padding-top: ' + divProperties.paddingTop + 'px;';
            transform += ' translateY(' + -divProperties.paddingTop + 'px)';
          }
          if (divProperties.paddingRight !== 0) {
            padding += ' padding-right: ' + divProperties.paddingRight / divProperties.scale + 'px;';
          }
          if (divProperties.paddingBottom !== 0) {
            padding += ' padding-bottom: ' + divProperties.paddingBottom + 'px;';
          }
          if (padding !== '') {
            div.setAttribute('style', divProperties.style + padding);
          }
          if (transform !== '') {
            _dom_utils.CustomStyle.setProp('transform', div, transform);
          }
        } else {
          div.style.padding = 0;
          _dom_utils.CustomStyle.setProp('transform', div, divProperties.originalTransform || '');
        }
      }
    }
  };
  function renderTextLayer(renderParameters) {
    var task = new TextLayerRenderTask({
      textContent: renderParameters.textContent,
      textContentStream: renderParameters.textContentStream,
      container: renderParameters.container,
      viewport: renderParameters.viewport,
      textDivs: renderParameters.textDivs,
      textContentItemsStr: renderParameters.textContentItemsStr,
      enhanceTextSelection: renderParameters.enhanceTextSelection
    });
    task._render(renderParameters.timeout);
    return task;
  }
  return renderTextLayer;
}();
exports.renderTextLayer = renderTextLayer;

/***/ }),
/* 74 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SVGGraphics = undefined;

var _util = __w_pdfjs_require__(0);

var _dom_utils = __w_pdfjs_require__(13);

var SVGGraphics = function SVGGraphics() {
  throw new Error('Not implemented: SVGGraphics');
};
{
  var SVG_DEFAULTS = {
    fontStyle: 'normal',
    fontWeight: 'normal',
    fillColor: '#000000'
  };
  var convertImgDataToPng = function convertImgDataToPngClosure() {
    var PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    var CHUNK_WRAPPER_SIZE = 12;
    var crcTable = new Int32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var h = 0; h < 8; h++) {
        if (c & 1) {
          c = 0xedB88320 ^ c >> 1 & 0x7fffffff;
        } else {
          c = c >> 1 & 0x7fffffff;
        }
      }
      crcTable[i] = c;
    }
    function crc32(data, start, end) {
      var crc = -1;
      for (var i = start; i < end; i++) {
        var a = (crc ^ data[i]) & 0xff;
        var b = crcTable[a];
        crc = crc >>> 8 ^ b;
      }
      return crc ^ -1;
    }
    function writePngChunk(type, body, data, offset) {
      var p = offset;
      var len = body.length;
      data[p] = len >> 24 & 0xff;
      data[p + 1] = len >> 16 & 0xff;
      data[p + 2] = len >> 8 & 0xff;
      data[p + 3] = len & 0xff;
      p += 4;
      data[p] = type.charCodeAt(0) & 0xff;
      data[p + 1] = type.charCodeAt(1) & 0xff;
      data[p + 2] = type.charCodeAt(2) & 0xff;
      data[p + 3] = type.charCodeAt(3) & 0xff;
      p += 4;
      data.set(body, p);
      p += body.length;
      var crc = crc32(data, offset + 4, p);
      data[p] = crc >> 24 & 0xff;
      data[p + 1] = crc >> 16 & 0xff;
      data[p + 2] = crc >> 8 & 0xff;
      data[p + 3] = crc & 0xff;
    }
    function adler32(data, start, end) {
      var a = 1;
      var b = 0;
      for (var i = start; i < end; ++i) {
        a = (a + (data[i] & 0xff)) % 65521;
        b = (b + a) % 65521;
      }
      return b << 16 | a;
    }
    function deflateSync(literals) {
      if (!(0, _util.isNodeJS)()) {
        return deflateSyncUncompressed(literals);
      }
      try {
        var input;
        if (parseInt(process.versions.node) >= 8) {
          input = literals;
        } else {
          input = new Buffer(literals);
        }
        var output = require('zlib').deflateSync(input, { level: 9 });
        return output instanceof Uint8Array ? output : new Uint8Array(output);
      } catch (e) {
        (0, _util.warn)('Not compressing PNG because zlib.deflateSync is unavailable: ' + e);
      }
      return deflateSyncUncompressed(literals);
    }
    function deflateSyncUncompressed(literals) {
      var len = literals.length;
      var maxBlockLength = 0xFFFF;
      var deflateBlocks = Math.ceil(len / maxBlockLength);
      var idat = new Uint8Array(2 + len + deflateBlocks * 5 + 4);
      var pi = 0;
      idat[pi++] = 0x78;
      idat[pi++] = 0x9c;
      var pos = 0;
      while (len > maxBlockLength) {
        idat[pi++] = 0x00;
        idat[pi++] = 0xff;
        idat[pi++] = 0xff;
        idat[pi++] = 0x00;
        idat[pi++] = 0x00;
        idat.set(literals.subarray(pos, pos + maxBlockLength), pi);
        pi += maxBlockLength;
        pos += maxBlockLength;
        len -= maxBlockLength;
      }
      idat[pi++] = 0x01;
      idat[pi++] = len & 0xff;
      idat[pi++] = len >> 8 & 0xff;
      idat[pi++] = ~len & 0xffff & 0xff;
      idat[pi++] = (~len & 0xffff) >> 8 & 0xff;
      idat.set(literals.subarray(pos), pi);
      pi += literals.length - pos;
      var adler = adler32(literals, 0, literals.length);
      idat[pi++] = adler >> 24 & 0xff;
      idat[pi++] = adler >> 16 & 0xff;
      idat[pi++] = adler >> 8 & 0xff;
      idat[pi++] = adler & 0xff;
      return idat;
    }
    function encode(imgData, kind, forceDataSchema) {
      var width = imgData.width;
      var height = imgData.height;
      var bitDepth, colorType, lineSize;
      var bytes = imgData.data;
      switch (kind) {
        case _util.ImageKind.GRAYSCALE_1BPP:
          colorType = 0;
          bitDepth = 1;
          lineSize = width + 7 >> 3;
          break;
        case _util.ImageKind.RGB_24BPP:
          colorType = 2;
          bitDepth = 8;
          lineSize = width * 3;
          break;
        case _util.ImageKind.RGBA_32BPP:
          colorType = 6;
          bitDepth = 8;
          lineSize = width * 4;
          break;
        default:
          throw new Error('invalid format');
      }
      var literals = new Uint8Array((1 + lineSize) * height);
      var offsetLiterals = 0,
          offsetBytes = 0;
      var y, i;
      for (y = 0; y < height; ++y) {
        literals[offsetLiterals++] = 0;
        literals.set(bytes.subarray(offsetBytes, offsetBytes + lineSize), offsetLiterals);
        offsetBytes += lineSize;
        offsetLiterals += lineSize;
      }
      if (kind === _util.ImageKind.GRAYSCALE_1BPP) {
        offsetLiterals = 0;
        for (y = 0; y < height; y++) {
          offsetLiterals++;
          for (i = 0; i < lineSize; i++) {
            literals[offsetLiterals++] ^= 0xFF;
          }
        }
      }
      var ihdr = new Uint8Array([width >> 24 & 0xff, width >> 16 & 0xff, width >> 8 & 0xff, width & 0xff, height >> 24 & 0xff, height >> 16 & 0xff, height >> 8 & 0xff, height & 0xff, bitDepth, colorType, 0x00, 0x00, 0x00]);
      var idat = deflateSync(literals);
      var pngLength = PNG_HEADER.length + CHUNK_WRAPPER_SIZE * 3 + ihdr.length + idat.length;
      var data = new Uint8Array(pngLength);
      var offset = 0;
      data.set(PNG_HEADER, offset);
      offset += PNG_HEADER.length;
      writePngChunk('IHDR', ihdr, data, offset);
      offset += CHUNK_WRAPPER_SIZE + ihdr.length;
      writePngChunk('IDATA', idat, data, offset);
      offset += CHUNK_WRAPPER_SIZE + idat.length;
      writePngChunk('IEND', new Uint8Array(0), data, offset);
      return (0, _util.createObjectURL)(data, 'image/png', forceDataSchema);
    }
    return function convertImgDataToPng(imgData, forceDataSchema) {
      var kind = imgData.kind === undefined ? _util.ImageKind.GRAYSCALE_1BPP : imgData.kind;
      return encode(imgData, kind, forceDataSchema);
    };
  }();
  var SVGExtraState = function SVGExtraStateClosure() {
    function SVGExtraState() {
      this.fontSizeScale = 1;
      this.fontWeight = SVG_DEFAULTS.fontWeight;
      this.fontSize = 0;
      this.textMatrix = _util.IDENTITY_MATRIX;
      this.fontMatrix = _util.FONT_IDENTITY_MATRIX;
      this.leading = 0;
      this.x = 0;
      this.y = 0;
      this.lineX = 0;
      this.lineY = 0;
      this.charSpacing = 0;
      this.wordSpacing = 0;
      this.textHScale = 1;
      this.textRise = 0;
      this.fillColor = SVG_DEFAULTS.fillColor;
      this.strokeColor = '#000000';
      this.fillAlpha = 1;
      this.strokeAlpha = 1;
      this.lineWidth = 1;
      this.lineJoin = '';
      this.lineCap = '';
      this.miterLimit = 0;
      this.dashArray = [];
      this.dashPhase = 0;
      this.dependencies = [];
      this.activeClipUrl = null;
      this.clipGroup = null;
      this.maskId = '';
    }
    SVGExtraState.prototype = {
      clone: function SVGExtraState_clone() {
        return Object.create(this);
      },
      setCurrentPoint: function SVGExtraState_setCurrentPoint(x, y) {
        this.x = x;
        this.y = y;
      }
    };
    return SVGExtraState;
  }();
  exports.SVGGraphics = SVGGraphics = function SVGGraphicsClosure() {
    function opListToTree(opList) {
      var opTree = [];
      var tmp = [];
      var opListLen = opList.length;
      for (var x = 0; x < opListLen; x++) {
        if (opList[x].fn === 'save') {
          opTree.push({
            'fnId': 92,
            'fn': 'group',
            'items': []
          });
          tmp.push(opTree);
          opTree = opTree[opTree.length - 1].items;
          continue;
        }
        if (opList[x].fn === 'restore') {
          opTree = tmp.pop();
        } else {
          opTree.push(opList[x]);
        }
      }
      return opTree;
    }
    function pf(value) {
      if (Number.isInteger(value)) {
        return value.toString();
      }
      var s = value.toFixed(10);
      var i = s.length - 1;
      if (s[i] !== '0') {
        return s;
      }
      do {
        i--;
      } while (s[i] === '0');
      return s.substr(0, s[i] === '.' ? i : i + 1);
    }
    function pm(m) {
      if (m[4] === 0 && m[5] === 0) {
        if (m[1] === 0 && m[2] === 0) {
          if (m[0] === 1 && m[3] === 1) {
            return '';
          }
          return 'scale(' + pf(m[0]) + ' ' + pf(m[3]) + ')';
        }
        if (m[0] === m[3] && m[1] === -m[2]) {
          var a = Math.acos(m[0]) * 180 / Math.PI;
          return 'rotate(' + pf(a) + ')';
        }
      } else {
        if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1) {
          return 'translate(' + pf(m[4]) + ' ' + pf(m[5]) + ')';
        }
      }
      return 'matrix(' + pf(m[0]) + ' ' + pf(m[1]) + ' ' + pf(m[2]) + ' ' + pf(m[3]) + ' ' + pf(m[4]) + ' ' + pf(m[5]) + ')';
    }
    function SVGGraphics(commonObjs, objs, forceDataSchema) {
      this.svgFactory = new _dom_utils.DOMSVGFactory();
      this.current = new SVGExtraState();
      this.transformMatrix = _util.IDENTITY_MATRIX;
      this.transformStack = [];
      this.extraStack = [];
      this.commonObjs = commonObjs;
      this.objs = objs;
      this.pendingClip = null;
      this.pendingEOFill = false;
      this.embedFonts = false;
      this.embeddedFonts = Object.create(null);
      this.cssStyle = null;
      this.forceDataSchema = !!forceDataSchema;
    }
    var XML_NS = 'http://www.w3.org/XML/1998/namespace';
    var XLINK_NS = 'http://www.w3.org/1999/xlink';
    var LINE_CAP_STYLES = ['butt', 'round', 'square'];
    var LINE_JOIN_STYLES = ['miter', 'round', 'bevel'];
    var clipCount = 0;
    var maskCount = 0;
    SVGGraphics.prototype = {
      save: function SVGGraphics_save() {
        this.transformStack.push(this.transformMatrix);
        var old = this.current;
        this.extraStack.push(old);
        this.current = old.clone();
      },
      restore: function SVGGraphics_restore() {
        this.transformMatrix = this.transformStack.pop();
        this.current = this.extraStack.pop();
        this.pendingClip = null;
        this.tgrp = null;
      },
      group: function SVGGraphics_group(items) {
        this.save();
        this.executeOpTree(items);
        this.restore();
      },
      loadDependencies: function SVGGraphics_loadDependencies(operatorList) {
        var _this = this;

        var fnArray = operatorList.fnArray;
        var fnArrayLen = fnArray.length;
        var argsArray = operatorList.argsArray;
        for (var i = 0; i < fnArrayLen; i++) {
          if (_util.OPS.dependency === fnArray[i]) {
            var deps = argsArray[i];
            for (var n = 0, nn = deps.length; n < nn; n++) {
              var obj = deps[n];
              var common = obj.substring(0, 2) === 'g_';
              var promise;
              if (common) {
                promise = new Promise(function (resolve) {
                  _this.commonObjs.get(obj, resolve);
                });
              } else {
                promise = new Promise(function (resolve) {
                  _this.objs.get(obj, resolve);
                });
              }
              this.current.dependencies.push(promise);
            }
          }
        }
        return Promise.all(this.current.dependencies);
      },
      transform: function SVGGraphics_transform(a, b, c, d, e, f) {
        var transformMatrix = [a, b, c, d, e, f];
        this.transformMatrix = _util.Util.transform(this.transformMatrix, transformMatrix);
        this.tgrp = null;
      },
      getSVG: function SVGGraphics_getSVG(operatorList, viewport) {
        var _this2 = this;

        this.viewport = viewport;
        var svgElement = this._initialize(viewport);
        return this.loadDependencies(operatorList).then(function () {
          _this2.transformMatrix = _util.IDENTITY_MATRIX;
          var opTree = _this2.convertOpList(operatorList);
          _this2.executeOpTree(opTree);
          return svgElement;
        });
      },
      convertOpList: function SVGGraphics_convertOpList(operatorList) {
        var argsArray = operatorList.argsArray;
        var fnArray = operatorList.fnArray;
        var fnArrayLen = fnArray.length;
        var REVOPS = [];
        var opList = [];
        for (var op in _util.OPS) {
          REVOPS[_util.OPS[op]] = op;
        }
        for (var x = 0; x < fnArrayLen; x++) {
          var fnId = fnArray[x];
          opList.push({
            'fnId': fnId,
            'fn': REVOPS[fnId],
            'args': argsArray[x]
          });
        }
        return opListToTree(opList);
      },
      executeOpTree: function SVGGraphics_executeOpTree(opTree) {
        var opTreeLen = opTree.length;
        for (var x = 0; x < opTreeLen; x++) {
          var fn = opTree[x].fn;
          var fnId = opTree[x].fnId;
          var args = opTree[x].args;
          switch (fnId | 0) {
            case _util.OPS.beginText:
              this.beginText();
              break;
            case _util.OPS.setLeading:
              this.setLeading(args);
              break;
            case _util.OPS.setLeadingMoveText:
              this.setLeadingMoveText(args[0], args[1]);
              break;
            case _util.OPS.setFont:
              this.setFont(args);
              break;
            case _util.OPS.showText:
              this.showText(args[0]);
              break;
            case _util.OPS.showSpacedText:
              this.showText(args[0]);
              break;
            case _util.OPS.endText:
              this.endText();
              break;
            case _util.OPS.moveText:
              this.moveText(args[0], args[1]);
              break;
            case _util.OPS.setCharSpacing:
              this.setCharSpacing(args[0]);
              break;
            case _util.OPS.setWordSpacing:
              this.setWordSpacing(args[0]);
              break;
            case _util.OPS.setHScale:
              this.setHScale(args[0]);
              break;
            case _util.OPS.setTextMatrix:
              this.setTextMatrix(args[0], args[1], args[2], args[3], args[4], args[5]);
              break;
            case _util.OPS.setTextRise:
              this.setTextRise(args[0]);
              break;
            case _util.OPS.setLineWidth:
              this.setLineWidth(args[0]);
              break;
            case _util.OPS.setLineJoin:
              this.setLineJoin(args[0]);
              break;
            case _util.OPS.setLineCap:
              this.setLineCap(args[0]);
              break;
            case _util.OPS.setMiterLimit:
              this.setMiterLimit(args[0]);
              break;
            case _util.OPS.setFillRGBColor:
              this.setFillRGBColor(args[0], args[1], args[2]);
              break;
            case _util.OPS.setStrokeRGBColor:
              this.setStrokeRGBColor(args[0], args[1], args[2]);
              break;
            case _util.OPS.setDash:
              this.setDash(args[0], args[1]);
              break;
            case _util.OPS.setGState:
              this.setGState(args[0]);
              break;
            case _util.OPS.fill:
              this.fill();
              break;
            case _util.OPS.eoFill:
              this.eoFill();
              break;
            case _util.OPS.stroke:
              this.stroke();
              break;
            case _util.OPS.fillStroke:
              this.fillStroke();
              break;
            case _util.OPS.eoFillStroke:
              this.eoFillStroke();
              break;
            case _util.OPS.clip:
              this.clip('nonzero');
              break;
            case _util.OPS.eoClip:
              this.clip('evenodd');
              break;
            case _util.OPS.paintSolidColorImageMask:
              this.paintSolidColorImageMask();
              break;
            case _util.OPS.paintJpegXObject:
              this.paintJpegXObject(args[0], args[1], args[2]);
              break;
            case _util.OPS.paintImageXObject:
              this.paintImageXObject(args[0]);
              break;
            case _util.OPS.paintInlineImageXObject:
              this.paintInlineImageXObject(args[0]);
              break;
            case _util.OPS.paintImageMaskXObject:
              this.paintImageMaskXObject(args[0]);
              break;
            case _util.OPS.paintFormXObjectBegin:
              this.paintFormXObjectBegin(args[0], args[1]);
              break;
            case _util.OPS.paintFormXObjectEnd:
              this.paintFormXObjectEnd();
              break;
            case _util.OPS.closePath:
              this.closePath();
              break;
            case _util.OPS.closeStroke:
              this.closeStroke();
              break;
            case _util.OPS.closeFillStroke:
              this.closeFillStroke();
              break;
            case _util.OPS.nextLine:
              this.nextLine();
              break;
            case _util.OPS.transform:
              this.transform(args[0], args[1], args[2], args[3], args[4], args[5]);
              break;
            case _util.OPS.constructPath:
              this.constructPath(args[0], args[1]);
              break;
            case _util.OPS.endPath:
              this.endPath();
              break;
            case 92:
              this.group(opTree[x].items);
              break;
            default:
              (0, _util.warn)('Unimplemented operator ' + fn);
              break;
          }
        }
      },
      setWordSpacing: function SVGGraphics_setWordSpacing(wordSpacing) {
        this.current.wordSpacing = wordSpacing;
      },
      setCharSpacing: function SVGGraphics_setCharSpacing(charSpacing) {
        this.current.charSpacing = charSpacing;
      },
      nextLine: function SVGGraphics_nextLine() {
        this.moveText(0, this.current.leading);
      },
      setTextMatrix: function SVGGraphics_setTextMatrix(a, b, c, d, e, f) {
        var current = this.current;
        this.current.textMatrix = this.current.lineMatrix = [a, b, c, d, e, f];
        this.current.x = this.current.lineX = 0;
        this.current.y = this.current.lineY = 0;
        current.xcoords = [];
        current.tspan = this.svgFactory.createElement('svg:tspan');
        current.tspan.setAttributeNS(null, 'font-family', current.fontFamily);
        current.tspan.setAttributeNS(null, 'font-size', pf(current.fontSize) + 'px');
        current.tspan.setAttributeNS(null, 'y', pf(-current.y));
        current.txtElement = this.svgFactory.createElement('svg:text');
        current.txtElement.appendChild(current.tspan);
      },
      beginText: function SVGGraphics_beginText() {
        this.current.x = this.current.lineX = 0;
        this.current.y = this.current.lineY = 0;
        this.current.textMatrix = _util.IDENTITY_MATRIX;
        this.current.lineMatrix = _util.IDENTITY_MATRIX;
        this.current.tspan = this.svgFactory.createElement('svg:tspan');
        this.current.txtElement = this.svgFactory.createElement('svg:text');
        this.current.txtgrp = this.svgFactory.createElement('svg:g');
        this.current.xcoords = [];
      },
      moveText: function SVGGraphics_moveText(x, y) {
        var current = this.current;
        this.current.x = this.current.lineX += x;
        this.current.y = this.current.lineY += y;
        current.xcoords = [];
        current.tspan = this.svgFactory.createElement('svg:tspan');
        current.tspan.setAttributeNS(null, 'font-family', current.fontFamily);
        current.tspan.setAttributeNS(null, 'font-size', pf(current.fontSize) + 'px');
        current.tspan.setAttributeNS(null, 'y', pf(-current.y));
      },
      showText: function SVGGraphics_showText(glyphs) {
        var current = this.current;
        var font = current.font;
        var fontSize = current.fontSize;
        if (fontSize === 0) {
          return;
        }
        var charSpacing = current.charSpacing;
        var wordSpacing = current.wordSpacing;
        var fontDirection = current.fontDirection;
        var textHScale = current.textHScale * fontDirection;
        var glyphsLength = glyphs.length;
        var vertical = font.vertical;
        var widthAdvanceScale = fontSize * current.fontMatrix[0];
        var x = 0,
            i;
        for (i = 0; i < glyphsLength; ++i) {
          var glyph = glyphs[i];
          if (glyph === null) {
            x += fontDirection * wordSpacing;
            continue;
          } else if ((0, _util.isNum)(glyph)) {
            x += -glyph * fontSize * 0.001;
            continue;
          }
          var width = glyph.width;
          var character = glyph.fontChar;
          var spacing = (glyph.isSpace ? wordSpacing : 0) + charSpacing;
          var charWidth = width * widthAdvanceScale + spacing * fontDirection;
          if (!glyph.isInFont && !font.missingFile) {
            x += charWidth;
            continue;
          }
          current.xcoords.push(current.x + x * textHScale);
          current.tspan.textContent += character;
          x += charWidth;
        }
        if (vertical) {
          current.y -= x * textHScale;
        } else {
          current.x += x * textHScale;
        }
        current.tspan.setAttributeNS(null, 'x', current.xcoords.map(pf).join(' '));
        current.tspan.setAttributeNS(null, 'y', pf(-current.y));
        current.tspan.setAttributeNS(null, 'font-family', current.fontFamily);
        current.tspan.setAttributeNS(null, 'font-size', pf(current.fontSize) + 'px');
        if (current.fontStyle !== SVG_DEFAULTS.fontStyle) {
          current.tspan.setAttributeNS(null, 'font-style', current.fontStyle);
        }
        if (current.fontWeight !== SVG_DEFAULTS.fontWeight) {
          current.tspan.setAttributeNS(null, 'font-weight', current.fontWeight);
        }
        if (current.fillColor !== SVG_DEFAULTS.fillColor) {
          current.tspan.setAttributeNS(null, 'fill', current.fillColor);
        }
        var textMatrix = current.textMatrix;
        if (current.textRise !== 0) {
          textMatrix = textMatrix.slice();
          textMatrix[5] += current.textRise;
        }
        current.txtElement.setAttributeNS(null, 'transform', pm(textMatrix) + ' scale(1, -1)');
        current.txtElement.setAttributeNS(XML_NS, 'xml:space', 'preserve');
        current.txtElement.appendChild(current.tspan);
        current.txtgrp.appendChild(current.txtElement);
        this._ensureTransformGroup().appendChild(current.txtElement);
      },
      setLeadingMoveText: function SVGGraphics_setLeadingMoveText(x, y) {
        this.setLeading(-y);
        this.moveText(x, y);
      },
      addFontStyle: function SVGGraphics_addFontStyle(fontObj) {
        if (!this.cssStyle) {
          this.cssStyle = this.svgFactory.createElement('svg:style');
          this.cssStyle.setAttributeNS(null, 'type', 'text/css');
          this.defs.appendChild(this.cssStyle);
        }
        var url = (0, _util.createObjectURL)(fontObj.data, fontObj.mimetype, this.forceDataSchema);
        this.cssStyle.textContent += '@font-face { font-family: "' + fontObj.loadedName + '";' + ' src: url(' + url + '); }\n';
      },
      setFont: function SVGGraphics_setFont(details) {
        var current = this.current;
        var fontObj = this.commonObjs.get(details[0]);
        var size = details[1];
        this.current.font = fontObj;
        if (this.embedFonts && fontObj.data && !this.embeddedFonts[fontObj.loadedName]) {
          this.addFontStyle(fontObj);
          this.embeddedFonts[fontObj.loadedName] = fontObj;
        }
        current.fontMatrix = fontObj.fontMatrix ? fontObj.fontMatrix : _util.FONT_IDENTITY_MATRIX;
        var bold = fontObj.black ? fontObj.bold ? 'bolder' : 'bold' : fontObj.bold ? 'bold' : 'normal';
        var italic = fontObj.italic ? 'italic' : 'normal';
        if (size < 0) {
          size = -size;
          current.fontDirection = -1;
        } else {
          current.fontDirection = 1;
        }
        current.fontSize = size;
        current.fontFamily = fontObj.loadedName;
        current.fontWeight = bold;
        current.fontStyle = italic;
        current.tspan = this.svgFactory.createElement('svg:tspan');
        current.tspan.setAttributeNS(null, 'y', pf(-current.y));
        current.xcoords = [];
      },
      endText: function SVGGraphics_endText() {},
      setLineWidth: function SVGGraphics_setLineWidth(width) {
        this.current.lineWidth = width;
      },
      setLineCap: function SVGGraphics_setLineCap(style) {
        this.current.lineCap = LINE_CAP_STYLES[style];
      },
      setLineJoin: function SVGGraphics_setLineJoin(style) {
        this.current.lineJoin = LINE_JOIN_STYLES[style];
      },
      setMiterLimit: function SVGGraphics_setMiterLimit(limit) {
        this.current.miterLimit = limit;
      },
      setStrokeAlpha: function SVGGraphics_setStrokeAlpha(strokeAlpha) {
        this.current.strokeAlpha = strokeAlpha;
      },
      setStrokeRGBColor: function SVGGraphics_setStrokeRGBColor(r, g, b) {
        var color = _util.Util.makeCssRgb(r, g, b);
        this.current.strokeColor = color;
      },
      setFillAlpha: function SVGGraphics_setFillAlpha(fillAlpha) {
        this.current.fillAlpha = fillAlpha;
      },
      setFillRGBColor: function SVGGraphics_setFillRGBColor(r, g, b) {
        var color = _util.Util.makeCssRgb(r, g, b);
        this.current.fillColor = color;
        this.current.tspan = this.svgFactory.createElement('svg:tspan');
        this.current.xcoords = [];
      },
      setDash: function SVGGraphics_setDash(dashArray, dashPhase) {
        this.current.dashArray = dashArray;
        this.current.dashPhase = dashPhase;
      },
      constructPath: function SVGGraphics_constructPath(ops, args) {
        var current = this.current;
        var x = current.x,
            y = current.y;
        current.path = this.svgFactory.createElement('svg:path');
        var d = [];
        var opLength = ops.length;
        for (var i = 0, j = 0; i < opLength; i++) {
          switch (ops[i] | 0) {
            case _util.OPS.rectangle:
              x = args[j++];
              y = args[j++];
              var width = args[j++];
              var height = args[j++];
              var xw = x + width;
              var yh = y + height;
              d.push('M', pf(x), pf(y), 'L', pf(xw), pf(y), 'L', pf(xw), pf(yh), 'L', pf(x), pf(yh), 'Z');
              break;
            case _util.OPS.moveTo:
              x = args[j++];
              y = args[j++];
              d.push('M', pf(x), pf(y));
              break;
            case _util.OPS.lineTo:
              x = args[j++];
              y = args[j++];
              d.push('L', pf(x), pf(y));
              break;
            case _util.OPS.curveTo:
              x = args[j + 4];
              y = args[j + 5];
              d.push('C', pf(args[j]), pf(args[j + 1]), pf(args[j + 2]), pf(args[j + 3]), pf(x), pf(y));
              j += 6;
              break;
            case _util.OPS.curveTo2:
              x = args[j + 2];
              y = args[j + 3];
              d.push('C', pf(x), pf(y), pf(args[j]), pf(args[j + 1]), pf(args[j + 2]), pf(args[j + 3]));
              j += 4;
              break;
            case _util.OPS.curveTo3:
              x = args[j + 2];
              y = args[j + 3];
              d.push('C', pf(args[j]), pf(args[j + 1]), pf(x), pf(y), pf(x), pf(y));
              j += 4;
              break;
            case _util.OPS.closePath:
              d.push('Z');
              break;
          }
        }
        current.path.setAttributeNS(null, 'd', d.join(' '));
        current.path.setAttributeNS(null, 'fill', 'none');
        this._ensureTransformGroup().appendChild(current.path);
        current.element = current.path;
        current.setCurrentPoint(x, y);
      },
      endPath: function SVGGraphics_endPath() {
        if (!this.pendingClip) {
          return;
        }
        var current = this.current;
        var clipId = 'clippath' + clipCount;
        clipCount++;
        var clipPath = this.svgFactory.createElement('svg:clipPath');
        clipPath.setAttributeNS(null, 'id', clipId);
        clipPath.setAttributeNS(null, 'transform', pm(this.transformMatrix));
        var clipElement = current.element.cloneNode();
        if (this.pendingClip === 'evenodd') {
          clipElement.setAttributeNS(null, 'clip-rule', 'evenodd');
        } else {
          clipElement.setAttributeNS(null, 'clip-rule', 'nonzero');
        }
        this.pendingClip = null;
        clipPath.appendChild(clipElement);
        this.defs.appendChild(clipPath);
        if (current.activeClipUrl) {
          current.clipGroup = null;
          this.extraStack.forEach(function (prev) {
            prev.clipGroup = null;
          });
        }
        current.activeClipUrl = 'url(#' + clipId + ')';
        this.tgrp = null;
      },
      clip: function SVGGraphics_clip(type) {
        this.pendingClip = type;
      },
      closePath: function SVGGraphics_closePath() {
        var current = this.current;
        var d = current.path.getAttributeNS(null, 'd');
        d += 'Z';
        current.path.setAttributeNS(null, 'd', d);
      },
      setLeading: function SVGGraphics_setLeading(leading) {
        this.current.leading = -leading;
      },
      setTextRise: function SVGGraphics_setTextRise(textRise) {
        this.current.textRise = textRise;
      },
      setHScale: function SVGGraphics_setHScale(scale) {
        this.current.textHScale = scale / 100;
      },
      setGState: function SVGGraphics_setGState(states) {
        for (var i = 0, ii = states.length; i < ii; i++) {
          var state = states[i];
          var key = state[0];
          var value = state[1];
          switch (key) {
            case 'LW':
              this.setLineWidth(value);
              break;
            case 'LC':
              this.setLineCap(value);
              break;
            case 'LJ':
              this.setLineJoin(value);
              break;
            case 'ML':
              this.setMiterLimit(value);
              break;
            case 'D':
              this.setDash(value[0], value[1]);
              break;
            case 'Font':
              this.setFont(value);
              break;
            case 'CA':
              this.setStrokeAlpha(value);
              break;
            case 'ca':
              this.setFillAlpha(value);
              break;
            default:
              (0, _util.warn)('Unimplemented graphic state ' + key);
              break;
          }
        }
      },
      fill: function SVGGraphics_fill() {
        var current = this.current;
        current.element.setAttributeNS(null, 'fill', current.fillColor);
        current.element.setAttributeNS(null, 'fill-opacity', current.fillAlpha);
      },
      stroke: function SVGGraphics_stroke() {
        var current = this.current;
        current.element.setAttributeNS(null, 'stroke', current.strokeColor);
        current.element.setAttributeNS(null, 'stroke-opacity', current.strokeAlpha);
        current.element.setAttributeNS(null, 'stroke-miterlimit', pf(current.miterLimit));
        current.element.setAttributeNS(null, 'stroke-linecap', current.lineCap);
        current.element.setAttributeNS(null, 'stroke-linejoin', current.lineJoin);
        current.element.setAttributeNS(null, 'stroke-width', pf(current.lineWidth) + 'px');
        current.element.setAttributeNS(null, 'stroke-dasharray', current.dashArray.map(pf).join(' '));
        current.element.setAttributeNS(null, 'stroke-dashoffset', pf(current.dashPhase) + 'px');
        current.element.setAttributeNS(null, 'fill', 'none');
      },
      eoFill: function SVGGraphics_eoFill() {
        this.current.element.setAttributeNS(null, 'fill-rule', 'evenodd');
        this.fill();
      },
      fillStroke: function SVGGraphics_fillStroke() {
        this.stroke();
        this.fill();
      },
      eoFillStroke: function SVGGraphics_eoFillStroke() {
        this.current.element.setAttributeNS(null, 'fill-rule', 'evenodd');
        this.fillStroke();
      },
      closeStroke: function SVGGraphics_closeStroke() {
        this.closePath();
        this.stroke();
      },
      closeFillStroke: function SVGGraphics_closeFillStroke() {
        this.closePath();
        this.fillStroke();
      },
      paintSolidColorImageMask: function SVGGraphics_paintSolidColorImageMask() {
        var current = this.current;
        var rect = this.svgFactory.createElement('svg:rect');
        rect.setAttributeNS(null, 'x', '0');
        rect.setAttributeNS(null, 'y', '0');
        rect.setAttributeNS(null, 'width', '1px');
        rect.setAttributeNS(null, 'height', '1px');
        rect.setAttributeNS(null, 'fill', current.fillColor);
        this._ensureTransformGroup().appendChild(rect);
      },
      paintJpegXObject: function SVGGraphics_paintJpegXObject(objId, w, h) {
        var imgObj = this.objs.get(objId);
        var imgEl = this.svgFactory.createElement('svg:image');
        imgEl.setAttributeNS(XLINK_NS, 'xlink:href', imgObj.src);
        imgEl.setAttributeNS(null, 'width', pf(w));
        imgEl.setAttributeNS(null, 'height', pf(h));
        imgEl.setAttributeNS(null, 'x', '0');
        imgEl.setAttributeNS(null, 'y', pf(-h));
        imgEl.setAttributeNS(null, 'transform', 'scale(' + pf(1 / w) + ' ' + pf(-1 / h) + ')');
        this._ensureTransformGroup().appendChild(imgEl);
      },
      paintImageXObject: function SVGGraphics_paintImageXObject(objId) {
        var imgData = this.objs.get(objId);
        if (!imgData) {
          (0, _util.warn)('Dependent image isn\'t ready yet');
          return;
        }
        this.paintInlineImageXObject(imgData);
      },
      paintInlineImageXObject: function SVGGraphics_paintInlineImageXObject(imgData, mask) {
        var width = imgData.width;
        var height = imgData.height;
        var imgSrc = convertImgDataToPng(imgData, this.forceDataSchema);
        var cliprect = this.svgFactory.createElement('svg:rect');
        cliprect.setAttributeNS(null, 'x', '0');
        cliprect.setAttributeNS(null, 'y', '0');
        cliprect.setAttributeNS(null, 'width', pf(width));
        cliprect.setAttributeNS(null, 'height', pf(height));
        this.current.element = cliprect;
        this.clip('nonzero');
        var imgEl = this.svgFactory.createElement('svg:image');
        imgEl.setAttributeNS(XLINK_NS, 'xlink:href', imgSrc);
        imgEl.setAttributeNS(null, 'x', '0');
        imgEl.setAttributeNS(null, 'y', pf(-height));
        imgEl.setAttributeNS(null, 'width', pf(width) + 'px');
        imgEl.setAttributeNS(null, 'height', pf(height) + 'px');
        imgEl.setAttributeNS(null, 'transform', 'scale(' + pf(1 / width) + ' ' + pf(-1 / height) + ')');
        if (mask) {
          mask.appendChild(imgEl);
        } else {
          this._ensureTransformGroup().appendChild(imgEl);
        }
      },
      paintImageMaskXObject: function SVGGraphics_paintImageMaskXObject(imgData) {
        var current = this.current;
        var width = imgData.width;
        var height = imgData.height;
        var fillColor = current.fillColor;
        current.maskId = 'mask' + maskCount++;
        var mask = this.svgFactory.createElement('svg:mask');
        mask.setAttributeNS(null, 'id', current.maskId);
        var rect = this.svgFactory.createElement('svg:rect');
        rect.setAttributeNS(null, 'x', '0');
        rect.setAttributeNS(null, 'y', '0');
        rect.setAttributeNS(null, 'width', pf(width));
        rect.setAttributeNS(null, 'height', pf(height));
        rect.setAttributeNS(null, 'fill', fillColor);
        rect.setAttributeNS(null, 'mask', 'url(#' + current.maskId + ')');
        this.defs.appendChild(mask);
        this._ensureTransformGroup().appendChild(rect);
        this.paintInlineImageXObject(imgData, mask);
      },
      paintFormXObjectBegin: function SVGGraphics_paintFormXObjectBegin(matrix, bbox) {
        if (Array.isArray(matrix) && matrix.length === 6) {
          this.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        }
        if (Array.isArray(bbox) && bbox.length === 4) {
          var width = bbox[2] - bbox[0];
          var height = bbox[3] - bbox[1];
          var cliprect = this.svgFactory.createElement('svg:rect');
          cliprect.setAttributeNS(null, 'x', bbox[0]);
          cliprect.setAttributeNS(null, 'y', bbox[1]);
          cliprect.setAttributeNS(null, 'width', pf(width));
          cliprect.setAttributeNS(null, 'height', pf(height));
          this.current.element = cliprect;
          this.clip('nonzero');
          this.endPath();
        }
      },
      paintFormXObjectEnd: function SVGGraphics_paintFormXObjectEnd() {},
      _initialize: function _initialize(viewport) {
        var svg = this.svgFactory.create(viewport.width, viewport.height);
        var definitions = this.svgFactory.createElement('svg:defs');
        svg.appendChild(definitions);
        this.defs = definitions;
        var rootGroup = this.svgFactory.createElement('svg:g');
        rootGroup.setAttributeNS(null, 'transform', pm(viewport.transform));
        svg.appendChild(rootGroup);
        this.svg = rootGroup;
        return svg;
      },

      _ensureClipGroup: function SVGGraphics_ensureClipGroup() {
        if (!this.current.clipGroup) {
          var clipGroup = this.svgFactory.createElement('svg:g');
          clipGroup.setAttributeNS(null, 'clip-path', this.current.activeClipUrl);
          this.svg.appendChild(clipGroup);
          this.current.clipGroup = clipGroup;
        }
        return this.current.clipGroup;
      },
      _ensureTransformGroup: function SVGGraphics_ensureTransformGroup() {
        if (!this.tgrp) {
          this.tgrp = this.svgFactory.createElement('svg:g');
          this.tgrp.setAttributeNS(null, 'transform', pm(this.transformMatrix));
          if (this.current.activeClipUrl) {
            this._ensureClipGroup().appendChild(this.tgrp);
          } else {
            this.svg.appendChild(this.tgrp);
          }
        }
        return this.tgrp;
      }
    };
    return SVGGraphics;
  }();
}
exports.SVGGraphics = SVGGraphics;

/***/ }),
/* 75 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var pdfjsVersion = '1.10.88';
var pdfjsBuild = 'c62a1938';
var pdfjsSharedUtil = __w_pdfjs_require__(0);
var pdfjsDisplayGlobal = __w_pdfjs_require__(117);
var pdfjsDisplayAPI = __w_pdfjs_require__(69);
var pdfjsDisplayTextLayer = __w_pdfjs_require__(73);
var pdfjsDisplayAnnotationLayer = __w_pdfjs_require__(72);
var pdfjsDisplayDOMUtils = __w_pdfjs_require__(13);
var pdfjsDisplaySVG = __w_pdfjs_require__(74);
{
  if (pdfjsSharedUtil.isNodeJS()) {
    var PDFNodeStream = __w_pdfjs_require__(122).PDFNodeStream;
    pdfjsDisplayAPI.setPDFNetworkStreamClass(PDFNodeStream);
  } else if (typeof Response !== 'undefined' && 'body' in Response.prototype && typeof ReadableStream !== 'undefined') {
    var PDFFetchStream = __w_pdfjs_require__(123).PDFFetchStream;
    pdfjsDisplayAPI.setPDFNetworkStreamClass(PDFFetchStream);
  } else {
    var PDFNetworkStream = __w_pdfjs_require__(124).PDFNetworkStream;
    pdfjsDisplayAPI.setPDFNetworkStreamClass(PDFNetworkStream);
  }
}
exports.PDFJS = pdfjsDisplayGlobal.PDFJS;
exports.build = pdfjsDisplayAPI.build;
exports.version = pdfjsDisplayAPI.version;
exports.getDocument = pdfjsDisplayAPI.getDocument;
exports.LoopbackPort = pdfjsDisplayAPI.LoopbackPort;
exports.PDFDataRangeTransport = pdfjsDisplayAPI.PDFDataRangeTransport;
exports.PDFWorker = pdfjsDisplayAPI.PDFWorker;
exports.renderTextLayer = pdfjsDisplayTextLayer.renderTextLayer;
exports.AnnotationLayer = pdfjsDisplayAnnotationLayer.AnnotationLayer;
exports.CustomStyle = pdfjsDisplayDOMUtils.CustomStyle;
exports.createPromiseCapability = pdfjsSharedUtil.createPromiseCapability;
exports.PasswordResponses = pdfjsSharedUtil.PasswordResponses;
exports.InvalidPDFException = pdfjsSharedUtil.InvalidPDFException;
exports.MissingPDFException = pdfjsSharedUtil.MissingPDFException;
exports.SVGGraphics = pdfjsDisplaySVG.SVGGraphics;
exports.NativeImageDecoding = pdfjsSharedUtil.NativeImageDecoding;
exports.UnexpectedResponseException = pdfjsSharedUtil.UnexpectedResponseException;
exports.OPS = pdfjsSharedUtil.OPS;
exports.UNSUPPORTED_FEATURES = pdfjsSharedUtil.UNSUPPORTED_FEATURES;
exports.isValidUrl = pdfjsDisplayDOMUtils.isValidUrl;
exports.createValidAbsoluteUrl = pdfjsSharedUtil.createValidAbsoluteUrl;
exports.createObjectURL = pdfjsSharedUtil.createObjectURL;
exports.removeNullCharacters = pdfjsSharedUtil.removeNullCharacters;
exports.shadow = pdfjsSharedUtil.shadow;
exports.createBlob = pdfjsSharedUtil.createBlob;
exports.RenderingCancelledException = pdfjsDisplayDOMUtils.RenderingCancelledException;
exports.getFilenameFromUrl = pdfjsDisplayDOMUtils.getFilenameFromUrl;
exports.addLinkAttributes = pdfjsDisplayDOMUtils.addLinkAttributes;
exports.StatTimer = pdfjsSharedUtil.StatTimer;

/***/ }),
/* 76 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

if (typeof PDFJS === 'undefined' || !PDFJS.compatibilityChecked) {
  var globalScope = __w_pdfjs_require__(20);
  var userAgent = typeof navigator !== 'undefined' && navigator.userAgent || '';
  var isAndroid = /Android/.test(userAgent);
  var isAndroidPre3 = /Android\s[0-2][^\d]/.test(userAgent);
  var isAndroidPre5 = /Android\s[0-4][^\d]/.test(userAgent);
  var isChrome = userAgent.indexOf('Chrom') >= 0;
  var isChromeWithRangeBug = /Chrome\/(39|40)\./.test(userAgent);
  var isIOSChrome = userAgent.indexOf('CriOS') >= 0;
  var isIE = userAgent.indexOf('Trident') >= 0;
  var isIOS = /\b(iPad|iPhone|iPod)(?=;)/.test(userAgent);
  var isOpera = userAgent.indexOf('Opera') >= 0;
  var isSafari = /Safari\//.test(userAgent) && !/(Chrome\/|Android\s)/.test(userAgent);
  var hasDOM = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && (typeof document === 'undefined' ? 'undefined' : _typeof(document)) === 'object';
  if (typeof PDFJS === 'undefined') {
    globalScope.PDFJS = {};
  }
  PDFJS.compatibilityChecked = true;
  (function checkTypedArrayCompatibility() {
    if (typeof Uint8ClampedArray === 'undefined') {
      globalScope.Uint8ClampedArray = __w_pdfjs_require__(77);
    }
    if (typeof Uint8Array !== 'undefined') {
      if (typeof Uint8Array.prototype.subarray === 'undefined') {
        Uint8Array.prototype.subarray = function subarray(start, end) {
          return new Uint8Array(this.slice(start, end));
        };
        Float32Array.prototype.subarray = function subarray(start, end) {
          return new Float32Array(this.slice(start, end));
        };
      }
      if (typeof Float64Array === 'undefined') {
        globalScope.Float64Array = Float32Array;
      }
      return;
    }
    function subarray(start, end) {
      return new TypedArray(this.slice(start, end));
    }
    function setArrayOffset(array, offset) {
      if (arguments.length < 2) {
        offset = 0;
      }
      for (var i = 0, n = array.length; i < n; ++i, ++offset) {
        this[offset] = array[i] & 0xFF;
      }
    }
    function Uint32ArrayView(buffer, length) {
      this.buffer = buffer;
      this.byteLength = buffer.length;
      this.length = length;
      ensureUint32ArrayViewProps(this.length);
    }
    Uint32ArrayView.prototype = Object.create(null);
    var uint32ArrayViewSetters = 0;
    function createUint32ArrayProp(index) {
      return {
        get: function get() {
          var buffer = this.buffer,
              offset = index << 2;
          return (buffer[offset] | buffer[offset + 1] << 8 | buffer[offset + 2] << 16 | buffer[offset + 3] << 24) >>> 0;
        },
        set: function set(value) {
          var buffer = this.buffer,
              offset = index << 2;
          buffer[offset] = value & 255;
          buffer[offset + 1] = value >> 8 & 255;
          buffer[offset + 2] = value >> 16 & 255;
          buffer[offset + 3] = value >>> 24 & 255;
        }
      };
    }
    function ensureUint32ArrayViewProps(length) {
      while (uint32ArrayViewSetters < length) {
        Object.defineProperty(Uint32ArrayView.prototype, uint32ArrayViewSetters, createUint32ArrayProp(uint32ArrayViewSetters));
        uint32ArrayViewSetters++;
      }
    }
    function TypedArray(arg1) {
      var result, i, n;
      if (typeof arg1 === 'number') {
        result = [];
        for (i = 0; i < arg1; ++i) {
          result[i] = 0;
        }
      } else if ('slice' in arg1) {
        result = arg1.slice(0);
      } else {
        result = [];
        for (i = 0, n = arg1.length; i < n; ++i) {
          result[i] = arg1[i];
        }
      }
      result.subarray = subarray;
      result.buffer = result;
      result.byteLength = result.length;
      result.set = setArrayOffset;
      if ((typeof arg1 === 'undefined' ? 'undefined' : _typeof(arg1)) === 'object' && arg1.buffer) {
        result.buffer = arg1.buffer;
      }
      return result;
    }
    globalScope.Uint8Array = TypedArray;
    globalScope.Int8Array = TypedArray;
    globalScope.Int32Array = TypedArray;
    globalScope.Uint16Array = TypedArray;
    globalScope.Float32Array = TypedArray;
    globalScope.Float64Array = TypedArray;
    globalScope.Uint32Array = function () {
      if (arguments.length === 3) {
        if (arguments[1] !== 0) {
          throw new Error('offset !== 0 is not supported');
        }
        return new Uint32ArrayView(arguments[0], arguments[2]);
      }
      return TypedArray.apply(this, arguments);
    };
  })();
  (function canvasPixelArrayBuffer() {
    if (!hasDOM || !window.CanvasPixelArray) {
      return;
    }
    var cpaProto = window.CanvasPixelArray.prototype;
    if ('buffer' in cpaProto) {
      return;
    }
    Object.defineProperty(cpaProto, 'buffer', {
      get: function get() {
        return this;
      },

      enumerable: false,
      configurable: true
    });
    Object.defineProperty(cpaProto, 'byteLength', {
      get: function get() {
        return this.length;
      },

      enumerable: false,
      configurable: true
    });
  })();
  (function normalizeURLObject() {
    if (!globalScope.URL) {
      globalScope.URL = globalScope.webkitURL;
    }
  })();
  (function checkObjectDefinePropertyCompatibility() {
    if (typeof Object.defineProperty !== 'undefined') {
      var definePropertyPossible = true;
      try {
        if (hasDOM) {
          Object.defineProperty(new Image(), 'id', { value: 'test' });
        }
        var Test = function Test() {};
        Test.prototype = {
          get id() {}
        };
        Object.defineProperty(new Test(), 'id', {
          value: '',
          configurable: true,
          enumerable: true,
          writable: false
        });
      } catch (e) {
        definePropertyPossible = false;
      }
      if (definePropertyPossible) {
        return;
      }
    }
    Object.defineProperty = function objectDefineProperty(obj, name, def) {
      delete obj[name];
      if ('get' in def) {
        obj.__defineGetter__(name, def['get']);
      }
      if ('set' in def) {
        obj.__defineSetter__(name, def['set']);
      }
      if ('value' in def) {
        obj.__defineSetter__(name, function objectDefinePropertySetter(value) {
          this.__defineGetter__(name, function objectDefinePropertyGetter() {
            return value;
          });
          return value;
        });
        obj[name] = def.value;
      }
    };
  })();
  (function checkXMLHttpRequestResponseCompatibility() {
    if (typeof XMLHttpRequest === 'undefined') {
      return;
    }
    var xhrPrototype = XMLHttpRequest.prototype;
    var xhr = new XMLHttpRequest();
    if (!('overrideMimeType' in xhr)) {
      Object.defineProperty(xhrPrototype, 'overrideMimeType', {
        value: function xmlHttpRequestOverrideMimeType(mimeType) {}
      });
    }
    if ('responseType' in xhr) {
      return;
    }
    Object.defineProperty(xhrPrototype, 'responseType', {
      get: function xmlHttpRequestGetResponseType() {
        return this._responseType || 'text';
      },
      set: function xmlHttpRequestSetResponseType(value) {
        if (value === 'text' || value === 'arraybuffer') {
          this._responseType = value;
          if (value === 'arraybuffer' && typeof this.overrideMimeType === 'function') {
            this.overrideMimeType('text/plain; charset=x-user-defined');
          }
        }
      }
    });
    if (typeof VBArray !== 'undefined') {
      Object.defineProperty(xhrPrototype, 'response', {
        get: function xmlHttpRequestResponseGet() {
          if (this.responseType === 'arraybuffer') {
            return new Uint8Array(new VBArray(this.responseBody).toArray());
          }
          return this.responseText;
        }
      });
      return;
    }
    Object.defineProperty(xhrPrototype, 'response', {
      get: function xmlHttpRequestResponseGet() {
        if (this.responseType !== 'arraybuffer') {
          return this.responseText;
        }
        var text = this.responseText;
        var i,
            n = text.length;
        var result = new Uint8Array(n);
        for (i = 0; i < n; ++i) {
          result[i] = text.charCodeAt(i) & 0xFF;
        }
        return result.buffer;
      }
    });
  })();
  (function checkWindowBtoaCompatibility() {
    if ('btoa' in globalScope) {
      return;
    }
    var digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    globalScope.btoa = function (chars) {
      var buffer = '';
      var i, n;
      for (i = 0, n = chars.length; i < n; i += 3) {
        var b1 = chars.charCodeAt(i) & 0xFF;
        var b2 = chars.charCodeAt(i + 1) & 0xFF;
        var b3 = chars.charCodeAt(i + 2) & 0xFF;
        var d1 = b1 >> 2,
            d2 = (b1 & 3) << 4 | b2 >> 4;
        var d3 = i + 1 < n ? (b2 & 0xF) << 2 | b3 >> 6 : 64;
        var d4 = i + 2 < n ? b3 & 0x3F : 64;
        buffer += digits.charAt(d1) + digits.charAt(d2) + digits.charAt(d3) + digits.charAt(d4);
      }
      return buffer;
    };
  })();
  (function checkWindowAtobCompatibility() {
    if ('atob' in globalScope) {
      return;
    }
    var digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    globalScope.atob = function (input) {
      input = input.replace(/=+$/, '');
      if (input.length % 4 === 1) {
        throw new Error('bad atob input');
      }
      for (var bc = 0, bs, buffer, idx = 0, output = ''; buffer = input.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = digits.indexOf(buffer);
      }
      return output;
    };
  })();
  (function checkFunctionPrototypeBindCompatibility() {
    if (typeof Function.prototype.bind !== 'undefined') {
      return;
    }
    Function.prototype.bind = function functionPrototypeBind(obj) {
      var fn = this,
          headArgs = Array.prototype.slice.call(arguments, 1);
      var bound = function functionPrototypeBindBound() {
        var args = headArgs.concat(Array.prototype.slice.call(arguments));
        return fn.apply(obj, args);
      };
      return bound;
    };
  })();
  (function checkDatasetProperty() {
    if (!hasDOM) {
      return;
    }
    var div = document.createElement('div');
    if ('dataset' in div) {
      return;
    }
    Object.defineProperty(HTMLElement.prototype, 'dataset', {
      get: function get() {
        if (this._dataset) {
          return this._dataset;
        }
        var dataset = {};
        for (var j = 0, jj = this.attributes.length; j < jj; j++) {
          var attribute = this.attributes[j];
          if (attribute.name.substring(0, 5) !== 'data-') {
            continue;
          }
          var key = attribute.name.substring(5).replace(/\-([a-z])/g, function (all, ch) {
            return ch.toUpperCase();
          });
          dataset[key] = attribute.value;
        }
        Object.defineProperty(this, '_dataset', {
          value: dataset,
          writable: false,
          enumerable: false
        });
        return dataset;
      },

      enumerable: true
    });
  })();
  (function checkClassListProperty() {
    function changeList(element, itemName, add, remove) {
      var s = element.className || '';
      var list = s.split(/\s+/g);
      if (list[0] === '') {
        list.shift();
      }
      var index = list.indexOf(itemName);
      if (index < 0 && add) {
        list.push(itemName);
      }
      if (index >= 0 && remove) {
        list.splice(index, 1);
      }
      element.className = list.join(' ');
      return index >= 0;
    }
    if (!hasDOM) {
      return;
    }
    var div = document.createElement('div');
    if ('classList' in div) {
      return;
    }
    var classListPrototype = {
      add: function add(name) {
        changeList(this.element, name, true, false);
      },
      contains: function contains(name) {
        return changeList(this.element, name, false, false);
      },
      remove: function remove(name) {
        changeList(this.element, name, false, true);
      },
      toggle: function toggle(name) {
        changeList(this.element, name, true, true);
      }
    };
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function get() {
        if (this._classList) {
          return this._classList;
        }
        var classList = Object.create(classListPrototype, {
          element: {
            value: this,
            writable: false,
            enumerable: true
          }
        });
        Object.defineProperty(this, '_classList', {
          value: classList,
          writable: false,
          enumerable: false
        });
        return classList;
      },

      enumerable: true
    });
  })();
  (function checkWorkerConsoleCompatibility() {
    if (typeof importScripts === 'undefined' || 'console' in globalScope) {
      return;
    }
    var consoleTimer = {};
    var workerConsole = {
      log: function log() {
        var args = Array.prototype.slice.call(arguments);
        globalScope.postMessage({
          targetName: 'main',
          action: 'console_log',
          data: args
        });
      },
      error: function error() {
        var args = Array.prototype.slice.call(arguments);
        globalScope.postMessage({
          targetName: 'main',
          action: 'console_error',
          data: args
        });
      },
      time: function time(name) {
        consoleTimer[name] = Date.now();
      },
      timeEnd: function timeEnd(name) {
        var time = consoleTimer[name];
        if (!time) {
          throw new Error('Unknown timer name ' + name);
        }
        this.log('Timer:', name, Date.now() - time);
      }
    };
    globalScope.console = workerConsole;
  })();
  (function checkConsoleCompatibility() {
    if (!hasDOM) {
      return;
    }
    if (!('console' in window)) {
      window.console = {
        log: function log() {},
        error: function error() {},
        warn: function warn() {}
      };
      return;
    }
    if (!('bind' in console.log)) {
      console.log = function (fn) {
        return function (msg) {
          return fn(msg);
        };
      }(console.log);
      console.error = function (fn) {
        return function (msg) {
          return fn(msg);
        };
      }(console.error);
      console.warn = function (fn) {
        return function (msg) {
          return fn(msg);
        };
      }(console.warn);
      return;
    }
  })();
  (function checkOnClickCompatibility() {
    function ignoreIfTargetDisabled(event) {
      if (isDisabled(event.target)) {
        event.stopPropagation();
      }
    }
    function isDisabled(node) {
      return node.disabled || node.parentNode && isDisabled(node.parentNode);
    }
    if (isOpera) {
      document.addEventListener('click', ignoreIfTargetDisabled, true);
    }
  })();
  (function checkOnBlobSupport() {
    if (isIE || isIOSChrome) {
      PDFJS.disableCreateObjectURL = true;
    }
  })();
  (function checkNavigatorLanguage() {
    if (typeof navigator === 'undefined') {
      return;
    }
    if ('language' in navigator) {
      return;
    }
    PDFJS.locale = navigator.userLanguage || 'en-US';
  })();
  (function checkRangeRequests() {
    if (isSafari || isAndroidPre3 || isChromeWithRangeBug || isIOS) {
      PDFJS.disableRange = true;
      PDFJS.disableStream = true;
    }
  })();
  (function checkHistoryManipulation() {
    if (!hasDOM) {
      return;
    }
    if (!history.pushState || isAndroidPre3) {
      PDFJS.disableHistory = true;
    }
  })();
  (function checkSetPresenceInImageData() {
    if (!hasDOM) {
      return;
    }
    if (window.CanvasPixelArray) {
      if (typeof window.CanvasPixelArray.prototype.set !== 'function') {
        window.CanvasPixelArray.prototype.set = function (arr) {
          for (var i = 0, ii = this.length; i < ii; i++) {
            this[i] = arr[i];
          }
        };
      }
    } else {
      var polyfill = false,
          versionMatch;
      if (isChrome) {
        versionMatch = userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        polyfill = versionMatch && parseInt(versionMatch[2]) < 21;
      } else if (isAndroid) {
        polyfill = isAndroidPre5;
      } else if (isSafari) {
        versionMatch = userAgent.match(/Version\/([0-9]+)\.([0-9]+)\.([0-9]+) Safari\//);
        polyfill = versionMatch && parseInt(versionMatch[1]) < 6;
      }
      if (polyfill) {
        var contextPrototype = window.CanvasRenderingContext2D.prototype;
        var createImageData = contextPrototype.createImageData;
        contextPrototype.createImageData = function (w, h) {
          var imageData = createImageData.call(this, w, h);
          imageData.data.set = function (arr) {
            for (var i = 0, ii = this.length; i < ii; i++) {
              this[i] = arr[i];
            }
          };
          return imageData;
        };
        contextPrototype = null;
      }
    }
  })();
  (function checkRequestAnimationFrame() {
    function installFakeAnimationFrameFunctions() {
      window.requestAnimationFrame = function (callback) {
        return window.setTimeout(callback, 20);
      };
      window.cancelAnimationFrame = function (timeoutID) {
        window.clearTimeout(timeoutID);
      };
    }
    if (!hasDOM) {
      return;
    }
    if (isIOS) {
      installFakeAnimationFrameFunctions();
      return;
    }
    if ('requestAnimationFrame' in window) {
      return;
    }
    window.requestAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
    if (window.requestAnimationFrame) {
      return;
    }
    installFakeAnimationFrameFunctions();
  })();
  (function checkCanvasSizeLimitation() {
    if (isIOS || isAndroid) {
      PDFJS.maxCanvasPixels = 5242880;
    }
  })();
  (function checkFullscreenSupport() {
    if (!hasDOM) {
      return;
    }
    if (isIE && window.parent !== window) {
      PDFJS.disableFullscreen = true;
    }
  })();
  (function checkCurrentScript() {
    if (!hasDOM) {
      return;
    }
    if ('currentScript' in document) {
      return;
    }
    Object.defineProperty(document, 'currentScript', {
      get: function get() {
        var scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
      },

      enumerable: true,
      configurable: true
    });
  })();
  (function checkInputTypeNumberAssign() {
    if (!hasDOM) {
      return;
    }
    var el = document.createElement('input');
    try {
      el.type = 'number';
    } catch (ex) {
      var inputProto = el.constructor.prototype;
      var typeProperty = Object.getOwnPropertyDescriptor(inputProto, 'type');
      Object.defineProperty(inputProto, 'type', {
        get: function get() {
          return typeProperty.get.call(this);
        },
        set: function set(value) {
          typeProperty.set.call(this, value === 'number' ? 'text' : value);
        },

        enumerable: true,
        configurable: true
      });
    }
  })();
  (function checkDocumentReadyState() {
    if (!hasDOM) {
      return;
    }
    if (!document.attachEvent) {
      return;
    }
    var documentProto = document.constructor.prototype;
    var readyStateProto = Object.getOwnPropertyDescriptor(documentProto, 'readyState');
    Object.defineProperty(documentProto, 'readyState', {
      get: function get() {
        var value = readyStateProto.get.call(this);
        return value === 'interactive' ? 'loading' : value;
      },
      set: function set(value) {
        readyStateProto.set.call(this, value);
      },

      enumerable: true,
      configurable: true
    });
  })();
  (function checkChildNodeRemove() {
    if (!hasDOM) {
      return;
    }
    if (typeof Element.prototype.remove !== 'undefined') {
      return;
    }
    Element.prototype.remove = function () {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    };
  })();
  (function checkNumberIsNaN() {
    if (Number.isNaN) {
      return;
    }
    Number.isNaN = __w_pdfjs_require__(89);
  })();
  (function checkNumberIsInteger() {
    if (Number.isInteger) {
      return;
    }
    Number.isInteger = __w_pdfjs_require__(91);
  })();
  (function checkPromise() {
    if (globalScope.Promise) {
      return;
    }
    globalScope.Promise = __w_pdfjs_require__(94);
  })();
  (function checkWeakMap() {
    if (globalScope.WeakMap) {
      return;
    }
    globalScope.WeakMap = __w_pdfjs_require__(103);
  })();
  (function checkURLConstructor() {
    var hasWorkingUrl = false;
    try {
      if (typeof URL === 'function' && _typeof(URL.prototype) === 'object' && 'origin' in URL.prototype) {
        var u = new URL('b', 'http://a');
        u.pathname = 'c%20d';
        hasWorkingUrl = u.href === 'http://a/c%20d';
      }
    } catch (e) {}
    if (hasWorkingUrl) {
      return;
    }
    var relative = Object.create(null);
    relative['ftp'] = 21;
    relative['file'] = 0;
    relative['gopher'] = 70;
    relative['http'] = 80;
    relative['https'] = 443;
    relative['ws'] = 80;
    relative['wss'] = 443;
    var relativePathDotMapping = Object.create(null);
    relativePathDotMapping['%2e'] = '.';
    relativePathDotMapping['.%2e'] = '..';
    relativePathDotMapping['%2e.'] = '..';
    relativePathDotMapping['%2e%2e'] = '..';
    function isRelativeScheme(scheme) {
      return relative[scheme] !== undefined;
    }
    function invalid() {
      clear.call(this);
      this._isInvalid = true;
    }
    function IDNAToASCII(h) {
      if (h === '') {
        invalid.call(this);
      }
      return h.toLowerCase();
    }
    function percentEscape(c) {
      var unicode = c.charCodeAt(0);
      if (unicode > 0x20 && unicode < 0x7F && [0x22, 0x23, 0x3C, 0x3E, 0x3F, 0x60].indexOf(unicode) === -1) {
        return c;
      }
      return encodeURIComponent(c);
    }
    function percentEscapeQuery(c) {
      var unicode = c.charCodeAt(0);
      if (unicode > 0x20 && unicode < 0x7F && [0x22, 0x23, 0x3C, 0x3E, 0x60].indexOf(unicode) === -1) {
        return c;
      }
      return encodeURIComponent(c);
    }
    var EOF,
        ALPHA = /[a-zA-Z]/,
        ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;
    function parse(input, stateOverride, base) {
      function err(message) {
        errors.push(message);
      }
      var state = stateOverride || 'scheme start',
          cursor = 0,
          buffer = '',
          seenAt = false,
          seenBracket = false,
          errors = [];
      loop: while ((input[cursor - 1] !== EOF || cursor === 0) && !this._isInvalid) {
        var c = input[cursor];
        switch (state) {
          case 'scheme start':
            if (c && ALPHA.test(c)) {
              buffer += c.toLowerCase();
              state = 'scheme';
            } else if (!stateOverride) {
              buffer = '';
              state = 'no scheme';
              continue;
            } else {
              err('Invalid scheme.');
              break loop;
            }
            break;
          case 'scheme':
            if (c && ALPHANUMERIC.test(c)) {
              buffer += c.toLowerCase();
            } else if (c === ':') {
              this._scheme = buffer;
              buffer = '';
              if (stateOverride) {
                break loop;
              }
              if (isRelativeScheme(this._scheme)) {
                this._isRelative = true;
              }
              if (this._scheme === 'file') {
                state = 'relative';
              } else if (this._isRelative && base && base._scheme === this._scheme) {
                state = 'relative or authority';
              } else if (this._isRelative) {
                state = 'authority first slash';
              } else {
                state = 'scheme data';
              }
            } else if (!stateOverride) {
              buffer = '';
              cursor = 0;
              state = 'no scheme';
              continue;
            } else if (c === EOF) {
              break loop;
            } else {
              err('Code point not allowed in scheme: ' + c);
              break loop;
            }
            break;
          case 'scheme data':
            if (c === '?') {
              this._query = '?';
              state = 'query';
            } else if (c === '#') {
              this._fragment = '#';
              state = 'fragment';
            } else {
              if (c !== EOF && c !== '\t' && c !== '\n' && c !== '\r') {
                this._schemeData += percentEscape(c);
              }
            }
            break;
          case 'no scheme':
            if (!base || !isRelativeScheme(base._scheme)) {
              err('Missing scheme.');
              invalid.call(this);
            } else {
              state = 'relative';
              continue;
            }
            break;
          case 'relative or authority':
            if (c === '/' && input[cursor + 1] === '/') {
              state = 'authority ignore slashes';
            } else {
              err('Expected /, got: ' + c);
              state = 'relative';
              continue;
            }
            break;
          case 'relative':
            this._isRelative = true;
            if (this._scheme !== 'file') {
              this._scheme = base._scheme;
            }
            if (c === EOF) {
              this._host = base._host;
              this._port = base._port;
              this._path = base._path.slice();
              this._query = base._query;
              this._username = base._username;
              this._password = base._password;
              break loop;
            } else if (c === '/' || c === '\\') {
              if (c === '\\') {
                err('\\ is an invalid code point.');
              }
              state = 'relative slash';
            } else if (c === '?') {
              this._host = base._host;
              this._port = base._port;
              this._path = base._path.slice();
              this._query = '?';
              this._username = base._username;
              this._password = base._password;
              state = 'query';
            } else if (c === '#') {
              this._host = base._host;
              this._port = base._port;
              this._path = base._path.slice();
              this._query = base._query;
              this._fragment = '#';
              this._username = base._username;
              this._password = base._password;
              state = 'fragment';
            } else {
              var nextC = input[cursor + 1];
              var nextNextC = input[cursor + 2];
              if (this._scheme !== 'file' || !ALPHA.test(c) || nextC !== ':' && nextC !== '|' || nextNextC !== EOF && nextNextC !== '/' && nextNextC !== '\\' && nextNextC !== '?' && nextNextC !== '#') {
                this._host = base._host;
                this._port = base._port;
                this._username = base._username;
                this._password = base._password;
                this._path = base._path.slice();
                this._path.pop();
              }
              state = 'relative path';
              continue;
            }
            break;
          case 'relative slash':
            if (c === '/' || c === '\\') {
              if (c === '\\') {
                err('\\ is an invalid code point.');
              }
              if (this._scheme === 'file') {
                state = 'file host';
              } else {
                state = 'authority ignore slashes';
              }
            } else {
              if (this._scheme !== 'file') {
                this._host = base._host;
                this._port = base._port;
                this._username = base._username;
                this._password = base._password;
              }
              state = 'relative path';
              continue;
            }
            break;
          case 'authority first slash':
            if (c === '/') {
              state = 'authority second slash';
            } else {
              err('Expected \'/\', got: ' + c);
              state = 'authority ignore slashes';
              continue;
            }
            break;
          case 'authority second slash':
            state = 'authority ignore slashes';
            if (c !== '/') {
              err('Expected \'/\', got: ' + c);
              continue;
            }
            break;
          case 'authority ignore slashes':
            if (c !== '/' && c !== '\\') {
              state = 'authority';
              continue;
            } else {
              err('Expected authority, got: ' + c);
            }
            break;
          case 'authority':
            if (c === '@') {
              if (seenAt) {
                err('@ already seen.');
                buffer += '%40';
              }
              seenAt = true;
              for (var i = 0; i < buffer.length; i++) {
                var cp = buffer[i];
                if (cp === '\t' || cp === '\n' || cp === '\r') {
                  err('Invalid whitespace in authority.');
                  continue;
                }
                if (cp === ':' && this._password === null) {
                  this._password = '';
                  continue;
                }
                var tempC = percentEscape(cp);
                if (this._password !== null) {
                  this._password += tempC;
                } else {
                  this._username += tempC;
                }
              }
              buffer = '';
            } else if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#') {
              cursor -= buffer.length;
              buffer = '';
              state = 'host';
              continue;
            } else {
              buffer += c;
            }
            break;
          case 'file host':
            if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#') {
              if (buffer.length === 2 && ALPHA.test(buffer[0]) && (buffer[1] === ':' || buffer[1] === '|')) {
                state = 'relative path';
              } else if (buffer.length === 0) {
                state = 'relative path start';
              } else {
                this._host = IDNAToASCII.call(this, buffer);
                buffer = '';
                state = 'relative path start';
              }
              continue;
            } else if (c === '\t' || c === '\n' || c === '\r') {
              err('Invalid whitespace in file host.');
            } else {
              buffer += c;
            }
            break;
          case 'host':
          case 'hostname':
            if (c === ':' && !seenBracket) {
              this._host = IDNAToASCII.call(this, buffer);
              buffer = '';
              state = 'port';
              if (stateOverride === 'hostname') {
                break loop;
              }
            } else if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#') {
              this._host = IDNAToASCII.call(this, buffer);
              buffer = '';
              state = 'relative path start';
              if (stateOverride) {
                break loop;
              }
              continue;
            } else if (c !== '\t' && c !== '\n' && c !== '\r') {
              if (c === '[') {
                seenBracket = true;
              } else if (c === ']') {
                seenBracket = false;
              }
              buffer += c;
            } else {
              err('Invalid code point in host/hostname: ' + c);
            }
            break;
          case 'port':
            if (/[0-9]/.test(c)) {
              buffer += c;
            } else if (c === EOF || c === '/' || c === '\\' || c === '?' || c === '#' || stateOverride) {
              if (buffer !== '') {
                var temp = parseInt(buffer, 10);
                if (temp !== relative[this._scheme]) {
                  this._port = temp + '';
                }
                buffer = '';
              }
              if (stateOverride) {
                break loop;
              }
              state = 'relative path start';
              continue;
            } else if (c === '\t' || c === '\n' || c === '\r') {
              err('Invalid code point in port: ' + c);
            } else {
              invalid.call(this);
            }
            break;
          case 'relative path start':
            if (c === '\\') {
              err('\'\\\' not allowed in path.');
            }
            state = 'relative path';
            if (c !== '/' && c !== '\\') {
              continue;
            }
            break;
          case 'relative path':
            if (c === EOF || c === '/' || c === '\\' || !stateOverride && (c === '?' || c === '#')) {
              if (c === '\\') {
                err('\\ not allowed in relative path.');
              }
              var tmp;
              if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
                buffer = tmp;
              }
              if (buffer === '..') {
                this._path.pop();
                if (c !== '/' && c !== '\\') {
                  this._path.push('');
                }
              } else if (buffer === '.' && c !== '/' && c !== '\\') {
                this._path.push('');
              } else if (buffer !== '.') {
                if (this._scheme === 'file' && this._path.length === 0 && buffer.length === 2 && ALPHA.test(buffer[0]) && buffer[1] === '|') {
                  buffer = buffer[0] + ':';
                }
                this._path.push(buffer);
              }
              buffer = '';
              if (c === '?') {
                this._query = '?';
                state = 'query';
              } else if (c === '#') {
                this._fragment = '#';
                state = 'fragment';
              }
            } else if (c !== '\t' && c !== '\n' && c !== '\r') {
              buffer += percentEscape(c);
            }
            break;
          case 'query':
            if (!stateOverride && c === '#') {
              this._fragment = '#';
              state = 'fragment';
            } else if (c !== EOF && c !== '\t' && c !== '\n' && c !== '\r') {
              this._query += percentEscapeQuery(c);
            }
            break;
          case 'fragment':
            if (c !== EOF && c !== '\t' && c !== '\n' && c !== '\r') {
              this._fragment += c;
            }
            break;
        }
        cursor++;
      }
    }
    function clear() {
      this._scheme = '';
      this._schemeData = '';
      this._username = '';
      this._password = null;
      this._host = '';
      this._port = '';
      this._path = [];
      this._query = '';
      this._fragment = '';
      this._isInvalid = false;
      this._isRelative = false;
    }
    function JURL(url, base) {
      if (base !== undefined && !(base instanceof JURL)) {
        base = new JURL(String(base));
      }
      this._url = url;
      clear.call(this);
      var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
      parse.call(this, input, null, base);
    }
    JURL.prototype = {
      toString: function toString() {
        return this.href;
      },

      get href() {
        if (this._isInvalid) {
          return this._url;
        }
        var authority = '';
        if (this._username !== '' || this._password !== null) {
          authority = this._username + (this._password !== null ? ':' + this._password : '') + '@';
        }
        return this.protocol + (this._isRelative ? '//' + authority + this.host : '') + this.pathname + this._query + this._fragment;
      },
      set href(value) {
        clear.call(this);
        parse.call(this, value);
      },
      get protocol() {
        return this._scheme + ':';
      },
      set protocol(value) {
        if (this._isInvalid) {
          return;
        }
        parse.call(this, value + ':', 'scheme start');
      },
      get host() {
        return this._isInvalid ? '' : this._port ? this._host + ':' + this._port : this._host;
      },
      set host(value) {
        if (this._isInvalid || !this._isRelative) {
          return;
        }
        parse.call(this, value, 'host');
      },
      get hostname() {
        return this._host;
      },
      set hostname(value) {
        if (this._isInvalid || !this._isRelative) {
          return;
        }
        parse.call(this, value, 'hostname');
      },
      get port() {
        return this._port;
      },
      set port(value) {
        if (this._isInvalid || !this._isRelative) {
          return;
        }
        parse.call(this, value, 'port');
      },
      get pathname() {
        return this._isInvalid ? '' : this._isRelative ? '/' + this._path.join('/') : this._schemeData;
      },
      set pathname(value) {
        if (this._isInvalid || !this._isRelative) {
          return;
        }
        this._path = [];
        parse.call(this, value, 'relative path start');
      },
      get search() {
        return this._isInvalid || !this._query || this._query === '?' ? '' : this._query;
      },
      set search(value) {
        if (this._isInvalid || !this._isRelative) {
          return;
        }
        this._query = '?';
        if (value[0] === '?') {
          value = value.slice(1);
        }
        parse.call(this, value, 'query');
      },
      get hash() {
        return this._isInvalid || !this._fragment || this._fragment === '#' ? '' : this._fragment;
      },
      set hash(value) {
        if (this._isInvalid) {
          return;
        }
        this._fragment = '#';
        if (value[0] === '#') {
          value = value.slice(1);
        }
        parse.call(this, value, 'fragment');
      },
      get origin() {
        var host;
        if (this._isInvalid || !this._scheme) {
          return '';
        }
        switch (this._scheme) {
          case 'data':
          case 'file':
          case 'javascript':
          case 'mailto':
            return 'null';
          case 'blob':
            try {
              return new JURL(this._schemeData).origin || 'null';
            } catch (_) {}
            return 'null';
        }
        host = this.host;
        if (!host) {
          return '';
        }
        return this._scheme + '://' + host;
      }
    };
    var OriginalURL = globalScope.URL;
    if (OriginalURL) {
      JURL.createObjectURL = function (blob) {
        return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
      };
      JURL.revokeObjectURL = function (url) {
        OriginalURL.revokeObjectURL(url);
      };
    }
    globalScope.URL = JURL;
  })();
}

/***/ }),
/* 77 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(78);
module.exports = __w_pdfjs_require__(5).Uint8ClampedArray;

/***/ }),
/* 78 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(79)('Uint8', 1, function (init) {
  return function Uint8ClampedArray(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
}, true);

/***/ }),
/* 79 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

if (__w_pdfjs_require__(9)) {
  var LIBRARY = __w_pdfjs_require__(26);
  var global = __w_pdfjs_require__(1);
  var fails = __w_pdfjs_require__(10);
  var $export = __w_pdfjs_require__(4);
  var $typed = __w_pdfjs_require__(46);
  var $buffer = __w_pdfjs_require__(80);
  var ctx = __w_pdfjs_require__(11);
  var anInstance = __w_pdfjs_require__(23);
  var propertyDesc = __w_pdfjs_require__(27);
  var hide = __w_pdfjs_require__(6);
  var redefineAll = __w_pdfjs_require__(22);
  var toInteger = __w_pdfjs_require__(17);
  var toLength = __w_pdfjs_require__(12);
  var toIndex = __w_pdfjs_require__(47);
  var toAbsoluteIndex = __w_pdfjs_require__(29);
  var toPrimitive = __w_pdfjs_require__(33);
  var has = __w_pdfjs_require__(8);
  var classof = __w_pdfjs_require__(30);
  var isObject = __w_pdfjs_require__(2);
  var toObject = __w_pdfjs_require__(18);
  var isArrayIter = __w_pdfjs_require__(53);
  var create = __w_pdfjs_require__(54);
  var getPrototypeOf = __w_pdfjs_require__(56);
  var gOPN = __w_pdfjs_require__(48).f;
  var getIterFn = __w_pdfjs_require__(57);
  var uid = __w_pdfjs_require__(16);
  var wks = __w_pdfjs_require__(3);
  var createArrayMethod = __w_pdfjs_require__(39);
  var createArrayIncludes = __w_pdfjs_require__(50);
  var speciesConstructor = __w_pdfjs_require__(40);
  var ArrayIterators = __w_pdfjs_require__(58);
  var Iterators = __w_pdfjs_require__(19);
  var $iterDetect = __w_pdfjs_require__(41);
  var setSpecies = __w_pdfjs_require__(60);
  var arrayFill = __w_pdfjs_require__(52);
  var arrayCopyWithin = __w_pdfjs_require__(88);
  var $DP = __w_pdfjs_require__(14);
  var $GOPD = __w_pdfjs_require__(61);
  var dP = $DP.f;
  var gOPD = $GOPD.f;
  var RangeError = global.RangeError;
  var TypeError = global.TypeError;
  var Uint8Array = global.Uint8Array;
  var ARRAY_BUFFER = 'ArrayBuffer';
  var SHARED_BUFFER = 'Shared' + ARRAY_BUFFER;
  var BYTES_PER_ELEMENT = 'BYTES_PER_ELEMENT';
  var PROTOTYPE = 'prototype';
  var ArrayProto = Array[PROTOTYPE];
  var $ArrayBuffer = $buffer.ArrayBuffer;
  var $DataView = $buffer.DataView;
  var arrayForEach = createArrayMethod(0);
  var arrayFilter = createArrayMethod(2);
  var arraySome = createArrayMethod(3);
  var arrayEvery = createArrayMethod(4);
  var arrayFind = createArrayMethod(5);
  var arrayFindIndex = createArrayMethod(6);
  var arrayIncludes = createArrayIncludes(true);
  var arrayIndexOf = createArrayIncludes(false);
  var arrayValues = ArrayIterators.values;
  var arrayKeys = ArrayIterators.keys;
  var arrayEntries = ArrayIterators.entries;
  var arrayLastIndexOf = ArrayProto.lastIndexOf;
  var arrayReduce = ArrayProto.reduce;
  var arrayReduceRight = ArrayProto.reduceRight;
  var arrayJoin = ArrayProto.join;
  var arraySort = ArrayProto.sort;
  var arraySlice = ArrayProto.slice;
  var arrayToString = ArrayProto.toString;
  var arrayToLocaleString = ArrayProto.toLocaleString;
  var ITERATOR = wks('iterator');
  var TAG = wks('toStringTag');
  var TYPED_CONSTRUCTOR = uid('typed_constructor');
  var DEF_CONSTRUCTOR = uid('def_constructor');
  var ALL_CONSTRUCTORS = $typed.CONSTR;
  var TYPED_ARRAY = $typed.TYPED;
  var VIEW = $typed.VIEW;
  var WRONG_LENGTH = 'Wrong length!';
  var $map = createArrayMethod(1, function (O, length) {
    return allocate(speciesConstructor(O, O[DEF_CONSTRUCTOR]), length);
  });
  var LITTLE_ENDIAN = fails(function () {
    return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  });
  var FORCED_SET = !!Uint8Array && !!Uint8Array[PROTOTYPE].set && fails(function () {
    new Uint8Array(1).set({});
  });
  var toOffset = function toOffset(it, BYTES) {
    var offset = toInteger(it);
    if (offset < 0 || offset % BYTES) throw RangeError('Wrong offset!');
    return offset;
  };
  var validate = function validate(it) {
    if (isObject(it) && TYPED_ARRAY in it) return it;
    throw TypeError(it + ' is not a typed array!');
  };
  var allocate = function allocate(C, length) {
    if (!(isObject(C) && TYPED_CONSTRUCTOR in C)) {
      throw TypeError('It is not a typed array constructor!');
    }
    return new C(length);
  };
  var speciesFromList = function speciesFromList(O, list) {
    return fromList(speciesConstructor(O, O[DEF_CONSTRUCTOR]), list);
  };
  var fromList = function fromList(C, list) {
    var index = 0;
    var length = list.length;
    var result = allocate(C, length);
    while (length > index) {
      result[index] = list[index++];
    }return result;
  };
  var addGetter = function addGetter(it, key, internal) {
    dP(it, key, {
      get: function get() {
        return this._d[internal];
      }
    });
  };
  var $from = function from(source) {
    var O = toObject(source);
    var aLen = arguments.length;
    var mapfn = aLen > 1 ? arguments[1] : undefined;
    var mapping = mapfn !== undefined;
    var iterFn = getIterFn(O);
    var i, length, values, result, step, iterator;
    if (iterFn != undefined && !isArrayIter(iterFn)) {
      for (iterator = iterFn.call(O), values = [], i = 0; !(step = iterator.next()).done; i++) {
        values.push(step.value);
      }
      O = values;
    }
    if (mapping && aLen > 2) mapfn = ctx(mapfn, arguments[2], 2);
    for (i = 0, length = toLength(O.length), result = allocate(this, length); length > i; i++) {
      result[i] = mapping ? mapfn(O[i], i) : O[i];
    }
    return result;
  };
  var $of = function of() {
    var index = 0;
    var length = arguments.length;
    var result = allocate(this, length);
    while (length > index) {
      result[index] = arguments[index++];
    }return result;
  };
  var TO_LOCALE_BUG = !!Uint8Array && fails(function () {
    arrayToLocaleString.call(new Uint8Array(1));
  });
  var $toLocaleString = function toLocaleString() {
    return arrayToLocaleString.apply(TO_LOCALE_BUG ? arraySlice.call(validate(this)) : validate(this), arguments);
  };
  var proto = {
    copyWithin: function copyWithin(target, start) {
      return arrayCopyWithin.call(validate(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
    },
    every: function every(callbackfn) {
      return arrayEvery(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    fill: function fill(value) {
      return arrayFill.apply(validate(this), arguments);
    },
    filter: function filter(callbackfn) {
      return speciesFromList(this, arrayFilter(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined));
    },
    find: function find(predicate) {
      return arrayFind(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
    },
    findIndex: function findIndex(predicate) {
      return arrayFindIndex(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
    },
    forEach: function forEach(callbackfn) {
      arrayForEach(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    indexOf: function indexOf(searchElement) {
      return arrayIndexOf(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
    },
    includes: function includes(searchElement) {
      return arrayIncludes(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
    },
    join: function join(separator) {
      return arrayJoin.apply(validate(this), arguments);
    },
    lastIndexOf: function lastIndexOf(searchElement) {
      return arrayLastIndexOf.apply(validate(this), arguments);
    },
    map: function map(mapfn) {
      return $map(validate(this), mapfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    reduce: function reduce(callbackfn) {
      return arrayReduce.apply(validate(this), arguments);
    },
    reduceRight: function reduceRight(callbackfn) {
      return arrayReduceRight.apply(validate(this), arguments);
    },
    reverse: function reverse() {
      var that = this;
      var length = validate(that).length;
      var middle = Math.floor(length / 2);
      var index = 0;
      var value;
      while (index < middle) {
        value = that[index];
        that[index++] = that[--length];
        that[length] = value;
      }
      return that;
    },
    some: function some(callbackfn) {
      return arraySome(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    sort: function sort(comparefn) {
      return arraySort.call(validate(this), comparefn);
    },
    subarray: function subarray(begin, end) {
      var O = validate(this);
      var length = O.length;
      var $begin = toAbsoluteIndex(begin, length);
      return new (speciesConstructor(O, O[DEF_CONSTRUCTOR]))(O.buffer, O.byteOffset + $begin * O.BYTES_PER_ELEMENT, toLength((end === undefined ? length : toAbsoluteIndex(end, length)) - $begin));
    }
  };
  var $slice = function slice(start, end) {
    return speciesFromList(this, arraySlice.call(validate(this), start, end));
  };
  var $set = function set(arrayLike) {
    validate(this);
    var offset = toOffset(arguments[1], 1);
    var length = this.length;
    var src = toObject(arrayLike);
    var len = toLength(src.length);
    var index = 0;
    if (len + offset > length) throw RangeError(WRONG_LENGTH);
    while (index < len) {
      this[offset + index] = src[index++];
    }
  };
  var $iterators = {
    entries: function entries() {
      return arrayEntries.call(validate(this));
    },
    keys: function keys() {
      return arrayKeys.call(validate(this));
    },
    values: function values() {
      return arrayValues.call(validate(this));
    }
  };
  var isTAIndex = function isTAIndex(target, key) {
    return isObject(target) && target[TYPED_ARRAY] && (typeof key === 'undefined' ? 'undefined' : _typeof(key)) != 'symbol' && key in target && String(+key) == String(key);
  };
  var $getDesc = function getOwnPropertyDescriptor(target, key) {
    return isTAIndex(target, key = toPrimitive(key, true)) ? propertyDesc(2, target[key]) : gOPD(target, key);
  };
  var $setDesc = function defineProperty(target, key, desc) {
    if (isTAIndex(target, key = toPrimitive(key, true)) && isObject(desc) && has(desc, 'value') && !has(desc, 'get') && !has(desc, 'set') && !desc.configurable && (!has(desc, 'writable') || desc.writable) && (!has(desc, 'enumerable') || desc.enumerable)) {
      target[key] = desc.value;
      return target;
    }
    return dP(target, key, desc);
  };
  if (!ALL_CONSTRUCTORS) {
    $GOPD.f = $getDesc;
    $DP.f = $setDesc;
  }
  $export($export.S + $export.F * !ALL_CONSTRUCTORS, 'Object', {
    getOwnPropertyDescriptor: $getDesc,
    defineProperty: $setDesc
  });
  if (fails(function () {
    arrayToString.call({});
  })) {
    arrayToString = arrayToLocaleString = function toString() {
      return arrayJoin.call(this);
    };
  }
  var $TypedArrayPrototype$ = redefineAll({}, proto);
  redefineAll($TypedArrayPrototype$, $iterators);
  hide($TypedArrayPrototype$, ITERATOR, $iterators.values);
  redefineAll($TypedArrayPrototype$, {
    slice: $slice,
    set: $set,
    constructor: function constructor() {},
    toString: arrayToString,
    toLocaleString: $toLocaleString
  });
  addGetter($TypedArrayPrototype$, 'buffer', 'b');
  addGetter($TypedArrayPrototype$, 'byteOffset', 'o');
  addGetter($TypedArrayPrototype$, 'byteLength', 'l');
  addGetter($TypedArrayPrototype$, 'length', 'e');
  dP($TypedArrayPrototype$, TAG, {
    get: function get() {
      return this[TYPED_ARRAY];
    }
  });
  module.exports = function (KEY, BYTES, wrapper, CLAMPED) {
    CLAMPED = !!CLAMPED;
    var NAME = KEY + (CLAMPED ? 'Clamped' : '') + 'Array';
    var GETTER = 'get' + KEY;
    var SETTER = 'set' + KEY;
    var TypedArray = global[NAME];
    var Base = TypedArray || {};
    var TAC = TypedArray && getPrototypeOf(TypedArray);
    var FORCED = !TypedArray || !$typed.ABV;
    var O = {};
    var TypedArrayPrototype = TypedArray && TypedArray[PROTOTYPE];
    var getter = function getter(that, index) {
      var data = that._d;
      return data.v[GETTER](index * BYTES + data.o, LITTLE_ENDIAN);
    };
    var setter = function setter(that, index, value) {
      var data = that._d;
      if (CLAMPED) value = (value = Math.round(value)) < 0 ? 0 : value > 0xff ? 0xff : value & 0xff;
      data.v[SETTER](index * BYTES + data.o, value, LITTLE_ENDIAN);
    };
    var addElement = function addElement(that, index) {
      dP(that, index, {
        get: function get() {
          return getter(this, index);
        },
        set: function set(value) {
          return setter(this, index, value);
        },
        enumerable: true
      });
    };
    if (FORCED) {
      TypedArray = wrapper(function (that, data, $offset, $length) {
        anInstance(that, TypedArray, NAME, '_d');
        var index = 0;
        var offset = 0;
        var buffer, byteLength, length, klass;
        if (!isObject(data)) {
          length = toIndex(data);
          byteLength = length * BYTES;
          buffer = new $ArrayBuffer(byteLength);
        } else if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
          buffer = data;
          offset = toOffset($offset, BYTES);
          var $len = data.byteLength;
          if ($length === undefined) {
            if ($len % BYTES) throw RangeError(WRONG_LENGTH);
            byteLength = $len - offset;
            if (byteLength < 0) throw RangeError(WRONG_LENGTH);
          } else {
            byteLength = toLength($length) * BYTES;
            if (byteLength + offset > $len) throw RangeError(WRONG_LENGTH);
          }
          length = byteLength / BYTES;
        } else if (TYPED_ARRAY in data) {
          return fromList(TypedArray, data);
        } else {
          return $from.call(TypedArray, data);
        }
        hide(that, '_d', {
          b: buffer,
          o: offset,
          l: byteLength,
          e: length,
          v: new $DataView(buffer)
        });
        while (index < length) {
          addElement(that, index++);
        }
      });
      TypedArrayPrototype = TypedArray[PROTOTYPE] = create($TypedArrayPrototype$);
      hide(TypedArrayPrototype, 'constructor', TypedArray);
    } else if (!fails(function () {
      TypedArray(1);
    }) || !fails(function () {
      new TypedArray(-1);
    }) || !$iterDetect(function (iter) {
      new TypedArray();
      new TypedArray(null);
      new TypedArray(1.5);
      new TypedArray(iter);
    }, true)) {
      TypedArray = wrapper(function (that, data, $offset, $length) {
        anInstance(that, TypedArray, NAME);
        var klass;
        if (!isObject(data)) return new Base(toIndex(data));
        if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
          return $length !== undefined ? new Base(data, toOffset($offset, BYTES), $length) : $offset !== undefined ? new Base(data, toOffset($offset, BYTES)) : new Base(data);
        }
        if (TYPED_ARRAY in data) return fromList(TypedArray, data);
        return $from.call(TypedArray, data);
      });
      arrayForEach(TAC !== Function.prototype ? gOPN(Base).concat(gOPN(TAC)) : gOPN(Base), function (key) {
        if (!(key in TypedArray)) hide(TypedArray, key, Base[key]);
      });
      TypedArray[PROTOTYPE] = TypedArrayPrototype;
      if (!LIBRARY) TypedArrayPrototype.constructor = TypedArray;
    }
    var $nativeIterator = TypedArrayPrototype[ITERATOR];
    var CORRECT_ITER_NAME = !!$nativeIterator && ($nativeIterator.name == 'values' || $nativeIterator.name == undefined);
    var $iterator = $iterators.values;
    hide(TypedArray, TYPED_CONSTRUCTOR, true);
    hide(TypedArrayPrototype, TYPED_ARRAY, NAME);
    hide(TypedArrayPrototype, VIEW, true);
    hide(TypedArrayPrototype, DEF_CONSTRUCTOR, TypedArray);
    if (CLAMPED ? new TypedArray(1)[TAG] != NAME : !(TAG in TypedArrayPrototype)) {
      dP(TypedArrayPrototype, TAG, {
        get: function get() {
          return NAME;
        }
      });
    }
    O[NAME] = TypedArray;
    $export($export.G + $export.W + $export.F * (TypedArray != Base), O);
    $export($export.S, NAME, { BYTES_PER_ELEMENT: BYTES });
    $export($export.S + $export.F * fails(function () {
      Base.of.call(TypedArray, 1);
    }), NAME, {
      from: $from,
      of: $of
    });
    if (!(BYTES_PER_ELEMENT in TypedArrayPrototype)) hide(TypedArrayPrototype, BYTES_PER_ELEMENT, BYTES);
    $export($export.P, NAME, proto);
    setSpecies(NAME);
    $export($export.P + $export.F * FORCED_SET, NAME, { set: $set });
    $export($export.P + $export.F * !CORRECT_ITER_NAME, NAME, $iterators);
    if (!LIBRARY && TypedArrayPrototype.toString != arrayToString) TypedArrayPrototype.toString = arrayToString;
    $export($export.P + $export.F * fails(function () {
      new TypedArray(1).slice();
    }), NAME, { slice: $slice });
    $export($export.P + $export.F * (fails(function () {
      return [1, 2].toLocaleString() != new TypedArray([1, 2]).toLocaleString();
    }) || !fails(function () {
      TypedArrayPrototype.toLocaleString.call([1, 2]);
    })), NAME, { toLocaleString: $toLocaleString });
    Iterators[NAME] = CORRECT_ITER_NAME ? $nativeIterator : $iterator;
    if (!LIBRARY && !CORRECT_ITER_NAME) hide(TypedArrayPrototype, ITERATOR, $iterator);
  };
} else module.exports = function () {};

/***/ }),
/* 80 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var DESCRIPTORS = __w_pdfjs_require__(9);
var LIBRARY = __w_pdfjs_require__(26);
var $typed = __w_pdfjs_require__(46);
var hide = __w_pdfjs_require__(6);
var redefineAll = __w_pdfjs_require__(22);
var fails = __w_pdfjs_require__(10);
var anInstance = __w_pdfjs_require__(23);
var toInteger = __w_pdfjs_require__(17);
var toLength = __w_pdfjs_require__(12);
var toIndex = __w_pdfjs_require__(47);
var gOPN = __w_pdfjs_require__(48).f;
var dP = __w_pdfjs_require__(14).f;
var arrayFill = __w_pdfjs_require__(52);
var setToStringTag = __w_pdfjs_require__(25);
var ARRAY_BUFFER = 'ArrayBuffer';
var DATA_VIEW = 'DataView';
var PROTOTYPE = 'prototype';
var WRONG_LENGTH = 'Wrong length!';
var WRONG_INDEX = 'Wrong index!';
var $ArrayBuffer = global[ARRAY_BUFFER];
var $DataView = global[DATA_VIEW];
var Math = global.Math;
var RangeError = global.RangeError;
var Infinity = global.Infinity;
var BaseBuffer = $ArrayBuffer;
var abs = Math.abs;
var pow = Math.pow;
var floor = Math.floor;
var log = Math.log;
var LN2 = Math.LN2;
var BUFFER = 'buffer';
var BYTE_LENGTH = 'byteLength';
var BYTE_OFFSET = 'byteOffset';
var $BUFFER = DESCRIPTORS ? '_b' : BUFFER;
var $LENGTH = DESCRIPTORS ? '_l' : BYTE_LENGTH;
var $OFFSET = DESCRIPTORS ? '_o' : BYTE_OFFSET;
function packIEEE754(value, mLen, nBytes) {
  var buffer = Array(nBytes);
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? pow(2, -24) - pow(2, -77) : 0;
  var i = 0;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  var e, m, c;
  value = abs(value);
  if (value != value || value === Infinity) {
    m = value != value ? 1 : 0;
    e = eMax;
  } else {
    e = floor(log(value) / LN2);
    if (value * (c = pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }
    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * pow(2, eBias - 1) * pow(2, mLen);
      e = 0;
    }
  }
  for (; mLen >= 8; buffer[i++] = m & 255, m /= 256, mLen -= 8) {}
  e = e << mLen | m;
  eLen += mLen;
  for (; eLen > 0; buffer[i++] = e & 255, e /= 256, eLen -= 8) {}
  buffer[--i] |= s * 128;
  return buffer;
}
function unpackIEEE754(buffer, mLen, nBytes) {
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = eLen - 7;
  var i = nBytes - 1;
  var s = buffer[i--];
  var e = s & 127;
  var m;
  s >>= 7;
  for (; nBits > 0; e = e * 256 + buffer[i], i--, nBits -= 8) {}
  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[i], i--, nBits -= 8) {}
  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : s ? -Infinity : Infinity;
  } else {
    m = m + pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * pow(2, e - mLen);
}
function unpackI32(bytes) {
  return bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0];
}
function packI8(it) {
  return [it & 0xff];
}
function packI16(it) {
  return [it & 0xff, it >> 8 & 0xff];
}
function packI32(it) {
  return [it & 0xff, it >> 8 & 0xff, it >> 16 & 0xff, it >> 24 & 0xff];
}
function packF64(it) {
  return packIEEE754(it, 52, 8);
}
function packF32(it) {
  return packIEEE754(it, 23, 4);
}
function addGetter(C, key, internal) {
  dP(C[PROTOTYPE], key, {
    get: function get() {
      return this[internal];
    }
  });
}
function get(view, bytes, index, isLittleEndian) {
  var numIndex = +index;
  var intIndex = toIndex(numIndex);
  if (intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
  var store = view[$BUFFER]._b;
  var start = intIndex + view[$OFFSET];
  var pack = store.slice(start, start + bytes);
  return isLittleEndian ? pack : pack.reverse();
}
function set(view, bytes, index, conversion, value, isLittleEndian) {
  var numIndex = +index;
  var intIndex = toIndex(numIndex);
  if (intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
  var store = view[$BUFFER]._b;
  var start = intIndex + view[$OFFSET];
  var pack = conversion(+value);
  for (var i = 0; i < bytes; i++) {
    store[start + i] = pack[isLittleEndian ? i : bytes - i - 1];
  }
}
if (!$typed.ABV) {
  $ArrayBuffer = function ArrayBuffer(length) {
    anInstance(this, $ArrayBuffer, ARRAY_BUFFER);
    var byteLength = toIndex(length);
    this._b = arrayFill.call(Array(byteLength), 0);
    this[$LENGTH] = byteLength;
  };
  $DataView = function DataView(buffer, byteOffset, byteLength) {
    anInstance(this, $DataView, DATA_VIEW);
    anInstance(buffer, $ArrayBuffer, DATA_VIEW);
    var bufferLength = buffer[$LENGTH];
    var offset = toInteger(byteOffset);
    if (offset < 0 || offset > bufferLength) throw RangeError('Wrong offset!');
    byteLength = byteLength === undefined ? bufferLength - offset : toLength(byteLength);
    if (offset + byteLength > bufferLength) throw RangeError(WRONG_LENGTH);
    this[$BUFFER] = buffer;
    this[$OFFSET] = offset;
    this[$LENGTH] = byteLength;
  };
  if (DESCRIPTORS) {
    addGetter($ArrayBuffer, BYTE_LENGTH, '_l');
    addGetter($DataView, BUFFER, '_b');
    addGetter($DataView, BYTE_LENGTH, '_l');
    addGetter($DataView, BYTE_OFFSET, '_o');
  }
  redefineAll($DataView[PROTOTYPE], {
    getInt8: function getInt8(byteOffset) {
      return get(this, 1, byteOffset)[0] << 24 >> 24;
    },
    getUint8: function getUint8(byteOffset) {
      return get(this, 1, byteOffset)[0];
    },
    getInt16: function getInt16(byteOffset) {
      var bytes = get(this, 2, byteOffset, arguments[1]);
      return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
    },
    getUint16: function getUint16(byteOffset) {
      var bytes = get(this, 2, byteOffset, arguments[1]);
      return bytes[1] << 8 | bytes[0];
    },
    getInt32: function getInt32(byteOffset) {
      return unpackI32(get(this, 4, byteOffset, arguments[1]));
    },
    getUint32: function getUint32(byteOffset) {
      return unpackI32(get(this, 4, byteOffset, arguments[1])) >>> 0;
    },
    getFloat32: function getFloat32(byteOffset) {
      return unpackIEEE754(get(this, 4, byteOffset, arguments[1]), 23, 4);
    },
    getFloat64: function getFloat64(byteOffset) {
      return unpackIEEE754(get(this, 8, byteOffset, arguments[1]), 52, 8);
    },
    setInt8: function setInt8(byteOffset, value) {
      set(this, 1, byteOffset, packI8, value);
    },
    setUint8: function setUint8(byteOffset, value) {
      set(this, 1, byteOffset, packI8, value);
    },
    setInt16: function setInt16(byteOffset, value) {
      set(this, 2, byteOffset, packI16, value, arguments[2]);
    },
    setUint16: function setUint16(byteOffset, value) {
      set(this, 2, byteOffset, packI16, value, arguments[2]);
    },
    setInt32: function setInt32(byteOffset, value) {
      set(this, 4, byteOffset, packI32, value, arguments[2]);
    },
    setUint32: function setUint32(byteOffset, value) {
      set(this, 4, byteOffset, packI32, value, arguments[2]);
    },
    setFloat32: function setFloat32(byteOffset, value) {
      set(this, 4, byteOffset, packF32, value, arguments[2]);
    },
    setFloat64: function setFloat64(byteOffset, value) {
      set(this, 8, byteOffset, packF64, value, arguments[2]);
    }
  });
} else {
  if (!fails(function () {
    $ArrayBuffer(1);
  }) || !fails(function () {
    new $ArrayBuffer(-1);
  }) || fails(function () {
    new $ArrayBuffer();
    new $ArrayBuffer(1.5);
    new $ArrayBuffer(NaN);
    return $ArrayBuffer.name != ARRAY_BUFFER;
  })) {
    $ArrayBuffer = function ArrayBuffer(length) {
      anInstance(this, $ArrayBuffer);
      return new BaseBuffer(toIndex(length));
    };
    var ArrayBufferProto = $ArrayBuffer[PROTOTYPE] = BaseBuffer[PROTOTYPE];
    for (var keys = gOPN(BaseBuffer), j = 0, key; keys.length > j;) {
      if (!((key = keys[j++]) in $ArrayBuffer)) hide($ArrayBuffer, key, BaseBuffer[key]);
    }
    if (!LIBRARY) ArrayBufferProto.constructor = $ArrayBuffer;
  }
  var view = new $DataView(new $ArrayBuffer(2));
  var $setInt8 = $DataView[PROTOTYPE].setInt8;
  view.setInt8(0, 2147483648);
  view.setInt8(1, 2147483649);
  if (view.getInt8(0) || !view.getInt8(1)) redefineAll($DataView[PROTOTYPE], {
    setInt8: function setInt8(byteOffset, value) {
      $setInt8.call(this, byteOffset, value << 24 >> 24);
    },
    setUint8: function setUint8(byteOffset, value) {
      $setInt8.call(this, byteOffset, value << 24 >> 24);
    }
  }, true);
}
setToStringTag($ArrayBuffer, ARRAY_BUFFER);
setToStringTag($DataView, DATA_VIEW);
hide($DataView[PROTOTYPE], $typed.VIEW, true);
exports[ARRAY_BUFFER] = $ArrayBuffer;
exports[DATA_VIEW] = $DataView;

/***/ }),
/* 81 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var dP = __w_pdfjs_require__(14);
var anObject = __w_pdfjs_require__(7);
var getKeys = __w_pdfjs_require__(38);
module.exports = __w_pdfjs_require__(9) ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) {
    dP.f(O, P = keys[i++], Properties[P]);
  }return O;
};

/***/ }),
/* 82 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var speciesConstructor = __w_pdfjs_require__(83);
module.exports = function (original, length) {
  return new (speciesConstructor(original))(length);
};

/***/ }),
/* 83 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
var isArray = __w_pdfjs_require__(84);
var SPECIES = __w_pdfjs_require__(3)('species');
module.exports = function (original) {
  var C;
  if (isArray(original)) {
    C = original.constructor;
    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
    if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  }
  return C === undefined ? Array : C;
};

/***/ }),
/* 84 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var cof = __w_pdfjs_require__(24);
module.exports = Array.isArray || function isArray(arg) {
  return cof(arg) == 'Array';
};

/***/ }),
/* 85 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var UNSCOPABLES = __w_pdfjs_require__(3)('unscopables');
var ArrayProto = Array.prototype;
if (ArrayProto[UNSCOPABLES] == undefined) __w_pdfjs_require__(6)(ArrayProto, UNSCOPABLES, {});
module.exports = function (key) {
  ArrayProto[UNSCOPABLES][key] = true;
};

/***/ }),
/* 86 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (done, value) {
  return {
    value: value,
    done: !!done
  };
};

/***/ }),
/* 87 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var create = __w_pdfjs_require__(54);
var descriptor = __w_pdfjs_require__(27);
var setToStringTag = __w_pdfjs_require__(25);
var IteratorPrototype = {};
__w_pdfjs_require__(6)(IteratorPrototype, __w_pdfjs_require__(3)('iterator'), function () {
  return this;
});
module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};

/***/ }),
/* 88 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toObject = __w_pdfjs_require__(18);
var toAbsoluteIndex = __w_pdfjs_require__(29);
var toLength = __w_pdfjs_require__(12);
module.exports = [].copyWithin || function copyWithin(target, start) {
  var O = toObject(this);
  var len = toLength(O.length);
  var to = toAbsoluteIndex(target, len);
  var from = toAbsoluteIndex(start, len);
  var end = arguments.length > 2 ? arguments[2] : undefined;
  var count = Math.min((end === undefined ? len : toAbsoluteIndex(end, len)) - from, len - to);
  var inc = 1;
  if (from < to && to < from + count) {
    inc = -1;
    from += count - 1;
    to += count - 1;
  }
  while (count-- > 0) {
    if (from in O) O[to] = O[from];else delete O[to];
    to += inc;
    from += inc;
  }
  return O;
};

/***/ }),
/* 89 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(90);
module.exports = __w_pdfjs_require__(5).Number.isNaN;

/***/ }),
/* 90 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $export = __w_pdfjs_require__(4);
$export($export.S, 'Number', {
  isNaN: function isNaN(number) {
    return number != number;
  }
});

/***/ }),
/* 91 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(92);
module.exports = __w_pdfjs_require__(5).Number.isInteger;

/***/ }),
/* 92 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $export = __w_pdfjs_require__(4);
$export($export.S, 'Number', { isInteger: __w_pdfjs_require__(93) });

/***/ }),
/* 93 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
var floor = Math.floor;
module.exports = function isInteger(it) {
  return !isObject(it) && isFinite(it) && floor(it) === it;
};

/***/ }),
/* 94 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(63);
__w_pdfjs_require__(95);
__w_pdfjs_require__(64);
__w_pdfjs_require__(97);
__w_pdfjs_require__(101);
__w_pdfjs_require__(102);
module.exports = __w_pdfjs_require__(5).Promise;

/***/ }),
/* 95 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $at = __w_pdfjs_require__(96)(true);
__w_pdfjs_require__(59)(String, 'String', function (iterated) {
  this._t = String(iterated);
  this._i = 0;
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return {
    value: undefined,
    done: true
  };
  point = $at(O, index);
  this._i += point.length;
  return {
    value: point,
    done: false
  };
});

/***/ }),
/* 96 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var toInteger = __w_pdfjs_require__(17);
var defined = __w_pdfjs_require__(35);
module.exports = function (TO_STRING) {
  return function (that, pos) {
    var s = String(defined(that));
    var i = toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

/***/ }),
/* 97 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var LIBRARY = __w_pdfjs_require__(26);
var global = __w_pdfjs_require__(1);
var ctx = __w_pdfjs_require__(11);
var classof = __w_pdfjs_require__(30);
var $export = __w_pdfjs_require__(4);
var isObject = __w_pdfjs_require__(2);
var aFunction = __w_pdfjs_require__(21);
var anInstance = __w_pdfjs_require__(23);
var forOf = __w_pdfjs_require__(31);
var speciesConstructor = __w_pdfjs_require__(40);
var task = __w_pdfjs_require__(65).set;
var microtask = __w_pdfjs_require__(100)();
var newPromiseCapabilityModule = __w_pdfjs_require__(42);
var perform = __w_pdfjs_require__(66);
var promiseResolve = __w_pdfjs_require__(67);
var PROMISE = 'Promise';
var TypeError = global.TypeError;
var process = global.process;
var $Promise = global[PROMISE];
var isNode = classof(process) == 'process';
var empty = function empty() {};
var Internal, newGenericPromiseCapability, OwnPromiseCapability, Wrapper;
var newPromiseCapability = newGenericPromiseCapability = newPromiseCapabilityModule.f;
var USE_NATIVE = !!function () {
  try {
    var promise = $Promise.resolve(1);
    var FakePromise = (promise.constructor = {})[__w_pdfjs_require__(3)('species')] = function (exec) {
      exec(empty, empty);
    };
    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
  } catch (e) {}
}();
var isThenable = function isThenable(it) {
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var notify = function notify(promise, isReject) {
  if (promise._n) return;
  promise._n = true;
  var chain = promise._c;
  microtask(function () {
    var value = promise._v;
    var ok = promise._s == 1;
    var i = 0;
    var run = function run(reaction) {
      var handler = ok ? reaction.ok : reaction.fail;
      var resolve = reaction.resolve;
      var reject = reaction.reject;
      var domain = reaction.domain;
      var result, then;
      try {
        if (handler) {
          if (!ok) {
            if (promise._h == 2) onHandleUnhandled(promise);
            promise._h = 1;
          }
          if (handler === true) result = value;else {
            if (domain) domain.enter();
            result = handler(value);
            if (domain) domain.exit();
          }
          if (result === reaction.promise) {
            reject(TypeError('Promise-chain cycle'));
          } else if (then = isThenable(result)) {
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch (e) {
        reject(e);
      }
    };
    while (chain.length > i) {
      run(chain[i++]);
    }promise._c = [];
    promise._n = false;
    if (isReject && !promise._h) onUnhandled(promise);
  });
};
var onUnhandled = function onUnhandled(promise) {
  task.call(global, function () {
    var value = promise._v;
    var unhandled = isUnhandled(promise);
    var result, handler, console;
    if (unhandled) {
      result = perform(function () {
        if (isNode) {
          process.emit('unhandledRejection', value, promise);
        } else if (handler = global.onunhandledrejection) {
          handler({
            promise: promise,
            reason: value
          });
        } else if ((console = global.console) && console.error) {
          console.error('Unhandled promise rejection', value);
        }
      });
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    }
    promise._a = undefined;
    if (unhandled && result.e) throw result.v;
  });
};
var isUnhandled = function isUnhandled(promise) {
  if (promise._h == 1) return false;
  var chain = promise._a || promise._c;
  var i = 0;
  var reaction;
  while (chain.length > i) {
    reaction = chain[i++];
    if (reaction.fail || !isUnhandled(reaction.promise)) return false;
  }
  return true;
};
var onHandleUnhandled = function onHandleUnhandled(promise) {
  task.call(global, function () {
    var handler;
    if (isNode) {
      process.emit('rejectionHandled', promise);
    } else if (handler = global.onrejectionhandled) {
      handler({
        promise: promise,
        reason: promise._v
      });
    }
  });
};
var $reject = function $reject(value) {
  var promise = this;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise;
  promise._v = value;
  promise._s = 2;
  if (!promise._a) promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function $resolve(value) {
  var promise = this;
  var then;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise;
  try {
    if (promise === value) throw TypeError("Promise can't be resolved itself");
    if (then = isThenable(value)) {
      microtask(function () {
        var wrapper = {
          _w: promise,
          _d: false
        };
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch (e) {
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch (e) {
    $reject.call({
      _w: promise,
      _d: false
    }, e);
  }
};
if (!USE_NATIVE) {
  $Promise = function Promise(executor) {
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch (err) {
      $reject.call(this, err);
    }
  };
  Internal = function Promise(executor) {
    this._c = [];
    this._a = undefined;
    this._s = 0;
    this._d = false;
    this._v = undefined;
    this._h = 0;
    this._n = false;
  };
  Internal.prototype = __w_pdfjs_require__(22)($Promise.prototype, {
    then: function then(onFulfilled, onRejected) {
      var reaction = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if (this._a) this._a.push(reaction);
      if (this._s) notify(this, false);
      return reaction.promise;
    },
    'catch': function _catch(onRejected) {
      return this.then(undefined, onRejected);
    }
  });
  OwnPromiseCapability = function OwnPromiseCapability() {
    var promise = new Internal();
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject = ctx($reject, promise, 1);
  };
  newPromiseCapabilityModule.f = newPromiseCapability = function newPromiseCapability(C) {
    return C === $Promise || C === Wrapper ? new OwnPromiseCapability(C) : newGenericPromiseCapability(C);
  };
}
$export($export.G + $export.W + $export.F * !USE_NATIVE, { Promise: $Promise });
__w_pdfjs_require__(25)($Promise, PROMISE);
__w_pdfjs_require__(60)(PROMISE);
Wrapper = __w_pdfjs_require__(5)[PROMISE];
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  reject: function reject(r) {
    var capability = newPromiseCapability(this);
    var $$reject = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  resolve: function resolve(x) {
    return promiseResolve(LIBRARY && this === Wrapper ? $Promise : this, x);
  }
});
$export($export.S + $export.F * !(USE_NATIVE && __w_pdfjs_require__(41)(function (iter) {
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  all: function all(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var resolve = capability.resolve;
    var reject = capability.reject;
    var result = perform(function () {
      var values = [];
      var index = 0;
      var remaining = 1;
      forOf(iterable, false, function (promise) {
        var $index = index++;
        var alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function (value) {
          if (alreadyCalled) return;
          alreadyCalled = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if (result.e) reject(result.v);
    return capability.promise;
  },
  race: function race(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var reject = capability.reject;
    var result = perform(function () {
      forOf(iterable, false, function (promise) {
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if (result.e) reject(result.v);
    return capability.promise;
  }
});

/***/ }),
/* 98 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var anObject = __w_pdfjs_require__(7);
module.exports = function (iterator, fn, value, entries) {
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  } catch (e) {
    var ret = iterator['return'];
    if (ret !== undefined) anObject(ret.call(iterator));
    throw e;
  }
};

/***/ }),
/* 99 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


module.exports = function (fn, args, that) {
  var un = that === undefined;
  switch (args.length) {
    case 0:
      return un ? fn() : fn.call(that);
    case 1:
      return un ? fn(args[0]) : fn.call(that, args[0]);
    case 2:
      return un ? fn(args[0], args[1]) : fn.call(that, args[0], args[1]);
    case 3:
      return un ? fn(args[0], args[1], args[2]) : fn.call(that, args[0], args[1], args[2]);
    case 4:
      return un ? fn(args[0], args[1], args[2], args[3]) : fn.call(that, args[0], args[1], args[2], args[3]);
  }
  return fn.apply(that, args);
};

/***/ }),
/* 100 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var macrotask = __w_pdfjs_require__(65).set;
var Observer = global.MutationObserver || global.WebKitMutationObserver;
var process = global.process;
var Promise = global.Promise;
var isNode = __w_pdfjs_require__(24)(process) == 'process';
module.exports = function () {
  var head, last, notify;
  var flush = function flush() {
    var parent, fn;
    if (isNode && (parent = process.domain)) parent.exit();
    while (head) {
      fn = head.fn;
      head = head.next;
      try {
        fn();
      } catch (e) {
        if (head) notify();else last = undefined;
        throw e;
      }
    }
    last = undefined;
    if (parent) parent.enter();
  };
  if (isNode) {
    notify = function notify() {
      process.nextTick(flush);
    };
  } else if (Observer) {
    var toggle = true;
    var node = document.createTextNode('');
    new Observer(flush).observe(node, { characterData: true });
    notify = function notify() {
      node.data = toggle = !toggle;
    };
  } else if (Promise && Promise.resolve) {
    var promise = Promise.resolve();
    notify = function notify() {
      promise.then(flush);
    };
  } else {
    notify = function notify() {
      macrotask.call(global, flush);
    };
  }
  return function (fn) {
    var task = {
      fn: fn,
      next: undefined
    };
    if (last) last.next = task;
    if (!head) {
      head = task;
      notify();
    }
    last = task;
  };
};

/***/ }),
/* 101 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $export = __w_pdfjs_require__(4);
var core = __w_pdfjs_require__(5);
var global = __w_pdfjs_require__(1);
var speciesConstructor = __w_pdfjs_require__(40);
var promiseResolve = __w_pdfjs_require__(67);
$export($export.P + $export.R, 'Promise', {
  'finally': function _finally(onFinally) {
    var C = speciesConstructor(this, core.Promise || global.Promise);
    var isFunction = typeof onFinally == 'function';
    return this.then(isFunction ? function (x) {
      return promiseResolve(C, onFinally()).then(function () {
        return x;
      });
    } : onFinally, isFunction ? function (e) {
      return promiseResolve(C, onFinally()).then(function () {
        throw e;
      });
    } : onFinally);
  }
});

/***/ }),
/* 102 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $export = __w_pdfjs_require__(4);
var newPromiseCapability = __w_pdfjs_require__(42);
var perform = __w_pdfjs_require__(66);
$export($export.S, 'Promise', {
  'try': function _try(callbackfn) {
    var promiseCapability = newPromiseCapability.f(this);
    var result = perform(callbackfn);
    (result.e ? promiseCapability.reject : promiseCapability.resolve)(result.v);
    return promiseCapability.promise;
  }
});

/***/ }),
/* 103 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(63);
__w_pdfjs_require__(64);
__w_pdfjs_require__(104);
__w_pdfjs_require__(111);
__w_pdfjs_require__(113);
module.exports = __w_pdfjs_require__(5).WeakMap;

/***/ }),
/* 104 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var each = __w_pdfjs_require__(39)(0);
var redefine = __w_pdfjs_require__(15);
var meta = __w_pdfjs_require__(43);
var assign = __w_pdfjs_require__(105);
var weak = __w_pdfjs_require__(107);
var isObject = __w_pdfjs_require__(2);
var fails = __w_pdfjs_require__(10);
var validate = __w_pdfjs_require__(68);
var WEAK_MAP = 'WeakMap';
var getWeak = meta.getWeak;
var isExtensible = Object.isExtensible;
var uncaughtFrozenStore = weak.ufstore;
var tmp = {};
var InternalMap;
var wrapper = function wrapper(get) {
  return function WeakMap() {
    return get(this, arguments.length > 0 ? arguments[0] : undefined);
  };
};
var methods = {
  get: function get(key) {
    if (isObject(key)) {
      var data = getWeak(key);
      if (data === true) return uncaughtFrozenStore(validate(this, WEAK_MAP)).get(key);
      return data ? data[this._i] : undefined;
    }
  },
  set: function set(key, value) {
    return weak.def(validate(this, WEAK_MAP), key, value);
  }
};
var $WeakMap = module.exports = __w_pdfjs_require__(108)(WEAK_MAP, wrapper, methods, weak, true, true);
if (fails(function () {
  return new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7;
})) {
  InternalMap = weak.getConstructor(wrapper, WEAK_MAP);
  assign(InternalMap.prototype, methods);
  meta.NEED = true;
  each(['delete', 'has', 'get', 'set'], function (key) {
    var proto = $WeakMap.prototype;
    var method = proto[key];
    redefine(proto, key, function (a, b) {
      if (isObject(a) && !isExtensible(a)) {
        if (!this._f) this._f = new InternalMap();
        var result = this._f[key](a, b);
        return key == 'set' ? this : result;
      }
      return method.call(this, a, b);
    });
  });
}

/***/ }),
/* 105 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var getKeys = __w_pdfjs_require__(38);
var gOPS = __w_pdfjs_require__(106);
var pIE = __w_pdfjs_require__(62);
var toObject = __w_pdfjs_require__(18);
var IObject = __w_pdfjs_require__(34);
var $assign = Object.assign;
module.exports = !$assign || __w_pdfjs_require__(10)(function () {
  var A = {};
  var B = {};
  var S = Symbol();
  var K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function (k) {
    B[k] = k;
  });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source) {
  var T = toObject(target);
  var aLen = arguments.length;
  var index = 1;
  var getSymbols = gOPS.f;
  var isEnum = pIE.f;
  while (aLen > index) {
    var S = IObject(arguments[index++]);
    var keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S);
    var length = keys.length;
    var j = 0;
    var key;
    while (length > j) {
      if (isEnum.call(S, key = keys[j++])) T[key] = S[key];
    }
  }
  return T;
} : $assign;

/***/ }),
/* 106 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


exports.f = Object.getOwnPropertySymbols;

/***/ }),
/* 107 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var redefineAll = __w_pdfjs_require__(22);
var getWeak = __w_pdfjs_require__(43).getWeak;
var anObject = __w_pdfjs_require__(7);
var isObject = __w_pdfjs_require__(2);
var anInstance = __w_pdfjs_require__(23);
var forOf = __w_pdfjs_require__(31);
var createArrayMethod = __w_pdfjs_require__(39);
var $has = __w_pdfjs_require__(8);
var validate = __w_pdfjs_require__(68);
var arrayFind = createArrayMethod(5);
var arrayFindIndex = createArrayMethod(6);
var id = 0;
var uncaughtFrozenStore = function uncaughtFrozenStore(that) {
  return that._l || (that._l = new UncaughtFrozenStore());
};
var UncaughtFrozenStore = function UncaughtFrozenStore() {
  this.a = [];
};
var findUncaughtFrozen = function findUncaughtFrozen(store, key) {
  return arrayFind(store.a, function (it) {
    return it[0] === key;
  });
};
UncaughtFrozenStore.prototype = {
  get: function get(key) {
    var entry = findUncaughtFrozen(this, key);
    if (entry) return entry[1];
  },
  has: function has(key) {
    return !!findUncaughtFrozen(this, key);
  },
  set: function set(key, value) {
    var entry = findUncaughtFrozen(this, key);
    if (entry) entry[1] = value;else this.a.push([key, value]);
  },
  'delete': function _delete(key) {
    var index = arrayFindIndex(this.a, function (it) {
      return it[0] === key;
    });
    if (~index) this.a.splice(index, 1);
    return !!~index;
  }
};
module.exports = {
  getConstructor: function getConstructor(wrapper, NAME, IS_MAP, ADDER) {
    var C = wrapper(function (that, iterable) {
      anInstance(that, C, NAME, '_i');
      that._t = NAME;
      that._i = id++;
      that._l = undefined;
      if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      'delete': function _delete(key) {
        if (!isObject(key)) return false;
        var data = getWeak(key);
        if (data === true) return uncaughtFrozenStore(validate(this, NAME))['delete'](key);
        return data && $has(data, this._i) && delete data[this._i];
      },
      has: function has(key) {
        if (!isObject(key)) return false;
        var data = getWeak(key);
        if (data === true) return uncaughtFrozenStore(validate(this, NAME)).has(key);
        return data && $has(data, this._i);
      }
    });
    return C;
  },
  def: function def(that, key, value) {
    var data = getWeak(anObject(key), true);
    if (data === true) uncaughtFrozenStore(that).set(key, value);else data[that._i] = value;
    return that;
  },
  ufstore: uncaughtFrozenStore
};

/***/ }),
/* 108 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var global = __w_pdfjs_require__(1);
var $export = __w_pdfjs_require__(4);
var redefine = __w_pdfjs_require__(15);
var redefineAll = __w_pdfjs_require__(22);
var meta = __w_pdfjs_require__(43);
var forOf = __w_pdfjs_require__(31);
var anInstance = __w_pdfjs_require__(23);
var isObject = __w_pdfjs_require__(2);
var fails = __w_pdfjs_require__(10);
var $iterDetect = __w_pdfjs_require__(41);
var setToStringTag = __w_pdfjs_require__(25);
var inheritIfRequired = __w_pdfjs_require__(109);
module.exports = function (NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
  var Base = global[NAME];
  var C = Base;
  var ADDER = IS_MAP ? 'set' : 'add';
  var proto = C && C.prototype;
  var O = {};
  var fixMethod = function fixMethod(KEY) {
    var fn = proto[KEY];
    redefine(proto, KEY, KEY == 'delete' ? function (a) {
      return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
    } : KEY == 'has' ? function has(a) {
      return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
    } : KEY == 'get' ? function get(a) {
      return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
    } : KEY == 'add' ? function add(a) {
      fn.call(this, a === 0 ? 0 : a);
      return this;
    } : function set(a, b) {
      fn.call(this, a === 0 ? 0 : a, b);
      return this;
    });
  };
  if (typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function () {
    new C().entries().next();
  }))) {
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
    meta.NEED = true;
  } else {
    var instance = new C();
    var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance;
    var THROWS_ON_PRIMITIVES = fails(function () {
      instance.has(1);
    });
    var ACCEPT_ITERABLES = $iterDetect(function (iter) {
      new C(iter);
    });
    var BUGGY_ZERO = !IS_WEAK && fails(function () {
      var $instance = new C();
      var index = 5;
      while (index--) {
        $instance[ADDER](index, index);
      }return !$instance.has(-0);
    });
    if (!ACCEPT_ITERABLES) {
      C = wrapper(function (target, iterable) {
        anInstance(target, C, NAME);
        var that = inheritIfRequired(new Base(), target, C);
        if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
        return that;
      });
      C.prototype = proto;
      proto.constructor = C;
    }
    if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
      fixMethod('delete');
      fixMethod('has');
      IS_MAP && fixMethod('get');
    }
    if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);
    if (IS_WEAK && proto.clear) delete proto.clear;
  }
  setToStringTag(C, NAME);
  O[NAME] = C;
  $export($export.G + $export.W + $export.F * (C != Base), O);
  if (!IS_WEAK) common.setStrong(C, NAME, IS_MAP);
  return C;
};

/***/ }),
/* 109 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
var setPrototypeOf = __w_pdfjs_require__(110).set;
module.exports = function (that, target, C) {
  var S = target.constructor;
  var P;
  if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
    setPrototypeOf(that, P);
  }
  return that;
};

/***/ }),
/* 110 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isObject = __w_pdfjs_require__(2);
var anObject = __w_pdfjs_require__(7);
var check = function check(O, proto) {
  anObject(O);
  if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? function (test, buggy, set) {
    try {
      set = __w_pdfjs_require__(11)(Function.call, __w_pdfjs_require__(61).f(Object.prototype, '__proto__').set, 2);
      set(test, []);
      buggy = !(test instanceof Array);
    } catch (e) {
      buggy = true;
    }
    return function setPrototypeOf(O, proto) {
      check(O, proto);
      if (buggy) O.__proto__ = proto;else set(O, proto);
      return O;
    };
  }({}, false) : undefined),
  check: check
};

/***/ }),
/* 111 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(112)('WeakMap');

/***/ }),
/* 112 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $export = __w_pdfjs_require__(4);
module.exports = function (COLLECTION) {
  $export($export.S, COLLECTION, {
    of: function of() {
      var length = arguments.length;
      var A = Array(length);
      while (length--) {
        A[length] = arguments[length];
      }return new this(A);
    }
  });
};

/***/ }),
/* 113 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


__w_pdfjs_require__(114)('WeakMap');

/***/ }),
/* 114 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var $export = __w_pdfjs_require__(4);
var aFunction = __w_pdfjs_require__(21);
var ctx = __w_pdfjs_require__(11);
var forOf = __w_pdfjs_require__(31);
module.exports = function (COLLECTION) {
  $export($export.S, COLLECTION, {
    from: function from(source) {
      var mapFn = arguments[1];
      var mapping, A, n, cb;
      aFunction(this);
      mapping = mapFn !== undefined;
      if (mapping) aFunction(mapFn);
      if (source == undefined) return new this();
      A = [];
      if (mapping) {
        n = 0;
        cb = ctx(mapFn, arguments[2], 2);
        forOf(source, false, function (nextItem) {
          A.push(cb(nextItem, n++));
        });
      } else {
        forOf(source, false, A.push, A);
      }
      return new this(A);
    }
  });
};

/***/ }),
/* 115 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var isReadableStreamSupported = false;
if (typeof ReadableStream !== 'undefined') {
  try {
    new ReadableStream({
      start: function start(controller) {
        controller.close();
      }
    });
    isReadableStreamSupported = true;
  } catch (e) {}
}
if (isReadableStreamSupported) {
  exports.ReadableStream = ReadableStream;
} else {
  exports.ReadableStream = __w_pdfjs_require__(116).ReadableStream;
}

/***/ }),
/* 116 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (e, a) {
  for (var i in a) {
    e[i] = a[i];
  }
})(exports, function (modules) {
  var installedModules = {};
  function __w_pdfjs_require__(moduleId) {
    if (installedModules[moduleId]) return installedModules[moduleId].exports;
    var module = installedModules[moduleId] = {
      i: moduleId,
      l: false,
      exports: {}
    };
    modules[moduleId].call(module.exports, module, module.exports, __w_pdfjs_require__);
    module.l = true;
    return module.exports;
  }
  __w_pdfjs_require__.m = modules;
  __w_pdfjs_require__.c = installedModules;
  __w_pdfjs_require__.i = function (value) {
    return value;
  };
  __w_pdfjs_require__.d = function (exports, name, getter) {
    if (!__w_pdfjs_require__.o(exports, name)) {
      Object.defineProperty(exports, name, {
        configurable: false,
        enumerable: true,
        get: getter
      });
    }
  };
  __w_pdfjs_require__.n = function (module) {
    var getter = module && module.__esModule ? function getDefault() {
      return module['default'];
    } : function getModuleExports() {
      return module;
    };
    __w_pdfjs_require__.d(getter, 'a', getter);
    return getter;
  };
  __w_pdfjs_require__.o = function (object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
  __w_pdfjs_require__.p = "";
  return __w_pdfjs_require__(__w_pdfjs_require__.s = 7);
}([function (module, exports, __w_pdfjs_require__) {
  "use strict";

  var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
    return typeof obj === 'undefined' ? 'undefined' : _typeof2(obj);
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === 'undefined' ? 'undefined' : _typeof2(obj);
  };
  var _require = __w_pdfjs_require__(1),
      assert = _require.assert;
  function IsPropertyKey(argument) {
    return typeof argument === 'string' || (typeof argument === 'undefined' ? 'undefined' : _typeof(argument)) === 'symbol';
  }
  exports.typeIsObject = function (x) {
    return (typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object' && x !== null || typeof x === 'function';
  };
  exports.createDataProperty = function (o, p, v) {
    assert(exports.typeIsObject(o));
    Object.defineProperty(o, p, {
      value: v,
      writable: true,
      enumerable: true,
      configurable: true
    });
  };
  exports.createArrayFromList = function (elements) {
    return elements.slice();
  };
  exports.ArrayBufferCopy = function (dest, destOffset, src, srcOffset, n) {
    new Uint8Array(dest).set(new Uint8Array(src, srcOffset, n), destOffset);
  };
  exports.CreateIterResultObject = function (value, done) {
    assert(typeof done === 'boolean');
    var obj = {};
    Object.defineProperty(obj, 'value', {
      value: value,
      enumerable: true,
      writable: true,
      configurable: true
    });
    Object.defineProperty(obj, 'done', {
      value: done,
      enumerable: true,
      writable: true,
      configurable: true
    });
    return obj;
  };
  exports.IsFiniteNonNegativeNumber = function (v) {
    if (Number.isNaN(v)) {
      return false;
    }
    if (v === Infinity) {
      return false;
    }
    if (v < 0) {
      return false;
    }
    return true;
  };
  function Call(F, V, args) {
    if (typeof F !== 'function') {
      throw new TypeError('Argument is not a function');
    }
    return Function.prototype.apply.call(F, V, args);
  }
  exports.InvokeOrNoop = function (O, P, args) {
    assert(O !== undefined);
    assert(IsPropertyKey(P));
    assert(Array.isArray(args));
    var method = O[P];
    if (method === undefined) {
      return undefined;
    }
    return Call(method, O, args);
  };
  exports.PromiseInvokeOrNoop = function (O, P, args) {
    assert(O !== undefined);
    assert(IsPropertyKey(P));
    assert(Array.isArray(args));
    try {
      return Promise.resolve(exports.InvokeOrNoop(O, P, args));
    } catch (returnValueE) {
      return Promise.reject(returnValueE);
    }
  };
  exports.PromiseInvokeOrPerformFallback = function (O, P, args, F, argsF) {
    assert(O !== undefined);
    assert(IsPropertyKey(P));
    assert(Array.isArray(args));
    assert(Array.isArray(argsF));
    var method = void 0;
    try {
      method = O[P];
    } catch (methodE) {
      return Promise.reject(methodE);
    }
    if (method === undefined) {
      return F.apply(null, argsF);
    }
    try {
      return Promise.resolve(Call(method, O, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  exports.TransferArrayBuffer = function (O) {
    return O.slice();
  };
  exports.ValidateAndNormalizeHighWaterMark = function (highWaterMark) {
    highWaterMark = Number(highWaterMark);
    if (Number.isNaN(highWaterMark) || highWaterMark < 0) {
      throw new RangeError('highWaterMark property of a queuing strategy must be non-negative and non-NaN');
    }
    return highWaterMark;
  };
  exports.ValidateAndNormalizeQueuingStrategy = function (size, highWaterMark) {
    if (size !== undefined && typeof size !== 'function') {
      throw new TypeError('size property of a queuing strategy must be a function');
    }
    highWaterMark = exports.ValidateAndNormalizeHighWaterMark(highWaterMark);
    return {
      size: size,
      highWaterMark: highWaterMark
    };
  };
}, function (module, exports, __w_pdfjs_require__) {
  "use strict";

  function rethrowAssertionErrorRejection(e) {
    if (e && e.constructor === AssertionError) {
      setTimeout(function () {
        throw e;
      }, 0);
    }
  }
  function AssertionError(message) {
    this.name = 'AssertionError';
    this.message = message || '';
    this.stack = new Error().stack;
  }
  AssertionError.prototype = Object.create(Error.prototype);
  AssertionError.prototype.constructor = AssertionError;
  function assert(value, message) {
    if (!value) {
      throw new AssertionError(message);
    }
  }
  module.exports = {
    rethrowAssertionErrorRejection: rethrowAssertionErrorRejection,
    AssertionError: AssertionError,
    assert: assert
  };
}, function (module, exports, __w_pdfjs_require__) {
  "use strict";

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  var _require = __w_pdfjs_require__(0),
      InvokeOrNoop = _require.InvokeOrNoop,
      PromiseInvokeOrNoop = _require.PromiseInvokeOrNoop,
      ValidateAndNormalizeQueuingStrategy = _require.ValidateAndNormalizeQueuingStrategy,
      typeIsObject = _require.typeIsObject;
  var _require2 = __w_pdfjs_require__(1),
      assert = _require2.assert,
      rethrowAssertionErrorRejection = _require2.rethrowAssertionErrorRejection;
  var _require3 = __w_pdfjs_require__(3),
      DequeueValue = _require3.DequeueValue,
      EnqueueValueWithSize = _require3.EnqueueValueWithSize,
      PeekQueueValue = _require3.PeekQueueValue,
      ResetQueue = _require3.ResetQueue;
  var WritableStream = function () {
    function WritableStream() {
      var underlyingSink = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          size = _ref.size,
          _ref$highWaterMark = _ref.highWaterMark,
          highWaterMark = _ref$highWaterMark === undefined ? 1 : _ref$highWaterMark;
      _classCallCheck(this, WritableStream);
      this._state = 'writable';
      this._storedError = undefined;
      this._writer = undefined;
      this._writableStreamController = undefined;
      this._writeRequests = [];
      this._inFlightWriteRequest = undefined;
      this._closeRequest = undefined;
      this._inFlightCloseRequest = undefined;
      this._pendingAbortRequest = undefined;
      this._backpressure = false;
      var type = underlyingSink.type;
      if (type !== undefined) {
        throw new RangeError('Invalid type is specified');
      }
      this._writableStreamController = new WritableStreamDefaultController(this, underlyingSink, size, highWaterMark);
      this._writableStreamController.__startSteps();
    }
    _createClass(WritableStream, [{
      key: 'abort',
      value: function abort(reason) {
        if (IsWritableStream(this) === false) {
          return Promise.reject(streamBrandCheckException('abort'));
        }
        if (IsWritableStreamLocked(this) === true) {
          return Promise.reject(new TypeError('Cannot abort a stream that already has a writer'));
        }
        return WritableStreamAbort(this, reason);
      }
    }, {
      key: 'getWriter',
      value: function getWriter() {
        if (IsWritableStream(this) === false) {
          throw streamBrandCheckException('getWriter');
        }
        return AcquireWritableStreamDefaultWriter(this);
      }
    }, {
      key: 'locked',
      get: function get() {
        if (IsWritableStream(this) === false) {
          throw streamBrandCheckException('locked');
        }
        return IsWritableStreamLocked(this);
      }
    }]);
    return WritableStream;
  }();
  module.exports = {
    AcquireWritableStreamDefaultWriter: AcquireWritableStreamDefaultWriter,
    IsWritableStream: IsWritableStream,
    IsWritableStreamLocked: IsWritableStreamLocked,
    WritableStream: WritableStream,
    WritableStreamAbort: WritableStreamAbort,
    WritableStreamDefaultControllerError: WritableStreamDefaultControllerError,
    WritableStreamDefaultWriterCloseWithErrorPropagation: WritableStreamDefaultWriterCloseWithErrorPropagation,
    WritableStreamDefaultWriterRelease: WritableStreamDefaultWriterRelease,
    WritableStreamDefaultWriterWrite: WritableStreamDefaultWriterWrite,
    WritableStreamCloseQueuedOrInFlight: WritableStreamCloseQueuedOrInFlight
  };
  function AcquireWritableStreamDefaultWriter(stream) {
    return new WritableStreamDefaultWriter(stream);
  }
  function IsWritableStream(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_writableStreamController')) {
      return false;
    }
    return true;
  }
  function IsWritableStreamLocked(stream) {
    assert(IsWritableStream(stream) === true, 'IsWritableStreamLocked should only be used on known writable streams');
    if (stream._writer === undefined) {
      return false;
    }
    return true;
  }
  function WritableStreamAbort(stream, reason) {
    var state = stream._state;
    if (state === 'closed') {
      return Promise.resolve(undefined);
    }
    if (state === 'errored') {
      return Promise.reject(stream._storedError);
    }
    var error = new TypeError('Requested to abort');
    if (stream._pendingAbortRequest !== undefined) {
      return Promise.reject(error);
    }
    assert(state === 'writable' || state === 'erroring', 'state must be writable or erroring');
    var wasAlreadyErroring = false;
    if (state === 'erroring') {
      wasAlreadyErroring = true;
      reason = undefined;
    }
    var promise = new Promise(function (resolve, reject) {
      stream._pendingAbortRequest = {
        _resolve: resolve,
        _reject: reject,
        _reason: reason,
        _wasAlreadyErroring: wasAlreadyErroring
      };
    });
    if (wasAlreadyErroring === false) {
      WritableStreamStartErroring(stream, error);
    }
    return promise;
  }
  function WritableStreamAddWriteRequest(stream) {
    assert(IsWritableStreamLocked(stream) === true);
    assert(stream._state === 'writable');
    var promise = new Promise(function (resolve, reject) {
      var writeRequest = {
        _resolve: resolve,
        _reject: reject
      };
      stream._writeRequests.push(writeRequest);
    });
    return promise;
  }
  function WritableStreamDealWithRejection(stream, error) {
    var state = stream._state;
    if (state === 'writable') {
      WritableStreamStartErroring(stream, error);
      return;
    }
    assert(state === 'erroring');
    WritableStreamFinishErroring(stream);
  }
  function WritableStreamStartErroring(stream, reason) {
    assert(stream._storedError === undefined, 'stream._storedError === undefined');
    assert(stream._state === 'writable', 'state must be writable');
    var controller = stream._writableStreamController;
    assert(controller !== undefined, 'controller must not be undefined');
    stream._state = 'erroring';
    stream._storedError = reason;
    var writer = stream._writer;
    if (writer !== undefined) {
      WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
    }
    if (WritableStreamHasOperationMarkedInFlight(stream) === false && controller._started === true) {
      WritableStreamFinishErroring(stream);
    }
  }
  function WritableStreamFinishErroring(stream) {
    assert(stream._state === 'erroring', 'stream._state === erroring');
    assert(WritableStreamHasOperationMarkedInFlight(stream) === false, 'WritableStreamHasOperationMarkedInFlight(stream) === false');
    stream._state = 'errored';
    stream._writableStreamController.__errorSteps();
    var storedError = stream._storedError;
    for (var i = 0; i < stream._writeRequests.length; i++) {
      var writeRequest = stream._writeRequests[i];
      writeRequest._reject(storedError);
    }
    stream._writeRequests = [];
    if (stream._pendingAbortRequest === undefined) {
      WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
      return;
    }
    var abortRequest = stream._pendingAbortRequest;
    stream._pendingAbortRequest = undefined;
    if (abortRequest._wasAlreadyErroring === true) {
      abortRequest._reject(storedError);
      WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
      return;
    }
    var promise = stream._writableStreamController.__abortSteps(abortRequest._reason);
    promise.then(function () {
      abortRequest._resolve();
      WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
    }, function (reason) {
      abortRequest._reject(reason);
      WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
    });
  }
  function WritableStreamFinishInFlightWrite(stream) {
    assert(stream._inFlightWriteRequest !== undefined);
    stream._inFlightWriteRequest._resolve(undefined);
    stream._inFlightWriteRequest = undefined;
  }
  function WritableStreamFinishInFlightWriteWithError(stream, error) {
    assert(stream._inFlightWriteRequest !== undefined);
    stream._inFlightWriteRequest._reject(error);
    stream._inFlightWriteRequest = undefined;
    assert(stream._state === 'writable' || stream._state === 'erroring');
    WritableStreamDealWithRejection(stream, error);
  }
  function WritableStreamFinishInFlightClose(stream) {
    assert(stream._inFlightCloseRequest !== undefined);
    stream._inFlightCloseRequest._resolve(undefined);
    stream._inFlightCloseRequest = undefined;
    var state = stream._state;
    assert(state === 'writable' || state === 'erroring');
    if (state === 'erroring') {
      stream._storedError = undefined;
      if (stream._pendingAbortRequest !== undefined) {
        stream._pendingAbortRequest._resolve();
        stream._pendingAbortRequest = undefined;
      }
    }
    stream._state = 'closed';
    var writer = stream._writer;
    if (writer !== undefined) {
      defaultWriterClosedPromiseResolve(writer);
    }
    assert(stream._pendingAbortRequest === undefined, 'stream._pendingAbortRequest === undefined');
    assert(stream._storedError === undefined, 'stream._storedError === undefined');
  }
  function WritableStreamFinishInFlightCloseWithError(stream, error) {
    assert(stream._inFlightCloseRequest !== undefined);
    stream._inFlightCloseRequest._reject(error);
    stream._inFlightCloseRequest = undefined;
    assert(stream._state === 'writable' || stream._state === 'erroring');
    if (stream._pendingAbortRequest !== undefined) {
      stream._pendingAbortRequest._reject(error);
      stream._pendingAbortRequest = undefined;
    }
    WritableStreamDealWithRejection(stream, error);
  }
  function WritableStreamCloseQueuedOrInFlight(stream) {
    if (stream._closeRequest === undefined && stream._inFlightCloseRequest === undefined) {
      return false;
    }
    return true;
  }
  function WritableStreamHasOperationMarkedInFlight(stream) {
    if (stream._inFlightWriteRequest === undefined && stream._inFlightCloseRequest === undefined) {
      return false;
    }
    return true;
  }
  function WritableStreamMarkCloseRequestInFlight(stream) {
    assert(stream._inFlightCloseRequest === undefined);
    assert(stream._closeRequest !== undefined);
    stream._inFlightCloseRequest = stream._closeRequest;
    stream._closeRequest = undefined;
  }
  function WritableStreamMarkFirstWriteRequestInFlight(stream) {
    assert(stream._inFlightWriteRequest === undefined, 'there must be no pending write request');
    assert(stream._writeRequests.length !== 0, 'writeRequests must not be empty');
    stream._inFlightWriteRequest = stream._writeRequests.shift();
  }
  function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
    assert(stream._state === 'errored', '_stream_.[[state]] is `"errored"`');
    if (stream._closeRequest !== undefined) {
      assert(stream._inFlightCloseRequest === undefined);
      stream._closeRequest._reject(stream._storedError);
      stream._closeRequest = undefined;
    }
    var writer = stream._writer;
    if (writer !== undefined) {
      defaultWriterClosedPromiseReject(writer, stream._storedError);
      writer._closedPromise.catch(function () {});
    }
  }
  function WritableStreamUpdateBackpressure(stream, backpressure) {
    assert(stream._state === 'writable');
    assert(WritableStreamCloseQueuedOrInFlight(stream) === false);
    var writer = stream._writer;
    if (writer !== undefined && backpressure !== stream._backpressure) {
      if (backpressure === true) {
        defaultWriterReadyPromiseReset(writer);
      } else {
        assert(backpressure === false);
        defaultWriterReadyPromiseResolve(writer);
      }
    }
    stream._backpressure = backpressure;
  }
  var WritableStreamDefaultWriter = function () {
    function WritableStreamDefaultWriter(stream) {
      _classCallCheck(this, WritableStreamDefaultWriter);
      if (IsWritableStream(stream) === false) {
        throw new TypeError('WritableStreamDefaultWriter can only be constructed with a WritableStream instance');
      }
      if (IsWritableStreamLocked(stream) === true) {
        throw new TypeError('This stream has already been locked for exclusive writing by another writer');
      }
      this._ownerWritableStream = stream;
      stream._writer = this;
      var state = stream._state;
      if (state === 'writable') {
        if (WritableStreamCloseQueuedOrInFlight(stream) === false && stream._backpressure === true) {
          defaultWriterReadyPromiseInitialize(this);
        } else {
          defaultWriterReadyPromiseInitializeAsResolved(this);
        }
        defaultWriterClosedPromiseInitialize(this);
      } else if (state === 'erroring') {
        defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
        this._readyPromise.catch(function () {});
        defaultWriterClosedPromiseInitialize(this);
      } else if (state === 'closed') {
        defaultWriterReadyPromiseInitializeAsResolved(this);
        defaultWriterClosedPromiseInitializeAsResolved(this);
      } else {
        assert(state === 'errored', 'state must be errored');
        var storedError = stream._storedError;
        defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
        this._readyPromise.catch(function () {});
        defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
        this._closedPromise.catch(function () {});
      }
    }
    _createClass(WritableStreamDefaultWriter, [{
      key: 'abort',
      value: function abort(reason) {
        if (IsWritableStreamDefaultWriter(this) === false) {
          return Promise.reject(defaultWriterBrandCheckException('abort'));
        }
        if (this._ownerWritableStream === undefined) {
          return Promise.reject(defaultWriterLockException('abort'));
        }
        return WritableStreamDefaultWriterAbort(this, reason);
      }
    }, {
      key: 'close',
      value: function close() {
        if (IsWritableStreamDefaultWriter(this) === false) {
          return Promise.reject(defaultWriterBrandCheckException('close'));
        }
        var stream = this._ownerWritableStream;
        if (stream === undefined) {
          return Promise.reject(defaultWriterLockException('close'));
        }
        if (WritableStreamCloseQueuedOrInFlight(stream) === true) {
          return Promise.reject(new TypeError('cannot close an already-closing stream'));
        }
        return WritableStreamDefaultWriterClose(this);
      }
    }, {
      key: 'releaseLock',
      value: function releaseLock() {
        if (IsWritableStreamDefaultWriter(this) === false) {
          throw defaultWriterBrandCheckException('releaseLock');
        }
        var stream = this._ownerWritableStream;
        if (stream === undefined) {
          return;
        }
        assert(stream._writer !== undefined);
        WritableStreamDefaultWriterRelease(this);
      }
    }, {
      key: 'write',
      value: function write(chunk) {
        if (IsWritableStreamDefaultWriter(this) === false) {
          return Promise.reject(defaultWriterBrandCheckException('write'));
        }
        if (this._ownerWritableStream === undefined) {
          return Promise.reject(defaultWriterLockException('write to'));
        }
        return WritableStreamDefaultWriterWrite(this, chunk);
      }
    }, {
      key: 'closed',
      get: function get() {
        if (IsWritableStreamDefaultWriter(this) === false) {
          return Promise.reject(defaultWriterBrandCheckException('closed'));
        }
        return this._closedPromise;
      }
    }, {
      key: 'desiredSize',
      get: function get() {
        if (IsWritableStreamDefaultWriter(this) === false) {
          throw defaultWriterBrandCheckException('desiredSize');
        }
        if (this._ownerWritableStream === undefined) {
          throw defaultWriterLockException('desiredSize');
        }
        return WritableStreamDefaultWriterGetDesiredSize(this);
      }
    }, {
      key: 'ready',
      get: function get() {
        if (IsWritableStreamDefaultWriter(this) === false) {
          return Promise.reject(defaultWriterBrandCheckException('ready'));
        }
        return this._readyPromise;
      }
    }]);
    return WritableStreamDefaultWriter;
  }();
  function IsWritableStreamDefaultWriter(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_ownerWritableStream')) {
      return false;
    }
    return true;
  }
  function WritableStreamDefaultWriterAbort(writer, reason) {
    var stream = writer._ownerWritableStream;
    assert(stream !== undefined);
    return WritableStreamAbort(stream, reason);
  }
  function WritableStreamDefaultWriterClose(writer) {
    var stream = writer._ownerWritableStream;
    assert(stream !== undefined);
    var state = stream._state;
    if (state === 'closed' || state === 'errored') {
      return Promise.reject(new TypeError('The stream (in ' + state + ' state) is not in the writable state and cannot be closed'));
    }
    assert(state === 'writable' || state === 'erroring');
    assert(WritableStreamCloseQueuedOrInFlight(stream) === false);
    var promise = new Promise(function (resolve, reject) {
      var closeRequest = {
        _resolve: resolve,
        _reject: reject
      };
      stream._closeRequest = closeRequest;
    });
    if (stream._backpressure === true && state === 'writable') {
      defaultWriterReadyPromiseResolve(writer);
    }
    WritableStreamDefaultControllerClose(stream._writableStreamController);
    return promise;
  }
  function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
    var stream = writer._ownerWritableStream;
    assert(stream !== undefined);
    var state = stream._state;
    if (WritableStreamCloseQueuedOrInFlight(stream) === true || state === 'closed') {
      return Promise.resolve();
    }
    if (state === 'errored') {
      return Promise.reject(stream._storedError);
    }
    assert(state === 'writable' || state === 'erroring');
    return WritableStreamDefaultWriterClose(writer);
  }
  function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error) {
    if (writer._closedPromiseState === 'pending') {
      defaultWriterClosedPromiseReject(writer, error);
    } else {
      defaultWriterClosedPromiseResetToRejected(writer, error);
    }
    writer._closedPromise.catch(function () {});
  }
  function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error) {
    if (writer._readyPromiseState === 'pending') {
      defaultWriterReadyPromiseReject(writer, error);
    } else {
      defaultWriterReadyPromiseResetToRejected(writer, error);
    }
    writer._readyPromise.catch(function () {});
  }
  function WritableStreamDefaultWriterGetDesiredSize(writer) {
    var stream = writer._ownerWritableStream;
    var state = stream._state;
    if (state === 'errored' || state === 'erroring') {
      return null;
    }
    if (state === 'closed') {
      return 0;
    }
    return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
  }
  function WritableStreamDefaultWriterRelease(writer) {
    var stream = writer._ownerWritableStream;
    assert(stream !== undefined);
    assert(stream._writer === writer);
    var releasedError = new TypeError('Writer was released and can no longer be used to monitor the stream\'s closedness');
    WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
    WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
    stream._writer = undefined;
    writer._ownerWritableStream = undefined;
  }
  function WritableStreamDefaultWriterWrite(writer, chunk) {
    var stream = writer._ownerWritableStream;
    assert(stream !== undefined);
    var controller = stream._writableStreamController;
    var chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
    if (stream !== writer._ownerWritableStream) {
      return Promise.reject(defaultWriterLockException('write to'));
    }
    var state = stream._state;
    if (state === 'errored') {
      return Promise.reject(stream._storedError);
    }
    if (WritableStreamCloseQueuedOrInFlight(stream) === true || state === 'closed') {
      return Promise.reject(new TypeError('The stream is closing or closed and cannot be written to'));
    }
    if (state === 'erroring') {
      return Promise.reject(stream._storedError);
    }
    assert(state === 'writable');
    var promise = WritableStreamAddWriteRequest(stream);
    WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
    return promise;
  }
  var WritableStreamDefaultController = function () {
    function WritableStreamDefaultController(stream, underlyingSink, size, highWaterMark) {
      _classCallCheck(this, WritableStreamDefaultController);
      if (IsWritableStream(stream) === false) {
        throw new TypeError('WritableStreamDefaultController can only be constructed with a WritableStream instance');
      }
      if (stream._writableStreamController !== undefined) {
        throw new TypeError('WritableStreamDefaultController instances can only be created by the WritableStream constructor');
      }
      this._controlledWritableStream = stream;
      this._underlyingSink = underlyingSink;
      this._queue = undefined;
      this._queueTotalSize = undefined;
      ResetQueue(this);
      this._started = false;
      var normalizedStrategy = ValidateAndNormalizeQueuingStrategy(size, highWaterMark);
      this._strategySize = normalizedStrategy.size;
      this._strategyHWM = normalizedStrategy.highWaterMark;
      var backpressure = WritableStreamDefaultControllerGetBackpressure(this);
      WritableStreamUpdateBackpressure(stream, backpressure);
    }
    _createClass(WritableStreamDefaultController, [{
      key: 'error',
      value: function error(e) {
        if (IsWritableStreamDefaultController(this) === false) {
          throw new TypeError('WritableStreamDefaultController.prototype.error can only be used on a WritableStreamDefaultController');
        }
        var state = this._controlledWritableStream._state;
        if (state !== 'writable') {
          return;
        }
        WritableStreamDefaultControllerError(this, e);
      }
    }, {
      key: '__abortSteps',
      value: function __abortSteps(reason) {
        return PromiseInvokeOrNoop(this._underlyingSink, 'abort', [reason]);
      }
    }, {
      key: '__errorSteps',
      value: function __errorSteps() {
        ResetQueue(this);
      }
    }, {
      key: '__startSteps',
      value: function __startSteps() {
        var _this = this;
        var startResult = InvokeOrNoop(this._underlyingSink, 'start', [this]);
        var stream = this._controlledWritableStream;
        Promise.resolve(startResult).then(function () {
          assert(stream._state === 'writable' || stream._state === 'erroring');
          _this._started = true;
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(_this);
        }, function (r) {
          assert(stream._state === 'writable' || stream._state === 'erroring');
          _this._started = true;
          WritableStreamDealWithRejection(stream, r);
        }).catch(rethrowAssertionErrorRejection);
      }
    }]);
    return WritableStreamDefaultController;
  }();
  function WritableStreamDefaultControllerClose(controller) {
    EnqueueValueWithSize(controller, 'close', 0);
    WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
  }
  function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
    var strategySize = controller._strategySize;
    if (strategySize === undefined) {
      return 1;
    }
    try {
      return strategySize(chunk);
    } catch (chunkSizeE) {
      WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
      return 1;
    }
  }
  function WritableStreamDefaultControllerGetDesiredSize(controller) {
    return controller._strategyHWM - controller._queueTotalSize;
  }
  function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
    var writeRecord = { chunk: chunk };
    try {
      EnqueueValueWithSize(controller, writeRecord, chunkSize);
    } catch (enqueueE) {
      WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
      return;
    }
    var stream = controller._controlledWritableStream;
    if (WritableStreamCloseQueuedOrInFlight(stream) === false && stream._state === 'writable') {
      var backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
      WritableStreamUpdateBackpressure(stream, backpressure);
    }
    WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
  }
  function IsWritableStreamDefaultController(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_underlyingSink')) {
      return false;
    }
    return true;
  }
  function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
    var stream = controller._controlledWritableStream;
    if (controller._started === false) {
      return;
    }
    if (stream._inFlightWriteRequest !== undefined) {
      return;
    }
    var state = stream._state;
    if (state === 'closed' || state === 'errored') {
      return;
    }
    if (state === 'erroring') {
      WritableStreamFinishErroring(stream);
      return;
    }
    if (controller._queue.length === 0) {
      return;
    }
    var writeRecord = PeekQueueValue(controller);
    if (writeRecord === 'close') {
      WritableStreamDefaultControllerProcessClose(controller);
    } else {
      WritableStreamDefaultControllerProcessWrite(controller, writeRecord.chunk);
    }
  }
  function WritableStreamDefaultControllerErrorIfNeeded(controller, error) {
    if (controller._controlledWritableStream._state === 'writable') {
      WritableStreamDefaultControllerError(controller, error);
    }
  }
  function WritableStreamDefaultControllerProcessClose(controller) {
    var stream = controller._controlledWritableStream;
    WritableStreamMarkCloseRequestInFlight(stream);
    DequeueValue(controller);
    assert(controller._queue.length === 0, 'queue must be empty once the final write record is dequeued');
    var sinkClosePromise = PromiseInvokeOrNoop(controller._underlyingSink, 'close', []);
    sinkClosePromise.then(function () {
      WritableStreamFinishInFlightClose(stream);
    }, function (reason) {
      WritableStreamFinishInFlightCloseWithError(stream, reason);
    }).catch(rethrowAssertionErrorRejection);
  }
  function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
    var stream = controller._controlledWritableStream;
    WritableStreamMarkFirstWriteRequestInFlight(stream);
    var sinkWritePromise = PromiseInvokeOrNoop(controller._underlyingSink, 'write', [chunk, controller]);
    sinkWritePromise.then(function () {
      WritableStreamFinishInFlightWrite(stream);
      var state = stream._state;
      assert(state === 'writable' || state === 'erroring');
      DequeueValue(controller);
      if (WritableStreamCloseQueuedOrInFlight(stream) === false && state === 'writable') {
        var backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
        WritableStreamUpdateBackpressure(stream, backpressure);
      }
      WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
    }, function (reason) {
      WritableStreamFinishInFlightWriteWithError(stream, reason);
    }).catch(rethrowAssertionErrorRejection);
  }
  function WritableStreamDefaultControllerGetBackpressure(controller) {
    var desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
    return desiredSize <= 0;
  }
  function WritableStreamDefaultControllerError(controller, error) {
    var stream = controller._controlledWritableStream;
    assert(stream._state === 'writable');
    WritableStreamStartErroring(stream, error);
  }
  function streamBrandCheckException(name) {
    return new TypeError('WritableStream.prototype.' + name + ' can only be used on a WritableStream');
  }
  function defaultWriterBrandCheckException(name) {
    return new TypeError('WritableStreamDefaultWriter.prototype.' + name + ' can only be used on a WritableStreamDefaultWriter');
  }
  function defaultWriterLockException(name) {
    return new TypeError('Cannot ' + name + ' a stream using a released writer');
  }
  function defaultWriterClosedPromiseInitialize(writer) {
    writer._closedPromise = new Promise(function (resolve, reject) {
      writer._closedPromise_resolve = resolve;
      writer._closedPromise_reject = reject;
      writer._closedPromiseState = 'pending';
    });
  }
  function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
    writer._closedPromise = Promise.reject(reason);
    writer._closedPromise_resolve = undefined;
    writer._closedPromise_reject = undefined;
    writer._closedPromiseState = 'rejected';
  }
  function defaultWriterClosedPromiseInitializeAsResolved(writer) {
    writer._closedPromise = Promise.resolve(undefined);
    writer._closedPromise_resolve = undefined;
    writer._closedPromise_reject = undefined;
    writer._closedPromiseState = 'resolved';
  }
  function defaultWriterClosedPromiseReject(writer, reason) {
    assert(writer._closedPromise_resolve !== undefined, 'writer._closedPromise_resolve !== undefined');
    assert(writer._closedPromise_reject !== undefined, 'writer._closedPromise_reject !== undefined');
    assert(writer._closedPromiseState === 'pending', 'writer._closedPromiseState is pending');
    writer._closedPromise_reject(reason);
    writer._closedPromise_resolve = undefined;
    writer._closedPromise_reject = undefined;
    writer._closedPromiseState = 'rejected';
  }
  function defaultWriterClosedPromiseResetToRejected(writer, reason) {
    assert(writer._closedPromise_resolve === undefined, 'writer._closedPromise_resolve === undefined');
    assert(writer._closedPromise_reject === undefined, 'writer._closedPromise_reject === undefined');
    assert(writer._closedPromiseState !== 'pending', 'writer._closedPromiseState is not pending');
    writer._closedPromise = Promise.reject(reason);
    writer._closedPromiseState = 'rejected';
  }
  function defaultWriterClosedPromiseResolve(writer) {
    assert(writer._closedPromise_resolve !== undefined, 'writer._closedPromise_resolve !== undefined');
    assert(writer._closedPromise_reject !== undefined, 'writer._closedPromise_reject !== undefined');
    assert(writer._closedPromiseState === 'pending', 'writer._closedPromiseState is pending');
    writer._closedPromise_resolve(undefined);
    writer._closedPromise_resolve = undefined;
    writer._closedPromise_reject = undefined;
    writer._closedPromiseState = 'resolved';
  }
  function defaultWriterReadyPromiseInitialize(writer) {
    writer._readyPromise = new Promise(function (resolve, reject) {
      writer._readyPromise_resolve = resolve;
      writer._readyPromise_reject = reject;
    });
    writer._readyPromiseState = 'pending';
  }
  function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
    writer._readyPromise = Promise.reject(reason);
    writer._readyPromise_resolve = undefined;
    writer._readyPromise_reject = undefined;
    writer._readyPromiseState = 'rejected';
  }
  function defaultWriterReadyPromiseInitializeAsResolved(writer) {
    writer._readyPromise = Promise.resolve(undefined);
    writer._readyPromise_resolve = undefined;
    writer._readyPromise_reject = undefined;
    writer._readyPromiseState = 'fulfilled';
  }
  function defaultWriterReadyPromiseReject(writer, reason) {
    assert(writer._readyPromise_resolve !== undefined, 'writer._readyPromise_resolve !== undefined');
    assert(writer._readyPromise_reject !== undefined, 'writer._readyPromise_reject !== undefined');
    writer._readyPromise_reject(reason);
    writer._readyPromise_resolve = undefined;
    writer._readyPromise_reject = undefined;
    writer._readyPromiseState = 'rejected';
  }
  function defaultWriterReadyPromiseReset(writer) {
    assert(writer._readyPromise_resolve === undefined, 'writer._readyPromise_resolve === undefined');
    assert(writer._readyPromise_reject === undefined, 'writer._readyPromise_reject === undefined');
    writer._readyPromise = new Promise(function (resolve, reject) {
      writer._readyPromise_resolve = resolve;
      writer._readyPromise_reject = reject;
    });
    writer._readyPromiseState = 'pending';
  }
  function defaultWriterReadyPromiseResetToRejected(writer, reason) {
    assert(writer._readyPromise_resolve === undefined, 'writer._readyPromise_resolve === undefined');
    assert(writer._readyPromise_reject === undefined, 'writer._readyPromise_reject === undefined');
    writer._readyPromise = Promise.reject(reason);
    writer._readyPromiseState = 'rejected';
  }
  function defaultWriterReadyPromiseResolve(writer) {
    assert(writer._readyPromise_resolve !== undefined, 'writer._readyPromise_resolve !== undefined');
    assert(writer._readyPromise_reject !== undefined, 'writer._readyPromise_reject !== undefined');
    writer._readyPromise_resolve(undefined);
    writer._readyPromise_resolve = undefined;
    writer._readyPromise_reject = undefined;
    writer._readyPromiseState = 'fulfilled';
  }
}, function (module, exports, __w_pdfjs_require__) {
  "use strict";

  var _require = __w_pdfjs_require__(0),
      IsFiniteNonNegativeNumber = _require.IsFiniteNonNegativeNumber;
  var _require2 = __w_pdfjs_require__(1),
      assert = _require2.assert;
  exports.DequeueValue = function (container) {
    assert('_queue' in container && '_queueTotalSize' in container, 'Spec-level failure: DequeueValue should only be used on containers with [[queue]] and [[queueTotalSize]].');
    assert(container._queue.length > 0, 'Spec-level failure: should never dequeue from an empty queue.');
    var pair = container._queue.shift();
    container._queueTotalSize -= pair.size;
    if (container._queueTotalSize < 0) {
      container._queueTotalSize = 0;
    }
    return pair.value;
  };
  exports.EnqueueValueWithSize = function (container, value, size) {
    assert('_queue' in container && '_queueTotalSize' in container, 'Spec-level failure: EnqueueValueWithSize should only be used on containers with [[queue]] and ' + '[[queueTotalSize]].');
    size = Number(size);
    if (!IsFiniteNonNegativeNumber(size)) {
      throw new RangeError('Size must be a finite, non-NaN, non-negative number.');
    }
    container._queue.push({
      value: value,
      size: size
    });
    container._queueTotalSize += size;
  };
  exports.PeekQueueValue = function (container) {
    assert('_queue' in container && '_queueTotalSize' in container, 'Spec-level failure: PeekQueueValue should only be used on containers with [[queue]] and [[queueTotalSize]].');
    assert(container._queue.length > 0, 'Spec-level failure: should never peek at an empty queue.');
    var pair = container._queue[0];
    return pair.value;
  };
  exports.ResetQueue = function (container) {
    assert('_queue' in container && '_queueTotalSize' in container, 'Spec-level failure: ResetQueue should only be used on containers with [[queue]] and [[queueTotalSize]].');
    container._queue = [];
    container._queueTotalSize = 0;
  };
}, function (module, exports, __w_pdfjs_require__) {
  "use strict";

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  var _require = __w_pdfjs_require__(0),
      ArrayBufferCopy = _require.ArrayBufferCopy,
      CreateIterResultObject = _require.CreateIterResultObject,
      IsFiniteNonNegativeNumber = _require.IsFiniteNonNegativeNumber,
      InvokeOrNoop = _require.InvokeOrNoop,
      PromiseInvokeOrNoop = _require.PromiseInvokeOrNoop,
      TransferArrayBuffer = _require.TransferArrayBuffer,
      ValidateAndNormalizeQueuingStrategy = _require.ValidateAndNormalizeQueuingStrategy,
      ValidateAndNormalizeHighWaterMark = _require.ValidateAndNormalizeHighWaterMark;
  var _require2 = __w_pdfjs_require__(0),
      createArrayFromList = _require2.createArrayFromList,
      createDataProperty = _require2.createDataProperty,
      typeIsObject = _require2.typeIsObject;
  var _require3 = __w_pdfjs_require__(1),
      assert = _require3.assert,
      rethrowAssertionErrorRejection = _require3.rethrowAssertionErrorRejection;
  var _require4 = __w_pdfjs_require__(3),
      DequeueValue = _require4.DequeueValue,
      EnqueueValueWithSize = _require4.EnqueueValueWithSize,
      ResetQueue = _require4.ResetQueue;
  var _require5 = __w_pdfjs_require__(2),
      AcquireWritableStreamDefaultWriter = _require5.AcquireWritableStreamDefaultWriter,
      IsWritableStream = _require5.IsWritableStream,
      IsWritableStreamLocked = _require5.IsWritableStreamLocked,
      WritableStreamAbort = _require5.WritableStreamAbort,
      WritableStreamDefaultWriterCloseWithErrorPropagation = _require5.WritableStreamDefaultWriterCloseWithErrorPropagation,
      WritableStreamDefaultWriterRelease = _require5.WritableStreamDefaultWriterRelease,
      WritableStreamDefaultWriterWrite = _require5.WritableStreamDefaultWriterWrite,
      WritableStreamCloseQueuedOrInFlight = _require5.WritableStreamCloseQueuedOrInFlight;
  var ReadableStream = function () {
    function ReadableStream() {
      var underlyingSource = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          size = _ref.size,
          highWaterMark = _ref.highWaterMark;
      _classCallCheck(this, ReadableStream);
      this._state = 'readable';
      this._reader = undefined;
      this._storedError = undefined;
      this._disturbed = false;
      this._readableStreamController = undefined;
      var type = underlyingSource.type;
      var typeString = String(type);
      if (typeString === 'bytes') {
        if (highWaterMark === undefined) {
          highWaterMark = 0;
        }
        this._readableStreamController = new ReadableByteStreamController(this, underlyingSource, highWaterMark);
      } else if (type === undefined) {
        if (highWaterMark === undefined) {
          highWaterMark = 1;
        }
        this._readableStreamController = new ReadableStreamDefaultController(this, underlyingSource, size, highWaterMark);
      } else {
        throw new RangeError('Invalid type is specified');
      }
    }
    _createClass(ReadableStream, [{
      key: 'cancel',
      value: function cancel(reason) {
        if (IsReadableStream(this) === false) {
          return Promise.reject(streamBrandCheckException('cancel'));
        }
        if (IsReadableStreamLocked(this) === true) {
          return Promise.reject(new TypeError('Cannot cancel a stream that already has a reader'));
        }
        return ReadableStreamCancel(this, reason);
      }
    }, {
      key: 'getReader',
      value: function getReader() {
        var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            mode = _ref2.mode;
        if (IsReadableStream(this) === false) {
          throw streamBrandCheckException('getReader');
        }
        if (mode === undefined) {
          return AcquireReadableStreamDefaultReader(this);
        }
        mode = String(mode);
        if (mode === 'byob') {
          return AcquireReadableStreamBYOBReader(this);
        }
        throw new RangeError('Invalid mode is specified');
      }
    }, {
      key: 'pipeThrough',
      value: function pipeThrough(_ref3, options) {
        var writable = _ref3.writable,
            readable = _ref3.readable;
        var promise = this.pipeTo(writable, options);
        ifIsObjectAndHasAPromiseIsHandledInternalSlotSetPromiseIsHandledToTrue(promise);
        return readable;
      }
    }, {
      key: 'pipeTo',
      value: function pipeTo(dest) {
        var _this = this;
        var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            preventClose = _ref4.preventClose,
            preventAbort = _ref4.preventAbort,
            preventCancel = _ref4.preventCancel;
        if (IsReadableStream(this) === false) {
          return Promise.reject(streamBrandCheckException('pipeTo'));
        }
        if (IsWritableStream(dest) === false) {
          return Promise.reject(new TypeError('ReadableStream.prototype.pipeTo\'s first argument must be a WritableStream'));
        }
        preventClose = Boolean(preventClose);
        preventAbort = Boolean(preventAbort);
        preventCancel = Boolean(preventCancel);
        if (IsReadableStreamLocked(this) === true) {
          return Promise.reject(new TypeError('ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream'));
        }
        if (IsWritableStreamLocked(dest) === true) {
          return Promise.reject(new TypeError('ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream'));
        }
        var reader = AcquireReadableStreamDefaultReader(this);
        var writer = AcquireWritableStreamDefaultWriter(dest);
        var shuttingDown = false;
        var currentWrite = Promise.resolve();
        return new Promise(function (resolve, reject) {
          function pipeLoop() {
            currentWrite = Promise.resolve();
            if (shuttingDown === true) {
              return Promise.resolve();
            }
            return writer._readyPromise.then(function () {
              return ReadableStreamDefaultReaderRead(reader).then(function (_ref5) {
                var value = _ref5.value,
                    done = _ref5.done;
                if (done === true) {
                  return;
                }
                currentWrite = WritableStreamDefaultWriterWrite(writer, value).catch(function () {});
              });
            }).then(pipeLoop);
          }
          isOrBecomesErrored(_this, reader._closedPromise, function (storedError) {
            if (preventAbort === false) {
              shutdownWithAction(function () {
                return WritableStreamAbort(dest, storedError);
              }, true, storedError);
            } else {
              shutdown(true, storedError);
            }
          });
          isOrBecomesErrored(dest, writer._closedPromise, function (storedError) {
            if (preventCancel === false) {
              shutdownWithAction(function () {
                return ReadableStreamCancel(_this, storedError);
              }, true, storedError);
            } else {
              shutdown(true, storedError);
            }
          });
          isOrBecomesClosed(_this, reader._closedPromise, function () {
            if (preventClose === false) {
              shutdownWithAction(function () {
                return WritableStreamDefaultWriterCloseWithErrorPropagation(writer);
              });
            } else {
              shutdown();
            }
          });
          if (WritableStreamCloseQueuedOrInFlight(dest) === true || dest._state === 'closed') {
            var destClosed = new TypeError('the destination writable stream closed before all data could be piped to it');
            if (preventCancel === false) {
              shutdownWithAction(function () {
                return ReadableStreamCancel(_this, destClosed);
              }, true, destClosed);
            } else {
              shutdown(true, destClosed);
            }
          }
          pipeLoop().catch(function (err) {
            currentWrite = Promise.resolve();
            rethrowAssertionErrorRejection(err);
          });
          function waitForWritesToFinish() {
            var oldCurrentWrite = currentWrite;
            return currentWrite.then(function () {
              return oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : undefined;
            });
          }
          function isOrBecomesErrored(stream, promise, action) {
            if (stream._state === 'errored') {
              action(stream._storedError);
            } else {
              promise.catch(action).catch(rethrowAssertionErrorRejection);
            }
          }
          function isOrBecomesClosed(stream, promise, action) {
            if (stream._state === 'closed') {
              action();
            } else {
              promise.then(action).catch(rethrowAssertionErrorRejection);
            }
          }
          function shutdownWithAction(action, originalIsError, originalError) {
            if (shuttingDown === true) {
              return;
            }
            shuttingDown = true;
            if (dest._state === 'writable' && WritableStreamCloseQueuedOrInFlight(dest) === false) {
              waitForWritesToFinish().then(doTheRest);
            } else {
              doTheRest();
            }
            function doTheRest() {
              action().then(function () {
                return finalize(originalIsError, originalError);
              }, function (newError) {
                return finalize(true, newError);
              }).catch(rethrowAssertionErrorRejection);
            }
          }
          function shutdown(isError, error) {
            if (shuttingDown === true) {
              return;
            }
            shuttingDown = true;
            if (dest._state === 'writable' && WritableStreamCloseQueuedOrInFlight(dest) === false) {
              waitForWritesToFinish().then(function () {
                return finalize(isError, error);
              }).catch(rethrowAssertionErrorRejection);
            } else {
              finalize(isError, error);
            }
          }
          function finalize(isError, error) {
            WritableStreamDefaultWriterRelease(writer);
            ReadableStreamReaderGenericRelease(reader);
            if (isError) {
              reject(error);
            } else {
              resolve(undefined);
            }
          }
        });
      }
    }, {
      key: 'tee',
      value: function tee() {
        if (IsReadableStream(this) === false) {
          throw streamBrandCheckException('tee');
        }
        var branches = ReadableStreamTee(this, false);
        return createArrayFromList(branches);
      }
    }, {
      key: 'locked',
      get: function get() {
        if (IsReadableStream(this) === false) {
          throw streamBrandCheckException('locked');
        }
        return IsReadableStreamLocked(this);
      }
    }]);
    return ReadableStream;
  }();
  module.exports = {
    ReadableStream: ReadableStream,
    IsReadableStreamDisturbed: IsReadableStreamDisturbed,
    ReadableStreamDefaultControllerClose: ReadableStreamDefaultControllerClose,
    ReadableStreamDefaultControllerEnqueue: ReadableStreamDefaultControllerEnqueue,
    ReadableStreamDefaultControllerError: ReadableStreamDefaultControllerError,
    ReadableStreamDefaultControllerGetDesiredSize: ReadableStreamDefaultControllerGetDesiredSize
  };
  function AcquireReadableStreamBYOBReader(stream) {
    return new ReadableStreamBYOBReader(stream);
  }
  function AcquireReadableStreamDefaultReader(stream) {
    return new ReadableStreamDefaultReader(stream);
  }
  function IsReadableStream(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_readableStreamController')) {
      return false;
    }
    return true;
  }
  function IsReadableStreamDisturbed(stream) {
    assert(IsReadableStream(stream) === true, 'IsReadableStreamDisturbed should only be used on known readable streams');
    return stream._disturbed;
  }
  function IsReadableStreamLocked(stream) {
    assert(IsReadableStream(stream) === true, 'IsReadableStreamLocked should only be used on known readable streams');
    if (stream._reader === undefined) {
      return false;
    }
    return true;
  }
  function ReadableStreamTee(stream, cloneForBranch2) {
    assert(IsReadableStream(stream) === true);
    assert(typeof cloneForBranch2 === 'boolean');
    var reader = AcquireReadableStreamDefaultReader(stream);
    var teeState = {
      closedOrErrored: false,
      canceled1: false,
      canceled2: false,
      reason1: undefined,
      reason2: undefined
    };
    teeState.promise = new Promise(function (resolve) {
      teeState._resolve = resolve;
    });
    var pull = create_ReadableStreamTeePullFunction();
    pull._reader = reader;
    pull._teeState = teeState;
    pull._cloneForBranch2 = cloneForBranch2;
    var cancel1 = create_ReadableStreamTeeBranch1CancelFunction();
    cancel1._stream = stream;
    cancel1._teeState = teeState;
    var cancel2 = create_ReadableStreamTeeBranch2CancelFunction();
    cancel2._stream = stream;
    cancel2._teeState = teeState;
    var underlyingSource1 = Object.create(Object.prototype);
    createDataProperty(underlyingSource1, 'pull', pull);
    createDataProperty(underlyingSource1, 'cancel', cancel1);
    var branch1Stream = new ReadableStream(underlyingSource1);
    var underlyingSource2 = Object.create(Object.prototype);
    createDataProperty(underlyingSource2, 'pull', pull);
    createDataProperty(underlyingSource2, 'cancel', cancel2);
    var branch2Stream = new ReadableStream(underlyingSource2);
    pull._branch1 = branch1Stream._readableStreamController;
    pull._branch2 = branch2Stream._readableStreamController;
    reader._closedPromise.catch(function (r) {
      if (teeState.closedOrErrored === true) {
        return;
      }
      ReadableStreamDefaultControllerError(pull._branch1, r);
      ReadableStreamDefaultControllerError(pull._branch2, r);
      teeState.closedOrErrored = true;
    });
    return [branch1Stream, branch2Stream];
  }
  function create_ReadableStreamTeePullFunction() {
    function f() {
      var reader = f._reader,
          branch1 = f._branch1,
          branch2 = f._branch2,
          teeState = f._teeState;
      return ReadableStreamDefaultReaderRead(reader).then(function (result) {
        assert(typeIsObject(result));
        var value = result.value;
        var done = result.done;
        assert(typeof done === 'boolean');
        if (done === true && teeState.closedOrErrored === false) {
          if (teeState.canceled1 === false) {
            ReadableStreamDefaultControllerClose(branch1);
          }
          if (teeState.canceled2 === false) {
            ReadableStreamDefaultControllerClose(branch2);
          }
          teeState.closedOrErrored = true;
        }
        if (teeState.closedOrErrored === true) {
          return;
        }
        var value1 = value;
        var value2 = value;
        if (teeState.canceled1 === false) {
          ReadableStreamDefaultControllerEnqueue(branch1, value1);
        }
        if (teeState.canceled2 === false) {
          ReadableStreamDefaultControllerEnqueue(branch2, value2);
        }
      });
    }
    return f;
  }
  function create_ReadableStreamTeeBranch1CancelFunction() {
    function f(reason) {
      var stream = f._stream,
          teeState = f._teeState;
      teeState.canceled1 = true;
      teeState.reason1 = reason;
      if (teeState.canceled2 === true) {
        var compositeReason = createArrayFromList([teeState.reason1, teeState.reason2]);
        var cancelResult = ReadableStreamCancel(stream, compositeReason);
        teeState._resolve(cancelResult);
      }
      return teeState.promise;
    }
    return f;
  }
  function create_ReadableStreamTeeBranch2CancelFunction() {
    function f(reason) {
      var stream = f._stream,
          teeState = f._teeState;
      teeState.canceled2 = true;
      teeState.reason2 = reason;
      if (teeState.canceled1 === true) {
        var compositeReason = createArrayFromList([teeState.reason1, teeState.reason2]);
        var cancelResult = ReadableStreamCancel(stream, compositeReason);
        teeState._resolve(cancelResult);
      }
      return teeState.promise;
    }
    return f;
  }
  function ReadableStreamAddReadIntoRequest(stream) {
    assert(IsReadableStreamBYOBReader(stream._reader) === true);
    assert(stream._state === 'readable' || stream._state === 'closed');
    var promise = new Promise(function (resolve, reject) {
      var readIntoRequest = {
        _resolve: resolve,
        _reject: reject
      };
      stream._reader._readIntoRequests.push(readIntoRequest);
    });
    return promise;
  }
  function ReadableStreamAddReadRequest(stream) {
    assert(IsReadableStreamDefaultReader(stream._reader) === true);
    assert(stream._state === 'readable');
    var promise = new Promise(function (resolve, reject) {
      var readRequest = {
        _resolve: resolve,
        _reject: reject
      };
      stream._reader._readRequests.push(readRequest);
    });
    return promise;
  }
  function ReadableStreamCancel(stream, reason) {
    stream._disturbed = true;
    if (stream._state === 'closed') {
      return Promise.resolve(undefined);
    }
    if (stream._state === 'errored') {
      return Promise.reject(stream._storedError);
    }
    ReadableStreamClose(stream);
    var sourceCancelPromise = stream._readableStreamController.__cancelSteps(reason);
    return sourceCancelPromise.then(function () {
      return undefined;
    });
  }
  function ReadableStreamClose(stream) {
    assert(stream._state === 'readable');
    stream._state = 'closed';
    var reader = stream._reader;
    if (reader === undefined) {
      return undefined;
    }
    if (IsReadableStreamDefaultReader(reader) === true) {
      for (var i = 0; i < reader._readRequests.length; i++) {
        var _resolve = reader._readRequests[i]._resolve;
        _resolve(CreateIterResultObject(undefined, true));
      }
      reader._readRequests = [];
    }
    defaultReaderClosedPromiseResolve(reader);
    return undefined;
  }
  function ReadableStreamError(stream, e) {
    assert(IsReadableStream(stream) === true, 'stream must be ReadableStream');
    assert(stream._state === 'readable', 'state must be readable');
    stream._state = 'errored';
    stream._storedError = e;
    var reader = stream._reader;
    if (reader === undefined) {
      return undefined;
    }
    if (IsReadableStreamDefaultReader(reader) === true) {
      for (var i = 0; i < reader._readRequests.length; i++) {
        var readRequest = reader._readRequests[i];
        readRequest._reject(e);
      }
      reader._readRequests = [];
    } else {
      assert(IsReadableStreamBYOBReader(reader), 'reader must be ReadableStreamBYOBReader');
      for (var _i = 0; _i < reader._readIntoRequests.length; _i++) {
        var readIntoRequest = reader._readIntoRequests[_i];
        readIntoRequest._reject(e);
      }
      reader._readIntoRequests = [];
    }
    defaultReaderClosedPromiseReject(reader, e);
    reader._closedPromise.catch(function () {});
  }
  function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
    var reader = stream._reader;
    assert(reader._readIntoRequests.length > 0);
    var readIntoRequest = reader._readIntoRequests.shift();
    readIntoRequest._resolve(CreateIterResultObject(chunk, done));
  }
  function ReadableStreamFulfillReadRequest(stream, chunk, done) {
    var reader = stream._reader;
    assert(reader._readRequests.length > 0);
    var readRequest = reader._readRequests.shift();
    readRequest._resolve(CreateIterResultObject(chunk, done));
  }
  function ReadableStreamGetNumReadIntoRequests(stream) {
    return stream._reader._readIntoRequests.length;
  }
  function ReadableStreamGetNumReadRequests(stream) {
    return stream._reader._readRequests.length;
  }
  function ReadableStreamHasBYOBReader(stream) {
    var reader = stream._reader;
    if (reader === undefined) {
      return false;
    }
    if (IsReadableStreamBYOBReader(reader) === false) {
      return false;
    }
    return true;
  }
  function ReadableStreamHasDefaultReader(stream) {
    var reader = stream._reader;
    if (reader === undefined) {
      return false;
    }
    if (IsReadableStreamDefaultReader(reader) === false) {
      return false;
    }
    return true;
  }
  var ReadableStreamDefaultReader = function () {
    function ReadableStreamDefaultReader(stream) {
      _classCallCheck(this, ReadableStreamDefaultReader);
      if (IsReadableStream(stream) === false) {
        throw new TypeError('ReadableStreamDefaultReader can only be constructed with a ReadableStream instance');
      }
      if (IsReadableStreamLocked(stream) === true) {
        throw new TypeError('This stream has already been locked for exclusive reading by another reader');
      }
      ReadableStreamReaderGenericInitialize(this, stream);
      this._readRequests = [];
    }
    _createClass(ReadableStreamDefaultReader, [{
      key: 'cancel',
      value: function cancel(reason) {
        if (IsReadableStreamDefaultReader(this) === false) {
          return Promise.reject(defaultReaderBrandCheckException('cancel'));
        }
        if (this._ownerReadableStream === undefined) {
          return Promise.reject(readerLockException('cancel'));
        }
        return ReadableStreamReaderGenericCancel(this, reason);
      }
    }, {
      key: 'read',
      value: function read() {
        if (IsReadableStreamDefaultReader(this) === false) {
          return Promise.reject(defaultReaderBrandCheckException('read'));
        }
        if (this._ownerReadableStream === undefined) {
          return Promise.reject(readerLockException('read from'));
        }
        return ReadableStreamDefaultReaderRead(this);
      }
    }, {
      key: 'releaseLock',
      value: function releaseLock() {
        if (IsReadableStreamDefaultReader(this) === false) {
          throw defaultReaderBrandCheckException('releaseLock');
        }
        if (this._ownerReadableStream === undefined) {
          return;
        }
        if (this._readRequests.length > 0) {
          throw new TypeError('Tried to release a reader lock when that reader has pending read() calls un-settled');
        }
        ReadableStreamReaderGenericRelease(this);
      }
    }, {
      key: 'closed',
      get: function get() {
        if (IsReadableStreamDefaultReader(this) === false) {
          return Promise.reject(defaultReaderBrandCheckException('closed'));
        }
        return this._closedPromise;
      }
    }]);
    return ReadableStreamDefaultReader;
  }();
  var ReadableStreamBYOBReader = function () {
    function ReadableStreamBYOBReader(stream) {
      _classCallCheck(this, ReadableStreamBYOBReader);
      if (!IsReadableStream(stream)) {
        throw new TypeError('ReadableStreamBYOBReader can only be constructed with a ReadableStream instance given a ' + 'byte source');
      }
      if (IsReadableByteStreamController(stream._readableStreamController) === false) {
        throw new TypeError('Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte ' + 'source');
      }
      if (IsReadableStreamLocked(stream)) {
        throw new TypeError('This stream has already been locked for exclusive reading by another reader');
      }
      ReadableStreamReaderGenericInitialize(this, stream);
      this._readIntoRequests = [];
    }
    _createClass(ReadableStreamBYOBReader, [{
      key: 'cancel',
      value: function cancel(reason) {
        if (!IsReadableStreamBYOBReader(this)) {
          return Promise.reject(byobReaderBrandCheckException('cancel'));
        }
        if (this._ownerReadableStream === undefined) {
          return Promise.reject(readerLockException('cancel'));
        }
        return ReadableStreamReaderGenericCancel(this, reason);
      }
    }, {
      key: 'read',
      value: function read(view) {
        if (!IsReadableStreamBYOBReader(this)) {
          return Promise.reject(byobReaderBrandCheckException('read'));
        }
        if (this._ownerReadableStream === undefined) {
          return Promise.reject(readerLockException('read from'));
        }
        if (!ArrayBuffer.isView(view)) {
          return Promise.reject(new TypeError('view must be an array buffer view'));
        }
        if (view.byteLength === 0) {
          return Promise.reject(new TypeError('view must have non-zero byteLength'));
        }
        return ReadableStreamBYOBReaderRead(this, view);
      }
    }, {
      key: 'releaseLock',
      value: function releaseLock() {
        if (!IsReadableStreamBYOBReader(this)) {
          throw byobReaderBrandCheckException('releaseLock');
        }
        if (this._ownerReadableStream === undefined) {
          return;
        }
        if (this._readIntoRequests.length > 0) {
          throw new TypeError('Tried to release a reader lock when that reader has pending read() calls un-settled');
        }
        ReadableStreamReaderGenericRelease(this);
      }
    }, {
      key: 'closed',
      get: function get() {
        if (!IsReadableStreamBYOBReader(this)) {
          return Promise.reject(byobReaderBrandCheckException('closed'));
        }
        return this._closedPromise;
      }
    }]);
    return ReadableStreamBYOBReader;
  }();
  function IsReadableStreamBYOBReader(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_readIntoRequests')) {
      return false;
    }
    return true;
  }
  function IsReadableStreamDefaultReader(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_readRequests')) {
      return false;
    }
    return true;
  }
  function ReadableStreamReaderGenericInitialize(reader, stream) {
    reader._ownerReadableStream = stream;
    stream._reader = reader;
    if (stream._state === 'readable') {
      defaultReaderClosedPromiseInitialize(reader);
    } else if (stream._state === 'closed') {
      defaultReaderClosedPromiseInitializeAsResolved(reader);
    } else {
      assert(stream._state === 'errored', 'state must be errored');
      defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
      reader._closedPromise.catch(function () {});
    }
  }
  function ReadableStreamReaderGenericCancel(reader, reason) {
    var stream = reader._ownerReadableStream;
    assert(stream !== undefined);
    return ReadableStreamCancel(stream, reason);
  }
  function ReadableStreamReaderGenericRelease(reader) {
    assert(reader._ownerReadableStream !== undefined);
    assert(reader._ownerReadableStream._reader === reader);
    if (reader._ownerReadableStream._state === 'readable') {
      defaultReaderClosedPromiseReject(reader, new TypeError('Reader was released and can no longer be used to monitor the stream\'s closedness'));
    } else {
      defaultReaderClosedPromiseResetToRejected(reader, new TypeError('Reader was released and can no longer be used to monitor the stream\'s closedness'));
    }
    reader._closedPromise.catch(function () {});
    reader._ownerReadableStream._reader = undefined;
    reader._ownerReadableStream = undefined;
  }
  function ReadableStreamBYOBReaderRead(reader, view) {
    var stream = reader._ownerReadableStream;
    assert(stream !== undefined);
    stream._disturbed = true;
    if (stream._state === 'errored') {
      return Promise.reject(stream._storedError);
    }
    return ReadableByteStreamControllerPullInto(stream._readableStreamController, view);
  }
  function ReadableStreamDefaultReaderRead(reader) {
    var stream = reader._ownerReadableStream;
    assert(stream !== undefined);
    stream._disturbed = true;
    if (stream._state === 'closed') {
      return Promise.resolve(CreateIterResultObject(undefined, true));
    }
    if (stream._state === 'errored') {
      return Promise.reject(stream._storedError);
    }
    assert(stream._state === 'readable');
    return stream._readableStreamController.__pullSteps();
  }
  var ReadableStreamDefaultController = function () {
    function ReadableStreamDefaultController(stream, underlyingSource, size, highWaterMark) {
      _classCallCheck(this, ReadableStreamDefaultController);
      if (IsReadableStream(stream) === false) {
        throw new TypeError('ReadableStreamDefaultController can only be constructed with a ReadableStream instance');
      }
      if (stream._readableStreamController !== undefined) {
        throw new TypeError('ReadableStreamDefaultController instances can only be created by the ReadableStream constructor');
      }
      this._controlledReadableStream = stream;
      this._underlyingSource = underlyingSource;
      this._queue = undefined;
      this._queueTotalSize = undefined;
      ResetQueue(this);
      this._started = false;
      this._closeRequested = false;
      this._pullAgain = false;
      this._pulling = false;
      var normalizedStrategy = ValidateAndNormalizeQueuingStrategy(size, highWaterMark);
      this._strategySize = normalizedStrategy.size;
      this._strategyHWM = normalizedStrategy.highWaterMark;
      var controller = this;
      var startResult = InvokeOrNoop(underlyingSource, 'start', [this]);
      Promise.resolve(startResult).then(function () {
        controller._started = true;
        assert(controller._pulling === false);
        assert(controller._pullAgain === false);
        ReadableStreamDefaultControllerCallPullIfNeeded(controller);
      }, function (r) {
        ReadableStreamDefaultControllerErrorIfNeeded(controller, r);
      }).catch(rethrowAssertionErrorRejection);
    }
    _createClass(ReadableStreamDefaultController, [{
      key: 'close',
      value: function close() {
        if (IsReadableStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('close');
        }
        if (this._closeRequested === true) {
          throw new TypeError('The stream has already been closed; do not close it again!');
        }
        var state = this._controlledReadableStream._state;
        if (state !== 'readable') {
          throw new TypeError('The stream (in ' + state + ' state) is not in the readable state and cannot be closed');
        }
        ReadableStreamDefaultControllerClose(this);
      }
    }, {
      key: 'enqueue',
      value: function enqueue(chunk) {
        if (IsReadableStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('enqueue');
        }
        if (this._closeRequested === true) {
          throw new TypeError('stream is closed or draining');
        }
        var state = this._controlledReadableStream._state;
        if (state !== 'readable') {
          throw new TypeError('The stream (in ' + state + ' state) is not in the readable state and cannot be enqueued to');
        }
        return ReadableStreamDefaultControllerEnqueue(this, chunk);
      }
    }, {
      key: 'error',
      value: function error(e) {
        if (IsReadableStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('error');
        }
        var stream = this._controlledReadableStream;
        if (stream._state !== 'readable') {
          throw new TypeError('The stream is ' + stream._state + ' and so cannot be errored');
        }
        ReadableStreamDefaultControllerError(this, e);
      }
    }, {
      key: '__cancelSteps',
      value: function __cancelSteps(reason) {
        ResetQueue(this);
        return PromiseInvokeOrNoop(this._underlyingSource, 'cancel', [reason]);
      }
    }, {
      key: '__pullSteps',
      value: function __pullSteps() {
        var stream = this._controlledReadableStream;
        if (this._queue.length > 0) {
          var chunk = DequeueValue(this);
          if (this._closeRequested === true && this._queue.length === 0) {
            ReadableStreamClose(stream);
          } else {
            ReadableStreamDefaultControllerCallPullIfNeeded(this);
          }
          return Promise.resolve(CreateIterResultObject(chunk, false));
        }
        var pendingPromise = ReadableStreamAddReadRequest(stream);
        ReadableStreamDefaultControllerCallPullIfNeeded(this);
        return pendingPromise;
      }
    }, {
      key: 'desiredSize',
      get: function get() {
        if (IsReadableStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('desiredSize');
        }
        return ReadableStreamDefaultControllerGetDesiredSize(this);
      }
    }]);
    return ReadableStreamDefaultController;
  }();
  function IsReadableStreamDefaultController(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_underlyingSource')) {
      return false;
    }
    return true;
  }
  function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
    var shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
    if (shouldPull === false) {
      return undefined;
    }
    if (controller._pulling === true) {
      controller._pullAgain = true;
      return undefined;
    }
    assert(controller._pullAgain === false);
    controller._pulling = true;
    var pullPromise = PromiseInvokeOrNoop(controller._underlyingSource, 'pull', [controller]);
    pullPromise.then(function () {
      controller._pulling = false;
      if (controller._pullAgain === true) {
        controller._pullAgain = false;
        return ReadableStreamDefaultControllerCallPullIfNeeded(controller);
      }
      return undefined;
    }, function (e) {
      ReadableStreamDefaultControllerErrorIfNeeded(controller, e);
    }).catch(rethrowAssertionErrorRejection);
    return undefined;
  }
  function ReadableStreamDefaultControllerShouldCallPull(controller) {
    var stream = controller._controlledReadableStream;
    if (stream._state === 'closed' || stream._state === 'errored') {
      return false;
    }
    if (controller._closeRequested === true) {
      return false;
    }
    if (controller._started === false) {
      return false;
    }
    if (IsReadableStreamLocked(stream) === true && ReadableStreamGetNumReadRequests(stream) > 0) {
      return true;
    }
    var desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
    if (desiredSize > 0) {
      return true;
    }
    return false;
  }
  function ReadableStreamDefaultControllerClose(controller) {
    var stream = controller._controlledReadableStream;
    assert(controller._closeRequested === false);
    assert(stream._state === 'readable');
    controller._closeRequested = true;
    if (controller._queue.length === 0) {
      ReadableStreamClose(stream);
    }
  }
  function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
    var stream = controller._controlledReadableStream;
    assert(controller._closeRequested === false);
    assert(stream._state === 'readable');
    if (IsReadableStreamLocked(stream) === true && ReadableStreamGetNumReadRequests(stream) > 0) {
      ReadableStreamFulfillReadRequest(stream, chunk, false);
    } else {
      var chunkSize = 1;
      if (controller._strategySize !== undefined) {
        var strategySize = controller._strategySize;
        try {
          chunkSize = strategySize(chunk);
        } catch (chunkSizeE) {
          ReadableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
          throw chunkSizeE;
        }
      }
      try {
        EnqueueValueWithSize(controller, chunk, chunkSize);
      } catch (enqueueE) {
        ReadableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
        throw enqueueE;
      }
    }
    ReadableStreamDefaultControllerCallPullIfNeeded(controller);
    return undefined;
  }
  function ReadableStreamDefaultControllerError(controller, e) {
    var stream = controller._controlledReadableStream;
    assert(stream._state === 'readable');
    ResetQueue(controller);
    ReadableStreamError(stream, e);
  }
  function ReadableStreamDefaultControllerErrorIfNeeded(controller, e) {
    if (controller._controlledReadableStream._state === 'readable') {
      ReadableStreamDefaultControllerError(controller, e);
    }
  }
  function ReadableStreamDefaultControllerGetDesiredSize(controller) {
    var stream = controller._controlledReadableStream;
    var state = stream._state;
    if (state === 'errored') {
      return null;
    }
    if (state === 'closed') {
      return 0;
    }
    return controller._strategyHWM - controller._queueTotalSize;
  }
  var ReadableStreamBYOBRequest = function () {
    function ReadableStreamBYOBRequest(controller, view) {
      _classCallCheck(this, ReadableStreamBYOBRequest);
      this._associatedReadableByteStreamController = controller;
      this._view = view;
    }
    _createClass(ReadableStreamBYOBRequest, [{
      key: 'respond',
      value: function respond(bytesWritten) {
        if (IsReadableStreamBYOBRequest(this) === false) {
          throw byobRequestBrandCheckException('respond');
        }
        if (this._associatedReadableByteStreamController === undefined) {
          throw new TypeError('This BYOB request has been invalidated');
        }
        ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
      }
    }, {
      key: 'respondWithNewView',
      value: function respondWithNewView(view) {
        if (IsReadableStreamBYOBRequest(this) === false) {
          throw byobRequestBrandCheckException('respond');
        }
        if (this._associatedReadableByteStreamController === undefined) {
          throw new TypeError('This BYOB request has been invalidated');
        }
        if (!ArrayBuffer.isView(view)) {
          throw new TypeError('You can only respond with array buffer views');
        }
        ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
      }
    }, {
      key: 'view',
      get: function get() {
        return this._view;
      }
    }]);
    return ReadableStreamBYOBRequest;
  }();
  var ReadableByteStreamController = function () {
    function ReadableByteStreamController(stream, underlyingByteSource, highWaterMark) {
      _classCallCheck(this, ReadableByteStreamController);
      if (IsReadableStream(stream) === false) {
        throw new TypeError('ReadableByteStreamController can only be constructed with a ReadableStream instance given ' + 'a byte source');
      }
      if (stream._readableStreamController !== undefined) {
        throw new TypeError('ReadableByteStreamController instances can only be created by the ReadableStream constructor given a byte ' + 'source');
      }
      this._controlledReadableStream = stream;
      this._underlyingByteSource = underlyingByteSource;
      this._pullAgain = false;
      this._pulling = false;
      ReadableByteStreamControllerClearPendingPullIntos(this);
      this._queue = this._queueTotalSize = undefined;
      ResetQueue(this);
      this._closeRequested = false;
      this._started = false;
      this._strategyHWM = ValidateAndNormalizeHighWaterMark(highWaterMark);
      var autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
      if (autoAllocateChunkSize !== undefined) {
        if (Number.isInteger(autoAllocateChunkSize) === false || autoAllocateChunkSize <= 0) {
          throw new RangeError('autoAllocateChunkSize must be a positive integer');
        }
      }
      this._autoAllocateChunkSize = autoAllocateChunkSize;
      this._pendingPullIntos = [];
      var controller = this;
      var startResult = InvokeOrNoop(underlyingByteSource, 'start', [this]);
      Promise.resolve(startResult).then(function () {
        controller._started = true;
        assert(controller._pulling === false);
        assert(controller._pullAgain === false);
        ReadableByteStreamControllerCallPullIfNeeded(controller);
      }, function (r) {
        if (stream._state === 'readable') {
          ReadableByteStreamControllerError(controller, r);
        }
      }).catch(rethrowAssertionErrorRejection);
    }
    _createClass(ReadableByteStreamController, [{
      key: 'close',
      value: function close() {
        if (IsReadableByteStreamController(this) === false) {
          throw byteStreamControllerBrandCheckException('close');
        }
        if (this._closeRequested === true) {
          throw new TypeError('The stream has already been closed; do not close it again!');
        }
        var state = this._controlledReadableStream._state;
        if (state !== 'readable') {
          throw new TypeError('The stream (in ' + state + ' state) is not in the readable state and cannot be closed');
        }
        ReadableByteStreamControllerClose(this);
      }
    }, {
      key: 'enqueue',
      value: function enqueue(chunk) {
        if (IsReadableByteStreamController(this) === false) {
          throw byteStreamControllerBrandCheckException('enqueue');
        }
        if (this._closeRequested === true) {
          throw new TypeError('stream is closed or draining');
        }
        var state = this._controlledReadableStream._state;
        if (state !== 'readable') {
          throw new TypeError('The stream (in ' + state + ' state) is not in the readable state and cannot be enqueued to');
        }
        if (!ArrayBuffer.isView(chunk)) {
          throw new TypeError('You can only enqueue array buffer views when using a ReadableByteStreamController');
        }
        ReadableByteStreamControllerEnqueue(this, chunk);
      }
    }, {
      key: 'error',
      value: function error(e) {
        if (IsReadableByteStreamController(this) === false) {
          throw byteStreamControllerBrandCheckException('error');
        }
        var stream = this._controlledReadableStream;
        if (stream._state !== 'readable') {
          throw new TypeError('The stream is ' + stream._state + ' and so cannot be errored');
        }
        ReadableByteStreamControllerError(this, e);
      }
    }, {
      key: '__cancelSteps',
      value: function __cancelSteps(reason) {
        if (this._pendingPullIntos.length > 0) {
          var firstDescriptor = this._pendingPullIntos[0];
          firstDescriptor.bytesFilled = 0;
        }
        ResetQueue(this);
        return PromiseInvokeOrNoop(this._underlyingByteSource, 'cancel', [reason]);
      }
    }, {
      key: '__pullSteps',
      value: function __pullSteps() {
        var stream = this._controlledReadableStream;
        assert(ReadableStreamHasDefaultReader(stream) === true);
        if (this._queueTotalSize > 0) {
          assert(ReadableStreamGetNumReadRequests(stream) === 0);
          var entry = this._queue.shift();
          this._queueTotalSize -= entry.byteLength;
          ReadableByteStreamControllerHandleQueueDrain(this);
          var view = void 0;
          try {
            view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
          } catch (viewE) {
            return Promise.reject(viewE);
          }
          return Promise.resolve(CreateIterResultObject(view, false));
        }
        var autoAllocateChunkSize = this._autoAllocateChunkSize;
        if (autoAllocateChunkSize !== undefined) {
          var buffer = void 0;
          try {
            buffer = new ArrayBuffer(autoAllocateChunkSize);
          } catch (bufferE) {
            return Promise.reject(bufferE);
          }
          var pullIntoDescriptor = {
            buffer: buffer,
            byteOffset: 0,
            byteLength: autoAllocateChunkSize,
            bytesFilled: 0,
            elementSize: 1,
            ctor: Uint8Array,
            readerType: 'default'
          };
          this._pendingPullIntos.push(pullIntoDescriptor);
        }
        var promise = ReadableStreamAddReadRequest(stream);
        ReadableByteStreamControllerCallPullIfNeeded(this);
        return promise;
      }
    }, {
      key: 'byobRequest',
      get: function get() {
        if (IsReadableByteStreamController(this) === false) {
          throw byteStreamControllerBrandCheckException('byobRequest');
        }
        if (this._byobRequest === undefined && this._pendingPullIntos.length > 0) {
          var firstDescriptor = this._pendingPullIntos[0];
          var view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
          this._byobRequest = new ReadableStreamBYOBRequest(this, view);
        }
        return this._byobRequest;
      }
    }, {
      key: 'desiredSize',
      get: function get() {
        if (IsReadableByteStreamController(this) === false) {
          throw byteStreamControllerBrandCheckException('desiredSize');
        }
        return ReadableByteStreamControllerGetDesiredSize(this);
      }
    }]);
    return ReadableByteStreamController;
  }();
  function IsReadableByteStreamController(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_underlyingByteSource')) {
      return false;
    }
    return true;
  }
  function IsReadableStreamBYOBRequest(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_associatedReadableByteStreamController')) {
      return false;
    }
    return true;
  }
  function ReadableByteStreamControllerCallPullIfNeeded(controller) {
    var shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
    if (shouldPull === false) {
      return undefined;
    }
    if (controller._pulling === true) {
      controller._pullAgain = true;
      return undefined;
    }
    assert(controller._pullAgain === false);
    controller._pulling = true;
    var pullPromise = PromiseInvokeOrNoop(controller._underlyingByteSource, 'pull', [controller]);
    pullPromise.then(function () {
      controller._pulling = false;
      if (controller._pullAgain === true) {
        controller._pullAgain = false;
        ReadableByteStreamControllerCallPullIfNeeded(controller);
      }
    }, function (e) {
      if (controller._controlledReadableStream._state === 'readable') {
        ReadableByteStreamControllerError(controller, e);
      }
    }).catch(rethrowAssertionErrorRejection);
    return undefined;
  }
  function ReadableByteStreamControllerClearPendingPullIntos(controller) {
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    controller._pendingPullIntos = [];
  }
  function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
    assert(stream._state !== 'errored', 'state must not be errored');
    var done = false;
    if (stream._state === 'closed') {
      assert(pullIntoDescriptor.bytesFilled === 0);
      done = true;
    }
    var filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
    if (pullIntoDescriptor.readerType === 'default') {
      ReadableStreamFulfillReadRequest(stream, filledView, done);
    } else {
      assert(pullIntoDescriptor.readerType === 'byob');
      ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
    }
  }
  function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
    var bytesFilled = pullIntoDescriptor.bytesFilled;
    var elementSize = pullIntoDescriptor.elementSize;
    assert(bytesFilled <= pullIntoDescriptor.byteLength);
    assert(bytesFilled % elementSize === 0);
    return new pullIntoDescriptor.ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
  }
  function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
    controller._queue.push({
      buffer: buffer,
      byteOffset: byteOffset,
      byteLength: byteLength
    });
    controller._queueTotalSize += byteLength;
  }
  function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
    var elementSize = pullIntoDescriptor.elementSize;
    var currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
    var maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
    var maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
    var maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
    var totalBytesToCopyRemaining = maxBytesToCopy;
    var ready = false;
    if (maxAlignedBytes > currentAlignedBytes) {
      totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
      ready = true;
    }
    var queue = controller._queue;
    while (totalBytesToCopyRemaining > 0) {
      var headOfQueue = queue[0];
      var bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
      var destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
      ArrayBufferCopy(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
      if (headOfQueue.byteLength === bytesToCopy) {
        queue.shift();
      } else {
        headOfQueue.byteOffset += bytesToCopy;
        headOfQueue.byteLength -= bytesToCopy;
      }
      controller._queueTotalSize -= bytesToCopy;
      ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
      totalBytesToCopyRemaining -= bytesToCopy;
    }
    if (ready === false) {
      assert(controller._queueTotalSize === 0, 'queue must be empty');
      assert(pullIntoDescriptor.bytesFilled > 0);
      assert(pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize);
    }
    return ready;
  }
  function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
    assert(controller._pendingPullIntos.length === 0 || controller._pendingPullIntos[0] === pullIntoDescriptor);
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    pullIntoDescriptor.bytesFilled += size;
  }
  function ReadableByteStreamControllerHandleQueueDrain(controller) {
    assert(controller._controlledReadableStream._state === 'readable');
    if (controller._queueTotalSize === 0 && controller._closeRequested === true) {
      ReadableStreamClose(controller._controlledReadableStream);
    } else {
      ReadableByteStreamControllerCallPullIfNeeded(controller);
    }
  }
  function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
    if (controller._byobRequest === undefined) {
      return;
    }
    controller._byobRequest._associatedReadableByteStreamController = undefined;
    controller._byobRequest._view = undefined;
    controller._byobRequest = undefined;
  }
  function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
    assert(controller._closeRequested === false);
    while (controller._pendingPullIntos.length > 0) {
      if (controller._queueTotalSize === 0) {
        return;
      }
      var pullIntoDescriptor = controller._pendingPullIntos[0];
      if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) === true) {
        ReadableByteStreamControllerShiftPendingPullInto(controller);
        ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableStream, pullIntoDescriptor);
      }
    }
  }
  function ReadableByteStreamControllerPullInto(controller, view) {
    var stream = controller._controlledReadableStream;
    var elementSize = 1;
    if (view.constructor !== DataView) {
      elementSize = view.constructor.BYTES_PER_ELEMENT;
    }
    var ctor = view.constructor;
    var pullIntoDescriptor = {
      buffer: view.buffer,
      byteOffset: view.byteOffset,
      byteLength: view.byteLength,
      bytesFilled: 0,
      elementSize: elementSize,
      ctor: ctor,
      readerType: 'byob'
    };
    if (controller._pendingPullIntos.length > 0) {
      pullIntoDescriptor.buffer = TransferArrayBuffer(pullIntoDescriptor.buffer);
      controller._pendingPullIntos.push(pullIntoDescriptor);
      return ReadableStreamAddReadIntoRequest(stream);
    }
    if (stream._state === 'closed') {
      var emptyView = new view.constructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
      return Promise.resolve(CreateIterResultObject(emptyView, true));
    }
    if (controller._queueTotalSize > 0) {
      if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) === true) {
        var filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
        ReadableByteStreamControllerHandleQueueDrain(controller);
        return Promise.resolve(CreateIterResultObject(filledView, false));
      }
      if (controller._closeRequested === true) {
        var e = new TypeError('Insufficient bytes to fill elements in the given buffer');
        ReadableByteStreamControllerError(controller, e);
        return Promise.reject(e);
      }
    }
    pullIntoDescriptor.buffer = TransferArrayBuffer(pullIntoDescriptor.buffer);
    controller._pendingPullIntos.push(pullIntoDescriptor);
    var promise = ReadableStreamAddReadIntoRequest(stream);
    ReadableByteStreamControllerCallPullIfNeeded(controller);
    return promise;
  }
  function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
    firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
    assert(firstDescriptor.bytesFilled === 0, 'bytesFilled must be 0');
    var stream = controller._controlledReadableStream;
    if (ReadableStreamHasBYOBReader(stream) === true) {
      while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
        var pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
        ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
      }
    }
  }
  function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
    if (pullIntoDescriptor.bytesFilled + bytesWritten > pullIntoDescriptor.byteLength) {
      throw new RangeError('bytesWritten out of range');
    }
    ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
    if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
      return;
    }
    ReadableByteStreamControllerShiftPendingPullInto(controller);
    var remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
    if (remainderSize > 0) {
      var end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
      var remainder = pullIntoDescriptor.buffer.slice(end - remainderSize, end);
      ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
    }
    pullIntoDescriptor.buffer = TransferArrayBuffer(pullIntoDescriptor.buffer);
    pullIntoDescriptor.bytesFilled -= remainderSize;
    ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableStream, pullIntoDescriptor);
    ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
  }
  function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
    var firstDescriptor = controller._pendingPullIntos[0];
    var stream = controller._controlledReadableStream;
    if (stream._state === 'closed') {
      if (bytesWritten !== 0) {
        throw new TypeError('bytesWritten must be 0 when calling respond() on a closed stream');
      }
      ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor);
    } else {
      assert(stream._state === 'readable');
      ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
    }
  }
  function ReadableByteStreamControllerShiftPendingPullInto(controller) {
    var descriptor = controller._pendingPullIntos.shift();
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    return descriptor;
  }
  function ReadableByteStreamControllerShouldCallPull(controller) {
    var stream = controller._controlledReadableStream;
    if (stream._state !== 'readable') {
      return false;
    }
    if (controller._closeRequested === true) {
      return false;
    }
    if (controller._started === false) {
      return false;
    }
    if (ReadableStreamHasDefaultReader(stream) === true && ReadableStreamGetNumReadRequests(stream) > 0) {
      return true;
    }
    if (ReadableStreamHasBYOBReader(stream) === true && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
      return true;
    }
    if (ReadableByteStreamControllerGetDesiredSize(controller) > 0) {
      return true;
    }
    return false;
  }
  function ReadableByteStreamControllerClose(controller) {
    var stream = controller._controlledReadableStream;
    assert(controller._closeRequested === false);
    assert(stream._state === 'readable');
    if (controller._queueTotalSize > 0) {
      controller._closeRequested = true;
      return;
    }
    if (controller._pendingPullIntos.length > 0) {
      var firstPendingPullInto = controller._pendingPullIntos[0];
      if (firstPendingPullInto.bytesFilled > 0) {
        var e = new TypeError('Insufficient bytes to fill elements in the given buffer');
        ReadableByteStreamControllerError(controller, e);
        throw e;
      }
    }
    ReadableStreamClose(stream);
  }
  function ReadableByteStreamControllerEnqueue(controller, chunk) {
    var stream = controller._controlledReadableStream;
    assert(controller._closeRequested === false);
    assert(stream._state === 'readable');
    var buffer = chunk.buffer;
    var byteOffset = chunk.byteOffset;
    var byteLength = chunk.byteLength;
    var transferredBuffer = TransferArrayBuffer(buffer);
    if (ReadableStreamHasDefaultReader(stream) === true) {
      if (ReadableStreamGetNumReadRequests(stream) === 0) {
        ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
      } else {
        assert(controller._queue.length === 0);
        var transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
        ReadableStreamFulfillReadRequest(stream, transferredView, false);
      }
    } else if (ReadableStreamHasBYOBReader(stream) === true) {
      ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
      ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
    } else {
      assert(IsReadableStreamLocked(stream) === false, 'stream must not be locked');
      ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
    }
  }
  function ReadableByteStreamControllerError(controller, e) {
    var stream = controller._controlledReadableStream;
    assert(stream._state === 'readable');
    ReadableByteStreamControllerClearPendingPullIntos(controller);
    ResetQueue(controller);
    ReadableStreamError(stream, e);
  }
  function ReadableByteStreamControllerGetDesiredSize(controller) {
    var stream = controller._controlledReadableStream;
    var state = stream._state;
    if (state === 'errored') {
      return null;
    }
    if (state === 'closed') {
      return 0;
    }
    return controller._strategyHWM - controller._queueTotalSize;
  }
  function ReadableByteStreamControllerRespond(controller, bytesWritten) {
    bytesWritten = Number(bytesWritten);
    if (IsFiniteNonNegativeNumber(bytesWritten) === false) {
      throw new RangeError('bytesWritten must be a finite');
    }
    assert(controller._pendingPullIntos.length > 0);
    ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
  }
  function ReadableByteStreamControllerRespondWithNewView(controller, view) {
    assert(controller._pendingPullIntos.length > 0);
    var firstDescriptor = controller._pendingPullIntos[0];
    if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
      throw new RangeError('The region specified by view does not match byobRequest');
    }
    if (firstDescriptor.byteLength !== view.byteLength) {
      throw new RangeError('The buffer of view has different capacity than byobRequest');
    }
    firstDescriptor.buffer = view.buffer;
    ReadableByteStreamControllerRespondInternal(controller, view.byteLength);
  }
  function streamBrandCheckException(name) {
    return new TypeError('ReadableStream.prototype.' + name + ' can only be used on a ReadableStream');
  }
  function readerLockException(name) {
    return new TypeError('Cannot ' + name + ' a stream using a released reader');
  }
  function defaultReaderBrandCheckException(name) {
    return new TypeError('ReadableStreamDefaultReader.prototype.' + name + ' can only be used on a ReadableStreamDefaultReader');
  }
  function defaultReaderClosedPromiseInitialize(reader) {
    reader._closedPromise = new Promise(function (resolve, reject) {
      reader._closedPromise_resolve = resolve;
      reader._closedPromise_reject = reject;
    });
  }
  function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
    reader._closedPromise = Promise.reject(reason);
    reader._closedPromise_resolve = undefined;
    reader._closedPromise_reject = undefined;
  }
  function defaultReaderClosedPromiseInitializeAsResolved(reader) {
    reader._closedPromise = Promise.resolve(undefined);
    reader._closedPromise_resolve = undefined;
    reader._closedPromise_reject = undefined;
  }
  function defaultReaderClosedPromiseReject(reader, reason) {
    assert(reader._closedPromise_resolve !== undefined);
    assert(reader._closedPromise_reject !== undefined);
    reader._closedPromise_reject(reason);
    reader._closedPromise_resolve = undefined;
    reader._closedPromise_reject = undefined;
  }
  function defaultReaderClosedPromiseResetToRejected(reader, reason) {
    assert(reader._closedPromise_resolve === undefined);
    assert(reader._closedPromise_reject === undefined);
    reader._closedPromise = Promise.reject(reason);
  }
  function defaultReaderClosedPromiseResolve(reader) {
    assert(reader._closedPromise_resolve !== undefined);
    assert(reader._closedPromise_reject !== undefined);
    reader._closedPromise_resolve(undefined);
    reader._closedPromise_resolve = undefined;
    reader._closedPromise_reject = undefined;
  }
  function byobReaderBrandCheckException(name) {
    return new TypeError('ReadableStreamBYOBReader.prototype.' + name + ' can only be used on a ReadableStreamBYOBReader');
  }
  function defaultControllerBrandCheckException(name) {
    return new TypeError('ReadableStreamDefaultController.prototype.' + name + ' can only be used on a ReadableStreamDefaultController');
  }
  function byobRequestBrandCheckException(name) {
    return new TypeError('ReadableStreamBYOBRequest.prototype.' + name + ' can only be used on a ReadableStreamBYOBRequest');
  }
  function byteStreamControllerBrandCheckException(name) {
    return new TypeError('ReadableByteStreamController.prototype.' + name + ' can only be used on a ReadableByteStreamController');
  }
  function ifIsObjectAndHasAPromiseIsHandledInternalSlotSetPromiseIsHandledToTrue(promise) {
    try {
      Promise.prototype.then.call(promise, undefined, function () {});
    } catch (e) {}
  }
}, function (module, exports, __w_pdfjs_require__) {
  "use strict";

  var transformStream = __w_pdfjs_require__(6);
  var readableStream = __w_pdfjs_require__(4);
  var writableStream = __w_pdfjs_require__(2);
  exports.TransformStream = transformStream.TransformStream;
  exports.ReadableStream = readableStream.ReadableStream;
  exports.IsReadableStreamDisturbed = readableStream.IsReadableStreamDisturbed;
  exports.ReadableStreamDefaultControllerClose = readableStream.ReadableStreamDefaultControllerClose;
  exports.ReadableStreamDefaultControllerEnqueue = readableStream.ReadableStreamDefaultControllerEnqueue;
  exports.ReadableStreamDefaultControllerError = readableStream.ReadableStreamDefaultControllerError;
  exports.ReadableStreamDefaultControllerGetDesiredSize = readableStream.ReadableStreamDefaultControllerGetDesiredSize;
  exports.AcquireWritableStreamDefaultWriter = writableStream.AcquireWritableStreamDefaultWriter;
  exports.IsWritableStream = writableStream.IsWritableStream;
  exports.IsWritableStreamLocked = writableStream.IsWritableStreamLocked;
  exports.WritableStream = writableStream.WritableStream;
  exports.WritableStreamAbort = writableStream.WritableStreamAbort;
  exports.WritableStreamDefaultControllerError = writableStream.WritableStreamDefaultControllerError;
  exports.WritableStreamDefaultWriterCloseWithErrorPropagation = writableStream.WritableStreamDefaultWriterCloseWithErrorPropagation;
  exports.WritableStreamDefaultWriterRelease = writableStream.WritableStreamDefaultWriterRelease;
  exports.WritableStreamDefaultWriterWrite = writableStream.WritableStreamDefaultWriterWrite;
}, function (module, exports, __w_pdfjs_require__) {
  "use strict";

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  var _require = __w_pdfjs_require__(1),
      assert = _require.assert;
  var _require2 = __w_pdfjs_require__(0),
      InvokeOrNoop = _require2.InvokeOrNoop,
      PromiseInvokeOrPerformFallback = _require2.PromiseInvokeOrPerformFallback,
      PromiseInvokeOrNoop = _require2.PromiseInvokeOrNoop,
      typeIsObject = _require2.typeIsObject;
  var _require3 = __w_pdfjs_require__(4),
      ReadableStream = _require3.ReadableStream,
      ReadableStreamDefaultControllerClose = _require3.ReadableStreamDefaultControllerClose,
      ReadableStreamDefaultControllerEnqueue = _require3.ReadableStreamDefaultControllerEnqueue,
      ReadableStreamDefaultControllerError = _require3.ReadableStreamDefaultControllerError,
      ReadableStreamDefaultControllerGetDesiredSize = _require3.ReadableStreamDefaultControllerGetDesiredSize;
  var _require4 = __w_pdfjs_require__(2),
      WritableStream = _require4.WritableStream,
      WritableStreamDefaultControllerError = _require4.WritableStreamDefaultControllerError;
  function TransformStreamCloseReadable(transformStream) {
    if (transformStream._errored === true) {
      throw new TypeError('TransformStream is already errored');
    }
    if (transformStream._readableClosed === true) {
      throw new TypeError('Readable side is already closed');
    }
    TransformStreamCloseReadableInternal(transformStream);
  }
  function TransformStreamEnqueueToReadable(transformStream, chunk) {
    if (transformStream._errored === true) {
      throw new TypeError('TransformStream is already errored');
    }
    if (transformStream._readableClosed === true) {
      throw new TypeError('Readable side is already closed');
    }
    var controller = transformStream._readableController;
    try {
      ReadableStreamDefaultControllerEnqueue(controller, chunk);
    } catch (e) {
      transformStream._readableClosed = true;
      TransformStreamErrorIfNeeded(transformStream, e);
      throw transformStream._storedError;
    }
    var desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
    var maybeBackpressure = desiredSize <= 0;
    if (maybeBackpressure === true && transformStream._backpressure === false) {
      TransformStreamSetBackpressure(transformStream, true);
    }
  }
  function TransformStreamError(transformStream, e) {
    if (transformStream._errored === true) {
      throw new TypeError('TransformStream is already errored');
    }
    TransformStreamErrorInternal(transformStream, e);
  }
  function TransformStreamCloseReadableInternal(transformStream) {
    assert(transformStream._errored === false);
    assert(transformStream._readableClosed === false);
    try {
      ReadableStreamDefaultControllerClose(transformStream._readableController);
    } catch (e) {
      assert(false);
    }
    transformStream._readableClosed = true;
  }
  function TransformStreamErrorIfNeeded(transformStream, e) {
    if (transformStream._errored === false) {
      TransformStreamErrorInternal(transformStream, e);
    }
  }
  function TransformStreamErrorInternal(transformStream, e) {
    assert(transformStream._errored === false);
    transformStream._errored = true;
    transformStream._storedError = e;
    if (transformStream._writableDone === false) {
      WritableStreamDefaultControllerError(transformStream._writableController, e);
    }
    if (transformStream._readableClosed === false) {
      ReadableStreamDefaultControllerError(transformStream._readableController, e);
    }
  }
  function TransformStreamReadableReadyPromise(transformStream) {
    assert(transformStream._backpressureChangePromise !== undefined, '_backpressureChangePromise should have been initialized');
    if (transformStream._backpressure === false) {
      return Promise.resolve();
    }
    assert(transformStream._backpressure === true, '_backpressure should have been initialized');
    return transformStream._backpressureChangePromise;
  }
  function TransformStreamSetBackpressure(transformStream, backpressure) {
    assert(transformStream._backpressure !== backpressure, 'TransformStreamSetBackpressure() should be called only when backpressure is changed');
    if (transformStream._backpressureChangePromise !== undefined) {
      transformStream._backpressureChangePromise_resolve(backpressure);
    }
    transformStream._backpressureChangePromise = new Promise(function (resolve) {
      transformStream._backpressureChangePromise_resolve = resolve;
    });
    transformStream._backpressureChangePromise.then(function (resolution) {
      assert(resolution !== backpressure, '_backpressureChangePromise should be fulfilled only when backpressure is changed');
    });
    transformStream._backpressure = backpressure;
  }
  function TransformStreamDefaultTransform(chunk, transformStreamController) {
    var transformStream = transformStreamController._controlledTransformStream;
    TransformStreamEnqueueToReadable(transformStream, chunk);
    return Promise.resolve();
  }
  function TransformStreamTransform(transformStream, chunk) {
    assert(transformStream._errored === false);
    assert(transformStream._transforming === false);
    assert(transformStream._backpressure === false);
    transformStream._transforming = true;
    var transformer = transformStream._transformer;
    var controller = transformStream._transformStreamController;
    var transformPromise = PromiseInvokeOrPerformFallback(transformer, 'transform', [chunk, controller], TransformStreamDefaultTransform, [chunk, controller]);
    return transformPromise.then(function () {
      transformStream._transforming = false;
      return TransformStreamReadableReadyPromise(transformStream);
    }, function (e) {
      TransformStreamErrorIfNeeded(transformStream, e);
      return Promise.reject(e);
    });
  }
  function IsTransformStreamDefaultController(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_controlledTransformStream')) {
      return false;
    }
    return true;
  }
  function IsTransformStream(x) {
    if (!typeIsObject(x)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_transformStreamController')) {
      return false;
    }
    return true;
  }
  var TransformStreamSink = function () {
    function TransformStreamSink(transformStream, startPromise) {
      _classCallCheck(this, TransformStreamSink);
      this._transformStream = transformStream;
      this._startPromise = startPromise;
    }
    _createClass(TransformStreamSink, [{
      key: 'start',
      value: function start(c) {
        var transformStream = this._transformStream;
        transformStream._writableController = c;
        return this._startPromise.then(function () {
          return TransformStreamReadableReadyPromise(transformStream);
        });
      }
    }, {
      key: 'write',
      value: function write(chunk) {
        var transformStream = this._transformStream;
        return TransformStreamTransform(transformStream, chunk);
      }
    }, {
      key: 'abort',
      value: function abort() {
        var transformStream = this._transformStream;
        transformStream._writableDone = true;
        TransformStreamErrorInternal(transformStream, new TypeError('Writable side aborted'));
      }
    }, {
      key: 'close',
      value: function close() {
        var transformStream = this._transformStream;
        assert(transformStream._transforming === false);
        transformStream._writableDone = true;
        var flushPromise = PromiseInvokeOrNoop(transformStream._transformer, 'flush', [transformStream._transformStreamController]);
        return flushPromise.then(function () {
          if (transformStream._errored === true) {
            return Promise.reject(transformStream._storedError);
          }
          if (transformStream._readableClosed === false) {
            TransformStreamCloseReadableInternal(transformStream);
          }
          return Promise.resolve();
        }).catch(function (r) {
          TransformStreamErrorIfNeeded(transformStream, r);
          return Promise.reject(transformStream._storedError);
        });
      }
    }]);
    return TransformStreamSink;
  }();
  var TransformStreamSource = function () {
    function TransformStreamSource(transformStream, startPromise) {
      _classCallCheck(this, TransformStreamSource);
      this._transformStream = transformStream;
      this._startPromise = startPromise;
    }
    _createClass(TransformStreamSource, [{
      key: 'start',
      value: function start(c) {
        var transformStream = this._transformStream;
        transformStream._readableController = c;
        return this._startPromise.then(function () {
          assert(transformStream._backpressureChangePromise !== undefined, '_backpressureChangePromise should have been initialized');
          if (transformStream._backpressure === true) {
            return Promise.resolve();
          }
          assert(transformStream._backpressure === false, '_backpressure should have been initialized');
          return transformStream._backpressureChangePromise;
        });
      }
    }, {
      key: 'pull',
      value: function pull() {
        var transformStream = this._transformStream;
        assert(transformStream._backpressure === true, 'pull() should be never called while _backpressure is false');
        assert(transformStream._backpressureChangePromise !== undefined, '_backpressureChangePromise should have been initialized');
        TransformStreamSetBackpressure(transformStream, false);
        return transformStream._backpressureChangePromise;
      }
    }, {
      key: 'cancel',
      value: function cancel() {
        var transformStream = this._transformStream;
        transformStream._readableClosed = true;
        TransformStreamErrorInternal(transformStream, new TypeError('Readable side canceled'));
      }
    }]);
    return TransformStreamSource;
  }();
  var TransformStreamDefaultController = function () {
    function TransformStreamDefaultController(transformStream) {
      _classCallCheck(this, TransformStreamDefaultController);
      if (IsTransformStream(transformStream) === false) {
        throw new TypeError('TransformStreamDefaultController can only be ' + 'constructed with a TransformStream instance');
      }
      if (transformStream._transformStreamController !== undefined) {
        throw new TypeError('TransformStreamDefaultController instances can ' + 'only be created by the TransformStream constructor');
      }
      this._controlledTransformStream = transformStream;
    }
    _createClass(TransformStreamDefaultController, [{
      key: 'enqueue',
      value: function enqueue(chunk) {
        if (IsTransformStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('enqueue');
        }
        TransformStreamEnqueueToReadable(this._controlledTransformStream, chunk);
      }
    }, {
      key: 'close',
      value: function close() {
        if (IsTransformStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('close');
        }
        TransformStreamCloseReadable(this._controlledTransformStream);
      }
    }, {
      key: 'error',
      value: function error(reason) {
        if (IsTransformStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('error');
        }
        TransformStreamError(this._controlledTransformStream, reason);
      }
    }, {
      key: 'desiredSize',
      get: function get() {
        if (IsTransformStreamDefaultController(this) === false) {
          throw defaultControllerBrandCheckException('desiredSize');
        }
        var transformStream = this._controlledTransformStream;
        var readableController = transformStream._readableController;
        return ReadableStreamDefaultControllerGetDesiredSize(readableController);
      }
    }]);
    return TransformStreamDefaultController;
  }();
  var TransformStream = function () {
    function TransformStream() {
      var transformer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      _classCallCheck(this, TransformStream);
      this._transformer = transformer;
      var readableStrategy = transformer.readableStrategy,
          writableStrategy = transformer.writableStrategy;
      this._transforming = false;
      this._errored = false;
      this._storedError = undefined;
      this._writableController = undefined;
      this._readableController = undefined;
      this._transformStreamController = undefined;
      this._writableDone = false;
      this._readableClosed = false;
      this._backpressure = undefined;
      this._backpressureChangePromise = undefined;
      this._backpressureChangePromise_resolve = undefined;
      this._transformStreamController = new TransformStreamDefaultController(this);
      var startPromise_resolve = void 0;
      var startPromise = new Promise(function (resolve) {
        startPromise_resolve = resolve;
      });
      var source = new TransformStreamSource(this, startPromise);
      this._readable = new ReadableStream(source, readableStrategy);
      var sink = new TransformStreamSink(this, startPromise);
      this._writable = new WritableStream(sink, writableStrategy);
      assert(this._writableController !== undefined);
      assert(this._readableController !== undefined);
      var desiredSize = ReadableStreamDefaultControllerGetDesiredSize(this._readableController);
      TransformStreamSetBackpressure(this, desiredSize <= 0);
      var transformStream = this;
      var startResult = InvokeOrNoop(transformer, 'start', [transformStream._transformStreamController]);
      startPromise_resolve(startResult);
      startPromise.catch(function (e) {
        if (transformStream._errored === false) {
          transformStream._errored = true;
          transformStream._storedError = e;
        }
      });
    }
    _createClass(TransformStream, [{
      key: 'readable',
      get: function get() {
        if (IsTransformStream(this) === false) {
          throw streamBrandCheckException('readable');
        }
        return this._readable;
      }
    }, {
      key: 'writable',
      get: function get() {
        if (IsTransformStream(this) === false) {
          throw streamBrandCheckException('writable');
        }
        return this._writable;
      }
    }]);
    return TransformStream;
  }();
  module.exports = { TransformStream: TransformStream };
  function defaultControllerBrandCheckException(name) {
    return new TypeError('TransformStreamDefaultController.prototype.' + name + ' can only be used on a TransformStreamDefaultController');
  }
  function streamBrandCheckException(name) {
    return new TypeError('TransformStream.prototype.' + name + ' can only be used on a TransformStream');
  }
}, function (module, exports, __w_pdfjs_require__) {
  module.exports = __w_pdfjs_require__(5);
}]));

/***/ }),
/* 117 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PDFJS = exports.globalScope = undefined;

var _api = __w_pdfjs_require__(69);

var _dom_utils = __w_pdfjs_require__(13);

var _util = __w_pdfjs_require__(0);

var _annotation_layer = __w_pdfjs_require__(72);

var _global_scope = __w_pdfjs_require__(20);

var _global_scope2 = _interopRequireDefault(_global_scope);

var _metadata = __w_pdfjs_require__(71);

var _text_layer = __w_pdfjs_require__(73);

var _svg = __w_pdfjs_require__(74);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (!_global_scope2.default.PDFJS) {
  _global_scope2.default.PDFJS = {};
}
var PDFJS = _global_scope2.default.PDFJS;
{
  PDFJS.version = '1.10.88';
  PDFJS.build = 'c62a1938';
}
PDFJS.pdfBug = false;
if (PDFJS.verbosity !== undefined) {
  (0, _util.setVerbosityLevel)(PDFJS.verbosity);
}
delete PDFJS.verbosity;
Object.defineProperty(PDFJS, 'verbosity', {
  get: function get() {
    return (0, _util.getVerbosityLevel)();
  },
  set: function set(level) {
    (0, _util.setVerbosityLevel)(level);
  },

  enumerable: true,
  configurable: true
});
PDFJS.VERBOSITY_LEVELS = _util.VERBOSITY_LEVELS;
PDFJS.OPS = _util.OPS;
PDFJS.UNSUPPORTED_FEATURES = _util.UNSUPPORTED_FEATURES;
PDFJS.isValidUrl = _dom_utils.isValidUrl;
PDFJS.shadow = _util.shadow;
PDFJS.createBlob = _util.createBlob;
PDFJS.createObjectURL = function PDFJS_createObjectURL(data, contentType) {
  return (0, _util.createObjectURL)(data, contentType, PDFJS.disableCreateObjectURL);
};
Object.defineProperty(PDFJS, 'isLittleEndian', {
  configurable: true,
  get: function PDFJS_isLittleEndian() {
    return (0, _util.shadow)(PDFJS, 'isLittleEndian', (0, _util.isLittleEndian)());
  }
});
PDFJS.removeNullCharacters = _util.removeNullCharacters;
PDFJS.PasswordResponses = _util.PasswordResponses;
PDFJS.PasswordException = _util.PasswordException;
PDFJS.UnknownErrorException = _util.UnknownErrorException;
PDFJS.InvalidPDFException = _util.InvalidPDFException;
PDFJS.MissingPDFException = _util.MissingPDFException;
PDFJS.UnexpectedResponseException = _util.UnexpectedResponseException;
PDFJS.Util = _util.Util;
PDFJS.PageViewport = _util.PageViewport;
PDFJS.createPromiseCapability = _util.createPromiseCapability;
PDFJS.maxImageSize = PDFJS.maxImageSize === undefined ? -1 : PDFJS.maxImageSize;
PDFJS.cMapUrl = PDFJS.cMapUrl === undefined ? null : PDFJS.cMapUrl;
PDFJS.cMapPacked = PDFJS.cMapPacked === undefined ? false : PDFJS.cMapPacked;
PDFJS.disableFontFace = PDFJS.disableFontFace === undefined ? false : PDFJS.disableFontFace;
PDFJS.imageResourcesPath = PDFJS.imageResourcesPath === undefined ? '' : PDFJS.imageResourcesPath;
PDFJS.disableWorker = PDFJS.disableWorker === undefined ? false : PDFJS.disableWorker;
PDFJS.workerSrc = PDFJS.workerSrc === undefined ? null : PDFJS.workerSrc;
PDFJS.workerPort = PDFJS.workerPort === undefined ? null : PDFJS.workerPort;
PDFJS.disableRange = PDFJS.disableRange === undefined ? false : PDFJS.disableRange;
PDFJS.disableStream = PDFJS.disableStream === undefined ? false : PDFJS.disableStream;
PDFJS.disableAutoFetch = PDFJS.disableAutoFetch === undefined ? false : PDFJS.disableAutoFetch;
PDFJS.pdfBug = PDFJS.pdfBug === undefined ? false : PDFJS.pdfBug;
PDFJS.postMessageTransfers = PDFJS.postMessageTransfers === undefined ? true : PDFJS.postMessageTransfers;
PDFJS.disableCreateObjectURL = PDFJS.disableCreateObjectURL === undefined ? false : PDFJS.disableCreateObjectURL;
PDFJS.disableWebGL = PDFJS.disableWebGL === undefined ? true : PDFJS.disableWebGL;
PDFJS.externalLinkTarget = PDFJS.externalLinkTarget === undefined ? _dom_utils.LinkTarget.NONE : PDFJS.externalLinkTarget;
PDFJS.externalLinkRel = PDFJS.externalLinkRel === undefined ? _dom_utils.DEFAULT_LINK_REL : PDFJS.externalLinkRel;
PDFJS.isEvalSupported = PDFJS.isEvalSupported === undefined ? true : PDFJS.isEvalSupported;
PDFJS.pdfjsNext = PDFJS.pdfjsNext === undefined ? false : PDFJS.pdfjsNext;
{
  var savedOpenExternalLinksInNewWindow = PDFJS.openExternalLinksInNewWindow;
  delete PDFJS.openExternalLinksInNewWindow;
  Object.defineProperty(PDFJS, 'openExternalLinksInNewWindow', {
    get: function get() {
      return PDFJS.externalLinkTarget === _dom_utils.LinkTarget.BLANK;
    },
    set: function set(value) {
      if (value) {
        (0, _util.deprecated)('PDFJS.openExternalLinksInNewWindow, please use ' + '"PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK" instead.');
      }
      if (PDFJS.externalLinkTarget !== _dom_utils.LinkTarget.NONE) {
        (0, _util.warn)('PDFJS.externalLinkTarget is already initialized');
        return;
      }
      PDFJS.externalLinkTarget = value ? _dom_utils.LinkTarget.BLANK : _dom_utils.LinkTarget.NONE;
    },

    enumerable: true,
    configurable: true
  });
  if (savedOpenExternalLinksInNewWindow) {
    PDFJS.openExternalLinksInNewWindow = savedOpenExternalLinksInNewWindow;
  }
}
PDFJS.getDocument = _api.getDocument;
PDFJS.LoopbackPort = _api.LoopbackPort;
PDFJS.PDFDataRangeTransport = _api.PDFDataRangeTransport;
PDFJS.PDFWorker = _api.PDFWorker;
PDFJS.hasCanvasTypedArrays = true;
PDFJS.CustomStyle = _dom_utils.CustomStyle;
PDFJS.LinkTarget = _dom_utils.LinkTarget;
PDFJS.addLinkAttributes = _dom_utils.addLinkAttributes;
PDFJS.getFilenameFromUrl = _dom_utils.getFilenameFromUrl;
PDFJS.isExternalLinkTargetSet = _dom_utils.isExternalLinkTargetSet;
PDFJS.AnnotationLayer = _annotation_layer.AnnotationLayer;
PDFJS.renderTextLayer = _text_layer.renderTextLayer;
PDFJS.Metadata = _metadata.Metadata;
PDFJS.SVGGraphics = _svg.SVGGraphics;
PDFJS.UnsupportedManager = _api._UnsupportedManager;
exports.globalScope = _global_scope2.default;
exports.PDFJS = PDFJS;

/***/ }),
/* 118 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FontLoader = exports.FontFaceObject = undefined;

var _util = __w_pdfjs_require__(0);

function FontLoader(docId) {
  this.docId = docId;
  this.styleElement = null;
  this.nativeFontFaces = [];
  this.loadTestFontId = 0;
  this.loadingContext = {
    requests: [],
    nextRequestId: 0
  };
}
FontLoader.prototype = {
  insertRule: function fontLoaderInsertRule(rule) {
    var styleElement = this.styleElement;
    if (!styleElement) {
      styleElement = this.styleElement = document.createElement('style');
      styleElement.id = 'PDFJS_FONT_STYLE_TAG_' + this.docId;
      document.documentElement.getElementsByTagName('head')[0].appendChild(styleElement);
    }
    var styleSheet = styleElement.sheet;
    styleSheet.insertRule(rule, styleSheet.cssRules.length);
  },
  clear: function fontLoaderClear() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    this.nativeFontFaces.forEach(function (nativeFontFace) {
      document.fonts.delete(nativeFontFace);
    });
    this.nativeFontFaces.length = 0;
  }
};
{
  var getLoadTestFont = function getLoadTestFont() {
    return atob('T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQ' + 'AABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwA' + 'AAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbm' + 'FtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAA' + 'AADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6A' + 'ABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAA' + 'MQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAA' + 'AAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAA' + 'AAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQ' + 'AAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMA' + 'AQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAA' + 'EAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAA' + 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAA' + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAA' + 'AAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgc' + 'A/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWF' + 'hYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQA' + 'AAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAg' + 'ABAAAAAAAAAAAD6AAAAAAAAA==');
  };
  Object.defineProperty(FontLoader.prototype, 'loadTestFont', {
    get: function get() {
      return (0, _util.shadow)(this, 'loadTestFont', getLoadTestFont());
    },

    configurable: true
  });
  FontLoader.prototype.addNativeFontFace = function fontLoader_addNativeFontFace(nativeFontFace) {
    this.nativeFontFaces.push(nativeFontFace);
    document.fonts.add(nativeFontFace);
  };
  FontLoader.prototype.bind = function fontLoaderBind(fonts, callback) {
    var rules = [];
    var fontsToLoad = [];
    var fontLoadPromises = [];
    var getNativeFontPromise = function getNativeFontPromise(nativeFontFace) {
      return nativeFontFace.loaded.catch(function (e) {
        (0, _util.warn)('Failed to load font "' + nativeFontFace.family + '": ' + e);
      });
    };
    var isFontLoadingAPISupported = FontLoader.isFontLoadingAPISupported && !FontLoader.isSyncFontLoadingSupported;
    for (var i = 0, ii = fonts.length; i < ii; i++) {
      var font = fonts[i];
      if (font.attached || font.loading === false) {
        continue;
      }
      font.attached = true;
      if (isFontLoadingAPISupported) {
        var nativeFontFace = font.createNativeFontFace();
        if (nativeFontFace) {
          this.addNativeFontFace(nativeFontFace);
          fontLoadPromises.push(getNativeFontPromise(nativeFontFace));
        }
      } else {
        var rule = font.createFontFaceRule();
        if (rule) {
          this.insertRule(rule);
          rules.push(rule);
          fontsToLoad.push(font);
        }
      }
    }
    var request = this.queueLoadingCallback(callback);
    if (isFontLoadingAPISupported) {
      Promise.all(fontLoadPromises).then(function () {
        request.complete();
      });
    } else if (rules.length > 0 && !FontLoader.isSyncFontLoadingSupported) {
      this.prepareFontLoadEvent(rules, fontsToLoad, request);
    } else {
      request.complete();
    }
  };
  FontLoader.prototype.queueLoadingCallback = function FontLoader_queueLoadingCallback(callback) {
    function LoadLoader_completeRequest() {
      (0, _util.assert)(!request.end, 'completeRequest() cannot be called twice');
      request.end = Date.now();
      while (context.requests.length > 0 && context.requests[0].end) {
        var otherRequest = context.requests.shift();
        setTimeout(otherRequest.callback, 0);
      }
    }
    var context = this.loadingContext;
    var requestId = 'pdfjs-font-loading-' + context.nextRequestId++;
    var request = {
      id: requestId,
      complete: LoadLoader_completeRequest,
      callback: callback,
      started: Date.now()
    };
    context.requests.push(request);
    return request;
  };
  FontLoader.prototype.prepareFontLoadEvent = function fontLoaderPrepareFontLoadEvent(rules, fonts, request) {
    function int32(data, offset) {
      return data.charCodeAt(offset) << 24 | data.charCodeAt(offset + 1) << 16 | data.charCodeAt(offset + 2) << 8 | data.charCodeAt(offset + 3) & 0xff;
    }
    function spliceString(s, offset, remove, insert) {
      var chunk1 = s.substr(0, offset);
      var chunk2 = s.substr(offset + remove);
      return chunk1 + insert + chunk2;
    }
    var i, ii;
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    var ctx = canvas.getContext('2d');
    var called = 0;
    function isFontReady(name, callback) {
      called++;
      if (called > 30) {
        (0, _util.warn)('Load test font never loaded.');
        callback();
        return;
      }
      ctx.font = '30px ' + name;
      ctx.fillText('.', 0, 20);
      var imageData = ctx.getImageData(0, 0, 1, 1);
      if (imageData.data[3] > 0) {
        callback();
        return;
      }
      setTimeout(isFontReady.bind(null, name, callback));
    }
    var loadTestFontId = 'lt' + Date.now() + this.loadTestFontId++;
    var data = this.loadTestFont;
    var COMMENT_OFFSET = 976;
    data = spliceString(data, COMMENT_OFFSET, loadTestFontId.length, loadTestFontId);
    var CFF_CHECKSUM_OFFSET = 16;
    var XXXX_VALUE = 0x58585858;
    var checksum = int32(data, CFF_CHECKSUM_OFFSET);
    for (i = 0, ii = loadTestFontId.length - 3; i < ii; i += 4) {
      checksum = checksum - XXXX_VALUE + int32(loadTestFontId, i) | 0;
    }
    if (i < loadTestFontId.length) {
      checksum = checksum - XXXX_VALUE + int32(loadTestFontId + 'XXX', i) | 0;
    }
    data = spliceString(data, CFF_CHECKSUM_OFFSET, 4, (0, _util.string32)(checksum));
    var url = 'url(data:font/opentype;base64,' + btoa(data) + ');';
    var rule = '@font-face { font-family:"' + loadTestFontId + '";src:' + url + '}';
    this.insertRule(rule);
    var names = [];
    for (i = 0, ii = fonts.length; i < ii; i++) {
      names.push(fonts[i].loadedName);
    }
    names.push(loadTestFontId);
    var div = document.createElement('div');
    div.setAttribute('style', 'visibility: hidden;' + 'width: 10px; height: 10px;' + 'position: absolute; top: 0px; left: 0px;');
    for (i = 0, ii = names.length; i < ii; ++i) {
      var span = document.createElement('span');
      span.textContent = 'Hi';
      span.style.fontFamily = names[i];
      div.appendChild(span);
    }
    document.body.appendChild(div);
    isFontReady(loadTestFontId, function () {
      document.body.removeChild(div);
      request.complete();
    });
  };
}
{
  FontLoader.isFontLoadingAPISupported = typeof document !== 'undefined' && !!document.fonts;
}
{
  var isSyncFontLoadingSupported = function isSyncFontLoadingSupported() {
    if (typeof navigator === 'undefined') {
      return true;
    }
    var supported = false;
    var m = /Mozilla\/5.0.*?rv:(\d+).*? Gecko/.exec(navigator.userAgent);
    if (m && m[1] >= 14) {
      supported = true;
    }
    return supported;
  };
  Object.defineProperty(FontLoader, 'isSyncFontLoadingSupported', {
    get: function get() {
      return (0, _util.shadow)(FontLoader, 'isSyncFontLoadingSupported', isSyncFontLoadingSupported());
    },

    enumerable: true,
    configurable: true
  });
}
var IsEvalSupportedCached = {
  get value() {
    return (0, _util.shadow)(this, 'value', (0, _util.isEvalSupported)());
  }
};
var FontFaceObject = function FontFaceObjectClosure() {
  function FontFaceObject(translatedData, options) {
    this.compiledGlyphs = Object.create(null);
    for (var i in translatedData) {
      this[i] = translatedData[i];
    }
    this.options = options;
  }
  FontFaceObject.prototype = {
    createNativeFontFace: function FontFaceObject_createNativeFontFace() {
      if (!this.data) {
        return null;
      }
      if (this.options.disableFontFace) {
        this.disableFontFace = true;
        return null;
      }
      var nativeFontFace = new FontFace(this.loadedName, this.data, {});
      if (this.options.fontRegistry) {
        this.options.fontRegistry.registerFont(this);
      }
      return nativeFontFace;
    },
    createFontFaceRule: function FontFaceObject_createFontFaceRule() {
      if (!this.data) {
        return null;
      }
      if (this.options.disableFontFace) {
        this.disableFontFace = true;
        return null;
      }
      var data = (0, _util.bytesToString)(new Uint8Array(this.data));
      var fontName = this.loadedName;
      var url = 'url(data:' + this.mimetype + ';base64,' + btoa(data) + ');';
      var rule = '@font-face { font-family:"' + fontName + '";src:' + url + '}';
      if (this.options.fontRegistry) {
        this.options.fontRegistry.registerFont(this, url);
      }
      return rule;
    },
    getPathGenerator: function FontFaceObject_getPathGenerator(objs, character) {
      if (!(character in this.compiledGlyphs)) {
        var cmds = objs.get(this.loadedName + '_path_' + character);
        var current, i, len;
        if (this.options.isEvalSupported && IsEvalSupportedCached.value) {
          var args,
              js = '';
          for (i = 0, len = cmds.length; i < len; i++) {
            current = cmds[i];
            if (current.args !== undefined) {
              args = current.args.join(',');
            } else {
              args = '';
            }
            js += 'c.' + current.cmd + '(' + args + ');\n';
          }
          this.compiledGlyphs[character] = new Function('c', 'size', js);
        } else {
          this.compiledGlyphs[character] = function (c, size) {
            for (i = 0, len = cmds.length; i < len; i++) {
              current = cmds[i];
              if (current.cmd === 'scale') {
                current.args = [size, -size];
              }
              c[current.cmd].apply(c, current.args);
            }
          };
        }
      }
      return this.compiledGlyphs[character];
    }
  };
  return FontFaceObject;
}();
exports.FontFaceObject = FontFaceObject;
exports.FontLoader = FontLoader;

/***/ }),
/* 119 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CanvasGraphics = undefined;

var _util = __w_pdfjs_require__(0);

var _pattern_helper = __w_pdfjs_require__(120);

var _webgl = __w_pdfjs_require__(70);

var MIN_FONT_SIZE = 16;
var MAX_FONT_SIZE = 100;
var MAX_GROUP_SIZE = 4096;
var MIN_WIDTH_FACTOR = 0.65;
var COMPILE_TYPE3_GLYPHS = true;
var MAX_SIZE_TO_COMPILE = 1000;
var FULL_CHUNK_HEIGHT = 16;
var IsLittleEndianCached = {
  get value() {
    return (0, _util.shadow)(IsLittleEndianCached, 'value', (0, _util.isLittleEndian)());
  }
};
function addContextCurrentTransform(ctx) {
  if (!ctx.mozCurrentTransform) {
    ctx._originalSave = ctx.save;
    ctx._originalRestore = ctx.restore;
    ctx._originalRotate = ctx.rotate;
    ctx._originalScale = ctx.scale;
    ctx._originalTranslate = ctx.translate;
    ctx._originalTransform = ctx.transform;
    ctx._originalSetTransform = ctx.setTransform;
    ctx._transformMatrix = ctx._transformMatrix || [1, 0, 0, 1, 0, 0];
    ctx._transformStack = [];
    Object.defineProperty(ctx, 'mozCurrentTransform', {
      get: function getCurrentTransform() {
        return this._transformMatrix;
      }
    });
    Object.defineProperty(ctx, 'mozCurrentTransformInverse', {
      get: function getCurrentTransformInverse() {
        var m = this._transformMatrix;
        var a = m[0],
            b = m[1],
            c = m[2],
            d = m[3],
            e = m[4],
            f = m[5];
        var ad_bc = a * d - b * c;
        var bc_ad = b * c - a * d;
        return [d / ad_bc, b / bc_ad, c / bc_ad, a / ad_bc, (d * e - c * f) / bc_ad, (b * e - a * f) / ad_bc];
      }
    });
    ctx.save = function ctxSave() {
      var old = this._transformMatrix;
      this._transformStack.push(old);
      this._transformMatrix = old.slice(0, 6);
      this._originalSave();
    };
    ctx.restore = function ctxRestore() {
      var prev = this._transformStack.pop();
      if (prev) {
        this._transformMatrix = prev;
        this._originalRestore();
      }
    };
    ctx.translate = function ctxTranslate(x, y) {
      var m = this._transformMatrix;
      m[4] = m[0] * x + m[2] * y + m[4];
      m[5] = m[1] * x + m[3] * y + m[5];
      this._originalTranslate(x, y);
    };
    ctx.scale = function ctxScale(x, y) {
      var m = this._transformMatrix;
      m[0] = m[0] * x;
      m[1] = m[1] * x;
      m[2] = m[2] * y;
      m[3] = m[3] * y;
      this._originalScale(x, y);
    };
    ctx.transform = function ctxTransform(a, b, c, d, e, f) {
      var m = this._transformMatrix;
      this._transformMatrix = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
      ctx._originalTransform(a, b, c, d, e, f);
    };
    ctx.setTransform = function ctxSetTransform(a, b, c, d, e, f) {
      this._transformMatrix = [a, b, c, d, e, f];
      ctx._originalSetTransform(a, b, c, d, e, f);
    };
    ctx.rotate = function ctxRotate(angle) {
      var cosValue = Math.cos(angle);
      var sinValue = Math.sin(angle);
      var m = this._transformMatrix;
      this._transformMatrix = [m[0] * cosValue + m[2] * sinValue, m[1] * cosValue + m[3] * sinValue, m[0] * -sinValue + m[2] * cosValue, m[1] * -sinValue + m[3] * cosValue, m[4], m[5]];
      this._originalRotate(angle);
    };
  }
}
var CachedCanvases = function CachedCanvasesClosure() {
  function CachedCanvases(canvasFactory) {
    this.canvasFactory = canvasFactory;
    this.cache = Object.create(null);
  }
  CachedCanvases.prototype = {
    getCanvas: function CachedCanvases_getCanvas(id, width, height, trackTransform) {
      var canvasEntry;
      if (this.cache[id] !== undefined) {
        canvasEntry = this.cache[id];
        this.canvasFactory.reset(canvasEntry, width, height);
        canvasEntry.context.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        canvasEntry = this.canvasFactory.create(width, height);
        this.cache[id] = canvasEntry;
      }
      if (trackTransform) {
        addContextCurrentTransform(canvasEntry.context);
      }
      return canvasEntry;
    },
    clear: function clear() {
      for (var id in this.cache) {
        var canvasEntry = this.cache[id];
        this.canvasFactory.destroy(canvasEntry);
        delete this.cache[id];
      }
    }
  };
  return CachedCanvases;
}();
function compileType3Glyph(imgData) {
  var POINT_TO_PROCESS_LIMIT = 1000;
  var width = imgData.width,
      height = imgData.height;
  var i,
      j,
      j0,
      width1 = width + 1;
  var points = new Uint8Array(width1 * (height + 1));
  var POINT_TYPES = new Uint8Array([0, 2, 4, 0, 1, 0, 5, 4, 8, 10, 0, 8, 0, 2, 1, 0]);
  var lineSize = width + 7 & ~7,
      data0 = imgData.data;
  var data = new Uint8Array(lineSize * height),
      pos = 0,
      ii;
  for (i = 0, ii = data0.length; i < ii; i++) {
    var mask = 128,
        elem = data0[i];
    while (mask > 0) {
      data[pos++] = elem & mask ? 0 : 255;
      mask >>= 1;
    }
  }
  var count = 0;
  pos = 0;
  if (data[pos] !== 0) {
    points[0] = 1;
    ++count;
  }
  for (j = 1; j < width; j++) {
    if (data[pos] !== data[pos + 1]) {
      points[j] = data[pos] ? 2 : 1;
      ++count;
    }
    pos++;
  }
  if (data[pos] !== 0) {
    points[j] = 2;
    ++count;
  }
  for (i = 1; i < height; i++) {
    pos = i * lineSize;
    j0 = i * width1;
    if (data[pos - lineSize] !== data[pos]) {
      points[j0] = data[pos] ? 1 : 8;
      ++count;
    }
    var sum = (data[pos] ? 4 : 0) + (data[pos - lineSize] ? 8 : 0);
    for (j = 1; j < width; j++) {
      sum = (sum >> 2) + (data[pos + 1] ? 4 : 0) + (data[pos - lineSize + 1] ? 8 : 0);
      if (POINT_TYPES[sum]) {
        points[j0 + j] = POINT_TYPES[sum];
        ++count;
      }
      pos++;
    }
    if (data[pos - lineSize] !== data[pos]) {
      points[j0 + j] = data[pos] ? 2 : 4;
      ++count;
    }
    if (count > POINT_TO_PROCESS_LIMIT) {
      return null;
    }
  }
  pos = lineSize * (height - 1);
  j0 = i * width1;
  if (data[pos] !== 0) {
    points[j0] = 8;
    ++count;
  }
  for (j = 1; j < width; j++) {
    if (data[pos] !== data[pos + 1]) {
      points[j0 + j] = data[pos] ? 4 : 8;
      ++count;
    }
    pos++;
  }
  if (data[pos] !== 0) {
    points[j0 + j] = 4;
    ++count;
  }
  if (count > POINT_TO_PROCESS_LIMIT) {
    return null;
  }
  var steps = new Int32Array([0, width1, -1, 0, -width1, 0, 0, 0, 1]);
  var outlines = [];
  for (i = 0; count && i <= height; i++) {
    var p = i * width1;
    var end = p + width;
    while (p < end && !points[p]) {
      p++;
    }
    if (p === end) {
      continue;
    }
    var coords = [p % width1, i];
    var type = points[p],
        p0 = p,
        pp;
    do {
      var step = steps[type];
      do {
        p += step;
      } while (!points[p]);
      pp = points[p];
      if (pp !== 5 && pp !== 10) {
        type = pp;
        points[p] = 0;
      } else {
        type = pp & 0x33 * type >> 4;
        points[p] &= type >> 2 | type << 2;
      }
      coords.push(p % width1);
      coords.push(p / width1 | 0);
      --count;
    } while (p0 !== p);
    outlines.push(coords);
    --i;
  }
  var drawOutline = function drawOutline(c) {
    c.save();
    c.scale(1 / width, -1 / height);
    c.translate(0, -height);
    c.beginPath();
    for (var i = 0, ii = outlines.length; i < ii; i++) {
      var o = outlines[i];
      c.moveTo(o[0], o[1]);
      for (var j = 2, jj = o.length; j < jj; j += 2) {
        c.lineTo(o[j], o[j + 1]);
      }
    }
    c.fill();
    c.beginPath();
    c.restore();
  };
  return drawOutline;
}
var CanvasExtraState = function CanvasExtraStateClosure() {
  function CanvasExtraState() {
    this.alphaIsShape = false;
    this.fontSize = 0;
    this.fontSizeScale = 1;
    this.textMatrix = _util.IDENTITY_MATRIX;
    this.textMatrixScale = 1;
    this.fontMatrix = _util.FONT_IDENTITY_MATRIX;
    this.leading = 0;
    this.x = 0;
    this.y = 0;
    this.lineX = 0;
    this.lineY = 0;
    this.charSpacing = 0;
    this.wordSpacing = 0;
    this.textHScale = 1;
    this.textRenderingMode = _util.TextRenderingMode.FILL;
    this.textRise = 0;
    this.fillColor = '#000000';
    this.strokeColor = '#000000';
    this.patternFill = false;
    this.fillAlpha = 1;
    this.strokeAlpha = 1;
    this.lineWidth = 1;
    this.activeSMask = null;
    this.resumeSMaskCtx = null;
  }
  CanvasExtraState.prototype = {
    clone: function CanvasExtraState_clone() {
      return Object.create(this);
    },
    setCurrentPoint: function CanvasExtraState_setCurrentPoint(x, y) {
      this.x = x;
      this.y = y;
    }
  };
  return CanvasExtraState;
}();
var CanvasGraphics = function CanvasGraphicsClosure() {
  var EXECUTION_TIME = 15;
  var EXECUTION_STEPS = 10;
  function CanvasGraphics(canvasCtx, commonObjs, objs, canvasFactory, imageLayer) {
    this.ctx = canvasCtx;
    this.current = new CanvasExtraState();
    this.stateStack = [];
    this.pendingClip = null;
    this.pendingEOFill = false;
    this.res = null;
    this.xobjs = null;
    this.commonObjs = commonObjs;
    this.objs = objs;
    this.canvasFactory = canvasFactory;
    this.imageLayer = imageLayer;
    this.groupStack = [];
    this.processingType3 = null;
    this.baseTransform = null;
    this.baseTransformStack = [];
    this.groupLevel = 0;
    this.smaskStack = [];
    this.smaskCounter = 0;
    this.tempSMask = null;
    this.cachedCanvases = new CachedCanvases(this.canvasFactory);
    if (canvasCtx) {
      addContextCurrentTransform(canvasCtx);
    }
    this.cachedGetSinglePixelWidth = null;
  }
  function putBinaryImageData(ctx, imgData) {
    if (typeof ImageData !== 'undefined' && imgData instanceof ImageData) {
      ctx.putImageData(imgData, 0, 0);
      return;
    }
    var height = imgData.height,
        width = imgData.width;
    var partialChunkHeight = height % FULL_CHUNK_HEIGHT;
    var fullChunks = (height - partialChunkHeight) / FULL_CHUNK_HEIGHT;
    var totalChunks = partialChunkHeight === 0 ? fullChunks : fullChunks + 1;
    var chunkImgData = ctx.createImageData(width, FULL_CHUNK_HEIGHT);
    var srcPos = 0,
        destPos;
    var src = imgData.data;
    var dest = chunkImgData.data;
    var i, j, thisChunkHeight, elemsInThisChunk;
    if (imgData.kind === _util.ImageKind.GRAYSCALE_1BPP) {
      var srcLength = src.byteLength;
      var dest32 = new Uint32Array(dest.buffer, 0, dest.byteLength >> 2);
      var dest32DataLength = dest32.length;
      var fullSrcDiff = width + 7 >> 3;
      var white = 0xFFFFFFFF;
      var black = IsLittleEndianCached.value ? 0xFF000000 : 0x000000FF;
      for (i = 0; i < totalChunks; i++) {
        thisChunkHeight = i < fullChunks ? FULL_CHUNK_HEIGHT : partialChunkHeight;
        destPos = 0;
        for (j = 0; j < thisChunkHeight; j++) {
          var srcDiff = srcLength - srcPos;
          var k = 0;
          var kEnd = srcDiff > fullSrcDiff ? width : srcDiff * 8 - 7;
          var kEndUnrolled = kEnd & ~7;
          var mask = 0;
          var srcByte = 0;
          for (; k < kEndUnrolled; k += 8) {
            srcByte = src[srcPos++];
            dest32[destPos++] = srcByte & 128 ? white : black;
            dest32[destPos++] = srcByte & 64 ? white : black;
            dest32[destPos++] = srcByte & 32 ? white : black;
            dest32[destPos++] = srcByte & 16 ? white : black;
            dest32[destPos++] = srcByte & 8 ? white : black;
            dest32[destPos++] = srcByte & 4 ? white : black;
            dest32[destPos++] = srcByte & 2 ? white : black;
            dest32[destPos++] = srcByte & 1 ? white : black;
          }
          for (; k < kEnd; k++) {
            if (mask === 0) {
              srcByte = src[srcPos++];
              mask = 128;
            }
            dest32[destPos++] = srcByte & mask ? white : black;
            mask >>= 1;
          }
        }
        while (destPos < dest32DataLength) {
          dest32[destPos++] = 0;
        }
        ctx.putImageData(chunkImgData, 0, i * FULL_CHUNK_HEIGHT);
      }
    } else if (imgData.kind === _util.ImageKind.RGBA_32BPP) {
      j = 0;
      elemsInThisChunk = width * FULL_CHUNK_HEIGHT * 4;
      for (i = 0; i < fullChunks; i++) {
        dest.set(src.subarray(srcPos, srcPos + elemsInThisChunk));
        srcPos += elemsInThisChunk;
        ctx.putImageData(chunkImgData, 0, j);
        j += FULL_CHUNK_HEIGHT;
      }
      if (i < totalChunks) {
        elemsInThisChunk = width * partialChunkHeight * 4;
        dest.set(src.subarray(srcPos, srcPos + elemsInThisChunk));
        ctx.putImageData(chunkImgData, 0, j);
      }
    } else if (imgData.kind === _util.ImageKind.RGB_24BPP) {
      thisChunkHeight = FULL_CHUNK_HEIGHT;
      elemsInThisChunk = width * thisChunkHeight;
      for (i = 0; i < totalChunks; i++) {
        if (i >= fullChunks) {
          thisChunkHeight = partialChunkHeight;
          elemsInThisChunk = width * thisChunkHeight;
        }
        destPos = 0;
        for (j = elemsInThisChunk; j--;) {
          dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++];
          dest[destPos++] = 255;
        }
        ctx.putImageData(chunkImgData, 0, i * FULL_CHUNK_HEIGHT);
      }
    } else {
      throw new Error('bad image kind: ' + imgData.kind);
    }
  }
  function putBinaryImageMask(ctx, imgData) {
    var height = imgData.height,
        width = imgData.width;
    var partialChunkHeight = height % FULL_CHUNK_HEIGHT;
    var fullChunks = (height - partialChunkHeight) / FULL_CHUNK_HEIGHT;
    var totalChunks = partialChunkHeight === 0 ? fullChunks : fullChunks + 1;
    var chunkImgData = ctx.createImageData(width, FULL_CHUNK_HEIGHT);
    var srcPos = 0;
    var src = imgData.data;
    var dest = chunkImgData.data;
    for (var i = 0; i < totalChunks; i++) {
      var thisChunkHeight = i < fullChunks ? FULL_CHUNK_HEIGHT : partialChunkHeight;
      var destPos = 3;
      for (var j = 0; j < thisChunkHeight; j++) {
        var mask = 0;
        for (var k = 0; k < width; k++) {
          if (!mask) {
            var elem = src[srcPos++];
            mask = 128;
          }
          dest[destPos] = elem & mask ? 0 : 255;
          destPos += 4;
          mask >>= 1;
        }
      }
      ctx.putImageData(chunkImgData, 0, i * FULL_CHUNK_HEIGHT);
    }
  }
  function copyCtxState(sourceCtx, destCtx) {
    var properties = ['strokeStyle', 'fillStyle', 'fillRule', 'globalAlpha', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'globalCompositeOperation', 'font'];
    for (var i = 0, ii = properties.length; i < ii; i++) {
      var property = properties[i];
      if (sourceCtx[property] !== undefined) {
        destCtx[property] = sourceCtx[property];
      }
    }
    if (sourceCtx.setLineDash !== undefined) {
      destCtx.setLineDash(sourceCtx.getLineDash());
      destCtx.lineDashOffset = sourceCtx.lineDashOffset;
    }
  }
  function resetCtxToDefault(ctx) {
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.fillRule = 'nonzero';
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 10;
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '10px sans-serif';
    if (ctx.setLineDash !== undefined) {
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  }
  function composeSMaskBackdrop(bytes, r0, g0, b0) {
    var length = bytes.length;
    for (var i = 3; i < length; i += 4) {
      var alpha = bytes[i];
      if (alpha === 0) {
        bytes[i - 3] = r0;
        bytes[i - 2] = g0;
        bytes[i - 1] = b0;
      } else if (alpha < 255) {
        var alpha_ = 255 - alpha;
        bytes[i - 3] = bytes[i - 3] * alpha + r0 * alpha_ >> 8;
        bytes[i - 2] = bytes[i - 2] * alpha + g0 * alpha_ >> 8;
        bytes[i - 1] = bytes[i - 1] * alpha + b0 * alpha_ >> 8;
      }
    }
  }
  function composeSMaskAlpha(maskData, layerData, transferMap) {
    var length = maskData.length;
    var scale = 1 / 255;
    for (var i = 3; i < length; i += 4) {
      var alpha = transferMap ? transferMap[maskData[i]] : maskData[i];
      layerData[i] = layerData[i] * alpha * scale | 0;
    }
  }
  function composeSMaskLuminosity(maskData, layerData, transferMap) {
    var length = maskData.length;
    for (var i = 3; i < length; i += 4) {
      var y = maskData[i - 3] * 77 + maskData[i - 2] * 152 + maskData[i - 1] * 28;
      layerData[i] = transferMap ? layerData[i] * transferMap[y >> 8] >> 8 : layerData[i] * y >> 16;
    }
  }
  function genericComposeSMask(maskCtx, layerCtx, width, height, subtype, backdrop, transferMap) {
    var hasBackdrop = !!backdrop;
    var r0 = hasBackdrop ? backdrop[0] : 0;
    var g0 = hasBackdrop ? backdrop[1] : 0;
    var b0 = hasBackdrop ? backdrop[2] : 0;
    var composeFn;
    if (subtype === 'Luminosity') {
      composeFn = composeSMaskLuminosity;
    } else {
      composeFn = composeSMaskAlpha;
    }
    var PIXELS_TO_PROCESS = 1048576;
    var chunkSize = Math.min(height, Math.ceil(PIXELS_TO_PROCESS / width));
    for (var row = 0; row < height; row += chunkSize) {
      var chunkHeight = Math.min(chunkSize, height - row);
      var maskData = maskCtx.getImageData(0, row, width, chunkHeight);
      var layerData = layerCtx.getImageData(0, row, width, chunkHeight);
      if (hasBackdrop) {
        composeSMaskBackdrop(maskData.data, r0, g0, b0);
      }
      composeFn(maskData.data, layerData.data, transferMap);
      maskCtx.putImageData(layerData, 0, row);
    }
  }
  function composeSMask(ctx, smask, layerCtx) {
    var mask = smask.canvas;
    var maskCtx = smask.context;
    ctx.setTransform(smask.scaleX, 0, 0, smask.scaleY, smask.offsetX, smask.offsetY);
    var backdrop = smask.backdrop || null;
    if (!smask.transferMap && _webgl.WebGLUtils.isEnabled) {
      var composed = _webgl.WebGLUtils.composeSMask(layerCtx.canvas, mask, {
        subtype: smask.subtype,
        backdrop: backdrop
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(composed, smask.offsetX, smask.offsetY);
      return;
    }
    genericComposeSMask(maskCtx, layerCtx, mask.width, mask.height, smask.subtype, backdrop, smask.transferMap);
    ctx.drawImage(mask, 0, 0);
  }
  var LINE_CAP_STYLES = ['butt', 'round', 'square'];
  var LINE_JOIN_STYLES = ['miter', 'round', 'bevel'];
  var NORMAL_CLIP = {};
  var EO_CLIP = {};
  CanvasGraphics.prototype = {
    beginDrawing: function beginDrawing(_ref) {
      var transform = _ref.transform,
          viewport = _ref.viewport,
          transparency = _ref.transparency,
          _ref$background = _ref.background,
          background = _ref$background === undefined ? null : _ref$background;

      var width = this.ctx.canvas.width;
      var height = this.ctx.canvas.height;
      this.ctx.save();
      this.ctx.fillStyle = background || 'rgb(255, 255, 255)';
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.restore();
      if (transparency) {
        var transparentCanvas = this.cachedCanvases.getCanvas('transparent', width, height, true);
        this.compositeCtx = this.ctx;
        this.transparentCanvas = transparentCanvas.canvas;
        this.ctx = transparentCanvas.context;
        this.ctx.save();
        this.ctx.transform.apply(this.ctx, this.compositeCtx.mozCurrentTransform);
      }
      this.ctx.save();
      resetCtxToDefault(this.ctx);
      if (transform) {
        this.ctx.transform.apply(this.ctx, transform);
      }
      this.ctx.transform.apply(this.ctx, viewport.transform);
      this.baseTransform = this.ctx.mozCurrentTransform.slice();
      if (this.imageLayer) {
        this.imageLayer.beginLayout();
      }
    },

    executeOperatorList: function CanvasGraphics_executeOperatorList(operatorList, executionStartIdx, continueCallback, stepper) {
      var argsArray = operatorList.argsArray;
      var fnArray = operatorList.fnArray;
      var i = executionStartIdx || 0;
      var argsArrayLen = argsArray.length;
      if (argsArrayLen === i) {
        return i;
      }
      var chunkOperations = argsArrayLen - i > EXECUTION_STEPS && typeof continueCallback === 'function';
      var endTime = chunkOperations ? Date.now() + EXECUTION_TIME : 0;
      var steps = 0;
      var commonObjs = this.commonObjs;
      var objs = this.objs;
      var fnId;
      while (true) {
        if (stepper !== undefined && i === stepper.nextBreakPoint) {
          stepper.breakIt(i, continueCallback);
          return i;
        }
        fnId = fnArray[i];
        if (fnId !== _util.OPS.dependency) {
          this[fnId].apply(this, argsArray[i]);
        } else {
          var deps = argsArray[i];
          for (var n = 0, nn = deps.length; n < nn; n++) {
            var depObjId = deps[n];
            var common = depObjId[0] === 'g' && depObjId[1] === '_';
            var objsPool = common ? commonObjs : objs;
            if (!objsPool.isResolved(depObjId)) {
              objsPool.get(depObjId, continueCallback);
              return i;
            }
          }
        }
        i++;
        if (i === argsArrayLen) {
          return i;
        }
        if (chunkOperations && ++steps > EXECUTION_STEPS) {
          if (Date.now() > endTime) {
            continueCallback();
            return i;
          }
          steps = 0;
        }
      }
    },
    endDrawing: function CanvasGraphics_endDrawing() {
      if (this.current.activeSMask !== null) {
        this.endSMaskGroup();
      }
      this.ctx.restore();
      if (this.transparentCanvas) {
        this.ctx = this.compositeCtx;
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.drawImage(this.transparentCanvas, 0, 0);
        this.ctx.restore();
        this.transparentCanvas = null;
      }
      this.cachedCanvases.clear();
      _webgl.WebGLUtils.clear();
      if (this.imageLayer) {
        this.imageLayer.endLayout();
      }
    },
    setLineWidth: function CanvasGraphics_setLineWidth(width) {
      this.current.lineWidth = width;
      this.ctx.lineWidth = width;
    },
    setLineCap: function CanvasGraphics_setLineCap(style) {
      this.ctx.lineCap = LINE_CAP_STYLES[style];
    },
    setLineJoin: function CanvasGraphics_setLineJoin(style) {
      this.ctx.lineJoin = LINE_JOIN_STYLES[style];
    },
    setMiterLimit: function CanvasGraphics_setMiterLimit(limit) {
      this.ctx.miterLimit = limit;
    },
    setDash: function CanvasGraphics_setDash(dashArray, dashPhase) {
      var ctx = this.ctx;
      if (ctx.setLineDash !== undefined) {
        ctx.setLineDash(dashArray);
        ctx.lineDashOffset = dashPhase;
      }
    },
    setRenderingIntent: function CanvasGraphics_setRenderingIntent(intent) {},
    setFlatness: function CanvasGraphics_setFlatness(flatness) {},
    setGState: function CanvasGraphics_setGState(states) {
      for (var i = 0, ii = states.length; i < ii; i++) {
        var state = states[i];
        var key = state[0];
        var value = state[1];
        switch (key) {
          case 'LW':
            this.setLineWidth(value);
            break;
          case 'LC':
            this.setLineCap(value);
            break;
          case 'LJ':
            this.setLineJoin(value);
            break;
          case 'ML':
            this.setMiterLimit(value);
            break;
          case 'D':
            this.setDash(value[0], value[1]);
            break;
          case 'RI':
            this.setRenderingIntent(value);
            break;
          case 'FL':
            this.setFlatness(value);
            break;
          case 'Font':
            this.setFont(value[0], value[1]);
            break;
          case 'CA':
            this.current.strokeAlpha = state[1];
            break;
          case 'ca':
            this.current.fillAlpha = state[1];
            this.ctx.globalAlpha = state[1];
            break;
          case 'BM':
            this.ctx.globalCompositeOperation = value;
            break;
          case 'SMask':
            if (this.current.activeSMask) {
              if (this.stateStack.length > 0 && this.stateStack[this.stateStack.length - 1].activeSMask === this.current.activeSMask) {
                this.suspendSMaskGroup();
              } else {
                this.endSMaskGroup();
              }
            }
            this.current.activeSMask = value ? this.tempSMask : null;
            if (this.current.activeSMask) {
              this.beginSMaskGroup();
            }
            this.tempSMask = null;
            break;
        }
      }
    },
    beginSMaskGroup: function CanvasGraphics_beginSMaskGroup() {
      var activeSMask = this.current.activeSMask;
      var drawnWidth = activeSMask.canvas.width;
      var drawnHeight = activeSMask.canvas.height;
      var cacheId = 'smaskGroupAt' + this.groupLevel;
      var scratchCanvas = this.cachedCanvases.getCanvas(cacheId, drawnWidth, drawnHeight, true);
      var currentCtx = this.ctx;
      var currentTransform = currentCtx.mozCurrentTransform;
      this.ctx.save();
      var groupCtx = scratchCanvas.context;
      groupCtx.scale(1 / activeSMask.scaleX, 1 / activeSMask.scaleY);
      groupCtx.translate(-activeSMask.offsetX, -activeSMask.offsetY);
      groupCtx.transform.apply(groupCtx, currentTransform);
      activeSMask.startTransformInverse = groupCtx.mozCurrentTransformInverse;
      copyCtxState(currentCtx, groupCtx);
      this.ctx = groupCtx;
      this.setGState([['BM', 'source-over'], ['ca', 1], ['CA', 1]]);
      this.groupStack.push(currentCtx);
      this.groupLevel++;
    },
    suspendSMaskGroup: function CanvasGraphics_endSMaskGroup() {
      var groupCtx = this.ctx;
      this.groupLevel--;
      this.ctx = this.groupStack.pop();
      composeSMask(this.ctx, this.current.activeSMask, groupCtx);
      this.ctx.restore();
      this.ctx.save();
      copyCtxState(groupCtx, this.ctx);
      this.current.resumeSMaskCtx = groupCtx;
      var deltaTransform = _util.Util.transform(this.current.activeSMask.startTransformInverse, groupCtx.mozCurrentTransform);
      this.ctx.transform.apply(this.ctx, deltaTransform);
      groupCtx.save();
      groupCtx.setTransform(1, 0, 0, 1, 0, 0);
      groupCtx.clearRect(0, 0, groupCtx.canvas.width, groupCtx.canvas.height);
      groupCtx.restore();
    },
    resumeSMaskGroup: function CanvasGraphics_endSMaskGroup() {
      var groupCtx = this.current.resumeSMaskCtx;
      var currentCtx = this.ctx;
      this.ctx = groupCtx;
      this.groupStack.push(currentCtx);
      this.groupLevel++;
    },
    endSMaskGroup: function CanvasGraphics_endSMaskGroup() {
      var groupCtx = this.ctx;
      this.groupLevel--;
      this.ctx = this.groupStack.pop();
      composeSMask(this.ctx, this.current.activeSMask, groupCtx);
      this.ctx.restore();
      copyCtxState(groupCtx, this.ctx);
      var deltaTransform = _util.Util.transform(this.current.activeSMask.startTransformInverse, groupCtx.mozCurrentTransform);
      this.ctx.transform.apply(this.ctx, deltaTransform);
    },
    save: function CanvasGraphics_save() {
      this.ctx.save();
      var old = this.current;
      this.stateStack.push(old);
      this.current = old.clone();
      this.current.resumeSMaskCtx = null;
    },
    restore: function CanvasGraphics_restore() {
      if (this.current.resumeSMaskCtx) {
        this.resumeSMaskGroup();
      }
      if (this.current.activeSMask !== null && (this.stateStack.length === 0 || this.stateStack[this.stateStack.length - 1].activeSMask !== this.current.activeSMask)) {
        this.endSMaskGroup();
      }
      if (this.stateStack.length !== 0) {
        this.current = this.stateStack.pop();
        this.ctx.restore();
        this.pendingClip = null;
        this.cachedGetSinglePixelWidth = null;
      }
    },
    transform: function CanvasGraphics_transform(a, b, c, d, e, f) {
      this.ctx.transform(a, b, c, d, e, f);
      this.cachedGetSinglePixelWidth = null;
    },
    constructPath: function CanvasGraphics_constructPath(ops, args) {
      var ctx = this.ctx;
      var current = this.current;
      var x = current.x,
          y = current.y;
      for (var i = 0, j = 0, ii = ops.length; i < ii; i++) {
        switch (ops[i] | 0) {
          case _util.OPS.rectangle:
            x = args[j++];
            y = args[j++];
            var width = args[j++];
            var height = args[j++];
            if (width === 0) {
              width = this.getSinglePixelWidth();
            }
            if (height === 0) {
              height = this.getSinglePixelWidth();
            }
            var xw = x + width;
            var yh = y + height;
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(xw, y);
            this.ctx.lineTo(xw, yh);
            this.ctx.lineTo(x, yh);
            this.ctx.lineTo(x, y);
            this.ctx.closePath();
            break;
          case _util.OPS.moveTo:
            x = args[j++];
            y = args[j++];
            ctx.moveTo(x, y);
            break;
          case _util.OPS.lineTo:
            x = args[j++];
            y = args[j++];
            ctx.lineTo(x, y);
            break;
          case _util.OPS.curveTo:
            x = args[j + 4];
            y = args[j + 5];
            ctx.bezierCurveTo(args[j], args[j + 1], args[j + 2], args[j + 3], x, y);
            j += 6;
            break;
          case _util.OPS.curveTo2:
            ctx.bezierCurveTo(x, y, args[j], args[j + 1], args[j + 2], args[j + 3]);
            x = args[j + 2];
            y = args[j + 3];
            j += 4;
            break;
          case _util.OPS.curveTo3:
            x = args[j + 2];
            y = args[j + 3];
            ctx.bezierCurveTo(args[j], args[j + 1], x, y, x, y);
            j += 4;
            break;
          case _util.OPS.closePath:
            ctx.closePath();
            break;
        }
      }
      current.setCurrentPoint(x, y);
    },
    closePath: function CanvasGraphics_closePath() {
      this.ctx.closePath();
    },
    stroke: function CanvasGraphics_stroke(consumePath) {
      consumePath = typeof consumePath !== 'undefined' ? consumePath : true;
      var ctx = this.ctx;
      var strokeColor = this.current.strokeColor;
      ctx.lineWidth = Math.max(this.getSinglePixelWidth() * MIN_WIDTH_FACTOR, this.current.lineWidth);
      ctx.globalAlpha = this.current.strokeAlpha;
      if (strokeColor && strokeColor.hasOwnProperty('type') && strokeColor.type === 'Pattern') {
        ctx.save();
        ctx.strokeStyle = strokeColor.getPattern(ctx, this);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.stroke();
      }
      if (consumePath) {
        this.consumePath();
      }
      ctx.globalAlpha = this.current.fillAlpha;
    },
    closeStroke: function CanvasGraphics_closeStroke() {
      this.closePath();
      this.stroke();
    },
    fill: function CanvasGraphics_fill(consumePath) {
      consumePath = typeof consumePath !== 'undefined' ? consumePath : true;
      var ctx = this.ctx;
      var fillColor = this.current.fillColor;
      var isPatternFill = this.current.patternFill;
      var needRestore = false;
      if (isPatternFill) {
        ctx.save();
        if (this.baseTransform) {
          ctx.setTransform.apply(ctx, this.baseTransform);
        }
        ctx.fillStyle = fillColor.getPattern(ctx, this);
        needRestore = true;
      }
      if (this.pendingEOFill) {
        ctx.fill('evenodd');
        this.pendingEOFill = false;
      } else {
        ctx.fill();
      }
      if (needRestore) {
        ctx.restore();
      }
      if (consumePath) {
        this.consumePath();
      }
    },
    eoFill: function CanvasGraphics_eoFill() {
      this.pendingEOFill = true;
      this.fill();
    },
    fillStroke: function CanvasGraphics_fillStroke() {
      this.fill(false);
      this.stroke(false);
      this.consumePath();
    },
    eoFillStroke: function CanvasGraphics_eoFillStroke() {
      this.pendingEOFill = true;
      this.fillStroke();
    },
    closeFillStroke: function CanvasGraphics_closeFillStroke() {
      this.closePath();
      this.fillStroke();
    },
    closeEOFillStroke: function CanvasGraphics_closeEOFillStroke() {
      this.pendingEOFill = true;
      this.closePath();
      this.fillStroke();
    },
    endPath: function CanvasGraphics_endPath() {
      this.consumePath();
    },
    clip: function CanvasGraphics_clip() {
      this.pendingClip = NORMAL_CLIP;
    },
    eoClip: function CanvasGraphics_eoClip() {
      this.pendingClip = EO_CLIP;
    },
    beginText: function CanvasGraphics_beginText() {
      this.current.textMatrix = _util.IDENTITY_MATRIX;
      this.current.textMatrixScale = 1;
      this.current.x = this.current.lineX = 0;
      this.current.y = this.current.lineY = 0;
    },
    endText: function CanvasGraphics_endText() {
      var paths = this.pendingTextPaths;
      var ctx = this.ctx;
      if (paths === undefined) {
        ctx.beginPath();
        return;
      }
      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        ctx.setTransform.apply(ctx, path.transform);
        ctx.translate(path.x, path.y);
        path.addToPath(ctx, path.fontSize);
      }
      ctx.restore();
      ctx.clip();
      ctx.beginPath();
      delete this.pendingTextPaths;
    },
    setCharSpacing: function CanvasGraphics_setCharSpacing(spacing) {
      this.current.charSpacing = spacing;
    },
    setWordSpacing: function CanvasGraphics_setWordSpacing(spacing) {
      this.current.wordSpacing = spacing;
    },
    setHScale: function CanvasGraphics_setHScale(scale) {
      this.current.textHScale = scale / 100;
    },
    setLeading: function CanvasGraphics_setLeading(leading) {
      this.current.leading = -leading;
    },
    setFont: function CanvasGraphics_setFont(fontRefName, size) {
      var fontObj = this.commonObjs.get(fontRefName);
      var current = this.current;
      if (!fontObj) {
        throw new Error('Can\'t find font for ' + fontRefName);
      }
      current.fontMatrix = fontObj.fontMatrix ? fontObj.fontMatrix : _util.FONT_IDENTITY_MATRIX;
      if (current.fontMatrix[0] === 0 || current.fontMatrix[3] === 0) {
        (0, _util.warn)('Invalid font matrix for font ' + fontRefName);
      }
      if (size < 0) {
        size = -size;
        current.fontDirection = -1;
      } else {
        current.fontDirection = 1;
      }
      this.current.font = fontObj;
      this.current.fontSize = size;
      if (fontObj.isType3Font) {
        return;
      }
      var name = fontObj.loadedName || 'sans-serif';
      var bold = fontObj.black ? '900' : fontObj.bold ? 'bold' : 'normal';
      var italic = fontObj.italic ? 'italic' : 'normal';
      var typeface = '"' + name + '", ' + fontObj.fallbackName;
      var browserFontSize = size < MIN_FONT_SIZE ? MIN_FONT_SIZE : size > MAX_FONT_SIZE ? MAX_FONT_SIZE : size;
      this.current.fontSizeScale = size / browserFontSize;
      var rule = italic + ' ' + bold + ' ' + browserFontSize + 'px ' + typeface;
      this.ctx.font = rule;
    },
    setTextRenderingMode: function CanvasGraphics_setTextRenderingMode(mode) {
      this.current.textRenderingMode = mode;
    },
    setTextRise: function CanvasGraphics_setTextRise(rise) {
      this.current.textRise = rise;
    },
    moveText: function CanvasGraphics_moveText(x, y) {
      this.current.x = this.current.lineX += x;
      this.current.y = this.current.lineY += y;
    },
    setLeadingMoveText: function CanvasGraphics_setLeadingMoveText(x, y) {
      this.setLeading(-y);
      this.moveText(x, y);
    },
    setTextMatrix: function CanvasGraphics_setTextMatrix(a, b, c, d, e, f) {
      this.current.textMatrix = [a, b, c, d, e, f];
      this.current.textMatrixScale = Math.sqrt(a * a + b * b);
      this.current.x = this.current.lineX = 0;
      this.current.y = this.current.lineY = 0;
    },
    nextLine: function CanvasGraphics_nextLine() {
      this.moveText(0, this.current.leading);
    },
    paintChar: function CanvasGraphics_paintChar(character, x, y) {
      var ctx = this.ctx;
      var current = this.current;
      var font = current.font;
      var textRenderingMode = current.textRenderingMode;
      var fontSize = current.fontSize / current.fontSizeScale;
      var fillStrokeMode = textRenderingMode & _util.TextRenderingMode.FILL_STROKE_MASK;
      var isAddToPathSet = !!(textRenderingMode & _util.TextRenderingMode.ADD_TO_PATH_FLAG);
      var addToPath;
      if (font.disableFontFace || isAddToPathSet) {
        addToPath = font.getPathGenerator(this.commonObjs, character);
      }
      if (font.disableFontFace) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        addToPath(ctx, fontSize);
        if (fillStrokeMode === _util.TextRenderingMode.FILL || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {
          ctx.fill();
        }
        if (fillStrokeMode === _util.TextRenderingMode.STROKE || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {
          ctx.stroke();
        }
        ctx.restore();
      } else {
        if (fillStrokeMode === _util.TextRenderingMode.FILL || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {
          ctx.fillText(character, x, y);
        }
        if (fillStrokeMode === _util.TextRenderingMode.STROKE || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {
          ctx.strokeText(character, x, y);
        }
      }
      if (isAddToPathSet) {
        var paths = this.pendingTextPaths || (this.pendingTextPaths = []);
        paths.push({
          transform: ctx.mozCurrentTransform,
          x: x,
          y: y,
          fontSize: fontSize,
          addToPath: addToPath
        });
      }
    },
    get isFontSubpixelAAEnabled() {
      var ctx = this.canvasFactory.create(10, 10).context;
      ctx.scale(1.5, 1);
      ctx.fillText('I', 0, 10);
      var data = ctx.getImageData(0, 0, 10, 10).data;
      var enabled = false;
      for (var i = 3; i < data.length; i += 4) {
        if (data[i] > 0 && data[i] < 255) {
          enabled = true;
          break;
        }
      }
      return (0, _util.shadow)(this, 'isFontSubpixelAAEnabled', enabled);
    },
    showText: function CanvasGraphics_showText(glyphs) {
      var current = this.current;
      var font = current.font;
      if (font.isType3Font) {
        return this.showType3Text(glyphs);
      }
      var fontSize = current.fontSize;
      if (fontSize === 0) {
        return;
      }
      var ctx = this.ctx;
      var fontSizeScale = current.fontSizeScale;
      var charSpacing = current.charSpacing;
      var wordSpacing = current.wordSpacing;
      var fontDirection = current.fontDirection;
      var textHScale = current.textHScale * fontDirection;
      var glyphsLength = glyphs.length;
      var vertical = font.vertical;
      var spacingDir = vertical ? 1 : -1;
      var defaultVMetrics = font.defaultVMetrics;
      var widthAdvanceScale = fontSize * current.fontMatrix[0];
      var simpleFillText = current.textRenderingMode === _util.TextRenderingMode.FILL && !font.disableFontFace;
      ctx.save();
      ctx.transform.apply(ctx, current.textMatrix);
      ctx.translate(current.x, current.y + current.textRise);
      if (current.patternFill) {
        ctx.fillStyle = current.fillColor.getPattern(ctx, this);
      }
      if (fontDirection > 0) {
        ctx.scale(textHScale, -1);
      } else {
        ctx.scale(textHScale, 1);
      }
      var lineWidth = current.lineWidth;
      var scale = current.textMatrixScale;
      if (scale === 0 || lineWidth === 0) {
        var fillStrokeMode = current.textRenderingMode & _util.TextRenderingMode.FILL_STROKE_MASK;
        if (fillStrokeMode === _util.TextRenderingMode.STROKE || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {
          this.cachedGetSinglePixelWidth = null;
          lineWidth = this.getSinglePixelWidth() * MIN_WIDTH_FACTOR;
        }
      } else {
        lineWidth /= scale;
      }
      if (fontSizeScale !== 1.0) {
        ctx.scale(fontSizeScale, fontSizeScale);
        lineWidth /= fontSizeScale;
      }
      ctx.lineWidth = lineWidth;
      var x = 0,
          i;
      for (i = 0; i < glyphsLength; ++i) {
        var glyph = glyphs[i];
        if ((0, _util.isNum)(glyph)) {
          x += spacingDir * glyph * fontSize / 1000;
          continue;
        }
        var restoreNeeded = false;
        var spacing = (glyph.isSpace ? wordSpacing : 0) + charSpacing;
        var character = glyph.fontChar;
        var accent = glyph.accent;
        var scaledX, scaledY, scaledAccentX, scaledAccentY;
        var width = glyph.width;
        if (vertical) {
          var vmetric, vx, vy;
          vmetric = glyph.vmetric || defaultVMetrics;
          vx = glyph.vmetric ? vmetric[1] : width * 0.5;
          vx = -vx * widthAdvanceScale;
          vy = vmetric[2] * widthAdvanceScale;
          width = vmetric ? -vmetric[0] : width;
          scaledX = vx / fontSizeScale;
          scaledY = (x + vy) / fontSizeScale;
        } else {
          scaledX = x / fontSizeScale;
          scaledY = 0;
        }
        if (font.remeasure && width > 0) {
          var measuredWidth = ctx.measureText(character).width * 1000 / fontSize * fontSizeScale;
          if (width < measuredWidth && this.isFontSubpixelAAEnabled) {
            var characterScaleX = width / measuredWidth;
            restoreNeeded = true;
            ctx.save();
            ctx.scale(characterScaleX, 1);
            scaledX /= characterScaleX;
          } else if (width !== measuredWidth) {
            scaledX += (width - measuredWidth) / 2000 * fontSize / fontSizeScale;
          }
        }
        if (glyph.isInFont || font.missingFile) {
          if (simpleFillText && !accent) {
            ctx.fillText(character, scaledX, scaledY);
          } else {
            this.paintChar(character, scaledX, scaledY);
            if (accent) {
              scaledAccentX = scaledX + accent.offset.x / fontSizeScale;
              scaledAccentY = scaledY - accent.offset.y / fontSizeScale;
              this.paintChar(accent.fontChar, scaledAccentX, scaledAccentY);
            }
          }
        }
        var charWidth = width * widthAdvanceScale + spacing * fontDirection;
        x += charWidth;
        if (restoreNeeded) {
          ctx.restore();
        }
      }
      if (vertical) {
        current.y -= x * textHScale;
      } else {
        current.x += x * textHScale;
      }
      ctx.restore();
    },
    showType3Text: function CanvasGraphics_showType3Text(glyphs) {
      var ctx = this.ctx;
      var current = this.current;
      var font = current.font;
      var fontSize = current.fontSize;
      var fontDirection = current.fontDirection;
      var spacingDir = font.vertical ? 1 : -1;
      var charSpacing = current.charSpacing;
      var wordSpacing = current.wordSpacing;
      var textHScale = current.textHScale * fontDirection;
      var fontMatrix = current.fontMatrix || _util.FONT_IDENTITY_MATRIX;
      var glyphsLength = glyphs.length;
      var isTextInvisible = current.textRenderingMode === _util.TextRenderingMode.INVISIBLE;
      var i, glyph, width, spacingLength;
      if (isTextInvisible || fontSize === 0) {
        return;
      }
      this.cachedGetSinglePixelWidth = null;
      ctx.save();
      ctx.transform.apply(ctx, current.textMatrix);
      ctx.translate(current.x, current.y);
      ctx.scale(textHScale, fontDirection);
      for (i = 0; i < glyphsLength; ++i) {
        glyph = glyphs[i];
        if ((0, _util.isNum)(glyph)) {
          spacingLength = spacingDir * glyph * fontSize / 1000;
          this.ctx.translate(spacingLength, 0);
          current.x += spacingLength * textHScale;
          continue;
        }
        var spacing = (glyph.isSpace ? wordSpacing : 0) + charSpacing;
        var operatorList = font.charProcOperatorList[glyph.operatorListId];
        if (!operatorList) {
          (0, _util.warn)('Type3 character "' + glyph.operatorListId + '" is not available.');
          continue;
        }
        this.processingType3 = glyph;
        this.save();
        ctx.scale(fontSize, fontSize);
        ctx.transform.apply(ctx, fontMatrix);
        this.executeOperatorList(operatorList);
        this.restore();
        var transformed = _util.Util.applyTransform([glyph.width, 0], fontMatrix);
        width = transformed[0] * fontSize + spacing;
        ctx.translate(width, 0);
        current.x += width * textHScale;
      }
      ctx.restore();
      this.processingType3 = null;
    },
    setCharWidth: function CanvasGraphics_setCharWidth(xWidth, yWidth) {},
    setCharWidthAndBounds: function CanvasGraphics_setCharWidthAndBounds(xWidth, yWidth, llx, lly, urx, ury) {
      this.ctx.rect(llx, lly, urx - llx, ury - lly);
      this.clip();
      this.endPath();
    },
    getColorN_Pattern: function CanvasGraphics_getColorN_Pattern(IR) {
      var _this = this;

      var pattern;
      if (IR[0] === 'TilingPattern') {
        var color = IR[1];
        var baseTransform = this.baseTransform || this.ctx.mozCurrentTransform.slice();
        var canvasGraphicsFactory = {
          createCanvasGraphics: function createCanvasGraphics(ctx) {
            return new CanvasGraphics(ctx, _this.commonObjs, _this.objs, _this.canvasFactory);
          }
        };
        pattern = new _pattern_helper.TilingPattern(IR, color, this.ctx, canvasGraphicsFactory, baseTransform);
      } else {
        pattern = (0, _pattern_helper.getShadingPatternFromIR)(IR);
      }
      return pattern;
    },
    setStrokeColorN: function CanvasGraphics_setStrokeColorN() {
      this.current.strokeColor = this.getColorN_Pattern(arguments);
    },
    setFillColorN: function CanvasGraphics_setFillColorN() {
      this.current.fillColor = this.getColorN_Pattern(arguments);
      this.current.patternFill = true;
    },
    setStrokeRGBColor: function CanvasGraphics_setStrokeRGBColor(r, g, b) {
      var color = _util.Util.makeCssRgb(r, g, b);
      this.ctx.strokeStyle = color;
      this.current.strokeColor = color;
    },
    setFillRGBColor: function CanvasGraphics_setFillRGBColor(r, g, b) {
      var color = _util.Util.makeCssRgb(r, g, b);
      this.ctx.fillStyle = color;
      this.current.fillColor = color;
      this.current.patternFill = false;
    },
    shadingFill: function CanvasGraphics_shadingFill(patternIR) {
      var ctx = this.ctx;
      this.save();
      var pattern = (0, _pattern_helper.getShadingPatternFromIR)(patternIR);
      ctx.fillStyle = pattern.getPattern(ctx, this, true);
      var inv = ctx.mozCurrentTransformInverse;
      if (inv) {
        var canvas = ctx.canvas;
        var width = canvas.width;
        var height = canvas.height;
        var bl = _util.Util.applyTransform([0, 0], inv);
        var br = _util.Util.applyTransform([0, height], inv);
        var ul = _util.Util.applyTransform([width, 0], inv);
        var ur = _util.Util.applyTransform([width, height], inv);
        var x0 = Math.min(bl[0], br[0], ul[0], ur[0]);
        var y0 = Math.min(bl[1], br[1], ul[1], ur[1]);
        var x1 = Math.max(bl[0], br[0], ul[0], ur[0]);
        var y1 = Math.max(bl[1], br[1], ul[1], ur[1]);
        this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      } else {
        this.ctx.fillRect(-1e10, -1e10, 2e10, 2e10);
      }
      this.restore();
    },
    beginInlineImage: function CanvasGraphics_beginInlineImage() {
      throw new Error('Should not call beginInlineImage');
    },
    beginImageData: function CanvasGraphics_beginImageData() {
      throw new Error('Should not call beginImageData');
    },
    paintFormXObjectBegin: function CanvasGraphics_paintFormXObjectBegin(matrix, bbox) {
      this.save();
      this.baseTransformStack.push(this.baseTransform);
      if (Array.isArray(matrix) && matrix.length === 6) {
        this.transform.apply(this, matrix);
      }
      this.baseTransform = this.ctx.mozCurrentTransform;
      if (Array.isArray(bbox) && bbox.length === 4) {
        var width = bbox[2] - bbox[0];
        var height = bbox[3] - bbox[1];
        this.ctx.rect(bbox[0], bbox[1], width, height);
        this.clip();
        this.endPath();
      }
    },
    paintFormXObjectEnd: function CanvasGraphics_paintFormXObjectEnd() {
      this.restore();
      this.baseTransform = this.baseTransformStack.pop();
    },
    beginGroup: function CanvasGraphics_beginGroup(group) {
      this.save();
      var currentCtx = this.ctx;
      if (!group.isolated) {
        (0, _util.info)('TODO: Support non-isolated groups.');
      }
      if (group.knockout) {
        (0, _util.warn)('Knockout groups not supported.');
      }
      var currentTransform = currentCtx.mozCurrentTransform;
      if (group.matrix) {
        currentCtx.transform.apply(currentCtx, group.matrix);
      }
      if (!group.bbox) {
        throw new Error('Bounding box is required.');
      }
      var bounds = _util.Util.getAxialAlignedBoundingBox(group.bbox, currentCtx.mozCurrentTransform);
      var canvasBounds = [0, 0, currentCtx.canvas.width, currentCtx.canvas.height];
      bounds = _util.Util.intersect(bounds, canvasBounds) || [0, 0, 0, 0];
      var offsetX = Math.floor(bounds[0]);
      var offsetY = Math.floor(bounds[1]);
      var drawnWidth = Math.max(Math.ceil(bounds[2]) - offsetX, 1);
      var drawnHeight = Math.max(Math.ceil(bounds[3]) - offsetY, 1);
      var scaleX = 1,
          scaleY = 1;
      if (drawnWidth > MAX_GROUP_SIZE) {
        scaleX = drawnWidth / MAX_GROUP_SIZE;
        drawnWidth = MAX_GROUP_SIZE;
      }
      if (drawnHeight > MAX_GROUP_SIZE) {
        scaleY = drawnHeight / MAX_GROUP_SIZE;
        drawnHeight = MAX_GROUP_SIZE;
      }
      var cacheId = 'groupAt' + this.groupLevel;
      if (group.smask) {
        cacheId += '_smask_' + this.smaskCounter++ % 2;
      }
      var scratchCanvas = this.cachedCanvases.getCanvas(cacheId, drawnWidth, drawnHeight, true);
      var groupCtx = scratchCanvas.context;
      groupCtx.scale(1 / scaleX, 1 / scaleY);
      groupCtx.translate(-offsetX, -offsetY);
      groupCtx.transform.apply(groupCtx, currentTransform);
      if (group.smask) {
        this.smaskStack.push({
          canvas: scratchCanvas.canvas,
          context: groupCtx,
          offsetX: offsetX,
          offsetY: offsetY,
          scaleX: scaleX,
          scaleY: scaleY,
          subtype: group.smask.subtype,
          backdrop: group.smask.backdrop,
          transferMap: group.smask.transferMap || null,
          startTransformInverse: null
        });
      } else {
        currentCtx.setTransform(1, 0, 0, 1, 0, 0);
        currentCtx.translate(offsetX, offsetY);
        currentCtx.scale(scaleX, scaleY);
      }
      copyCtxState(currentCtx, groupCtx);
      this.ctx = groupCtx;
      this.setGState([['BM', 'source-over'], ['ca', 1], ['CA', 1]]);
      this.groupStack.push(currentCtx);
      this.groupLevel++;
      this.current.activeSMask = null;
    },
    endGroup: function CanvasGraphics_endGroup(group) {
      this.groupLevel--;
      var groupCtx = this.ctx;
      this.ctx = this.groupStack.pop();
      if (this.ctx.imageSmoothingEnabled !== undefined) {
        this.ctx.imageSmoothingEnabled = false;
      } else {
        this.ctx.mozImageSmoothingEnabled = false;
      }
      if (group.smask) {
        this.tempSMask = this.smaskStack.pop();
      } else {
        this.ctx.drawImage(groupCtx.canvas, 0, 0);
      }
      this.restore();
    },
    beginAnnotations: function CanvasGraphics_beginAnnotations() {
      this.save();
      if (this.baseTransform) {
        this.ctx.setTransform.apply(this.ctx, this.baseTransform);
      }
    },
    endAnnotations: function CanvasGraphics_endAnnotations() {
      this.restore();
    },
    beginAnnotation: function CanvasGraphics_beginAnnotation(rect, transform, matrix) {
      this.save();
      resetCtxToDefault(this.ctx);
      this.current = new CanvasExtraState();
      if (Array.isArray(rect) && rect.length === 4) {
        var width = rect[2] - rect[0];
        var height = rect[3] - rect[1];
        this.ctx.rect(rect[0], rect[1], width, height);
        this.clip();
        this.endPath();
      }
      this.transform.apply(this, transform);
      this.transform.apply(this, matrix);
    },
    endAnnotation: function CanvasGraphics_endAnnotation() {
      this.restore();
    },
    paintJpegXObject: function CanvasGraphics_paintJpegXObject(objId, w, h) {
      var domImage = this.objs.get(objId);
      if (!domImage) {
        (0, _util.warn)('Dependent image isn\'t ready yet');
        return;
      }
      this.save();
      var ctx = this.ctx;
      ctx.scale(1 / w, -1 / h);
      ctx.drawImage(domImage, 0, 0, domImage.width, domImage.height, 0, -h, w, h);
      if (this.imageLayer) {
        var currentTransform = ctx.mozCurrentTransformInverse;
        var position = this.getCanvasPosition(0, 0);
        this.imageLayer.appendImage({
          objId: objId,
          left: position[0],
          top: position[1],
          width: w / currentTransform[0],
          height: h / currentTransform[3]
        });
      }
      this.restore();
    },
    paintImageMaskXObject: function CanvasGraphics_paintImageMaskXObject(img) {
      var ctx = this.ctx;
      var width = img.width,
          height = img.height;
      var fillColor = this.current.fillColor;
      var isPatternFill = this.current.patternFill;
      var glyph = this.processingType3;
      if (COMPILE_TYPE3_GLYPHS && glyph && glyph.compiled === undefined) {
        if (width <= MAX_SIZE_TO_COMPILE && height <= MAX_SIZE_TO_COMPILE) {
          glyph.compiled = compileType3Glyph({
            data: img.data,
            width: width,
            height: height
          });
        } else {
          glyph.compiled = null;
        }
      }
      if (glyph && glyph.compiled) {
        glyph.compiled(ctx);
        return;
      }
      var maskCanvas = this.cachedCanvases.getCanvas('maskCanvas', width, height);
      var maskCtx = maskCanvas.context;
      maskCtx.save();
      putBinaryImageMask(maskCtx, img);
      maskCtx.globalCompositeOperation = 'source-in';
      maskCtx.fillStyle = isPatternFill ? fillColor.getPattern(maskCtx, this) : fillColor;
      maskCtx.fillRect(0, 0, width, height);
      maskCtx.restore();
      this.paintInlineImageXObject(maskCanvas.canvas);
    },
    paintImageMaskXObjectRepeat: function CanvasGraphics_paintImageMaskXObjectRepeat(imgData, scaleX, scaleY, positions) {
      var width = imgData.width;
      var height = imgData.height;
      var fillColor = this.current.fillColor;
      var isPatternFill = this.current.patternFill;
      var maskCanvas = this.cachedCanvases.getCanvas('maskCanvas', width, height);
      var maskCtx = maskCanvas.context;
      maskCtx.save();
      putBinaryImageMask(maskCtx, imgData);
      maskCtx.globalCompositeOperation = 'source-in';
      maskCtx.fillStyle = isPatternFill ? fillColor.getPattern(maskCtx, this) : fillColor;
      maskCtx.fillRect(0, 0, width, height);
      maskCtx.restore();
      var ctx = this.ctx;
      for (var i = 0, ii = positions.length; i < ii; i += 2) {
        ctx.save();
        ctx.transform(scaleX, 0, 0, scaleY, positions[i], positions[i + 1]);
        ctx.scale(1, -1);
        ctx.drawImage(maskCanvas.canvas, 0, 0, width, height, 0, -1, 1, 1);
        ctx.restore();
      }
    },
    paintImageMaskXObjectGroup: function CanvasGraphics_paintImageMaskXObjectGroup(images) {
      var ctx = this.ctx;
      var fillColor = this.current.fillColor;
      var isPatternFill = this.current.patternFill;
      for (var i = 0, ii = images.length; i < ii; i++) {
        var image = images[i];
        var width = image.width,
            height = image.height;
        var maskCanvas = this.cachedCanvases.getCanvas('maskCanvas', width, height);
        var maskCtx = maskCanvas.context;
        maskCtx.save();
        putBinaryImageMask(maskCtx, image);
        maskCtx.globalCompositeOperation = 'source-in';
        maskCtx.fillStyle = isPatternFill ? fillColor.getPattern(maskCtx, this) : fillColor;
        maskCtx.fillRect(0, 0, width, height);
        maskCtx.restore();
        ctx.save();
        ctx.transform.apply(ctx, image.transform);
        ctx.scale(1, -1);
        ctx.drawImage(maskCanvas.canvas, 0, 0, width, height, 0, -1, 1, 1);
        ctx.restore();
      }
    },
    paintImageXObject: function CanvasGraphics_paintImageXObject(objId) {
      var imgData = this.objs.get(objId);
      if (!imgData) {
        (0, _util.warn)('Dependent image isn\'t ready yet');
        return;
      }
      this.paintInlineImageXObject(imgData);
    },
    paintImageXObjectRepeat: function CanvasGraphics_paintImageXObjectRepeat(objId, scaleX, scaleY, positions) {
      var imgData = this.objs.get(objId);
      if (!imgData) {
        (0, _util.warn)('Dependent image isn\'t ready yet');
        return;
      }
      var width = imgData.width;
      var height = imgData.height;
      var map = [];
      for (var i = 0, ii = positions.length; i < ii; i += 2) {
        map.push({
          transform: [scaleX, 0, 0, scaleY, positions[i], positions[i + 1]],
          x: 0,
          y: 0,
          w: width,
          h: height
        });
      }
      this.paintInlineImageXObjectGroup(imgData, map);
    },
    paintInlineImageXObject: function CanvasGraphics_paintInlineImageXObject(imgData) {
      var width = imgData.width;
      var height = imgData.height;
      var ctx = this.ctx;
      this.save();
      ctx.scale(1 / width, -1 / height);
      var currentTransform = ctx.mozCurrentTransformInverse;
      var a = currentTransform[0],
          b = currentTransform[1];
      var widthScale = Math.max(Math.sqrt(a * a + b * b), 1);
      var c = currentTransform[2],
          d = currentTransform[3];
      var heightScale = Math.max(Math.sqrt(c * c + d * d), 1);
      var imgToPaint, tmpCanvas;
      if (imgData instanceof HTMLElement || !imgData.data) {
        imgToPaint = imgData;
      } else {
        tmpCanvas = this.cachedCanvases.getCanvas('inlineImage', width, height);
        var tmpCtx = tmpCanvas.context;
        putBinaryImageData(tmpCtx, imgData);
        imgToPaint = tmpCanvas.canvas;
      }
      var paintWidth = width,
          paintHeight = height;
      var tmpCanvasId = 'prescale1';
      while (widthScale > 2 && paintWidth > 1 || heightScale > 2 && paintHeight > 1) {
        var newWidth = paintWidth,
            newHeight = paintHeight;
        if (widthScale > 2 && paintWidth > 1) {
          newWidth = Math.ceil(paintWidth / 2);
          widthScale /= paintWidth / newWidth;
        }
        if (heightScale > 2 && paintHeight > 1) {
          newHeight = Math.ceil(paintHeight / 2);
          heightScale /= paintHeight / newHeight;
        }
        tmpCanvas = this.cachedCanvases.getCanvas(tmpCanvasId, newWidth, newHeight);
        tmpCtx = tmpCanvas.context;
        tmpCtx.clearRect(0, 0, newWidth, newHeight);
        tmpCtx.drawImage(imgToPaint, 0, 0, paintWidth, paintHeight, 0, 0, newWidth, newHeight);
        imgToPaint = tmpCanvas.canvas;
        paintWidth = newWidth;
        paintHeight = newHeight;
        tmpCanvasId = tmpCanvasId === 'prescale1' ? 'prescale2' : 'prescale1';
      }
      ctx.drawImage(imgToPaint, 0, 0, paintWidth, paintHeight, 0, -height, width, height);
      if (this.imageLayer) {
        var position = this.getCanvasPosition(0, -height);
        this.imageLayer.appendImage({
          imgData: imgData,
          left: position[0],
          top: position[1],
          width: width / currentTransform[0],
          height: height / currentTransform[3]
        });
      }
      this.restore();
    },
    paintInlineImageXObjectGroup: function CanvasGraphics_paintInlineImageXObjectGroup(imgData, map) {
      var ctx = this.ctx;
      var w = imgData.width;
      var h = imgData.height;
      var tmpCanvas = this.cachedCanvases.getCanvas('inlineImage', w, h);
      var tmpCtx = tmpCanvas.context;
      putBinaryImageData(tmpCtx, imgData);
      for (var i = 0, ii = map.length; i < ii; i++) {
        var entry = map[i];
        ctx.save();
        ctx.transform.apply(ctx, entry.transform);
        ctx.scale(1, -1);
        ctx.drawImage(tmpCanvas.canvas, entry.x, entry.y, entry.w, entry.h, 0, -1, 1, 1);
        if (this.imageLayer) {
          var position = this.getCanvasPosition(entry.x, entry.y);
          this.imageLayer.appendImage({
            imgData: imgData,
            left: position[0],
            top: position[1],
            width: w,
            height: h
          });
        }
        ctx.restore();
      }
    },
    paintSolidColorImageMask: function CanvasGraphics_paintSolidColorImageMask() {
      this.ctx.fillRect(0, 0, 1, 1);
    },
    paintXObject: function CanvasGraphics_paintXObject() {
      (0, _util.warn)('Unsupported \'paintXObject\' command.');
    },
    markPoint: function CanvasGraphics_markPoint(tag) {},
    markPointProps: function CanvasGraphics_markPointProps(tag, properties) {},
    beginMarkedContent: function CanvasGraphics_beginMarkedContent(tag) {},
    beginMarkedContentProps: function CanvasGraphics_beginMarkedContentProps(tag, properties) {},
    endMarkedContent: function CanvasGraphics_endMarkedContent() {},
    beginCompat: function CanvasGraphics_beginCompat() {},
    endCompat: function CanvasGraphics_endCompat() {},
    consumePath: function CanvasGraphics_consumePath() {
      var ctx = this.ctx;
      if (this.pendingClip) {
        if (this.pendingClip === EO_CLIP) {
          ctx.clip('evenodd');
        } else {
          ctx.clip();
        }
        this.pendingClip = null;
      }
      ctx.beginPath();
    },
    getSinglePixelWidth: function CanvasGraphics_getSinglePixelWidth(scale) {
      if (this.cachedGetSinglePixelWidth === null) {
        this.ctx.save();
        var inverse = this.ctx.mozCurrentTransformInverse;
        this.ctx.restore();
        this.cachedGetSinglePixelWidth = Math.sqrt(Math.max(inverse[0] * inverse[0] + inverse[1] * inverse[1], inverse[2] * inverse[2] + inverse[3] * inverse[3]));
      }
      return this.cachedGetSinglePixelWidth;
    },
    getCanvasPosition: function CanvasGraphics_getCanvasPosition(x, y) {
      var transform = this.ctx.mozCurrentTransform;
      return [transform[0] * x + transform[2] * y + transform[4], transform[1] * x + transform[3] * y + transform[5]];
    }
  };
  for (var op in _util.OPS) {
    CanvasGraphics.prototype[_util.OPS[op]] = CanvasGraphics.prototype[op];
  }
  return CanvasGraphics;
}();
exports.CanvasGraphics = CanvasGraphics;

/***/ }),
/* 120 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TilingPattern = exports.getShadingPatternFromIR = undefined;

var _util = __w_pdfjs_require__(0);

var _webgl = __w_pdfjs_require__(70);

var ShadingIRs = {};
ShadingIRs.RadialAxial = {
  fromIR: function RadialAxial_fromIR(raw) {
    var type = raw[1];
    var colorStops = raw[2];
    var p0 = raw[3];
    var p1 = raw[4];
    var r0 = raw[5];
    var r1 = raw[6];
    return {
      type: 'Pattern',
      getPattern: function RadialAxial_getPattern(ctx) {
        var grad;
        if (type === 'axial') {
          grad = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
        } else if (type === 'radial') {
          grad = ctx.createRadialGradient(p0[0], p0[1], r0, p1[0], p1[1], r1);
        }
        for (var i = 0, ii = colorStops.length; i < ii; ++i) {
          var c = colorStops[i];
          grad.addColorStop(c[0], c[1]);
        }
        return grad;
      }
    };
  }
};
var createMeshCanvas = function createMeshCanvasClosure() {
  function drawTriangle(data, context, p1, p2, p3, c1, c2, c3) {
    var coords = context.coords,
        colors = context.colors;
    var bytes = data.data,
        rowSize = data.width * 4;
    var tmp;
    if (coords[p1 + 1] > coords[p2 + 1]) {
      tmp = p1;
      p1 = p2;
      p2 = tmp;
      tmp = c1;
      c1 = c2;
      c2 = tmp;
    }
    if (coords[p2 + 1] > coords[p3 + 1]) {
      tmp = p2;
      p2 = p3;
      p3 = tmp;
      tmp = c2;
      c2 = c3;
      c3 = tmp;
    }
    if (coords[p1 + 1] > coords[p2 + 1]) {
      tmp = p1;
      p1 = p2;
      p2 = tmp;
      tmp = c1;
      c1 = c2;
      c2 = tmp;
    }
    var x1 = (coords[p1] + context.offsetX) * context.scaleX;
    var y1 = (coords[p1 + 1] + context.offsetY) * context.scaleY;
    var x2 = (coords[p2] + context.offsetX) * context.scaleX;
    var y2 = (coords[p2 + 1] + context.offsetY) * context.scaleY;
    var x3 = (coords[p3] + context.offsetX) * context.scaleX;
    var y3 = (coords[p3 + 1] + context.offsetY) * context.scaleY;
    if (y1 >= y3) {
      return;
    }
    var c1r = colors[c1],
        c1g = colors[c1 + 1],
        c1b = colors[c1 + 2];
    var c2r = colors[c2],
        c2g = colors[c2 + 1],
        c2b = colors[c2 + 2];
    var c3r = colors[c3],
        c3g = colors[c3 + 1],
        c3b = colors[c3 + 2];
    var minY = Math.round(y1),
        maxY = Math.round(y3);
    var xa, car, cag, cab;
    var xb, cbr, cbg, cbb;
    var k;
    for (var y = minY; y <= maxY; y++) {
      if (y < y2) {
        k = y < y1 ? 0 : y1 === y2 ? 1 : (y1 - y) / (y1 - y2);
        xa = x1 - (x1 - x2) * k;
        car = c1r - (c1r - c2r) * k;
        cag = c1g - (c1g - c2g) * k;
        cab = c1b - (c1b - c2b) * k;
      } else {
        k = y > y3 ? 1 : y2 === y3 ? 0 : (y2 - y) / (y2 - y3);
        xa = x2 - (x2 - x3) * k;
        car = c2r - (c2r - c3r) * k;
        cag = c2g - (c2g - c3g) * k;
        cab = c2b - (c2b - c3b) * k;
      }
      k = y < y1 ? 0 : y > y3 ? 1 : (y1 - y) / (y1 - y3);
      xb = x1 - (x1 - x3) * k;
      cbr = c1r - (c1r - c3r) * k;
      cbg = c1g - (c1g - c3g) * k;
      cbb = c1b - (c1b - c3b) * k;
      var x1_ = Math.round(Math.min(xa, xb));
      var x2_ = Math.round(Math.max(xa, xb));
      var j = rowSize * y + x1_ * 4;
      for (var x = x1_; x <= x2_; x++) {
        k = (xa - x) / (xa - xb);
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        bytes[j++] = car - (car - cbr) * k | 0;
        bytes[j++] = cag - (cag - cbg) * k | 0;
        bytes[j++] = cab - (cab - cbb) * k | 0;
        bytes[j++] = 255;
      }
    }
  }
  function drawFigure(data, figure, context) {
    var ps = figure.coords;
    var cs = figure.colors;
    var i, ii;
    switch (figure.type) {
      case 'lattice':
        var verticesPerRow = figure.verticesPerRow;
        var rows = Math.floor(ps.length / verticesPerRow) - 1;
        var cols = verticesPerRow - 1;
        for (i = 0; i < rows; i++) {
          var q = i * verticesPerRow;
          for (var j = 0; j < cols; j++, q++) {
            drawTriangle(data, context, ps[q], ps[q + 1], ps[q + verticesPerRow], cs[q], cs[q + 1], cs[q + verticesPerRow]);
            drawTriangle(data, context, ps[q + verticesPerRow + 1], ps[q + 1], ps[q + verticesPerRow], cs[q + verticesPerRow + 1], cs[q + 1], cs[q + verticesPerRow]);
          }
        }
        break;
      case 'triangles':
        for (i = 0, ii = ps.length; i < ii; i += 3) {
          drawTriangle(data, context, ps[i], ps[i + 1], ps[i + 2], cs[i], cs[i + 1], cs[i + 2]);
        }
        break;
      default:
        throw new Error('illegal figure');
    }
  }
  function createMeshCanvas(bounds, combinesScale, coords, colors, figures, backgroundColor, cachedCanvases) {
    var EXPECTED_SCALE = 1.1;
    var MAX_PATTERN_SIZE = 3000;
    var BORDER_SIZE = 2;
    var offsetX = Math.floor(bounds[0]);
    var offsetY = Math.floor(bounds[1]);
    var boundsWidth = Math.ceil(bounds[2]) - offsetX;
    var boundsHeight = Math.ceil(bounds[3]) - offsetY;
    var width = Math.min(Math.ceil(Math.abs(boundsWidth * combinesScale[0] * EXPECTED_SCALE)), MAX_PATTERN_SIZE);
    var height = Math.min(Math.ceil(Math.abs(boundsHeight * combinesScale[1] * EXPECTED_SCALE)), MAX_PATTERN_SIZE);
    var scaleX = boundsWidth / width;
    var scaleY = boundsHeight / height;
    var context = {
      coords: coords,
      colors: colors,
      offsetX: -offsetX,
      offsetY: -offsetY,
      scaleX: 1 / scaleX,
      scaleY: 1 / scaleY
    };
    var paddedWidth = width + BORDER_SIZE * 2;
    var paddedHeight = height + BORDER_SIZE * 2;
    var canvas, tmpCanvas, i, ii;
    if (_webgl.WebGLUtils.isEnabled) {
      canvas = _webgl.WebGLUtils.drawFigures(width, height, backgroundColor, figures, context);
      tmpCanvas = cachedCanvases.getCanvas('mesh', paddedWidth, paddedHeight, false);
      tmpCanvas.context.drawImage(canvas, BORDER_SIZE, BORDER_SIZE);
      canvas = tmpCanvas.canvas;
    } else {
      tmpCanvas = cachedCanvases.getCanvas('mesh', paddedWidth, paddedHeight, false);
      var tmpCtx = tmpCanvas.context;
      var data = tmpCtx.createImageData(width, height);
      if (backgroundColor) {
        var bytes = data.data;
        for (i = 0, ii = bytes.length; i < ii; i += 4) {
          bytes[i] = backgroundColor[0];
          bytes[i + 1] = backgroundColor[1];
          bytes[i + 2] = backgroundColor[2];
          bytes[i + 3] = 255;
        }
      }
      for (i = 0; i < figures.length; i++) {
        drawFigure(data, figures[i], context);
      }
      tmpCtx.putImageData(data, BORDER_SIZE, BORDER_SIZE);
      canvas = tmpCanvas.canvas;
    }
    return {
      canvas: canvas,
      offsetX: offsetX - BORDER_SIZE * scaleX,
      offsetY: offsetY - BORDER_SIZE * scaleY,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }
  return createMeshCanvas;
}();
ShadingIRs.Mesh = {
  fromIR: function Mesh_fromIR(raw) {
    var coords = raw[2];
    var colors = raw[3];
    var figures = raw[4];
    var bounds = raw[5];
    var matrix = raw[6];
    var background = raw[8];
    return {
      type: 'Pattern',
      getPattern: function Mesh_getPattern(ctx, owner, shadingFill) {
        var scale;
        if (shadingFill) {
          scale = _util.Util.singularValueDecompose2dScale(ctx.mozCurrentTransform);
        } else {
          scale = _util.Util.singularValueDecompose2dScale(owner.baseTransform);
          if (matrix) {
            var matrixScale = _util.Util.singularValueDecompose2dScale(matrix);
            scale = [scale[0] * matrixScale[0], scale[1] * matrixScale[1]];
          }
        }
        var temporaryPatternCanvas = createMeshCanvas(bounds, scale, coords, colors, figures, shadingFill ? null : background, owner.cachedCanvases);
        if (!shadingFill) {
          ctx.setTransform.apply(ctx, owner.baseTransform);
          if (matrix) {
            ctx.transform.apply(ctx, matrix);
          }
        }
        ctx.translate(temporaryPatternCanvas.offsetX, temporaryPatternCanvas.offsetY);
        ctx.scale(temporaryPatternCanvas.scaleX, temporaryPatternCanvas.scaleY);
        return ctx.createPattern(temporaryPatternCanvas.canvas, 'no-repeat');
      }
    };
  }
};
ShadingIRs.Dummy = {
  fromIR: function Dummy_fromIR() {
    return {
      type: 'Pattern',
      getPattern: function Dummy_fromIR_getPattern() {
        return 'hotpink';
      }
    };
  }
};
function getShadingPatternFromIR(raw) {
  var shadingIR = ShadingIRs[raw[0]];
  if (!shadingIR) {
    throw new Error('Unknown IR type: ' + raw[0]);
  }
  return shadingIR.fromIR(raw);
}
var TilingPattern = function TilingPatternClosure() {
  var PaintType = {
    COLORED: 1,
    UNCOLORED: 2
  };
  var MAX_PATTERN_SIZE = 3000;
  function TilingPattern(IR, color, ctx, canvasGraphicsFactory, baseTransform) {
    this.operatorList = IR[2];
    this.matrix = IR[3] || [1, 0, 0, 1, 0, 0];
    this.bbox = IR[4];
    this.xstep = IR[5];
    this.ystep = IR[6];
    this.paintType = IR[7];
    this.tilingType = IR[8];
    this.color = color;
    this.canvasGraphicsFactory = canvasGraphicsFactory;
    this.baseTransform = baseTransform;
    this.type = 'Pattern';
    this.ctx = ctx;
  }
  TilingPattern.prototype = {
    createPatternCanvas: function TilinPattern_createPatternCanvas(owner) {
      var operatorList = this.operatorList;
      var bbox = this.bbox;
      var xstep = this.xstep;
      var ystep = this.ystep;
      var paintType = this.paintType;
      var tilingType = this.tilingType;
      var color = this.color;
      var canvasGraphicsFactory = this.canvasGraphicsFactory;
      (0, _util.info)('TilingType: ' + tilingType);
      var x0 = bbox[0],
          y0 = bbox[1],
          x1 = bbox[2],
          y1 = bbox[3];
      var topLeft = [x0, y0];
      var botRight = [x0 + xstep, y0 + ystep];
      var width = botRight[0] - topLeft[0];
      var height = botRight[1] - topLeft[1];
      var matrixScale = _util.Util.singularValueDecompose2dScale(this.matrix);
      var curMatrixScale = _util.Util.singularValueDecompose2dScale(this.baseTransform);
      var combinedScale = [matrixScale[0] * curMatrixScale[0], matrixScale[1] * curMatrixScale[1]];
      width = Math.min(Math.ceil(Math.abs(width * combinedScale[0])), MAX_PATTERN_SIZE);
      height = Math.min(Math.ceil(Math.abs(height * combinedScale[1])), MAX_PATTERN_SIZE);
      var tmpCanvas = owner.cachedCanvases.getCanvas('pattern', width, height, true);
      var tmpCtx = tmpCanvas.context;
      var graphics = canvasGraphicsFactory.createCanvasGraphics(tmpCtx);
      graphics.groupLevel = owner.groupLevel;
      this.setFillAndStrokeStyleToContext(graphics, paintType, color);
      this.setScale(width, height, xstep, ystep);
      this.transformToScale(graphics);
      var tmpTranslate = [1, 0, 0, 1, -topLeft[0], -topLeft[1]];
      graphics.transform.apply(graphics, tmpTranslate);
      this.clipBbox(graphics, bbox, x0, y0, x1, y1);
      graphics.executeOperatorList(operatorList);
      return tmpCanvas.canvas;
    },
    setScale: function TilingPattern_setScale(width, height, xstep, ystep) {
      this.scale = [width / xstep, height / ystep];
    },
    transformToScale: function TilingPattern_transformToScale(graphics) {
      var scale = this.scale;
      var tmpScale = [scale[0], 0, 0, scale[1], 0, 0];
      graphics.transform.apply(graphics, tmpScale);
    },
    scaleToContext: function TilingPattern_scaleToContext() {
      var scale = this.scale;
      this.ctx.scale(1 / scale[0], 1 / scale[1]);
    },
    clipBbox: function clipBbox(graphics, bbox, x0, y0, x1, y1) {
      if (Array.isArray(bbox) && bbox.length === 4) {
        var bboxWidth = x1 - x0;
        var bboxHeight = y1 - y0;
        graphics.ctx.rect(x0, y0, bboxWidth, bboxHeight);
        graphics.clip();
        graphics.endPath();
      }
    },
    setFillAndStrokeStyleToContext: function setFillAndStrokeStyleToContext(graphics, paintType, color) {
      var context = graphics.ctx,
          current = graphics.current;
      switch (paintType) {
        case PaintType.COLORED:
          var ctx = this.ctx;
          context.fillStyle = ctx.fillStyle;
          context.strokeStyle = ctx.strokeStyle;
          current.fillColor = ctx.fillStyle;
          current.strokeColor = ctx.strokeStyle;
          break;
        case PaintType.UNCOLORED:
          var cssColor = _util.Util.makeCssRgb(color[0], color[1], color[2]);
          context.fillStyle = cssColor;
          context.strokeStyle = cssColor;
          current.fillColor = cssColor;
          current.strokeColor = cssColor;
          break;
        default:
          throw new _util.FormatError('Unsupported paint type: ' + paintType);
      }
    },
    getPattern: function TilingPattern_getPattern(ctx, owner) {
      var temporaryPatternCanvas = this.createPatternCanvas(owner);
      ctx = this.ctx;
      ctx.setTransform.apply(ctx, this.baseTransform);
      ctx.transform.apply(ctx, this.matrix);
      this.scaleToContext();
      return ctx.createPattern(temporaryPatternCanvas, 'repeat');
    }
  };
  return TilingPattern;
}();
exports.getShadingPatternFromIR = getShadingPatternFromIR;
exports.TilingPattern = TilingPattern;

/***/ }),
/* 121 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PDFDataTransportStream = undefined;

var _util = __w_pdfjs_require__(0);

var PDFDataTransportStream = function PDFDataTransportStreamClosure() {
  function PDFDataTransportStream(params, pdfDataRangeTransport) {
    var _this = this;

    (0, _util.assert)(pdfDataRangeTransport);
    this._queuedChunks = [];
    var initialData = params.initialData;
    if (initialData && initialData.length > 0) {
      var buffer = new Uint8Array(initialData).buffer;
      this._queuedChunks.push(buffer);
    }
    this._pdfDataRangeTransport = pdfDataRangeTransport;
    this._isRangeSupported = !params.disableRange;
    this._isStreamingSupported = !params.disableStream;
    this._contentLength = params.length;
    this._fullRequestReader = null;
    this._rangeReaders = [];
    this._pdfDataRangeTransport.addRangeListener(function (begin, chunk) {
      _this._onReceiveData({
        begin: begin,
        chunk: chunk
      });
    });
    this._pdfDataRangeTransport.addProgressListener(function (loaded) {
      _this._onProgress({ loaded: loaded });
    });
    this._pdfDataRangeTransport.addProgressiveReadListener(function (chunk) {
      _this._onReceiveData({ chunk: chunk });
    });
    this._pdfDataRangeTransport.transportReady();
  }
  PDFDataTransportStream.prototype = {
    _onReceiveData: function PDFDataTransportStream_onReceiveData(args) {
      var buffer = new Uint8Array(args.chunk).buffer;
      if (args.begin === undefined) {
        if (this._fullRequestReader) {
          this._fullRequestReader._enqueue(buffer);
        } else {
          this._queuedChunks.push(buffer);
        }
      } else {
        var found = this._rangeReaders.some(function (rangeReader) {
          if (rangeReader._begin !== args.begin) {
            return false;
          }
          rangeReader._enqueue(buffer);
          return true;
        });
        (0, _util.assert)(found);
      }
    },
    _onProgress: function PDFDataTransportStream_onDataProgress(evt) {
      if (this._rangeReaders.length > 0) {
        var firstReader = this._rangeReaders[0];
        if (firstReader.onProgress) {
          firstReader.onProgress({ loaded: evt.loaded });
        }
      }
    },
    _removeRangeReader: function PDFDataTransportStream_removeRangeReader(reader) {
      var i = this._rangeReaders.indexOf(reader);
      if (i >= 0) {
        this._rangeReaders.splice(i, 1);
      }
    },
    getFullReader: function PDFDataTransportStream_getFullReader() {
      (0, _util.assert)(!this._fullRequestReader);
      var queuedChunks = this._queuedChunks;
      this._queuedChunks = null;
      return new PDFDataTransportStreamReader(this, queuedChunks);
    },
    getRangeReader: function PDFDataTransportStream_getRangeReader(begin, end) {
      var reader = new PDFDataTransportStreamRangeReader(this, begin, end);
      this._pdfDataRangeTransport.requestDataRange(begin, end);
      this._rangeReaders.push(reader);
      return reader;
    },
    cancelAllRequests: function PDFDataTransportStream_cancelAllRequests(reason) {
      if (this._fullRequestReader) {
        this._fullRequestReader.cancel(reason);
      }
      var readers = this._rangeReaders.slice(0);
      readers.forEach(function (rangeReader) {
        rangeReader.cancel(reason);
      });
      this._pdfDataRangeTransport.abort();
    }
  };
  function PDFDataTransportStreamReader(stream, queuedChunks) {
    this._stream = stream;
    this._done = false;
    this._queuedChunks = queuedChunks || [];
    this._requests = [];
    this._headersReady = Promise.resolve();
    stream._fullRequestReader = this;
    this.onProgress = null;
  }
  PDFDataTransportStreamReader.prototype = {
    _enqueue: function PDFDataTransportStreamReader_enqueue(chunk) {
      if (this._done) {
        return;
      }
      if (this._requests.length > 0) {
        var requestCapability = this._requests.shift();
        requestCapability.resolve({
          value: chunk,
          done: false
        });
        return;
      }
      this._queuedChunks.push(chunk);
    },
    get headersReady() {
      return this._headersReady;
    },
    get isRangeSupported() {
      return this._stream._isRangeSupported;
    },
    get isStreamingSupported() {
      return this._stream._isStreamingSupported;
    },
    get contentLength() {
      return this._stream._contentLength;
    },
    read: function PDFDataTransportStreamReader_read() {
      if (this._queuedChunks.length > 0) {
        var chunk = this._queuedChunks.shift();
        return Promise.resolve({
          value: chunk,
          done: false
        });
      }
      if (this._done) {
        return Promise.resolve({
          value: undefined,
          done: true
        });
      }
      var requestCapability = (0, _util.createPromiseCapability)();
      this._requests.push(requestCapability);
      return requestCapability.promise;
    },
    cancel: function PDFDataTransportStreamReader_cancel(reason) {
      this._done = true;
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({
          value: undefined,
          done: true
        });
      });
      this._requests = [];
    }
  };
  function PDFDataTransportStreamRangeReader(stream, begin, end) {
    this._stream = stream;
    this._begin = begin;
    this._end = end;
    this._queuedChunk = null;
    this._requests = [];
    this._done = false;
    this.onProgress = null;
  }
  PDFDataTransportStreamRangeReader.prototype = {
    _enqueue: function PDFDataTransportStreamRangeReader_enqueue(chunk) {
      if (this._done) {
        return;
      }
      if (this._requests.length === 0) {
        this._queuedChunk = chunk;
      } else {
        var requestsCapability = this._requests.shift();
        requestsCapability.resolve({
          value: chunk,
          done: false
        });
        this._requests.forEach(function (requestCapability) {
          requestCapability.resolve({
            value: undefined,
            done: true
          });
        });
        this._requests = [];
      }
      this._done = true;
      this._stream._removeRangeReader(this);
    },
    get isStreamingSupported() {
      return false;
    },
    read: function PDFDataTransportStreamRangeReader_read() {
      if (this._queuedChunk) {
        var chunk = this._queuedChunk;
        this._queuedChunk = null;
        return Promise.resolve({
          value: chunk,
          done: false
        });
      }
      if (this._done) {
        return Promise.resolve({
          value: undefined,
          done: true
        });
      }
      var requestCapability = (0, _util.createPromiseCapability)();
      this._requests.push(requestCapability);
      return requestCapability.promise;
    },
    cancel: function PDFDataTransportStreamRangeReader_cancel(reason) {
      this._done = true;
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({
          value: undefined,
          done: true
        });
      });
      this._requests = [];
      this._stream._removeRangeReader(this);
    }
  };
  return PDFDataTransportStream;
}();
exports.PDFDataTransportStream = PDFDataTransportStream;

/***/ }),
/* 122 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PDFNodeStream = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __w_pdfjs_require__(0);

var _network_utils = __w_pdfjs_require__(44);

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');

var PDFNodeStream = function () {
  function PDFNodeStream(options) {
    _classCallCheck(this, PDFNodeStream);

    this.options = options;
    this.source = options.source;
    this.url = url.parse(this.source.url);
    this.isHttp = this.url.protocol === 'http:' || this.url.protocol === 'https:';
    this.isFsUrl = this.url.protocol === 'file:' || !this.url.host;
    this.httpHeaders = this.isHttp && this.source.httpHeaders || {};
    this._fullRequest = null;
    this._rangeRequestReaders = [];
  }

  _createClass(PDFNodeStream, [{
    key: 'getFullReader',
    value: function getFullReader() {
      (0, _util.assert)(!this._fullRequest);
      this._fullRequest = this.isFsUrl ? new PDFNodeStreamFsFullReader(this) : new PDFNodeStreamFullReader(this);
      return this._fullRequest;
    }
  }, {
    key: 'getRangeReader',
    value: function getRangeReader(start, end) {
      var rangeReader = this.isFsUrl ? new PDFNodeStreamFsRangeReader(this, start, end) : new PDFNodeStreamRangeReader(this, start, end);
      this._rangeRequestReaders.push(rangeReader);
      return rangeReader;
    }
  }, {
    key: 'cancelAllRequests',
    value: function cancelAllRequests(reason) {
      if (this._fullRequest) {
        this._fullRequest.cancel(reason);
      }
      var readers = this._rangeRequestReaders.slice(0);
      readers.forEach(function (reader) {
        reader.cancel(reason);
      });
    }
  }]);

  return PDFNodeStream;
}();

var BaseFullReader = function () {
  function BaseFullReader(stream) {
    _classCallCheck(this, BaseFullReader);

    this._url = stream.url;
    this._done = false;
    this._errored = false;
    this._reason = null;
    this.onProgress = null;
    this._contentLength = stream.source.length;
    this._loaded = 0;
    this._disableRange = stream.options.disableRange || false;
    this._rangeChunkSize = stream.source.rangeChunkSize;
    if (!this._rangeChunkSize && !this._disableRange) {
      this._disableRange = true;
    }
    this._isStreamingSupported = !stream.source.disableStream;
    this._isRangeSupported = !stream.options.disableRange;
    this._readableStream = null;
    this._readCapability = (0, _util.createPromiseCapability)();
    this._headersCapability = (0, _util.createPromiseCapability)();
  }

  _createClass(BaseFullReader, [{
    key: 'read',
    value: function read() {
      var _this = this;

      return this._readCapability.promise.then(function () {
        if (_this._done) {
          return Promise.resolve({
            value: undefined,
            done: true
          });
        }
        if (_this._errored) {
          return Promise.reject(_this._reason);
        }
        var chunk = _this._readableStream.read();
        if (chunk === null) {
          _this._readCapability = (0, _util.createPromiseCapability)();
          return _this.read();
        }
        _this._loaded += chunk.length;
        if (_this.onProgress) {
          _this.onProgress({
            loaded: _this._loaded,
            total: _this._contentLength
          });
        }
        var buffer = new Uint8Array(chunk).buffer;
        return Promise.resolve({
          value: buffer,
          done: false
        });
      });
    }
  }, {
    key: 'cancel',
    value: function cancel(reason) {
      if (!this._readableStream) {
        this._error(reason);
        return;
      }
      this._readableStream.destroy(reason);
    }
  }, {
    key: '_error',
    value: function _error(reason) {
      this._errored = true;
      this._reason = reason;
      this._readCapability.resolve();
    }
  }, {
    key: '_setReadableStream',
    value: function _setReadableStream(readableStream) {
      var _this2 = this;

      this._readableStream = readableStream;
      readableStream.on('readable', function () {
        _this2._readCapability.resolve();
      });
      readableStream.on('end', function () {
        readableStream.destroy();
        _this2._done = true;
        _this2._readCapability.resolve();
      });
      readableStream.on('error', function (reason) {
        _this2._error(reason);
      });
      if (!this._isStreamingSupported && this._isRangeSupported) {
        this._error(new _util.AbortException('streaming is disabled'));
      }
      if (this._errored) {
        this._readableStream.destroy(this._reason);
      }
    }
  }, {
    key: 'headersReady',
    get: function get() {
      return this._headersCapability.promise;
    }
  }, {
    key: 'contentLength',
    get: function get() {
      return this._contentLength;
    }
  }, {
    key: 'isRangeSupported',
    get: function get() {
      return this._isRangeSupported;
    }
  }, {
    key: 'isStreamingSupported',
    get: function get() {
      return this._isStreamingSupported;
    }
  }]);

  return BaseFullReader;
}();

var BaseRangeReader = function () {
  function BaseRangeReader(stream) {
    _classCallCheck(this, BaseRangeReader);

    this._url = stream.url;
    this._done = false;
    this._errored = false;
    this._reason = null;
    this.onProgress = null;
    this._loaded = 0;
    this._readableStream = null;
    this._readCapability = (0, _util.createPromiseCapability)();
    this._isStreamingSupported = !stream.source.disableStream;
  }

  _createClass(BaseRangeReader, [{
    key: 'read',
    value: function read() {
      var _this3 = this;

      return this._readCapability.promise.then(function () {
        if (_this3._done) {
          return Promise.resolve({
            value: undefined,
            done: true
          });
        }
        if (_this3._errored) {
          return Promise.reject(_this3._reason);
        }
        var chunk = _this3._readableStream.read();
        if (chunk === null) {
          _this3._readCapability = (0, _util.createPromiseCapability)();
          return _this3.read();
        }
        _this3._loaded += chunk.length;
        if (_this3.onProgress) {
          _this3.onProgress({ loaded: _this3._loaded });
        }
        var buffer = new Uint8Array(chunk).buffer;
        return Promise.resolve({
          value: buffer,
          done: false
        });
      });
    }
  }, {
    key: 'cancel',
    value: function cancel(reason) {
      if (!this._readableStream) {
        this._error(reason);
        return;
      }
      this._readableStream.destroy(reason);
    }
  }, {
    key: '_error',
    value: function _error(reason) {
      this._errored = true;
      this._reason = reason;
      this._readCapability.resolve();
    }
  }, {
    key: '_setReadableStream',
    value: function _setReadableStream(readableStream) {
      var _this4 = this;

      this._readableStream = readableStream;
      readableStream.on('readable', function () {
        _this4._readCapability.resolve();
      });
      readableStream.on('end', function () {
        readableStream.destroy();
        _this4._done = true;
        _this4._readCapability.resolve();
      });
      readableStream.on('error', function (reason) {
        _this4._error(reason);
      });
      if (this._errored) {
        this._readableStream.destroy(this._reason);
      }
    }
  }, {
    key: 'isStreamingSupported',
    get: function get() {
      return this._isStreamingSupported;
    }
  }]);

  return BaseRangeReader;
}();

function createRequestOptions(url, headers) {
  return {
    protocol: url.protocol,
    auth: url.auth,
    host: url.hostname,
    port: url.port,
    path: url.path,
    method: 'GET',
    headers: headers
  };
}

var PDFNodeStreamFullReader = function (_BaseFullReader) {
  _inherits(PDFNodeStreamFullReader, _BaseFullReader);

  function PDFNodeStreamFullReader(stream) {
    _classCallCheck(this, PDFNodeStreamFullReader);

    var _this5 = _possibleConstructorReturn(this, (PDFNodeStreamFullReader.__proto__ || Object.getPrototypeOf(PDFNodeStreamFullReader)).call(this, stream));

    var handleResponse = function handleResponse(response) {
      _this5._headersCapability.resolve();
      _this5._setReadableStream(response);

      var _validateRangeRequest = (0, _network_utils.validateRangeRequestCapabilities)({
        getResponseHeader: function getResponseHeader(name) {
          return _this5._readableStream.headers[name.toLowerCase()];
        },
        isHttp: stream.isHttp,
        rangeChunkSize: _this5._rangeChunkSize,
        disableRange: _this5._disableRange
      }),
          allowRangeRequests = _validateRangeRequest.allowRangeRequests,
          suggestedLength = _validateRangeRequest.suggestedLength;

      if (allowRangeRequests) {
        _this5._isRangeSupported = true;
      }
      _this5._contentLength = suggestedLength;
    };
    _this5._request = null;
    if (_this5._url.protocol === 'http:') {
      _this5._request = http.request(createRequestOptions(_this5._url, stream.httpHeaders), handleResponse);
    } else {
      _this5._request = https.request(createRequestOptions(_this5._url, stream.httpHeaders), handleResponse);
    }
    _this5._request.on('error', function (reason) {
      _this5._errored = true;
      _this5._reason = reason;
      _this5._headersCapability.reject(reason);
    });
    _this5._request.end();
    return _this5;
  }

  return PDFNodeStreamFullReader;
}(BaseFullReader);

var PDFNodeStreamRangeReader = function (_BaseRangeReader) {
  _inherits(PDFNodeStreamRangeReader, _BaseRangeReader);

  function PDFNodeStreamRangeReader(stream, start, end) {
    _classCallCheck(this, PDFNodeStreamRangeReader);

    var _this6 = _possibleConstructorReturn(this, (PDFNodeStreamRangeReader.__proto__ || Object.getPrototypeOf(PDFNodeStreamRangeReader)).call(this, stream));

    _this6._httpHeaders = {};
    for (var property in stream.httpHeaders) {
      var value = stream.httpHeaders[property];
      if (typeof value === 'undefined') {
        continue;
      }
      _this6._httpHeaders[property] = value;
    }
    _this6._httpHeaders['Range'] = 'bytes=' + start + '-' + (end - 1);
    _this6._request = null;
    if (_this6._url.protocol === 'http:') {
      _this6._request = http.request(createRequestOptions(_this6._url, _this6._httpHeaders), function (response) {
        _this6._setReadableStream(response);
      });
    } else {
      _this6._request = https.request(createRequestOptions(_this6._url, _this6._httpHeaders), function (response) {
        _this6._setReadableStream(response);
      });
    }
    _this6._request.on('error', function (reason) {
      _this6._errored = true;
      _this6._reason = reason;
    });
    _this6._request.end();
    return _this6;
  }

  return PDFNodeStreamRangeReader;
}(BaseRangeReader);

var PDFNodeStreamFsFullReader = function (_BaseFullReader2) {
  _inherits(PDFNodeStreamFsFullReader, _BaseFullReader2);

  function PDFNodeStreamFsFullReader(stream) {
    _classCallCheck(this, PDFNodeStreamFsFullReader);

    var _this7 = _possibleConstructorReturn(this, (PDFNodeStreamFsFullReader.__proto__ || Object.getPrototypeOf(PDFNodeStreamFsFullReader)).call(this, stream));

    var path = decodeURI(_this7._url.path);
    fs.lstat(path, function (error, stat) {
      if (error) {
        _this7._errored = true;
        _this7._reason = error;
        _this7._headersCapability.reject(error);
        return;
      }
      _this7._contentLength = stat.size;
      _this7._setReadableStream(fs.createReadStream(path));
      _this7._headersCapability.resolve();
    });
    return _this7;
  }

  return PDFNodeStreamFsFullReader;
}(BaseFullReader);

var PDFNodeStreamFsRangeReader = function (_BaseRangeReader2) {
  _inherits(PDFNodeStreamFsRangeReader, _BaseRangeReader2);

  function PDFNodeStreamFsRangeReader(stream, start, end) {
    _classCallCheck(this, PDFNodeStreamFsRangeReader);

    var _this8 = _possibleConstructorReturn(this, (PDFNodeStreamFsRangeReader.__proto__ || Object.getPrototypeOf(PDFNodeStreamFsRangeReader)).call(this, stream));

    _this8._setReadableStream(fs.createReadStream(decodeURI(_this8._url.path), {
      start: start,
      end: end - 1
    }));
    return _this8;
  }

  return PDFNodeStreamFsRangeReader;
}(BaseRangeReader);

exports.PDFNodeStream = PDFNodeStream;

/***/ }),
/* 123 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PDFFetchStream = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __w_pdfjs_require__(0);

var _network_utils = __w_pdfjs_require__(44);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function createFetchOptions(headers, withCredentials) {
  return {
    method: 'GET',
    headers: headers,
    mode: 'cors',
    credentials: withCredentials ? 'include' : 'same-origin',
    redirect: 'follow'
  };
}

var PDFFetchStream = function () {
  function PDFFetchStream(options) {
    _classCallCheck(this, PDFFetchStream);

    this.options = options;
    this.source = options.source;
    this.isHttp = /^https?:/i.test(this.source.url);
    this.httpHeaders = this.isHttp && this.source.httpHeaders || {};
    this._fullRequestReader = null;
    this._rangeRequestReaders = [];
  }

  _createClass(PDFFetchStream, [{
    key: 'getFullReader',
    value: function getFullReader() {
      (0, _util.assert)(!this._fullRequestReader);
      this._fullRequestReader = new PDFFetchStreamReader(this);
      return this._fullRequestReader;
    }
  }, {
    key: 'getRangeReader',
    value: function getRangeReader(begin, end) {
      var reader = new PDFFetchStreamRangeReader(this, begin, end);
      this._rangeRequestReaders.push(reader);
      return reader;
    }
  }, {
    key: 'cancelAllRequests',
    value: function cancelAllRequests(reason) {
      if (this._fullRequestReader) {
        this._fullRequestReader.cancel(reason);
      }
      var readers = this._rangeRequestReaders.slice(0);
      readers.forEach(function (reader) {
        reader.cancel(reason);
      });
    }
  }]);

  return PDFFetchStream;
}();

var PDFFetchStreamReader = function () {
  function PDFFetchStreamReader(stream) {
    var _this = this;

    _classCallCheck(this, PDFFetchStreamReader);

    this._stream = stream;
    this._reader = null;
    this._loaded = 0;
    this._withCredentials = stream.source.withCredentials;
    this._contentLength = this._stream.source.length;
    this._headersCapability = (0, _util.createPromiseCapability)();
    this._disableRange = this._stream.options.disableRange;
    this._rangeChunkSize = this._stream.source.rangeChunkSize;
    if (!this._rangeChunkSize && !this._disableRange) {
      this._disableRange = true;
    }
    this._isRangeSupported = !this._stream.options.disableRange;
    this._isStreamingSupported = !this._stream.source.disableStream;
    this._headers = new Headers();
    for (var property in this._stream.httpHeaders) {
      var value = this._stream.httpHeaders[property];
      if (typeof value === 'undefined') {
        continue;
      }
      this._headers.append(property, value);
    }
    var url = this._stream.source.url;
    fetch(url, createFetchOptions(this._headers, this._withCredentials)).then(function (response) {
      if (!(0, _network_utils.validateResponseStatus)(response.status)) {
        throw (0, _network_utils.createResponseStatusError)(response.status, url);
      }
      _this._reader = response.body.getReader();
      _this._headersCapability.resolve();

      var _validateRangeRequest = (0, _network_utils.validateRangeRequestCapabilities)({
        getResponseHeader: function getResponseHeader(name) {
          return response.headers.get(name);
        },
        isHttp: _this._stream.isHttp,
        rangeChunkSize: _this._rangeChunkSize,
        disableRange: _this._disableRange
      }),
          allowRangeRequests = _validateRangeRequest.allowRangeRequests,
          suggestedLength = _validateRangeRequest.suggestedLength;

      _this._contentLength = suggestedLength;
      _this._isRangeSupported = allowRangeRequests;
      if (!_this._isStreamingSupported && _this._isRangeSupported) {
        _this.cancel(new _util.AbortException('streaming is disabled'));
      }
    }).catch(this._headersCapability.reject);
    this.onProgress = null;
  }

  _createClass(PDFFetchStreamReader, [{
    key: 'read',
    value: function read() {
      var _this2 = this;

      return this._headersCapability.promise.then(function () {
        return _this2._reader.read().then(function (_ref) {
          var value = _ref.value,
              done = _ref.done;

          if (done) {
            return Promise.resolve({
              value: value,
              done: done
            });
          }
          _this2._loaded += value.byteLength;
          if (_this2.onProgress) {
            _this2.onProgress({
              loaded: _this2._loaded,
              total: _this2._contentLength
            });
          }
          var buffer = new Uint8Array(value).buffer;
          return Promise.resolve({
            value: buffer,
            done: false
          });
        });
      });
    }
  }, {
    key: 'cancel',
    value: function cancel(reason) {
      if (this._reader) {
        this._reader.cancel(reason);
      }
    }
  }, {
    key: 'headersReady',
    get: function get() {
      return this._headersCapability.promise;
    }
  }, {
    key: 'contentLength',
    get: function get() {
      return this._contentLength;
    }
  }, {
    key: 'isRangeSupported',
    get: function get() {
      return this._isRangeSupported;
    }
  }, {
    key: 'isStreamingSupported',
    get: function get() {
      return this._isStreamingSupported;
    }
  }]);

  return PDFFetchStreamReader;
}();

var PDFFetchStreamRangeReader = function () {
  function PDFFetchStreamRangeReader(stream, begin, end) {
    var _this3 = this;

    _classCallCheck(this, PDFFetchStreamRangeReader);

    this._stream = stream;
    this._reader = null;
    this._loaded = 0;
    this._withCredentials = stream.source.withCredentials;
    this._readCapability = (0, _util.createPromiseCapability)();
    this._isStreamingSupported = !stream.source.disableStream;
    this._headers = new Headers();
    for (var property in this._stream.httpHeaders) {
      var value = this._stream.httpHeaders[property];
      if (typeof value === 'undefined') {
        continue;
      }
      this._headers.append(property, value);
    }
    var rangeStr = begin + '-' + (end - 1);
    this._headers.append('Range', 'bytes=' + rangeStr);
    var url = this._stream.source.url;
    fetch(url, createFetchOptions(this._headers, this._withCredentials)).then(function (response) {
      if (!(0, _network_utils.validateResponseStatus)(response.status)) {
        throw (0, _network_utils.createResponseStatusError)(response.status, url);
      }
      _this3._readCapability.resolve();
      _this3._reader = response.body.getReader();
    });
    this.onProgress = null;
  }

  _createClass(PDFFetchStreamRangeReader, [{
    key: 'read',
    value: function read() {
      var _this4 = this;

      return this._readCapability.promise.then(function () {
        return _this4._reader.read().then(function (_ref2) {
          var value = _ref2.value,
              done = _ref2.done;

          if (done) {
            return Promise.resolve({
              value: value,
              done: done
            });
          }
          _this4._loaded += value.byteLength;
          if (_this4.onProgress) {
            _this4.onProgress({ loaded: _this4._loaded });
          }
          var buffer = new Uint8Array(value).buffer;
          return Promise.resolve({
            value: buffer,
            done: false
          });
        });
      });
    }
  }, {
    key: 'cancel',
    value: function cancel(reason) {
      if (this._reader) {
        this._reader.cancel(reason);
      }
    }
  }, {
    key: 'isStreamingSupported',
    get: function get() {
      return this._isStreamingSupported;
    }
  }]);

  return PDFFetchStreamRangeReader;
}();

exports.PDFFetchStream = PDFFetchStream;

/***/ }),
/* 124 */
/***/ (function(module, exports, __w_pdfjs_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NetworkManager = exports.PDFNetworkStream = undefined;

var _util = __w_pdfjs_require__(0);

var _network_utils = __w_pdfjs_require__(44);

var _global_scope = __w_pdfjs_require__(20);

var _global_scope2 = _interopRequireDefault(_global_scope);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

;
var OK_RESPONSE = 200;
var PARTIAL_CONTENT_RESPONSE = 206;
function NetworkManager(url, args) {
  this.url = url;
  args = args || {};
  this.isHttp = /^https?:/i.test(url);
  this.httpHeaders = this.isHttp && args.httpHeaders || {};
  this.withCredentials = args.withCredentials || false;
  this.getXhr = args.getXhr || function NetworkManager_getXhr() {
    return new XMLHttpRequest();
  };
  this.currXhrId = 0;
  this.pendingRequests = Object.create(null);
  this.loadedRequests = Object.create(null);
}
function getArrayBuffer(xhr) {
  var data = xhr.response;
  if (typeof data !== 'string') {
    return data;
  }
  var array = (0, _util.stringToBytes)(data);
  return array.buffer;
}
var supportsMozChunked = function supportsMozChunkedClosure() {
  try {
    var x = new XMLHttpRequest();
    x.open('GET', _global_scope2.default.location.href);
    x.responseType = 'moz-chunked-arraybuffer';
    return x.responseType === 'moz-chunked-arraybuffer';
  } catch (e) {
    return false;
  }
}();
NetworkManager.prototype = {
  requestRange: function NetworkManager_requestRange(begin, end, listeners) {
    var args = {
      begin: begin,
      end: end
    };
    for (var prop in listeners) {
      args[prop] = listeners[prop];
    }
    return this.request(args);
  },
  requestFull: function NetworkManager_requestFull(listeners) {
    return this.request(listeners);
  },
  request: function NetworkManager_request(args) {
    var xhr = this.getXhr();
    var xhrId = this.currXhrId++;
    var pendingRequest = this.pendingRequests[xhrId] = { xhr: xhr };
    xhr.open('GET', this.url);
    xhr.withCredentials = this.withCredentials;
    for (var property in this.httpHeaders) {
      var value = this.httpHeaders[property];
      if (typeof value === 'undefined') {
        continue;
      }
      xhr.setRequestHeader(property, value);
    }
    if (this.isHttp && 'begin' in args && 'end' in args) {
      var rangeStr = args.begin + '-' + (args.end - 1);
      xhr.setRequestHeader('Range', 'bytes=' + rangeStr);
      pendingRequest.expectedStatus = 206;
    } else {
      pendingRequest.expectedStatus = 200;
    }
    var useMozChunkedLoading = supportsMozChunked && !!args.onProgressiveData;
    if (useMozChunkedLoading) {
      xhr.responseType = 'moz-chunked-arraybuffer';
      pendingRequest.onProgressiveData = args.onProgressiveData;
      pendingRequest.mozChunked = true;
    } else {
      xhr.responseType = 'arraybuffer';
    }
    if (args.onError) {
      xhr.onerror = function (evt) {
        args.onError(xhr.status);
      };
    }
    xhr.onreadystatechange = this.onStateChange.bind(this, xhrId);
    xhr.onprogress = this.onProgress.bind(this, xhrId);
    pendingRequest.onHeadersReceived = args.onHeadersReceived;
    pendingRequest.onDone = args.onDone;
    pendingRequest.onError = args.onError;
    pendingRequest.onProgress = args.onProgress;
    xhr.send(null);
    return xhrId;
  },
  onProgress: function NetworkManager_onProgress(xhrId, evt) {
    var pendingRequest = this.pendingRequests[xhrId];
    if (!pendingRequest) {
      return;
    }
    if (pendingRequest.mozChunked) {
      var chunk = getArrayBuffer(pendingRequest.xhr);
      pendingRequest.onProgressiveData(chunk);
    }
    var onProgress = pendingRequest.onProgress;
    if (onProgress) {
      onProgress(evt);
    }
  },
  onStateChange: function NetworkManager_onStateChange(xhrId, evt) {
    var pendingRequest = this.pendingRequests[xhrId];
    if (!pendingRequest) {
      return;
    }
    var xhr = pendingRequest.xhr;
    if (xhr.readyState >= 2 && pendingRequest.onHeadersReceived) {
      pendingRequest.onHeadersReceived();
      delete pendingRequest.onHeadersReceived;
    }
    if (xhr.readyState !== 4) {
      return;
    }
    if (!(xhrId in this.pendingRequests)) {
      return;
    }
    delete this.pendingRequests[xhrId];
    if (xhr.status === 0 && this.isHttp) {
      if (pendingRequest.onError) {
        pendingRequest.onError(xhr.status);
      }
      return;
    }
    var xhrStatus = xhr.status || OK_RESPONSE;
    var ok_response_on_range_request = xhrStatus === OK_RESPONSE && pendingRequest.expectedStatus === PARTIAL_CONTENT_RESPONSE;
    if (!ok_response_on_range_request && xhrStatus !== pendingRequest.expectedStatus) {
      if (pendingRequest.onError) {
        pendingRequest.onError(xhr.status);
      }
      return;
    }
    this.loadedRequests[xhrId] = true;
    var chunk = getArrayBuffer(xhr);
    if (xhrStatus === PARTIAL_CONTENT_RESPONSE) {
      var rangeHeader = xhr.getResponseHeader('Content-Range');
      var matches = /bytes (\d+)-(\d+)\/(\d+)/.exec(rangeHeader);
      var begin = parseInt(matches[1], 10);
      pendingRequest.onDone({
        begin: begin,
        chunk: chunk
      });
    } else if (pendingRequest.onProgressiveData) {
      pendingRequest.onDone(null);
    } else if (chunk) {
      pendingRequest.onDone({
        begin: 0,
        chunk: chunk
      });
    } else if (pendingRequest.onError) {
      pendingRequest.onError(xhr.status);
    }
  },
  hasPendingRequests: function NetworkManager_hasPendingRequests() {
    for (var xhrId in this.pendingRequests) {
      return true;
    }
    return false;
  },
  getRequestXhr: function NetworkManager_getXhr(xhrId) {
    return this.pendingRequests[xhrId].xhr;
  },
  isStreamingRequest: function NetworkManager_isStreamingRequest(xhrId) {
    return !!this.pendingRequests[xhrId].onProgressiveData;
  },
  isPendingRequest: function NetworkManager_isPendingRequest(xhrId) {
    return xhrId in this.pendingRequests;
  },
  isLoadedRequest: function NetworkManager_isLoadedRequest(xhrId) {
    return xhrId in this.loadedRequests;
  },
  abortAllRequests: function NetworkManager_abortAllRequests() {
    for (var xhrId in this.pendingRequests) {
      this.abortRequest(xhrId | 0);
    }
  },
  abortRequest: function NetworkManager_abortRequest(xhrId) {
    var xhr = this.pendingRequests[xhrId].xhr;
    delete this.pendingRequests[xhrId];
    xhr.abort();
  }
};
function PDFNetworkStream(options) {
  this._options = options;
  var source = options.source;
  this._manager = new NetworkManager(source.url, {
    httpHeaders: source.httpHeaders,
    withCredentials: source.withCredentials
  });
  this._rangeChunkSize = source.rangeChunkSize;
  this._fullRequestReader = null;
  this._rangeRequestReaders = [];
}
PDFNetworkStream.prototype = {
  _onRangeRequestReaderClosed: function PDFNetworkStream_onRangeRequestReaderClosed(reader) {
    var i = this._rangeRequestReaders.indexOf(reader);
    if (i >= 0) {
      this._rangeRequestReaders.splice(i, 1);
    }
  },
  getFullReader: function PDFNetworkStream_getFullReader() {
    (0, _util.assert)(!this._fullRequestReader);
    this._fullRequestReader = new PDFNetworkStreamFullRequestReader(this._manager, this._options);
    return this._fullRequestReader;
  },
  getRangeReader: function PDFNetworkStream_getRangeReader(begin, end) {
    var reader = new PDFNetworkStreamRangeRequestReader(this._manager, begin, end);
    reader.onClosed = this._onRangeRequestReaderClosed.bind(this);
    this._rangeRequestReaders.push(reader);
    return reader;
  },
  cancelAllRequests: function PDFNetworkStream_cancelAllRequests(reason) {
    if (this._fullRequestReader) {
      this._fullRequestReader.cancel(reason);
    }
    var readers = this._rangeRequestReaders.slice(0);
    readers.forEach(function (reader) {
      reader.cancel(reason);
    });
  }
};
function PDFNetworkStreamFullRequestReader(manager, options) {
  this._manager = manager;
  var source = options.source;
  var args = {
    onHeadersReceived: this._onHeadersReceived.bind(this),
    onProgressiveData: source.disableStream ? null : this._onProgressiveData.bind(this),
    onDone: this._onDone.bind(this),
    onError: this._onError.bind(this),
    onProgress: this._onProgress.bind(this)
  };
  this._url = source.url;
  this._fullRequestId = manager.requestFull(args);
  this._headersReceivedCapability = (0, _util.createPromiseCapability)();
  this._disableRange = options.disableRange || false;
  this._contentLength = source.length;
  this._rangeChunkSize = source.rangeChunkSize;
  if (!this._rangeChunkSize && !this._disableRange) {
    this._disableRange = true;
  }
  this._isStreamingSupported = false;
  this._isRangeSupported = false;
  this._cachedChunks = [];
  this._requests = [];
  this._done = false;
  this._storedError = undefined;
  this.onProgress = null;
}
PDFNetworkStreamFullRequestReader.prototype = {
  _onHeadersReceived: function PDFNetworkStreamFullRequestReader_onHeadersReceived() {
    var fullRequestXhrId = this._fullRequestId;
    var fullRequestXhr = this._manager.getRequestXhr(fullRequestXhrId);

    var _validateRangeRequest = (0, _network_utils.validateRangeRequestCapabilities)({
      getResponseHeader: function getResponseHeader(name) {
        return fullRequestXhr.getResponseHeader(name);
      },
      isHttp: this._manager.isHttp,
      rangeChunkSize: this._rangeChunkSize,
      disableRange: this._disableRange
    }),
        allowRangeRequests = _validateRangeRequest.allowRangeRequests,
        suggestedLength = _validateRangeRequest.suggestedLength;

    this._contentLength = suggestedLength || this._contentLength;
    if (allowRangeRequests) {
      this._isRangeSupported = true;
    }
    var networkManager = this._manager;
    if (networkManager.isStreamingRequest(fullRequestXhrId)) {
      this._isStreamingSupported = true;
    } else if (this._isRangeSupported) {
      networkManager.abortRequest(fullRequestXhrId);
    }
    this._headersReceivedCapability.resolve();
  },
  _onProgressiveData: function PDFNetworkStreamFullRequestReader_onProgressiveData(chunk) {
    if (this._requests.length > 0) {
      var requestCapability = this._requests.shift();
      requestCapability.resolve({
        value: chunk,
        done: false
      });
    } else {
      this._cachedChunks.push(chunk);
    }
  },
  _onDone: function PDFNetworkStreamFullRequestReader_onDone(args) {
    if (args) {
      this._onProgressiveData(args.chunk);
    }
    this._done = true;
    if (this._cachedChunks.length > 0) {
      return;
    }
    this._requests.forEach(function (requestCapability) {
      requestCapability.resolve({
        value: undefined,
        done: true
      });
    });
    this._requests = [];
  },
  _onError: function PDFNetworkStreamFullRequestReader_onError(status) {
    var url = this._url;
    var exception = (0, _network_utils.createResponseStatusError)(status, url);
    this._storedError = exception;
    this._headersReceivedCapability.reject(exception);
    this._requests.forEach(function (requestCapability) {
      requestCapability.reject(exception);
    });
    this._requests = [];
    this._cachedChunks = [];
  },
  _onProgress: function PDFNetworkStreamFullRequestReader_onProgress(data) {
    if (this.onProgress) {
      this.onProgress({
        loaded: data.loaded,
        total: data.lengthComputable ? data.total : this._contentLength
      });
    }
  },
  get isRangeSupported() {
    return this._isRangeSupported;
  },
  get isStreamingSupported() {
    return this._isStreamingSupported;
  },
  get contentLength() {
    return this._contentLength;
  },
  get headersReady() {
    return this._headersReceivedCapability.promise;
  },
  read: function PDFNetworkStreamFullRequestReader_read() {
    if (this._storedError) {
      return Promise.reject(this._storedError);
    }
    if (this._cachedChunks.length > 0) {
      var chunk = this._cachedChunks.shift();
      return Promise.resolve({
        value: chunk,
        done: false
      });
    }
    if (this._done) {
      return Promise.resolve({
        value: undefined,
        done: true
      });
    }
    var requestCapability = (0, _util.createPromiseCapability)();
    this._requests.push(requestCapability);
    return requestCapability.promise;
  },
  cancel: function PDFNetworkStreamFullRequestReader_cancel(reason) {
    this._done = true;
    this._headersReceivedCapability.reject(reason);
    this._requests.forEach(function (requestCapability) {
      requestCapability.resolve({
        value: undefined,
        done: true
      });
    });
    this._requests = [];
    if (this._manager.isPendingRequest(this._fullRequestId)) {
      this._manager.abortRequest(this._fullRequestId);
    }
    this._fullRequestReader = null;
  }
};
function PDFNetworkStreamRangeRequestReader(manager, begin, end) {
  this._manager = manager;
  var args = {
    onDone: this._onDone.bind(this),
    onProgress: this._onProgress.bind(this)
  };
  this._requestId = manager.requestRange(begin, end, args);
  this._requests = [];
  this._queuedChunk = null;
  this._done = false;
  this.onProgress = null;
  this.onClosed = null;
}
PDFNetworkStreamRangeRequestReader.prototype = {
  _close: function PDFNetworkStreamRangeRequestReader_close() {
    if (this.onClosed) {
      this.onClosed(this);
    }
  },
  _onDone: function PDFNetworkStreamRangeRequestReader_onDone(data) {
    var chunk = data.chunk;
    if (this._requests.length > 0) {
      var requestCapability = this._requests.shift();
      requestCapability.resolve({
        value: chunk,
        done: false
      });
    } else {
      this._queuedChunk = chunk;
    }
    this._done = true;
    this._requests.forEach(function (requestCapability) {
      requestCapability.resolve({
        value: undefined,
        done: true
      });
    });
    this._requests = [];
    this._close();
  },
  _onProgress: function PDFNetworkStreamRangeRequestReader_onProgress(evt) {
    if (!this.isStreamingSupported && this.onProgress) {
      this.onProgress({ loaded: evt.loaded });
    }
  },
  get isStreamingSupported() {
    return false;
  },
  read: function PDFNetworkStreamRangeRequestReader_read() {
    if (this._queuedChunk !== null) {
      var chunk = this._queuedChunk;
      this._queuedChunk = null;
      return Promise.resolve({
        value: chunk,
        done: false
      });
    }
    if (this._done) {
      return Promise.resolve({
        value: undefined,
        done: true
      });
    }
    var requestCapability = (0, _util.createPromiseCapability)();
    this._requests.push(requestCapability);
    return requestCapability.promise;
  },
  cancel: function PDFNetworkStreamRangeRequestReader_cancel(reason) {
    this._done = true;
    this._requests.forEach(function (requestCapability) {
      requestCapability.resolve({
        value: undefined,
        done: true
      });
    });
    this._requests = [];
    if (this._manager.isPendingRequest(this._requestId)) {
      this._manager.abortRequest(this._requestId);
    }
    this._close();
  }
};
exports.PDFNetworkStream = PDFNetworkStream;
exports.NetworkManager = NetworkManager;

/***/ })
/******/ ]);
});
//# sourceMappingURL=pdf.js.map