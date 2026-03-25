"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var import_child_process = require("child_process");
var import_crypto = __toESM(require("crypto"));
var import_fs = __toESM(require("fs"));
var import_net = __toESM(require("net"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_socketConnection = require("./socketConnection");
const debugCli = (0, import_utilsBundle.debug)("pw:cli");
const packageJSON = require("../../../package.json");
async function runCliCommand(sessionName, args) {
  const session = await connectToDaemon(sessionName);
  const result = await session.runCliCommand(args);
  console.log(result);
  session.dispose();
}
async function socketExists(socketPath) {
  try {
    const stat = await import_fs.default.promises.stat(socketPath);
    if (stat?.isSocket())
      return true;
  } catch (e) {
  }
  return false;
}
class SocketSession {
  constructor(connection) {
    this._nextMessageId = 1;
    this._callbacks = /* @__PURE__ */ new Map();
    this._connection = connection;
    this._connection.onmessage = (message) => this._onMessage(message);
    this._connection.onclose = () => this.dispose();
  }
  async callTool(name, args) {
    return this._send(name, args);
  }
  async runCliCommand(args) {
    return await this._send("runCliCommand", { args });
  }
  async _send(method, params = {}) {
    const messageId = this._nextMessageId++;
    const message = {
      id: messageId,
      method,
      params
    };
    await this._connection.send(message);
    return new Promise((resolve, reject) => {
      this._callbacks.set(messageId, { resolve, reject });
    });
  }
  dispose() {
    for (const callback of this._callbacks.values())
      callback.reject(new Error("Disposed"));
    this._callbacks.clear();
    this._connection.close();
  }
  _onMessage(object) {
    if (object.id && this._callbacks.has(object.id)) {
      const callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error)
        callback.reject(new Error(object.error));
      else
        callback.resolve(object.result);
    } else if (object.id) {
      throw new Error(`Unexpected message id: ${object.id}`);
    } else {
      throw new Error(`Unexpected message without id: ${JSON.stringify(object)}`);
    }
  }
}
function localCacheDir() {
  if (process.platform === "linux")
    return process.env.XDG_CACHE_HOME || import_path.default.join(import_os.default.homedir(), ".cache");
  if (process.platform === "darwin")
    return import_path.default.join(import_os.default.homedir(), "Library", "Caches");
  if (process.platform === "win32")
    return process.env.LOCALAPPDATA || import_path.default.join(import_os.default.homedir(), "AppData", "Local");
  throw new Error("Unsupported platform: " + process.platform);
}
function playwrightCacheDir() {
  return import_path.default.join(localCacheDir(), "ms-playwright");
}
function calculateSha1(buffer) {
  const hash = import_crypto.default.createHash("sha1");
  hash.update(buffer);
  return hash.digest("hex");
}
function socketDirHash() {
  return calculateSha1(__dirname);
}
function daemonSocketDir() {
  return import_path.default.resolve(playwrightCacheDir(), "daemon", socketDirHash());
}
function daemonSocketPath(sessionName) {
  const socketName = `${sessionName}.sock`;
  if (import_os.default.platform() === "win32")
    return `\\\\.\\pipe\\${socketDirHash()}-${socketName}`;
  return import_path.default.resolve(daemonSocketDir(), socketName);
}
async function connectToDaemon(sessionName) {
  const socketPath = daemonSocketPath(sessionName);
  debugCli(`Connecting to daemon at ${socketPath}`);
  if (await socketExists(socketPath)) {
    debugCli(`Socket file exists, attempting to connect...`);
    try {
      return await connectToSocket(socketPath);
    } catch (e) {
      if (import_os.default.platform() !== "win32")
        await import_fs.default.promises.unlink(socketPath).catch(() => {
        });
    }
  }
  const cliPath = import_path.default.join(__dirname, "../../../cli.js");
  debugCli(`Will launch daemon process: ${cliPath}`);
  const userDataDir = import_path.default.resolve(daemonSocketDir(), `${sessionName}-user-data`);
  const child = (0, import_child_process.spawn)(process.execPath, [cliPath, "run-mcp-server", `--daemon=${socketPath}`, `--user-data-dir=${userDataDir}`], {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd()
    // Will be used as root.
  });
  child.unref();
  const maxRetries = 50;
  const retryDelay = 100;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      return await connectToSocket(socketPath);
    } catch (e) {
      if (e.code !== "ENOENT")
        throw e;
      debugCli(`Retrying to connect to daemon at ${socketPath} (${i + 1}/${maxRetries})`);
    }
  }
  throw new Error(`Failed to connect to daemon at ${socketPath} after ${maxRetries * retryDelay}ms`);
}
async function connectToSocket(socketPath) {
  const socket = await new Promise((resolve, reject) => {
    const socket2 = import_net.default.createConnection(socketPath, () => {
      debugCli(`Connected to daemon at ${socketPath}`);
      resolve(socket2);
    });
    socket2.on("error", reject);
  });
  return new SocketSession(new import_socketConnection.SocketConnection(socket));
}
function currentSessionPath() {
  return import_path.default.resolve(daemonSocketDir(), "current-session");
}
async function getCurrentSession() {
  try {
    const session = await import_fs.default.promises.readFile(currentSessionPath(), "utf-8");
    return session.trim() || "default";
  } catch {
    return "default";
  }
}
async function setCurrentSession(sessionName) {
  await import_fs.default.promises.mkdir(daemonSocketDir(), { recursive: true });
  await import_fs.default.promises.writeFile(currentSessionPath(), sessionName);
}
async function canConnectToSocket(socketPath) {
  return new Promise((resolve) => {
    const socket = import_net.default.createConnection(socketPath, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}
async function listSessions() {
  const dir = daemonSocketDir();
  try {
    const files = await import_fs.default.promises.readdir(dir);
    const sessions = [];
    for (const file of files) {
      if (file.endsWith("-user-data")) {
        const sessionName = file.slice(0, -"-user-data".length);
        const socketPath = daemonSocketPath(sessionName);
        const live = await canConnectToSocket(socketPath);
        sessions.push({ name: sessionName, live });
      }
    }
    return sessions;
  } catch {
    return [];
  }
}
function resolveSessionName(args) {
  if (args.session)
    return args.session;
  if (process.env.PLAYWRIGHT_CLI_SESSION)
    return process.env.PLAYWRIGHT_CLI_SESSION;
  return "default";
}
async function handleSessionCommand(args) {
  const subcommand = args._[1];
  if (!subcommand) {
    const current = await getCurrentSession();
    console.log(current);
    return;
  }
  if (subcommand === "list") {
    const sessions = await listSessions();
    const current = await getCurrentSession();
    console.log("Sessions:");
    for (const session of sessions) {
      const marker = session.name === current ? "->" : "  ";
      const liveMarker = session.live ? " (live)" : "";
      console.log(`${marker} ${session.name}${liveMarker}`);
    }
    if (sessions.length === 0)
      console.log("   (no sessions)");
    return;
  }
  if (subcommand === "set") {
    const sessionName = args._[2];
    if (!sessionName) {
      console.error("Usage: playwright-cli session set <session-name>");
      process.exit(1);
    }
    await setCurrentSession(sessionName);
    console.log(`Current session set to: ${sessionName}`);
    return;
  }
  console.error(`Unknown session subcommand: ${subcommand}`);
  process.exit(1);
}
async function main() {
  const argv = process.argv.slice(2);
  const args = require("minimist")(argv);
  const help = require("./help.json");
  const commandName = args._[0];
  if (args.version || args.v) {
    console.log(packageJSON.version);
    process.exit(0);
  }
  if (commandName === "session") {
    await handleSessionCommand(args);
    return;
  }
  const command = help.commands[commandName];
  if (args.help || args.h) {
    if (command) {
      console.log(command);
    } else {
      console.log("playwright-cli - run playwright mcp commands from terminal\n");
      console.log(help.global);
    }
    process.exit(0);
  }
  if (!command) {
    console.error(`Unknown command: ${commandName}
`);
    console.log(help.global);
    process.exit(1);
  }
  let sessionName = resolveSessionName(args);
  if (sessionName === "default" && !args.session && !process.env.PLAYWRIGHT_CLI_SESSION)
    sessionName = await getCurrentSession();
  runCliCommand(sessionName, args).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
