import { resolve } from 'pathe';
import { plugins, format } from '@vitest/pretty-format';

// src/vlq.ts
var comma = ",".charCodeAt(0);
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInt = new Uint8Array(128);
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
function hasMoreVlq(reader, max) {
  if (reader.pos >= max) return false;
  return reader.peek() !== comma;
}
var StringReader = class {
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
};

// src/sourcemap-codec.ts
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
    const semi = reader.indexOf(";");
    const line = [];
    let sorted = true;
    let lastCol = 0;
    genColumn = 0;
    while (reader.pos < semi) {
      let seg;
      genColumn = decodeInteger(reader, genColumn);
      if (genColumn < lastCol) sorted = false;
      lastCol = genColumn;
      if (hasMoreVlq(reader, semi)) {
        sourcesIndex = decodeInteger(reader, sourcesIndex);
        sourceLine = decodeInteger(reader, sourceLine);
        sourceColumn = decodeInteger(reader, sourceColumn);
        if (hasMoreVlq(reader, semi)) {
          namesIndex = decodeInteger(reader, namesIndex);
          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex];
        } else {
          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
        }
      } else {
        seg = [genColumn];
      }
      line.push(seg);
      reader.pos++;
    }
    if (!sorted) sort(line);
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

// src/trace-mapping.ts

// src/sourcemap-segment.ts
var COLUMN = 0;
var SOURCES_INDEX = 1;
var SOURCE_LINE = 2;
var SOURCE_COLUMN = 3;
var NAMES_INDEX = 4;

// src/binary-search.ts
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
    if (haystack[i][COLUMN] !== needle) break;
  }
  return index;
}
function lowerBound(haystack, needle, index) {
  for (let i = index - 1; i >= 0; index = i--) {
    if (haystack[i][COLUMN] !== needle) break;
  }
  return index;
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

// src/trace-mapping.ts
var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
var LEAST_UPPER_BOUND = -1;
var GREATEST_LOWER_BOUND = 1;
function cast(map) {
  return map;
}
function decodedMappings(map) {
  var _a;
  return (_a = cast(map))._decoded || (_a._decoded = decode(cast(map)._encoded));
}
function originalPositionFor(map, needle) {
  let { line, column, bias } = needle;
  line--;
  if (line < 0) throw new Error(LINE_GTR_ZERO);
  if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
  const decoded = decodedMappings(map);
  if (line >= decoded.length) return OMapping(null, null, null, null);
  const segments = decoded[line];
  const index = traceSegmentInternal(
    segments,
    cast(map)._decodedMemo,
    line,
    column,
    bias || GREATEST_LOWER_BOUND
  );
  if (index === -1) return OMapping(null, null, null, null);
  const segment = segments[index];
  if (segment.length === 1) return OMapping(null, null, null, null);
  const { names, resolvedSources } = map;
  return OMapping(
    resolvedSources[segment[SOURCES_INDEX]],
    segment[SOURCE_LINE] + 1,
    segment[SOURCE_COLUMN],
    segment.length === 5 ? names[segment[NAMES_INDEX]] : null
  );
}
function OMapping(source, line, column, name) {
  return { source, line, column, name };
}
function traceSegmentInternal(segments, memo, line, column, bias) {
  let index = memoizedBinarySearch(segments, column, memo, line);
  if (found) {
    index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
  } else if (bias === LEAST_UPPER_BOUND) index++;
  if (index === -1 || index === segments.length) return -1;
  return index;
}

function notNullish(v) {
	return v != null;
}
function isPrimitive(value) {
	return value === null || typeof value !== "function" && typeof value !== "object";
}
function isObject(item) {
	return item != null && typeof item === "object" && !Array.isArray(item);
}
/**
* If code starts with a function call, will return its last index, respecting arguments.
* This will return 25 - last ending character of toMatch ")"
* Also works with callbacks
* ```
* toMatch({ test: '123' });
* toBeAliased('123')
* ```
*/
function getCallLastIndex(code) {
	let charIndex = -1;
	let inString = null;
	let startedBracers = 0;
	let endedBracers = 0;
	let beforeChar = null;
	while (charIndex <= code.length) {
		beforeChar = code[charIndex];
		charIndex++;
		const char = code[charIndex];
		const isCharString = char === "\"" || char === "'" || char === "`";
		if (isCharString && beforeChar !== "\\") {
			if (inString === char) {
				inString = null;
			} else if (!inString) {
				inString = char;
			}
		}
		if (!inString) {
			if (char === "(") {
				startedBracers++;
			}
			if (char === ")") {
				endedBracers++;
			}
		}
		if (startedBracers && endedBracers && startedBracers === endedBracers) {
			return charIndex;
		}
	}
	return null;
}

const CHROME_IE_STACK_REGEXP = /^\s*at .*(?:\S:\d+|\(native\))/m;
const SAFARI_NATIVE_CODE_REGEXP = /^(?:eval@)?(?:\[native code\])?$/;
const stackIgnorePatterns = [
	"node:internal",
	/\/packages\/\w+\/dist\//,
	/\/@vitest\/\w+\/dist\//,
	"/vitest/dist/",
	"/vitest/src/",
	"/node_modules/chai/",
	"/node_modules/tinyspy/",
	"/vite/dist/node/module-runner",
	"/rolldown-vite/dist/node/module-runner",
	"/deps/chunk-",
	"/deps/@vitest",
	"/deps/loupe",
	"/deps/chai",
	"/browser-playwright/dist/locators.js",
	"/browser-webdriverio/dist/locators.js",
	"/browser-preview/dist/locators.js",
	/node:\w+/,
	/__vitest_test__/,
	/__vitest_browser__/,
	/\/deps\/vitest_/
];
function extractLocation(urlLike) {
	// Fail-fast but return locations like "(native)"
	if (!urlLike.includes(":")) {
		return [urlLike];
	}
	const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
	const parts = regExp.exec(urlLike.replace(/^\(|\)$/g, ""));
	if (!parts) {
		return [urlLike];
	}
	let url = parts[1];
	if (url.startsWith("async ")) {
		url = url.slice(6);
	}
	if (url.startsWith("http:") || url.startsWith("https:")) {
		const urlObj = new URL(url);
		urlObj.searchParams.delete("import");
		urlObj.searchParams.delete("browserv");
		url = urlObj.pathname + urlObj.hash + urlObj.search;
	}
	if (url.startsWith("/@fs/")) {
		const isWindows = /^\/@fs\/[a-zA-Z]:\//.test(url);
		url = url.slice(isWindows ? 5 : 4);
	}
	return [
		url,
		parts[2] || undefined,
		parts[3] || undefined
	];
}
function parseSingleFFOrSafariStack(raw) {
	let line = raw.trim();
	if (SAFARI_NATIVE_CODE_REGEXP.test(line)) {
		return null;
	}
	if (line.includes(" > eval")) {
		line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
	}
	// Early return for lines that don't look like Firefox/Safari stack traces
	// Firefox/Safari stack traces must contain '@' and should have location info after it
	if (!line.includes("@")) {
		return null;
	}
	// Find the correct @ that separates function name from location
	// For cases like '@https://@fs/path' or 'functionName@https://@fs/path'
	// we need to find the first @ that precedes a valid location (containing :)
	let atIndex = -1;
	let locationPart = "";
	let functionName;
	// Try each @ from left to right to find the one that gives us a valid location
	for (let i = 0; i < line.length; i++) {
		if (line[i] === "@") {
			const candidateLocation = line.slice(i + 1);
			// Minimum length 3 for valid location: 1 for filename + 1 for colon + 1 for line number (e.g., "a:1")
			if (candidateLocation.includes(":") && candidateLocation.length >= 3) {
				atIndex = i;
				locationPart = candidateLocation;
				functionName = i > 0 ? line.slice(0, i) : undefined;
				break;
			}
		}
	}
	// Validate we found a valid location with minimum length (filename:line format)
	if (atIndex === -1 || !locationPart.includes(":") || locationPart.length < 3) {
		return null;
	}
	const [url, lineNumber, columnNumber] = extractLocation(locationPart);
	if (!url || !lineNumber || !columnNumber) {
		return null;
	}
	return {
		file: url,
		method: functionName || "",
		line: Number.parseInt(lineNumber),
		column: Number.parseInt(columnNumber)
	};
}
// Based on https://github.com/stacktracejs/error-stack-parser
// Credit to stacktracejs
function parseSingleV8Stack(raw) {
	let line = raw.trim();
	if (!CHROME_IE_STACK_REGEXP.test(line)) {
		return null;
	}
	if (line.includes("(eval ")) {
		line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
	}
	let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
	// capture and preserve the parenthesized location "(/foo/my bar.js:12:87)" in
	// case it has spaces in it, as the string is split on \s+ later on
	const location = sanitizedLine.match(/ (\(.+\)$)/);
	// remove the parenthesized location from the line, if it was matched
	sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
	// if a location was matched, pass it to extractLocation() otherwise pass all sanitizedLine
	// because this line doesn't have function name
	const [url, lineNumber, columnNumber] = extractLocation(location ? location[1] : sanitizedLine);
	let method = location && sanitizedLine || "";
	let file = url && ["eval", "<anonymous>"].includes(url) ? undefined : url;
	if (!file || !lineNumber || !columnNumber) {
		return null;
	}
	if (method.startsWith("async ")) {
		method = method.slice(6);
	}
	if (file.startsWith("file://")) {
		file = file.slice(7);
	}
	// normalize Windows path (\ -> /)
	file = file.startsWith("node:") || file.startsWith("internal:") ? file : resolve(file);
	if (method) {
		method = method.replace(/__vite_ssr_import_\d+__\./g, "").replace(/(Object\.)?__vite_ssr_export_default__\s?/g, "");
	}
	return {
		method,
		file,
		line: Number.parseInt(lineNumber),
		column: Number.parseInt(columnNumber)
	};
}
function parseStacktrace(stack, options = {}) {
	const { ignoreStackEntries = stackIgnorePatterns } = options;
	const stacks = !CHROME_IE_STACK_REGEXP.test(stack) ? parseFFOrSafariStackTrace(stack) : parseV8Stacktrace(stack);
	return stacks.map((stack) => {
		var _options$getSourceMap;
		if (options.getUrlId) {
			stack.file = options.getUrlId(stack.file);
		}
		const map = (_options$getSourceMap = options.getSourceMap) === null || _options$getSourceMap === void 0 ? void 0 : _options$getSourceMap.call(options, stack.file);
		if (!map || typeof map !== "object" || !map.version) {
			return shouldFilter(ignoreStackEntries, stack.file) ? null : stack;
		}
		const traceMap = new DecodedMap(map, stack.file);
		const position = getOriginalPosition(traceMap, stack);
		if (!position) {
			return stack;
		}
		const { line, column, source, name } = position;
		let file = source || stack.file;
		if (file.match(/\/\w:\//)) {
			file = file.slice(1);
		}
		if (shouldFilter(ignoreStackEntries, file)) {
			return null;
		}
		if (line != null && column != null) {
			return {
				line,
				column,
				file,
				method: name || stack.method
			};
		}
		return stack;
	}).filter((s) => s != null);
}
function shouldFilter(ignoreStackEntries, file) {
	return ignoreStackEntries.some((p) => file.match(p));
}
function parseFFOrSafariStackTrace(stack) {
	return stack.split("\n").map((line) => parseSingleFFOrSafariStack(line)).filter(notNullish);
}
function parseV8Stacktrace(stack) {
	return stack.split("\n").map((line) => parseSingleV8Stack(line)).filter(notNullish);
}
function parseErrorStacktrace(e, options = {}) {
	if (!e || isPrimitive(e)) {
		return [];
	}
	if ("stacks" in e && e.stacks) {
		return e.stacks;
	}
	const stackStr = e.stack || "";
	// if "stack" property was overwritten at runtime to be something else,
	// ignore the value because we don't know how to process it
	let stackFrames = typeof stackStr === "string" ? parseStacktrace(stackStr, options) : [];
	if (!stackFrames.length) {
		const e_ = e;
		if (e_.fileName != null && e_.lineNumber != null && e_.columnNumber != null) {
			stackFrames = parseStacktrace(`${e_.fileName}:${e_.lineNumber}:${e_.columnNumber}`, options);
		}
		if (e_.sourceURL != null && e_.line != null && e_._column != null) {
			stackFrames = parseStacktrace(`${e_.sourceURL}:${e_.line}:${e_.column}`, options);
		}
	}
	if (options.frameFilter) {
		stackFrames = stackFrames.filter((f) => options.frameFilter(e, f) !== false);
	}
	e.stacks = stackFrames;
	return stackFrames;
}
class DecodedMap {
	_encoded;
	_decoded;
	_decodedMemo;
	url;
	version;
	names = [];
	resolvedSources;
	constructor(map, from) {
		this.map = map;
		const { mappings, names, sources } = map;
		this.version = map.version;
		this.names = names || [];
		this._encoded = mappings || "";
		this._decodedMemo = memoizedState();
		this.url = from;
		this.resolvedSources = (sources || []).map((s) => resolve(s || "", from));
	}
}
function memoizedState() {
	return {
		lastKey: -1,
		lastNeedle: -1,
		lastIndex: -1
	};
}
function getOriginalPosition(map, needle) {
	const result = originalPositionFor(map, needle);
	if (result.column == null) {
		return null;
	}
	return result;
}

const lineSplitRE = /\r?\n/;
function positionToOffset(source, lineNumber, columnNumber) {
	const lines = source.split(lineSplitRE);
	const nl = /\r\n/.test(source) ? 2 : 1;
	let start = 0;
	if (lineNumber > lines.length) {
		return source.length;
	}
	for (let i = 0; i < lineNumber - 1; i++) {
		start += lines[i].length + nl;
	}
	return start + columnNumber;
}
function offsetToLineNumber(source, offset) {
	if (offset > source.length) {
		throw new Error(`offset is longer than source length! offset ${offset} > length ${source.length}`);
	}
	const lines = source.split(lineSplitRE);
	const nl = /\r\n/.test(source) ? 2 : 1;
	let counted = 0;
	let line = 0;
	for (; line < lines.length; line++) {
		const lineLength = lines[line].length + nl;
		if (counted + lineLength >= offset) {
			break;
		}
		counted += lineLength;
	}
	return line + 1;
}

async function saveInlineSnapshots(environment, snapshots) {
	const MagicString = (await import('magic-string')).default;
	const files = new Set(snapshots.map((i) => i.file));
	await Promise.all(Array.from(files).map(async (file) => {
		const snaps = snapshots.filter((i) => i.file === file);
		const code = await environment.readSnapshotFile(file);
		const s = new MagicString(code);
		for (const snap of snaps) {
			const index = positionToOffset(code, snap.line, snap.column);
			replaceInlineSnap(code, s, index, snap.snapshot);
		}
		const transformed = s.toString();
		if (transformed !== code) {
			await environment.saveSnapshotFile(file, transformed);
		}
	}));
}
const startObjectRegex = /(?:toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(\s*(?:\/\*[\s\S]*\*\/\s*|\/\/.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))*\{/;
function replaceObjectSnap(code, s, index, newSnap) {
	let _code = code.slice(index);
	const startMatch = startObjectRegex.exec(_code);
	if (!startMatch) {
		return false;
	}
	_code = _code.slice(startMatch.index);
	let callEnd = getCallLastIndex(_code);
	if (callEnd === null) {
		return false;
	}
	callEnd += index + startMatch.index;
	const shapeStart = index + startMatch.index + startMatch[0].length;
	const shapeEnd = getObjectShapeEndIndex(code, shapeStart);
	const snap = `, ${prepareSnapString(newSnap, code, index)}`;
	if (shapeEnd === callEnd) {
		// toMatchInlineSnapshot({ foo: expect.any(String) })
		s.appendLeft(callEnd, snap);
	} else {
		// toMatchInlineSnapshot({ foo: expect.any(String) }, ``)
		s.overwrite(shapeEnd, callEnd, snap);
	}
	return true;
}
function getObjectShapeEndIndex(code, index) {
	let startBraces = 1;
	let endBraces = 0;
	while (startBraces !== endBraces && index < code.length) {
		const s = code[index++];
		if (s === "{") {
			startBraces++;
		} else if (s === "}") {
			endBraces++;
		}
	}
	return index;
}
function prepareSnapString(snap, source, index) {
	const lineNumber = offsetToLineNumber(source, index);
	const line = source.split(lineSplitRE)[lineNumber - 1];
	const indent = line.match(/^\s*/)[0] || "";
	const indentNext = indent.includes("	") ? `${indent}\t` : `${indent}  `;
	const lines = snap.trim().replace(/\\/g, "\\\\").split(/\n/g);
	const isOneline = lines.length <= 1;
	const quote = "`";
	if (isOneline) {
		return `${quote}${lines.join("\n").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}${quote}`;
	}
	return `${quote}\n${lines.map((i) => i ? indentNext + i : "").join("\n").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\n${indent}${quote}`;
}
const toMatchInlineName = "toMatchInlineSnapshot";
const toThrowErrorMatchingInlineName = "toThrowErrorMatchingInlineSnapshot";
// on webkit, the line number is at the end of the method, not at the start
function getCodeStartingAtIndex(code, index) {
	const indexInline = index - toMatchInlineName.length;
	if (code.slice(indexInline, index) === toMatchInlineName) {
		return {
			code: code.slice(indexInline),
			index: indexInline
		};
	}
	const indexThrowInline = index - toThrowErrorMatchingInlineName.length;
	if (code.slice(index - indexThrowInline, index) === toThrowErrorMatchingInlineName) {
		return {
			code: code.slice(index - indexThrowInline),
			index: index - indexThrowInline
		};
	}
	return {
		code: code.slice(index),
		index
	};
}
const startRegex = /(?:toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(\s*(?:\/\*[\s\S]*\*\/\s*|\/\/.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))*[\w$]*(['"`)])/;
function replaceInlineSnap(code, s, currentIndex, newSnap) {
	const { code: codeStartingAtIndex, index } = getCodeStartingAtIndex(code, currentIndex);
	const startMatch = startRegex.exec(codeStartingAtIndex);
	const firstKeywordMatch = /toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot/.exec(codeStartingAtIndex);
	if (!startMatch || startMatch.index !== (firstKeywordMatch === null || firstKeywordMatch === void 0 ? void 0 : firstKeywordMatch.index)) {
		return replaceObjectSnap(code, s, index, newSnap);
	}
	const quote = startMatch[1];
	const startIndex = index + startMatch.index + startMatch[0].length;
	const snapString = prepareSnapString(newSnap, code, index);
	if (quote === ")") {
		s.appendRight(startIndex - 1, snapString);
		return true;
	}
	const quoteEndRE = new RegExp(`(?:^|[^\\\\])${quote}`);
	const endMatch = quoteEndRE.exec(code.slice(startIndex));
	if (!endMatch) {
		return false;
	}
	const endIndex = startIndex + endMatch.index + endMatch[0].length;
	s.overwrite(startIndex - 1, endIndex, snapString);
	return true;
}
const INDENTATION_REGEX = /^([^\S\n]*)\S/m;
function stripSnapshotIndentation(inlineSnapshot) {
	var _lines$at;
	// Find indentation if exists.
	const match = inlineSnapshot.match(INDENTATION_REGEX);
	if (!match || !match[1]) {
		// No indentation.
		return inlineSnapshot;
	}
	const indentation = match[1];
	const lines = inlineSnapshot.split(/\n/g);
	if (lines.length <= 2) {
		// Must be at least 3 lines.
		return inlineSnapshot;
	}
	if (lines[0].trim() !== "" || ((_lines$at = lines.at(-1)) === null || _lines$at === void 0 ? void 0 : _lines$at.trim()) !== "") {
		// If not blank first and last lines, abort.
		return inlineSnapshot;
	}
	for (let i = 1; i < lines.length - 1; i++) {
		if (lines[i] !== "") {
			if (lines[i].indexOf(indentation) !== 0) {
				// All lines except first and last should either be blank or have the same
				// indent as the first line (or more). If this isn't the case we don't
				// want to touch the snapshot at all.
				return inlineSnapshot;
			}
			lines[i] = lines[i].substring(indentation.length);
		}
	}
	// Last line is a special case because it won't have the same indent as others
	// but may still have been given some indent to line up.
	lines[lines.length - 1] = "";
	// Return inline snapshot, now at indent 0.
	inlineSnapshot = lines.join("\n");
	return inlineSnapshot;
}

async function saveRawSnapshots(environment, snapshots) {
	await Promise.all(snapshots.map(async (snap) => {
		if (!snap.readonly) {
			await environment.saveSnapshotFile(snap.file, snap.snapshot);
		}
	}));
}

function getDefaultExportFromCjs(x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}

var naturalCompare$1 = {exports: {}};

var hasRequiredNaturalCompare;

function requireNaturalCompare () {
	if (hasRequiredNaturalCompare) return naturalCompare$1.exports;
	hasRequiredNaturalCompare = 1;
	/*
	 * @version    1.4.0
	 * @date       2015-10-26
	 * @stability  3 - Stable
	 * @author     Lauri Rooden (https://github.com/litejs/natural-compare-lite)
	 * @license    MIT License
	 */


	var naturalCompare = function(a, b) {
		var i, codeA
		, codeB = 1
		, posA = 0
		, posB = 0
		, alphabet = String.alphabet;

		function getCode(str, pos, code) {
			if (code) {
				for (i = pos; code = getCode(str, i), code < 76 && code > 65;) ++i;
				return +str.slice(pos - 1, i)
			}
			code = alphabet && alphabet.indexOf(str.charAt(pos));
			return code > -1 ? code + 76 : ((code = str.charCodeAt(pos) || 0), code < 45 || code > 127) ? code
				: code < 46 ? 65               // -
				: code < 48 ? code - 1
				: code < 58 ? code + 18        // 0-9
				: code < 65 ? code - 11
				: code < 91 ? code + 11        // A-Z
				: code < 97 ? code - 37
				: code < 123 ? code + 5        // a-z
				: code - 63
		}


		if ((a+="") != (b+="")) for (;codeB;) {
			codeA = getCode(a, posA++);
			codeB = getCode(b, posB++);

			if (codeA < 76 && codeB < 76 && codeA > 66 && codeB > 66) {
				codeA = getCode(a, posA, posA);
				codeB = getCode(b, posB, posA = i);
				posB = i;
			}

			if (codeA != codeB) return (codeA < codeB) ? -1 : 1
		}
		return 0
	};

	try {
		naturalCompare$1.exports = naturalCompare;
	} catch (e) {
		String.naturalCompare = naturalCompare;
	}
	return naturalCompare$1.exports;
}

var naturalCompareExports = requireNaturalCompare();
var naturalCompare = /*@__PURE__*/getDefaultExportFromCjs(naturalCompareExports);

const serialize$1 = (val, config, indentation, depth, refs, printer) => {
	// Serialize a non-default name, even if config.printFunctionName is false.
	const name = val.getMockName();
	const nameString = name === "vi.fn()" ? "" : ` ${name}`;
	let callsString = "";
	if (val.mock.calls.length !== 0) {
		const indentationNext = indentation + config.indent;
		callsString = ` {${config.spacingOuter}${indentationNext}"calls": ${printer(val.mock.calls, config, indentationNext, depth, refs)}${config.min ? ", " : ","}${config.spacingOuter}${indentationNext}"results": ${printer(val.mock.results, config, indentationNext, depth, refs)}${config.min ? "" : ","}${config.spacingOuter}${indentation}}`;
	}
	return `[MockFunction${nameString}]${callsString}`;
};
const test = (val) => val && !!val._isMockFunction;
const plugin = {
	serialize: serialize$1,
	test
};

const { DOMCollection, DOMElement, Immutable, ReactElement, ReactTestComponent, AsymmetricMatcher } = plugins;
let PLUGINS = [
	ReactTestComponent,
	ReactElement,
	DOMElement,
	DOMCollection,
	Immutable,
	AsymmetricMatcher,
	plugin
];
function addSerializer(plugin) {
	PLUGINS = [plugin].concat(PLUGINS);
}
function getSerializers() {
	return PLUGINS;
}

// TODO: rewrite and clean up
function testNameToKey(testName, count) {
	return `${testName} ${count}`;
}
function keyToTestName(key) {
	if (!/ \d+$/.test(key)) {
		throw new Error("Snapshot keys must end with a number.");
	}
	return key.replace(/ \d+$/, "");
}
function getSnapshotData(content, options) {
	const update = options.updateSnapshot;
	const data = Object.create(null);
	let snapshotContents = "";
	let dirty = false;
	if (content != null) {
		try {
			snapshotContents = content;
			// eslint-disable-next-line no-new-func
			const populate = new Function("exports", snapshotContents);
			populate(data);
		} catch {}
	}
	// const validationResult = validateSnapshotVersion(snapshotContents)
	const isInvalid = snapshotContents;
	// if (update === 'none' && isInvalid)
	//   throw validationResult
	if ((update === "all" || update === "new") && isInvalid) {
		dirty = true;
	}
	return {
		data,
		dirty
	};
}
// Add extra line breaks at beginning and end of multiline snapshot
// to make the content easier to read.
function addExtraLineBreaks(string) {
	return string.includes("\n") ? `\n${string}\n` : string;
}
// Remove extra line breaks at beginning and end of multiline snapshot.
// Instead of trim, which can remove additional newlines or spaces
// at beginning or end of the content from a custom serializer.
function removeExtraLineBreaks(string) {
	return string.length > 2 && string[0] === "\n" && string.endsWith("\n") ? string.slice(1, -1) : string;
}
// export const removeLinesBeforeExternalMatcherTrap = (stack: string): string => {
//   const lines = stack.split('\n')
//   for (let i = 0; i < lines.length; i += 1) {
//     // It's a function name specified in `packages/expect/src/index.ts`
//     // for external custom matchers.
//     if (lines[i].includes('__EXTERNAL_MATCHER_TRAP__'))
//       return lines.slice(i + 1).join('\n')
//   }
//   return stack
// }
const escapeRegex = true;
const printFunctionName = false;
function serialize(val, indent = 2, formatOverrides = {}) {
	return normalizeNewlines(format(val, {
		escapeRegex,
		indent,
		plugins: getSerializers(),
		printFunctionName,
		...formatOverrides
	}));
}
function escapeBacktickString(str) {
	return str.replace(/`|\\|\$\{/g, "\\$&");
}
function printBacktickString(str) {
	return `\`${escapeBacktickString(str)}\``;
}
function normalizeNewlines(string) {
	return string.replace(/\r\n|\r/g, "\n");
}
async function saveSnapshotFile(environment, snapshotData, snapshotPath) {
	const snapshots = Object.keys(snapshotData).sort(naturalCompare).map((key) => `exports[${printBacktickString(key)}] = ${printBacktickString(normalizeNewlines(snapshotData[key]))};`);
	const content = `${environment.getHeader()}\n\n${snapshots.join("\n\n")}\n`;
	const oldContent = await environment.readSnapshotFile(snapshotPath);
	const skipWriting = oldContent != null && oldContent === content;
	if (skipWriting) {
		return;
	}
	await environment.saveSnapshotFile(snapshotPath, content);
}
function deepMergeArray(target = [], source = []) {
	const mergedOutput = Array.from(target);
	source.forEach((sourceElement, index) => {
		const targetElement = mergedOutput[index];
		if (Array.isArray(target[index])) {
			mergedOutput[index] = deepMergeArray(target[index], sourceElement);
		} else if (isObject(targetElement)) {
			mergedOutput[index] = deepMergeSnapshot(target[index], sourceElement);
		} else {
			// Source does not exist in target or target is primitive and cannot be deep merged
			mergedOutput[index] = sourceElement;
		}
	});
	return mergedOutput;
}
/**
* Deep merge, but considers asymmetric matchers. Unlike base util's deep merge,
* will merge any object-like instance.
* Compatible with Jest's snapshot matcher. Should not be used outside of snapshot.
*
* @example
* ```ts
* toMatchSnapshot({
*   name: expect.stringContaining('text')
* })
* ```
*/
function deepMergeSnapshot(target, source) {
	if (isObject(target) && isObject(source)) {
		const mergedOutput = { ...target };
		Object.keys(source).forEach((key) => {
			if (isObject(source[key]) && !source[key].$$typeof) {
				if (!(key in target)) {
					Object.assign(mergedOutput, { [key]: source[key] });
				} else {
					mergedOutput[key] = deepMergeSnapshot(target[key], source[key]);
				}
			} else if (Array.isArray(source[key])) {
				mergedOutput[key] = deepMergeArray(target[key], source[key]);
			} else {
				Object.assign(mergedOutput, { [key]: source[key] });
			}
		});
		return mergedOutput;
	} else if (Array.isArray(target) && Array.isArray(source)) {
		return deepMergeArray(target, source);
	}
	return target;
}
class DefaultMap extends Map {
	constructor(defaultFn, entries) {
		super(entries);
		this.defaultFn = defaultFn;
	}
	get(key) {
		if (!this.has(key)) {
			this.set(key, this.defaultFn(key));
		}
		return super.get(key);
	}
}
class CounterMap extends DefaultMap {
	constructor() {
		super(() => 0);
	}
	// compat for jest-image-snapshot https://github.com/vitest-dev/vitest/issues/7322
	// `valueOf` and `Snapshot.added` setter allows
	//   snapshotState.added = snapshotState.added + 1
	// to function as
	//   snapshotState.added.total_ = snapshotState.added.total() + 1
	_total;
	valueOf() {
		return this._total = this.total();
	}
	increment(key) {
		if (typeof this._total !== "undefined") {
			this._total++;
		}
		this.set(key, this.get(key) + 1);
	}
	total() {
		if (typeof this._total !== "undefined") {
			return this._total;
		}
		let total = 0;
		for (const x of this.values()) {
			total += x;
		}
		return total;
	}
}

function isSameStackPosition(x, y) {
	return x.file === y.file && x.column === y.column && x.line === y.line;
}
class SnapshotState {
	_counters = new CounterMap();
	_dirty;
	_updateSnapshot;
	_snapshotData;
	_initialData;
	_inlineSnapshots;
	_inlineSnapshotStacks;
	_testIdToKeys = new DefaultMap(() => []);
	_rawSnapshots;
	_uncheckedKeys;
	_snapshotFormat;
	_environment;
	_fileExists;
	expand;
	// getter/setter for jest-image-snapshot compat
	// https://github.com/vitest-dev/vitest/issues/7322
	_added = new CounterMap();
	_matched = new CounterMap();
	_unmatched = new CounterMap();
	_updated = new CounterMap();
	get added() {
		return this._added;
	}
	set added(value) {
		this._added._total = value;
	}
	get matched() {
		return this._matched;
	}
	set matched(value) {
		this._matched._total = value;
	}
	get unmatched() {
		return this._unmatched;
	}
	set unmatched(value) {
		this._unmatched._total = value;
	}
	get updated() {
		return this._updated;
	}
	set updated(value) {
		this._updated._total = value;
	}
	constructor(testFilePath, snapshotPath, snapshotContent, options) {
		this.testFilePath = testFilePath;
		this.snapshotPath = snapshotPath;
		const { data, dirty } = getSnapshotData(snapshotContent, options);
		this._fileExists = snapshotContent != null;
		this._initialData = { ...data };
		this._snapshotData = { ...data };
		this._dirty = dirty;
		this._inlineSnapshots = [];
		this._inlineSnapshotStacks = [];
		this._rawSnapshots = [];
		this._uncheckedKeys = new Set(Object.keys(this._snapshotData));
		this.expand = options.expand || false;
		this._updateSnapshot = options.updateSnapshot;
		this._snapshotFormat = {
			printBasicPrototype: false,
			escapeString: false,
			...options.snapshotFormat
		};
		this._environment = options.snapshotEnvironment;
	}
	static async create(testFilePath, options) {
		const snapshotPath = await options.snapshotEnvironment.resolvePath(testFilePath);
		const content = await options.snapshotEnvironment.readSnapshotFile(snapshotPath);
		return new SnapshotState(testFilePath, snapshotPath, content, options);
	}
	get environment() {
		return this._environment;
	}
	markSnapshotsAsCheckedForTest(testName) {
		this._uncheckedKeys.forEach((uncheckedKey) => {
			// skip snapshots with following keys
			//   testName n
			//   testName > xxx n (this is for toMatchSnapshot("xxx") API)
			if (/ \d+$| > /.test(uncheckedKey.slice(testName.length))) {
				this._uncheckedKeys.delete(uncheckedKey);
			}
		});
	}
	clearTest(testId) {
		// clear inline
		this._inlineSnapshots = this._inlineSnapshots.filter((s) => s.testId !== testId);
		this._inlineSnapshotStacks = this._inlineSnapshotStacks.filter((s) => s.testId !== testId);
		// clear file
		for (const key of this._testIdToKeys.get(testId)) {
			const name = keyToTestName(key);
			const count = this._counters.get(name);
			if (count > 0) {
				if (key in this._snapshotData || key in this._initialData) {
					this._snapshotData[key] = this._initialData[key];
				}
				this._counters.set(name, count - 1);
			}
		}
		this._testIdToKeys.delete(testId);
		// clear stats
		this.added.delete(testId);
		this.updated.delete(testId);
		this.matched.delete(testId);
		this.unmatched.delete(testId);
	}
	_inferInlineSnapshotStack(stacks) {
		// if called inside resolves/rejects, stacktrace is different
		const promiseIndex = stacks.findIndex((i) => i.method.match(/__VITEST_(RESOLVES|REJECTS)__/));
		if (promiseIndex !== -1) {
			return stacks[promiseIndex + 3];
		}
		// inline snapshot function is called __INLINE_SNAPSHOT__
		// in integrations/snapshot/chai.ts
		const stackIndex = stacks.findIndex((i) => i.method.includes("__INLINE_SNAPSHOT__"));
		return stackIndex !== -1 ? stacks[stackIndex + 2] : null;
	}
	_addSnapshot(key, receivedSerialized, options) {
		this._dirty = true;
		if (options.stack) {
			this._inlineSnapshots.push({
				snapshot: receivedSerialized,
				testId: options.testId,
				...options.stack
			});
		} else if (options.rawSnapshot) {
			this._rawSnapshots.push({
				...options.rawSnapshot,
				snapshot: receivedSerialized
			});
		} else {
			this._snapshotData[key] = receivedSerialized;
		}
	}
	async save() {
		const hasExternalSnapshots = Object.keys(this._snapshotData).length;
		const hasInlineSnapshots = this._inlineSnapshots.length;
		const hasRawSnapshots = this._rawSnapshots.length;
		const isEmpty = !hasExternalSnapshots && !hasInlineSnapshots && !hasRawSnapshots;
		const status = {
			deleted: false,
			saved: false
		};
		if ((this._dirty || this._uncheckedKeys.size) && !isEmpty) {
			if (hasExternalSnapshots) {
				await saveSnapshotFile(this._environment, this._snapshotData, this.snapshotPath);
				this._fileExists = true;
			}
			if (hasInlineSnapshots) {
				await saveInlineSnapshots(this._environment, this._inlineSnapshots);
			}
			if (hasRawSnapshots) {
				await saveRawSnapshots(this._environment, this._rawSnapshots);
			}
			status.saved = true;
		} else if (!hasExternalSnapshots && this._fileExists) {
			if (this._updateSnapshot === "all") {
				await this._environment.removeSnapshotFile(this.snapshotPath);
				this._fileExists = false;
			}
			status.deleted = true;
		}
		return status;
	}
	getUncheckedCount() {
		return this._uncheckedKeys.size || 0;
	}
	getUncheckedKeys() {
		return Array.from(this._uncheckedKeys);
	}
	removeUncheckedKeys() {
		if (this._updateSnapshot === "all" && this._uncheckedKeys.size) {
			this._dirty = true;
			this._uncheckedKeys.forEach((key) => delete this._snapshotData[key]);
			this._uncheckedKeys.clear();
		}
	}
	match({ testId, testName, received, key, inlineSnapshot, isInline, error, rawSnapshot }) {
		// this also increments counter for inline snapshots. maybe we shouldn't?
		this._counters.increment(testName);
		const count = this._counters.get(testName);
		if (!key) {
			key = testNameToKey(testName, count);
		}
		this._testIdToKeys.get(testId).push(key);
		// Do not mark the snapshot as "checked" if the snapshot is inline and
		// there's an external snapshot. This way the external snapshot can be
		// removed with `--updateSnapshot`.
		if (!(isInline && this._snapshotData[key] !== undefined)) {
			this._uncheckedKeys.delete(key);
		}
		let receivedSerialized = rawSnapshot && typeof received === "string" ? received : serialize(received, undefined, this._snapshotFormat);
		if (!rawSnapshot) {
			receivedSerialized = addExtraLineBreaks(receivedSerialized);
		}
		if (rawSnapshot) {
			// normalize EOL when snapshot contains CRLF but received is LF
			if (rawSnapshot.content && rawSnapshot.content.match(/\r\n/) && !receivedSerialized.match(/\r\n/)) {
				rawSnapshot.content = normalizeNewlines(rawSnapshot.content);
			}
		}
		const expected = isInline ? inlineSnapshot : rawSnapshot ? rawSnapshot.content : this._snapshotData[key];
		const expectedTrimmed = rawSnapshot ? expected : expected === null || expected === void 0 ? void 0 : expected.trim();
		const pass = expectedTrimmed === (rawSnapshot ? receivedSerialized : receivedSerialized.trim());
		const hasSnapshot = expected !== undefined;
		const snapshotIsPersisted = isInline || this._fileExists || rawSnapshot && rawSnapshot.content != null;
		if (pass && !isInline && !rawSnapshot) {
			// Executing a snapshot file as JavaScript and writing the strings back
			// when other snapshots have changed loses the proper escaping for some
			// characters. Since we check every snapshot in every test, use the newly
			// generated formatted string.
			// Note that this is only relevant when a snapshot is added and the dirty
			// flag is set.
			this._snapshotData[key] = receivedSerialized;
		}
		// find call site of toMatchInlineSnapshot
		let stack;
		if (isInline) {
			var _this$environment$pro, _this$environment;
			const stacks = parseErrorStacktrace(error || new Error("snapshot"), { ignoreStackEntries: [] });
			const _stack = this._inferInlineSnapshotStack(stacks);
			if (!_stack) {
				throw new Error(`@vitest/snapshot: Couldn't infer stack frame for inline snapshot.\n${JSON.stringify(stacks)}`);
			}
			stack = ((_this$environment$pro = (_this$environment = this.environment).processStackTrace) === null || _this$environment$pro === void 0 ? void 0 : _this$environment$pro.call(_this$environment, _stack)) || _stack;
			// removing 1 column, because source map points to the wrong
			// location for js files, but `column-1` points to the same in both js/ts
			// https://github.com/vitejs/vite/issues/8657
			stack.column--;
			// reject multiple inline snapshots at the same location if snapshot is different
			const snapshotsWithSameStack = this._inlineSnapshotStacks.filter((s) => isSameStackPosition(s, stack));
			if (snapshotsWithSameStack.length > 0) {
				// ensure only one snapshot will be written at the same location
				this._inlineSnapshots = this._inlineSnapshots.filter((s) => !isSameStackPosition(s, stack));
				const differentSnapshot = snapshotsWithSameStack.find((s) => s.snapshot !== receivedSerialized);
				if (differentSnapshot) {
					throw Object.assign(new Error("toMatchInlineSnapshot with different snapshots cannot be called at the same location"), {
						actual: receivedSerialized,
						expected: differentSnapshot.snapshot
					});
				}
			}
			this._inlineSnapshotStacks.push({
				...stack,
				testId,
				snapshot: receivedSerialized
			});
		}
		// These are the conditions on when to write snapshots:
		//  * There's no snapshot file in a non-CI environment.
		//  * There is a snapshot file and we decided to update the snapshot.
		//  * There is a snapshot file, but it doesn't have this snapshot.
		// These are the conditions on when not to write snapshots:
		//  * The update flag is set to 'none'.
		//  * There's no snapshot file or a file without this snapshot on a CI environment.
		if (hasSnapshot && this._updateSnapshot === "all" || (!hasSnapshot || !snapshotIsPersisted) && (this._updateSnapshot === "new" || this._updateSnapshot === "all")) {
			if (this._updateSnapshot === "all") {
				if (!pass) {
					if (hasSnapshot) {
						this.updated.increment(testId);
					} else {
						this.added.increment(testId);
					}
					this._addSnapshot(key, receivedSerialized, {
						stack,
						testId,
						rawSnapshot
					});
				} else {
					this.matched.increment(testId);
				}
			} else {
				this._addSnapshot(key, receivedSerialized, {
					stack,
					testId,
					rawSnapshot
				});
				this.added.increment(testId);
			}
			return {
				actual: "",
				count,
				expected: "",
				key,
				pass: true
			};
		} else {
			if (!pass) {
				this.unmatched.increment(testId);
				return {
					actual: rawSnapshot ? receivedSerialized : removeExtraLineBreaks(receivedSerialized),
					count,
					expected: expectedTrimmed !== undefined ? rawSnapshot ? expectedTrimmed : removeExtraLineBreaks(expectedTrimmed) : undefined,
					key,
					pass: false
				};
			} else {
				this.matched.increment(testId);
				return {
					actual: "",
					count,
					expected: "",
					key,
					pass: true
				};
			}
		}
	}
	async pack() {
		const snapshot = {
			filepath: this.testFilePath,
			added: 0,
			fileDeleted: false,
			matched: 0,
			unchecked: 0,
			uncheckedKeys: [],
			unmatched: 0,
			updated: 0
		};
		const uncheckedCount = this.getUncheckedCount();
		const uncheckedKeys = this.getUncheckedKeys();
		if (uncheckedCount) {
			this.removeUncheckedKeys();
		}
		const status = await this.save();
		snapshot.fileDeleted = status.deleted;
		snapshot.added = this.added.total();
		snapshot.matched = this.matched.total();
		snapshot.unmatched = this.unmatched.total();
		snapshot.updated = this.updated.total();
		snapshot.unchecked = !status.deleted ? uncheckedCount : 0;
		snapshot.uncheckedKeys = Array.from(uncheckedKeys);
		return snapshot;
	}
}

function createMismatchError(message, expand, actual, expected) {
	const error = new Error(message);
	Object.defineProperty(error, "actual", {
		value: actual,
		enumerable: true,
		configurable: true,
		writable: true
	});
	Object.defineProperty(error, "expected", {
		value: expected,
		enumerable: true,
		configurable: true,
		writable: true
	});
	Object.defineProperty(error, "diffOptions", { value: { expand } });
	return error;
}
class SnapshotClient {
	snapshotStateMap = new Map();
	constructor(options = {}) {
		this.options = options;
	}
	async setup(filepath, options) {
		if (this.snapshotStateMap.has(filepath)) {
			return;
		}
		this.snapshotStateMap.set(filepath, await SnapshotState.create(filepath, options));
	}
	async finish(filepath) {
		const state = this.getSnapshotState(filepath);
		const result = await state.pack();
		this.snapshotStateMap.delete(filepath);
		return result;
	}
	skipTest(filepath, testName) {
		const state = this.getSnapshotState(filepath);
		state.markSnapshotsAsCheckedForTest(testName);
	}
	clearTest(filepath, testId) {
		const state = this.getSnapshotState(filepath);
		state.clearTest(testId);
	}
	getSnapshotState(filepath) {
		const state = this.snapshotStateMap.get(filepath);
		if (!state) {
			throw new Error(`The snapshot state for '${filepath}' is not found. Did you call 'SnapshotClient.setup()'?`);
		}
		return state;
	}
	assert(options) {
		const { filepath, name, testId = name, message, isInline = false, properties, inlineSnapshot, error, errorMessage, rawSnapshot } = options;
		let { received } = options;
		if (!filepath) {
			throw new Error("Snapshot cannot be used outside of test");
		}
		const snapshotState = this.getSnapshotState(filepath);
		if (typeof properties === "object") {
			if (typeof received !== "object" || !received) {
				throw new Error("Received value must be an object when the matcher has properties");
			}
			try {
				var _this$options$isEqual, _this$options;
				const pass = ((_this$options$isEqual = (_this$options = this.options).isEqual) === null || _this$options$isEqual === void 0 ? void 0 : _this$options$isEqual.call(_this$options, received, properties)) ?? false;
				// const pass = equals(received, properties, [iterableEquality, subsetEquality])
				if (!pass) {
					throw createMismatchError("Snapshot properties mismatched", snapshotState.expand, received, properties);
				} else {
					received = deepMergeSnapshot(received, properties);
				}
			} catch (err) {
				err.message = errorMessage || "Snapshot mismatched";
				throw err;
			}
		}
		const testName = [name, ...message ? [message] : []].join(" > ");
		const { actual, expected, key, pass } = snapshotState.match({
			testId,
			testName,
			received,
			isInline,
			error,
			inlineSnapshot,
			rawSnapshot
		});
		if (!pass) {
			throw createMismatchError(`Snapshot \`${key || "unknown"}\` mismatched`, snapshotState.expand, rawSnapshot ? actual : actual === null || actual === void 0 ? void 0 : actual.trim(), rawSnapshot ? expected : expected === null || expected === void 0 ? void 0 : expected.trim());
		}
	}
	async assertRaw(options) {
		if (!options.rawSnapshot) {
			throw new Error("Raw snapshot is required");
		}
		const { filepath, rawSnapshot } = options;
		if (rawSnapshot.content == null) {
			if (!filepath) {
				throw new Error("Snapshot cannot be used outside of test");
			}
			const snapshotState = this.getSnapshotState(filepath);
			// save the filepath, so it don't lose even if the await make it out-of-context
			options.filepath || (options.filepath = filepath);
			// resolve and read the raw snapshot file
			rawSnapshot.file = await snapshotState.environment.resolveRawPath(filepath, rawSnapshot.file);
			rawSnapshot.content = await snapshotState.environment.readSnapshotFile(rawSnapshot.file) ?? undefined;
		}
		return this.assert(options);
	}
	clear() {
		this.snapshotStateMap.clear();
	}
}

export { SnapshotClient, SnapshotState, addSerializer, getSerializers, stripSnapshotIndentation };
