import { InvalidUpdateError, NodeInterrupt, UnreachableNodeError } from "../errors.js";
import { CHECKPOINT_NAMESPACE_END, CHECKPOINT_NAMESPACE_SEPARATOR, END, START, TAG_HIDDEN, _isSend } from "../constants.js";
import { RunnableCallable, gatherIterator, gatherIteratorSync } from "../utils.js";
import { ChannelWrite, PASSTHROUGH } from "../pregel/write.js";
import { PregelNode } from "../pregel/read.js";
import { isPregelLike } from "../pregel/utils/subgraph.js";
import { Channel, Pregel } from "../pregel/index.js";
import { EphemeralValue } from "../channels/ephemeral_value.js";
import { Runnable, _coerceToRunnable } from "@langchain/core/runnables";
import { Graph } from "@langchain/core/runnables/graph";
import { z } from "zod/v4";
import { validate } from "uuid";

//#region src/graph/graph.ts
var Branch = class {
	path;
	ends;
	constructor(options) {
		if (Runnable.isRunnable(options.path)) this.path = options.path;
		else this.path = _coerceToRunnable(options.path).withConfig({ runName: `Branch` });
		this.ends = Array.isArray(options.pathMap) ? options.pathMap.reduce((acc, n) => {
			acc[n] = n;
			return acc;
		}, {}) : options.pathMap;
	}
	run(writer, reader) {
		return ChannelWrite.registerWriter(new RunnableCallable({
			name: "<branch_run>",
			trace: false,
			func: async (input, config) => {
				try {
					return await this._route(input, config, writer, reader);
				} catch (e) {
					if (e.name === NodeInterrupt.unminifiable_name) console.warn("[WARN]: 'NodeInterrupt' thrown in conditional edge. This is likely a bug in your graph implementation.\nNodeInterrupt should only be thrown inside a node, not in edge conditions.");
					throw e;
				}
			}
		}));
	}
	async _route(input, config, writer, reader) {
		let result = await this.path.invoke(reader ? reader(config) : input, config);
		if (!Array.isArray(result)) result = [result];
		let destinations;
		if (this.ends) destinations = result.map((r) => _isSend(r) ? r : this.ends[r]);
		else destinations = result;
		if (destinations.some((dest) => !dest)) throw new Error("Branch condition returned unknown or null destination");
		if (destinations.filter(_isSend).some((packet) => packet.node === END)) throw new InvalidUpdateError("Cannot send a packet to the END node");
		const writeResult = await writer(destinations, config);
		return writeResult ?? input;
	}
};
var Graph$1 = class {
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
			for (const reservedChar of [CHECKPOINT_NAMESPACE_SEPARATOR, CHECKPOINT_NAMESPACE_END]) if (key.includes(reservedChar)) throw new Error(`"${reservedChar}" is a reserved character and is not allowed in node names.`);
			this.warnIfCompiled(`Adding a node to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
			if (key in this.nodes) throw new Error(`Node \`${key}\` already present.`);
			if (key === END) throw new Error(`Node \`${key}\` is reserved.`);
			const runnable = _coerceToRunnable(action);
			this.nodes[key] = {
				runnable,
				metadata: options?.metadata,
				subgraphs: isPregelLike(runnable) ? [runnable] : options?.subgraphs,
				ends: options?.ends
			};
		}
		return this;
	}
	addEdge(startKey, endKey) {
		this.warnIfCompiled(`Adding an edge to a graph that has already been compiled. This will not be reflected in the compiled graph.`);
		if (startKey === END) throw new Error("END cannot be a start node");
		if (endKey === START) throw new Error("START cannot be an end node");
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
		if (!Runnable.isRunnable(options.path)) {
			const pathDisplayValues = Array.isArray(options.pathMap) ? options.pathMap.join(",") : Object.keys(options.pathMap ?? {}).join(",");
			options.path = _coerceToRunnable(options.path).withConfig({ runName: `Branch<${options.source}${pathDisplayValues !== "" ? `,${pathDisplayValues}` : ""}>`.slice(0, 63) });
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
		return this.addEdge(START, key);
	}
	/**
	* @deprecated use `addEdge(key, END)` instead
	*/
	setFinishPoint(key) {
		this.warnIfCompiled("Setting a finish point of a graph that has already been compiled. This will not be reflected in the compiled graph.");
		return this.addEdge(key, END);
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
				[START]: new EphemeralValue(),
				[END]: new EphemeralValue()
			},
			inputChannels: START,
			outputChannels: END,
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
		for (const source of allSources) if (source !== START && !(source in this.nodes)) throw new Error(`Found edge starting at unknown node \`${source}\``);
		const allTargets = new Set([...this.allEdges].map(([_, target]) => target));
		for (const [start, branches] of Object.entries(this.branches)) for (const branch of Object.values(branches)) if (branch.ends != null) for (const end of Object.values(branch.ends)) allTargets.add(end);
		else {
			allTargets.add(END);
			for (const node of Object.keys(this.nodes)) if (node !== start) allTargets.add(node);
		}
		for (const node of Object.values(this.nodes)) for (const target of node.ends ?? []) allTargets.add(target);
		for (const node of Object.keys(this.nodes)) if (!allTargets.has(node)) throw new UnreachableNodeError([
			`Node \`${node}\` is not reachable.`,
			"",
			"If you are returning Command objects from your node,",
			"make sure you are passing names of potential destination nodes as an \"ends\" array",
			"into \".addNode(..., { ends: [\"node1\", \"node2\"] })\"."
		].join("\n"), { lc_error_code: "UNREACHABLE_NODE" });
		for (const target of allTargets) if (target !== END && !(target in this.nodes)) throw new Error(`Found edge ending at unknown node \`${target}\``);
		if (interrupt) {
			for (const node of interrupt) if (!(node in this.nodes)) throw new Error(`Interrupt node \`${node}\` is not present`);
		}
		this.compiled = true;
	}
};
var CompiledGraph = class extends Pregel {
	builder;
	constructor({ builder,...rest }) {
		super(rest);
		this.builder = builder;
	}
	attachNode(key, node) {
		this.channels[key] = new EphemeralValue();
		this.nodes[key] = new PregelNode({
			channels: [],
			triggers: [],
			metadata: node.metadata,
			subgraphs: node.subgraphs,
			ends: node.ends
		}).pipe(node.runnable).pipe(new ChannelWrite([{
			channel: key,
			value: PASSTHROUGH
		}], [TAG_HIDDEN]));
		this.streamChannels.push(key);
	}
	attachEdge(start, end) {
		if (end === END) {
			if (start === START) throw new Error("Cannot have an edge from START to END");
			this.nodes[start].writers.push(new ChannelWrite([{
				channel: END,
				value: PASSTHROUGH
			}], [TAG_HIDDEN]));
		} else {
			this.nodes[end].triggers.push(start);
			this.nodes[end].channels.push(start);
		}
	}
	attachBranch(start, name, branch) {
		if (start === START && !this.nodes[START]) this.nodes[START] = Channel.subscribeTo(START, { tags: [TAG_HIDDEN] });
		this.nodes[start].pipe(branch.run((dests) => {
			const writes = dests.map((dest) => {
				if (_isSend(dest)) return dest;
				return {
					channel: dest === END ? END : `branch:${start}:${name}:${dest}`,
					value: PASSTHROUGH
				};
			});
			return new ChannelWrite(writes, [TAG_HIDDEN]);
		}));
		const ends = branch.ends ? Object.values(branch.ends) : Object.keys(this.nodes);
		for (const end of ends) if (end !== END) {
			const channelName = `branch:${start}:${name}:${end}`;
			this.channels[channelName] = new EphemeralValue();
			this.nodes[end].triggers.push(channelName);
			this.nodes[end].channels.push(channelName);
		}
	}
	/**
	* Returns a drawable representation of the computation graph.
	*/
	async getGraphAsync(config) {
		const xray = config?.xray;
		const graph = new Graph();
		const startNodes = { [START]: graph.addNode({ schema: z.any() }, START) };
		const endNodes = {};
		let subgraphs = {};
		if (xray) subgraphs = Object.fromEntries((await gatherIterator(this.getSubgraphsAsync())).filter((x) => isCompiledGraph(x[1])));
		function addEdge(start, end, label, conditional = false) {
			if (end === END && endNodes[END] === void 0) endNodes[END] = graph.addNode({ schema: z.any() }, END);
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
						if (id !== void 0 && !validate(id)) return id;
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
				[END]: END
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
		const graph = new Graph();
		const startNodes = { [START]: graph.addNode({ schema: z.any() }, START) };
		const endNodes = {};
		let subgraphs = {};
		if (xray) subgraphs = Object.fromEntries(gatherIteratorSync(this.getSubgraphs()).filter((x) => isCompiledGraph(x[1])));
		function addEdge(start, end, label, conditional = false) {
			if (end === END && endNodes[END] === void 0) endNodes[END] = graph.addNode({ schema: z.any() }, END);
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
						if (id !== void 0 && !validate(id)) return id;
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
				[END]: END
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
export { Branch, CompiledGraph, Graph$1 as Graph };
//# sourceMappingURL=graph.js.map