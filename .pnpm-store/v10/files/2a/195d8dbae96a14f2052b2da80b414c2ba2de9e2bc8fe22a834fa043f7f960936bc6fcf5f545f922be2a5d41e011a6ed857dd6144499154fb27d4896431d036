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
  program: () => program
});
module.exports = __toCommonJS(program_exports);
var import_child_process = require("child_process");
var import_crypto = __toESM(require("crypto"));
var import_fs = __toESM(require("fs"));
var import_net = __toESM(require("net"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_socketConnection = require("./socketConnection");
class Session {
  constructor(clientInfo, name, options) {
    this._nextMessageId = 1;
    this._callbacks = /* @__PURE__ */ new Map();
    this.name = name;
    this._clientInfo = clientInfo;
    this._config = options;
  }
  config() {
    return this._config;
  }
  isCompatible() {
    return this._clientInfo.version === this._config.version;
  }
  checkCompatible() {
    if (!this.isCompatible()) {
      throw new Error(`Client is v${this._clientInfo.version}, session '${this.name}' is v${this._config.version}. Run

  playwright-cli${this.name !== "default" ? ` -s=${this.name}` : ""} open

to restart the browser session.`);
    }
  }
  async run(args) {
    this.checkCompatible();
    return await this._send("run", { args, cwd: process.cwd() });
  }
  async stop(quiet = false) {
    if (!await this.canConnect()) {
      if (!quiet)
        console.log(`Browser '${this.name}' is not open.`);
      return;
    }
    await this._stopDaemon();
    if (!quiet)
      console.log(`Browser '${this.name}' closed
`);
  }
  async _send(method, params = {}) {
    const connection = await this._startDaemonIfNeeded();
    const messageId = this._nextMessageId++;
    const message = {
      id: messageId,
      method,
      params,
      version: this._config.version
    };
    const responsePromise = new Promise((resolve, reject) => {
      this._callbacks.set(messageId, { resolve, reject, method, params });
    });
    const [result] = await Promise.all([responsePromise, connection.send(message)]);
    return result;
  }
  disconnect() {
    if (!this._connection)
      return;
    for (const callback of this._callbacks.values())
      callback.reject(new Error("Session closed"));
    this._callbacks.clear();
    this._connection.close();
    this._connection = void 0;
  }
  async deleteData() {
    await this.stop();
    const dataDirs = await import_fs.default.promises.readdir(this._clientInfo.daemonProfilesDir).catch(() => []);
    const matchingEntries = dataDirs.filter((file) => file === `${this.name}.session` || file.startsWith(`ud-${this.name}-`));
    if (matchingEntries.length === 0) {
      console.log(`No user data found for browser '${this.name}'.`);
      return;
    }
    for (const entry of matchingEntries) {
      const userDataDir = import_path.default.resolve(this._clientInfo.daemonProfilesDir, entry);
      for (let i = 0; i < 5; i++) {
        try {
          await import_fs.default.promises.rm(userDataDir, { recursive: true });
          if (entry.startsWith("ud-"))
            console.log(`Deleted user data for browser '${this.name}'.`);
          break;
        } catch (e) {
          if (e.code === "ENOENT") {
            console.log(`No user data found for browser '${this.name}'.`);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          if (i === 4)
            throw e;
        }
      }
    }
  }
  async _connect() {
    return await new Promise((resolve) => {
      const socket = import_net.default.createConnection(this._config.socketPath, () => {
        resolve({ socket });
      });
      socket.on("error", (error) => {
        if (import_os.default.platform() !== "win32")
          void import_fs.default.promises.unlink(this._config.socketPath).catch(() => {
          }).then(() => resolve({ error }));
        else
          resolve({ error });
      });
    });
  }
  async canConnect() {
    const { socket } = await this._connect();
    if (socket) {
      socket.destroy();
      return true;
    }
    return false;
  }
  async _startDaemonIfNeeded() {
    if (this._connection)
      return this._connection;
    let { socket } = await this._connect();
    if (!socket)
      socket = await this._startDaemon();
    this._connection = new import_socketConnection.SocketConnection(socket, this._config.version);
    this._connection.onmessage = (message) => this._onMessage(message);
    this._connection.onclose = () => this.disconnect();
    return this._connection;
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
  _sessionFile(suffix) {
    return import_path.default.resolve(this._clientInfo.daemonProfilesDir, `${this.name}${suffix}`);
  }
  async _startDaemon() {
    await import_fs.default.promises.mkdir(this._clientInfo.daemonProfilesDir, { recursive: true });
    const cliPath = import_path.default.join(__dirname, "../../../cli.js");
    const sessionConfigFile = this._sessionFile(".session");
    this._config.version = this._clientInfo.version;
    await import_fs.default.promises.writeFile(sessionConfigFile, JSON.stringify(this._config, null, 2));
    const errLog = this._sessionFile(".err");
    const err = import_fs.default.openSync(errLog, "w");
    const args = [
      cliPath,
      "run-mcp-server",
      `--daemon-session=${sessionConfigFile}`
    ];
    const child = (0, import_child_process.spawn)(process.execPath, args, {
      detached: true,
      stdio: ["ignore", "pipe", err],
      cwd: process.cwd()
      // Will be used as root.
    });
    let signalled = false;
    const sigintHandler = () => {
      signalled = true;
      child.kill("SIGINT");
    };
    const sigtermHandler = () => {
      signalled = true;
      child.kill("SIGTERM");
    };
    process.on("SIGINT", sigintHandler);
    process.on("SIGTERM", sigtermHandler);
    let outLog = "";
    await new Promise((resolve, reject) => {
      child.stdout.on("data", (data) => {
        outLog += data.toString();
        if (!outLog.includes("<EOF>"))
          return;
        const errorMatch = outLog.match(/### Error\n([\s\S]*)<EOF>/);
        const error = errorMatch ? errorMatch[1].trim() : void 0;
        if (error) {
          const errLogContent = import_fs.default.readFileSync(errLog, "utf-8");
          const message = error + (errLogContent ? "\n" + errLogContent : "");
          reject(new Error(message));
        }
        const successMatch = outLog.match(/### Success\nDaemon listening on (.*)\n<EOF>/);
        if (successMatch)
          resolve();
      });
      child.on("close", (code) => {
        if (!signalled)
          reject(new Error(`Daemon process exited with code ${code}`));
      });
    });
    process.off("SIGINT", sigintHandler);
    process.off("SIGTERM", sigtermHandler);
    child.stdout.destroy();
    child.unref();
    const { socket } = await this._connect();
    if (socket) {
      console.log(`### Browser \`${this.name}\` opened with pid ${child.pid}.`);
      const resolvedConfig = await parseResolvedConfig(outLog);
      if (resolvedConfig) {
        this._config.resolvedConfig = resolvedConfig;
        console.log(`- ${this.name}:`);
        console.log(renderResolvedConfig(resolvedConfig).join("\n"));
      }
      console.log(`---`);
      await import_fs.default.promises.writeFile(sessionConfigFile, JSON.stringify(this._config, null, 2));
      return socket;
    }
    console.error(`Failed to connect to daemon at ${this._config.socketPath}`);
    process.exit(1);
  }
  async _stopDaemon() {
    let error;
    await this._send("stop").catch((e) => {
      error = e;
    });
    if (import_os.default.platform() !== "win32")
      await import_fs.default.promises.unlink(this._config.socketPath).catch(() => {
      });
    this.disconnect();
    if (!this._config.cli.persistent)
      await this.deleteSessionConfig();
    if (error && !error?.message?.includes("Session closed"))
      throw error;
  }
  async deleteSessionConfig() {
    await import_fs.default.promises.rm(this._sessionFile(".session")).catch(() => {
    });
  }
}
class SessionManager {
  constructor(clientInfo, sessions) {
    this.clientInfo = clientInfo;
    this.sessions = sessions;
  }
  static async create(clientInfo) {
    const dir = clientInfo.daemonProfilesDir;
    const sessions = /* @__PURE__ */ new Map();
    const files = await import_fs.default.promises.readdir(dir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith(".session"))
        continue;
      try {
        const sessionName = import_path.default.basename(file, ".session");
        const sessionConfig = await import_fs.default.promises.readFile(import_path.default.join(dir, file), "utf-8").then((data) => JSON.parse(data));
        sessions.set(sessionName, new Session(clientInfo, sessionName, sessionConfig));
      } catch {
      }
    }
    return new SessionManager(clientInfo, sessions);
  }
  async open(args) {
    const sessionName = this._resolveSessionName(args.session);
    let session = this.sessions.get(sessionName);
    if (session)
      await session.stop(true);
    session = new Session(this.clientInfo, sessionName, sessionConfigFromArgs(this.clientInfo, sessionName, args));
    this.sessions.set(sessionName, session);
    await this.run(args);
  }
  async run(args) {
    const sessionName = this._resolveSessionName(args.session);
    const session = this.sessions.get(sessionName);
    if (!session) {
      console.log(`The browser '${sessionName}' is not open, please run open first`);
      console.log("");
      console.log(`  playwright-cli${sessionName !== "default" ? ` -s=${sessionName}` : ""} open [params]`);
      process.exit(1);
    }
    for (const globalOption of globalOptions)
      delete args[globalOption];
    const result = await session.run(args);
    console.log(result.text);
    session.disconnect();
  }
  async close(options) {
    const sessionName = this._resolveSessionName(options.session);
    const session = this.sessions.get(sessionName);
    if (!session || !await session.canConnect()) {
      console.log(`Browser '${sessionName}' is not open.`);
      return;
    }
    await session.stop();
  }
  async deleteData(options) {
    const sessionName = this._resolveSessionName(options.session);
    const session = this.sessions.get(sessionName);
    if (!session) {
      console.log(`No user data found for browser '${sessionName}'.`);
      return;
    }
    await session.deleteData();
    this.sessions.delete(sessionName);
  }
  _resolveSessionName(sessionName) {
    if (sessionName)
      return sessionName;
    if (process.env.PLAYWRIGHT_CLI_SESSION)
      return process.env.PLAYWRIGHT_CLI_SESSION;
    return "default";
  }
}
function createClientInfo(packageLocation) {
  const packageJSON = require(packageLocation);
  const workspaceDir = findWorkspaceDir(process.cwd());
  const version = process.env.PLAYWRIGHT_CLI_VERSION_FOR_TEST || packageJSON.version;
  const hash = import_crypto.default.createHash("sha1");
  hash.update(workspaceDir || packageLocation);
  const workspaceDirHash = hash.digest("hex").substring(0, 16);
  return {
    version,
    workspaceDir,
    workspaceDirHash,
    daemonProfilesDir: daemonProfilesDir(workspaceDirHash)
  };
}
function findWorkspaceDir(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (import_fs.default.existsSync(import_path.default.join(dir, ".playwright")))
      return dir;
    const parentDir = import_path.default.dirname(dir);
    if (parentDir === dir)
      break;
    dir = parentDir;
  }
  return void 0;
}
const baseDaemonDir = (() => {
  if (process.env.PLAYWRIGHT_DAEMON_SESSION_DIR)
    return process.env.PLAYWRIGHT_DAEMON_SESSION_DIR;
  let localCacheDir;
  if (process.platform === "linux")
    localCacheDir = process.env.XDG_CACHE_HOME || import_path.default.join(import_os.default.homedir(), ".cache");
  if (process.platform === "darwin")
    localCacheDir = import_path.default.join(import_os.default.homedir(), "Library", "Caches");
  if (process.platform === "win32")
    localCacheDir = process.env.LOCALAPPDATA || import_path.default.join(import_os.default.homedir(), "AppData", "Local");
  if (!localCacheDir)
    throw new Error("Unsupported platform: " + process.platform);
  return import_path.default.join(localCacheDir, "ms-playwright", "daemon");
})();
const daemonProfilesDir = (workspaceDirHash) => {
  return import_path.default.join(baseDaemonDir, workspaceDirHash);
};
const globalOptions = [
  "browser",
  "config",
  "extension",
  "headed",
  "help",
  "persistent",
  "profile",
  "session",
  "version"
];
const booleanOptions = [
  "all",
  "help",
  "version",
  "extension",
  "headed",
  "persistent"
];
async function program(packageLocation) {
  const clientInfo = createClientInfo(packageLocation);
  const help = require("./help.json");
  const argv = process.argv.slice(2);
  const boolean = [...help.booleanOptions, ...booleanOptions];
  const args = require("minimist")(argv, { boolean });
  for (const [key, value] of Object.entries(args)) {
    if (key !== "_" && typeof value !== "boolean")
      args[key] = String(value);
  }
  for (let index = 0; index < args._.length; index++)
    args._[index] = String(args._[index]);
  for (const option of boolean) {
    if (!argv.includes(`--${option}`) && !argv.includes(`--no-${option}`))
      delete args[option];
    if (argv.some((arg) => arg.startsWith(`--${option}=`) || arg.startsWith(`--no-${option}=`))) {
      console.error(`boolean option '--${option}' should not be passed with '=value', use '--${option}' or '--no-${option}' instead`);
      process.exit(1);
    }
  }
  if (args.s) {
    args.session = args.s;
    delete args.s;
  }
  const commandName = args._?.[0];
  if (args.version || args.v) {
    console.log(clientInfo.version);
    process.exit(0);
  }
  const command = commandName && help.commands[commandName];
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
  const sessionManager = await SessionManager.create(clientInfo);
  switch (commandName) {
    case "list": {
      if (args.all)
        await listAllSessions(clientInfo);
      else
        await listSessions(sessionManager);
      return;
    }
    case "close-all": {
      const sessions = sessionManager.sessions;
      for (const session of sessions.values())
        await session.stop(true);
      return;
    }
    case "delete-data":
      await sessionManager.deleteData(args);
      return;
    case "kill-all":
      await killAllDaemons();
      return;
    case "open":
      await sessionManager.open(args);
      return;
    case "close":
      await sessionManager.close(args);
      return;
    case "install":
      await install(args);
      return;
    default:
      await sessionManager.run(args);
  }
}
async function install(args) {
  const cwd = process.cwd();
  const playwrightDir = import_path.default.join(cwd, ".playwright");
  await import_fs.default.promises.mkdir(playwrightDir, { recursive: true });
  console.log(`\u2705 Workspace initialized at \`${cwd}\`.`);
  if (args.skills) {
    const skillSourceDir = import_path.default.join(__dirname, "../../skill");
    const skillDestDir = import_path.default.join(cwd, ".claude", "skills", "playwright-cli");
    if (!import_fs.default.existsSync(skillSourceDir)) {
      console.error("\u274C Skills source directory not found:", skillSourceDir);
      process.exit(1);
    }
    await import_fs.default.promises.cp(skillSourceDir, skillDestDir, { recursive: true });
    console.log(`\u2705 Skills installed to \`${import_path.default.relative(cwd, skillDestDir)}\`.`);
  }
  if (!args.config)
    await ensureConfiguredBrowserInstalled();
}
async function ensureConfiguredBrowserInstalled() {
  if (import_fs.default.existsSync(defaultConfigFile())) {
    const { registry } = await import("playwright-core/lib/server/registry/index");
    const config = JSON.parse(await import_fs.default.promises.readFile(defaultConfigFile(), "utf-8"));
    const browserName = config.browser?.browserName ?? "chromium";
    const channel = config.browser?.launchOptions?.channel;
    if (!channel || channel.startsWith("chromium")) {
      const executable = registry.findExecutable(channel ?? browserName);
      if (executable && !import_fs.default.existsSync(executable?.executablePath()))
        await registry.install([executable]);
    }
  } else {
    const channel = await findOrInstallDefaultBrowser();
    if (channel !== "chrome")
      await createDefaultConfig(channel);
  }
}
async function createDefaultConfig(channel) {
  const config = {
    browser: {
      browserName: "chromium",
      launchOptions: {
        channel
      }
    }
  };
  await import_fs.default.promises.writeFile(defaultConfigFile(), JSON.stringify(config, null, 2));
  console.log(`\u2705 Created default config for ${channel} at ${import_path.default.relative(process.cwd(), defaultConfigFile())}.`);
}
async function findOrInstallDefaultBrowser() {
  const { registry } = await import("playwright-core/lib/server/registry/index");
  const channels = ["chrome", "msedge"];
  for (const channel of channels) {
    const executable = registry.findExecutable(channel);
    if (!executable?.executablePath())
      continue;
    console.log(`\u2705 Found ${channel}, will use it as the default browser.`);
    return channel;
  }
  const chromiumExecutable = registry.findExecutable("chromium");
  if (!import_fs.default.existsSync(chromiumExecutable?.executablePath()))
    await registry.install([chromiumExecutable]);
  return "chromium";
}
function daemonSocketPath(clientInfo, sessionName) {
  const socketName = `${sessionName}.sock`;
  if (import_os.default.platform() === "win32")
    return `\\\\.\\pipe\\${clientInfo.workspaceDirHash}-${socketName}`;
  const socketsDir = process.env.PLAYWRIGHT_DAEMON_SOCKETS_DIR || import_path.default.join(import_os.default.tmpdir(), "playwright-cli");
  return import_path.default.join(socketsDir, clientInfo.workspaceDirHash, socketName);
}
function defaultConfigFile() {
  return import_path.default.resolve(".playwright", "cli.config.json");
}
function sessionConfigFromArgs(clientInfo, sessionName, args) {
  let config = args.config ? import_path.default.resolve(args.config) : void 0;
  try {
    if (!config && import_fs.default.existsSync(defaultConfigFile()))
      config = defaultConfigFile();
  } catch {
  }
  if (!args.persistent && args.profile)
    args.persistent = true;
  return {
    version: clientInfo.version,
    socketPath: daemonSocketPath(clientInfo, sessionName),
    cli: {
      headed: args.headed,
      extension: args.extension,
      browser: args.browser,
      persistent: args.persistent,
      profile: args.profile,
      config
    },
    userDataDirPrefix: import_path.default.resolve(clientInfo.daemonProfilesDir, `ud-${sessionName}`),
    workspaceDir: clientInfo.workspaceDir
  };
}
async function killAllDaemons() {
  const platform = import_os.default.platform();
  let killed = 0;
  try {
    if (platform === "win32") {
      const result = (0, import_child_process.execSync)(
        `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*run-mcp-server*' -and $_.CommandLine -like '*--daemon-session*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }"`,
        { encoding: "utf-8" }
      );
      const pids = result.split("\n").map((line) => line.trim()).filter((line) => /^\d+$/.test(line));
      for (const pid of pids)
        console.log(`Killed daemon process ${pid}`);
      killed = pids.length;
    } else {
      const result = (0, import_child_process.execSync)("ps aux", { encoding: "utf-8" });
      const lines = result.split("\n");
      for (const line of lines) {
        if (line.includes("run-mcp-server") && line.includes("--daemon-session")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[1];
          if (pid && /^\d+$/.test(pid)) {
            try {
              process.kill(parseInt(pid, 10), "SIGKILL");
              console.log(`Killed daemon process ${pid}`);
              killed++;
            } catch {
            }
          }
        }
      }
    }
  } catch (e) {
  }
  if (killed === 0)
    console.log("No daemon processes found.");
  else if (killed > 0)
    console.log(`Killed ${killed} daemon process${killed === 1 ? "" : "es"}.`);
}
async function listSessions(sessionManager) {
  const sessions = sessionManager.sessions;
  console.log("### Browsers");
  await gcAndPrintSessions([...sessions.values()]);
}
async function listAllSessions(clientInfo) {
  const hashes = await import_fs.default.promises.readdir(baseDaemonDir).catch(() => []);
  const sessionsByWorkspace = /* @__PURE__ */ new Map();
  for (const hash of hashes) {
    const hashDir = import_path.default.join(baseDaemonDir, hash);
    const stat = await import_fs.default.promises.stat(hashDir).catch(() => null);
    if (!stat?.isDirectory())
      continue;
    const files = await import_fs.default.promises.readdir(hashDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith(".session"))
        continue;
      try {
        const sessionName = import_path.default.basename(file, ".session");
        const sessionConfig = await import_fs.default.promises.readFile(import_path.default.join(hashDir, file), "utf-8").then((data) => JSON.parse(data));
        const session = new Session(clientInfo, sessionName, sessionConfig);
        const workspaceKey = sessionConfig.workspaceDir || "<global>";
        if (!sessionsByWorkspace.has(workspaceKey))
          sessionsByWorkspace.set(workspaceKey, []);
        sessionsByWorkspace.get(workspaceKey).push(session);
      } catch {
      }
    }
  }
  if (sessionsByWorkspace.size === 0) {
    console.log("No browsers found.");
    return;
  }
  const sortedWorkspaces = [...sessionsByWorkspace.keys()].sort();
  for (const workspace of sortedWorkspaces) {
    const sessions = sessionsByWorkspace.get(workspace);
    console.log(`${workspace}:`);
    await gcAndPrintSessions(sessions);
  }
}
async function gcAndPrintSessions(sessions) {
  const running = [];
  const stopped = [];
  for (const session of sessions.values()) {
    const canConnect = await session.canConnect();
    if (canConnect) {
      running.push(session);
    } else {
      if (session.config().cli.persistent)
        stopped.push(session);
      else
        await session.deleteSessionConfig();
    }
  }
  for (const session of running)
    console.log(await renderSessionStatus(session));
  for (const session of stopped)
    console.log(await renderSessionStatus(session));
  if (running.length === 0 && stopped.length === 0)
    console.log("  (no browsers)");
}
async function renderSessionStatus(session) {
  const text = [];
  const config = session.config();
  const canConnect = await session.canConnect();
  text.push(`- ${session.name}:`);
  text.push(`  - status: ${canConnect ? "open" : "closed"}`);
  if (canConnect && !session.isCompatible())
    text.push(`  - version: v${config.version} [incompatible please re-open]`);
  if (config.resolvedConfig)
    text.push(...renderResolvedConfig(config.resolvedConfig));
  return text.join("\n");
}
function renderResolvedConfig(resolvedConfig) {
  const channel = resolvedConfig.browser.launchOptions.channel ?? resolvedConfig.browser.browserName;
  const lines = [];
  if (channel)
    lines.push(`  - browser-type: ${channel}`);
  if (resolvedConfig.browser.isolated)
    lines.push(`  - user-data-dir: <in-memory>`);
  else
    lines.push(`  - user-data-dir: ${resolvedConfig.browser.userDataDir}`);
  lines.push(`  - headed: ${!resolvedConfig.browser.launchOptions.headless}`);
  return lines;
}
async function parseResolvedConfig(errLog) {
  const marker = "### Config\n```json\n";
  const markerIndex = errLog.indexOf(marker);
  if (markerIndex === -1)
    return null;
  const jsonStart = markerIndex + marker.length;
  const jsonEnd = errLog.indexOf("\n```", jsonStart);
  if (jsonEnd === -1)
    throw null;
  const jsonString = errLog.substring(jsonStart, jsonEnd).trim();
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  program
});
