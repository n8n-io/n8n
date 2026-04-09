var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var logger_exports = {};
__export(logger_exports, {
  TypeSpecRuntimeLogger: () => TypeSpecRuntimeLogger,
  createClientLogger: () => createClientLogger,
  createLoggerContext: () => createLoggerContext,
  getLogLevel: () => getLogLevel,
  setLogLevel: () => setLogLevel
});
module.exports = __toCommonJS(logger_exports);
var import_debug = __toESM(require("./debug.js"));
const TYPESPEC_RUNTIME_LOG_LEVELS = ["verbose", "info", "warning", "error"];
const levelMap = {
  verbose: 400,
  info: 300,
  warning: 200,
  error: 100
};
function patchLogMethod(parent, child) {
  child.log = (...args) => {
    parent.log(...args);
  };
}
function isTypeSpecRuntimeLogLevel(level) {
  return TYPESPEC_RUNTIME_LOG_LEVELS.includes(level);
}
function createLoggerContext(options) {
  const registeredLoggers = /* @__PURE__ */ new Set();
  const logLevelFromEnv = typeof process !== "undefined" && process.env && process.env[options.logLevelEnvVarName] || void 0;
  let logLevel;
  const clientLogger = (0, import_debug.default)(options.namespace);
  clientLogger.log = (...args) => {
    import_debug.default.log(...args);
  };
  function contextSetLogLevel(level) {
    if (level && !isTypeSpecRuntimeLogLevel(level)) {
      throw new Error(
        `Unknown log level '${level}'. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(",")}`
      );
    }
    logLevel = level;
    const enabledNamespaces = [];
    for (const logger of registeredLoggers) {
      if (shouldEnable(logger)) {
        enabledNamespaces.push(logger.namespace);
      }
    }
    import_debug.default.enable(enabledNamespaces.join(","));
  }
  if (logLevelFromEnv) {
    if (isTypeSpecRuntimeLogLevel(logLevelFromEnv)) {
      contextSetLogLevel(logLevelFromEnv);
    } else {
      console.error(
        `${options.logLevelEnvVarName} set to unknown log level '${logLevelFromEnv}'; logging is not enabled. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(
          ", "
        )}.`
      );
    }
  }
  function shouldEnable(logger) {
    return Boolean(logLevel && levelMap[logger.level] <= levelMap[logLevel]);
  }
  function createLogger(parent, level) {
    const logger = Object.assign(parent.extend(level), {
      level
    });
    patchLogMethod(parent, logger);
    if (shouldEnable(logger)) {
      const enabledNamespaces = import_debug.default.disable();
      import_debug.default.enable(enabledNamespaces + "," + logger.namespace);
    }
    registeredLoggers.add(logger);
    return logger;
  }
  function contextGetLogLevel() {
    return logLevel;
  }
  function contextCreateClientLogger(namespace) {
    const clientRootLogger = clientLogger.extend(namespace);
    patchLogMethod(clientLogger, clientRootLogger);
    return {
      error: createLogger(clientRootLogger, "error"),
      warning: createLogger(clientRootLogger, "warning"),
      info: createLogger(clientRootLogger, "info"),
      verbose: createLogger(clientRootLogger, "verbose")
    };
  }
  return {
    setLogLevel: contextSetLogLevel,
    getLogLevel: contextGetLogLevel,
    createClientLogger: contextCreateClientLogger,
    logger: clientLogger
  };
}
const context = createLoggerContext({
  logLevelEnvVarName: "TYPESPEC_RUNTIME_LOG_LEVEL",
  namespace: "typeSpecRuntime"
});
const TypeSpecRuntimeLogger = context.logger;
function setLogLevel(logLevel) {
  context.setLogLevel(logLevel);
}
function getLogLevel() {
  return context.getLogLevel();
}
function createClientLogger(namespace) {
  return context.createClientLogger(namespace);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TypeSpecRuntimeLogger,
  createClientLogger,
  createLoggerContext,
  getLogLevel,
  setLogLevel
});
