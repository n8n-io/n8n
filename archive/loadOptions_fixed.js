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
var loadOptions_exports = {};
__export(loadOptions_exports, {
  getTools: () => getTools
});
module.exports = __toCommonJS(loadOptions_exports);
var import_n8n_workflow = require("n8n-workflow");
var import_utils = require("./utils");
async function getTools() {
  const authentication = this.getNodeParameter("authentication");
  const node = this.getNode();
  let serverTransport;
  let endpointUrl;
  if (node.typeVersion === 1) {
    serverTransport = "sse";
    endpointUrl = this.getNodeParameter("sseEndpoint");
  } else {
    serverTransport = this.getNodeParameter("serverTransport");
    endpointUrl = this.getNodeParameter("endpointUrl");
  }
  const { headers } = await (0, import_utils.getAuthHeaders)(this, authentication, 0);
  const client = await (0, import_utils.connectMcpClient)({
    serverTransport,
    endpointUrl,
    headers,
    name: node.type,
    version: node.typeVersion
  });
  if (!client.ok) {
    throw new import_n8n_workflow.NodeOperationError(this.getNode(), "Could not connect to your MCP server");
  }
  const tools = await (0, import_utils.getAllTools)(client.result);
  return tools.map((tool) => ({
    name: tool.name,
    value: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getTools
});
//# sourceMappingURL=loadOptions.js.map