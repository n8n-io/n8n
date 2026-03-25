Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../../currentScopes.js');
const object = require('../../utils/object.js');
const handlers = require('./handlers.js');
const transport = require('./transport.js');
const validation = require('./validation.js');

/**
 * Tracks wrapped MCP server instances to prevent double-wrapping
 * @internal
 */
const wrappedMcpServerInstances = new WeakSet();

/**
 * Wraps a MCP Server instance from the `@modelcontextprotocol/sdk` package with Sentry instrumentation.
 *
 * Compatible with versions `^1.9.0` of the `@modelcontextprotocol/sdk` package.
 * Automatically instruments transport methods and handler functions for comprehensive monitoring.
 *
 * @example
 * ```typescript
 * import * as Sentry from '@sentry/core';
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
 *
 * // Default: inputs/outputs captured based on sendDefaultPii option
 * const server = Sentry.wrapMcpServerWithSentry(
 *   new McpServer({ name: "my-server", version: "1.0.0" })
 * );
 *
 * // Explicitly control input/output capture
 * const server = Sentry.wrapMcpServerWithSentry(
 *   new McpServer({ name: "my-server", version: "1.0.0" }),
 *   { recordInputs: true, recordOutputs: false }
 * );
 *
 * const transport = new StreamableHTTPServerTransport();
 * await server.connect(transport);
 * ```
 *
 * @param mcpServerInstance - MCP server instance to instrument
 * @param options - Optional configuration for recording inputs and outputs
 * @returns Instrumented server instance (same reference)
 */
function wrapMcpServerWithSentry(mcpServerInstance, options) {
  if (wrappedMcpServerInstances.has(mcpServerInstance)) {
    return mcpServerInstance;
  }

  if (!validation.validateMcpServerInstance(mcpServerInstance)) {
    return mcpServerInstance;
  }

  const serverInstance = mcpServerInstance ;
  const client = currentScopes.getClient();
  const sendDefaultPii = Boolean(client?.getOptions().sendDefaultPii);

  const resolvedOptions = {
    recordInputs: options?.recordInputs ?? sendDefaultPii,
    recordOutputs: options?.recordOutputs ?? sendDefaultPii,
  };

  object.fill(serverInstance, 'connect', originalConnect => {
    return async function ( transport$1, ...restArgs) {
      const result = await (originalConnect ).call(
        this,
        transport$1,
        ...restArgs,
      );

      transport.wrapTransportOnMessage(transport$1, resolvedOptions);
      transport.wrapTransportSend(transport$1, resolvedOptions);
      transport.wrapTransportOnClose(transport$1);
      transport.wrapTransportError(transport$1);

      return result;
    };
  });

  handlers.wrapAllMCPHandlers(serverInstance);

  wrappedMcpServerInstances.add(mcpServerInstance);
  return mcpServerInstance;
}

exports.wrapMcpServerWithSentry = wrapMcpServerWithSentry;
//# sourceMappingURL=index.js.map
