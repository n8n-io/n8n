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
var processLauncher_exports = {};
__export(processLauncher_exports, {
  envArrayToObject: () => envArrayToObject,
  gracefullyCloseAll: () => gracefullyCloseAll,
  gracefullyCloseSet: () => gracefullyCloseSet,
  gracefullyProcessExitDoNotHang: () => gracefullyProcessExitDoNotHang,
  launchProcess: () => launchProcess
});
module.exports = __toCommonJS(processLauncher_exports);
var childProcess = __toESM(require("child_process"));
var import_fs = __toESM(require("fs"));
var readline = __toESM(require("readline"));
var import_fileUtils = require("./fileUtils");
var import_utils = require("../../utils");
const gracefullyCloseSet = /* @__PURE__ */ new Set();
const killSet = /* @__PURE__ */ new Set();
async function gracefullyCloseAll() {
  await Promise.all(Array.from(gracefullyCloseSet).map((gracefullyClose) => gracefullyClose().catch((e) => {
  })));
}
function gracefullyProcessExitDoNotHang(code) {
  setTimeout(() => process.exit(code), 3e4);
  gracefullyCloseAll().then(() => {
    process.exit(code);
  });
}
function exitHandler() {
  for (const kill of killSet)
    kill();
}
let sigintHandlerCalled = false;
function sigintHandler() {
  const exitWithCode130 = () => {
    if ((0, import_utils.isUnderTest)()) {
      setTimeout(() => process.exit(130), 1e3);
    } else {
      process.exit(130);
    }
  };
  if (sigintHandlerCalled) {
    process.off("SIGINT", sigintHandler);
    for (const kill of killSet)
      kill();
    exitWithCode130();
  } else {
    sigintHandlerCalled = true;
    gracefullyCloseAll().then(() => exitWithCode130());
  }
}
function sigtermHandler() {
  gracefullyCloseAll();
}
function sighupHandler() {
  gracefullyCloseAll();
}
const installedHandlers = /* @__PURE__ */ new Set();
const processHandlers = {
  exit: exitHandler,
  SIGINT: sigintHandler,
  SIGTERM: sigtermHandler,
  SIGHUP: sighupHandler
};
function addProcessHandlerIfNeeded(name) {
  if (!installedHandlers.has(name)) {
    installedHandlers.add(name);
    process.on(name, processHandlers[name]);
  }
}
function removeProcessHandlersIfNeeded() {
  if (killSet.size)
    return;
  for (const handler of installedHandlers)
    process.off(handler, processHandlers[handler]);
  installedHandlers.clear();
}
async function launchProcess(options) {
  const stdio = options.stdio === "pipe" ? ["ignore", "pipe", "pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"];
  options.log(`<launching> ${options.command} ${options.args ? options.args.join(" ") : ""}`);
  const spawnOptions = {
    // On non-windows platforms, `detached: true` makes child process a leader of a new
    // process group, making it possible to kill child process tree with `.kill(-pid)` command.
    // @see https://nodejs.org/api/child_process.html#child_process_options_detached
    detached: process.platform !== "win32",
    env: options.env,
    cwd: options.cwd,
    shell: options.shell,
    stdio
  };
  const spawnedProcess = childProcess.spawn(options.command, options.args || [], spawnOptions);
  const cleanup = async () => {
    options.log(`[pid=${spawnedProcess.pid || "N/A"}] starting temporary directories cleanup`);
    const errors = await (0, import_fileUtils.removeFolders)(options.tempDirectories);
    for (let i = 0; i < options.tempDirectories.length; ++i) {
      if (errors[i])
        options.log(`[pid=${spawnedProcess.pid || "N/A"}] exception while removing ${options.tempDirectories[i]}: ${errors[i]}`);
    }
    options.log(`[pid=${spawnedProcess.pid || "N/A"}] finished temporary directories cleanup`);
  };
  spawnedProcess.on("error", () => {
  });
  if (!spawnedProcess.pid) {
    let failed;
    const failedPromise = new Promise((f, r) => failed = f);
    spawnedProcess.once("error", (error) => {
      failed(new Error("Failed to launch: " + error));
    });
    return failedPromise.then(async (error) => {
      await cleanup();
      throw error;
    });
  }
  options.log(`<launched> pid=${spawnedProcess.pid}`);
  const stdout = readline.createInterface({ input: spawnedProcess.stdout });
  stdout.on("line", (data) => {
    options.log(`[pid=${spawnedProcess.pid}][out] ` + data);
  });
  const stderr = readline.createInterface({ input: spawnedProcess.stderr });
  stderr.on("line", (data) => {
    options.log(`[pid=${spawnedProcess.pid}][err] ` + data);
  });
  let processClosed = false;
  let fulfillCleanup = () => {
  };
  const waitForCleanup = new Promise((f) => fulfillCleanup = f);
  spawnedProcess.once("close", (exitCode, signal) => {
    options.log(`[pid=${spawnedProcess.pid}] <process did exit: exitCode=${exitCode}, signal=${signal}>`);
    processClosed = true;
    gracefullyCloseSet.delete(gracefullyClose);
    killSet.delete(killProcessAndCleanup);
    removeProcessHandlersIfNeeded();
    options.onExit(exitCode, signal);
    cleanup().then(fulfillCleanup);
  });
  addProcessHandlerIfNeeded("exit");
  if (options.handleSIGINT)
    addProcessHandlerIfNeeded("SIGINT");
  if (options.handleSIGTERM)
    addProcessHandlerIfNeeded("SIGTERM");
  if (options.handleSIGHUP)
    addProcessHandlerIfNeeded("SIGHUP");
  gracefullyCloseSet.add(gracefullyClose);
  killSet.add(killProcessAndCleanup);
  let gracefullyClosing = false;
  async function gracefullyClose() {
    if (gracefullyClosing) {
      options.log(`[pid=${spawnedProcess.pid}] <forcefully close>`);
      killProcess();
      await waitForCleanup;
      return;
    }
    gracefullyClosing = true;
    options.log(`[pid=${spawnedProcess.pid}] <gracefully close start>`);
    await options.attemptToGracefullyClose().catch(() => killProcess());
    await waitForCleanup;
    options.log(`[pid=${spawnedProcess.pid}] <gracefully close end>`);
  }
  function killProcess() {
    gracefullyCloseSet.delete(gracefullyClose);
    killSet.delete(killProcessAndCleanup);
    removeProcessHandlersIfNeeded();
    options.log(`[pid=${spawnedProcess.pid}] <kill>`);
    if (spawnedProcess.pid && !spawnedProcess.killed && !processClosed) {
      options.log(`[pid=${spawnedProcess.pid}] <will force kill>`);
      try {
        if (process.platform === "win32") {
          const taskkillProcess = childProcess.spawnSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, { shell: true });
          const [stdout2, stderr2] = [taskkillProcess.stdout.toString(), taskkillProcess.stderr.toString()];
          if (stdout2)
            options.log(`[pid=${spawnedProcess.pid}] taskkill stdout: ${stdout2}`);
          if (stderr2)
            options.log(`[pid=${spawnedProcess.pid}] taskkill stderr: ${stderr2}`);
        } else {
          process.kill(-spawnedProcess.pid, "SIGKILL");
        }
      } catch (e) {
        options.log(`[pid=${spawnedProcess.pid}] exception while trying to kill process: ${e}`);
      }
    } else {
      options.log(`[pid=${spawnedProcess.pid}] <skipped force kill spawnedProcess.killed=${spawnedProcess.killed} processClosed=${processClosed}>`);
    }
  }
  function killProcessAndCleanup() {
    killProcess();
    options.log(`[pid=${spawnedProcess.pid || "N/A"}] starting temporary directories cleanup`);
    for (const dir of options.tempDirectories) {
      try {
        import_fs.default.rmSync(dir, { force: true, recursive: true, maxRetries: 5 });
      } catch (e) {
        options.log(`[pid=${spawnedProcess.pid || "N/A"}] exception while removing ${dir}: ${e}`);
      }
    }
    options.log(`[pid=${spawnedProcess.pid || "N/A"}] finished temporary directories cleanup`);
  }
  function killAndWait() {
    killProcess();
    return waitForCleanup;
  }
  return { launchedProcess: spawnedProcess, gracefullyClose, kill: killAndWait };
}
function envArrayToObject(env) {
  const result = {};
  for (const { name, value } of env)
    result[name] = value;
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  envArrayToObject,
  gracefullyCloseAll,
  gracefullyCloseSet,
  gracefullyProcessExitDoNotHang,
  launchProcess
});
