import { DefaultToolCall } from "../../types.messages.js";
import { BagTemplate } from "../../types.template.js";
import { AgentTypeConfigLike, DeepAgentTypeConfigLike, DefaultSubagentStates, InferAgentState, InferAgentToolCalls, SubagentStateMap, UseStreamOptions } from "../types.js";
import { BaseStream } from "./base.js";
import { UseAgentStream, UseAgentStreamOptions } from "./agent.js";
import { UseDeepAgentStream, UseDeepAgentStreamOptions } from "./deep-agent.js";

//#region src/ui/stream/index.d.ts
/**
 * Check if a type is a DeepAgent (has `~deepAgentTypes` phantom property).
 */
type IsDeepAgent<T> = T extends {
  "~deepAgentTypes": DeepAgentTypeConfigLike;
} ? true : false;
/**
 * Check if a type is a ReactAgent (has `~agentTypes` but not `~deepAgentTypes`).
 */
type IsReactAgent<T> = T extends {
  "~agentTypes": AgentTypeConfigLike;
} ? T extends {
  "~deepAgentTypes": unknown;
} ? false : true : false;
/**
 * Infer the state type from an agent, graph, or direct state type.
 *
 * Detection order:
 * 1. Agent-like (`~agentTypes`) → InferAgentState
 * 2. CompiledGraph (`~RunOutput`) → Extract RunOutput
 * 3. Pregel (`~OutputType`) → Extract OutputType
 * 4. Direct state type → Return as-is
 */
type InferStateType<T> = T extends {
  "~agentTypes": unknown;
} ? InferAgentState<T> : T extends {
  "~RunOutput": infer S;
} ? S extends Record<string, unknown> ? S : Record<string, unknown> : T extends {
  "~OutputType": infer O;
} ? O extends Record<string, unknown> ? O : Record<string, unknown> : T extends Record<string, unknown> ? T : Record<string, unknown>;
/**
 * Infer the node names from a compiled graph.
 *
 * Extracts the `~NodeType` phantom property from CompiledGraph instances,
 * providing a union of all node names defined in the graph.
 *
 * @example
 * ```typescript
 * const graph = new StateGraph(StateAnnotation)
 *   .addNode("agent", agentFn)
 *   .addNode("tool", toolFn)
 *   .compile();
 *
 * type NodeNames = InferNodeNames<typeof graph>; // "agent" | "tool"
 * ```
 */
type InferNodeNames<T> = T extends {
  "~NodeType": infer N;
} ? N extends string ? Exclude<N, "__start__"> : string : string;
/**
 * Infer the per-node return types from a compiled graph.
 *
 * Extracts the `~NodeReturnType` phantom property from CompiledGraph instances,
 * which is a mapped type of `{ [nodeName]: ReturnType }` for each node.
 *
 * @example
 * ```typescript
 * const graph = new StateGraph(StateAnnotation)
 *   .addNode("dispatcher", async () => ({ topic: "foo" }))
 *   .addNode("researcher", async () => ({ research: "bar" }))
 *   .compile();
 *
 * type NodeReturns = InferNodeReturnTypes<typeof graph>;
 * // { dispatcher: { topic: string }; researcher: { research: string } }
 * ```
 */
type InferNodeReturnTypes<T> = T extends {
  "~NodeReturnType": infer R;
} ? R extends Record<string, unknown> ? R : Record<string, Record<string, unknown>> : Record<string, Record<string, unknown>>;
/**
 * Infer tool call types from an agent.
 *
 * For agents, extracts typed tool calls from the agent's tools.
 * For non-agents, returns DefaultToolCall.
 */
type InferToolCalls<T> = T extends {
  "~agentTypes": unknown;
} ? InferAgentToolCalls<T> : DefaultToolCall;
/**
 * Infer subagent state map from a DeepAgent.
 *
 * For DeepAgent, creates a map of subagent names to their state types.
 * For non-DeepAgent, returns DefaultSubagentStates.
 */
type InferSubagentStates<T> = T extends {
  "~deepAgentTypes": unknown;
} ? SubagentStateMap<T, InferAgentToolCalls<T>> : DefaultSubagentStates;
/**
 * Resolves the appropriate stream interface based on the agent/graph type.
 *
 * This type automatically selects the correct stream interface based on
 * the type of agent or graph passed to `useStream`:
 *
 * 1. **DeepAgent** (`~deepAgentTypes`) → {@link UseDeepAgentStream}
 *    - Includes: values, messages, toolCalls, subagents, getSubagentsByType, getSubagentsByMessage
 *
 * 2. **ReactAgent** (`~agentTypes`) → {@link UseAgentStream}
 *    - Includes: values, messages, toolCalls, getToolCalls
 *    - Excludes: subagents, getSubagentsByType
 *
 * 3. **CompiledGraph** / **Default** → {@link BaseStream}
 *    - Includes: values, messages, submit, stop
 *    - Does NOT include: toolCalls, subagents (not applicable to raw graphs)
 *
 * @template T - The agent or graph type (use `typeof agent` or `typeof graph`)
 * @template Bag - Type configuration bag for interrupts, configurable, etc.
 *
 * @example
 * ```typescript
 * // Automatic detection based on agent type
 * type GraphStream = ResolveStreamInterface<typeof compiledGraph, BagTemplate>;
 * // → UseGraphStream (with typed node names)
 *
 * type AgentStream = ResolveStreamInterface<typeof reactAgent, BagTemplate>;
 * // → UseAgentStream (has toolCalls)
 *
 * type DeepStream = ResolveStreamInterface<typeof deepAgent, BagTemplate>;
 * // → UseDeepAgentStream (has toolCalls AND subagents)
 * ```
 */
type ResolveStreamInterface<T, Bag extends BagTemplate = BagTemplate> = IsDeepAgent<T> extends true ? UseDeepAgentStream<InferStateType<T>, InferToolCalls<T>, InferSubagentStates<T>, Bag> : IsReactAgent<T> extends true ? UseAgentStream<InferStateType<T>, InferToolCalls<T>, Bag> : BaseStream<InferStateType<T>, InferToolCalls<T>, Bag>;
/**
 * Resolves the appropriate options interface based on the agent/graph type.
 *
 * This type automatically selects the correct options interface based on
 * the type of agent or graph:
 *
 * 1. **DeepAgent** → {@link UseDeepAgentStreamOptions}
 *    - Includes: `filterSubagentMessages` option
 *
 * 2. **ReactAgent** → {@link UseAgentStreamOptions}
 *
 * 3. **CompiledGraph** / **Default** → {@link UseGraphStreamOptions}
 *
 * @template T - The agent or graph type
 * @template Bag - Type configuration bag
 *
 * @example
 * ```typescript
 * // Only DeepAgent options include filterSubagentMessages
 * type DeepOptions = ResolveStreamOptions<typeof deepAgent, BagTemplate>;
 * // DeepOptions.filterSubagentMessages exists
 *
 * type AgentOptions = ResolveStreamOptions<typeof reactAgent, BagTemplate>;
 * // AgentOptions.filterSubagentMessages does NOT exist
 * ```
 */
type ResolveStreamOptions<T, Bag extends BagTemplate = BagTemplate> = IsDeepAgent<T> extends true ? UseDeepAgentStreamOptions<InferStateType<T>, Bag> : IsReactAgent<T> extends true ? UseAgentStreamOptions<InferStateType<T>, Bag> : UseStreamOptions<InferStateType<T>, Bag>;
/**
 * Infer the Bag type from an agent, defaulting to the provided Bag.
 *
 * Currently returns the provided Bag for all types.
 * Can be extended in the future to extract Bag from agent types.
 */
type InferBag<T, B extends BagTemplate = BagTemplate> = T extends {
  "~agentTypes": unknown;
} ? BagTemplate : B;
//#endregion
export { InferBag, InferNodeNames, InferNodeReturnTypes, InferStateType, InferSubagentStates, InferToolCalls, ResolveStreamInterface, ResolveStreamOptions };
//# sourceMappingURL=index.d.ts.map