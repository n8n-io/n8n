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
var daemon_exports = {};
__export(daemon_exports, {
  startMcpDaemonServer: () => startMcpDaemonServer
});
module.exports = __toCommonJS(daemon_exports);
var import_promises = __toESM(require("fs/promises"));
var import_net = __toESM(require("net"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_url = __toESM(require("url"));
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_socketConnection = require("./socketConnection");
var import_commands = require("./commands");
var import_command = require("./command");
const daemonDebug = (0, import_utilsBundle.debug)("pw:daemon");
async function socketExists(socketPath) {
  try {
    const stat = await import_promises.default.stat(socketPath);
    if (stat?.isSocket())
      return true;
  } catch (e) {
  }
  return false;
}
async function startMcpDaemonServer(socketPath, serverBackendFactory) {
  if (import_os.default.platform() !== "win32" && await socketExists(socketPath)) {
    daemonDebug(`Socket already exists, removing: ${socketPath}`);
    try {
      await import_promises.default.unlink(socketPath);
    } catch (error) {
      daemonDebug(`Failed to remove existing socket: ${error}`);
      throw error;
    }
  }
  const backend = serverBackendFactory.create();
  const cwd = import_url.default.pathToFileURL(process.cwd()).href;
  await backend.initialize?.({
    name: "playwright-cli",
    version: "1.0.0",
    roots: [{
      uri: cwd,
      name: "cwd"
    }],
    timestamp: Date.now()
  });
  await import_promises.default.mkdir(import_path.default.dirname(socketPath), { recursive: true });
  const server = import_net.default.createServer((socket) => {
    daemonDebug("new client connection");
    const connection = new import_socketConnection.SocketConnection(socket);
    connection.onclose = () => {
      daemonDebug("client disconnected");
    };
    connection.onmessage = async (message) => {
      const { id, method, params } = message;
      try {
        daemonDebug("received command", method);
        if (method === "runCliCommand") {
          const { toolName, toolParams } = parseCliCommand(params.args);
          const response = await backend.callTool(toolName, toolParams, () => {
          });
          await connection.send({ id, result: formatResult(response) });
        } else {
          throw new Error(`Unknown method: ${method}`);
        }
      } catch (e) {
        daemonDebug("command failed", e);
        await connection.send({ id, error: e.message });
      }
    };
  });
  return new Promise((resolve, reject) => {
    server.on("error", (error) => {
      daemonDebug(`server error: ${error.message}`);
      reject(error);
    });
    server.listen(socketPath, () => {
      daemonDebug(`daemon server listening on ${socketPath}`);
      resolve(socketPath);
    });
  });
}
function formatResult(result) {
  const lines = [];
  for (const content of result.content) {
    if (content.type === "text")
      lines.push(content.text);
    else
      lines.push(`<${content.type} content>`);
  }
  return lines.join("\n");
}
function parseCliCommand(args) {
  const command = import_commands.commands[args._[0]];
  if (!command)
    throw new Error("Command is required");
  return (0, import_command.parseCommand)(command, args);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startMcpDaemonServer
});
