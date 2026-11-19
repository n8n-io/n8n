#!/usr/bin/env node
/**
 * Basic MCP Server Template
 *
 * A minimal, production-ready MCP server with:
 * - Proper error handling
 * - Input validation
 * - Structured logging
 * - Graceful shutdown
 *
 * Usage:
 * 1. Copy this template
 * 2. Add your tools in the tools array
 * 3. Implement tool handlers in the switch statement
 * 4. Run with: node dist/index.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  name: "my-mcp-server",
  version: "1.0.0",
  description: "Description of your MCP server",
};

// =============================================================================
// Input Schemas (Zod)
// =============================================================================

const ExampleToolSchema = z.object({
  input: z.string().min(1).max(10000),
  options: z.object({
    format: z.enum(["json", "text"]).default("json"),
    verbose: z.boolean().default(false),
  }).optional(),
});

// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS = [
  {
    name: "example_tool",
    description: `Example tool that processes input.

Features:
- Validates input
- Returns structured output
- Supports JSON and text formats`,
    inputSchema: {
      type: "object" as const,
      properties: {
        input: {
          type: "string",
          description: "Input to process",
        },
        options: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["json", "text"],
              default: "json",
            },
            verbose: {
              type: "boolean",
              default: false,
            },
          },
        },
      },
      required: ["input"],
    },
  },
  {
    name: "health_check",
    description: "Check server health and status",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// =============================================================================
// Tool Implementations
// =============================================================================

async function handleExampleTool(args: z.infer<typeof ExampleToolSchema>) {
  // Your implementation here
  const result = {
    processed: args.input.toUpperCase(),
    length: args.input.length,
    timestamp: new Date().toISOString(),
  };

  if (args.options?.format === "text") {
    return `Processed: ${result.processed} (${result.length} chars)`;
  }

  return result;
}

async function handleHealthCheck() {
  return {
    status: "healthy",
    version: CONFIG.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: CONFIG.name,
    version: CONFIG.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// =============================================================================
// Request Handlers
// =============================================================================

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    let result: unknown;

    switch (name) {
      case "example_tool": {
        const validated = ExampleToolSchema.parse(args);
        result = await handleExampleTool(validated);
        break;
      }

      case "health_check": {
        result = await handleHealthCheck();
        break;
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    const duration = Date.now() - startTime;
    console.error(`Tool ${name} completed in ${duration}ms`);

    return {
      content: [
        {
          type: "text",
          text: typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Tool ${name} failed after ${duration}ms:`, error);

    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Validation error: ${error.errors.map(e => e.message).join(", ")}`
      );
    }

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});

// List resources (optional)
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: `${CONFIG.name}://status`,
      name: "Server Status",
      description: "Current server status and configuration",
      mimeType: "application/json",
    },
  ],
}));

// Read resources (optional)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === `${CONFIG.name}://status`) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            name: CONFIG.name,
            version: CONFIG.version,
            status: "running",
            uptime: process.uptime(),
          }, null, 2),
        },
      ],
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

function shutdown(signal: string) {
  console.error(`Received ${signal}, shutting down...`);
  // Add cleanup logic here (close connections, etc.)
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// =============================================================================
// Start Server
// =============================================================================

async function main() {
  console.error(`Starting ${CONFIG.name} v${CONFIG.version}...`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
