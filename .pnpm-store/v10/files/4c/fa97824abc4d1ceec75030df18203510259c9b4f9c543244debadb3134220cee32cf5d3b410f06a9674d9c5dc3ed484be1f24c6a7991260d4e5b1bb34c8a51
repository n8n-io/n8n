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
var watchMode_exports = {};
__export(watchMode_exports, {
  runWatchModeLoop: () => runWatchModeLoop
});
module.exports = __toCommonJS(watchMode_exports);
var import_path = __toESM(require("path"));
var import_readline = __toESM(require("readline"));
var import_stream = require("stream");
var import_playwrightServer = require("playwright-core/lib/remote/playwrightServer");
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_base = require("../reporters/base");
var import_utilsBundle = require("../utilsBundle");
var import_testServer = require("./testServer");
var import_teleSuiteUpdater = require("../isomorphic/teleSuiteUpdater");
var import_testServerConnection = require("../isomorphic/testServerConnection");
class InMemoryTransport extends import_stream.EventEmitter {
  constructor(send) {
    super();
    this._send = send;
  }
  close() {
    this.emit("close");
  }
  onclose(listener) {
    this.on("close", listener);
  }
  onerror(listener) {
  }
  onmessage(listener) {
    this.on("message", listener);
  }
  onopen(listener) {
    this.on("open", listener);
  }
  send(data) {
    this._send(data);
  }
}
async function runWatchModeLoop(configLocation, initialOptions) {
  const options = { ...initialOptions };
  let bufferMode = false;
  const testServerDispatcher = new import_testServer.TestServerDispatcher(configLocation, {});
  const transport = new InMemoryTransport(
    async (data) => {
      const { id, method, params } = JSON.parse(data);
      try {
        const result2 = await testServerDispatcher.transport.dispatch(method, params);
        transport.emit("message", JSON.stringify({ id, result: result2 }));
      } catch (e) {
        transport.emit("message", JSON.stringify({ id, error: String(e) }));
      }
    }
  );
  testServerDispatcher.transport.sendEvent = (method, params) => {
    transport.emit("message", JSON.stringify({ method, params }));
  };
  const testServerConnection = new import_testServerConnection.TestServerConnection(transport);
  transport.emit("open");
  const teleSuiteUpdater = new import_teleSuiteUpdater.TeleSuiteUpdater({ pathSeparator: import_path.default.sep, onUpdate() {
  } });
  const dirtyTestFiles = /* @__PURE__ */ new Set();
  const dirtyTestIds = /* @__PURE__ */ new Set();
  let onDirtyTests = new import_utils.ManualPromise();
  let queue = Promise.resolve();
  const changedFiles = /* @__PURE__ */ new Set();
  testServerConnection.onTestFilesChanged(({ testFiles }) => {
    testFiles.forEach((file) => changedFiles.add(file));
    queue = queue.then(async () => {
      if (changedFiles.size === 0)
        return;
      const { report: report2 } = await testServerConnection.listTests({ locations: options.files, projects: options.projects, grep: options.grep });
      teleSuiteUpdater.processListReport(report2);
      for (const test of teleSuiteUpdater.rootSuite.allTests()) {
        if (changedFiles.has(test.location.file)) {
          dirtyTestFiles.add(test.location.file);
          dirtyTestIds.add(test.id);
        }
      }
      changedFiles.clear();
      if (dirtyTestIds.size > 0) {
        onDirtyTests.resolve("changed");
        onDirtyTests = new import_utils.ManualPromise();
      }
    });
  });
  testServerConnection.onReport((report2) => teleSuiteUpdater.processTestReportEvent(report2));
  await testServerConnection.initialize({
    interceptStdio: false,
    watchTestDirs: true,
    populateDependenciesOnList: true
  });
  await testServerConnection.runGlobalSetup({});
  const { report } = await testServerConnection.listTests({});
  teleSuiteUpdater.processListReport(report);
  const projectNames = teleSuiteUpdater.rootSuite.suites.map((s) => s.title);
  let lastRun = { type: "regular" };
  let result = "passed";
  while (true) {
    if (bufferMode)
      printBufferPrompt(dirtyTestFiles, teleSuiteUpdater.config.rootDir);
    else
      printPrompt();
    const waitForCommand = readCommand();
    const command = await Promise.race([
      onDirtyTests,
      waitForCommand.result
    ]);
    if (command === "changed")
      waitForCommand.dispose();
    if (bufferMode && command === "changed")
      continue;
    const shouldRunChangedFiles = bufferMode ? command === "run" : command === "changed";
    if (shouldRunChangedFiles) {
      if (dirtyTestIds.size === 0)
        continue;
      const testIds = [...dirtyTestIds];
      dirtyTestIds.clear();
      dirtyTestFiles.clear();
      await runTests(options, testServerConnection, { testIds, title: "files changed" });
      lastRun = { type: "changed", dirtyTestIds: testIds };
      continue;
    }
    if (command === "run") {
      await runTests(options, testServerConnection);
      lastRun = { type: "regular" };
      continue;
    }
    if (command === "project") {
      const { selectedProjects } = await import_utilsBundle.enquirer.prompt({
        type: "multiselect",
        name: "selectedProjects",
        message: "Select projects",
        choices: projectNames
      }).catch(() => ({ selectedProjects: null }));
      if (!selectedProjects)
        continue;
      options.projects = selectedProjects.length ? selectedProjects : void 0;
      await runTests(options, testServerConnection);
      lastRun = { type: "regular" };
      continue;
    }
    if (command === "file") {
      const { filePattern } = await import_utilsBundle.enquirer.prompt({
        type: "text",
        name: "filePattern",
        message: "Input filename pattern (regex)"
      }).catch(() => ({ filePattern: null }));
      if (filePattern === null)
        continue;
      if (filePattern.trim())
        options.files = filePattern.split(" ");
      else
        options.files = void 0;
      await runTests(options, testServerConnection);
      lastRun = { type: "regular" };
      continue;
    }
    if (command === "grep") {
      const { testPattern } = await import_utilsBundle.enquirer.prompt({
        type: "text",
        name: "testPattern",
        message: "Input test name pattern (regex)"
      }).catch(() => ({ testPattern: null }));
      if (testPattern === null)
        continue;
      if (testPattern.trim())
        options.grep = testPattern;
      else
        options.grep = void 0;
      await runTests(options, testServerConnection);
      lastRun = { type: "regular" };
      continue;
    }
    if (command === "failed") {
      const failedTestIds = teleSuiteUpdater.rootSuite.allTests().filter((t) => !t.ok()).map((t) => t.id);
      await runTests({}, testServerConnection, { title: "running failed tests", testIds: failedTestIds });
      lastRun = { type: "failed", failedTestIds };
      continue;
    }
    if (command === "repeat") {
      if (lastRun.type === "regular") {
        await runTests(options, testServerConnection, { title: "re-running tests" });
        continue;
      } else if (lastRun.type === "changed") {
        await runTests(options, testServerConnection, { title: "re-running tests", testIds: lastRun.dirtyTestIds });
      } else if (lastRun.type === "failed") {
        await runTests({}, testServerConnection, { title: "re-running tests", testIds: lastRun.failedTestIds });
      }
      continue;
    }
    if (command === "toggle-show-browser") {
      await toggleShowBrowser();
      continue;
    }
    if (command === "toggle-buffer-mode") {
      bufferMode = !bufferMode;
      continue;
    }
    if (command === "exit")
      break;
    if (command === "interrupted") {
      result = "interrupted";
      break;
    }
  }
  const teardown = await testServerConnection.runGlobalTeardown({});
  return result === "passed" ? teardown.status : result;
}
function readKeyPress(handler) {
  const promise = new import_utils.ManualPromise();
  const rl = import_readline.default.createInterface({ input: process.stdin, escapeCodeTimeout: 50 });
  import_readline.default.emitKeypressEvents(process.stdin, rl);
  if (process.stdin.isTTY)
    process.stdin.setRawMode(true);
  const listener = import_utils.eventsHelper.addEventListener(process.stdin, "keypress", (text, key) => {
    const result = handler(text, key);
    if (result)
      promise.resolve(result);
  });
  const dispose = () => {
    import_utils.eventsHelper.removeEventListeners([listener]);
    rl.close();
    if (process.stdin.isTTY)
      process.stdin.setRawMode(false);
  };
  void promise.finally(dispose);
  return { result: promise, dispose };
}
const isInterrupt = (text, key) => text === "" || text === "\x1B" || key && key.name === "escape" || key && key.ctrl && key.name === "c";
async function runTests(watchOptions, testServerConnection, options) {
  printConfiguration(watchOptions, options?.title);
  const waitForDone = readKeyPress((text, key) => {
    if (isInterrupt(text, key)) {
      testServerConnection.stopTestsNoReply({});
      return "done";
    }
  });
  await testServerConnection.runTests({
    grep: watchOptions.grep,
    testIds: options?.testIds,
    locations: watchOptions?.files ?? [],
    // TODO: always collect locations based on knowledge about tree, so that we don't have to load all tests
    projects: watchOptions.projects,
    connectWsEndpoint,
    reuseContext: connectWsEndpoint ? true : void 0,
    workers: connectWsEndpoint ? 1 : void 0,
    headed: connectWsEndpoint ? true : void 0
  }).finally(() => waitForDone.dispose());
}
function readCommand() {
  return readKeyPress((text, key) => {
    if (isInterrupt(text, key))
      return "interrupted";
    if (process.platform !== "win32" && key && key.ctrl && key.name === "z") {
      process.kill(process.ppid, "SIGTSTP");
      process.kill(process.pid, "SIGTSTP");
    }
    const name = key?.name;
    if (name === "q")
      return "exit";
    if (name === "h") {
      process.stdout.write(`${(0, import_base.separator)(import_base.terminalScreen)}
Run tests
  ${import_utils2.colors.bold("enter")}    ${import_utils2.colors.dim("run tests")}
  ${import_utils2.colors.bold("f")}        ${import_utils2.colors.dim("run failed tests")}
  ${import_utils2.colors.bold("r")}        ${import_utils2.colors.dim("repeat last run")}
  ${import_utils2.colors.bold("q")}        ${import_utils2.colors.dim("quit")}

Change settings
  ${import_utils2.colors.bold("c")}        ${import_utils2.colors.dim("set project")}
  ${import_utils2.colors.bold("p")}        ${import_utils2.colors.dim("set file filter")}
  ${import_utils2.colors.bold("t")}        ${import_utils2.colors.dim("set title filter")}
  ${import_utils2.colors.bold("s")}        ${import_utils2.colors.dim("toggle show & reuse the browser")}
  ${import_utils2.colors.bold("b")}        ${import_utils2.colors.dim("toggle buffer mode")}
`);
      return;
    }
    switch (name) {
      case "return":
        return "run";
      case "r":
        return "repeat";
      case "c":
        return "project";
      case "p":
        return "file";
      case "t":
        return "grep";
      case "f":
        return "failed";
      case "s":
        return "toggle-show-browser";
      case "b":
        return "toggle-buffer-mode";
    }
  });
}
let showBrowserServer;
let connectWsEndpoint = void 0;
let seq = 1;
function printConfiguration(options, title) {
  const packageManagerCommand = (0, import_utils.getPackageManagerExecCommand)();
  const tokens = [];
  tokens.push(`${packageManagerCommand} playwright test`);
  if (options.projects)
    tokens.push(...options.projects.map((p) => import_utils2.colors.blue(`--project ${p}`)));
  if (options.grep)
    tokens.push(import_utils2.colors.red(`--grep ${options.grep}`));
  if (options.files)
    tokens.push(...options.files.map((a) => import_utils2.colors.bold(a)));
  if (title)
    tokens.push(import_utils2.colors.dim(`(${title})`));
  tokens.push(import_utils2.colors.dim(`#${seq++}`));
  const lines = [];
  const sep = (0, import_base.separator)(import_base.terminalScreen);
  lines.push("\x1Bc" + sep);
  lines.push(`${tokens.join(" ")}`);
  lines.push(`${import_utils2.colors.dim("Show & reuse browser:")} ${import_utils2.colors.bold(showBrowserServer ? "on" : "off")}`);
  process.stdout.write(lines.join("\n"));
}
function printBufferPrompt(dirtyTestFiles, rootDir) {
  const sep = (0, import_base.separator)(import_base.terminalScreen);
  process.stdout.write("\x1Bc");
  process.stdout.write(`${sep}
`);
  if (dirtyTestFiles.size === 0) {
    process.stdout.write(`${import_utils2.colors.dim("Waiting for file changes. Press")} ${import_utils2.colors.bold("q")} ${import_utils2.colors.dim("to quit or")} ${import_utils2.colors.bold("h")} ${import_utils2.colors.dim("for more options.")}

`);
    return;
  }
  process.stdout.write(`${import_utils2.colors.dim(`${dirtyTestFiles.size} test ${dirtyTestFiles.size === 1 ? "file" : "files"} changed:`)}

`);
  for (const file of dirtyTestFiles)
    process.stdout.write(` \xB7 ${import_path.default.relative(rootDir, file)}
`);
  process.stdout.write(`
${import_utils2.colors.dim(`Press`)} ${import_utils2.colors.bold("enter")} ${import_utils2.colors.dim("to run")}, ${import_utils2.colors.bold("q")} ${import_utils2.colors.dim("to quit or")} ${import_utils2.colors.bold("h")} ${import_utils2.colors.dim("for more options.")}

`);
}
function printPrompt() {
  const sep = (0, import_base.separator)(import_base.terminalScreen);
  process.stdout.write(`
${sep}
${import_utils2.colors.dim("Waiting for file changes. Press")} ${import_utils2.colors.bold("enter")} ${import_utils2.colors.dim("to run tests")}, ${import_utils2.colors.bold("q")} ${import_utils2.colors.dim("to quit or")} ${import_utils2.colors.bold("h")} ${import_utils2.colors.dim("for more options.")}
`);
}
async function toggleShowBrowser() {
  if (!showBrowserServer) {
    showBrowserServer = new import_playwrightServer.PlaywrightServer({ mode: "extension", path: "/" + (0, import_utils.createGuid)(), maxConnections: 1 });
    connectWsEndpoint = await showBrowserServer.listen();
    process.stdout.write(`${import_utils2.colors.dim("Show & reuse browser:")} ${import_utils2.colors.bold("on")}
`);
  } else {
    await showBrowserServer?.close();
    showBrowserServer = void 0;
    connectWsEndpoint = void 0;
    process.stdout.write(`${import_utils2.colors.dim("Show & reuse browser:")} ${import_utils2.colors.bold("off")}
`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runWatchModeLoop
});
