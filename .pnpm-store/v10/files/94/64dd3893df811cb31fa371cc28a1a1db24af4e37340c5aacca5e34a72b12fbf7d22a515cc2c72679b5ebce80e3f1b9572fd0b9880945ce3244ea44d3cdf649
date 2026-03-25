import { AgentBuiltInState, Runtime } from "../runtime.cjs";
import { AgentMiddleware } from "./types.cjs";
import { ToolCall } from "@langchain/core/messages";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/hitl.d.ts
declare const DescriptionFunctionSchema: z.ZodFunction<z.ZodTuple<[z.ZodType<ToolCall<string, Record<string, any>>, z.ZodTypeDef, ToolCall<string, Record<string, any>>>, z.ZodType<AgentBuiltInState, z.ZodTypeDef, AgentBuiltInState>, z.ZodType<Runtime<unknown>, z.ZodTypeDef, Runtime<unknown>>], z.ZodUnknown>, z.ZodUnion<[z.ZodString, z.ZodPromise<z.ZodString>]>>;
/**
 * Function type that dynamically generates a description for a tool call approval request.
 *
 * @param toolCall - The tool call being reviewed
 * @param state - The current agent state
 * @param runtime - The agent runtime context
 * @returns A string description or Promise that resolves to a string description
 *
 * @example
 * ```typescript
 * import { type DescriptionFactory, type ToolCall } from "langchain";
 *
 * const descriptionFactory: DescriptionFactory = (toolCall, state, runtime) => {
 *   return `Please review: ${toolCall.name}(${JSON.stringify(toolCall.args)})`;
 * };
 * ```
 */
type DescriptionFactory = z.infer<typeof DescriptionFunctionSchema>;
declare const DecisionType: z.ZodEnum<["approve", "edit", "reject"]>;
type DecisionType = z.infer<typeof DecisionType>;
declare const InterruptOnConfigSchema: z.ZodObject<{
  /**
   * The decisions that are allowed for this action.
   */
  allowedDecisions: z.ZodArray<z.ZodEnum<["approve", "edit", "reject"]>, "many">;
  /**
   * The description attached to the request for human input.
   * Can be either:
   * - A static string describing the approval request
   * - A callable that dynamically generates the description based on agent state,
   *   runtime, and tool call information
   *
   * @example
   * Static string description
   * ```typescript
   * import type { InterruptOnConfig } from "langchain";
   *
   * const config: InterruptOnConfig = {
   *   allowedDecisions: ["approve", "reject"],
   *   description: "Please review this tool execution"
   * };
   * ```
   *
   * @example
   * Dynamic callable description
   * ```typescript
   * import type {
   *   AgentBuiltInState,
   *   Runtime,
   *   DescriptionFactory,
   *   ToolCall,
   *   InterruptOnConfig
   * } from "langchain";
   *
   * const formatToolDescription: DescriptionFactory = (
   *   toolCall: ToolCall,
   *   state: AgentBuiltInState,
   *   runtime: Runtime<unknown>
   * ) => {
   *   return `Tool: ${toolCall.name}\nArguments:\n${JSON.stringify(toolCall.args, null, 2)}`;
   * };
   *
   * const config: InterruptOnConfig = {
   *   allowedDecisions: ["approve", "edit"],
   *   description: formatToolDescription
   * };
   * ```
   */
  description: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodFunction<z.ZodTuple<[z.ZodType<ToolCall<string, Record<string, any>>, z.ZodTypeDef, ToolCall<string, Record<string, any>>>, z.ZodType<AgentBuiltInState, z.ZodTypeDef, AgentBuiltInState>, z.ZodType<Runtime<unknown>, z.ZodTypeDef, Runtime<unknown>>], z.ZodUnknown>, z.ZodUnion<[z.ZodString, z.ZodPromise<z.ZodString>]>>]>>;
  /**
   * JSON schema for the arguments associated with the action, if edits are allowed.
   */
  argsSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
  allowedDecisions: ("approve" | "edit" | "reject")[];
  description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
  argsSchema?: Record<string, any> | undefined;
}, {
  allowedDecisions: ("approve" | "edit" | "reject")[];
  description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
  argsSchema?: Record<string, any> | undefined;
}>;
type InterruptOnConfig = z.input<typeof InterruptOnConfigSchema>;
/**
 * Represents an action with a name and arguments.
 */
interface Action {
  /**
   * The type or name of action being requested (e.g., "add_numbers").
   */
  name: string;
  /**
   * Key-value pairs of arguments needed for the action (e.g., {"a": 1, "b": 2}).
   */
  args: Record<string, any>;
}
/**
 * Represents an action request with a name, arguments, and description.
 */
interface ActionRequest {
  /**
   * The name of the action being requested.
   */
  name: string;
  /**
   * Key-value pairs of arguments needed for the action (e.g., {"a": 1, "b": 2}).
   */
  args: Record<string, any>;
  /**
   * The description of the action to be reviewed.
   */
  description?: string;
}
/**
 * Policy for reviewing a HITL request.
 */
interface ReviewConfig {
  /**
   * Name of the action associated with this review configuration.
   */
  actionName: string;
  /**
   * The decisions that are allowed for this request.
   */
  allowedDecisions: DecisionType[];
  /**
   * JSON schema for the arguments associated with the action, if edits are allowed.
   */
  argsSchema?: Record<string, any>;
}
/**
 * Request for human feedback on a sequence of actions requested by a model.
 *
 * @example
 * ```ts
 * const hitlRequest: HITLRequest = {
 *   actionRequests: [
 *     { name: "send_email", args: { to: "user@example.com", subject: "Hello" } }
 *   ],
 *   reviewConfigs: [
 *     {
 *       actionName: "send_email",
 *       allowedDecisions: ["approve", "edit", "reject"],
 *       description: "Please review the email before sending"
 *     }
 *   ]
 * };
 * const response = interrupt(hitlRequest);
 * ```
 */
interface HITLRequest {
  /**
   * A list of agent actions for human review.
   */
  actionRequests: ActionRequest[];
  /**
   * Review configuration for all possible actions.
   */
  reviewConfigs: ReviewConfig[];
}
/**
 * Response when a human approves the action.
 */
interface ApproveDecision {
  type: "approve";
}
/**
 * Response when a human edits the action.
 */
interface EditDecision {
  type: "edit";
  /**
   * Edited action for the agent to perform.
   * Ex: for a tool call, a human reviewer can edit the tool name and args.
   */
  editedAction: Action;
}
/**
 * Response when a human rejects the action.
 */
interface RejectDecision {
  type: "reject";
  /**
   * The message sent to the model explaining why the action was rejected.
   */
  message?: string;
}
/**
 * Union of all possible decision types.
 */
type Decision = ApproveDecision | EditDecision | RejectDecision;
/**
 * Response payload for a HITLRequest.
 */
interface HITLResponse {
  /**
   * The decisions made by the human.
   */
  decisions: Decision[];
}
declare const contextSchema: z.ZodObject<{
  /**
   * Mapping of tool name to allowed reviewer responses.
   * If a tool doesn't have an entry, it's auto-approved by default.
   *
   * - `true` -> pause for approval and allow approve/edit/reject decisions
   * - `false` -> auto-approve (no human review)
   * - `InterruptOnConfig` -> explicitly specify which decisions are allowed for this tool
   */
  interruptOn: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodBoolean, z.ZodObject<{
    /**
     * The decisions that are allowed for this action.
     */
    allowedDecisions: z.ZodArray<z.ZodEnum<["approve", "edit", "reject"]>, "many">;
    /**
     * The description attached to the request for human input.
     * Can be either:
     * - A static string describing the approval request
     * - A callable that dynamically generates the description based on agent state,
     *   runtime, and tool call information
     *
     * @example
     * Static string description
     * ```typescript
     * import type { InterruptOnConfig } from "langchain";
     *
     * const config: InterruptOnConfig = {
     *   allowedDecisions: ["approve", "reject"],
     *   description: "Please review this tool execution"
     * };
     * ```
     *
     * @example
     * Dynamic callable description
     * ```typescript
     * import type {
     *   AgentBuiltInState,
     *   Runtime,
     *   DescriptionFactory,
     *   ToolCall,
     *   InterruptOnConfig
     * } from "langchain";
     *
     * const formatToolDescription: DescriptionFactory = (
     *   toolCall: ToolCall,
     *   state: AgentBuiltInState,
     *   runtime: Runtime<unknown>
     * ) => {
     *   return `Tool: ${toolCall.name}\nArguments:\n${JSON.stringify(toolCall.args, null, 2)}`;
     * };
     *
     * const config: InterruptOnConfig = {
     *   allowedDecisions: ["approve", "edit"],
     *   description: formatToolDescription
     * };
     * ```
     */
    description: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodFunction<z.ZodTuple<[z.ZodType<ToolCall<string, Record<string, any>>, z.ZodTypeDef, ToolCall<string, Record<string, any>>>, z.ZodType<AgentBuiltInState, z.ZodTypeDef, AgentBuiltInState>, z.ZodType<Runtime<unknown>, z.ZodTypeDef, Runtime<unknown>>], z.ZodUnknown>, z.ZodUnion<[z.ZodString, z.ZodPromise<z.ZodString>]>>]>>;
    /**
     * JSON schema for the arguments associated with the action, if edits are allowed.
     */
    argsSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  }, "strip", z.ZodTypeAny, {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }, {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }>]>>>;
  /**
   * Prefix used when constructing human-facing approval messages.
   * Provides context about the tool call being reviewed; does not change the underlying action.
   *
   * Note: This prefix is only applied for tools that do not provide a custom
   * `description` via their {@link InterruptOnConfig}. If a tool specifies a custom
   * `description`, that per-tool text is used and this prefix is ignored.
   */
  descriptionPrefix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  interruptOn?: Record<string, boolean | {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }> | undefined;
  descriptionPrefix: string;
}, {
  interruptOn?: Record<string, boolean | {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }> | undefined;
  descriptionPrefix?: string | undefined;
}>;
type HumanInTheLoopMiddlewareConfig = InferInteropZodInput<typeof contextSchema>;
/**
 * Creates a Human-in-the-Loop (HITL) middleware for tool approval and oversight.
 *
 * This middleware intercepts tool calls made by an AI agent and provides human oversight
 * capabilities before execution. It enables selective approval workflows where certain tools
 * require human intervention while others can execute automatically.
 *
 * A invocation result that has been interrupted by the middleware will have a `__interrupt__`
 * property that contains the interrupt request.
 *
 * ```ts
 * import { type HITLRequest, type HITLResponse } from "langchain";
 * import { type Interrupt } from "langchain";
 *
 * const result = await agent.invoke(request);
 * const interruptRequest = result.__interrupt__?.[0] as Interrupt<HITLRequest>;
 *
 * // Examine the action requests and review configs
 * const actionRequests = interruptRequest.value.actionRequests;
 * const reviewConfigs = interruptRequest.value.reviewConfigs;
 *
 * // Create decisions for each action
 * const resume: HITLResponse = {
 *   decisions: actionRequests.map((action, i) => {
 *     if (action.name === "calculator") {
 *       return { type: "approve" };
 *     } else if (action.name === "write_file") {
 *       return {
 *         type: "edit",
 *         editedAction: { name: "write_file", args: { filename: "safe.txt", content: "Safe content" } }
 *       };
 *     }
 *     return { type: "reject", message: "Action not allowed" };
 *   })
 * };
 *
 * // Resume with decisions
 * await agent.invoke(new Command({ resume }), config);
 * ```
 *
 * ## Features
 *
 * - **Selective Tool Approval**: Configure which tools require human approval
 * - **Multiple Decision Types**: Approve, edit, or reject tool calls
 * - **Asynchronous Workflow**: Uses LangGraph's interrupt mechanism for non-blocking approval
 * - **Custom Approval Messages**: Provide context-specific descriptions for approval requests
 *
 * ## Decision Types
 *
 * When a tool requires approval, the human operator can respond with:
 * - `approve`: Execute the tool with original arguments
 * - `edit`: Modify the tool name and/or arguments before execution
 * - `reject`: Provide a manual response instead of executing the tool
 *
 * @param options - Configuration options for the middleware
 * @param options.interruptOn - Per-tool configuration mapping tool names to their settings
 * @param options.interruptOn[toolName].allowedDecisions - Array of decision types allowed for this tool (e.g., ["approve", "edit", "reject"])
 * @param options.interruptOn[toolName].description - Custom approval message for the tool. Can be either a static string or a callable that dynamically generates the description based on agent state, runtime, and tool call information
 * @param options.interruptOn[toolName].argsSchema - JSON schema for the arguments associated with the action, if edits are allowed
 * @param options.descriptionPrefix - Default prefix for approval messages (default: "Tool execution requires approval"). Only used for tools that do not define a custom `description` in their InterruptOnConfig.
 *
 * @returns A middleware instance that can be passed to `createAgent`
 *
 * @example
 * Basic usage with selective tool approval
 * ```typescript
 * import { humanInTheLoopMiddleware } from "langchain";
 * import { createAgent } from "langchain";
 *
 * const hitlMiddleware = humanInTheLoopMiddleware({
 *   interruptOn: {
 *     // Interrupt write_file tool and allow edits or approvals
 *     "write_file": {
 *       allowedDecisions: ["approve", "edit"],
 *       description: "⚠️ File write operation requires approval"
 *     },
 *     // Auto-approve read_file tool
 *     "read_file": false
 *   }
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4",
 *   tools: [writeFileTool, readFileTool],
 *   middleware: [hitlMiddleware]
 * });
 * ```
 *
 * @example
 * Handling approval requests
 * ```typescript
 * import { type HITLRequest, type HITLResponse, type Interrupt } from "langchain";
 * import { Command } from "@langchain/langgraph";
 *
 * // Initial agent invocation
 * const result = await agent.invoke({
 *   messages: [new HumanMessage("Write 'Hello' to output.txt")]
 * }, config);
 *
 * // Check if agent is paused for approval
 * if (result.__interrupt__) {
 *   const interruptRequest = result.__interrupt__?.[0] as Interrupt<HITLRequest>;
 *
 *   // Show tool call details to user
 *   console.log("Actions:", interruptRequest.value.actionRequests);
 *   console.log("Review configs:", interruptRequest.value.reviewConfigs);
 *
 *   // Resume with approval
 *   const resume: HITLResponse = {
 *     decisions: [{ type: "approve" }]
 *   };
 *   await agent.invoke(
 *     new Command({ resume }),
 *     config
 *   );
 * }
 * ```
 *
 * @example
 * Different decision types
 * ```typescript
 * import { type HITLResponse } from "langchain";
 *
 * // Approve the tool call as-is
 * const resume: HITLResponse = {
 *   decisions: [{ type: "approve" }]
 * };
 *
 * // Edit the tool arguments
 * const resume: HITLResponse = {
 *   decisions: [{
 *     type: "edit",
 *     editedAction: { name: "write_file", args: { filename: "safe.txt", content: "Modified" } }
 *   }]
 * };
 *
 * // Reject with feedback
 * const resume: HITLResponse = {
 *   decisions: [{
 *     type: "reject",
 *     message: "File operation not allowed in demo mode"
 *   }]
 * };
 * ```
 *
 * @example
 * Production use case with database operations
 * ```typescript
 * const hitlMiddleware = humanInTheLoopMiddleware({
 *   interruptOn: {
 *     "execute_sql": {
 *       allowedDecisions: ["approve", "edit", "reject"],
 *       description: "🚨 SQL query requires DBA approval\nPlease review for safety and performance"
 *     },
 *     "read_schema": false,  // Reading metadata is safe
 *     "delete_records": {
 *       allowedDecisions: ["approve", "reject"],
 *       description: "⛔ DESTRUCTIVE OPERATION - Requires manager approval"
 *     }
 *   },
 *   descriptionPrefix: "Database operation pending approval"
 * });
 * ```
 *
 * @example
 * Using dynamic callable descriptions
 * ```typescript
 * import { type DescriptionFactory, type ToolCall } from "langchain";
 * import type { AgentBuiltInState, Runtime } from "langchain/agents";
 *
 * // Define a dynamic description factory
 * const formatToolDescription: DescriptionFactory = (
 *   toolCall: ToolCall,
 *   state: AgentBuiltInState,
 *   runtime: Runtime<unknown>
 * ) => {
 *   return `Tool: ${toolCall.name}\nArguments:\n${JSON.stringify(toolCall.args, null, 2)}`;
 * };
 *
 * const hitlMiddleware = humanInTheLoopMiddleware({
 *   interruptOn: {
 *     "write_file": {
 *       allowedDecisions: ["approve", "edit"],
 *       // Use dynamic description that can access tool call, state, and runtime
 *       description: formatToolDescription
 *     },
 *     // Or use an inline function
 *     "send_email": {
 *       allowedDecisions: ["approve", "reject"],
 *       description: (toolCall, state, runtime) => {
 *         const { to, subject } = toolCall.args;
 *         return `Email to ${to}\nSubject: ${subject}\n\nRequires approval before sending`;
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @remarks
 * - Tool calls are processed in the order they appear in the AI message
 * - Auto-approved tools execute immediately without interruption
 * - Multiple tools requiring approval are bundled into a single interrupt request
 * - The middleware operates in the `afterModel` phase, intercepting before tool execution
 * - Requires a checkpointer to maintain state across interruptions
 *
 * @see {@link createAgent} for agent creation
 * @see {@link Command} for resuming interrupted execution
 * @public
 */
declare function humanInTheLoopMiddleware(options: NonNullable<HumanInTheLoopMiddlewareConfig>): AgentMiddleware<undefined, z.ZodObject<{
  /**
   * Mapping of tool name to allowed reviewer responses.
   * If a tool doesn't have an entry, it's auto-approved by default.
   *
   * - `true` -> pause for approval and allow approve/edit/reject decisions
   * - `false` -> auto-approve (no human review)
   * - `InterruptOnConfig` -> explicitly specify which decisions are allowed for this tool
   */
  interruptOn: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodBoolean, z.ZodObject<{
    /**
     * The decisions that are allowed for this action.
     */
    allowedDecisions: z.ZodArray<z.ZodEnum<["approve", "edit", "reject"]>, "many">;
    /**
     * The description attached to the request for human input.
     * Can be either:
     * - A static string describing the approval request
     * - A callable that dynamically generates the description based on agent state,
     *   runtime, and tool call information
     *
     * @example
     * Static string description
     * ```typescript
     * import type { InterruptOnConfig } from "langchain";
     *
     * const config: InterruptOnConfig = {
     *   allowedDecisions: ["approve", "reject"],
     *   description: "Please review this tool execution"
     * };
     * ```
     *
     * @example
     * Dynamic callable description
     * ```typescript
     * import type {
     *   AgentBuiltInState,
     *   Runtime,
     *   DescriptionFactory,
     *   ToolCall,
     *   InterruptOnConfig
     * } from "langchain";
     *
     * const formatToolDescription: DescriptionFactory = (
     *   toolCall: ToolCall,
     *   state: AgentBuiltInState,
     *   runtime: Runtime<unknown>
     * ) => {
     *   return `Tool: ${toolCall.name}\nArguments:\n${JSON.stringify(toolCall.args, null, 2)}`;
     * };
     *
     * const config: InterruptOnConfig = {
     *   allowedDecisions: ["approve", "edit"],
     *   description: formatToolDescription
     * };
     * ```
     */
    description: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodFunction<z.ZodTuple<[z.ZodType<ToolCall<string, Record<string, any>>, z.ZodTypeDef, ToolCall<string, Record<string, any>>>, z.ZodType<AgentBuiltInState, z.ZodTypeDef, AgentBuiltInState>, z.ZodType<Runtime<unknown>, z.ZodTypeDef, Runtime<unknown>>], z.ZodUnknown>, z.ZodUnion<[z.ZodString, z.ZodPromise<z.ZodString>]>>]>>;
    /**
     * JSON schema for the arguments associated with the action, if edits are allowed.
     */
    argsSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  }, "strip", z.ZodTypeAny, {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }, {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }>]>>>;
  /**
   * Prefix used when constructing human-facing approval messages.
   * Provides context about the tool call being reviewed; does not change the underlying action.
   *
   * Note: This prefix is only applied for tools that do not provide a custom
   * `description` via their {@link InterruptOnConfig}. If a tool specifies a custom
   * `description`, that per-tool text is used and this prefix is ignored.
   */
  descriptionPrefix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  interruptOn?: Record<string, boolean | {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }> | undefined;
  descriptionPrefix: string;
}, {
  interruptOn?: Record<string, boolean | {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }> | undefined;
  descriptionPrefix?: string | undefined;
}>, {
  interruptOn?: Record<string, boolean | {
    allowedDecisions: ("approve" | "edit" | "reject")[];
    description?: string | ((args_0: ToolCall<string, Record<string, any>>, args_1: AgentBuiltInState, args_2: Runtime<unknown>, ...args: unknown[]) => string | Promise<string>) | undefined;
    argsSchema?: Record<string, any> | undefined;
  }> | undefined;
  descriptionPrefix: string;
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { Action, ActionRequest, ApproveDecision, Decision, DecisionType, DescriptionFactory, EditDecision, HITLRequest, HITLResponse, HumanInTheLoopMiddlewareConfig, InterruptOnConfig, RejectDecision, ReviewConfig, humanInTheLoopMiddleware };
//# sourceMappingURL=hitl.d.cts.map