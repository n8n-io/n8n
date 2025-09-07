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
var McpClientTool_node_exports = {};
__export(McpClientTool_node_exports, {
  McpClientTool: () => McpClientTool
});
module.exports = __toCommonJS(McpClientTool_node_exports);
var import_logWrapper = require("../../../utils/logWrapper");
var import_sharedFields = require("../../../utils/sharedFields");
var import_n8n_workflow = require("n8n-workflow");
var import_loadOptions = require("./loadOptions");
var import_utils = require("./utils");
class McpClientTool {
  constructor() {
    this.description = {
      displayName: "MCP Client Tool",
      name: "mcpClientTool",
      icon: {
        light: "file:../mcp.svg",
        dark: "file:../mcp.dark.svg"
      },
      group: ["output"],
      version: [1, 1.1],
      description: "Connect tools from an MCP Server",
      defaults: {
        name: "MCP Client"
      },
      codex: {
        categories: ["AI"],
        subcategories: {
          AI: ["Model Context Protocol", "Tools"]
        },
        alias: ["Model Context Protocol", "MCP Client"],
        resources: {
          primaryDocumentation: [
            {
              url: "https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/"
            }
          ]
        }
      },
      inputs: [],
      outputs: [{ type: import_n8n_workflow.NodeConnectionTypes.AiTool, displayName: "Tools" }],
      credentials: [
        {
          // eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
          name: "httpBearerAuth",
          required: true,
          displayOptions: {
            show: {
              authentication: ["bearerAuth"]
            }
          }
        },
        {
          name: "httpHeaderAuth",
          required: true,
          displayOptions: {
            show: {
              authentication: ["headerAuth"]
            }
          }
        },
        {
          name: "httpCustomAuth",
          required: true,
          displayOptions: {
            show: {
              authentication: ["customAuth"]
            }
          }
        }
      ],
      properties: [
        (0, import_sharedFields.getConnectionHintNoticeField)([import_n8n_workflow.NodeConnectionTypes.AiAgent]),
        {
          displayName: "SSE Endpoint",
          name: "sseEndpoint",
          type: "string",
          description: "SSE Endpoint of your MCP server",
          placeholder: "e.g. https://my-mcp-server.ai/sse",
          default: "",
          required: true,
          displayOptions: {
            show: {
              "@version": [1]
            }
          }
        },
        {
          displayName: "Endpoint",
          name: "endpointUrl",
          type: "string",
          description: "Endpoint of your MCP server",
          placeholder: "e.g. https://my-mcp-server.ai/mcp",
          default: "",
          required: true,
          displayOptions: {
            show: {
              "@version": [{ _cnd: { gte: 1.1 } }]
            }
          }
        },
        {
          displayName: "Server Transport",
          name: "serverTransport",
          type: "options",
          options: [
            {
              name: "Server Sent Events (Deprecated)",
              value: "sse"
            },
            {
              name: "HTTP Streamable",
              value: "httpStreamable"
            }
          ],
          default: "sse",
          description: "The transport used by your endpoint",
          displayOptions: {
            show: {
              "@version": [{ _cnd: { gte: 1.1 } }]
            }
          }
        },
        {
          displayName: "Authentication",
          name: "authentication",
          type: "options",
          options: [
            {
              name: "Bearer Auth",
              value: "bearerAuth"
            },
            {
              name: "Custom Auth",
              value: "customAuth"
            },
            {
              name: "Header Auth",
              value: "headerAuth"
            },
            {
              name: "None",
              value: "none"
            }
          ],
          default: "none",
          description: "The way to authenticate with your endpoint"
        },
        {
          displayName: "Credentials",
          name: "credentials",
          type: "credentials",
          default: "",
          displayOptions: {
            show: {
              authentication: ["headerAuth", "bearerAuth", "customAuth"]
            }
          }
        },
        {
          displayName: "Tools to Include",
          name: "include",
          type: "options",
          description: "How to select the tools you want to be exposed to the AI Agent",
          default: "all",
          options: [
            {
              name: "All",
              value: "all",
              description: "Also include all unchanged fields from the input"
            },
            {
              name: "Selected",
              value: "selected",
              description: 'Also include the tools listed in the parameter "Tools to Include"'
            },
            {
              name: "All Except",
              value: "except",
              description: 'Exclude the tools listed in the parameter "Tools to Exclude"'
            }
          ]
        },
        {
          displayName: "Tools to Include",
          name: "includeTools",
          type: "multiOptions",
          default: [],
          description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
          typeOptions: {
            loadOptionsMethod: "getTools",
            loadOptionsDependsOn: ["sseEndpoint"]
          },
          displayOptions: {
            show: {
              include: ["selected"]
            }
          }
        },
        {
          displayName: "Tools to Exclude",
          name: "excludeTools",
          type: "multiOptions",
          default: [],
          description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
          typeOptions: {
            loadOptionsMethod: "getTools"
          },
          displayOptions: {
            show: {
              include: ["except"]
            }
          }
        },
        {
          displayName: "Options",
          name: "options",
          placeholder: "Add Option",
          description: "Additional options to add",
          type: "collection",
          default: {},
          options: [
            {
              displayName: "Timeout",
              name: "timeout",
              type: "number",
              typeOptions: {
                minValue: 1
              },
              default: 6e4,
              description: "Time in ms to wait for tool calls to finish"
            }
          ]
        }
      ]
    };
    this.methods = {
      loadOptions: {
        getTools: import_loadOptions.getTools
      }
    };
  }
  async supplyData(itemIndex) {
    const authentication = this.getNodeParameter(
      "authentication",
      itemIndex
    );
    const node = this.getNode();
    const timeout = this.getNodeParameter("options.timeout", itemIndex, 6e4);
    let serverTransport;
    let endpointUrl;
    if (node.typeVersion === 1) {
      serverTransport = "sse";
      endpointUrl = this.getNodeParameter("sseEndpoint", itemIndex);
    } else {
      serverTransport = this.getNodeParameter("serverTransport", itemIndex);
      endpointUrl = this.getNodeParameter("endpointUrl", itemIndex);
    }
    const { headers } = await (0, import_utils.getAuthHeaders)(this, authentication);
    const client = await (0, import_utils.connectMcpClient)({
      serverTransport,
      endpointUrl,
      headers,
      name: node.type,
      version: node.typeVersion
    });
    const setError = (message, description) => {
      const error = new import_n8n_workflow.NodeOperationError(node, message, { itemIndex, description });
      this.addOutputData(import_n8n_workflow.NodeConnectionTypes.AiTool, itemIndex, error);
      throw error;
    };
    if (!client.ok) {
      this.logger.error("McpClientTool: Failed to connect to MCP Server", {
        error: client.error
      });
      switch (client.error.type) {
        case "invalid_url":
          return setError("Could not connect to your MCP server. The provided URL is invalid.");
        case "connection":
        default:
          return setError("Could not connect to your MCP server");
      }
    }
    this.logger.debug("McpClientTool: Successfully connected to MCP Server");
    const mode = this.getNodeParameter("include", itemIndex);
    const includeTools = this.getNodeParameter("includeTools", itemIndex, []);
    const excludeTools = this.getNodeParameter("excludeTools", itemIndex, []);
    const allTools = await (0, import_utils.getAllTools)(client.result);
    const mcpTools = (0, import_utils.getSelectedTools)({
      tools: allTools,
      mode,
      includeTools,
      excludeTools
    });
    if (!mcpTools.length) {
      return setError(
        "MCP Server returned no tools",
        "Connected successfully to your MCP server but it returned an empty list of tools."
      );
    }
    const tools = mcpTools.map(
      (tool) => (0, import_logWrapper.logWrapper)(
        (0, import_utils.mcpToolToDynamicTool)(
          tool,
          (0, import_utils.createCallTool)(tool.name, client.result, timeout, (errorMessage) => {
            const error = new import_n8n_workflow.NodeOperationError(node, errorMessage, { itemIndex });
            void this.addOutputData(import_n8n_workflow.NodeConnectionTypes.AiTool, itemIndex, error);
            this.logger.error(`McpClientTool: Tool "${tool.name}" failed to execute`, { error });
          })
        ),
        this
      )
    );
    this.logger.debug(`McpClientTool: Connected to MCP Server with ${tools.length} tools`);
    const toolkit = new import_utils.McpToolkit(tools);
    return { response: toolkit, closeFunction: async () => await client.result.close() };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  McpClientTool
});
//# sourceMappingURL=McpClientTool.node.js.map