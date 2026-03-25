import { c as resolve, m as moduleRunner, d as getWorkerState, g as getBrowserState, e as getTestName, a as getConfig } from "./utils-uxqdqUz8.js";
import { onCancel, globalChannel, channel, client } from "@vitest/browser/client";
import { userEvent, page, server } from "vitest/browser";
import { getSafeTimers, DecodedMap as DecodedMap$1, getOriginalPosition as getOriginalPosition$1, loadDiffConfig, loadSnapshotSerializers, takeCoverageInsideWorker, browserFormat, setupCommonEnv, startCoverageInsideWorker, stopCoverageInsideWorker, startTests, collectTests, SpyModule } from "vitest/internal/browser";
import { VitestTestRunner, NodeBenchmarkRunner } from "vitest/runners";
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const { parse: $parse } = JSON;
const { keys } = Object;
const Primitive = String;
const primitive = "string";
const ignore = {};
const object = "object";
const noop = (_, value) => value;
const primitives = (value) => value instanceof Primitive ? Primitive(value) : value;
const Primitives = (_, value) => typeof value === primitive ? new Primitive(value) : value;
const revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), { length } = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({ k, a: [input, parsed, tmp, $] });
      } else
        output[k] = $.call(output, k, tmp);
    } else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
  }
  for (let { length } = lazy, i = 0; i < length; i++) {
    const { k, a } = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};
const parse = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = noop;
  const tmp = typeof value === object && value ? revive(input, /* @__PURE__ */ new Set(), value, $) : value;
  return $.call({ "": tmp }, "", tmp);
};
function showPopupWarning(name, value, defaultValue) {
  return (...params) => {
    const formattedParams = params.map((p) => JSON.stringify(p)).join(", ");
    console.warn(`Vitest encountered a \`${name}(${formattedParams})\` call that it cannot handle by default, so it returned \`${value}\`. Read more in https://vitest.dev/guide/browser/#thread-blocking-dialogs.
If needed, mock the \`${name}\` call manually like:

\`\`\`
import { expect, vi } from "vitest"

vi.spyOn(window, "${name}")${defaultValue ? `.mockReturnValue(${JSON.stringify(defaultValue)})` : ""}
${name}(${formattedParams})
expect(${name}).toHaveBeenCalledWith(${formattedParams})
\`\`\``);
    return value;
  };
}
function setupDialogsSpy() {
  globalThis.alert = showPopupWarning("alert", void 0);
  globalThis.confirm = showPopupWarning("confirm", false, true);
  globalThis.prompt = showPopupWarning("prompt", null, "your value");
}
const { get } = Reflect;
function withSafeTimers(getTimers, fn) {
  const { setTimeout, clearTimeout } = getTimers();
  const currentSetTimeout = globalThis.setTimeout;
  const currentClearTimeout = globalThis.clearTimeout;
  try {
    globalThis.setTimeout = setTimeout;
    globalThis.clearTimeout = clearTimeout;
    const result = fn();
    return result;
  } finally {
    globalThis.setTimeout = currentSetTimeout;
    globalThis.clearTimeout = currentClearTimeout;
  }
}
const promises = /* @__PURE__ */ new Set();
function createSafeRpc(client2) {
  return new Proxy(client2.rpc, {
    get(target, p, handler) {
      if (p === "then") {
        return;
      }
      const sendCall = get(target, p, handler);
      const safeSendCall = (...args) => withSafeTimers(getSafeTimers, async () => {
        const result = sendCall(...args);
        promises.add(result);
        try {
          return await result;
        } finally {
          promises.delete(result);
        }
      });
      safeSendCall.asEvent = sendCall.asEvent;
      return safeSendCall;
    }
  });
}
function rpc$2() {
  return globalThis.__vitest_worker__.rpc;
}
var comma = ",".charCodeAt(0);
var chars$1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar$1 = new Uint8Array(64);
var charToInt$1 = new Uint8Array(128);
for (let i = 0; i < chars$1.length; i++) {
  const c = chars$1.charCodeAt(i);
  intToChar$1[i] = c;
  charToInt$1[c] = i;
}
function decodeInteger(reader, relative) {
  let value = 0;
  let shift = 0;
  let integer = 0;
  do {
    const c = reader.next();
    integer = charToInt$1[c];
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
var resolveUri_umd$1 = { exports: {} };
var resolveUri_umd = resolveUri_umd$1.exports;
var hasRequiredResolveUri_umd;
function requireResolveUri_umd() {
  if (hasRequiredResolveUri_umd) return resolveUri_umd$1.exports;
  hasRequiredResolveUri_umd = 1;
  (function(module, exports$1) {
    (function(global, factory) {
      module.exports = factory();
    })(resolveUri_umd, (function() {
      const schemeRegex = /^[\w+.-]+:\/\//;
      const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
      const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
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
        const path = match[2];
        return makeUrl("file:", "", match[1] || "", "", isAbsolutePath(path) ? path : "/" + path, match[3] || "", match[4] || "");
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
          type: 7
        };
      }
      function parseUrl(input) {
        if (isSchemeRelativeUrl(input)) {
          const url3 = parseAbsoluteUrl("http:" + input);
          url3.scheme = "";
          url3.type = 6;
          return url3;
        }
        if (isAbsolutePath(input)) {
          const url3 = parseAbsoluteUrl("http://foo.com" + input);
          url3.scheme = "";
          url3.host = "";
          url3.type = 5;
          return url3;
        }
        if (isFileUrl(input))
          return parseFileUrl(input);
        if (isAbsoluteUrl(input))
          return parseAbsoluteUrl(input);
        const url2 = parseAbsoluteUrl("http://foo.com/" + input);
        url2.scheme = "";
        url2.host = "";
        url2.type = input ? input.startsWith("?") ? 3 : input.startsWith("#") ? 2 : 4 : 1;
        return url2;
      }
      function stripPathFilename(path) {
        if (path.endsWith("/.."))
          return path;
        const index = path.lastIndexOf("/");
        return path.slice(0, index + 1);
      }
      function mergePaths(url2, base) {
        normalizePath(base, base.type);
        if (url2.path === "/") {
          url2.path = base.path;
        } else {
          url2.path = stripPathFilename(base.path) + url2.path;
        }
      }
      function normalizePath(url2, type) {
        const rel = type <= 4;
        const pieces = url2.path.split("/");
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
        let path = "";
        for (let i = 1; i < pointer; i++) {
          path += "/" + pieces[i];
        }
        if (!path || addTrailingSlash && !path.endsWith("/..")) {
          path += "/";
        }
        url2.path = path;
      }
      function resolve2(input, base) {
        if (!input && !base)
          return "";
        const url2 = parseUrl(input);
        let inputType = url2.type;
        if (base && inputType !== 7) {
          const baseUrl = parseUrl(base);
          const baseType = baseUrl.type;
          switch (inputType) {
            case 1:
              url2.hash = baseUrl.hash;
            // fall through
            case 2:
              url2.query = baseUrl.query;
            // fall through
            case 3:
            case 4:
              mergePaths(url2, baseUrl);
            // fall through
            case 5:
              url2.user = baseUrl.user;
              url2.host = baseUrl.host;
              url2.port = baseUrl.port;
            // fall through
            case 6:
              url2.scheme = baseUrl.scheme;
          }
          if (baseType > inputType)
            inputType = baseType;
        }
        normalizePath(url2, inputType);
        const queryHash = url2.query + url2.hash;
        switch (inputType) {
          // This is impossible, because of the empty checks at the start of the function.
          // case UrlType.Empty:
          case 2:
          case 3:
            return queryHash;
          case 4: {
            const path = url2.path.slice(1);
            if (!path)
              return queryHash || ".";
            if (isRelative(base || input) && !isRelative(path)) {
              return "./" + path + queryHash;
            }
            return path + queryHash;
          }
          case 5:
            return url2.path + queryHash;
          default:
            return url2.scheme + "//" + url2.user + url2.host + url2.port + url2.path + queryHash;
        }
      }
      return resolve2;
    }));
  })(resolveUri_umd$1);
  return resolveUri_umd$1.exports;
}
requireResolveUri_umd();
var COLUMN = 0;
var SOURCES_INDEX = 1;
var SOURCE_LINE = 2;
var SOURCE_COLUMN = 3;
var NAMES_INDEX = 4;
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
  // browser related deps
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
  if (!urlLike.includes(":")) {
    return [urlLike];
  }
  const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
  const parts = regExp.exec(urlLike.replace(/^\(|\)$/g, ""));
  if (!parts) {
    return [urlLike];
  }
  let url2 = parts[1];
  if (url2.startsWith("async ")) {
    url2 = url2.slice(6);
  }
  if (url2.startsWith("http:") || url2.startsWith("https:")) {
    const urlObj = new URL(url2);
    urlObj.searchParams.delete("import");
    urlObj.searchParams.delete("browserv");
    url2 = urlObj.pathname + urlObj.hash + urlObj.search;
  }
  if (url2.startsWith("/@fs/")) {
    const isWindows = /^\/@fs\/[a-zA-Z]:\//.test(url2);
    url2 = url2.slice(isWindows ? 5 : 4);
  }
  return [url2, parts[2] || void 0, parts[3] || void 0];
}
function parseSingleFFOrSafariStack(raw) {
  let line = raw.trim();
  if (SAFARI_NATIVE_CODE_REGEXP.test(line)) {
    return null;
  }
  if (line.includes(" > eval")) {
    line = line.replace(
      / line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g,
      ":$1"
    );
  }
  if (!line.includes("@")) {
    return null;
  }
  let atIndex = -1;
  let locationPart = "";
  let functionName;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "@") {
      const candidateLocation = line.slice(i + 1);
      if (candidateLocation.includes(":") && candidateLocation.length >= 3) {
        atIndex = i;
        locationPart = candidateLocation;
        functionName = i > 0 ? line.slice(0, i) : void 0;
        break;
      }
    }
  }
  if (atIndex === -1 || !locationPart.includes(":") || locationPart.length < 3) {
    return null;
  }
  const [url2, lineNumber, columnNumber] = extractLocation(locationPart);
  if (!url2 || !lineNumber || !columnNumber) {
    return null;
  }
  return {
    file: url2,
    method: functionName || "",
    line: Number.parseInt(lineNumber),
    column: Number.parseInt(columnNumber)
  };
}
function parseSingleV8Stack(raw) {
  let line = raw.trim();
  if (!CHROME_IE_STACK_REGEXP.test(line)) {
    return null;
  }
  if (line.includes("(eval ")) {
    line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
  }
  let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
  const location2 = sanitizedLine.match(/ (\(.+\)$)/);
  sanitizedLine = location2 ? sanitizedLine.replace(location2[0], "") : sanitizedLine;
  const [url2, lineNumber, columnNumber] = extractLocation(
    location2 ? location2[1] : sanitizedLine
  );
  let method = location2 && sanitizedLine || "";
  let file = url2 && ["eval", "<anonymous>"].includes(url2) ? void 0 : url2;
  if (!file || !lineNumber || !columnNumber) {
    return null;
  }
  if (method.startsWith("async ")) {
    method = method.slice(6);
  }
  if (file.startsWith("file://")) {
    file = file.slice(7);
  }
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
function createStackString(stacks) {
  return stacks.map((stack) => {
    const line = `${stack.file}:${stack.line}:${stack.column}`;
    if (stack.method) {
      return `    at ${stack.method}(${line})`;
    }
    return `    at ${line}`;
  }).join("\n");
}
function parseStacktrace(stack, options = {}) {
  const { ignoreStackEntries = stackIgnorePatterns } = options;
  const stacks = !CHROME_IE_STACK_REGEXP.test(stack) ? parseFFOrSafariStackTrace(stack) : parseV8Stacktrace(stack);
  return stacks.map((stack2) => {
    var _a;
    if (options.getUrlId) {
      stack2.file = options.getUrlId(stack2.file);
    }
    const map = (_a = options.getSourceMap) == null ? void 0 : _a.call(options, stack2.file);
    if (!map || typeof map !== "object" || !map.version) {
      return shouldFilter(ignoreStackEntries, stack2.file) ? null : stack2;
    }
    const traceMap = new DecodedMap(map, stack2.file);
    const position = getOriginalPosition(traceMap, stack2);
    if (!position) {
      return stack2;
    }
    const { line, column, source, name } = position;
    let file = source || stack2.file;
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
        method: name || stack2.method
      };
    }
    return stack2;
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
class DecodedMap {
  constructor(map, from) {
    this.map = map;
    const { mappings, names, sources } = map;
    this.version = map.version;
    this.names = names || [];
    this._encoded = mappings || "";
    this._decodedMemo = memoizedState();
    this.url = from;
    this.resolvedSources = (sources || []).map(
      (s) => resolve(s || "", from)
    );
  }
  _encoded;
  _decoded;
  _decodedMemo;
  url;
  version;
  names = [];
  resolvedSources;
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
class VitestBrowserSnapshotEnvironment {
  sourceMaps = /* @__PURE__ */ new Map();
  traceMaps = /* @__PURE__ */ new Map();
  addSourceMap(filepath, map) {
    this.sourceMaps.set(filepath, map);
  }
  getVersion() {
    return "1";
  }
  getHeader() {
    return `// Vitest Snapshot v${this.getVersion()}, https://vitest.dev/guide/snapshot.html`;
  }
  readSnapshotFile(filepath) {
    return rpc$1().readSnapshotFile(filepath);
  }
  saveSnapshotFile(filepath, snapshot) {
    return rpc$1().saveSnapshotFile(filepath, snapshot);
  }
  resolvePath(filepath) {
    return rpc$1().resolveSnapshotPath(filepath);
  }
  resolveRawPath(testPath, rawPath) {
    return rpc$1().resolveSnapshotRawPath(testPath, rawPath);
  }
  removeSnapshotFile(filepath) {
    return rpc$1().removeSnapshotFile(filepath);
  }
  processStackTrace(stack) {
    const map = this.sourceMaps.get(stack.file);
    if (!map) {
      return stack;
    }
    let traceMap = this.traceMaps.get(stack.file);
    if (!traceMap) {
      traceMap = new DecodedMap$1(map, stack.file);
      this.traceMaps.set(stack.file, traceMap);
    }
    const position = getOriginalPosition$1(traceMap, stack);
    if (position) {
      return { ...stack, line: position.line, column: position.column };
    }
    return stack;
  }
}
function rpc$1() {
  return globalThis.__vitest_worker__.rpc;
}
const browserHashMap = /* @__PURE__ */ new Map();
function createBrowserRunner(runnerClass, mocker, state, coverageModule) {
  return class BrowserTestRunner extends runnerClass {
    config;
    hashMap = browserHashMap;
    sourceMapCache = /* @__PURE__ */ new Map();
    method = "run";
    commands;
    constructor(options) {
      super(options.config);
      this.config = options.config;
      this.commands = getBrowserState().commands;
      this.viteEnvironment = "__browser__";
    }
    setMethod(method) {
      this.method = method;
    }
    traces = /* @__PURE__ */ new Map();
    onBeforeTryTask = async (...args) => {
      var _a;
      await userEvent.cleanup();
      await ((_a = super.onBeforeTryTask) == null ? void 0 : _a.call(this, ...args));
      const trace = this.config.browser.trace;
      const test = args[0];
      if (trace === "off") {
        return;
      }
      const { retry, repeats } = args[1];
      if (trace === "on-all-retries" && retry === 0) {
        return;
      }
      if (trace === "on-first-retry" && retry !== 1) {
        return;
      }
      let title = getTestName(test);
      if (retry) {
        title += ` (retry x${retry})`;
      }
      if (repeats) {
        title += ` (repeat x${repeats})`;
      }
      const name = getTraceName(test, retry, repeats);
      await this.commands.triggerCommand(
        "__vitest_startChunkTrace",
        [{ name, title }]
      );
    };
    onAfterRetryTask = async (test, { retry, repeats }) => {
      const trace = this.config.browser.trace;
      if (trace === "off") {
        return;
      }
      if (trace === "on-all-retries" && retry === 0) {
        return;
      }
      if (trace === "on-first-retry" && retry !== 1) {
        return;
      }
      const name = getTraceName(test, retry, repeats);
      if (!this.traces.has(test.id)) {
        this.traces.set(test.id, []);
      }
      const traces = this.traces.get(test.id);
      const { tracePath } = await this.commands.triggerCommand(
        "__vitest_stopChunkTrace",
        [{ name }]
      );
      traces.push(tracePath);
    };
    onAfterRunTask = async (task) => {
      var _a, _b, _c;
      await ((_a = super.onAfterRunTask) == null ? void 0 : _a.call(this, task));
      const trace = this.config.browser.trace;
      const traces = this.traces.get(task.id) || [];
      if (traces.length) {
        if (trace === "retain-on-failure" && ((_b = task.result) == null ? void 0 : _b.state) === "pass") {
          await this.commands.triggerCommand(
            "__vitest_deleteTracing",
            [{ traces }]
          );
        } else {
          await this.commands.triggerCommand(
            "__vitest_annotateTraces",
            [{ testId: task.id, traces }]
          );
        }
      }
      if (this.config.bail && ((_c = task.result) == null ? void 0 : _c.state) === "fail") {
        const previousFailures = await rpc$2().getCountOfFailedTests();
        const currentFailures = 1 + previousFailures;
        if (currentFailures >= this.config.bail) {
          rpc$2().cancelCurrentRun("test-failure");
          this.cancel("test-failure");
        }
      }
    };
    onTaskFinished = async (task) => {
      var _a, _b;
      if (this.config.browser.screenshotFailures && document.body.clientHeight > 0 && ((_a = task.result) == null ? void 0 : _a.state) === "fail") {
        const screenshot = await page.screenshot(
          {
            timeout: ((_b = this.config.browser.providerOptions) == null ? void 0 : _b.actionTimeout) ?? 5e3
          }
          /** TODO */
        ).catch((err) => {
          console.error("[vitest] Failed to take a screenshot", err);
        });
        if (screenshot) {
          task.meta.failScreenshotPath = screenshot;
        }
      }
    };
    cancel = (reason) => {
      var _a;
      (_a = super.cancel) == null ? void 0 : _a.call(this, reason);
      globalChannel.postMessage({ type: "cancel", reason });
    };
    onBeforeRunSuite = async (suite) => {
      var _a;
      await Promise.all([
        (_a = super.onBeforeRunSuite) == null ? void 0 : _a.call(this, suite),
        (async () => {
          if (!("filepath" in suite)) {
            return;
          }
          const map = await rpc$2().getBrowserFileSourceMap(suite.filepath);
          this.sourceMapCache.set(suite.filepath, map);
          const snapshotEnvironment = this.config.snapshotOptions.snapshotEnvironment;
          if (snapshotEnvironment instanceof VitestBrowserSnapshotEnvironment) {
            snapshotEnvironment.addSourceMap(suite.filepath, map);
          }
        })()
      ]);
    };
    onAfterRunFiles = async (files) => {
      var _a, _b;
      const [coverage] = await Promise.all([
        (_a = coverageModule == null ? void 0 : coverageModule.takeCoverage) == null ? void 0 : _a.call(coverageModule),
        mocker.invalidate(),
        (_b = super.onAfterRunFiles) == null ? void 0 : _b.call(this, files)
      ]);
      if (coverage) {
        await rpc$2().onAfterSuiteRun({
          coverage,
          testFiles: files.map((file) => file.name),
          environment: "__browser__",
          projectName: this.config.name
        });
      }
    };
    onCollectStart = (file) => {
      return rpc$2().onQueued(this.method, file);
    };
    onCollected = async (files) => {
      files.forEach((file) => {
        file.prepareDuration = state.durations.prepare;
        file.environmentLoad = state.durations.environment;
        state.durations.prepare = 0;
        state.durations.environment = 0;
      });
      if (this.config.includeTaskLocation) {
        try {
          await updateTestFilesLocations(files, this.sourceMapCache);
        } catch {
        }
      }
      return rpc$2().onCollected(this.method, files);
    };
    onTestAnnotate = (test, annotation) => {
      const artifact = { type: "internal:annotation", annotation, location: annotation.location };
      return this.onTestArtifactRecord(test, artifact).then(({ annotation: annotation2 }) => annotation2);
    };
    onTestArtifactRecord = (test, artifact) => {
      if (artifact.location) {
        const map = this.sourceMapCache.get(artifact.location.file);
        if (!map) {
          return rpc$2().onTaskArtifactRecord(test.id, artifact);
        }
        const traceMap = new DecodedMap$1(map, artifact.location.file);
        const position = getOriginalPosition$1(traceMap, artifact.location);
        if (position) {
          const { source, column, line } = position;
          const file = source || artifact.location.file;
          artifact.location = {
            line,
            column: column + 1,
            // if the file path is on windows, we need to remove the starting slash
            file: file.match(/\/\w:\//) ? file.slice(1) : file
          };
          if (artifact.type === "internal:annotation") {
            artifact.annotation.location = artifact.location;
          }
        }
      }
      return rpc$2().onTaskArtifactRecord(test.id, artifact);
    };
    onTaskUpdate = (task, events) => {
      return rpc$2().onTaskUpdate(this.method, task, events);
    };
    importFile = async (filepath, mode) => {
      let hash = this.hashMap.get(filepath);
      if (mode === "setup" || !hash) {
        hash = Date.now().toString();
        this.hashMap.set(filepath, hash);
      }
      const prefix = `/${/^\w:/.test(filepath) ? "@fs/" : ""}`;
      const query = `browserv=${hash}`;
      const importpath = `${prefix}${filepath}?${query}`.replace(/\/+/g, "/");
      const trace = this.config.browser.trace;
      if (mode === "collect" && trace !== "off") {
        await this.commands.triggerCommand("__vitest_startTracing", []);
      }
      try {
        await import(
          /* @vite-ignore */
          importpath
        );
      } catch (err) {
        throw new Error(`Failed to import test file ${filepath}`, { cause: err });
      }
    };
    // disable tracing in the browser for now
    trace = void 0;
    __setTraces = void 0;
  };
}
let cachedRunner = null;
function getBrowserRunner() {
  return cachedRunner;
}
async function initiateRunner(state, mocker, config) {
  if (cachedRunner) {
    return cachedRunner;
  }
  const runnerClass = config.mode === "test" ? VitestTestRunner : NodeBenchmarkRunner;
  const BrowserRunner = createBrowserRunner(runnerClass, mocker, state, {
    takeCoverage: () => takeCoverageInsideWorker(config.coverage, moduleRunner)
  });
  if (!config.snapshotOptions.snapshotEnvironment) {
    config.snapshotOptions.snapshotEnvironment = new VitestBrowserSnapshotEnvironment();
  }
  const runner = new BrowserRunner({
    config
  });
  cachedRunner = runner;
  onCancel((reason) => {
    var _a;
    (_a = runner.cancel) == null ? void 0 : _a.call(runner, reason);
  });
  const [diffOptions] = await Promise.all([
    loadDiffConfig(config, moduleRunner),
    loadSnapshotSerializers(config, moduleRunner)
  ]);
  runner.config.diffOptions = diffOptions;
  getWorkerState().onFilterStackTrace = (stack) => {
    const stacks = parseStacktrace(stack, {
      getSourceMap(file) {
        return runner.sourceMapCache.get(file);
      }
    });
    return createStackString(stacks);
  };
  return runner;
}
async function getTraceMap(file, sourceMaps) {
  const result = sourceMaps.get(file) || await rpc$2().getBrowserFileSourceMap(file).then((map) => {
    sourceMaps.set(file, map);
    return map;
  });
  if (!result) {
    return null;
  }
  return new DecodedMap$1(result, file);
}
async function updateTestFilesLocations(files, sourceMaps) {
  const promises2 = files.map(async (file) => {
    const traceMap = await getTraceMap(file.filepath, sourceMaps);
    if (!traceMap) {
      return null;
    }
    const updateLocation = (task) => {
      if (task.location) {
        const position = getOriginalPosition$1(traceMap, task.location);
        if (position) {
          const { line, column } = position;
          task.location = { line, column: task.each ? column : column + 1 };
        }
      }
      if ("tasks" in task) {
        task.tasks.forEach(updateLocation);
      }
    };
    file.tasks.forEach(updateLocation);
    return null;
  });
  await Promise.all(promises2);
}
function getTraceName(task, retryCount, repeatsCount) {
  const name = getTestName(task, "-").replace(/[^a-z0-9]/gi, "-");
  return `${name}-${repeatsCount}-${retryCount}`;
}
const { Date: Date$1, console: console$1, performance: performance$1 } = globalThis;
function setupConsoleLogSpy() {
  const {
    log,
    info,
    error,
    dir,
    dirxml,
    trace,
    time,
    timeEnd,
    timeLog,
    warn,
    debug: debug2,
    count,
    countReset
  } = console$1;
  console$1.log = stdout(log);
  console$1.debug = stdout(debug2);
  console$1.info = stdout(info);
  console$1.error = stderr(error);
  console$1.warn = stderr(warn);
  console$1.dir = (item, options) => {
    dir(item, options);
    sendLog("stdout", browserFormat(item));
  };
  console$1.dirxml = (...args) => {
    dirxml(...args);
    sendLog("stdout", processLog(args));
  };
  console$1.trace = (...args) => {
    var _a;
    trace(...args);
    const content = processLog(args);
    const error2 = new Error("$$Trace");
    const processor = ((_a = globalThis.__vitest_worker__) == null ? void 0 : _a.onFilterStackTrace) || ((s) => s || "");
    const stack = processor(error2.stack || "");
    sendLog("stderr", `${content}
${stack}`, true);
  };
  const timeLabels = {};
  console$1.time = (label = "default") => {
    time(label);
    const now2 = performance$1.now();
    timeLabels[label] = now2;
  };
  console$1.timeLog = (label = "default") => {
    timeLog(label);
    if (!(label in timeLabels)) {
      sendLog("stderr", `Timer "${label}" does not exist`);
    } else {
      sendLog("stdout", `${label}: ${timeLabels[label]} ms`);
    }
  };
  console$1.timeEnd = (label = "default") => {
    timeEnd(label);
    const end = performance$1.now();
    const start = timeLabels[label];
    if (!(label in timeLabels)) {
      sendLog("stderr", `Timer "${label}" does not exist`);
    } else if (typeof start !== "undefined") {
      const duration = end - start;
      sendLog("stdout", `${label}: ${duration} ms`);
    }
  };
  const countLabels = {};
  console$1.count = (label = "default") => {
    count(label);
    const counter = (countLabels[label] ?? 0) + 1;
    countLabels[label] = counter;
    sendLog("stdout", `${label}: ${counter}`);
  };
  console$1.countReset = (label = "default") => {
    countReset(label);
    countLabels[label] = 0;
  };
}
function stdout(base) {
  return (...args) => {
    base(...args);
    if (args[0] === "[WDIO]") {
      if (args[1] === "newShadowRoot" || args[1] === "removeShadowRoot") {
        return;
      }
    }
    sendLog("stdout", processLog(args));
  };
}
function stderr(base) {
  return (...args) => {
    base(...args);
    sendLog("stderr", processLog(args));
  };
}
function processLog(args) {
  return browserFormat(...args);
}
function sendLog(type, content, disableStack) {
  var _a, _b, _c;
  if (content.startsWith("[vite]")) {
    return;
  }
  const unknownTestId = "__vitest__unknown_test__";
  const taskId = ((_b = (_a = globalThis.__vitest_worker__) == null ? void 0 : _a.current) == null ? void 0 : _b.id) ?? unknownTestId;
  const origin = getConfig().printConsoleTrace && !disableStack ? (_c = new Error("STACK_TRACE").stack) == null ? void 0 : _c.split("\n").slice(1).join("\n") : void 0;
  const runner = getBrowserRunner();
  rpc$2().sendLog((runner == null ? void 0 : runner.method) || "run", {
    origin,
    content,
    browser: true,
    time: Date$1.now(),
    taskId,
    type,
    size: content.length
  });
}
class MockerRegistry {
  registryByUrl = /* @__PURE__ */ new Map();
  registryById = /* @__PURE__ */ new Map();
  clear() {
    this.registryByUrl.clear();
    this.registryById.clear();
  }
  keys() {
    return this.registryByUrl.keys();
  }
  add(mock) {
    this.registryByUrl.set(mock.url, mock);
    this.registryById.set(mock.id, mock);
  }
  register(typeOrEvent, raw, id, url2, factoryOrRedirect) {
    const type = typeof typeOrEvent === "object" ? typeOrEvent.type : typeOrEvent;
    if (typeof typeOrEvent === "object") {
      const event = typeOrEvent;
      if (event instanceof AutomockedModule || event instanceof AutospiedModule || event instanceof ManualMockedModule || event instanceof RedirectedModule) {
        throw new TypeError(`[vitest] Cannot register a mock that is already defined. Expected a JSON representation from \`MockedModule.toJSON\`, instead got "${event.type}". Use "registry.add()" to update a mock instead.`);
      }
      if (event.type === "automock") {
        const module = AutomockedModule.fromJSON(event);
        this.add(module);
        return module;
      } else if (event.type === "autospy") {
        const module = AutospiedModule.fromJSON(event);
        this.add(module);
        return module;
      } else if (event.type === "redirect") {
        const module = RedirectedModule.fromJSON(event);
        this.add(module);
        return module;
      } else if (event.type === "manual") {
        throw new Error(`Cannot set serialized manual mock. Define a factory function manually with \`ManualMockedModule.fromJSON()\`.`);
      } else {
        throw new Error(`Unknown mock type: ${event.type}`);
      }
    }
    if (typeof raw !== "string") {
      throw new TypeError("[vitest] Mocks require a raw string.");
    }
    if (typeof url2 !== "string") {
      throw new TypeError("[vitest] Mocks require a url string.");
    }
    if (typeof id !== "string") {
      throw new TypeError("[vitest] Mocks require an id string.");
    }
    if (type === "manual") {
      if (typeof factoryOrRedirect !== "function") {
        throw new TypeError("[vitest] Manual mocks require a factory function.");
      }
      const mock = new ManualMockedModule(raw, id, url2, factoryOrRedirect);
      this.add(mock);
      return mock;
    } else if (type === "automock" || type === "autospy") {
      const mock = type === "automock" ? new AutomockedModule(raw, id, url2) : new AutospiedModule(raw, id, url2);
      this.add(mock);
      return mock;
    } else if (type === "redirect") {
      if (typeof factoryOrRedirect !== "string") {
        throw new TypeError("[vitest] Redirect mocks require a redirect string.");
      }
      const mock = new RedirectedModule(raw, id, url2, factoryOrRedirect);
      this.add(mock);
      return mock;
    } else {
      throw new Error(`[vitest] Unknown mock type: ${type}`);
    }
  }
  delete(id) {
    this.registryByUrl.delete(id);
  }
  deleteById(id) {
    this.registryById.delete(id);
  }
  get(id) {
    return this.registryByUrl.get(id);
  }
  getById(id) {
    return this.registryById.get(id);
  }
  has(id) {
    return this.registryByUrl.has(id);
  }
}
class AutomockedModule {
  type = "automock";
  constructor(raw, id, url2) {
    this.raw = raw;
    this.id = id;
    this.url = url2;
  }
  static fromJSON(data) {
    return new AutospiedModule(data.raw, data.id, data.url);
  }
  toJSON() {
    return {
      type: this.type,
      url: this.url,
      raw: this.raw,
      id: this.id
    };
  }
}
class AutospiedModule {
  type = "autospy";
  constructor(raw, id, url2) {
    this.raw = raw;
    this.id = id;
    this.url = url2;
  }
  static fromJSON(data) {
    return new AutospiedModule(data.raw, data.id, data.url);
  }
  toJSON() {
    return {
      type: this.type,
      url: this.url,
      id: this.id,
      raw: this.raw
    };
  }
}
class RedirectedModule {
  type = "redirect";
  constructor(raw, id, url2, redirect) {
    this.raw = raw;
    this.id = id;
    this.url = url2;
    this.redirect = redirect;
  }
  static fromJSON(data) {
    return new RedirectedModule(data.raw, data.id, data.url, data.redirect);
  }
  toJSON() {
    return {
      type: this.type,
      url: this.url,
      raw: this.raw,
      id: this.id,
      redirect: this.redirect
    };
  }
}
class ManualMockedModule {
  cache;
  type = "manual";
  constructor(raw, id, url2, factory) {
    this.raw = raw;
    this.id = id;
    this.url = url2;
    this.factory = factory;
  }
  async resolve() {
    if (this.cache) {
      return this.cache;
    }
    let exports$1;
    try {
      exports$1 = await this.factory();
    } catch (err) {
      const vitestError = new Error('[vitest] There was an error when mocking a module. If you are using "vi.mock" factory, make sure there are no top level variables inside, since this call is hoisted to top of the file. Read more: https://vitest.dev/api/vi.html#vi-mock');
      vitestError.cause = err;
      throw vitestError;
    }
    if (exports$1 === null || typeof exports$1 !== "object" || Array.isArray(exports$1)) {
      throw new TypeError(`[vitest] vi.mock("${this.raw}", factory?: () => unknown) is not returning an object. Did you mean to return an object with a "default" key?`);
    }
    return this.cache = exports$1;
  }
  static fromJSON(data, factory) {
    return new ManualMockedModule(data.raw, data.id, data.url, factory);
  }
  toJSON() {
    return {
      type: this.type,
      url: this.url,
      id: this.id,
      raw: this.raw
    };
  }
}
function mockObject(options, object2, mockExports = {}) {
  const finalizers = new Array();
  const refs = new RefTracker();
  const define = (container, key, value) => {
    try {
      container[key] = value;
      return true;
    } catch {
      return false;
    }
  };
  const createMock = (currentValue) => {
    if (!options.createMockInstance) {
      throw new Error("[@vitest/mocker] `createMockInstance` is not defined. This is a Vitest error. Please open a new issue with reproduction.");
    }
    const createMockInstance = options.createMockInstance;
    const prototypeMembers = currentValue.prototype ? collectFunctionProperties(currentValue.prototype) : [];
    return createMockInstance({
      name: currentValue.name,
      prototypeMembers,
      originalImplementation: options.type === "autospy" ? currentValue : void 0,
      keepMembersImplementation: options.type === "autospy"
    });
  };
  const mockPropertiesOf = (container, newContainer) => {
    const containerType = getType(container);
    const isModule = containerType === "Module" || !!container.__esModule;
    for (const { key: property, descriptor } of getAllMockableProperties(container, isModule, options.globalConstructors)) {
      if (!isModule && descriptor.get) {
        try {
          if (options.type === "autospy") {
            Object.defineProperty(newContainer, property, descriptor);
          } else {
            Object.defineProperty(newContainer, property, {
              configurable: descriptor.configurable,
              enumerable: descriptor.enumerable,
              get: () => {
              },
              set: descriptor.set ? () => {
              } : void 0
            });
          }
        } catch {
        }
        continue;
      }
      if (isReadonlyProp(container[property], property)) {
        continue;
      }
      const value = container[property];
      const refId = refs.getId(value);
      if (refId !== void 0) {
        finalizers.push(() => define(newContainer, property, refs.getMockedValue(refId)));
        continue;
      }
      const type = getType(value);
      if (Array.isArray(value)) {
        if (options.type === "automock") {
          define(newContainer, property, []);
        } else {
          const array = value.map((value2) => {
            if (value2 && typeof value2 === "object") {
              const newObject = {};
              mockPropertiesOf(value2, newObject);
              return newObject;
            }
            if (typeof value2 === "function") {
              return createMock(value2);
            }
            return value2;
          });
          define(newContainer, property, array);
        }
        continue;
      }
      const isFunction = type.includes("Function") && typeof value === "function";
      if ((!isFunction || value._isMockFunction) && type !== "Object" && type !== "Module") {
        define(newContainer, property, value);
        continue;
      }
      if (!define(newContainer, property, isFunction || options.type === "autospy" ? value : {})) {
        continue;
      }
      if (isFunction) {
        const mock = createMock(newContainer[property]);
        newContainer[property] = mock;
      }
      refs.track(value, newContainer[property]);
      mockPropertiesOf(value, newContainer[property]);
    }
  };
  const mockedObject = mockExports;
  mockPropertiesOf(object2, mockedObject);
  for (const finalizer of finalizers) {
    finalizer();
  }
  return mockedObject;
}
class RefTracker {
  idMap = /* @__PURE__ */ new Map();
  mockedValueMap = /* @__PURE__ */ new Map();
  getId(value) {
    return this.idMap.get(value);
  }
  getMockedValue(id) {
    return this.mockedValueMap.get(id);
  }
  track(originalValue, mockedValue) {
    const newId = this.idMap.size;
    this.idMap.set(originalValue, newId);
    this.mockedValueMap.set(newId, mockedValue);
    return newId;
  }
}
function getType(value) {
  return Object.prototype.toString.apply(value).slice(8, -1);
}
function isReadonlyProp(object2, prop) {
  if (prop === "arguments" || prop === "caller" || prop === "callee" || prop === "name" || prop === "length") {
    const typeName = getType(object2);
    return typeName === "Function" || typeName === "AsyncFunction" || typeName === "GeneratorFunction" || typeName === "AsyncGeneratorFunction";
  }
  if (prop === "source" || prop === "global" || prop === "ignoreCase" || prop === "multiline") {
    return getType(object2) === "RegExp";
  }
  return false;
}
function getAllMockableProperties(obj, isModule, constructors) {
  const { Map: Map2, Object: Object2, Function: Function2, RegExp: RegExp2, Array: Array2 } = constructors;
  const allProps = new Map2();
  let curr = obj;
  do {
    if (curr === Object2.prototype || curr === Function2.prototype || curr === RegExp2.prototype) {
      break;
    }
    collectOwnProperties(curr, (key) => {
      const descriptor = Object2.getOwnPropertyDescriptor(curr, key);
      if (descriptor) {
        allProps.set(key, {
          key,
          descriptor
        });
      }
    });
  } while (curr = Object2.getPrototypeOf(curr));
  if (isModule && !allProps.has("default") && "default" in obj) {
    const descriptor = Object2.getOwnPropertyDescriptor(obj, "default");
    if (descriptor) {
      allProps.set("default", {
        key: "default",
        descriptor
      });
    }
  }
  return Array2.from(allProps.values());
}
function collectOwnProperties(obj, collector) {
  const collect = typeof collector === "function" ? collector : (key) => collector.add(key);
  Object.getOwnPropertyNames(obj).forEach(collect);
  Object.getOwnPropertySymbols(obj).forEach(collect);
}
function collectFunctionProperties(prototype) {
  const properties = /* @__PURE__ */ new Set();
  collectOwnProperties(prototype, (prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, prop);
    if (!descriptor || descriptor.get) {
      return;
    }
    const type = getType(descriptor.value);
    if (type.includes("Function") && !isReadonlyProp(descriptor.value, prop)) {
      properties.add(prop);
    }
  });
  return Array.from(properties);
}
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
const _EXTNAME_RE = /.(\.[^./]+|\.)$/;
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
const join = function(...segments) {
  let path = "";
  for (const seg of segments) {
    if (!seg) {
      continue;
    }
    if (path.length > 0) {
      const pathTrailing = path[path.length - 1] === "/";
      const segLeading = seg[0] === "/";
      const both = pathTrailing && segLeading;
      if (both) {
        path += seg.slice(1);
      } else {
        path += pathTrailing || segLeading ? seg : `/${seg}`;
      }
    } else {
      path += seg;
    }
  }
  return normalize(path);
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
      if (lastSlash === index - 1 || dots === 1) ;
      else if (dots === 2) {
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
const extname = function(p) {
  if (p === "..") return "";
  const match = _EXTNAME_RE.exec(normalizeWindowsPath(p));
  return match && match[1] || "";
};
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  const c = chars.charCodeAt(i);
  intToChar[i] = c;
  charToInt[c] = i;
}
const { now } = Date;
class ModuleMocker {
  registry = new MockerRegistry();
  queue = /* @__PURE__ */ new Set();
  mockedIds = /* @__PURE__ */ new Set();
  constructor(interceptor, rpc2, createMockInstance, config) {
    this.interceptor = interceptor;
    this.rpc = rpc2;
    this.createMockInstance = createMockInstance;
    this.config = config;
  }
  async prepare() {
    if (!this.queue.size) {
      return;
    }
    await Promise.all([...this.queue.values()]);
  }
  async resolveFactoryModule(id) {
    const mock = this.registry.get(id);
    if (!mock || mock.type !== "manual") {
      throw new Error(`Mock ${id} wasn't registered. This is probably a Vitest error. Please, open a new issue with reproduction.`);
    }
    const result = await mock.resolve();
    return result;
  }
  getFactoryModule(id) {
    const mock = this.registry.get(id);
    if (!mock || mock.type !== "manual") {
      throw new Error(`Mock ${id} wasn't registered. This is probably a Vitest error. Please, open a new issue with reproduction.`);
    }
    if (!mock.cache) {
      throw new Error(`Mock ${id} wasn't resolved. This is probably a Vitest error. Please, open a new issue with reproduction.`);
    }
    return mock.cache;
  }
  async invalidate() {
    const ids = Array.from(this.mockedIds);
    if (!ids.length) {
      return;
    }
    await this.rpc.invalidate(ids);
    await this.interceptor.invalidate();
    this.registry.clear();
  }
  async importActual(id, importer) {
    const resolved = await this.rpc.resolveId(id, importer);
    if (resolved == null) {
      throw new Error(`[vitest] Cannot resolve "${id}" imported from "${importer}"`);
    }
    const ext = extname(resolved.id);
    const url2 = new URL(resolved.url, location.href);
    const query = `_vitest_original&ext${ext}`;
    const actualUrl = `${url2.pathname}${url2.search ? `${url2.search}&${query}` : `?${query}`}${url2.hash}`;
    return this.wrapDynamicImport(() => import(
      /* @vite-ignore */
      actualUrl
    )).then((mod) => {
      if (!resolved.optimized || typeof mod.default === "undefined") {
        return mod;
      }
      const m = mod.default;
      return (m === null || m === void 0 ? void 0 : m.__esModule) ? m : {
        ...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},
        default: m
      };
    });
  }
  async importMock(rawId, importer) {
    await this.prepare();
    const { resolvedId, resolvedUrl, redirectUrl } = await this.rpc.resolveMock(rawId, importer, { mock: "auto" });
    const mockUrl = this.resolveMockPath(cleanVersion(resolvedUrl));
    let mock = this.registry.get(mockUrl);
    if (!mock) {
      if (redirectUrl) {
        const resolvedRedirect = new URL(this.resolveMockPath(cleanVersion(redirectUrl)), location.href).toString();
        mock = new RedirectedModule(rawId, resolvedId, mockUrl, resolvedRedirect);
      } else {
        mock = new AutomockedModule(rawId, resolvedId, mockUrl);
      }
    }
    if (mock.type === "manual") {
      return await mock.resolve();
    }
    if (mock.type === "automock" || mock.type === "autospy") {
      const url2 = new URL(`/@id/${resolvedId}`, location.href);
      const query = url2.search ? `${url2.search}&t=${now()}` : `?t=${now()}`;
      const moduleObject = await __vitePreload(() => import(
        /* @vite-ignore */
        `${url2.pathname}${query}&mock=${mock.type}${url2.hash}`
      ), true ? [] : void 0);
      return this.mockObject(moduleObject, mock.type);
    }
    return import(
      /* @vite-ignore */
      mock.redirect
    );
  }
  mockObject(object2, moduleType = "automock") {
    return mockObject({
      globalConstructors: {
        Object,
        Function,
        Array,
        Map,
        RegExp
      },
      createMockInstance: this.createMockInstance,
      type: moduleType
    }, object2);
  }
  queueMock(rawId, importer, factoryOrOptions) {
    const promise = this.rpc.resolveMock(rawId, importer, { mock: typeof factoryOrOptions === "function" ? "factory" : (factoryOrOptions === null || factoryOrOptions === void 0 ? void 0 : factoryOrOptions.spy) ? "spy" : "auto" }).then(async ({ redirectUrl, resolvedId, resolvedUrl, needsInterop, mockType }) => {
      const mockUrl = this.resolveMockPath(cleanVersion(resolvedUrl));
      this.mockedIds.add(resolvedId);
      const factory = typeof factoryOrOptions === "function" ? async () => {
        const data = await factoryOrOptions();
        return needsInterop ? { default: data } : data;
      } : void 0;
      const mockRedirect = typeof redirectUrl === "string" ? new URL(this.resolveMockPath(cleanVersion(redirectUrl)), location.href).toString() : null;
      let module;
      if (mockType === "manual") {
        module = this.registry.register("manual", rawId, resolvedId, mockUrl, factory);
      } else if (mockType === "autospy") {
        module = this.registry.register("autospy", rawId, resolvedId, mockUrl);
      } else if (mockType === "redirect") {
        module = this.registry.register("redirect", rawId, resolvedId, mockUrl, mockRedirect);
      } else {
        module = this.registry.register("automock", rawId, resolvedId, mockUrl);
      }
      await this.interceptor.register(module);
    }).finally(() => {
      this.queue.delete(promise);
    });
    this.queue.add(promise);
  }
  queueUnmock(id, importer) {
    const promise = this.rpc.resolveId(id, importer).then(async (resolved) => {
      if (!resolved) {
        return;
      }
      const mockUrl = this.resolveMockPath(cleanVersion(resolved.url));
      this.mockedIds.add(resolved.id);
      this.registry.delete(mockUrl);
      await this.interceptor.delete(mockUrl);
    }).finally(() => {
      this.queue.delete(promise);
    });
    this.queue.add(promise);
  }
  // We need to await mock registration before importing the actual module
  // In case there is a mocked module in the import chain
  wrapDynamicImport(moduleFactory) {
    if (typeof moduleFactory === "function") {
      const promise = new Promise((resolve2, reject) => {
        this.prepare().finally(() => {
          moduleFactory().then(resolve2, reject);
        });
      });
      return promise;
    }
    return moduleFactory;
  }
  resolveMockPath(path) {
    const config = this.config;
    const fsRoot = join("/@fs/", config.root);
    if (path.startsWith(config.root)) {
      return path.slice(config.root.length);
    }
    if (path.startsWith(fsRoot)) {
      return path.slice(fsRoot.length);
    }
    return path;
  }
}
const versionRegexp = /(\?|&)v=\w{8}/;
function cleanVersion(url2) {
  return url2.replace(versionRegexp, "");
}
class VitestBrowserClientMocker extends ModuleMocker {
  // default "vi" utility tries to access mock context to avoid circular dependencies
  getMockContext() {
    return { callstack: null };
  }
  wrapDynamicImport(moduleFactory) {
    return getBrowserState().wrapModule(moduleFactory);
  }
}
function createModuleMockerInterceptor() {
  return {
    async register(module) {
      const state = getBrowserState();
      await rpc().registerMock(state.sessionId, module.toJSON());
    },
    async delete(id) {
      const state = getBrowserState();
      await rpc().unregisterMock(state.sessionId, id);
    },
    async invalidate() {
      const state = getBrowserState();
      await rpc().clearMocks(state.sessionId);
    }
  };
}
function rpc() {
  return getWorkerState().rpc;
}
getBrowserState().provider;
class CommandsManager {
  _listeners = [];
  onCommand(listener) {
    this._listeners.push(listener);
  }
  async triggerCommand(command, args, clientError = new Error("empty")) {
    var _a, _b;
    const state = getWorkerState();
    const rpc2 = state.rpc;
    const { sessionId } = getBrowserState();
    const filepath = state.filepath || ((_b = (_a = state.current) == null ? void 0 : _a.file) == null ? void 0 : _b.filepath);
    args = args.filter((arg) => arg !== void 0);
    if (this._listeners.length) {
      await Promise.all(this._listeners.map((listener) => listener(command, args)));
    }
    return rpc2.triggerCommand(sessionId, command, filepath, args).catch((err) => {
      var _a2;
      clientError.message = err.message;
      clientError.name = err.name;
      clientError.stack = (_a2 = clientError.stack) == null ? void 0 : _a2.replace(clientError.message, err.message);
      throw clientError;
    });
  }
}
const debugVar = getConfig().env.VITEST_BROWSER_DEBUG;
const debug = debugVar && debugVar !== "false" ? (...args) => {
  var _a, _b;
  return (_b = (_a = client.rpc).debug) == null ? void 0 : _b.call(_a, ...args.map(String));
} : void 0;
channel.addEventListener("message", async (e) => {
  await client.waitForConnection();
  const data = e.data;
  debug == null ? void 0 : debug("event from orchestrator", JSON.stringify(e.data));
  if (!isEvent(data)) {
    const error = new Error(`Unknown message: ${JSON.stringify(e.data)}`);
    unhandledError(error, "Unknown Iframe Message");
    return;
  }
  if (!("iframeId" in data) || data.iframeId !== getBrowserState().iframeId) {
    return;
  }
  switch (data.event) {
    case "execute": {
      const { method, files, context } = data;
      const state = getWorkerState();
      const parsedContext = parse(context);
      state.ctx.providedContext = parsedContext;
      state.providedContext = parsedContext;
      if (method === "collect") {
        await executeTests("collect", files).catch((err) => unhandledError(err, "Collect Error"));
      } else {
        await executeTests("run", files).catch((err) => unhandledError(err, "Run Error"));
      }
      break;
    }
    case "cleanup": {
      await cleanup().catch((err) => unhandledError(err, "Cleanup Error"));
      break;
    }
    case "prepare": {
      await prepare(data).catch((err) => unhandledError(err, "Prepare Error"));
      break;
    }
    case "viewport:done":
    case "viewport:fail":
    case "viewport": {
      break;
    }
    default: {
      const error = new Error(`Unknown event: ${data.event}`);
      unhandledError(error, "Unknown Event");
    }
  }
  channel.postMessage({
    event: `response:${data.event}`,
    iframeId: getBrowserState().iframeId
  });
});
const url = new URL(location.href);
const iframeId = url.searchParams.get("iframeId");
const commands = new CommandsManager();
getBrowserState().commands = commands;
getBrowserState().iframeId = iframeId;
let contextSwitched = false;
async function prepareTestEnvironment(options) {
  debug == null ? void 0 : debug("trying to resolve the runner");
  const config = getConfig();
  const rpc2 = createSafeRpc(client);
  const state = getWorkerState();
  state.metaEnv = __vitest_browser_import_meta_env_init__;
  state.onCancel = onCancel;
  state.ctx.rpc = rpc2;
  state.rpc = rpc2;
  const interceptor = createModuleMockerInterceptor();
  const mocker = new VitestBrowserClientMocker(
    interceptor,
    rpc2,
    SpyModule.createMockInstance,
    {
      root: getBrowserState().viteConfig.root
    }
  );
  globalThis.__vitest_mocker__ = mocker;
  setupConsoleLogSpy();
  setupDialogsSpy();
  const runner = await initiateRunner(state, mocker, config);
  getBrowserState().runner = runner;
  if (server.provider === "webdriverio") {
    let switchPromise = null;
    commands.onCommand(async () => {
      if (switchPromise) {
        await switchPromise;
      }
      if (!contextSwitched) {
        switchPromise = rpc2.wdioSwitchContext("iframe").finally(() => {
          switchPromise = null;
          contextSwitched = true;
        });
        await switchPromise;
      }
    });
  }
  state.durations.prepare = performance.now() - options.startTime;
  return {
    runner,
    config,
    state
  };
}
let preparedData;
async function executeTests(method, specifications) {
  if (!preparedData) {
    throw new Error(`Data was not properly initialized. This is a bug in Vitest. Please, open a new issue with reproduction.`);
  }
  debug == null ? void 0 : debug("runner resolved successfully");
  const { runner, state } = preparedData;
  state.ctx.files = specifications;
  runner.setMethod(method);
  const version = url.searchParams.get("browserv") || "";
  specifications.forEach(({ filepath }) => {
    const currentVersion = browserHashMap.get(filepath);
    if (!currentVersion || currentVersion[1] !== version) {
      browserHashMap.set(filepath, version);
    }
  });
  for (const file of specifications) {
    state.filepath = file.filepath;
    debug == null ? void 0 : debug("running test file", file.filepath);
    if (method === "run") {
      await startTests([file], runner);
    } else {
      await collectTests([file], runner);
    }
  }
}
async function prepare(options) {
  preparedData = await prepareTestEnvironment(options);
  debug == null ? void 0 : debug("runner resolved successfully");
  const { config, state } = preparedData;
  state.durations.prepare = performance.now() - state.durations.prepare;
  debug == null ? void 0 : debug("prepare time", state.durations.prepare, "ms");
  await Promise.all([
    setupCommonEnv(config),
    startCoverageInsideWorker(config.coverage, moduleRunner, { isolate: config.browser.isolate }),
    (async () => {
      const VitestIndex = await __vitePreload(() => import("vitest"), true ? [] : void 0);
      Object.defineProperty(window, "__vitest_index__", {
        value: VitestIndex,
        enumerable: false
      });
    })()
  ]);
  if (!config.browser.trackUnhandledErrors) {
    getBrowserState().disposeExceptionTracker();
  }
}
async function cleanup() {
  const state = getWorkerState();
  const config = getConfig();
  const rpc2 = state.rpc;
  const cleanupSymbol = Symbol.for("vitest:component-cleanup");
  if (cleanupSymbol in page) {
    try {
      await page[cleanupSymbol]();
    } catch (error) {
      await unhandledError(error, "Cleanup Error");
    }
  }
  await userEvent.cleanup().catch((error) => unhandledError(error, "Cleanup Error"));
  await Promise.all(
    getBrowserState().cleanups.map((fn) => fn())
  ).catch((error) => unhandledError(error, "Cleanup Error"));
  if (contextSwitched) {
    await rpc2.wdioSwitchContext("parent").catch((error) => unhandledError(error, "Cleanup Error"));
  }
  await stopCoverageInsideWorker(config.coverage, moduleRunner, { isolate: config.browser.isolate }).catch((error) => {
    return unhandledError(error, "Coverage Error");
  });
}
function unhandledError(e, type) {
  return client.rpc.onUnhandledError({
    name: e.name,
    message: e.message,
    stack: e.stack
  }, type).catch(() => {
  });
}
function isEvent(data) {
  return typeof data === "object" && !!data && "event" in data;
}
