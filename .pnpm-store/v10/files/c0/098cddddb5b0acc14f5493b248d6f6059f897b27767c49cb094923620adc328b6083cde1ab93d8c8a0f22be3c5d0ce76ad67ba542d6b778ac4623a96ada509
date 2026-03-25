import { InvalidUpdateError, ParentCommand } from "../errors.js";
import { isBaseChannel } from "../channels/base.js";
import { LastValueAfterFinish } from "../channels/last_value.js";
import { getChannel } from "./annotation.js";
import { CHECKPOINT_NAMESPACE_END, CHECKPOINT_NAMESPACE_SEPARATOR, Command, END, SELF, START, TAG_HIDDEN, _isSend, isCommand, isInterrupted } from "../constants.js";
import { RunnableCallable } from "../utils.js";
import { ChannelWrite, PASSTHROUGH } from "../pregel/write.js";
import { ChannelRead, PregelNode } from "../pregel/read.js";
import { isPregelLike } from "../pregel/utils/subgraph.js";
import { EphemeralValue } from "../channels/ephemeral_value.js";
import { Branch, CompiledGraph, Graph } from "./graph.js";
import { NamedBarrierValue, NamedBarrierValueAfterFinish } from "../channels/named_barrier_value.js";
import { schemaMetaRegistry } from "./zod/meta.js";
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
	constructor(fields, contextSchema) {
		super();
		if (isZodStateGraphArgsWithStateSchema(fields)) {
			const stateDef = this._metaRegistry.getChannelsForSchema(fields.state);
			const inputDef = fields.input != null ? this._metaRegistry.getChannelsForSchema(fields.input) : stateDef;
			const outputDef = fields.output != null ? this._metaRegistry.getChannelsForSchema(fields.output) : stateDef;
			this._schemaDefinition = stateDef;
			this._schemaRuntimeDefinition = fields.state;
			this._inputDefinition = inputDef;
			this._inputRuntimeDefinition = fields.input ?? PartialStateSchema;
			this._outputDefinition = outputDef;
			this._outputRuntimeDefinition = fields.output ?? fields.state;
		} else if (isInteropZodObject(fields)) {
			const stateDef = this._metaRegistry.getChannelsForSchema(fields);
			this._schemaDefinition = stateDef;
			this._schemaRuntimeDefinition = fields;
			this._inputDefinition = stateDef;
			this._inputRuntimeDefinition = PartialStateSchema;
			this._outputDefinition = stateDef;
			this._outputRuntimeDefinition = fields;
		} else if (isStateGraphArgsWithInputOutputSchemas(fields)) {
			this._schemaDefinition = fields.input.spec;
			this._inputDefinition = fields.input.spec;
			this._outputDefinition = fields.output.spec;
		} else if (isStateGraphArgsWithStateSchema(fields)) {
			this._schemaDefinition = fields.stateSchema.spec;
			this._inputDefinition = fields.input?.spec ?? this._schemaDefinition;
			this._outputDefinition = fields.output?.spec ?? this._schemaDefinition;
		} else if (isStateDefinition(fields) || isAnnotationRoot(fields)) {
			const spec = isAnnotationRoot(fields) ? fields.spec : fields;
			this._schemaDefinition = spec;
		} else if (isStateGraphArgs(fields)) {
			const spec = _getChannels(fields.channels);
			this._schemaDefinition = spec;
		} else throw new Error("Invalid StateGraph input. Make sure to pass a valid Annotation.Root or Zod schema.");
		this._inputDefinition ??= this._schemaDefinition;
		this._outputDefinition ??= this._schemaDefinition;
		this._addSchema(this._schemaDefinition);
		this._addSchema(this._inputDefinition);
		this._addSchema(this._outputDefinition);
		function isOptions(options) {
			return typeof options === "object" && options != null && !("spec" in options) && !isInteropZodObject(options);
		}
		if (isOptions(contextSchema)) {
			if (isInteropZodObject(contextSchema.context)) this._configRuntimeSchema = contextSchema.context;
			this._interrupt = contextSchema.interrupt;
			this._writer = contextSchema.writer;
		} else if (isInteropZodObject(contextSchema)) this._configRuntimeSchema = contextSchema;
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
				if (this.channels[key] !== channel) {
					if (channel.lc_graph_name !== "LastValue") throw new Error(`Channel "${key}" already exists with a different type.`);
				}
			} else this.channels[key] = channel;
		}
	}
	addNode(...args) {
		function isMultipleNodes(args$1) {
			return args$1.length >= 1 && typeof args$1[0] !== "string";
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
			if (options?.input !== void 0) {
				if (isInteropZodObject(options.input)) inputSpec = this._metaRegistry.getChannelsForSchema(options.input);
				else if (options.input.spec !== void 0) inputSpec = options.input.spec;
			}
			if (inputSpec !== void 0) this._addSchema(inputSpec);
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
		for (const [start, branches] of Object.entries(this.branches)) for (const [name$1, branch] of Object.entries(branches)) compiled.attachBranch(start, name$1, branch);
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
*/
var CompiledStateGraph = class extends CompiledGraph {
	/**
	* The description of the compiled graph.
	* This is used by the supervisor agent to describe the handoff to the agent.
	*/
	description;
	/** @internal */
	_metaRegistry = schemaMetaRegistry;
	constructor({ description,...rest }) {
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
		const schema = (() => {
			const input$1 = this.builder._inputRuntimeDefinition;
			const schema$1 = this.builder._schemaRuntimeDefinition;
			const apply = (schema$2) => {
				if (schema$2 == null) return void 0;
				return this._metaRegistry.getExtendedChannelSchemas(schema$2, { withReducerSchema: true });
			};
			if (isInteropZodObject(input$1)) return apply(input$1);
			if (input$1 === PartialStateSchema) return interopZodObjectPartial(apply(schema$1));
			return void 0;
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
function isStateDefinition(obj) {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj) && Object.keys(obj).length > 0 && Object.values(obj).every((v) => typeof v === "function" || isBaseChannel(v));
}
function isAnnotationRoot(obj) {
	return typeof obj === "object" && obj !== null && "lc_graph_name" in obj && obj.lc_graph_name === "AnnotationRoot";
}
function isStateGraphArgs(obj) {
	return typeof obj === "object" && obj !== null && obj.channels !== void 0;
}
function isStateGraphArgsWithStateSchema(obj) {
	return typeof obj === "object" && obj !== null && obj.stateSchema !== void 0;
}
function isStateGraphArgsWithInputOutputSchemas(obj) {
	return typeof obj === "object" && obj !== null && obj.stateSchema === void 0 && obj.input !== void 0 && obj.output !== void 0;
}
function isZodStateGraphArgsWithStateSchema(value) {
	if (typeof value !== "object" || value == null) return false;
	if (!("state" in value) || !isInteropZodObject(value.state)) return false;
	if ("input" in value && !isInteropZodObject(value.input)) return false;
	if ("output" in value && !isInteropZodObject(value.output)) return false;
	return true;
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
	const CONTROL_BRANCH_PATH = new RunnableCallable({
		func: _controlBranch,
		tags: [TAG_HIDDEN],
		trace: false,
		recurse: false,
		name: "<control_branch>"
	});
	return new Branch({ path: CONTROL_BRANCH_PATH });
}

//#endregion
export { CompiledStateGraph, StateGraph };
//# sourceMappingURL=state.js.map