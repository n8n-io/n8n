import { GraphRecursionError, GraphValueError, InvalidUpdateError } from "../errors.js";
import { createCheckpoint, emptyChannels, getOnlyChannels } from "../channels/base.js";
import { CHECKPOINT_NAMESPACE_END, CHECKPOINT_NAMESPACE_SEPARATOR, CONFIG_KEY_CHECKPOINTER, CONFIG_KEY_CHECKPOINT_NS, CONFIG_KEY_DURABILITY, CONFIG_KEY_NODE_FINISHED, CONFIG_KEY_READ, CONFIG_KEY_SEND, CONFIG_KEY_STREAM, CONFIG_KEY_TASK_ID, COPY, END, ERROR, INPUT, INTERRUPT, NULL_TASK_ID, PUSH, TASKS, isInterrupted } from "../constants.js";
import { ensureLangGraphConfig, getConfig, recastCheckpointNamespace } from "./utils/config.js";
import { gatherIterator, patchConfigurable } from "../utils.js";
import { ChannelWrite, PASSTHROUGH } from "./write.js";
import { PregelNode } from "./read.js";
import { mapInput, readChannels } from "./io.js";
import { _coerceToDict, combineAbortSignals, combineCallbacks, getNewChannelVersions, patchCheckpointMap } from "./utils/index.js";
import { _applyWrites, _localRead, _prepareNextTasks } from "./algo.js";
import { findSubgraphPregel } from "./utils/subgraph.js";
import { printStepCheckpoint, printStepTasks, printStepWrites, tasksWithWrites } from "./debug.js";
import { IterableReadableStreamWithAbortSignal, IterableReadableWritableStream, toEventStream } from "./stream.js";
import { PregelLoop } from "./loop.js";
import { StreamMessagesHandler } from "./messages.js";
import { PregelRunner } from "./runner.js";
import { validateGraph, validateKeys } from "./validate.js";
import { Topic } from "../channels/topic.js";
import { interrupt } from "../interrupt.js";
import { SCHEDULED, compareChannelVersions, copyCheckpoint, emptyCheckpoint, uuid5 } from "@langchain/langgraph-checkpoint";
import { Runnable, RunnableSequence, _coerceToRunnable, getCallbackManagerForConfig, mergeConfigs, patchConfig } from "@langchain/core/runnables";

//#region src/pregel/index.ts
/**
* Utility class for working with channels in the Pregel system.
* Provides static methods for subscribing to channels and writing to them.
*
* Channels are the communication pathways between nodes in a Pregel graph.
* They enable message passing and state updates between different parts of the graph.
*/
var Channel = class {
	static subscribeTo(channels, options) {
		const { key, tags } = {
			key: void 0,
			tags: void 0,
			...options ?? {}
		};
		if (Array.isArray(channels) && key !== void 0) throw new Error("Can't specify a key when subscribing to multiple channels");
		let channelMappingOrArray;
		if (typeof channels === "string") if (key) channelMappingOrArray = { [key]: channels };
		else channelMappingOrArray = [channels];
		else channelMappingOrArray = Object.fromEntries(channels.map((chan) => [chan, chan]));
		const triggers = Array.isArray(channels) ? channels : [channels];
		return new PregelNode({
			channels: channelMappingOrArray,
			triggers,
			tags
		});
	}
	/**
	* Creates a ChannelWrite that specifies how to write values to channels.
	* This is used to define how nodes send output to channels.
	*
	* @example
	* ```typescript
	* // Write to multiple channels
	* const write = Channel.writeTo(["output", "state"]);
	*
	* // Write with specific values
	* const write = Channel.writeTo(["output"], {
	*   state: "completed",
	*   result: calculateResult()
	* });
	*
	* // Write with a transformation function
	* const write = Channel.writeTo(["output"], {
	*   result: (x) => processResult(x)
	* });
	* ```
	*
	* @param channels - Array of channel names to write to
	* @param writes - Optional map of channel names to values or transformations
	* @returns A ChannelWrite object that can be used to write to the specified channels
	*/
	static writeTo(channels, writes) {
		const channelWriteEntries = [];
		for (const channel of channels) channelWriteEntries.push({
			channel,
			value: PASSTHROUGH,
			skipNone: false
		});
		for (const [key, value] of Object.entries(writes ?? {})) if (Runnable.isRunnable(value) || typeof value === "function") channelWriteEntries.push({
			channel: key,
			value: PASSTHROUGH,
			skipNone: true,
			mapper: _coerceToRunnable(value)
		});
		else channelWriteEntries.push({
			channel: key,
			value,
			skipNone: false
		});
		return new ChannelWrite(channelWriteEntries);
	}
};
var PartialRunnable = class extends Runnable {
	lc_namespace = ["langgraph", "pregel"];
	invoke(_input, _options) {
		throw new Error("Not implemented");
	}
	withConfig(_config) {
		return super.withConfig(_config);
	}
	stream(input, options) {
		return super.stream(input, options);
	}
};
/**
* The Pregel class is the core runtime engine of LangGraph, implementing a message-passing graph computation model
* inspired by [Google's Pregel system](https://research.google/pubs/pregel-a-system-for-large-scale-graph-processing/).
* It provides the foundation for building reliable, controllable agent workflows that can evolve state over time.
*
* Key features:
* - Message passing between nodes in discrete "supersteps"
* - Built-in persistence layer through checkpointers
* - First-class streaming support for values, updates, and events
* - Human-in-the-loop capabilities via interrupts
* - Support for parallel node execution within supersteps
*
* The Pregel class is not intended to be instantiated directly by consumers. Instead, use the following higher-level APIs:
* - {@link StateGraph}: The main graph class for building agent workflows
*   - Compiling a {@link StateGraph} will return a {@link CompiledGraph} instance, which extends `Pregel`
* - Functional API: A declarative approach using tasks and entrypoints
*   - A `Pregel` instance is returned by the {@link entrypoint} function
*
* @example
* ```typescript
* // Using StateGraph API
* const graph = new StateGraph(annotation)
*   .addNode("nodeA", myNodeFunction)
*   .addEdge("nodeA", "nodeB")
*   .compile();
*
* // The compiled graph is a Pregel instance
* const result = await graph.invoke(input);
* ```
*
* @example
* ```typescript
* // Using Functional API
* import { task, entrypoint } from "@langchain/langgraph";
* import { MemorySaver } from "@langchain/langgraph-checkpoint";
*
* // Define tasks that can be composed
* const addOne = task("add", async (x: number) => x + 1);
*
* // Create a workflow using the entrypoint function
* const workflow = entrypoint({
*   name: "workflow",
*   checkpointer: new MemorySaver()
* }, async (numbers: number[]) => {
*   // Tasks can be run in parallel
*   const results = await Promise.all(numbers.map(n => addOne(n)));
*   return results;
* });
*
* // The workflow is a Pregel instance
* const result = await workflow.invoke([1, 2, 3]); // Returns [2, 3, 4]
* ```
*
* @typeParam Nodes - Mapping of node names to their {@link PregelNode} implementations
* @typeParam Channels - Mapping of channel names to their {@link BaseChannel} or {@link ManagedValueSpec} implementations
* @typeParam ContextType - Type of context that can be passed to the graph
* @typeParam InputType - Type of input values accepted by the graph
* @typeParam OutputType - Type of output values produced by the graph
*/
var Pregel = class extends PartialRunnable {
	/**
	* Name of the class when serialized
	* @internal
	*/
	static lc_name() {
		return "LangGraph";
	}
	/** @internal LangChain namespace for serialization necessary because Pregel extends Runnable */
	lc_namespace = ["langgraph", "pregel"];
	/** @internal Flag indicating this is a Pregel instance - necessary for serialization */
	lg_is_pregel = true;
	/** The nodes in the graph, mapping node names to their PregelNode instances */
	nodes;
	/** The channels in the graph, mapping channel names to their BaseChannel or ManagedValueSpec instances */
	channels;
	/**
	* The input channels for the graph. These channels receive the initial input when the graph is invoked.
	* Can be a single channel key or an array of channel keys.
	*/
	inputChannels;
	/**
	* The output channels for the graph. These channels contain the final output when the graph completes.
	* Can be a single channel key or an array of channel keys.
	*/
	outputChannels;
	/** Whether to automatically validate the graph structure when it is compiled. Defaults to true. */
	autoValidate = true;
	/**
	* The streaming modes enabled for this graph. Defaults to ["values"].
	* Supported modes:
	* - "values": Streams the full state after each step
	* - "updates": Streams state updates after each step
	* - "messages": Streams messages from within nodes
	* - "custom": Streams custom events from within nodes
	* - "debug": Streams events related to the execution of the graph - useful for tracing & debugging graph execution
	*/
	streamMode = ["values"];
	/**
	* Optional channels to stream. If not specified, all channels will be streamed.
	* Can be a single channel key or an array of channel keys.
	*/
	streamChannels;
	/**
	* Optional array of node names or "all" to interrupt after executing these nodes.
	* Used for implementing human-in-the-loop workflows.
	*/
	interruptAfter;
	/**
	* Optional array of node names or "all" to interrupt before executing these nodes.
	* Used for implementing human-in-the-loop workflows.
	*/
	interruptBefore;
	/** Optional timeout in milliseconds for the execution of each superstep */
	stepTimeout;
	/** Whether to enable debug logging. Defaults to false. */
	debug = false;
	/**
	* Optional checkpointer for persisting graph state.
	* When provided, saves a checkpoint of the graph state at every superstep.
	* When false or undefined, checkpointing is disabled, and the graph will not be able to save or restore state.
	*/
	checkpointer;
	/** Optional retry policy for handling failures in node execution */
	retryPolicy;
	/** The default configuration for graph execution, can be overridden on a per-invocation basis */
	config;
	/**
	* Optional long-term memory store for the graph, allows for persistence & retrieval of data across threads
	*/
	store;
	/**
	* Optional cache for the graph, useful for caching tasks.
	*/
	cache;
	/**
	* Optional interrupt helper function.
	* @internal
	*/
	userInterrupt;
	/**
	* The trigger to node mapping for the graph run.
	* @internal
	*/
	triggerToNodes = {};
	/**
	* Constructor for Pregel - meant for internal use only.
	*
	* @internal
	*/
	constructor(fields) {
		super(fields);
		let { streamMode } = fields;
		if (streamMode != null && !Array.isArray(streamMode)) streamMode = [streamMode];
		this.nodes = fields.nodes;
		this.channels = fields.channels;
		if (TASKS in this.channels && "lc_graph_name" in this.channels[TASKS] && this.channels[TASKS].lc_graph_name !== "Topic") throw new Error(`Channel '${TASKS}' is reserved and cannot be used in the graph.`);
		else this.channels[TASKS] = new Topic({ accumulate: false });
		this.autoValidate = fields.autoValidate ?? this.autoValidate;
		this.streamMode = streamMode ?? this.streamMode;
		this.inputChannels = fields.inputChannels;
		this.outputChannels = fields.outputChannels;
		this.streamChannels = fields.streamChannels ?? this.streamChannels;
		this.interruptAfter = fields.interruptAfter;
		this.interruptBefore = fields.interruptBefore;
		this.stepTimeout = fields.stepTimeout ?? this.stepTimeout;
		this.debug = fields.debug ?? this.debug;
		this.checkpointer = fields.checkpointer;
		this.retryPolicy = fields.retryPolicy;
		this.config = fields.config;
		this.store = fields.store;
		this.cache = fields.cache;
		this.name = fields.name;
		this.triggerToNodes = fields.triggerToNodes ?? this.triggerToNodes;
		this.userInterrupt = fields.userInterrupt;
		if (this.autoValidate) this.validate();
	}
	/**
	* Creates a new instance of the Pregel graph with updated configuration.
	* This method follows the immutable pattern - instead of modifying the current instance,
	* it returns a new instance with the merged configuration.
	*
	* @example
	* ```typescript
	* // Create a new instance with debug enabled
	* const debugGraph = graph.withConfig({ debug: true });
	*
	* // Create a new instance with a specific thread ID
	* const threadGraph = graph.withConfig({
	*   configurable: { thread_id: "123" }
	* });
	* ```
	*
	* @param config - The configuration to merge with the current configuration
	* @returns A new Pregel instance with the merged configuration
	*/
	withConfig(config) {
		const mergedConfig = mergeConfigs(this.config, config);
		return new this.constructor({
			...this,
			config: mergedConfig
		});
	}
	/**
	* Validates the graph structure to ensure it is well-formed.
	* Checks for:
	* - No orphaned nodes
	* - Valid input/output channel configurations
	* - Valid interrupt configurations
	*
	* @returns this - The Pregel instance for method chaining
	* @throws {GraphValidationError} If the graph structure is invalid
	*/
	validate() {
		validateGraph({
			nodes: this.nodes,
			channels: this.channels,
			outputChannels: this.outputChannels,
			inputChannels: this.inputChannels,
			streamChannels: this.streamChannels,
			interruptAfterNodes: this.interruptAfter,
			interruptBeforeNodes: this.interruptBefore
		});
		for (const [name, node] of Object.entries(this.nodes)) for (const trigger of node.triggers) {
			this.triggerToNodes[trigger] ??= [];
			this.triggerToNodes[trigger].push(name);
		}
		return this;
	}
	/**
	* Gets a list of all channels that should be streamed.
	* If streamChannels is specified, returns those channels.
	* Otherwise, returns all channels in the graph.
	*
	* @returns Array of channel keys to stream
	*/
	get streamChannelsList() {
		if (Array.isArray(this.streamChannels)) return this.streamChannels;
		else if (this.streamChannels) return [this.streamChannels];
		else return Object.keys(this.channels);
	}
	/**
	* Gets the channels to stream in their original format.
	* If streamChannels is specified, returns it as-is (either single key or array).
	* Otherwise, returns all channels in the graph as an array.
	*
	* @returns Channel keys to stream, either as a single key or array
	*/
	get streamChannelsAsIs() {
		if (this.streamChannels) return this.streamChannels;
		else return Object.keys(this.channels);
	}
	/**
	* Gets a drawable representation of the graph structure.
	* This is an async version of getGraph() and is the preferred method to use.
	*
	* @param config - Configuration for generating the graph visualization
	* @returns A representation of the graph that can be visualized
	*/
	async getGraphAsync(config) {
		return this.getGraph(config);
	}
	/**
	* Gets all subgraphs within this graph.
	* A subgraph is a Pregel instance that is nested within a node of this graph.
	*
	* @deprecated Use getSubgraphsAsync instead. The async method will become the default in the next minor release.
	* @param namespace - Optional namespace to filter subgraphs
	* @param recurse - Whether to recursively get subgraphs of subgraphs
	* @returns Generator yielding tuples of [name, subgraph]
	*/
	*getSubgraphs(namespace, recurse) {
		for (const [name, node] of Object.entries(this.nodes)) {
			if (namespace !== void 0) {
				if (!namespace.startsWith(name)) continue;
			}
			const candidates = node.subgraphs?.length ? node.subgraphs : [node.bound];
			for (const candidate of candidates) {
				const graph = findSubgraphPregel(candidate);
				if (graph !== void 0) {
					if (name === namespace) {
						yield [name, graph];
						return;
					}
					if (namespace === void 0) yield [name, graph];
					if (recurse) {
						let newNamespace = namespace;
						if (namespace !== void 0) newNamespace = namespace.slice(name.length + 1);
						for (const [subgraphName, subgraph] of graph.getSubgraphs(newNamespace, recurse)) yield [`${name}${CHECKPOINT_NAMESPACE_SEPARATOR}${subgraphName}`, subgraph];
					}
				}
			}
		}
	}
	/**
	* Gets all subgraphs within this graph asynchronously.
	* A subgraph is a Pregel instance that is nested within a node of this graph.
	*
	* @param namespace - Optional namespace to filter subgraphs
	* @param recurse - Whether to recursively get subgraphs of subgraphs
	* @returns AsyncGenerator yielding tuples of [name, subgraph]
	*/
	async *getSubgraphsAsync(namespace, recurse) {
		yield* this.getSubgraphs(namespace, recurse);
	}
	/**
	* Prepares a state snapshot from saved checkpoint data.
	* This is an internal method used by getState and getStateHistory.
	*
	* @param config - Configuration for preparing the snapshot
	* @param saved - Optional saved checkpoint data
	* @param subgraphCheckpointer - Optional checkpointer for subgraphs
	* @param applyPendingWrites - Whether to apply pending writes to tasks and then to channels
	* @returns A snapshot of the graph state
	* @internal
	*/
	async _prepareStateSnapshot({ config, saved, subgraphCheckpointer, applyPendingWrites = false }) {
		if (saved === void 0) return {
			values: {},
			next: [],
			config,
			tasks: []
		};
		const channels = emptyChannels(this.channels, saved.checkpoint);
		if (saved.pendingWrites?.length) {
			const nullWrites = saved.pendingWrites.filter(([taskId, _]) => taskId === NULL_TASK_ID).map(([_, channel, value]) => [String(channel), value]);
			if (nullWrites.length > 0) _applyWrites(saved.checkpoint, channels, [{
				name: INPUT,
				writes: nullWrites,
				triggers: []
			}], void 0, this.triggerToNodes);
		}
		const nextTasks = Object.values(_prepareNextTasks(saved.checkpoint, saved.pendingWrites, this.nodes, channels, saved.config, true, {
			step: (saved.metadata?.step ?? -1) + 1,
			store: this.store
		}));
		const subgraphs = await gatherIterator(this.getSubgraphsAsync());
		const parentNamespace = saved.config.configurable?.checkpoint_ns ?? "";
		const taskStates = {};
		for (const task of nextTasks) {
			const matchingSubgraph = subgraphs.find(([name]) => name === task.name);
			if (!matchingSubgraph) continue;
			let taskNs = `${String(task.name)}${CHECKPOINT_NAMESPACE_END}${task.id}`;
			if (parentNamespace) taskNs = `${parentNamespace}${CHECKPOINT_NAMESPACE_SEPARATOR}${taskNs}`;
			if (subgraphCheckpointer === void 0) {
				const config$1 = { configurable: {
					thread_id: saved.config.configurable?.thread_id,
					checkpoint_ns: taskNs
				} };
				taskStates[task.id] = config$1;
			} else {
				const subgraphConfig = { configurable: {
					[CONFIG_KEY_CHECKPOINTER]: subgraphCheckpointer,
					thread_id: saved.config.configurable?.thread_id,
					checkpoint_ns: taskNs
				} };
				const pregel = matchingSubgraph[1];
				taskStates[task.id] = await pregel.getState(subgraphConfig, { subgraphs: true });
			}
		}
		if (applyPendingWrites && saved.pendingWrites?.length) {
			const nextTaskById = Object.fromEntries(nextTasks.map((task) => [task.id, task]));
			for (const [taskId, channel, value] of saved.pendingWrites) {
				if ([
					ERROR,
					INTERRUPT,
					SCHEDULED
				].includes(channel)) continue;
				if (!(taskId in nextTaskById)) continue;
				nextTaskById[taskId].writes.push([String(channel), value]);
			}
			const tasksWithWrites$1 = nextTasks.filter((task) => task.writes.length > 0);
			if (tasksWithWrites$1.length > 0) _applyWrites(saved.checkpoint, channels, tasksWithWrites$1, void 0, this.triggerToNodes);
		}
		let metadata = saved?.metadata;
		if (metadata && saved?.config?.configurable?.thread_id) metadata = {
			...metadata,
			thread_id: saved.config.configurable.thread_id
		};
		const nextList = nextTasks.filter((task) => task.writes.length === 0).map((task) => task.name);
		return {
			values: readChannels(channels, this.streamChannelsAsIs),
			next: nextList,
			tasks: tasksWithWrites(nextTasks, saved?.pendingWrites ?? [], taskStates, this.streamChannelsAsIs),
			metadata,
			config: patchCheckpointMap(saved.config, saved.metadata),
			createdAt: saved.checkpoint.ts,
			parentConfig: saved.parentConfig
		};
	}
	/**
	* Gets the current state of the graph.
	* Requires a checkpointer to be configured.
	*
	* @param config - Configuration for retrieving the state
	* @param options - Additional options
	* @returns A snapshot of the current graph state
	* @throws {GraphValueError} If no checkpointer is configured
	*/
	async getState(config, options) {
		const checkpointer = config.configurable?.[CONFIG_KEY_CHECKPOINTER] ?? this.checkpointer;
		if (!checkpointer) throw new GraphValueError("No checkpointer set", { lc_error_code: "MISSING_CHECKPOINTER" });
		const checkpointNamespace = config.configurable?.checkpoint_ns ?? "";
		if (checkpointNamespace !== "" && config.configurable?.[CONFIG_KEY_CHECKPOINTER] === void 0) {
			const recastNamespace = recastCheckpointNamespace(checkpointNamespace);
			for await (const [name, subgraph] of this.getSubgraphsAsync(recastNamespace, true)) if (name === recastNamespace) return await subgraph.getState(patchConfigurable(config, { [CONFIG_KEY_CHECKPOINTER]: checkpointer }), { subgraphs: options?.subgraphs });
			throw new Error(`Subgraph with namespace "${recastNamespace}" not found.`);
		}
		const mergedConfig = mergeConfigs(this.config, config);
		const saved = await checkpointer.getTuple(config);
		const snapshot = await this._prepareStateSnapshot({
			config: mergedConfig,
			saved,
			subgraphCheckpointer: options?.subgraphs ? checkpointer : void 0,
			applyPendingWrites: !config.configurable?.checkpoint_id
		});
		return snapshot;
	}
	/**
	* Gets the history of graph states.
	* Requires a checkpointer to be configured.
	* Useful for:
	* - Debugging execution history
	* - Implementing time travel
	* - Analyzing graph behavior
	*
	* @param config - Configuration for retrieving the history
	* @param options - Options for filtering the history
	* @returns An async iterator of state snapshots
	* @throws {Error} If no checkpointer is configured
	*/
	async *getStateHistory(config, options) {
		const checkpointer = config.configurable?.[CONFIG_KEY_CHECKPOINTER] ?? this.checkpointer;
		if (!checkpointer) throw new GraphValueError("No checkpointer set", { lc_error_code: "MISSING_CHECKPOINTER" });
		const checkpointNamespace = config.configurable?.checkpoint_ns ?? "";
		if (checkpointNamespace !== "" && config.configurable?.[CONFIG_KEY_CHECKPOINTER] === void 0) {
			const recastNamespace = recastCheckpointNamespace(checkpointNamespace);
			for await (const [name, pregel] of this.getSubgraphsAsync(recastNamespace, true)) if (name === recastNamespace) {
				yield* pregel.getStateHistory(patchConfigurable(config, { [CONFIG_KEY_CHECKPOINTER]: checkpointer }), options);
				return;
			}
			throw new Error(`Subgraph with namespace "${recastNamespace}" not found.`);
		}
		const mergedConfig = mergeConfigs(this.config, config, { configurable: { checkpoint_ns: checkpointNamespace } });
		for await (const checkpointTuple of checkpointer.list(mergedConfig, options)) yield this._prepareStateSnapshot({
			config: checkpointTuple.config,
			saved: checkpointTuple
		});
	}
	/**
	* Apply updates to the graph state in bulk.
	* Requires a checkpointer to be configured.
	*
	* This method is useful for recreating a thread
	* from a list of updates, especially if a checkpoint
	* is created as a result of multiple tasks.
	*
	* @internal The API might change in the future.
	*
	* @param startConfig - Configuration for the update
	* @param updates - The list of updates to apply to graph state
	* @returns Updated configuration
	* @throws {GraphValueError} If no checkpointer is configured
	* @throws {InvalidUpdateError} If the update cannot be attributed to a node or an update can be only applied in sequence.
	*/
	async bulkUpdateState(startConfig, supersteps) {
		const checkpointer = startConfig.configurable?.[CONFIG_KEY_CHECKPOINTER] ?? this.checkpointer;
		if (!checkpointer) throw new GraphValueError("No checkpointer set", { lc_error_code: "MISSING_CHECKPOINTER" });
		if (supersteps.length === 0) throw new Error("No supersteps provided");
		if (supersteps.some((s) => s.updates.length === 0)) throw new Error("No updates provided");
		const checkpointNamespace = startConfig.configurable?.checkpoint_ns ?? "";
		if (checkpointNamespace !== "" && startConfig.configurable?.[CONFIG_KEY_CHECKPOINTER] === void 0) {
			const recastNamespace = recastCheckpointNamespace(checkpointNamespace);
			for await (const [, pregel] of this.getSubgraphsAsync(recastNamespace, true)) return await pregel.bulkUpdateState(patchConfigurable(startConfig, { [CONFIG_KEY_CHECKPOINTER]: checkpointer }), supersteps);
			throw new Error(`Subgraph "${recastNamespace}" not found`);
		}
		const updateSuperStep = async (inputConfig, updates) => {
			const config = this.config ? mergeConfigs(this.config, inputConfig) : inputConfig;
			const saved = await checkpointer.getTuple(config);
			const checkpoint = saved !== void 0 ? copyCheckpoint(saved.checkpoint) : emptyCheckpoint();
			const checkpointPreviousVersions = { ...saved?.checkpoint.channel_versions };
			const step = saved?.metadata?.step ?? -1;
			let checkpointConfig = patchConfigurable(config, { checkpoint_ns: config.configurable?.checkpoint_ns ?? "" });
			let checkpointMetadata = config.metadata ?? {};
			if (saved?.config.configurable) {
				checkpointConfig = patchConfigurable(config, saved.config.configurable);
				checkpointMetadata = {
					...saved.metadata,
					...checkpointMetadata
				};
			}
			const { values, asNode } = updates[0];
			if (values == null && asNode === void 0) {
				if (updates.length > 1) throw new InvalidUpdateError(`Cannot create empty checkpoint with multiple updates`);
				const nextConfig$1 = await checkpointer.put(checkpointConfig, createCheckpoint(checkpoint, void 0, step), {
					source: "update",
					step: step + 1,
					parents: saved?.metadata?.parents ?? {}
				}, {});
				return patchCheckpointMap(nextConfig$1, saved ? saved.metadata : void 0);
			}
			const channels = emptyChannels(this.channels, checkpoint);
			if (values === null && asNode === END) {
				if (updates.length > 1) throw new InvalidUpdateError(`Cannot apply multiple updates when clearing state`);
				if (saved) {
					const nextTasks = _prepareNextTasks(checkpoint, saved.pendingWrites || [], this.nodes, channels, saved.config, true, {
						step: (saved.metadata?.step ?? -1) + 1,
						checkpointer,
						store: this.store
					});
					const nullWrites = (saved.pendingWrites || []).filter((w) => w[0] === NULL_TASK_ID).map((w) => w.slice(1));
					if (nullWrites.length > 0) _applyWrites(checkpoint, channels, [{
						name: INPUT,
						writes: nullWrites,
						triggers: []
					}], checkpointer.getNextVersion.bind(checkpointer), this.triggerToNodes);
					for (const [taskId, k, v] of saved.pendingWrites || []) {
						if ([
							ERROR,
							INTERRUPT,
							SCHEDULED
						].includes(k)) continue;
						if (!(taskId in nextTasks)) continue;
						nextTasks[taskId].writes.push([k, v]);
					}
					_applyWrites(checkpoint, channels, Object.values(nextTasks), checkpointer.getNextVersion.bind(checkpointer), this.triggerToNodes);
				}
				const nextConfig$1 = await checkpointer.put(checkpointConfig, createCheckpoint(checkpoint, channels, step), {
					...checkpointMetadata,
					source: "update",
					step: step + 1,
					parents: saved?.metadata?.parents ?? {}
				}, getNewChannelVersions(checkpointPreviousVersions, checkpoint.channel_versions));
				return patchCheckpointMap(nextConfig$1, saved ? saved.metadata : void 0);
			}
			if (asNode === COPY) {
				if (updates.length > 1) throw new InvalidUpdateError(`Cannot copy checkpoint with multiple updates`);
				if (saved == null) throw new InvalidUpdateError(`Cannot copy a non-existent checkpoint`);
				const isCopyWithUpdates = (values$1) => {
					if (!Array.isArray(values$1)) return false;
					if (values$1.length === 0) return false;
					return values$1.every((v) => Array.isArray(v) && v.length === 2);
				};
				const nextCheckpoint = createCheckpoint(checkpoint, void 0, step);
				const nextConfig$1 = await checkpointer.put(saved.parentConfig ?? patchConfigurable(saved.config, { checkpoint_id: void 0 }), nextCheckpoint, {
					source: "fork",
					step: step + 1,
					parents: saved.metadata?.parents ?? {}
				}, {});
				if (isCopyWithUpdates(values)) {
					const nextTasks = _prepareNextTasks(nextCheckpoint, saved.pendingWrites, this.nodes, channels, nextConfig$1, false, { step: step + 2 });
					const tasksGroupBy = Object.values(nextTasks).reduce((acc, { name, id }) => {
						acc[name] ??= [];
						acc[name].push({ id });
						return acc;
					}, {});
					const userGroupBy = values.reduce((acc, item) => {
						const [values$1, asNode$1] = item;
						acc[asNode$1] ??= [];
						const targetIdx = acc[asNode$1].length;
						const taskId = tasksGroupBy[asNode$1]?.[targetIdx]?.id;
						acc[asNode$1].push({
							values: values$1,
							asNode: asNode$1,
							taskId
						});
						return acc;
					}, {});
					return updateSuperStep(patchCheckpointMap(nextConfig$1, saved.metadata), Object.values(userGroupBy).flat());
				}
				return patchCheckpointMap(nextConfig$1, saved.metadata);
			}
			if (asNode === INPUT) {
				if (updates.length > 1) throw new InvalidUpdateError(`Cannot apply multiple updates when updating as input`);
				const inputWrites = await gatherIterator(mapInput(this.inputChannels, values));
				if (inputWrites.length === 0) throw new InvalidUpdateError(`Received no input writes for ${JSON.stringify(this.inputChannels, null, 2)}`);
				_applyWrites(checkpoint, channels, [{
					name: INPUT,
					writes: inputWrites,
					triggers: []
				}], checkpointer.getNextVersion.bind(this.checkpointer), this.triggerToNodes);
				const nextStep = saved?.metadata?.step != null ? saved.metadata.step + 1 : -1;
				const nextConfig$1 = await checkpointer.put(checkpointConfig, createCheckpoint(checkpoint, channels, nextStep), {
					source: "input",
					step: nextStep,
					parents: saved?.metadata?.parents ?? {}
				}, getNewChannelVersions(checkpointPreviousVersions, checkpoint.channel_versions));
				await checkpointer.putWrites(nextConfig$1, inputWrites, uuid5(INPUT, checkpoint.id));
				return patchCheckpointMap(nextConfig$1, saved ? saved.metadata : void 0);
			}
			if (config.configurable?.checkpoint_id === void 0 && saved?.pendingWrites !== void 0 && saved.pendingWrites.length > 0) {
				const nextTasks = _prepareNextTasks(checkpoint, saved.pendingWrites, this.nodes, channels, saved.config, true, {
					store: this.store,
					checkpointer: this.checkpointer,
					step: (saved.metadata?.step ?? -1) + 1
				});
				const nullWrites = (saved.pendingWrites ?? []).filter((w) => w[0] === NULL_TASK_ID).map((w) => w.slice(1));
				if (nullWrites.length > 0) _applyWrites(saved.checkpoint, channels, [{
					name: INPUT,
					writes: nullWrites,
					triggers: []
				}], void 0, this.triggerToNodes);
				for (const [tid, k, v] of saved.pendingWrites) {
					if ([
						ERROR,
						INTERRUPT,
						SCHEDULED
					].includes(k) || nextTasks[tid] === void 0) continue;
					nextTasks[tid].writes.push([k, v]);
				}
				const tasks$1 = Object.values(nextTasks).filter((task) => {
					return task.writes.length > 0;
				});
				if (tasks$1.length > 0) _applyWrites(checkpoint, channels, tasks$1, void 0, this.triggerToNodes);
			}
			const nonNullVersion = Object.values(checkpoint.versions_seen).map((seenVersions) => {
				return Object.values(seenVersions);
			}).flat().find((v) => !!v);
			const validUpdates = [];
			if (updates.length === 1) {
				let { values: values$1, asNode: asNode$1, taskId } = updates[0];
				if (asNode$1 === void 0 && Object.keys(this.nodes).length === 1) [asNode$1] = Object.keys(this.nodes);
				else if (asNode$1 === void 0 && nonNullVersion === void 0) {
					if (typeof this.inputChannels === "string" && this.nodes[this.inputChannels] !== void 0) asNode$1 = this.inputChannels;
				} else if (asNode$1 === void 0) {
					const lastSeenByNode = Object.entries(checkpoint.versions_seen).map(([n, seen]) => {
						return Object.values(seen).map((v) => {
							return [v, n];
						});
					}).flat().filter(([_, v]) => v !== INTERRUPT).sort(([aNumber], [bNumber]) => compareChannelVersions(aNumber, bNumber));
					if (lastSeenByNode) {
						if (lastSeenByNode.length === 1) asNode$1 = lastSeenByNode[0][1];
						else if (lastSeenByNode[lastSeenByNode.length - 1][0] !== lastSeenByNode[lastSeenByNode.length - 2][0]) asNode$1 = lastSeenByNode[lastSeenByNode.length - 1][1];
					}
				}
				if (asNode$1 === void 0) throw new InvalidUpdateError(`Ambiguous update, specify "asNode"`);
				validUpdates.push({
					values: values$1,
					asNode: asNode$1,
					taskId
				});
			} else for (const { asNode: asNode$1, values: values$1, taskId } of updates) {
				if (asNode$1 == null) throw new InvalidUpdateError(`"asNode" is required when applying multiple updates`);
				validUpdates.push({
					values: values$1,
					asNode: asNode$1,
					taskId
				});
			}
			const tasks = [];
			for (const { asNode: asNode$1, values: values$1, taskId } of validUpdates) {
				if (this.nodes[asNode$1] === void 0) throw new InvalidUpdateError(`Node "${asNode$1.toString()}" does not exist`);
				const writers = this.nodes[asNode$1].getWriters();
				if (!writers.length) throw new InvalidUpdateError(`No writers found for node "${asNode$1.toString()}"`);
				tasks.push({
					name: asNode$1,
					input: values$1,
					proc: writers.length > 1 ? RunnableSequence.from(writers, { omitSequenceTags: true }) : writers[0],
					writes: [],
					triggers: [INTERRUPT],
					id: taskId ?? uuid5(INTERRUPT, checkpoint.id),
					writers: []
				});
			}
			for (const task of tasks) await task.proc.invoke(task.input, patchConfig({
				...config,
				store: config?.store ?? this.store
			}, {
				runName: config.runName ?? `${this.getName()}UpdateState`,
				configurable: {
					[CONFIG_KEY_SEND]: (items) => task.writes.push(...items),
					[CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, task, select_, fresh_)
				}
			}));
			for (const task of tasks) {
				const channelWrites = task.writes.filter((w) => w[0] !== PUSH);
				if (saved !== void 0 && channelWrites.length > 0) await checkpointer.putWrites(checkpointConfig, channelWrites, task.id);
			}
			_applyWrites(checkpoint, channels, tasks, checkpointer.getNextVersion.bind(this.checkpointer), this.triggerToNodes);
			const newVersions = getNewChannelVersions(checkpointPreviousVersions, checkpoint.channel_versions);
			const nextConfig = await checkpointer.put(checkpointConfig, createCheckpoint(checkpoint, channels, step + 1), {
				source: "update",
				step: step + 1,
				parents: saved?.metadata?.parents ?? {}
			}, newVersions);
			for (const task of tasks) {
				const pushWrites = task.writes.filter((w) => w[0] === PUSH);
				if (pushWrites.length > 0) await checkpointer.putWrites(nextConfig, pushWrites, task.id);
			}
			return patchCheckpointMap(nextConfig, saved ? saved.metadata : void 0);
		};
		let currentConfig = startConfig;
		for (const { updates } of supersteps) currentConfig = await updateSuperStep(currentConfig, updates);
		return currentConfig;
	}
	/**
	* Updates the state of the graph with new values.
	* Requires a checkpointer to be configured.
	*
	* This method can be used for:
	* - Implementing human-in-the-loop workflows
	* - Modifying graph state during breakpoints
	* - Integrating external inputs into the graph
	*
	* @param inputConfig - Configuration for the update
	* @param values - The values to update the state with
	* @param asNode - Optional node name to attribute the update to
	* @returns Updated configuration
	* @throws {GraphValueError} If no checkpointer is configured
	* @throws {InvalidUpdateError} If the update cannot be attributed to a node
	*/
	async updateState(inputConfig, values, asNode) {
		return this.bulkUpdateState(inputConfig, [{ updates: [{
			values,
			asNode
		}] }]);
	}
	/**
	* Gets the default values for various graph configuration options.
	* This is an internal method used to process and normalize configuration options.
	*
	* @param config - The input configuration options
	* @returns A tuple containing normalized values for:
	* - debug mode
	* - stream modes
	* - input keys
	* - output keys
	* - remaining config
	* - interrupt before nodes
	* - interrupt after nodes
	* - checkpointer
	* - store
	* - whether stream mode is single
	* - node cache
	* - whether checkpoint during is enabled
	* @internal
	*/
	_defaults(config) {
		const { debug, streamMode, inputKeys, outputKeys, interruptAfter, interruptBefore,...rest } = config;
		let streamModeSingle = true;
		const defaultDebug = debug !== void 0 ? debug : this.debug;
		let defaultOutputKeys = outputKeys;
		if (defaultOutputKeys === void 0) defaultOutputKeys = this.streamChannelsAsIs;
		else validateKeys(defaultOutputKeys, this.channels);
		let defaultInputKeys = inputKeys;
		if (defaultInputKeys === void 0) defaultInputKeys = this.inputChannels;
		else validateKeys(defaultInputKeys, this.channels);
		const defaultInterruptBefore = interruptBefore ?? this.interruptBefore ?? [];
		const defaultInterruptAfter = interruptAfter ?? this.interruptAfter ?? [];
		let defaultStreamMode;
		if (streamMode !== void 0) {
			defaultStreamMode = Array.isArray(streamMode) ? streamMode : [streamMode];
			streamModeSingle = typeof streamMode === "string";
		} else {
			if (config.configurable?.[CONFIG_KEY_TASK_ID] !== void 0) defaultStreamMode = ["values"];
			else defaultStreamMode = this.streamMode;
			streamModeSingle = true;
		}
		let defaultCheckpointer;
		if (this.checkpointer === false) defaultCheckpointer = void 0;
		else if (config !== void 0 && config.configurable?.[CONFIG_KEY_CHECKPOINTER] !== void 0) defaultCheckpointer = config.configurable[CONFIG_KEY_CHECKPOINTER];
		else if (this.checkpointer === true) throw new Error("checkpointer: true cannot be used for root graphs.");
		else defaultCheckpointer = this.checkpointer;
		const defaultStore = config.store ?? this.store;
		const defaultCache = config.cache ?? this.cache;
		if (config.durability != null && config.checkpointDuring != null) throw new Error("Cannot use both `durability` and `checkpointDuring` at the same time.");
		const checkpointDuringDurability = (() => {
			if (config.checkpointDuring == null) return void 0;
			if (config.checkpointDuring === false) return "exit";
			return "async";
		})();
		const defaultDurability = config.durability ?? checkpointDuringDurability ?? config?.configurable?.[CONFIG_KEY_DURABILITY] ?? "async";
		return [
			defaultDebug,
			defaultStreamMode,
			defaultInputKeys,
			defaultOutputKeys,
			rest,
			defaultInterruptBefore,
			defaultInterruptAfter,
			defaultCheckpointer,
			defaultStore,
			streamModeSingle,
			defaultCache,
			defaultDurability
		];
	}
	/**
	* Streams the execution of the graph, emitting state updates as they occur.
	* This is the primary method for observing graph execution in real-time.
	*
	* Stream modes:
	* - "values": Emits complete state after each step
	* - "updates": Emits only state changes after each step
	* - "debug": Emits detailed debug information
	* - "messages": Emits messages from within nodes
	* - "custom": Emits custom events from within nodes
	* - "checkpoints": Emits checkpoints from within nodes
	* - "tasks": Emits tasks from within nodes
	*
	* @param input - The input to start graph execution with
	* @param options - Configuration options for streaming
	* @returns An async iterable stream of graph state updates
	*/
	async stream(input, options) {
		const abortController = new AbortController();
		const config = {
			recursionLimit: this.config?.recursionLimit,
			...options,
			signal: combineAbortSignals(options?.signal, abortController.signal).signal
		};
		const stream = await super.stream(input, config);
		return new IterableReadableStreamWithAbortSignal(options?.encoding === "text/event-stream" ? toEventStream(stream) : stream, abortController);
	}
	streamEvents(input, options, streamOptions) {
		const abortController = new AbortController();
		const config = {
			recursionLimit: this.config?.recursionLimit,
			...options,
			callbacks: combineCallbacks(this.config?.callbacks, options?.callbacks),
			signal: combineAbortSignals(options?.signal, abortController.signal).signal
		};
		return new IterableReadableStreamWithAbortSignal(super.streamEvents(input, config, streamOptions), abortController);
	}
	/**
	* Validates the input for the graph.
	* @param input - The input to validate
	* @returns The validated input
	* @internal
	*/
	async _validateInput(input) {
		return input;
	}
	/**
	* Validates the context options for the graph.
	* @param context - The context options to validate
	* @returns The validated context options
	* @internal
	*/
	async _validateContext(context) {
		return context;
	}
	/**
	* Internal iterator used by stream() to generate state updates.
	* This method handles the core logic of graph execution and streaming.
	*
	* @param input - The input to start graph execution with
	* @param options - Configuration options for streaming
	* @returns AsyncGenerator yielding state updates
	* @internal
	*/
	async *_streamIterator(input, options) {
		const streamEncoding = "version" in (options ?? {}) ? void 0 : options?.encoding ?? void 0;
		const streamSubgraphs = options?.subgraphs;
		const inputConfig = ensureLangGraphConfig(this.config, options);
		if (inputConfig.recursionLimit === void 0 || inputConfig.recursionLimit < 1) throw new Error(`Passed "recursionLimit" must be at least 1.`);
		if (this.checkpointer !== void 0 && this.checkpointer !== false && inputConfig.configurable === void 0) throw new Error(`Checkpointer requires one or more of the following "configurable" keys: "thread_id", "checkpoint_ns", "checkpoint_id"`);
		const validInput = await this._validateInput(input);
		const { runId,...restConfig } = inputConfig;
		const [debug, streamMode, , outputKeys, config, interruptBefore, interruptAfter, checkpointer, store, streamModeSingle, cache, durability] = this._defaults(restConfig);
		if (typeof config.context !== "undefined") config.context = await this._validateContext(config.context);
		else config.configurable = await this._validateContext(config.configurable);
		const stream = new IterableReadableWritableStream({ modes: new Set(streamMode) });
		if (this.checkpointer === true) {
			config.configurable ??= {};
			const ns = config.configurable[CONFIG_KEY_CHECKPOINT_NS] ?? "";
			config.configurable[CONFIG_KEY_CHECKPOINT_NS] = ns.split(CHECKPOINT_NAMESPACE_SEPARATOR).map((part) => part.split(CHECKPOINT_NAMESPACE_END)[0]).join(CHECKPOINT_NAMESPACE_SEPARATOR);
		}
		if (streamMode.includes("messages")) {
			const messageStreamer = new StreamMessagesHandler((chunk) => stream.push(chunk));
			const { callbacks } = config;
			if (callbacks === void 0) config.callbacks = [messageStreamer];
			else if (Array.isArray(callbacks)) config.callbacks = callbacks.concat(messageStreamer);
			else {
				const copiedCallbacks = callbacks.copy();
				copiedCallbacks.addHandler(messageStreamer, true);
				config.callbacks = copiedCallbacks;
			}
		}
		config.writer ??= (chunk) => {
			if (!streamMode.includes("custom")) return;
			const ns = (getConfig()?.configurable?.[CONFIG_KEY_CHECKPOINT_NS])?.split(CHECKPOINT_NAMESPACE_SEPARATOR).slice(0, -1);
			stream.push([
				ns ?? [],
				"custom",
				chunk
			]);
		};
		config.interrupt ??= this.userInterrupt ?? interrupt;
		const callbackManager = await getCallbackManagerForConfig(config);
		const runManager = await callbackManager?.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), runId, void 0, void 0, void 0, config?.runName ?? this.getName());
		const channelSpecs = getOnlyChannels(this.channels);
		let loop;
		let loopError;
		/**
		* The PregelLoop will yield events from concurrent tasks as soon as they are
		* generated. Each task can push multiple events onto the stream in any order.
		*
		* We use a separate background method and stream here in order to yield events
		* from the loop to the main stream and therefore back to the user as soon as
		* they are available.
		*/
		const createAndRunLoop = async () => {
			try {
				loop = await PregelLoop.initialize({
					input: validInput,
					config,
					checkpointer,
					nodes: this.nodes,
					channelSpecs,
					outputKeys,
					streamKeys: this.streamChannelsAsIs,
					store,
					cache,
					stream,
					interruptAfter,
					interruptBefore,
					manager: runManager,
					debug: this.debug,
					triggerToNodes: this.triggerToNodes,
					durability
				});
				const runner = new PregelRunner({
					loop,
					nodeFinished: config.configurable?.[CONFIG_KEY_NODE_FINISHED]
				});
				if (options?.subgraphs) loop.config.configurable = {
					...loop.config.configurable,
					[CONFIG_KEY_STREAM]: loop.stream
				};
				await this._runLoop({
					loop,
					runner,
					debug,
					config
				});
				if (durability === "sync") await Promise.all(loop?.checkpointerPromises ?? []);
			} catch (e) {
				loopError = e;
			} finally {
				try {
					if (loop) {
						await loop.store?.stop();
						await loop.cache?.stop();
					}
					await Promise.all(loop?.checkpointerPromises ?? []);
				} catch (e) {
					loopError = loopError ?? e;
				}
				if (loopError) stream.error(loopError);
				else stream.close();
			}
		};
		const runLoopPromise = createAndRunLoop();
		try {
			for await (const chunk of stream) {
				if (chunk === void 0) throw new Error("Data structure error.");
				const [namespace, mode, payload] = chunk;
				if (streamMode.includes(mode)) {
					if (streamEncoding === "text/event-stream") {
						if (streamSubgraphs) yield [
							namespace,
							mode,
							payload
						];
						else yield [
							null,
							mode,
							payload
						];
						continue;
					}
					if (streamSubgraphs && !streamModeSingle) yield [
						namespace,
						mode,
						payload
					];
					else if (!streamModeSingle) yield [mode, payload];
					else if (streamSubgraphs) yield [namespace, payload];
					else yield payload;
				}
			}
		} catch (e) {
			await runManager?.handleChainError(loopError);
			throw e;
		} finally {
			await runLoopPromise;
		}
		await runManager?.handleChainEnd(loop?.output ?? {}, runId, void 0, void 0, void 0);
	}
	/**
	* Run the graph with a single input and config.
	* @param input The input to the graph.
	* @param options The configuration to use for the run.
	*/
	async invoke(input, options) {
		const streamMode = options?.streamMode ?? "values";
		const config = {
			...options,
			outputKeys: options?.outputKeys ?? this.outputChannels,
			streamMode,
			encoding: void 0
		};
		const chunks = [];
		const stream = await this.stream(input, config);
		const interruptChunks = [];
		let latest;
		for await (const chunk of stream) if (streamMode === "values") if (isInterrupted(chunk)) interruptChunks.push(chunk[INTERRUPT]);
		else latest = chunk;
		else chunks.push(chunk);
		if (streamMode === "values") {
			if (interruptChunks.length > 0) {
				const interrupts = interruptChunks.flat(1);
				if (latest == null) return { [INTERRUPT]: interrupts };
				if (typeof latest === "object") return {
					...latest,
					[INTERRUPT]: interrupts
				};
			}
			return latest;
		}
		return chunks;
	}
	async _runLoop(params) {
		const { loop, runner, debug, config } = params;
		let tickError;
		try {
			while (await loop.tick({ inputKeys: this.inputChannels })) {
				for (const { task } of await loop._matchCachedWrites()) loop._outputWrites(task.id, task.writes, true);
				if (debug) printStepCheckpoint(loop.checkpointMetadata.step, loop.channels, this.streamChannelsList);
				if (debug) printStepTasks(loop.step, Object.values(loop.tasks));
				await runner.tick({
					timeout: this.stepTimeout,
					retryPolicy: this.retryPolicy,
					onStepWrite: (step, writes) => {
						if (debug) printStepWrites(step, writes, this.streamChannelsList);
					},
					maxConcurrency: config.maxConcurrency,
					signal: config.signal
				});
			}
			if (loop.status === "out_of_steps") throw new GraphRecursionError([
				`Recursion limit of ${config.recursionLimit} reached`,
				"without hitting a stop condition. You can increase the",
				`limit by setting the "recursionLimit" config key.`
			].join(" "), { lc_error_code: "GRAPH_RECURSION_LIMIT" });
		} catch (e) {
			tickError = e;
			const suppress = await loop.finishAndHandleError(tickError);
			if (!suppress) throw e;
		} finally {
			if (tickError === void 0) await loop.finishAndHandleError();
		}
	}
	async clearCache() {
		await this.cache?.clear([]);
	}
};

//#endregion
export { Channel, Pregel };
//# sourceMappingURL=index.js.map