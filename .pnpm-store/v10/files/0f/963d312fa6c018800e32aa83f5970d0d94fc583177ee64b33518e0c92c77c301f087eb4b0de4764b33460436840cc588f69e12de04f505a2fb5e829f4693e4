import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  resolve
} from "../_node-chunks/chunk-XS5OAKHK.js";
import "../_node-chunks/chunk-DRM3MJ7Y.js";

// ../node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
var comma = 44, semicolon = 59, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", intToChar = new Uint8Array(64), charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  let c = chars.charCodeAt(i);
  intToChar[i] = c, charToInt[c] = i;
}
function encodeInteger(builder, num, relative) {
  let delta = num - relative;
  delta = delta < 0 ? -delta << 1 | 1 : delta << 1;
  do {
    let clamped = delta & 31;
    delta >>>= 5, delta > 0 && (clamped |= 32), builder.write(intToChar[clamped]);
  } while (delta > 0);
  return num;
}
var bufLength = 1024 * 16, td = typeof TextDecoder < "u" ? new TextDecoder() : typeof Buffer < "u" ? {
  decode(buf) {
    return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString();
  }
} : {
  decode(buf) {
    let out = "";
    for (let i = 0; i < buf.length; i++)
      out += String.fromCharCode(buf[i]);
    return out;
  }
}, StringWriter = class {
  constructor() {
    this.pos = 0, this.out = "", this.buffer = new Uint8Array(bufLength);
  }
  write(v) {
    let { buffer } = this;
    buffer[this.pos++] = v, this.pos === bufLength && (this.out += td.decode(buffer), this.pos = 0);
  }
  flush() {
    let { buffer, out, pos } = this;
    return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
  }
};
function encode(decoded) {
  let writer = new StringWriter(), sourcesIndex = 0, sourceLine = 0, sourceColumn = 0, namesIndex = 0;
  for (let i = 0; i < decoded.length; i++) {
    let line = decoded[i];
    if (i > 0 && writer.write(semicolon), line.length === 0) continue;
    let genColumn = 0;
    for (let j = 0; j < line.length; j++) {
      let segment = line[j];
      j > 0 && writer.write(comma), genColumn = encodeInteger(writer, segment[0], genColumn), segment.length !== 1 && (sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex), sourceLine = encodeInteger(writer, segment[2], sourceLine), sourceColumn = encodeInteger(writer, segment[3], sourceColumn), segment.length !== 4 && (namesIndex = encodeInteger(writer, segment[4], namesIndex)));
    }
  }
  return writer.flush();
}

// ../node_modules/magic-string/dist/magic-string.es.mjs
var BitSet = class _BitSet {
  constructor(arg) {
    this.bits = arg instanceof _BitSet ? arg.bits.slice() : [];
  }
  add(n3) {
    this.bits[n3 >> 5] |= 1 << (n3 & 31);
  }
  has(n3) {
    return !!(this.bits[n3 >> 5] & 1 << (n3 & 31));
  }
}, Chunk = class _Chunk {
  constructor(start, end, content) {
    this.start = start, this.end = end, this.original = content, this.intro = "", this.outro = "", this.content = content, this.storeName = !1, this.edited = !1, this.previous = null, this.next = null;
  }
  appendLeft(content) {
    this.outro += content;
  }
  appendRight(content) {
    this.intro = this.intro + content;
  }
  clone() {
    let chunk = new _Chunk(this.start, this.end, this.original);
    return chunk.intro = this.intro, chunk.outro = this.outro, chunk.content = this.content, chunk.storeName = this.storeName, chunk.edited = this.edited, chunk;
  }
  contains(index) {
    return this.start < index && index < this.end;
  }
  eachNext(fn) {
    let chunk = this;
    for (; chunk; )
      fn(chunk), chunk = chunk.next;
  }
  eachPrevious(fn) {
    let chunk = this;
    for (; chunk; )
      fn(chunk), chunk = chunk.previous;
  }
  edit(content, storeName, contentOnly) {
    return this.content = content, contentOnly || (this.intro = "", this.outro = ""), this.storeName = storeName, this.edited = !0, this;
  }
  prependLeft(content) {
    this.outro = content + this.outro;
  }
  prependRight(content) {
    this.intro = content + this.intro;
  }
  reset() {
    this.intro = "", this.outro = "", this.edited && (this.content = this.original, this.storeName = !1, this.edited = !1);
  }
  split(index) {
    let sliceIndex = index - this.start, originalBefore = this.original.slice(0, sliceIndex), originalAfter = this.original.slice(sliceIndex);
    this.original = originalBefore;
    let newChunk = new _Chunk(index, this.end, originalAfter);
    return newChunk.outro = this.outro, this.outro = "", this.end = index, this.edited ? (newChunk.edit("", !1), this.content = "") : this.content = originalBefore, newChunk.next = this.next, newChunk.next && (newChunk.next.previous = newChunk), newChunk.previous = this, this.next = newChunk, newChunk;
  }
  toString() {
    return this.intro + this.content + this.outro;
  }
  trimEnd(rx) {
    if (this.outro = this.outro.replace(rx, ""), this.outro.length) return !0;
    let trimmed = this.content.replace(rx, "");
    if (trimmed.length)
      return trimmed !== this.content && (this.split(this.start + trimmed.length).edit("", void 0, !0), this.edited && this.edit(trimmed, this.storeName, !0)), !0;
    if (this.edit("", void 0, !0), this.intro = this.intro.replace(rx, ""), this.intro.length) return !0;
  }
  trimStart(rx) {
    if (this.intro = this.intro.replace(rx, ""), this.intro.length) return !0;
    let trimmed = this.content.replace(rx, "");
    if (trimmed.length) {
      if (trimmed !== this.content) {
        let newChunk = this.split(this.end - trimmed.length);
        this.edited && newChunk.edit(trimmed, this.storeName, !0), this.edit("", void 0, !0);
      }
      return !0;
    } else if (this.edit("", void 0, !0), this.outro = this.outro.replace(rx, ""), this.outro.length) return !0;
  }
};
function getBtoa() {
  return typeof globalThis < "u" && typeof globalThis.btoa == "function" ? (str) => globalThis.btoa(unescape(encodeURIComponent(str))) : typeof Buffer == "function" ? (str) => Buffer.from(str, "utf-8").toString("base64") : () => {
    throw new Error("Unsupported environment: `window.btoa` or `Buffer` should be supported.");
  };
}
var btoa = getBtoa(), SourceMap = class {
  constructor(properties) {
    this.version = 3, this.file = properties.file, this.sources = properties.sources, this.sourcesContent = properties.sourcesContent, this.names = properties.names, this.mappings = encode(properties.mappings), typeof properties.x_google_ignoreList < "u" && (this.x_google_ignoreList = properties.x_google_ignoreList), typeof properties.debugId < "u" && (this.debugId = properties.debugId);
  }
  toString() {
    return JSON.stringify(this);
  }
  toUrl() {
    return "data:application/json;charset=utf-8;base64," + btoa(this.toString());
  }
};
function guessIndent(code) {
  let lines = code.split(`
`), tabbed = lines.filter((line) => /^\t+/.test(line)), spaced = lines.filter((line) => /^ {2,}/.test(line));
  if (tabbed.length === 0 && spaced.length === 0)
    return null;
  if (tabbed.length >= spaced.length)
    return "	";
  let min = spaced.reduce((previous, current) => {
    let numSpaces = /^ +/.exec(current)[0].length;
    return Math.min(numSpaces, previous);
  }, 1 / 0);
  return new Array(min + 1).join(" ");
}
function getRelativePath(from, to) {
  let fromParts = from.split(/[/\\]/), toParts = to.split(/[/\\]/);
  for (fromParts.pop(); fromParts[0] === toParts[0]; )
    fromParts.shift(), toParts.shift();
  if (fromParts.length) {
    let i = fromParts.length;
    for (; i--; ) fromParts[i] = "..";
  }
  return fromParts.concat(toParts).join("/");
}
var toString = Object.prototype.toString;
function isObject(thing) {
  return toString.call(thing) === "[object Object]";
}
function getLocator(source) {
  let originalLines = source.split(`
`), lineOffsets = [];
  for (let i = 0, pos = 0; i < originalLines.length; i++)
    lineOffsets.push(pos), pos += originalLines[i].length + 1;
  return function(index) {
    let i = 0, j = lineOffsets.length;
    for (; i < j; ) {
      let m = i + j >> 1;
      index < lineOffsets[m] ? j = m : i = m + 1;
    }
    let line = i - 1, column = index - lineOffsets[line];
    return { line, column };
  };
}
var wordRegex = /\w/, Mappings = class {
  constructor(hires) {
    this.hires = hires, this.generatedCodeLine = 0, this.generatedCodeColumn = 0, this.raw = [], this.rawSegments = this.raw[this.generatedCodeLine] = [], this.pending = null;
  }
  addEdit(sourceIndex, content, loc, nameIndex) {
    if (content.length) {
      let contentLengthMinusOne = content.length - 1, contentLineEnd = content.indexOf(`
`, 0), previousContentLineEnd = -1;
      for (; contentLineEnd >= 0 && contentLengthMinusOne > contentLineEnd; ) {
        let segment2 = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
        nameIndex >= 0 && segment2.push(nameIndex), this.rawSegments.push(segment2), this.generatedCodeLine += 1, this.raw[this.generatedCodeLine] = this.rawSegments = [], this.generatedCodeColumn = 0, previousContentLineEnd = contentLineEnd, contentLineEnd = content.indexOf(`
`, contentLineEnd + 1);
      }
      let segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
      nameIndex >= 0 && segment.push(nameIndex), this.rawSegments.push(segment), this.advance(content.slice(previousContentLineEnd + 1));
    } else this.pending && (this.rawSegments.push(this.pending), this.advance(content));
    this.pending = null;
  }
  addUneditedChunk(sourceIndex, chunk, original, loc, sourcemapLocations) {
    let originalCharIndex = chunk.start, first = !0, charInHiresBoundary = !1;
    for (; originalCharIndex < chunk.end; ) {
      if (original[originalCharIndex] === `
`)
        loc.line += 1, loc.column = 0, this.generatedCodeLine += 1, this.raw[this.generatedCodeLine] = this.rawSegments = [], this.generatedCodeColumn = 0, first = !0, charInHiresBoundary = !1;
      else {
        if (this.hires || first || sourcemapLocations.has(originalCharIndex)) {
          let segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
          this.hires === "boundary" ? wordRegex.test(original[originalCharIndex]) ? charInHiresBoundary || (this.rawSegments.push(segment), charInHiresBoundary = !0) : (this.rawSegments.push(segment), charInHiresBoundary = !1) : this.rawSegments.push(segment);
        }
        loc.column += 1, this.generatedCodeColumn += 1, first = !1;
      }
      originalCharIndex += 1;
    }
    this.pending = null;
  }
  advance(str) {
    if (!str) return;
    let lines = str.split(`
`);
    if (lines.length > 1) {
      for (let i = 0; i < lines.length - 1; i++)
        this.generatedCodeLine++, this.raw[this.generatedCodeLine] = this.rawSegments = [];
      this.generatedCodeColumn = 0;
    }
    this.generatedCodeColumn += lines[lines.length - 1].length;
  }
}, n = `
`, warned = {
  insertLeft: !1,
  insertRight: !1,
  storeName: !1
}, MagicString = class _MagicString {
  constructor(string, options = {}) {
    let chunk = new Chunk(0, string.length, string);
    Object.defineProperties(this, {
      original: { writable: !0, value: string },
      outro: { writable: !0, value: "" },
      intro: { writable: !0, value: "" },
      firstChunk: { writable: !0, value: chunk },
      lastChunk: { writable: !0, value: chunk },
      lastSearchedChunk: { writable: !0, value: chunk },
      byStart: { writable: !0, value: {} },
      byEnd: { writable: !0, value: {} },
      filename: { writable: !0, value: options.filename },
      indentExclusionRanges: { writable: !0, value: options.indentExclusionRanges },
      sourcemapLocations: { writable: !0, value: new BitSet() },
      storedNames: { writable: !0, value: {} },
      indentStr: { writable: !0, value: void 0 },
      ignoreList: { writable: !0, value: options.ignoreList },
      offset: { writable: !0, value: options.offset || 0 }
    }), this.byStart[0] = chunk, this.byEnd[string.length] = chunk;
  }
  addSourcemapLocation(char) {
    this.sourcemapLocations.add(char);
  }
  append(content) {
    if (typeof content != "string") throw new TypeError("outro content must be a string");
    return this.outro += content, this;
  }
  appendLeft(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byEnd[index];
    return chunk ? chunk.appendLeft(content) : this.intro += content, this;
  }
  appendRight(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byStart[index];
    return chunk ? chunk.appendRight(content) : this.outro += content, this;
  }
  clone() {
    let cloned = new _MagicString(this.original, { filename: this.filename, offset: this.offset }), originalChunk = this.firstChunk, clonedChunk = cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone();
    for (; originalChunk; ) {
      cloned.byStart[clonedChunk.start] = clonedChunk, cloned.byEnd[clonedChunk.end] = clonedChunk;
      let nextOriginalChunk = originalChunk.next, nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();
      nextClonedChunk && (clonedChunk.next = nextClonedChunk, nextClonedChunk.previous = clonedChunk, clonedChunk = nextClonedChunk), originalChunk = nextOriginalChunk;
    }
    return cloned.lastChunk = clonedChunk, this.indentExclusionRanges && (cloned.indentExclusionRanges = this.indentExclusionRanges.slice()), cloned.sourcemapLocations = new BitSet(this.sourcemapLocations), cloned.intro = this.intro, cloned.outro = this.outro, cloned;
  }
  generateDecodedMap(options) {
    options = options || {};
    let sourceIndex = 0, names = Object.keys(this.storedNames), mappings = new Mappings(options.hires), locate = getLocator(this.original);
    return this.intro && mappings.advance(this.intro), this.firstChunk.eachNext((chunk) => {
      let loc = locate(chunk.start);
      chunk.intro.length && mappings.advance(chunk.intro), chunk.edited ? mappings.addEdit(
        sourceIndex,
        chunk.content,
        loc,
        chunk.storeName ? names.indexOf(chunk.original) : -1
      ) : mappings.addUneditedChunk(sourceIndex, chunk, this.original, loc, this.sourcemapLocations), chunk.outro.length && mappings.advance(chunk.outro);
    }), this.outro && mappings.advance(this.outro), {
      file: options.file ? options.file.split(/[/\\]/).pop() : void 0,
      sources: [
        options.source ? getRelativePath(options.file || "", options.source) : options.file || ""
      ],
      sourcesContent: options.includeContent ? [this.original] : void 0,
      names,
      mappings: mappings.raw,
      x_google_ignoreList: this.ignoreList ? [sourceIndex] : void 0
    };
  }
  generateMap(options) {
    return new SourceMap(this.generateDecodedMap(options));
  }
  _ensureindentStr() {
    this.indentStr === void 0 && (this.indentStr = guessIndent(this.original));
  }
  _getRawIndentString() {
    return this._ensureindentStr(), this.indentStr;
  }
  getIndentString() {
    return this._ensureindentStr(), this.indentStr === null ? "	" : this.indentStr;
  }
  indent(indentStr, options) {
    let pattern = /^[^\r\n]/gm;
    if (isObject(indentStr) && (options = indentStr, indentStr = void 0), indentStr === void 0 && (this._ensureindentStr(), indentStr = this.indentStr || "	"), indentStr === "") return this;
    options = options || {};
    let isExcluded = {};
    options.exclude && (typeof options.exclude[0] == "number" ? [options.exclude] : options.exclude).forEach((exclusion) => {
      for (let i = exclusion[0]; i < exclusion[1]; i += 1)
        isExcluded[i] = !0;
    });
    let shouldIndentNextCharacter = options.indentStart !== !1, replacer = (match) => shouldIndentNextCharacter ? `${indentStr}${match}` : (shouldIndentNextCharacter = !0, match);
    this.intro = this.intro.replace(pattern, replacer);
    let charIndex = 0, chunk = this.firstChunk;
    for (; chunk; ) {
      let end = chunk.end;
      if (chunk.edited)
        isExcluded[charIndex] || (chunk.content = chunk.content.replace(pattern, replacer), chunk.content.length && (shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === `
`));
      else
        for (charIndex = chunk.start; charIndex < end; ) {
          if (!isExcluded[charIndex]) {
            let char = this.original[charIndex];
            char === `
` ? shouldIndentNextCharacter = !0 : char !== "\r" && shouldIndentNextCharacter && (shouldIndentNextCharacter = !1, charIndex === chunk.start || (this._splitChunk(chunk, charIndex), chunk = chunk.next), chunk.prependRight(indentStr));
          }
          charIndex += 1;
        }
      charIndex = chunk.end, chunk = chunk.next;
    }
    return this.outro = this.outro.replace(pattern, replacer), this;
  }
  insert() {
    throw new Error(
      "magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)"
    );
  }
  insertLeft(index, content) {
    return warned.insertLeft || (console.warn(
      "magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead"
    ), warned.insertLeft = !0), this.appendLeft(index, content);
  }
  insertRight(index, content) {
    return warned.insertRight || (console.warn(
      "magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead"
    ), warned.insertRight = !0), this.prependRight(index, content);
  }
  move(start, end, index) {
    if (start = start + this.offset, end = end + this.offset, index = index + this.offset, index >= start && index <= end) throw new Error("Cannot move a selection inside itself");
    this._split(start), this._split(end), this._split(index);
    let first = this.byStart[start], last = this.byEnd[end], oldLeft = first.previous, oldRight = last.next, newRight = this.byStart[index];
    if (!newRight && last === this.lastChunk) return this;
    let newLeft = newRight ? newRight.previous : this.lastChunk;
    return oldLeft && (oldLeft.next = oldRight), oldRight && (oldRight.previous = oldLeft), newLeft && (newLeft.next = first), newRight && (newRight.previous = last), first.previous || (this.firstChunk = last.next), last.next || (this.lastChunk = first.previous, this.lastChunk.next = null), first.previous = newLeft, last.next = newRight || null, newLeft || (this.firstChunk = first), newRight || (this.lastChunk = last), this;
  }
  overwrite(start, end, content, options) {
    return options = options || {}, this.update(start, end, content, { ...options, overwrite: !options.contentOnly });
  }
  update(start, end, content, options) {
    if (start = start + this.offset, end = end + this.offset, typeof content != "string") throw new TypeError("replacement content must be a string");
    if (this.original.length !== 0) {
      for (; start < 0; ) start += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    if (end > this.original.length) throw new Error("end is out of bounds");
    if (start === end)
      throw new Error(
        "Cannot overwrite a zero-length range \u2013 use appendLeft or prependRight instead"
      );
    this._split(start), this._split(end), options === !0 && (warned.storeName || (console.warn(
      "The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string"
    ), warned.storeName = !0), options = { storeName: !0 });
    let storeName = options !== void 0 ? options.storeName : !1, overwrite = options !== void 0 ? options.overwrite : !1;
    if (storeName) {
      let original = this.original.slice(start, end);
      Object.defineProperty(this.storedNames, original, {
        writable: !0,
        value: !0,
        enumerable: !0
      });
    }
    let first = this.byStart[start], last = this.byEnd[end];
    if (first) {
      let chunk = first;
      for (; chunk !== last; ) {
        if (chunk.next !== this.byStart[chunk.end])
          throw new Error("Cannot overwrite across a split point");
        chunk = chunk.next, chunk.edit("", !1);
      }
      first.edit(content, storeName, !overwrite);
    } else {
      let newChunk = new Chunk(start, end, "").edit(content, storeName);
      last.next = newChunk, newChunk.previous = last;
    }
    return this;
  }
  prepend(content) {
    if (typeof content != "string") throw new TypeError("outro content must be a string");
    return this.intro = content + this.intro, this;
  }
  prependLeft(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byEnd[index];
    return chunk ? chunk.prependLeft(content) : this.intro = content + this.intro, this;
  }
  prependRight(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byStart[index];
    return chunk ? chunk.prependRight(content) : this.outro = content + this.outro, this;
  }
  remove(start, end) {
    if (start = start + this.offset, end = end + this.offset, this.original.length !== 0) {
      for (; start < 0; ) start += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    if (start === end) return this;
    if (start < 0 || end > this.original.length) throw new Error("Character is out of bounds");
    if (start > end) throw new Error("end must be greater than start");
    this._split(start), this._split(end);
    let chunk = this.byStart[start];
    for (; chunk; )
      chunk.intro = "", chunk.outro = "", chunk.edit(""), chunk = end > chunk.end ? this.byStart[chunk.end] : null;
    return this;
  }
  reset(start, end) {
    if (start = start + this.offset, end = end + this.offset, this.original.length !== 0) {
      for (; start < 0; ) start += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    if (start === end) return this;
    if (start < 0 || end > this.original.length) throw new Error("Character is out of bounds");
    if (start > end) throw new Error("end must be greater than start");
    this._split(start), this._split(end);
    let chunk = this.byStart[start];
    for (; chunk; )
      chunk.reset(), chunk = end > chunk.end ? this.byStart[chunk.end] : null;
    return this;
  }
  lastChar() {
    if (this.outro.length) return this.outro[this.outro.length - 1];
    let chunk = this.lastChunk;
    do {
      if (chunk.outro.length) return chunk.outro[chunk.outro.length - 1];
      if (chunk.content.length) return chunk.content[chunk.content.length - 1];
      if (chunk.intro.length) return chunk.intro[chunk.intro.length - 1];
    } while (chunk = chunk.previous);
    return this.intro.length ? this.intro[this.intro.length - 1] : "";
  }
  lastLine() {
    let lineIndex = this.outro.lastIndexOf(n);
    if (lineIndex !== -1) return this.outro.substr(lineIndex + 1);
    let lineStr = this.outro, chunk = this.lastChunk;
    do {
      if (chunk.outro.length > 0) {
        if (lineIndex = chunk.outro.lastIndexOf(n), lineIndex !== -1) return chunk.outro.substr(lineIndex + 1) + lineStr;
        lineStr = chunk.outro + lineStr;
      }
      if (chunk.content.length > 0) {
        if (lineIndex = chunk.content.lastIndexOf(n), lineIndex !== -1) return chunk.content.substr(lineIndex + 1) + lineStr;
        lineStr = chunk.content + lineStr;
      }
      if (chunk.intro.length > 0) {
        if (lineIndex = chunk.intro.lastIndexOf(n), lineIndex !== -1) return chunk.intro.substr(lineIndex + 1) + lineStr;
        lineStr = chunk.intro + lineStr;
      }
    } while (chunk = chunk.previous);
    return lineIndex = this.intro.lastIndexOf(n), lineIndex !== -1 ? this.intro.substr(lineIndex + 1) + lineStr : this.intro + lineStr;
  }
  slice(start = 0, end = this.original.length - this.offset) {
    if (start = start + this.offset, end = end + this.offset, this.original.length !== 0) {
      for (; start < 0; ) start += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    let result = "", chunk = this.firstChunk;
    for (; chunk && (chunk.start > start || chunk.end <= start); ) {
      if (chunk.start < end && chunk.end >= end)
        return result;
      chunk = chunk.next;
    }
    if (chunk && chunk.edited && chunk.start !== start)
      throw new Error(`Cannot use replaced character ${start} as slice start anchor.`);
    let startChunk = chunk;
    for (; chunk; ) {
      chunk.intro && (startChunk !== chunk || chunk.start === start) && (result += chunk.intro);
      let containsEnd = chunk.start < end && chunk.end >= end;
      if (containsEnd && chunk.edited && chunk.end !== end)
        throw new Error(`Cannot use replaced character ${end} as slice end anchor.`);
      let sliceStart = startChunk === chunk ? start - chunk.start : 0, sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;
      if (result += chunk.content.slice(sliceStart, sliceEnd), chunk.outro && (!containsEnd || chunk.end === end) && (result += chunk.outro), containsEnd)
        break;
      chunk = chunk.next;
    }
    return result;
  }
  // TODO deprecate this? not really very useful
  snip(start, end) {
    let clone = this.clone();
    return clone.remove(0, start), clone.remove(end, clone.original.length), clone;
  }
  _split(index) {
    if (this.byStart[index] || this.byEnd[index]) return;
    let chunk = this.lastSearchedChunk, previousChunk = chunk, searchForward = index > chunk.end;
    for (; chunk; ) {
      if (chunk.contains(index)) return this._splitChunk(chunk, index);
      if (chunk = searchForward ? this.byStart[chunk.end] : this.byEnd[chunk.start], chunk === previousChunk) return;
      previousChunk = chunk;
    }
  }
  _splitChunk(chunk, index) {
    if (chunk.edited && chunk.content.length) {
      let loc = getLocator(this.original)(index);
      throw new Error(
        `Cannot split a chunk that has already been edited (${loc.line}:${loc.column} \u2013 "${chunk.original}")`
      );
    }
    let newChunk = chunk.split(index);
    return this.byEnd[index] = chunk, this.byStart[index] = newChunk, this.byEnd[newChunk.end] = newChunk, chunk === this.lastChunk && (this.lastChunk = newChunk), this.lastSearchedChunk = chunk, !0;
  }
  toString() {
    let str = this.intro, chunk = this.firstChunk;
    for (; chunk; )
      str += chunk.toString(), chunk = chunk.next;
    return str + this.outro;
  }
  isEmpty() {
    let chunk = this.firstChunk;
    do
      if (chunk.intro.length && chunk.intro.trim() || chunk.content.length && chunk.content.trim() || chunk.outro.length && chunk.outro.trim())
        return !1;
    while (chunk = chunk.next);
    return !0;
  }
  length() {
    let chunk = this.firstChunk, length = 0;
    do
      length += chunk.intro.length + chunk.content.length + chunk.outro.length;
    while (chunk = chunk.next);
    return length;
  }
  trimLines() {
    return this.trim("[\\r\\n]");
  }
  trim(charType) {
    return this.trimStart(charType).trimEnd(charType);
  }
  trimEndAborted(charType) {
    let rx = new RegExp((charType || "\\s") + "+$");
    if (this.outro = this.outro.replace(rx, ""), this.outro.length) return !0;
    let chunk = this.lastChunk;
    do {
      let end = chunk.end, aborted = chunk.trimEnd(rx);
      if (chunk.end !== end && (this.lastChunk === chunk && (this.lastChunk = chunk.next), this.byEnd[chunk.end] = chunk, this.byStart[chunk.next.start] = chunk.next, this.byEnd[chunk.next.end] = chunk.next), aborted) return !0;
      chunk = chunk.previous;
    } while (chunk);
    return !1;
  }
  trimEnd(charType) {
    return this.trimEndAborted(charType), this;
  }
  trimStartAborted(charType) {
    let rx = new RegExp("^" + (charType || "\\s") + "+");
    if (this.intro = this.intro.replace(rx, ""), this.intro.length) return !0;
    let chunk = this.firstChunk;
    do {
      let end = chunk.end, aborted = chunk.trimStart(rx);
      if (chunk.end !== end && (chunk === this.lastChunk && (this.lastChunk = chunk.next), this.byEnd[chunk.end] = chunk, this.byStart[chunk.next.start] = chunk.next, this.byEnd[chunk.next.end] = chunk.next), aborted) return !0;
      chunk = chunk.next;
    } while (chunk);
    return !1;
  }
  trimStart(charType) {
    return this.trimStartAborted(charType), this;
  }
  hasChanged() {
    return this.original !== this.toString();
  }
  _replaceRegexp(searchValue, replacement) {
    function getReplacement(match, str) {
      return typeof replacement == "string" ? replacement.replace(/\$(\$|&|\d+)/g, (_, i) => i === "$" ? "$" : i === "&" ? match[0] : +i < match.length ? match[+i] : `$${i}`) : replacement(...match, match.index, str, match.groups);
    }
    function matchAll(re, str) {
      let match, matches = [];
      for (; match = re.exec(str); )
        matches.push(match);
      return matches;
    }
    if (searchValue.global)
      matchAll(searchValue, this.original).forEach((match) => {
        if (match.index != null) {
          let replacement2 = getReplacement(match, this.original);
          replacement2 !== match[0] && this.overwrite(match.index, match.index + match[0].length, replacement2);
        }
      });
    else {
      let match = this.original.match(searchValue);
      if (match && match.index != null) {
        let replacement2 = getReplacement(match, this.original);
        replacement2 !== match[0] && this.overwrite(match.index, match.index + match[0].length, replacement2);
      }
    }
    return this;
  }
  _replaceString(string, replacement) {
    let { original } = this, index = original.indexOf(string);
    return index !== -1 && (typeof replacement == "function" && (replacement = replacement(string, index, original)), string !== replacement && this.overwrite(index, index + string.length, replacement)), this;
  }
  replace(searchValue, replacement) {
    return typeof searchValue == "string" ? this._replaceString(searchValue, replacement) : this._replaceRegexp(searchValue, replacement);
  }
  _replaceAllString(string, replacement) {
    let { original } = this, stringLength = string.length;
    for (let index = original.indexOf(string); index !== -1; index = original.indexOf(string, index + stringLength)) {
      let previous = original.slice(index, index + stringLength), _replacement = replacement;
      typeof replacement == "function" && (_replacement = replacement(previous, index, original)), previous !== _replacement && this.overwrite(index, index + stringLength, _replacement);
    }
    return this;
  }
  replaceAll(searchValue, replacement) {
    if (typeof searchValue == "string")
      return this._replaceAllString(searchValue, replacement);
    if (!searchValue.global)
      throw new TypeError(
        "MagicString.prototype.replaceAll called with a non-global RegExp argument"
      );
    return this._replaceRegexp(searchValue, replacement);
  }
};

// ../node_modules/estree-walker/src/walker.js
var WalkerBase = class {
  constructor() {
    this.should_skip = !1, this.should_remove = !1, this.replacement = null, this.context = {
      skip: () => this.should_skip = !0,
      remove: () => this.should_remove = !0,
      replace: (node) => this.replacement = node
    };
  }
  /**
   * @template {Node} Parent
   * @param {Parent | null | undefined} parent
   * @param {keyof Parent | null | undefined} prop
   * @param {number | null | undefined} index
   * @param {Node} node
   */
  replace(parent, prop, index, node) {
    parent && prop && (index != null ? parent[prop][index] = node : parent[prop] = node);
  }
  /**
   * @template {Node} Parent
   * @param {Parent | null | undefined} parent
   * @param {keyof Parent | null | undefined} prop
   * @param {number | null | undefined} index
   */
  remove(parent, prop, index) {
    parent && prop && (index != null ? parent[prop].splice(index, 1) : delete parent[prop]);
  }
};

// ../node_modules/estree-walker/src/sync.js
var SyncWalker = class extends WalkerBase {
  /**
   *
   * @param {SyncHandler} [enter]
   * @param {SyncHandler} [leave]
   */
  constructor(enter, leave) {
    super(), this.should_skip = !1, this.should_remove = !1, this.replacement = null, this.context = {
      skip: () => this.should_skip = !0,
      remove: () => this.should_remove = !0,
      replace: (node) => this.replacement = node
    }, this.enter = enter, this.leave = leave;
  }
  /**
   * @template {Node} Parent
   * @param {Node} node
   * @param {Parent | null} parent
   * @param {keyof Parent} [prop]
   * @param {number | null} [index]
   * @returns {Node | null}
   */
  visit(node, parent, prop, index) {
    if (node) {
      if (this.enter) {
        let _should_skip = this.should_skip, _should_remove = this.should_remove, _replacement = this.replacement;
        this.should_skip = !1, this.should_remove = !1, this.replacement = null, this.enter.call(this.context, node, parent, prop, index), this.replacement && (node = this.replacement, this.replace(parent, prop, index, node)), this.should_remove && this.remove(parent, prop, index);
        let skipped = this.should_skip, removed = this.should_remove;
        if (this.should_skip = _should_skip, this.should_remove = _should_remove, this.replacement = _replacement, skipped) return node;
        if (removed) return null;
      }
      let key;
      for (key in node) {
        let value = node[key];
        if (value && typeof value == "object")
          if (Array.isArray(value)) {
            let nodes = (
              /** @type {Array<unknown>} */
              value
            );
            for (let i = 0; i < nodes.length; i += 1) {
              let item = nodes[i];
              isNode(item) && (this.visit(item, node, key, i) || i--);
            }
          } else isNode(value) && this.visit(value, node, key, null);
      }
      if (this.leave) {
        let _replacement = this.replacement, _should_remove = this.should_remove;
        this.replacement = null, this.should_remove = !1, this.leave.call(this.context, node, parent, prop, index), this.replacement && (node = this.replacement, this.replace(parent, prop, index, node)), this.should_remove && this.remove(parent, prop, index);
        let removed = this.should_remove;
        if (this.replacement = _replacement, this.should_remove = _should_remove, removed) return null;
      }
    }
    return node;
  }
};
function isNode(value) {
  return value !== null && typeof value == "object" && "type" in value && typeof value.type == "string";
}

// ../node_modules/estree-walker/src/index.js
function walk(ast, { enter, leave }) {
  return new SyncWalker(enter, leave).visit(ast, null);
}

// src/mocking-utils/esmWalker.ts
var isNodeInPatternWeakSet = /* @__PURE__ */ new WeakSet();
function setIsNodeInPattern(node) {
  return isNodeInPatternWeakSet.add(node);
}
function isNodeInPattern(node) {
  return isNodeInPatternWeakSet.has(node);
}
function esmWalker(root, { onIdentifier, onImportMeta, onDynamicImport, onCallExpression }) {
  let parentStack = [], varKindStack = [], scopeMap = /* @__PURE__ */ new WeakMap(), identifiers = [], setScope = (node, name) => {
    let scopeIds = scopeMap.get(node);
    scopeIds && scopeIds.has(name) || (scopeIds || (scopeIds = /* @__PURE__ */ new Set(), scopeMap.set(node, scopeIds)), scopeIds.add(name));
  };
  function isInScope(name, parents) {
    return parents.some((node) => node && scopeMap.get(node)?.has(name));
  }
  function handlePattern(p, parentScope) {
    p.type === "Identifier" ? setScope(parentScope, p.name) : p.type === "RestElement" ? handlePattern(p.argument, parentScope) : p.type === "ObjectPattern" ? p.properties.forEach((property) => {
      property.type === "RestElement" ? setScope(parentScope, property.argument.name) : handlePattern(property.value, parentScope);
    }) : p.type === "ArrayPattern" ? p.elements.forEach((element) => {
      element && handlePattern(element, parentScope);
    }) : p.type === "AssignmentPattern" ? handlePattern(p.left, parentScope) : setScope(parentScope, p.name);
  }
  walk(root, {
    enter(node, parent) {
      if (node.type === "ImportDeclaration")
        return this.skip();
      if (parent && !(parent.type === "IfStatement" && node === parent.alternate) && parentStack.unshift(parent), node.type === "VariableDeclaration" && varKindStack.unshift(node.kind), node.type === "CallExpression" && onCallExpression?.(node), node.type === "MetaProperty" && node.meta.name === "import" ? onImportMeta?.(node) : node.type === "ImportExpression" && onDynamicImport?.(node), node.type === "Identifier")
        !isInScope(node.name, parentStack) && isRefIdentifier(node, parent, parentStack) && identifiers.push([node, parentStack.slice(0)]);
      else if (isFunctionNode(node)) {
        if (node.type === "FunctionDeclaration") {
          let parentScope = findParentScope(parentStack);
          parentScope && setScope(parentScope, node.id.name);
        }
        node.params.forEach((p) => {
          if (p.type === "ObjectPattern" || p.type === "ArrayPattern") {
            handlePattern(p, node);
            return;
          }
          walk(p.type === "AssignmentPattern" ? p.left : p, {
            enter(child, parent2) {
              if (parent2?.type === "AssignmentPattern" && parent2?.right === child)
                return this.skip();
              child.type === "Identifier" && (isStaticPropertyKey(child, parent2) || parent2?.type === "TemplateLiteral" && parent2?.expressions.includes(child) || parent2?.type === "CallExpression" && parent2?.callee === child || setScope(node, child.name));
            }
          });
        });
      } else if (node.type === "Property" && parent.type === "ObjectPattern")
        setIsNodeInPattern(node);
      else if (node.type === "VariableDeclarator") {
        let parentFunction = findParentScope(parentStack, varKindStack[0] === "var");
        parentFunction && handlePattern(node.id, parentFunction);
      } else node.type === "CatchClause" && node.param && handlePattern(node.param, node);
    },
    leave(node, parent) {
      parent && !(parent.type === "IfStatement" && node === parent.alternate) && parentStack.shift(), node.type === "VariableDeclaration" && varKindStack.shift();
    }
  }), identifiers.forEach(([node, stack]) => {
    if (!isInScope(node.name, stack)) {
      let parent = stack[0], grandparent = stack[1], hasBindingShortcut = isStaticProperty(parent) && parent.shorthand && (!isNodeInPattern(parent) || isInDestructuringAssignment(parent, parentStack)), classDeclaration = parent.type === "PropertyDefinition" && grandparent?.type === "ClassBody" || parent.type === "ClassDeclaration" && node === parent.superClass, classExpression = parent.type === "ClassExpression" && node === parent.id;
      onIdentifier?.(
        node,
        {
          hasBindingShortcut,
          classDeclaration,
          classExpression
        },
        stack
      );
    }
  });
}
function isRefIdentifier(id, parent, parentStack) {
  return !(parent.type === "CatchClause" || (parent.type === "VariableDeclarator" || parent.type === "ClassDeclaration") && parent.id === id || isFunctionNode(parent) && (parent.id === id || parent.params.includes(id)) || parent.type === "MethodDefinition" && !parent.computed || isStaticPropertyKey(id, parent) || isNodeInPattern(parent) && parent.value === id || parent.type === "ArrayPattern" && !isInDestructuringAssignment(parent, parentStack) || parent.type === "MemberExpression" && parent.property === id && !parent.computed || parent.type === "ExportSpecifier" || id.name === "arguments");
}
function isStaticProperty(node) {
  return node && node.type === "Property" && !node.computed;
}
function isStaticPropertyKey(node, parent) {
  return isStaticProperty(parent) && parent.key === node;
}
var functionNodeTypeRE = /Function(?:Expression|Declaration)$|Method$/;
function isFunctionNode(node) {
  return functionNodeTypeRE.test(node.type);
}
var blockNodeTypeRE = /^BlockStatement$|^For(?:In|Of)?Statement$/;
function isBlock(node) {
  return blockNodeTypeRE.test(node.type);
}
function findParentScope(parentStack, isVar = !1) {
  return parentStack.find(isVar ? isFunctionNode : isBlock);
}
function isInDestructuringAssignment(parent, parentStack) {
  return parent && (parent.type === "Property" || parent.type === "ArrayPattern") ? parentStack.some((i) => i.type === "AssignmentExpression") : !1;
}
function getArbitraryModuleIdentifier(node) {
  return node.type === "Identifier" ? node.name : node.raw;
}

// src/mocking-utils/automock.ts
var __STORYBOOK_GLOBAL_THIS_ACCESSOR__ = "__vitest_mocker__";
function getAutomockCode(originalCode, isSpy, parse) {
  return automockModule(originalCode, isSpy ? "autospy" : "automock", parse, {
    globalThisAccessor: JSON.stringify(__STORYBOOK_GLOBAL_THIS_ACCESSOR__)
  });
}
function automockModule(code, mockType, parse, options = {}) {
  let globalThisAccessor = options.globalThisAccessor || JSON.stringify(__STORYBOOK_GLOBAL_THIS_ACCESSOR__), ast = parse(code), m = new MagicString(code), allSpecifiers = [], importIndex = 0;
  for (let _node of ast.body) {
    if (_node.type === "ExportAllDeclaration")
      throw new Error(
        "automocking files with `export *` is not supported in browser mode because it cannot be statically analysed"
      );
    if (_node.type === "ExportNamedDeclaration") {
      let traversePattern2 = function(expression) {
        if (expression.type === "Identifier")
          allSpecifiers.push({ name: expression.name });
        else if (expression.type === "ArrayPattern")
          expression.elements.forEach((element) => {
            element && traversePattern2(element);
          });
        else if (expression.type === "ObjectPattern")
          expression.properties.forEach((property) => {
            property.type === "RestElement" ? traversePattern2(property) : property.type === "Property" && traversePattern2(property.value);
          });
        else if (expression.type === "RestElement")
          traversePattern2(expression.argument);
        else {
          if (expression.type === "AssignmentPattern")
            throw new Error("AssignmentPattern is not supported. Please open a new bug report.");
          if (expression.type === "MemberExpression")
            throw new Error("MemberExpression is not supported. Please open a new bug report.");
        }
      };
      var traversePattern = traversePattern2;
      let node = _node, declaration = node.declaration;
      declaration && (declaration.type === "FunctionDeclaration" ? allSpecifiers.push({ name: declaration.id.name }) : declaration.type === "VariableDeclaration" ? declaration.declarations.forEach((declaration2) => {
        traversePattern2(declaration2.id);
      }) : declaration.type === "ClassDeclaration" && allSpecifiers.push({ name: declaration.id.name }), m.remove(node.start, declaration.start));
      let specifiers = node.specifiers || [], source = node.source;
      if (!source && specifiers.length)
        specifiers.forEach((specifier) => {
          allSpecifiers.push({
            alias: getArbitraryModuleIdentifier(specifier.exported),
            name: getArbitraryModuleIdentifier(specifier.local)
          });
        }), m.remove(node.start, node.end);
      else if (source && specifiers.length) {
        let importNames = [];
        specifiers.forEach((specifier) => {
          let importedName = `__vitest_imported_${importIndex++}__`;
          importNames.push([getArbitraryModuleIdentifier(specifier.local), importedName]), allSpecifiers.push({
            name: importedName,
            alias: getArbitraryModuleIdentifier(specifier.exported)
          });
        });
        let importString = `import { ${importNames.map(([name, alias]) => `${name} as ${alias}`).join(", ")} } from '${source.value}'`;
        m.overwrite(node.start, node.end, importString);
      }
    }
    if (_node.type === "ExportDefaultDeclaration") {
      let node = _node, declaration = node.declaration;
      allSpecifiers.push({ name: "__vitest_default", alias: "default" }), m.overwrite(node.start, declaration.start, "const __vitest_default = ");
    }
  }
  let moduleObject = `
const __vitest_current_es_module__ = {
  __esModule: true,
  ${allSpecifiers.map(({ name }) => `["${name}"]: ${name},`).join(`
  `)}
}
const __vitest_mocked_module__ = globalThis[${globalThisAccessor}].mockObject(__vitest_current_es_module__, "${mockType}")
`, assigning = allSpecifiers.map(({ name }, index) => `const __vitest_mocked_${index}__ = __vitest_mocked_module__["${name}"]`).join(`
`), specifiersExports = `
export {
${allSpecifiers.map(({ name, alias }, index) => `  __vitest_mocked_${index}__ as ${alias || name},`).join(`
`)}
}
`;
  return m.append(moduleObject + assigning + specifiersExports), m;
}

// src/mocking-utils/extract.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { generate, parser, types as t2 } from "storybook/internal/babel";
import { logger } from "storybook/internal/node-logger";
import { telemetry } from "storybook/internal/telemetry";
import { transformSync } from "esbuild";

// src/mocking-utils/resolve.ts
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";

// ../node_modules/resolve.exports/dist/index.mjs
function e(e2, n3, r2) {
  throw new Error(r2 ? `No known conditions for "${n3}" specifier in "${e2}" package` : `Missing "${n3}" specifier in "${e2}" package`);
}
function n2(n3, i, o2, f) {
  let s, u, l = r(n3, o2), c = (function(e2) {
    let n4 = /* @__PURE__ */ new Set(["default", ...e2.conditions || []]);
    return e2.unsafe || n4.add(e2.require ? "require" : "import"), e2.unsafe || n4.add(e2.browser ? "browser" : "node"), n4;
  })(f || {}), a = i[l];
  if (a === void 0) {
    let e2, n4, r2, t3;
    for (t3 in i) n4 && t3.length < n4.length || (t3[t3.length - 1] === "/" && l.startsWith(t3) ? (u = l.substring(t3.length), n4 = t3) : t3.length > 1 && (r2 = t3.indexOf("*", 1), ~r2 && (e2 = RegExp("^" + t3.substring(0, r2) + "(.*)" + t3.substring(1 + r2) + "$").exec(l), e2 && e2[1] && (u = e2[1], n4 = t3))));
    a = i[n4];
  }
  return a || e(n3, l), s = t(a, c), s || e(n3, l, 1), u && (function(e2, n4) {
    let r2, t3 = 0, i2 = e2.length, o3 = /[*]/g, f2 = /[/]$/;
    for (; t3 < i2; t3++) e2[t3] = o3.test(r2 = e2[t3]) ? r2.replace(o3, n4) : f2.test(r2) ? r2 + n4 : r2;
  })(s, u), s;
}
function r(e2, n3, r2) {
  if (e2 === n3 || n3 === ".") return ".";
  let t3 = e2 + "/", i = t3.length, o2 = n3.slice(0, i) === t3, f = o2 ? n3.slice(i) : n3;
  return f[0] === "#" ? f : o2 || !r2 ? f.slice(0, 2) === "./" ? f : "./" + f : f;
}
function t(e2, n3, r2) {
  if (e2) {
    if (typeof e2 == "string") return r2 && r2.add(e2), [e2];
    let i, o2;
    if (Array.isArray(e2)) {
      for (o2 = r2 || /* @__PURE__ */ new Set(), i = 0; i < e2.length; i++) t(e2[i], n3, o2);
      if (!r2 && o2.size) return [...o2];
    } else for (i in e2) if (n3.has(i)) return t(e2[i], n3, r2);
  }
}
function o(e2, r2, t3) {
  let i, o2 = e2.exports;
  if (o2) {
    if (typeof o2 == "string") o2 = { ".": o2 };
    else for (i in o2) {
      i[0] !== "." && (o2 = { ".": o2 });
      break;
    }
    return n2(e2.name, o2, r2 || ".", t3);
  }
}

// src/mocking-utils/resolve.ts
var require2 = createRequire(import.meta.url);
function findPackageJson(specifier, basedir) {
  let packageJsonPath = require2.resolve(`${specifier}/package.json`, { paths: [basedir] });
  return {
    path: packageJsonPath,
    data: JSON.parse(readFileSync(packageJsonPath, "utf-8"))
  };
}
function resolveExternalModule(path, root) {
  let parts = path.split("/"), packageName = path.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0], entry = `.${path.slice(packageName.length)}`, { path: packageJsonPath, data: pkg } = findPackageJson(packageName, root), packageDir = dirname(packageJsonPath);
  if (pkg.exports) {
    let result = o(pkg, entry, {
      browser: !0
    });
    if (result)
      return join(packageDir, result[0]);
  }
  return require2.resolve(path, { paths: [root] });
}
function getIsExternal(path, importer) {
  try {
    return !isAbsolute(path) && isModuleDirectory(require2.resolve(path, { paths: [importer] }));
  } catch {
    return !1;
  }
}
function resolveMock(path, root, importer, findMockRedirect) {
  let isExternal2 = getIsExternal(path, root), externalPath = isExternal2 ? path : null, absolutePath = isExternal2 ? resolveExternalModule(path, root) : require2.resolve(path, { paths: [dirname(importer)] }), normalizedAbsolutePath = resolve(absolutePath), redirectPath = findMockRedirect(root, normalizedAbsolutePath, externalPath);
  return {
    absolutePath: normalizedAbsolutePath,
    redirectPath
    // will be null if no __mocks__ file is found
  };
}
function isExternal(path, from) {
  try {
    return !isAbsolute(path) && isModuleDirectory(require2.resolve(path, { paths: [from] }));
  } catch {
    return !1;
  }
}
function getRealPath(path, preserveSymlinks) {
  try {
    return preserveSymlinks ? realpathSync(path) : path;
  } catch {
    return path;
  }
}
function resolveWithExtensions(path, from) {
  let extensions = [".js", ".ts", ".tsx", ".mjs", ".cjs", ".svelte", ".vue"];
  for (let extension of extensions)
    try {
      return require2.resolve(path + extension, { paths: [from] });
    } catch {
      continue;
    }
  return require2.resolve(path, { paths: [from] });
}

// src/mocking-utils/extract.ts
var DEFAULT_MODULE_DIRECTORIES = ["/node_modules/"];
function isModuleDirectory(path) {
  let normalizedPath = normalize(path);
  return DEFAULT_MODULE_DIRECTORIES.some((dir) => normalizedPath.includes(dir));
}
var babelParser = (code) => parser.parse(code, {
  sourceType: "module",
  // Enable plugins to handle modern JavaScript features, including TSX.
  plugins: ["typescript", "jsx", "classProperties", "objectRestSpread"],
  errorRecovery: !0
}).program;
function rewriteSbMockImportCalls(code) {
  let ast = babelParser(code);
  return walk(ast, {
    enter(node) {
      node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" && node.callee.object.name === "sb" && node.callee.property.type === "Identifier" && node.callee.property.name === "mock" && node.arguments.length > 0 && node.arguments[0].type === "CallExpression" && node.arguments[0].callee.type === "Import" && node.arguments[0].arguments.length === 1 && node.arguments[0].arguments[0].type === "StringLiteral" && (node.arguments[0] = t2.stringLiteral(node.arguments[0].arguments[0].value));
    }
  }), generate(ast, {}, code);
}
function extractMockCalls(options, parse, root, findMockRedirect) {
  try {
    let hasSpyTrue2 = function(objectExpression) {
      if (!objectExpression || !objectExpression.properties)
        return !1;
      for (let prop of objectExpression.properties)
        if (prop.type === "ObjectProperty" && (prop.key.type === "Identifier" && prop.key.name === "spy" || prop.key.type === "StringLiteral" && prop.key.value === "spy") && prop.value.type === "BooleanLiteral" && prop.value.value === !0)
          return !0;
      return !1;
    };
    var hasSpyTrue = hasSpyTrue2;
    let previewConfigCode = readFileSync2(options.previewConfigPath, "utf-8"), { code: jsCode } = transformSync(previewConfigCode, { loader: "tsx", format: "esm" }), ast = parse(jsCode), mocks = [];
    return walk(ast, {
      // @ts-expect-error - Node comes from babel
      async enter(node) {
        if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression" || node.callee.object.type !== "Identifier" || node.callee.object.name !== "sb" || node.callee.property.type !== "Identifier" || node.callee.property.name !== "mock" || node.arguments.length === 0)
          return;
        let path;
        if (node.arguments[0].type === "StringLiteral")
          path = node.arguments[0].value;
        else if (node.arguments[0].type === "CallExpression" && node.arguments[0].callee.type === "Import" && node.arguments[0].arguments[0].type === "StringLiteral")
          path = node.arguments[0].arguments[0].value;
        else
          return;
        let spy = node.arguments.length > 1 && node.arguments[1].type === "ObjectExpression" && hasSpyTrue2(node.arguments[1]), { absolutePath, redirectPath } = resolveMock(
          path,
          root,
          options.previewConfigPath,
          findMockRedirect
        ), pathWithoutExtension = path.replace(/\.[^/.]+$/, ""), basenameAbsolutePath = basename(absolutePath), basenamePath = basename(path), pathWithoutExtensionAndBasename = basenameAbsolutePath === basenamePath ? pathWithoutExtension : path;
        mocks.push({
          path: pathWithoutExtensionAndBasename,
          absolutePath,
          redirectPath,
          spy
        });
      }
    }), options.coreOptions?.disableTelemetry || telemetry(
      "mocking",
      {
        modulesMocked: mocks.length,
        modulesSpied: mocks.map((mock) => mock.spy).filter(Boolean).length,
        modulesManuallyMocked: mocks.map((mock) => !!mock.redirectPath).filter(Boolean).length
      },
      { configDir: options.configDir }
    ), mocks;
  } catch (error) {
    return logger.debug("Error extracting mock calls: " + String(error)), [];
  }
}

// src/mocking-utils/runtime.ts
import { resolvePackageDir } from "storybook/internal/common";
import { buildSync } from "esbuild";
var runtimeTemplatePath = join(
  resolvePackageDir("storybook"),
  "assets",
  "server",
  "mocker-runtime.template.js"
);
function getMockerRuntime() {
  return buildSync({
    entryPoints: [runtimeTemplatePath],
    bundle: !0,
    write: !1,
    // Return the result in memory instead of writing to disk
    format: "esm",
    target: "es2020",
    external: ["msw/browser", "msw/core/http"]
  }).outputFiles[0].text;
}
export {
  __STORYBOOK_GLOBAL_THIS_ACCESSOR__,
  automockModule,
  babelParser,
  esmWalker,
  extractMockCalls,
  getArbitraryModuleIdentifier,
  getAutomockCode,
  getIsExternal,
  getMockerRuntime,
  getRealPath,
  isExternal,
  isFunctionNode,
  isInDestructuringAssignment,
  isModuleDirectory,
  isNodeInPattern,
  isStaticProperty,
  isStaticPropertyKey,
  resolveExternalModule,
  resolveMock,
  resolveWithExtensions,
  rewriteSbMockImportCalls,
  setIsNodeInPattern
};
