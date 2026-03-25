// node_modules/.pnpm/tsup@8.0.2_typescript@5.4.5/node_modules/tsup/assets/esm_shims.js
import { fileURLToPath } from "url";
import path from "path";
var getFilename = () => fileURLToPath(import.meta.url);
var getDirname = () => path.dirname(getFilename());
var __dirname = /* @__PURE__ */ getDirname();

// src/esbuild/index.ts
import fs2 from "fs";
import path3 from "path";

// src/esbuild/utils.ts
import fs from "fs";
import path2 from "path";
import { Buffer as Buffer2 } from "buffer";

// node_modules/.pnpm/@jridgewell+sourcemap-codec@1.4.15/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
var comma = ",".charCodeAt(0);
var semicolon = ";".charCodeAt(0);
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  const c = chars.charCodeAt(i);
  intToChar[i] = c;
  charToInt[c] = i;
}
var td = typeof TextDecoder !== "undefined" ? /* @__PURE__ */ new TextDecoder() : typeof Buffer !== "undefined" ? {
  decode(buf) {
    const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
    return out.toString();
  }
} : {
  decode(buf) {
    let out = "";
    for (let i = 0; i < buf.length; i++) {
      out += String.fromCharCode(buf[i]);
    }
    return out;
  }
};
function decode(mappings) {
  const state = new Int32Array(5);
  const decoded = [];
  let index = 0;
  do {
    const semi = indexOf(mappings, index);
    const line = [];
    let sorted = true;
    let lastCol = 0;
    state[0] = 0;
    for (let i = index; i < semi; i++) {
      let seg;
      i = decodeInteger(mappings, i, state, 0);
      const col = state[0];
      if (col < lastCol)
        sorted = false;
      lastCol = col;
      if (hasMoreVlq(mappings, i, semi)) {
        i = decodeInteger(mappings, i, state, 1);
        i = decodeInteger(mappings, i, state, 2);
        i = decodeInteger(mappings, i, state, 3);
        if (hasMoreVlq(mappings, i, semi)) {
          i = decodeInteger(mappings, i, state, 4);
          seg = [col, state[1], state[2], state[3], state[4]];
        } else {
          seg = [col, state[1], state[2], state[3]];
        }
      } else {
        seg = [col];
      }
      line.push(seg);
    }
    if (!sorted)
      sort(line);
    decoded.push(line);
    index = semi + 1;
  } while (index <= mappings.length);
  return decoded;
}
function indexOf(mappings, index) {
  const idx = mappings.indexOf(";", index);
  return idx === -1 ? mappings.length : idx;
}
function decodeInteger(mappings, pos, state, j) {
  let value = 0;
  let shift = 0;
  let integer = 0;
  do {
    const c = mappings.charCodeAt(pos++);
    integer = charToInt[c];
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
function hasMoreVlq(mappings, i, length) {
  if (i >= length)
    return false;
  return mappings.charCodeAt(i) !== comma;
}
function sort(line) {
  line.sort(sortComparator);
}
function sortComparator(a, b) {
  return a[0] - b[0];
}
function encode(decoded) {
  const state = new Int32Array(5);
  const bufLength = 1024 * 16;
  const subLength = bufLength - 36;
  const buf = new Uint8Array(bufLength);
  const sub = buf.subarray(0, subLength);
  let pos = 0;
  let out = "";
  for (let i = 0; i < decoded.length; i++) {
    const line = decoded[i];
    if (i > 0) {
      if (pos === bufLength) {
        out += td.decode(buf);
        pos = 0;
      }
      buf[pos++] = semicolon;
    }
    if (line.length === 0)
      continue;
    state[0] = 0;
    for (let j = 0; j < line.length; j++) {
      const segment = line[j];
      if (pos > subLength) {
        out += td.decode(sub);
        buf.copyWithin(0, subLength, pos);
        pos -= subLength;
      }
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
  return out + td.decode(buf.subarray(0, pos));
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

// node_modules/.pnpm/@jridgewell+resolve-uri@3.1.2/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.mjs
var schemeRegex = /^[\w+.-]+:\/\//;
var urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
var fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
function isAbsoluteUrl(input) {
  return schemeRegex.test(input);
}
function isSchemeRelativeUrl(input) {
  return input.startsWith("//");
}
function isAbsolutePath(input) {
  return input.startsWith("/");
}
function isFileUrl(input) {
  return input.startsWith("file:");
}
function isRelative(input) {
  return /^[.?#]/.test(input);
}
function parseAbsoluteUrl(input) {
  const match = urlRegex.exec(input);
  return makeUrl(match[1], match[2] || "", match[3], match[4] || "", match[5] || "/", match[6] || "", match[7] || "");
}
function parseFileUrl(input) {
  const match = fileRegex.exec(input);
  const path6 = match[2];
  return makeUrl("file:", "", match[1] || "", "", isAbsolutePath(path6) ? path6 : "/" + path6, match[3] || "", match[4] || "");
}
function makeUrl(scheme, user, host, port, path6, query, hash) {
  return {
    scheme,
    user,
    host,
    port,
    path: path6,
    query,
    hash,
    type: 7
  };
}
function parseUrl(input) {
  if (isSchemeRelativeUrl(input)) {
    const url2 = parseAbsoluteUrl("http:" + input);
    url2.scheme = "";
    url2.type = 6;
    return url2;
  }
  if (isAbsolutePath(input)) {
    const url2 = parseAbsoluteUrl("http://foo.com" + input);
    url2.scheme = "";
    url2.host = "";
    url2.type = 5;
    return url2;
  }
  if (isFileUrl(input))
    return parseFileUrl(input);
  if (isAbsoluteUrl(input))
    return parseAbsoluteUrl(input);
  const url = parseAbsoluteUrl("http://foo.com/" + input);
  url.scheme = "";
  url.host = "";
  url.type = input ? input.startsWith("?") ? 3 : input.startsWith("#") ? 2 : 4 : 1;
  return url;
}
function stripPathFilename(path6) {
  if (path6.endsWith("/.."))
    return path6;
  const index = path6.lastIndexOf("/");
  return path6.slice(0, index + 1);
}
function mergePaths(url, base) {
  normalizePath(base, base.type);
  if (url.path === "/") {
    url.path = base.path;
  } else {
    url.path = stripPathFilename(base.path) + url.path;
  }
}
function normalizePath(url, type) {
  const rel = type <= 4;
  const pieces = url.path.split("/");
  let pointer = 1;
  let positive = 0;
  let addTrailingSlash = false;
  for (let i = 1; i < pieces.length; i++) {
    const piece = pieces[i];
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
      } else if (rel) {
        pieces[pointer++] = piece;
      }
      continue;
    }
    pieces[pointer++] = piece;
    positive++;
  }
  let path6 = "";
  for (let i = 1; i < pointer; i++) {
    path6 += "/" + pieces[i];
  }
  if (!path6 || addTrailingSlash && !path6.endsWith("/..")) {
    path6 += "/";
  }
  url.path = path6;
}
function resolve(input, base) {
  if (!input && !base)
    return "";
  const url = parseUrl(input);
  let inputType = url.type;
  if (base && inputType !== 7) {
    const baseUrl = parseUrl(base);
    const baseType = baseUrl.type;
    switch (inputType) {
      case 1:
        url.hash = baseUrl.hash;
      case 2:
        url.query = baseUrl.query;
      case 3:
      case 4:
        mergePaths(url, baseUrl);
      case 5:
        url.user = baseUrl.user;
        url.host = baseUrl.host;
        url.port = baseUrl.port;
      case 6:
        url.scheme = baseUrl.scheme;
    }
    if (baseType > inputType)
      inputType = baseType;
  }
  normalizePath(url, inputType);
  const queryHash = url.query + url.hash;
  switch (inputType) {
    case 2:
    case 3:
      return queryHash;
    case 4: {
      const path6 = url.path.slice(1);
      if (!path6)
        return queryHash || ".";
      if (isRelative(base || input) && !isRelative(path6)) {
        return "./" + path6 + queryHash;
      }
      return path6 + queryHash;
    }
    case 5:
      return url.path + queryHash;
    default:
      return url.scheme + "//" + url.user + url.host + url.port + url.path + queryHash;
  }
}

// node_modules/.pnpm/@jridgewell+trace-mapping@0.3.25/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs
function resolve2(input, base) {
  if (base && !base.endsWith("/"))
    base += "/";
  return resolve(input, base);
}
function stripFilename(path6) {
  if (!path6)
    return "";
  const index = path6.lastIndexOf("/");
  return path6.slice(0, index + 1);
}
var COLUMN = 0;
function maybeSort(mappings, owned) {
  const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
  if (unsortedIndex === mappings.length)
    return mappings;
  if (!owned)
    mappings = mappings.slice();
  for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
    mappings[i] = sortSegments(mappings[i], owned);
  }
  return mappings;
}
function nextUnsortedSegmentLine(mappings, start) {
  for (let i = start; i < mappings.length; i++) {
    if (!isSorted(mappings[i]))
      return i;
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
  for (let i = index + 1; i < haystack.length; index = i++) {
    if (haystack[i][COLUMN] !== needle)
      break;
  }
  return index;
}
function lowerBound(haystack, needle, index) {
  for (let i = index - 1; i >= 0; index = i--) {
    if (haystack[i][COLUMN] !== needle)
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
var LEAST_UPPER_BOUND = -1;
var GREATEST_LOWER_BOUND = 1;
var TraceMap = class {
  constructor(map, mapUrl) {
    const isString2 = typeof map === "string";
    if (!isString2 && map._decodedMemo)
      return map;
    const parsed = isString2 ? JSON.parse(map) : map;
    const { version, file, names, sourceRoot, sources: sources3, sourcesContent } = parsed;
    this.version = version;
    this.file = file;
    this.names = names || [];
    this.sourceRoot = sourceRoot;
    this.sources = sources3;
    this.sourcesContent = sourcesContent;
    this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || void 0;
    const from = resolve2(sourceRoot || "", stripFilename(mapUrl));
    this.resolvedSources = sources3.map((s) => resolve2(s || "", from));
    const { mappings } = parsed;
    if (typeof mappings === "string") {
      this._encoded = mappings;
      this._decoded = void 0;
    } else {
      this._encoded = void 0;
      this._decoded = maybeSort(mappings, isString2);
    }
    this._decodedMemo = memoizedState();
    this._bySources = void 0;
    this._bySourceMemos = void 0;
  }
};
function cast(map) {
  return map;
}
function decodedMappings(map) {
  var _a;
  return (_a = cast(map))._decoded || (_a._decoded = decode(cast(map)._encoded));
}
function traceSegment(map, line, column) {
  const decoded = decodedMappings(map);
  if (line >= decoded.length)
    return null;
  const segments = decoded[line];
  const index = traceSegmentInternal(segments, cast(map)._decodedMemo, line, column, GREATEST_LOWER_BOUND);
  return index === -1 ? null : segments[index];
}
function traceSegmentInternal(segments, memo, line, column, bias) {
  let index = memoizedBinarySearch(segments, column, memo, line);
  if (found) {
    index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
  } else if (bias === LEAST_UPPER_BOUND)
    index++;
  if (index === -1 || index === segments.length)
    return -1;
  return index;
}

// node_modules/.pnpm/@jridgewell+set-array@1.2.1/node_modules/@jridgewell/set-array/dist/set-array.mjs
var SetArray = class {
  constructor() {
    this._indexes = { __proto__: null };
    this.array = [];
  }
};
function cast2(set) {
  return set;
}
function get(setarr, key) {
  return cast2(setarr)._indexes[key];
}
function put(setarr, key) {
  const index = get(setarr, key);
  if (index !== void 0)
    return index;
  const { array, _indexes: indexes } = cast2(setarr);
  const length = array.push(key);
  return indexes[key] = length - 1;
}
function remove(setarr, key) {
  const index = get(setarr, key);
  if (index === void 0)
    return;
  const { array, _indexes: indexes } = cast2(setarr);
  for (let i = index + 1; i < array.length; i++) {
    const k = array[i];
    array[i - 1] = k;
    indexes[k]--;
  }
  indexes[key] = void 0;
  array.pop();
}

// node_modules/.pnpm/@jridgewell+gen-mapping@0.3.5/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.mjs
var COLUMN2 = 0;
var SOURCES_INDEX = 1;
var SOURCE_LINE = 2;
var SOURCE_COLUMN = 3;
var NAMES_INDEX = 4;
var NO_NAME = -1;
var GenMapping = class {
  constructor({ file, sourceRoot } = {}) {
    this._names = new SetArray();
    this._sources = new SetArray();
    this._sourcesContent = [];
    this._mappings = [];
    this.file = file;
    this.sourceRoot = sourceRoot;
    this._ignoreList = new SetArray();
  }
};
function cast3(map) {
  return map;
}
var maybeAddSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
  return addSegmentInternal(true, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content);
};
function setSourceContent(map, source, content) {
  const { _sources: sources3, _sourcesContent: sourcesContent } = cast3(map);
  const index = put(sources3, source);
  sourcesContent[index] = content;
}
function setIgnore(map, source, ignore = true) {
  const { _sources: sources3, _sourcesContent: sourcesContent, _ignoreList: ignoreList } = cast3(map);
  const index = put(sources3, source);
  if (index === sourcesContent.length)
    sourcesContent[index] = null;
  if (ignore)
    put(ignoreList, index);
  else
    remove(ignoreList, index);
}
function toDecodedMap(map) {
  const { _mappings: mappings, _sources: sources3, _sourcesContent: sourcesContent, _names: names, _ignoreList: ignoreList } = cast3(map);
  removeEmptyFinalLines(mappings);
  return {
    version: 3,
    file: map.file || void 0,
    names: names.array,
    sourceRoot: map.sourceRoot || void 0,
    sources: sources3.array,
    sourcesContent,
    mappings,
    ignoreList: ignoreList.array
  };
}
function toEncodedMap(map) {
  const decoded = toDecodedMap(map);
  return Object.assign(Object.assign({}, decoded), { mappings: encode(decoded.mappings) });
}
function addSegmentInternal(skipable, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) {
  const { _mappings: mappings, _sources: sources3, _sourcesContent: sourcesContent, _names: names } = cast3(map);
  const line = getLine(mappings, genLine);
  const index = getColumnIndex(line, genColumn);
  if (!source) {
    if (skipable && skipSourceless(line, index))
      return;
    return insert(line, index, [genColumn]);
  }
  const sourcesIndex = put(sources3, source);
  const namesIndex = name ? put(names, name) : NO_NAME;
  if (sourcesIndex === sourcesContent.length)
    sourcesContent[sourcesIndex] = content !== null && content !== void 0 ? content : null;
  if (skipable && skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex)) {
    return;
  }
  return insert(line, index, name ? [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex] : [genColumn, sourcesIndex, sourceLine, sourceColumn]);
}
function getLine(mappings, index) {
  for (let i = mappings.length; i <= index; i++) {
    mappings[i] = [];
  }
  return mappings[index];
}
function getColumnIndex(line, genColumn) {
  let index = line.length;
  for (let i = index - 1; i >= 0; index = i--) {
    const current = line[i];
    if (genColumn >= current[COLUMN2])
      break;
  }
  return index;
}
function insert(array, index, value) {
  for (let i = array.length; i > index; i--) {
    array[i] = array[i - 1];
  }
  array[index] = value;
}
function removeEmptyFinalLines(mappings) {
  const { length } = mappings;
  let len = length;
  for (let i = len - 1; i >= 0; len = i, i--) {
    if (mappings[i].length > 0)
      break;
  }
  if (len < length)
    mappings.length = len;
}
function skipSourceless(line, index) {
  if (index === 0)
    return true;
  const prev = line[index - 1];
  return prev.length === 1;
}
function skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex) {
  if (index === 0)
    return false;
  const prev = line[index - 1];
  if (prev.length === 1)
    return false;
  return sourcesIndex === prev[SOURCES_INDEX] && sourceLine === prev[SOURCE_LINE] && sourceColumn === prev[SOURCE_COLUMN] && namesIndex === (prev.length === 5 ? prev[NAMES_INDEX] : NO_NAME);
}

// node_modules/.pnpm/@ampproject+remapping@2.3.0/node_modules/@ampproject/remapping/dist/remapping.mjs
var SOURCELESS_MAPPING = /* @__PURE__ */ SegmentObject("", -1, -1, "", null, false);
var EMPTY_SOURCES = [];
function SegmentObject(source, line, column, name, content, ignore) {
  return { source, line, column, name, content, ignore };
}
function Source(map, sources3, source, content, ignore) {
  return {
    map,
    sources: sources3,
    source,
    content,
    ignore
  };
}
function MapSource(map, sources3) {
  return Source(map, sources3, "", null, false);
}
function OriginalSource(source, content, ignore) {
  return Source(null, EMPTY_SOURCES, source, content, ignore);
}
function traceMappings(tree) {
  const gen = new GenMapping({ file: tree.map.file });
  const { sources: rootSources, map } = tree;
  const rootNames = map.names;
  const rootMappings = decodedMappings(map);
  for (let i = 0; i < rootMappings.length; i++) {
    const segments = rootMappings[i];
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      const genCol = segment[0];
      let traced = SOURCELESS_MAPPING;
      if (segment.length !== 1) {
        const source2 = rootSources[segment[1]];
        traced = originalPositionFor(source2, segment[2], segment[3], segment.length === 5 ? rootNames[segment[4]] : "");
        if (traced == null)
          continue;
      }
      const { column, line, name, content, source, ignore } = traced;
      maybeAddSegment(gen, i, genCol, source, line, column, name);
      if (source && content != null)
        setSourceContent(gen, source, content);
      if (ignore)
        setIgnore(gen, source, true);
    }
  }
  return gen;
}
function originalPositionFor(source, line, column, name) {
  if (!source.map) {
    return SegmentObject(source.source, line, column, name, source.content, source.ignore);
  }
  const segment = traceSegment(source.map, line, column);
  if (segment == null)
    return null;
  if (segment.length === 1)
    return SOURCELESS_MAPPING;
  return originalPositionFor(source.sources[segment[1]], segment[2], segment[3], segment.length === 5 ? source.map.names[segment[4]] : name);
}
function asArray(value) {
  if (Array.isArray(value))
    return value;
  return [value];
}
function buildSourceMapTree(input, loader) {
  const maps = asArray(input).map((m) => new TraceMap(m, ""));
  const map = maps.pop();
  for (let i = 0; i < maps.length; i++) {
    if (maps[i].sources.length > 1) {
      throw new Error(`Transformation map ${i} must have exactly one source file.
Did you specify these with the most recent transformation maps first?`);
    }
  }
  let tree = build(map, loader, "", 0);
  for (let i = maps.length - 1; i >= 0; i--) {
    tree = MapSource(maps[i], [tree]);
  }
  return tree;
}
function build(map, loader, importer, importerDepth) {
  const { resolvedSources, sourcesContent, ignoreList } = map;
  const depth = importerDepth + 1;
  const children = resolvedSources.map((sourceFile, i) => {
    const ctx = {
      importer,
      depth,
      source: sourceFile || "",
      content: void 0,
      ignore: void 0
    };
    const sourceMap = loader(ctx.source, ctx);
    const { source, content, ignore } = ctx;
    if (sourceMap)
      return build(new TraceMap(sourceMap, source), loader, source, depth);
    const sourceContent = content !== void 0 ? content : sourcesContent ? sourcesContent[i] : null;
    const ignored = ignore !== void 0 ? ignore : ignoreList ? ignoreList.includes(i) : false;
    return OriginalSource(source, sourceContent, ignored);
  });
  return MapSource(map, children);
}
var SourceMap = class {
  constructor(map, options) {
    const out = options.decodedMappings ? toDecodedMap(map) : toEncodedMap(map);
    this.version = out.version;
    this.file = out.file;
    this.mappings = out.mappings;
    this.names = out.names;
    this.ignoreList = out.ignoreList;
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

// src/esbuild/utils.ts
import { Parser } from "acorn";

// src/utils.ts
import { isAbsolute, normalize } from "path";
function normalizeAbsolutePath(path6) {
  if (isAbsolute(path6))
    return normalize(path6);
  else
    return path6;
}
function toArray(array) {
  array = array || [];
  if (Array.isArray(array))
    return array;
  return [array];
}
function shouldLoad(id, plugin, externalModules) {
  if (id.startsWith(plugin.__virtualModulePrefix))
    id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
  if (plugin.loadInclude && !plugin.loadInclude(id))
    return false;
  return !externalModules.has(id);
}
function transformUse(data, plugin, transformLoader) {
  if (data.resource == null)
    return [];
  const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ""));
  if (!plugin.transformInclude || plugin.transformInclude(id)) {
    return [{
      loader: `${transformLoader}?unpluginName=${encodeURIComponent(plugin.name)}`
    }];
  }
  return [];
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
function guessLoader(code, id) {
  return ExtToLoader[path2.extname(id).toLowerCase()] || "js";
}
function unwrapLoader(loader, code, id) {
  if (typeof loader === "function")
    return loader(code, id);
  return loader;
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
        return `data:application/json;charset=utf-8;base64,${Buffer2.from(this.toString()).toString("base64")}`;
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
function createBuildContext(initialOptions) {
  const watchFiles = [];
  return {
    parse(code, opts = {}) {
      return Parser.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile() {
      throw new Error("unplugin/esbuild: addWatchFile outside supported hooks (resolveId, load, transform)");
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (initialOptions.outdir && emittedFile.source && outFileName) {
        const outPath = path2.resolve(initialOptions.outdir, outFileName);
        const outDir = path2.dirname(outPath);
        if (!fs.existsSync(outDir))
          fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, emittedFile.source);
      }
    },
    getWatchFiles() {
      return watchFiles;
    }
  };
}
function createPluginContext(context) {
  const errors = [];
  const warnings = [];
  const pluginContext = {
    error(message) {
      errors.push(normalizeMessage2(message));
    },
    warn(message) {
      warnings.push(normalizeMessage2(message));
    }
  };
  function normalizeMessage2(message) {
    if (typeof message === "string")
      message = { message };
    return {
      id: message.id,
      pluginName: message.plugin,
      text: message.message,
      location: message.loc ? {
        file: message.loc.file,
        line: message.loc.line,
        column: message.loc.column
      } : null,
      detail: message.meta,
      notes: []
    };
  }
  const mixedContext = {
    ...context,
    ...pluginContext,
    addWatchFile(id) {
      context.getWatchFiles().push(id);
    }
  };
  return {
    errors,
    warnings,
    mixedContext
  };
}
function processCodeWithSourceMap(map, code) {
  if (map) {
    if (!map.sourcesContent || map.sourcesContent.length === 0)
      map.sourcesContent = [code];
    map = fixSourceMap(map);
    code += `
//# sourceMappingURL=${map.toUrl()}`;
  }
  return code;
}

// src/esbuild/index.ts
function getEsbuildPlugin(factory) {
  return (userOptions) => {
    const meta = {
      framework: "esbuild"
    };
    const plugins = toArray(factory(userOptions, meta));
    const setupPlugins = async (build2) => {
      const setup = buildSetup(meta);
      const loaders = [];
      for (const plugin of plugins) {
        const loader = {};
        await setup(plugin)({
          ...build2,
          onLoad(_options, callback) {
            loader.options = _options;
            loader.onLoadCb = callback;
          },
          onTransform(_options, callback) {
            loader.options || (loader.options = _options);
            loader.onTransformCb = callback;
          }
        });
        if (loader.onLoadCb || loader.onTransformCb)
          loaders.push(loader);
      }
      if (loaders.length) {
        build2.onLoad(loaders.length === 1 ? loaders[0].options : { filter: /.*/ }, async (args) => {
          function checkFilter(options) {
            return loaders.length === 1 || !(options == null ? void 0 : options.filter) || options.filter.test(args.path);
          }
          let result;
          for (const { options, onLoadCb } of loaders) {
            if (!checkFilter(options))
              continue;
            if (onLoadCb)
              result = await onLoadCb(args);
            if (result == null ? void 0 : result.contents)
              break;
          }
          let fsContentsCache;
          for (const { options, onTransformCb } of loaders) {
            if (!checkFilter(options))
              continue;
            if (onTransformCb) {
              const newArgs = {
                ...result,
                ...args,
                async getContents() {
                  if (result == null ? void 0 : result.contents)
                    return result.contents;
                  if (fsContentsCache)
                    return fsContentsCache;
                  return fsContentsCache = await fs2.promises.readFile(args.path, "utf8");
                }
              };
              const _result = await onTransformCb(newArgs);
              if (_result == null ? void 0 : _result.contents)
                result = _result;
            }
          }
          if (result == null ? void 0 : result.contents)
            return result;
        });
      }
    };
    return {
      name: (plugins.length === 1 ? plugins[0].name : meta.esbuildHostName) ?? `unplugin-host:${plugins.map((p) => p.name).join(":")}`,
      setup: setupPlugins
    };
  };
}
function buildSetup(meta) {
  return (plugin) => {
    var _a;
    if ((_a = plugin.esbuild) == null ? void 0 : _a.setup)
      return plugin.esbuild.setup;
    return (build2) => {
      var _a2, _b, _c, _d;
      meta.build = build2;
      const { onStart, onEnd, onResolve, onLoad, onTransform, initialOptions } = build2;
      const onResolveFilter = ((_a2 = plugin.esbuild) == null ? void 0 : _a2.onResolveFilter) ?? /.*/;
      const onLoadFilter = ((_b = plugin.esbuild) == null ? void 0 : _b.onLoadFilter) ?? /.*/;
      const loader = ((_c = plugin.esbuild) == null ? void 0 : _c.loader) ?? guessLoader;
      const context = createBuildContext(initialOptions);
      if ((_d = plugin.esbuild) == null ? void 0 : _d.config)
        plugin.esbuild.config.call(context, initialOptions);
      if (plugin.buildStart)
        onStart(() => plugin.buildStart.call(context));
      if (plugin.buildEnd || plugin.writeBundle) {
        onEnd(async () => {
          if (plugin.buildEnd)
            await plugin.buildEnd.call(context);
          if (plugin.writeBundle)
            await plugin.writeBundle();
        });
      }
      if (plugin.resolveId) {
        onResolve({ filter: onResolveFilter }, async (args) => {
          var _a3;
          if ((_a3 = initialOptions.external) == null ? void 0 : _a3.includes(args.path)) {
            return void 0;
          }
          const { errors, warnings, mixedContext } = createPluginContext(context);
          const isEntry = args.kind === "entry-point";
          const result = await plugin.resolveId.call(
            mixedContext,
            args.path,
            // We explicitly have this if statement here for consistency with
            // the integration of other bundlers.
            // Here, `args.importer` is just an empty string on entry files
            // whereas the equivalent on other bundlers is`undefined.`
            isEntry ? void 0 : args.importer,
            { isEntry }
          );
          if (typeof result === "string") {
            return {
              path: result,
              namespace: plugin.name,
              errors,
              warnings,
              watchFiles: mixedContext.getWatchFiles()
            };
          } else if (typeof result === "object" && result !== null) {
            return {
              path: result.id,
              external: result.external,
              namespace: plugin.name,
              errors,
              warnings,
              watchFiles: mixedContext.getWatchFiles()
            };
          }
        });
      }
      if (plugin.load) {
        onLoad({ filter: onLoadFilter }, async (args) => {
          const id = args.path + args.suffix;
          const { errors, warnings, mixedContext } = createPluginContext(context);
          const resolveDir = path3.dirname(args.path);
          let code, map;
          if (plugin.load && (!plugin.loadInclude || plugin.loadInclude(id))) {
            const result = await plugin.load.call(mixedContext, id);
            if (typeof result === "string") {
              code = result;
            } else if (typeof result === "object" && result !== null) {
              code = result.code;
              map = result.map;
            }
          }
          if (code === void 0)
            return null;
          if (map)
            code = processCodeWithSourceMap(map, code);
          return {
            contents: code,
            errors,
            warnings,
            watchFiles: mixedContext.getWatchFiles(),
            loader: unwrapLoader(loader, code, args.path),
            resolveDir
          };
        });
      }
      if (plugin.transform) {
        onTransform({ filter: onLoadFilter }, async (args) => {
          const id = args.path + args.suffix;
          if (plugin.transformInclude && !plugin.transformInclude(id))
            return;
          const { mixedContext, errors, warnings } = createPluginContext(context);
          const resolveDir = path3.dirname(args.path);
          let code = await args.getContents();
          let map;
          const result = await plugin.transform.call(mixedContext, code, id);
          if (typeof result === "string") {
            code = result;
          } else if (typeof result === "object" && result !== null) {
            code = result.code;
            if (map && result.map) {
              map = combineSourcemaps(args.path, [
                result.map === "string" ? JSON.parse(result.map) : result.map,
                map
              ]);
            } else {
              if (typeof result.map === "string") {
                map = JSON.parse(result.map);
              } else {
                map = result.map;
              }
            }
          }
          if (code) {
            if (map)
              code = processCodeWithSourceMap(map, code);
            return {
              contents: code,
              errors,
              warnings,
              watchFiles: mixedContext.getWatchFiles(),
              loader: unwrapLoader(loader, code, args.path),
              resolveDir
            };
          }
        });
      }
    };
  };
}

// src/farm/index.ts
import path5 from "path";

// src/farm/context.ts
import { Buffer as Buffer3 } from "buffer";
import { extname } from "path";
import { Parser as Parser2 } from "acorn";
function createFarmContext(context, currentResolveId) {
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
      context.addWatchFile(currentResolveId || id, id);
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        context.emitFile({
          resolvedPath: outFileName,
          name: outFileName,
          content: [...Buffer3.from(emittedFile.source)],
          resourceType: extname(outFileName)
        });
      }
    },
    getWatchFiles() {
      return context.getWatchFiles();
    }
  };
}
function unpluginContext(context) {
  return {
    error: (error) => context.error(
      typeof error === "string" ? new Error(error) : error
    ),
    warn: (error) => context.warn(typeof error === "string" ? new Error(error) : error)
  };
}

// src/farm/utils.ts
import path4 from "path";
import * as querystring from "querystring";
var ExtToLoader2 = {
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".jsx": "jsx",
  ".ts": "ts",
  ".cts": "ts",
  ".mts": "ts",
  ".tsx": "tsx",
  ".json": "json",
  ".toml": "toml",
  ".text": "text",
  ".wasm": "wasm",
  ".napi": "napi",
  ".node": "napi"
};
function guessIdLoader(id) {
  return ExtToLoader2[path4.extname(id).toLowerCase()] || "js";
}
function transformQuery(context) {
  const queryParamsObject = {};
  context.query.forEach(([param, value]) => {
    queryParamsObject[param] = value;
  });
  const transformQuery2 = querystring.stringify(queryParamsObject);
  context.resolvedPath = `${context.resolvedPath}?${transformQuery2}`;
}
function convertEnforceToPriority(value) {
  const defaultPriority = 100;
  const enforceToPriority = {
    pre: 101,
    post: 99
  };
  return enforceToPriority[value] !== void 0 ? enforceToPriority[value] : defaultPriority;
}
function convertWatchEventChange(value) {
  const watchEventChange = {
    Added: "create",
    Updated: "update",
    Removed: "delete"
  };
  return watchEventChange[value];
}
function getContentValue(content) {
  return typeof content === "string" ? content : content.code;
}
function isString(variable) {
  return typeof variable === "string";
}
function isObject(variable) {
  return typeof variable === "object" && variable !== null;
}
function customParseQueryString(url) {
  if (!url)
    return [];
  const queryString = url.split("?")[1];
  const parsedParams = querystring.parse(queryString);
  const paramsArray = [];
  for (const key in parsedParams)
    paramsArray.push([key, parsedParams[key]]);
  return paramsArray;
}

// src/farm/index.ts
function getFarmPlugin(factory) {
  return (userOptions) => {
    const meta = {
      framework: "farm"
    };
    const rawPlugins = toArray(factory(userOptions, meta));
    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toFarmPlugin(rawPlugin, userOptions);
      if (rawPlugin.farm)
        Object.assign(plugin, rawPlugin.farm);
      return plugin;
    });
    return plugins.length === 1 ? plugins[0] : plugins;
  };
}
function toFarmPlugin(plugin, options) {
  const farmPlugin = {
    name: plugin.name,
    priority: convertEnforceToPriority(plugin.enforce)
  };
  if (plugin.farm) {
    Object.keys(plugin.farm).forEach((key) => {
      const value = plugin.farm[key];
      if (value)
        Reflect.set(farmPlugin, key, value);
    });
  }
  if (plugin.buildStart) {
    const _buildStart = plugin.buildStart;
    farmPlugin.buildStart = {
      async executor(_, context) {
        await _buildStart.call(createFarmContext(context));
      }
    };
  }
  if (plugin.resolveId) {
    const _resolveId = plugin.resolveId;
    let filters = [];
    if (options)
      filters = (options == null ? void 0 : options.filters) ?? [];
    farmPlugin.resolve = {
      filters: { sources: [".*", ...filters], importers: [".*"] },
      async executor(params, context) {
        const resolvedIdPath = path5.resolve(
          process.cwd(),
          params.importer ?? ""
        );
        let isEntry = false;
        if (isObject(params.kind) && "entry" in params.kind) {
          const kindWithEntry = params.kind;
          isEntry = kindWithEntry.entry === "index";
        }
        const farmContext = createFarmContext(context, resolvedIdPath);
        const resolveIdResult = await _resolveId.call(
          Object.assign(unpluginContext(context), farmContext),
          params.source,
          resolvedIdPath ?? null,
          { isEntry }
        );
        if (isString(resolveIdResult)) {
          return {
            resolvedPath: resolveIdResult,
            query: customParseQueryString(resolveIdResult),
            sideEffects: false,
            external: false,
            meta: {}
          };
        } else if (isObject(resolveIdResult)) {
          return {
            resolvedPath: resolveIdResult == null ? void 0 : resolveIdResult.id,
            query: customParseQueryString(resolveIdResult.id),
            sideEffects: false,
            external: resolveIdResult == null ? void 0 : resolveIdResult.external,
            meta: {}
          };
        }
        return null;
      }
    };
  }
  if (plugin.load) {
    const _load = plugin.load;
    farmPlugin.load = {
      filters: {
        resolvedPaths: [".*"]
      },
      async executor(id, context) {
        if (plugin.loadInclude && !plugin.loadInclude(id.resolvedPath))
          return null;
        const loader = guessIdLoader(id.resolvedPath);
        const shouldLoadInclude = plugin.loadInclude && plugin.loadInclude(id.resolvedPath);
        const farmContext = createFarmContext(context, id.resolvedPath);
        const content = await _load.call(
          Object.assign(unpluginContext(context), farmContext),
          id.resolvedPath
        );
        const loadFarmResult = {
          content: getContentValue(content),
          moduleType: loader
        };
        if (shouldLoadInclude)
          return loadFarmResult;
        return null;
      }
    };
  }
  if (plugin.transform) {
    const _transform = plugin.transform;
    farmPlugin.transform = {
      filters: { resolvedPaths: [".*"], moduleTypes: [".*"] },
      async executor(params, context) {
        if (params.query.length)
          transformQuery(params);
        if (plugin.transformInclude && !plugin.transformInclude(params.resolvedPath))
          return null;
        const loader = params.moduleType ?? guessIdLoader(params.resolvedPath);
        const shouldTransformInclude = plugin.transformInclude && plugin.transformInclude(params.resolvedPath);
        const farmContext = createFarmContext(context, params.resolvedPath);
        const resource = await _transform.call(
          Object.assign(unpluginContext(context), farmContext),
          params.content,
          params.resolvedPath
        );
        if (resource && typeof resource !== "string") {
          const transformFarmResult = {
            content: getContentValue(resource),
            moduleType: loader,
            sourceMap: JSON.stringify(resource.map)
          };
          if (shouldTransformInclude)
            return transformFarmResult;
          return transformFarmResult;
        }
      }
    };
  }
  if (plugin.watchChange) {
    const _watchChange = plugin.watchChange;
    farmPlugin.updateModules = {
      async executor(param, context) {
        const updatePathContent = param.paths[0];
        const ModifiedPath = updatePathContent[0];
        const eventChange = convertWatchEventChange(
          updatePathContent[1]
        );
        await _watchChange.call(createFarmContext(context), ModifiedPath, {
          event: eventChange
        });
      }
    };
  }
  if (plugin.buildEnd) {
    const _buildEnd = plugin.buildEnd;
    farmPlugin.buildEnd = {
      async executor(_, context) {
        await _buildEnd.call(createFarmContext(context));
      }
    };
  }
  if (plugin.writeBundle) {
    const _writeBundle = plugin.writeBundle;
    farmPlugin.finish = {
      async executor() {
        await _writeBundle();
      }
    };
  }
  return farmPlugin;
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

// src/rolldown/index.ts
function getRolldownPlugin(factory) {
  return (userOptions) => {
    const meta = {
      framework: "rolldown"
    };
    const rawPlugins = toArray(factory(userOptions, meta));
    const plugins = rawPlugins.map((rawPlugin) => {
      const plugin = toRollupPlugin(rawPlugin, false);
      if (rawPlugin.rolldown)
        Object.assign(plugin, rawPlugin.rolldown);
      return plugin;
    });
    return plugins.length === 1 ? plugins[0] : plugins;
  };
}

// src/rspack/index.ts
import { resolve as resolve3 } from "path";

// src/rspack/context.ts
import { Buffer as Buffer4 } from "buffer";
import sources from "webpack-sources";
import { Parser as Parser3 } from "acorn";
function createBuildContext2(compilation) {
  return {
    parse(code, opts = {}) {
      return Parser3.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile() {
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        compilation.emitAsset(
          outFileName,
          new sources.RawSource(
            // @ts-expect-error types mismatch
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer4.from(emittedFile.source)
          )
        );
      }
    },
    getWatchFiles() {
      return [];
    }
  };
}

// src/rspack/index.ts
var TRANSFORM_LOADER = resolve3(
  __dirname,
  false ? "../../dist/rspack/loaders/transform.js" : "rspack/loaders/transform"
);
var LOAD_LOADER = resolve3(
  __dirname,
  false ? "../../dist/rspack/loaders/load.js" : "rspack/loaders/load"
);
function getRspackPlugin(factory) {
  return (userOptions) => {
    return {
      apply(compiler) {
        const VIRTUAL_MODULE_PREFIX = resolve3(compiler.options.context ?? process.cwd(), "_virtual_");
        const injected = compiler.$unpluginContext || {};
        compiler.$unpluginContext = injected;
        const meta = {
          framework: "rspack",
          rspack: {
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
            if (typeof compilation.hooks.childCompiler === "undefined")
              throw new Error("`compilation.hooks.childCompiler` only support by @rspack/core>=0.4.1");
            compilation.hooks.childCompiler.tap(plugin.name, (childCompiler) => {
              childCompiler.$unpluginContext = injected;
            });
          });
          const externalModules = /* @__PURE__ */ new Set();
          if (plugin.load) {
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              include(id) {
                return shouldLoad(id, plugin, externalModules);
              },
              use: [{
                loader: LOAD_LOADER,
                options: {
                  unpluginName: plugin.name
                }
              }]
            });
          }
          if (plugin.transform) {
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              use(data) {
                return transformUse(data, plugin, TRANSFORM_LOADER);
              }
            });
          }
          if (plugin.rspack)
            plugin.rspack(compiler);
          if (plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createBuildContext2(compilation);
              return plugin.buildStart.call(context);
            });
          }
          if (plugin.buildEnd) {
            compiler.hooks.emit.tapPromise(plugin.name, async (compilation) => {
              await plugin.buildEnd.call(createBuildContext2(compilation));
            });
          }
          if (plugin.writeBundle) {
            compiler.hooks.afterEmit.tapPromise(plugin.name, async () => {
              await plugin.writeBundle();
            });
          }
        }
      }
    };
  };
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
import fs3 from "fs";
import { resolve as resolve5 } from "path";
import process3 from "process";
import VirtualModulesPlugin from "webpack-virtual-modules";

// src/webpack/context.ts
import { resolve as resolve4 } from "path";
import { Buffer as Buffer5 } from "buffer";
import process2 from "process";
import sources2 from "webpack-sources";
import { Parser as Parser4 } from "acorn";
function contextOptionsFromCompilation(compilation) {
  return {
    addWatchFile(file) {
      (compilation.fileDependencies ?? compilation.compilationDependencies).add(file);
    },
    getWatchFiles() {
      return Array.from(compilation.fileDependencies ?? compilation.compilationDependencies);
    }
  };
}
function createBuildContext3(options, compilation) {
  return {
    parse(code, opts = {}) {
      return Parser4.parse(code, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
        ...opts
      });
    },
    addWatchFile(id) {
      options.addWatchFile(resolve4(process2.cwd(), id));
    },
    emitFile(emittedFile) {
      const outFileName = emittedFile.fileName || emittedFile.name;
      if (emittedFile.source && outFileName) {
        if (!compilation)
          throw new Error("unplugin/webpack: emitFile outside supported hooks  (buildStart, buildEnd, load, transform, watchChange)");
        compilation.emitAsset(
          outFileName,
          sources2 ? new sources2.RawSource(
            // @ts-expect-error types mismatch
            typeof emittedFile.source === "string" ? emittedFile.source : Buffer5.from(emittedFile.source)
          ) : {
            source: () => emittedFile.source,
            size: () => emittedFile.source.length
          }
        );
      }
    },
    getWatchFiles() {
      return options.getWatchFiles();
    }
  };
}
function normalizeMessage(error) {
  const err = new Error(typeof error === "string" ? error : error.message);
  if (typeof error === "object") {
    err.stack = error.stack;
    err.cause = error.meta;
  }
  return err;
}

// src/webpack/index.ts
var TRANSFORM_LOADER2 = resolve5(
  __dirname,
  false ? "../../dist/webpack/loaders/transform" : "webpack/loaders/transform"
);
var LOAD_LOADER2 = resolve5(
  __dirname,
  false ? "../../dist/webpack/loaders/load" : "webpack/loaders/load"
);
function getWebpackPlugin(factory) {
  return (userOptions) => {
    return {
      apply(compiler) {
        const VIRTUAL_MODULE_PREFIX = resolve5(compiler.options.context ?? process3.cwd(), "_virtual_");
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
          if (plugin.resolveId) {
            let vfs = compiler.options.plugins.find((i) => i instanceof VirtualModulesPlugin);
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
                  const fileDependencies = /* @__PURE__ */ new Set();
                  const context = createBuildContext3({
                    addWatchFile(file) {
                      var _a;
                      fileDependencies.add(file);
                      (_a = resolveContext.fileDependencies) == null ? void 0 : _a.add(file);
                    },
                    getWatchFiles() {
                      return Array.from(fileDependencies);
                    }
                  });
                  let error;
                  const pluginContext = {
                    error(msg) {
                      if (error == null)
                        error = normalizeMessage(msg);
                      else
                        console.error(`unplugin/webpack: multiple errors returned from resolveId hook: ${msg}`);
                    },
                    warn(msg) {
                      console.warn(`unplugin/webpack: warning from resolveId hook: ${msg}`);
                    }
                  };
                  const resolveIdResult = await plugin.resolveId.call({ ...context, ...pluginContext }, id, importer, { isEntry });
                  if (error != null)
                    return callback(error);
                  if (resolveIdResult == null)
                    return callback();
                  let resolved = typeof resolveIdResult === "string" ? resolveIdResult : resolveIdResult.id;
                  const isExternal = typeof resolveIdResult === "string" ? false : resolveIdResult.external === true;
                  if (isExternal)
                    externalModules.add(resolved);
                  if (!fs3.existsSync(resolved)) {
                    resolved = normalizeAbsolutePath(
                      plugin.__virtualModulePrefix + encodeURIComponent(resolved)
                      // URI encode id so webpack doesn't think it's part of the path
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
                return shouldLoad(id, plugin, externalModules);
              },
              enforce: plugin.enforce,
              use: [{
                loader: LOAD_LOADER2,
                options: {
                  unpluginName: plugin.name
                }
              }]
            });
          }
          if (plugin.transform) {
            compiler.options.module.rules.unshift({
              enforce: plugin.enforce,
              use(data) {
                return transformUse(data, plugin, TRANSFORM_LOADER2);
              }
            });
          }
          if (plugin.webpack)
            plugin.webpack(compiler);
          if (plugin.watchChange || plugin.buildStart) {
            compiler.hooks.make.tapPromise(plugin.name, async (compilation) => {
              const context = createBuildContext3(contextOptionsFromCompilation(compilation), compilation);
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
              await plugin.buildEnd.call(createBuildContext3(contextOptionsFromCompilation(compilation), compilation));
            });
          }
          if (plugin.writeBundle) {
            compiler.hooks.afterEmit.tapPromise(plugin.name, async () => {
              await plugin.writeBundle();
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
    /** @experimental do not use it in production */
    get rolldown() {
      return getRolldownPlugin(factory);
    },
    get webpack() {
      return getWebpackPlugin(factory);
    },
    /** @experimental do not use it in production */
    get rspack() {
      return getRspackPlugin(factory);
    },
    get farm() {
      return getFarmPlugin(factory);
    },
    get raw() {
      return factory;
    }
  };
}
function createEsbuildPlugin(factory) {
  return getEsbuildPlugin(factory);
}
function createRollupPlugin(factory) {
  return getRollupPlugin(factory);
}
function createVitePlugin(factory) {
  return getVitePlugin(factory);
}
function createRolldownPlugin(factory) {
  return getRolldownPlugin(factory);
}
function createWebpackPlugin(factory) {
  return getWebpackPlugin(factory);
}
function createRspackPlugin(factory) {
  return getRspackPlugin(factory);
}
function createFarmPlugin(factory) {
  return getFarmPlugin(factory);
}
export {
  createEsbuildPlugin,
  createFarmPlugin,
  createRolldownPlugin,
  createRollupPlugin,
  createRspackPlugin,
  createUnplugin,
  createVitePlugin,
  createWebpackPlugin
};
