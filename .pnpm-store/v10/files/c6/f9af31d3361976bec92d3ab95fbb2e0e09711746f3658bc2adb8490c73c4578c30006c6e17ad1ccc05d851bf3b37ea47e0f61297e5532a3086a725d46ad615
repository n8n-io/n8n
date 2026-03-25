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
var program_exports = {};
__export(program_exports, {
  program: () => import_utilsBundle2.program
});
module.exports = __toCommonJS(program_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var playwright = __toESM(require("../.."));
var import_driver = require("./driver");
var import_server = require("../server");
var import_utils = require("../utils");
var import_traceViewer = require("../server/trace/viewer/traceViewer");
var import_utils2 = require("../utils");
var import_ascii = require("../server/utils/ascii");
var import_utilsBundle = require("../utilsBundle");
var import_utilsBundle2 = require("../utilsBundle");
const packageJSON = require("../../package.json");
import_utilsBundle.program.version("Version " + (process.env.PW_CLI_DISPLAY_VERSION || packageJSON.version)).name(buildBasePlaywrightCLICommand(process.env.PW_LANG_NAME));
import_utilsBundle.program.command("mark-docker-image [dockerImageNameTemplate]", { hidden: true }).description("mark docker image").allowUnknownOption(true).action(function(dockerImageNameTemplate) {
  (0, import_utils2.assert)(dockerImageNameTemplate, "dockerImageNameTemplate is required");
  (0, import_server.writeDockerVersion)(dockerImageNameTemplate).catch(logErrorAndExit);
});
commandWithOpenOptions("open [url]", "open page in browser specified via -b, --browser", []).action(function(url, options) {
  open(options, url).catch(logErrorAndExit);
}).addHelpText("afterAll", `
Examples:

  $ open
  $ open -b webkit https://example.com`);
commandWithOpenOptions(
  "codegen [url]",
  "open page and generate code for user actions",
  [
    ["-o, --output <file name>", "saves the generated script to a file"],
    ["--target <language>", `language to generate, one of javascript, playwright-test, python, python-async, python-pytest, csharp, csharp-mstest, csharp-nunit, java, java-junit`, codegenId()],
    ["--test-id-attribute <attributeName>", "use the specified attribute to generate data test ID selectors"]
  ]
).action(async function(url, options) {
  await codegen(options, url);
}).addHelpText("afterAll", `
Examples:

  $ codegen
  $ codegen --target=python
  $ codegen -b webkit https://example.com`);
function printInstalledBrowsers(browsers2) {
  const browserPaths = /* @__PURE__ */ new Set();
  for (const browser of browsers2)
    browserPaths.add(browser.browserPath);
  console.log(`  Browsers:`);
  for (const browserPath of [...browserPaths].sort())
    console.log(`    ${browserPath}`);
  console.log(`  References:`);
  const references = /* @__PURE__ */ new Set();
  for (const browser of browsers2)
    references.add(browser.referenceDir);
  for (const reference of [...references].sort())
    console.log(`    ${reference}`);
}
function printGroupedByPlaywrightVersion(browsers2) {
  const dirToVersion = /* @__PURE__ */ new Map();
  for (const browser of browsers2) {
    if (dirToVersion.has(browser.referenceDir))
      continue;
    const packageJSON2 = require(import_path.default.join(browser.referenceDir, "package.json"));
    const version = packageJSON2.version;
    dirToVersion.set(browser.referenceDir, version);
  }
  const groupedByPlaywrightMinorVersion = /* @__PURE__ */ new Map();
  for (const browser of browsers2) {
    const version = dirToVersion.get(browser.referenceDir);
    let entries = groupedByPlaywrightMinorVersion.get(version);
    if (!entries) {
      entries = [];
      groupedByPlaywrightMinorVersion.set(version, entries);
    }
    entries.push(browser);
  }
  const sortedVersions = [...groupedByPlaywrightMinorVersion.keys()].sort((a, b) => {
    const aComponents = a.split(".");
    const bComponents = b.split(".");
    const aMajor = parseInt(aComponents[0], 10);
    const bMajor = parseInt(bComponents[0], 10);
    if (aMajor !== bMajor)
      return aMajor - bMajor;
    const aMinor = parseInt(aComponents[1], 10);
    const bMinor = parseInt(bComponents[1], 10);
    if (aMinor !== bMinor)
      return aMinor - bMinor;
    return aComponents.slice(2).join(".").localeCompare(bComponents.slice(2).join("."));
  });
  for (const version of sortedVersions) {
    console.log(`
Playwright version: ${version}`);
    printInstalledBrowsers(groupedByPlaywrightMinorVersion.get(version));
  }
}
import_utilsBundle.program.command("install [browser...]").description("ensure browsers necessary for this version of Playwright are installed").option("--with-deps", "install system dependencies for browsers").option("--dry-run", "do not execute installation, only print information").option("--list", "prints list of browsers from all playwright installations").option("--force", "force reinstall of already installed browsers").option("--only-shell", "only install headless shell when installing chromium").option("--no-shell", "do not install chromium headless shell").action(async function(args, options) {
  if ((0, import_utils.isLikelyNpxGlobal)()) {
    console.error((0, import_ascii.wrapInASCIIBox)([
      `WARNING: It looks like you are running 'npx playwright install' without first`,
      `installing your project's dependencies.`,
      ``,
      `To avoid unexpected behavior, please install your dependencies first, and`,
      `then run Playwright's install command:`,
      ``,
      `    npm install`,
      `    npx playwright install`,
      ``,
      `If your project does not yet depend on Playwright, first install the`,
      `applicable npm package (most commonly @playwright/test), and`,
      `then run Playwright's install command to download the browsers:`,
      ``,
      `    npm install @playwright/test`,
      `    npx playwright install`,
      ``
    ].join("\n"), 1));
  }
  try {
    if (options.shell === false && options.onlyShell)
      throw new Error(`Only one of --no-shell and --only-shell can be specified`);
    const shell = options.shell === false ? "no" : options.onlyShell ? "only" : void 0;
    const executables = import_server.registry.resolveBrowsers(args, { shell });
    if (options.withDeps)
      await import_server.registry.installDeps(executables, !!options.dryRun);
    if (options.dryRun && options.list)
      throw new Error(`Only one of --dry-run and --list can be specified`);
    if (options.dryRun) {
      for (const executable of executables) {
        console.log(import_server.registry.calculateDownloadTitle(executable));
        console.log(`  Install location:    ${executable.directory ?? "<system>"}`);
        if (executable.downloadURLs?.length) {
          const [url, ...fallbacks] = executable.downloadURLs;
          console.log(`  Download url:        ${url}`);
          for (let i = 0; i < fallbacks.length; ++i)
            console.log(`  Download fallback ${i + 1}: ${fallbacks[i]}`);
        }
        console.log(``);
      }
    } else if (options.list) {
      const browsers2 = await import_server.registry.listInstalledBrowsers();
      printGroupedByPlaywrightVersion(browsers2);
    } else {
      await import_server.registry.install(executables, { force: options.force });
      await import_server.registry.validateHostRequirementsForExecutablesIfNeeded(executables, process.env.PW_LANG_NAME || "javascript").catch((e) => {
        e.name = "Playwright Host validation warning";
        console.error(e);
      });
    }
  } catch (e) {
    console.log(`Failed to install browsers
${e}`);
    (0, import_utils.gracefullyProcessExitDoNotHang)(1);
  }
}).addHelpText("afterAll", `

Examples:
  - $ install
    Install default browsers.

  - $ install chrome firefox
    Install custom browsers, supports ${import_server.registry.suggestedBrowsersToInstall()}.`);
import_utilsBundle.program.command("uninstall").description("Removes browsers used by this installation of Playwright from the system (chromium, firefox, webkit, ffmpeg). This does not include branded channels.").option("--all", "Removes all browsers used by any Playwright installation from the system.").action(async (options) => {
  delete process.env.PLAYWRIGHT_SKIP_BROWSER_GC;
  await import_server.registry.uninstall(!!options.all).then(({ numberOfBrowsersLeft }) => {
    if (!options.all && numberOfBrowsersLeft > 0) {
      console.log("Successfully uninstalled Playwright browsers for the current Playwright installation.");
      console.log(`There are still ${numberOfBrowsersLeft} browsers left, used by other Playwright installations.
To uninstall Playwright browsers for all installations, re-run with --all flag.`);
    }
  }).catch(logErrorAndExit);
});
import_utilsBundle.program.command("install-deps [browser...]").description("install dependencies necessary to run browsers (will ask for sudo permissions)").option("--dry-run", "Do not execute installation commands, only print them").action(async function(args, options) {
  try {
    await import_server.registry.installDeps(import_server.registry.resolveBrowsers(args, {}), !!options.dryRun);
  } catch (e) {
    console.log(`Failed to install browser dependencies
${e}`);
    (0, import_utils.gracefullyProcessExitDoNotHang)(1);
  }
}).addHelpText("afterAll", `
Examples:
  - $ install-deps
    Install dependencies for default browsers.

  - $ install-deps chrome firefox
    Install dependencies for specific browsers, supports ${import_server.registry.suggestedBrowsersToInstall()}.`);
const browsers = [
  { alias: "cr", name: "Chromium", type: "chromium" },
  { alias: "ff", name: "Firefox", type: "firefox" },
  { alias: "wk", name: "WebKit", type: "webkit" }
];
for (const { alias, name, type } of browsers) {
  commandWithOpenOptions(`${alias} [url]`, `open page in ${name}`, []).action(function(url, options) {
    open({ ...options, browser: type }, url).catch(logErrorAndExit);
  }).addHelpText("afterAll", `
Examples:

  $ ${alias} https://example.com`);
}
commandWithOpenOptions(
  "screenshot <url> <filename>",
  "capture a page screenshot",
  [
    ["--wait-for-selector <selector>", "wait for selector before taking a screenshot"],
    ["--wait-for-timeout <timeout>", "wait for timeout in milliseconds before taking a screenshot"],
    ["--full-page", "whether to take a full page screenshot (entire scrollable area)"]
  ]
).action(function(url, filename, command) {
  screenshot(command, command, url, filename).catch(logErrorAndExit);
}).addHelpText("afterAll", `
Examples:

  $ screenshot -b webkit https://example.com example.png`);
commandWithOpenOptions(
  "pdf <url> <filename>",
  "save page as pdf",
  [
    ["--paper-format <format>", "paper format: Letter, Legal, Tabloid, Ledger, A0, A1, A2, A3, A4, A5, A6"],
    ["--wait-for-selector <selector>", "wait for given selector before saving as pdf"],
    ["--wait-for-timeout <timeout>", "wait for given timeout in milliseconds before saving as pdf"]
  ]
).action(function(url, filename, options) {
  pdf(options, options, url, filename).catch(logErrorAndExit);
}).addHelpText("afterAll", `
Examples:

  $ pdf https://example.com example.pdf`);
import_utilsBundle.program.command("run-driver", { hidden: true }).action(function(options) {
  (0, import_driver.runDriver)();
});
import_utilsBundle.program.command("run-server", { hidden: true }).option("--port <port>", "Server port").option("--host <host>", "Server host").option("--path <path>", "Endpoint Path", "/").option("--max-clients <maxClients>", "Maximum clients").option("--mode <mode>", 'Server mode, either "default" or "extension"').action(function(options) {
  (0, import_driver.runServer)({
    port: options.port ? +options.port : void 0,
    host: options.host,
    path: options.path,
    maxConnections: options.maxClients ? +options.maxClients : Infinity,
    extension: options.mode === "extension" || !!process.env.PW_EXTENSION_MODE
  }).catch(logErrorAndExit);
});
import_utilsBundle.program.command("print-api-json", { hidden: true }).action(function(options) {
  (0, import_driver.printApiJson)();
});
import_utilsBundle.program.command("launch-server", { hidden: true }).requiredOption("--browser <browserName>", 'Browser name, one of "chromium", "firefox" or "webkit"').option("--config <path-to-config-file>", "JSON file with launchServer options").action(function(options) {
  (0, import_driver.launchBrowserServer)(options.browser, options.config);
});
import_utilsBundle.program.command("show-trace [trace]").option("-b, --browser <browserType>", "browser to use, one of cr, chromium, ff, firefox, wk, webkit", "chromium").option("-h, --host <host>", "Host to serve trace on; specifying this option opens trace in a browser tab").option("-p, --port <port>", "Port to serve trace on, 0 for any free port; specifying this option opens trace in a browser tab").option("--stdin", "Accept trace URLs over stdin to update the viewer").description("show trace viewer").action(function(trace, options) {
  if (options.browser === "cr")
    options.browser = "chromium";
  if (options.browser === "ff")
    options.browser = "firefox";
  if (options.browser === "wk")
    options.browser = "webkit";
  const openOptions = {
    host: options.host,
    port: +options.port,
    isServer: !!options.stdin
  };
  if (options.port !== void 0 || options.host !== void 0)
    (0, import_traceViewer.runTraceInBrowser)(trace, openOptions).catch(logErrorAndExit);
  else
    (0, import_traceViewer.runTraceViewerApp)(trace, options.browser, openOptions, true).catch(logErrorAndExit);
}).addHelpText("afterAll", `
Examples:

  $ show-trace
  $ show-trace https://example.com/trace.zip`);
async function launchContext(options, extraOptions) {
  validateOptions(options);
  const browserType = lookupBrowserType(options);
  const launchOptions = extraOptions;
  if (options.channel)
    launchOptions.channel = options.channel;
  launchOptions.handleSIGINT = false;
  const contextOptions = (
    // Copy the device descriptor since we have to compare and modify the options.
    options.device ? { ...playwright.devices[options.device] } : {}
  );
  if (!extraOptions.headless)
    contextOptions.deviceScaleFactor = import_os.default.platform() === "darwin" ? 2 : 1;
  if (browserType.name() === "webkit" && process.platform === "linux") {
    delete contextOptions.hasTouch;
    delete contextOptions.isMobile;
  }
  if (contextOptions.isMobile && browserType.name() === "firefox")
    contextOptions.isMobile = void 0;
  if (options.blockServiceWorkers)
    contextOptions.serviceWorkers = "block";
  if (options.proxyServer) {
    launchOptions.proxy = {
      server: options.proxyServer
    };
    if (options.proxyBypass)
      launchOptions.proxy.bypass = options.proxyBypass;
  }
  if (options.viewportSize) {
    try {
      const [width, height] = options.viewportSize.split(",").map((n) => +n);
      if (isNaN(width) || isNaN(height))
        throw new Error("bad values");
      contextOptions.viewport = { width, height };
    } catch (e) {
      throw new Error('Invalid viewport size format: use "width,height", for example --viewport-size="800,600"');
    }
  }
  if (options.geolocation) {
    try {
      const [latitude, longitude] = options.geolocation.split(",").map((n) => parseFloat(n.trim()));
      contextOptions.geolocation = {
        latitude,
        longitude
      };
    } catch (e) {
      throw new Error('Invalid geolocation format, should be "lat,long". For example --geolocation="37.819722,-122.478611"');
    }
    contextOptions.permissions = ["geolocation"];
  }
  if (options.userAgent)
    contextOptions.userAgent = options.userAgent;
  if (options.lang)
    contextOptions.locale = options.lang;
  if (options.colorScheme)
    contextOptions.colorScheme = options.colorScheme;
  if (options.timezone)
    contextOptions.timezoneId = options.timezone;
  if (options.loadStorage)
    contextOptions.storageState = options.loadStorage;
  if (options.ignoreHttpsErrors)
    contextOptions.ignoreHTTPSErrors = true;
  if (options.saveHar) {
    contextOptions.recordHar = { path: import_path.default.resolve(process.cwd(), options.saveHar), mode: "minimal" };
    if (options.saveHarGlob)
      contextOptions.recordHar.urlFilter = options.saveHarGlob;
    contextOptions.serviceWorkers = "block";
  }
  let browser;
  let context;
  if (options.userDataDir) {
    context = await browserType.launchPersistentContext(options.userDataDir, { ...launchOptions, ...contextOptions });
    browser = context.browser();
  } else {
    browser = await browserType.launch(launchOptions);
    context = await browser.newContext(contextOptions);
  }
  let closingBrowser = false;
  async function closeBrowser() {
    if (closingBrowser)
      return;
    closingBrowser = true;
    if (options.saveStorage)
      await context.storageState({ path: options.saveStorage }).catch((e) => null);
    if (options.saveHar)
      await context.close();
    await browser.close();
  }
  context.on("page", (page) => {
    page.on("dialog", () => {
    });
    page.on("close", () => {
      const hasPage = browser.contexts().some((context2) => context2.pages().length > 0);
      if (hasPage)
        return;
      closeBrowser().catch(() => {
      });
    });
  });
  process.on("SIGINT", async () => {
    await closeBrowser();
    (0, import_utils.gracefullyProcessExitDoNotHang)(130);
  });
  const timeout = options.timeout ? parseInt(options.timeout, 10) : 0;
  context.setDefaultTimeout(timeout);
  context.setDefaultNavigationTimeout(timeout);
  delete launchOptions.headless;
  delete launchOptions.executablePath;
  delete launchOptions.handleSIGINT;
  delete contextOptions.deviceScaleFactor;
  return { browser, browserName: browserType.name(), context, contextOptions, launchOptions, closeBrowser };
}
async function openPage(context, url) {
  let page = context.pages()[0];
  if (!page)
    page = await context.newPage();
  if (url) {
    if (import_fs.default.existsSync(url))
      url = "file://" + import_path.default.resolve(url);
    else if (!url.startsWith("http") && !url.startsWith("file://") && !url.startsWith("about:") && !url.startsWith("data:"))
      url = "http://" + url;
    await page.goto(url);
  }
  return page;
}
async function open(options, url) {
  const { context } = await launchContext(options, { headless: !!process.env.PWTEST_CLI_HEADLESS, executablePath: process.env.PWTEST_CLI_EXECUTABLE_PATH });
  await context._exposeConsoleApi();
  await openPage(context, url);
}
async function codegen(options, url) {
  const { target: language, output: outputFile, testIdAttribute: testIdAttributeName } = options;
  const tracesDir = import_path.default.join(import_os.default.tmpdir(), `playwright-recorder-trace-${Date.now()}`);
  const { context, browser, launchOptions, contextOptions, closeBrowser } = await launchContext(options, {
    headless: !!process.env.PWTEST_CLI_HEADLESS,
    executablePath: process.env.PWTEST_CLI_EXECUTABLE_PATH,
    tracesDir
  });
  const donePromise = new import_utils.ManualPromise();
  maybeSetupTestHooks(browser, closeBrowser, donePromise);
  import_utilsBundle.dotenv.config({ path: "playwright.env" });
  await context._enableRecorder({
    language,
    launchOptions,
    contextOptions,
    device: options.device,
    saveStorage: options.saveStorage,
    mode: "recording",
    testIdAttributeName,
    outputFile: outputFile ? import_path.default.resolve(outputFile) : void 0,
    handleSIGINT: false
  });
  await openPage(context, url);
  donePromise.resolve();
}
async function maybeSetupTestHooks(browser, closeBrowser, donePromise) {
  if (!process.env.PWTEST_CLI_IS_UNDER_TEST)
    return;
  const logs = [];
  require("playwright-core/lib/utilsBundle").debug.log = (...args) => {
    const line = require("util").format(...args) + "\n";
    logs.push(line);
    process.stderr.write(line);
  };
  browser.on("disconnected", () => {
    const hasCrashLine = logs.some((line) => line.includes("process did exit:") && !line.includes("process did exit: exitCode=0, signal=null"));
    if (hasCrashLine) {
      process.stderr.write("Detected browser crash.\n");
      (0, import_utils.gracefullyProcessExitDoNotHang)(1);
    }
  });
  const close = async () => {
    await donePromise;
    await closeBrowser();
  };
  if (process.env.PWTEST_CLI_EXIT_AFTER_TIMEOUT) {
    setTimeout(close, +process.env.PWTEST_CLI_EXIT_AFTER_TIMEOUT);
    return;
  }
  let stdin = "";
  process.stdin.on("data", (data) => {
    stdin += data.toString();
    if (stdin.startsWith("exit")) {
      process.stdin.destroy();
      close();
    }
  });
}
async function waitForPage(page, captureOptions) {
  if (captureOptions.waitForSelector) {
    console.log(`Waiting for selector ${captureOptions.waitForSelector}...`);
    await page.waitForSelector(captureOptions.waitForSelector);
  }
  if (captureOptions.waitForTimeout) {
    console.log(`Waiting for timeout ${captureOptions.waitForTimeout}...`);
    await page.waitForTimeout(parseInt(captureOptions.waitForTimeout, 10));
  }
}
async function screenshot(options, captureOptions, url, path2) {
  const { context } = await launchContext(options, { headless: true });
  console.log("Navigating to " + url);
  const page = await openPage(context, url);
  await waitForPage(page, captureOptions);
  console.log("Capturing screenshot into " + path2);
  await page.screenshot({ path: path2, fullPage: !!captureOptions.fullPage });
  await page.close();
}
async function pdf(options, captureOptions, url, path2) {
  if (options.browser !== "chromium")
    throw new Error("PDF creation is only working with Chromium");
  const { context } = await launchContext({ ...options, browser: "chromium" }, { headless: true });
  console.log("Navigating to " + url);
  const page = await openPage(context, url);
  await waitForPage(page, captureOptions);
  console.log("Saving as pdf into " + path2);
  await page.pdf({ path: path2, format: captureOptions.paperFormat });
  await page.close();
}
function lookupBrowserType(options) {
  let name = options.browser;
  if (options.device) {
    const device = playwright.devices[options.device];
    name = device.defaultBrowserType;
  }
  let browserType;
  switch (name) {
    case "chromium":
      browserType = playwright.chromium;
      break;
    case "webkit":
      browserType = playwright.webkit;
      break;
    case "firefox":
      browserType = playwright.firefox;
      break;
    case "cr":
      browserType = playwright.chromium;
      break;
    case "wk":
      browserType = playwright.webkit;
      break;
    case "ff":
      browserType = playwright.firefox;
      break;
  }
  if (browserType)
    return browserType;
  import_utilsBundle.program.help();
}
function validateOptions(options) {
  if (options.device && !(options.device in playwright.devices)) {
    const lines = [`Device descriptor not found: '${options.device}', available devices are:`];
    for (const name in playwright.devices)
      lines.push(`  "${name}"`);
    throw new Error(lines.join("\n"));
  }
  if (options.colorScheme && !["light", "dark"].includes(options.colorScheme))
    throw new Error('Invalid color scheme, should be one of "light", "dark"');
}
function logErrorAndExit(e) {
  if (process.env.PWDEBUGIMPL)
    console.error(e);
  else
    console.error(e.name + ": " + e.message);
  (0, import_utils.gracefullyProcessExitDoNotHang)(1);
}
function codegenId() {
  return process.env.PW_LANG_NAME || "playwright-test";
}
function commandWithOpenOptions(command, description, options) {
  let result = import_utilsBundle.program.command(command).description(description);
  for (const option of options)
    result = result.option(option[0], ...option.slice(1));
  return result.option("-b, --browser <browserType>", "browser to use, one of cr, chromium, ff, firefox, wk, webkit", "chromium").option("--block-service-workers", "block service workers").option("--channel <channel>", 'Chromium distribution channel, "chrome", "chrome-beta", "msedge-dev", etc').option("--color-scheme <scheme>", 'emulate preferred color scheme, "light" or "dark"').option("--device <deviceName>", 'emulate device, for example  "iPhone 11"').option("--geolocation <coordinates>", 'specify geolocation coordinates, for example "37.819722,-122.478611"').option("--ignore-https-errors", "ignore https errors").option("--load-storage <filename>", "load context storage state from the file, previously saved with --save-storage").option("--lang <language>", 'specify language / locale, for example "en-GB"').option("--proxy-server <proxy>", 'specify proxy server, for example "http://myproxy:3128" or "socks5://myproxy:8080"').option("--proxy-bypass <bypass>", 'comma-separated domains to bypass proxy, for example ".com,chromium.org,.domain.com"').option("--save-har <filename>", "save HAR file with all network activity at the end").option("--save-har-glob <glob pattern>", "filter entries in the HAR by matching url against this glob pattern").option("--save-storage <filename>", "save context storage state at the end, for later use with --load-storage").option("--timezone <time zone>", 'time zone to emulate, for example "Europe/Rome"').option("--timeout <timeout>", "timeout for Playwright actions in milliseconds, no timeout by default").option("--user-agent <ua string>", "specify user agent string").option("--user-data-dir <directory>", "use the specified user data directory instead of a new context").option("--viewport-size <size>", 'specify browser viewport size in pixels, for example "1280, 720"');
}
function buildBasePlaywrightCLICommand(cliTargetLang) {
  switch (cliTargetLang) {
    case "python":
      return `playwright`;
    case "java":
      return `mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args="...options.."`;
    case "csharp":
      return `pwsh bin/Debug/netX/playwright.ps1`;
    default: {
      const packageManagerCommand = (0, import_utils2.getPackageManagerExecCommand)();
      return `${packageManagerCommand} playwright`;
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  program
});
