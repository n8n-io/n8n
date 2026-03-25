Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_utils_env = require("../utils/env.cjs");
const require_callbacks_base = require("../callbacks/base.cjs");
let langsmith_run_trees = require("langsmith/run_trees");
//#region src/tracers/base.ts
var base_exports = /* @__PURE__ */ require_runtime.__exportAll({
	BaseTracer: () => BaseTracer,
	isBaseTracer: () => isBaseTracer
});
const convertRunTreeToRun = (runTree) => {
	if (!runTree) return;
	runTree.events = runTree.events ?? [];
	runTree.child_runs = runTree.child_runs ?? [];
	return runTree;
};
function convertRunToRunTree(run, parentRun) {
	if (!run) return;
	return new langsmith_run_trees.RunTree({
		...run,
		start_time: run._serialized_start_time ?? run.start_time,
		parent_run: convertRunToRunTree(parentRun),
		child_runs: run.child_runs.map((r) => convertRunToRunTree(r)).filter((r) => r !== void 0),
		extra: {
			...run.extra,
			runtime: require_utils_env.getRuntimeEnvironment()
		},
		tracingEnabled: false
	});
}
function _coerceToDict(value, defaultKey) {
	return value && !Array.isArray(value) && typeof value === "object" ? value : { [defaultKey]: value };
}
function isBaseTracer(x) {
	return typeof x._addRunToRunMap === "function";
}
var BaseTracer = class extends require_callbacks_base.BaseCallbackHandler {
	/** @deprecated Use `runTreeMap` instead. */
	runMap = /* @__PURE__ */ new Map();
	runTreeMap = /* @__PURE__ */ new Map();
	usesRunTreeMap = false;
	constructor(_fields) {
		super(...arguments);
	}
	copy() {
		return this;
	}
	getRunById(runId) {
		if (runId === void 0) return;
		return this.usesRunTreeMap ? convertRunTreeToRun(this.runTreeMap.get(runId)) : this.runMap.get(runId);
	}
	stringifyError(error) {
		if (error instanceof Error) return error.message + (error?.stack ? `\n\n${error.stack}` : "");
		if (typeof error === "string") return error;
		return `${error}`;
	}
	_addChildRun(parentRun, childRun) {
		parentRun.child_runs.push(childRun);
	}
	_addRunToRunMap(run) {
		const { dottedOrder: currentDottedOrder, microsecondPrecisionDatestring } = (0, langsmith_run_trees.convertToDottedOrderFormat)(new Date(run.start_time).getTime(), run.id, run.execution_order);
		const storedRun = { ...run };
		const parentRun = this.getRunById(storedRun.parent_run_id);
		if (storedRun.parent_run_id !== void 0) if (parentRun) {
			this._addChildRun(parentRun, storedRun);
			parentRun.child_execution_order = Math.max(parentRun.child_execution_order, storedRun.child_execution_order);
			storedRun.trace_id = parentRun.trace_id;
			if (parentRun.dotted_order !== void 0) {
				storedRun.dotted_order = [parentRun.dotted_order, currentDottedOrder].join(".");
				storedRun._serialized_start_time = microsecondPrecisionDatestring;
			}
		} else storedRun.parent_run_id = void 0;
		else {
			storedRun.trace_id = storedRun.id;
			storedRun.dotted_order = currentDottedOrder;
			storedRun._serialized_start_time = microsecondPrecisionDatestring;
		}
		if (this.usesRunTreeMap) {
			const runTree = convertRunToRunTree(storedRun, parentRun);
			if (runTree !== void 0) this.runTreeMap.set(storedRun.id, runTree);
		} else this.runMap.set(storedRun.id, storedRun);
		return storedRun;
	}
	async _endTrace(run) {
		const parentRun = run.parent_run_id !== void 0 && this.getRunById(run.parent_run_id);
		if (parentRun) parentRun.child_execution_order = Math.max(parentRun.child_execution_order, run.child_execution_order);
		else await this.persistRun(run);
		await this.onRunUpdate?.(run);
		if (this.usesRunTreeMap) this.runTreeMap.delete(run.id);
		else this.runMap.delete(run.id);
	}
	_getExecutionOrder(parentRunId) {
		const parentRun = parentRunId !== void 0 && this.getRunById(parentRunId);
		if (!parentRun) return 1;
		return parentRun.child_execution_order + 1;
	}
	/**
	* Create and add a run to the run map for LLM start events.
	* This must sometimes be done synchronously to avoid race conditions
	* when callbacks are backgrounded, so we expose it as a separate method here.
	*/
	_createRunForLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name) {
		const execution_order = this._getExecutionOrder(parentRunId);
		const start_time = Date.now();
		const finalExtraParams = metadata ? {
			...extraParams,
			metadata
		} : extraParams;
		const run = {
			id: runId,
			name: name ?? llm.id[llm.id.length - 1],
			parent_run_id: parentRunId,
			start_time,
			serialized: llm,
			events: [{
				name: "start",
				time: new Date(start_time).toISOString()
			}],
			inputs: { prompts },
			execution_order,
			child_runs: [],
			child_execution_order: execution_order,
			run_type: "llm",
			extra: finalExtraParams ?? {},
			tags: tags || []
		};
		return this._addRunToRunMap(run);
	}
	async handleLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name) {
		const run = this.getRunById(runId) ?? this._createRunForLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name);
		await this.onRunCreate?.(run);
		await this.onLLMStart?.(run);
		return run;
	}
	/**
	* Create and add a run to the run map for chat model start events.
	* This must sometimes be done synchronously to avoid race conditions
	* when callbacks are backgrounded, so we expose it as a separate method here.
	*/
	_createRunForChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name) {
		const execution_order = this._getExecutionOrder(parentRunId);
		const start_time = Date.now();
		const finalExtraParams = metadata ? {
			...extraParams,
			metadata
		} : extraParams;
		const run = {
			id: runId,
			name: name ?? llm.id[llm.id.length - 1],
			parent_run_id: parentRunId,
			start_time,
			serialized: llm,
			events: [{
				name: "start",
				time: new Date(start_time).toISOString()
			}],
			inputs: { messages },
			execution_order,
			child_runs: [],
			child_execution_order: execution_order,
			run_type: "llm",
			extra: finalExtraParams ?? {},
			tags: tags || []
		};
		return this._addRunToRunMap(run);
	}
	async handleChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name) {
		const run = this.getRunById(runId) ?? this._createRunForChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name);
		await this.onRunCreate?.(run);
		await this.onLLMStart?.(run);
		return run;
	}
	async handleLLMEnd(output, runId, _parentRunId, _tags, extraParams) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "llm") throw new Error("No LLM run to end.");
		run.end_time = Date.now();
		run.outputs = output;
		run.events.push({
			name: "end",
			time: new Date(run.end_time).toISOString()
		});
		run.extra = {
			...run.extra,
			...extraParams
		};
		await this.onLLMEnd?.(run);
		await this._endTrace(run);
		return run;
	}
	async handleLLMError(error, runId, _parentRunId, _tags, extraParams) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "llm") throw new Error("No LLM run to end.");
		run.end_time = Date.now();
		run.error = this.stringifyError(error);
		run.events.push({
			name: "error",
			time: new Date(run.end_time).toISOString()
		});
		run.extra = {
			...run.extra,
			...extraParams
		};
		await this.onLLMError?.(run);
		await this._endTrace(run);
		return run;
	}
	/**
	* Create and add a run to the run map for chain start events.
	* This must sometimes be done synchronously to avoid race conditions
	* when callbacks are backgrounded, so we expose it as a separate method here.
	*/
	_createRunForChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name, extra) {
		const execution_order = this._getExecutionOrder(parentRunId);
		const start_time = Date.now();
		const run = {
			id: runId,
			name: name ?? chain.id[chain.id.length - 1],
			parent_run_id: parentRunId,
			start_time,
			serialized: chain,
			events: [{
				name: "start",
				time: new Date(start_time).toISOString()
			}],
			inputs,
			execution_order,
			child_execution_order: execution_order,
			run_type: runType ?? "chain",
			child_runs: [],
			extra: metadata ? {
				...extra,
				metadata
			} : { ...extra },
			tags: tags || []
		};
		return this._addRunToRunMap(run);
	}
	async handleChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name) {
		const run = this.getRunById(runId) ?? this._createRunForChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name);
		await this.onRunCreate?.(run);
		await this.onChainStart?.(run);
		return run;
	}
	async handleChainEnd(outputs, runId, _parentRunId, _tags, kwargs) {
		const run = this.getRunById(runId);
		if (!run) throw new Error("No chain run to end.");
		run.end_time = Date.now();
		run.outputs = _coerceToDict(outputs, "output");
		run.events.push({
			name: "end",
			time: new Date(run.end_time).toISOString()
		});
		if (kwargs?.inputs !== void 0) run.inputs = _coerceToDict(kwargs.inputs, "input");
		await this.onChainEnd?.(run);
		await this._endTrace(run);
		return run;
	}
	async handleChainError(error, runId, _parentRunId, _tags, kwargs) {
		const run = this.getRunById(runId);
		if (!run) throw new Error("No chain run to end.");
		run.end_time = Date.now();
		run.error = this.stringifyError(error);
		run.events.push({
			name: "error",
			time: new Date(run.end_time).toISOString()
		});
		if (kwargs?.inputs !== void 0) run.inputs = _coerceToDict(kwargs.inputs, "input");
		await this.onChainError?.(run);
		await this._endTrace(run);
		return run;
	}
	/**
	* Create and add a run to the run map for tool start events.
	* This must sometimes be done synchronously to avoid race conditions
	* when callbacks are backgrounded, so we expose it as a separate method here.
	*/
	_createRunForToolStart(tool, input, runId, parentRunId, tags, metadata, name) {
		const execution_order = this._getExecutionOrder(parentRunId);
		const start_time = Date.now();
		const run = {
			id: runId,
			name: name ?? tool.id[tool.id.length - 1],
			parent_run_id: parentRunId,
			start_time,
			serialized: tool,
			events: [{
				name: "start",
				time: new Date(start_time).toISOString()
			}],
			inputs: { input },
			execution_order,
			child_execution_order: execution_order,
			run_type: "tool",
			child_runs: [],
			extra: metadata ? { metadata } : {},
			tags: tags || []
		};
		return this._addRunToRunMap(run);
	}
	async handleToolStart(tool, input, runId, parentRunId, tags, metadata, name) {
		const run = this.getRunById(runId) ?? this._createRunForToolStart(tool, input, runId, parentRunId, tags, metadata, name);
		await this.onRunCreate?.(run);
		await this.onToolStart?.(run);
		return run;
	}
	async handleToolEnd(output, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "tool") throw new Error("No tool run to end");
		run.end_time = Date.now();
		run.outputs = { output };
		run.events.push({
			name: "end",
			time: new Date(run.end_time).toISOString()
		});
		await this.onToolEnd?.(run);
		await this._endTrace(run);
		return run;
	}
	async handleToolError(error, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "tool") throw new Error("No tool run to end");
		run.end_time = Date.now();
		run.error = this.stringifyError(error);
		run.events.push({
			name: "error",
			time: new Date(run.end_time).toISOString()
		});
		await this.onToolError?.(run);
		await this._endTrace(run);
		return run;
	}
	async handleAgentAction(action, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "chain") return;
		const agentRun = run;
		agentRun.actions = agentRun.actions || [];
		agentRun.actions.push(action);
		agentRun.events.push({
			name: "agent_action",
			time: (/* @__PURE__ */ new Date()).toISOString(),
			kwargs: { action }
		});
		await this.onAgentAction?.(run);
	}
	async handleAgentEnd(action, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "chain") return;
		run.events.push({
			name: "agent_end",
			time: (/* @__PURE__ */ new Date()).toISOString(),
			kwargs: { action }
		});
		await this.onAgentEnd?.(run);
	}
	/**
	* Create and add a run to the run map for retriever start events.
	* This must sometimes be done synchronously to avoid race conditions
	* when callbacks are backgrounded, so we expose it as a separate method here.
	*/
	_createRunForRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name) {
		const execution_order = this._getExecutionOrder(parentRunId);
		const start_time = Date.now();
		const run = {
			id: runId,
			name: name ?? retriever.id[retriever.id.length - 1],
			parent_run_id: parentRunId,
			start_time,
			serialized: retriever,
			events: [{
				name: "start",
				time: new Date(start_time).toISOString()
			}],
			inputs: { query },
			execution_order,
			child_execution_order: execution_order,
			run_type: "retriever",
			child_runs: [],
			extra: metadata ? { metadata } : {},
			tags: tags || []
		};
		return this._addRunToRunMap(run);
	}
	async handleRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name) {
		const run = this.getRunById(runId) ?? this._createRunForRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name);
		await this.onRunCreate?.(run);
		await this.onRetrieverStart?.(run);
		return run;
	}
	async handleRetrieverEnd(documents, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "retriever") throw new Error("No retriever run to end");
		run.end_time = Date.now();
		run.outputs = { documents };
		run.events.push({
			name: "end",
			time: new Date(run.end_time).toISOString()
		});
		await this.onRetrieverEnd?.(run);
		await this._endTrace(run);
		return run;
	}
	async handleRetrieverError(error, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "retriever") throw new Error("No retriever run to end");
		run.end_time = Date.now();
		run.error = this.stringifyError(error);
		run.events.push({
			name: "error",
			time: new Date(run.end_time).toISOString()
		});
		await this.onRetrieverError?.(run);
		await this._endTrace(run);
		return run;
	}
	async handleText(text, runId) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "chain") return;
		run.events.push({
			name: "text",
			time: (/* @__PURE__ */ new Date()).toISOString(),
			kwargs: { text }
		});
		await this.onText?.(run);
	}
	async handleLLMNewToken(token, idx, runId, _parentRunId, _tags, fields) {
		const run = this.getRunById(runId);
		if (!run || run?.run_type !== "llm") throw new Error(`Invalid "runId" provided to "handleLLMNewToken" callback.`);
		run.events.push({
			name: "new_token",
			time: (/* @__PURE__ */ new Date()).toISOString(),
			kwargs: {
				token,
				idx,
				chunk: fields?.chunk
			}
		});
		await this.onLLMNewToken?.(run, token, { chunk: fields?.chunk });
		return run;
	}
};
//#endregion
exports.BaseTracer = BaseTracer;
Object.defineProperty(exports, "base_exports", {
	enumerable: true,
	get: function() {
		return base_exports;
	}
});
exports.isBaseTracer = isBaseTracer;

//# sourceMappingURL=base.cjs.map