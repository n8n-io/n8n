const require_constants = require('../constants.cjs');
const require_errors = require('../errors.cjs');
const require_last_value = require('../channels/last_value.cjs');
const require_annotation = require('./annotation.cjs');
const require_utils = require('../utils.cjs');
const require_write = require('../pregel/write.cjs');
const require_read = require('../pregel/read.cjs');
const require_subgraph = require('../pregel/utils/subgraph.cjs');
const require_ephemeral_value = require('../channels/ephemeral_value.cjs');
const require_graph = require('./graph.cjs');
const require_named_barrier_value = require('../channels/named_barrier_value.cjs');
const require_schema = require('../state/schema.cjs');
require('../state/index.cjs');
const require_meta = require('./zod/meta.cjs');
const require_types = require('./types.cjs');
let _langchain_core_runnables = require("@langchain/core/runnables");
let _langchain_core_utils_types = require("@langchain/core/utils/types");

//#region src/graph/state.ts
const ROOT = "__root__";
const PartialStateSchema = Symbol.for("langgraph.state.partial");
/**
* A graph whose nodes communicate by reading and writing to a shared state.
* Each node takes a defined `State` as input and returns a `Partial<State>`.
*
* Each state key can optionally be annotated with a reducer function that
* will be used to aggregate the values of that key received from multiple nodes.
* The signature of a reducer function is (left: Value, right: UpdateValue) => Value.
*
* See {@link Annotation} for more on defining state.
*
* After adding nodes and edges to your graph, you must call `.compile()` on it before
* you can use it.
*
* @typeParam SD - The state definition used to construct the graph. Can be an
*   {@link AnnotationRoot}, {@link StateSchema}, or Zod object schema. This is the
*   primary generic from which `S` and `U` are derived.
*
* @typeParam S - The full state type representing the complete shape of your graph's
*   state after all reducers have been applied. Automatically inferred from `SD`.
*
* @typeParam U - The update type representing what nodes can return to modify state.
*   Typically a partial of the state type. Automatically inferred from `SD`.
*
* @typeParam N - Union of all node names in the graph (e.g., `"agent" | "tool"`).
*   Accumulated as you call `.addNode()`. Used for type-safe routing.
*
* @typeParam I - The input schema definition. Set via the `input` option in the
*   constructor to restrict what data the graph accepts when invoked.
*
* @typeParam O - The output schema definition. Set via the `output` option in the
*   constructor to restrict what data the graph returns after execution.
*
* @typeParam C - The config/context schema definition. Set via the `context` option
*   to define additional configuration passed at runtime.
*
* @typeParam NodeReturnType - Constrains what types nodes in this graph can return.
*
* @typeParam InterruptType - The type for {@link interrupt} resume values. Set via
*   the `interrupt` option for typed human-in-the-loop patterns.
*
* @typeParam WriterType - The type for custom stream writers. Set via the `writer`
*   option to enable typed custom streaming from within nodes.
*
* @example
* ```ts
* import {
*   type BaseMessage,
*   AIMessage,
*   HumanMessage,
* } from "@langchain/core/messages";
* import { StateGraph, Annotation } from "@langchain/langgraph";
*
* // Define a state with a single key named "messages" that will
* // combine a returned BaseMessage or arrays of BaseMessages
* const StateAnnotation = Annotation.Root({
*   sentiment: Annotation<string>,
*   messages: Annotation<BaseMessage[]>({
*     reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
*       if (Array.isArray(right)) {
*         return left.concat(right);
*       }
*       return left.concat([right]);
*     },
*     default: () => [],
*   }),
* });
*
* const graphBuilder = new StateGraph(StateAnnotation);
*
* // A node in the graph that returns an object with a "messages" key
* // will update the state by combining the existing value with the returned one.
* const myNode = (state: typeof StateAnnotation.State) => {
*   return {
*     messages: [new AIMessage("Some new response")],
*     sentiment: "positive",
*   };
* };
*
* const graph = graphBuilder
*   .addNode("myNode", myNode)
*   .addEdge("__start__", "myNode")
*   .addEdge("myNode", "__end__")
*   .compile();
*
* await graph.invoke({ messages: [new HumanMessage("how are you?")] });
*
* // {
* //   messages: [HumanMessage("how are you?"), AIMessage("Some new response")],
* //   sentiment: "positive",
* // }
* ```
*/
var StateGraph = class extends require_graph.Graph {
	channels = {};
	waitingEdges = /* @__PURE__ */ new Set();
	/** @internal */
	_schemaDefinition;
	/** @internal */
	_schemaRuntimeDefinition;
	/** @internal */
	_inputDefinition;
	/** @internal */
	_inputRuntimeDefinition;
	/** @internal */
	_outputDefinition;
	/** @internal */
	_outputRuntimeDefinition;
	/**
	* Map schemas to managed values
	* @internal
	*/
	_schemaDefinitions = /* @__PURE__ */ new Map();
	/** @internal */
	_metaRegistry = require_meta.schemaMetaRegistry;
	/** @internal Used only for typing. */
	_configSchema;
	/** @internal */
	_configRuntimeSchema;
	/** @internal */
	_interrupt;
	/** @internal */
	_writer;
	constructor(stateOrInit, options) {
		super();
		const init = this._normalizeToStateGraphInit(stateOrInit, options);
		const stateSchema = init.state ?? init.stateSchema ?? init.input;
		if (!stateSchema) throw new require_errors.StateGraphInputError();
		const stateChannelDef = this._getChannelsFromSchema(stateSchema);
		this._schemaDefinition = stateChannelDef;
		if (require_schema.StateSchema.isInstance(stateSchema)) this._schemaRuntimeDefinition = stateSchema;
		else if ((0, _langchain_core_utils_types.isInteropZodObject)(stateSchema)) this._schemaRuntimeDefinition = stateSchema;
		if (init.input) if (require_schema.StateSchema.isInstance(init.input)) this._inputRuntimeDefinition = init.input;
		else if ((0, _langchain_core_utils_types.isInteropZodObject)(init.input)) this._inputRuntimeDefinition = init.input;
		else this._inputRuntimeDefinition = PartialStateSchema;
		else this._inputRuntimeDefinition = PartialStateSchema;
		if (init.output) if (require_schema.StateSchema.isInstance(init.output)) this._outputRuntimeDefinition = init.output;
		else if ((0, _langchain_core_utils_types.isInteropZodObject)(init.output)) this._outputRuntimeDefinition = init.output;
		else this._outputRuntimeDefinition = this._schemaRuntimeDefinition;
		else this._outputRuntimeDefinition = this._schemaRuntimeDefinition;
		const inputChannelDef = init.input ? this._getChannelsFromSchema(init.input) : stateChannelDef;
		const outputChannelDef = init.output ? this._getChannelsFromSchema(init.output) : stateChannelDef;
		this._inputDefinition = inputChannelDef;
		this._outputDefinition = outputChannelDef;
		this._addSchema(this._schemaDefinition);
		this._addSchema(this._inputDefinition);
		this._addSchema(this._outputDefinition);
		if (init.context) {
			if ((0, _langchain_core_utils_types.isInteropZodObject)(init.context)) this._configRuntimeSchema = init.context;
		}
		this._interrupt = init.interrupt;
		this._writer = init.writer;
	}
	/**
	* Normalize all constructor input patterns to a unified StateGraphInit object.
	* @internal
	*/
	_normalizeToStateGraphInit(stateOrInit, options) {
		if (require_types.isStateGraphInit(stateOrInit)) {
			if ((0, _langchain_core_utils_types.isInteropZodObject)(options) || require_annotation.AnnotationRoot.isInstance(options)) return {
				...stateOrInit,
				context: options
			};
			const opts = options;
			return {
				...stateOrInit,
				input: stateOrInit.input ?? opts?.input,
				output: stateOrInit.output ?? opts?.output,
				context: stateOrInit.context ?? opts?.context,
				interrupt: stateOrInit.interrupt ?? opts?.interrupt,
				writer: stateOrInit.writer ?? opts?.writer,
				nodes: stateOrInit.nodes ?? opts?.nodes
			};
		}
		if (require_types.isStateDefinitionInit(stateOrInit)) {
			if ((0, _langchain_core_utils_types.isInteropZodObject)(options) || require_annotation.AnnotationRoot.isInstance(options)) return {
				state: stateOrInit,
				context: options
			};
			const opts = options;
			return {
				state: stateOrInit,
				input: opts?.input,
				output: opts?.output,
				context: opts?.context,
				interrupt: opts?.interrupt,
				writer: opts?.writer,
				nodes: opts?.nodes
			};
		}
		if (isStateGraphArgs(stateOrInit)) return { state: _getChannels(stateOrInit.channels) };
		throw new require_errors.StateGraphInputError();
	}
	/**
	* Convert any supported schema type to a StateDefinition (channel map).
	* @internal
	*/
	_getChannelsFromSchema(schema) {
		if (require_schema.StateSchema.isInstance(schema)) return schema.getChannels();
		if ((0, _langchain_core_utils_types.isInteropZodObject)(schema)) return this._metaRegistry.getChannelsForSchema(schema);
		if (typeof schema === "object" && "lc_graph_name" in schema && schema.lc_graph_name === "AnnotationRoot") return schema.spec;
		if (typeof schema === "object" && !Array.isArray(schema) && Object.keys(schema).length > 0) return schema;
		throw new require_errors.StateGraphInputError("Invalid schema type. Expected StateSchema, Zod object, AnnotationRoot, or StateDefinition.");
	}
	get allEdges() {
		return new Set([...this.edges, ...Array.from(this.waitingEdges).flatMap(([starts, end]) => starts.map((start) => [start, end]))]);
	}
	_addSchema(stateDefinition) {
		if (this._schemaDefinitions.has(stateDefinition)) return;
		this._schemaDefinitions.set(stateDefinition, stateDefinition);
		for (const [key, val] of Object.entries(stateDefinition)) {
			let channel;
			if (typeof val === "function") channel = val();
			else channel = val;
			if (this.channels[key] !== void 0) {
				if (!this.channels[key].equals(channel)) {
					if (channel.lc_graph_name !== "LastValue") throw new Error(`Channel "${key}" already exists with a different type.`);
				}
			} else this.channels[key] = channel;
		}
	}
	addNode(...args) {
		function isMultipleNodes(args) {
			return args.length >= 1 && typeof args[0] !== "string";
		}
		const nodes = isMultipleNodes(args) ? Array.isArray(args[0]) ? args[0] : Object.entries(args[0]).map(([key, action]) => [key, action]) : [[
			args[0],
			args[1],
			args[2]
		]];
		if (nodes.length === 0) throw new Error("No nodes provided in `addNode`");
		for (const [key, action, options] of nodes) {
			if (key in this.channels) throw new Error(`${key} is already being used as a state attribute (a.k.a. a channel), cannot also be used as a node name.`);
			for (const reservedChar of [require_constants.CHECKPOINT_NAMESPACE_SEPARATOR, require_constants.CHECKPOINT_NAMESPACE_END]) if (key.includes(reservedChar)) throw new Error(`"${reservedChar}" is a reserved character and is not allowed in node names.`);
			this.warnIfCompiled(`Adding a node to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
			if (key in this.nodes) throw new Error(`Node \`${key}\` already present.`);
			if (key === require_constants.END || key === require_constants.START) throw new Error(`Node \`${key}\` is reserved.`);
			let inputSpec = this._schemaDefinition;
			if (options?.input !== void 0) inputSpec = this._getChannelsFromSchema(options.input);
			this._addSchema(inputSpec);
			let runnable;
			if (_langchain_core_runnables.Runnable.isRunnable(action)) runnable = action;
			else if (typeof action === "function") runnable = new require_utils.RunnableCallable({
				func: action,
				name: key,
				trace: false
			});
			else runnable = (0, _langchain_core_runnables._coerceToRunnable)(action);
			let cachePolicy = options?.cachePolicy;
			if (typeof cachePolicy === "boolean") cachePolicy = cachePolicy ? {} : void 0;
			const nodeSpec = {
				runnable,
				retryPolicy: options?.retryPolicy,
				cachePolicy,
				metadata: options?.metadata,
				input: inputSpec ?? this._schemaDefinition,
				subgraphs: require_subgraph.isPregelLike(runnable) ? [runnable] : options?.subgraphs,
				ends: options?.ends,
				defer: options?.defer
			};
			this.nodes[key] = nodeSpec;
		}
		return this;
	}
	addEdge(startKey, endKey) {
		if (typeof startKey === "string") return super.addEdge(startKey, endKey);
		if (this.compiled) console.warn("Adding an edge to a graph that has already been compiled. This will not be reflected in the compiled graph.");
		for (const start of startKey) {
			if (start === require_constants.END) throw new Error("END cannot be a start node");
			if (!Object.keys(this.nodes).some((node) => node === start)) throw new Error(`Need to add a node named "${start}" first`);
		}
		if (endKey === require_constants.END) throw new Error("END cannot be an end node");
		if (!Object.keys(this.nodes).some((node) => node === endKey)) throw new Error(`Need to add a node named "${endKey}" first`);
		this.waitingEdges.add([startKey, endKey]);
		return this;
	}
	addSequence(nodes) {
		const parsedNodes = Array.isArray(nodes) ? nodes : Object.entries(nodes);
		if (parsedNodes.length === 0) throw new Error("Sequence requires at least one node.");
		let previousNode;
		for (const [key, action, options] of parsedNodes) {
			if (key in this.nodes) throw new Error(`Node names must be unique: node with the name "${key}" already exists.`);
			const validKey = key;
			this.addNode(validKey, action, options);
			if (previousNode != null) this.addEdge(previousNode, validKey);
			previousNode = validKey;
		}
		return this;
	}
	compile({ checkpointer, store, cache, interruptBefore, interruptAfter, name, description } = {}) {
		this.validate([...Array.isArray(interruptBefore) ? interruptBefore : [], ...Array.isArray(interruptAfter) ? interruptAfter : []]);
		const outputKeys = Object.keys(this._schemaDefinitions.get(this._outputDefinition));
		const outputChannels = outputKeys.length === 1 && outputKeys[0] === ROOT ? ROOT : outputKeys;
		const streamKeys = Object.keys(this.channels);
		const streamChannels = streamKeys.length === 1 && streamKeys[0] === ROOT ? ROOT : streamKeys;
		const userInterrupt = this._interrupt;
		const compiled = new CompiledStateGraph({
			builder: this,
			checkpointer,
			interruptAfter,
			interruptBefore,
			autoValidate: false,
			nodes: {},
			channels: {
				...this.channels,
				[require_constants.START]: new require_ephemeral_value.EphemeralValue()
			},
			inputChannels: require_constants.START,
			outputChannels,
			streamChannels,
			streamMode: "updates",
			store,
			cache,
			name,
			description,
			userInterrupt
		});
		compiled.attachNode(require_constants.START);
		for (const [key, node] of Object.entries(this.nodes)) compiled.attachNode(key, node);
		compiled.attachBranch(require_constants.START, require_constants.SELF, _getControlBranch(), { withReader: false });
		for (const [key] of Object.entries(this.nodes)) compiled.attachBranch(key, require_constants.SELF, _getControlBranch(), { withReader: false });
		for (const [start, end] of this.edges) compiled.attachEdge(start, end);
		for (const [starts, end] of this.waitingEdges) compiled.attachEdge(starts, end);
		for (const [start, branches] of Object.entries(this.branches)) for (const [name, branch] of Object.entries(branches)) compiled.attachBranch(start, name, branch);
		return compiled.validate();
	}
};
function _getChannels(schema) {
	const channels = {};
	for (const [name, val] of Object.entries(schema)) if (name === ROOT) channels[name] = require_annotation.getChannel(val);
	else channels[name] = require_annotation.getChannel(val);
	return channels;
}
/**
* Final result from building and compiling a {@link StateGraph}.
* Should not be instantiated directly, only using the StateGraph `.compile()`
* instance method.
*
* @typeParam S - The full state type representing the complete shape of your graph's
*   state after all reducers have been applied. This is the type you receive when
*   reading state in nodes or after invoking the graph.
*
* @typeParam U - The update type representing what nodes can return to modify state.
*   Typically a partial of the state type, allowing nodes to update only specific fields.
*   Can also include {@link Command} objects for advanced control flow.
*
* @typeParam N - Union of all node names in the graph (e.g., `"agent" | "tool"`).
*   Used for type-safe routing with {@link Command.goto} and edge definitions.
*
* @typeParam I - The input schema definition. Determines what shape of data the graph
*   accepts when invoked. Defaults to the main state schema if not explicitly set.
*
* @typeParam O - The output schema definition. Determines what shape of data the graph
*   returns after execution. Defaults to the main state schema if not explicitly set.
*
* @typeParam C - The config/context schema definition. Defines additional configuration
*   that can be passed to the graph at runtime via {@link LangGraphRunnableConfig}.
*
* @typeParam NodeReturnType - Constrains what types nodes in this graph can return.
*   Useful for enforcing consistent return patterns across all nodes.
*
* @typeParam InterruptType - The type of values that can be passed when resuming from
*   an {@link interrupt}. Used with human-in-the-loop patterns.
*
* @typeParam WriterType - The type for custom stream writers. Used with the `writer`
*   option to enable typed custom streaming from within nodes.
*/
var CompiledStateGraph = class extends require_graph.CompiledGraph {
	/**
	* The description of the compiled graph.
	* This is used by the supervisor agent to describe the handoff to the agent.
	*/
	description;
	/** @internal */
	_metaRegistry = require_meta.schemaMetaRegistry;
	constructor({ description, ...rest }) {
		super(rest);
		this.description = description;
	}
	attachNode(key, node) {
		let outputKeys;
		if (key === require_constants.START) outputKeys = Object.entries(this.builder._schemaDefinitions.get(this.builder._inputDefinition)).map(([k]) => k);
		else outputKeys = Object.keys(this.builder.channels);
		function _getRoot(input) {
			if (require_constants.isCommand(input)) {
				if (input.graph === require_constants.Command.PARENT) return null;
				return input._updateAsTuples();
			} else if (Array.isArray(input) && input.length > 0 && input.some((i) => require_constants.isCommand(i))) {
				const updates = [];
				for (const i of input) if (require_constants.isCommand(i)) {
					if (i.graph === require_constants.Command.PARENT) continue;
					updates.push(...i._updateAsTuples());
				} else updates.push([ROOT, i]);
				return updates;
			} else if (input != null) return [[ROOT, input]];
			return null;
		}
		const nodeKey = key;
		function _getUpdates(input) {
			if (!input) return null;
			else if (require_constants.isCommand(input)) {
				if (input.graph === require_constants.Command.PARENT) return null;
				return input._updateAsTuples().filter(([k]) => outputKeys.includes(k));
			} else if (Array.isArray(input) && input.length > 0 && input.some(require_constants.isCommand)) {
				const updates = [];
				for (const item of input) if (require_constants.isCommand(item)) {
					if (item.graph === require_constants.Command.PARENT) continue;
					updates.push(...item._updateAsTuples().filter(([k]) => outputKeys.includes(k)));
				} else {
					const itemUpdates = _getUpdates(item);
					if (itemUpdates) updates.push(...itemUpdates ?? []);
				}
				return updates;
			} else if (typeof input === "object" && !Array.isArray(input)) return Object.entries(input).filter(([k]) => outputKeys.includes(k));
			else {
				const typeofInput = Array.isArray(input) ? "array" : typeof input;
				throw new require_errors.InvalidUpdateError(`Expected node "${nodeKey.toString()}" to return an object or an array containing at least one Command object, received ${typeofInput}`, { lc_error_code: "INVALID_GRAPH_NODE_RETURN_VALUE" });
			}
		}
		const stateWriteEntries = [{
			value: require_write.PASSTHROUGH,
			mapper: new require_utils.RunnableCallable({
				func: outputKeys.length && outputKeys[0] === ROOT ? _getRoot : _getUpdates,
				trace: false,
				recurse: false
			})
		}];
		if (key === require_constants.START) this.nodes[key] = new require_read.PregelNode({
			tags: [require_constants.TAG_HIDDEN],
			triggers: [require_constants.START],
			channels: [require_constants.START],
			writers: [new require_write.ChannelWrite(stateWriteEntries, [require_constants.TAG_HIDDEN])]
		});
		else {
			const inputDefinition = node?.input ?? this.builder._schemaDefinition;
			const inputValues = Object.fromEntries(Object.keys(this.builder._schemaDefinitions.get(inputDefinition)).map((k) => [k, k]));
			const isSingleInput = Object.keys(inputValues).length === 1 && ROOT in inputValues;
			const branchChannel = `branch:to:${key}`;
			this.channels[branchChannel] = node?.defer ? new require_last_value.LastValueAfterFinish() : new require_ephemeral_value.EphemeralValue(false);
			this.nodes[key] = new require_read.PregelNode({
				triggers: [branchChannel],
				channels: isSingleInput ? Object.keys(inputValues) : inputValues,
				writers: [new require_write.ChannelWrite(stateWriteEntries, [require_constants.TAG_HIDDEN])],
				mapper: isSingleInput ? void 0 : (input) => {
					return Object.fromEntries(Object.entries(input).filter(([k]) => k in inputValues));
				},
				bound: node?.runnable,
				metadata: node?.metadata,
				retryPolicy: node?.retryPolicy,
				cachePolicy: node?.cachePolicy,
				subgraphs: node?.subgraphs,
				ends: node?.ends
			});
		}
	}
	attachEdge(starts, end) {
		if (end === require_constants.END) return;
		if (typeof starts === "string") this.nodes[starts].writers.push(new require_write.ChannelWrite([{
			channel: `branch:to:${end}`,
			value: null
		}], [require_constants.TAG_HIDDEN]));
		else if (Array.isArray(starts)) {
			const channelName = `join:${starts.join("+")}:${end}`;
			this.channels[channelName] = this.builder.nodes[end].defer ? new require_named_barrier_value.NamedBarrierValueAfterFinish(new Set(starts)) : new require_named_barrier_value.NamedBarrierValue(new Set(starts));
			this.nodes[end].triggers.push(channelName);
			for (const start of starts) this.nodes[start].writers.push(new require_write.ChannelWrite([{
				channel: channelName,
				value: start
			}], [require_constants.TAG_HIDDEN]));
		}
	}
	attachBranch(start, _, branch, options = { withReader: true }) {
		const branchWriter = async (packets, config) => {
			const filteredPackets = packets.filter((p) => p !== require_constants.END);
			if (!filteredPackets.length) return;
			const writes = filteredPackets.map((p) => {
				if (require_constants._isSend(p)) return p;
				return {
					channel: p === require_constants.END ? p : `branch:to:${p}`,
					value: start
				};
			});
			await require_write.ChannelWrite.doWrite({
				...config,
				tags: (config.tags ?? []).concat([require_constants.TAG_HIDDEN])
			}, writes);
		};
		this.nodes[start].writers.push(branch.run(branchWriter, options.withReader ? (config) => require_read.ChannelRead.doRead(config, this.streamChannels ?? this.outputChannels, true) : void 0));
	}
	async _validateInput(input) {
		if (input == null) return input;
		const inputDef = this.builder._inputRuntimeDefinition;
		const schemaDef = this.builder._schemaRuntimeDefinition;
		if (require_schema.StateSchema.isInstance(inputDef)) {
			if (require_constants.isCommand(input)) {
				const parsedInput = input;
				if (input.update) parsedInput.update = await inputDef.validateInput(Array.isArray(input.update) ? Object.fromEntries(input.update) : input.update);
				return parsedInput;
			}
			return await inputDef.validateInput(input);
		}
		if (inputDef === PartialStateSchema && require_schema.StateSchema.isInstance(schemaDef)) {
			if (require_constants.isCommand(input)) {
				const parsedInput = input;
				if (input.update) parsedInput.update = await schemaDef.validateInput(Array.isArray(input.update) ? Object.fromEntries(input.update) : input.update);
				return parsedInput;
			}
			return await schemaDef.validateInput(input);
		}
		const schema = (() => {
			const apply = (schema) => {
				if (schema == null) return void 0;
				return this._metaRegistry.getExtendedChannelSchemas(schema, { withReducerSchema: true });
			};
			if ((0, _langchain_core_utils_types.isInteropZodObject)(inputDef)) return apply(inputDef);
			if (inputDef === PartialStateSchema) {
				if ((0, _langchain_core_utils_types.isInteropZodObject)(schemaDef)) return (0, _langchain_core_utils_types.interopZodObjectPartial)(apply(schemaDef));
				return;
			}
		})();
		if (require_constants.isCommand(input)) {
			const parsedInput = input;
			if (input.update && schema != null) parsedInput.update = (0, _langchain_core_utils_types.interopParse)(schema, input.update);
			return parsedInput;
		}
		if (schema != null) return (0, _langchain_core_utils_types.interopParse)(schema, input);
		return input;
	}
	isInterrupted(input) {
		return require_constants.isInterrupted(input);
	}
	async _validateContext(config) {
		const configSchema = this.builder._configRuntimeSchema;
		if ((0, _langchain_core_utils_types.isInteropZodObject)(configSchema)) (0, _langchain_core_utils_types.interopParse)(configSchema, config);
		return config;
	}
};
/**
* Check if value is a legacy StateGraphArgs with channels.
* @internal
* @deprecated Use StateGraphInit instead
*/
function isStateGraphArgs(obj) {
	return typeof obj === "object" && obj !== null && obj.channels !== void 0;
}
function _controlBranch(value) {
	if (require_constants._isSend(value)) return [value];
	const commands = [];
	if (require_constants.isCommand(value)) commands.push(value);
	else if (Array.isArray(value)) commands.push(...value.filter(require_constants.isCommand));
	const destinations = [];
	for (const command of commands) {
		if (command.graph === require_constants.Command.PARENT) throw new require_errors.ParentCommand(command);
		if (require_constants._isSend(command.goto)) destinations.push(command.goto);
		else if (typeof command.goto === "string") destinations.push(command.goto);
		else if (Array.isArray(command.goto)) destinations.push(...command.goto);
	}
	return destinations;
}
function _getControlBranch() {
	return new require_graph.Branch({ path: new require_utils.RunnableCallable({
		func: _controlBranch,
		tags: [require_constants.TAG_HIDDEN],
		trace: false,
		recurse: false,
		name: "<control_branch>"
	}) });
}

//#endregion
exports.CompiledStateGraph = CompiledStateGraph;
exports.StateGraph = StateGraph;
//# sourceMappingURL=state.cjs.map