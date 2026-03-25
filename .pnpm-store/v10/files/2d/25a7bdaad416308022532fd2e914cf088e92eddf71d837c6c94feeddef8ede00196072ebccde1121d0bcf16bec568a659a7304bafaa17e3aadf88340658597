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
var server_exports = {};
__export(server_exports, {
  allRootPaths: () => allRootPaths,
  connect: () => connect,
  createServer: () => createServer,
  firstRootPath: () => firstRootPath,
  start: () => start,
  wrapInClient: () => wrapInClient,
  wrapInProcess: () => wrapInProcess
});
module.exports = __toCommonJS(server_exports);
var import_url = require("url");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var mcpBundle = __toESM(require("playwright-core/lib/mcpBundle"));
var import_http = require("./http");
var import_inProcessTransport = require("./inProcessTransport");
const serverDebug = (0, import_utilsBundle.debug)("pw:mcp:server");
const serverDebugResponse = (0, import_utilsBundle.debug)("pw:mcp:server:response");
async function connect(factory, transport, runHeartbeat) {
  const server = createServer(factory.name, factory.version, factory.create(), runHeartbeat);
  await server.connect(transport);
}
function wrapInProcess(backend) {
  const server = createServer("Internal", "0.0.0", backend, false);
  return new import_inProcessTransport.InProcessTransport(server);
}
async function wrapInClient(backend, options) {
  const server = createServer("Internal", "0.0.0", backend, false);
  const transport = new import_inProcessTransport.InProcessTransport(server);
  const client = new mcpBundle.Client({ name: options.name, version: options.version });
  await client.connect(transport);
  await client.ping();
  return client;
}
function createServer(name, version, backend, runHeartbeat) {
  const server = new mcpBundle.Server({ name, version }, {
    capabilities: {
      tools: {}
    }
  });
  server.setRequestHandler(mcpBundle.ListToolsRequestSchema, async () => {
    serverDebug("listTools");
    const tools = await backend.listTools();
    return { tools };
  });
  let initializePromise;
  server.setRequestHandler(mcpBundle.CallToolRequestSchema, async (request, extra) => {
    serverDebug("callTool", request);
    const progressToken = request.params._meta?.progressToken;
    let progressCounter = 0;
    const progress = progressToken ? (params) => {
      extra.sendNotification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress: params.progress ?? ++progressCounter,
          total: params.total,
          message: params.message
        }
      }).catch(serverDebug);
    } : () => {
    };
    try {
      if (!initializePromise)
        initializePromise = initializeServer(server, backend, runHeartbeat);
      await initializePromise;
      const toolResult = await backend.callTool(request.params.name, request.params.arguments || {}, progress);
      const mergedResult = mergeTextParts(toolResult);
      serverDebugResponse("callResult", mergedResult);
      return mergedResult;
    } catch (error) {
      return {
        content: [{ type: "text", text: "### Result\n" + String(error) }],
        isError: true
      };
    }
  });
  addServerListener(server, "close", () => backend.serverClosed?.(server));
  return server;
}
const initializeServer = async (server, backend, runHeartbeat) => {
  const capabilities = server.getClientCapabilities();
  let clientRoots = [];
  if (capabilities?.roots) {
    const { roots } = await server.listRoots().catch((e) => {
      serverDebug(e);
      return { roots: [] };
    });
    clientRoots = roots;
  }
  const clientInfo = {
    name: server.getClientVersion()?.name ?? "unknown",
    version: server.getClientVersion()?.version ?? "unknown",
    roots: clientRoots,
    timestamp: Date.now()
  };
  await backend.initialize?.(clientInfo);
  if (runHeartbeat)
    startHeartbeat(server);
};
const startHeartbeat = (server) => {
  const beat = () => {
    Promise.race([
      server.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ping timeout")), 5e3))
    ]).then(() => {
      setTimeout(beat, 3e3);
    }).catch(() => {
      void server.close();
    });
  };
  beat();
};
function addServerListener(server, event, listener) {
  const oldListener = server[`on${event}`];
  server[`on${event}`] = () => {
    oldListener?.();
    listener();
  };
}
async function start(serverBackendFactory, options) {
  if (options.port === void 0) {
    await connect(serverBackendFactory, new mcpBundle.StdioServerTransport(), false);
    return;
  }
  const url = await (0, import_http.startMcpHttpServer)(options, serverBackendFactory, options.allowedHosts);
  const mcpConfig = { mcpServers: {} };
  mcpConfig.mcpServers[serverBackendFactory.nameInConfig] = {
    url: `${url}/mcp`
  };
  const message = [
    `Listening on ${url}`,
    "Put this in your client config:",
    JSON.stringify(mcpConfig, void 0, 2),
    "For legacy SSE transport support, you can use the /sse endpoint instead."
  ].join("\n");
  console.error(message);
}
function firstRootPath(clientInfo) {
  if (clientInfo.roots.length === 0)
    return void 0;
  const firstRootUri = clientInfo.roots[0]?.uri;
  const url = firstRootUri ? new URL(firstRootUri) : void 0;
  try {
    return url ? (0, import_url.fileURLToPath)(url) : void 0;
  } catch (error) {
    serverDebug(error);
    return void 0;
  }
}
function allRootPaths(clientInfo) {
  const paths = [];
  for (const root of clientInfo.roots) {
    try {
      const url = new URL(root.uri);
      const path = (0, import_url.fileURLToPath)(url);
      if (path)
        paths.push(path);
    } catch (error) {
      serverDebug(error);
    }
  }
  return paths;
}
function mergeTextParts(result) {
  const content = [];
  const testParts = [];
  for (const part of result.content) {
    if (part.type === "text") {
      testParts.push(part.text);
      continue;
    }
    if (testParts.length > 0) {
      content.push({ type: "text", text: testParts.join("\n") });
      testParts.length = 0;
    }
    content.push(part);
  }
  if (testParts.length > 0)
    content.push({ type: "text", text: testParts.join("\n") });
  return {
    ...result,
    content
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  allRootPaths,
  connect,
  createServer,
  firstRootPath,
  start,
  wrapInClient,
  wrapInProcess
});
