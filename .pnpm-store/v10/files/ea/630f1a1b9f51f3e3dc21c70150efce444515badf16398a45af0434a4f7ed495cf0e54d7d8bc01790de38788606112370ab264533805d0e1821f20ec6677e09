"use strict";
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
var config_exports = {};
__export(config_exports, {
  commaSeparatedList: () => commaSeparatedList,
  configFromCLIOptions: () => configFromCLIOptions,
  defaultConfig: () => defaultConfig,
  dotenvFileLoader: () => dotenvFileLoader,
  enumParser: () => enumParser,
  headerParser: () => headerParser,
  numberParser: () => numberParser,
  outputDir: () => outputDir,
  outputFile: () => outputFile,
  resolutionParser: () => resolutionParser,
  resolveCLIConfig: () => resolveCLIConfig,
  resolveConfig: () => resolveConfig,
  semicolonSeparatedList: () => semicolonSeparatedList
});
module.exports = __toCommonJS(config_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_playwright_core = require("playwright-core");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_util = require("../../util");
var import_server = require("../sdk/server");
const defaultConfig = {
  browser: {
    browserName: "chromium",
    launchOptions: {
      channel: "chrome",
      headless: import_os.default.platform() === "linux" && !process.env.DISPLAY,
      chromiumSandbox: true
    },
    contextOptions: {
      viewport: null
    }
  },
  console: {
    level: "info"
  },
  network: {
    allowedOrigins: void 0,
    blockedOrigins: void 0
  },
  server: {},
  saveTrace: false,
  snapshot: {
    mode: "incremental",
    output: "stdout"
  },
  timeouts: {
    action: 5e3,
    navigation: 6e4
  }
};
async function resolveConfig(config) {
  return mergeConfig(defaultConfig, config);
}
async function resolveCLIConfig(cliOptions) {
  const configInFile = await loadConfig(cliOptions.config);
  const envOverrides = configFromEnv();
  const cliOverrides = configFromCLIOptions(cliOptions);
  let result = defaultConfig;
  result = mergeConfig(result, configInFile);
  result = mergeConfig(result, envOverrides);
  result = mergeConfig(result, cliOverrides);
  await validateConfig(result);
  return result;
}
async function validateConfig(config) {
  if (config.browser.initScript) {
    for (const script of config.browser.initScript) {
      if (!await (0, import_util.fileExistsAsync)(script))
        throw new Error(`Init script file does not exist: ${script}`);
    }
  }
  if (config.browser.initPage) {
    for (const page of config.browser.initPage) {
      if (!await (0, import_util.fileExistsAsync)(page))
        throw new Error(`Init page file does not exist: ${page}`);
    }
  }
  if (config.sharedBrowserContext && config.saveVideo)
    throw new Error("saveVideo is not supported when sharedBrowserContext is true");
}
function configFromCLIOptions(cliOptions) {
  let browserName;
  let channel;
  switch (cliOptions.browser) {
    case "chrome":
    case "chrome-beta":
    case "chrome-canary":
    case "chrome-dev":
    case "chromium":
    case "msedge":
    case "msedge-beta":
    case "msedge-canary":
    case "msedge-dev":
      browserName = "chromium";
      channel = cliOptions.browser;
      break;
    case "firefox":
      browserName = "firefox";
      break;
    case "webkit":
      browserName = "webkit";
      break;
  }
  const launchOptions = {
    channel,
    executablePath: cliOptions.executablePath,
    headless: cliOptions.headless
  };
  if (cliOptions.sandbox === false)
    launchOptions.chromiumSandbox = false;
  if (cliOptions.proxyServer) {
    launchOptions.proxy = {
      server: cliOptions.proxyServer
    };
    if (cliOptions.proxyBypass)
      launchOptions.proxy.bypass = cliOptions.proxyBypass;
  }
  if (cliOptions.device && cliOptions.cdpEndpoint)
    throw new Error("Device emulation is not supported with cdpEndpoint.");
  const contextOptions = cliOptions.device ? import_playwright_core.devices[cliOptions.device] : {};
  if (cliOptions.storageState)
    contextOptions.storageState = cliOptions.storageState;
  if (cliOptions.userAgent)
    contextOptions.userAgent = cliOptions.userAgent;
  if (cliOptions.viewportSize)
    contextOptions.viewport = cliOptions.viewportSize;
  if (cliOptions.ignoreHttpsErrors)
    contextOptions.ignoreHTTPSErrors = true;
  if (cliOptions.blockServiceWorkers)
    contextOptions.serviceWorkers = "block";
  if (cliOptions.grantPermissions)
    contextOptions.permissions = cliOptions.grantPermissions;
  const result = {
    browser: {
      browserName,
      isolated: cliOptions.isolated,
      userDataDir: cliOptions.userDataDir,
      launchOptions,
      contextOptions,
      cdpEndpoint: cliOptions.cdpEndpoint,
      cdpHeaders: cliOptions.cdpHeader,
      initPage: cliOptions.initPage,
      initScript: cliOptions.initScript
    },
    server: {
      port: cliOptions.port,
      host: cliOptions.host,
      allowedHosts: cliOptions.allowedHosts
    },
    capabilities: cliOptions.caps,
    console: {
      level: cliOptions.consoleLevel
    },
    network: {
      allowedOrigins: cliOptions.allowedOrigins,
      blockedOrigins: cliOptions.blockedOrigins
    },
    allowUnrestrictedFileAccess: cliOptions.allowUnrestrictedFileAccess,
    codegen: cliOptions.codegen,
    saveSession: cliOptions.saveSession,
    saveTrace: cliOptions.saveTrace,
    saveVideo: cliOptions.saveVideo,
    secrets: cliOptions.secrets,
    sharedBrowserContext: cliOptions.sharedBrowserContext,
    snapshot: cliOptions.snapshotMode ? { mode: cliOptions.snapshotMode } : void 0,
    outputMode: cliOptions.outputMode,
    outputDir: cliOptions.outputDir,
    imageResponses: cliOptions.imageResponses,
    testIdAttribute: cliOptions.testIdAttribute,
    timeouts: {
      action: cliOptions.timeoutAction,
      navigation: cliOptions.timeoutNavigation
    }
  };
  return result;
}
function configFromEnv() {
  const options = {};
  options.allowedHosts = commaSeparatedList(process.env.PLAYWRIGHT_MCP_ALLOWED_HOSTNAMES);
  options.allowedOrigins = semicolonSeparatedList(process.env.PLAYWRIGHT_MCP_ALLOWED_ORIGINS);
  options.allowUnrestrictedFileAccess = envToBoolean(process.env.PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS);
  options.blockedOrigins = semicolonSeparatedList(process.env.PLAYWRIGHT_MCP_BLOCKED_ORIGINS);
  options.blockServiceWorkers = envToBoolean(process.env.PLAYWRIGHT_MCP_BLOCK_SERVICE_WORKERS);
  options.browser = envToString(process.env.PLAYWRIGHT_MCP_BROWSER);
  options.caps = commaSeparatedList(process.env.PLAYWRIGHT_MCP_CAPS);
  options.cdpEndpoint = envToString(process.env.PLAYWRIGHT_MCP_CDP_ENDPOINT);
  options.cdpHeader = headerParser(process.env.PLAYWRIGHT_MCP_CDP_HEADERS, {});
  options.config = envToString(process.env.PLAYWRIGHT_MCP_CONFIG);
  if (process.env.PLAYWRIGHT_MCP_CONSOLE_LEVEL)
    options.consoleLevel = enumParser("--console-level", ["error", "warning", "info", "debug"], process.env.PLAYWRIGHT_MCP_CONSOLE_LEVEL);
  options.device = envToString(process.env.PLAYWRIGHT_MCP_DEVICE);
  options.executablePath = envToString(process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH);
  options.grantPermissions = commaSeparatedList(process.env.PLAYWRIGHT_MCP_GRANT_PERMISSIONS);
  options.headless = envToBoolean(process.env.PLAYWRIGHT_MCP_HEADLESS);
  options.host = envToString(process.env.PLAYWRIGHT_MCP_HOST);
  options.ignoreHttpsErrors = envToBoolean(process.env.PLAYWRIGHT_MCP_IGNORE_HTTPS_ERRORS);
  const initPage = envToString(process.env.PLAYWRIGHT_MCP_INIT_PAGE);
  if (initPage)
    options.initPage = [initPage];
  const initScript = envToString(process.env.PLAYWRIGHT_MCP_INIT_SCRIPT);
  if (initScript)
    options.initScript = [initScript];
  options.isolated = envToBoolean(process.env.PLAYWRIGHT_MCP_ISOLATED);
  if (process.env.PLAYWRIGHT_MCP_IMAGE_RESPONSES)
    options.imageResponses = enumParser("--image-responses", ["allow", "omit"], process.env.PLAYWRIGHT_MCP_IMAGE_RESPONSES);
  options.sandbox = envToBoolean(process.env.PLAYWRIGHT_MCP_SANDBOX);
  options.outputDir = envToString(process.env.PLAYWRIGHT_MCP_OUTPUT_DIR);
  options.port = numberParser(process.env.PLAYWRIGHT_MCP_PORT);
  options.proxyBypass = envToString(process.env.PLAYWRIGHT_MCP_PROXY_BYPASS);
  options.proxyServer = envToString(process.env.PLAYWRIGHT_MCP_PROXY_SERVER);
  options.saveTrace = envToBoolean(process.env.PLAYWRIGHT_MCP_SAVE_TRACE);
  options.saveVideo = resolutionParser("--save-video", process.env.PLAYWRIGHT_MCP_SAVE_VIDEO);
  options.secrets = dotenvFileLoader(process.env.PLAYWRIGHT_MCP_SECRETS_FILE);
  options.storageState = envToString(process.env.PLAYWRIGHT_MCP_STORAGE_STATE);
  options.testIdAttribute = envToString(process.env.PLAYWRIGHT_MCP_TEST_ID_ATTRIBUTE);
  options.timeoutAction = numberParser(process.env.PLAYWRIGHT_MCP_TIMEOUT_ACTION);
  options.timeoutNavigation = numberParser(process.env.PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION);
  options.userAgent = envToString(process.env.PLAYWRIGHT_MCP_USER_AGENT);
  options.userDataDir = envToString(process.env.PLAYWRIGHT_MCP_USER_DATA_DIR);
  options.viewportSize = resolutionParser("--viewport-size", process.env.PLAYWRIGHT_MCP_VIEWPORT_SIZE);
  return configFromCLIOptions(options);
}
async function loadConfig(configFile) {
  if (!configFile)
    return {};
  try {
    return JSON.parse(await import_fs.default.promises.readFile(configFile, "utf8"));
  } catch (error) {
    throw new Error(`Failed to load config file: ${configFile}, ${error}`);
  }
}
function tmpDir() {
  return import_path.default.join(process.env.PW_TMPDIR_FOR_TEST ?? import_os.default.tmpdir(), "playwright-mcp-output");
}
function outputDir(config, clientInfo) {
  const rootPath = (0, import_server.firstRootPath)(clientInfo);
  return config.outputDir ?? (rootPath ? import_path.default.join(rootPath, ".playwright-mcp") : void 0) ?? import_path.default.join(tmpDir(), String(clientInfo.timestamp));
}
async function outputFile(config, clientInfo, fileName, options) {
  const file = await resolveFile(config, clientInfo, fileName, options);
  await import_fs.default.promises.mkdir(import_path.default.dirname(file), { recursive: true });
  (0, import_utilsBundle.debug)("pw:mcp:file")(options.title, file);
  return file;
}
async function resolveFile(config, clientInfo, fileName, options) {
  const dir = outputDir(config, clientInfo);
  if (options.origin === "code")
    return import_path.default.resolve(dir, fileName);
  if (options.origin === "llm") {
    fileName = fileName.split("\\").join("/");
    const resolvedFile = import_path.default.resolve(dir, fileName);
    if (!resolvedFile.startsWith(import_path.default.resolve(dir) + import_path.default.sep))
      throw new Error(`Resolved file path ${resolvedFile} is outside of the output directory ${dir}. Use relative file names to stay within the output directory.`);
    return resolvedFile;
  }
  return import_path.default.join(dir, sanitizeForFilePath(fileName));
}
function pickDefined(obj) {
  return Object.fromEntries(
    Object.entries(obj ?? {}).filter(([_, v]) => v !== void 0)
  );
}
function mergeConfig(base, overrides) {
  const browser = {
    ...pickDefined(base.browser),
    ...pickDefined(overrides.browser),
    browserName: overrides.browser?.browserName ?? base.browser?.browserName ?? "chromium",
    isolated: overrides.browser?.isolated ?? base.browser?.isolated ?? false,
    launchOptions: {
      ...pickDefined(base.browser?.launchOptions),
      ...pickDefined(overrides.browser?.launchOptions),
      ...{ assistantMode: true }
    },
    contextOptions: {
      ...pickDefined(base.browser?.contextOptions),
      ...pickDefined(overrides.browser?.contextOptions)
    }
  };
  if (browser.browserName !== "chromium" && browser.launchOptions)
    delete browser.launchOptions.channel;
  return {
    ...pickDefined(base),
    ...pickDefined(overrides),
    browser,
    console: {
      ...pickDefined(base.console),
      ...pickDefined(overrides.console)
    },
    network: {
      ...pickDefined(base.network),
      ...pickDefined(overrides.network)
    },
    server: {
      ...pickDefined(base.server),
      ...pickDefined(overrides.server)
    },
    snapshot: {
      ...pickDefined(base.snapshot),
      ...pickDefined(overrides.snapshot)
    },
    timeouts: {
      ...pickDefined(base.timeouts),
      ...pickDefined(overrides.timeouts)
    }
  };
}
function semicolonSeparatedList(value) {
  if (!value)
    return void 0;
  return value.split(";").map((v) => v.trim());
}
function commaSeparatedList(value) {
  if (!value)
    return void 0;
  return value.split(",").map((v) => v.trim());
}
function dotenvFileLoader(value) {
  if (!value)
    return void 0;
  return import_utilsBundle.dotenv.parse(import_fs.default.readFileSync(value, "utf8"));
}
function numberParser(value) {
  if (!value)
    return void 0;
  return +value;
}
function resolutionParser(name, value) {
  if (!value)
    return void 0;
  if (value.includes("x")) {
    const [width, height] = value.split("x").map((v) => +v);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0)
      throw new Error(`Invalid resolution format: use ${name}="800x600"`);
    return { width, height };
  }
  if (value.includes(",")) {
    const [width, height] = value.split(",").map((v) => +v);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0)
      throw new Error(`Invalid resolution format: use ${name}="800x600"`);
    return { width, height };
  }
  throw new Error(`Invalid resolution format: use ${name}="800x600"`);
}
function headerParser(arg, previous) {
  if (!arg)
    return previous || {};
  const result = previous || {};
  const [name, value] = arg.split(":").map((v) => v.trim());
  result[name] = value;
  return result;
}
function enumParser(name, options, value) {
  if (!options.includes(value))
    throw new Error(`Invalid ${name}: ${value}. Valid values are: ${options.join(", ")}`);
  return value;
}
function envToBoolean(value) {
  if (value === "true" || value === "1")
    return true;
  if (value === "false" || value === "0")
    return false;
  return void 0;
}
function envToString(value) {
  return value ? value.trim() : void 0;
}
function sanitizeForFilePath(s) {
  const sanitize = (s2) => s2.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, "-");
  const separator = s.lastIndexOf(".");
  if (separator === -1)
    return sanitize(s);
  return sanitize(s.substring(0, separator)) + "." + sanitize(s.substring(separator + 1));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  commaSeparatedList,
  configFromCLIOptions,
  defaultConfig,
  dotenvFileLoader,
  enumParser,
  headerParser,
  numberParser,
  outputDir,
  outputFile,
  resolutionParser,
  resolveCLIConfig,
  resolveConfig,
  semicolonSeparatedList
});
