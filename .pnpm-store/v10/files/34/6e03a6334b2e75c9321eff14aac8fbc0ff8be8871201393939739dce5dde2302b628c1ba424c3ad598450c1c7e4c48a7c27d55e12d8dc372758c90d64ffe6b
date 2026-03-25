/**
 * @licstart The following is the entire license notice for the
 * JavaScript code in this page
 *
 * Copyright 2024 Mozilla Foundation
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
 *
 * @licend The above is the entire license notice for the
 * JavaScript code in this page
 */

/**
 * pdfjsVersion = 5.3.31
 * pdfjsBuild = 47ad820d9
 */

;// ./src/shared/util.js
const isNodeJS = typeof process === "object" && process + "" === "[object process]" && !process.versions.nw && !(process.versions.electron && process.type && process.type !== "browser");
const FONT_IDENTITY_MATRIX = (/* unused pure expression or super */ null && ([0.001, 0, 0, 0.001, 0, 0]));
const LINE_FACTOR = 1.35;
const LINE_DESCENT_FACTOR = 0.35;
const BASELINE_FACTOR = LINE_DESCENT_FACTOR / LINE_FACTOR;
const RenderingIntentFlag = {
  ANY: 0x01,
  DISPLAY: 0x02,
  PRINT: 0x04,
  SAVE: 0x08,
  ANNOTATIONS_FORMS: 0x10,
  ANNOTATIONS_STORAGE: 0x20,
  ANNOTATIONS_DISABLE: 0x40,
  IS_EDITING: 0x80,
  OPLIST: 0x100
};
const AnnotationMode = {
  DISABLE: 0,
  ENABLE: 1,
  ENABLE_FORMS: 2,
  ENABLE_STORAGE: 3
};
const util_AnnotationEditorPrefix = "pdfjs_internal_editor_";
const AnnotationEditorType = {
  DISABLE: -1,
  NONE: 0,
  FREETEXT: 3,
  HIGHLIGHT: 9,
  STAMP: 13,
  INK: 15,
  SIGNATURE: 101
};
const AnnotationEditorParamsType = {
  RESIZE: 1,
  CREATE: 2,
  FREETEXT_SIZE: 11,
  FREETEXT_COLOR: 12,
  FREETEXT_OPACITY: 13,
  INK_COLOR: 21,
  INK_THICKNESS: 22,
  INK_OPACITY: 23,
  HIGHLIGHT_COLOR: 31,
  HIGHLIGHT_DEFAULT_COLOR: 32,
  HIGHLIGHT_THICKNESS: 33,
  HIGHLIGHT_FREE: 34,
  HIGHLIGHT_SHOW_ALL: 35,
  DRAW_STEP: 41
};
const PermissionFlag = {
  PRINT: 0x04,
  MODIFY_CONTENTS: 0x08,
  COPY: 0x10,
  MODIFY_ANNOTATIONS: 0x20,
  FILL_INTERACTIVE_FORMS: 0x100,
  COPY_FOR_ACCESSIBILITY: 0x200,
  ASSEMBLE: 0x400,
  PRINT_HIGH_QUALITY: 0x800
};
const TextRenderingMode = {
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
const util_ImageKind = {
  GRAYSCALE_1BPP: 1,
  RGB_24BPP: 2,
  RGBA_32BPP: 3
};
const AnnotationType = {
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
const AnnotationReplyType = {
  GROUP: "Group",
  REPLY: "R"
};
const AnnotationFlag = {
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
const AnnotationFieldFlag = {
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
const AnnotationBorderStyleType = {
  SOLID: 1,
  DASHED: 2,
  BEVELED: 3,
  INSET: 4,
  UNDERLINE: 5
};
const AnnotationActionEventType = {
  E: "Mouse Enter",
  X: "Mouse Exit",
  D: "Mouse Down",
  U: "Mouse Up",
  Fo: "Focus",
  Bl: "Blur",
  PO: "PageOpen",
  PC: "PageClose",
  PV: "PageVisible",
  PI: "PageInvisible",
  K: "Keystroke",
  F: "Format",
  V: "Validate",
  C: "Calculate"
};
const DocumentActionEventType = {
  WC: "WillClose",
  WS: "WillSave",
  DS: "DidSave",
  WP: "WillPrint",
  DP: "DidPrint"
};
const PageActionEventType = {
  O: "PageOpen",
  C: "PageClose"
};
const VerbosityLevel = {
  ERRORS: 0,
  WARNINGS: 1,
  INFOS: 5
};
const OPS = {
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
  beginAnnotation: 80,
  endAnnotation: 81,
  paintImageMaskXObject: 83,
  paintImageMaskXObjectGroup: 84,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintInlineImageXObjectGroup: 87,
  paintImageXObjectRepeat: 88,
  paintImageMaskXObjectRepeat: 89,
  paintSolidColorImageMask: 90,
  constructPath: 91,
  setStrokeTransparent: 92,
  setFillTransparent: 93,
  rawFillPath: 94
};
const DrawOPS = {
  moveTo: 0,
  lineTo: 1,
  curveTo: 2,
  closePath: 3
};
const PasswordResponses = {
  NEED_PASSWORD: 1,
  INCORRECT_PASSWORD: 2
};
let verbosity = VerbosityLevel.WARNINGS;
function setVerbosityLevel(level) {
  if (Number.isInteger(level)) {
    verbosity = level;
  }
}
function getVerbosityLevel() {
  return verbosity;
}
function info(msg) {
  if (verbosity >= VerbosityLevel.INFOS) {
    console.log(`Info: ${msg}`);
  }
}
function util_warn(msg) {
  if (verbosity >= VerbosityLevel.WARNINGS) {
    console.log(`Warning: ${msg}`);
  }
}
function unreachable(msg) {
  throw new Error(msg);
}
function util_assert(cond, msg) {
  if (!cond) {
    unreachable(msg);
  }
}
function _isValidProtocol(url) {
  switch (url?.protocol) {
    case "http:":
    case "https:":
    case "ftp:":
    case "mailto:":
    case "tel:":
      return true;
    default:
      return false;
  }
}
function createValidAbsoluteUrl(url, baseUrl = null, options = null) {
  if (!url) {
    return null;
  }
  if (options && typeof url === "string") {
    if (options.addDefaultProtocol && url.startsWith("www.")) {
      const dots = url.match(/\./g);
      if (dots?.length >= 2) {
        url = `http://${url}`;
      }
    }
    if (options.tryConvertEncoding) {
      try {
        url = stringToUTF8String(url);
      } catch {}
    }
  }
  const absoluteUrl = baseUrl ? URL.parse(url, baseUrl) : URL.parse(url);
  return _isValidProtocol(absoluteUrl) ? absoluteUrl : null;
}
function updateUrlHash(url, hash, allowRel = false) {
  const res = URL.parse(url);
  if (res) {
    res.hash = hash;
    return res.href;
  }
  if (allowRel && createValidAbsoluteUrl(url, "http://example.com")) {
    return url.split("#", 1)[0] + `${hash ? `#${hash}` : ""}`;
  }
  return "";
}
function shadow(obj, prop, value, nonSerializable = false) {
  Object.defineProperty(obj, prop, {
    value,
    enumerable: !nonSerializable,
    configurable: true,
    writable: false
  });
  return value;
}
const BaseException = function BaseExceptionClosure() {
  function BaseException(message, name) {
    this.message = message;
    this.name = name;
  }
  BaseException.prototype = new Error();
  BaseException.constructor = BaseException;
  return BaseException;
}();
class PasswordException extends BaseException {
  constructor(msg, code) {
    super(msg, "PasswordException");
    this.code = code;
  }
}
class UnknownErrorException extends BaseException {
  constructor(msg, details) {
    super(msg, "UnknownErrorException");
    this.details = details;
  }
}
class InvalidPDFException extends BaseException {
  constructor(msg) {
    super(msg, "InvalidPDFException");
  }
}
class ResponseException extends BaseException {
  constructor(msg, status, missing) {
    super(msg, "ResponseException");
    this.status = status;
    this.missing = missing;
  }
}
class FormatError extends BaseException {
  constructor(msg) {
    super(msg, "FormatError");
  }
}
class AbortException extends BaseException {
  constructor(msg) {
    super(msg, "AbortException");
  }
}
function bytesToString(bytes) {
  if (typeof bytes !== "object" || bytes?.length === undefined) {
    unreachable("Invalid argument for bytesToString");
  }
  const length = bytes.length;
  const MAX_ARGUMENT_COUNT = 8192;
  if (length < MAX_ARGUMENT_COUNT) {
    return String.fromCharCode.apply(null, bytes);
  }
  const strBuf = [];
  for (let i = 0; i < length; i += MAX_ARGUMENT_COUNT) {
    const chunkEnd = Math.min(i + MAX_ARGUMENT_COUNT, length);
    const chunk = bytes.subarray(i, chunkEnd);
    strBuf.push(String.fromCharCode.apply(null, chunk));
  }
  return strBuf.join("");
}
function stringToBytes(str) {
  if (typeof str !== "string") {
    unreachable("Invalid argument for stringToBytes");
  }
  const length = str.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; ++i) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}
function string32(value) {
  return String.fromCharCode(value >> 24 & 0xff, value >> 16 & 0xff, value >> 8 & 0xff, value & 0xff);
}
function util_objectSize(obj) {
  return Object.keys(obj).length;
}
function isLittleEndian() {
  const buffer8 = new Uint8Array(4);
  buffer8[0] = 1;
  const view32 = new Uint32Array(buffer8.buffer, 0, 1);
  return view32[0] === 1;
}
function isEvalSupported() {
  try {
    new Function("");
    return true;
  } catch {
    return false;
  }
}
class util_FeatureTest {
  static get isLittleEndian() {
    return shadow(this, "isLittleEndian", isLittleEndian());
  }
  static get isEvalSupported() {
    return shadow(this, "isEvalSupported", isEvalSupported());
  }
  static get isOffscreenCanvasSupported() {
    return shadow(this, "isOffscreenCanvasSupported", typeof OffscreenCanvas !== "undefined");
  }
  static get isImageDecoderSupported() {
    return shadow(this, "isImageDecoderSupported", typeof ImageDecoder !== "undefined");
  }
  static get platform() {
    const {
      platform,
      userAgent
    } = navigator;
    return shadow(this, "platform", {
      isAndroid: userAgent.includes("Android"),
      isLinux: platform.includes("Linux"),
      isMac: platform.includes("Mac"),
      isWindows: platform.includes("Win"),
      isFirefox: userAgent.includes("Firefox")
    });
  }
  static get isCSSRoundSupported() {
    return shadow(this, "isCSSRoundSupported", globalThis.CSS?.supports?.("width: round(1.5px, 1px)"));
  }
}
const util_hexNumbers = Array.from(Array(256).keys(), n => n.toString(16).padStart(2, "0"));
class util_Util {
  static makeHexColor(r, g, b) {
    return `#${util_hexNumbers[r]}${util_hexNumbers[g]}${util_hexNumbers[b]}`;
  }
  static scaleMinMax(transform, minMax) {
    let temp;
    if (transform[0]) {
      if (transform[0] < 0) {
        temp = minMax[0];
        minMax[0] = minMax[2];
        minMax[2] = temp;
      }
      minMax[0] *= transform[0];
      minMax[2] *= transform[0];
      if (transform[3] < 0) {
        temp = minMax[1];
        minMax[1] = minMax[3];
        minMax[3] = temp;
      }
      minMax[1] *= transform[3];
      minMax[3] *= transform[3];
    } else {
      temp = minMax[0];
      minMax[0] = minMax[1];
      minMax[1] = temp;
      temp = minMax[2];
      minMax[2] = minMax[3];
      minMax[3] = temp;
      if (transform[1] < 0) {
        temp = minMax[1];
        minMax[1] = minMax[3];
        minMax[3] = temp;
      }
      minMax[1] *= transform[1];
      minMax[3] *= transform[1];
      if (transform[2] < 0) {
        temp = minMax[0];
        minMax[0] = minMax[2];
        minMax[2] = temp;
      }
      minMax[0] *= transform[2];
      minMax[2] *= transform[2];
    }
    minMax[0] += transform[4];
    minMax[1] += transform[5];
    minMax[2] += transform[4];
    minMax[3] += transform[5];
  }
  static transform(m1, m2) {
    return [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1], m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3], m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
  }
  static applyTransform(p, m, pos = 0) {
    const p0 = p[pos];
    const p1 = p[pos + 1];
    p[pos] = p0 * m[0] + p1 * m[2] + m[4];
    p[pos + 1] = p0 * m[1] + p1 * m[3] + m[5];
  }
  static applyTransformToBezier(p, transform, pos = 0) {
    const m0 = transform[0];
    const m1 = transform[1];
    const m2 = transform[2];
    const m3 = transform[3];
    const m4 = transform[4];
    const m5 = transform[5];
    for (let i = 0; i < 6; i += 2) {
      const pI = p[pos + i];
      const pI1 = p[pos + i + 1];
      p[pos + i] = pI * m0 + pI1 * m2 + m4;
      p[pos + i + 1] = pI * m1 + pI1 * m3 + m5;
    }
  }
  static applyInverseTransform(p, m) {
    const p0 = p[0];
    const p1 = p[1];
    const d = m[0] * m[3] - m[1] * m[2];
    p[0] = (p0 * m[3] - p1 * m[2] + m[2] * m[5] - m[4] * m[3]) / d;
    p[1] = (-p0 * m[1] + p1 * m[0] + m[4] * m[1] - m[5] * m[0]) / d;
  }
  static axialAlignedBoundingBox(rect, transform, output) {
    const m0 = transform[0];
    const m1 = transform[1];
    const m2 = transform[2];
    const m3 = transform[3];
    const m4 = transform[4];
    const m5 = transform[5];
    const r0 = rect[0];
    const r1 = rect[1];
    const r2 = rect[2];
    const r3 = rect[3];
    let a0 = m0 * r0 + m4;
    let a2 = a0;
    let a1 = m0 * r2 + m4;
    let a3 = a1;
    let b0 = m3 * r1 + m5;
    let b2 = b0;
    let b1 = m3 * r3 + m5;
    let b3 = b1;
    if (m1 !== 0 || m2 !== 0) {
      const m1r0 = m1 * r0;
      const m1r2 = m1 * r2;
      const m2r1 = m2 * r1;
      const m2r3 = m2 * r3;
      a0 += m2r1;
      a3 += m2r1;
      a1 += m2r3;
      a2 += m2r3;
      b0 += m1r0;
      b3 += m1r0;
      b1 += m1r2;
      b2 += m1r2;
    }
    output[0] = Math.min(output[0], a0, a1, a2, a3);
    output[1] = Math.min(output[1], b0, b1, b2, b3);
    output[2] = Math.max(output[2], a0, a1, a2, a3);
    output[3] = Math.max(output[3], b0, b1, b2, b3);
  }
  static inverseTransform(m) {
    const d = m[0] * m[3] - m[1] * m[2];
    return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[4] * m[3]) / d, (m[4] * m[1] - m[5] * m[0]) / d];
  }
  static singularValueDecompose2dScale(matrix, output) {
    const m0 = matrix[0];
    const m1 = matrix[1];
    const m2 = matrix[2];
    const m3 = matrix[3];
    const a = m0 ** 2 + m1 ** 2;
    const b = m0 * m2 + m1 * m3;
    const c = m2 ** 2 + m3 ** 2;
    const first = (a + c) / 2;
    const second = Math.sqrt(first ** 2 - (a * c - b ** 2));
    output[0] = Math.sqrt(first + second || 1);
    output[1] = Math.sqrt(first - second || 1);
  }
  static normalizeRect(rect) {
    const r = rect.slice(0);
    if (rect[0] > rect[2]) {
      r[0] = rect[2];
      r[2] = rect[0];
    }
    if (rect[1] > rect[3]) {
      r[1] = rect[3];
      r[3] = rect[1];
    }
    return r;
  }
  static intersect(rect1, rect2) {
    const xLow = Math.max(Math.min(rect1[0], rect1[2]), Math.min(rect2[0], rect2[2]));
    const xHigh = Math.min(Math.max(rect1[0], rect1[2]), Math.max(rect2[0], rect2[2]));
    if (xLow > xHigh) {
      return null;
    }
    const yLow = Math.max(Math.min(rect1[1], rect1[3]), Math.min(rect2[1], rect2[3]));
    const yHigh = Math.min(Math.max(rect1[1], rect1[3]), Math.max(rect2[1], rect2[3]));
    if (yLow > yHigh) {
      return null;
    }
    return [xLow, yLow, xHigh, yHigh];
  }
  static pointBoundingBox(x, y, minMax) {
    minMax[0] = Math.min(minMax[0], x);
    minMax[1] = Math.min(minMax[1], y);
    minMax[2] = Math.max(minMax[2], x);
    minMax[3] = Math.max(minMax[3], y);
  }
  static rectBoundingBox(x0, y0, x1, y1, minMax) {
    minMax[0] = Math.min(minMax[0], x0, x1);
    minMax[1] = Math.min(minMax[1], y0, y1);
    minMax[2] = Math.max(minMax[2], x0, x1);
    minMax[3] = Math.max(minMax[3], y0, y1);
  }
  static #getExtremumOnCurve(x0, x1, x2, x3, y0, y1, y2, y3, t, minMax) {
    if (t <= 0 || t >= 1) {
      return;
    }
    const mt = 1 - t;
    const tt = t * t;
    const ttt = tt * t;
    const x = mt * (mt * (mt * x0 + 3 * t * x1) + 3 * tt * x2) + ttt * x3;
    const y = mt * (mt * (mt * y0 + 3 * t * y1) + 3 * tt * y2) + ttt * y3;
    minMax[0] = Math.min(minMax[0], x);
    minMax[1] = Math.min(minMax[1], y);
    minMax[2] = Math.max(minMax[2], x);
    minMax[3] = Math.max(minMax[3], y);
  }
  static #getExtremum(x0, x1, x2, x3, y0, y1, y2, y3, a, b, c, minMax) {
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) >= 1e-12) {
        this.#getExtremumOnCurve(x0, x1, x2, x3, y0, y1, y2, y3, -c / b, minMax);
      }
      return;
    }
    const delta = b ** 2 - 4 * c * a;
    if (delta < 0) {
      return;
    }
    const sqrtDelta = Math.sqrt(delta);
    const a2 = 2 * a;
    this.#getExtremumOnCurve(x0, x1, x2, x3, y0, y1, y2, y3, (-b + sqrtDelta) / a2, minMax);
    this.#getExtremumOnCurve(x0, x1, x2, x3, y0, y1, y2, y3, (-b - sqrtDelta) / a2, minMax);
  }
  static bezierBoundingBox(x0, y0, x1, y1, x2, y2, x3, y3, minMax) {
    minMax[0] = Math.min(minMax[0], x0, x3);
    minMax[1] = Math.min(minMax[1], y0, y3);
    minMax[2] = Math.max(minMax[2], x0, x3);
    minMax[3] = Math.max(minMax[3], y0, y3);
    this.#getExtremum(x0, x1, x2, x3, y0, y1, y2, y3, 3 * (-x0 + 3 * (x1 - x2) + x3), 6 * (x0 - 2 * x1 + x2), 3 * (x1 - x0), minMax);
    this.#getExtremum(x0, x1, x2, x3, y0, y1, y2, y3, 3 * (-y0 + 3 * (y1 - y2) + y3), 6 * (y0 - 2 * y1 + y2), 3 * (y1 - y0), minMax);
  }
}
const PDFStringTranslateTable = (/* unused pure expression or super */ null && ([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x2d8, 0x2c7, 0x2c6, 0x2d9, 0x2dd, 0x2db, 0x2da, 0x2dc, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x2022, 0x2020, 0x2021, 0x2026, 0x2014, 0x2013, 0x192, 0x2044, 0x2039, 0x203a, 0x2212, 0x2030, 0x201e, 0x201c, 0x201d, 0x2018, 0x2019, 0x201a, 0x2122, 0xfb01, 0xfb02, 0x141, 0x152, 0x160, 0x178, 0x17d, 0x131, 0x142, 0x153, 0x161, 0x17e, 0, 0x20ac]));
function util_stringToPDFString(str, keepEscapeSequence = false) {
  if (str[0] >= "\xEF") {
    let encoding;
    if (str[0] === "\xFE" && str[1] === "\xFF") {
      encoding = "utf-16be";
      if (str.length % 2 === 1) {
        str = str.slice(0, -1);
      }
    } else if (str[0] === "\xFF" && str[1] === "\xFE") {
      encoding = "utf-16le";
      if (str.length % 2 === 1) {
        str = str.slice(0, -1);
      }
    } else if (str[0] === "\xEF" && str[1] === "\xBB" && str[2] === "\xBF") {
      encoding = "utf-8";
    }
    if (encoding) {
      try {
        const decoder = new TextDecoder(encoding, {
          fatal: true
        });
        const buffer = stringToBytes(str);
        const decoded = decoder.decode(buffer);
        if (keepEscapeSequence || !decoded.includes("\x1b")) {
          return decoded;
        }
        return decoded.replaceAll(/\x1b[^\x1b]*(?:\x1b|$)/g, "");
      } catch (ex) {
        util_warn(`stringToPDFString: "${ex}".`);
      }
    }
  }
  const strBuf = [];
  for (let i = 0, ii = str.length; i < ii; i++) {
    const charCode = str.charCodeAt(i);
    if (!keepEscapeSequence && charCode === 0x1b) {
      while (++i < ii && str.charCodeAt(i) !== 0x1b) {}
      continue;
    }
    const code = PDFStringTranslateTable[charCode];
    strBuf.push(code ? String.fromCharCode(code) : str.charAt(i));
  }
  return strBuf.join("");
}
function stringToUTF8String(str) {
  return decodeURIComponent(escape(str));
}
function utf8StringToString(str) {
  return unescape(encodeURIComponent(str));
}
function isArrayEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0, ii = arr1.length; i < ii; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}
function getModificationDate(date = new Date()) {
  const buffer = [date.getUTCFullYear().toString(), (date.getUTCMonth() + 1).toString().padStart(2, "0"), date.getUTCDate().toString().padStart(2, "0"), date.getUTCHours().toString().padStart(2, "0"), date.getUTCMinutes().toString().padStart(2, "0"), date.getUTCSeconds().toString().padStart(2, "0")];
  return buffer.join("");
}
let NormalizeRegex = null;
let NormalizationMap = null;
function normalizeUnicode(str) {
  if (!NormalizeRegex) {
    NormalizeRegex = /([\u00a0\u00b5\u037e\u0eb3\u2000-\u200a\u202f\u2126\ufb00-\ufb04\ufb06\ufb20-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufba1\ufba4-\ufba9\ufbae-\ufbb1\ufbd3-\ufbdc\ufbde-\ufbe7\ufbea-\ufbf8\ufbfc-\ufbfd\ufc00-\ufc5d\ufc64-\ufcf1\ufcf5-\ufd3d\ufd88\ufdf4\ufdfa-\ufdfb\ufe71\ufe77\ufe79\ufe7b\ufe7d]+)|(\ufb05+)/gu;
    NormalizationMap = new Map([["ﬅ", "ſt"]]);
  }
  return str.replaceAll(NormalizeRegex, (_, p1, p2) => p1 ? p1.normalize("NFKC") : NormalizationMap.get(p2));
}
function getUuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return bytesToString(buf);
}
const AnnotationPrefix = "pdfjs_internal_id_";
function _isValidExplicitDest(validRef, validName, dest) {
  if (!Array.isArray(dest) || dest.length < 2) {
    return false;
  }
  const [page, zoom, ...args] = dest;
  if (!validRef(page) && !Number.isInteger(page)) {
    return false;
  }
  if (!validName(zoom)) {
    return false;
  }
  const argsLen = args.length;
  let allowNull = true;
  switch (zoom.name) {
    case "XYZ":
      if (argsLen < 2 || argsLen > 3) {
        return false;
      }
      break;
    case "Fit":
    case "FitB":
      return argsLen === 0;
    case "FitH":
    case "FitBH":
    case "FitV":
    case "FitBV":
      if (argsLen > 1) {
        return false;
      }
      break;
    case "FitR":
      if (argsLen !== 4) {
        return false;
      }
      allowNull = false;
      break;
    default:
      return false;
  }
  for (const arg of args) {
    if (typeof arg === "number" || allowNull && arg === null) {
      continue;
    }
    return false;
  }
  return true;
}
function MathClamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
function toHexUtil(arr) {
  if (Uint8Array.prototype.toHex) {
    return arr.toHex();
  }
  return Array.from(arr, num => util_hexNumbers[num]).join("");
}
function toBase64Util(arr) {
  if (Uint8Array.prototype.toBase64) {
    return arr.toBase64();
  }
  return btoa(bytesToString(arr));
}
function fromBase64Util(str) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(str);
  }
  return stringToBytes(atob(str));
}
if (typeof Promise.try !== "function") {
  Promise.try = function (fn, ...args) {
    return new Promise(resolve => {
      resolve(fn(...args));
    });
  };
}
if (typeof Math.sumPrecise !== "function") {
  Math.sumPrecise = function (numbers) {
    return numbers.reduce((a, b) => a + b, 0);
  };
}

;// ./src/core/primitives.js

const CIRCULAR_REF = Symbol("CIRCULAR_REF");
const EOF = Symbol("EOF");
let CmdCache = Object.create(null);
let NameCache = Object.create(null);
let RefCache = Object.create(null);
function clearPrimitiveCaches() {
  CmdCache = Object.create(null);
  NameCache = Object.create(null);
  RefCache = Object.create(null);
}
class Name {
  constructor(name) {
    this.name = name;
  }
  static get(name) {
    return NameCache[name] ||= new Name(name);
  }
}
class Cmd {
  constructor(cmd) {
    this.cmd = cmd;
  }
  static get(cmd) {
    return CmdCache[cmd] ||= new Cmd(cmd);
  }
}
const nonSerializable = function nonSerializableClosure() {
  return nonSerializable;
};
class primitives_Dict {
  constructor(xref = null) {
    this._map = new Map();
    this.xref = xref;
    this.objId = null;
    this.suppressEncryption = false;
    this.__nonSerializable__ = nonSerializable;
  }
  assignXref(newXref) {
    this.xref = newXref;
  }
  get size() {
    return this._map.size;
  }
  get(key1, key2, key3) {
    let value = this._map.get(key1);
    if (value === undefined && key2 !== undefined) {
      value = this._map.get(key2);
      if (value === undefined && key3 !== undefined) {
        value = this._map.get(key3);
      }
    }
    if (value instanceof primitives_Ref && this.xref) {
      return this.xref.fetch(value, this.suppressEncryption);
    }
    return value;
  }
  async getAsync(key1, key2, key3) {
    let value = this._map.get(key1);
    if (value === undefined && key2 !== undefined) {
      value = this._map.get(key2);
      if (value === undefined && key3 !== undefined) {
        value = this._map.get(key3);
      }
    }
    if (value instanceof primitives_Ref && this.xref) {
      return this.xref.fetchAsync(value, this.suppressEncryption);
    }
    return value;
  }
  getArray(key1, key2, key3) {
    let value = this._map.get(key1);
    if (value === undefined && key2 !== undefined) {
      value = this._map.get(key2);
      if (value === undefined && key3 !== undefined) {
        value = this._map.get(key3);
      }
    }
    if (value instanceof primitives_Ref && this.xref) {
      value = this.xref.fetch(value, this.suppressEncryption);
    }
    if (Array.isArray(value)) {
      value = value.slice();
      for (let i = 0, ii = value.length; i < ii; i++) {
        if (value[i] instanceof primitives_Ref && this.xref) {
          value[i] = this.xref.fetch(value[i], this.suppressEncryption);
        }
      }
    }
    return value;
  }
  getRaw(key) {
    return this._map.get(key);
  }
  getKeys() {
    return [...this._map.keys()];
  }
  getRawValues() {
    return [...this._map.values()];
  }
  set(key, value) {
    this._map.set(key, value);
  }
  has(key) {
    return this._map.has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of this._map) {
      yield [key, value instanceof primitives_Ref && this.xref ? this.xref.fetch(value, this.suppressEncryption) : value];
    }
  }
  static get empty() {
    const emptyDict = new primitives_Dict(null);
    emptyDict.set = (key, value) => {
      unreachable("Should not call `set` on the empty dictionary.");
    };
    return shadow(this, "empty", emptyDict);
  }
  static merge({
    xref,
    dictArray,
    mergeSubDicts = false
  }) {
    const mergedDict = new primitives_Dict(xref),
      properties = new Map();
    for (const dict of dictArray) {
      if (!(dict instanceof primitives_Dict)) {
        continue;
      }
      for (const [key, value] of dict._map) {
        let property = properties.get(key);
        if (property === undefined) {
          property = [];
          properties.set(key, property);
        } else if (!mergeSubDicts || !(value instanceof primitives_Dict)) {
          continue;
        }
        property.push(value);
      }
    }
    for (const [name, values] of properties) {
      if (values.length === 1 || !(values[0] instanceof primitives_Dict)) {
        mergedDict._map.set(name, values[0]);
        continue;
      }
      const subDict = new primitives_Dict(xref);
      for (const dict of values) {
        for (const [key, value] of dict._map) {
          if (!subDict._map.has(key)) {
            subDict._map.set(key, value);
          }
        }
      }
      if (subDict.size > 0) {
        mergedDict._map.set(name, subDict);
      }
    }
    properties.clear();
    return mergedDict.size > 0 ? mergedDict : primitives_Dict.empty;
  }
  clone() {
    const dict = new primitives_Dict(this.xref);
    for (const key of this.getKeys()) {
      dict.set(key, this.getRaw(key));
    }
    return dict;
  }
  delete(key) {
    delete this._map[key];
  }
}
class primitives_Ref {
  constructor(num, gen) {
    this.num = num;
    this.gen = gen;
  }
  toString() {
    if (this.gen === 0) {
      return `${this.num}R`;
    }
    return `${this.num}R${this.gen}`;
  }
  static fromString(str) {
    const ref = RefCache[str];
    if (ref) {
      return ref;
    }
    const m = /^(\d+)R(\d*)$/.exec(str);
    if (!m || m[1] === "0") {
      return null;
    }
    return RefCache[str] = new primitives_Ref(parseInt(m[1]), !m[2] ? 0 : parseInt(m[2]));
  }
  static get(num, gen) {
    const key = gen === 0 ? `${num}R` : `${num}R${gen}`;
    return RefCache[key] ||= new primitives_Ref(num, gen);
  }
}
class primitives_RefSet {
  constructor(parent = null) {
    this._set = new Set(parent?._set);
  }
  has(ref) {
    return this._set.has(ref.toString());
  }
  put(ref) {
    this._set.add(ref.toString());
  }
  remove(ref) {
    this._set.delete(ref.toString());
  }
  [Symbol.iterator]() {
    return this._set.values();
  }
  clear() {
    this._set.clear();
  }
}
class RefSetCache {
  constructor() {
    this._map = new Map();
  }
  get size() {
    return this._map.size;
  }
  get(ref) {
    return this._map.get(ref.toString());
  }
  has(ref) {
    return this._map.has(ref.toString());
  }
  put(ref, obj) {
    this._map.set(ref.toString(), obj);
  }
  putAlias(ref, aliasRef) {
    this._map.set(ref.toString(), this.get(aliasRef));
  }
  [Symbol.iterator]() {
    return this._map.values();
  }
  clear() {
    this._map.clear();
  }
  *values() {
    yield* this._map.values();
  }
  *items() {
    for (const [ref, value] of this._map) {
      yield [primitives_Ref.fromString(ref), value];
    }
  }
}
function primitives_isName(v, name) {
  return v instanceof Name && (name === undefined || v.name === name);
}
function isCmd(v, cmd) {
  return v instanceof Cmd && (cmd === undefined || v.cmd === cmd);
}
function isDict(v, type) {
  return v instanceof primitives_Dict && (type === undefined || primitives_isName(v.get("Type"), type));
}
function isRefsEqual(v1, v2) {
  return v1.num === v2.num && v1.gen === v2.gen;
}

;// ./src/core/base_stream.js

class base_stream_BaseStream {
  get length() {
    unreachable("Abstract getter `length` accessed");
  }
  get isEmpty() {
    unreachable("Abstract getter `isEmpty` accessed");
  }
  get isDataLoaded() {
    return shadow(this, "isDataLoaded", true);
  }
  getByte() {
    unreachable("Abstract method `getByte` called");
  }
  getBytes(length) {
    unreachable("Abstract method `getBytes` called");
  }
  async getImageData(length, decoderOptions) {
    return this.getBytes(length, decoderOptions);
  }
  async asyncGetBytes() {
    unreachable("Abstract method `asyncGetBytes` called");
  }
  get isAsync() {
    return false;
  }
  get isAsyncDecoder() {
    return false;
  }
  get canAsyncDecodeImageFromBuffer() {
    return false;
  }
  async getTransferableImage() {
    return null;
  }
  peekByte() {
    const peekedByte = this.getByte();
    if (peekedByte !== -1) {
      this.pos--;
    }
    return peekedByte;
  }
  peekBytes(length) {
    const bytes = this.getBytes(length);
    this.pos -= bytes.length;
    return bytes;
  }
  getUint16() {
    const b0 = this.getByte();
    const b1 = this.getByte();
    if (b0 === -1 || b1 === -1) {
      return -1;
    }
    return (b0 << 8) + b1;
  }
  getInt32() {
    const b0 = this.getByte();
    const b1 = this.getByte();
    const b2 = this.getByte();
    const b3 = this.getByte();
    return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
  }
  getByteRange(begin, end) {
    unreachable("Abstract method `getByteRange` called");
  }
  getString(length) {
    return bytesToString(this.getBytes(length));
  }
  skip(n) {
    this.pos += n || 1;
  }
  reset() {
    unreachable("Abstract method `reset` called");
  }
  moveStart() {
    unreachable("Abstract method `moveStart` called");
  }
  makeSubStream(start, length, dict = null) {
    unreachable("Abstract method `makeSubStream` called");
  }
  getBaseStreams() {
    return null;
  }
}

;// ./src/core/core_utils.js



const PDF_VERSION_REGEXP = /^[1-9]\.\d$/;
const MAX_INT_32 = 2 ** 31 - 1;
const MIN_INT_32 = -(2 ** 31);
const IDENTITY_MATRIX = (/* unused pure expression or super */ null && ([1, 0, 0, 1, 0, 0]));
const RESOURCES_KEYS_OPERATOR_LIST = (/* unused pure expression or super */ null && (["ColorSpace", "ExtGState", "Font", "Pattern", "Properties", "Shading", "XObject"]));
const RESOURCES_KEYS_TEXT_CONTENT = (/* unused pure expression or super */ null && (["ExtGState", "Font", "Properties", "XObject"]));
function getLookupTableFactory(initializer) {
  let lookup;
  return function () {
    if (initializer) {
      lookup = Object.create(null);
      initializer(lookup);
      initializer = null;
    }
    return lookup;
  };
}
class MissingDataException extends BaseException {
  constructor(begin, end) {
    super(`Missing data [${begin}, ${end})`, "MissingDataException");
    this.begin = begin;
    this.end = end;
  }
}
class ParserEOFException extends BaseException {
  constructor(msg) {
    super(msg, "ParserEOFException");
  }
}
class XRefEntryException extends BaseException {
  constructor(msg) {
    super(msg, "XRefEntryException");
  }
}
class XRefParseException extends BaseException {
  constructor(msg) {
    super(msg, "XRefParseException");
  }
}
function arrayBuffersToBytes(arr) {
  const length = arr.length;
  if (length === 0) {
    return new Uint8Array(0);
  }
  if (length === 1) {
    return new Uint8Array(arr[0]);
  }
  let dataLength = 0;
  for (let i = 0; i < length; i++) {
    dataLength += arr[i].byteLength;
  }
  const data = new Uint8Array(dataLength);
  let pos = 0;
  for (let i = 0; i < length; i++) {
    const item = new Uint8Array(arr[i]);
    data.set(item, pos);
    pos += item.byteLength;
  }
  return data;
}
async function fetchBinaryData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file "${url}" with "${response.statusText}".`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
function getInheritableProperty({
  dict,
  key,
  getArray = false,
  stopWhenFound = true
}) {
  let values;
  const visited = new RefSet();
  while (dict instanceof Dict && !(dict.objId && visited.has(dict.objId))) {
    if (dict.objId) {
      visited.put(dict.objId);
    }
    const value = getArray ? dict.getArray(key) : dict.get(key);
    if (value !== undefined) {
      if (stopWhenFound) {
        return value;
      }
      (values ||= []).push(value);
    }
    dict = dict.get("Parent");
  }
  return values;
}
function getParentToUpdate(dict, ref, xref) {
  const visited = new RefSet();
  const firstDict = dict;
  const result = {
    dict: null,
    ref: null
  };
  while (dict instanceof Dict && !visited.has(ref)) {
    visited.put(ref);
    if (dict.has("T")) {
      break;
    }
    ref = dict.getRaw("Parent");
    if (!(ref instanceof Ref)) {
      return result;
    }
    dict = xref.fetch(ref);
  }
  if (dict instanceof Dict && dict !== firstDict) {
    result.dict = dict;
    result.ref = ref;
  }
  return result;
}
const ROMAN_NUMBER_MAP = (/* unused pure expression or super */ null && (["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM", "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC", "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]));
function toRomanNumerals(number, lowerCase = false) {
  assert(Number.isInteger(number) && number > 0, "The number should be a positive integer.");
  const roman = "M".repeat(number / 1000 | 0) + ROMAN_NUMBER_MAP[number % 1000 / 100 | 0] + ROMAN_NUMBER_MAP[10 + (number % 100 / 10 | 0)] + ROMAN_NUMBER_MAP[20 + number % 10];
  return lowerCase ? roman.toLowerCase() : roman;
}
function log2(x) {
  return x > 0 ? Math.ceil(Math.log2(x)) : 0;
}
function readInt8(data, offset) {
  return data[offset] << 24 >> 24;
}
function readInt16(data, offset) {
  return (data[offset] << 24 | data[offset + 1] << 16) >> 16;
}
function readUint16(data, offset) {
  return data[offset] << 8 | data[offset + 1];
}
function readUint32(data, offset) {
  return (data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3]) >>> 0;
}
function isWhiteSpace(ch) {
  return ch === 0x20 || ch === 0x09 || ch === 0x0d || ch === 0x0a;
}
function isBooleanArray(arr, len) {
  return Array.isArray(arr) && (len === null || arr.length === len) && arr.every(x => typeof x === "boolean");
}
function isNumberArray(arr, len) {
  if (Array.isArray(arr)) {
    return (len === null || arr.length === len) && arr.every(x => typeof x === "number");
  }
  return ArrayBuffer.isView(arr) && !(arr instanceof BigInt64Array || arr instanceof BigUint64Array) && (len === null || arr.length === len);
}
function lookupMatrix(arr, fallback) {
  return isNumberArray(arr, 6) ? arr : fallback;
}
function lookupRect(arr, fallback) {
  return isNumberArray(arr, 4) ? arr : fallback;
}
function lookupNormalRect(arr, fallback) {
  return isNumberArray(arr, 4) ? Util.normalizeRect(arr) : fallback;
}
function parseXFAPath(path) {
  const positionPattern = /(.+)\[(\d+)\]$/;
  return path.split(".").map(component => {
    const m = component.match(positionPattern);
    if (m) {
      return {
        name: m[1],
        pos: parseInt(m[2], 10)
      };
    }
    return {
      name: component,
      pos: 0
    };
  });
}
function escapePDFName(str) {
  const buffer = [];
  let start = 0;
  for (let i = 0, ii = str.length; i < ii; i++) {
    const char = str.charCodeAt(i);
    if (char < 0x21 || char > 0x7e || char === 0x23 || char === 0x28 || char === 0x29 || char === 0x3c || char === 0x3e || char === 0x5b || char === 0x5d || char === 0x7b || char === 0x7d || char === 0x2f || char === 0x25) {
      if (start < i) {
        buffer.push(str.substring(start, i));
      }
      buffer.push(`#${char.toString(16)}`);
      start = i + 1;
    }
  }
  if (buffer.length === 0) {
    return str;
  }
  if (start < str.length) {
    buffer.push(str.substring(start, str.length));
  }
  return buffer.join("");
}
function escapeString(str) {
  return str.replaceAll(/([()\\\n\r])/g, match => {
    if (match === "\n") {
      return "\\n";
    } else if (match === "\r") {
      return "\\r";
    }
    return `\\${match}`;
  });
}
function _collectJS(entry, xref, list, parents) {
  if (!entry) {
    return;
  }
  let parent = null;
  if (entry instanceof Ref) {
    if (parents.has(entry)) {
      return;
    }
    parent = entry;
    parents.put(parent);
    entry = xref.fetch(entry);
  }
  if (Array.isArray(entry)) {
    for (const element of entry) {
      _collectJS(element, xref, list, parents);
    }
  } else if (entry instanceof Dict) {
    if (isName(entry.get("S"), "JavaScript")) {
      const js = entry.get("JS");
      let code;
      if (js instanceof BaseStream) {
        code = js.getString();
      } else if (typeof js === "string") {
        code = js;
      }
      code &&= stringToPDFString(code, true).replaceAll("\x00", "");
      if (code) {
        list.push(code);
      }
    }
    _collectJS(entry.getRaw("Next"), xref, list, parents);
  }
  if (parent) {
    parents.remove(parent);
  }
}
function collectActions(xref, dict, eventType) {
  const actions = Object.create(null);
  const additionalActionsDicts = getInheritableProperty({
    dict,
    key: "AA",
    stopWhenFound: false
  });
  if (additionalActionsDicts) {
    for (let i = additionalActionsDicts.length - 1; i >= 0; i--) {
      const additionalActions = additionalActionsDicts[i];
      if (!(additionalActions instanceof Dict)) {
        continue;
      }
      for (const key of additionalActions.getKeys()) {
        const action = eventType[key];
        if (!action) {
          continue;
        }
        const actionDict = additionalActions.getRaw(key);
        const parents = new RefSet();
        const list = [];
        _collectJS(actionDict, xref, list, parents);
        if (list.length > 0) {
          actions[action] = list;
        }
      }
    }
  }
  if (dict.has("A")) {
    const actionDict = dict.get("A");
    const parents = new RefSet();
    const list = [];
    _collectJS(actionDict, xref, list, parents);
    if (list.length > 0) {
      actions.Action = list;
    }
  }
  return objectSize(actions) > 0 ? actions : null;
}
const XMLEntities = {
  0x3c: "&lt;",
  0x3e: "&gt;",
  0x26: "&amp;",
  0x22: "&quot;",
  0x27: "&apos;"
};
function* codePointIter(str) {
  for (let i = 0, ii = str.length; i < ii; i++) {
    const char = str.codePointAt(i);
    if (char > 0xd7ff && (char < 0xe000 || char > 0xfffd)) {
      i++;
    }
    yield char;
  }
}
function encodeToXmlString(str) {
  const buffer = [];
  let start = 0;
  for (let i = 0, ii = str.length; i < ii; i++) {
    const char = str.codePointAt(i);
    if (0x20 <= char && char <= 0x7e) {
      const entity = XMLEntities[char];
      if (entity) {
        if (start < i) {
          buffer.push(str.substring(start, i));
        }
        buffer.push(entity);
        start = i + 1;
      }
    } else {
      if (start < i) {
        buffer.push(str.substring(start, i));
      }
      buffer.push(`&#x${char.toString(16).toUpperCase()};`);
      if (char > 0xd7ff && (char < 0xe000 || char > 0xfffd)) {
        i++;
      }
      start = i + 1;
    }
  }
  if (buffer.length === 0) {
    return str;
  }
  if (start < str.length) {
    buffer.push(str.substring(start, str.length));
  }
  return buffer.join("");
}
function validateFontName(fontFamily, mustWarn = false) {
  const m = /^("|').*("|')$/.exec(fontFamily);
  if (m && m[1] === m[2]) {
    const re = new RegExp(`[^\\\\]${m[1]}`);
    if (re.test(fontFamily.slice(1, -1))) {
      if (mustWarn) {
        warn(`FontFamily contains unescaped ${m[1]}: ${fontFamily}.`);
      }
      return false;
    }
  } else {
    for (const ident of fontFamily.split(/[ \t]+/)) {
      if (/^(\d|(-(\d|-)))/.test(ident) || !/^[\w-\\]+$/.test(ident)) {
        if (mustWarn) {
          warn(`FontFamily contains invalid <custom-ident>: ${fontFamily}.`);
        }
        return false;
      }
    }
  }
  return true;
}
function validateCSSFont(cssFontInfo) {
  const DEFAULT_CSS_FONT_OBLIQUE = "14";
  const DEFAULT_CSS_FONT_WEIGHT = "400";
  const CSS_FONT_WEIGHT_VALUES = new Set(["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000", "normal", "bold", "bolder", "lighter"]);
  const {
    fontFamily,
    fontWeight,
    italicAngle
  } = cssFontInfo;
  if (!validateFontName(fontFamily, true)) {
    return false;
  }
  const weight = fontWeight ? fontWeight.toString() : "";
  cssFontInfo.fontWeight = CSS_FONT_WEIGHT_VALUES.has(weight) ? weight : DEFAULT_CSS_FONT_WEIGHT;
  const angle = parseFloat(italicAngle);
  cssFontInfo.italicAngle = isNaN(angle) || angle < -90 || angle > 90 ? DEFAULT_CSS_FONT_OBLIQUE : italicAngle.toString();
  return true;
}
function recoverJsURL(str) {
  const URL_OPEN_METHODS = ["app.launchURL", "window.open", "xfa.host.gotoURL"];
  const regex = new RegExp("^\\s*(" + URL_OPEN_METHODS.join("|").replaceAll(".", "\\.") + ")\\((?:'|\")([^'\"]*)(?:'|\")(?:,\\s*(\\w+)\\)|\\))", "i");
  const jsUrl = regex.exec(str);
  if (jsUrl?.[2]) {
    return {
      url: jsUrl[2],
      newWindow: jsUrl[1] === "app.launchURL" && jsUrl[3] === "true"
    };
  }
  return null;
}
function numberToString(value) {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  const roundedValue = Math.round(value * 100);
  if (roundedValue % 100 === 0) {
    return (roundedValue / 100).toString();
  }
  if (roundedValue % 10 === 0) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}
function getNewAnnotationsMap(annotationStorage) {
  if (!annotationStorage) {
    return null;
  }
  const newAnnotationsByPage = new Map();
  for (const [key, value] of annotationStorage) {
    if (!key.startsWith(AnnotationEditorPrefix)) {
      continue;
    }
    let annotations = newAnnotationsByPage.get(value.pageIndex);
    if (!annotations) {
      annotations = [];
      newAnnotationsByPage.set(value.pageIndex, annotations);
    }
    annotations.push(value);
  }
  return newAnnotationsByPage.size > 0 ? newAnnotationsByPage : null;
}
function stringToAsciiOrUTF16BE(str) {
  return isAscii(str) ? str : stringToUTF16String(str, true);
}
function isAscii(str) {
  return /^[\x00-\x7F]*$/.test(str);
}
function stringToUTF16HexString(str) {
  const buf = [];
  for (let i = 0, ii = str.length; i < ii; i++) {
    const char = str.charCodeAt(i);
    buf.push(hexNumbers[char >> 8 & 0xff], hexNumbers[char & 0xff]);
  }
  return buf.join("");
}
function stringToUTF16String(str, bigEndian = false) {
  const buf = [];
  if (bigEndian) {
    buf.push("\xFE\xFF");
  }
  for (let i = 0, ii = str.length; i < ii; i++) {
    const char = str.charCodeAt(i);
    buf.push(String.fromCharCode(char >> 8 & 0xff), String.fromCharCode(char & 0xff));
  }
  return buf.join("");
}
function getRotationMatrix(rotation, width, height) {
  switch (rotation) {
    case 90:
      return [0, 1, -1, 0, width, 0];
    case 180:
      return [-1, 0, 0, -1, width, height];
    case 270:
      return [0, -1, 1, 0, 0, height];
    default:
      throw new Error("Invalid rotation");
  }
}
function getSizeInBytes(x) {
  return Math.ceil(Math.ceil(Math.log2(1 + x)) / 8);
}

;// ./src/core/arithmetic_decoder.js
const QeTable = [{
  qe: 0x5601,
  nmps: 1,
  nlps: 1,
  switchFlag: 1
}, {
  qe: 0x3401,
  nmps: 2,
  nlps: 6,
  switchFlag: 0
}, {
  qe: 0x1801,
  nmps: 3,
  nlps: 9,
  switchFlag: 0
}, {
  qe: 0x0ac1,
  nmps: 4,
  nlps: 12,
  switchFlag: 0
}, {
  qe: 0x0521,
  nmps: 5,
  nlps: 29,
  switchFlag: 0
}, {
  qe: 0x0221,
  nmps: 38,
  nlps: 33,
  switchFlag: 0
}, {
  qe: 0x5601,
  nmps: 7,
  nlps: 6,
  switchFlag: 1
}, {
  qe: 0x5401,
  nmps: 8,
  nlps: 14,
  switchFlag: 0
}, {
  qe: 0x4801,
  nmps: 9,
  nlps: 14,
  switchFlag: 0
}, {
  qe: 0x3801,
  nmps: 10,
  nlps: 14,
  switchFlag: 0
}, {
  qe: 0x3001,
  nmps: 11,
  nlps: 17,
  switchFlag: 0
}, {
  qe: 0x2401,
  nmps: 12,
  nlps: 18,
  switchFlag: 0
}, {
  qe: 0x1c01,
  nmps: 13,
  nlps: 20,
  switchFlag: 0
}, {
  qe: 0x1601,
  nmps: 29,
  nlps: 21,
  switchFlag: 0
}, {
  qe: 0x5601,
  nmps: 15,
  nlps: 14,
  switchFlag: 1
}, {
  qe: 0x5401,
  nmps: 16,
  nlps: 14,
  switchFlag: 0
}, {
  qe: 0x5101,
  nmps: 17,
  nlps: 15,
  switchFlag: 0
}, {
  qe: 0x4801,
  nmps: 18,
  nlps: 16,
  switchFlag: 0
}, {
  qe: 0x3801,
  nmps: 19,
  nlps: 17,
  switchFlag: 0
}, {
  qe: 0x3401,
  nmps: 20,
  nlps: 18,
  switchFlag: 0
}, {
  qe: 0x3001,
  nmps: 21,
  nlps: 19,
  switchFlag: 0
}, {
  qe: 0x2801,
  nmps: 22,
  nlps: 19,
  switchFlag: 0
}, {
  qe: 0x2401,
  nmps: 23,
  nlps: 20,
  switchFlag: 0
}, {
  qe: 0x2201,
  nmps: 24,
  nlps: 21,
  switchFlag: 0
}, {
  qe: 0x1c01,
  nmps: 25,
  nlps: 22,
  switchFlag: 0
}, {
  qe: 0x1801,
  nmps: 26,
  nlps: 23,
  switchFlag: 0
}, {
  qe: 0x1601,
  nmps: 27,
  nlps: 24,
  switchFlag: 0
}, {
  qe: 0x1401,
  nmps: 28,
  nlps: 25,
  switchFlag: 0
}, {
  qe: 0x1201,
  nmps: 29,
  nlps: 26,
  switchFlag: 0
}, {
  qe: 0x1101,
  nmps: 30,
  nlps: 27,
  switchFlag: 0
}, {
  qe: 0x0ac1,
  nmps: 31,
  nlps: 28,
  switchFlag: 0
}, {
  qe: 0x09c1,
  nmps: 32,
  nlps: 29,
  switchFlag: 0
}, {
  qe: 0x08a1,
  nmps: 33,
  nlps: 30,
  switchFlag: 0
}, {
  qe: 0x0521,
  nmps: 34,
  nlps: 31,
  switchFlag: 0
}, {
  qe: 0x0441,
  nmps: 35,
  nlps: 32,
  switchFlag: 0
}, {
  qe: 0x02a1,
  nmps: 36,
  nlps: 33,
  switchFlag: 0
}, {
  qe: 0x0221,
  nmps: 37,
  nlps: 34,
  switchFlag: 0
}, {
  qe: 0x0141,
  nmps: 38,
  nlps: 35,
  switchFlag: 0
}, {
  qe: 0x0111,
  nmps: 39,
  nlps: 36,
  switchFlag: 0
}, {
  qe: 0x0085,
  nmps: 40,
  nlps: 37,
  switchFlag: 0
}, {
  qe: 0x0049,
  nmps: 41,
  nlps: 38,
  switchFlag: 0
}, {
  qe: 0x0025,
  nmps: 42,
  nlps: 39,
  switchFlag: 0
}, {
  qe: 0x0015,
  nmps: 43,
  nlps: 40,
  switchFlag: 0
}, {
  qe: 0x0009,
  nmps: 44,
  nlps: 41,
  switchFlag: 0
}, {
  qe: 0x0005,
  nmps: 45,
  nlps: 42,
  switchFlag: 0
}, {
  qe: 0x0001,
  nmps: 45,
  nlps: 43,
  switchFlag: 0
}, {
  qe: 0x5601,
  nmps: 46,
  nlps: 46,
  switchFlag: 0
}];
class ArithmeticDecoder {
  constructor(data, start, end) {
    this.data = data;
    this.bp = start;
    this.dataEnd = end;
    this.chigh = data[start];
    this.clow = 0;
    this.byteIn();
    this.chigh = this.chigh << 7 & 0xffff | this.clow >> 9 & 0x7f;
    this.clow = this.clow << 7 & 0xffff;
    this.ct -= 7;
    this.a = 0x8000;
  }
  byteIn() {
    const data = this.data;
    let bp = this.bp;
    if (data[bp] === 0xff) {
      if (data[bp + 1] > 0x8f) {
        this.clow += 0xff00;
        this.ct = 8;
      } else {
        bp++;
        this.clow += data[bp] << 9;
        this.ct = 7;
        this.bp = bp;
      }
    } else {
      bp++;
      this.clow += bp < this.dataEnd ? data[bp] << 8 : 0xff00;
      this.ct = 8;
      this.bp = bp;
    }
    if (this.clow > 0xffff) {
      this.chigh += this.clow >> 16;
      this.clow &= 0xffff;
    }
  }
  readBit(contexts, pos) {
    let cx_index = contexts[pos] >> 1,
      cx_mps = contexts[pos] & 1;
    const qeTableIcx = QeTable[cx_index];
    const qeIcx = qeTableIcx.qe;
    let d;
    let a = this.a - qeIcx;
    if (this.chigh < qeIcx) {
      if (a < qeIcx) {
        a = qeIcx;
        d = cx_mps;
        cx_index = qeTableIcx.nmps;
      } else {
        a = qeIcx;
        d = 1 ^ cx_mps;
        if (qeTableIcx.switchFlag === 1) {
          cx_mps = d;
        }
        cx_index = qeTableIcx.nlps;
      }
    } else {
      this.chigh -= qeIcx;
      if ((a & 0x8000) !== 0) {
        this.a = a;
        return cx_mps;
      }
      if (a < qeIcx) {
        d = 1 ^ cx_mps;
        if (qeTableIcx.switchFlag === 1) {
          cx_mps = d;
        }
        cx_index = qeTableIcx.nlps;
      } else {
        d = cx_mps;
        cx_index = qeTableIcx.nmps;
      }
    }
    do {
      if (this.ct === 0) {
        this.byteIn();
      }
      a <<= 1;
      this.chigh = this.chigh << 1 & 0xffff | this.clow >> 15 & 1;
      this.clow = this.clow << 1 & 0xffff;
      this.ct--;
    } while ((a & 0x8000) === 0);
    this.a = a;
    contexts[pos] = cx_index << 1 | cx_mps;
    return d;
  }
}

;// ./src/core/ccitt.js

const ccittEOL = -2;
const ccittEOF = -1;
const twoDimPass = 0;
const twoDimHoriz = 1;
const twoDimVert0 = 2;
const twoDimVertR1 = 3;
const twoDimVertL1 = 4;
const twoDimVertR2 = 5;
const twoDimVertL2 = 6;
const twoDimVertR3 = 7;
const twoDimVertL3 = 8;
const twoDimTable = [[-1, -1], [-1, -1], [7, twoDimVertL3], [7, twoDimVertR3], [6, twoDimVertL2], [6, twoDimVertL2], [6, twoDimVertR2], [6, twoDimVertR2], [4, twoDimPass], [4, twoDimPass], [4, twoDimPass], [4, twoDimPass], [4, twoDimPass], [4, twoDimPass], [4, twoDimPass], [4, twoDimPass], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimHoriz], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertL1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [3, twoDimVertR1], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0], [1, twoDimVert0]];
const whiteTable1 = [[-1, -1], [12, ccittEOL], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [11, 1792], [11, 1792], [12, 1984], [12, 2048], [12, 2112], [12, 2176], [12, 2240], [12, 2304], [11, 1856], [11, 1856], [11, 1920], [11, 1920], [12, 2368], [12, 2432], [12, 2496], [12, 2560]];
const whiteTable2 = [[-1, -1], [-1, -1], [-1, -1], [-1, -1], [8, 29], [8, 29], [8, 30], [8, 30], [8, 45], [8, 45], [8, 46], [8, 46], [7, 22], [7, 22], [7, 22], [7, 22], [7, 23], [7, 23], [7, 23], [7, 23], [8, 47], [8, 47], [8, 48], [8, 48], [6, 13], [6, 13], [6, 13], [6, 13], [6, 13], [6, 13], [6, 13], [6, 13], [7, 20], [7, 20], [7, 20], [7, 20], [8, 33], [8, 33], [8, 34], [8, 34], [8, 35], [8, 35], [8, 36], [8, 36], [8, 37], [8, 37], [8, 38], [8, 38], [7, 19], [7, 19], [7, 19], [7, 19], [8, 31], [8, 31], [8, 32], [8, 32], [6, 1], [6, 1], [6, 1], [6, 1], [6, 1], [6, 1], [6, 1], [6, 1], [6, 12], [6, 12], [6, 12], [6, 12], [6, 12], [6, 12], [6, 12], [6, 12], [8, 53], [8, 53], [8, 54], [8, 54], [7, 26], [7, 26], [7, 26], [7, 26], [8, 39], [8, 39], [8, 40], [8, 40], [8, 41], [8, 41], [8, 42], [8, 42], [8, 43], [8, 43], [8, 44], [8, 44], [7, 21], [7, 21], [7, 21], [7, 21], [7, 28], [7, 28], [7, 28], [7, 28], [8, 61], [8, 61], [8, 62], [8, 62], [8, 63], [8, 63], [8, 0], [8, 0], [8, 320], [8, 320], [8, 384], [8, 384], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 10], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [5, 11], [7, 27], [7, 27], [7, 27], [7, 27], [8, 59], [8, 59], [8, 60], [8, 60], [9, 1472], [9, 1536], [9, 1600], [9, 1728], [7, 18], [7, 18], [7, 18], [7, 18], [7, 24], [7, 24], [7, 24], [7, 24], [8, 49], [8, 49], [8, 50], [8, 50], [8, 51], [8, 51], [8, 52], [8, 52], [7, 25], [7, 25], [7, 25], [7, 25], [8, 55], [8, 55], [8, 56], [8, 56], [8, 57], [8, 57], [8, 58], [8, 58], [6, 192], [6, 192], [6, 192], [6, 192], [6, 192], [6, 192], [6, 192], [6, 192], [6, 1664], [6, 1664], [6, 1664], [6, 1664], [6, 1664], [6, 1664], [6, 1664], [6, 1664], [8, 448], [8, 448], [8, 512], [8, 512], [9, 704], [9, 768], [8, 640], [8, 640], [8, 576], [8, 576], [9, 832], [9, 896], [9, 960], [9, 1024], [9, 1088], [9, 1152], [9, 1216], [9, 1280], [9, 1344], [9, 1408], [7, 256], [7, 256], [7, 256], [7, 256], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [4, 3], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 128], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 8], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [5, 9], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [6, 14], [6, 14], [6, 14], [6, 14], [6, 14], [6, 14], [6, 14], [6, 14], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [5, 64], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7], [4, 7]];
const blackTable1 = [[-1, -1], [-1, -1], [12, ccittEOL], [12, ccittEOL], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1], [11, 1792], [11, 1792], [11, 1792], [11, 1792], [12, 1984], [12, 1984], [12, 2048], [12, 2048], [12, 2112], [12, 2112], [12, 2176], [12, 2176], [12, 2240], [12, 2240], [12, 2304], [12, 2304], [11, 1856], [11, 1856], [11, 1856], [11, 1856], [11, 1920], [11, 1920], [11, 1920], [11, 1920], [12, 2368], [12, 2368], [12, 2432], [12, 2432], [12, 2496], [12, 2496], [12, 2560], [12, 2560], [10, 18], [10, 18], [10, 18], [10, 18], [10, 18], [10, 18], [10, 18], [10, 18], [12, 52], [12, 52], [13, 640], [13, 704], [13, 768], [13, 832], [12, 55], [12, 55], [12, 56], [12, 56], [13, 1280], [13, 1344], [13, 1408], [13, 1472], [12, 59], [12, 59], [12, 60], [12, 60], [13, 1536], [13, 1600], [11, 24], [11, 24], [11, 24], [11, 24], [11, 25], [11, 25], [11, 25], [11, 25], [13, 1664], [13, 1728], [12, 320], [12, 320], [12, 384], [12, 384], [12, 448], [12, 448], [13, 512], [13, 576], [12, 53], [12, 53], [12, 54], [12, 54], [13, 896], [13, 960], [13, 1024], [13, 1088], [13, 1152], [13, 1216], [10, 64], [10, 64], [10, 64], [10, 64], [10, 64], [10, 64], [10, 64], [10, 64]];
const blackTable2 = [[8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [8, 13], [11, 23], [11, 23], [12, 50], [12, 51], [12, 44], [12, 45], [12, 46], [12, 47], [12, 57], [12, 58], [12, 61], [12, 256], [10, 16], [10, 16], [10, 16], [10, 16], [10, 17], [10, 17], [10, 17], [10, 17], [12, 48], [12, 49], [12, 62], [12, 63], [12, 30], [12, 31], [12, 32], [12, 33], [12, 40], [12, 41], [11, 22], [11, 22], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [8, 14], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [7, 11], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15], [12, 128], [12, 192], [12, 26], [12, 27], [12, 28], [12, 29], [11, 19], [11, 19], [11, 20], [11, 20], [12, 34], [12, 35], [12, 36], [12, 37], [12, 38], [12, 39], [11, 21], [11, 21], [12, 42], [12, 43], [10, 0], [10, 0], [10, 0], [10, 0], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12], [7, 12]];
const blackTable3 = [[-1, -1], [-1, -1], [-1, -1], [-1, -1], [6, 9], [6, 8], [5, 7], [5, 7], [4, 6], [4, 6], [4, 6], [4, 6], [4, 5], [4, 5], [4, 5], [4, 5], [3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [3, 4], [3, 4], [3, 4], [3, 4], [3, 4], [3, 4], [3, 4], [3, 4], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2]];
class CCITTFaxDecoder {
  constructor(source, options = {}) {
    if (typeof source?.next !== "function") {
      throw new Error('CCITTFaxDecoder - invalid "source" parameter.');
    }
    this.source = source;
    this.eof = false;
    this.encoding = options.K || 0;
    this.eoline = options.EndOfLine || false;
    this.byteAlign = options.EncodedByteAlign || false;
    this.columns = options.Columns || 1728;
    this.rows = options.Rows || 0;
    this.eoblock = options.EndOfBlock ?? true;
    this.black = options.BlackIs1 || false;
    this.codingLine = new Uint32Array(this.columns + 1);
    this.refLine = new Uint32Array(this.columns + 2);
    this.codingLine[0] = this.columns;
    this.codingPos = 0;
    this.row = 0;
    this.nextLine2D = this.encoding < 0;
    this.inputBits = 0;
    this.inputBuf = 0;
    this.outputBits = 0;
    this.rowsDone = false;
    let code1;
    while ((code1 = this._lookBits(12)) === 0) {
      this._eatBits(1);
    }
    if (code1 === 1) {
      this._eatBits(12);
    }
    if (this.encoding > 0) {
      this.nextLine2D = !this._lookBits(1);
      this._eatBits(1);
    }
  }
  readNextChar() {
    if (this.eof) {
      return -1;
    }
    const refLine = this.refLine;
    const codingLine = this.codingLine;
    const columns = this.columns;
    let refPos, blackPixels, bits, i;
    if (this.outputBits === 0) {
      if (this.rowsDone) {
        this.eof = true;
      }
      if (this.eof) {
        return -1;
      }
      this.err = false;
      let code1, code2, code3;
      if (this.nextLine2D) {
        for (i = 0; codingLine[i] < columns; ++i) {
          refLine[i] = codingLine[i];
        }
        refLine[i++] = columns;
        refLine[i] = columns;
        codingLine[0] = 0;
        this.codingPos = 0;
        refPos = 0;
        blackPixels = 0;
        while (codingLine[this.codingPos] < columns) {
          code1 = this._getTwoDimCode();
          switch (code1) {
            case twoDimPass:
              this._addPixels(refLine[refPos + 1], blackPixels);
              if (refLine[refPos + 1] < columns) {
                refPos += 2;
              }
              break;
            case twoDimHoriz:
              code1 = code2 = 0;
              if (blackPixels) {
                do {
                  code1 += code3 = this._getBlackCode();
                } while (code3 >= 64);
                do {
                  code2 += code3 = this._getWhiteCode();
                } while (code3 >= 64);
              } else {
                do {
                  code1 += code3 = this._getWhiteCode();
                } while (code3 >= 64);
                do {
                  code2 += code3 = this._getBlackCode();
                } while (code3 >= 64);
              }
              this._addPixels(codingLine[this.codingPos] + code1, blackPixels);
              if (codingLine[this.codingPos] < columns) {
                this._addPixels(codingLine[this.codingPos] + code2, blackPixels ^ 1);
              }
              while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                refPos += 2;
              }
              break;
            case twoDimVertR3:
              this._addPixels(refLine[refPos] + 3, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertR2:
              this._addPixels(refLine[refPos] + 2, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertR1:
              this._addPixels(refLine[refPos] + 1, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVert0:
              this._addPixels(refLine[refPos], blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL3:
              this._addPixelsNeg(refLine[refPos] - 3, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL2:
              this._addPixelsNeg(refLine[refPos] - 2, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL1:
              this._addPixelsNeg(refLine[refPos] - 1, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (refLine[refPos] <= codingLine[this.codingPos] && refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case ccittEOF:
              this._addPixels(columns, 0);
              this.eof = true;
              break;
            default:
              info("bad 2d code");
              this._addPixels(columns, 0);
              this.err = true;
          }
        }
      } else {
        codingLine[0] = 0;
        this.codingPos = 0;
        blackPixels = 0;
        while (codingLine[this.codingPos] < columns) {
          code1 = 0;
          if (blackPixels) {
            do {
              code1 += code3 = this._getBlackCode();
            } while (code3 >= 64);
          } else {
            do {
              code1 += code3 = this._getWhiteCode();
            } while (code3 >= 64);
          }
          this._addPixels(codingLine[this.codingPos] + code1, blackPixels);
          blackPixels ^= 1;
        }
      }
      let gotEOL = false;
      if (this.byteAlign) {
        this.inputBits &= ~7;
      }
      if (!this.eoblock && this.row === this.rows - 1) {
        this.rowsDone = true;
      } else {
        code1 = this._lookBits(12);
        if (this.eoline) {
          while (code1 !== ccittEOF && code1 !== 1) {
            this._eatBits(1);
            code1 = this._lookBits(12);
          }
        } else {
          while (code1 === 0) {
            this._eatBits(1);
            code1 = this._lookBits(12);
          }
        }
        if (code1 === 1) {
          this._eatBits(12);
          gotEOL = true;
        } else if (code1 === ccittEOF) {
          this.eof = true;
        }
      }
      if (!this.eof && this.encoding > 0 && !this.rowsDone) {
        this.nextLine2D = !this._lookBits(1);
        this._eatBits(1);
      }
      if (this.eoblock && gotEOL && this.byteAlign) {
        code1 = this._lookBits(12);
        if (code1 === 1) {
          this._eatBits(12);
          if (this.encoding > 0) {
            this._lookBits(1);
            this._eatBits(1);
          }
          if (this.encoding >= 0) {
            for (i = 0; i < 4; ++i) {
              code1 = this._lookBits(12);
              if (code1 !== 1) {
                info("bad rtc code: " + code1);
              }
              this._eatBits(12);
              if (this.encoding > 0) {
                this._lookBits(1);
                this._eatBits(1);
              }
            }
          }
          this.eof = true;
        }
      } else if (this.err && this.eoline) {
        while (true) {
          code1 = this._lookBits(13);
          if (code1 === ccittEOF) {
            this.eof = true;
            return -1;
          }
          if (code1 >> 1 === 1) {
            break;
          }
          this._eatBits(1);
        }
        this._eatBits(12);
        if (this.encoding > 0) {
          this._eatBits(1);
          this.nextLine2D = !(code1 & 1);
        }
      }
      this.outputBits = codingLine[0] > 0 ? codingLine[this.codingPos = 0] : codingLine[this.codingPos = 1];
      this.row++;
    }
    let c;
    if (this.outputBits >= 8) {
      c = this.codingPos & 1 ? 0 : 0xff;
      this.outputBits -= 8;
      if (this.outputBits === 0 && codingLine[this.codingPos] < columns) {
        this.codingPos++;
        this.outputBits = codingLine[this.codingPos] - codingLine[this.codingPos - 1];
      }
    } else {
      bits = 8;
      c = 0;
      do {
        if (typeof this.outputBits !== "number") {
          throw new FormatError('Invalid /CCITTFaxDecode data, "outputBits" must be a number.');
        }
        if (this.outputBits > bits) {
          c <<= bits;
          if (!(this.codingPos & 1)) {
            c |= 0xff >> 8 - bits;
          }
          this.outputBits -= bits;
          bits = 0;
        } else {
          c <<= this.outputBits;
          if (!(this.codingPos & 1)) {
            c |= 0xff >> 8 - this.outputBits;
          }
          bits -= this.outputBits;
          this.outputBits = 0;
          if (codingLine[this.codingPos] < columns) {
            this.codingPos++;
            this.outputBits = codingLine[this.codingPos] - codingLine[this.codingPos - 1];
          } else if (bits > 0) {
            c <<= bits;
            bits = 0;
          }
        }
      } while (bits);
    }
    if (this.black) {
      c ^= 0xff;
    }
    return c;
  }
  _addPixels(a1, blackPixels) {
    const codingLine = this.codingLine;
    let codingPos = this.codingPos;
    if (a1 > codingLine[codingPos]) {
      if (a1 > this.columns) {
        info("row is wrong length");
        this.err = true;
        a1 = this.columns;
      }
      if (codingPos & 1 ^ blackPixels) {
        ++codingPos;
      }
      codingLine[codingPos] = a1;
    }
    this.codingPos = codingPos;
  }
  _addPixelsNeg(a1, blackPixels) {
    const codingLine = this.codingLine;
    let codingPos = this.codingPos;
    if (a1 > codingLine[codingPos]) {
      if (a1 > this.columns) {
        info("row is wrong length");
        this.err = true;
        a1 = this.columns;
      }
      if (codingPos & 1 ^ blackPixels) {
        ++codingPos;
      }
      codingLine[codingPos] = a1;
    } else if (a1 < codingLine[codingPos]) {
      if (a1 < 0) {
        info("invalid code");
        this.err = true;
        a1 = 0;
      }
      while (codingPos > 0 && a1 < codingLine[codingPos - 1]) {
        --codingPos;
      }
      codingLine[codingPos] = a1;
    }
    this.codingPos = codingPos;
  }
  _findTableCode(start, end, table, limit) {
    const limitValue = limit || 0;
    for (let i = start; i <= end; ++i) {
      let code = this._lookBits(i);
      if (code === ccittEOF) {
        return [true, 1, false];
      }
      if (i < end) {
        code <<= end - i;
      }
      if (!limitValue || code >= limitValue) {
        const p = table[code - limitValue];
        if (p[0] === i) {
          this._eatBits(i);
          return [true, p[1], true];
        }
      }
    }
    return [false, 0, false];
  }
  _getTwoDimCode() {
    let code = 0;
    let p;
    if (this.eoblock) {
      code = this._lookBits(7);
      p = twoDimTable[code];
      if (p?.[0] > 0) {
        this._eatBits(p[0]);
        return p[1];
      }
    } else {
      const result = this._findTableCode(1, 7, twoDimTable);
      if (result[0] && result[2]) {
        return result[1];
      }
    }
    info("Bad two dim code");
    return ccittEOF;
  }
  _getWhiteCode() {
    let code = 0;
    let p;
    if (this.eoblock) {
      code = this._lookBits(12);
      if (code === ccittEOF) {
        return 1;
      }
      p = code >> 5 === 0 ? whiteTable1[code] : whiteTable2[code >> 3];
      if (p[0] > 0) {
        this._eatBits(p[0]);
        return p[1];
      }
    } else {
      let result = this._findTableCode(1, 9, whiteTable2);
      if (result[0]) {
        return result[1];
      }
      result = this._findTableCode(11, 12, whiteTable1);
      if (result[0]) {
        return result[1];
      }
    }
    info("bad white code");
    this._eatBits(1);
    return 1;
  }
  _getBlackCode() {
    let code, p;
    if (this.eoblock) {
      code = this._lookBits(13);
      if (code === ccittEOF) {
        return 1;
      }
      if (code >> 7 === 0) {
        p = blackTable1[code];
      } else if (code >> 9 === 0 && code >> 7 !== 0) {
        p = blackTable2[(code >> 1) - 64];
      } else {
        p = blackTable3[code >> 7];
      }
      if (p[0] > 0) {
        this._eatBits(p[0]);
        return p[1];
      }
    } else {
      let result = this._findTableCode(2, 6, blackTable3);
      if (result[0]) {
        return result[1];
      }
      result = this._findTableCode(7, 12, blackTable2, 64);
      if (result[0]) {
        return result[1];
      }
      result = this._findTableCode(10, 13, blackTable1);
      if (result[0]) {
        return result[1];
      }
    }
    info("bad black code");
    this._eatBits(1);
    return 1;
  }
  _lookBits(n) {
    let c;
    while (this.inputBits < n) {
      if ((c = this.source.next()) === -1) {
        if (this.inputBits === 0) {
          return ccittEOF;
        }
        return this.inputBuf << n - this.inputBits & 0xffff >> 16 - n;
      }
      this.inputBuf = this.inputBuf << 8 | c;
      this.inputBits += 8;
    }
    return this.inputBuf >> this.inputBits - n & 0xffff >> 16 - n;
  }
  _eatBits(n) {
    if ((this.inputBits -= n) < 0) {
      this.inputBits = 0;
    }
  }
}

;// ./src/core/jbig2.js




class Jbig2Error extends BaseException {
  constructor(msg) {
    super(msg, "Jbig2Error");
  }
}
class ContextCache {
  getContexts(id) {
    if (id in this) {
      return this[id];
    }
    return this[id] = new Int8Array(1 << 16);
  }
}
class DecodingContext {
  constructor(data, start, end) {
    this.data = data;
    this.start = start;
    this.end = end;
  }
  get decoder() {
    const decoder = new ArithmeticDecoder(this.data, this.start, this.end);
    return shadow(this, "decoder", decoder);
  }
  get contextCache() {
    const cache = new ContextCache();
    return shadow(this, "contextCache", cache);
  }
}
function decodeInteger(contextCache, procedure, decoder) {
  const contexts = contextCache.getContexts(procedure);
  let prev = 1;
  function readBits(length) {
    let v = 0;
    for (let i = 0; i < length; i++) {
      const bit = decoder.readBit(contexts, prev);
      prev = prev < 256 ? prev << 1 | bit : (prev << 1 | bit) & 511 | 256;
      v = v << 1 | bit;
    }
    return v >>> 0;
  }
  const sign = readBits(1);
  const value = readBits(1) ? readBits(1) ? readBits(1) ? readBits(1) ? readBits(1) ? readBits(32) + 4436 : readBits(12) + 340 : readBits(8) + 84 : readBits(6) + 20 : readBits(4) + 4 : readBits(2);
  let signedValue;
  if (sign === 0) {
    signedValue = value;
  } else if (value > 0) {
    signedValue = -value;
  }
  if (signedValue >= MIN_INT_32 && signedValue <= MAX_INT_32) {
    return signedValue;
  }
  return null;
}
function decodeIAID(contextCache, decoder, codeLength) {
  const contexts = contextCache.getContexts("IAID");
  let prev = 1;
  for (let i = 0; i < codeLength; i++) {
    const bit = decoder.readBit(contexts, prev);
    prev = prev << 1 | bit;
  }
  if (codeLength < 31) {
    return prev & (1 << codeLength) - 1;
  }
  return prev & 0x7fffffff;
}
const SegmentTypes = ["SymbolDictionary", null, null, null, "IntermediateTextRegion", null, "ImmediateTextRegion", "ImmediateLosslessTextRegion", null, null, null, null, null, null, null, null, "PatternDictionary", null, null, null, "IntermediateHalftoneRegion", null, "ImmediateHalftoneRegion", "ImmediateLosslessHalftoneRegion", null, null, null, null, null, null, null, null, null, null, null, null, "IntermediateGenericRegion", null, "ImmediateGenericRegion", "ImmediateLosslessGenericRegion", "IntermediateGenericRefinementRegion", null, "ImmediateGenericRefinementRegion", "ImmediateLosslessGenericRefinementRegion", null, null, null, null, "PageInformation", "EndOfPage", "EndOfStripe", "EndOfFile", "Profiles", "Tables", null, null, null, null, null, null, null, null, "Extension"];
const CodingTemplates = [[{
  x: -1,
  y: -2
}, {
  x: 0,
  y: -2
}, {
  x: 1,
  y: -2
}, {
  x: -2,
  y: -1
}, {
  x: -1,
  y: -1
}, {
  x: 0,
  y: -1
}, {
  x: 1,
  y: -1
}, {
  x: 2,
  y: -1
}, {
  x: -4,
  y: 0
}, {
  x: -3,
  y: 0
}, {
  x: -2,
  y: 0
}, {
  x: -1,
  y: 0
}], [{
  x: -1,
  y: -2
}, {
  x: 0,
  y: -2
}, {
  x: 1,
  y: -2
}, {
  x: 2,
  y: -2
}, {
  x: -2,
  y: -1
}, {
  x: -1,
  y: -1
}, {
  x: 0,
  y: -1
}, {
  x: 1,
  y: -1
}, {
  x: 2,
  y: -1
}, {
  x: -3,
  y: 0
}, {
  x: -2,
  y: 0
}, {
  x: -1,
  y: 0
}], [{
  x: -1,
  y: -2
}, {
  x: 0,
  y: -2
}, {
  x: 1,
  y: -2
}, {
  x: -2,
  y: -1
}, {
  x: -1,
  y: -1
}, {
  x: 0,
  y: -1
}, {
  x: 1,
  y: -1
}, {
  x: -2,
  y: 0
}, {
  x: -1,
  y: 0
}], [{
  x: -3,
  y: -1
}, {
  x: -2,
  y: -1
}, {
  x: -1,
  y: -1
}, {
  x: 0,
  y: -1
}, {
  x: 1,
  y: -1
}, {
  x: -4,
  y: 0
}, {
  x: -3,
  y: 0
}, {
  x: -2,
  y: 0
}, {
  x: -1,
  y: 0
}]];
const RefinementTemplates = [{
  coding: [{
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: -1,
    y: 0
  }],
  reference: [{
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: -1,
    y: 0
  }, {
    x: 0,
    y: 0
  }, {
    x: 1,
    y: 0
  }, {
    x: -1,
    y: 1
  }, {
    x: 0,
    y: 1
  }, {
    x: 1,
    y: 1
  }]
}, {
  coding: [{
    x: -1,
    y: -1
  }, {
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: -1,
    y: 0
  }],
  reference: [{
    x: 0,
    y: -1
  }, {
    x: -1,
    y: 0
  }, {
    x: 0,
    y: 0
  }, {
    x: 1,
    y: 0
  }, {
    x: 0,
    y: 1
  }, {
    x: 1,
    y: 1
  }]
}];
const ReusedContexts = [0x9b25, 0x0795, 0x00e5, 0x0195];
const RefinementReusedContexts = [0x0020, 0x0008];
function decodeBitmapTemplate0(width, height, decodingContext) {
  const decoder = decodingContext.decoder;
  const contexts = decodingContext.contextCache.getContexts("GB");
  const bitmap = [];
  let contextLabel, i, j, pixel, row, row1, row2;
  const OLD_PIXEL_MASK = 0x7bf7;
  for (i = 0; i < height; i++) {
    row = bitmap[i] = new Uint8Array(width);
    row1 = i < 1 ? row : bitmap[i - 1];
    row2 = i < 2 ? row : bitmap[i - 2];
    contextLabel = row2[0] << 13 | row2[1] << 12 | row2[2] << 11 | row1[0] << 7 | row1[1] << 6 | row1[2] << 5 | row1[3] << 4;
    for (j = 0; j < width; j++) {
      row[j] = pixel = decoder.readBit(contexts, contextLabel);
      contextLabel = (contextLabel & OLD_PIXEL_MASK) << 1 | (j + 3 < width ? row2[j + 3] << 11 : 0) | (j + 4 < width ? row1[j + 4] << 4 : 0) | pixel;
    }
  }
  return bitmap;
}
function decodeBitmap(mmr, width, height, templateIndex, prediction, skip, at, decodingContext) {
  if (mmr) {
    const input = new Reader(decodingContext.data, decodingContext.start, decodingContext.end);
    return decodeMMRBitmap(input, width, height, false);
  }
  if (templateIndex === 0 && !skip && !prediction && at.length === 4 && at[0].x === 3 && at[0].y === -1 && at[1].x === -3 && at[1].y === -1 && at[2].x === 2 && at[2].y === -2 && at[3].x === -2 && at[3].y === -2) {
    return decodeBitmapTemplate0(width, height, decodingContext);
  }
  const useskip = !!skip;
  const template = CodingTemplates[templateIndex].concat(at);
  template.sort((a, b) => a.y - b.y || a.x - b.x);
  const templateLength = template.length;
  const templateX = new Int8Array(templateLength);
  const templateY = new Int8Array(templateLength);
  const changingTemplateEntries = [];
  let reuseMask = 0,
    minX = 0,
    maxX = 0,
    minY = 0;
  let c, k;
  for (k = 0; k < templateLength; k++) {
    templateX[k] = template[k].x;
    templateY[k] = template[k].y;
    minX = Math.min(minX, template[k].x);
    maxX = Math.max(maxX, template[k].x);
    minY = Math.min(minY, template[k].y);
    if (k < templateLength - 1 && template[k].y === template[k + 1].y && template[k].x === template[k + 1].x - 1) {
      reuseMask |= 1 << templateLength - 1 - k;
    } else {
      changingTemplateEntries.push(k);
    }
  }
  const changingEntriesLength = changingTemplateEntries.length;
  const changingTemplateX = new Int8Array(changingEntriesLength);
  const changingTemplateY = new Int8Array(changingEntriesLength);
  const changingTemplateBit = new Uint16Array(changingEntriesLength);
  for (c = 0; c < changingEntriesLength; c++) {
    k = changingTemplateEntries[c];
    changingTemplateX[c] = template[k].x;
    changingTemplateY[c] = template[k].y;
    changingTemplateBit[c] = 1 << templateLength - 1 - k;
  }
  const sbb_left = -minX;
  const sbb_top = -minY;
  const sbb_right = width - maxX;
  const pseudoPixelContext = ReusedContexts[templateIndex];
  let row = new Uint8Array(width);
  const bitmap = [];
  const decoder = decodingContext.decoder;
  const contexts = decodingContext.contextCache.getContexts("GB");
  let ltp = 0,
    j,
    i0,
    j0,
    contextLabel = 0,
    bit,
    shift;
  for (let i = 0; i < height; i++) {
    if (prediction) {
      const sltp = decoder.readBit(contexts, pseudoPixelContext);
      ltp ^= sltp;
      if (ltp) {
        bitmap.push(row);
        continue;
      }
    }
    row = new Uint8Array(row);
    bitmap.push(row);
    for (j = 0; j < width; j++) {
      if (useskip && skip[i][j]) {
        row[j] = 0;
        continue;
      }
      if (j >= sbb_left && j < sbb_right && i >= sbb_top) {
        contextLabel = contextLabel << 1 & reuseMask;
        for (k = 0; k < changingEntriesLength; k++) {
          i0 = i + changingTemplateY[k];
          j0 = j + changingTemplateX[k];
          bit = bitmap[i0][j0];
          if (bit) {
            bit = changingTemplateBit[k];
            contextLabel |= bit;
          }
        }
      } else {
        contextLabel = 0;
        shift = templateLength - 1;
        for (k = 0; k < templateLength; k++, shift--) {
          j0 = j + templateX[k];
          if (j0 >= 0 && j0 < width) {
            i0 = i + templateY[k];
            if (i0 >= 0) {
              bit = bitmap[i0][j0];
              if (bit) {
                contextLabel |= bit << shift;
              }
            }
          }
        }
      }
      const pixel = decoder.readBit(contexts, contextLabel);
      row[j] = pixel;
    }
  }
  return bitmap;
}
function decodeRefinement(width, height, templateIndex, referenceBitmap, offsetX, offsetY, prediction, at, decodingContext) {
  let codingTemplate = RefinementTemplates[templateIndex].coding;
  if (templateIndex === 0) {
    codingTemplate = codingTemplate.concat([at[0]]);
  }
  const codingTemplateLength = codingTemplate.length;
  const codingTemplateX = new Int32Array(codingTemplateLength);
  const codingTemplateY = new Int32Array(codingTemplateLength);
  let k;
  for (k = 0; k < codingTemplateLength; k++) {
    codingTemplateX[k] = codingTemplate[k].x;
    codingTemplateY[k] = codingTemplate[k].y;
  }
  let referenceTemplate = RefinementTemplates[templateIndex].reference;
  if (templateIndex === 0) {
    referenceTemplate = referenceTemplate.concat([at[1]]);
  }
  const referenceTemplateLength = referenceTemplate.length;
  const referenceTemplateX = new Int32Array(referenceTemplateLength);
  const referenceTemplateY = new Int32Array(referenceTemplateLength);
  for (k = 0; k < referenceTemplateLength; k++) {
    referenceTemplateX[k] = referenceTemplate[k].x;
    referenceTemplateY[k] = referenceTemplate[k].y;
  }
  const referenceWidth = referenceBitmap[0].length;
  const referenceHeight = referenceBitmap.length;
  const pseudoPixelContext = RefinementReusedContexts[templateIndex];
  const bitmap = [];
  const decoder = decodingContext.decoder;
  const contexts = decodingContext.contextCache.getContexts("GR");
  let ltp = 0;
  for (let i = 0; i < height; i++) {
    if (prediction) {
      const sltp = decoder.readBit(contexts, pseudoPixelContext);
      ltp ^= sltp;
      if (ltp) {
        throw new Jbig2Error("prediction is not supported");
      }
    }
    const row = new Uint8Array(width);
    bitmap.push(row);
    for (let j = 0; j < width; j++) {
      let i0, j0;
      let contextLabel = 0;
      for (k = 0; k < codingTemplateLength; k++) {
        i0 = i + codingTemplateY[k];
        j0 = j + codingTemplateX[k];
        if (i0 < 0 || j0 < 0 || j0 >= width) {
          contextLabel <<= 1;
        } else {
          contextLabel = contextLabel << 1 | bitmap[i0][j0];
        }
      }
      for (k = 0; k < referenceTemplateLength; k++) {
        i0 = i + referenceTemplateY[k] - offsetY;
        j0 = j + referenceTemplateX[k] - offsetX;
        if (i0 < 0 || i0 >= referenceHeight || j0 < 0 || j0 >= referenceWidth) {
          contextLabel <<= 1;
        } else {
          contextLabel = contextLabel << 1 | referenceBitmap[i0][j0];
        }
      }
      const pixel = decoder.readBit(contexts, contextLabel);
      row[j] = pixel;
    }
  }
  return bitmap;
}
function decodeSymbolDictionary(huffman, refinement, symbols, numberOfNewSymbols, numberOfExportedSymbols, huffmanTables, templateIndex, at, refinementTemplateIndex, refinementAt, decodingContext, huffmanInput) {
  if (huffman && refinement) {
    throw new Jbig2Error("symbol refinement with Huffman is not supported");
  }
  const newSymbols = [];
  let currentHeight = 0;
  let symbolCodeLength = log2(symbols.length + numberOfNewSymbols);
  const decoder = decodingContext.decoder;
  const contextCache = decodingContext.contextCache;
  let tableB1, symbolWidths;
  if (huffman) {
    tableB1 = getStandardTable(1);
    symbolWidths = [];
    symbolCodeLength = Math.max(symbolCodeLength, 1);
  }
  while (newSymbols.length < numberOfNewSymbols) {
    const deltaHeight = huffman ? huffmanTables.tableDeltaHeight.decode(huffmanInput) : decodeInteger(contextCache, "IADH", decoder);
    currentHeight += deltaHeight;
    let currentWidth = 0,
      totalWidth = 0;
    const firstSymbol = huffman ? symbolWidths.length : 0;
    while (true) {
      const deltaWidth = huffman ? huffmanTables.tableDeltaWidth.decode(huffmanInput) : decodeInteger(contextCache, "IADW", decoder);
      if (deltaWidth === null) {
        break;
      }
      currentWidth += deltaWidth;
      totalWidth += currentWidth;
      let bitmap;
      if (refinement) {
        const numberOfInstances = decodeInteger(contextCache, "IAAI", decoder);
        if (numberOfInstances > 1) {
          bitmap = decodeTextRegion(huffman, refinement, currentWidth, currentHeight, 0, numberOfInstances, 1, symbols.concat(newSymbols), symbolCodeLength, 0, 0, 1, 0, huffmanTables, refinementTemplateIndex, refinementAt, decodingContext, 0, huffmanInput);
        } else {
          const symbolId = decodeIAID(contextCache, decoder, symbolCodeLength);
          const rdx = decodeInteger(contextCache, "IARDX", decoder);
          const rdy = decodeInteger(contextCache, "IARDY", decoder);
          const symbol = symbolId < symbols.length ? symbols[symbolId] : newSymbols[symbolId - symbols.length];
          bitmap = decodeRefinement(currentWidth, currentHeight, refinementTemplateIndex, symbol, rdx, rdy, false, refinementAt, decodingContext);
        }
        newSymbols.push(bitmap);
      } else if (huffman) {
        symbolWidths.push(currentWidth);
      } else {
        bitmap = decodeBitmap(false, currentWidth, currentHeight, templateIndex, false, null, at, decodingContext);
        newSymbols.push(bitmap);
      }
    }
    if (huffman && !refinement) {
      const bitmapSize = huffmanTables.tableBitmapSize.decode(huffmanInput);
      huffmanInput.byteAlign();
      let collectiveBitmap;
      if (bitmapSize === 0) {
        collectiveBitmap = readUncompressedBitmap(huffmanInput, totalWidth, currentHeight);
      } else {
        const originalEnd = huffmanInput.end;
        const bitmapEnd = huffmanInput.position + bitmapSize;
        huffmanInput.end = bitmapEnd;
        collectiveBitmap = decodeMMRBitmap(huffmanInput, totalWidth, currentHeight, false);
        huffmanInput.end = originalEnd;
        huffmanInput.position = bitmapEnd;
      }
      const numberOfSymbolsDecoded = symbolWidths.length;
      if (firstSymbol === numberOfSymbolsDecoded - 1) {
        newSymbols.push(collectiveBitmap);
      } else {
        let i,
          y,
          xMin = 0,
          xMax,
          bitmapWidth,
          symbolBitmap;
        for (i = firstSymbol; i < numberOfSymbolsDecoded; i++) {
          bitmapWidth = symbolWidths[i];
          xMax = xMin + bitmapWidth;
          symbolBitmap = [];
          for (y = 0; y < currentHeight; y++) {
            symbolBitmap.push(collectiveBitmap[y].subarray(xMin, xMax));
          }
          newSymbols.push(symbolBitmap);
          xMin = xMax;
        }
      }
    }
  }
  const exportedSymbols = [],
    flags = [];
  let currentFlag = false,
    i,
    ii;
  const totalSymbolsLength = symbols.length + numberOfNewSymbols;
  while (flags.length < totalSymbolsLength) {
    let runLength = huffman ? tableB1.decode(huffmanInput) : decodeInteger(contextCache, "IAEX", decoder);
    while (runLength--) {
      flags.push(currentFlag);
    }
    currentFlag = !currentFlag;
  }
  for (i = 0, ii = symbols.length; i < ii; i++) {
    if (flags[i]) {
      exportedSymbols.push(symbols[i]);
    }
  }
  for (let j = 0; j < numberOfNewSymbols; i++, j++) {
    if (flags[i]) {
      exportedSymbols.push(newSymbols[j]);
    }
  }
  return exportedSymbols;
}
function decodeTextRegion(huffman, refinement, width, height, defaultPixelValue, numberOfSymbolInstances, stripSize, inputSymbols, symbolCodeLength, transposed, dsOffset, referenceCorner, combinationOperator, huffmanTables, refinementTemplateIndex, refinementAt, decodingContext, logStripSize, huffmanInput) {
  if (huffman && refinement) {
    throw new Jbig2Error("refinement with Huffman is not supported");
  }
  const bitmap = [];
  let i, row;
  for (i = 0; i < height; i++) {
    row = new Uint8Array(width);
    if (defaultPixelValue) {
      row.fill(defaultPixelValue);
    }
    bitmap.push(row);
  }
  const decoder = decodingContext.decoder;
  const contextCache = decodingContext.contextCache;
  let stripT = huffman ? -huffmanTables.tableDeltaT.decode(huffmanInput) : -decodeInteger(contextCache, "IADT", decoder);
  let firstS = 0;
  i = 0;
  while (i < numberOfSymbolInstances) {
    const deltaT = huffman ? huffmanTables.tableDeltaT.decode(huffmanInput) : decodeInteger(contextCache, "IADT", decoder);
    stripT += deltaT;
    const deltaFirstS = huffman ? huffmanTables.tableFirstS.decode(huffmanInput) : decodeInteger(contextCache, "IAFS", decoder);
    firstS += deltaFirstS;
    let currentS = firstS;
    do {
      let currentT = 0;
      if (stripSize > 1) {
        currentT = huffman ? huffmanInput.readBits(logStripSize) : decodeInteger(contextCache, "IAIT", decoder);
      }
      const t = stripSize * stripT + currentT;
      const symbolId = huffman ? huffmanTables.symbolIDTable.decode(huffmanInput) : decodeIAID(contextCache, decoder, symbolCodeLength);
      const applyRefinement = refinement && (huffman ? huffmanInput.readBit() : decodeInteger(contextCache, "IARI", decoder));
      let symbolBitmap = inputSymbols[symbolId];
      let symbolWidth = symbolBitmap[0].length;
      let symbolHeight = symbolBitmap.length;
      if (applyRefinement) {
        const rdw = decodeInteger(contextCache, "IARDW", decoder);
        const rdh = decodeInteger(contextCache, "IARDH", decoder);
        const rdx = decodeInteger(contextCache, "IARDX", decoder);
        const rdy = decodeInteger(contextCache, "IARDY", decoder);
        symbolWidth += rdw;
        symbolHeight += rdh;
        symbolBitmap = decodeRefinement(symbolWidth, symbolHeight, refinementTemplateIndex, symbolBitmap, (rdw >> 1) + rdx, (rdh >> 1) + rdy, false, refinementAt, decodingContext);
      }
      let increment = 0;
      if (!transposed) {
        if (referenceCorner > 1) {
          currentS += symbolWidth - 1;
        } else {
          increment = symbolWidth - 1;
        }
      } else if (!(referenceCorner & 1)) {
        currentS += symbolHeight - 1;
      } else {
        increment = symbolHeight - 1;
      }
      const offsetT = t - (referenceCorner & 1 ? 0 : symbolHeight - 1);
      const offsetS = currentS - (referenceCorner & 2 ? symbolWidth - 1 : 0);
      let s2, t2, symbolRow;
      if (transposed) {
        for (s2 = 0; s2 < symbolHeight; s2++) {
          row = bitmap[offsetS + s2];
          if (!row) {
            continue;
          }
          symbolRow = symbolBitmap[s2];
          const maxWidth = Math.min(width - offsetT, symbolWidth);
          switch (combinationOperator) {
            case 0:
              for (t2 = 0; t2 < maxWidth; t2++) {
                row[offsetT + t2] |= symbolRow[t2];
              }
              break;
            case 2:
              for (t2 = 0; t2 < maxWidth; t2++) {
                row[offsetT + t2] ^= symbolRow[t2];
              }
              break;
            default:
              throw new Jbig2Error(`operator ${combinationOperator} is not supported`);
          }
        }
      } else {
        for (t2 = 0; t2 < symbolHeight; t2++) {
          row = bitmap[offsetT + t2];
          if (!row) {
            continue;
          }
          symbolRow = symbolBitmap[t2];
          switch (combinationOperator) {
            case 0:
              for (s2 = 0; s2 < symbolWidth; s2++) {
                row[offsetS + s2] |= symbolRow[s2];
              }
              break;
            case 2:
              for (s2 = 0; s2 < symbolWidth; s2++) {
                row[offsetS + s2] ^= symbolRow[s2];
              }
              break;
            default:
              throw new Jbig2Error(`operator ${combinationOperator} is not supported`);
          }
        }
      }
      i++;
      const deltaS = huffman ? huffmanTables.tableDeltaS.decode(huffmanInput) : decodeInteger(contextCache, "IADS", decoder);
      if (deltaS === null) {
        break;
      }
      currentS += increment + deltaS + dsOffset;
    } while (true);
  }
  return bitmap;
}
function decodePatternDictionary(mmr, patternWidth, patternHeight, maxPatternIndex, template, decodingContext) {
  const at = [];
  if (!mmr) {
    at.push({
      x: -patternWidth,
      y: 0
    });
    if (template === 0) {
      at.push({
        x: -3,
        y: -1
      }, {
        x: 2,
        y: -2
      }, {
        x: -2,
        y: -2
      });
    }
  }
  const collectiveWidth = (maxPatternIndex + 1) * patternWidth;
  const collectiveBitmap = decodeBitmap(mmr, collectiveWidth, patternHeight, template, false, null, at, decodingContext);
  const patterns = [];
  for (let i = 0; i <= maxPatternIndex; i++) {
    const patternBitmap = [];
    const xMin = patternWidth * i;
    const xMax = xMin + patternWidth;
    for (let y = 0; y < patternHeight; y++) {
      patternBitmap.push(collectiveBitmap[y].subarray(xMin, xMax));
    }
    patterns.push(patternBitmap);
  }
  return patterns;
}
function decodeHalftoneRegion(mmr, patterns, template, regionWidth, regionHeight, defaultPixelValue, enableSkip, combinationOperator, gridWidth, gridHeight, gridOffsetX, gridOffsetY, gridVectorX, gridVectorY, decodingContext) {
  const skip = null;
  if (enableSkip) {
    throw new Jbig2Error("skip is not supported");
  }
  if (combinationOperator !== 0) {
    throw new Jbig2Error(`operator "${combinationOperator}" is not supported in halftone region`);
  }
  const regionBitmap = [];
  let i, j, row;
  for (i = 0; i < regionHeight; i++) {
    row = new Uint8Array(regionWidth);
    if (defaultPixelValue) {
      row.fill(defaultPixelValue);
    }
    regionBitmap.push(row);
  }
  const numberOfPatterns = patterns.length;
  const pattern0 = patterns[0];
  const patternWidth = pattern0[0].length,
    patternHeight = pattern0.length;
  const bitsPerValue = log2(numberOfPatterns);
  const at = [];
  if (!mmr) {
    at.push({
      x: template <= 1 ? 3 : 2,
      y: -1
    });
    if (template === 0) {
      at.push({
        x: -3,
        y: -1
      }, {
        x: 2,
        y: -2
      }, {
        x: -2,
        y: -2
      });
    }
  }
  const grayScaleBitPlanes = [];
  let mmrInput, bitmap;
  if (mmr) {
    mmrInput = new Reader(decodingContext.data, decodingContext.start, decodingContext.end);
  }
  for (i = bitsPerValue - 1; i >= 0; i--) {
    if (mmr) {
      bitmap = decodeMMRBitmap(mmrInput, gridWidth, gridHeight, true);
    } else {
      bitmap = decodeBitmap(false, gridWidth, gridHeight, template, false, skip, at, decodingContext);
    }
    grayScaleBitPlanes[i] = bitmap;
  }
  let mg, ng, bit, patternIndex, patternBitmap, x, y, patternRow, regionRow;
  for (mg = 0; mg < gridHeight; mg++) {
    for (ng = 0; ng < gridWidth; ng++) {
      bit = 0;
      patternIndex = 0;
      for (j = bitsPerValue - 1; j >= 0; j--) {
        bit ^= grayScaleBitPlanes[j][mg][ng];
        patternIndex |= bit << j;
      }
      patternBitmap = patterns[patternIndex];
      x = gridOffsetX + mg * gridVectorY + ng * gridVectorX >> 8;
      y = gridOffsetY + mg * gridVectorX - ng * gridVectorY >> 8;
      if (x >= 0 && x + patternWidth <= regionWidth && y >= 0 && y + patternHeight <= regionHeight) {
        for (i = 0; i < patternHeight; i++) {
          regionRow = regionBitmap[y + i];
          patternRow = patternBitmap[i];
          for (j = 0; j < patternWidth; j++) {
            regionRow[x + j] |= patternRow[j];
          }
        }
      } else {
        let regionX, regionY;
        for (i = 0; i < patternHeight; i++) {
          regionY = y + i;
          if (regionY < 0 || regionY >= regionHeight) {
            continue;
          }
          regionRow = regionBitmap[regionY];
          patternRow = patternBitmap[i];
          for (j = 0; j < patternWidth; j++) {
            regionX = x + j;
            if (regionX >= 0 && regionX < regionWidth) {
              regionRow[regionX] |= patternRow[j];
            }
          }
        }
      }
    }
  }
  return regionBitmap;
}
function readSegmentHeader(data, start) {
  const segmentHeader = {};
  segmentHeader.number = readUint32(data, start);
  const flags = data[start + 4];
  const segmentType = flags & 0x3f;
  if (!SegmentTypes[segmentType]) {
    throw new Jbig2Error("invalid segment type: " + segmentType);
  }
  segmentHeader.type = segmentType;
  segmentHeader.typeName = SegmentTypes[segmentType];
  segmentHeader.deferredNonRetain = !!(flags & 0x80);
  const pageAssociationFieldSize = !!(flags & 0x40);
  const referredFlags = data[start + 5];
  let referredToCount = referredFlags >> 5 & 7;
  const retainBits = [referredFlags & 31];
  let position = start + 6;
  if (referredFlags === 7) {
    referredToCount = readUint32(data, position - 1) & 0x1fffffff;
    position += 3;
    let bytes = referredToCount + 7 >> 3;
    retainBits[0] = data[position++];
    while (--bytes > 0) {
      retainBits.push(data[position++]);
    }
  } else if (referredFlags === 5 || referredFlags === 6) {
    throw new Jbig2Error("invalid referred-to flags");
  }
  segmentHeader.retainBits = retainBits;
  let referredToSegmentNumberSize = 4;
  if (segmentHeader.number <= 256) {
    referredToSegmentNumberSize = 1;
  } else if (segmentHeader.number <= 65536) {
    referredToSegmentNumberSize = 2;
  }
  const referredTo = [];
  let i, ii;
  for (i = 0; i < referredToCount; i++) {
    let number;
    if (referredToSegmentNumberSize === 1) {
      number = data[position];
    } else if (referredToSegmentNumberSize === 2) {
      number = readUint16(data, position);
    } else {
      number = readUint32(data, position);
    }
    referredTo.push(number);
    position += referredToSegmentNumberSize;
  }
  segmentHeader.referredTo = referredTo;
  if (!pageAssociationFieldSize) {
    segmentHeader.pageAssociation = data[position++];
  } else {
    segmentHeader.pageAssociation = readUint32(data, position);
    position += 4;
  }
  segmentHeader.length = readUint32(data, position);
  position += 4;
  if (segmentHeader.length === 0xffffffff) {
    if (segmentType === 38) {
      const genericRegionInfo = readRegionSegmentInformation(data, position);
      const genericRegionSegmentFlags = data[position + RegionSegmentInformationFieldLength];
      const genericRegionMmr = !!(genericRegionSegmentFlags & 1);
      const searchPatternLength = 6;
      const searchPattern = new Uint8Array(searchPatternLength);
      if (!genericRegionMmr) {
        searchPattern[0] = 0xff;
        searchPattern[1] = 0xac;
      }
      searchPattern[2] = genericRegionInfo.height >>> 24 & 0xff;
      searchPattern[3] = genericRegionInfo.height >> 16 & 0xff;
      searchPattern[4] = genericRegionInfo.height >> 8 & 0xff;
      searchPattern[5] = genericRegionInfo.height & 0xff;
      for (i = position, ii = data.length; i < ii; i++) {
        let j = 0;
        while (j < searchPatternLength && searchPattern[j] === data[i + j]) {
          j++;
        }
        if (j === searchPatternLength) {
          segmentHeader.length = i + searchPatternLength;
          break;
        }
      }
      if (segmentHeader.length === 0xffffffff) {
        throw new Jbig2Error("segment end was not found");
      }
    } else {
      throw new Jbig2Error("invalid unknown segment length");
    }
  }
  segmentHeader.headerEnd = position;
  return segmentHeader;
}
function readSegments(header, data, start, end) {
  const segments = [];
  let position = start;
  while (position < end) {
    const segmentHeader = readSegmentHeader(data, position);
    position = segmentHeader.headerEnd;
    const segment = {
      header: segmentHeader,
      data
    };
    if (!header.randomAccess) {
      segment.start = position;
      position += segmentHeader.length;
      segment.end = position;
    }
    segments.push(segment);
    if (segmentHeader.type === 51) {
      break;
    }
  }
  if (header.randomAccess) {
    for (let i = 0, ii = segments.length; i < ii; i++) {
      segments[i].start = position;
      position += segments[i].header.length;
      segments[i].end = position;
    }
  }
  return segments;
}
function readRegionSegmentInformation(data, start) {
  return {
    width: readUint32(data, start),
    height: readUint32(data, start + 4),
    x: readUint32(data, start + 8),
    y: readUint32(data, start + 12),
    combinationOperator: data[start + 16] & 7
  };
}
const RegionSegmentInformationFieldLength = 17;
function processSegment(segment, visitor) {
  const header = segment.header;
  const data = segment.data,
    end = segment.end;
  let position = segment.start;
  let args, at, i, atLength;
  switch (header.type) {
    case 0:
      const dictionary = {};
      const dictionaryFlags = readUint16(data, position);
      dictionary.huffman = !!(dictionaryFlags & 1);
      dictionary.refinement = !!(dictionaryFlags & 2);
      dictionary.huffmanDHSelector = dictionaryFlags >> 2 & 3;
      dictionary.huffmanDWSelector = dictionaryFlags >> 4 & 3;
      dictionary.bitmapSizeSelector = dictionaryFlags >> 6 & 1;
      dictionary.aggregationInstancesSelector = dictionaryFlags >> 7 & 1;
      dictionary.bitmapCodingContextUsed = !!(dictionaryFlags & 256);
      dictionary.bitmapCodingContextRetained = !!(dictionaryFlags & 512);
      dictionary.template = dictionaryFlags >> 10 & 3;
      dictionary.refinementTemplate = dictionaryFlags >> 12 & 1;
      position += 2;
      if (!dictionary.huffman) {
        atLength = dictionary.template === 0 ? 4 : 1;
        at = [];
        for (i = 0; i < atLength; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        dictionary.at = at;
      }
      if (dictionary.refinement && !dictionary.refinementTemplate) {
        at = [];
        for (i = 0; i < 2; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        dictionary.refinementAt = at;
      }
      dictionary.numberOfExportedSymbols = readUint32(data, position);
      position += 4;
      dictionary.numberOfNewSymbols = readUint32(data, position);
      position += 4;
      args = [dictionary, header.number, header.referredTo, data, position, end];
      break;
    case 6:
    case 7:
      const textRegion = {};
      textRegion.info = readRegionSegmentInformation(data, position);
      position += RegionSegmentInformationFieldLength;
      const textRegionSegmentFlags = readUint16(data, position);
      position += 2;
      textRegion.huffman = !!(textRegionSegmentFlags & 1);
      textRegion.refinement = !!(textRegionSegmentFlags & 2);
      textRegion.logStripSize = textRegionSegmentFlags >> 2 & 3;
      textRegion.stripSize = 1 << textRegion.logStripSize;
      textRegion.referenceCorner = textRegionSegmentFlags >> 4 & 3;
      textRegion.transposed = !!(textRegionSegmentFlags & 64);
      textRegion.combinationOperator = textRegionSegmentFlags >> 7 & 3;
      textRegion.defaultPixelValue = textRegionSegmentFlags >> 9 & 1;
      textRegion.dsOffset = textRegionSegmentFlags << 17 >> 27;
      textRegion.refinementTemplate = textRegionSegmentFlags >> 15 & 1;
      if (textRegion.huffman) {
        const textRegionHuffmanFlags = readUint16(data, position);
        position += 2;
        textRegion.huffmanFS = textRegionHuffmanFlags & 3;
        textRegion.huffmanDS = textRegionHuffmanFlags >> 2 & 3;
        textRegion.huffmanDT = textRegionHuffmanFlags >> 4 & 3;
        textRegion.huffmanRefinementDW = textRegionHuffmanFlags >> 6 & 3;
        textRegion.huffmanRefinementDH = textRegionHuffmanFlags >> 8 & 3;
        textRegion.huffmanRefinementDX = textRegionHuffmanFlags >> 10 & 3;
        textRegion.huffmanRefinementDY = textRegionHuffmanFlags >> 12 & 3;
        textRegion.huffmanRefinementSizeSelector = !!(textRegionHuffmanFlags & 0x4000);
      }
      if (textRegion.refinement && !textRegion.refinementTemplate) {
        at = [];
        for (i = 0; i < 2; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        textRegion.refinementAt = at;
      }
      textRegion.numberOfSymbolInstances = readUint32(data, position);
      position += 4;
      args = [textRegion, header.referredTo, data, position, end];
      break;
    case 16:
      const patternDictionary = {};
      const patternDictionaryFlags = data[position++];
      patternDictionary.mmr = !!(patternDictionaryFlags & 1);
      patternDictionary.template = patternDictionaryFlags >> 1 & 3;
      patternDictionary.patternWidth = data[position++];
      patternDictionary.patternHeight = data[position++];
      patternDictionary.maxPatternIndex = readUint32(data, position);
      position += 4;
      args = [patternDictionary, header.number, data, position, end];
      break;
    case 22:
    case 23:
      const halftoneRegion = {};
      halftoneRegion.info = readRegionSegmentInformation(data, position);
      position += RegionSegmentInformationFieldLength;
      const halftoneRegionFlags = data[position++];
      halftoneRegion.mmr = !!(halftoneRegionFlags & 1);
      halftoneRegion.template = halftoneRegionFlags >> 1 & 3;
      halftoneRegion.enableSkip = !!(halftoneRegionFlags & 8);
      halftoneRegion.combinationOperator = halftoneRegionFlags >> 4 & 7;
      halftoneRegion.defaultPixelValue = halftoneRegionFlags >> 7 & 1;
      halftoneRegion.gridWidth = readUint32(data, position);
      position += 4;
      halftoneRegion.gridHeight = readUint32(data, position);
      position += 4;
      halftoneRegion.gridOffsetX = readUint32(data, position) & 0xffffffff;
      position += 4;
      halftoneRegion.gridOffsetY = readUint32(data, position) & 0xffffffff;
      position += 4;
      halftoneRegion.gridVectorX = readUint16(data, position);
      position += 2;
      halftoneRegion.gridVectorY = readUint16(data, position);
      position += 2;
      args = [halftoneRegion, header.referredTo, data, position, end];
      break;
    case 38:
    case 39:
      const genericRegion = {};
      genericRegion.info = readRegionSegmentInformation(data, position);
      position += RegionSegmentInformationFieldLength;
      const genericRegionSegmentFlags = data[position++];
      genericRegion.mmr = !!(genericRegionSegmentFlags & 1);
      genericRegion.template = genericRegionSegmentFlags >> 1 & 3;
      genericRegion.prediction = !!(genericRegionSegmentFlags & 8);
      if (!genericRegion.mmr) {
        atLength = genericRegion.template === 0 ? 4 : 1;
        at = [];
        for (i = 0; i < atLength; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        genericRegion.at = at;
      }
      args = [genericRegion, data, position, end];
      break;
    case 48:
      const pageInfo = {
        width: readUint32(data, position),
        height: readUint32(data, position + 4),
        resolutionX: readUint32(data, position + 8),
        resolutionY: readUint32(data, position + 12)
      };
      if (pageInfo.height === 0xffffffff) {
        delete pageInfo.height;
      }
      const pageSegmentFlags = data[position + 16];
      readUint16(data, position + 17);
      pageInfo.lossless = !!(pageSegmentFlags & 1);
      pageInfo.refinement = !!(pageSegmentFlags & 2);
      pageInfo.defaultPixelValue = pageSegmentFlags >> 2 & 1;
      pageInfo.combinationOperator = pageSegmentFlags >> 3 & 3;
      pageInfo.requiresBuffer = !!(pageSegmentFlags & 32);
      pageInfo.combinationOperatorOverride = !!(pageSegmentFlags & 64);
      args = [pageInfo];
      break;
    case 49:
      break;
    case 50:
      break;
    case 51:
      break;
    case 53:
      args = [header.number, data, position, end];
      break;
    case 62:
      break;
    default:
      throw new Jbig2Error(`segment type ${header.typeName}(${header.type}) is not implemented`);
  }
  const callbackName = "on" + header.typeName;
  if (callbackName in visitor) {
    visitor[callbackName].apply(visitor, args);
  }
}
function processSegments(segments, visitor) {
  for (let i = 0, ii = segments.length; i < ii; i++) {
    processSegment(segments[i], visitor);
  }
}
function parseJbig2Chunks(chunks) {
  const visitor = new SimpleSegmentVisitor();
  for (let i = 0, ii = chunks.length; i < ii; i++) {
    const chunk = chunks[i];
    const segments = readSegments({}, chunk.data, chunk.start, chunk.end);
    processSegments(segments, visitor);
  }
  return visitor.buffer;
}
function parseJbig2(data) {
  const end = data.length;
  let position = 0;
  if (data[position] !== 0x97 || data[position + 1] !== 0x4a || data[position + 2] !== 0x42 || data[position + 3] !== 0x32 || data[position + 4] !== 0x0d || data[position + 5] !== 0x0a || data[position + 6] !== 0x1a || data[position + 7] !== 0x0a) {
    throw new Jbig2Error("parseJbig2 - invalid header.");
  }
  const header = Object.create(null);
  position += 8;
  const flags = data[position++];
  header.randomAccess = !(flags & 1);
  if (!(flags & 2)) {
    header.numberOfPages = readUint32(data, position);
    position += 4;
  }
  const segments = readSegments(header, data, position, end);
  const visitor = new SimpleSegmentVisitor();
  processSegments(segments, visitor);
  const {
    width,
    height
  } = visitor.currentPageInfo;
  const bitPacked = visitor.buffer;
  const imgData = new Uint8ClampedArray(width * height);
  let q = 0,
    k = 0;
  for (let i = 0; i < height; i++) {
    let mask = 0,
      buffer;
    for (let j = 0; j < width; j++) {
      if (!mask) {
        mask = 128;
        buffer = bitPacked[k++];
      }
      imgData[q++] = buffer & mask ? 0 : 255;
      mask >>= 1;
    }
  }
  return {
    imgData,
    width,
    height
  };
}
class SimpleSegmentVisitor {
  onPageInformation(info) {
    this.currentPageInfo = info;
    const rowSize = info.width + 7 >> 3;
    const buffer = new Uint8ClampedArray(rowSize * info.height);
    if (info.defaultPixelValue) {
      buffer.fill(0xff);
    }
    this.buffer = buffer;
  }
  drawBitmap(regionInfo, bitmap) {
    const pageInfo = this.currentPageInfo;
    const width = regionInfo.width,
      height = regionInfo.height;
    const rowSize = pageInfo.width + 7 >> 3;
    const combinationOperator = pageInfo.combinationOperatorOverride ? regionInfo.combinationOperator : pageInfo.combinationOperator;
    const buffer = this.buffer;
    const mask0 = 128 >> (regionInfo.x & 7);
    let offset0 = regionInfo.y * rowSize + (regionInfo.x >> 3);
    let i, j, mask, offset;
    switch (combinationOperator) {
      case 0:
        for (i = 0; i < height; i++) {
          mask = mask0;
          offset = offset0;
          for (j = 0; j < width; j++) {
            if (bitmap[i][j]) {
              buffer[offset] |= mask;
            }
            mask >>= 1;
            if (!mask) {
              mask = 128;
              offset++;
            }
          }
          offset0 += rowSize;
        }
        break;
      case 2:
        for (i = 0; i < height; i++) {
          mask = mask0;
          offset = offset0;
          for (j = 0; j < width; j++) {
            if (bitmap[i][j]) {
              buffer[offset] ^= mask;
            }
            mask >>= 1;
            if (!mask) {
              mask = 128;
              offset++;
            }
          }
          offset0 += rowSize;
        }
        break;
      default:
        throw new Jbig2Error(`operator ${combinationOperator} is not supported`);
    }
  }
  onImmediateGenericRegion(region, data, start, end) {
    const regionInfo = region.info;
    const decodingContext = new DecodingContext(data, start, end);
    const bitmap = decodeBitmap(region.mmr, regionInfo.width, regionInfo.height, region.template, region.prediction, null, region.at, decodingContext);
    this.drawBitmap(regionInfo, bitmap);
  }
  onImmediateLosslessGenericRegion() {
    this.onImmediateGenericRegion(...arguments);
  }
  onSymbolDictionary(dictionary, currentSegment, referredSegments, data, start, end) {
    let huffmanTables, huffmanInput;
    if (dictionary.huffman) {
      huffmanTables = getSymbolDictionaryHuffmanTables(dictionary, referredSegments, this.customTables);
      huffmanInput = new Reader(data, start, end);
    }
    let symbols = this.symbols;
    if (!symbols) {
      this.symbols = symbols = {};
    }
    const inputSymbols = [];
    for (const referredSegment of referredSegments) {
      const referredSymbols = symbols[referredSegment];
      if (referredSymbols) {
        inputSymbols.push(...referredSymbols);
      }
    }
    const decodingContext = new DecodingContext(data, start, end);
    symbols[currentSegment] = decodeSymbolDictionary(dictionary.huffman, dictionary.refinement, inputSymbols, dictionary.numberOfNewSymbols, dictionary.numberOfExportedSymbols, huffmanTables, dictionary.template, dictionary.at, dictionary.refinementTemplate, dictionary.refinementAt, decodingContext, huffmanInput);
  }
  onImmediateTextRegion(region, referredSegments, data, start, end) {
    const regionInfo = region.info;
    let huffmanTables, huffmanInput;
    const symbols = this.symbols;
    const inputSymbols = [];
    for (const referredSegment of referredSegments) {
      const referredSymbols = symbols[referredSegment];
      if (referredSymbols) {
        inputSymbols.push(...referredSymbols);
      }
    }
    const symbolCodeLength = log2(inputSymbols.length);
    if (region.huffman) {
      huffmanInput = new Reader(data, start, end);
      huffmanTables = getTextRegionHuffmanTables(region, referredSegments, this.customTables, inputSymbols.length, huffmanInput);
    }
    const decodingContext = new DecodingContext(data, start, end);
    const bitmap = decodeTextRegion(region.huffman, region.refinement, regionInfo.width, regionInfo.height, region.defaultPixelValue, region.numberOfSymbolInstances, region.stripSize, inputSymbols, symbolCodeLength, region.transposed, region.dsOffset, region.referenceCorner, region.combinationOperator, huffmanTables, region.refinementTemplate, region.refinementAt, decodingContext, region.logStripSize, huffmanInput);
    this.drawBitmap(regionInfo, bitmap);
  }
  onImmediateLosslessTextRegion() {
    this.onImmediateTextRegion(...arguments);
  }
  onPatternDictionary(dictionary, currentSegment, data, start, end) {
    let patterns = this.patterns;
    if (!patterns) {
      this.patterns = patterns = {};
    }
    const decodingContext = new DecodingContext(data, start, end);
    patterns[currentSegment] = decodePatternDictionary(dictionary.mmr, dictionary.patternWidth, dictionary.patternHeight, dictionary.maxPatternIndex, dictionary.template, decodingContext);
  }
  onImmediateHalftoneRegion(region, referredSegments, data, start, end) {
    const patterns = this.patterns[referredSegments[0]];
    const regionInfo = region.info;
    const decodingContext = new DecodingContext(data, start, end);
    const bitmap = decodeHalftoneRegion(region.mmr, patterns, region.template, regionInfo.width, regionInfo.height, region.defaultPixelValue, region.enableSkip, region.combinationOperator, region.gridWidth, region.gridHeight, region.gridOffsetX, region.gridOffsetY, region.gridVectorX, region.gridVectorY, decodingContext);
    this.drawBitmap(regionInfo, bitmap);
  }
  onImmediateLosslessHalftoneRegion() {
    this.onImmediateHalftoneRegion(...arguments);
  }
  onTables(currentSegment, data, start, end) {
    let customTables = this.customTables;
    if (!customTables) {
      this.customTables = customTables = {};
    }
    customTables[currentSegment] = decodeTablesSegment(data, start, end);
  }
}
class HuffmanLine {
  constructor(lineData) {
    if (lineData.length === 2) {
      this.isOOB = true;
      this.rangeLow = 0;
      this.prefixLength = lineData[0];
      this.rangeLength = 0;
      this.prefixCode = lineData[1];
      this.isLowerRange = false;
    } else {
      this.isOOB = false;
      this.rangeLow = lineData[0];
      this.prefixLength = lineData[1];
      this.rangeLength = lineData[2];
      this.prefixCode = lineData[3];
      this.isLowerRange = lineData[4] === "lower";
    }
  }
}
class HuffmanTreeNode {
  constructor(line) {
    this.children = [];
    if (line) {
      this.isLeaf = true;
      this.rangeLength = line.rangeLength;
      this.rangeLow = line.rangeLow;
      this.isLowerRange = line.isLowerRange;
      this.isOOB = line.isOOB;
    } else {
      this.isLeaf = false;
    }
  }
  buildTree(line, shift) {
    const bit = line.prefixCode >> shift & 1;
    if (shift <= 0) {
      this.children[bit] = new HuffmanTreeNode(line);
    } else {
      let node = this.children[bit];
      if (!node) {
        this.children[bit] = node = new HuffmanTreeNode(null);
      }
      node.buildTree(line, shift - 1);
    }
  }
  decodeNode(reader) {
    if (this.isLeaf) {
      if (this.isOOB) {
        return null;
      }
      const htOffset = reader.readBits(this.rangeLength);
      return this.rangeLow + (this.isLowerRange ? -htOffset : htOffset);
    }
    const node = this.children[reader.readBit()];
    if (!node) {
      throw new Jbig2Error("invalid Huffman data");
    }
    return node.decodeNode(reader);
  }
}
class HuffmanTable {
  constructor(lines, prefixCodesDone) {
    if (!prefixCodesDone) {
      this.assignPrefixCodes(lines);
    }
    this.rootNode = new HuffmanTreeNode(null);
    for (let i = 0, ii = lines.length; i < ii; i++) {
      const line = lines[i];
      if (line.prefixLength > 0) {
        this.rootNode.buildTree(line, line.prefixLength - 1);
      }
    }
  }
  decode(reader) {
    return this.rootNode.decodeNode(reader);
  }
  assignPrefixCodes(lines) {
    const linesLength = lines.length;
    let prefixLengthMax = 0;
    for (let i = 0; i < linesLength; i++) {
      prefixLengthMax = Math.max(prefixLengthMax, lines[i].prefixLength);
    }
    const histogram = new Uint32Array(prefixLengthMax + 1);
    for (let i = 0; i < linesLength; i++) {
      histogram[lines[i].prefixLength]++;
    }
    let currentLength = 1,
      firstCode = 0,
      currentCode,
      currentTemp,
      line;
    histogram[0] = 0;
    while (currentLength <= prefixLengthMax) {
      firstCode = firstCode + histogram[currentLength - 1] << 1;
      currentCode = firstCode;
      currentTemp = 0;
      while (currentTemp < linesLength) {
        line = lines[currentTemp];
        if (line.prefixLength === currentLength) {
          line.prefixCode = currentCode;
          currentCode++;
        }
        currentTemp++;
      }
      currentLength++;
    }
  }
}
function decodeTablesSegment(data, start, end) {
  const flags = data[start];
  const lowestValue = readUint32(data, start + 1) & 0xffffffff;
  const highestValue = readUint32(data, start + 5) & 0xffffffff;
  const reader = new Reader(data, start + 9, end);
  const prefixSizeBits = (flags >> 1 & 7) + 1;
  const rangeSizeBits = (flags >> 4 & 7) + 1;
  const lines = [];
  let prefixLength,
    rangeLength,
    currentRangeLow = lowestValue;
  do {
    prefixLength = reader.readBits(prefixSizeBits);
    rangeLength = reader.readBits(rangeSizeBits);
    lines.push(new HuffmanLine([currentRangeLow, prefixLength, rangeLength, 0]));
    currentRangeLow += 1 << rangeLength;
  } while (currentRangeLow < highestValue);
  prefixLength = reader.readBits(prefixSizeBits);
  lines.push(new HuffmanLine([lowestValue - 1, prefixLength, 32, 0, "lower"]));
  prefixLength = reader.readBits(prefixSizeBits);
  lines.push(new HuffmanLine([highestValue, prefixLength, 32, 0]));
  if (flags & 1) {
    prefixLength = reader.readBits(prefixSizeBits);
    lines.push(new HuffmanLine([prefixLength, 0]));
  }
  return new HuffmanTable(lines, false);
}
const standardTablesCache = {};
function getStandardTable(number) {
  let table = standardTablesCache[number];
  if (table) {
    return table;
  }
  let lines;
  switch (number) {
    case 1:
      lines = [[0, 1, 4, 0x0], [16, 2, 8, 0x2], [272, 3, 16, 0x6], [65808, 3, 32, 0x7]];
      break;
    case 2:
      lines = [[0, 1, 0, 0x0], [1, 2, 0, 0x2], [2, 3, 0, 0x6], [3, 4, 3, 0xe], [11, 5, 6, 0x1e], [75, 6, 32, 0x3e], [6, 0x3f]];
      break;
    case 3:
      lines = [[-256, 8, 8, 0xfe], [0, 1, 0, 0x0], [1, 2, 0, 0x2], [2, 3, 0, 0x6], [3, 4, 3, 0xe], [11, 5, 6, 0x1e], [-257, 8, 32, 0xff, "lower"], [75, 7, 32, 0x7e], [6, 0x3e]];
      break;
    case 4:
      lines = [[1, 1, 0, 0x0], [2, 2, 0, 0x2], [3, 3, 0, 0x6], [4, 4, 3, 0xe], [12, 5, 6, 0x1e], [76, 5, 32, 0x1f]];
      break;
    case 5:
      lines = [[-255, 7, 8, 0x7e], [1, 1, 0, 0x0], [2, 2, 0, 0x2], [3, 3, 0, 0x6], [4, 4, 3, 0xe], [12, 5, 6, 0x1e], [-256, 7, 32, 0x7f, "lower"], [76, 6, 32, 0x3e]];
      break;
    case 6:
      lines = [[-2048, 5, 10, 0x1c], [-1024, 4, 9, 0x8], [-512, 4, 8, 0x9], [-256, 4, 7, 0xa], [-128, 5, 6, 0x1d], [-64, 5, 5, 0x1e], [-32, 4, 5, 0xb], [0, 2, 7, 0x0], [128, 3, 7, 0x2], [256, 3, 8, 0x3], [512, 4, 9, 0xc], [1024, 4, 10, 0xd], [-2049, 6, 32, 0x3e, "lower"], [2048, 6, 32, 0x3f]];
      break;
    case 7:
      lines = [[-1024, 4, 9, 0x8], [-512, 3, 8, 0x0], [-256, 4, 7, 0x9], [-128, 5, 6, 0x1a], [-64, 5, 5, 0x1b], [-32, 4, 5, 0xa], [0, 4, 5, 0xb], [32, 5, 5, 0x1c], [64, 5, 6, 0x1d], [128, 4, 7, 0xc], [256, 3, 8, 0x1], [512, 3, 9, 0x2], [1024, 3, 10, 0x3], [-1025, 5, 32, 0x1e, "lower"], [2048, 5, 32, 0x1f]];
      break;
    case 8:
      lines = [[-15, 8, 3, 0xfc], [-7, 9, 1, 0x1fc], [-5, 8, 1, 0xfd], [-3, 9, 0, 0x1fd], [-2, 7, 0, 0x7c], [-1, 4, 0, 0xa], [0, 2, 1, 0x0], [2, 5, 0, 0x1a], [3, 6, 0, 0x3a], [4, 3, 4, 0x4], [20, 6, 1, 0x3b], [22, 4, 4, 0xb], [38, 4, 5, 0xc], [70, 5, 6, 0x1b], [134, 5, 7, 0x1c], [262, 6, 7, 0x3c], [390, 7, 8, 0x7d], [646, 6, 10, 0x3d], [-16, 9, 32, 0x1fe, "lower"], [1670, 9, 32, 0x1ff], [2, 0x1]];
      break;
    case 9:
      lines = [[-31, 8, 4, 0xfc], [-15, 9, 2, 0x1fc], [-11, 8, 2, 0xfd], [-7, 9, 1, 0x1fd], [-5, 7, 1, 0x7c], [-3, 4, 1, 0xa], [-1, 3, 1, 0x2], [1, 3, 1, 0x3], [3, 5, 1, 0x1a], [5, 6, 1, 0x3a], [7, 3, 5, 0x4], [39, 6, 2, 0x3b], [43, 4, 5, 0xb], [75, 4, 6, 0xc], [139, 5, 7, 0x1b], [267, 5, 8, 0x1c], [523, 6, 8, 0x3c], [779, 7, 9, 0x7d], [1291, 6, 11, 0x3d], [-32, 9, 32, 0x1fe, "lower"], [3339, 9, 32, 0x1ff], [2, 0x0]];
      break;
    case 10:
      lines = [[-21, 7, 4, 0x7a], [-5, 8, 0, 0xfc], [-4, 7, 0, 0x7b], [-3, 5, 0, 0x18], [-2, 2, 2, 0x0], [2, 5, 0, 0x19], [3, 6, 0, 0x36], [4, 7, 0, 0x7c], [5, 8, 0, 0xfd], [6, 2, 6, 0x1], [70, 5, 5, 0x1a], [102, 6, 5, 0x37], [134, 6, 6, 0x38], [198, 6, 7, 0x39], [326, 6, 8, 0x3a], [582, 6, 9, 0x3b], [1094, 6, 10, 0x3c], [2118, 7, 11, 0x7d], [-22, 8, 32, 0xfe, "lower"], [4166, 8, 32, 0xff], [2, 0x2]];
      break;
    case 11:
      lines = [[1, 1, 0, 0x0], [2, 2, 1, 0x2], [4, 4, 0, 0xc], [5, 4, 1, 0xd], [7, 5, 1, 0x1c], [9, 5, 2, 0x1d], [13, 6, 2, 0x3c], [17, 7, 2, 0x7a], [21, 7, 3, 0x7b], [29, 7, 4, 0x7c], [45, 7, 5, 0x7d], [77, 7, 6, 0x7e], [141, 7, 32, 0x7f]];
      break;
    case 12:
      lines = [[1, 1, 0, 0x0], [2, 2, 0, 0x2], [3, 3, 1, 0x6], [5, 5, 0, 0x1c], [6, 5, 1, 0x1d], [8, 6, 1, 0x3c], [10, 7, 0, 0x7a], [11, 7, 1, 0x7b], [13, 7, 2, 0x7c], [17, 7, 3, 0x7d], [25, 7, 4, 0x7e], [41, 8, 5, 0xfe], [73, 8, 32, 0xff]];
      break;
    case 13:
      lines = [[1, 1, 0, 0x0], [2, 3, 0, 0x4], [3, 4, 0, 0xc], [4, 5, 0, 0x1c], [5, 4, 1, 0xd], [7, 3, 3, 0x5], [15, 6, 1, 0x3a], [17, 6, 2, 0x3b], [21, 6, 3, 0x3c], [29, 6, 4, 0x3d], [45, 6, 5, 0x3e], [77, 7, 6, 0x7e], [141, 7, 32, 0x7f]];
      break;
    case 14:
      lines = [[-2, 3, 0, 0x4], [-1, 3, 0, 0x5], [0, 1, 0, 0x0], [1, 3, 0, 0x6], [2, 3, 0, 0x7]];
      break;
    case 15:
      lines = [[-24, 7, 4, 0x7c], [-8, 6, 2, 0x3c], [-4, 5, 1, 0x1c], [-2, 4, 0, 0xc], [-1, 3, 0, 0x4], [0, 1, 0, 0x0], [1, 3, 0, 0x5], [2, 4, 0, 0xd], [3, 5, 1, 0x1d], [5, 6, 2, 0x3d], [9, 7, 4, 0x7d], [-25, 7, 32, 0x7e, "lower"], [25, 7, 32, 0x7f]];
      break;
    default:
      throw new Jbig2Error(`standard table B.${number} does not exist`);
  }
  for (let i = 0, ii = lines.length; i < ii; i++) {
    lines[i] = new HuffmanLine(lines[i]);
  }
  table = new HuffmanTable(lines, true);
  standardTablesCache[number] = table;
  return table;
}
class Reader {
  constructor(data, start, end) {
    this.data = data;
    this.start = start;
    this.end = end;
    this.position = start;
    this.shift = -1;
    this.currentByte = 0;
  }
  readBit() {
    if (this.shift < 0) {
      if (this.position >= this.end) {
        throw new Jbig2Error("end of data while reading bit");
      }
      this.currentByte = this.data[this.position++];
      this.shift = 7;
    }
    const bit = this.currentByte >> this.shift & 1;
    this.shift--;
    return bit;
  }
  readBits(numBits) {
    let result = 0,
      i;
    for (i = numBits - 1; i >= 0; i--) {
      result |= this.readBit() << i;
    }
    return result;
  }
  byteAlign() {
    this.shift = -1;
  }
  next() {
    if (this.position >= this.end) {
      return -1;
    }
    return this.data[this.position++];
  }
}
function getCustomHuffmanTable(index, referredTo, customTables) {
  let currentIndex = 0;
  for (let i = 0, ii = referredTo.length; i < ii; i++) {
    const table = customTables[referredTo[i]];
    if (table) {
      if (index === currentIndex) {
        return table;
      }
      currentIndex++;
    }
  }
  throw new Jbig2Error("can't find custom Huffman table");
}
function getTextRegionHuffmanTables(textRegion, referredTo, customTables, numberOfSymbols, reader) {
  const codes = [];
  for (let i = 0; i <= 34; i++) {
    const codeLength = reader.readBits(4);
    codes.push(new HuffmanLine([i, codeLength, 0, 0]));
  }
  const runCodesTable = new HuffmanTable(codes, false);
  codes.length = 0;
  for (let i = 0; i < numberOfSymbols;) {
    const codeLength = runCodesTable.decode(reader);
    if (codeLength >= 32) {
      let repeatedLength, numberOfRepeats, j;
      switch (codeLength) {
        case 32:
          if (i === 0) {
            throw new Jbig2Error("no previous value in symbol ID table");
          }
          numberOfRepeats = reader.readBits(2) + 3;
          repeatedLength = codes[i - 1].prefixLength;
          break;
        case 33:
          numberOfRepeats = reader.readBits(3) + 3;
          repeatedLength = 0;
          break;
        case 34:
          numberOfRepeats = reader.readBits(7) + 11;
          repeatedLength = 0;
          break;
        default:
          throw new Jbig2Error("invalid code length in symbol ID table");
      }
      for (j = 0; j < numberOfRepeats; j++) {
        codes.push(new HuffmanLine([i, repeatedLength, 0, 0]));
        i++;
      }
    } else {
      codes.push(new HuffmanLine([i, codeLength, 0, 0]));
      i++;
    }
  }
  reader.byteAlign();
  const symbolIDTable = new HuffmanTable(codes, false);
  let customIndex = 0,
    tableFirstS,
    tableDeltaS,
    tableDeltaT;
  switch (textRegion.huffmanFS) {
    case 0:
    case 1:
      tableFirstS = getStandardTable(textRegion.huffmanFS + 6);
      break;
    case 3:
      tableFirstS = getCustomHuffmanTable(customIndex, referredTo, customTables);
      customIndex++;
      break;
    default:
      throw new Jbig2Error("invalid Huffman FS selector");
  }
  switch (textRegion.huffmanDS) {
    case 0:
    case 1:
    case 2:
      tableDeltaS = getStandardTable(textRegion.huffmanDS + 8);
      break;
    case 3:
      tableDeltaS = getCustomHuffmanTable(customIndex, referredTo, customTables);
      customIndex++;
      break;
    default:
      throw new Jbig2Error("invalid Huffman DS selector");
  }
  switch (textRegion.huffmanDT) {
    case 0:
    case 1:
    case 2:
      tableDeltaT = getStandardTable(textRegion.huffmanDT + 11);
      break;
    case 3:
      tableDeltaT = getCustomHuffmanTable(customIndex, referredTo, customTables);
      customIndex++;
      break;
    default:
      throw new Jbig2Error("invalid Huffman DT selector");
  }
  if (textRegion.refinement) {
    throw new Jbig2Error("refinement with Huffman is not supported");
  }
  return {
    symbolIDTable,
    tableFirstS,
    tableDeltaS,
    tableDeltaT
  };
}
function getSymbolDictionaryHuffmanTables(dictionary, referredTo, customTables) {
  let customIndex = 0,
    tableDeltaHeight,
    tableDeltaWidth;
  switch (dictionary.huffmanDHSelector) {
    case 0:
    case 1:
      tableDeltaHeight = getStandardTable(dictionary.huffmanDHSelector + 4);
      break;
    case 3:
      tableDeltaHeight = getCustomHuffmanTable(customIndex, referredTo, customTables);
      customIndex++;
      break;
    default:
      throw new Jbig2Error("invalid Huffman DH selector");
  }
  switch (dictionary.huffmanDWSelector) {
    case 0:
    case 1:
      tableDeltaWidth = getStandardTable(dictionary.huffmanDWSelector + 2);
      break;
    case 3:
      tableDeltaWidth = getCustomHuffmanTable(customIndex, referredTo, customTables);
      customIndex++;
      break;
    default:
      throw new Jbig2Error("invalid Huffman DW selector");
  }
  let tableBitmapSize, tableAggregateInstances;
  if (dictionary.bitmapSizeSelector) {
    tableBitmapSize = getCustomHuffmanTable(customIndex, referredTo, customTables);
    customIndex++;
  } else {
    tableBitmapSize = getStandardTable(1);
  }
  if (dictionary.aggregationInstancesSelector) {
    tableAggregateInstances = getCustomHuffmanTable(customIndex, referredTo, customTables);
  } else {
    tableAggregateInstances = getStandardTable(1);
  }
  return {
    tableDeltaHeight,
    tableDeltaWidth,
    tableBitmapSize,
    tableAggregateInstances
  };
}
function readUncompressedBitmap(reader, width, height) {
  const bitmap = [];
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(width);
    bitmap.push(row);
    for (let x = 0; x < width; x++) {
      row[x] = reader.readBit();
    }
    reader.byteAlign();
  }
  return bitmap;
}
function decodeMMRBitmap(input, width, height, endOfBlock) {
  const params = {
    K: -1,
    Columns: width,
    Rows: height,
    BlackIs1: true,
    EndOfBlock: endOfBlock
  };
  const decoder = new CCITTFaxDecoder(input, params);
  const bitmap = [];
  let currentByte,
    eof = false;
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(width);
    bitmap.push(row);
    let shift = -1;
    for (let x = 0; x < width; x++) {
      if (shift < 0) {
        currentByte = decoder.readNextChar();
        if (currentByte === -1) {
          currentByte = 0;
          eof = true;
        }
        shift = 7;
      }
      row[x] = currentByte >> shift & 1;
      shift--;
    }
  }
  if (endOfBlock && !eof) {
    const lookForEOFLimit = 5;
    for (let i = 0; i < lookForEOFLimit; i++) {
      if (decoder.readNextChar() === -1) {
        break;
      }
    }
  }
  return bitmap;
}
class Jbig2Image {
  parseChunks(chunks) {
    return parseJbig2Chunks(chunks);
  }
  parse(data) {
    const {
      imgData,
      width,
      height
    } = parseJbig2(data);
    this.width = width;
    this.height = height;
    return imgData;
  }
}

;// ./src/core/colorspace.js


function resizeRgbImage(src, dest, w1, h1, w2, h2, alpha01) {
  const COMPONENTS = 3;
  alpha01 = alpha01 !== 1 ? 0 : alpha01;
  const xRatio = w1 / w2;
  const yRatio = h1 / h2;
  let newIndex = 0,
    oldIndex;
  const xScaled = new Uint16Array(w2);
  const w1Scanline = w1 * COMPONENTS;
  for (let i = 0; i < w2; i++) {
    xScaled[i] = Math.floor(i * xRatio) * COMPONENTS;
  }
  for (let i = 0; i < h2; i++) {
    const py = Math.floor(i * yRatio) * w1Scanline;
    for (let j = 0; j < w2; j++) {
      oldIndex = py + xScaled[j];
      dest[newIndex++] = src[oldIndex++];
      dest[newIndex++] = src[oldIndex++];
      dest[newIndex++] = src[oldIndex++];
      newIndex += alpha01;
    }
  }
}
function resizeRgbaImage(src, dest, w1, h1, w2, h2, alpha01) {
  const xRatio = w1 / w2;
  const yRatio = h1 / h2;
  let newIndex = 0;
  const xScaled = new Uint16Array(w2);
  if (alpha01 === 1) {
    for (let i = 0; i < w2; i++) {
      xScaled[i] = Math.floor(i * xRatio);
    }
    const src32 = new Uint32Array(src.buffer);
    const dest32 = new Uint32Array(dest.buffer);
    const rgbMask = util_FeatureTest.isLittleEndian ? 0x00ffffff : 0xffffff00;
    for (let i = 0; i < h2; i++) {
      const buf = src32.subarray(Math.floor(i * yRatio) * w1);
      for (let j = 0; j < w2; j++) {
        dest32[newIndex++] |= buf[xScaled[j]] & rgbMask;
      }
    }
  } else {
    const COMPONENTS = 4;
    const w1Scanline = w1 * COMPONENTS;
    for (let i = 0; i < w2; i++) {
      xScaled[i] = Math.floor(i * xRatio) * COMPONENTS;
    }
    for (let i = 0; i < h2; i++) {
      const buf = src.subarray(Math.floor(i * yRatio) * w1Scanline);
      for (let j = 0; j < w2; j++) {
        const oldIndex = xScaled[j];
        dest[newIndex++] = buf[oldIndex];
        dest[newIndex++] = buf[oldIndex + 1];
        dest[newIndex++] = buf[oldIndex + 2];
      }
    }
  }
}
function copyRgbaImage(src, dest, alpha01) {
  if (alpha01 === 1) {
    const src32 = new Uint32Array(src.buffer);
    const dest32 = new Uint32Array(dest.buffer);
    const rgbMask = util_FeatureTest.isLittleEndian ? 0x00ffffff : 0xffffff00;
    for (let i = 0, ii = src32.length; i < ii; i++) {
      dest32[i] |= src32[i] & rgbMask;
    }
  } else {
    let j = 0;
    for (let i = 0, ii = src.length; i < ii; i += 4) {
      dest[j++] = src[i];
      dest[j++] = src[i + 1];
      dest[j++] = src[i + 2];
    }
  }
}
class ColorSpace {
  static #rgbBuf = new Uint8ClampedArray(3);
  constructor(name, numComps) {
    this.name = name;
    this.numComps = numComps;
  }
  getRgb(src, srcOffset, output = new Uint8ClampedArray(3)) {
    this.getRgbItem(src, srcOffset, output, 0);
    return output;
  }
  getRgbHex(src, srcOffset) {
    const buffer = this.getRgb(src, srcOffset, ColorSpace.#rgbBuf);
    return util_Util.makeHexColor(buffer[0], buffer[1], buffer[2]);
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    unreachable("Should not call ColorSpace.getRgbItem");
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    unreachable("Should not call ColorSpace.getRgbBuffer");
  }
  getOutputLength(inputLength, alpha01) {
    unreachable("Should not call ColorSpace.getOutputLength");
  }
  isPassthrough(bits) {
    return false;
  }
  isDefaultDecode(decodeMap, bpc) {
    return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
  }
  fillRgb(dest, originalWidth, originalHeight, width, height, actualHeight, bpc, comps, alpha01) {
    const count = originalWidth * originalHeight;
    let rgbBuf = null;
    const numComponentColors = 1 << bpc;
    const needsResizing = originalHeight !== height || originalWidth !== width;
    if (this.isPassthrough(bpc)) {
      rgbBuf = comps;
    } else if (this.numComps === 1 && count > numComponentColors && this.name !== "DeviceGray" && this.name !== "DeviceRGB") {
      const allColors = bpc <= 8 ? new Uint8Array(numComponentColors) : new Uint16Array(numComponentColors);
      for (let i = 0; i < numComponentColors; i++) {
        allColors[i] = i;
      }
      const colorMap = new Uint8ClampedArray(numComponentColors * 3);
      this.getRgbBuffer(allColors, 0, numComponentColors, colorMap, 0, bpc, 0);
      if (!needsResizing) {
        let destPos = 0;
        for (let i = 0; i < count; ++i) {
          const key = comps[i] * 3;
          dest[destPos++] = colorMap[key];
          dest[destPos++] = colorMap[key + 1];
          dest[destPos++] = colorMap[key + 2];
          destPos += alpha01;
        }
      } else {
        rgbBuf = new Uint8Array(count * 3);
        let rgbPos = 0;
        for (let i = 0; i < count; ++i) {
          const key = comps[i] * 3;
          rgbBuf[rgbPos++] = colorMap[key];
          rgbBuf[rgbPos++] = colorMap[key + 1];
          rgbBuf[rgbPos++] = colorMap[key + 2];
        }
      }
    } else if (!needsResizing) {
      this.getRgbBuffer(comps, 0, width * actualHeight, dest, 0, bpc, alpha01);
    } else {
      rgbBuf = new Uint8ClampedArray(count * 3);
      this.getRgbBuffer(comps, 0, count, rgbBuf, 0, bpc, 0);
    }
    if (rgbBuf) {
      if (needsResizing) {
        resizeRgbImage(rgbBuf, dest, originalWidth, originalHeight, width, height, alpha01);
      } else {
        let destPos = 0,
          rgbPos = 0;
        for (let i = 0, ii = width * actualHeight; i < ii; i++) {
          dest[destPos++] = rgbBuf[rgbPos++];
          dest[destPos++] = rgbBuf[rgbPos++];
          dest[destPos++] = rgbBuf[rgbPos++];
          destPos += alpha01;
        }
      }
    }
  }
  get usesZeroToOneRange() {
    return shadow(this, "usesZeroToOneRange", true);
  }
  static isDefaultDecode(decode, numComps) {
    if (!Array.isArray(decode)) {
      return true;
    }
    if (numComps * 2 !== decode.length) {
      util_warn("The decode map is not the correct length");
      return true;
    }
    for (let i = 0, ii = decode.length; i < ii; i += 2) {
      if (decode[i] !== 0 || decode[i + 1] !== 1) {
        return false;
      }
    }
    return true;
  }
}
class AlternateCS extends ColorSpace {
  constructor(numComps, base, tintFn) {
    super("Alternate", numComps);
    this.base = base;
    this.tintFn = tintFn;
    this.tmpBuf = new Float32Array(base.numComps);
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    const tmpBuf = this.tmpBuf;
    this.tintFn(src, srcOffset, tmpBuf, 0);
    this.base.getRgbItem(tmpBuf, 0, dest, destOffset);
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const tintFn = this.tintFn;
    const base = this.base;
    const scale = 1 / ((1 << bits) - 1);
    const baseNumComps = base.numComps;
    const usesZeroToOneRange = base.usesZeroToOneRange;
    const isPassthrough = (base.isPassthrough(8) || !usesZeroToOneRange) && alpha01 === 0;
    let pos = isPassthrough ? destOffset : 0;
    const baseBuf = isPassthrough ? dest : new Uint8ClampedArray(baseNumComps * count);
    const numComps = this.numComps;
    const scaled = new Float32Array(numComps);
    const tinted = new Float32Array(baseNumComps);
    let i, j;
    for (i = 0; i < count; i++) {
      for (j = 0; j < numComps; j++) {
        scaled[j] = src[srcOffset++] * scale;
      }
      tintFn(scaled, 0, tinted, 0);
      if (usesZeroToOneRange) {
        for (j = 0; j < baseNumComps; j++) {
          baseBuf[pos++] = tinted[j] * 255;
        }
      } else {
        base.getRgbItem(tinted, 0, baseBuf, pos);
        pos += baseNumComps;
      }
    }
    if (!isPassthrough) {
      base.getRgbBuffer(baseBuf, 0, count, dest, destOffset, 8, alpha01);
    }
  }
  getOutputLength(inputLength, alpha01) {
    return this.base.getOutputLength(inputLength * this.base.numComps / this.numComps, alpha01);
  }
}
class PatternCS extends ColorSpace {
  constructor(baseCS) {
    super("Pattern", null);
    this.base = baseCS;
  }
  isDefaultDecode(decodeMap, bpc) {
    unreachable("Should not call PatternCS.isDefaultDecode");
  }
}
class IndexedCS extends ColorSpace {
  constructor(base, highVal, lookup) {
    super("Indexed", 1);
    this.base = base;
    this.highVal = highVal;
    const length = base.numComps * (highVal + 1);
    this.lookup = new Uint8Array(length);
    if (lookup instanceof base_stream_BaseStream) {
      const bytes = lookup.getBytes(length);
      this.lookup.set(bytes);
    } else if (typeof lookup === "string") {
      for (let i = 0; i < length; ++i) {
        this.lookup[i] = lookup.charCodeAt(i) & 0xff;
      }
    } else {
      throw new FormatError(`IndexedCS - unrecognized lookup table: ${lookup}`);
    }
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    const {
      base,
      highVal,
      lookup
    } = this;
    const start = MathClamp(Math.round(src[srcOffset]), 0, highVal) * base.numComps;
    base.getRgbBuffer(lookup, start, 1, dest, destOffset, 8, 0);
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const {
      base,
      highVal,
      lookup
    } = this;
    const {
      numComps
    } = base;
    const outputDelta = base.getOutputLength(numComps, alpha01);
    for (let i = 0; i < count; ++i) {
      const lookupPos = MathClamp(Math.round(src[srcOffset++]), 0, highVal) * numComps;
      base.getRgbBuffer(lookup, lookupPos, 1, dest, destOffset, 8, alpha01);
      destOffset += outputDelta;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return this.base.getOutputLength(inputLength * this.base.numComps, alpha01);
  }
  isDefaultDecode(decodeMap, bpc) {
    if (!Array.isArray(decodeMap)) {
      return true;
    }
    if (decodeMap.length !== 2) {
      util_warn("Decode map length is not correct");
      return true;
    }
    if (!Number.isInteger(bpc) || bpc < 1) {
      util_warn("Bits per component is not correct");
      return true;
    }
    return decodeMap[0] === 0 && decodeMap[1] === (1 << bpc) - 1;
  }
}
class DeviceGrayCS extends ColorSpace {
  constructor() {
    super("DeviceGray", 1);
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    const c = src[srcOffset] * 255;
    dest[destOffset] = dest[destOffset + 1] = dest[destOffset + 2] = c;
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const scale = 255 / ((1 << bits) - 1);
    let j = srcOffset,
      q = destOffset;
    for (let i = 0; i < count; ++i) {
      const c = scale * src[j++];
      dest[q++] = c;
      dest[q++] = c;
      dest[q++] = c;
      q += alpha01;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength * (3 + alpha01);
  }
}
class DeviceRgbCS extends ColorSpace {
  constructor() {
    super("DeviceRGB", 3);
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    dest[destOffset] = src[srcOffset] * 255;
    dest[destOffset + 1] = src[srcOffset + 1] * 255;
    dest[destOffset + 2] = src[srcOffset + 2] * 255;
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    if (bits === 8 && alpha01 === 0) {
      dest.set(src.subarray(srcOffset, srcOffset + count * 3), destOffset);
      return;
    }
    const scale = 255 / ((1 << bits) - 1);
    let j = srcOffset,
      q = destOffset;
    for (let i = 0; i < count; ++i) {
      dest[q++] = scale * src[j++];
      dest[q++] = scale * src[j++];
      dest[q++] = scale * src[j++];
      q += alpha01;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength * (3 + alpha01) / 3 | 0;
  }
  isPassthrough(bits) {
    return bits === 8;
  }
}
class DeviceRgbaCS extends ColorSpace {
  constructor() {
    super("DeviceRGBA", 4);
  }
  getOutputLength(inputLength, _alpha01) {
    return inputLength * 4;
  }
  isPassthrough(bits) {
    return bits === 8;
  }
  fillRgb(dest, originalWidth, originalHeight, width, height, actualHeight, bpc, comps, alpha01) {
    if (originalHeight !== height || originalWidth !== width) {
      resizeRgbaImage(comps, dest, originalWidth, originalHeight, width, height, alpha01);
    } else {
      copyRgbaImage(comps, dest, alpha01);
    }
  }
}
class DeviceCmykCS extends ColorSpace {
  constructor() {
    super("DeviceCMYK", 4);
  }
  #toRgb(src, srcOffset, srcScale, dest, destOffset) {
    const c = src[srcOffset] * srcScale;
    const m = src[srcOffset + 1] * srcScale;
    const y = src[srcOffset + 2] * srcScale;
    const k = src[srcOffset + 3] * srcScale;
    dest[destOffset] = 255 + c * (-4.387332384609988 * c + 54.48615194189176 * m + 18.82290502165302 * y + 212.25662451639585 * k + -285.2331026137004) + m * (1.7149763477362134 * m - 5.6096736904047315 * y + -17.873870861415444 * k - 5.497006427196366) + y * (-2.5217340131683033 * y - 21.248923337353073 * k + 17.5119270841813) + k * (-21.86122147463605 * k - 189.48180835922747);
    dest[destOffset + 1] = 255 + c * (8.841041422036149 * c + 60.118027045597366 * m + 6.871425592049007 * y + 31.159100130055922 * k + -79.2970844816548) + m * (-15.310361306967817 * m + 17.575251261109482 * y + 131.35250912493976 * k - 190.9453302588951) + y * (4.444339102852739 * y + 9.8632861493405 * k - 24.86741582555878) + k * (-20.737325471181034 * k - 187.80453709719578);
    dest[destOffset + 2] = 255 + c * (0.8842522430003296 * c + 8.078677503112928 * m + 30.89978309703729 * y - 0.23883238689178934 * k + -14.183576799673286) + m * (10.49593273432072 * m + 63.02378494754052 * y + 50.606957656360734 * k - 112.23884253719248) + y * (0.03296041114873217 * y + 115.60384449646641 * k + -193.58209356861505) + k * (-22.33816807309886 * k - 180.12613974708367);
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    this.#toRgb(src, srcOffset, 1, dest, destOffset);
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const scale = 1 / ((1 << bits) - 1);
    for (let i = 0; i < count; i++) {
      this.#toRgb(src, srcOffset, scale, dest, destOffset);
      srcOffset += 4;
      destOffset += 3 + alpha01;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength / 4 * (3 + alpha01) | 0;
  }
}
class CalGrayCS extends ColorSpace {
  constructor(whitePoint, blackPoint, gamma) {
    super("CalGray", 1);
    if (!whitePoint) {
      throw new FormatError("WhitePoint missing - required for color space CalGray");
    }
    [this.XW, this.YW, this.ZW] = whitePoint;
    [this.XB, this.YB, this.ZB] = blackPoint || [0, 0, 0];
    this.G = gamma || 1;
    if (this.XW < 0 || this.ZW < 0 || this.YW !== 1) {
      throw new FormatError(`Invalid WhitePoint components for ${this.name}, no fallback available`);
    }
    if (this.XB < 0 || this.YB < 0 || this.ZB < 0) {
      info(`Invalid BlackPoint for ${this.name}, falling back to default.`);
      this.XB = this.YB = this.ZB = 0;
    }
    if (this.XB !== 0 || this.YB !== 0 || this.ZB !== 0) {
      util_warn(`${this.name}, BlackPoint: XB: ${this.XB}, YB: ${this.YB}, ` + `ZB: ${this.ZB}, only default values are supported.`);
    }
    if (this.G < 1) {
      info(`Invalid Gamma: ${this.G} for ${this.name}, falling back to default.`);
      this.G = 1;
    }
  }
  #toRgb(src, srcOffset, dest, destOffset, scale) {
    const A = src[srcOffset] * scale;
    const AG = A ** this.G;
    const L = this.YW * AG;
    const val = Math.max(295.8 * L ** 0.3333333333333333 - 40.8, 0);
    dest[destOffset] = val;
    dest[destOffset + 1] = val;
    dest[destOffset + 2] = val;
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    this.#toRgb(src, srcOffset, dest, destOffset, 1);
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const scale = 1 / ((1 << bits) - 1);
    for (let i = 0; i < count; ++i) {
      this.#toRgb(src, srcOffset, dest, destOffset, scale);
      srcOffset += 1;
      destOffset += 3 + alpha01;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength * (3 + alpha01);
  }
}
class CalRGBCS extends ColorSpace {
  static #BRADFORD_SCALE_MATRIX = new Float32Array([0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296]);
  static #BRADFORD_SCALE_INVERSE_MATRIX = new Float32Array([0.9869929, -0.1470543, 0.1599627, 0.4323053, 0.5183603, 0.0492912, -0.0085287, 0.0400428, 0.9684867]);
  static #SRGB_D65_XYZ_TO_RGB_MATRIX = new Float32Array([3.2404542, -1.5371385, -0.4985314, -0.9692660, 1.8760108, 0.0415560, 0.0556434, -0.2040259, 1.0572252]);
  static #FLAT_WHITEPOINT_MATRIX = new Float32Array([1, 1, 1]);
  static #tempNormalizeMatrix = new Float32Array(3);
  static #tempConvertMatrix1 = new Float32Array(3);
  static #tempConvertMatrix2 = new Float32Array(3);
  static #DECODE_L_CONSTANT = ((8 + 16) / 116) ** 3 / 8.0;
  constructor(whitePoint, blackPoint, gamma, matrix) {
    super("CalRGB", 3);
    if (!whitePoint) {
      throw new FormatError("WhitePoint missing - required for color space CalRGB");
    }
    const [XW, YW, ZW] = this.whitePoint = whitePoint;
    const [XB, YB, ZB] = this.blackPoint = blackPoint || new Float32Array(3);
    [this.GR, this.GG, this.GB] = gamma || new Float32Array([1, 1, 1]);
    [this.MXA, this.MYA, this.MZA, this.MXB, this.MYB, this.MZB, this.MXC, this.MYC, this.MZC] = matrix || new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    if (XW < 0 || ZW < 0 || YW !== 1) {
      throw new FormatError(`Invalid WhitePoint components for ${this.name}, no fallback available`);
    }
    if (XB < 0 || YB < 0 || ZB < 0) {
      info(`Invalid BlackPoint for ${this.name} [${XB}, ${YB}, ${ZB}], ` + "falling back to default.");
      this.blackPoint = new Float32Array(3);
    }
    if (this.GR < 0 || this.GG < 0 || this.GB < 0) {
      info(`Invalid Gamma [${this.GR}, ${this.GG}, ${this.GB}] for ` + `${this.name}, falling back to default.`);
      this.GR = this.GG = this.GB = 1;
    }
  }
  #matrixProduct(a, b, result) {
    result[0] = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    result[1] = a[3] * b[0] + a[4] * b[1] + a[5] * b[2];
    result[2] = a[6] * b[0] + a[7] * b[1] + a[8] * b[2];
  }
  #toFlat(sourceWhitePoint, LMS, result) {
    result[0] = LMS[0] * 1 / sourceWhitePoint[0];
    result[1] = LMS[1] * 1 / sourceWhitePoint[1];
    result[2] = LMS[2] * 1 / sourceWhitePoint[2];
  }
  #toD65(sourceWhitePoint, LMS, result) {
    const D65X = 0.95047;
    const D65Y = 1;
    const D65Z = 1.08883;
    result[0] = LMS[0] * D65X / sourceWhitePoint[0];
    result[1] = LMS[1] * D65Y / sourceWhitePoint[1];
    result[2] = LMS[2] * D65Z / sourceWhitePoint[2];
  }
  #sRGBTransferFunction(color) {
    if (color <= 0.0031308) {
      return MathClamp(12.92 * color, 0, 1);
    }
    if (color >= 0.99554525) {
      return 1;
    }
    return MathClamp((1 + 0.055) * color ** (1 / 2.4) - 0.055, 0, 1);
  }
  #decodeL(L) {
    if (L < 0) {
      return -this.#decodeL(-L);
    }
    if (L > 8.0) {
      return ((L + 16) / 116) ** 3;
    }
    return L * CalRGBCS.#DECODE_L_CONSTANT;
  }
  #compensateBlackPoint(sourceBlackPoint, XYZ_Flat, result) {
    if (sourceBlackPoint[0] === 0 && sourceBlackPoint[1] === 0 && sourceBlackPoint[2] === 0) {
      result[0] = XYZ_Flat[0];
      result[1] = XYZ_Flat[1];
      result[2] = XYZ_Flat[2];
      return;
    }
    const zeroDecodeL = this.#decodeL(0);
    const X_DST = zeroDecodeL;
    const X_SRC = this.#decodeL(sourceBlackPoint[0]);
    const Y_DST = zeroDecodeL;
    const Y_SRC = this.#decodeL(sourceBlackPoint[1]);
    const Z_DST = zeroDecodeL;
    const Z_SRC = this.#decodeL(sourceBlackPoint[2]);
    const X_Scale = (1 - X_DST) / (1 - X_SRC);
    const X_Offset = 1 - X_Scale;
    const Y_Scale = (1 - Y_DST) / (1 - Y_SRC);
    const Y_Offset = 1 - Y_Scale;
    const Z_Scale = (1 - Z_DST) / (1 - Z_SRC);
    const Z_Offset = 1 - Z_Scale;
    result[0] = XYZ_Flat[0] * X_Scale + X_Offset;
    result[1] = XYZ_Flat[1] * Y_Scale + Y_Offset;
    result[2] = XYZ_Flat[2] * Z_Scale + Z_Offset;
  }
  #normalizeWhitePointToFlat(sourceWhitePoint, XYZ_In, result) {
    if (sourceWhitePoint[0] === 1 && sourceWhitePoint[2] === 1) {
      result[0] = XYZ_In[0];
      result[1] = XYZ_In[1];
      result[2] = XYZ_In[2];
      return;
    }
    const LMS = result;
    this.#matrixProduct(CalRGBCS.#BRADFORD_SCALE_MATRIX, XYZ_In, LMS);
    const LMS_Flat = CalRGBCS.#tempNormalizeMatrix;
    this.#toFlat(sourceWhitePoint, LMS, LMS_Flat);
    this.#matrixProduct(CalRGBCS.#BRADFORD_SCALE_INVERSE_MATRIX, LMS_Flat, result);
  }
  #normalizeWhitePointToD65(sourceWhitePoint, XYZ_In, result) {
    const LMS = result;
    this.#matrixProduct(CalRGBCS.#BRADFORD_SCALE_MATRIX, XYZ_In, LMS);
    const LMS_D65 = CalRGBCS.#tempNormalizeMatrix;
    this.#toD65(sourceWhitePoint, LMS, LMS_D65);
    this.#matrixProduct(CalRGBCS.#BRADFORD_SCALE_INVERSE_MATRIX, LMS_D65, result);
  }
  #toRgb(src, srcOffset, dest, destOffset, scale) {
    const A = MathClamp(src[srcOffset] * scale, 0, 1);
    const B = MathClamp(src[srcOffset + 1] * scale, 0, 1);
    const C = MathClamp(src[srcOffset + 2] * scale, 0, 1);
    const AGR = A === 1 ? 1 : A ** this.GR;
    const BGG = B === 1 ? 1 : B ** this.GG;
    const CGB = C === 1 ? 1 : C ** this.GB;
    const X = this.MXA * AGR + this.MXB * BGG + this.MXC * CGB;
    const Y = this.MYA * AGR + this.MYB * BGG + this.MYC * CGB;
    const Z = this.MZA * AGR + this.MZB * BGG + this.MZC * CGB;
    const XYZ = CalRGBCS.#tempConvertMatrix1;
    XYZ[0] = X;
    XYZ[1] = Y;
    XYZ[2] = Z;
    const XYZ_Flat = CalRGBCS.#tempConvertMatrix2;
    this.#normalizeWhitePointToFlat(this.whitePoint, XYZ, XYZ_Flat);
    const XYZ_Black = CalRGBCS.#tempConvertMatrix1;
    this.#compensateBlackPoint(this.blackPoint, XYZ_Flat, XYZ_Black);
    const XYZ_D65 = CalRGBCS.#tempConvertMatrix2;
    this.#normalizeWhitePointToD65(CalRGBCS.#FLAT_WHITEPOINT_MATRIX, XYZ_Black, XYZ_D65);
    const SRGB = CalRGBCS.#tempConvertMatrix1;
    this.#matrixProduct(CalRGBCS.#SRGB_D65_XYZ_TO_RGB_MATRIX, XYZ_D65, SRGB);
    dest[destOffset] = this.#sRGBTransferFunction(SRGB[0]) * 255;
    dest[destOffset + 1] = this.#sRGBTransferFunction(SRGB[1]) * 255;
    dest[destOffset + 2] = this.#sRGBTransferFunction(SRGB[2]) * 255;
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    this.#toRgb(src, srcOffset, dest, destOffset, 1);
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const scale = 1 / ((1 << bits) - 1);
    for (let i = 0; i < count; ++i) {
      this.#toRgb(src, srcOffset, dest, destOffset, scale);
      srcOffset += 3;
      destOffset += 3 + alpha01;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength * (3 + alpha01) / 3 | 0;
  }
}
class LabCS extends ColorSpace {
  constructor(whitePoint, blackPoint, range) {
    super("Lab", 3);
    if (!whitePoint) {
      throw new FormatError("WhitePoint missing - required for color space Lab");
    }
    [this.XW, this.YW, this.ZW] = whitePoint;
    [this.amin, this.amax, this.bmin, this.bmax] = range || [-100, 100, -100, 100];
    [this.XB, this.YB, this.ZB] = blackPoint || [0, 0, 0];
    if (this.XW < 0 || this.ZW < 0 || this.YW !== 1) {
      throw new FormatError("Invalid WhitePoint components, no fallback available");
    }
    if (this.XB < 0 || this.YB < 0 || this.ZB < 0) {
      info("Invalid BlackPoint, falling back to default");
      this.XB = this.YB = this.ZB = 0;
    }
    if (this.amin > this.amax || this.bmin > this.bmax) {
      info("Invalid Range, falling back to defaults");
      this.amin = -100;
      this.amax = 100;
      this.bmin = -100;
      this.bmax = 100;
    }
  }
  #fn_g(x) {
    return x >= 6 / 29 ? x ** 3 : 108 / 841 * (x - 4 / 29);
  }
  #decode(value, high1, low2, high2) {
    return low2 + value * (high2 - low2) / high1;
  }
  #toRgb(src, srcOffset, maxVal, dest, destOffset) {
    let Ls = src[srcOffset];
    let as = src[srcOffset + 1];
    let bs = src[srcOffset + 2];
    if (maxVal !== false) {
      Ls = this.#decode(Ls, maxVal, 0, 100);
      as = this.#decode(as, maxVal, this.amin, this.amax);
      bs = this.#decode(bs, maxVal, this.bmin, this.bmax);
    }
    if (as > this.amax) {
      as = this.amax;
    } else if (as < this.amin) {
      as = this.amin;
    }
    if (bs > this.bmax) {
      bs = this.bmax;
    } else if (bs < this.bmin) {
      bs = this.bmin;
    }
    const M = (Ls + 16) / 116;
    const L = M + as / 500;
    const N = M - bs / 200;
    const X = this.XW * this.#fn_g(L);
    const Y = this.YW * this.#fn_g(M);
    const Z = this.ZW * this.#fn_g(N);
    let r, g, b;
    if (this.ZW < 1) {
      r = X * 3.1339 + Y * -1.617 + Z * -0.4906;
      g = X * -0.9785 + Y * 1.916 + Z * 0.0333;
      b = X * 0.072 + Y * -0.229 + Z * 1.4057;
    } else {
      r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
      g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
      b = X * 0.0557 + Y * -0.204 + Z * 1.057;
    }
    dest[destOffset] = Math.sqrt(r) * 255;
    dest[destOffset + 1] = Math.sqrt(g) * 255;
    dest[destOffset + 2] = Math.sqrt(b) * 255;
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    this.#toRgb(src, srcOffset, false, dest, destOffset);
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    const maxVal = (1 << bits) - 1;
    for (let i = 0; i < count; i++) {
      this.#toRgb(src, srcOffset, maxVal, dest, destOffset);
      srcOffset += 3;
      destOffset += 3 + alpha01;
    }
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength * (3 + alpha01) / 3 | 0;
  }
  isDefaultDecode(decodeMap, bpc) {
    return true;
  }
  get usesZeroToOneRange() {
    return shadow(this, "usesZeroToOneRange", false);
  }
}

;// ./external/qcms/qcms_utils.js
class QCMS {
  static #memoryArray = null;
  static _memory = null;
  static _mustAddAlpha = false;
  static _destBuffer = null;
  static _destOffset = 0;
  static _destLength = 0;
  static _cssColor = "";
  static _makeHexColor = null;
  static get _memoryArray() {
    const array = this.#memoryArray;
    if (array?.byteLength) {
      return array;
    }
    return this.#memoryArray = new Uint8Array(this._memory.buffer);
  }
}
function copy_result(ptr, len) {
  const {
    _mustAddAlpha,
    _destBuffer,
    _destOffset,
    _destLength,
    _memoryArray
  } = QCMS;
  if (len === _destLength) {
    _destBuffer.set(_memoryArray.subarray(ptr, ptr + len), _destOffset);
    return;
  }
  if (_mustAddAlpha) {
    for (let i = ptr, ii = ptr + len, j = _destOffset; i < ii; i += 3, j += 4) {
      _destBuffer[j] = _memoryArray[i];
      _destBuffer[j + 1] = _memoryArray[i + 1];
      _destBuffer[j + 2] = _memoryArray[i + 2];
      _destBuffer[j + 3] = 255;
    }
  } else {
    for (let i = ptr, ii = ptr + len, j = _destOffset; i < ii; i += 3, j += 4) {
      _destBuffer[j] = _memoryArray[i];
      _destBuffer[j + 1] = _memoryArray[i + 1];
      _destBuffer[j + 2] = _memoryArray[i + 2];
    }
  }
}
function copy_rgb(ptr) {
  const {
    _destBuffer,
    _destOffset,
    _memoryArray
  } = QCMS;
  _destBuffer[_destOffset] = _memoryArray[ptr];
  _destBuffer[_destOffset + 1] = _memoryArray[ptr + 1];
  _destBuffer[_destOffset + 2] = _memoryArray[ptr + 2];
}
function make_cssRGB(ptr) {
  const {
    _memoryArray
  } = QCMS;
  QCMS._cssColor = QCMS._makeHexColor(_memoryArray[ptr], _memoryArray[ptr + 1], _memoryArray[ptr + 2]);
}

;// ./external/qcms/qcms.js

let wasm;
const cachedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', {
  ignoreBOM: true,
  fatal: true
}) : {
  decode: () => {
    throw Error('TextDecoder not available');
  }
};
if (typeof TextDecoder !== 'undefined') {
  cachedTextDecoder.decode();
}
;
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
let WASM_VECTOR_LEN = 0;
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function qcms_convert_array(transformer, src) {
  const ptr0 = passArray8ToWasm0(src, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  wasm.qcms_convert_array(transformer, ptr0, len0);
}
function qcms_convert_one(transformer, src, css) {
  wasm.qcms_convert_one(transformer, src, css);
}
function qcms_convert_three(transformer, src1, src2, src3, css) {
  wasm.qcms_convert_three(transformer, src1, src2, src3, css);
}
function qcms_convert_four(transformer, src1, src2, src3, src4, css) {
  wasm.qcms_convert_four(transformer, src1, src2, src3, src4, css);
}
function qcms_transformer_from_memory(mem, in_type, intent) {
  const ptr0 = passArray8ToWasm0(mem, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.qcms_transformer_from_memory(ptr0, len0, in_type, intent);
  return ret >>> 0;
}
function qcms_drop_transformer(transformer) {
  wasm.qcms_drop_transformer(transformer);
}
const DataType = Object.freeze({
  RGB8: 0,
  "0": "RGB8",
  RGBA8: 1,
  "1": "RGBA8",
  BGRA8: 2,
  "2": "BGRA8",
  Gray8: 3,
  "3": "Gray8",
  GrayA8: 4,
  "4": "GrayA8",
  CMYK: 5,
  "5": "CMYK"
});
const Intent = Object.freeze({
  Perceptual: 0,
  "0": "Perceptual",
  RelativeColorimetric: 1,
  "1": "RelativeColorimetric",
  Saturation: 2,
  "2": "Saturation",
  AbsoluteColorimetric: 3,
  "3": "AbsoluteColorimetric"
});
async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get('Content-Type') != 'application/wasm') {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return {
        instance,
        module
      };
    } else {
      return instance;
    }
  }
}
function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbg_copyresult_b08ee7d273f295dd = function (arg0, arg1) {
    copy_result(arg0 >>> 0, arg1 >>> 0);
  };
  imports.wbg.__wbg_copyrgb_d60ce17bb05d9b67 = function (arg0) {
    copy_rgb(arg0 >>> 0);
  };
  imports.wbg.__wbg_makecssRGB_893bf0cd9fdb302d = function (arg0) {
    make_cssRGB(arg0 >>> 0);
  };
  imports.wbg.__wbindgen_init_externref_table = function () {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
  };
  imports.wbg.__wbindgen_throw = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  return imports;
}
function __wbg_init_memory(imports, memory) {}
function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}
function initSync(module) {
  if (wasm !== undefined) return wasm;
  if (typeof module !== 'undefined') {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({
        module
      } = module);
    } else {
      console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
    }
  }
  const imports = __wbg_get_imports();
  __wbg_init_memory(imports);
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}
async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;
  if (typeof module_or_path !== 'undefined') {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({
        module_or_path
      } = module_or_path);
    } else {
      console.warn('using deprecated parameters for the initialization function; pass a single object instead');
    }
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === 'string' || typeof Request === 'function' && module_or_path instanceof Request || typeof URL === 'function' && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  __wbg_init_memory(imports);
  const {
    instance,
    module
  } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module);
}

/* harmony default export */ const qcms = ((/* unused pure expression or super */ null && (__wbg_init)));
;// ./src/core/icc_colorspace.js




function fetchSync(url) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.responseType = "arraybuffer";
  xhr.send(null);
  return xhr.response;
}
class IccColorSpace extends ColorSpace {
  #transformer;
  #convertPixel;
  static #useWasm = true;
  static #wasmUrl = null;
  static #finalizer = new FinalizationRegistry(transformer => {
    qcms_drop_transformer(transformer);
  });
  constructor(iccProfile, name, numComps) {
    if (!IccColorSpace.isUsable) {
      throw new Error("No ICC color space support");
    }
    super(name, numComps);
    let inType;
    switch (numComps) {
      case 1:
        inType = DataType.Gray8;
        this.#convertPixel = (src, srcOffset, css) => qcms_convert_one(this.#transformer, src[srcOffset] * 255, css);
        break;
      case 3:
        inType = DataType.RGB8;
        this.#convertPixel = (src, srcOffset, css) => qcms_convert_three(this.#transformer, src[srcOffset] * 255, src[srcOffset + 1] * 255, src[srcOffset + 2] * 255, css);
        break;
      case 4:
        inType = DataType.CMYK;
        this.#convertPixel = (src, srcOffset, css) => qcms_convert_four(this.#transformer, src[srcOffset] * 255, src[srcOffset + 1] * 255, src[srcOffset + 2] * 255, src[srcOffset + 3] * 255, css);
        break;
      default:
        throw new Error(`Unsupported number of components: ${numComps}`);
    }
    this.#transformer = qcms_transformer_from_memory(iccProfile, inType, Intent.Perceptual);
    if (!this.#transformer) {
      throw new Error("Failed to create ICC color space");
    }
    IccColorSpace.#finalizer.register(this, this.#transformer);
  }
  getRgbHex(src, srcOffset) {
    this.#convertPixel(src, srcOffset, true);
    return QCMS._cssColor;
  }
  getRgbItem(src, srcOffset, dest, destOffset) {
    QCMS._destBuffer = dest;
    QCMS._destOffset = destOffset;
    QCMS._destLength = 3;
    this.#convertPixel(src, srcOffset, false);
    QCMS._destBuffer = null;
  }
  getRgbBuffer(src, srcOffset, count, dest, destOffset, bits, alpha01) {
    src = src.subarray(srcOffset, srcOffset + count * this.numComps);
    if (bits !== 8) {
      const scale = 255 / ((1 << bits) - 1);
      for (let i = 0, ii = src.length; i < ii; i++) {
        src[i] *= scale;
      }
    }
    QCMS._mustAddAlpha = alpha01 && dest.buffer === src.buffer;
    QCMS._destBuffer = dest;
    QCMS._destOffset = destOffset;
    QCMS._destLength = count * (3 + alpha01);
    qcms_convert_array(this.#transformer, src);
    QCMS._mustAddAlpha = false;
    QCMS._destBuffer = null;
  }
  getOutputLength(inputLength, alpha01) {
    return inputLength / this.numComps * (3 + alpha01) | 0;
  }
  static setOptions({
    useWasm,
    useWorkerFetch,
    wasmUrl
  }) {
    if (!useWorkerFetch) {
      this.#useWasm = false;
      return;
    }
    this.#useWasm = useWasm;
    this.#wasmUrl = wasmUrl;
  }
  static get isUsable() {
    let isUsable = false;
    if (this.#useWasm) {
      if (this.#wasmUrl) {
        try {
          this._module = initSync({
            module: fetchSync(`${this.#wasmUrl}qcms_bg.wasm`)
          });
          isUsable = !!this._module;
          QCMS._memory = this._module.memory;
          QCMS._makeHexColor = util_Util.makeHexColor;
        } catch (e) {
          util_warn(`ICCBased color space: "${e}".`);
        }
      } else {
        util_warn("No ICC color space support due to missing `wasmUrl` API option");
      }
    }
    return shadow(this, "isUsable", isUsable);
  }
}
class CmykICCBasedCS extends IccColorSpace {
  static #iccUrl;
  constructor() {
    const iccProfile = new Uint8Array(fetchSync(`${CmykICCBasedCS.#iccUrl}CGATS001Compat-v2-micro.icc`));
    super(iccProfile, "DeviceCMYK", 4);
  }
  static setOptions({
    iccUrl
  }) {
    this.#iccUrl = iccUrl;
  }
  static get isUsable() {
    let isUsable = false;
    if (IccColorSpace.isUsable) {
      if (this.#iccUrl) {
        isUsable = true;
      } else {
        util_warn("No CMYK ICC profile support due to missing `iccUrl` API option");
      }
    }
    return shadow(this, "isUsable", isUsable);
  }
}

;// ./src/core/colorspace_utils.js





class ColorSpaceUtils {
  static parse({
    cs,
    xref,
    resources = null,
    pdfFunctionFactory,
    globalColorSpaceCache,
    localColorSpaceCache,
    asyncIfNotCached = false
  }) {
    const options = {
      xref,
      resources,
      pdfFunctionFactory,
      globalColorSpaceCache,
      localColorSpaceCache
    };
    let csName, csRef, parsedCS;
    if (cs instanceof primitives_Ref) {
      csRef = cs;
      const cachedCS = globalColorSpaceCache.getByRef(csRef) || localColorSpaceCache.getByRef(csRef);
      if (cachedCS) {
        return cachedCS;
      }
      cs = xref.fetch(cs);
    }
    if (cs instanceof Name) {
      csName = cs.name;
      const cachedCS = localColorSpaceCache.getByName(csName);
      if (cachedCS) {
        return cachedCS;
      }
    }
    try {
      parsedCS = this.#parse(cs, options);
    } catch (ex) {
      if (asyncIfNotCached && !(ex instanceof MissingDataException)) {
        return Promise.reject(ex);
      }
      throw ex;
    }
    if (csName || csRef) {
      localColorSpaceCache.set(csName, csRef, parsedCS);
      if (csRef) {
        globalColorSpaceCache.set(null, csRef, parsedCS);
      }
    }
    return asyncIfNotCached ? Promise.resolve(parsedCS) : parsedCS;
  }
  static #subParse(cs, options) {
    const {
      globalColorSpaceCache
    } = options;
    let csRef;
    if (cs instanceof primitives_Ref) {
      csRef = cs;
      const cachedCS = globalColorSpaceCache.getByRef(csRef);
      if (cachedCS) {
        return cachedCS;
      }
    }
    const parsedCS = this.#parse(cs, options);
    if (csRef) {
      globalColorSpaceCache.set(null, csRef, parsedCS);
    }
    return parsedCS;
  }
  static #parse(cs, options) {
    const {
      xref,
      resources,
      pdfFunctionFactory,
      globalColorSpaceCache
    } = options;
    cs = xref.fetchIfRef(cs);
    if (cs instanceof Name) {
      switch (cs.name) {
        case "G":
        case "DeviceGray":
          return this.gray;
        case "RGB":
        case "DeviceRGB":
          return this.rgb;
        case "DeviceRGBA":
          return this.rgba;
        case "CMYK":
        case "DeviceCMYK":
          return this.cmyk;
        case "Pattern":
          return new PatternCS(null);
        default:
          if (resources instanceof primitives_Dict) {
            const colorSpaces = resources.get("ColorSpace");
            if (colorSpaces instanceof primitives_Dict) {
              const resourcesCS = colorSpaces.get(cs.name);
              if (resourcesCS) {
                if (resourcesCS instanceof Name) {
                  return this.#parse(resourcesCS, options);
                }
                cs = resourcesCS;
                break;
              }
            }
          }
          util_warn(`Unrecognized ColorSpace: ${cs.name}`);
          return this.gray;
      }
    }
    if (Array.isArray(cs)) {
      const mode = xref.fetchIfRef(cs[0]).name;
      let params, numComps, baseCS, whitePoint, blackPoint, gamma;
      switch (mode) {
        case "G":
        case "DeviceGray":
          return this.gray;
        case "RGB":
        case "DeviceRGB":
          return this.rgb;
        case "CMYK":
        case "DeviceCMYK":
          return this.cmyk;
        case "CalGray":
          params = xref.fetchIfRef(cs[1]);
          whitePoint = params.getArray("WhitePoint");
          blackPoint = params.getArray("BlackPoint");
          gamma = params.get("Gamma");
          return new CalGrayCS(whitePoint, blackPoint, gamma);
        case "CalRGB":
          params = xref.fetchIfRef(cs[1]);
          whitePoint = params.getArray("WhitePoint");
          blackPoint = params.getArray("BlackPoint");
          gamma = params.getArray("Gamma");
          const matrix = params.getArray("Matrix");
          return new CalRGBCS(whitePoint, blackPoint, gamma, matrix);
        case "ICCBased":
          const isRef = cs[1] instanceof primitives_Ref;
          if (isRef) {
            const cachedCS = globalColorSpaceCache.getByRef(cs[1]);
            if (cachedCS) {
              return cachedCS;
            }
          }
          const stream = xref.fetchIfRef(cs[1]);
          const dict = stream.dict;
          numComps = dict.get("N");
          if (IccColorSpace.isUsable) {
            try {
              const iccCS = new IccColorSpace(stream.getBytes(), "ICCBased", numComps);
              if (isRef) {
                globalColorSpaceCache.set(null, cs[1], iccCS);
              }
              return iccCS;
            } catch (ex) {
              if (ex instanceof MissingDataException) {
                throw ex;
              }
              util_warn(`ICCBased color space (${cs[1]}): "${ex}".`);
            }
          }
          const altRaw = dict.getRaw("Alternate");
          if (altRaw) {
            const altCS = this.#subParse(altRaw, options);
            if (altCS.numComps === numComps) {
              return altCS;
            }
            util_warn("ICCBased color space: Ignoring incorrect /Alternate entry.");
          }
          if (numComps === 1) {
            return this.gray;
          } else if (numComps === 3) {
            return this.rgb;
          } else if (numComps === 4) {
            return this.cmyk;
          }
          break;
        case "Pattern":
          baseCS = cs[1] || null;
          if (baseCS) {
            baseCS = this.#subParse(baseCS, options);
          }
          return new PatternCS(baseCS);
        case "I":
        case "Indexed":
          baseCS = this.#subParse(cs[1], options);
          const hiVal = MathClamp(xref.fetchIfRef(cs[2]), 0, 255);
          const lookup = xref.fetchIfRef(cs[3]);
          return new IndexedCS(baseCS, hiVal, lookup);
        case "Separation":
        case "DeviceN":
          const name = xref.fetchIfRef(cs[1]);
          numComps = Array.isArray(name) ? name.length : 1;
          baseCS = this.#subParse(cs[2], options);
          const tintFn = pdfFunctionFactory.create(cs[3]);
          return new AlternateCS(numComps, baseCS, tintFn);
        case "Lab":
          params = xref.fetchIfRef(cs[1]);
          whitePoint = params.getArray("WhitePoint");
          blackPoint = params.getArray("BlackPoint");
          const range = params.getArray("Range");
          return new LabCS(whitePoint, blackPoint, range);
        default:
          util_warn(`Unimplemented ColorSpace object: ${mode}`);
          return this.gray;
      }
    }
    util_warn(`Unrecognized ColorSpace object: ${cs}`);
    return this.gray;
  }
  static get gray() {
    return shadow(this, "gray", new DeviceGrayCS());
  }
  static get rgb() {
    return shadow(this, "rgb", new DeviceRgbCS());
  }
  static get rgba() {
    return shadow(this, "rgba", new DeviceRgbaCS());
  }
  static get cmyk() {
    if (CmykICCBasedCS.isUsable) {
      try {
        return shadow(this, "cmyk", new CmykICCBasedCS());
      } catch {
        util_warn("CMYK fallback: DeviceCMYK");
      }
    }
    return shadow(this, "cmyk", new DeviceCmykCS());
  }
}

;// ./src/shared/image_utils.js

function convertToRGBA(params) {
  switch (params.kind) {
    case ImageKind.GRAYSCALE_1BPP:
      return convertBlackAndWhiteToRGBA(params);
    case ImageKind.RGB_24BPP:
      return convertRGBToRGBA(params);
  }
  return null;
}
function convertBlackAndWhiteToRGBA({
  src,
  srcPos = 0,
  dest,
  width,
  height,
  nonBlackColor = 0xffffffff,
  inverseDecode = false
}) {
  const black = FeatureTest.isLittleEndian ? 0xff000000 : 0x000000ff;
  const [zeroMapping, oneMapping] = inverseDecode ? [nonBlackColor, black] : [black, nonBlackColor];
  const widthInSource = width >> 3;
  const widthRemainder = width & 7;
  const srcLength = src.length;
  dest = new Uint32Array(dest.buffer);
  let destPos = 0;
  for (let i = 0; i < height; i++) {
    for (const max = srcPos + widthInSource; srcPos < max; srcPos++) {
      const elem = srcPos < srcLength ? src[srcPos] : 255;
      dest[destPos++] = elem & 0b10000000 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b1000000 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b100000 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b10000 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b1000 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b100 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b10 ? oneMapping : zeroMapping;
      dest[destPos++] = elem & 0b1 ? oneMapping : zeroMapping;
    }
    if (widthRemainder === 0) {
      continue;
    }
    const elem = srcPos < srcLength ? src[srcPos++] : 255;
    for (let j = 0; j < widthRemainder; j++) {
      dest[destPos++] = elem & 1 << 7 - j ? oneMapping : zeroMapping;
    }
  }
  return {
    srcPos,
    destPos
  };
}
function convertRGBToRGBA({
  src,
  srcPos = 0,
  dest,
  destPos = 0,
  width,
  height
}) {
  let i = 0;
  const len = width * height * 3;
  const len32 = len >> 2;
  const src32 = new Uint32Array(src.buffer, srcPos, len32);
  if (FeatureTest.isLittleEndian) {
    for (; i < len32 - 2; i += 3, destPos += 4) {
      const s1 = src32[i];
      const s2 = src32[i + 1];
      const s3 = src32[i + 2];
      dest[destPos] = s1 | 0xff000000;
      dest[destPos + 1] = s1 >>> 24 | s2 << 8 | 0xff000000;
      dest[destPos + 2] = s2 >>> 16 | s3 << 16 | 0xff000000;
      dest[destPos + 3] = s3 >>> 8 | 0xff000000;
    }
    for (let j = i * 4, jj = srcPos + len; j < jj; j += 3) {
      dest[destPos++] = src[j] | src[j + 1] << 8 | src[j + 2] << 16 | 0xff000000;
    }
  } else {
    for (; i < len32 - 2; i += 3, destPos += 4) {
      const s1 = src32[i];
      const s2 = src32[i + 1];
      const s3 = src32[i + 2];
      dest[destPos] = s1 | 0xff;
      dest[destPos + 1] = s1 << 24 | s2 >>> 8 | 0xff;
      dest[destPos + 2] = s2 << 16 | s3 >>> 16 | 0xff;
      dest[destPos + 3] = s3 << 8 | 0xff;
    }
    for (let j = i * 4, jj = srcPos + len; j < jj; j += 3) {
      dest[destPos++] = src[j] << 24 | src[j + 1] << 16 | src[j + 2] << 8 | 0xff;
    }
  }
  return {
    srcPos: srcPos + len,
    destPos
  };
}
function grayToRGBA(src, dest) {
  if (util_FeatureTest.isLittleEndian) {
    for (let i = 0, ii = src.length; i < ii; i++) {
      dest[i] = src[i] * 0x10101 | 0xff000000;
    }
  } else {
    for (let i = 0, ii = src.length; i < ii; i++) {
      dest[i] = src[i] * 0x1010100 | 0x000000ff;
    }
  }
}

;// ./src/core/jpg.js





class JpegError extends BaseException {
  constructor(msg) {
    super(msg, "JpegError");
  }
}
class DNLMarkerError extends BaseException {
  constructor(message, scanLines) {
    super(message, "DNLMarkerError");
    this.scanLines = scanLines;
  }
}
class EOIMarkerError extends BaseException {
  constructor(msg) {
    super(msg, "EOIMarkerError");
  }
}
const dctZigZag = new Uint8Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]);
const dctCos1 = 4017;
const dctSin1 = 799;
const dctCos3 = 3406;
const dctSin3 = 2276;
const dctCos6 = 1567;
const dctSin6 = 3784;
const dctSqrt2 = 5793;
const dctSqrt1d2 = 2896;
function buildHuffmanTable(codeLengths, values) {
  let k = 0,
    i,
    j,
    length = 16;
  while (length > 0 && !codeLengths[length - 1]) {
    length--;
  }
  const code = [{
    children: [],
    index: 0
  }];
  let p = code[0],
    q;
  for (i = 0; i < length; i++) {
    for (j = 0; j < codeLengths[i]; j++) {
      p = code.pop();
      p.children[p.index] = values[k];
      while (p.index > 0) {
        p = code.pop();
      }
      p.index++;
      code.push(p);
      while (code.length <= i) {
        code.push(q = {
          children: [],
          index: 0
        });
        p.children[p.index] = q.children;
        p = q;
      }
      k++;
    }
    if (i + 1 < length) {
      code.push(q = {
        children: [],
        index: 0
      });
      p.children[p.index] = q.children;
      p = q;
    }
  }
  return code[0].children;
}
function getBlockBufferOffset(component, row, col) {
  return 64 * ((component.blocksPerLine + 1) * row + col);
}
function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, parseDNLMarker = false) {
  const mcusPerLine = frame.mcusPerLine;
  const progressive = frame.progressive;
  const startOffset = offset;
  let bitsData = 0,
    bitsCount = 0;
  function readBit() {
    if (bitsCount > 0) {
      bitsCount--;
      return bitsData >> bitsCount & 1;
    }
    bitsData = data[offset++];
    if (bitsData === 0xff) {
      const nextByte = data[offset++];
      if (nextByte) {
        if (nextByte === 0xdc && parseDNLMarker) {
          offset += 2;
          const scanLines = readUint16(data, offset);
          offset += 2;
          if (scanLines > 0 && scanLines !== frame.scanLines) {
            throw new DNLMarkerError("Found DNL marker (0xFFDC) while parsing scan data", scanLines);
          }
        } else if (nextByte === 0xd9) {
          if (parseDNLMarker) {
            const maybeScanLines = blockRow * (frame.precision === 8 ? 8 : 0);
            if (maybeScanLines > 0 && Math.round(frame.scanLines / maybeScanLines) >= 5) {
              throw new DNLMarkerError("Found EOI marker (0xFFD9) while parsing scan data, " + "possibly caused by incorrect `scanLines` parameter", maybeScanLines);
            }
          }
          throw new EOIMarkerError("Found EOI marker (0xFFD9) while parsing scan data");
        }
        throw new JpegError(`unexpected marker ${(bitsData << 8 | nextByte).toString(16)}`);
      }
    }
    bitsCount = 7;
    return bitsData >>> 7;
  }
  function decodeHuffman(tree) {
    let node = tree;
    while (true) {
      node = node[readBit()];
      switch (typeof node) {
        case "number":
          return node;
        case "object":
          continue;
      }
      throw new JpegError("invalid huffman sequence");
    }
  }
  function receive(length) {
    let n = 0;
    while (length > 0) {
      n = n << 1 | readBit();
      length--;
    }
    return n;
  }
  function receiveAndExtend(length) {
    if (length === 1) {
      return readBit() === 1 ? 1 : -1;
    }
    const n = receive(length);
    if (n >= 1 << length - 1) {
      return n;
    }
    return n + (-1 << length) + 1;
  }
  function decodeBaseline(component, blockOffset) {
    const t = decodeHuffman(component.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t);
    component.blockData[blockOffset] = component.pred += diff;
    let k = 1;
    while (k < 64) {
      const rs = decodeHuffman(component.huffmanTableAC);
      const s = rs & 15,
        r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          break;
        }
        k += 16;
        continue;
      }
      k += r;
      const z = dctZigZag[k];
      component.blockData[blockOffset + z] = receiveAndExtend(s);
      k++;
    }
  }
  function decodeDCFirst(component, blockOffset) {
    const t = decodeHuffman(component.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
    component.blockData[blockOffset] = component.pred += diff;
  }
  function decodeDCSuccessive(component, blockOffset) {
    component.blockData[blockOffset] |= readBit() << successive;
  }
  let eobrun = 0;
  function decodeACFirst(component, blockOffset) {
    if (eobrun > 0) {
      eobrun--;
      return;
    }
    let k = spectralStart;
    const e = spectralEnd;
    while (k <= e) {
      const rs = decodeHuffman(component.huffmanTableAC);
      const s = rs & 15,
        r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          eobrun = receive(r) + (1 << r) - 1;
          break;
        }
        k += 16;
        continue;
      }
      k += r;
      const z = dctZigZag[k];
      component.blockData[blockOffset + z] = receiveAndExtend(s) * (1 << successive);
      k++;
    }
  }
  let successiveACState = 0,
    successiveACNextValue;
  function decodeACSuccessive(component, blockOffset) {
    let k = spectralStart;
    const e = spectralEnd;
    let r = 0;
    let s;
    let rs;
    while (k <= e) {
      const offsetZ = blockOffset + dctZigZag[k];
      const sign = component.blockData[offsetZ] < 0 ? -1 : 1;
      switch (successiveACState) {
        case 0:
          rs = decodeHuffman(component.huffmanTableAC);
          s = rs & 15;
          r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = receive(r) + (1 << r);
              successiveACState = 4;
            } else {
              r = 16;
              successiveACState = 1;
            }
          } else {
            if (s !== 1) {
              throw new JpegError("invalid ACn encoding");
            }
            successiveACNextValue = receiveAndExtend(s);
            successiveACState = r ? 2 : 3;
          }
          continue;
        case 1:
        case 2:
          if (component.blockData[offsetZ]) {
            component.blockData[offsetZ] += sign * (readBit() << successive);
          } else {
            r--;
            if (r === 0) {
              successiveACState = successiveACState === 2 ? 3 : 0;
            }
          }
          break;
        case 3:
          if (component.blockData[offsetZ]) {
            component.blockData[offsetZ] += sign * (readBit() << successive);
          } else {
            component.blockData[offsetZ] = successiveACNextValue << successive;
            successiveACState = 0;
          }
          break;
        case 4:
          if (component.blockData[offsetZ]) {
            component.blockData[offsetZ] += sign * (readBit() << successive);
          }
          break;
      }
      k++;
    }
    if (successiveACState === 4) {
      eobrun--;
      if (eobrun === 0) {
        successiveACState = 0;
      }
    }
  }
  let blockRow = 0;
  function decodeMcu(component, decode, mcu, row, col) {
    const mcuRow = mcu / mcusPerLine | 0;
    const mcuCol = mcu % mcusPerLine;
    blockRow = mcuRow * component.v + row;
    const blockCol = mcuCol * component.h + col;
    const blockOffset = getBlockBufferOffset(component, blockRow, blockCol);
    decode(component, blockOffset);
  }
  function decodeBlock(component, decode, mcu) {
    blockRow = mcu / component.blocksPerLine | 0;
    const blockCol = mcu % component.blocksPerLine;
    const blockOffset = getBlockBufferOffset(component, blockRow, blockCol);
    decode(component, blockOffset);
  }
  const componentsLength = components.length;
  let component, i, j, k, n;
  let decodeFn;
  if (progressive) {
    if (spectralStart === 0) {
      decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
    } else {
      decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
    }
  } else {
    decodeFn = decodeBaseline;
  }
  let mcu = 0,
    fileMarker;
  const mcuExpected = componentsLength === 1 ? components[0].blocksPerLine * components[0].blocksPerColumn : mcusPerLine * frame.mcusPerColumn;
  let h, v;
  while (mcu <= mcuExpected) {
    const mcuToRead = resetInterval ? Math.min(mcuExpected - mcu, resetInterval) : mcuExpected;
    if (mcuToRead > 0) {
      for (i = 0; i < componentsLength; i++) {
        components[i].pred = 0;
      }
      eobrun = 0;
      if (componentsLength === 1) {
        component = components[0];
        for (n = 0; n < mcuToRead; n++) {
          decodeBlock(component, decodeFn, mcu);
          mcu++;
        }
      } else {
        for (n = 0; n < mcuToRead; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i];
            h = component.h;
            v = component.v;
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu(component, decodeFn, mcu, j, k);
              }
            }
          }
          mcu++;
        }
      }
    }
    bitsCount = 0;
    fileMarker = findNextFileMarker(data, offset);
    if (!fileMarker) {
      break;
    }
    if (fileMarker.invalid) {
      const partialMsg = mcuToRead > 0 ? "unexpected" : "excessive";
      util_warn(`decodeScan - ${partialMsg} MCU data, current marker is: ${fileMarker.invalid}`);
      offset = fileMarker.offset;
    }
    if (fileMarker.marker >= 0xffd0 && fileMarker.marker <= 0xffd7) {
      offset += 2;
    } else {
      break;
    }
  }
  return offset - startOffset;
}
function quantizeAndInverse(component, blockBufferOffset, p) {
  const qt = component.quantizationTable,
    blockData = component.blockData;
  let v0, v1, v2, v3, v4, v5, v6, v7;
  let p0, p1, p2, p3, p4, p5, p6, p7;
  let t;
  if (!qt) {
    throw new JpegError("missing required Quantization Table.");
  }
  for (let row = 0; row < 64; row += 8) {
    p0 = blockData[blockBufferOffset + row];
    p1 = blockData[blockBufferOffset + row + 1];
    p2 = blockData[blockBufferOffset + row + 2];
    p3 = blockData[blockBufferOffset + row + 3];
    p4 = blockData[blockBufferOffset + row + 4];
    p5 = blockData[blockBufferOffset + row + 5];
    p6 = blockData[blockBufferOffset + row + 6];
    p7 = blockData[blockBufferOffset + row + 7];
    p0 *= qt[row];
    if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
      t = dctSqrt2 * p0 + 512 >> 10;
      p[row] = t;
      p[row + 1] = t;
      p[row + 2] = t;
      p[row + 3] = t;
      p[row + 4] = t;
      p[row + 5] = t;
      p[row + 6] = t;
      p[row + 7] = t;
      continue;
    }
    p1 *= qt[row + 1];
    p2 *= qt[row + 2];
    p3 *= qt[row + 3];
    p4 *= qt[row + 4];
    p5 *= qt[row + 5];
    p6 *= qt[row + 6];
    p7 *= qt[row + 7];
    v0 = dctSqrt2 * p0 + 128 >> 8;
    v1 = dctSqrt2 * p4 + 128 >> 8;
    v2 = p2;
    v3 = p6;
    v4 = dctSqrt1d2 * (p1 - p7) + 128 >> 8;
    v7 = dctSqrt1d2 * (p1 + p7) + 128 >> 8;
    v5 = p3 << 4;
    v6 = p5 << 4;
    v0 = v0 + v1 + 1 >> 1;
    v1 = v0 - v1;
    t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
    v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
    v3 = t;
    v4 = v4 + v6 + 1 >> 1;
    v6 = v4 - v6;
    v7 = v7 + v5 + 1 >> 1;
    v5 = v7 - v5;
    v0 = v0 + v3 + 1 >> 1;
    v3 = v0 - v3;
    v1 = v1 + v2 + 1 >> 1;
    v2 = v1 - v2;
    t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
    v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
    v7 = t;
    t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
    v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
    v6 = t;
    p[row] = v0 + v7;
    p[row + 7] = v0 - v7;
    p[row + 1] = v1 + v6;
    p[row + 6] = v1 - v6;
    p[row + 2] = v2 + v5;
    p[row + 5] = v2 - v5;
    p[row + 3] = v3 + v4;
    p[row + 4] = v3 - v4;
  }
  for (let col = 0; col < 8; ++col) {
    p0 = p[col];
    p1 = p[col + 8];
    p2 = p[col + 16];
    p3 = p[col + 24];
    p4 = p[col + 32];
    p5 = p[col + 40];
    p6 = p[col + 48];
    p7 = p[col + 56];
    if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
      t = dctSqrt2 * p0 + 8192 >> 14;
      if (t < -2040) {
        t = 0;
      } else if (t >= 2024) {
        t = 255;
      } else {
        t = t + 2056 >> 4;
      }
      blockData[blockBufferOffset + col] = t;
      blockData[blockBufferOffset + col + 8] = t;
      blockData[blockBufferOffset + col + 16] = t;
      blockData[blockBufferOffset + col + 24] = t;
      blockData[blockBufferOffset + col + 32] = t;
      blockData[blockBufferOffset + col + 40] = t;
      blockData[blockBufferOffset + col + 48] = t;
      blockData[blockBufferOffset + col + 56] = t;
      continue;
    }
    v0 = dctSqrt2 * p0 + 2048 >> 12;
    v1 = dctSqrt2 * p4 + 2048 >> 12;
    v2 = p2;
    v3 = p6;
    v4 = dctSqrt1d2 * (p1 - p7) + 2048 >> 12;
    v7 = dctSqrt1d2 * (p1 + p7) + 2048 >> 12;
    v5 = p3;
    v6 = p5;
    v0 = (v0 + v1 + 1 >> 1) + 4112;
    v1 = v0 - v1;
    t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
    v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
    v3 = t;
    v4 = v4 + v6 + 1 >> 1;
    v6 = v4 - v6;
    v7 = v7 + v5 + 1 >> 1;
    v5 = v7 - v5;
    v0 = v0 + v3 + 1 >> 1;
    v3 = v0 - v3;
    v1 = v1 + v2 + 1 >> 1;
    v2 = v1 - v2;
    t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
    v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
    v7 = t;
    t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
    v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
    v6 = t;
    p0 = v0 + v7;
    p7 = v0 - v7;
    p1 = v1 + v6;
    p6 = v1 - v6;
    p2 = v2 + v5;
    p5 = v2 - v5;
    p3 = v3 + v4;
    p4 = v3 - v4;
    if (p0 < 16) {
      p0 = 0;
    } else if (p0 >= 4080) {
      p0 = 255;
    } else {
      p0 >>= 4;
    }
    if (p1 < 16) {
      p1 = 0;
    } else if (p1 >= 4080) {
      p1 = 255;
    } else {
      p1 >>= 4;
    }
    if (p2 < 16) {
      p2 = 0;
    } else if (p2 >= 4080) {
      p2 = 255;
    } else {
      p2 >>= 4;
    }
    if (p3 < 16) {
      p3 = 0;
    } else if (p3 >= 4080) {
      p3 = 255;
    } else {
      p3 >>= 4;
    }
    if (p4 < 16) {
      p4 = 0;
    } else if (p4 >= 4080) {
      p4 = 255;
    } else {
      p4 >>= 4;
    }
    if (p5 < 16) {
      p5 = 0;
    } else if (p5 >= 4080) {
      p5 = 255;
    } else {
      p5 >>= 4;
    }
    if (p6 < 16) {
      p6 = 0;
    } else if (p6 >= 4080) {
      p6 = 255;
    } else {
      p6 >>= 4;
    }
    if (p7 < 16) {
      p7 = 0;
    } else if (p7 >= 4080) {
      p7 = 255;
    } else {
      p7 >>= 4;
    }
    blockData[blockBufferOffset + col] = p0;
    blockData[blockBufferOffset + col + 8] = p1;
    blockData[blockBufferOffset + col + 16] = p2;
    blockData[blockBufferOffset + col + 24] = p3;
    blockData[blockBufferOffset + col + 32] = p4;
    blockData[blockBufferOffset + col + 40] = p5;
    blockData[blockBufferOffset + col + 48] = p6;
    blockData[blockBufferOffset + col + 56] = p7;
  }
}
function buildComponentData(frame, component) {
  const blocksPerLine = component.blocksPerLine;
  const blocksPerColumn = component.blocksPerColumn;
  const computationBuffer = new Int16Array(64);
  for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
    for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
      const offset = getBlockBufferOffset(component, blockRow, blockCol);
      quantizeAndInverse(component, offset, computationBuffer);
    }
  }
  return component.blockData;
}
function findNextFileMarker(data, currentPos, startPos = currentPos) {
  const maxPos = data.length - 1;
  let newPos = startPos < currentPos ? startPos : currentPos;
  if (currentPos >= maxPos) {
    return null;
  }
  const currentMarker = readUint16(data, currentPos);
  if (currentMarker >= 0xffc0 && currentMarker <= 0xfffe) {
    return {
      invalid: null,
      marker: currentMarker,
      offset: currentPos
    };
  }
  let newMarker = readUint16(data, newPos);
  while (!(newMarker >= 0xffc0 && newMarker <= 0xfffe)) {
    if (++newPos >= maxPos) {
      return null;
    }
    newMarker = readUint16(data, newPos);
  }
  return {
    invalid: currentMarker.toString(16),
    marker: newMarker,
    offset: newPos
  };
}
function prepareComponents(frame) {
  const mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / frame.maxH);
  const mcusPerColumn = Math.ceil(frame.scanLines / 8 / frame.maxV);
  for (const component of frame.components) {
    const blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / frame.maxH);
    const blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) * component.v / frame.maxV);
    const blocksPerLineForMcu = mcusPerLine * component.h;
    const blocksPerColumnForMcu = mcusPerColumn * component.v;
    const blocksBufferSize = 64 * blocksPerColumnForMcu * (blocksPerLineForMcu + 1);
    component.blockData = new Int16Array(blocksBufferSize);
    component.blocksPerLine = blocksPerLine;
    component.blocksPerColumn = blocksPerColumn;
  }
  frame.mcusPerLine = mcusPerLine;
  frame.mcusPerColumn = mcusPerColumn;
}
function readDataBlock(data, offset) {
  const length = readUint16(data, offset);
  offset += 2;
  let endOffset = offset + length - 2;
  const fileMarker = findNextFileMarker(data, endOffset, offset);
  if (fileMarker?.invalid) {
    util_warn("readDataBlock - incorrect length, current marker is: " + fileMarker.invalid);
    endOffset = fileMarker.offset;
  }
  const array = data.subarray(offset, endOffset);
  return {
    appData: array,
    oldOffset: offset,
    newOffset: offset + array.length
  };
}
function skipData(data, offset) {
  const length = readUint16(data, offset);
  offset += 2;
  const endOffset = offset + length - 2;
  const fileMarker = findNextFileMarker(data, endOffset, offset);
  if (fileMarker?.invalid) {
    return fileMarker.offset;
  }
  return endOffset;
}
class JpegImage {
  constructor({
    decodeTransform = null,
    colorTransform = -1
  } = {}) {
    this._decodeTransform = decodeTransform;
    this._colorTransform = colorTransform;
  }
  static canUseImageDecoder(data, colorTransform = -1) {
    let exifOffsets = null;
    let offset = 0;
    let numComponents = null;
    let fileMarker = readUint16(data, offset);
    offset += 2;
    if (fileMarker !== 0xffd8) {
      throw new JpegError("SOI not found");
    }
    fileMarker = readUint16(data, offset);
    offset += 2;
    markerLoop: while (fileMarker !== 0xffd9) {
      switch (fileMarker) {
        case 0xffe1:
          const {
            appData,
            oldOffset,
            newOffset
          } = readDataBlock(data, offset);
          offset = newOffset;
          if (appData[0] === 0x45 && appData[1] === 0x78 && appData[2] === 0x69 && appData[3] === 0x66 && appData[4] === 0 && appData[5] === 0) {
            if (exifOffsets) {
              throw new JpegError("Duplicate EXIF-blocks found.");
            }
            exifOffsets = {
              exifStart: oldOffset + 6,
              exifEnd: newOffset
            };
          }
          fileMarker = readUint16(data, offset);
          offset += 2;
          continue;
        case 0xffc0:
        case 0xffc1:
        case 0xffc2:
          numComponents = data[offset + (2 + 1 + 2 + 2)];
          break markerLoop;
        case 0xffff:
          if (data[offset] !== 0xff) {
            offset--;
          }
          break;
      }
      offset = skipData(data, offset);
      fileMarker = readUint16(data, offset);
      offset += 2;
    }
    if (numComponents === 4) {
      return null;
    }
    if (numComponents === 3 && colorTransform === 0) {
      return null;
    }
    return exifOffsets || {};
  }
  parse(data, {
    dnlScanLines = null
  } = {}) {
    let offset = 0;
    let jfif = null;
    let adobe = null;
    let frame, resetInterval;
    let numSOSMarkers = 0;
    const quantizationTables = [];
    const huffmanTablesAC = [],
      huffmanTablesDC = [];
    let fileMarker = readUint16(data, offset);
    offset += 2;
    if (fileMarker !== 0xffd8) {
      throw new JpegError("SOI not found");
    }
    fileMarker = readUint16(data, offset);
    offset += 2;
    markerLoop: while (fileMarker !== 0xffd9) {
      let i, j, l;
      switch (fileMarker) {
        case 0xffe0:
        case 0xffe1:
        case 0xffe2:
        case 0xffe3:
        case 0xffe4:
        case 0xffe5:
        case 0xffe6:
        case 0xffe7:
        case 0xffe8:
        case 0xffe9:
        case 0xffea:
        case 0xffeb:
        case 0xffec:
        case 0xffed:
        case 0xffee:
        case 0xffef:
        case 0xfffe:
          const {
            appData,
            newOffset
          } = readDataBlock(data, offset);
          offset = newOffset;
          if (fileMarker === 0xffe0) {
            if (appData[0] === 0x4a && appData[1] === 0x46 && appData[2] === 0x49 && appData[3] === 0x46 && appData[4] === 0) {
              jfif = {
                version: {
                  major: appData[5],
                  minor: appData[6]
                },
                densityUnits: appData[7],
                xDensity: appData[8] << 8 | appData[9],
                yDensity: appData[10] << 8 | appData[11],
                thumbWidth: appData[12],
                thumbHeight: appData[13],
                thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
              };
            }
          }
          if (fileMarker === 0xffee) {
            if (appData[0] === 0x41 && appData[1] === 0x64 && appData[2] === 0x6f && appData[3] === 0x62 && appData[4] === 0x65) {
              adobe = {
                version: appData[5] << 8 | appData[6],
                flags0: appData[7] << 8 | appData[8],
                flags1: appData[9] << 8 | appData[10],
                transformCode: appData[11]
              };
            }
          }
          break;
        case 0xffdb:
          const quantizationTablesLength = readUint16(data, offset);
          offset += 2;
          const quantizationTablesEnd = quantizationTablesLength + offset - 2;
          let z;
          while (offset < quantizationTablesEnd) {
            const quantizationTableSpec = data[offset++];
            const tableData = new Uint16Array(64);
            if (quantizationTableSpec >> 4 === 0) {
              for (j = 0; j < 64; j++) {
                z = dctZigZag[j];
                tableData[z] = data[offset++];
              }
            } else if (quantizationTableSpec >> 4 === 1) {
              for (j = 0; j < 64; j++) {
                z = dctZigZag[j];
                tableData[z] = readUint16(data, offset);
                offset += 2;
              }
            } else {
              throw new JpegError("DQT - invalid table spec");
            }
            quantizationTables[quantizationTableSpec & 15] = tableData;
          }
          break;
        case 0xffc0:
        case 0xffc1:
        case 0xffc2:
          if (frame) {
            throw new JpegError("Only single frame JPEGs supported");
          }
          offset += 2;
          frame = {};
          frame.extended = fileMarker === 0xffc1;
          frame.progressive = fileMarker === 0xffc2;
          frame.precision = data[offset++];
          const sofScanLines = readUint16(data, offset);
          offset += 2;
          frame.scanLines = dnlScanLines || sofScanLines;
          frame.samplesPerLine = readUint16(data, offset);
          offset += 2;
          frame.components = [];
          frame.componentIds = {};
          const componentsCount = data[offset++];
          let maxH = 0,
            maxV = 0;
          for (i = 0; i < componentsCount; i++) {
            const componentId = data[offset];
            const h = data[offset + 1] >> 4;
            const v = data[offset + 1] & 15;
            if (maxH < h) {
              maxH = h;
            }
            if (maxV < v) {
              maxV = v;
            }
            const qId = data[offset + 2];
            l = frame.components.push({
              h,
              v,
              quantizationId: qId,
              quantizationTable: null
            });
            frame.componentIds[componentId] = l - 1;
            offset += 3;
          }
          frame.maxH = maxH;
          frame.maxV = maxV;
          prepareComponents(frame);
          break;
        case 0xffc4:
          const huffmanLength = readUint16(data, offset);
          offset += 2;
          for (i = 2; i < huffmanLength;) {
            const huffmanTableSpec = data[offset++];
            const codeLengths = new Uint8Array(16);
            let codeLengthSum = 0;
            for (j = 0; j < 16; j++, offset++) {
              codeLengthSum += codeLengths[j] = data[offset];
            }
            const huffmanValues = new Uint8Array(codeLengthSum);
            for (j = 0; j < codeLengthSum; j++, offset++) {
              huffmanValues[j] = data[offset];
            }
            i += 17 + codeLengthSum;
            (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
          }
          break;
        case 0xffdd:
          offset += 2;
          resetInterval = readUint16(data, offset);
          offset += 2;
          break;
        case 0xffda:
          const parseDNLMarker = ++numSOSMarkers === 1 && !dnlScanLines;
          offset += 2;
          const selectorsCount = data[offset++],
            components = [];
          for (i = 0; i < selectorsCount; i++) {
            const index = data[offset++];
            const componentIndex = frame.componentIds[index];
            const component = frame.components[componentIndex];
            component.index = index;
            const tableSpec = data[offset++];
            component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
            component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
            components.push(component);
          }
          const spectralStart = data[offset++],
            spectralEnd = data[offset++],
            successiveApproximation = data[offset++];
          try {
            const processed = decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successiveApproximation >> 4, successiveApproximation & 15, parseDNLMarker);
            offset += processed;
          } catch (ex) {
            if (ex instanceof DNLMarkerError) {
              util_warn(`${ex.message} -- attempting to re-parse the JPEG image.`);
              return this.parse(data, {
                dnlScanLines: ex.scanLines
              });
            } else if (ex instanceof EOIMarkerError) {
              util_warn(`${ex.message} -- ignoring the rest of the image data.`);
              break markerLoop;
            }
            throw ex;
          }
          break;
        case 0xffdc:
          offset += 4;
          break;
        case 0xffff:
          if (data[offset] !== 0xff) {
            offset--;
          }
          break;
        default:
          const nextFileMarker = findNextFileMarker(data, offset - 2, offset - 3);
          if (nextFileMarker?.invalid) {
            util_warn("JpegImage.parse - unexpected data, current marker is: " + nextFileMarker.invalid);
            offset = nextFileMarker.offset;
            break;
          }
          if (!nextFileMarker || offset >= data.length - 1) {
            util_warn("JpegImage.parse - reached the end of the image data " + "without finding an EOI marker (0xFFD9).");
            break markerLoop;
          }
          throw new JpegError("JpegImage.parse - unknown marker: " + fileMarker.toString(16));
      }
      fileMarker = readUint16(data, offset);
      offset += 2;
    }
    if (!frame) {
      throw new JpegError("JpegImage.parse - no frame data found.");
    }
    this.width = frame.samplesPerLine;
    this.height = frame.scanLines;
    this.jfif = jfif;
    this.adobe = adobe;
    this.components = [];
    for (const component of frame.components) {
      const quantizationTable = quantizationTables[component.quantizationId];
      if (quantizationTable) {
        component.quantizationTable = quantizationTable;
      }
      this.components.push({
        index: component.index,
        output: buildComponentData(frame, component),
        scaleX: component.h / frame.maxH,
        scaleY: component.v / frame.maxV,
        blocksPerLine: component.blocksPerLine,
        blocksPerColumn: component.blocksPerColumn
      });
    }
    this.numComponents = this.components.length;
    return undefined;
  }
  _getLinearizedBlockData(width, height, isSourcePDF = false) {
    const scaleX = this.width / width,
      scaleY = this.height / height;
    let component, componentScaleX, componentScaleY, blocksPerScanline;
    let x, y, i, j, k;
    let index;
    let offset = 0;
    let output;
    const numComponents = this.components.length;
    const dataLength = width * height * numComponents;
    const data = new Uint8ClampedArray(dataLength);
    const xScaleBlockOffset = new Uint32Array(width);
    const mask3LSB = 0xfffffff8;
    let lastComponentScaleX;
    for (i = 0; i < numComponents; i++) {
      component = this.components[i];
      componentScaleX = component.scaleX * scaleX;
      componentScaleY = component.scaleY * scaleY;
      offset = i;
      output = component.output;
      blocksPerScanline = component.blocksPerLine + 1 << 3;
      if (componentScaleX !== lastComponentScaleX) {
        for (x = 0; x < width; x++) {
          j = 0 | x * componentScaleX;
          xScaleBlockOffset[x] = (j & mask3LSB) << 3 | j & 7;
        }
        lastComponentScaleX = componentScaleX;
      }
      for (y = 0; y < height; y++) {
        j = 0 | y * componentScaleY;
        index = blocksPerScanline * (j & mask3LSB) | (j & 7) << 3;
        for (x = 0; x < width; x++) {
          data[offset] = output[index + xScaleBlockOffset[x]];
          offset += numComponents;
        }
      }
    }
    let transform = this._decodeTransform;
    if (!isSourcePDF && numComponents === 4 && !transform) {
      transform = new Int32Array([-256, 255, -256, 255, -256, 255, -256, 255]);
    }
    if (transform) {
      for (i = 0; i < dataLength;) {
        for (j = 0, k = 0; j < numComponents; j++, i++, k += 2) {
          data[i] = (data[i] * transform[k] >> 8) + transform[k + 1];
        }
      }
    }
    return data;
  }
  get _isColorConversionNeeded() {
    if (this.adobe) {
      return !!this.adobe.transformCode;
    }
    if (this.numComponents === 3) {
      if (this._colorTransform === 0) {
        return false;
      } else if (this.components[0].index === 0x52 && this.components[1].index === 0x47 && this.components[2].index === 0x42) {
        return false;
      }
      return true;
    }
    if (this._colorTransform === 1) {
      return true;
    }
    return false;
  }
  _convertYccToRgb(data) {
    let Y, Cb, Cr;
    for (let i = 0, length = data.length; i < length; i += 3) {
      Y = data[i];
      Cb = data[i + 1];
      Cr = data[i + 2];
      data[i] = Y - 179.456 + 1.402 * Cr;
      data[i + 1] = Y + 135.459 - 0.344 * Cb - 0.714 * Cr;
      data[i + 2] = Y - 226.816 + 1.772 * Cb;
    }
    return data;
  }
  _convertYccToRgba(data, out) {
    for (let i = 0, j = 0, length = data.length; i < length; i += 3, j += 4) {
      const Y = data[i];
      const Cb = data[i + 1];
      const Cr = data[i + 2];
      out[j] = Y - 179.456 + 1.402 * Cr;
      out[j + 1] = Y + 135.459 - 0.344 * Cb - 0.714 * Cr;
      out[j + 2] = Y - 226.816 + 1.772 * Cb;
      out[j + 3] = 255;
    }
    return out;
  }
  _convertYcckToRgb(data) {
    this._convertYcckToCmyk(data);
    return this._convertCmykToRgb(data);
  }
  _convertYcckToRgba(data) {
    this._convertYcckToCmyk(data);
    return this._convertCmykToRgba(data);
  }
  _convertYcckToCmyk(data) {
    let Y, Cb, Cr;
    for (let i = 0, length = data.length; i < length; i += 4) {
      Y = data[i];
      Cb = data[i + 1];
      Cr = data[i + 2];
      data[i] = 434.456 - Y - 1.402 * Cr;
      data[i + 1] = 119.541 - Y + 0.344 * Cb + 0.714 * Cr;
      data[i + 2] = 481.816 - Y - 1.772 * Cb;
    }
    return data;
  }
  _convertCmykToRgb(data) {
    const count = data.length / 4;
    ColorSpaceUtils.cmyk.getRgbBuffer(data, 0, count, data, 0, 8, 0);
    return data.subarray(0, count * 3);
  }
  _convertCmykToRgba(data) {
    ColorSpaceUtils.cmyk.getRgbBuffer(data, 0, data.length / 4, data, 0, 8, 1);
    if (ColorSpaceUtils.cmyk instanceof DeviceCmykCS) {
      for (let i = 3, ii = data.length; i < ii; i += 4) {
        data[i] = 255;
      }
    }
    return data;
  }
  getData({
    width,
    height,
    forceRGBA = false,
    forceRGB = false,
    isSourcePDF = false
  }) {
    if (this.numComponents > 4) {
      throw new JpegError("Unsupported color mode");
    }
    const data = this._getLinearizedBlockData(width, height, isSourcePDF);
    if (this.numComponents === 1 && (forceRGBA || forceRGB)) {
      const len = data.length * (forceRGBA ? 4 : 3);
      const rgbaData = new Uint8ClampedArray(len);
      let offset = 0;
      if (forceRGBA) {
        grayToRGBA(data, new Uint32Array(rgbaData.buffer));
      } else {
        for (const grayColor of data) {
          rgbaData[offset++] = grayColor;
          rgbaData[offset++] = grayColor;
          rgbaData[offset++] = grayColor;
        }
      }
      return rgbaData;
    } else if (this.numComponents === 3 && this._isColorConversionNeeded) {
      if (forceRGBA) {
        const rgbaData = new Uint8ClampedArray(data.length / 3 * 4);
        return this._convertYccToRgba(data, rgbaData);
      }
      return this._convertYccToRgb(data);
    } else if (this.numComponents === 4) {
      if (this._isColorConversionNeeded) {
        if (forceRGBA) {
          return this._convertYcckToRgba(data);
        }
        if (forceRGB) {
          return this._convertYcckToRgb(data);
        }
        return this._convertYcckToCmyk(data);
      } else if (forceRGBA) {
        return this._convertCmykToRgba(data);
      } else if (forceRGB) {
        return this._convertCmykToRgb(data);
      }
    }
    return data;
  }
}

;// ./external/openjpeg/openjpeg.js
var OpenJPEG = (() => {
  return async function (moduleArg = {}) {
    var moduleRtn;
    var Module = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    var readyPromise = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    var ENVIRONMENT_IS_WEB = true;
    var ENVIRONMENT_IS_WORKER = false;
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var _scriptName = import.meta.url;
    var scriptDirectory = "";
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      try {
        scriptDirectory = new URL(".", _scriptName).href;
      } catch {}
      readAsync = async url => {
        var response = await fetch(url, {
          credentials: "same-origin"
        });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      };
    } else {}
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    var wasmBinary;
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAP64, HEAPU64, HEAPF64;
    var runtimeInitialized = false;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      HEAP8 = new Int8Array(b);
      HEAP16 = new Int16Array(b);
      HEAPU8 = new Uint8Array(b);
      HEAPU16 = new Uint16Array(b);
      HEAP32 = new Int32Array(b);
      HEAPU32 = new Uint32Array(b);
      HEAPF32 = new Float32Array(b);
      HEAPF64 = new Float64Array(b);
      HEAP64 = new BigInt64Array(b);
      HEAPU64 = new BigUint64Array(b);
    }
    function preRun() {
      if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
          addOnPreRun(Module["preRun"].shift());
        }
      }
      callRuntimeCallbacks(onPreRuns);
    }
    function initRuntime() {
      runtimeInitialized = true;
      wasmExports["t"]();
    }
    function postRun() {
      if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
          addOnPostRun(Module["postRun"].shift());
        }
      }
      callRuntimeCallbacks(onPostRuns);
    }
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
      Module["monitorRunDependencies"]?.(runDependencies);
    }
    function removeRunDependency(id) {
      runDependencies--;
      Module["monitorRunDependencies"]?.(runDependencies);
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      Module["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var wasmBinaryFile;
    function getWasmImports() {
      return {
        a: wasmImports
      };
    }
    async function createWasm() {
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        wasmMemory = wasmExports["s"];
        updateMemoryViews();
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      addRunDependency("wasm-instantiate");
      var info = getWasmImports();
      return new Promise((resolve, reject) => {
        Module["instantiateWasm"](info, (mod, inst) => {
          resolve(receiveInstance(mod, inst));
        });
      });
    }
    class ExitStatus {
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    var callRuntimeCallbacks = callbacks => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    };
    var onPostRuns = [];
    var addOnPostRun = cb => onPostRuns.push(cb);
    var onPreRuns = [];
    var addOnPreRun = cb => onPreRuns.push(cb);
    var noExitRuntime = true;
    var __abort_js = () => abort("");
    var runtimeKeepaliveCounter = 0;
    var __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    };
    var timers = {};
    var handleException = e => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    };
    var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
    var _proc_exit = code => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    };
    var _exit = exitJS;
    var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
    var callUserCallback = func => {
      if (ABORT) {
        return;
      }
      try {
        func();
        maybeExit();
      } catch (e) {
        handleException(e);
      }
    };
    var _emscripten_get_now = () => performance.now();
    var __setitimer_js = (which, timeout_ms) => {
      if (timers[which]) {
        clearTimeout(timers[which].id);
        delete timers[which];
      }
      if (!timeout_ms) return 0;
      var id = setTimeout(() => {
        delete timers[which];
        callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
      }, timeout_ms);
      timers[which] = {
        id,
        timeout_ms
      };
      return 0;
    };
    function _copy_pixels_1(compG_ptr, nb_pixels) {
      compG_ptr >>= 2;
      const imageData = Module.imageData = new Uint8ClampedArray(nb_pixels);
      const compG = HEAP32.subarray(compG_ptr, compG_ptr + nb_pixels);
      imageData.set(compG);
    }
    function _copy_pixels_3(compR_ptr, compG_ptr, compB_ptr, nb_pixels) {
      compR_ptr >>= 2;
      compG_ptr >>= 2;
      compB_ptr >>= 2;
      const imageData = Module.imageData = new Uint8ClampedArray(nb_pixels * 3);
      const compR = HEAP32.subarray(compR_ptr, compR_ptr + nb_pixels);
      const compG = HEAP32.subarray(compG_ptr, compG_ptr + nb_pixels);
      const compB = HEAP32.subarray(compB_ptr, compB_ptr + nb_pixels);
      for (let i = 0; i < nb_pixels; i++) {
        imageData[3 * i] = compR[i];
        imageData[3 * i + 1] = compG[i];
        imageData[3 * i + 2] = compB[i];
      }
    }
    function _copy_pixels_4(compR_ptr, compG_ptr, compB_ptr, compA_ptr, nb_pixels) {
      compR_ptr >>= 2;
      compG_ptr >>= 2;
      compB_ptr >>= 2;
      compA_ptr >>= 2;
      const imageData = Module.imageData = new Uint8ClampedArray(nb_pixels * 4);
      const compR = HEAP32.subarray(compR_ptr, compR_ptr + nb_pixels);
      const compG = HEAP32.subarray(compG_ptr, compG_ptr + nb_pixels);
      const compB = HEAP32.subarray(compB_ptr, compB_ptr + nb_pixels);
      const compA = HEAP32.subarray(compA_ptr, compA_ptr + nb_pixels);
      for (let i = 0; i < nb_pixels; i++) {
        imageData[4 * i] = compR[i];
        imageData[4 * i + 1] = compG[i];
        imageData[4 * i + 2] = compB[i];
        imageData[4 * i + 3] = compA[i];
      }
    }
    var getHeapMax = () => 2147483648;
    var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
    var growMemory = size => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {}
    };
    var _emscripten_resize_heap = requestedSize => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    };
    var ENV = {};
    var getExecutableName = () => thisProgram || "./this.program";
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = {
          USER: "web_user",
          LOGNAME: "web_user",
          PATH: "/",
          PWD: "/",
          HOME: "/home/web_user",
          LANG: lang,
          _: getExecutableName()
        };
        for (var x in ENV) {
          if (ENV[x] === undefined) delete env[x];else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + envp >> 2] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };
    var lengthBytesUTF8 = str => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    var _fd_close = fd => 52;
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = num => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      return 70;
    }
    var printCharBuffers = [null, [], []];
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : undefined;
    var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    var printChar = (stream, curr) => {
      var buffer = printCharBuffers[stream];
      if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
        buffer.length = 0;
      } else {
        buffer.push(curr);
      }
    };
    var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    var _fd_write = (fd, iov, iovcnt, pnum) => {
      var num = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        for (var j = 0; j < len; j++) {
          printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
      }
      HEAPU32[pnum >> 2] = num;
      return 0;
    };
    function _gray_to_rgba(compG_ptr, nb_pixels) {
      compG_ptr >>= 2;
      const imageData = Module.imageData = new Uint8ClampedArray(nb_pixels * 4);
      const compG = HEAP32.subarray(compG_ptr, compG_ptr + nb_pixels);
      for (let i = 0; i < nb_pixels; i++) {
        imageData[4 * i] = imageData[4 * i + 1] = imageData[4 * i + 2] = compG[i];
        imageData[4 * i + 3] = 255;
      }
    }
    function _graya_to_rgba(compG_ptr, compA_ptr, nb_pixels) {
      compG_ptr >>= 2;
      compA_ptr >>= 2;
      const imageData = Module.imageData = new Uint8ClampedArray(nb_pixels * 4);
      const compG = HEAP32.subarray(compG_ptr, compG_ptr + nb_pixels);
      const compA = HEAP32.subarray(compA_ptr, compA_ptr + nb_pixels);
      for (let i = 0; i < nb_pixels; i++) {
        imageData[4 * i] = imageData[4 * i + 1] = imageData[4 * i + 2] = compG[i];
        imageData[4 * i + 3] = compA[i];
      }
    }
    function _jsPrintWarning(message_ptr) {
      const message = UTF8ToString(message_ptr);
      (Module.warn || console.warn)(`OpenJPEG: ${message}`);
    }
    function _rgb_to_rgba(compR_ptr, compG_ptr, compB_ptr, nb_pixels) {
      compR_ptr >>= 2;
      compG_ptr >>= 2;
      compB_ptr >>= 2;
      const imageData = Module.imageData = new Uint8ClampedArray(nb_pixels * 4);
      const compR = HEAP32.subarray(compR_ptr, compR_ptr + nb_pixels);
      const compG = HEAP32.subarray(compG_ptr, compG_ptr + nb_pixels);
      const compB = HEAP32.subarray(compB_ptr, compB_ptr + nb_pixels);
      for (let i = 0; i < nb_pixels; i++) {
        imageData[4 * i] = compR[i];
        imageData[4 * i + 1] = compG[i];
        imageData[4 * i + 2] = compB[i];
        imageData[4 * i + 3] = 255;
      }
    }
    function _storeErrorMessage(message_ptr) {
      const message = UTF8ToString(message_ptr);
      if (!Module.errorMessages) {
        Module.errorMessages = message;
      } else {
        Module.errorMessages += "\n" + message;
      }
    }
    var writeArrayToMemory = (array, buffer) => {
      HEAP8.set(array, buffer);
    };
    if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
    if (Module["print"]) out = Module["print"];
    if (Module["printErr"]) err = Module["printErr"];
    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
    if (Module["arguments"]) arguments_ = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    Module["writeArrayToMemory"] = writeArrayToMemory;
    var wasmImports = {
      l: __abort_js,
      k: __emscripten_runtime_keepalive_clear,
      m: __setitimer_js,
      g: _copy_pixels_1,
      f: _copy_pixels_3,
      e: _copy_pixels_4,
      n: _emscripten_resize_heap,
      p: _environ_get,
      q: _environ_sizes_get,
      b: _fd_close,
      o: _fd_seek,
      c: _fd_write,
      r: _gray_to_rgba,
      i: _graya_to_rgba,
      d: _jsPrintWarning,
      j: _proc_exit,
      h: _rgb_to_rgba,
      a: _storeErrorMessage
    };
    var wasmExports = await createWasm();
    var ___wasm_call_ctors = wasmExports["t"];
    var _malloc = Module["_malloc"] = wasmExports["u"];
    var _free = Module["_free"] = wasmExports["v"];
    var _jp2_decode = Module["_jp2_decode"] = wasmExports["w"];
    var __emscripten_timeout = wasmExports["x"];
    function run() {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module);
        Module["onRuntimeInitialized"]?.();
        postRun();
      }
      if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    function preInit() {
      if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
          Module["preInit"].shift()();
        }
      }
    }
    preInit();
    run();
    moduleRtn = readyPromise;
    return moduleRtn;
  };
})();
/* harmony default export */ const openjpeg = (OpenJPEG);
;// ./src/core/stream.js


class Stream extends base_stream_BaseStream {
  constructor(arrayBuffer, start, length, dict) {
    super();
    this.bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    this.start = start || 0;
    this.pos = this.start;
    this.end = start + length || this.bytes.length;
    this.dict = dict;
  }
  get length() {
    return this.end - this.start;
  }
  get isEmpty() {
    return this.length === 0;
  }
  getByte() {
    if (this.pos >= this.end) {
      return -1;
    }
    return this.bytes[this.pos++];
  }
  getBytes(length) {
    const bytes = this.bytes;
    const pos = this.pos;
    const strEnd = this.end;
    if (!length) {
      return bytes.subarray(pos, strEnd);
    }
    let end = pos + length;
    if (end > strEnd) {
      end = strEnd;
    }
    this.pos = end;
    return bytes.subarray(pos, end);
  }
  getByteRange(begin, end) {
    if (begin < 0) {
      begin = 0;
    }
    if (end > this.end) {
      end = this.end;
    }
    return this.bytes.subarray(begin, end);
  }
  reset() {
    this.pos = this.start;
  }
  moveStart() {
    this.start = this.pos;
  }
  makeSubStream(start, length, dict = null) {
    return new Stream(this.bytes.buffer, start, length, dict);
  }
}
class StringStream extends Stream {
  constructor(str) {
    super(stringToBytes(str));
  }
}
class NullStream extends Stream {
  constructor() {
    super(new Uint8Array(0));
  }
}

;// ./src/core/jpx.js




class JpxError extends BaseException {
  constructor(msg) {
    super(msg, "JpxError");
  }
}
class JpxImage {
  static #buffer = null;
  static #handler = null;
  static #modulePromise = null;
  static #useWasm = true;
  static #useWorkerFetch = true;
  static #wasmUrl = null;
  static setOptions({
    handler,
    useWasm,
    useWorkerFetch,
    wasmUrl
  }) {
    this.#useWasm = useWasm;
    this.#useWorkerFetch = useWorkerFetch;
    this.#wasmUrl = wasmUrl;
    if (!useWorkerFetch) {
      this.#handler = handler;
    }
  }
  static async #getJsModule(fallbackCallback) {
    const path = `${this.#wasmUrl}openjpeg_nowasm_fallback.js`;
    let instance = null;
    try {
      const mod = await import(
      /*webpackIgnore: true*/
      /*@vite-ignore*/
      path);
      instance = mod.default();
    } catch (e) {
      util_warn(`JpxImage#getJsModule: ${e}`);
    }
    fallbackCallback(instance);
  }
  static async #instantiateWasm(fallbackCallback, imports, successCallback) {
    const filename = "openjpeg.wasm";
    try {
      if (!this.#buffer) {
        if (this.#useWorkerFetch) {
          this.#buffer = await fetchBinaryData(`${this.#wasmUrl}${filename}`);
        } else {
          this.#buffer = await this.#handler.sendWithPromise("FetchBinaryData", {
            type: "wasmFactory",
            filename
          });
        }
      }
      const results = await WebAssembly.instantiate(this.#buffer, imports);
      return successCallback(results.instance);
    } catch (reason) {
      util_warn(`JpxImage#instantiateWasm: ${reason}`);
      this.#getJsModule(fallbackCallback);
      return null;
    } finally {
      this.#handler = null;
    }
  }
  static async decode(bytes, {
    numComponents = 4,
    isIndexedColormap = false,
    smaskInData = false,
    reducePower = 0
  } = {}) {
    if (!this.#modulePromise) {
      const {
        promise,
        resolve
      } = Promise.withResolvers();
      const promises = [promise];
      if (!this.#useWasm) {
        this.#getJsModule(resolve);
      } else {
        promises.push(openjpeg({
          warn: util_warn,
          instantiateWasm: this.#instantiateWasm.bind(this, resolve)
        }));
      }
      this.#modulePromise = Promise.race(promises);
    }
    const module = await this.#modulePromise;
    if (!module) {
      throw new JpxError("OpenJPEG failed to initialize");
    }
    let ptr;
    try {
      const size = bytes.length;
      ptr = module._malloc(size);
      module.writeArrayToMemory(bytes, ptr);
      const ret = module._jp2_decode(ptr, size, numComponents > 0 ? numComponents : 0, !!isIndexedColormap, !!smaskInData, reducePower);
      if (ret) {
        const {
          errorMessages
        } = module;
        if (errorMessages) {
          delete module.errorMessages;
          throw new JpxError(errorMessages);
        }
        throw new JpxError("Unknown error");
      }
      const {
        imageData
      } = module;
      module.imageData = null;
      return imageData;
    } finally {
      if (ptr) {
        module._free(ptr);
      }
    }
  }
  static cleanup() {
    this.#modulePromise = null;
  }
  static parseImageProperties(stream) {
    if (stream instanceof ArrayBuffer || ArrayBuffer.isView(stream)) {
      stream = new Stream(stream);
    } else {
      throw new JpxError("Invalid data format, must be a TypedArray.");
    }
    let newByte = stream.getByte();
    while (newByte >= 0) {
      const oldByte = newByte;
      newByte = stream.getByte();
      const code = oldByte << 8 | newByte;
      if (code === 0xff51) {
        stream.skip(4);
        const Xsiz = stream.getInt32() >>> 0;
        const Ysiz = stream.getInt32() >>> 0;
        const XOsiz = stream.getInt32() >>> 0;
        const YOsiz = stream.getInt32() >>> 0;
        stream.skip(16);
        const Csiz = stream.getUint16();
        return {
          width: Xsiz - XOsiz,
          height: Ysiz - YOsiz,
          bitsPerComponent: 8,
          componentsCount: Csiz
        };
      }
    }
    throw new JpxError("No size marker found in JPX stream");
  }
}

;// ./src/pdf.image_decoders.js




globalThis.pdfjsImageDecoders = {
  getVerbosityLevel: getVerbosityLevel,
  Jbig2Error: Jbig2Error,
  Jbig2Image: Jbig2Image,
  JpegError: JpegError,
  JpegImage: JpegImage,
  JpxError: JpxError,
  JpxImage: JpxImage,
  setVerbosityLevel: setVerbosityLevel,
  VerbosityLevel: VerbosityLevel
};

export { Jbig2Error, Jbig2Image, JpegError, JpegImage, JpxError, JpxImage, VerbosityLevel, getVerbosityLevel, setVerbosityLevel };

//# sourceMappingURL=pdf.image_decoders.mjs.map