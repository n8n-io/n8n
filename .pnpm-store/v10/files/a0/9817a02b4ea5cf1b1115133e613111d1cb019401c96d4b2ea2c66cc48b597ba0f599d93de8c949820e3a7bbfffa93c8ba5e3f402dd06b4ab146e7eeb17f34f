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
  __commonJS,
  __require,
  __toESM
} from "../_node-chunks/chunk-4LSYFR5U.js";

// ../../node_modules/tree-kill/index.js
var require_tree_kill = __commonJS({
  "../../node_modules/tree-kill/index.js"(exports, module) {
    "use strict";
    var childProcess = __require("child_process"), spawn2 = childProcess.spawn, exec = childProcess.exec;
    module.exports = function(pid, signal, callback) {
      if (typeof signal == "function" && callback === void 0 && (callback = signal, signal = void 0), pid = parseInt(pid), Number.isNaN(pid)) {
        if (callback)
          return callback(new Error("pid must be a number"));
        throw new Error("pid must be a number");
      }
      var tree = {}, pidsToProcess = {};
      switch (tree[pid] = [], pidsToProcess[pid] = 1, process.platform) {
        case "win32":
          exec("taskkill /pid " + pid + " /T /F", callback);
          break;
        case "darwin":
          buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
            return spawn2("pgrep", ["-P", parentPid]);
          }, function() {
            killAll(tree, signal, callback);
          });
          break;
        // case 'sunos':
        //     buildProcessTreeSunOS(pid, tree, pidsToProcess, function () {
        //         killAll(tree, signal, callback);
        //     });
        //     break;
        default:
          buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
            return spawn2("ps", ["-o", "pid", "--no-headers", "--ppid", parentPid]);
          }, function() {
            killAll(tree, signal, callback);
          });
          break;
      }
    };
    function killAll(tree, signal, callback) {
      var killed = {};
      try {
        Object.keys(tree).forEach(function(pid) {
          tree[pid].forEach(function(pidpid) {
            killed[pidpid] || (killPid(pidpid, signal), killed[pidpid] = 1);
          }), killed[pid] || (killPid(pid, signal), killed[pid] = 1);
        });
      } catch (err) {
        if (callback)
          return callback(err);
        throw err;
      }
      if (callback)
        return callback();
    }
    function killPid(pid, signal) {
      try {
        process.kill(parseInt(pid, 10), signal);
      } catch (err) {
        if (err.code !== "ESRCH") throw err;
      }
    }
    function buildProcessTree(parentPid, tree, pidsToProcess, spawnChildProcessesList, cb) {
      var ps = spawnChildProcessesList(parentPid), allData = "";
      ps.stdout.on("data", function(data) {
        var data = data.toString("ascii");
        allData += data;
      });
      var onClose = function(code) {
        if (delete pidsToProcess[parentPid], code != 0) {
          Object.keys(pidsToProcess).length == 0 && cb();
          return;
        }
        allData.match(/\d+/g).forEach(function(pid) {
          pid = parseInt(pid, 10), tree[parentPid].push(pid), tree[pid] = [], pidsToProcess[pid] = 1, buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
        });
      };
      ps.on("close", onClose);
    }
  }
});

// src/vitest-plugin/global-setup.ts
var import_tree_kill = __toESM(require_tree_kill(), 1);
import { spawn } from "node:child_process";
import { logger } from "storybook/internal/node-logger";
var storybookProcess = null, getIsVitestStandaloneRun = () => {
  try {
    return (import.meta.env || process?.env).STORYBOOK !== "true";
  } catch {
    return !1;
  }
}, isVitestStandaloneRun = getIsVitestStandaloneRun(), checkStorybookRunning = async (storybookUrl) => {
  try {
    return (await fetch(`${storybookUrl}/iframe.html`, { method: "HEAD" })).ok;
  } catch {
    return !1;
  }
}, startStorybookIfNotRunning = async () => {
  let storybookScript = process.env.__STORYBOOK_SCRIPT__, storybookUrl = process.env.__STORYBOOK_URL__;
  if (await checkStorybookRunning(storybookUrl)) {
    logger.verbose("Storybook is already running");
    return;
  }
  logger.verbose(`Starting Storybook with command: ${storybookScript}`);
  try {
    storybookProcess = spawn(storybookScript, {
      shell: !0,
      stdio: process.env.DEBUG === "storybook" ? "pipe" : "ignore",
      cwd: process.cwd()
    }), storybookProcess.on("error", (error) => {
      throw logger.verbose("Failed to start Storybook:" + error.message), error;
    });
  } catch (error) {
    throw logger.verbose("Failed to start Storybook:" + error.message), error;
  }
}, setup = async ({ config }) => {
  config.watch && isVitestStandaloneRun && await startStorybookIfNotRunning();
}, teardown = async () => {
  storybookProcess && (logger.verbose("Stopping Storybook process"), await new Promise((resolve, reject) => {
    storybookProcess?.pid && (0, import_tree_kill.default)(storybookProcess.pid, "SIGTERM", (error) => {
      if (error) {
        logger.error("Failed to stop Storybook process:"), reject(error);
        return;
      }
      resolve();
    });
  }));
};
export {
  setup,
  teardown
};
