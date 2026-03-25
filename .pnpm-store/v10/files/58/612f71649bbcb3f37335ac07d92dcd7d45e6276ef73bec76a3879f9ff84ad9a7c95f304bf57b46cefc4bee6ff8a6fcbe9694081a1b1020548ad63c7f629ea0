import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { mergeUsageMetadata } from "../messages/metadata.js";
import { AIMessage } from "../messages/ai.js";
import { BaseTracer } from "./base.js";
import { getDefaultLangChainClientSingleton } from "../singletons/tracer.js";
import { RunTree } from "langsmith/run_trees";
import { getDefaultProjectName } from "langsmith";
import { getCurrentRunTree } from "langsmith/singletons/traceable";
//#region src/tracers/tracer_langchain.ts
var tracer_langchain_exports = /* @__PURE__ */ __exportAll({ LangChainTracer: () => LangChainTracer });
/**
* Extract usage_metadata from chat generations.
*
* Iterates through generations to find and aggregates all usage_metadata
* found in chat messages. This is typically present in chat model outputs.
*/
function _getUsageMetadataFromGenerations(generations) {
	let output = void 0;
	for (const generationBatch of generations) for (const generation of generationBatch) if (AIMessage.isInstance(generation.message) && generation.message.usage_metadata !== void 0) output = mergeUsageMetadata(output, generation.message.usage_metadata);
	return output;
}
var LangChainTracer = class LangChainTracer extends BaseTracer {
	name = "langchain_tracer";
	projectName;
	exampleId;
	client;
	replicas;
	usesRunTreeMap = true;
	constructor(fields = {}) {
		super(fields);
		const { exampleId, projectName, client, replicas } = fields;
		this.projectName = projectName ?? getDefaultProjectName();
		this.replicas = replicas;
		this.exampleId = exampleId;
		this.client = client ?? getDefaultLangChainClientSingleton();
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
		return new RunTree({
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
			return getCurrentRunTree(true);
		} catch {
			return;
		}
	}
};
//#endregion
export { LangChainTracer, tracer_langchain_exports };

//# sourceMappingURL=tracer_langchain.js.map