
//#region src/constants.ts
/** Special reserved node name denoting the start of a graph. */
const START = "__start__";
/** Special reserved node name denoting the end of a graph. */
const END = "__end__";
const INPUT = "__input__";
const COPY = "__copy__";
const ERROR = "__error__";
/** Special reserved cache namespaces */
const CACHE_NS_WRITES = "__pregel_ns_writes";
const CONFIG_KEY_SEND = "__pregel_send";
/** config key containing function used to call a node (push task) */
const CONFIG_KEY_CALL = "__pregel_call";
const CONFIG_KEY_READ = "__pregel_read";
const CONFIG_KEY_CHECKPOINTER = "__pregel_checkpointer";
const CONFIG_KEY_RESUMING = "__pregel_resuming";
const CONFIG_KEY_TASK_ID = "__pregel_task_id";
const CONFIG_KEY_STREAM = "__pregel_stream";
const CONFIG_KEY_RESUME_VALUE = "__pregel_resume_value";
const CONFIG_KEY_RESUME_MAP = "__pregel_resume_map";
const CONFIG_KEY_SCRATCHPAD = "__pregel_scratchpad";
/** config key containing state from previous invocation of graph for the given thread */
const CONFIG_KEY_PREVIOUS_STATE = "__pregel_previous";
const CONFIG_KEY_DURABILITY = "__pregel_durability";
const CONFIG_KEY_CHECKPOINT_ID = "checkpoint_id";
const CONFIG_KEY_CHECKPOINT_NS = "checkpoint_ns";
const CONFIG_KEY_NODE_FINISHED = "__pregel_node_finished";
const CONFIG_KEY_CHECKPOINT_MAP = "checkpoint_map";
const CONFIG_KEY_ABORT_SIGNALS = "__pregel_abort_signals";
/** Special channel reserved for graph interrupts */
const INTERRUPT = "__interrupt__";
/** Special channel reserved for graph resume */
const RESUME = "__resume__";
/** Special channel reserved for cases when a task exits without any writes */
const NO_WRITES = "__no_writes__";
/** Special channel reserved for graph return */
const RETURN = "__return__";
/** Special channel reserved for graph previous state */
const PREVIOUS = "__previous__";
const TAG_HIDDEN = "langsmith:hidden";
const TAG_NOSTREAM = "langsmith:nostream";
const SELF = "__self__";
const TASKS = "__pregel_tasks";
const PUSH = "__pregel_push";
const PULL = "__pregel_pull";
const NULL_TASK_ID = "00000000-0000-0000-0000-000000000000";
const RESERVED = [
	TAG_HIDDEN,
	INPUT,
	INTERRUPT,
	RESUME,
	ERROR,
	NO_WRITES,
	CONFIG_KEY_SEND,
	CONFIG_KEY_READ,
	CONFIG_KEY_CHECKPOINTER,
	CONFIG_KEY_DURABILITY,
	CONFIG_KEY_STREAM,
	CONFIG_KEY_RESUMING,
	CONFIG_KEY_TASK_ID,
	CONFIG_KEY_CALL,
	CONFIG_KEY_RESUME_VALUE,
	CONFIG_KEY_SCRATCHPAD,
	CONFIG_KEY_PREVIOUS_STATE,
	CONFIG_KEY_CHECKPOINT_MAP,
	CONFIG_KEY_CHECKPOINT_NS,
	CONFIG_KEY_CHECKPOINT_ID
];
const CHECKPOINT_NAMESPACE_SEPARATOR = "|";
const CHECKPOINT_NAMESPACE_END = ":";
/** @internal */
const COMMAND_SYMBOL = Symbol.for("langgraph.command");
/**
* Instance of a {@link Command} class.
*
* This is used to avoid IntelliSense suggesting public fields
* of {@link Command} class when a plain object is expected.
*
* @see {@link Command}
* @internal
*/
var CommandInstance = class {
	[COMMAND_SYMBOL];
	constructor(args) {
		this[COMMAND_SYMBOL] = args;
	}
};
function _isSendInterface(x) {
	const operation = x;
	return operation !== null && operation !== void 0 && typeof operation.node === "string" && operation.args !== void 0;
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
var Send = class {
	lg_name = "Send";
	node;
	args;
	constructor(node, args) {
		this.node = node;
		this.args = _deserializeCommandSendObjectGraph(args);
	}
	toJSON() {
		return {
			lg_name: this.lg_name,
			node: this.node,
			args: this.args
		};
	}
};
function _isSend(x) {
	return x instanceof Send;
}
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
function isInterrupted(values) {
	if (!values || typeof values !== "object") return false;
	if (!(INTERRUPT in values)) return false;
	return Array.isArray(values[INTERRUPT]);
}
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
var Command = class extends CommandInstance {
	lg_name = "Command";
	lc_direct_tool_output = true;
	/**
	* Graph to send the command to. Supported values are:
	*   - None: the current graph (default)
	*   - The specific name of the graph to send the command to
	*   - {@link Command.PARENT}: closest parent graph (only supported when returned from a node in a subgraph)
	*/
	graph;
	/**
	* Update to apply to the graph's state as a result of executing the node that is returning the command.
	* Written to the state as if the node had simply returned this value instead of the Command object.
	*/
	update;
	/**
	* Value to resume execution with. To be used together with {@link interrupt}.
	*/
	resume;
	/**
	* Can be one of the following:
	*   - name of the node to navigate to next (any node that belongs to the specified `graph`)
	*   - sequence of node names to navigate to next
	*   - {@link Send} object (to execute a node with the exact input provided in the {@link Send} object)
	*   - sequence of {@link Send} objects
	*/
	goto = [];
	static PARENT = "__parent__";
	constructor(args) {
		super(args);
		this.resume = args.resume;
		this.graph = args.graph;
		this.update = args.update;
		if (args.goto) this.goto = Array.isArray(args.goto) ? _deserializeCommandSendObjectGraph(args.goto) : [_deserializeCommandSendObjectGraph(args.goto)];
	}
	/**
	* Convert the update field to a list of {@link PendingWrite} tuples
	* @returns List of {@link PendingWrite} tuples of the form `[channelKey, value]`.
	* @internal
	*/
	_updateAsTuples() {
		if (this.update && typeof this.update === "object" && !Array.isArray(this.update)) return Object.entries(this.update);
		else if (Array.isArray(this.update) && this.update.every((t) => Array.isArray(t) && t.length === 2 && typeof t[0] === "string")) return this.update;
		else return [["__root__", this.update]];
	}
	toJSON() {
		let serializedGoto;
		if (typeof this.goto === "string") serializedGoto = this.goto;
		else if (_isSend(this.goto)) serializedGoto = this.goto.toJSON();
		else serializedGoto = this.goto?.map((innerGoto) => {
			if (typeof innerGoto === "string") return innerGoto;
			else return innerGoto.toJSON();
		});
		return {
			lg_name: this.lg_name,
			update: this.update,
			resume: this.resume,
			goto: serializedGoto
		};
	}
};
/**
* A type guard to check if the given value is a {@link Command}.
*
* Useful for type narrowing when working with the {@link Command} object.
*
* @param x - The value to check.
* @returns `true` if the value is a {@link Command}, `false` otherwise.
*/
function isCommand(x) {
	if (typeof x !== "object") return false;
	if (x === null || x === void 0) return false;
	if ("lg_name" in x && x.lg_name === "Command") return true;
	return false;
}
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
function _deserializeCommandSendObjectGraph(x, seen = /* @__PURE__ */ new Map()) {
	if (x !== void 0 && x !== null && typeof x === "object") {
		if (seen.has(x)) return seen.get(x);
		let result;
		if (Array.isArray(x)) {
			result = [];
			seen.set(x, result);
			x.forEach((item, index) => {
				result[index] = _deserializeCommandSendObjectGraph(item, seen);
			});
		} else if (isCommand(x) && !(x instanceof Command)) {
			result = new Command(x);
			seen.set(x, result);
		} else if (_isSendInterface(x) && !(x instanceof Send)) {
			result = new Send(x.node, x.args);
			seen.set(x, result);
		} else if (isCommand(x) || _isSend(x)) {
			result = x;
			seen.set(x, result);
		} else if ("lc_serializable" in x && x.lc_serializable) {
			result = x;
			seen.set(x, result);
		} else {
			result = {};
			seen.set(x, result);
			for (const [key, value] of Object.entries(x)) result[key] = _deserializeCommandSendObjectGraph(value, seen);
		}
		return result;
	}
	return x;
}

//#endregion
exports.CACHE_NS_WRITES = CACHE_NS_WRITES;
exports.CHECKPOINT_NAMESPACE_END = CHECKPOINT_NAMESPACE_END;
exports.CHECKPOINT_NAMESPACE_SEPARATOR = CHECKPOINT_NAMESPACE_SEPARATOR;
exports.CONFIG_KEY_ABORT_SIGNALS = CONFIG_KEY_ABORT_SIGNALS;
exports.CONFIG_KEY_CALL = CONFIG_KEY_CALL;
exports.CONFIG_KEY_CHECKPOINTER = CONFIG_KEY_CHECKPOINTER;
exports.CONFIG_KEY_CHECKPOINT_ID = CONFIG_KEY_CHECKPOINT_ID;
exports.CONFIG_KEY_CHECKPOINT_MAP = CONFIG_KEY_CHECKPOINT_MAP;
exports.CONFIG_KEY_CHECKPOINT_NS = CONFIG_KEY_CHECKPOINT_NS;
exports.CONFIG_KEY_DURABILITY = CONFIG_KEY_DURABILITY;
exports.CONFIG_KEY_NODE_FINISHED = CONFIG_KEY_NODE_FINISHED;
exports.CONFIG_KEY_PREVIOUS_STATE = CONFIG_KEY_PREVIOUS_STATE;
exports.CONFIG_KEY_READ = CONFIG_KEY_READ;
exports.CONFIG_KEY_RESUME_MAP = CONFIG_KEY_RESUME_MAP;
exports.CONFIG_KEY_RESUMING = CONFIG_KEY_RESUMING;
exports.CONFIG_KEY_SCRATCHPAD = CONFIG_KEY_SCRATCHPAD;
exports.CONFIG_KEY_SEND = CONFIG_KEY_SEND;
exports.CONFIG_KEY_STREAM = CONFIG_KEY_STREAM;
exports.CONFIG_KEY_TASK_ID = CONFIG_KEY_TASK_ID;
exports.COPY = COPY;
exports.Command = Command;
exports.CommandInstance = CommandInstance;
exports.END = END;
exports.ERROR = ERROR;
exports.INPUT = INPUT;
exports.INTERRUPT = INTERRUPT;
exports.NO_WRITES = NO_WRITES;
exports.NULL_TASK_ID = NULL_TASK_ID;
exports.PREVIOUS = PREVIOUS;
exports.PULL = PULL;
exports.PUSH = PUSH;
exports.RESERVED = RESERVED;
exports.RESUME = RESUME;
exports.RETURN = RETURN;
exports.SELF = SELF;
exports.START = START;
exports.Send = Send;
exports.TAG_HIDDEN = TAG_HIDDEN;
exports.TAG_NOSTREAM = TAG_NOSTREAM;
exports.TASKS = TASKS;
exports._isSend = _isSend;
exports._isSendInterface = _isSendInterface;
exports.isCommand = isCommand;
exports.isInterrupted = isInterrupted;
//# sourceMappingURL=constants.cjs.map