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
  require_build
} from "./chunk-ONZANTK7.js";
import {
  StorybookError
} from "./chunk-WANDQWBR.js";
import {
  resolvePackageDir
} from "./chunk-O7UZQAUS.js";
import {
  relative
} from "./chunk-XS5OAKHK.js";
import {
  require_dist
} from "./chunk-SLZHVDN6.js";
import {
  require_picocolors
} from "./chunk-LE232J7F.js";
import {
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// src/core-server/utils/server-statics.ts
import { existsSync, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { basename, isAbsolute, join, posix, resolve, sep, win32 } from "node:path";
import {
  getDirectoryFromWorkingDir,
  getProjectRoot,
  resolvePathInStorybookCache
} from "storybook/internal/common";
import { CLI_COLORS, logger, once } from "storybook/internal/node-logger";
var import_picocolors = __toESM(require_picocolors(), 1), import_sirv = __toESM(require_build(), 1), import_ts_dedent = __toESM(require_dist(), 1);
var cacheDir = resolvePathInStorybookCache("", "ignored-sub").split("ignored-sub")[0], files = /* @__PURE__ */ new Map(), readFileOnce = async (path) => {
  if (files.has(path))
    return files.get(path);
  {
    let [data, stats] = await Promise.all([readFile(path, "utf-8"), stat(path)]), result = { data, mtime: stats.mtimeMs };
    return files.set(path, result), result;
  }
}, faviconWrapperPath = join(
  resolvePackageDir("storybook"),
  "/assets/browser/favicon-wrapper.svg"
), prepareNestedSvg = (svg) => {
  let [, openingTag, contents, closingTag] = svg?.match(/(<svg[^>]*>)(.*?)(<\/svg>)/s) ?? [];
  if (!openingTag || !contents || !closingTag)
    return svg;
  let width, height, modifiedTag = openingTag.replace(/width=["']([^"']*)["']/g, (_, value) => (width = parseFloat(value), 'width="32px"')).replace(/height=["']([^"']*)["']/g, (_, value) => (height = parseFloat(value), 'height="32px"'));
  return !/viewBox=["'][^"']*["']/.test(modifiedTag) && width && height && (modifiedTag = modifiedTag.replace(/>$/, ` viewBox="0 0 ${width} ${height}">`)), modifiedTag = modifiedTag.replace(/preserveAspectRatio=["'][^"']*["']/g, "").replace(/>$/, ' preserveAspectRatio="xMidYMid meet">'), modifiedTag + contents + closingTag;
};
async function useStatics(app, options) {
  let staticDirs = await options.presets.apply("staticDirs") ?? [], faviconPath = await options.presets.apply("favicon"), faviconDir = resolve(faviconPath, ".."), faviconFile = basename(faviconPath);
  app.use(`/${faviconFile}`, async (req, res, next) => {
    let status = req.query.status;
    if (status && faviconFile.endsWith(".svg") && ["active", "critical", "negative", "positive", "warning"].includes(status)) {
      let [faviconInfo, faviconWrapperInfo] = await Promise.all([
        readFileOnce(join(faviconDir, faviconFile)),
        readFileOnce(faviconWrapperPath)
      ]).catch((e) => (e instanceof Error && once.warn(`Failed to read favicon: ${e.message}`), [null, null]));
      if (faviconInfo && faviconWrapperInfo) {
        let svg = faviconWrapperInfo.data.replace('<g id="mask"', `<g mask="url(#${status}-mask)"`).replace('<use id="status"', `<use href="#${status}"`).replace('<use id="icon" />', prepareNestedSvg(faviconInfo.data));
        res.setHeader("Content-Type", "image/svg+xml"), res.setHeader("ETag", `"${faviconWrapperInfo.mtime}-${faviconInfo.mtime}"`), res.end(svg);
        return;
      }
    }
    return req.url = `/${faviconFile}`, sirvWorkaround(faviconDir)(req, res, next);
  }), staticDirs.map((dir) => {
    try {
      let { staticDir, staticPath, targetEndpoint } = mapStaticDir(dir, options.configDir);
      if (!targetEndpoint.startsWith("/sb-") && !staticDir.startsWith(cacheDir)) {
        let relativeStaticDir = relative(getProjectRoot(), staticDir);
        logger.debug(
          `Serving static files from ${CLI_COLORS.info(relativeStaticDir)} at ${CLI_COLORS.info(targetEndpoint)}`
        );
      }
      if (existsSync(staticPath) && statSync(staticPath).isFile()) {
        let staticPathDir = resolve(staticPath, ".."), staticPathFile = basename(staticPath);
        app.use(targetEndpoint, (req, res, next) => {
          req.url = `/${staticPathFile}`, sirvWorkaround(staticPathDir)(req, res, next);
        });
      } else
        app.use(targetEndpoint, sirvWorkaround(staticPath));
    } catch (e) {
      e instanceof Error && logger.warn(e.message);
    }
  });
}
var sirvWorkaround = (dir, opts = {}) => (req, res, next) => {
  let originalParsedUrl = req._parsedUrl, maybeNext = next ? () => {
    req._parsedUrl = originalParsedUrl, next();
  } : void 0;
  (0, import_sirv.default)(dir, { dev: !0, etag: !0, extensions: [], ...opts })(req, res, maybeNext);
}, parseStaticDir = (arg) => {
  let lastColonIndex = arg.lastIndexOf(":"), isWindowsRawDirOnly = win32.isAbsolute(arg) && lastColonIndex === 1, splitIndex = lastColonIndex !== -1 && !isWindowsRawDirOnly ? lastColonIndex : arg.length, [from, to] = [arg.slice(0, splitIndex), arg.slice(splitIndex + 1)], staticDir = isAbsolute(from) ? from : `./${from}`, staticPath = resolve(staticDir);
  if (!existsSync(staticPath))
    throw new Error(
      import_ts_dedent.dedent`
        Failed to load static files, no such directory: ${import_picocolors.default.cyan(staticPath)}
        Make sure this directory exists.
      `
    );
  let targetDir = (to || (statSync(staticPath).isFile() ? basename(staticPath) : "/")).split(sep).join(posix.sep).replace(/^\/?/, "./"), targetEndpoint = targetDir.substring(1);
  return { staticDir, staticPath, targetDir, targetEndpoint };
}, mapStaticDir = (staticDir, configDir) => {
  let specifier = typeof staticDir == "string" ? staticDir : `${staticDir.from}:${staticDir.to}`, normalizedDir = isAbsolute(specifier) ? specifier : getDirectoryFromWorkingDir({ configDir, workingDir: process.cwd(), directory: specifier });
  return parseStaticDir(normalizedDir);
};

// src/core-server/withTelemetry.ts
import { HandledError, cache, isCI, loadAllPresets } from "storybook/internal/common";
import { logger as logger2, prompt } from "storybook/internal/node-logger";
import {
  ErrorCollector,
  getPrecedingUpgrade,
  oneWayHash,
  telemetry
} from "storybook/internal/telemetry";
var promptCrashReports = async () => {
  if (isCI() || !process.stdout.isTTY)
    return;
  let enableCrashReports = await prompt.confirm({
    message: "Would you like to send anonymous crash reports to improve Storybook and fix bugs faster?",
    initialValue: !0
  });
  return await cache.set("enableCrashReports", enableCrashReports), enableCrashReports;
};
async function getErrorLevel({
  cliOptions,
  presetOptions,
  skipPrompt
}) {
  if (cliOptions.disableTelemetry)
    return "none";
  if (!presetOptions)
    return "error";
  let core = await (await loadAllPresets(presetOptions)).apply("core");
  if (core?.enableCrashReports !== void 0)
    return core.enableCrashReports ? "full" : "error";
  if (core?.disableTelemetry)
    return "none";
  let valueFromCache = await cache.get("enableCrashReports") ?? await cache.get("enableCrashreports");
  if (valueFromCache !== void 0)
    return valueFromCache ? "full" : "error";
  if (skipPrompt)
    return "error";
  let valueFromPrompt = await promptCrashReports();
  return valueFromPrompt !== void 0 ? valueFromPrompt ? "full" : "error" : "full";
}
async function sendTelemetryError(_error, eventType, options, blocking = !0, parent) {
  try {
    let errorLevel = "error";
    try {
      errorLevel = await getErrorLevel(options);
    } catch {
    }
    if (errorLevel !== "none") {
      let precedingUpgrade = await getPrecedingUpgrade(), error = _error, errorHash;
      "message" in error ? errorHash = error.message ? oneWayHash(error.message) : "EMPTY_MESSAGE" : errorHash = "NO_MESSAGE";
      let { code, name, category } = error;
      if (await telemetry(
        "error",
        {
          code,
          name,
          category,
          eventType,
          blocking,
          precedingUpgrade,
          error: errorLevel === "full" ? error : void 0,
          errorHash,
          // if we ever end up sending a non-error instance, we'd like to know
          isErrorInstance: error instanceof Error,
          // Include parent error information if this is a sub-error
          ...parent ? { parent: parent.fullErrorCode } : {}
        },
        {
          immediate: !0,
          configDir: options.cliOptions.configDir || options.presetOptions?.configDir,
          enableCrashReports: errorLevel === "full"
        }
      ), error && "subErrors" in error && error.subErrors.length > 0)
        for (let subError of error.subErrors)
          await sendTelemetryError(subError, eventType, options, blocking, error);
    }
  } catch {
  }
}
function isTelemetryEnabled(options) {
  return !(options.cliOptions.disableTelemetry || options.cliOptions.test === !0);
}
async function withTelemetry(eventType, options, run) {
  let enableTelemetry = isTelemetryEnabled(options), canceled = !1;
  async function cancelTelemetry() {
    canceled = !0, enableTelemetry && await telemetry("canceled", { eventType }, { stripMetadata: !0, immediate: !0 }), process.exit(0);
  }
  eventType === "init" && process.on("SIGINT", cancelTelemetry), enableTelemetry && telemetry("boot", { eventType }, { stripMetadata: !0 });
  try {
    return await run();
  } catch (error) {
    if (canceled)
      return;
    if (!(error instanceof HandledError || error instanceof StorybookError && error.isHandledError)) {
      let { printError = logger2.error } = options;
      printError(error);
    }
    throw enableTelemetry && await sendTelemetryError(error, eventType, options), error;
  } finally {
    if (enableTelemetry) {
      let errors = ErrorCollector.getErrors();
      for (let error of errors)
        await sendTelemetryError(error, eventType, options, !1);
      process.off("SIGINT", cancelTelemetry);
    }
  }
}

// ../node_modules/es-toolkit/dist/function/debounce.mjs
function debounce(func, debounceMs, { signal, edges } = {}) {
  let pendingThis, pendingArgs = null, leading = edges != null && edges.includes("leading"), trailing = edges == null || edges.includes("trailing"), invoke = () => {
    pendingArgs !== null && (func.apply(pendingThis, pendingArgs), pendingThis = void 0, pendingArgs = null);
  }, onTimerEnd = () => {
    trailing && invoke(), cancel();
  }, timeoutId = null, schedule = () => {
    timeoutId != null && clearTimeout(timeoutId), timeoutId = setTimeout(() => {
      timeoutId = null, onTimerEnd();
    }, debounceMs);
  }, cancelTimer = () => {
    timeoutId !== null && (clearTimeout(timeoutId), timeoutId = null);
  }, cancel = () => {
    cancelTimer(), pendingThis = void 0, pendingArgs = null;
  }, flush = () => {
    invoke();
  }, debounced = function(...args) {
    if (signal?.aborted)
      return;
    pendingThis = this, pendingArgs = args;
    let isFirstCall = timeoutId == null;
    schedule(), leading && isFirstCall && invoke();
  };
  return debounced.schedule = schedule, debounced.cancel = cancel, debounced.flush = flush, signal?.addEventListener("abort", cancel, { once: !0 }), debounced;
}

// ../node_modules/es-toolkit/dist/function/throttle.mjs
function throttle(func, throttleMs, { signal, edges = ["leading", "trailing"] } = {}) {
  let pendingAt = null, debounced = debounce(func, throttleMs, { signal, edges }), throttled = function(...args) {
    pendingAt == null ? pendingAt = Date.now() : Date.now() - pendingAt >= throttleMs && (pendingAt = Date.now(), debounced.cancel()), debounced.apply(this, args);
  };
  return throttled.cancel = debounced.cancel, throttled.flush = debounced.flush, throttled;
}

// ../node_modules/es-toolkit/dist/function/partial.mjs
function partial(func, ...partialArgs) {
  return partialImpl(func, placeholderSymbol, ...partialArgs);
}
function partialImpl(func, placeholder, ...partialArgs) {
  let partialed = function(...providedArgs) {
    let providedArgsIndex = 0, substitutedArgs = partialArgs.slice().map((arg) => arg === placeholder ? providedArgs[providedArgsIndex++] : arg), remainingArgs = providedArgs.slice(providedArgsIndex);
    return func.apply(this, substitutedArgs.concat(remainingArgs));
  };
  return func.prototype && (partialed.prototype = Object.create(func.prototype)), partialed;
}
var placeholderSymbol = Symbol("partial.placeholder");
partial.placeholder = placeholderSymbol;

// ../node_modules/es-toolkit/dist/function/partialRight.mjs
function partialRight(func, ...partialArgs) {
  return partialRightImpl(func, placeholderSymbol2, ...partialArgs);
}
function partialRightImpl(func, placeholder, ...partialArgs) {
  let partialedRight = function(...providedArgs) {
    let placeholderLength = partialArgs.filter((arg) => arg === placeholder).length, rangeLength = Math.max(providedArgs.length - placeholderLength, 0), remainingArgs = providedArgs.slice(0, rangeLength), providedArgsIndex = rangeLength, substitutedArgs = partialArgs.slice().map((arg) => arg === placeholder ? providedArgs[providedArgsIndex++] : arg);
    return func.apply(this, remainingArgs.concat(substitutedArgs));
  };
  return func.prototype && (partialedRight.prototype = Object.create(func.prototype)), partialedRight;
}
var placeholderSymbol2 = Symbol("partialRight.placeholder");
partialRight.placeholder = placeholderSymbol2;

// ../node_modules/es-toolkit/dist/function/retry.mjs
var DEFAULT_RETRIES = Number.POSITIVE_INFINITY;

export {
  useStatics,
  parseStaticDir,
  mapStaticDir,
  debounce,
  throttle,
  getErrorLevel,
  sendTelemetryError,
  isTelemetryEnabled,
  withTelemetry
};
