Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_metadata = require("../messages/metadata.cjs");
const require_ai = require("../messages/ai.cjs");
const require_tracers_base = require("./base.cjs");
const require_tracer = require("../singletons/tracer.cjs");
let langsmith_run_trees = require("langsmith/run_trees");
let langsmith = require("langsmith");
let langsmith_singletons_traceable = require("langsmith/singletons/traceable");
//#region src/tracers/tracer_langchain.ts
var tracer_langchain_exports = /* @__PURE__ */ require_runtime.__exportAll({ LangChainTracer: () => LangChainTracer });
/**
* Extract usage_metadata from chat generations.
*
* Iterates through generations to find and aggregates all usage_metadata
* found in chat messages. This is typically present in chat model outputs.
*/
function _getUsageMetadataFromGenerations(generations) {
	let output = void 0;
	for (const generationBatch of generations) for (const generation of generationBatch) if (require_ai.AIMessage.isInstance(generation.message) && generation.message.usage_metadata !== void 0) output = require_metadata.mergeUsageMetadata(output, generation.message.usage_metadata);
	return output;
}
var LangChainTracer = class LangChainTracer extends require_tracers_base.BaseTracer {
	name = "langchain_tracer";
	projectName;
	exampleId;
	client;
	replicas;
	usesRunTreeMap = true;
	constructor(fields = {}) {
		super(fields);
		const { exampleId, projectName, client, replicas } = fields;
		this.projectName = projectName ?? (0, langsmith.getDefaultProjectName)();
		this.replicas = replicas;
		this.exampleId = exampleId;
		this.client = client ?? require_tracer.getDefaultLangChainClientSingleton();
		const traceableTree = LangChainTracer.getTraceableRunTree();
		if (traceableTree) this.updateFromRunTree(traceableTree);
	}
	async persistRun(_run) {}
	async onRunCreate(run) {
		if (!run.extra?.lc_defers_inputs) await this.getRunTreeWithTracingConfig(run.id)?.postRun();
	}
	async onRunUpdate(run) {
		const runTree = this.getRunTreeWithTracingConfig(run.id);
		if (run.extra?.lc_defers_inputs) await runTree?.postRun();
		else await runTree?.patchRun();
	}
	onLLMEnd(run) {
		const outputs = run.outputs;
		if (outputs?.generations) {
			const usageMetadata = _getUsageMetadataFromGenerations(outputs.generations);
			if (usageMetadata !== void 0) {
				run.extra = run.extra ?? {};
				const metadata = run.extra.metadata ?? {};
				metadata.usage_metadata = usageMetadata;
				run.extra.metadata = metadata;
			}
		}
	}
	getRun(id) {
		return this.runTreeMap.get(id);
	}
	updateFromRunTree(runTree) {
		this.runTreeMap.set(runTree.id, runTree);
		let rootRun = runTree;
		const visited = /* @__PURE__ */ new Set();
		while (rootRun.parent_run) {
			if (visited.has(rootRun.id)) break;
			visited.add(rootRun.id);
			if (!rootRun.parent_run) break;
			rootRun = rootRun.parent_run;
		}
		visited.clear();
		const queue = [rootRun];
		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || visited.has(current.id)) continue;
			visited.add(current.id);
			this.runTreeMap.set(current.id, current);
			if (current.child_runs) queue.push(...current.child_runs);
		}
		this.client = runTree.client ?? this.client;
		this.replicas = runTree.replicas ?? this.replicas;
		this.projectName = runTree.project_name ?? this.projectName;
		this.exampleId = runTree.reference_example_id ?? this.exampleId;
	}
	getRunTreeWithTracingConfig(id) {
		const runTree = this.runTreeMap.get(id);
		if (!runTree) return void 0;
		return new langsmith_run_trees.RunTree({
			...runTree,
			client: this.client,
			project_name: this.projectName,
			replicas: this.replicas,
			reference_example_id: this.exampleId,
			tracingEnabled: true
		});
	}
	static getTraceableRunTree() {
		try {
			return (0, langsmith_singletons_traceable.getCurrentRunTree)(true);
		} catch {
			return;
		}
	}
};
//#endregion
exports.LangChainTracer = LangChainTracer;
Object.defineProperty(exports, "tracer_langchain_exports", {
	enumerable: true,
	get: function() {
		return tracer_langchain_exports;
	}
});

//# sourceMappingURL=tracer_langchain.cjs.map