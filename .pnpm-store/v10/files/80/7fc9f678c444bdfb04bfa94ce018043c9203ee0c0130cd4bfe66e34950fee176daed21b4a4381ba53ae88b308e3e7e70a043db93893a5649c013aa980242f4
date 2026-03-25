const VALID_ID_PREFIX = "/@id/", NULL_BYTE_PLACEHOLDER = "__x00__";
let SOURCEMAPPING_URL = "sourceMa";
SOURCEMAPPING_URL += "ppingURL";
const ERR_OUTDATED_OPTIMIZED_DEP = "ERR_OUTDATED_OPTIMIZED_DEP", isWindows = typeof process < "u" && process.platform === "win32";
function unwrapId(id) {
  return id.startsWith(VALID_ID_PREFIX) ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, "\0") : id;
}
const windowsSlashRE = /\\/g;
function slash(p) {
  return p.replace(windowsSlashRE, "/");
}
const postfixRE = /[?#].*$/;
function cleanUrl(url) {
  return url.replace(postfixRE, "");
}
function isPrimitive(value) {
  return !value || typeof value != "object" && typeof value != "function";
}
const AsyncFunction = async function() {
}.constructor;
let asyncFunctionDeclarationPaddingLineCount;
function getAsyncFunctionDeclarationPaddingLineCount() {
  if (typeof asyncFunctionDeclarationPaddingLineCount > "u") {
    const body = "/*code*/", source = new AsyncFunction("a", "b", body).toString();
    asyncFunctionDeclarationPaddingLineCount = source.slice(0, source.indexOf(body)).split(`
`).length - 1;
  }
  return asyncFunctionDeclarationPaddingLineCount;
}
function promiseWithResolvers() {
  let resolve2, reject;
  return { promise: new Promise((_resolve, _reject) => {
    resolve2 = _resolve, reject = _reject;
  }), resolve: resolve2, reject };
}
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  return input && input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/, _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  return typeof process < "u" && typeof process.cwd == "function" ? process.cwd().replace(/\\/g, "/") : "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "", resolvedAbsolute = !1;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    !path || path.length === 0 || (resolvedPath = `${path}/${resolvedPath}`, resolvedAbsolute = isAbsolute(path));
  }
  return resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute), resolvedAbsolute && !isAbsolute(resolvedPath) ? `/${resolvedPath}` : resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length)
      char = path[index];
    else {
      if (char === "/")
        break;
      char = "/";
    }
    if (char === "/") {
      if (!(lastSlash === index - 1 || dots === 1)) if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            lastSlashIndex === -1 ? (res = "", lastSegmentLength = 0) : (res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/")), lastSlash = index, dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "", lastSegmentLength = 0, lastSlash = index, dots = 0;
            continue;
          }
        }
        allowAboveRoot && (res += res.length > 0 ? "/.." : "..", lastSegmentLength = 2);
      } else
        res.length > 0 ? res += `/${path.slice(lastSlash + 1, index)}` : res = path.slice(lastSlash + 1, index), lastSegmentLength = index - lastSlash - 1;
      lastSlash = index, dots = 0;
    } else char === "." && dots !== -1 ? ++dots : dots = -1;
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
}, dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  return segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0]) && (segments[0] += "/"), segments.join("/") || (isAbsolute(p) ? "/" : ".");
}, decodeBase64 = typeof atob < "u" ? atob : (str) => Buffer.from(str, "base64").toString("utf-8"), CHAR_FORWARD_SLASH = 47, CHAR_BACKWARD_SLASH = 92, percentRegEx = /%/g, backslashRegEx = /\\/g, newlineRegEx = /\n/g, carriageReturnRegEx = /\r/g, tabRegEx = /\t/g, questionRegex = /\?/g, hashRegex = /#/g;
function encodePathChars(filepath) {
  return filepath.indexOf("%") !== -1 && (filepath = filepath.replace(percentRegEx, "%25")), !isWindows && filepath.indexOf("\\") !== -1 && (filepath = filepath.replace(backslashRegEx, "%5C")), filepath.indexOf(`
`) !== -1 && (filepath = filepath.replace(newlineRegEx, "%0A")), filepath.indexOf("\r") !== -1 && (filepath = filepath.replace(carriageReturnRegEx, "%0D")), filepath.indexOf("	") !== -1 && (filepath = filepath.replace(tabRegEx, "%09")), filepath;
}
const posixDirname = dirname, posixResolve = resolve;
function posixPathToFileHref(posixPath) {
  let resolved = posixResolve(posixPath);
  const filePathLast = posixPath.charCodeAt(posixPath.length - 1);
  return (filePathLast === CHAR_FORWARD_SLASH || isWindows && filePathLast === CHAR_BACKWARD_SLASH) && resolved[resolved.length - 1] !== "/" && (resolved += "/"), resolved = encodePathChars(resolved), resolved.indexOf("?") !== -1 && (resolved = resolved.replace(questionRegex, "%3F")), resolved.indexOf("#") !== -1 && (resolved = resolved.replace(hashRegex, "%23")), new URL(`file://${resolved}`).href;
}
function toWindowsPath(path) {
  return path.replace(/\//g, "\\");
}
const comma = 44, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", intToChar = new Uint8Array(64), charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  const c = chars.charCodeAt(i);
  intToChar[i] = c, charToInt[c] = i;
}
function decodeInteger(reader, relative) {
  let value = 0, shift = 0, integer = 0;
  do {
    const c = reader.next();
    integer = charToInt[c], value |= (integer & 31) << shift, shift += 5;
  } while (integer & 32);
  const shouldNegate = value & 1;
  return value >>>= 1, shouldNegate && (value = -2147483648 | -value), relative + value;
}
function hasMoreVlq(reader, max) {
  return reader.pos >= max ? !1 : reader.peek() !== comma;
}
class StringReader {
  constructor(buffer) {
    this.pos = 0, this.buffer = buffer;
  }
  next() {
    return this.buffer.charCodeAt(this.pos++);
  }
  peek() {
    return this.buffer.charCodeAt(this.pos);
  }
  indexOf(char) {
    const { buffer, pos } = this, idx = buffer.indexOf(char, pos);
    return idx === -1 ? buffer.length : idx;
  }
}
function decode(mappings) {
  const { length } = mappings, reader = new StringReader(mappings), decoded = [];
  let genColumn = 0, sourcesIndex = 0, sourceLine = 0, sourceColumn = 0, namesIndex = 0;
  do {
    const semi = reader.indexOf(";"), line = [];
    let sorted = !0, lastCol = 0;
    for (genColumn = 0; reader.pos < semi; ) {
      let seg;
      genColumn = decodeInteger(reader, genColumn), genColumn < lastCol && (sorted = !1), lastCol = genColumn, hasMoreVlq(reader, semi) ? (sourcesIndex = decodeInteger(reader, sourcesIndex), sourceLine = decodeInteger(reader, sourceLine), sourceColumn = decodeInteger(reader, sourceColumn), hasMoreVlq(reader, semi) ? (namesIndex = decodeInteger(reader, namesIndex), seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex]) : seg = [genColumn, sourcesIndex, sourceLine, sourceColumn]) : seg = [genColumn], line.push(seg), reader.pos++;
    }
    sorted || sort(line), decoded.push(line), reader.pos = semi + 1;
  } while (reader.pos <= length);
  return decoded;
}
function sort(line) {
  line.sort(sortComparator);
}
function sortComparator(a, b) {
  return a[0] - b[0];
}
const COLUMN = 0, SOURCES_INDEX = 1, SOURCE_LINE = 2, SOURCE_COLUMN = 3, NAMES_INDEX = 4;
let found = !1;
function binarySearch(haystack, needle, low, high) {
  for (; low <= high; ) {
    const mid = low + (high - low >> 1), cmp = haystack[mid][COLUMN] - needle;
    if (cmp === 0)
      return found = !0, mid;
    cmp < 0 ? low = mid + 1 : high = mid - 1;
  }
  return found = !1, low - 1;
}
function upperBound(haystack, needle, index) {
  for (let i = index + 1; i < haystack.length && haystack[i][COLUMN] === needle; index = i++)
    ;
  return index;
}
function lowerBound(haystack, needle, index) {
  for (let i = index - 1; i >= 0 && haystack[i][COLUMN] === needle; index = i--)
    ;
  return index;
}
function memoizedBinarySearch(haystack, needle, state, key) {
  const { lastKey, lastNeedle, lastIndex } = state;
  let low = 0, high = haystack.length - 1;
  if (key === lastKey) {
    if (needle === lastNeedle)
      return found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle, lastIndex;
    needle >= lastNeedle ? low = lastIndex === -1 ? 0 : lastIndex : high = lastIndex;
  }
  return state.lastKey = key, state.lastNeedle = needle, state.lastIndex = binarySearch(haystack, needle, low, high);
}
const LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)", COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)", LEAST_UPPER_BOUND = -1, GREATEST_LOWER_BOUND = 1;
function cast(map) {
  return map;
}
function decodedMappings(map) {
  var _a;
  return (_a = map)._decoded || (_a._decoded = decode(map._encoded));
}
function originalPositionFor(map, needle) {
  let { line, column, bias } = needle;
  if (line--, line < 0)
    throw new Error(LINE_GTR_ZERO);
  if (column < 0)
    throw new Error(COL_GTR_EQ_ZERO);
  const decoded = decodedMappings(map);
  if (line >= decoded.length)
    return OMapping(null, null, null, null);
  const segments = decoded[line], index = traceSegmentInternal(segments, map._decodedMemo, line, column, bias || GREATEST_LOWER_BOUND);
  if (index === -1)
    return OMapping(null, null, null, null);
  const segment = segments[index];
  if (segment.length === 1)
    return OMapping(null, null, null, null);
  const { names, resolvedSources } = map;
  return OMapping(resolvedSources[segment[SOURCES_INDEX]], segment[SOURCE_LINE] + 1, segment[SOURCE_COLUMN], segment.length === 5 ? names[segment[NAMES_INDEX]] : null);
}
function OMapping(source, line, column, name) {
  return { source, line, column, name };
}
function traceSegmentInternal(segments, memo, line, column, bias) {
  let index = memoizedBinarySearch(segments, column, memo, line);
  return found ? index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index) : bias === LEAST_UPPER_BOUND && index++, index === -1 || index === segments.length ? -1 : index;
}
class DecodedMap {
  constructor(map, from) {
    this.map = map;
    const { mappings, names, sources } = map;
    this.version = map.version, this.names = names || [], this._encoded = mappings || "", this._decodedMemo = memoizedState(), this.url = from, this.resolvedSources = (sources || []).map(
      (s) => posixResolve(s || "", from)
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
  return result.column == null ? null : result;
}
const MODULE_RUNNER_SOURCEMAPPING_REGEXP = new RegExp(
  `//# ${SOURCEMAPPING_URL}=data:application/json;base64,(.+)`
);
class EvaluatedModuleNode {
  constructor(id, url) {
    this.id = id, this.url = url, this.file = cleanUrl(id);
  }
  importers = /* @__PURE__ */ new Set();
  imports = /* @__PURE__ */ new Set();
  evaluated = !1;
  meta;
  promise;
  exports;
  file;
  map;
}
class EvaluatedModules {
  idToModuleMap = /* @__PURE__ */ new Map();
  fileToModulesMap = /* @__PURE__ */ new Map();
  urlToIdModuleMap = /* @__PURE__ */ new Map();
  /**
   * Returns the module node by the resolved module ID. Usually, module ID is
   * the file system path with query and/or hash. It can also be a virtual module.
   *
   * Module runner graph will have 1 to 1 mapping with the server module graph.
   * @param id Resolved module ID
   */
  getModuleById(id) {
    return this.idToModuleMap.get(id);
  }
  /**
   * Returns all modules related to the file system path. Different modules
   * might have different query parameters or hash, so it's possible to have
   * multiple modules for the same file.
   * @param file The file system path of the module
   */
  getModulesByFile(file) {
    return this.fileToModulesMap.get(file);
  }
  /**
   * Returns the module node by the URL that was used in the import statement.
   * Unlike module graph on the server, the URL is not resolved and is used as is.
   * @param url Server URL that was used in the import statement
   */
  getModuleByUrl(url) {
    return this.urlToIdModuleMap.get(unwrapId(url));
  }
  /**
   * Ensure that module is in the graph. If the module is already in the graph,
   * it will return the existing module node. Otherwise, it will create a new
   * module node and add it to the graph.
   * @param id Resolved module ID
   * @param url URL that was used in the import statement
   */
  ensureModule(id, url) {
    if (id = normalizeModuleId(id), this.idToModuleMap.has(id)) {
      const moduleNode2 = this.idToModuleMap.get(id);
      return this.urlToIdModuleMap.set(url, moduleNode2), moduleNode2;
    }
    const moduleNode = new EvaluatedModuleNode(id, url);
    this.idToModuleMap.set(id, moduleNode), this.urlToIdModuleMap.set(url, moduleNode);
    const fileModules = this.fileToModulesMap.get(moduleNode.file) || /* @__PURE__ */ new Set();
    return fileModules.add(moduleNode), this.fileToModulesMap.set(moduleNode.file, fileModules), moduleNode;
  }
  invalidateModule(node) {
    node.evaluated = !1, node.meta = void 0, node.map = void 0, node.promise = void 0, node.exports = void 0, node.imports.clear();
  }
  /**
   * Extracts the inlined source map from the module code and returns the decoded
   * source map. If the source map is not inlined, it will return null.
   * @param id Resolved module ID
   */
  getModuleSourceMapById(id) {
    const mod = this.getModuleById(id);
    if (!mod) return null;
    if (mod.map) return mod.map;
    if (!mod.meta || !("code" in mod.meta)) return null;
    const mapString = MODULE_RUNNER_SOURCEMAPPING_REGEXP.exec(
      mod.meta.code
    )?.[1];
    return mapString ? (mod.map = new DecodedMap(JSON.parse(decodeBase64(mapString)), mod.file), mod.map) : null;
  }
  clear() {
    this.idToModuleMap.clear(), this.fileToModulesMap.clear(), this.urlToIdModuleMap.clear();
  }
}
const prefixedBuiltins = /* @__PURE__ */ new Set([
  "node:sea",
  "node:sqlite",
  "node:test",
  "node:test/reporters"
]);
function normalizeModuleId(file) {
  return prefixedBuiltins.has(file) ? file : slash(file).replace(/^\/@fs\//, isWindows ? "" : "/").replace(/^node:/, "").replace(/^\/+/, "/").replace(/^file:\//, "/");
}
class HMRContext {
  constructor(hmrClient, ownerPath) {
    this.hmrClient = hmrClient, this.ownerPath = ownerPath, hmrClient.dataMap.has(ownerPath) || hmrClient.dataMap.set(ownerPath, {});
    const mod = hmrClient.hotModulesMap.get(ownerPath);
    mod && (mod.callbacks = []);
    const staleListeners = hmrClient.ctxToListenersMap.get(ownerPath);
    if (staleListeners)
      for (const [event, staleFns] of staleListeners) {
        const listeners = hmrClient.customListenersMap.get(event);
        listeners && hmrClient.customListenersMap.set(
          event,
          listeners.filter((l) => !staleFns.includes(l))
        );
      }
    this.newListeners = /* @__PURE__ */ new Map(), hmrClient.ctxToListenersMap.set(ownerPath, this.newListeners);
  }
  newListeners;
  get data() {
    return this.hmrClient.dataMap.get(this.ownerPath);
  }
  accept(deps, callback) {
    if (typeof deps == "function" || !deps)
      this.acceptDeps([this.ownerPath], ([mod]) => deps?.(mod));
    else if (typeof deps == "string")
      this.acceptDeps([deps], ([mod]) => callback?.(mod));
    else if (Array.isArray(deps))
      this.acceptDeps(deps, callback);
    else
      throw new Error("invalid hot.accept() usage.");
  }
  // export names (first arg) are irrelevant on the client side, they're
  // extracted in the server for propagation
  acceptExports(_, callback) {
    this.acceptDeps([this.ownerPath], ([mod]) => callback?.(mod));
  }
  dispose(cb) {
    this.hmrClient.disposeMap.set(this.ownerPath, cb);
  }
  prune(cb) {
    this.hmrClient.pruneMap.set(this.ownerPath, cb);
  }
  // Kept for backward compatibility (#11036)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  decline() {
  }
  invalidate(message) {
    const firstInvalidatedBy = this.hmrClient.currentFirstInvalidatedBy ?? this.ownerPath;
    this.hmrClient.notifyListeners("vite:invalidate", {
      path: this.ownerPath,
      message,
      firstInvalidatedBy
    }), this.send("vite:invalidate", {
      path: this.ownerPath,
      message,
      firstInvalidatedBy
    }), this.hmrClient.logger.debug(
      `invalidate ${this.ownerPath}${message ? `: ${message}` : ""}`
    );
  }
  on(event, cb) {
    const addToMap = (map) => {
      const existing = map.get(event) || [];
      existing.push(cb), map.set(event, existing);
    };
    addToMap(this.hmrClient.customListenersMap), addToMap(this.newListeners);
  }
  off(event, cb) {
    const removeFromMap = (map) => {
      const existing = map.get(event);
      if (existing === void 0)
        return;
      const pruned = existing.filter((l) => l !== cb);
      if (pruned.length === 0) {
        map.delete(event);
        return;
      }
      map.set(event, pruned);
    };
    removeFromMap(this.hmrClient.customListenersMap), removeFromMap(this.newListeners);
  }
  send(event, data) {
    this.hmrClient.send({ type: "custom", event, data });
  }
  acceptDeps(deps, callback = () => {
  }) {
    const mod = this.hmrClient.hotModulesMap.get(this.ownerPath) || {
      id: this.ownerPath,
      callbacks: []
    };
    mod.callbacks.push({
      deps,
      fn: callback
    }), this.hmrClient.hotModulesMap.set(this.ownerPath, mod);
  }
}
class HMRClient {
  constructor(logger, transport, importUpdatedModule) {
    this.logger = logger, this.transport = transport, this.importUpdatedModule = importUpdatedModule;
  }
  hotModulesMap = /* @__PURE__ */ new Map();
  disposeMap = /* @__PURE__ */ new Map();
  pruneMap = /* @__PURE__ */ new Map();
  dataMap = /* @__PURE__ */ new Map();
  customListenersMap = /* @__PURE__ */ new Map();
  ctxToListenersMap = /* @__PURE__ */ new Map();
  currentFirstInvalidatedBy;
  async notifyListeners(event, data) {
    const cbs = this.customListenersMap.get(event);
    cbs && await Promise.allSettled(cbs.map((cb) => cb(data)));
  }
  send(payload) {
    this.transport.send(payload).catch((err) => {
      this.logger.error(err);
    });
  }
  clear() {
    this.hotModulesMap.clear(), this.disposeMap.clear(), this.pruneMap.clear(), this.dataMap.clear(), this.customListenersMap.clear(), this.ctxToListenersMap.clear();
  }
  // After an HMR update, some modules are no longer imported on the page
  // but they may have left behind side effects that need to be cleaned up
  // (e.g. style injections)
  async prunePaths(paths) {
    await Promise.all(
      paths.map((path) => {
        const disposer = this.disposeMap.get(path);
        if (disposer) return disposer(this.dataMap.get(path));
      })
    ), paths.forEach((path) => {
      const fn = this.pruneMap.get(path);
      fn && fn(this.dataMap.get(path));
    });
  }
  warnFailedUpdate(err, path) {
    (!(err instanceof Error) || !err.message.includes("fetch")) && this.logger.error(err), this.logger.error(
      `Failed to reload ${path}. This could be due to syntax errors or importing non-existent modules. (see errors above)`
    );
  }
  updateQueue = [];
  pendingUpdateQueue = !1;
  /**
   * buffer multiple hot updates triggered by the same src change
   * so that they are invoked in the same order they were sent.
   * (otherwise the order may be inconsistent because of the http request round trip)
   */
  async queueUpdate(payload) {
    if (this.updateQueue.push(this.fetchUpdate(payload)), !this.pendingUpdateQueue) {
      this.pendingUpdateQueue = !0, await Promise.resolve(), this.pendingUpdateQueue = !1;
      const loading = [...this.updateQueue];
      this.updateQueue = [], (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
  }
  async fetchUpdate(update) {
    const { path, acceptedPath, firstInvalidatedBy } = update, mod = this.hotModulesMap.get(path);
    if (!mod)
      return;
    let fetchedModule;
    const isSelfUpdate = path === acceptedPath, qualifiedCallbacks = mod.callbacks.filter(
      ({ deps }) => deps.includes(acceptedPath)
    );
    if (isSelfUpdate || qualifiedCallbacks.length > 0) {
      const disposer = this.disposeMap.get(acceptedPath);
      disposer && await disposer(this.dataMap.get(acceptedPath));
      try {
        fetchedModule = await this.importUpdatedModule(update);
      } catch (e) {
        this.warnFailedUpdate(e, acceptedPath);
      }
    }
    return () => {
      try {
        this.currentFirstInvalidatedBy = firstInvalidatedBy;
        for (const { deps, fn } of qualifiedCallbacks)
          fn(
            deps.map(
              (dep) => dep === acceptedPath ? fetchedModule : void 0
            )
          );
        const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
        this.logger.debug(`hot updated: ${loggedPath}`);
      } finally {
        this.currentFirstInvalidatedBy = void 0;
      }
    };
  }
}
function analyzeImportedModDifference(mod, rawId, moduleType, metadata) {
  if (!metadata?.isDynamicImport && metadata?.importedNames?.length) {
    const missingBindings = metadata.importedNames.filter((s) => !(s in mod));
    if (missingBindings.length) {
      const lastBinding = missingBindings[missingBindings.length - 1];
      throw moduleType === "module" ? new SyntaxError(
        `[vite] The requested module '${rawId}' does not provide an export named '${lastBinding}'`
      ) : new SyntaxError(`[vite] Named export '${lastBinding}' not found. The requested module '${rawId}' is a CommonJS module, which may not support all module.exports as named exports.
CommonJS modules can always be imported via the default export, for example using:

import pkg from '${rawId}';
const {${missingBindings.join(", ")}} = pkg;
`);
    }
  }
}
let urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", nanoid = (size = 21) => {
  let id = "", i = size | 0;
  for (; i--; )
    id += urlAlphabet[Math.random() * 64 | 0];
  return id;
};
function reviveInvokeError(e) {
  const error = new Error(e.message || "Unknown invoke error");
  return Object.assign(error, e, {
    // pass the whole error instead of just the stacktrace
    // so that it gets formatted nicely with console.log
    runnerError: new Error("RunnerError")
  }), error;
}
const createInvokeableTransport = (transport) => {
  if (transport.invoke)
    return {
      ...transport,
      async invoke(name, data) {
        const result = await transport.invoke({
          type: "custom",
          event: "vite:invoke",
          data: {
            id: "send",
            name,
            data
          }
        });
        if ("error" in result)
          throw reviveInvokeError(result.error);
        return result.result;
      }
    };
  if (!transport.send || !transport.connect)
    throw new Error(
      "transport must implement send and connect when invoke is not implemented"
    );
  const rpcPromises = /* @__PURE__ */ new Map();
  return {
    ...transport,
    connect({ onMessage, onDisconnection }) {
      return transport.connect({
        onMessage(payload) {
          if (payload.type === "custom" && payload.event === "vite:invoke") {
            const data = payload.data;
            if (data.id.startsWith("response:")) {
              const invokeId = data.id.slice(9), promise = rpcPromises.get(invokeId);
              if (!promise) return;
              promise.timeoutId && clearTimeout(promise.timeoutId), rpcPromises.delete(invokeId);
              const { error, result } = data.data;
              error ? promise.reject(error) : promise.resolve(result);
              return;
            }
          }
          onMessage(payload);
        },
        onDisconnection
      });
    },
    disconnect() {
      return rpcPromises.forEach((promise) => {
        promise.reject(
          new Error(
            `transport was disconnected, cannot call ${JSON.stringify(promise.name)}`
          )
        );
      }), rpcPromises.clear(), transport.disconnect?.();
    },
    send(data) {
      return transport.send(data);
    },
    async invoke(name, data) {
      const promiseId = nanoid(), wrappedData = {
        type: "custom",
        event: "vite:invoke",
        data: {
          name,
          id: `send:${promiseId}`,
          data
        }
      }, sendPromise = transport.send(wrappedData), { promise, resolve: resolve2, reject } = promiseWithResolvers(), timeout = transport.timeout ?? 6e4;
      let timeoutId;
      timeout > 0 && (timeoutId = setTimeout(() => {
        rpcPromises.delete(promiseId), reject(
          new Error(
            `transport invoke timed out after ${timeout}ms (data: ${JSON.stringify(wrappedData)})`
          )
        );
      }, timeout), timeoutId?.unref?.()), rpcPromises.set(promiseId, { resolve: resolve2, reject, name, timeoutId }), sendPromise && sendPromise.catch((err) => {
        clearTimeout(timeoutId), rpcPromises.delete(promiseId), reject(err);
      });
      try {
        return await promise;
      } catch (err) {
        throw reviveInvokeError(err);
      }
    }
  };
}, normalizeModuleRunnerTransport = (transport) => {
  const invokeableTransport = createInvokeableTransport(transport);
  let isConnected = !invokeableTransport.connect, connectingPromise;
  return {
    ...transport,
    ...invokeableTransport.connect ? {
      async connect(onMessage) {
        if (isConnected) return;
        if (connectingPromise) {
          await connectingPromise;
          return;
        }
        const maybePromise = invokeableTransport.connect({
          onMessage: onMessage ?? (() => {
          }),
          onDisconnection() {
            isConnected = !1;
          }
        });
        maybePromise && (connectingPromise = maybePromise, await connectingPromise, connectingPromise = void 0), isConnected = !0;
      }
    } : {},
    ...invokeableTransport.disconnect ? {
      async disconnect() {
        isConnected && (connectingPromise && await connectingPromise, isConnected = !1, await invokeableTransport.disconnect());
      }
    } : {},
    async send(data) {
      if (invokeableTransport.send) {
        if (!isConnected)
          if (connectingPromise)
            await connectingPromise;
          else
            throw new Error("send was called before connect");
        await invokeableTransport.send(data);
      }
    },
    async invoke(name, data) {
      if (!isConnected)
        if (connectingPromise)
          await connectingPromise;
        else
          throw new Error("invoke was called before connect");
      return invokeableTransport.invoke(name, data);
    }
  };
}, createWebSocketModuleRunnerTransport = (options) => {
  const pingInterval = options.pingInterval ?? 3e4;
  let ws, pingIntervalId;
  return {
    async connect({ onMessage, onDisconnection }) {
      const socket = options.createConnection();
      socket.addEventListener("message", async ({ data }) => {
        onMessage(JSON.parse(data));
      });
      let isOpened = socket.readyState === socket.OPEN;
      isOpened || await new Promise((resolve2, reject) => {
        socket.addEventListener(
          "open",
          () => {
            isOpened = !0, resolve2();
          },
          { once: !0 }
        ), socket.addEventListener("close", async () => {
          if (!isOpened) {
            reject(new Error("WebSocket closed without opened."));
            return;
          }
          onMessage({
            type: "custom",
            event: "vite:ws:disconnect",
            data: { webSocket: socket }
          }), onDisconnection();
        });
      }), onMessage({
        type: "custom",
        event: "vite:ws:connect",
        data: { webSocket: socket }
      }), ws = socket, pingIntervalId = setInterval(() => {
        socket.readyState === socket.OPEN && socket.send(JSON.stringify({ type: "ping" }));
      }, pingInterval);
    },
    disconnect() {
      clearInterval(pingIntervalId), ws?.close();
    },
    send(data) {
      ws.send(JSON.stringify(data));
    }
  };
}, ssrModuleExportsKey = "__vite_ssr_exports__", ssrImportKey = "__vite_ssr_import__", ssrDynamicImportKey = "__vite_ssr_dynamic_import__", ssrExportAllKey = "__vite_ssr_exportAll__", ssrImportMetaKey = "__vite_ssr_import_meta__", noop = () => {
}, silentConsole = {
  debug: noop,
  error: noop
}, hmrLogger = {
  debug: (...msg) => console.log("[vite]", ...msg),
  error: (error) => console.log("[vite]", error)
};
function createHMRHandler(handler) {
  const queue = new Queue();
  return (payload) => queue.enqueue(() => handler(payload));
}
class Queue {
  queue = [];
  pending = !1;
  enqueue(promise) {
    return new Promise((resolve2, reject) => {
      this.queue.push({
        promise,
        resolve: resolve2,
        reject
      }), this.dequeue();
    });
  }
  dequeue() {
    if (this.pending)
      return !1;
    const item = this.queue.shift();
    return item ? (this.pending = !0, item.promise().then(item.resolve).catch(item.reject).finally(() => {
      this.pending = !1, this.dequeue();
    }), !0) : !1;
  }
}
function createHMRHandlerForRunner(runner) {
  return createHMRHandler(async (payload) => {
    const hmrClient = runner.hmrClient;
    if (!(!hmrClient || runner.isClosed()))
      switch (payload.type) {
        case "connected":
          hmrClient.logger.debug("connected.");
          break;
        case "update":
          await hmrClient.notifyListeners("vite:beforeUpdate", payload), await Promise.all(
            payload.updates.map(async (update) => {
              if (update.type === "js-update")
                return update.acceptedPath = unwrapId(update.acceptedPath), update.path = unwrapId(update.path), hmrClient.queueUpdate(update);
              hmrClient.logger.error("css hmr is not supported in runner mode.");
            })
          ), await hmrClient.notifyListeners("vite:afterUpdate", payload);
          break;
        case "custom": {
          await hmrClient.notifyListeners(payload.event, payload.data);
          break;
        }
        case "full-reload": {
          const { triggeredBy } = payload, clearEntrypointUrls = triggeredBy ? getModulesEntrypoints(
            runner,
            getModulesByFile(runner, slash(triggeredBy))
          ) : findAllEntrypoints(runner);
          if (!clearEntrypointUrls.size) break;
          hmrClient.logger.debug("program reload"), await hmrClient.notifyListeners("vite:beforeFullReload", payload), runner.evaluatedModules.clear();
          for (const url of clearEntrypointUrls)
            try {
              await runner.import(url);
            } catch (err) {
              err.code !== ERR_OUTDATED_OPTIMIZED_DEP && hmrClient.logger.error(
                `An error happened during full reload
${err.message}
${err.stack}`
              );
            }
          break;
        }
        case "prune":
          await hmrClient.notifyListeners("vite:beforePrune", payload), await hmrClient.prunePaths(payload.paths);
          break;
        case "error": {
          await hmrClient.notifyListeners("vite:error", payload);
          const err = payload.err;
          hmrClient.logger.error(
            `Internal Server Error
${err.message}
${err.stack}`
          );
          break;
        }
        case "ping":
          break;
        default:
          return payload;
      }
  });
}
function getModulesByFile(runner, file) {
  const nodes = runner.evaluatedModules.getModulesByFile(file);
  return nodes ? [...nodes].map((node) => node.id) : [];
}
function getModulesEntrypoints(runner, modules, visited = /* @__PURE__ */ new Set(), entrypoints = /* @__PURE__ */ new Set()) {
  for (const moduleId of modules) {
    if (visited.has(moduleId)) continue;
    visited.add(moduleId);
    const module = runner.evaluatedModules.getModuleById(moduleId);
    if (module) {
      if (!module.importers.size) {
        entrypoints.add(module.url);
        continue;
      }
      for (const importer of module.importers)
        getModulesEntrypoints(runner, [importer], visited, entrypoints);
    }
  }
  return entrypoints;
}
function findAllEntrypoints(runner, entrypoints = /* @__PURE__ */ new Set()) {
  for (const mod of runner.evaluatedModules.idToModuleMap.values())
    mod.importers.size || entrypoints.add(mod.url);
  return entrypoints;
}
const sourceMapCache = {}, fileContentsCache = {}, evaluatedModulesCache = /* @__PURE__ */ new Set(), retrieveFileHandlers = /* @__PURE__ */ new Set(), retrieveSourceMapHandlers = /* @__PURE__ */ new Set(), createExecHandlers = (handlers) => (...args) => {
  for (const handler of handlers) {
    const result = handler(...args);
    if (result) return result;
  }
  return null;
}, retrieveFileFromHandlers = createExecHandlers(retrieveFileHandlers), retrieveSourceMapFromHandlers = createExecHandlers(
  retrieveSourceMapHandlers
);
let overridden = !1;
const originalPrepare = Error.prepareStackTrace;
function resetInterceptor(runner, options) {
  evaluatedModulesCache.delete(runner.evaluatedModules), options.retrieveFile && retrieveFileHandlers.delete(options.retrieveFile), options.retrieveSourceMap && retrieveSourceMapHandlers.delete(options.retrieveSourceMap), evaluatedModulesCache.size === 0 && (Error.prepareStackTrace = originalPrepare, overridden = !1);
}
function interceptStackTrace(runner, options = {}) {
  return overridden || (Error.prepareStackTrace = prepareStackTrace, overridden = !0), evaluatedModulesCache.add(runner.evaluatedModules), options.retrieveFile && retrieveFileHandlers.add(options.retrieveFile), options.retrieveSourceMap && retrieveSourceMapHandlers.add(options.retrieveSourceMap), () => resetInterceptor(runner, options);
}
function supportRelativeURL(file, url) {
  if (!file) return url;
  const dir = posixDirname(slash(file)), match = /^\w+:\/\/[^/]*/.exec(dir);
  let protocol = match ? match[0] : "";
  const startPath = dir.slice(protocol.length);
  return protocol && /^\/\w:/.test(startPath) ? (protocol += "/", protocol + slash(posixResolve(startPath, url))) : protocol + posixResolve(startPath, url);
}
function getRunnerSourceMap(position) {
  for (const moduleGraph of evaluatedModulesCache) {
    const sourceMap = moduleGraph.getModuleSourceMapById(position.source);
    if (sourceMap)
      return {
        url: position.source,
        map: sourceMap,
        vite: !0
      };
  }
  return null;
}
function retrieveFile(path) {
  if (path in fileContentsCache) return fileContentsCache[path];
  const content = retrieveFileFromHandlers(path);
  return typeof content == "string" ? (fileContentsCache[path] = content, content) : null;
}
function retrieveSourceMapURL(source) {
  const fileData = retrieveFile(source);
  if (!fileData) return null;
  const re = /\/\/[@#]\s*sourceMappingURL=([^\s'"]+)\s*$|\/\*[@#]\s*sourceMappingURL=[^\s*'"]+\s*\*\/\s*$/gm;
  let lastMatch, match;
  for (; match = re.exec(fileData); ) lastMatch = match;
  return lastMatch ? lastMatch[1] : null;
}
const reSourceMap = /^data:application\/json[^,]+base64,/;
function retrieveSourceMap(source) {
  const urlAndMap = retrieveSourceMapFromHandlers(source);
  if (urlAndMap) return urlAndMap;
  let sourceMappingURL = retrieveSourceMapURL(source);
  if (!sourceMappingURL) return null;
  let sourceMapData;
  if (reSourceMap.test(sourceMappingURL)) {
    const rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(",") + 1);
    sourceMapData = Buffer.from(rawData, "base64").toString(), sourceMappingURL = source;
  } else
    sourceMappingURL = supportRelativeURL(source, sourceMappingURL), sourceMapData = retrieveFile(sourceMappingURL);
  return sourceMapData ? {
    url: sourceMappingURL,
    map: sourceMapData
  } : null;
}
function mapSourcePosition(position) {
  if (!position.source) return position;
  let sourceMap = getRunnerSourceMap(position);
  if (sourceMap || (sourceMap = sourceMapCache[position.source]), !sourceMap) {
    const urlAndMap = retrieveSourceMap(position.source);
    if (urlAndMap && urlAndMap.map) {
      const url = urlAndMap.url;
      sourceMap = sourceMapCache[position.source] = {
        url,
        map: new DecodedMap(
          typeof urlAndMap.map == "string" ? JSON.parse(urlAndMap.map) : urlAndMap.map,
          url
        )
      };
      const contents = sourceMap.map?.map.sourcesContent;
      sourceMap.map && contents && sourceMap.map.resolvedSources.forEach((source, i) => {
        const content = contents[i];
        if (content && source && url) {
          const contentUrl = supportRelativeURL(url, source);
          fileContentsCache[contentUrl] = content;
        }
      });
    } else
      sourceMap = sourceMapCache[position.source] = {
        url: null,
        map: null
      };
  }
  if (sourceMap.map && sourceMap.url) {
    const originalPosition = getOriginalPosition(sourceMap.map, position);
    if (originalPosition && originalPosition.source != null)
      return originalPosition.source = supportRelativeURL(
        sourceMap.url,
        originalPosition.source
      ), sourceMap.vite && (originalPosition._vite = !0), originalPosition;
  }
  return position;
}
function mapEvalOrigin(origin) {
  let match = /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(origin);
  if (match) {
    const position = mapSourcePosition({
      name: null,
      source: match[2],
      line: +match[3],
      column: +match[4] - 1
    });
    return `eval at ${match[1]} (${position.source}:${position.line}:${position.column + 1})`;
  }
  return match = /^eval at ([^(]+) \((.+)\)$/.exec(origin), match ? `eval at ${match[1]} (${mapEvalOrigin(match[2])})` : origin;
}
function CallSiteToString() {
  let fileName, fileLocation = "";
  if (this.isNative())
    fileLocation = "native";
  else {
    fileName = this.getScriptNameOrSourceURL(), !fileName && this.isEval() && (fileLocation = this.getEvalOrigin(), fileLocation += ", "), fileName ? fileLocation += fileName : fileLocation += "<anonymous>";
    const lineNumber = this.getLineNumber();
    if (lineNumber != null) {
      fileLocation += `:${lineNumber}`;
      const columnNumber = this.getColumnNumber();
      columnNumber && (fileLocation += `:${columnNumber}`);
    }
  }
  let line = "";
  const functionName = this.getFunctionName();
  let addSuffix = !0;
  const isConstructor = this.isConstructor();
  if (this.isToplevel() || isConstructor)
    isConstructor ? line += `new ${functionName || "<anonymous>"}` : functionName ? line += functionName : (line += fileLocation, addSuffix = !1);
  else {
    let typeName = this.getTypeName();
    typeName === "[object Object]" && (typeName = "null");
    const methodName = this.getMethodName();
    functionName ? (typeName && functionName.indexOf(typeName) !== 0 && (line += `${typeName}.`), line += functionName, methodName && functionName.indexOf(`.${methodName}`) !== functionName.length - methodName.length - 1 && (line += ` [as ${methodName}]`)) : line += `${typeName}.${methodName || "<anonymous>"}`;
  }
  return addSuffix && (line += ` (${fileLocation})`), line;
}
function cloneCallSite(frame) {
  const object = {};
  return Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach((name) => {
    const key = name;
    object[key] = /^(?:is|get)/.test(name) ? function() {
      return frame[key].call(frame);
    } : frame[key];
  }), object.toString = CallSiteToString, object;
}
function wrapCallSite(frame, state) {
  if (state === void 0 && (state = { nextPosition: null, curPosition: null }), frame.isNative())
    return state.curPosition = null, frame;
  const source = frame.getFileName() || frame.getScriptNameOrSourceURL();
  if (source) {
    const line = frame.getLineNumber();
    let column = frame.getColumnNumber() - 1;
    const headerLength = 62;
    line === 1 && column > headerLength && !frame.isEval() && (column -= headerLength);
    const position = mapSourcePosition({
      name: null,
      source,
      line,
      column
    });
    state.curPosition = position, frame = cloneCallSite(frame);
    const originalFunctionName = frame.getFunctionName;
    return frame.getFunctionName = function() {
      const name = state.nextPosition == null ? originalFunctionName() : state.nextPosition.name || originalFunctionName();
      return name === "eval" && "_vite" in position ? null : name;
    }, frame.getFileName = function() {
      return position.source ?? void 0;
    }, frame.getLineNumber = function() {
      return position.line;
    }, frame.getColumnNumber = function() {
      return position.column + 1;
    }, frame.getScriptNameOrSourceURL = function() {
      return position.source;
    }, frame;
  }
  let origin = frame.isEval() && frame.getEvalOrigin();
  return origin && (origin = mapEvalOrigin(origin), frame = cloneCallSite(frame), frame.getEvalOrigin = function() {
    return origin || void 0;
  }), frame;
}
function prepareStackTrace(error, stack) {
  const name = error.name || "Error", message = error.message || "", errorString = `${name}: ${message}`, state = { nextPosition: null, curPosition: null }, processedStack = [];
  for (let i = stack.length - 1; i >= 0; i--)
    processedStack.push(`
    at ${wrapCallSite(stack[i], state)}`), state.nextPosition = state.curPosition;
  return state.curPosition = state.nextPosition = null, errorString + processedStack.reverse().join("");
}
function enableSourceMapSupport(runner) {
  if (runner.options.sourcemapInterceptor === "node") {
    if (typeof process > "u")
      throw new TypeError(
        `Cannot use "sourcemapInterceptor: 'node'" because global "process" variable is not available.`
      );
    if (typeof process.setSourceMapsEnabled != "function")
      throw new TypeError(
        `Cannot use "sourcemapInterceptor: 'node'" because "process.setSourceMapsEnabled" function is not available. Please use Node >= 16.6.0.`
      );
    const isEnabledAlready = process.sourceMapsEnabled ?? !1;
    return process.setSourceMapsEnabled(!0), () => !isEnabledAlready && process.setSourceMapsEnabled(!1);
  }
  return interceptStackTrace(
    runner,
    typeof runner.options.sourcemapInterceptor == "object" ? runner.options.sourcemapInterceptor : void 0
  );
}
class ESModulesEvaluator {
  startOffset = getAsyncFunctionDeclarationPaddingLineCount();
  async runInlinedModule(context, code) {
    await new AsyncFunction(
      ssrModuleExportsKey,
      ssrImportMetaKey,
      ssrImportKey,
      ssrDynamicImportKey,
      ssrExportAllKey,
      // source map should already be inlined by Vite
      '"use strict";' + code
    )(
      context[ssrModuleExportsKey],
      context[ssrImportMetaKey],
      context[ssrImportKey],
      context[ssrDynamicImportKey],
      context[ssrExportAllKey]
    ), Object.seal(context[ssrModuleExportsKey]);
  }
  runExternalModule(filepath) {
    return import(filepath);
  }
}
class ModuleRunner {
  constructor(options, evaluator = new ESModulesEvaluator(), debug) {
    if (this.options = options, this.evaluator = evaluator, this.debug = debug, this.evaluatedModules = options.evaluatedModules ?? new EvaluatedModules(), this.transport = normalizeModuleRunnerTransport(options.transport), options.hmr !== !1) {
      const optionsHmr = options.hmr ?? !0, resolvedHmrLogger = optionsHmr === !0 || optionsHmr.logger === void 0 ? hmrLogger : optionsHmr.logger === !1 ? silentConsole : optionsHmr.logger;
      if (this.hmrClient = new HMRClient(
        resolvedHmrLogger,
        this.transport,
        ({ acceptedPath }) => this.import(acceptedPath)
      ), !this.transport.connect)
        throw new Error(
          "HMR is not supported by this runner transport, but `hmr` option was set to true"
        );
      this.transport.connect(createHMRHandlerForRunner(this));
    } else
      this.transport.connect?.();
    options.sourcemapInterceptor !== !1 && (this.resetSourceMapSupport = enableSourceMapSupport(this));
  }
  evaluatedModules;
  hmrClient;
  envProxy = new Proxy({}, {
    get(_, p) {
      throw new Error(
        `[module runner] Dynamic access of "import.meta.env" is not supported. Please, use "import.meta.env.${String(p)}" instead.`
      );
    }
  });
  transport;
  resetSourceMapSupport;
  concurrentModuleNodePromises = /* @__PURE__ */ new Map();
  closed = !1;
  /**
   * URL to execute. Accepts file path, server path or id relative to the root.
   */
  async import(url) {
    const fetchedModule = await this.cachedModule(url);
    return await this.cachedRequest(url, fetchedModule);
  }
  /**
   * Clear all caches including HMR listeners.
   */
  clearCache() {
    this.evaluatedModules.clear(), this.hmrClient?.clear();
  }
  /**
   * Clears all caches, removes all HMR listeners, and resets source map support.
   * This method doesn't stop the HMR connection.
   */
  async close() {
    this.resetSourceMapSupport?.(), this.clearCache(), this.hmrClient = void 0, this.closed = !0, await this.transport.disconnect?.();
  }
  /**
   * Returns `true` if the runtime has been closed by calling `close()` method.
   */
  isClosed() {
    return this.closed;
  }
  processImport(exports, fetchResult, metadata) {
    if (!("externalize" in fetchResult))
      return exports;
    const { url, type } = fetchResult;
    return type !== "module" && type !== "commonjs" || analyzeImportedModDifference(exports, url, type, metadata), exports;
  }
  isCircularModule(mod) {
    for (const importedFile of mod.imports)
      if (mod.importers.has(importedFile))
        return !0;
    return !1;
  }
  isCircularImport(importers, moduleUrl, visited = /* @__PURE__ */ new Set()) {
    for (const importer of importers) {
      if (visited.has(importer))
        continue;
      if (visited.add(importer), importer === moduleUrl)
        return !0;
      const mod = this.evaluatedModules.getModuleById(importer);
      if (mod && mod.importers.size && this.isCircularImport(mod.importers, moduleUrl, visited))
        return !0;
    }
    return !1;
  }
  async cachedRequest(url, mod, callstack = [], metadata) {
    const meta = mod.meta, moduleId = meta.id, { importers } = mod, importee = callstack[callstack.length - 1];
    if (importee && importers.add(importee), (callstack.includes(moduleId) || this.isCircularModule(mod) || this.isCircularImport(importers, moduleId)) && mod.exports)
      return this.processImport(mod.exports, meta, metadata);
    let debugTimer;
    this.debug && (debugTimer = setTimeout(() => {
      const getStack = () => `stack:
${[...callstack, moduleId].reverse().map((p) => `  - ${p}`).join(`
`)}`;
      this.debug(
        `[module runner] module ${moduleId} takes over 2s to load.
${getStack()}`
      );
    }, 2e3));
    try {
      if (mod.promise)
        return this.processImport(await mod.promise, meta, metadata);
      const promise = this.directRequest(url, mod, callstack);
      return mod.promise = promise, mod.evaluated = !1, this.processImport(await promise, meta, metadata);
    } finally {
      mod.evaluated = !0, debugTimer && clearTimeout(debugTimer);
    }
  }
  async cachedModule(url, importer) {
    let cached = this.concurrentModuleNodePromises.get(url);
    if (cached)
      this.debug?.("[module runner] using cached module info for", url);
    else {
      const cachedModule = this.evaluatedModules.getModuleByUrl(url);
      cached = this.getModuleInformation(url, importer, cachedModule).finally(
        () => {
          this.concurrentModuleNodePromises.delete(url);
        }
      ), this.concurrentModuleNodePromises.set(url, cached);
    }
    return cached;
  }
  async getModuleInformation(url, importer, cachedModule) {
    if (this.closed)
      throw new Error("Vite module runner has been closed.");
    this.debug?.("[module runner] fetching", url);
    const isCached = !!(typeof cachedModule == "object" && cachedModule.meta), fetchedModule = (
      // fast return for established externalized pattern
      url.startsWith("data:") ? { externalize: url, type: "builtin" } : await this.transport.invoke("fetchModule", [
        url,
        importer,
        {
          cached: isCached,
          startOffset: this.evaluator.startOffset
        }
      ])
    );
    if ("cache" in fetchedModule) {
      if (!cachedModule || !cachedModule.meta)
        throw new Error(
          `Module "${url}" was mistakenly invalidated during fetch phase.`
        );
      return cachedModule;
    }
    const moduleId = "externalize" in fetchedModule ? fetchedModule.externalize : fetchedModule.id, moduleUrl = "url" in fetchedModule ? fetchedModule.url : url, module = this.evaluatedModules.ensureModule(moduleId, moduleUrl);
    return "invalidate" in fetchedModule && fetchedModule.invalidate && this.evaluatedModules.invalidateModule(module), fetchedModule.url = moduleUrl, fetchedModule.id = moduleId, module.meta = fetchedModule, module;
  }
  // override is allowed, consider this a public API
  async directRequest(url, mod, _callstack) {
    const fetchResult = mod.meta, moduleId = fetchResult.id, callstack = [..._callstack, moduleId], request = async (dep, metadata) => {
      const importer = "file" in fetchResult && fetchResult.file || moduleId, depMod = await this.cachedModule(dep, importer);
      return depMod.importers.add(moduleId), mod.imports.add(depMod.id), this.cachedRequest(dep, depMod, callstack, metadata);
    }, dynamicRequest = async (dep) => (dep = String(dep), dep[0] === "." && (dep = posixResolve(posixDirname(url), dep)), request(dep, { isDynamicImport: !0 }));
    if ("externalize" in fetchResult) {
      const { externalize } = fetchResult;
      this.debug?.("[module runner] externalizing", externalize);
      const exports2 = await this.evaluator.runExternalModule(externalize);
      return mod.exports = exports2, exports2;
    }
    const { code, file } = fetchResult;
    if (code == null) {
      const importer = callstack[callstack.length - 2];
      throw new Error(
        `[module runner] Failed to load "${url}"${importer ? ` imported from ${importer}` : ""}`
      );
    }
    const modulePath = cleanUrl(file || moduleId), href = posixPathToFileHref(modulePath), filename = modulePath, dirname2 = posixDirname(modulePath), meta = {
      filename: isWindows ? toWindowsPath(filename) : filename,
      dirname: isWindows ? toWindowsPath(dirname2) : dirname2,
      url: href,
      env: this.envProxy,
      resolve(_id, _parent) {
        throw new Error(
          '[module runner] "import.meta.resolve" is not supported.'
        );
      },
      // should be replaced during transformation
      glob() {
        throw new Error(
          '[module runner] "import.meta.glob" is statically replaced during file transformation. Make sure to reference it by the full name.'
        );
      }
    }, exports = /* @__PURE__ */ Object.create(null);
    Object.defineProperty(exports, Symbol.toStringTag, {
      value: "Module",
      enumerable: !1,
      configurable: !1
    }), mod.exports = exports;
    let hotContext;
    this.hmrClient && Object.defineProperty(meta, "hot", {
      enumerable: !0,
      get: () => {
        if (!this.hmrClient)
          throw new Error("[module runner] HMR client was closed.");
        return this.debug?.("[module runner] creating hmr context for", mod.url), hotContext ||= new HMRContext(this.hmrClient, mod.url), hotContext;
      },
      set: (value) => {
        hotContext = value;
      }
    });
    const context = {
      [ssrImportKey]: request,
      [ssrDynamicImportKey]: dynamicRequest,
      [ssrModuleExportsKey]: exports,
      [ssrExportAllKey]: (obj) => exportAll(exports, obj),
      [ssrImportMetaKey]: meta
    };
    return this.debug?.("[module runner] executing", href), await this.evaluator.runInlinedModule(context, code, mod), exports;
  }
}
function exportAll(exports, sourceModule) {
  if (exports !== sourceModule && !(isPrimitive(sourceModule) || Array.isArray(sourceModule) || sourceModule instanceof Promise)) {
    for (const key in sourceModule)
      if (key !== "default" && key !== "__esModule" && !(key in exports))
        try {
          Object.defineProperty(exports, key, {
            enumerable: !0,
            configurable: !0,
            get: () => sourceModule[key]
          });
        } catch {
        }
  }
}
export {
  ESModulesEvaluator,
  EvaluatedModules,
  ModuleRunner,
  createWebSocketModuleRunnerTransport,
  ssrDynamicImportKey,
  ssrExportAllKey,
  ssrImportKey,
  ssrImportMetaKey,
  ssrModuleExportsKey
};
