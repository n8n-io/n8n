"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var utils_exports = {};
__export(utils_exports, {
  McpToolkit: () => McpToolkit,
  connectMcpClient: () => connectMcpClient,
  createCallTool: () => createCallTool,
  getAllTools: () => getAllTools,
  getAuthHeaders: () => getAuthHeaders,
  getErrorDescriptionFromToolCall: () => getErrorDescriptionFromToolCall,
  getSelectedTools: () => getSelectedTools,
  mcpToolToDynamicTool: () => mcpToolToDynamicTool
});
module.exports = __toCommonJS(utils_exports);
var import_tools = require("@langchain/core/tools");
var import_client = require("@modelcontextprotocol/sdk/client/index.js");
var import_sse = require("@modelcontextprotocol/sdk/client/sse.js");
var import_streamableHttp = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
var import_types = require("@modelcontextprotocol/sdk/types.js");
var import_schemaParsing = require("../../../utils/schemaParsing");
var import_agents = require("langchain/agents");
var import_n8n_workflow = require("n8n-workflow");
var import_zod = require("zod");
async function getAllTools(client, cursor) {
  const { tools, nextCursor } = await client.listTools({ cursor });
  if (nextCursor) {
    return tools.concat(await getAllTools(client, nextCursor));
  }
  return tools;
}
function getSelectedTools({
  mode,
  includeTools,
  excludeTools,
  tools
}) {
  switch (mode) {
    case "selected": {
      if (!includeTools?.length) return tools;
      const include = new Set(includeTools);
      return tools.filter((tool) => include.has(tool.name));
    }
    case "except": {
      const except = new Set(excludeTools ?? []);
      return tools.filter((tool) => !except.has(tool.name));
    }
    case "all":
    default:
      return tools;
  }
}
const getErrorDescriptionFromToolCall = (result) => {
  if (result && typeof result === "object") {
    if ("content" in result && Array.isArray(result.content)) {
      const errorMessage = result.content.find(
        (content) => content && typeof content === "object" && typeof content.text === "string"
      )?.text;
      return errorMessage;
    } else if ("toolResult" in result && typeof result.toolResult === "string") {
      return result.toolResult;
    }
    if ("message" in result && typeof result.message === "string") {
      return result.message;
    }
  }
  return void 0;
};
const createCallTool = (name, client, timeout, onError) => async (args) => {
  let result;
  function handleError(error) {
    const errorDescription = getErrorDescriptionFromToolCall(error) ?? `Failed to execute tool "${name}"`;
    onError(errorDescription);
    return errorDescription;
  }
  try {
    result = await client.callTool({ name, arguments: args }, import_types.CompatibilityCallToolResultSchema, {
      timeout
    });
  } catch (error) {
    return handleError(error);
  }
  if (result.isError) {
    return handleError(result);
  }
  if (result.toolResult !== void 0) {
    return result.toolResult;
  }
  if (result.content !== void 0) {
    return result.content;
  }
  return result;
};
function mcpToolToDynamicTool(tool, onCallTool) {
  const rawSchema = (0, import_schemaParsing.convertJsonSchemaToZod)(tool.inputSchema);
  const objectSchema = rawSchema instanceof import_zod.z.ZodObject ? rawSchema : import_zod.z.object({ value: rawSchema });
  return new import_tools.DynamicStructuredTool({
    name: tool.name,
    description: tool.description ?? "",
    schema: objectSchema,
    func: onCallTool,
    metadata: { isFromToolkit: true }
  });
}
class McpToolkit extends import_agents.Toolkit {
  constructor(tools) {
    super();
    this.tools = tools;
  }
}
function safeCreateUrl(url, baseUrl) {
  try {
    return (0, import_n8n_workflow.createResultOk)(new URL(url, baseUrl));
  } catch (error) {
    return (0, import_n8n_workflow.createResultError)(error);
  }
}
function normalizeAndValidateUrl(input) {
  const withProtocol = !/^https?:\/\//i.test(input) ? `https://${input}` : input;
  const parsedUrl = safeCreateUrl(withProtocol);
  if (!parsedUrl.ok) {
    return (0, import_n8n_workflow.createResultError)(parsedUrl.error);
  }
  return parsedUrl;
}
async function connectMcpClient({
  headers,
  serverTransport,
  endpointUrl,
  name,
  version
}) {
  const endpoint = normalizeAndValidateUrl(endpointUrl);
  if (!endpoint.ok) {
    return (0, import_n8n_workflow.createResultError)({ type: "invalid_url", error: endpoint.error });
  }
  const client = new import_client.Client({ name, version: version.toString() }, { capabilities: { tools: {} } });
  if (serverTransport === "httpStreamable") {
    try {
      const transport = new import_streamableHttp.StreamableHTTPClientTransport(endpoint.result, {
        requestInit: { headers }
      });
      await client.connect(transport);
      return (0, import_n8n_workflow.createResultOk)(client);
    } catch (error) {
      return (0, import_n8n_workflow.createResultError)({ type: "connection", error });
    }
  }
  try {
    const sseTransport = new import_sse.SSEClientTransport(endpoint.result, {
      eventSourceInit: {
        fetch: async (url, init) => await fetch(url, {
          ...init,
          headers: {
            ...headers,
            Accept: "text/event-stream"
          }
        })
      },
      requestInit: { headers }
    });
    await client.connect(sseTransport);
    return (0, import_n8n_workflow.createResultOk)(client);
  } catch (error) {
    return (0, import_n8n_workflow.createResultError)({ type: "connection", error });
  }
}
async function getAuthHeaders(ctx, authentication) {
  switch (authentication) {
    case "headerAuth": {
      const header = await ctx.getCredentials("httpHeaderAuth").catch(() => null);
      if (!header) return {};
      return { headers: { [header.name]: header.value } };
    }
    case "bearerAuth": {
      const result = await ctx.getCredentials("httpBearerAuth").catch(() => null);
      if (!result) return {};
      return { headers: { Authorization: `Bearer ${result.token}` } };
    }
    case "customAuth": {
      const customAuth = await ctx.getCredentials("httpCustomAuth").catch(() => null);
      if (!customAuth) return {};
      const auth = import_n8n_workflow.jsonParse((customAuth.json || "{}"), {
        errorMessage: "Invalid Custom Auth JSON"
      });
      if (auth.headers) {
        return { headers: auth.headers };
      }
      return {};
    }
    case "none":
    default: {
      return {};
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  McpToolkit,
  connectMcpClient,
  createCallTool,
  getAllTools,
  getAuthHeaders,
  getErrorDescriptionFromToolCall,
  getSelectedTools,
  mcpToolToDynamicTool
});
//# sourceMappingURL=utils.js.map