// src/esbuild/index.ts
import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import { Parser } from "acorn";

// src/esbuild/utils.ts
import { extname } from "path";

// node_modules/.pnpm/@jridgewell+sourcemap-codec@1.4.11/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
var comma = ",".charCodeAt(0);
var semicolon = ";".charCodeAt(0);
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInteger = new Uint8Array(128);
for (let i2 = 0; i2 < chars.length; i2++) {
  const c = chars.charCodeAt(i2);
  charToInteger[c] = i2;
  intToChar[i2] = c;
}
var td = typeof TextDecoder !== "undefined" ? new TextDecoder() : typeof Buffer !== "undefined" ? {
  decode(buf) {
    const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
    return out.toString();
  }
} : {
  decode(buf) {
    let out = "";
    for (let i2 = 0; i2 < buf.length; i2++) {
      out += String.fromCharCode(buf[i2]);
    }
    return out;
  }
};
function decode(mappings) {
  const state = new Int32Array(5);
  const decoded = [];
  let line = [];
  let sorted = true;
  let lastCol = 0;
  for (let i2 = 0; i2 < mappings.length; ) {
    const c = mappings.charCodeAt(i2);
    if (c === comma) {
      i2++;
    } else if (c === semicolon) {
      state[0] = lastCol = 0;
      if (!sorted)
        sort(line);
      sorted = true;
      decoded.push(line);
      line = [];
      i2++;
    } else {
      i2 = decodeInteger(mappings, i2, state, 0);
      const col = state[0];
      if (col < lastCol)
        sorted = false;
      lastCol = col;
      if (!hasMoreSegments(mappings, i2)) {
        line.push([col]);
        continue;
      }
      i2 = decodeInteger(mappings, i2, state, 1);
      i2 = decodeInteger(mappings, i2, state, 2);
      i2 = decodeInteger(mappings, i2, state, 3);
      if (!hasMoreSegments(mappings, i2)) {
        line.push([col, state[1], state[2], state[3]]);
        continue;
      }
      i2 = decodeInteger(mappings, i2, state, 4);
      line.push([col, state[1], state[2], state[3], state[4]]);
    }
  }
  if (!sorted)
    sort(line);
  decoded.push(line);
  return decoded;
}
function decodeInteger(mappings, pos, state, j) {
  let value = 0;
  let shift = 0;
  let integer = 0;
  do {
    const c = mappings.charCodeAt(pos++);
    integer = charToInteger[c];
    value |= (integer & 31) << shift;
    shift += 5;
  } while (integer & 32);
  const shouldNegate = value & 1;
  value >>>= 1;
  if (shouldNegate) {
    value = -2147483648 | -value;
  }
  state[j] += value;
  return pos;
}
function hasMoreSegments(mappings, i2) {
  if (i2 >= mappings.length)
    return false;
  const c = mappings.charCodeAt(i2);
  if (c === comma || c === semicolon)
    return false;
  return true;
}
function sort(line) {
  line.sort(sortComparator);
}
function sortComparator(a, b) {
  return a[0] - b[0];
}
function encode(decoded) {
  const state = new Int32Array(5);
  let buf = new Uint8Array(1024);
  let pos = 0;
  for (let i2 = 0; i2 < decoded.length; i2++) {
    const line = decoded[i2];
    if (i2 > 0) {
      buf = reserve(buf, pos, 1);
      buf[pos++] = semicolon;
    }
    if (line.length === 0)
      continue;
    state[0] = 0;
    for (let j = 0; j < line.length; j++) {
      const segment = line[j];
      buf = reserve(buf, pos, 36);
      if (j > 0)
        buf[pos++] = comma;
      pos = encodeInteger(buf, pos, state, segment, 0);
      if (segment.length === 1)
        continue;
      pos = encodeInteger(buf, pos, state, segment, 1);
      pos = encodeInteger(buf, pos, state, segment, 2);
      pos = encodeInteger(buf, pos, state, segment, 3);
      if (segment.length === 4)
        continue;
      pos = encodeInteger(buf, pos, state, segment, 4);
    }
  }
  return td.decode(buf.subarray(0, pos));
}
function reserve(buf, pos, count) {
  if (buf.length > pos + count)
    return buf;
  const swap = new Uint8Array(buf.length * 2);
  swap.set(buf);
  return swap;
}
function encodeInteger(buf, pos, state, segment, j) {
  const next = segment[j];
  let num = next - state[j];
  state[j] = next;
  num = num < 0 ? -num << 1 | 1 : num << 1;
  do {
    let clamped = num & 31;
    num >>>= 5;
    if (num > 0)
      clamped |= 32;
    buf[pos++] = intToChar[clamped];
  } while (num > 0);
  return pos;
}

// node_modules/.pnpm/@jridgewell+resolve-uri@3.0.5/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.mjs
var schemeRegex = /^[\w+.-]+:\/\//;
var urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?/;
function isAbsoluteUrl(input) {
  return schemeRegex.test(input);
}
function isSchemeRelativeUrl(input) {
  return input.startsWith("//");
}
function isAbsolutePath(input) {
  return input.startsWith("/");
}
function parseAbsoluteUrl(input) {
  const match = urlRegex.exec(input);
  return {
    scheme: match[1],
    user: match[2] || "",
    host: match[3],
    port: match[4] || "",
    path: match[5] || "/",
    relativePath: false
  };
}
function parseUrl(input) {
  if (isSchemeRelativeUrl(input)) {
    const url = parseAbsoluteUrl("http:" + input);
    url.scheme = "";
    return url;
  }
  if (isAbsolutePath(input)) {
    const url = parseAbsoluteUrl("http://foo.com" + input);
    url.scheme = "";
    url.host = "";
    return url;
  }
  if (!isAbsoluteUrl(input)) {
    const url = parseAbsoluteUrl("http://foo.com/" + input);
    url.scheme = "";
    url.host = "";
    url.relativePath = true;
    return url;
  }
  return parseAbsoluteUrl(input);
}
function stripPathFilename(path2) {
  if (path2.endsWith("/.."))
    return path2;
  const index = path2.lastIndexOf("/");
  return path2.slice(0, index + 1);
}
function mergePaths(url, base) {
  if (!url.relativePath)
    return;
  normalizePath(base);
  if (url.path === "/") {
    url.path = base.path;
  } else {
    url.path = stripPathFilename(base.path) + url.path;
  }
  url.relativePath = base.relativePath;
}
function normalizePath(url) {
  const { relativePath } = url;
  const pieces = url.path.split("/");
  let pointer = 1;
  let positive = 0;
  let addTrailingSlash = false;
  for (let i2 = 1; i2 < pieces.length; i2++) {
    const piece = pieces[i2];
    if (!piece) {
      addTrailingSlash = true;
      continue;
    }
    addTrailingSlash = false;
    if (piece === ".")
      continue;
    if (piece === "..") {
      if (positive) {
        addTrailingSlash = true;
        positive--;
        pointer--;
      } else if (relativePath) {
        pieces[pointer++] = piece;
      }
      continue;
    }
    pieces[pointer++] = piece;
    positive++;
  }
  let path2 = "";
  for (let i2 = 1; i2 < pointer; i2++) {
    path2 += "/" + pieces[i2];
  }
  if (!path2 || addTrailingSlash && !path2.endsWith("/..")) {
    path2 += "/";
  }
  url.path = path2;
}
function resolve(input, base) {
  if (!input && !base)
    return "";
  const url = parseUrl(input);
  if (base && !url.scheme) {
    const baseUrl = parseUrl(base);
    url.scheme = baseUrl.scheme;
    if (!url.host || baseUrl.scheme === "file:") {
      url.user = baseUrl.user;
      url.host = baseUrl.host;
      url.port = baseUrl.port;
    }
    mergePaths(url, baseUrl);
  }
  normalizePath(url);
  if (url.relativePath) {
    const path2 = url.path.slice(1);
    if (!path2)
      return ".";
    const keepRelative = (base || input).startsWith(".");
    return !keepRelative || path2.startsWith(".") ? path2 : "./" + path2;
  }
  if (!url.scheme && !url.host)
    return url.path;
  return `${url.scheme}//${url.user}${url.host}${url.port}${url.path}`;
}

// node_modules/.pnpm/@jridgewell+trace-mapping@0.3.9/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs
function resolve2(input, base) {
  if (base && !base.endsWith("/"))
    base += "/";
  return resolve(input, base);
}
function stripFilename(path2) {
  if (!path2)
    return "";
  const index = path2.lastIndexOf("/");
  return path2.slice(0, index + 1);
}
var COLUMN = 0;
var SOURCES_INDEX = 1;
var SOURCE_LINE = 2;
var SOURCE_COLUMN = 3;
var NAMES_INDEX = 4;
var REV_GENERATED_LINE = 1;
var REV_GENERATED_COLUMN = 2;
function maybeSort(mappings, owned) {
  const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
  if (unsortedIndex === mappings.length)
    return mappings;
  if (!owned)
    mappings = mappings.slice();
  for (let i2 = unsortedIndex; i2 < mappings.length; i2 = nextUnsortedSegmentLine(mappings, i2 + 1)) {
    mappings[i2] = sortSegments(mappings[i2], owned);
  }
  return mappings;
}
function nextUnsortedSegmentLine(mappings, start) {
  for (let i2 = start; i2 < mappings.length; i2++) {
    if (!isSorted(mappings[i2]))
      return i2;
  }
  return mappings.length;
}
function isSorted(line) {
  for (let j = 1; j < line.length; j++) {
    if (line[j][COLUMN] < line[j - 1][COLUMN]) {
      return false;
    }
  }
  return true;
}
function sortSegments(line, owned) {
  if (!owned)
    line = line.slice();
  return line.sort(sortComparator2);
}
function sortComparator2(a, b) {
  return a[COLUMN] - b[COLUMN];
}
var found = false;
function binarySearch(haystack, needle, low, high) {
  while (low <= high) {
    const mid = low + (high - low >> 1);
    const cmp = haystack[mid][COLUMN] - needle;
    if (cmp === 0) {
      found = true;
      return mid;
    }
    if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  found = false;
  return low - 1;
}
function upperBound(haystack, needle, index) {
  for (let i2 = index + 1; i2 < haystack.length; i2++, index++) {
    if (haystack[i2][COLUMN] !== needle)
      break;
  }
  return index;
}
function lowerBound(haystack, needle, index) {
  for (let i2 = index - 1; i2 >= 0; i2--, index--) {
    if (haystack[i2][COLUMN] !== needle)
      break;
  }
  return index;
}
function memoizedState() {
  return {
    lastKey: -1,
    lastNeedle: -1,
    lastIndex: -1
  };
}
function memoizedBinarySearch(haystack, needle, state, key) {
  const { lastKey, lastNeedle, lastIndex } = state;
  let low = 0;
  let high = haystack.length - 1;
  if (key === lastKey) {
    if (needle === lastNeedle) {
      found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
      return lastIndex;
    }
    if (needle >= lastNeedle) {
      low = lastIndex === -1 ? 0 : lastIndex;
    } else {
      high = lastIndex;
    }
  }
  state.lastKey = key;
  state.lastNeedle = needle;
  return state.lastIndex = binarySearch(haystack, needle, low, high);
}
function buildBySources(decoded, memos) {
  const sources2 = memos.map(buildNullArray);
  for (let i2 = 0; i2 < decoded.length; i2++) {
    const line = decoded[i2];
    for (let j = 0; j < line.length; j++) {
      const seg = line[j];
      if (seg.length === 1)
        continue;
      const sourceIndex = seg[SOURCES_INDEX];
      const sourceLine = seg[SOURCE_LINE];
      const sourceColumn = seg[SOURCE_COLUMN];
      const originalSource = sources2[sourceIndex];
      const originalLine = originalSource[sourceLine] || (originalSource[sourceLine] = []);
      const memo = memos[sourceIndex];
      const index = upperBound(originalLine, sourceColumn, memoizedBinarySearch(originalLine, sourceColumn, memo, sourceLine));
      insert(originalLine, memo.lastIndex = index + 1, [sourceColumn, i2, seg[COLUMN]]);
    }
  }
  return sources2;
}
function insert(array, index, value) {
  for (let i2 = array.length; i2 > index; i2--) {
    array[i2] = array[i2 - 1];
  }
  array[index] = value;
}
function buildNullArray() {
  return { __proto__: null };
}
var INVALID_ORIGINAL_MAPPING = Object.freeze({
  source: null,
  line: null,
  column: null,
  name: null
});
var INVALID_GENERATED_MAPPING = Object.freeze({
  line: null,
  column: null
});
var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
var LEAST_UPPER_BOUND = -1;
var GREATEST_LOWER_BOUND = 1;
var encodedMappings;
var decodedMappings;
var traceSegment;
var originalPositionFor;
var generatedPositionFor;
var eachMapping;
var presortedDecodedMap;
var decodedMap;
var encodedMap;
var TraceMap = class {
  constructor(map, mapUrl) {
    this._decodedMemo = memoizedState();
    this._bySources = void 0;
    this._bySourceMemos = void 0;
    const isString = typeof map === "string";
    if (!isString && map.constructor === TraceMap)
      return map;
    const parsed = isString ? JSON.parse(map) : map;
    const { version, file, names, sourceRoot, sources: sources2, sourcesContent } = parsed;
    this.version = version;
    this.file = file;
    this.names = names;
    this.sourceRoot = sourceRoot;
    this.sources = sources2;
    this.sourcesContent = sourcesContent;
    if (sourceRoot || mapUrl) {
      const from = resolve2(sourceRoot || "", stripFilename(mapUrl));
      this.resolvedSources = sources2.map((s) => resolve2(s || "", from));
    } else {
      this.resolvedSources = sources2.map((s) => s || "");
    }
    const { mappings } = parsed;
    if (typeof mappings === "string") {
      this._encoded = mappings;
      this._decoded = void 0;
    } else {
      this._encoded = void 0;
      this._decoded = maybeSort(mappings, isString);
    }
  }
};
(() => {
  encodedMappings = (map) => {
    var _a;
    return (_a = map._encoded) !== null && _a !== void 0 ? _a : map._encoded = encode(map._decoded);
  };
  decodedMappings = (map) => {
    return map._decoded || (map._decoded = decode(map._encoded));
  };
  traceSegment = (map, line, column) => {
    const decoded = decodedMappings(map);
    if (line >= decoded.length)
      return null;
    return traceSegmentInternal(decoded[line], map._decodedMemo, line, column, GREATEST_LOWER_BOUND);
  };
  originalPositionFor = (map, { line, column, bias }) => {
    line--;
    if (line < 0)
      throw new Error(LINE_GTR_ZERO);
    if (column < 0)
      throw new Error(COL_GTR_EQ_ZERO);
    const decoded = decodedMappings(map);
    if (line >= decoded.length)
      return INVALID_ORIGINAL_MAPPING;
    const segment = traceSegmentInternal(decoded[line], map._decodedMemo, line, column, bias || GREATEST_LOWER_BOUND);
    if (segment == null)
      return INVALID_ORIGINAL_MAPPING;
    if (segment.length == 1)
      return INVALID_ORIGINAL_MAPPING;
    const { names, resolvedSources } = map;
    return {
      source: resolvedSources[segment[SOURCES_INDEX]],
      line: segment[SOURCE_LINE] + 1,
      column: segment[SOURCE_COLUMN],
      name: segment.length === 5 ? names[segment[NAMES_INDEX]] : null
    };
  };
  generatedPositionFor = (map, { source, line, column, bias }) => {
    line--;
    if (line < 0)
      throw new Error(LINE_GTR_ZERO);
    if (column < 0)
      throw new Error(COL_GTR_EQ_ZERO);
    const { sources: sources2, resolvedSources } = map;
    let sourceIndex = sources2.indexOf(source);
    if (sourceIndex === -1)
      sourceIndex = resolvedSources.indexOf(source);
    if (sourceIndex === -1)
      return INVALID_GENERATED_MAPPING;
    const generated = map._bySources || (map._bySources = buildBySources(decodedMappings(map), map._bySourceMemos = sources2.map(memoizedState)));
    const memos = map._bySourceMemos;
    const segments = generated[sourceIndex][line];
    if (segments == null)
      return INVALID_GENERATED_MAPPING;
    const segment = traceSegmentInternal(segments, memos[sourceIndex], line, column, bias || GREATEST_LOWER_BOUND);
    if (segment == null)
      return INVALID_GENERATED_MAPPING;
    return {
      line: segment[REV_GENERATED_LINE] + 1,
      column: segment[REV_GENERATED_COLUMN]
    };
  };
  eachMapping = (map, cb) => {
    const decoded = decodedMappings(map);
    const { names, resolvedSources } = map;
    for (let i2 = 0; i2 < decoded.length; i2++) {
      const line = decoded[i2];
      for (let j = 0; j < line.length; j++) {
        const seg = line[j];
        const generatedLine = i2 + 1;
        const generatedColumn = seg[0];
        let source = null;
        let originalLine = null;
        let originalColumn = null;
        let name = null;
        if (seg.length !== 1) {
          source = resolvedSources[seg[1]];
          originalLine = seg[2] + 1;
          originalColumn = seg[3];
        }
        if (seg.length === 5)
          name = names[seg[4]];
        cb({
          generatedLine,
          generatedColumn,
          source,
          originalLine,
          originalColumn,
          name
        });
      }
    }
  };
  presortedDecodedMap = (map, mapUrl) => {
    const clone = Object.assign({}, map);
    clone.mappings = [];
    const tracer = new TraceMap(clone, mapUrl);
    tracer._decoded = map.mappings;
    return tracer;
  };
  decodedMap = (map) => {
    return {
      version: 3,
      file: map.file,
      names: map.names,
      sourceRoot: map.sourceRoot,
      sources: map.sources,
      sourcesContent: map.sourcesContent,
      mappings: decodedMappings(map)
    };
  };
  encodedMap = (map) => {
    return {
      version: 3,
      file: map.file,
      names: map.names,
      sourceRoot: map.sourceRoot,
      sources: map.sources,
      sourcesContent: map.sourcesContent,
      mappings: encodedMappings(map)
    };
  };
})();
function traceSegmentInternal(segments, memo, line, column, bias) {
  let index = memoizedBinarySearch(segments, column, memo, line);
  if (found) {
    index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
  } else if (bias === LEAST_UPPER_BOUND)
    index++;
  if (index === -1 || index === segments.length)
    return null;
  return segments[index];
}

// node_modules/.pnpm/@jridgewell+set-array@1.1.0/node_modules/@jridgewell/set-array/dist/set-array.mjs
var get;
var put;
var pop;
var SetArray = class {
  constructor() {
    this._indexes = { __proto__: null };
    this.array = [];
  }
};
(() => {
  get = (strarr, key) => strarr._indexes[key];
  put = (strarr, key) => {
    const index = get(strarr, key);
    if (index !== void 0)
      return index;
    const { array, _indexes: indexes } = strarr;
    return indexes[key] = array.push(key) - 1;
  };
  pop = (strarr) => {
    const { array, _indexes: indexes } = strarr;
    if (array.length === 0)
      return;
    const last = array.pop();
    indexes[last] = void 0;
  };
})();

// node_modules/.pnpm/@jridgewell+gen-mapping@0.1.1/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.mjs
var addSegment;
var addMapping;
var setSourceContent;
var decodedMap2;
var encodedMap2;
var allMappings;
var GenMapping = class {
  constructor({ file, sourceRoot } = {}) {
    this._names = new SetArray();
    this._sources = new SetArray();
    this._sourcesContent = [];
    this._mappings = [];
    this.file = file;
    this.sourceRoot = sourceRoot;
  }
};
(() => {
  addSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name) => {
    const { _mappings: mappings, _sources: sources2, _sourcesContent: sourcesContent, _names: names } = map;
    const line = getLine(mappings, genLine);
    if (source == null) {
      const seg2 = [genColumn];
      const index2 = getColumnIndex(line, genColumn, seg2);
      return insert2(line, index2, seg2);
    }
    const sourcesIndex = put(sources2, source);
    const seg = name ? [genColumn, sourcesIndex, sourceLine, sourceColumn, put(names, name)] : [genColumn, sourcesIndex, sourceLine, sourceColumn];
    const index = getColumnIndex(line, genColumn, seg);
    if (sourcesIndex === sourcesContent.length)
      sourcesContent[sourcesIndex] = null;
    insert2(line, index, seg);
  };
  addMapping = (map, mapping) => {
    const { generated, source, original, name } = mapping;
    return addSegment(map, generated.line - 1, generated.column, source, original == null ? void 0 : original.line - 1, original === null || original === void 0 ? void 0 : original.column, name);
  };
  setSourceContent = (map, source, content) => {
    const { _sources: sources2, _sourcesContent: sourcesContent } = map;
    sourcesContent[put(sources2, source)] = content;
  };
  decodedMap2 = (map) => {
    const { file, sourceRoot, _mappings: mappings, _sources: sources2, _sourcesContent: sourcesContent, _names: names } = map;
    return {
      version: 3,
      file,
      names: names.array,
      sourceRoot: sourceRoot || void 0,
      sources: sources2.array,
      sourcesContent,
      mappings
    };
  };
  encodedMap2 = (map) => {
    const decoded = decodedMap2(map);
    return Object.assign(Object.assign({}, decoded), { mappings: encode(decoded.mappings) });
  };
  allMappings = (map) => {
    const out = [];
    const { _mappings: mappings, _sources: sources2, _names: names } = map;
    for (let i2 = 0; i2 < mappings.length; i2++) {
      const line = mappings[i2];
      for (let j = 0; j < line.length; j++) {
        const seg = line[j];
        const generated = { line: i2 + 1, column: seg[0] };
        let source = void 0;
        let original = void 0;
        let name = void 0;
        if (seg.length !== 1) {
          source = sources2.array[seg[1]];
          original = { line: seg[2] + 1, column: seg[3] };
          if (seg.length === 5)
            name = names.array[seg[4]];
        }
        out.push({ generated, source, original, name });
      }
    }
    return out;
  };
})();
function getLine(mappings, index) {
  for (let i2 = mappings.length; i2 <= index; i2++) {
    mappings[i2] = [];
  }
  return mappings[index];
}
function getColumnIndex(line, column, seg) {
  let index = line.length;
  for (let i2 = index - 1; i2 >= 0; i2--, index--) {
    const current = line[i2];
    const col = current[0];
    if (col > column)
      continue;
    if (col < column)
      break;
    const cmp = compare(current, seg);
    if (cmp === 0)
      return index;
    if (cmp < 0)
      break;
  }
  return index;
}
function compare(a, b) {
  let cmp = compareNum(a.length, b.length);
  if (cmp !== 0)
    return cmp;
  if (a.length === 1)
    return 0;
  cmp = compareNum(a[1], b[1]);
  if (cmp !== 0)
    return cmp;
  cmp = compareNum(a[2], b[2]);
  if (cmp !== 0)
    return cmp;
  cmp = compareNum(a[3], b[3]);
  if (cmp !== 0)
    return cmp;
  if (a.length === 4)
    return 0;
  return compareNum(a[4], b[4]);
}
function compareNum(a, b) {
  return a - b;
}
function insert2(array, index, value) {
  if (index === -1)
    return;
  for (let i2 = array.length; i2 > index; i2--) {
    array[i2] = array[i2 - 1];
  }
  array[index] = value;
}

// node_modules/.pnpm/@ampproject+remapping@2.2.0/node_modules/@ampproject/remapping/dist/remapping.mjs
var SOURCELESS_MAPPING = {
  source: null,
  column: null,
  line: null,
  name: null,
  content: null
};
var EMPTY_SOURCES = [];
function Source(map, sources2, source, content) {
  return {
    map,
    sources: sources2,
    source,
    content
  };
}
function MapSource(map, sources2) {
  return Source(map, sources2, "", null);
}
function OriginalSource(source, content) {
  return Source(null, EMPTY_SOURCES, source, content);
}
function traceMappings(tree) {
  const gen = new GenMapping({ file: tree.map.file });
  const { sources: rootSources, map } = tree;
  const rootNames = map.names;
  const rootMappings = decodedMappings(map);
  for (let i2 = 0; i2 < rootMappings.length; i2++) {
    const segments = rootMappings[i2];
    let lastSource = null;
    let lastSourceLine = null;
    let lastSourceColumn = null;
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      const genCol = segment[0];
      let traced = SOURCELESS_MAPPING;
      if (segment.length !== 1) {
        const source2 = rootSources[segment[1]];
        traced = originalPositionFor2(source2, segment[2], segment[3], segment.length === 5 ? rootNames[segment[4]] : "");
        if (traced == null)
          continue;
      }
      const { column, line, name, content, source } = traced;
      if (line === lastSourceLine && column === lastSourceColumn && source === lastSource) {
        continue;
      }
      lastSourceLine = line;
      lastSourceColumn = column;
      lastSource = source;
      addSegment(gen, i2, genCol, source, line, column, name);
      if (content != null)
        setSourceContent(gen, source, content);
    }
  }
  return gen;
}
function originalPositionFor2(source, line, column, name) {
  if (!source.map) {
    return { column, line, name, source: source.source, content: source.content };
  }
  const segment = traceSegment(source.map, line, column);
  if (segment == null)
    return null;
  if (segment.length === 1)
    return SOURCELESS_MAPPING;
  return originalPositionFor2(source.sources[segment[1]], segment[2], segment[3], segment.length === 5 ? source.map.names[segment[4]] : name);
}
function asArray(value) {
  if (Array.isArray(value))
    return value;
  return [value];
}
function buildSourceMapTree(input, loader) {
  const maps = asArray(input).map((m) => new TraceMap(m, ""));
  const map = maps.pop();
  for (let i2 = 0; i2 < maps.length; i2++) {
    if (maps[i2].sources.length > 1) {
      throw new Error(`Transformation map ${i2} must have exactly one source file.
Did you specify these with the most recent transformation maps first?`);
    }
  }
  let tree = build(map, loader, "", 0);
  for (let i2 = maps.length - 1; i2 >= 0; i2--) {
    tree = MapSource(maps[i2], [tree]);
  }
  return tree;
}
function build(map, loader, importer, importerDepth) {
  const { resolvedSources, sourcesContent } = map;
  const depth = importerDepth + 1;
  const children = resolvedSources.map((sourceFile, i2) => {
    const ctx = {
      importer,
      depth,
      source: sourceFile || "",
      content: void 0
    };
    const sourceMap = loader(ctx.source, ctx);
    const { source, content } = ctx;
    if (sourceMap)
      return build(new TraceMap(sourceMap, source), loader, source, depth);
    const sourceContent = content !== void 0 ? content : sourcesContent ? sourcesContent[i2] : null;
    return OriginalSource(source, sourceContent);
  });
  return MapSource(map, children);
}
var SourceMap = class {
  constructor(map, options) {
    const out = options.decodedMappings ? decodedMap2(map) : encodedMap2(map);
    this.version = out.version;
    this.file = out.file;
    this.mappings = out.mappings;
    this.names = out.names;
    this.sourceRoot = out.sourceRoot;
    this.sources = out.sources;
    if (!options.excludeContent) {
      this.sourcesContent = out.sourcesContent;
    }
  }
  toString() {
    return JSON.stringify(this);
  }
};
function remapping(input, loader, options) {
  const opts = typeof options === "object" ? options : { excludeContent: !!options, decodedMappings: false };
  const tree = buildSourceMapTree(input, loader);
  return new SourceMap(traceMappings(tree), opts);
}

// src/utils.ts
import { isAbsolute, normalize } from "path";
function normalizeAbsolutePath(path2) {
  if (isAbsolute(path2))
    return normalize(path2);
  else
    return path2;
}
function toArray(array) {
  array = array || [];
  if (Array.isArray(array))
    return array;
  return [array];
}

// src/esbuild/utils.ts
var ExtToLoader = {
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".jsx": "jsx",
  ".ts": "ts",
  ".cts": "ts",
  ".mts": "ts",
  ".tsx": "tsx",
  ".css": "css",
  ".less": "css",
  ".stylus": "css",
  ".scss": "css",
  ".sass": "css",
  ".json": "json",
  ".txt": "text"
};
function guessLoader(id) {
  return ExtToLoader[extname(id).toLowerCase()] || "js";
}
function fixSourceMap(map) {
  if (!("toString" in map)) {
    Object.defineProperty(map, "toString", {
      enumerable: false,
      value: function toString() {
        return JSON.stringify(this);
      }
    });
  }
  if (!("toUrl" in map)) {
    Object.defineProperty(map, "toUrl", {
      enumerable: false,
      value: function toUrl() {
        return `data:application/json;charset=utf-8;base64,${Buffer.from(this.toString()).toString("base64")}`;
      }
    });
  }
  return map;
}
var nullSourceMap = {
  names: [],
  sources: [],
  mappings: "",
  version: 3
};
function combineSourcemaps(filename, sourcemapList) {
  sourcemapList = sourcemapList.filter((m) => m.sources);
  if (sourcemapList.length === 0 || sourcemapList.every((m) => m.sources.length === 0))
    return { ...nullSourceMap };
  let map;
  let mapIndex = 1;
  const useArrayInterface = sourcemapList.slice(0, -1).find((m) => m.sources.length !== 1) === void 0;
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null, true);
  } else {
    map = remapping(
      sourcemapList[0],
      (sourcefile) => {
        if (sourcefile === filename && sourcemapList[mapIndex])
          return sourcemapList[mapIndex++];
        else
          return { ...nullSourceMap };
      },
      true
    );
  }
  if (!map.file)
    delete map.file;
  return map;
}

// src/esbuild/index.ts
var watchListRecord = {};
var watchList = /* @__PURE__ */ new Set();
var i = 0;
function getEsbuildPlugin(factory) {
  return (userOptions) => {
    const meta = {
      framework: "esbuild"
    };
    const plugins = toArray(factory(userOptions, meta));
    const setup = (plugin) => plugin.esbuild?.setup ?? ((pluginBuild) => {
      const { onStart, onEnd, onResolve, onLoad, initialOptions, esbuild: { build: build2 } } = pluginBuild;
      meta.build = pluginBuild;
      const onResolveFilter = plugin.esbuild?.onResolveFilter ?? /.*/;
      const onLoadFilter = plugin.esbuild?.onLoadFilter ?? /.*/;
      const context = {
        parse(code, opts = {}) {
          return Parser.parse(code, {
            sourceType: "module",
            ecmaVersion: "latest",
            locations: true,
            ...opts
          });
        },
        addWatchFile(id) {
          watchList.add(path.resolve(id));
        },
        emitFile(emittedFile) {
          const outFileName = emittedFile.fileName || emittedFile.name;
          if (initialOptions.outdir && emittedFile.source && outFileName)
            fs.writeFileSync(path.resolve(initialOptions.outdir, outFileName), emittedFile.source);
        },
        getWatchFiles() {
          return Array.from(watchList);
        }
      };
      if (initialOptions.outdir && !fs.existsSync(initialOptions.outdir))
        fs.mkdirSync(initialOptions.outdir, { recursive: true });
      if (plugin.buildStart)
        onStart(() => plugin.buildStart.call(context));
      if (plugin.buildEnd || plugin.writeBundle || initialOptions.watch) {
        const rebuild = () => build2({
          ...initialOptions,
          watch: false
        });
        onEnd(async () => {
          if (plugin.buildEnd)
            await plugin.buildEnd.call(context);
          if (plugin.writeBundle)
            await plugin.writeBundle();
          if (initialOptions.watch) {
            Object.keys(watchListRecord).forEach((id) => {
              if (!watchList.has(id)) {
                watchListRecord[id].close();
                delete watchListRecord[id];
              }
            });
            watchList.forEach((id) => {
              if (!Object.keys(watchListRecord).includes(id)) {
                watchListRecord[id] = chokidar.watch(id);
                watchListRecord[id].on("change", async () => {
                  await plugin.watchChange?.call(context, id, { event: "update" });
                  rebuild();
                });
                watchListRecord[id].on("unlink", async () => {
                  await plugin.watchChange?.call(context, id, { event: "delete" });
                  rebuild();
                });
              }
            });
          }
        });
      }
      if (plugin.resolveId) {
        onResolve({ filter: onResolveFilter }, async (args) => {
          if (initialOptions.external?.includes(args.path)) {
            return void 0;
          }
          const isEntry = args.kind === "entry-point";
          const result = await plugin.resolveId(
            args.path,
            isEntry ? void 0 : args.importer,
            { isEntry }
          );
          if (typeof result === "string")
            return { path: result, namespace: plugin.name };
          else if (typeof result === "object" && result !== null)
            return { path: result.id, external: result.external, namespace: plugin.name };
        });
      }
      if (plugin.load || plugin.transform) {
        onLoad({ filter: onLoadFilter }, async (args) => {
          const id = args.path + args.suffix;
          const errors = [];
          const warnings = [];
          const pluginContext = {
            error(message) {
              errors.push({ text: String(message) });
            },
            warn(message) {
              warnings.push({ text: String(message) });
            }
          };
          const resolveDir = path.dirname(args.path);
          let code, map;
          if (plugin.load && (!plugin.loadInclude || plugin.loadInclude(id))) {
            const result = await plugin.load.call(Object.assign(context, pluginContext), id);
            if (typeof result === "string") {
              code = result;
            } else if (typeof result === "object" && result !== null) {
              code = result.code;
              map = result.map;
            }
          }
          if (!plugin.transform) {
            if (code === void 0)
              return null;
            if (map) {
              if (!map.sourcesContent || map.sourcesContent.length === 0)
                map.sourcesContent = [code];
              map = fixSourceMap(map);
              code += `
//# sourceMappingURL=${map.toUrl()}`;
            }
            return { contents: code, errors, warnings, loader: guessLoader(args.path), resolveDir };
          }
          if (!plugin.transformInclude || plugin.transformInclude(id)) {
            if (!code) {
              code = await fs.promises.readFile(args.path, "utf8");
            }
            const result = await plugin.transform.call(Object.assign(context, pluginContext), code, id);
            if (typeof result === "string") {
              code = result;
            } else if (typeof result === "object" && result !== null) {
              code = result.code;
              if (map && result.map) {
                map = combineSourcemaps(args.path, [
                  result.map,
                  map
                ]);
              } else {
                map = result.map;
              }
            }
          }
          if (code) {
            if (map) {
              if (!map.sourcesContent || map.sourcesContent.length === 0)
                map.sourcesContent = [code];
              map = fixSourceMap(map);
              code += `
//# sourceMappingURL=${map.toUrl()}`;
            }
            return { contents: code, errors, warnings, loader: guessLoader(args.path), resolveDir };
          }
        });
      }
    });
    const setupMultiplePlugins = () => (build2) => {
      for (const plugin of plugins)
        setup(plugin)(build2);
    };
    return plugins.length === 1 ? { name: plugins[0].name, setup: setup(plugins[0]) } : { name: meta.esbuildHostName ?? `unplugin-host-${i++}`, setup: setupMultiplePlugins() };
  };
}

// src/rollup/index.ts
function getRollupPlugin(factory) {
  return (userOptions) => {
    const meta = {
      framework: "rollup"
    };
    const rawPlugins = toArray(factory(userOptions, meta));
    const plugins = rawPlugins.map((plugin) => toRollupPlugin(plugin));
    return plugins.length === 1 ? plugins[0] : plugins;
  };
}
function toRollupPlugin(plugin, containRollupOptions = true) {
  if (plugin.transform && plugin.transformInclude) {
    const _transform = plugin.transform;
    plugin.transform = function(code, id) {
      if (plugin.transformInclude && !plugin.transformInclude(id))
        return null;
      return _transform.call(this, code, id);
    };
  }
  if (plugin.load && plugin.loadInclude) {
    const _load = plugin.load;
    plugin.load = function(id) {
      if (plugin.loadInclude && !plugin.loadInclude(id))
        return null;
      return _load.call(this, id);
    };
  }
  if (plugin.rollup && containRollupOptions)
    Object.assign(plugin, plugin.rollup);
  return plugin;
}

// src/vite/index.ts
function getVitePlugin(factory) {
  return (userOptions) => {
    const meta = {
      framework: "vite"
    };
    const rawPlugins = toArray(factory(userOptions, meta));
    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toRollupPlugin(rawPlugin, false);
      if (rawPlugin.vite)
        Object.assign(plugin, rawPlugin.vite);
      return plugin;
    });
    return plugins.length === 1 ? plugins[0] : plugins;
  };
}

// src/webpack/index.ts
import fs2 from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve as resolve4 } from "path";
import VirtualModulesPlugin from "webpack-virtual-modules";

// src/webpack/context.ts
import { resolve as resolve3 } from "path";
import sources from "webpack-sources";
import { Parser as Parser2 } from "acorn";
function createContext(compilation) {
  return {
    parse(code, opts = {}) {
      return Parser2.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile(id) {
      (compilation.fileDependencies ?? compilation.compilationDependencies).add(
        resolve3(process.cwd(), id)
      );
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          sources ? new sources.RawSource(
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer.from(emittedFile.source)
          ) : {
            source: () => emittedFile.source,
            size: () => emittedFile.source.length
          }
        );
      }
    },
    getWatchFiles() {
      return Array.from(
        compilation.fileDependencies ?? compilation.compilationDependencies
      );
    }
  };
}

// src/webpack/index.ts
var _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
var TRANSFORM_LOADER = resolve4(
  _dirname,
  false ? "../../dist/webpack/loaders/transform" : "webpack/loaders/transform"
);
var LOAD_LOADER = resolve4(
  _dirname,
  false ? "../../dist/webpack/loaders/load" : "webpack/loaders/load"
);
var VIRTUAL_MODULE_PREFIX = resolve4(process.cwd(), "_virtual_");
function getWebpackPlugin(factory) {
  return (userOptions) => {
    return {
      apply(compiler) {
        const injected = compiler.$unpluginContext || {};
        compiler.$unpluginContext = injected;
        const meta = {
          framework: "webpack",
          webpack: {
            compiler
          }
        };
        const rawPlugins = toArray(factory(userOptions, meta));
        for (const rawPlugin of rawPlugins) {
          const plugin = Object.assign(
            rawPlugin,
            {
              __unpluginMeta: meta,
              __virtualModulePrefix: VIRTUAL_MODULE_PREFIX
            }
          );
          injected[plugin.name] = plugin;
          compiler.hooks.thisCompilation.tap(plugin.name, (compilation) => {
            compilation.hooks.childCompiler.tap(plugin.name, (childCompiler) => {
              childCompiler.$unpluginContext = injected;
            });
          });
          const externalModules = /* @__PURE__ */ new Set();
          if (plugin.transform) {
            const useLoader = [{
              loader: `${TRANSFORM_LOADER}?unpluginName=${encodeURIComponent(plugin.name)}`
            }];
            const useNone = [];
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              use: (data) => {
                if (data.resource == null)
                  return useNone;
                const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ""));
                if (!plugin.transformInclude || plugin.transformInclude(id))
                  return useLoader;
                return useNone;
              }
            });
          }
          if (plugin.resolveId) {
            let vfs = compiler.options.plugins.find((i2) => i2 instanceof VirtualModulesPlugin);
            if (!vfs) {
              vfs = new VirtualModulesPlugin();
              compiler.options.plugins.push(vfs);
            }
            plugin.__vfsModules = /* @__PURE__ */ new Set();
            plugin.__vfs = vfs;
            const resolverPlugin = {
              apply(resolver) {
                const target = resolver.ensureHook("resolve");
                resolver.getHook("resolve").tapAsync(plugin.name, async (request, resolveContext, callback) => {
                  if (!request.request)
                    return callback();
                  if (normalizeAbsolutePath(request.request).startsWith(plugin.__virtualModulePrefix))
                    return callback();
                  const id = normalizeAbsolutePath(request.request);
                  const requestContext = request.context;
                  const importer = requestContext.issuer !== "" ? requestContext.issuer : void 0;
                  const isEntry = requestContext.issuer === "";
                  const resolveIdResult = await plugin.resolveId(id, importer, { isEntry });
                  if (resolveIdResult == null)
                    return callback();
                  let resolved = typeof resolveIdResult === "string" ? resolveIdResult : resolveIdResult.id;
                  const isExternal = typeof resolveIdResult === "string" ? false : resolveIdResult.external === true;
                  if (isExternal)
                    externalModules.add(resolved);
                  if (!fs2.existsSync(resolved)) {
                    resolved = normalizeAbsolutePath(
                      plugin.__virtualModulePrefix + encodeURIComponent(resolved)
                    );
                    if (!plugin.__vfsModules.has(resolved)) {
                      plugin.__vfs.writeModule(resolved, "");
                      plugin.__vfsModules.add(resolved);
                    }
                  }
                  const newRequest = {
                    ...request,
                    request: resolved
                  };
                  resolver.doResolve(target, newRequest, null, resolveContext, callback);
                });
              }
            };
            compiler.options.resolve.plugins = compiler.options.resolve.plugins || [];
            compiler.options.resolve.plugins.push(resolverPlugin);
          }
          if (plugin.load) {
            compiler.options.module.rules.unshift({
              include(id) {
                if (id.startsWith(plugin.__virtualModulePrefix))
                  id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
                if (plugin.loadInclude && !plugin.loadInclude(id))
                  return false;
                return !externalModules.has(id);
              },
              enforce: plugin.enforce,
              use: [{
                loader: LOAD_LOADER,
                options: {
                  unpluginName: plugin.name
                }
              }]
            });
          }
          if (plugin.webpack)
            plugin.webpack(compiler);
          if (plugin.watchChange || plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createContext(compilation);
              if (plugin.watchChange && (compiler.modifiedFiles || compiler.removedFiles)) {
                const promises = [];
                if (compiler.modifiedFiles) {
                  compiler.modifiedFiles.forEach(
                    (file) => promises.push(Promise.resolve(plugin.watchChange.call(context, file, { event: "update" })))
                  );
                }
                if (compiler.removedFiles) {
                  compiler.removedFiles.forEach(
                    (file) => promises.push(Promise.resolve(plugin.watchChange.call(context, file, { event: "delete" })))
                  );
                }
                await Promise.all(promises);
              }
              if (plugin.buildStart)
                return await plugin.buildStart.call(context);
            });
          }
          if (plugin.buildEnd) {
            compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
              await plugin.buildEnd.call(createContext(compilation));
            });
          }
          if (plugin.writeBundle) {
            compiler.hooks.afterEmit.tap(plugin.name, () => {
              plugin.writeBundle();
            });
          }
        }
      }
    };
  };
}

// src/define.ts
function createUnplugin(factory) {
  return {
    get esbuild() {
      return getEsbuildPlugin(factory);
    },
    get rollup() {
      return getRollupPlugin(factory);
    },
    get vite() {
      return getVitePlugin(factory);
    },
    get webpack() {
      return getWebpackPlugin(factory);
    },
    get raw() {
      return factory;
    }
  };
}
export {
  createUnplugin
};
