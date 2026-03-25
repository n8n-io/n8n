"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  PrismaInstrumentation: () => PrismaInstrumentation,
  registerInstrumentations: () => import_instrumentation2.registerInstrumentations
});
module.exports = __toCommonJS(index_exports);

// src/PrismaInstrumentation.ts
var import_api2 = require("@opentelemetry/api");
var import_instrumentation = require("@opentelemetry/instrumentation");

// ../instrumentation-contract/dist/index.mjs
var package_default = {
  name: "@prisma/instrumentation-contract",
  version: "7.2.0",
  description: "Shared types and utilities for Prisma instrumentation",
  main: "dist/index.js",
  module: "dist/index.mjs",
  types: "dist/index.d.ts",
  exports: {
    ".": {
      require: {
        types: "./dist/index.d.ts",
        default: "./dist/index.js"
      },
      import: {
        types: "./dist/index.d.mts",
        default: "./dist/index.mjs"
      }
    }
  },
  license: "Apache-2.0",
  homepage: "https://www.prisma.io",
  repository: {
    type: "git",
    url: "https://github.com/prisma/prisma.git",
    directory: "packages/instrumentation-contract"
  },
  bugs: "https://github.com/prisma/prisma/issues",
  scripts: {
    dev: "DEV=true tsx helpers/build.ts",
    build: "tsx helpers/build.ts",
    prepublishOnly: "pnpm run build",
    test: "vitest run"
  },
  files: [
    "dist"
  ],
  sideEffects: false,
  devDependencies: {
    "@opentelemetry/api": "1.9.0"
  },
  peerDependencies: {
    "@opentelemetry/api": "^1.8"
  }
};
var majorVersion = package_default.version.split(".")[0];
var GLOBAL_INSTRUMENTATION_KEY = "PRISMA_INSTRUMENTATION";
var GLOBAL_VERSIONED_INSTRUMENTATION_KEY = `V${majorVersion}_PRISMA_INSTRUMENTATION`;
var globalThisWithPrismaInstrumentation = globalThis;
function getGlobalTracingHelper() {
  const versionedGlobal = globalThisWithPrismaInstrumentation[GLOBAL_VERSIONED_INSTRUMENTATION_KEY];
  if (versionedGlobal?.helper) {
    return versionedGlobal.helper;
  }
  const fallbackGlobal = globalThisWithPrismaInstrumentation[GLOBAL_INSTRUMENTATION_KEY];
  return fallbackGlobal?.helper;
}
function setGlobalTracingHelper(helper) {
  const globalValue = { helper };
  globalThisWithPrismaInstrumentation[GLOBAL_VERSIONED_INSTRUMENTATION_KEY] = globalValue;
  globalThisWithPrismaInstrumentation[GLOBAL_INSTRUMENTATION_KEY] = globalValue;
}
function clearGlobalTracingHelper() {
  delete globalThisWithPrismaInstrumentation[GLOBAL_VERSIONED_INSTRUMENTATION_KEY];
  delete globalThisWithPrismaInstrumentation[GLOBAL_INSTRUMENTATION_KEY];
}

// src/ActiveTracingHelper.ts
var import_api = require("@opentelemetry/api");
var showAllTraces = process.env.PRISMA_SHOW_ALL_TRACES === "true";
var nonSampledTraceParent = `00-10-10-00`;
function engineSpanKindToOtelSpanKind(engineSpanKind) {
  switch (engineSpanKind) {
    case "client":
      return import_api.SpanKind.CLIENT;
    case "internal":
    default:
      return import_api.SpanKind.INTERNAL;
  }
}
var ActiveTracingHelper = class {
  tracerProvider;
  ignoreSpanTypes;
  constructor({ tracerProvider, ignoreSpanTypes }) {
    this.tracerProvider = tracerProvider;
    this.ignoreSpanTypes = ignoreSpanTypes;
  }
  isEnabled() {
    return true;
  }
  getTraceParent(context) {
    const span = import_api.trace.getSpanContext(context ?? import_api.context.active());
    if (span) {
      return `00-${span.traceId}-${span.spanId}-0${span.traceFlags}`;
    }
    return nonSampledTraceParent;
  }
  dispatchEngineSpans(spans) {
    const tracer = this.tracerProvider.getTracer("prisma");
    const linkIds = /* @__PURE__ */ new Map();
    const roots = spans.filter((span) => span.parentId === null);
    for (const root of roots) {
      dispatchEngineSpan(tracer, root, spans, linkIds, this.ignoreSpanTypes);
    }
  }
  getActiveContext() {
    return import_api.context.active();
  }
  runInChildSpan(options, callback) {
    if (typeof options === "string") {
      options = { name: options };
    }
    if (options.internal && !showAllTraces) {
      return callback();
    }
    const tracer = this.tracerProvider.getTracer("prisma");
    const context = options.context ?? this.getActiveContext();
    const name = `prisma:client:${options.name}`;
    if (shouldIgnoreSpan(name, this.ignoreSpanTypes)) {
      return callback();
    }
    if (options.active === false) {
      const span = tracer.startSpan(name, options, context);
      return endSpan(span, callback(span, context));
    }
    return tracer.startActiveSpan(name, options, (span) => endSpan(span, callback(span, context)));
  }
};
function dispatchEngineSpan(tracer, engineSpan, allSpans, linkIds, ignoreSpanTypes) {
  if (shouldIgnoreSpan(engineSpan.name, ignoreSpanTypes)) return;
  const spanOptions = {
    attributes: engineSpan.attributes,
    kind: engineSpanKindToOtelSpanKind(engineSpan.kind),
    startTime: engineSpan.startTime
  };
  tracer.startActiveSpan(engineSpan.name, spanOptions, (span) => {
    linkIds.set(engineSpan.id, span.spanContext().spanId);
    if (engineSpan.links) {
      span.addLinks(
        engineSpan.links.flatMap((link) => {
          const linkedId = linkIds.get(link);
          if (!linkedId) {
            return [];
          }
          return {
            context: {
              spanId: linkedId,
              traceId: span.spanContext().traceId,
              traceFlags: span.spanContext().traceFlags
            }
          };
        })
      );
    }
    const children = allSpans.filter((s) => s.parentId === engineSpan.id);
    for (const child of children) {
      dispatchEngineSpan(tracer, child, allSpans, linkIds, ignoreSpanTypes);
    }
    span.end(engineSpan.endTime);
  });
}
function endSpan(span, result) {
  if (isPromiseLike(result)) {
    return result.then(
      (value) => {
        span.end();
        return value;
      },
      (reason) => {
        span.end();
        throw reason;
      }
    );
  }
  span.end();
  return result;
}
function isPromiseLike(value) {
  return value != null && typeof value["then"] === "function";
}
function shouldIgnoreSpan(spanName, ignoreSpanTypes) {
  return ignoreSpanTypes.some(
    (pattern) => typeof pattern === "string" ? pattern === spanName : pattern.test(spanName)
  );
}

// package.json
var package_default2 = {
  name: "@prisma/instrumentation",
  version: "7.2.0",
  description: "OpenTelemetry compliant instrumentation for Prisma Client",
  main: "dist/index.js",
  module: "dist/index.mjs",
  types: "dist/index.d.ts",
  exports: {
    ".": {
      require: {
        types: "./dist/index.d.ts",
        default: "./dist/index.js"
      },
      import: {
        types: "./dist/index.d.ts",
        default: "./dist/index.mjs"
      }
    }
  },
  license: "Apache-2.0",
  homepage: "https://www.prisma.io",
  repository: {
    type: "git",
    url: "https://github.com/prisma/prisma.git",
    directory: "packages/instrumentation"
  },
  bugs: "https://github.com/prisma/prisma/issues",
  devDependencies: {
    "@opentelemetry/api": "1.9.0",
    "@prisma/instrumentation-contract": "workspace:*",
    "@types/node": "~20.19.24",
    typescript: "5.4.5"
  },
  dependencies: {
    "@opentelemetry/instrumentation": "^0.207.0"
  },
  peerDependencies: {
    "@opentelemetry/api": "^1.8"
  },
  files: [
    "dist"
  ],
  keywords: [
    "prisma",
    "instrumentation",
    "opentelemetry",
    "otel"
  ],
  scripts: {
    dev: "DEV=true tsx helpers/build.ts",
    build: "tsx helpers/build.ts",
    prepublishOnly: "pnpm run build",
    test: "vitest run"
  },
  sideEffects: false
};

// src/constants.ts
var VERSION = package_default2.version;
var NAME = package_default2.name;
var MODULE_NAME = "@prisma/client";

// src/PrismaInstrumentation.ts
var PrismaInstrumentation = class extends import_instrumentation.InstrumentationBase {
  tracerProvider;
  constructor(config = {}) {
    super(NAME, VERSION, config);
  }
  setTracerProvider(tracerProvider) {
    this.tracerProvider = tracerProvider;
  }
  init() {
    const module2 = new import_instrumentation.InstrumentationNodeModuleDefinition(MODULE_NAME, [VERSION]);
    return [module2];
  }
  enable() {
    const config = this._config;
    setGlobalTracingHelper(
      new ActiveTracingHelper({
        tracerProvider: this.tracerProvider ?? import_api2.trace.getTracerProvider(),
        ignoreSpanTypes: config.ignoreSpanTypes ?? []
      })
    );
  }
  disable() {
    clearGlobalTracingHelper();
  }
  isEnabled() {
    return getGlobalTracingHelper() !== void 0;
  }
};

// src/index.ts
var import_instrumentation2 = require("@opentelemetry/instrumentation");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PrismaInstrumentation,
  registerInstrumentations
});
