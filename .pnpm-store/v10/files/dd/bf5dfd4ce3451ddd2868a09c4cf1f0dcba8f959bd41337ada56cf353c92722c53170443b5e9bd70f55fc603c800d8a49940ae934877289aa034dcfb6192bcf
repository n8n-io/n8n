import CJS_COMPAT_NODE_URL_3fsumx86qru from 'node:url';
import CJS_COMPAT_NODE_PATH_3fsumx86qru from 'node:path';
import CJS_COMPAT_NODE_MODULE_3fsumx86qru from "node:module";

var __filename = CJS_COMPAT_NODE_URL_3fsumx86qru.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_3fsumx86qru.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_3fsumx86qru.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  log,
  noop
} from "./_node-chunks/chunk-W67ZPRYX.js";
import {
  importMetaResolve
} from "./_node-chunks/chunk-NLWLVR7B.js";
import {
  ADDON_ID,
  COVERAGE_DIRECTORY,
  STATUS_STORE_CHANNEL_EVENT_NAME,
  STORE_CHANNEL_EVENT_NAME,
  STORYBOOK_ADDON_TEST_CHANNEL,
  TEST_PROVIDER_STORE_CHANNEL_EVENT_NAME,
  storeOptions
} from "./_node-chunks/chunk-DJNGUF47.js";
import {
  require_picocolors
} from "./_node-chunks/chunk-QHPWHTRG.js";
import {
  require_dist
} from "./_node-chunks/chunk-S5GBSWTG.js";
import {
  normalize
} from "./_node-chunks/chunk-PKYWPFA6.js";
import {
  __toESM
} from "./_node-chunks/chunk-4LSYFR5U.js";

// src/preset.ts
import { mkdir } from "node:fs/promises";
import {
  createFileSystemCache,
  getFrameworkName,
  loadPreviewOrConfigFile,
  resolvePathInStorybookCache
} from "storybook/internal/common";
import {
  experimental_UniversalStore,
  experimental_getTestProviderStore
} from "storybook/internal/core-server";
import { cleanPaths, oneWayHash, sanitizeError, telemetry } from "storybook/internal/telemetry";

// ../../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function isPlainObject(value) {
  if (!value || typeof value != "object")
    return !1;
  let proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null ? Object.prototype.toString.call(value) === "[object Object]" : !1;
}

// ../../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function getSymbols(object) {
  return Object.getOwnPropertySymbols(object).filter((symbol) => Object.prototype.propertyIsEnumerable.call(object, symbol));
}

// ../../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function getTag(value) {
  return value == null ? value === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value);
}

// ../../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var regexpTag = "[object RegExp]", stringTag = "[object String]", numberTag = "[object Number]", booleanTag = "[object Boolean]", argumentsTag = "[object Arguments]", symbolTag = "[object Symbol]", dateTag = "[object Date]", mapTag = "[object Map]", setTag = "[object Set]", arrayTag = "[object Array]", functionTag = "[object Function]", arrayBufferTag = "[object ArrayBuffer]", objectTag = "[object Object]", errorTag = "[object Error]", dataViewTag = "[object DataView]", uint8ArrayTag = "[object Uint8Array]", uint8ClampedArrayTag = "[object Uint8ClampedArray]", uint16ArrayTag = "[object Uint16Array]", uint32ArrayTag = "[object Uint32Array]", bigUint64ArrayTag = "[object BigUint64Array]", int8ArrayTag = "[object Int8Array]", int16ArrayTag = "[object Int16Array]", int32ArrayTag = "[object Int32Array]", bigInt64ArrayTag = "[object BigInt64Array]", float32ArrayTag = "[object Float32Array]", float64ArrayTag = "[object Float64Array]";

// ../../node_modules/es-toolkit/dist/compat/util/eq.mjs
function eq(value, other) {
  return value === other || Number.isNaN(value) && Number.isNaN(other);
}

// ../../node_modules/es-toolkit/dist/predicate/isEqualWith.mjs
function isEqualWith(a, b, areValuesEqual) {
  return isEqualWithImpl(a, b, void 0, void 0, void 0, void 0, areValuesEqual);
}
function isEqualWithImpl(a, b, property, aParent, bParent, stack, areValuesEqual) {
  let result = areValuesEqual(a, b, property, aParent, bParent, stack);
  if (result !== void 0)
    return result;
  if (typeof a == typeof b)
    switch (typeof a) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return a === b;
      case "number":
        return a === b || Object.is(a, b);
      case "function":
        return a === b;
      case "object":
        return areObjectsEqual(a, b, stack, areValuesEqual);
    }
  return areObjectsEqual(a, b, stack, areValuesEqual);
}
function areObjectsEqual(a, b, stack, areValuesEqual) {
  if (Object.is(a, b))
    return !0;
  let aTag = getTag(a), bTag = getTag(b);
  if (aTag === argumentsTag && (aTag = objectTag), bTag === argumentsTag && (bTag = objectTag), aTag !== bTag)
    return !1;
  switch (aTag) {
    case stringTag:
      return a.toString() === b.toString();
    case numberTag: {
      let x = a.valueOf(), y = b.valueOf();
      return eq(x, y);
    }
    case booleanTag:
    case dateTag:
    case symbolTag:
      return Object.is(a.valueOf(), b.valueOf());
    case regexpTag:
      return a.source === b.source && a.flags === b.flags;
    case functionTag:
      return a === b;
  }
  stack = stack ?? /* @__PURE__ */ new Map();
  let aStack = stack.get(a), bStack = stack.get(b);
  if (aStack != null && bStack != null)
    return aStack === b;
  stack.set(a, b), stack.set(b, a);
  try {
    switch (aTag) {
      case mapTag: {
        if (a.size !== b.size)
          return !1;
        for (let [key, value] of a.entries())
          if (!b.has(key) || !isEqualWithImpl(value, b.get(key), key, a, b, stack, areValuesEqual))
            return !1;
        return !0;
      }
      case setTag: {
        if (a.size !== b.size)
          return !1;
        let aValues = Array.from(a.values()), bValues = Array.from(b.values());
        for (let i = 0; i < aValues.length; i++) {
          let aValue = aValues[i], index = bValues.findIndex((bValue) => isEqualWithImpl(aValue, bValue, void 0, a, b, stack, areValuesEqual));
          if (index === -1)
            return !1;
          bValues.splice(index, 1);
        }
        return !0;
      }
      case arrayTag:
      case uint8ArrayTag:
      case uint8ClampedArrayTag:
      case uint16ArrayTag:
      case uint32ArrayTag:
      case bigUint64ArrayTag:
      case int8ArrayTag:
      case int16ArrayTag:
      case int32ArrayTag:
      case bigInt64ArrayTag:
      case float32ArrayTag:
      case float64ArrayTag: {
        if (typeof Buffer < "u" && Buffer.isBuffer(a) !== Buffer.isBuffer(b) || a.length !== b.length)
          return !1;
        for (let i = 0; i < a.length; i++)
          if (!isEqualWithImpl(a[i], b[i], i, a, b, stack, areValuesEqual))
            return !1;
        return !0;
      }
      case arrayBufferTag:
        return a.byteLength !== b.byteLength ? !1 : areObjectsEqual(new Uint8Array(a), new Uint8Array(b), stack, areValuesEqual);
      case dataViewTag:
        return a.byteLength !== b.byteLength || a.byteOffset !== b.byteOffset ? !1 : areObjectsEqual(new Uint8Array(a), new Uint8Array(b), stack, areValuesEqual);
      case errorTag:
        return a.name === b.name && a.message === b.message;
      case objectTag: {
        if (!(areObjectsEqual(a.constructor, b.constructor, stack, areValuesEqual) || isPlainObject(a) && isPlainObject(b)))
          return !1;
        let aKeys = [...Object.keys(a), ...getSymbols(a)], bKeys = [...Object.keys(b), ...getSymbols(b)];
        if (aKeys.length !== bKeys.length)
          return !1;
        for (let i = 0; i < aKeys.length; i++) {
          let propKey = aKeys[i], aProp = a[propKey];
          if (!Object.hasOwn(b, propKey))
            return !1;
          let bProp = b[propKey];
          if (!isEqualWithImpl(aProp, bProp, propKey, a, b, stack, areValuesEqual))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    stack.delete(a), stack.delete(b);
  }
}

// ../../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function isEqual(a, b) {
  return isEqualWith(a, b, noop);
}

// src/preset.ts
var import_picocolors = __toESM(require_picocolors(), 1), import_ts_dedent = __toESM(require_dist(), 1);

// src/node/boot-test-runner.ts
import { fileURLToPath } from "node:url";
import { executeNodeCommand } from "storybook/internal/common";
import {
  internal_universalStatusStore,
  internal_universalTestProviderStore
} from "storybook/internal/core-server";
var MAX_START_TIME = 3e4, vitestModulePath = fileURLToPath(importMetaResolve("@storybook/addon-vitest/vitest")), eventQueue = [], child, ready = !1, unsubscribeStore, unsubscribeStatusStore, unsubscribeTestProviderStore, forwardUniversalStoreEvent = (storeEventName) => (event, eventInfo) => {
  child?.send({
    type: storeEventName,
    args: [{ event, eventInfo }],
    from: "server"
  });
}, bootTestRunner = async ({
  channel,
  store,
  options
}) => {
  let stderr = [], killChild = () => {
    unsubscribeStore?.(), unsubscribeStatusStore?.(), unsubscribeTestProviderStore?.(), child?.kill(), child = null;
  };
  store.subscribe("FATAL_ERROR", killChild);
  let exit = (code = 0) => {
    killChild(), eventQueue.length = 0, process.exit(code);
  };
  process.on("exit", exit), process.on("SIGINT", () => exit(0)), process.on("SIGTERM", () => exit(0));
  let startChildProcess = () => new Promise((resolve, reject) => {
    child = executeNodeCommand({
      scriptPath: vitestModulePath,
      options: {
        env: {
          VITEST: "true",
          TEST: "true",
          VITEST_CHILD_PROCESS: "true",
          NODE_ENV: process.env.NODE_ENV ?? "test",
          STORYBOOK_CONFIG_DIR: normalize(options.configDir)
        },
        extendEnv: !0
      }
    }), stderr = [], child.stdout?.on("data", log), child.stderr?.on("data", (data) => {
      data.toString().match(/^\u001B\[33m/) || (log(data), stderr.push(data.toString()));
    }), unsubscribeStore = store.subscribe(forwardUniversalStoreEvent(STORE_CHANNEL_EVENT_NAME)), unsubscribeStatusStore = internal_universalStatusStore.subscribe(
      forwardUniversalStoreEvent(STATUS_STORE_CHANNEL_EVENT_NAME)
    ), unsubscribeTestProviderStore = internal_universalTestProviderStore.subscribe(
      forwardUniversalStoreEvent(TEST_PROVIDER_STORE_CHANNEL_EVENT_NAME)
    ), child.on("message", (event) => {
      if (event.type === "ready") {
        for (; eventQueue.length; ) {
          let { type, args } = eventQueue.shift();
          child?.send({ type, args, from: "server" });
        }
        resolve();
      } else event.type === "uncaught-error" ? (store.send({
        type: "FATAL_ERROR",
        payload: event.payload
      }), reject()) : channel.emit(event.type, ...event.args);
    });
  }), timeout = new Promise(
    (_, reject) => setTimeout(
      reject,
      MAX_START_TIME,
      // eslint-disable-next-line local-rules/no-uncategorized-errors
      new Error(
        `Aborting test runner process because it took longer than ${MAX_START_TIME / 1e3} seconds to start.`
      )
    )
  );
  await Promise.race([startChildProcess(), timeout]).catch((error) => {
    throw store.send({
      type: "FATAL_ERROR",
      payload: {
        message: "Failed to start test runner process",
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          cause: error.cause
        }
      }
    }), eventQueue.length = 0, error;
  });
}, runTestRunner = async ({
  channel,
  store,
  initEvent,
  initArgs,
  options
}) => {
  !ready && initEvent && eventQueue.push({ type: initEvent, args: initArgs }), child || (ready = !1, await bootTestRunner({ channel, store, options }), ready = !0);
};

// src/preset.ts
var experimental_serverChannel = async (channel, options) => {
  let core = await options.presets.apply("core"), previewPath = loadPreviewOrConfigFile({ configDir: options.configDir }), previewAnnotations = await options.presets.apply(
    "previewAnnotations",
    [],
    options
  ), resolvedPreviewBuilder = typeof core?.builder == "string" ? core.builder : core?.builder?.name, framework = await getFrameworkName(options);
  if (!resolvedPreviewBuilder?.includes("vite"))
    return framework.includes("nextjs") && log(import_ts_dedent.dedent`
        You're using ${framework}, which is a Webpack-based builder. In order to use Storybook Test, with your project, you need to use '@storybook/nextjs-vite', a high performance Vite-based equivalent.

        Information on how to upgrade here: ${import_picocolors.default.yellow("https://storybook.js.org/docs/get-started/frameworks/nextjs?ref=upgrade#with-vite")}\n
      `), channel;
  let fsCache = createFileSystemCache({
    basePath: resolvePathInStorybookCache(ADDON_ID.replace("/", "-")),
    ns: "storybook",
    ttl: 336 * 60 * 60 * 1e3
    // 14 days
  }), cachedState = await fsCache.get("state", {
    config: storeOptions.initialState.config
  }), selectCachedState = (s) => ({
    config: s.config
  }), store = experimental_UniversalStore.create({
    ...storeOptions,
    initialState: {
      ...storeOptions.initialState,
      previewAnnotations: (previewAnnotations ?? []).concat(previewPath ?? []),
      ...selectCachedState(cachedState)
    },
    leader: !0
  });
  store.onStateChange((state, previousState) => {
    isEqual(selectCachedState(state), selectCachedState(previousState)) || fsCache.set("state", selectCachedState(state));
  });
  let testProviderStore = experimental_getTestProviderStore(ADDON_ID);
  if (store.subscribe("TRIGGER_RUN", (event, eventInfo) => {
    testProviderStore.setState("test-provider-state:running"), store.setState((s) => ({
      ...s,
      fatalError: void 0
    })), runTestRunner({
      channel,
      store,
      initEvent: STORE_CHANNEL_EVENT_NAME,
      initArgs: [{ event, eventInfo }],
      options
    });
  }), store.subscribe("TOGGLE_WATCHING", (event, eventInfo) => {
    store.setState((s) => ({
      ...s,
      watching: event.payload.to,
      currentRun: {
        ...s.currentRun,
        // when enabling watch mode, clear the coverage summary too
        ...event.payload.to && {
          coverageSummary: void 0
        }
      }
    })), event.payload.to && runTestRunner({
      channel,
      store,
      initEvent: STORE_CHANNEL_EVENT_NAME,
      initArgs: [{ event, eventInfo }],
      options
    });
  }), store.subscribe("FATAL_ERROR", (event) => {
    let { message, error } = event.payload, name = error.name || "Error";
    log(`${name}: ${message}`), error.stack && log(error.stack);
    function logErrorWithCauses(err) {
      err && (log(`Caused by: ${err.name ?? "Error"}: ${err.message}`), err.stack && log(err.stack), err.cause && logErrorWithCauses(err.cause));
    }
    error.cause && logErrorWithCauses(error.cause), store.setState((s) => ({
      ...s,
      fatalError: {
        message,
        error
      }
    })), testProviderStore.setState("test-provider-state:crashed");
  }), testProviderStore.onClearAll(() => {
    store.setState((s) => ({
      ...s,
      currentRun: { ...s.currentRun, coverageSummary: void 0, unhandledErrors: [] }
    }));
  }), !core.disableTelemetry) {
    let enableCrashReports = core.enableCrashReports || options.enableCrashReports;
    channel.on(STORYBOOK_ADDON_TEST_CHANNEL, (event) => {
      event.type !== "test-run-completed" && telemetry("addon-test", {
        ...event,
        payload: {
          ...event.payload,
          storyId: oneWayHash(event.payload.storyId)
        }
      });
    }), store.subscribe("TOGGLE_WATCHING", async (event) => {
      await telemetry("addon-test", {
        watchMode: event.payload.to
      });
    }), store.subscribe("TEST_RUN_COMPLETED", async (event) => {
      let { unhandledErrors, startedAt, finishedAt, ...currentRun } = event.payload;
      await telemetry("addon-test", {
        ...currentRun,
        duration: (finishedAt ?? 0) - (startedAt ?? 0),
        unhandledErrorCount: unhandledErrors.length,
        ...enableCrashReports && unhandledErrors.length > 0 && {
          unhandledErrors: unhandledErrors.map((error) => {
            let { stacks, ...errorWithoutStacks } = error;
            return sanitizeError(errorWithoutStacks);
          })
        }
      });
    }), enableCrashReports && store.subscribe("FATAL_ERROR", async (event) => {
      await telemetry("addon-test", {
        fatalError: cleanPaths(event.payload.error.message)
      });
    });
  }
  return channel;
}, staticDirs = async (values = [], options) => {
  if (options.configType === "PRODUCTION")
    return values;
  let coverageDirectory = resolvePathInStorybookCache(COVERAGE_DIRECTORY);
  return await mkdir(coverageDirectory, { recursive: !0 }), [
    {
      from: coverageDirectory,
      to: "/coverage"
    },
    ...values
  ];
};
export {
  experimental_serverChannel,
  staticDirs
};
