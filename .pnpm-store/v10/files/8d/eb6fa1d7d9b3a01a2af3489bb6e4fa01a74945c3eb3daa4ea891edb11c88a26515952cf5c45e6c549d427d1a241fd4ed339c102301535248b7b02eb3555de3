import { CHECKPOINT_NAMESPACE_END, CHECKPOINT_NAMESPACE_SEPARATOR, Command, END, SELF, START, TAG_HIDDEN, _isSend, isCommand, isInterrupted } from "../constants.js";
import { InvalidUpdateError, ParentCommand, StateGraphInputError } from "../errors.js";
import { LastValueAfterFinish } from "../channels/last_value.js";
import { AnnotationRoot, getChannel } from "./annotation.js";
import { RunnableCallable } from "../utils.js";
import { ChannelWrite, PASSTHROUGH } from "../pregel/write.js";
import { ChannelRead, PregelNode } from "../pregel/read.js";
import { isPregelLike } from "../pregel/utils/subgraph.js";
import { EphemeralValue } from "../channels/ephemeral_value.js";
import { Branch, CompiledGraph, Graph } from "./graph.js";
import { NamedBarrierValue, NamedBarrierValueAfterFinish } from "../channels/named_barrier_value.js";
import { StateSchema } from "../state/schema.js";
import "../state/index.js";
import { schemaMetaRegistry } from "./zod/meta.js";
import { isStateDefinitionInit, isStateGraphInit } from "./types.js";
import { Runnable, _coerceToRunnable } from "@langchain/core/runnables";
import { interopParse, interopZodObjectPartial, isInteropZodObject } from "@langchain/core/utils/types";

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
var StateGraph = class extends Graph {
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
	_metaRegistry = schemaMetaRegistry;
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
		if (!stateSchema) throw new StateGraphInputError();
		const stateChannelDef = this._getChannelsFromSchema(stateSchema);
		this._schemaDefinition = stateChannelDef;
		if (StateSchema.isInstance(stateSchema)) this._schemaRuntimeDefinition = stateSchema;
		else if (isInteropZodObject(stateSchema)) this._schemaRuntimeDefinition = stateSchema;
		if (init.input) if (StateSchema.isInstance(init.input)) this._inputRuntimeDefinition = init.input;
		else if (isInteropZodObject(init.input)) this._inputRuntimeDefinition = init.input;
		else this._inputRuntimeDefinition = PartialStateSchema;
		else this._inputRuntimeDefinition = PartialStateSchema;
		if (init.output) if (StateSchema.isInstance(init.output)) this._outputRuntimeDefinition = init.output;
		else if (isInteropZodObject(init.output)) this._outputRuntimeDefinition = init.output;
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
			if (isInteropZodObject(init.context)) this._configRuntimeSchema = init.context;
		}
		this._interrupt = init.interrupt;
		this._writer = init.writer;
	}
	/**
	* Normalize all constructor input patterns to a unified StateGraphInit object.
	* @internal
	*/
	_normalizeToStateGraphInit(stateOrInit, options) {
		if (isStateGraphInit(stateOrInit)) {
			if (isInteropZodObject(options) || AnnotationRoot.isInstance(options)) return {
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
		if (isStateDefinitionInit(stateOrInit)) {
			if (isInteropZodObject(options) || AnnotationRoot.isInstance(options)) return {
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
		throw new StateGraphInputError();
	}
	/**
	* Convert any supported schema type to a StateDefinition (channel map).
	* @internal
	*/
	_getChannelsFromSchema(schema) {
		if (StateSchema.isInstance(schema)) return schema.getChannels();
		if (isInteropZodObject(schema)) return this._metaRegistry.getChannelsForSchema(schema);
		if (typeof schema === "object" && "lc_graph_name" in schema && schema.lc_graph_name === "AnnotationRoot") return schema.spec;
		if (typeof schema === "object" && !Array.isArray(schema) && Object.keys(schema).length > 0) return schema;
		throw new StateGraphInputError("Invalid schema type. Expected StateSchema, Zod object, AnnotationRoot, or StateDefinition.");
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
			for (const reservedChar of [CHECKPOINT_NAMESPACE_SEPARATOR, CHECKPOINT_NAMESPACE_END]) if (key.includes(reservedChar)) throw new Error(`"${reservedChar}" is a reserved character and is not allowed in node names.`);
			this.warnIfCompiled(`Adding a node to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
			if (key in this.nodes) throw new Error(`Node \`${key}\` already present.`);
			if (key === END || key === START) throw new Error(`Node \`${key}\` is reserved.`);
			let inputSpec = this._schemaDefinition;
			if (options?.input !== void 0) inputSpec = this._getChannelsFromSchema(options.input);
			this._addSchema(inputSpec);
			let runnable;
			if (Runnable.isRunnable(action)) runnable = action;
			else if (typeof action === "function") runnable = new RunnableCallable({
				func: action,
				name: key,
				trace: false
			});
			else runnable = _coerceToRunnable(action);
			let cachePolicy = options?.cachePolicy;
			if (typeof cachePolicy === "boolean") cachePolicy = cachePolicy ? {} : void 0;
			const nodeSpec = {
				runnable,
				retryPolicy: options?.retryPolicy,
				cachePolicy,
				metadata: options?.metadata,
				input: inputSpec ?? this._schemaDefinition,
				subgraphs: isPregelLike(runnable) ? [runnable] : options?.subgraphs,
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
			if (start === END) throw new Error("END cannot be a start node");
			if (!Object.keys(this.nodes).some((node) => node === start)) throw new Error(`Need to add a node named "${start}" first`);
		}
		if (endKey === END) throw new Error("END cannot be an end node");
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
				[START]: new EphemeralValue()
			},
			inputChannels: START,
			outputChannels,
			streamChannels,
			streamMode: "updates",
			store,
			cache,
			name,
			description,
			userInterrupt
		});
		compiled.attachNode(START);
		for (const [key, node] of Object.entries(this.nodes)) compiled.attachNode(key, node);
		compiled.attachBranch(START, SELF, _getControlBranch(), { withReader: false });
		for (const [key] of Object.entries(this.nodes)) compiled.attachBranch(key, SELF, _getControlBranch(), { withReader: false });
		for (const [start, end] of this.edges) compiled.attachEdge(start, end);
		for (const [starts, end] of this.waitingEdges) compiled.attachEdge(starts, end);
		for (const [start, branches] of Object.entries(this.branches)) for (const [name, branch] of Object.entries(branches)) compiled.attachBranch(start, name, branch);
		return compiled.validate();
	}
};
function _getChannels(schema) {
	const channels = {};
	for (const [name, val] of Object.entries(schema)) if (name === ROOT) channels[name] = getChannel(val);
	else channels[name] = getChannel(val);
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
var CompiledStateGraph = class extends CompiledGraph {
	/**
	* The description of the compiled graph.
	* This is used by the supervisor agent to describe the handoff to the agent.
	*/
	description;
	/** @internal */
	_metaRegistry = schemaMetaRegistry;
	constructor({ description, ...rest }) {
		super(rest);
		this.description = description;
	}
	attachNode(key, node) {
		let outputKeys;
		if (key === START) outputKeys = Object.entries(this.builder._schemaDefinitions.get(this.builder._inputDefinition)).map(([k]) => k);
		else outputKeys = Object.keys(this.builder.channels);
		function _getRoot(input) {
			if (isCommand(input)) {
				if (input.graph === Command.PARENT) return null;
				return input._updateAsTuples();
			} else if (Array.isArray(input) && input.length > 0 && input.some((i) => isCommand(i))) {
				const updates = [];
				for (const i of input) if (isCommand(i)) {
					if (i.graph === Command.PARENT) continue;
					updates.push(...i._updateAsTuples());
				} else updates.push([ROOT, i]);
				return updates;
			} else if (input != null) return [[ROOT, input]];
			return null;
		}
		const nodeKey = key;
		function _getUpdates(input) {
			if (!input) return null;
			else if (isCommand(input)) {
				if (input.graph === Command.PARENT) return null;
				return input._updateAsTuples().filter(([k]) => outputKeys.includes(k));
			} else if (Array.isArray(input) && input.length > 0 && input.some(isCommand)) {
				const updates = [];
				for (const item of input) if (isCommand(item)) {
					if (item.graph === Command.PARENT) continue;
					updates.push(...item._updateAsTuples().filter(([k]) => outputKeys.includes(k)));
				} else {
					const itemUpdates = _getUpdates(item);
					if (itemUpdates) updates.push(...itemUpdates ?? []);
				}
				return updates;
			} else if (typeof input === "object" && !Array.isArray(input)) return Object.entries(input).filter(([k]) => outputKeys.includes(k));
			else {
				const typeofInput = Array.isArray(input) ? "array" : typeof input;
				throw new InvalidUpdateError(`Expected node "${nodeKey.toString()}" to return an object or an array containing at least one Command object, received ${typeofInput}`, { lc_error_code: "INVALID_GRAPH_NODE_RETURN_VALUE" });
			}
		}
		const stateWriteEntries = [{
			value: PASSTHROUGH,
			mapper: new RunnableCallable({
				func: outputKeys.length && outputKeys[0] === ROOT ? _getRoot : _getUpdates,
				trace: false,
				recurse: false
			})
		}];
		if (key === START) this.nodes[key] = new PregelNode({
			tags: [TAG_HIDDEN],
			triggers: [START],
			channels: [START],
			writers: [new ChannelWrite(stateWriteEntries, [TAG_HIDDEN])]
		});
		else {
			const inputDefinition = node?.input ?? this.builder._schemaDefinition;
			const inputValues = Object.fromEntries(Object.keys(this.builder._schemaDefinitions.get(inputDefinition)).map((k) => [k, k]));
			const isSingleInput = Object.keys(inputValues).length === 1 && ROOT in inputValues;
			const branchChannel = `branch:to:${key}`;
			this.channels[branchChannel] = node?.defer ? new LastValueAfterFinish() : new EphemeralValue(false);
			this.nodes[key] = new PregelNode({
				triggers: [branchChannel],
				channels: isSingleInput ? Object.keys(inputValues) : inputValues,
				writers: [new ChannelWrite(stateWriteEntries, [TAG_HIDDEN])],
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
		if (end === END) return;
		if (typeof starts === "string") this.nodes[starts].writers.push(new ChannelWrite([{
			channel: `branch:to:${end}`,
			value: null
		}], [TAG_HIDDEN]));
		else if (Array.isArray(starts)) {
			const channelName = `join:${starts.join("+")}:${end}`;
			this.channels[channelName] = this.builder.nodes[end].defer ? new NamedBarrierValueAfterFinish(new Set(starts)) : new NamedBarrierValue(new Set(starts));
			this.nodes[end].triggers.push(channelName);
			for (const start of starts) this.nodes[start].writers.push(new ChannelWrite([{
				channel: channelName,
				value: start
			}], [TAG_HIDDEN]));
		}
	}
	attachBranch(start, _, branch, options = { withReader: true }) {
		const branchWriter = async (packets, config) => {
			const filteredPackets = packets.filter((p) => p !== END);
			if (!filteredPackets.length) return;
			const writes = filteredPackets.map((p) => {
				if (_isSend(p)) return p;
				return {
					channel: p === END ? p : `branch:to:${p}`,
					value: start
				};
			});
			await ChannelWrite.doWrite({
				...config,
				tags: (config.tags ?? []).concat([TAG_HIDDEN])
			}, writes);
		};
		this.nodes[start].writers.push(branch.run(branchWriter, options.withReader ? (config) => ChannelRead.doRead(config, this.streamChannels ?? this.outputChannels, true) : void 0));
	}
	async _validateInput(input) {
		if (input == null) return input;
		const inputDef = this.builder._inputRuntimeDefinition;
		const schemaDef = this.builder._schemaRuntimeDefinition;
		if (StateSchema.isInstance(inputDef)) {
			if (isCommand(input)) {
				const parsedInput = input;
				if (input.update) parsedInput.update = await inputDef.validateInput(Array.isArray(input.update) ? Object.fromEntries(input.update) : input.update);
				return parsedInput;
			}
			return await inputDef.validateInput(input);
		}
		if (inputDef === PartialStateSchema && StateSchema.isInstance(schemaDef)) {
			if (isCommand(input)) {
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
			if (isInteropZodObject(inputDef)) return apply(inputDef);
			if (inputDef === PartialStateSchema) {
				if (isInteropZodObject(schemaDef)) return interopZodObjectPartial(apply(schemaDef));
				return;
			}
		})();
		if (isCommand(input)) {
			const parsedInput = input;
			if (input.update && schema != null) parsedInput.update = interopParse(schema, input.update);
			return parsedInput;
		}
		if (schema != null) return interopParse(schema, input);
		return input;
	}
	isInterrupted(input) {
		return isInterrupted(input);
	}
	async _validateContext(config) {
		const configSchema = this.builder._configRuntimeSchema;
		if (isInteropZodObject(configSchema)) interopParse(configSchema, config);
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
	if (_isSend(value)) return [value];
	const commands = [];
	if (isCommand(value)) commands.push(value);
	else if (Array.isArray(value)) commands.push(...value.filter(isCommand));
	const destinations = [];
	for (const command of commands) {
		if (command.graph === Command.PARENT) throw new ParentCommand(command);
		if (_isSend(command.goto)) destinations.push(command.goto);
		else if (typeof command.goto === "string") destinations.push(command.goto);
		else if (Array.isArray(command.goto)) destinations.push(...command.goto);
	}
	return destinations;
}
function _getControlBranch() {
	return new Branch({ path: new RunnableCallable({
		func: _controlBranch,
		tags: [TAG_HIDDEN],
		trace: false,
		recurse: false,
		name: "<control_branch>"
	}) });
}

//#endregion
export { CompiledStateGraph, StateGraph };
//# sourceMappingURL=state.js.map