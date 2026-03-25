import { PendingWrite } from "@langchain/langgraph-checkpoint";

//#region src/constants.d.ts
/** Special reserved node name denoting the start of a graph. */
declare const START = "__start__";
/** Special reserved node name denoting the end of a graph. */
declare const END = "__end__";
/** Special channel reserved for graph interrupts */
declare const INTERRUPT = "__interrupt__";
/** Special channel reserved for graph resume */

/** Special channel reserved for graph previous state */
declare const PREVIOUS = "__previous__";
/** @internal */
declare const COMMAND_SYMBOL: unique symbol;
/**
 * Instance of a {@link Command} class.
 *
 * This is used to avoid IntelliSense suggesting public fields
 * of {@link Command} class when a plain object is expected.
 *
 * @see {@link Command}
 * @internal
 */
declare class CommandInstance<Resume = unknown, Update extends Record<string, unknown> = Record<string, unknown>, Nodes extends string = string> {
  [COMMAND_SYMBOL]: CommandParams<Resume, Update, Nodes>;
  constructor(args: CommandParams<Resume, Update, Nodes>);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SendInterface<Node extends string = string, Args = any> {
  node: Node;
  args: Args;
}
/**
 *
 * A message or packet to send to a specific node in the graph.
 *
 * The `Send` class is used within a `StateGraph`'s conditional edges to
 * dynamically invoke a node with a custom state at the next step.
 *
 * Importantly, the sent state can differ from the core graph's state,
 * allowing for flexible and dynamic workflow management.
 *
 * One such example is a "map-reduce" workflow where your graph invokes
 * the same node multiple times in parallel with different states,
 * before aggregating the results back into the main graph's state.
 *
 * @example
 * ```typescript
 * import { Annotation, Send, StateGraph } from "@langchain/langgraph";
 *
 * const ChainState = Annotation.Root({
 *   subjects: Annotation<string[]>,
 *   jokes: Annotation<string[]>({
 *     reducer: (a, b) => a.concat(b),
 *   }),
 * });
 *
 * const continueToJokes = async (state: typeof ChainState.State) => {
 *   return state.subjects.map((subject) => {
 *     return new Send("generate_joke", { subjects: [subject] });
 *   });
 * };
 *
 * const graph = new StateGraph(ChainState)
 *   .addNode("generate_joke", (state) => ({
 *     jokes: [`Joke about ${state.subjects}`],
 *   }))
 *   .addConditionalEdges("__start__", continueToJokes)
 *   .addEdge("generate_joke", "__end__")
 *   .compile();
 *
 * const res = await graph.invoke({ subjects: ["cats", "dogs"] });
 * console.log(res);
 *
 * // Invoking with two subjects results in a generated joke for each
 * // { subjects: ["cats", "dogs"], jokes: [`Joke about cats`, `Joke about dogs`] }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class Send<Node extends string = string, Args = any> implements SendInterface<Node, Args> {
  lg_name: string;
  node: Node;
  args: Args;
  constructor(node: Node, args: Args);
  toJSON(): {
    lg_name: string;
    node: Node;
    args: Args;
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Interrupt<Value = any> = {
  id?: string;
  value?: Value;
};
/**
 * Checks if the given graph invoke / stream chunk contains interrupt.
 *
 * @example
 * ```ts
 * import { INTERRUPT, isInterrupted } from "@langchain/langgraph";
 *
 * const values = await graph.invoke({ foo: "bar" });
 * if (isInterrupted<string>(values)) {
 *   const interrupt = values[INTERRUPT][0].value;
 * }
 * ```
 *
 * @param values - The values to check.
 * @returns `true` if the values contain an interrupt, `false` otherwise.
 */
declare function isInterrupted<Value = unknown>(values: unknown): values is {
  [INTERRUPT]: Interrupt<Value>[];
};
type CommandParams<Resume = unknown, Update extends Record<string, unknown> = Record<string, unknown>, Nodes extends string = string> = {
  /**
   * A discriminator field used to identify the type of object. Must be populated when serializing.
   *
   * Optional because it's not required to specify this when directly constructing a {@link Command}
   * object.
   */
  lg_name?: "Command";
  /**
   * Value to resume execution with. To be used together with {@link interrupt}.
   */
  resume?: Resume;
  /**
   * Graph to send the command to. Supported values are:
   *   - None: the current graph (default)
   *   - The specific name of the graph to send the command to
   *   - {@link Command.PARENT}: closest parent graph (only supported when returned from a node in a subgraph)
   */
  graph?: string;
  /**
   * Update to apply to the graph's state.
   */
  update?: Update | [string, unknown][];
  /**
   * Can be one of the following:
   *   - name of the node to navigate to next (any node that belongs to the specified `graph`)
   *   - sequence of node names to navigate to next
   *   - `Send` object (to execute a node with the input provided)
   *   - sequence of `Send` objects
   */
  goto?: Nodes | SendInterface<Nodes> // eslint-disable-line @typescript-eslint/no-explicit-any
  | (Nodes | SendInterface<Nodes>)[]; // eslint-disable-line @typescript-eslint/no-explicit-any
};
/**
 * One or more commands to update the graph's state and send messages to nodes.
 * Can be used to combine routing logic with state updates in lieu of conditional edges
 *
 * @example
 * ```ts
 * import { Annotation, Command } from "@langchain/langgraph";
 *
 * // Define graph state
 * const StateAnnotation = Annotation.Root({
 *   foo: Annotation<string>,
 * });
 *
 * // Define the nodes
 * const nodeA = async (_state: typeof StateAnnotation.State) => {
 *   console.log("Called A");
 *   // this is a replacement for a real conditional edge function
 *   const goto = Math.random() > .5 ? "nodeB" : "nodeC";
 *   // note how Command allows you to BOTH update the graph state AND route to the next node
 *   return new Command({
 *     // this is the state update
 *     update: {
 *       foo: "a",
 *     },
 *     // this is a replacement for an edge
 *     goto,
 *   });
 * };
 *
 * // Nodes B and C are unchanged
 * const nodeB = async (state: typeof StateAnnotation.State) => {
 *   console.log("Called B");
 *   return {
 *     foo: state.foo + "|b",
 *   };
 * }
 *
 * const nodeC = async (state: typeof StateAnnotation.State) => {
 *   console.log("Called C");
 *   return {
 *     foo: state.foo + "|c",
 *   };
 * }
 *
 * import { StateGraph } from "@langchain/langgraph";

 * // NOTE: there are no edges between nodes A, B and C!
 * const graph = new StateGraph(StateAnnotation)
 *   .addNode("nodeA", nodeA, {
 *     ends: ["nodeB", "nodeC"],
 *   })
 *   .addNode("nodeB", nodeB)
 *   .addNode("nodeC", nodeC)
 *   .addEdge("__start__", "nodeA")
 *   .compile();
 *
 * await graph.invoke({ foo: "" });
 *
 * // Randomly oscillates between
 * // { foo: 'a|c' } and { foo: 'a|b' }
 * ```
 */
declare class Command<Resume = unknown, Update extends Record<string, unknown> = Record<string, unknown>, Nodes extends string = string> extends CommandInstance<Resume, Update, Nodes> {
  readonly lg_name: string;
  lc_direct_tool_output: boolean;
  /**
   * Graph to send the command to. Supported values are:
   *   - None: the current graph (default)
   *   - The specific name of the graph to send the command to
   *   - {@link Command.PARENT}: closest parent graph (only supported when returned from a node in a subgraph)
   */
  graph?: string;
  /**
   * Update to apply to the graph's state as a result of executing the node that is returning the command.
   * Written to the state as if the node had simply returned this value instead of the Command object.
   */
  update?: Update | [string, unknown][];
  /**
   * Value to resume execution with. To be used together with {@link interrupt}.
   */
  resume?: Resume;
  /**
   * Can be one of the following:
   *   - name of the node to navigate to next (any node that belongs to the specified `graph`)
   *   - sequence of node names to navigate to next
   *   - {@link Send} object (to execute a node with the exact input provided in the {@link Send} object)
   *   - sequence of {@link Send} objects
   */
  goto?: Nodes | Send<Nodes> | (Nodes | Send<Nodes>)[];
  static PARENT: string;
  constructor(args: Omit<CommandParams<Resume, Update, Nodes>, "lg_name">);
  /**
   * Convert the update field to a list of {@link PendingWrite} tuples
   * @returns List of {@link PendingWrite} tuples of the form `[channelKey, value]`.
   * @internal
   */
  _updateAsTuples(): PendingWrite[];
  toJSON(): {
    lg_name: string;
    update: Update | [string, unknown][] | undefined;
    resume: Resume | undefined;
    goto: Nodes | (Nodes | {
      lg_name: string;
      node: Nodes;
      args: any;
    })[] | {
      lg_name: string;
      node: Nodes;
      args: any;
    } | undefined;
  };
}
/**
 * A type guard to check if the given value is a {@link Command}.
 *
 * Useful for type narrowing when working with the {@link Command} object.
 *
 * @param x - The value to check.
 * @returns `true` if the value is a {@link Command}, `false` otherwise.
 */
declare function isCommand(x: unknown): x is Command;
/**
 * Reconstructs Command and Send objects from a deeply nested tree of anonymous objects
 * matching their interfaces.
 *
 * This is only exported for testing purposes. It is NOT intended to be used outside of
 * the Command and Send classes.
 *
 * @internal
 *
 * @param x - The command send tree to convert.
 * @param seen - A map of seen objects to avoid infinite loops.
 * @returns The converted command send tree.
 */
//#endregion
export { Command, CommandInstance, CommandParams, END, INTERRUPT, Interrupt, PREVIOUS, START, Send, isCommand, isInterrupted };
//# sourceMappingURL=constants.d.cts.map