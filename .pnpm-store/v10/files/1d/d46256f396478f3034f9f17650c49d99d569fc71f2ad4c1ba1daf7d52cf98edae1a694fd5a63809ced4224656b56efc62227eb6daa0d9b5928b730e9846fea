import { GraphInterrupt, RemoteException } from "../errors.js";
import { CHECKPOINT_NAMESPACE_SEPARATOR, CONFIG_KEY_STREAM, INTERRUPT, isCommand } from "../constants.js";
import "../web.js";
import { Runnable, mergeConfigs } from "@langchain/core/runnables";
import { Graph } from "@langchain/core/runnables/graph";
import { isBaseMessage } from "@langchain/core/messages";
import { Client } from "@langchain/langgraph-sdk";

//#region src/pregel/remote.ts
const _serializeInputs = (obj) => {
	if (obj === null || typeof obj !== "object") return obj;
	if (Array.isArray(obj)) return obj.map(_serializeInputs);
	if (isBaseMessage(obj)) {
		const dict = obj.toDict();
		return {
			...dict.data,
			role: obj.getType()
		};
	}
	return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, _serializeInputs(value)]));
};
/**
* Return a tuple of the final list of stream modes sent to the
* remote graph and a boolean flag indicating if only one stream mode was
* originally requested and whether stream mode 'updates'
* was present in the original list of stream modes.
*
* 'updates' mode is always added to the list of stream modes so that interrupts
* can be detected in the remote graph.
*/
const getStreamModes = (streamMode, defaultStreamMode = "updates") => {
	const updatedStreamModes = [];
	let reqUpdates = false;
	let reqSingle = true;
	if (streamMode !== void 0 && (typeof streamMode === "string" || Array.isArray(streamMode) && streamMode.length > 0)) {
		reqSingle = typeof streamMode === "string";
		const mapped = Array.isArray(streamMode) ? streamMode : [streamMode];
		updatedStreamModes.push(...mapped);
	} else updatedStreamModes.push(defaultStreamMode);
	if (updatedStreamModes.includes("updates")) reqUpdates = true;
	else updatedStreamModes.push("updates");
	return {
		updatedStreamModes,
		reqUpdates,
		reqSingle
	};
};
/**
* The `RemoteGraph` class is a client implementation for calling remote
* APIs that implement the LangGraph Server API specification.
*
* For example, the `RemoteGraph` class can be used to call APIs from deployments
* on LangGraph Cloud.
*
* `RemoteGraph` behaves the same way as a `StateGraph` and can be used directly as
* a node in another `StateGraph`.
*
* @example
* ```ts
* import { RemoteGraph } from "@langchain/langgraph/remote";
*
* // Can also pass a LangGraph SDK client instance directly
* const remoteGraph = new RemoteGraph({
*   graphId: process.env.LANGGRAPH_REMOTE_GRAPH_ID!,
*   apiKey: process.env.LANGGRAPH_REMOTE_GRAPH_API_KEY,
*   url: process.env.LANGGRAPH_REMOTE_GRAPH_API_URL,
* });
*
* const input = {
*   messages: [
*     {
*       role: "human",
*       content: "Hello world!",
*     },
*   ],
* };
*
* const config = {
*   configurable: { thread_id: "threadId1" },
* };
*
* await remoteGraph.invoke(input, config);
* ```
*/
var RemoteGraph = class extends Runnable {
	static lc_name() {
		return "RemoteGraph";
	}
	lc_namespace = ["langgraph", "pregel"];
	lg_is_pregel = true;
	config;
	graphId;
	client;
	interruptBefore;
	interruptAfter;
	constructor(params) {
		super(params);
		this.graphId = params.graphId;
		this.client = params.client ?? new Client({
			apiUrl: params.url,
			apiKey: params.apiKey,
			defaultHeaders: params.headers
		});
		this.config = params.config;
		this.interruptBefore = params.interruptBefore;
		this.interruptAfter = params.interruptAfter;
	}
	withConfig(config) {
		const mergedConfig = mergeConfigs(this.config, config);
		return new this.constructor({
			...this,
			config: mergedConfig
		});
	}
	_sanitizeConfig(config) {
		const reservedConfigurableKeys = new Set([
			"callbacks",
			"checkpoint_map",
			"checkpoint_id",
			"checkpoint_ns"
		]);
		const sanitizeObj = (obj) => {
			try {
				JSON.stringify(obj);
				return obj;
			} catch {
				const seen = /* @__PURE__ */ new WeakSet();
				return JSON.parse(JSON.stringify(obj, (_, value) => {
					if (typeof value === "object" && value != null) {
						if (seen.has(value)) return "[Circular]";
						seen.add(value);
					}
					if (typeof value === "bigint") return value.toString();
					return value;
				}));
			}
		};
		const sanitizedConfig = sanitizeObj(config);
		const newConfigurable = Object.fromEntries(Object.entries(sanitizedConfig.configurable ?? {}).filter(([k]) => !reservedConfigurableKeys.has(k) && !k.startsWith("__pregel_")));
		return {
			tags: sanitizedConfig.tags ?? [],
			metadata: sanitizedConfig.metadata ?? {},
			configurable: newConfigurable,
			recursion_limit: sanitizedConfig.recursionLimit
		};
	}
	_getConfig(checkpoint) {
		return { configurable: {
			thread_id: checkpoint.thread_id,
			checkpoint_ns: checkpoint.checkpoint_ns,
			checkpoint_id: checkpoint.checkpoint_id,
			checkpoint_map: checkpoint.checkpoint_map ?? {}
		} };
	}
	_getCheckpoint(config) {
		if (config?.configurable === void 0) return void 0;
		const checkpointKeys = [
			"thread_id",
			"checkpoint_ns",
			"checkpoint_id",
			"checkpoint_map"
		];
		const checkpoint = Object.fromEntries(checkpointKeys.map((key) => [key, config.configurable[key]]).filter(([_, value]) => value !== void 0));
		return Object.keys(checkpoint).length > 0 ? checkpoint : void 0;
	}
	_createStateSnapshot(state) {
		const tasks = state.tasks.map((task) => {
			return {
				id: task.id,
				name: task.name,
				error: task.error ? { message: task.error } : void 0,
				interrupts: task.interrupts.map(({ id,...rest }) => ({
					interrupt_id: id,
					...rest
				})),
				state: task.state ? this._createStateSnapshot(task.state) : task.checkpoint ? { configurable: task.checkpoint } : void 0,
				result: task.result
			};
		});
		return {
			values: state.values,
			next: state.next ? [...state.next] : [],
			config: { configurable: {
				thread_id: state.checkpoint.thread_id,
				checkpoint_ns: state.checkpoint.checkpoint_ns,
				checkpoint_id: state.checkpoint.checkpoint_id,
				checkpoint_map: state.checkpoint.checkpoint_map ?? {}
			} },
			metadata: state.metadata ? state.metadata : void 0,
			createdAt: state.created_at ?? void 0,
			parentConfig: state.parent_checkpoint ? { configurable: {
				thread_id: state.parent_checkpoint.thread_id,
				checkpoint_ns: state.parent_checkpoint.checkpoint_ns,
				checkpoint_id: state.parent_checkpoint.checkpoint_id,
				checkpoint_map: state.parent_checkpoint.checkpoint_map ?? {}
			} } : void 0,
			tasks
		};
	}
	async invoke(input, options) {
		let lastValue;
		const stream = await this.stream(input, {
			...options,
			streamMode: "values"
		});
		for await (const chunk of stream) lastValue = chunk;
		return lastValue;
	}
	streamEvents(_input, _options) {
		throw new Error("Not implemented.");
	}
	async *_streamIterator(input, options) {
		const mergedConfig = mergeConfigs(this.config, options);
		const sanitizedConfig = this._sanitizeConfig(mergedConfig);
		const streamProtocolInstance = options?.configurable?.[CONFIG_KEY_STREAM];
		const streamSubgraphs = options?.subgraphs ?? streamProtocolInstance !== void 0;
		const interruptBefore = options?.interruptBefore ?? this.interruptBefore;
		const interruptAfter = options?.interruptAfter ?? this.interruptAfter;
		const { updatedStreamModes, reqSingle, reqUpdates } = getStreamModes(options?.streamMode);
		const extendedStreamModes = [...new Set([...updatedStreamModes, ...streamProtocolInstance?.modes ?? /* @__PURE__ */ new Set()])].map((mode) => {
			if (mode === "messages") return "messages-tuple";
			return mode;
		});
		let command;
		let serializedInput;
		if (isCommand(input)) {
			command = input.toJSON();
			serializedInput = void 0;
		} else serializedInput = _serializeInputs(input);
		for await (const chunk of this.client.runs.stream(sanitizedConfig.configurable.thread_id, this.graphId, {
			command,
			input: serializedInput,
			config: sanitizedConfig,
			streamMode: extendedStreamModes,
			interruptBefore,
			interruptAfter,
			streamSubgraphs,
			ifNotExists: "create",
			signal: mergedConfig.signal
		})) {
			let mode;
			let namespace;
			if (chunk.event.includes(CHECKPOINT_NAMESPACE_SEPARATOR)) {
				const eventComponents = chunk.event.split(CHECKPOINT_NAMESPACE_SEPARATOR);
				mode = eventComponents[0];
				namespace = eventComponents.slice(1);
			} else {
				mode = chunk.event;
				namespace = [];
			}
			const callerNamespace = options?.configurable?.checkpoint_ns;
			if (typeof callerNamespace === "string") namespace = callerNamespace.split(CHECKPOINT_NAMESPACE_SEPARATOR).concat(namespace);
			if (streamProtocolInstance !== void 0 && streamProtocolInstance.modes?.has(chunk.event)) streamProtocolInstance.push([
				namespace,
				mode,
				chunk.data
			]);
			if (chunk.event.startsWith("updates")) {
				if (typeof chunk.data === "object" && chunk.data?.[INTERRUPT] !== void 0) throw new GraphInterrupt(chunk.data[INTERRUPT]);
				if (!reqUpdates) continue;
			} else if (chunk.event?.startsWith("error")) throw new RemoteException(typeof chunk.data === "string" ? chunk.data : JSON.stringify(chunk.data));
			if (!updatedStreamModes.includes(chunk.event.split(CHECKPOINT_NAMESPACE_SEPARATOR)[0])) continue;
			if (options?.subgraphs) if (reqSingle) yield [namespace, chunk.data];
			else yield [
				namespace,
				mode,
				chunk.data
			];
			else if (reqSingle) yield chunk.data;
			else yield [mode, chunk.data];
		}
	}
	async updateState(inputConfig, values, asNode) {
		const mergedConfig = mergeConfigs(this.config, inputConfig);
		const response = await this.client.threads.updateState(mergedConfig.configurable?.thread_id, {
			values,
			asNode,
			checkpoint: this._getCheckpoint(mergedConfig)
		});
		return this._getConfig(response.checkpoint);
	}
	async *getStateHistory(config, options) {
		const mergedConfig = mergeConfigs(this.config, config);
		const states = await this.client.threads.getHistory(mergedConfig.configurable?.thread_id, {
			limit: options?.limit ?? 10,
			before: this._getCheckpoint(options?.before),
			metadata: options?.filter,
			checkpoint: this._getCheckpoint(mergedConfig)
		});
		for (const state of states) yield this._createStateSnapshot(state);
	}
	_getDrawableNodes(nodes) {
		const nodesMap = {};
		for (const node of nodes) {
			const nodeId = node.id;
			nodesMap[nodeId] = {
				id: nodeId.toString(),
				name: typeof node.data === "string" ? node.data : node.data?.name ?? "",
				data: node.data ?? {},
				metadata: typeof node.data !== "string" ? node.data?.metadata ?? {} : {}
			};
		}
		return nodesMap;
	}
	async getState(config, options) {
		const mergedConfig = mergeConfigs(this.config, config);
		const state = await this.client.threads.getState(mergedConfig.configurable?.thread_id, this._getCheckpoint(mergedConfig), options);
		return this._createStateSnapshot(state);
	}
	/** @deprecated Use getGraphAsync instead. The async method will become the default in the next minor release. */
	getGraph(_) {
		throw new Error(`The synchronous "getGraph" is not supported for this graph. Call "getGraphAsync" instead.`);
	}
	/**
	* Returns a drawable representation of the computation graph.
	*/
	async getGraphAsync(config) {
		const graph = await this.client.assistants.getGraph(this.graphId, { xray: config?.xray });
		return new Graph({
			nodes: this._getDrawableNodes(graph.nodes),
			edges: graph.edges
		});
	}
	/** @deprecated Use getSubgraphsAsync instead. The async method will become the default in the next minor release. */
	getSubgraphs() {
		throw new Error(`The synchronous "getSubgraphs" method is not supported for this graph. Call "getSubgraphsAsync" instead.`);
	}
	async *getSubgraphsAsync(namespace, recurse = false) {
		const subgraphs = await this.client.assistants.getSubgraphs(this.graphId, {
			namespace,
			recurse
		});
		for (const [ns, graphSchema] of Object.entries(subgraphs)) {
			const remoteSubgraph = new this.constructor({
				...this,
				graphId: graphSchema.graph_id
			});
			yield [ns, remoteSubgraph];
		}
	}
};

//#endregion
export { RemoteGraph };
//# sourceMappingURL=remote.js.map