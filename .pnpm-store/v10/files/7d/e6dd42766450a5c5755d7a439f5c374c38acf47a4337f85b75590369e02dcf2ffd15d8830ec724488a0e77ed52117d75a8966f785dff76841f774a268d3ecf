import { DefaultToolCall, Message } from "../types.messages.js";
import { SubagentStreamInterface } from "./types.js";
import { BaseMessage } from "@langchain/core/messages";

//#region src/ui/subagents.d.ts
/**
 * Checks if a namespace indicates a subagent/subgraph message.
 *
 * Subagent namespaces contain a "tools:" segment indicating they
 * originate from a tool call that spawned a subgraph.
 *
 * @param namespace - The namespace array from stream events (or checkpoint_ns string)
 * @returns True if this is a subagent namespace
 */
declare function isSubagentNamespace(namespace: string[] | string | undefined): boolean;
/**
 * Extracts the tool call ID from a namespace path.
 *
 * Namespaces follow the pattern: ["tools:call_abc123", "model_request:xyz", ...]
 * This function extracts "call_abc123" from the first "tools:" segment.
 *
 * @param namespace - The namespace array from stream events
 * @returns The tool call ID, or undefined if not found
 */
declare function extractToolCallIdFromNamespace(namespace: string[] | undefined): string | undefined;
/**
 * Calculates the depth of a subagent based on its namespace.
 * Counts the number of "tools:" segments in the namespace.
 *
 * @param namespace - The namespace array
 * @returns The depth (0 for main agent, 1+ for subagents)
 */
declare function calculateDepthFromNamespace(namespace: string[] | undefined): number;
/**
 * Extracts the parent tool call ID from a namespace.
 *
 * For nested subagents, the namespace looks like:
 * ["tools:parent_id", "tools:child_id", ...]
 *
 * @param namespace - The namespace array
 * @returns The parent tool call ID, or null if this is a top-level subagent
 */
declare function extractParentIdFromNamespace(namespace: string[] | undefined): string | null;
/**
 * Options for SubagentManager.
 */
interface SubagentManagerOptions {
  /**
   * Tool names that indicate subagent invocation.
   * Defaults to ["task"].
   */
  subagentToolNames?: string[];
  /**
   * Callback when subagent state changes.
   */
  onSubagentChange?: () => void;
  /**
   * Converts a @langchain/core BaseMessage to the desired output format.
   * Defaults to `toMessageDict` which produces plain Message objects.
   */
  toMessage?: (chunk: BaseMessage) => Message | BaseMessage;
}
/**
 * Manages subagent execution state.
 *
 * Tracks subagents from the moment they are invoked (AI message with tool calls)
 * through streaming to completion (tool message result).
 */
declare class SubagentManager<ToolCall = DefaultToolCall> {
  private subagents;
  /**
   * Maps namespace IDs (pregel task IDs) to tool call IDs.
   * LangGraph subgraphs use internal pregel task IDs in their namespace,
   * which are different from the tool_call_id used to invoke them.
   */
  private namespaceToToolCallId;
  /**
   * Pending namespace matches that couldn't be resolved immediately.
   * These are retried when new tool calls are registered.
   */
  private pendingMatches;
  /**
   * Message managers for each subagent.
   * Uses the same MessageTupleManager as the main stream for proper
   * message chunk concatenation.
   */
  private messageManagers;
  private subagentToolNames;
  private onSubagentChange?;
  private toMessage;
  constructor(options?: SubagentManagerOptions);
  /**
   * Get or create a MessageTupleManager for a subagent.
   */
  private getMessageManager;
  /**
   * Get messages for a subagent with proper chunk concatenation.
   * This mirrors how the main stream handles messages.
   */
  private getMessagesForSubagent;
  /**
   * Create a complete SubagentStream object with all derived properties.
   * This ensures consistency with UseStream interface.
   */
  private createSubagentStream;
  /**
   * Get the tool call ID for a given namespace ID.
   * Returns the namespace ID itself if no mapping exists.
   */
  getToolCallIdFromNamespace(namespaceId: string): string;
  /**
   * Try to match a subgraph to a pending subagent by description.
   * Creates a mapping from namespace ID to tool call ID if a match is found.
   *
   * Uses a multi-pass matching strategy:
   * 1. Exact description match
   * 2. Description contains/partial match
   * 3. Any unmapped pending subagent (fallback)
   *
   * @param namespaceId - The namespace ID (pregel task ID) from the subgraph
   * @param description - The description from the subgraph's initial message
   * @returns The matched tool call ID, or undefined if no match
   */
  matchSubgraphToSubagent(namespaceId: string, description: string): string | undefined;
  /**
   * Check if a tool call is a subagent invocation.
   */
  isSubagentToolCall(toolName: string): boolean;
  /**
   * Check if a subagent_type value is valid.
   * Valid types are proper identifiers like "weather-scout", "experience-curator".
   */
  private isValidSubagentType;
  /**
   * Check if a subagent should be shown to the user.
   * Subagents are only shown once they've actually started running.
   *
   * This filters out:
   * - Pending subagents that haven't been matched to a namespace yet
   * - Streaming artifacts with partial/corrupted data
   *
   * The idea is: we register subagents internally when we see tool calls,
   * but we only show them to the user once LangGraph confirms they're
   * actually executing (via namespace events).
   */
  private isValidSubagent;
  /**
   * Build a complete SubagentStream from internal state.
   * Adds messages and derived properties.
   */
  private buildExecution;
  /**
   * Get all subagents as a Map.
   * Filters out incomplete/phantom subagents that lack subagent_type.
   */
  getSubagents(): Map<string, SubagentStreamInterface<Record<string, unknown>, ToolCall>>;
  /**
   * Get all currently running subagents.
   * Filters out incomplete/phantom subagents.
   */
  getActiveSubagents(): SubagentStreamInterface<Record<string, unknown>, ToolCall>[];
  /**
   * Get a specific subagent by tool call ID.
   */
  getSubagent(toolCallId: string): SubagentStreamInterface<Record<string, unknown>, ToolCall> | undefined;
  /**
   * Get all subagents of a specific type.
   */
  getSubagentsByType(type: string): SubagentStreamInterface<Record<string, unknown>, ToolCall>[];
  /**
   * Get all subagents triggered by a specific AI message.
   *
   * @param messageId - The ID of the AI message.
   * @returns Array of subagent streams triggered by that message.
   */
  getSubagentsByMessage(messageId: string): SubagentStreamInterface<Record<string, unknown>, ToolCall>[];
  /**
   * Parse tool call args, handling both object and string formats.
   * During streaming, args might come as a string that needs parsing.
   */
  private parseArgs;
  /**
   * Register new subagent(s) from AI message tool calls.
   *
   * Called when an AI message is received with tool calls.
   * Creates pending subagent entries for each subagent tool call.
   *
   * @param toolCalls - The tool calls from an AI message
   * @param aiMessageId - The ID of the AI message that triggered the tool calls
   */
  registerFromToolCalls(toolCalls: Array<{
    id?: string;
    name: string;
    args: Record<string, unknown> | string;
  }>, aiMessageId?: string | null): void;
  /**
   * Retry matching pending namespaces to newly registered tool calls.
   */
  private retryPendingMatches;
  /**
   * Mark a subagent as running and update its namespace.
   *
   * Called when update events are received with a namespace indicating
   * which subagent is streaming.
   *
   * @param toolCallId - The tool call ID of the subagent
   * @param options - Additional update options
   */
  markRunning(toolCallId: string, options?: {
    namespace?: string[];
  }): void;
  /**
   * Mark a subagent as running using a namespace ID.
   * Resolves the namespace ID to the actual tool call ID via the mapping.
   *
   * @param namespaceId - The namespace ID (pregel task ID) from the subgraph
   * @param namespace - The full namespace array
   */
  markRunningFromNamespace(namespaceId: string, namespace?: string[]): void;
  /**
   * Add a serialized message to a subagent from stream events.
   *
   * This method handles the raw serialized message data from SSE events.
   * Uses MessageTupleManager for proper chunk concatenation, matching
   * how the main stream handles messages.
   *
   * @param namespaceId - The namespace ID (pregel task ID) from the stream
   * @param serialized - The serialized message from the stream
   * @param metadata - Optional metadata from the stream event
   */
  addMessageToSubagent(namespaceId: string, serialized: Message<DefaultToolCall>, metadata?: Record<string, unknown>): void;
  /**
   * Update subagent values from a values stream event.
   *
   * Called when a values event is received from a subagent's namespace.
   * This populates the subagent's state values, making them accessible
   * via the `values` property.
   *
   * @param namespaceId - The namespace ID (pregel task ID) from the stream
   * @param values - The state values from the stream event
   */
  updateSubagentValues(namespaceId: string, values: Record<string, unknown>): void;
  /**
   * Complete a subagent with a result.
   *
   * Called when a tool message is received for the subagent.
   *
   * @param toolCallId - The tool call ID of the subagent
   * @param result - The result content
   * @param status - The final status (complete or error)
   */
  complete(toolCallId: string, result: string, status?: "complete" | "error"): void;
  /**
   * Clear all subagent state.
   */
  clear(): void;
  /**
   * Process a tool message to complete a subagent.
   *
   * @param toolCallId - The tool call ID from the tool message
   * @param content - The result content
   * @param status - Whether the tool execution was successful
   */
  processToolMessage(toolCallId: string, content: string, status?: "success" | "error"): void;
  /**
   * Reconstruct subagent state from historical messages.
   *
   * This method parses an array of messages (typically from thread history)
   * to identify subagent executions and their results. It's used to restore
   * subagent state after:
   * - Page refresh (when stream has already completed)
   * - Loading thread history
   * - Navigating between threads
   *
   * The reconstruction process:
   * 1. Find AI messages with tool calls matching subagent tool names
   * 2. Find corresponding tool messages with results
   * 3. Create SubagentStream entries with "complete" status
   *
   * Note: Internal subagent messages (their streaming conversation) are not
   * reconstructed since they are not persisted in the main thread state.
   *
   * @param messages - Array of messages from thread history
   * @param options - Optional configuration
   * @param options.skipIfPopulated - If true, skip reconstruction if subagents already exist
   */
  reconstructFromMessages(messages: Message<DefaultToolCall>[], options?: {
    skipIfPopulated?: boolean;
  }): void;
  /**
   * Update a reconstructed subagent's messages and values from its subgraph checkpoint state.
   *
   * This is called after fetching the subgraph's history to restore the internal
   * conversation that was lost on page refresh. Only updates if messages are
   * currently empty (does not overwrite live streaming data).
   *
   * @param toolCallId - The tool call ID identifying the subagent
   * @param messages - Messages from the subgraph's latest checkpoint
   * @param values - Full state values from the subgraph's latest checkpoint
   * @returns true if the subagent was updated, false otherwise
   */
  updateSubagentFromSubgraphState(toolCallId: string, messages: Message[], values?: Record<string, unknown>): boolean;
  /**
   * Check if any subagents are currently tracked.
   */
  hasSubagents(): boolean;
}
//#endregion
export { SubagentManager, calculateDepthFromNamespace, extractParentIdFromNamespace, extractToolCallIdFromNamespace, isSubagentNamespace };
//# sourceMappingURL=subagents.d.ts.map