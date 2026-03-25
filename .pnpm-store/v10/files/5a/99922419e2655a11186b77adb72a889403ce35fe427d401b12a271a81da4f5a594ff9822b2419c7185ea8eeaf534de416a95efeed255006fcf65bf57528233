/**
 * Experimental McpServer task features for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
import type { McpServer, RegisteredTool } from '../../server/mcp.js';
import type { ZodRawShapeCompat, AnySchema } from '../../server/zod-compat.js';
import type { ToolAnnotations } from '../../types.js';
import type { ToolTaskHandler, TaskToolExecution } from './interfaces.js';
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
export declare class ExperimentalMcpServerTasks {
    private readonly _mcpServer;
    constructor(_mcpServer: McpServer);
    /**
     * Registers a task-based tool with a config object and handler.
     *
     * Task-based tools support long-running operations that can be polled for status
     * and results. The handler must implement `createTask`, `getTask`, and `getTaskResult`
     * methods.
     *
     * @example
     * ```typescript
     * server.experimental.tasks.registerToolTask('long-computation', {
     *   description: 'Performs a long computation',
     *   inputSchema: { input: z.string() },
     *   execution: { taskSupport: 'required' }
     * }, {
     *   createTask: async (args, extra) => {
     *     const task = await extra.taskStore.createTask({ ttl: 300000 });
     *     startBackgroundWork(task.taskId, args);
     *     return { task };
     *   },
     *   getTask: async (args, extra) => {
     *     return extra.taskStore.getTask(extra.taskId);
     *   },
     *   getTaskResult: async (args, extra) => {
     *     return extra.taskStore.getTaskResult(extra.taskId);
     *   }
     * });
     * ```
     *
     * @param name - The tool name
     * @param config - Tool configuration (description, schemas, etc.)
     * @param handler - Task handler with createTask, getTask, getTaskResult methods
     * @returns RegisteredTool for managing the tool's lifecycle
     *
     * @experimental
     */
    registerToolTask<OutputArgs extends undefined | ZodRawShapeCompat | AnySchema>(name: string, config: {
        title?: string;
        description?: string;
        outputSchema?: OutputArgs;
        annotations?: ToolAnnotations;
        execution?: TaskToolExecution;
        _meta?: Record<string, unknown>;
    }, handler: ToolTaskHandler<undefined>): RegisteredTool;
    registerToolTask<InputArgs extends ZodRawShapeCompat | AnySchema, OutputArgs extends undefined | ZodRawShapeCompat | AnySchema>(name: string, config: {
        title?: string;
        description?: string;
        inputSchema: InputArgs;
        outputSchema?: OutputArgs;
        annotations?: ToolAnnotations;
        execution?: TaskToolExecution;
        _meta?: Record<string, unknown>;
    }, handler: ToolTaskHandler<InputArgs>): RegisteredTool;
}
//# sourceMappingURL=mcp-server.d.ts.map