import { promises } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import remapping from '@ampproject/remapping';
import { mergeProcessCovs } from '@bcoe/v8-coverage';
import astV8ToIstanbul from 'ast-v8-to-istanbul';
import createDebug from 'debug';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import libSourceMaps from 'istanbul-lib-source-maps';
import reports from 'istanbul-reports';
import MagicString from 'magic-string';
import { parseModule } from 'magicast';
import { provider } from 'std-env';
import TestExclude from 'test-exclude';
import c from 'tinyrainbow';
import require$$0 from 'assert';
import require$$2 from 'util';
import require$$3 from 'path';
import require$$4 from 'url';
import require$$9 from 'fs';
import require$$11 from 'module';
import { builtinModules } from 'node:module';
import { BaseCoverageProvider } from 'vitest/coverage';
import { parseAstAsync } from 'vitest/node';

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}

const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const normalize = function(path) {
  if (path.length === 0) {
    return ".";
  }
  path = normalizeWindowsPath(path);
  const isUNCPath = path.match(_UNC_REGEX);
  const isPathAbsolute = isAbsolute(path);
  const trailingSeparator = path[path.length - 1] === "/";
  path = normalizeString(path, !isPathAbsolute);
  if (path.length === 0) {
    if (isPathAbsolute) {
      return "/";
    }
    return trailingSeparator ? "./" : ".";
  }
  if (trailingSeparator) {
    path += "/";
  }
  if (_DRIVE_LETTER_RE.test(path)) {
    path += "/";
  }
  if (isUNCPath) {
    if (!isPathAbsolute) {
      return `//./${path}`;
    }
    return `//${path}`;
  }
  return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var convertSourceMap = {};

var hasRequiredConvertSourceMap;

function requireConvertSourceMap () {
	if (hasRequiredConvertSourceMap) return convertSourceMap;
	hasRequiredConvertSourceMap = 1;
	(function (exports) {

		Object.defineProperty(exports, 'commentRegex', {
		  get: function getCommentRegex () {
		    // Groups: 1: media type, 2: MIME type, 3: charset, 4: encoding, 5: data.
		    return /^\s*?\/[\/\*][@#]\s+?sourceMappingURL=data:(((?:application|text)\/json)(?:;charset=([^;,]+?)?)?)?(?:;(base64))?,(.*?)$/mg;
		  }
		});


		Object.defineProperty(exports, 'mapFileCommentRegex', {
		  get: function getMapFileCommentRegex () {
		    // Matches sourceMappingURL in either // or /* comment styles.
		    return /(?:\/\/[@#][ \t]+?sourceMappingURL=([^\s'"`]+?)[ \t]*?$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*?(?:\*\/){1}[ \t]*?$)/mg;
		  }
		});

		var decodeBase64;
		if (typeof Buffer !== 'undefined') {
		  if (typeof Buffer.from === 'function') {
		    decodeBase64 = decodeBase64WithBufferFrom;
		  } else {
		    decodeBase64 = decodeBase64WithNewBuffer;
		  }
		} else {
		  decodeBase64 = decodeBase64WithAtob;
		}

		function decodeBase64WithBufferFrom(base64) {
		  return Buffer.from(base64, 'base64').toString();
		}

		function decodeBase64WithNewBuffer(base64) {
		  if (typeof value === 'number') {
		    throw new TypeError('The value to decode must not be of type number.');
		  }
		  return new Buffer(base64, 'base64').toString();
		}

		function decodeBase64WithAtob(base64) {
		  return decodeURIComponent(escape(atob(base64)));
		}

		function stripComment(sm) {
		  return sm.split(',').pop();
		}

		function readFromFileMap(sm, read) {
		  var r = exports.mapFileCommentRegex.exec(sm);
		  // for some odd reason //# .. captures in 1 and /* .. */ in 2
		  var filename = r[1] || r[2];

		  try {
		    var sm = read(filename);
		    if (sm != null && typeof sm.catch === 'function') {
		      return sm.catch(throwError);
		    } else {
		      return sm;
		    }
		  } catch (e) {
		    throwError(e);
		  }

		  function throwError(e) {
		    throw new Error('An error occurred while trying to read the map file at ' + filename + '\n' + e.stack);
		  }
		}

		function Converter (sm, opts) {
		  opts = opts || {};

		  if (opts.hasComment) {
		    sm = stripComment(sm);
		  }

		  if (opts.encoding === 'base64') {
		    sm = decodeBase64(sm);
		  } else if (opts.encoding === 'uri') {
		    sm = decodeURIComponent(sm);
		  }

		  if (opts.isJSON || opts.encoding) {
		    sm = JSON.parse(sm);
		  }

		  this.sourcemap = sm;
		}

		Converter.prototype.toJSON = function (space) {
		  return JSON.stringify(this.sourcemap, null, space);
		};

		if (typeof Buffer !== 'undefined') {
		  if (typeof Buffer.from === 'function') {
		    Converter.prototype.toBase64 = encodeBase64WithBufferFrom;
		  } else {
		    Converter.prototype.toBase64 = encodeBase64WithNewBuffer;
		  }
		} else {
		  Converter.prototype.toBase64 = encodeBase64WithBtoa;
		}

		function encodeBase64WithBufferFrom() {
		  var json = this.toJSON();
		  return Buffer.from(json, 'utf8').toString('base64');
		}

		function encodeBase64WithNewBuffer() {
		  var json = this.toJSON();
		  if (typeof json === 'number') {
		    throw new TypeError('The json to encode must not be of type number.');
		  }
		  return new Buffer(json, 'utf8').toString('base64');
		}

		function encodeBase64WithBtoa() {
		  var json = this.toJSON();
		  return btoa(unescape(encodeURIComponent(json)));
		}

		Converter.prototype.toURI = function () {
		  var json = this.toJSON();
		  return encodeURIComponent(json);
		};

		Converter.prototype.toComment = function (options) {
		  var encoding, content, data;
		  if (options != null && options.encoding === 'uri') {
		    encoding = '';
		    content = this.toURI();
		  } else {
		    encoding = ';base64';
		    content = this.toBase64();
		  }
		  data = 'sourceMappingURL=data:application/json;charset=utf-8' + encoding + ',' + content;
		  return options != null && options.multiline ? '/*# ' + data + ' */' : '//# ' + data;
		};

		// returns copy instead of original
		Converter.prototype.toObject = function () {
		  return JSON.parse(this.toJSON());
		};

		Converter.prototype.addProperty = function (key, value) {
		  if (this.sourcemap.hasOwnProperty(key)) throw new Error('property "' + key + '" already exists on the sourcemap, use set property instead');
		  return this.setProperty(key, value);
		};

		Converter.prototype.setProperty = function (key, value) {
		  this.sourcemap[key] = value;
		  return this;
		};

		Converter.prototype.getProperty = function (key) {
		  return this.sourcemap[key];
		};

		exports.fromObject = function (obj) {
		  return new Converter(obj);
		};

		exports.fromJSON = function (json) {
		  return new Converter(json, { isJSON: true });
		};

		exports.fromURI = function (uri) {
		  return new Converter(uri, { encoding: 'uri' });
		};

		exports.fromBase64 = function (base64) {
		  return new Converter(base64, { encoding: 'base64' });
		};

		exports.fromComment = function (comment) {
		  var m, encoding;
		  comment = comment
		    .replace(/^\/\*/g, '//')
		    .replace(/\*\/$/g, '');
		  m = exports.commentRegex.exec(comment);
		  encoding = m && m[4] || 'uri';
		  return new Converter(comment, { encoding: encoding, hasComment: true });
		};

		function makeConverter(sm) {
		  return new Converter(sm, { isJSON: true });
		}

		exports.fromMapFileComment = function (comment, read) {
		  if (typeof read === 'string') {
		    throw new Error(
		      'String directory paths are no longer supported with `fromMapFileComment`\n' +
		      'Please review the Upgrading documentation at https://github.com/thlorenz/convert-source-map#upgrading'
		    )
		  }

		  var sm = readFromFileMap(comment, read);
		  if (sm != null && typeof sm.then === 'function') {
		    return sm.then(makeConverter);
		  } else {
		    return makeConverter(sm);
		  }
		};

		// Finds last sourcemap comment in file or returns null if none was found
		exports.fromSource = function (content) {
		  var m = content.match(exports.commentRegex);
		  return m ? exports.fromComment(m.pop()) : null;
		};

		// Finds last sourcemap comment in file or returns null if none was found
		exports.fromMapFileSource = function (content, read) {
		  if (typeof read === 'string') {
		    throw new Error(
		      'String directory paths are no longer supported with `fromMapFileSource`\n' +
		      'Please review the Upgrading documentation at https://github.com/thlorenz/convert-source-map#upgrading'
		    )
		  }
		  var m = content.match(exports.mapFileCommentRegex);
		  return m ? exports.fromMapFileComment(m.pop(), read) : null;
		};

		exports.removeComments = function (src) {
		  return src.replace(exports.commentRegex, '');
		};

		exports.removeMapFileComments = function (src) {
		  return src.replace(exports.mapFileCommentRegex, '');
		};

		exports.generateMapFileComment = function (file, options) {
		  var data = 'sourceMappingURL=' + file;
		  return options && options.multiline ? '/*# ' + data + ' */' : '//# ' + data;
		}; 
	} (convertSourceMap));
	return convertSourceMap;
}

var branch;
var hasRequiredBranch;

function requireBranch () {
	if (hasRequiredBranch) return branch;
	hasRequiredBranch = 1;
	branch = class CovBranch {
	  constructor (startLine, startCol, endLine, endCol, count) {
	    this.startLine = startLine;
	    this.startCol = startCol;
	    this.endLine = endLine;
	    this.endCol = endCol;
	    this.count = count;
	  }

	  toIstanbul () {
	    const location = {
	      start: {
	        line: this.startLine,
	        column: this.startCol
	      },
	      end: {
	        line: this.endLine,
	        column: this.endCol
	      }
	    };
	    return {
	      type: 'branch',
	      line: this.startLine,
	      loc: location,
	      locations: [Object.assign({}, location)]
	    }
	  }
	};
	return branch;
}

var _function;
var hasRequired_function;

function require_function () {
	if (hasRequired_function) return _function;
	hasRequired_function = 1;
	_function = class CovFunction {
	  constructor (name, startLine, startCol, endLine, endCol, count) {
	    this.name = name;
	    this.startLine = startLine;
	    this.startCol = startCol;
	    this.endLine = endLine;
	    this.endCol = endCol;
	    this.count = count;
	  }

	  toIstanbul () {
	    const loc = {
	      start: {
	        line: this.startLine,
	        column: this.startCol
	      },
	      end: {
	        line: this.endLine,
	        column: this.endCol
	      }
	    };
	    return {
	      name: this.name,
	      decl: loc,
	      loc,
	      line: this.startLine
	    }
	  }
	};
	return _function;
}

var line;
var hasRequiredLine;

function requireLine () {
	if (hasRequiredLine) return line;
	hasRequiredLine = 1;
	line = class CovLine {
	  constructor (line, startCol, lineStr) {
	    this.line = line;
	    // note that startCol and endCol are absolute positions
	    // within a file, not relative to the line.
	    this.startCol = startCol;

	    // the line length itself does not include the newline characters,
	    // these are however taken into account when enumerating absolute offset.
	    const matchedNewLineChar = lineStr.match(/\r?\n$/u);
	    const newLineLength = matchedNewLineChar ? matchedNewLineChar[0].length : 0;
	    this.endCol = startCol + lineStr.length - newLineLength;

	    // we start with all lines having been executed, and work
	    // backwards zeroing out lines based on V8 output.
	    this.count = 1;

	    // set by source.js during parsing, if /* c8 ignore next */ is found.
	    this.ignore = false;
	  }

	  toIstanbul () {
	    return {
	      start: {
	        line: this.line,
	        column: 0
	      },
	      end: {
	        line: this.line,
	        column: this.endCol - this.startCol
	      }
	    }
	  }
	};
	return line;
}

var range = {};

/**
 * ...something resembling a binary search, to find the lowest line within the range.
 * And then you could break as soon as the line is longer than the range...
 */

var hasRequiredRange;

function requireRange () {
	if (hasRequiredRange) return range;
	hasRequiredRange = 1;
	range.sliceRange = (lines, startCol, endCol, inclusive = false) => {
	  let start = 0;
	  let end = lines.length;

	  if (inclusive) {
	    // I consider this a temporary solution until I find an alternaive way to fix the "off by one issue"
	    --startCol;
	  }

	  while (start < end) {
	    let mid = (start + end) >> 1;
	    if (startCol >= lines[mid].endCol) {
	      start = mid + 1;
	    } else if (endCol < lines[mid].startCol) {
	      end = mid - 1;
	    } else {
	      end = mid;
	      while (mid >= 0 && startCol < lines[mid].endCol && endCol >= lines[mid].startCol) {
	        --mid;
	      }
	      start = mid + 1;
	      break
	    }
	  }

	  while (end < lines.length && startCol < lines[end].endCol && endCol >= lines[end].startCol) {
	    ++end;
	  }

	  return lines.slice(start, end)
	};
	return range;
}

var traceMapping_umd$1 = {exports: {}};

var sourcemapCodec_umd$1 = {exports: {}};

var sourcemapCodec_umd = sourcemapCodec_umd$1.exports;

var hasRequiredSourcemapCodec_umd;

function requireSourcemapCodec_umd () {
	if (hasRequiredSourcemapCodec_umd) return sourcemapCodec_umd$1.exports;
	hasRequiredSourcemapCodec_umd = 1;
	(function (module, exports) {
		(function (global, factory) {
		    factory(exports) ;
		})(sourcemapCodec_umd, (function (exports) {
		    const comma = ','.charCodeAt(0);
		    const semicolon = ';'.charCodeAt(0);
		    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		    const intToChar = new Uint8Array(64); // 64 possible chars.
		    const charToInt = new Uint8Array(128); // z is 122 in ASCII
		    for (let i = 0; i < chars.length; i++) {
		        const c = chars.charCodeAt(i);
		        intToChar[i] = c;
		        charToInt[c] = i;
		    }
		    function decodeInteger(reader, relative) {
		        let value = 0;
		        let shift = 0;
		        let integer = 0;
		        do {
		            const c = reader.next();
		            integer = charToInt[c];
		            value |= (integer & 31) << shift;
		            shift += 5;
		        } while (integer & 32);
		        const shouldNegate = value & 1;
		        value >>>= 1;
		        if (shouldNegate) {
		            value = -2147483648 | -value;
		        }
		        return relative + value;
		    }
		    function encodeInteger(builder, num, relative) {
		        let delta = num - relative;
		        delta = delta < 0 ? (-delta << 1) | 1 : delta << 1;
		        do {
		            let clamped = delta & 0b011111;
		            delta >>>= 5;
		            if (delta > 0)
		                clamped |= 0b100000;
		            builder.write(intToChar[clamped]);
		        } while (delta > 0);
		        return num;
		    }
		    function hasMoreVlq(reader, max) {
		        if (reader.pos >= max)
		            return false;
		        return reader.peek() !== comma;
		    }

		    const bufLength = 1024 * 16;
		    // Provide a fallback for older environments.
		    const td = typeof TextDecoder !== 'undefined'
		        ? /* #__PURE__ */ new TextDecoder()
		        : typeof Buffer !== 'undefined'
		            ? {
		                decode(buf) {
		                    const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
		                    return out.toString();
		                },
		            }
		            : {
		                decode(buf) {
		                    let out = '';
		                    for (let i = 0; i < buf.length; i++) {
		                        out += String.fromCharCode(buf[i]);
		                    }
		                    return out;
		                },
		            };
		    class StringWriter {
		        constructor() {
		            this.pos = 0;
		            this.out = '';
		            this.buffer = new Uint8Array(bufLength);
		        }
		        write(v) {
		            const { buffer } = this;
		            buffer[this.pos++] = v;
		            if (this.pos === bufLength) {
		                this.out += td.decode(buffer);
		                this.pos = 0;
		            }
		        }
		        flush() {
		            const { buffer, out, pos } = this;
		            return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
		        }
		    }
		    class StringReader {
		        constructor(buffer) {
		            this.pos = 0;
		            this.buffer = buffer;
		        }
		        next() {
		            return this.buffer.charCodeAt(this.pos++);
		        }
		        peek() {
		            return this.buffer.charCodeAt(this.pos);
		        }
		        indexOf(char) {
		            const { buffer, pos } = this;
		            const idx = buffer.indexOf(char, pos);
		            return idx === -1 ? buffer.length : idx;
		        }
		    }

		    const EMPTY = [];
		    function decodeOriginalScopes(input) {
		        const { length } = input;
		        const reader = new StringReader(input);
		        const scopes = [];
		        const stack = [];
		        let line = 0;
		        for (; reader.pos < length; reader.pos++) {
		            line = decodeInteger(reader, line);
		            const column = decodeInteger(reader, 0);
		            if (!hasMoreVlq(reader, length)) {
		                const last = stack.pop();
		                last[2] = line;
		                last[3] = column;
		                continue;
		            }
		            const kind = decodeInteger(reader, 0);
		            const fields = decodeInteger(reader, 0);
		            const hasName = fields & 0b0001;
		            const scope = (hasName ? [line, column, 0, 0, kind, decodeInteger(reader, 0)] : [line, column, 0, 0, kind]);
		            let vars = EMPTY;
		            if (hasMoreVlq(reader, length)) {
		                vars = [];
		                do {
		                    const varsIndex = decodeInteger(reader, 0);
		                    vars.push(varsIndex);
		                } while (hasMoreVlq(reader, length));
		            }
		            scope.vars = vars;
		            scopes.push(scope);
		            stack.push(scope);
		        }
		        return scopes;
		    }
		    function encodeOriginalScopes(scopes) {
		        const writer = new StringWriter();
		        for (let i = 0; i < scopes.length;) {
		            i = _encodeOriginalScopes(scopes, i, writer, [0]);
		        }
		        return writer.flush();
		    }
		    function _encodeOriginalScopes(scopes, index, writer, state) {
		        const scope = scopes[index];
		        const { 0: startLine, 1: startColumn, 2: endLine, 3: endColumn, 4: kind, vars } = scope;
		        if (index > 0)
		            writer.write(comma);
		        state[0] = encodeInteger(writer, startLine, state[0]);
		        encodeInteger(writer, startColumn, 0);
		        encodeInteger(writer, kind, 0);
		        const fields = scope.length === 6 ? 0b0001 : 0;
		        encodeInteger(writer, fields, 0);
		        if (scope.length === 6)
		            encodeInteger(writer, scope[5], 0);
		        for (const v of vars) {
		            encodeInteger(writer, v, 0);
		        }
		        for (index++; index < scopes.length;) {
		            const next = scopes[index];
		            const { 0: l, 1: c } = next;
		            if (l > endLine || (l === endLine && c >= endColumn)) {
		                break;
		            }
		            index = _encodeOriginalScopes(scopes, index, writer, state);
		        }
		        writer.write(comma);
		        state[0] = encodeInteger(writer, endLine, state[0]);
		        encodeInteger(writer, endColumn, 0);
		        return index;
		    }
		    function decodeGeneratedRanges(input) {
		        const { length } = input;
		        const reader = new StringReader(input);
		        const ranges = [];
		        const stack = [];
		        let genLine = 0;
		        let definitionSourcesIndex = 0;
		        let definitionScopeIndex = 0;
		        let callsiteSourcesIndex = 0;
		        let callsiteLine = 0;
		        let callsiteColumn = 0;
		        let bindingLine = 0;
		        let bindingColumn = 0;
		        do {
		            const semi = reader.indexOf(';');
		            let genColumn = 0;
		            for (; reader.pos < semi; reader.pos++) {
		                genColumn = decodeInteger(reader, genColumn);
		                if (!hasMoreVlq(reader, semi)) {
		                    const last = stack.pop();
		                    last[2] = genLine;
		                    last[3] = genColumn;
		                    continue;
		                }
		                const fields = decodeInteger(reader, 0);
		                const hasDefinition = fields & 0b0001;
		                const hasCallsite = fields & 0b0010;
		                const hasScope = fields & 0b0100;
		                let callsite = null;
		                let bindings = EMPTY;
		                let range;
		                if (hasDefinition) {
		                    const defSourcesIndex = decodeInteger(reader, definitionSourcesIndex);
		                    definitionScopeIndex = decodeInteger(reader, definitionSourcesIndex === defSourcesIndex ? definitionScopeIndex : 0);
		                    definitionSourcesIndex = defSourcesIndex;
		                    range = [genLine, genColumn, 0, 0, defSourcesIndex, definitionScopeIndex];
		                }
		                else {
		                    range = [genLine, genColumn, 0, 0];
		                }
		                range.isScope = !!hasScope;
		                if (hasCallsite) {
		                    const prevCsi = callsiteSourcesIndex;
		                    const prevLine = callsiteLine;
		                    callsiteSourcesIndex = decodeInteger(reader, callsiteSourcesIndex);
		                    const sameSource = prevCsi === callsiteSourcesIndex;
		                    callsiteLine = decodeInteger(reader, sameSource ? callsiteLine : 0);
		                    callsiteColumn = decodeInteger(reader, sameSource && prevLine === callsiteLine ? callsiteColumn : 0);
		                    callsite = [callsiteSourcesIndex, callsiteLine, callsiteColumn];
		                }
		                range.callsite = callsite;
		                if (hasMoreVlq(reader, semi)) {
		                    bindings = [];
		                    do {
		                        bindingLine = genLine;
		                        bindingColumn = genColumn;
		                        const expressionsCount = decodeInteger(reader, 0);
		                        let expressionRanges;
		                        if (expressionsCount < -1) {
		                            expressionRanges = [[decodeInteger(reader, 0)]];
		                            for (let i = -1; i > expressionsCount; i--) {
		                                const prevBl = bindingLine;
		                                bindingLine = decodeInteger(reader, bindingLine);
		                                bindingColumn = decodeInteger(reader, bindingLine === prevBl ? bindingColumn : 0);
		                                const expression = decodeInteger(reader, 0);
		                                expressionRanges.push([expression, bindingLine, bindingColumn]);
		                            }
		                        }
		                        else {
		                            expressionRanges = [[expressionsCount]];
		                        }
		                        bindings.push(expressionRanges);
		                    } while (hasMoreVlq(reader, semi));
		                }
		                range.bindings = bindings;
		                ranges.push(range);
		                stack.push(range);
		            }
		            genLine++;
		            reader.pos = semi + 1;
		        } while (reader.pos < length);
		        return ranges;
		    }
		    function encodeGeneratedRanges(ranges) {
		        if (ranges.length === 0)
		            return '';
		        const writer = new StringWriter();
		        for (let i = 0; i < ranges.length;) {
		            i = _encodeGeneratedRanges(ranges, i, writer, [0, 0, 0, 0, 0, 0, 0]);
		        }
		        return writer.flush();
		    }
		    function _encodeGeneratedRanges(ranges, index, writer, state) {
		        const range = ranges[index];
		        const { 0: startLine, 1: startColumn, 2: endLine, 3: endColumn, isScope, callsite, bindings, } = range;
		        if (state[0] < startLine) {
		            catchupLine(writer, state[0], startLine);
		            state[0] = startLine;
		            state[1] = 0;
		        }
		        else if (index > 0) {
		            writer.write(comma);
		        }
		        state[1] = encodeInteger(writer, range[1], state[1]);
		        const fields = (range.length === 6 ? 0b0001 : 0) | (callsite ? 0b0010 : 0) | (isScope ? 0b0100 : 0);
		        encodeInteger(writer, fields, 0);
		        if (range.length === 6) {
		            const { 4: sourcesIndex, 5: scopesIndex } = range;
		            if (sourcesIndex !== state[2]) {
		                state[3] = 0;
		            }
		            state[2] = encodeInteger(writer, sourcesIndex, state[2]);
		            state[3] = encodeInteger(writer, scopesIndex, state[3]);
		        }
		        if (callsite) {
		            const { 0: sourcesIndex, 1: callLine, 2: callColumn } = range.callsite;
		            if (sourcesIndex !== state[4]) {
		                state[5] = 0;
		                state[6] = 0;
		            }
		            else if (callLine !== state[5]) {
		                state[6] = 0;
		            }
		            state[4] = encodeInteger(writer, sourcesIndex, state[4]);
		            state[5] = encodeInteger(writer, callLine, state[5]);
		            state[6] = encodeInteger(writer, callColumn, state[6]);
		        }
		        if (bindings) {
		            for (const binding of bindings) {
		                if (binding.length > 1)
		                    encodeInteger(writer, -binding.length, 0);
		                const expression = binding[0][0];
		                encodeInteger(writer, expression, 0);
		                let bindingStartLine = startLine;
		                let bindingStartColumn = startColumn;
		                for (let i = 1; i < binding.length; i++) {
		                    const expRange = binding[i];
		                    bindingStartLine = encodeInteger(writer, expRange[1], bindingStartLine);
		                    bindingStartColumn = encodeInteger(writer, expRange[2], bindingStartColumn);
		                    encodeInteger(writer, expRange[0], 0);
		                }
		            }
		        }
		        for (index++; index < ranges.length;) {
		            const next = ranges[index];
		            const { 0: l, 1: c } = next;
		            if (l > endLine || (l === endLine && c >= endColumn)) {
		                break;
		            }
		            index = _encodeGeneratedRanges(ranges, index, writer, state);
		        }
		        if (state[0] < endLine) {
		            catchupLine(writer, state[0], endLine);
		            state[0] = endLine;
		            state[1] = 0;
		        }
		        else {
		            writer.write(comma);
		        }
		        state[1] = encodeInteger(writer, endColumn, state[1]);
		        return index;
		    }
		    function catchupLine(writer, lastLine, line) {
		        do {
		            writer.write(semicolon);
		        } while (++lastLine < line);
		    }

		    function decode(mappings) {
		        const { length } = mappings;
		        const reader = new StringReader(mappings);
		        const decoded = [];
		        let genColumn = 0;
		        let sourcesIndex = 0;
		        let sourceLine = 0;
		        let sourceColumn = 0;
		        let namesIndex = 0;
		        do {
		            const semi = reader.indexOf(';');
		            const line = [];
		            let sorted = true;
		            let lastCol = 0;
		            genColumn = 0;
		            while (reader.pos < semi) {
		                let seg;
		                genColumn = decodeInteger(reader, genColumn);
		                if (genColumn < lastCol)
		                    sorted = false;
		                lastCol = genColumn;
		                if (hasMoreVlq(reader, semi)) {
		                    sourcesIndex = decodeInteger(reader, sourcesIndex);
		                    sourceLine = decodeInteger(reader, sourceLine);
		                    sourceColumn = decodeInteger(reader, sourceColumn);
		                    if (hasMoreVlq(reader, semi)) {
		                        namesIndex = decodeInteger(reader, namesIndex);
		                        seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex];
		                    }
		                    else {
		                        seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
		                    }
		                }
		                else {
		                    seg = [genColumn];
		                }
		                line.push(seg);
		                reader.pos++;
		            }
		            if (!sorted)
		                sort(line);
		            decoded.push(line);
		            reader.pos = semi + 1;
		        } while (reader.pos <= length);
		        return decoded;
		    }
		    function sort(line) {
		        line.sort(sortComparator);
		    }
		    function sortComparator(a, b) {
		        return a[0] - b[0];
		    }
		    function encode(decoded) {
		        const writer = new StringWriter();
		        let sourcesIndex = 0;
		        let sourceLine = 0;
		        let sourceColumn = 0;
		        let namesIndex = 0;
		        for (let i = 0; i < decoded.length; i++) {
		            const line = decoded[i];
		            if (i > 0)
		                writer.write(semicolon);
		            if (line.length === 0)
		                continue;
		            let genColumn = 0;
		            for (let j = 0; j < line.length; j++) {
		                const segment = line[j];
		                if (j > 0)
		                    writer.write(comma);
		                genColumn = encodeInteger(writer, segment[0], genColumn);
		                if (segment.length === 1)
		                    continue;
		                sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex);
		                sourceLine = encodeInteger(writer, segment[2], sourceLine);
		                sourceColumn = encodeInteger(writer, segment[3], sourceColumn);
		                if (segment.length === 4)
		                    continue;
		                namesIndex = encodeInteger(writer, segment[4], namesIndex);
		            }
		        }
		        return writer.flush();
		    }

		    exports.decode = decode;
		    exports.decodeGeneratedRanges = decodeGeneratedRanges;
		    exports.decodeOriginalScopes = decodeOriginalScopes;
		    exports.encode = encode;
		    exports.encodeGeneratedRanges = encodeGeneratedRanges;
		    exports.encodeOriginalScopes = encodeOriginalScopes;

		    Object.defineProperty(exports, '__esModule', { value: true });

		}));
		
	} (sourcemapCodec_umd$1, sourcemapCodec_umd$1.exports));
	return sourcemapCodec_umd$1.exports;
}

var resolveUri_umd$1 = {exports: {}};

var resolveUri_umd = resolveUri_umd$1.exports;

var hasRequiredResolveUri_umd;

function requireResolveUri_umd () {
	if (hasRequiredResolveUri_umd) return resolveUri_umd$1.exports;
	hasRequiredResolveUri_umd = 1;
	(function (module, exports) {
		(function (global, factory) {
		    module.exports = factory() ;
		})(resolveUri_umd, (function () {
		    // Matches the scheme of a URL, eg "http://"
		    const schemeRegex = /^[\w+.-]+:\/\//;
		    /**
		     * Matches the parts of a URL:
		     * 1. Scheme, including ":", guaranteed.
		     * 2. User/password, including "@", optional.
		     * 3. Host, guaranteed.
		     * 4. Port, including ":", optional.
		     * 5. Path, including "/", optional.
		     * 6. Query, including "?", optional.
		     * 7. Hash, including "#", optional.
		     */
		    const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
		    /**
		     * File URLs are weird. They dont' need the regular `//` in the scheme, they may or may not start
		     * with a leading `/`, they can have a domain (but only if they don't start with a Windows drive).
		     *
		     * 1. Host, optional.
		     * 2. Path, which may include "/", guaranteed.
		     * 3. Query, including "?", optional.
		     * 4. Hash, including "#", optional.
		     */
		    const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
		    var UrlType;
		    (function (UrlType) {
		        UrlType[UrlType["Empty"] = 1] = "Empty";
		        UrlType[UrlType["Hash"] = 2] = "Hash";
		        UrlType[UrlType["Query"] = 3] = "Query";
		        UrlType[UrlType["RelativePath"] = 4] = "RelativePath";
		        UrlType[UrlType["AbsolutePath"] = 5] = "AbsolutePath";
		        UrlType[UrlType["SchemeRelative"] = 6] = "SchemeRelative";
		        UrlType[UrlType["Absolute"] = 7] = "Absolute";
		    })(UrlType || (UrlType = {}));
		    function isAbsoluteUrl(input) {
		        return schemeRegex.test(input);
		    }
		    function isSchemeRelativeUrl(input) {
		        return input.startsWith('//');
		    }
		    function isAbsolutePath(input) {
		        return input.startsWith('/');
		    }
		    function isFileUrl(input) {
		        return input.startsWith('file:');
		    }
		    function isRelative(input) {
		        return /^[.?#]/.test(input);
		    }
		    function parseAbsoluteUrl(input) {
		        const match = urlRegex.exec(input);
		        return makeUrl(match[1], match[2] || '', match[3], match[4] || '', match[5] || '/', match[6] || '', match[7] || '');
		    }
		    function parseFileUrl(input) {
		        const match = fileRegex.exec(input);
		        const path = match[2];
		        return makeUrl('file:', '', match[1] || '', '', isAbsolutePath(path) ? path : '/' + path, match[3] || '', match[4] || '');
		    }
		    function makeUrl(scheme, user, host, port, path, query, hash) {
		        return {
		            scheme,
		            user,
		            host,
		            port,
		            path,
		            query,
		            hash,
		            type: UrlType.Absolute,
		        };
		    }
		    function parseUrl(input) {
		        if (isSchemeRelativeUrl(input)) {
		            const url = parseAbsoluteUrl('http:' + input);
		            url.scheme = '';
		            url.type = UrlType.SchemeRelative;
		            return url;
		        }
		        if (isAbsolutePath(input)) {
		            const url = parseAbsoluteUrl('http://foo.com' + input);
		            url.scheme = '';
		            url.host = '';
		            url.type = UrlType.AbsolutePath;
		            return url;
		        }
		        if (isFileUrl(input))
		            return parseFileUrl(input);
		        if (isAbsoluteUrl(input))
		            return parseAbsoluteUrl(input);
		        const url = parseAbsoluteUrl('http://foo.com/' + input);
		        url.scheme = '';
		        url.host = '';
		        url.type = input
		            ? input.startsWith('?')
		                ? UrlType.Query
		                : input.startsWith('#')
		                    ? UrlType.Hash
		                    : UrlType.RelativePath
		            : UrlType.Empty;
		        return url;
		    }
		    function stripPathFilename(path) {
		        // If a path ends with a parent directory "..", then it's a relative path with excess parent
		        // paths. It's not a file, so we can't strip it.
		        if (path.endsWith('/..'))
		            return path;
		        const index = path.lastIndexOf('/');
		        return path.slice(0, index + 1);
		    }
		    function mergePaths(url, base) {
		        normalizePath(base, base.type);
		        // If the path is just a "/", then it was an empty path to begin with (remember, we're a relative
		        // path).
		        if (url.path === '/') {
		            url.path = base.path;
		        }
		        else {
		            // Resolution happens relative to the base path's directory, not the file.
		            url.path = stripPathFilename(base.path) + url.path;
		        }
		    }
		    /**
		     * The path can have empty directories "//", unneeded parents "foo/..", or current directory
		     * "foo/.". We need to normalize to a standard representation.
		     */
		    function normalizePath(url, type) {
		        const rel = type <= UrlType.RelativePath;
		        const pieces = url.path.split('/');
		        // We need to preserve the first piece always, so that we output a leading slash. The item at
		        // pieces[0] is an empty string.
		        let pointer = 1;
		        // Positive is the number of real directories we've output, used for popping a parent directory.
		        // Eg, "foo/bar/.." will have a positive 2, and we can decrement to be left with just "foo".
		        let positive = 0;
		        // We need to keep a trailing slash if we encounter an empty directory (eg, splitting "foo/" will
		        // generate `["foo", ""]` pieces). And, if we pop a parent directory. But once we encounter a
		        // real directory, we won't need to append, unless the other conditions happen again.
		        let addTrailingSlash = false;
		        for (let i = 1; i < pieces.length; i++) {
		            const piece = pieces[i];
		            // An empty directory, could be a trailing slash, or just a double "//" in the path.
		            if (!piece) {
		                addTrailingSlash = true;
		                continue;
		            }
		            // If we encounter a real directory, then we don't need to append anymore.
		            addTrailingSlash = false;
		            // A current directory, which we can always drop.
		            if (piece === '.')
		                continue;
		            // A parent directory, we need to see if there are any real directories we can pop. Else, we
		            // have an excess of parents, and we'll need to keep the "..".
		            if (piece === '..') {
		                if (positive) {
		                    addTrailingSlash = true;
		                    positive--;
		                    pointer--;
		                }
		                else if (rel) {
		                    // If we're in a relativePath, then we need to keep the excess parents. Else, in an absolute
		                    // URL, protocol relative URL, or an absolute path, we don't need to keep excess.
		                    pieces[pointer++] = piece;
		                }
		                continue;
		            }
		            // We've encountered a real directory. Move it to the next insertion pointer, which accounts for
		            // any popped or dropped directories.
		            pieces[pointer++] = piece;
		            positive++;
		        }
		        let path = '';
		        for (let i = 1; i < pointer; i++) {
		            path += '/' + pieces[i];
		        }
		        if (!path || (addTrailingSlash && !path.endsWith('/..'))) {
		            path += '/';
		        }
		        url.path = path;
		    }
		    /**
		     * Attempts to resolve `input` URL/path relative to `base`.
		     */
		    function resolve(input, base) {
		        if (!input && !base)
		            return '';
		        const url = parseUrl(input);
		        let inputType = url.type;
		        if (base && inputType !== UrlType.Absolute) {
		            const baseUrl = parseUrl(base);
		            const baseType = baseUrl.type;
		            switch (inputType) {
		                case UrlType.Empty:
		                    url.hash = baseUrl.hash;
		                // fall through
		                case UrlType.Hash:
		                    url.query = baseUrl.query;
		                // fall through
		                case UrlType.Query:
		                case UrlType.RelativePath:
		                    mergePaths(url, baseUrl);
		                // fall through
		                case UrlType.AbsolutePath:
		                    // The host, user, and port are joined, you can't copy one without the others.
		                    url.user = baseUrl.user;
		                    url.host = baseUrl.host;
		                    url.port = baseUrl.port;
		                // fall through
		                case UrlType.SchemeRelative:
		                    // The input doesn't have a schema at least, so we need to copy at least that over.
		                    url.scheme = baseUrl.scheme;
		            }
		            if (baseType > inputType)
		                inputType = baseType;
		        }
		        normalizePath(url, inputType);
		        const queryHash = url.query + url.hash;
		        switch (inputType) {
		            // This is impossible, because of the empty checks at the start of the function.
		            // case UrlType.Empty:
		            case UrlType.Hash:
		            case UrlType.Query:
		                return queryHash;
		            case UrlType.RelativePath: {
		                // The first char is always a "/", and we need it to be relative.
		                const path = url.path.slice(1);
		                if (!path)
		                    return queryHash || '.';
		                if (isRelative(base || input) && !isRelative(path)) {
		                    // If base started with a leading ".", or there is no base and input started with a ".",
		                    // then we need to ensure that the relative path starts with a ".". We don't know if
		                    // relative starts with a "..", though, so check before prepending.
		                    return './' + path + queryHash;
		                }
		                return path + queryHash;
		            }
		            case UrlType.AbsolutePath:
		                return url.path + queryHash;
		            default:
		                return url.scheme + '//' + url.user + url.host + url.port + url.path + queryHash;
		        }
		    }

		    return resolve;

		}));
		
	} (resolveUri_umd$1));
	return resolveUri_umd$1.exports;
}

var traceMapping_umd = traceMapping_umd$1.exports;

var hasRequiredTraceMapping_umd;

function requireTraceMapping_umd () {
	if (hasRequiredTraceMapping_umd) return traceMapping_umd$1.exports;
	hasRequiredTraceMapping_umd = 1;
	(function (module, exports) {
		(function (global, factory) {
		    factory(exports, requireSourcemapCodec_umd(), requireResolveUri_umd()) ;
		})(traceMapping_umd, (function (exports, sourcemapCodec, resolveUri) {
		    function resolve(input, base) {
		        // The base is always treated as a directory, if it's not empty.
		        // https://github.com/mozilla/source-map/blob/8cb3ee57/lib/util.js#L327
		        // https://github.com/chromium/chromium/blob/da4adbb3/third_party/blink/renderer/devtools/front_end/sdk/SourceMap.js#L400-L401
		        if (base && !base.endsWith('/'))
		            base += '/';
		        return resolveUri(input, base);
		    }

		    /**
		     * Removes everything after the last "/", but leaves the slash.
		     */
		    function stripFilename(path) {
		        if (!path)
		            return '';
		        const index = path.lastIndexOf('/');
		        return path.slice(0, index + 1);
		    }

		    const COLUMN = 0;
		    const SOURCES_INDEX = 1;
		    const SOURCE_LINE = 2;
		    const SOURCE_COLUMN = 3;
		    const NAMES_INDEX = 4;
		    const REV_GENERATED_LINE = 1;
		    const REV_GENERATED_COLUMN = 2;

		    function maybeSort(mappings, owned) {
		        const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
		        if (unsortedIndex === mappings.length)
		            return mappings;
		        // If we own the array (meaning we parsed it from JSON), then we're free to directly mutate it. If
		        // not, we do not want to modify the consumer's input array.
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
		        return line.sort(sortComparator);
		    }
		    function sortComparator(a, b) {
		        return a[COLUMN] - b[COLUMN];
		    }

		    let found = false;
		    /**
		     * A binary search implementation that returns the index if a match is found.
		     * If no match is found, then the left-index (the index associated with the item that comes just
		     * before the desired index) is returned. To maintain proper sort order, a splice would happen at
		     * the next index:
		     *
		     * ```js
		     * const array = [1, 3];
		     * const needle = 2;
		     * const index = binarySearch(array, needle, (item, needle) => item - needle);
		     *
		     * assert.equal(index, 0);
		     * array.splice(index + 1, 0, needle);
		     * assert.deepEqual(array, [1, 2, 3]);
		     * ```
		     */
		    function binarySearch(haystack, needle, low, high) {
		        while (low <= high) {
		            const mid = low + ((high - low) >> 1);
		            const cmp = haystack[mid][COLUMN] - needle;
		            if (cmp === 0) {
		                found = true;
		                return mid;
		            }
		            if (cmp < 0) {
		                low = mid + 1;
		            }
		            else {
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
		            lastIndex: -1,
		        };
		    }
		    /**
		     * This overly complicated beast is just to record the last tested line/column and the resulting
		     * index, allowing us to skip a few tests if mappings are monotonically increasing.
		     */
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
		                // lastIndex may be -1 if the previous needle was not found.
		                low = lastIndex === -1 ? 0 : lastIndex;
		            }
		            else {
		                high = lastIndex;
		            }
		        }
		        state.lastKey = key;
		        state.lastNeedle = needle;
		        return (state.lastIndex = binarySearch(haystack, needle, low, high));
		    }

		    // Rebuilds the original source files, with mappings that are ordered by source line/column instead
		    // of generated line/column.
		    function buildBySources(decoded, memos) {
		        const sources = memos.map(buildNullArray);
		        for (let i = 0; i < decoded.length; i++) {
		            const line = decoded[i];
		            for (let j = 0; j < line.length; j++) {
		                const seg = line[j];
		                if (seg.length === 1)
		                    continue;
		                const sourceIndex = seg[SOURCES_INDEX];
		                const sourceLine = seg[SOURCE_LINE];
		                const sourceColumn = seg[SOURCE_COLUMN];
		                const originalSource = sources[sourceIndex];
		                const originalLine = (originalSource[sourceLine] || (originalSource[sourceLine] = []));
		                const memo = memos[sourceIndex];
		                // The binary search either found a match, or it found the left-index just before where the
		                // segment should go. Either way, we want to insert after that. And there may be multiple
		                // generated segments associated with an original location, so there may need to move several
		                // indexes before we find where we need to insert.
		                let index = upperBound(originalLine, sourceColumn, memoizedBinarySearch(originalLine, sourceColumn, memo, sourceLine));
		                memo.lastIndex = ++index;
		                insert(originalLine, index, [sourceColumn, i, seg[COLUMN]]);
		            }
		        }
		        return sources;
		    }
		    function insert(array, index, value) {
		        for (let i = array.length; i > index; i--) {
		            array[i] = array[i - 1];
		        }
		        array[index] = value;
		    }
		    // Null arrays allow us to use ordered index keys without actually allocating contiguous memory like
		    // a real array. We use a null-prototype object to avoid prototype pollution and deoptimizations.
		    // Numeric properties on objects are magically sorted in ascending order by the engine regardless of
		    // the insertion order. So, by setting any numeric keys, even out of order, we'll get ascending
		    // order when iterating with for-in.
		    function buildNullArray() {
		        return { __proto__: null };
		    }

		    const AnyMap = function (map, mapUrl) {
		        const parsed = parse(map);
		        if (!('sections' in parsed)) {
		            return new TraceMap(parsed, mapUrl);
		        }
		        const mappings = [];
		        const sources = [];
		        const sourcesContent = [];
		        const names = [];
		        const ignoreList = [];
		        recurse(parsed, mapUrl, mappings, sources, sourcesContent, names, ignoreList, 0, 0, Infinity, Infinity);
		        const joined = {
		            version: 3,
		            file: parsed.file,
		            names,
		            sources,
		            sourcesContent,
		            mappings,
		            ignoreList,
		        };
		        return presortedDecodedMap(joined);
		    };
		    function parse(map) {
		        return typeof map === 'string' ? JSON.parse(map) : map;
		    }
		    function recurse(input, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset, columnOffset, stopLine, stopColumn) {
		        const { sections } = input;
		        for (let i = 0; i < sections.length; i++) {
		            const { map, offset } = sections[i];
		            let sl = stopLine;
		            let sc = stopColumn;
		            if (i + 1 < sections.length) {
		                const nextOffset = sections[i + 1].offset;
		                sl = Math.min(stopLine, lineOffset + nextOffset.line);
		                if (sl === stopLine) {
		                    sc = Math.min(stopColumn, columnOffset + nextOffset.column);
		                }
		                else if (sl < stopLine) {
		                    sc = columnOffset + nextOffset.column;
		                }
		            }
		            addSection(map, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset + offset.line, columnOffset + offset.column, sl, sc);
		        }
		    }
		    function addSection(input, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset, columnOffset, stopLine, stopColumn) {
		        const parsed = parse(input);
		        if ('sections' in parsed)
		            return recurse(...arguments);
		        const map = new TraceMap(parsed, mapUrl);
		        const sourcesOffset = sources.length;
		        const namesOffset = names.length;
		        const decoded = decodedMappings(map);
		        const { resolvedSources, sourcesContent: contents, ignoreList: ignores } = map;
		        append(sources, resolvedSources);
		        append(names, map.names);
		        if (contents)
		            append(sourcesContent, contents);
		        else
		            for (let i = 0; i < resolvedSources.length; i++)
		                sourcesContent.push(null);
		        if (ignores)
		            for (let i = 0; i < ignores.length; i++)
		                ignoreList.push(ignores[i] + sourcesOffset);
		        for (let i = 0; i < decoded.length; i++) {
		            const lineI = lineOffset + i;
		            // We can only add so many lines before we step into the range that the next section's map
		            // controls. When we get to the last line, then we'll start checking the segments to see if
		            // they've crossed into the column range. But it may not have any columns that overstep, so we
		            // still need to check that we don't overstep lines, too.
		            if (lineI > stopLine)
		                return;
		            // The out line may already exist in mappings (if we're continuing the line started by a
		            // previous section). Or, we may have jumped ahead several lines to start this section.
		            const out = getLine(mappings, lineI);
		            // On the 0th loop, the section's column offset shifts us forward. On all other lines (since the
		            // map can be multiple lines), it doesn't.
		            const cOffset = i === 0 ? columnOffset : 0;
		            const line = decoded[i];
		            for (let j = 0; j < line.length; j++) {
		                const seg = line[j];
		                const column = cOffset + seg[COLUMN];
		                // If this segment steps into the column range that the next section's map controls, we need
		                // to stop early.
		                if (lineI === stopLine && column >= stopColumn)
		                    return;
		                if (seg.length === 1) {
		                    out.push([column]);
		                    continue;
		                }
		                const sourcesIndex = sourcesOffset + seg[SOURCES_INDEX];
		                const sourceLine = seg[SOURCE_LINE];
		                const sourceColumn = seg[SOURCE_COLUMN];
		                out.push(seg.length === 4
		                    ? [column, sourcesIndex, sourceLine, sourceColumn]
		                    : [column, sourcesIndex, sourceLine, sourceColumn, namesOffset + seg[NAMES_INDEX]]);
		            }
		        }
		    }
		    function append(arr, other) {
		        for (let i = 0; i < other.length; i++)
		            arr.push(other[i]);
		    }
		    function getLine(arr, index) {
		        for (let i = arr.length; i <= index; i++)
		            arr[i] = [];
		        return arr[index];
		    }

		    const LINE_GTR_ZERO = '`line` must be greater than 0 (lines start at line 1)';
		    const COL_GTR_EQ_ZERO = '`column` must be greater than or equal to 0 (columns start at column 0)';
		    const LEAST_UPPER_BOUND = -1;
		    const GREATEST_LOWER_BOUND = 1;
		    class TraceMap {
		        constructor(map, mapUrl) {
		            const isString = typeof map === 'string';
		            if (!isString && map._decodedMemo)
		                return map;
		            const parsed = (isString ? JSON.parse(map) : map);
		            const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
		            this.version = version;
		            this.file = file;
		            this.names = names || [];
		            this.sourceRoot = sourceRoot;
		            this.sources = sources;
		            this.sourcesContent = sourcesContent;
		            this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || undefined;
		            const from = resolve(sourceRoot || '', stripFilename(mapUrl));
		            this.resolvedSources = sources.map((s) => resolve(s || '', from));
		            const { mappings } = parsed;
		            if (typeof mappings === 'string') {
		                this._encoded = mappings;
		                this._decoded = undefined;
		            }
		            else {
		                this._encoded = undefined;
		                this._decoded = maybeSort(mappings, isString);
		            }
		            this._decodedMemo = memoizedState();
		            this._bySources = undefined;
		            this._bySourceMemos = undefined;
		        }
		    }
		    /**
		     * Typescript doesn't allow friend access to private fields, so this just casts the map into a type
		     * with public access modifiers.
		     */
		    function cast(map) {
		        return map;
		    }
		    /**
		     * Returns the encoded (VLQ string) form of the SourceMap's mappings field.
		     */
		    function encodedMappings(map) {
		        var _a;
		        var _b;
		        return ((_a = (_b = cast(map))._encoded) !== null && _a !== void 0 ? _a : (_b._encoded = sourcemapCodec.encode(cast(map)._decoded)));
		    }
		    /**
		     * Returns the decoded (array of lines of segments) form of the SourceMap's mappings field.
		     */
		    function decodedMappings(map) {
		        var _a;
		        return ((_a = cast(map))._decoded || (_a._decoded = sourcemapCodec.decode(cast(map)._encoded)));
		    }
		    /**
		     * A low-level API to find the segment associated with a generated line/column (think, from a
		     * stack trace). Line and column here are 0-based, unlike `originalPositionFor`.
		     */
		    function traceSegment(map, line, column) {
		        const decoded = decodedMappings(map);
		        // It's common for parent source maps to have pointers to lines that have no
		        // mapping (like a "//# sourceMappingURL=") at the end of the child file.
		        if (line >= decoded.length)
		            return null;
		        const segments = decoded[line];
		        const index = traceSegmentInternal(segments, cast(map)._decodedMemo, line, column, GREATEST_LOWER_BOUND);
		        return index === -1 ? null : segments[index];
		    }
		    /**
		     * A higher-level API to find the source/line/column associated with a generated line/column
		     * (think, from a stack trace). Line is 1-based, but column is 0-based, due to legacy behavior in
		     * `source-map` library.
		     */
		    function originalPositionFor(map, needle) {
		        let { line, column, bias } = needle;
		        line--;
		        if (line < 0)
		            throw new Error(LINE_GTR_ZERO);
		        if (column < 0)
		            throw new Error(COL_GTR_EQ_ZERO);
		        const decoded = decodedMappings(map);
		        // It's common for parent source maps to have pointers to lines that have no
		        // mapping (like a "//# sourceMappingURL=") at the end of the child file.
		        if (line >= decoded.length)
		            return OMapping(null, null, null, null);
		        const segments = decoded[line];
		        const index = traceSegmentInternal(segments, cast(map)._decodedMemo, line, column, bias || GREATEST_LOWER_BOUND);
		        if (index === -1)
		            return OMapping(null, null, null, null);
		        const segment = segments[index];
		        if (segment.length === 1)
		            return OMapping(null, null, null, null);
		        const { names, resolvedSources } = map;
		        return OMapping(resolvedSources[segment[SOURCES_INDEX]], segment[SOURCE_LINE] + 1, segment[SOURCE_COLUMN], segment.length === 5 ? names[segment[NAMES_INDEX]] : null);
		    }
		    /**
		     * Finds the generated line/column position of the provided source/line/column source position.
		     */
		    function generatedPositionFor(map, needle) {
		        const { source, line, column, bias } = needle;
		        return generatedPosition(map, source, line, column, bias || GREATEST_LOWER_BOUND, false);
		    }
		    /**
		     * Finds all generated line/column positions of the provided source/line/column source position.
		     */
		    function allGeneratedPositionsFor(map, needle) {
		        const { source, line, column, bias } = needle;
		        // SourceMapConsumer uses LEAST_UPPER_BOUND for some reason, so we follow suit.
		        return generatedPosition(map, source, line, column, bias || LEAST_UPPER_BOUND, true);
		    }
		    /**
		     * Iterates each mapping in generated position order.
		     */
		    function eachMapping(map, cb) {
		        const decoded = decodedMappings(map);
		        const { names, resolvedSources } = map;
		        for (let i = 0; i < decoded.length; i++) {
		            const line = decoded[i];
		            for (let j = 0; j < line.length; j++) {
		                const seg = line[j];
		                const generatedLine = i + 1;
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
		                    name,
		                });
		            }
		        }
		    }
		    function sourceIndex(map, source) {
		        const { sources, resolvedSources } = map;
		        let index = sources.indexOf(source);
		        if (index === -1)
		            index = resolvedSources.indexOf(source);
		        return index;
		    }
		    /**
		     * Retrieves the source content for a particular source, if its found. Returns null if not.
		     */
		    function sourceContentFor(map, source) {
		        const { sourcesContent } = map;
		        if (sourcesContent == null)
		            return null;
		        const index = sourceIndex(map, source);
		        return index === -1 ? null : sourcesContent[index];
		    }
		    /**
		     * Determines if the source is marked to ignore by the source map.
		     */
		    function isIgnored(map, source) {
		        const { ignoreList } = map;
		        if (ignoreList == null)
		            return false;
		        const index = sourceIndex(map, source);
		        return index === -1 ? false : ignoreList.includes(index);
		    }
		    /**
		     * A helper that skips sorting of the input map's mappings array, which can be expensive for larger
		     * maps.
		     */
		    function presortedDecodedMap(map, mapUrl) {
		        const tracer = new TraceMap(clone(map, []), mapUrl);
		        cast(tracer)._decoded = map.mappings;
		        return tracer;
		    }
		    /**
		     * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
		     * a sourcemap, or to JSON.stringify.
		     */
		    function decodedMap(map) {
		        return clone(map, decodedMappings(map));
		    }
		    /**
		     * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
		     * a sourcemap, or to JSON.stringify.
		     */
		    function encodedMap(map) {
		        return clone(map, encodedMappings(map));
		    }
		    function clone(map, mappings) {
		        return {
		            version: map.version,
		            file: map.file,
		            names: map.names,
		            sourceRoot: map.sourceRoot,
		            sources: map.sources,
		            sourcesContent: map.sourcesContent,
		            mappings,
		            ignoreList: map.ignoreList || map.x_google_ignoreList,
		        };
		    }
		    function OMapping(source, line, column, name) {
		        return { source, line, column, name };
		    }
		    function GMapping(line, column) {
		        return { line, column };
		    }
		    function traceSegmentInternal(segments, memo, line, column, bias) {
		        let index = memoizedBinarySearch(segments, column, memo, line);
		        if (found) {
		            index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
		        }
		        else if (bias === LEAST_UPPER_BOUND)
		            index++;
		        if (index === -1 || index === segments.length)
		            return -1;
		        return index;
		    }
		    function sliceGeneratedPositions(segments, memo, line, column, bias) {
		        let min = traceSegmentInternal(segments, memo, line, column, GREATEST_LOWER_BOUND);
		        // We ignored the bias when tracing the segment so that we're guarnateed to find the first (in
		        // insertion order) segment that matched. Even if we did respect the bias when tracing, we would
		        // still need to call `lowerBound()` to find the first segment, which is slower than just looking
		        // for the GREATEST_LOWER_BOUND to begin with. The only difference that matters for us is when the
		        // binary search didn't match, in which case GREATEST_LOWER_BOUND just needs to increment to
		        // match LEAST_UPPER_BOUND.
		        if (!found && bias === LEAST_UPPER_BOUND)
		            min++;
		        if (min === -1 || min === segments.length)
		            return [];
		        // We may have found the segment that started at an earlier column. If this is the case, then we
		        // need to slice all generated segments that match _that_ column, because all such segments span
		        // to our desired column.
		        const matchedColumn = found ? column : segments[min][COLUMN];
		        // The binary search is not guaranteed to find the lower bound when a match wasn't found.
		        if (!found)
		            min = lowerBound(segments, matchedColumn, min);
		        const max = upperBound(segments, matchedColumn, min);
		        const result = [];
		        for (; min <= max; min++) {
		            const segment = segments[min];
		            result.push(GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]));
		        }
		        return result;
		    }
		    function generatedPosition(map, source, line, column, bias, all) {
		        var _a;
		        line--;
		        if (line < 0)
		            throw new Error(LINE_GTR_ZERO);
		        if (column < 0)
		            throw new Error(COL_GTR_EQ_ZERO);
		        const { sources, resolvedSources } = map;
		        let sourceIndex = sources.indexOf(source);
		        if (sourceIndex === -1)
		            sourceIndex = resolvedSources.indexOf(source);
		        if (sourceIndex === -1)
		            return all ? [] : GMapping(null, null);
		        const generated = ((_a = cast(map))._bySources || (_a._bySources = buildBySources(decodedMappings(map), (cast(map)._bySourceMemos = sources.map(memoizedState)))));
		        const segments = generated[sourceIndex][line];
		        if (segments == null)
		            return all ? [] : GMapping(null, null);
		        const memo = cast(map)._bySourceMemos[sourceIndex];
		        if (all)
		            return sliceGeneratedPositions(segments, memo, line, column, bias);
		        const index = traceSegmentInternal(segments, memo, line, column, bias);
		        if (index === -1)
		            return GMapping(null, null);
		        const segment = segments[index];
		        return GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]);
		    }

		    exports.AnyMap = AnyMap;
		    exports.GREATEST_LOWER_BOUND = GREATEST_LOWER_BOUND;
		    exports.LEAST_UPPER_BOUND = LEAST_UPPER_BOUND;
		    exports.TraceMap = TraceMap;
		    exports.allGeneratedPositionsFor = allGeneratedPositionsFor;
		    exports.decodedMap = decodedMap;
		    exports.decodedMappings = decodedMappings;
		    exports.eachMapping = eachMapping;
		    exports.encodedMap = encodedMap;
		    exports.encodedMappings = encodedMappings;
		    exports.generatedPositionFor = generatedPositionFor;
		    exports.isIgnored = isIgnored;
		    exports.originalPositionFor = originalPositionFor;
		    exports.presortedDecodedMap = presortedDecodedMap;
		    exports.sourceContentFor = sourceContentFor;
		    exports.traceSegment = traceSegment;

		}));
		
	} (traceMapping_umd$1, traceMapping_umd$1.exports));
	return traceMapping_umd$1.exports;
}

var source;
var hasRequiredSource;

function requireSource () {
	if (hasRequiredSource) return source;
	hasRequiredSource = 1;
	// Patch applied: https://github.com/istanbuljs/v8-to-istanbul/pull/244
	const CovLine = requireLine();
	const { sliceRange } = requireRange();
	const { originalPositionFor, generatedPositionFor, eachMapping, GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND } = requireTraceMapping_umd();

	source = class CovSource {
	  constructor (sourceRaw, wrapperLength, traceMap) {
	    sourceRaw = sourceRaw ? sourceRaw.trimEnd() : '';
	    this.lines = [];
	    this.eof = sourceRaw.length;
	    this.shebangLength = getShebangLength(sourceRaw);
	    this.wrapperLength = wrapperLength - this.shebangLength;
	    this._buildLines(sourceRaw, traceMap);
	  }

	  _buildLines (source, traceMap) {
	    let position = 0;
	    let ignoreCount = 0;
	    let ignoreAll = false;
	    const linesToCover = traceMap && this._parseLinesToCover(traceMap);

	    for (const [i, lineStr] of source.split(/(?<=\r?\n)/u).entries()) {
	      const lineNumber = i + 1;
	      const line = new CovLine(lineNumber, position, lineStr);

	      if (linesToCover && !linesToCover.has(lineNumber)) {
	        line.ignore = true;
	      }

	      if (ignoreCount > 0) {
	        line.ignore = true;
	        ignoreCount--;
	      } else if (ignoreAll) {
	        line.ignore = true;
	      }
	      this.lines.push(line);
	      position += lineStr.length;

	      const ignoreToken = this._parseIgnore(lineStr);
	      if (!ignoreToken) continue

	      line.ignore = true;
	      if (ignoreToken.count !== undefined) {
	        ignoreCount = ignoreToken.count;
	      }
	      if (ignoreToken.start || ignoreToken.stop) {
	        ignoreAll = ignoreToken.start;
	        ignoreCount = 0;
	      }
	    }
	  }

	  /**
	   * Parses for comments:
	   *    c8 ignore next
	   *    c8 ignore next 3
	   *    c8 ignore start
	   *    c8 ignore stop
	   * And equivalent ones for v8, e.g. v8 ignore next.
	   * @param {string} lineStr
	   * @return {{count?: number, start?: boolean, stop?: boolean}|undefined}
	   */
	  _parseIgnore (lineStr) {
	    const testIgnoreNextLines = lineStr.match(/^\W*\/\* (?:[cv]8|node:coverage) ignore next (?<count>[0-9]+)/);
	    if (testIgnoreNextLines) {
	      return { count: Number(testIgnoreNextLines.groups.count) }
	    }

	    // Check if comment is on its own line.
	    if (lineStr.match(/^\W*\/\* (?:[cv]8|node:coverage) ignore next/)) {
	      return { count: 1 }
	    }

	    if (lineStr.match(/\/\* ([cv]8|node:coverage) ignore next/)) {
	      // Won't ignore successive lines, but the current line will be ignored.
	      return { count: 0 }
	    }

	    const testIgnoreStartStop = lineStr.match(/\/\* [c|v]8 ignore (?<mode>start|stop)/);
	    if (testIgnoreStartStop) {
	      if (testIgnoreStartStop.groups.mode === 'start') return { start: true }
	      if (testIgnoreStartStop.groups.mode === 'stop') return { stop: true }
	    }

	    const testNodeIgnoreStartStop = lineStr.match(/\/\* node:coverage (?<mode>enable|disable)/);
	    if (testNodeIgnoreStartStop) {
	      if (testNodeIgnoreStartStop.groups.mode === 'disable') return { start: true }
	      if (testNodeIgnoreStartStop.groups.mode === 'enable') return { stop: true }
	    }
	  }

	  // given a start column and end column in absolute offsets within
	  // a source file (0 - EOF), returns the relative line column positions.
	  offsetToOriginalRelative (sourceMap, startCol, endCol) {
	    const lines = sliceRange(this.lines, startCol, endCol, true);
	    if (!lines.length) return {}

	    const start = originalPositionTryBoth(
	      sourceMap,
	      lines[0].line,
	      Math.max(0, startCol - lines[0].startCol)
	    );
	    if (!(start && start.source)) {
	      return {}
	    }

	    let end = originalEndPositionFor(
	      sourceMap,
	      lines[lines.length - 1].line,
	      endCol - lines[lines.length - 1].startCol
	    );
	    if (!(end && end.source)) {
	      return {}
	    }

	    if (start.source !== end.source) {
	      return {}
	    }

	    if (start.line === end.line && start.column === end.column) {
	      end = originalPositionFor(sourceMap, {
	        line: lines[lines.length - 1].line,
	        column: endCol - lines[lines.length - 1].startCol,
	        bias: LEAST_UPPER_BOUND
	      });
	      end.column -= 1;
	    }

	    return {
	      source: start.source,
	      startLine: start.line,
	      relStartCol: start.column,
	      endLine: end.line,
	      relEndCol: end.column
	    }
	  }

	  relativeToOffset (line, relCol) {
	    line = Math.max(line, 1);
	    if (this.lines[line - 1] === undefined) return this.eof
	    return Math.min(this.lines[line - 1].startCol + relCol, this.lines[line - 1].endCol)
	  }

	  _parseLinesToCover (traceMap) {
	    const linesToCover = new Set();

	    eachMapping(traceMap, (mapping) => {
	      if (mapping.originalLine !== null) {
	        linesToCover.add(mapping.originalLine);
	      }
	    });

	    return linesToCover
	  }
	};

	// this implementation is pulled over from istanbul-lib-sourcemap:
	// https://github.com/istanbuljs/istanbuljs/blob/master/packages/istanbul-lib-source-maps/lib/get-mapping.js
	//
	/**
	 * AST ranges are inclusive for start positions and exclusive for end positions.
	 * Source maps are also logically ranges over text, though interacting with
	 * them is generally achieved by working with explicit positions.
	 *
	 * When finding the _end_ location of an AST item, the range behavior is
	 * important because what we're asking for is the _end_ of whatever range
	 * corresponds to the end location we seek.
	 *
	 * This boils down to the following steps, conceptually, though the source-map
	 * library doesn't expose primitives to do this nicely:
	 *
	 * 1. Find the range on the generated file that ends at, or exclusively
	 *    contains the end position of the AST node.
	 * 2. Find the range on the original file that corresponds to
	 *    that generated range.
	 * 3. Find the _end_ location of that original range.
	 */
	function originalEndPositionFor (sourceMap, line, column) {
	  // Given the generated location, find the original location of the mapping
	  // that corresponds to a range on the generated file that overlaps the
	  // generated file end location. Note however that this position on its
	  // own is not useful because it is the position of the _start_ of the range
	  // on the original file, and we want the _end_ of the range.
	  const beforeEndMapping = originalPositionTryBoth(
	    sourceMap,
	    line,
	    Math.max(column - 1, 1)
	  );

	  if (beforeEndMapping.source === null) {
	    return null
	  }

	  // Convert that original position back to a generated one, with a bump
	  // to the right, and a rightward bias. Since 'generatedPositionFor' searches
	  // for mappings in the original-order sorted list, this will find the
	  // mapping that corresponds to the one immediately after the
	  // beforeEndMapping mapping.
	  const afterEndMapping = generatedPositionFor(sourceMap, {
	    source: beforeEndMapping.source,
	    line: beforeEndMapping.line,
	    column: beforeEndMapping.column + 1,
	    bias: LEAST_UPPER_BOUND
	  });
	  if (
	  // If this is null, it means that we've hit the end of the file,
	  // so we can use Infinity as the end column.
	    afterEndMapping.line === null ||
	      // If these don't match, it means that the call to
	      // 'generatedPositionFor' didn't find any other original mappings on
	      // the line we gave, so consider the binding to extend to infinity.
	      originalPositionFor(sourceMap, afterEndMapping).line !==
	          beforeEndMapping.line
	  ) {
	    return {
	      source: beforeEndMapping.source,
	      line: beforeEndMapping.line,
	      column: Infinity
	    }
	  }

	  // Convert the end mapping into the real original position.
	  return originalPositionFor(sourceMap, afterEndMapping)
	}

	function originalPositionTryBoth (sourceMap, line, column) {
	  let original = originalPositionFor(sourceMap, {
	    line,
	    column,
	    bias: GREATEST_LOWER_BOUND
	  });
	  if (original.line === null) {
	    original = originalPositionFor(sourceMap, {
	      line,
	      column,
	      bias: LEAST_UPPER_BOUND
	    });
	  }
	  // The source maps generated by https://github.com/istanbuljs/istanbuljs
	  // (using @babel/core 7.7.5) have behavior, such that a mapping
	  // mid-way through a line maps to an earlier line than a mapping
	  // at position 0. Using the line at positon 0 seems to provide better reports:
	  //
	  //     if (true) {
	  //        cov_y5divc6zu().b[1][0]++;
	  //        cov_y5divc6zu().s[3]++;
	  //        console.info('reachable');
	  //     }  else { ... }
	  //  ^  ^
	  // l5  l3
	  const min = originalPositionFor(sourceMap, {
	    line,
	    column: 0,
	    bias: GREATEST_LOWER_BOUND
	  });
	  if (min.line > original.line) {
	    original = min;
	  }
	  return original
	}

	// Not required since Node 12, see: https://github.com/nodejs/node/pull/27375
	const isPreNode12 = /^v1[0-1]\./u.test(process.version);
	function getShebangLength (source) {
	  /* c8 ignore start - platform-specific */
	  if (isPreNode12 && source.indexOf('#!') === 0) {
	    const match = source.match(/(?<shebang>#!.*)/);
	    if (match) {
	      return match.groups.shebang.length
	    }
	  } else {
	  /* c8 ignore stop - platform-specific */
	    return 0
	  }
	}
	return source;
}

var v8ToIstanbul$2;
var hasRequiredV8ToIstanbul$1;

function requireV8ToIstanbul$1 () {
	if (hasRequiredV8ToIstanbul$1) return v8ToIstanbul$2;
	hasRequiredV8ToIstanbul$1 = 1;
	// Patch applied: https://github.com/istanbuljs/v8-to-istanbul/pull/244
	const assert = require$$0;
	const convertSourceMap = requireConvertSourceMap();
	const util = require$$2;
	const debuglog = util.debuglog('c8');
	const { dirname, isAbsolute, join, resolve } = require$$3;
	const { fileURLToPath } = require$$4;
	const CovBranch = requireBranch();
	const CovFunction = require_function();
	const CovSource = requireSource();
	const { sliceRange } = requireRange();
	const { readFileSync, promises } = require$$9;
	const readFile = promises.readFile;

	const { TraceMap } = requireTraceMapping_umd();
	const isOlderNode10 = /^v10\.(([0-9]\.)|(1[0-5]\.))/u.test(process.version);
	const isNode8 = /^v8\./.test(process.version);

	// Injected when Node.js is loading script into isolate pre Node 10.16.x.
	// see: https://github.com/nodejs/node/pull/21573.
	const cjsWrapperLength = isOlderNode10 ? require$$11.wrapper[0].length : 0;

	v8ToIstanbul$2 = class V8ToIstanbul {
	  constructor (scriptPath, wrapperLength, sources, excludePath, excludeEmptyLines) {
	    assert(typeof scriptPath === 'string', 'scriptPath must be a string');
	    assert(!isNode8, 'This module does not support node 8 or lower, please upgrade to node 10');
	    this.path = parsePath(scriptPath);
	    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength;
	    this.excludePath = excludePath || (() => false);
	    this.excludeEmptyLines = excludeEmptyLines === true;
	    this.sources = sources || {};
	    this.generatedLines = [];
	    this.branches = {};
	    this.functions = {};
	    this.covSources = [];
	    this.rawSourceMap = undefined;
	    this.sourceMap = undefined;
	    this.sourceTranspiled = undefined;
	    // Indicate that this report was generated with placeholder data from
	    // running --all:
	    this.all = false;
	  }

	  async load () {
	    const rawSource = this.sources.source || await readFile(this.path, 'utf8');
	    this.rawSourceMap = this.sources.sourceMap ||
	      // if we find a source-map (either inline, or a .map file) we load
	      // both the transpiled and original source, both of which are used during
	      // the backflips we perform to remap absolute to relative positions.
	      convertSourceMap.fromSource(rawSource) || convertSourceMap.fromMapFileSource(rawSource, this._readFileFromDir.bind(this));

	    if (this.rawSourceMap) {
	      if (this.rawSourceMap.sourcemap.sources.length > 1) {
	        this.sourceMap = new TraceMap(this.rawSourceMap.sourcemap);
	        if (!this.sourceMap.sourcesContent) {
	          this.sourceMap.sourcesContent = await this.sourcesContentFromSources();
	        }
	        this.covSources = this.sourceMap.sourcesContent.map((rawSource, i) => ({ source: new CovSource(rawSource, this.wrapperLength, this.excludeEmptyLines ? this.sourceMap : null), path: this.sourceMap.sources[i] }));
	        this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength, this.excludeEmptyLines ? this.sourceMap : null);
	      } else {
	        const candidatePath = this.rawSourceMap.sourcemap.sources.length >= 1 ? this.rawSourceMap.sourcemap.sources[0] : this.rawSourceMap.sourcemap.file;
	        this.path = this._resolveSource(this.rawSourceMap, candidatePath || this.path);
	        this.sourceMap = new TraceMap(this.rawSourceMap.sourcemap);

	        let originalRawSource;
	        if (this.sources.sourceMap && this.sources.sourceMap.sourcemap && this.sources.sourceMap.sourcemap.sourcesContent && this.sources.sourceMap.sourcemap.sourcesContent.length === 1) {
	          // If the sourcesContent field has been provided, return it rather than attempting
	          // to load the original source from disk.
	          // TODO: investigate whether there's ever a case where we hit this logic with 1:many sources.
	          originalRawSource = this.sources.sourceMap.sourcemap.sourcesContent[0];
	        } else if (this.sources.originalSource) {
	          // Original source may be populated on the sources object.
	          originalRawSource = this.sources.originalSource;
	        } else if (this.sourceMap.sourcesContent && this.sourceMap.sourcesContent[0]) {
	          // perhaps we loaded sourcesContent was populated by an inline source map, or .map file?
	          // TODO: investigate whether there's ever a case where we hit this logic with 1:many sources.
	          originalRawSource = this.sourceMap.sourcesContent[0];
	        } else {
	          // We fallback to reading the original source from disk.
	          originalRawSource = await readFile(this.path, 'utf8');
	        }
	        this.covSources = [{ source: new CovSource(originalRawSource, this.wrapperLength, this.excludeEmptyLines ? this.sourceMap : null), path: this.path }];
	        this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength, this.excludeEmptyLines ? this.sourceMap : null);
	      }
	    } else {
	      this.covSources = [{ source: new CovSource(rawSource, this.wrapperLength), path: this.path }];
	    }
	  }

	  _readFileFromDir (filename) {
	    return readFileSync(resolve(dirname(this.path), filename), 'utf-8')
	  }

	  async sourcesContentFromSources () {
	    const fileList = this.sourceMap.sources.map(relativePath => {
	      const realPath = this._resolveSource(this.rawSourceMap, relativePath);
	      return readFile(realPath, 'utf-8')
	        .then(result => result)
	        .catch(err => {
	          debuglog(`failed to load ${realPath}: ${err.message}`);
	        })
	    });
	    return await Promise.all(fileList)
	  }

	  destroy () {
	    // no longer necessary, but preserved for backwards compatibility.
	  }

	  _resolveSource (rawSourceMap, sourcePath) {
	    if (sourcePath.startsWith('file://')) {
	      return fileURLToPath(sourcePath)
	    }
	    sourcePath = sourcePath.replace(/^webpack:\/\//, '');
	    const sourceRoot = rawSourceMap.sourcemap.sourceRoot ? rawSourceMap.sourcemap.sourceRoot.replace('file://', '') : '';
	    const candidatePath = join(sourceRoot, sourcePath);

	    if (isAbsolute(candidatePath)) {
	      return candidatePath
	    } else {
	      return resolve(dirname(this.path), candidatePath)
	    }
	  }

	  applyCoverage (blocks) {
	    blocks.forEach(block => {
	      block.ranges.forEach((range, i) => {
	        const isEmptyCoverage = block.functionName === '(empty-report)';
	        const { startCol, endCol, path, covSource } = this._maybeRemapStartColEndCol(range, isEmptyCoverage);
	        if (this.excludePath(path)) {
	          return
	        }
	        let lines;
	        if (isEmptyCoverage) {
	          // (empty-report), this will result in a report that has all lines zeroed out.
	          lines = covSource.lines.filter((line) => {
	            line.count = 0;
	            return true
	          });
	          this.all = lines.length > 0;
	        } else {
	          lines = sliceRange(covSource.lines, startCol, endCol);
	        }
	        if (!lines.length) {
	          return
	        }

	        const startLineInstance = lines[0];
	        const endLineInstance = lines[lines.length - 1];

	        if (block.isBlockCoverage) {
	          this.branches[path] = this.branches[path] || [];
	          // record branches.
	          this.branches[path].push(new CovBranch(
	            startLineInstance.line,
	            startCol - startLineInstance.startCol,
	            endLineInstance.line,
	            endCol - endLineInstance.startCol,
	            range.count
	          ));

	          // if block-level granularity is enabled, we still create a single
	          // CovFunction tracking object for each set of ranges.
	          if (block.functionName && i === 0) {
	            this.functions[path] = this.functions[path] || [];
	            this.functions[path].push(new CovFunction(
	              block.functionName,
	              startLineInstance.line,
	              startCol - startLineInstance.startCol,
	              endLineInstance.line,
	              endCol - endLineInstance.startCol,
	              range.count
	            ));
	          }
	        } else if (block.functionName) {
	          this.functions[path] = this.functions[path] || [];
	          // record functions.
	          this.functions[path].push(new CovFunction(
	            block.functionName,
	            startLineInstance.line,
	            startCol - startLineInstance.startCol,
	            endLineInstance.line,
	            endCol - endLineInstance.startCol,
	            range.count
	          ));
	        }

	        // record the lines (we record these as statements, such that we're
	        // compatible with Istanbul 2.0).
	        lines.forEach(line => {
	          // make sure branch spans entire line; don't record 'goodbye'
	          // branch in `const foo = true ? 'hello' : 'goodbye'` as a
	          // 0 for line coverage.
	          //
	          // All lines start out with coverage of 1, and are later set to 0
	          // if they are not invoked; line.ignore prevents a line from being
	          // set to 0, and is set if the special comment /* c8 ignore next */
	          // is used.

	          if (startCol <= line.startCol && endCol >= line.endCol && !line.ignore) {
	            line.count = range.count;
	          }
	        });
	      });
	    });
	  }

	  _maybeRemapStartColEndCol (range, isEmptyCoverage) {
	    let covSource = this.covSources[0].source;
	    const covSourceWrapperLength = isEmptyCoverage ? 0 : covSource.wrapperLength;
	    let startCol = Math.max(0, range.startOffset - covSourceWrapperLength);
	    let endCol = Math.min(covSource.eof, range.endOffset - covSourceWrapperLength);
	    let path = this.path;

	    if (this.sourceMap) {
	      const sourceTranspiledWrapperLength = isEmptyCoverage ? 0 : this.sourceTranspiled.wrapperLength;
	      startCol = Math.max(0, range.startOffset - sourceTranspiledWrapperLength);
	      endCol = Math.min(this.sourceTranspiled.eof, range.endOffset - sourceTranspiledWrapperLength);

	      const { startLine, relStartCol, endLine, relEndCol, source } = this.sourceTranspiled.offsetToOriginalRelative(
	        this.sourceMap,
	        startCol,
	        endCol
	      );

	      const matchingSource = this.covSources.find(covSource => covSource.path === source);
	      covSource = matchingSource ? matchingSource.source : this.covSources[0].source;
	      path = matchingSource ? matchingSource.path : this.covSources[0].path;

	      // next we convert these relative positions back to absolute positions
	      // in the original source (which is the format expected in the next step).
	      startCol = covSource.relativeToOffset(startLine, relStartCol);
	      endCol = covSource.relativeToOffset(endLine, relEndCol);
	    }

	    return {
	      path,
	      covSource,
	      startCol,
	      endCol
	    }
	  }

	  getInnerIstanbul (source, path) {
	    // We apply the "Resolving Sources" logic (as defined in
	    // sourcemaps.info/spec.html) as a final step for 1:many source maps.
	    // for 1:1 source maps, the resolve logic is applied while loading.
	    //
	    // TODO: could we move the resolving logic for 1:1 source maps to the final
	    // step as well? currently this breaks some tests in c8.
	    let resolvedPath = path;
	    if (this.rawSourceMap && this.rawSourceMap.sourcemap.sources.length > 1) {
	      resolvedPath = this._resolveSource(this.rawSourceMap, path);
	    }

	    if (this.excludePath(resolvedPath)) {
	      return
	    }

	    return {
	      [resolvedPath]: {
	        path: resolvedPath,
	        all: this.all,
	        ...this._statementsToIstanbul(source, path),
	        ...this._branchesToIstanbul(source, path),
	        ...this._functionsToIstanbul(source, path)
	      }
	    }
	  }

	  toIstanbul () {
	    return this.covSources.reduce((istanbulOuter, { source, path }) => Object.assign(istanbulOuter, this.getInnerIstanbul(source, path)), {})
	  }

	  _statementsToIstanbul (source, path) {
	    const statements = {
	      statementMap: {},
	      s: {}
	    };
	    source.lines.forEach((line, index) => {
	      if (!line.ignore) {
	        statements.statementMap[`${index}`] = line.toIstanbul();
	        statements.s[`${index}`] = line.count;
	      }
	    });
	    return statements
	  }

	  _branchesToIstanbul (source, path) {
	    const branches = {
	      branchMap: {},
	      b: {}
	    };
	    this.branches[path] = this.branches[path] || [];
	    this.branches[path].forEach((branch, index) => {
	      const srcLine = source.lines[branch.startLine - 1];
	      const ignore = srcLine === undefined ? true : srcLine.ignore;
	      branches.branchMap[`${index}`] = branch.toIstanbul();
	      branches.b[`${index}`] = [ignore ? 1 : branch.count];
	    });
	    return branches
	  }

	  _functionsToIstanbul (source, path) {
	    const functions = {
	      fnMap: {},
	      f: {}
	    };
	    this.functions[path] = this.functions[path] || [];
	    this.functions[path].forEach((fn, index) => {
	      const srcLine = source.lines[fn.startLine - 1];
	      const ignore = srcLine === undefined ? true : srcLine.ignore;
	      functions.fnMap[`${index}`] = fn.toIstanbul();
	      functions.f[`${index}`] = ignore ? 1 : fn.count;
	    });
	    return functions
	  }
	};

	function parsePath (scriptPath) {
	  return scriptPath.startsWith('file://') ? fileURLToPath(scriptPath) : scriptPath
	}
	return v8ToIstanbul$2;
}

var v8ToIstanbul$1;
var hasRequiredV8ToIstanbul;

function requireV8ToIstanbul () {
	if (hasRequiredV8ToIstanbul) return v8ToIstanbul$1;
	hasRequiredV8ToIstanbul = 1;
	// Patch applied: https://github.com/istanbuljs/v8-to-istanbul/pull/244
	const V8ToIstanbul = requireV8ToIstanbul$1();

	v8ToIstanbul$1 = function (path, wrapperLength, sources, excludePath, excludeEmptyLines) {
	  return new V8ToIstanbul(path, wrapperLength, sources, excludePath, excludeEmptyLines)
	};
	return v8ToIstanbul$1;
}

var v8ToIstanbulExports = requireV8ToIstanbul();
var v8ToIstanbul = /*@__PURE__*/getDefaultExportFromCjs(v8ToIstanbulExports);

const isWindows = process.platform === "win32";
const drive = isWindows ? process.cwd()[0] : null;
drive ? drive === drive.toUpperCase() ? drive.toLowerCase() : drive.toUpperCase() : null;
const postfixRE = /[?#].*$/;
function cleanUrl(url) {
	return url.replace(postfixRE, "");
}
new Set([
	...builtinModules,
	"assert/strict",
	"diagnostics_channel",
	"dns/promises",
	"fs/promises",
	"path/posix",
	"path/win32",
	"readline/promises",
	"stream/consumers",
	"stream/promises",
	"stream/web",
	"timers/promises",
	"util/types",
	"wasi"
]);

var version = "3.2.4";

// Note that this needs to match the line ending as well
const VITE_EXPORTS_LINE_PATTERN = /Object\.defineProperty\(__vite_ssr_exports__.*\n/g;
const DECORATOR_METADATA_PATTERN = /_ts_metadata\("design:paramtypes", \[[^\]]*\]\),*/g;
const FILE_PROTOCOL = "file://";
const debug = createDebug("vitest:coverage");
class V8CoverageProvider extends BaseCoverageProvider {
	name = "v8";
	version = version;
	testExclude;
	initialize(ctx) {
		this._initialize(ctx);
		this.testExclude = new TestExclude({
			cwd: ctx.config.root,
			include: this.options.include,
			exclude: this.options.exclude,
			excludeNodeModules: true,
			extension: this.options.extension,
			relativePath: !this.options.allowExternal
		});
	}
	createCoverageMap() {
		return libCoverage.createCoverageMap({});
	}
	async generateCoverage({ allTestsRun }) {
		const start = debug.enabled ? performance.now() : 0;
		const coverageMap = this.createCoverageMap();
		let merged = { result: [] };
		await this.readCoverageFiles({
			onFileRead(coverage) {
				merged = mergeProcessCovs([merged, coverage]);
				// mergeProcessCovs sometimes loses startOffset, e.g. in vue
				merged.result.forEach((result) => {
					if (!result.startOffset) {
						const original = coverage.result.find((r) => r.url === result.url);
						result.startOffset = original?.startOffset || 0;
					}
				});
			},
			onFinished: async (project, transformMode) => {
				const converted = await this.convertCoverage(merged, project, transformMode);
				// Source maps can change based on projectName and transform mode.
				// Coverage transform re-uses source maps so we need to separate transforms from each other.
				const transformedCoverage = await transformCoverage(converted);
				coverageMap.merge(transformedCoverage);
				merged = { result: [] };
			},
			onDebug: debug
		});
		// Include untested files when all tests were run (not a single file re-run)
		// or if previous results are preserved by "cleanOnRerun: false"
		if (this.options.all && (allTestsRun || !this.options.cleanOnRerun)) {
			const coveredFiles = coverageMap.files();
			const untestedCoverage = await this.getUntestedFiles(coveredFiles);
			coverageMap.merge(await transformCoverage(untestedCoverage));
		}
		if (this.options.excludeAfterRemap) {
			coverageMap.filter((filename) => this.testExclude.shouldInstrument(filename));
		}
		if (debug.enabled) {
			debug(`Generate coverage total time ${(performance.now() - start).toFixed()} ms`);
		}
		return coverageMap;
	}
	async generateReports(coverageMap, allTestsRun) {
		if (provider === "stackblitz") {
			this.ctx.logger.log(c.blue(" % ") + c.yellow("@vitest/coverage-v8 does not work on Stackblitz. Report will be empty."));
		}
		const context = libReport.createContext({
			dir: this.options.reportsDirectory,
			coverageMap,
			watermarks: this.options.watermarks
		});
		if (this.hasTerminalReporter(this.options.reporter)) {
			this.ctx.logger.log(c.blue(" % ") + c.dim("Coverage report from ") + c.yellow(this.name));
		}
		for (const reporter of this.options.reporter) {
			// Type assertion required for custom reporters
			reports.create(reporter[0], {
				skipFull: this.options.skipFull,
				projectRoot: this.ctx.config.root,
				...reporter[1]
			}).execute(context);
		}
		if (this.options.thresholds) {
			await this.reportThresholds(coverageMap, allTestsRun);
		}
	}
	async parseConfigModule(configFilePath) {
		return parseModule(await promises.readFile(configFilePath, "utf8"));
	}
	async getUntestedFiles(testedFiles) {
		const transformResults = normalizeTransformResults(this.ctx.vitenode.fetchCache);
		const transform = this.createUncoveredFileTransformer(this.ctx);
		const allFiles = await this.testExclude.glob(this.ctx.config.root);
		let includedFiles = allFiles.map((file) => resolve(this.ctx.config.root, file));
		if (this.ctx.config.changed) {
			includedFiles = (this.ctx.config.related || []).filter((file) => includedFiles.includes(file));
		}
		const uncoveredFiles = includedFiles.map((file) => pathToFileURL(file)).filter((file) => !testedFiles.includes(file.pathname));
		let index = 0;
		const coverageMap = this.createCoverageMap();
		for (const chunk of this.toSlices(uncoveredFiles, this.options.processingConcurrency)) {
			if (debug.enabled) {
				index += chunk.length;
				debug("Uncovered files %d/%d", index, uncoveredFiles.length);
			}
			await Promise.all(chunk.map(async (filename) => {
				let timeout;
				let start;
				if (debug.enabled) {
					start = performance.now();
					timeout = setTimeout(() => debug(c.bgRed(`File "${filename.pathname}" is taking longer than 3s`)), 3e3);
				}
				const sources = await this.getSources(filename.href, transformResults, transform);
				coverageMap.merge(await this.v8ToIstanbul(filename.href, 0, sources, [{
					ranges: [{
						startOffset: 0,
						endOffset: sources.originalSource.length,
						count: 0
					}],
					isBlockCoverage: true,
					functionName: "(empty-report)"
				}]));
				if (debug.enabled) {
					clearTimeout(timeout);
					const diff = performance.now() - start;
					const color = diff > 500 ? c.bgRed : c.bgGreen;
					debug(`${color(` ${diff.toFixed()} ms `)} ${filename.pathname}`);
				}
			}));
		}
		return coverageMap;
	}
	async v8ToIstanbul(filename, wrapperLength, sources, functions) {
		if (this.options.experimentalAstAwareRemapping) {
			let ast;
			try {
				ast = await parseAstAsync(sources.source);
			} catch (error) {
				this.ctx.logger.error(`Failed to parse ${filename}. Excluding it from coverage.\n`, error);
				return {};
			}
			return await astV8ToIstanbul({
				code: sources.source,
				sourceMap: sources.sourceMap?.sourcemap,
				ast,
				coverage: {
					functions,
					url: filename
				},
				ignoreClassMethods: this.options.ignoreClassMethods,
				wrapperLength,
				ignoreNode: (node, type) => {
					// SSR transformed imports
					if (type === "statement" && node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.id.name.startsWith("__vite_ssr_import_")) {
						return true;
					}
					// SSR transformed exports vite@>6.3.5
					if (type === "statement" && node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && node.expression.left.type === "MemberExpression" && node.expression.left.object.type === "Identifier" && node.expression.left.object.name === "__vite_ssr_exports__") {
						return true;
					}
					// SSR transformed exports vite@^6.3.5
					if (type === "statement" && node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.id.name === "__vite_ssr_export_default__") {
						return true;
					}
					// in-source test with "if (import.meta.vitest)"
					if ((type === "branch" || type === "statement") && node.type === "IfStatement" && node.test.type === "MemberExpression" && node.test.property.type === "Identifier" && node.test.property.name === "vitest") {
						// SSR
						if (node.test.object.type === "Identifier" && node.test.object.name === "__vite_ssr_import_meta__") {
							return "ignore-this-and-nested-nodes";
						}
						// Web
						if (node.test.object.type === "MetaProperty" && node.test.object.meta.name === "import" && node.test.object.property.name === "meta") {
							return "ignore-this-and-nested-nodes";
						}
					}
					// Browser mode's "import.meta.env ="
					if (type === "statement" && node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && node.expression.left.type === "MemberExpression" && node.expression.left.object.type === "MetaProperty" && node.expression.left.object.meta.name === "import" && node.expression.left.object.property.name === "meta" && node.expression.left.property.type === "Identifier" && node.expression.left.property.name === "env") {
						return true;
					}
				}
			});
		}
		const converter = v8ToIstanbul(filename, wrapperLength, sources, undefined, this.options.ignoreEmptyLines);
		await converter.load();
		try {
			converter.applyCoverage(functions);
		} catch (error) {
			this.ctx.logger.error(`Failed to convert coverage for ${filename}.\n`, error);
		}
		return converter.toIstanbul();
	}
	async getSources(url, transformResults, onTransform, functions = []) {
		const filePath = normalize(fileURLToPath(url));
		let transformResult = transformResults.get(filePath);
		if (!transformResult) {
			transformResult = await onTransform(removeStartsWith(url, FILE_PROTOCOL)).catch(() => undefined);
		}
		const map = transformResult?.map;
		const code = transformResult?.code;
		const sourcesContent = map?.sourcesContent || [];
		if (!sourcesContent[0]) {
			sourcesContent[0] = await promises.readFile(filePath, "utf-8").catch(() => {
				// If file does not exist construct a dummy source for it.
				// These can be files that were generated dynamically during the test run and were removed after it.
				const length = findLongestFunctionLength(functions);
				return "/".repeat(length);
			});
		}
		// These can be uncovered files included by "all: true" or files that are loaded outside vite-node
		if (!map) {
			return {
				source: code || sourcesContent[0],
				originalSource: sourcesContent[0]
			};
		}
		const sources = (map.sources || []).filter((source) => source != null).map((source) => new URL(source, url).href);
		if (sources.length === 0) {
			sources.push(url);
		}
		return {
			originalSource: sourcesContent[0],
			source: code || sourcesContent[0],
			sourceMap: { sourcemap: excludeGeneratedCode(code, {
				...map,
				version: 3,
				sources,
				sourcesContent
			}) }
		};
	}
	async convertCoverage(coverage, project = this.ctx.getRootProject(), transformMode) {
		let fetchCache = project.vitenode.fetchCache;
		if (transformMode) {
			fetchCache = transformMode === "browser" ? new Map() : project.vitenode.fetchCaches[transformMode];
		}
		const transformResults = normalizeTransformResults(fetchCache);
		async function onTransform(filepath) {
			if (transformMode === "browser" && project.browser) {
				const result = await project.browser.vite.transformRequest(removeStartsWith(filepath, project.config.root));
				if (result) {
					return {
						...result,
						code: `${result.code}// <inline-source-map>`
					};
				}
			}
			return project.vitenode.transformRequest(filepath);
		}
		const scriptCoverages = [];
		for (const result of coverage.result) {
			if (transformMode === "browser") {
				if (result.url.startsWith("/@fs")) {
					result.url = `${FILE_PROTOCOL}${removeStartsWith(result.url, "/@fs")}`;
				} else if (result.url.startsWith(project.config.root)) {
					result.url = `${FILE_PROTOCOL}${result.url}`;
				} else {
					result.url = `${FILE_PROTOCOL}${project.config.root}${result.url}`;
				}
			}
			if (this.testExclude.shouldInstrument(fileURLToPath(result.url))) {
				scriptCoverages.push(result);
			}
		}
		const coverageMap = this.createCoverageMap();
		let index = 0;
		for (const chunk of this.toSlices(scriptCoverages, this.options.processingConcurrency)) {
			if (debug.enabled) {
				index += chunk.length;
				debug("Converting %d/%d", index, scriptCoverages.length);
			}
			await Promise.all(chunk.map(async ({ url, functions, startOffset }) => {
				let timeout;
				let start;
				if (debug.enabled) {
					start = performance.now();
					timeout = setTimeout(() => debug(c.bgRed(`File "${fileURLToPath(url)}" is taking longer than 3s`)), 3e3);
				}
				const sources = await this.getSources(url, transformResults, onTransform, functions);
				coverageMap.merge(await this.v8ToIstanbul(url, startOffset, sources, functions));
				if (debug.enabled) {
					clearTimeout(timeout);
					const diff = performance.now() - start;
					const color = diff > 500 ? c.bgRed : c.bgGreen;
					debug(`${color(` ${diff.toFixed()} ms `)} ${fileURLToPath(url)}`);
				}
			}));
		}
		return coverageMap;
	}
}
async function transformCoverage(coverageMap) {
	const sourceMapStore = libSourceMaps.createSourceMapStore();
	return await sourceMapStore.transformCoverage(coverageMap);
}
/**
* Remove generated code from the source maps:
* - Vite's export helpers: e.g. `Object.defineProperty(__vite_ssr_exports__, "sum", { enumerable: true, configurable: true, get(){ return sum }});`
* - SWC's decorator metadata: e.g. `_ts_metadata("design:paramtypes", [\ntypeof Request === "undefined" ? Object : Request\n]),`
*/
function excludeGeneratedCode(source, map) {
	if (!source) {
		return map;
	}
	if (!source.match(VITE_EXPORTS_LINE_PATTERN) && !source.match(DECORATOR_METADATA_PATTERN)) {
		return map;
	}
	const trimmed = new MagicString(source);
	trimmed.replaceAll(VITE_EXPORTS_LINE_PATTERN, "\n");
	trimmed.replaceAll(DECORATOR_METADATA_PATTERN, (match) => "\n".repeat(match.split("\n").length - 1));
	const trimmedMap = trimmed.generateMap({ hires: "boundary" });
	// A merged source map where the first one excludes generated parts
	const combinedMap = remapping([{
		...trimmedMap,
		version: 3
	}, map], () => null);
	return combinedMap;
}
/**
* Find the function with highest `endOffset` to determine the length of the file
*/
function findLongestFunctionLength(functions) {
	return functions.reduce((previous, current) => {
		const maxEndOffset = current.ranges.reduce((endOffset, range) => Math.max(endOffset, range.endOffset), 0);
		return Math.max(previous, maxEndOffset);
	}, 0);
}
function normalizeTransformResults(fetchCache) {
	const normalized = new Map();
	for (const [key, value] of fetchCache.entries()) {
		const cleanEntry = cleanUrl(key);
		if (!normalized.has(cleanEntry)) {
			normalized.set(cleanEntry, value.result);
		}
	}
	return normalized;
}
function removeStartsWith(filepath, start) {
	if (filepath.startsWith(start)) {
		return filepath.slice(start.length);
	}
	return filepath;
}

export { V8CoverageProvider };
