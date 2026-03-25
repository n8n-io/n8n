"use strict";
/**
 * Experimental McpServer task features for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentalMcpServerTasks = void 0;
/**
 * Experimental task features for McpServer.
 *
 * Access via `server.experimental.tasks`:
 * ```typescript
 * server.experimental.tasks.registerToolTask('long-running', config, handler);
 * ```
 *
 * @experimental
 */
class ExperimentalMcpServerTasks {
    constructor(_mcpServer) {
        this._mcpServer = _mcpServer;
    }
    registerToolTask(name, config, handler) {
        // Validate that taskSupport is not 'forbidden' for task-based tools
        const execution = { taskSupport: 'required', ...config.execution };
        if (execution.taskSupport === 'forbidden') {
            throw new Error(`Cannot register task-based tool '${name}' with taskSupport 'forbidden'. Use registerTool() instead.`);
        }
        // Access McpServer's internal _createRegisteredTool method
        const mcpServerInternal = this._mcpServer;
        return mcpServerInternal._createRegisteredTool(name, config.title, config.description, config.inputSchema, config.outputSchema, config.annotations, execution, config._meta, handler);
    }
}
exports.ExperimentalMcpServerTasks = ExperimentalMcpServerTasks;
//# sourceMappingURL=mcp-server.js.map