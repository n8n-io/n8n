const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_errors = require('../errors.cjs');
const require_constants = require('../constants.cjs');
const require_utils = require('../utils.cjs');
const require_write = require('../pregel/write.cjs');
const require_read = require('../pregel/read.cjs');
const require_subgraph = require('../pregel/utils/subgraph.cjs');
const require_pregel_index = require('../pregel/index.cjs');
const require_ephemeral_value = require('../channels/ephemeral_value.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_runnables_graph = require_rolldown_runtime.__toESM(require("@langchain/core/runnables/graph"));
const zod_v4 = require_rolldown_runtime.__toESM(require("zod/v4"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));

//#region src/graph/graph.ts
var Branch = class {
	path;
	ends;
	constructor(options) {
		if (__langchain_core_runnables.Runnable.isRunnable(options.path)) this.path = options.path;
		else this.path = (0, __langchain_core_runnables._coerceToRunnable)(options.path).withConfig({ runName: `Branch` });
		this.ends = Array.isArray(options.pathMap) ? options.pathMap.reduce((acc, n) => {
			acc[n] = n;
			return acc;
		}, {}) : options.pathMap;
	}
	run(writer, reader) {
		return require_write.ChannelWrite.registerWriter(new require_utils.RunnableCallable({
			name: "<branch_run>",
			trace: false,
			func: async (input, config) => {
				try {
					return await this._route(input, config, writer, reader);
				} catch (e) {
					if (e.name === require_errors.NodeInterrupt.unminifiable_name) console.warn("[WARN]: 'NodeInterrupt' thrown in conditional edge. This is likely a bug in your graph implementation.\nNodeInterrupt should only be thrown inside a node, not in edge conditions.");
					throw e;
				}
			}
		}));
	}
	async _route(input, config, writer, reader) {
		let result = await this.path.invoke(reader ? reader(config) : input, config);
		if (!Array.isArray(result)) result = [result];
		let destinations;
		if (this.ends) destinations = result.map((r) => require_constants._isSend(r) ? r : this.ends[r]);
		else destinations = result;
		if (destinations.some((dest) => !dest)) throw new Error("Branch condition returned unknown or null destination");
		if (destinations.filter(require_constants._isSend).some((packet) => packet.node === require_constants.END)) throw new require_errors.InvalidUpdateError("Cannot send a packet to the END node");
		const writeResult = await writer(destinations, config);
		return writeResult ?? input;
	}
};
var Graph = class {
	nodes;
	edges;
	branches;
	entryPoint;
	compiled = false;
	constructor() {
		this.nodes = {};
		this.edges = /* @__PURE__ */ new Set();
		this.branches = {};
	}
	warnIfCompiled(message) {
		if (this.compiled) console.warn(message);
	}
	get allEdges() {
		return this.edges;
	}
	addNode(...args) {
		function isMutlipleNodes(args$1) {
			return args$1.length >= 1 && typeof args$1[0] !== "string";
		}
		const nodes = isMutlipleNodes(args) ? Array.isArray(args[0]) ? args[0] : Object.entries(args[0]) : [[
			args[0],
			args[1],
			args[2]
		]];
		if (nodes.length === 0) throw new Error("No nodes provided in `addNode`");
		for (const [key, action, options] of nodes) {
			for (const reservedChar of [require_constants.CHECKPOINT_NAMESPACE_SEPARATOR, require_constants.CHECKPOINT_NAMESPACE_END]) if (key.includes(reservedChar)) throw new Error(`"${reservedChar}" is a reserved character and is not allowed in node names.`);
			this.warnIfCompiled(`Adding a node to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
			if (key in this.nodes) throw new Error(`Node \`${key}\` already present.`);
			if (key === require_constants.END) throw new Error(`Node \`${key}\` is reserved.`);
			const runnable = (0, __langchain_core_runnables._coerceToRunnable)(action);
			this.nodes[key] = {
				runnable,
				metadata: options?.metadata,
				subgraphs: require_subgraph.isPregelLike(runnable) ? [runnable] : options?.subgraphs,
				ends: options?.ends
			};
		}
		return this;
	}
	addEdge(startKey, endKey) {
		this.warnIfCompiled(`Adding an edge to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
		if (startKey === require_constants.END) throw new Error("END cannot be a start node");
		if (endKey === require_constants.START) throw new Error("START cannot be an end node");
		if (Array.from(this.edges).some(([start]) => start === startKey) && !("channels" in this)) throw new Error(`Already found path for ${startKey}. For multiple edges, use StateGraph.`);
		this.edges.add([startKey, endKey]);
		return this;
	}
	addConditionalEdges(source, path, pathMap) {
		const options = typeof source === "object" ? source : {
			source,
			path,
			pathMap
		};
		this.warnIfCompiled("Adding an edge to a graph that has already been compiled. This will not be reflected in the compiled graph.");
		if (!__langchain_core_runnables.Runnable.isRunnable(options.path)) {
			const pathDisplayValues = Array.isArray(options.pathMap) ? options.pathMap.join(",") : Object.keys(options.pathMap ?? {}).join(",");
			options.path = (0, __langchain_core_runnables._coerceToRunnable)(options.path).withConfig({ runName: `Branch<${options.source}${pathDisplayValues !== "" ? `,${pathDisplayValues}` : ""}>`.slice(0, 63) });
		}
		const name = options.path.getName() === "RunnableLambda" ? "condition" : options.path.getName();
		if (this.branches[options.source] && this.branches[options.source][name]) throw new Error(`Condition \`${name}\` already present for node \`${source}\``);
		this.branches[options.source] ??= {};
		this.branches[options.source][name] = new Branch(options);
		return this;
	}
	/**
	* @deprecated use `addEdge(START, key)` instead
	*/
	setEntryPoint(key) {
		this.warnIfCompiled("Setting the entry point of a graph that has already been compiled. This will not be reflected in the compiled graph.");
		return this.addEdge(require_constants.START, key);
	}
	/**
	* @deprecated use `addEdge(key, END)` instead
	*/
	setFinishPoint(key) {
		this.warnIfCompiled("Setting a finish point of a graph that has already been compiled. This will not be reflected in the compiled graph.");
		return this.addEdge(key, require_constants.END);
	}
	compile({ checkpointer, interruptBefore, interruptAfter, name } = {}) {
		this.validate([...Array.isArray(interruptBefore) ? interruptBefore : [], ...Array.isArray(interruptAfter) ? interruptAfter : []]);
		const compiled = new CompiledGraph({
			builder: this,
			checkpointer,
			interruptAfter,
			interruptBefore,
			autoValidate: false,
			nodes: {},
			channels: {
				[require_constants.START]: new require_ephemeral_value.EphemeralValue(),
				[require_constants.END]: new require_ephemeral_value.EphemeralValue()
			},
			inputChannels: require_constants.START,
			outputChannels: require_constants.END,
			streamChannels: [],
			streamMode: "values",
			name
		});
		for (const [key, node] of Object.entries(this.nodes)) compiled.attachNode(key, node);
		for (const [start, end] of this.edges) compiled.attachEdge(start, end);
		for (const [start, branches] of Object.entries(this.branches)) for (const [name$1, branch] of Object.entries(branches)) compiled.attachBranch(start, name$1, branch);
		return compiled.validate();
	}
	validate(interrupt) {
		const allSources = new Set([...this.allEdges].map(([src, _]) => src));
		for (const [start] of Object.entries(this.branches)) allSources.add(start);
		for (const source of allSources) if (source !== require_constants.START && !(source in this.nodes)) throw new Error(`Found edge starting at unknown node \`${source}\``);
		const allTargets = new Set([...this.allEdges].map(([_, target]) => target));
		for (const [start, branches] of Object.entries(this.branches)) for (const branch of Object.values(branches)) if (branch.ends != null) for (const end of Object.values(branch.ends)) allTargets.add(end);
		else {
			allTargets.add(require_constants.END);
			for (const node of Object.keys(this.nodes)) if (node !== start) allTargets.add(node);
		}
		for (const node of Object.values(this.nodes)) for (const target of node.ends ?? []) allTargets.add(target);
		for (const node of Object.keys(this.nodes)) if (!allTargets.has(node)) throw new require_errors.UnreachableNodeError([
			`Node \`${node}\` is not reachable.`,
			"",
			"If you are returning Command objects from your node,",
			"make sure you are passing names of potential destination nodes as an \"ends\" array",
			"into \".addNode(..., { ends: [\"node1\", \"node2\"] })\"."
		].join("\n"), { lc_error_code: "UNREACHABLE_NODE" });
		for (const target of allTargets) if (target !== require_constants.END && !(target in this.nodes)) throw new Error(`Found edge ending at unknown node \`${target}\``);
		if (interrupt) {
			for (const node of interrupt) if (!(node in this.nodes)) throw new Error(`Interrupt node \`${node}\` is not present`);
		}
		this.compiled = true;
	}
};
var CompiledGraph = class extends require_pregel_index.Pregel {
	builder;
	constructor({ builder,...rest }) {
		super(rest);
		this.builder = builder;
	}
	attachNode(key, node) {
		this.channels[key] = new require_ephemeral_value.EphemeralValue();
		this.nodes[key] = new require_read.PregelNode({
			channels: [],
			triggers: [],
			metadata: node.metadata,
			subgraphs: node.subgraphs,
			ends: node.ends
		}).pipe(node.runnable).pipe(new require_write.ChannelWrite([{
			channel: key,
			value: require_write.PASSTHROUGH
		}], [require_constants.TAG_HIDDEN]));
		this.streamChannels.push(key);
	}
	attachEdge(start, end) {
		if (end === require_constants.END) {
			if (start === require_constants.START) throw new Error("Cannot have an edge from START to END");
			this.nodes[start].writers.push(new require_write.ChannelWrite([{
				channel: require_constants.END,
				value: require_write.PASSTHROUGH
			}], [require_constants.TAG_HIDDEN]));
		} else {
			this.nodes[end].triggers.push(start);
			this.nodes[end].channels.push(start);
		}
	}
	attachBranch(start, name, branch) {
		if (start === require_constants.START && !this.nodes[require_constants.START]) this.nodes[require_constants.START] = require_pregel_index.Channel.subscribeTo(require_constants.START, { tags: [require_constants.TAG_HIDDEN] });
		this.nodes[start].pipe(branch.run((dests) => {
			const writes = dests.map((dest) => {
				if (require_constants._isSend(dest)) return dest;
				return {
					channel: dest === require_constants.END ? require_constants.END : `branch:${start}:${name}:${dest}`,
					value: require_write.PASSTHROUGH
				};
			});
			return new require_write.ChannelWrite(writes, [require_constants.TAG_HIDDEN]);
		}));
		const ends = branch.ends ? Object.values(branch.ends) : Object.keys(this.nodes);
		for (const end of ends) if (end !== require_constants.END) {
			const channelName = `branch:${start}:${name}:${end}`;
			this.channels[channelName] = new require_ephemeral_value.EphemeralValue();
			this.nodes[end].triggers.push(channelName);
			this.nodes[end].channels.push(channelName);
		}
	}
	/**
	* Returns a drawable representation of the computation graph.
	*/
	async getGraphAsync(config) {
		const xray = config?.xray;
		const graph = new __langchain_core_runnables_graph.Graph();
		const startNodes = { [require_constants.START]: graph.addNode({ schema: zod_v4.z.any() }, require_constants.START) };
		const endNodes = {};
		let subgraphs = {};
		if (xray) subgraphs = Object.fromEntries((await require_utils.gatherIterator(this.getSubgraphsAsync())).filter((x) => isCompiledGraph(x[1])));
		function addEdge(start, end, label, conditional = false) {
			if (end === require_constants.END && endNodes[require_constants.END] === void 0) endNodes[require_constants.END] = graph.addNode({ schema: zod_v4.z.any() }, require_constants.END);
			if (startNodes[start] === void 0) return;
			if (endNodes[end] === void 0) throw new Error(`End node ${end} not found!`);
			return graph.addEdge(startNodes[start], endNodes[end], label !== end ? label : void 0, conditional);
		}
		for (const [key, nodeSpec] of Object.entries(this.builder.nodes)) {
			const displayKey = _escapeMermaidKeywords(key);
			const node = nodeSpec.runnable;
			const metadata = nodeSpec.metadata ?? {};
			if (this.interruptBefore?.includes(key) && this.interruptAfter?.includes(key)) metadata.__interrupt = "before,after";
			else if (this.interruptBefore?.includes(key)) metadata.__interrupt = "before";
			else if (this.interruptAfter?.includes(key)) metadata.__interrupt = "after";
			if (xray) {
				const newXrayValue = typeof xray === "number" ? xray - 1 : xray;
				const drawableSubgraph = subgraphs[key] !== void 0 ? await subgraphs[key].getGraphAsync({
					...config,
					xray: newXrayValue
				}) : node.getGraph(config);
				drawableSubgraph.trimFirstNode();
				drawableSubgraph.trimLastNode();
				if (Object.keys(drawableSubgraph.nodes).length > 1) {
					const [e, s] = graph.extend(drawableSubgraph, displayKey);
					if (e === void 0) throw new Error(`Could not extend subgraph "${key}" due to missing entrypoint.`);
					function _isRunnableInterface(thing) {
						return thing ? thing.lc_runnable : false;
					}
					function _nodeDataStr(id, data) {
						if (id !== void 0 && !(0, uuid.validate)(id)) return id;
						else if (_isRunnableInterface(data)) try {
							let dataStr = data.getName();
							dataStr = dataStr.startsWith("Runnable") ? dataStr.slice(8) : dataStr;
							return dataStr;
						} catch (error) {
							return data.getName();
						}
						else return data.name ?? "UnknownSchema";
					}
					if (s !== void 0) startNodes[displayKey] = {
						name: _nodeDataStr(s.id, s.data),
						...s
					};
					endNodes[displayKey] = {
						name: _nodeDataStr(e.id, e.data),
						...e
					};
				} else {
					const newNode = graph.addNode(node, displayKey, metadata);
					startNodes[displayKey] = newNode;
					endNodes[displayKey] = newNode;
				}
			} else {
				const newNode = graph.addNode(node, displayKey, metadata);
				startNodes[displayKey] = newNode;
				endNodes[displayKey] = newNode;
			}
		}
		const sortedEdges = [...this.builder.allEdges].sort(([a], [b]) => {
			if (a < b) return -1;
			else if (b > a) return 1;
			else return 0;
		});
		for (const [start, end] of sortedEdges) addEdge(_escapeMermaidKeywords(start), _escapeMermaidKeywords(end));
		for (const [start, branches] of Object.entries(this.builder.branches)) {
			const defaultEnds = {
				...Object.fromEntries(Object.keys(this.builder.nodes).filter((k) => k !== start).map((k) => [_escapeMermaidKeywords(k), _escapeMermaidKeywords(k)])),
				[require_constants.END]: require_constants.END
			};
			for (const branch of Object.values(branches)) {
				let ends;
				if (branch.ends !== void 0) ends = branch.ends;
				else ends = defaultEnds;
				for (const [label, end] of Object.entries(ends)) addEdge(_escapeMermaidKeywords(start), _escapeMermaidKeywords(end), label, true);
			}
		}
		for (const [key, node] of Object.entries(this.builder.nodes)) if (node.ends !== void 0) for (const end of node.ends) addEdge(_escapeMermaidKeywords(key), _escapeMermaidKeywords(end), void 0, true);
		return graph;
	}
	/**
	* Returns a drawable representation of the computation graph.
	*
	* @deprecated Use getGraphAsync instead. The async method will be the default in the next minor core release.
	*/
	getGraph(config) {
		const xray = config?.xray;
		const graph = new __langchain_core_runnables_graph.Graph();
		const startNodes = { [require_constants.START]: graph.addNode({ schema: zod_v4.z.any() }, require_constants.START) };
		const endNodes = {};
		let subgraphs = {};
		if (xray) subgraphs = Object.fromEntries(require_utils.gatherIteratorSync(this.getSubgraphs()).filter((x) => isCompiledGraph(x[1])));
		function addEdge(start, end, label, conditional = false) {
			if (end === require_constants.END && endNodes[require_constants.END] === void 0) endNodes[require_constants.END] = graph.addNode({ schema: zod_v4.z.any() }, require_constants.END);
			return graph.addEdge(startNodes[start], endNodes[end], label !== end ? label : void 0, conditional);
		}
		for (const [key, nodeSpec] of Object.entries(this.builder.nodes)) {
			const displayKey = _escapeMermaidKeywords(key);
			const node = nodeSpec.runnable;
			const metadata = nodeSpec.metadata ?? {};
			if (this.interruptBefore?.includes(key) && this.interruptAfter?.includes(key)) metadata.__interrupt = "before,after";
			else if (this.interruptBefore?.includes(key)) metadata.__interrupt = "before";
			else if (this.interruptAfter?.includes(key)) metadata.__interrupt = "after";
			if (xray) {
				const newXrayValue = typeof xray === "number" ? xray - 1 : xray;
				const drawableSubgraph = subgraphs[key] !== void 0 ? subgraphs[key].getGraph({
					...config,
					xray: newXrayValue
				}) : node.getGraph(config);
				drawableSubgraph.trimFirstNode();
				drawableSubgraph.trimLastNode();
				if (Object.keys(drawableSubgraph.nodes).length > 1) {
					const [e, s] = graph.extend(drawableSubgraph, displayKey);
					if (e === void 0) throw new Error(`Could not extend subgraph "${key}" due to missing entrypoint.`);
					function _isRunnableInterface(thing) {
						return thing ? thing.lc_runnable : false;
					}
					function _nodeDataStr(id, data) {
						if (id !== void 0 && !(0, uuid.validate)(id)) return id;
						else if (_isRunnableInterface(data)) try {
							let dataStr = data.getName();
							dataStr = dataStr.startsWith("Runnable") ? dataStr.slice(8) : dataStr;
							return dataStr;
						} catch (error) {
							return data.getName();
						}
						else return data.name ?? "UnknownSchema";
					}
					if (s !== void 0) startNodes[displayKey] = {
						name: _nodeDataStr(s.id, s.data),
						...s
					};
					endNodes[displayKey] = {
						name: _nodeDataStr(e.id, e.data),
						...e
					};
				} else {
					const newNode = graph.addNode(node, displayKey, metadata);
					startNodes[displayKey] = newNode;
					endNodes[displayKey] = newNode;
				}
			} else {
				const newNode = graph.addNode(node, displayKey, metadata);
				startNodes[displayKey] = newNode;
				endNodes[displayKey] = newNode;
			}
		}
		const sortedEdges = [...this.builder.allEdges].sort(([a], [b]) => {
			if (a < b) return -1;
			else if (b > a) return 1;
			else return 0;
		});
		for (const [start, end] of sortedEdges) addEdge(_escapeMermaidKeywords(start), _escapeMermaidKeywords(end));
		for (const [start, branches] of Object.entries(this.builder.branches)) {
			const defaultEnds = {
				...Object.fromEntries(Object.keys(this.builder.nodes).filter((k) => k !== start).map((k) => [_escapeMermaidKeywords(k), _escapeMermaidKeywords(k)])),
				[require_constants.END]: require_constants.END
			};
			for (const branch of Object.values(branches)) {
				let ends;
				if (branch.ends !== void 0) ends = branch.ends;
				else ends = defaultEnds;
				for (const [label, end] of Object.entries(ends)) addEdge(_escapeMermaidKeywords(start), _escapeMermaidKeywords(end), label, true);
			}
		}
		return graph;
	}
};
function isCompiledGraph(x) {
	return typeof x.attachNode === "function" && typeof x.attachEdge === "function";
}
function _escapeMermaidKeywords(key) {
	if (key === "subgraph") return `"${key}"`;
	return key;
}

//#endregion
exports.Branch = Branch;
exports.CompiledGraph = CompiledGraph;
exports.Graph = Graph;
//# sourceMappingURL=graph.cjs.map