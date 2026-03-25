import { DefaultToolCall } from "../../types.messages.js";
import { BagTemplate } from "../../types.template.js";
import { DefaultSubagentStates, SubagentStreamInterface } from "../types.js";
import { UseAgentStream, UseAgentStreamOptions } from "./agent.js";

//#region src/ui/stream/deep-agent.d.ts
/**
 * Stream interface for DeepAgent instances created with `createDeepAgent`.
 *
 * Extends {@link UseAgentStream} with subagent streaming capabilities. Subagent
 * streams are automatically typed based on the agent's subagent configuration,
 * enabling type-safe access to subagent state and messages.
 *
 * Use this interface when streaming from an agent created with `createDeepAgent`
 * that orchestrates multiple specialized subagents.
 *
 * @experimental This interface is subject to change.
 *
 * @template StateType - The agent's state type
 * @template ToolCall - Tool call type from agent's tools
 * @template SubagentStates - Map of subagent names to their state types
 * @template Bag - Type configuration bag
 *
 * @example
 * ```typescript
 * import { createDeepAgent } from "deepagents";
 * import { useStream } from "@langchain/langgraph-sdk/react";
 *
 * // Define subagents with typed middleware
 * const agent = createDeepAgent({
 *   subagents: [
 *     {
 *       name: "researcher",
 *       description: "Research specialist",
 *       middleware: [ResearchMiddleware],
 *     },
 *     {
 *       name: "writer",
 *       description: "Content writer",
 *       middleware: [WriterMiddleware],
 *     },
 *   ] as const, // Important: use 'as const' for type inference
 * });
 *
 * // In React component:
 * function Chat() {
 *   const stream = useStream<typeof agent>({
 *     assistantId: "deep-agent",
 *     apiUrl: "http://localhost:2024",
 *     filterSubagentMessages: true, // Only show main agent messages
 *   });
 *
 *   // Subagent streams are typed!
 *   const researchers = stream.getSubagentsByType("researcher");
 *   researchers.forEach(subagent => {
 *     // subagent.values.messages is typed as Message<ToolCall>[]
 *     // subagent.status is "pending" | "running" | "complete" | "error"
 *     console.log("Researcher status:", subagent.status);
 *   });
 *
 *   // Track all active subagents
 *   stream.activeSubagents.forEach(subagent => {
 *     console.log(`${subagent.toolCall.args.subagent_type} is running...`);
 *   });
 * }
 * ```
 *
 * @remarks
 * This interface adds subagent streaming on top of {@link UseAgentStream}:
 * - `subagents` - Map of all subagent streams by tool call ID
 * - `activeSubagents` - Array of currently running subagents
 * - `getSubagent(id)` - Get a specific subagent by tool call ID
 * - `getSubagentsByType(type)` - Get all subagents of a specific type with typed state
 * - `getSubagentsByMessage(messageId)` - Get all subagents triggered by a specific AI message
 *
 * It also enables the `filterSubagentMessages` option to exclude subagent
 * messages from the main `messages` array.
 */
interface UseDeepAgentStream<StateType extends Record<string, unknown> = Record<string, unknown>, ToolCall = DefaultToolCall, SubagentStates extends Record<string, unknown> = DefaultSubagentStates, Bag extends BagTemplate = BagTemplate> extends UseAgentStream<StateType, ToolCall, Bag> {
  /**
   * All currently active and completed subagent streams.
   *
   * Keyed by tool call ID for easy lookup. Includes subagents in all states:
   * pending, running, complete, and error.
   *
   * @example
   * ```typescript
   * // Iterate over all subagents
   * stream.subagents.forEach((subagent, toolCallId) => {
   *   console.log(`Subagent ${toolCallId}: ${subagent.status}`);
   * });
   *
   * // Get a specific subagent
   * const specific = stream.subagents.get("call_abc123");
   * ```
   */
  subagents: Map<string, SubagentStreamInterface<SubagentStates[keyof SubagentStates], ToolCall, keyof SubagentStates & string>>;
  /**
   * Currently active subagents (where status === "running").
   *
   * Use this to track and display subagents that are actively executing.
   * Completed or errored subagents are not included.
   *
   * @example
   * ```typescript
   * // Show loading indicators for active subagents
   * stream.activeSubagents.map(subagent => (
   *   <SubagentCard
   *     key={subagent.id}
   *     type={subagent.toolCall.args.subagent_type}
   *     isLoading={true}
   *   />
   * ));
   * ```
   */
  activeSubagents: SubagentStreamInterface<SubagentStates[keyof SubagentStates], ToolCall, keyof SubagentStates & string>[];
  /**
   * Get subagent stream by tool call ID.
   *
   * Use this when you have a specific tool call ID and need to access
   * its corresponding subagent stream.
   *
   * @param toolCallId - The tool call ID that initiated the subagent
   * @returns The subagent stream, or undefined if not found
   *
   * @example
   * ```typescript
   * // In a tool call component
   * const subagent = stream.getSubagent(toolCall.id);
   * if (subagent) {
   *   return <SubagentProgress subagent={subagent} />;
   * }
   * ```
   */
  getSubagent: (toolCallId: string) => SubagentStreamInterface<SubagentStates[keyof SubagentStates], ToolCall, keyof SubagentStates & string> | undefined;
  /**
   * Get all subagents of a specific type.
   *
   * Returns streams with properly inferred state types based on subagent name.
   * When called with a literal string that matches a subagent name, TypeScript
   * will infer the correct state type for that subagent.
   *
   * @param type - The subagent_type to filter by
   * @returns Array of matching subagent streams with inferred state types
   *
   * @example
   * ```typescript
   * // Get all researcher subagents with typed state
   * const researchers = stream.getSubagentsByType("researcher");
   *
   * researchers.forEach(researcher => {
   *   // researcher.values is typed based on ResearchMiddleware
   *   console.log("Research messages:", researcher.values.messages.length);
   *   console.log("Status:", researcher.status);
   * });
   *
   * // Get all writer subagents
   * const writers = stream.getSubagentsByType("writer");
   * // writers have different state type based on WriterMiddleware
   * ```
   */
  getSubagentsByType: {
    /**
     * Overload for known subagent names - returns typed streams.
     * TypeScript infers the state type from SubagentStates[TName].
     */
    <TName extends keyof SubagentStates & string>(type: TName): SubagentStreamInterface<SubagentStates[TName], ToolCall, TName>[];
    /**
     * Overload for unknown names - returns untyped streams.
     * Used when the subagent name is not known at compile time.
     */
    (type: string): SubagentStreamInterface<Record<string, unknown>, ToolCall>[];
  };
  /**
   * Get all subagents triggered by a specific AI message.
   *
   * Useful for rendering subagent activities grouped by conversation turn.
   * Each AI message that contains subagent tool calls will have its triggered
   * subagents returned by this method.
   *
   * @param messageId - The ID of the AI message that triggered the subagents
   * @returns Array of subagent streams triggered by that message
   *
   * @example
   * ```tsx
   * // Render subagents inline after the AI message that triggered them
   * {stream.messages.map((msg) => (
   *   <div key={msg.id}>
   *     <MessageBubble message={msg} />
   *     {msg.type === "ai" && "tool_calls" in msg && (
   *       <SubagentPipeline
   *         subagents={stream.getSubagentsByMessage(msg.id)}
   *       />
   *     )}
   *   </div>
   * ))}
   * ```
   */
  getSubagentsByMessage: (messageId: string) => SubagentStreamInterface<SubagentStates[keyof SubagentStates], ToolCall, keyof SubagentStates & string>[];
}
/**
 * Options for configuring a deep agent stream.
 *
 * Use this options interface when calling `useStream` with a DeepAgent
 * created via `createDeepAgent`. Includes all agent options plus
 * subagent-specific configuration.
 *
 * @template StateType - The agent's state type
 * @template Bag - Type configuration bag
 *
 * @example
 * ```typescript
 * const stream = useStream<typeof agent>({
 *   assistantId: "deep-agent",
 *   apiUrl: "http://localhost:2024",
 *
 *   // DeepAgent-specific options
 *   subagentToolNames: ["task", "delegate"],
 *   filterSubagentMessages: true,
 *
 *   onError: (error) => console.error(error),
 * });
 * ```
 */
interface UseDeepAgentStreamOptions<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> extends UseAgentStreamOptions<StateType, Bag> {
  /**
   * Tool names that indicate subagent invocation.
   *
   * When an AI message contains tool calls with these names, they are
   * automatically tracked as subagent executions. This enables the
   * `subagents`, `activeSubagents`, `getSubagent()`, `getSubagentsByType()`, and `getSubagentsByMessage()`
   * properties on the stream.
   *
   * @default ["task"]
   *
   * @example
   * ```typescript
   * const stream = useStream<typeof agent>({
   *   assistantId: "deep-agent",
   *   // Track both "task" and "delegate" as subagent tools
   *   subagentToolNames: ["task", "delegate", "spawn_agent"],
   * });
   *
   * // Now stream.subagents will include executions from any of these tools
   * ```
   */
  subagentToolNames?: string[];
  /**
   * Whether to filter out messages from subagent namespaces.
   *
   * When `true`, only messages from the main agent are included in
   * the `messages` array. Subagent messages are still accessible via
   * the `subagents` map and individual subagent streams.
   *
   * This is useful when you want to display subagent progress separately
   * from the main conversation, or when subagent messages would be too
   * verbose in the main message list.
   *
   * @default false
   *
   * @example
   * ```typescript
   * const stream = useStream<typeof agent>({
   *   assistantId: "deep-agent",
   *   filterSubagentMessages: true,
   * });
   *
   * // stream.messages only contains main agent messages
   * // Subagent messages are in stream.getSubagentsByType("researcher")[0].messages
   * ```
   */
  filterSubagentMessages?: boolean;
}
//#endregion
export { UseDeepAgentStream, UseDeepAgentStreamOptions };
//# sourceMappingURL=deep-agent.d.ts.map