const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_errors = require('../errors.cjs');
const require_base = require('../channels/base.cjs');
const require_last_value = require('../channels/last_value.cjs');
const require_annotation = require('./annotation.cjs');
const require_constants = require('../constants.cjs');
const require_utils = require('../utils.cjs');
const require_write = require('../pregel/write.cjs');
const require_read = require('../pregel/read.cjs');
const require_subgraph = require('../pregel/utils/subgraph.cjs');
const require_ephemeral_value = require('../channels/ephemeral_value.cjs');
const require_graph = require('./graph.cjs');
const require_named_barrier_value = require('../channels/named_barrier_value.cjs');
const require_meta = require('./zod/meta.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));

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
		} else if ((0, __langchain_core_utils_types.isInteropZodObject)(fields)) {
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
			return typeof options === "object" && options != null && !("spec" in options) && !(0, __langchain_core_utils_types.isInteropZodObject)(options);
		}
		if (isOptions(contextSchema)) {
			if ((0, __langchain_core_utils_types.isInteropZodObject)(contextSchema.context)) this._configRuntimeSchema = contextSchema.context;
			this._interrupt = contextSchema.interrupt;
			this._writer = contextSchema.writer;
		} else if ((0, __langchain_core_utils_types.isInteropZodObject)(contextSchema)) this._configRuntimeSchema = contextSchema;
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
			for (const reservedChar of [require_constants.CHECKPOINT_NAMESPACE_SEPARATOR, require_constants.CHECKPOINT_NAMESPACE_END]) if (key.includes(reservedChar)) throw new Error(`"${reservedChar}" is a reserved character and is not allowed in node names.`);
			this.warnIfCompiled(`Adding a node to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
			if (key in this.nodes) throw new Error(`Node \`${key}\` already present.`);
			if (key === require_constants.END || key === require_constants.START) throw new Error(`Node \`${key}\` is reserved.`);
			let inputSpec = this._schemaDefinition;
			if (options?.input !== void 0) {
				if ((0, __langchain_core_utils_types.isInteropZodObject)(options.input)) inputSpec = this._metaRegistry.getChannelsForSchema(options.input);
				else if (options.input.spec !== void 0) inputSpec = options.input.spec;
			}
			if (inputSpec !== void 0) this._addSchema(inputSpec);
			let runnable;
			if (__langchain_core_runnables.Runnable.isRunnable(action)) runnable = action;
			else if (typeof action === "function") runnable = new require_utils.RunnableCallable({
				func: action,
				name: key,
				trace: false
			});
			else runnable = (0, __langchain_core_runnables._coerceToRunnable)(action);
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
		for (const [start, branches] of Object.entries(this.branches)) for (const [name$1, branch] of Object.entries(branches)) compiled.attachBranch(start, name$1, branch);
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
*/
var CompiledStateGraph = class extends require_graph.CompiledGraph {
	/**
	* The description of the compiled graph.
	* This is used by the supervisor agent to describe the handoff to the agent.
	*/
	description;
	/** @internal */
	_metaRegistry = require_meta.schemaMetaRegistry;
	constructor({ description,...rest }) {
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
		const schema = (() => {
			const input$1 = this.builder._inputRuntimeDefinition;
			const schema$1 = this.builder._schemaRuntimeDefinition;
			const apply = (schema$2) => {
				if (schema$2 == null) return void 0;
				return this._metaRegistry.getExtendedChannelSchemas(schema$2, { withReducerSchema: true });
			};
			if ((0, __langchain_core_utils_types.isInteropZodObject)(input$1)) return apply(input$1);
			if (input$1 === PartialStateSchema) return (0, __langchain_core_utils_types.interopZodObjectPartial)(apply(schema$1));
			return void 0;
		})();
		if (require_constants.isCommand(input)) {
			const parsedInput = input;
			if (input.update && schema != null) parsedInput.update = (0, __langchain_core_utils_types.interopParse)(schema, input.update);
			return parsedInput;
		}
		if (schema != null) return (0, __langchain_core_utils_types.interopParse)(schema, input);
		return input;
	}
	isInterrupted(input) {
		return require_constants.isInterrupted(input);
	}
	async _validateContext(config) {
		const configSchema = this.builder._configRuntimeSchema;
		if ((0, __langchain_core_utils_types.isInteropZodObject)(configSchema)) (0, __langchain_core_utils_types.interopParse)(configSchema, config);
		return config;
	}
};
function isStateDefinition(obj) {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj) && Object.keys(obj).length > 0 && Object.values(obj).every((v) => typeof v === "function" || require_base.isBaseChannel(v));
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
	if (!("state" in value) || !(0, __langchain_core_utils_types.isInteropZodObject)(value.state)) return false;
	if ("input" in value && !(0, __langchain_core_utils_types.isInteropZodObject)(value.input)) return false;
	if ("output" in value && !(0, __langchain_core_utils_types.isInteropZodObject)(value.output)) return false;
	return true;
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
	const CONTROL_BRANCH_PATH = new require_utils.RunnableCallable({
		func: _controlBranch,
		tags: [require_constants.TAG_HIDDEN],
		trace: false,
		recurse: false,
		name: "<control_branch>"
	});
	return new require_graph.Branch({ path: CONTROL_BRANCH_PATH });
}

//#endregion
exports.CompiledStateGraph = CompiledStateGraph;
exports.StateGraph = StateGraph;
//# sourceMappingURL=state.cjs.map