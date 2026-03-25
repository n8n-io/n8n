Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_ai = require("../messages/ai.cjs");
const require_tracers_base = require("./base.cjs");
const require_core = require("../utils/fast-json-patch/src/core.cjs");
require("../utils/fast-json-patch/index.cjs");
const require_utils_stream = require("../utils/stream.cjs");
//#region src/tracers/log_stream.ts
var log_stream_exports = /* @__PURE__ */ require_runtime.__exportAll({
	LogStreamCallbackHandler: () => LogStreamCallbackHandler,
	RunLog: () => RunLog,
	RunLogPatch: () => RunLogPatch,
	isLogStreamHandler: () => isLogStreamHandler
});
/**
* List of jsonpatch JSONPatchOperations, which describe how to create the run state
* from an empty dict. This is the minimal representation of the log, designed to
* be serialized as JSON and sent over the wire to reconstruct the log on the other
* side. Reconstruction of the state can be done with any jsonpatch-compliant library,
* see https://jsonpatch.com for more information.
*/
var RunLogPatch = class {
	ops;
	constructor(fields) {
		this.ops = fields.ops ?? [];
	}
	concat(other) {
		const ops = this.ops.concat(other.ops);
		const states = require_core.applyPatch({}, ops);
		return new RunLog({
			ops,
			state: states[states.length - 1].newDocument
		});
	}
};
var RunLog = class RunLog extends RunLogPatch {
	state;
	constructor(fields) {
		super(fields);
		this.state = fields.state;
	}
	concat(other) {
		const ops = this.ops.concat(other.ops);
		const states = require_core.applyPatch(this.state, other.ops);
		return new RunLog({
			ops,
			state: states[states.length - 1].newDocument
		});
	}
	static fromRunLogPatch(patch) {
		const states = require_core.applyPatch({}, patch.ops);
		return new RunLog({
			ops: patch.ops,
			state: states[states.length - 1].newDocument
		});
	}
};
const isLogStreamHandler = (handler) => handler.name === "log_stream_tracer";
/**
* Extract standardized inputs from a run.
*
* Standardizes the inputs based on the type of the runnable used.
*
* @param run - Run object
* @param schemaFormat - The schema format to use.
*
* @returns Valid inputs are only dict. By conventions, inputs always represented
* invocation using named arguments.
* A null means that the input is not yet known!
*/
async function _getStandardizedInputs(run, schemaFormat) {
	if (schemaFormat === "original") throw new Error("Do not assign inputs with original schema drop the key for now. When inputs are added to streamLog they should be added with standardized schema for streaming events.");
	const { inputs } = run;
	if ([
		"retriever",
		"llm",
		"prompt"
	].includes(run.run_type)) return inputs;
	if (Object.keys(inputs).length === 1 && inputs?.input === "") return;
	return inputs.input;
}
async function _getStandardizedOutputs(run, schemaFormat) {
	const { outputs } = run;
	if (schemaFormat === "original") return outputs;
	if ([
		"retriever",
		"llm",
		"prompt"
	].includes(run.run_type)) return outputs;
	if (outputs !== void 0 && Object.keys(outputs).length === 1 && outputs?.output !== void 0) return outputs.output;
	return outputs;
}
function isChatGenerationChunk(x) {
	return x !== void 0 && x.message !== void 0;
}
/**
* Class that extends the `BaseTracer` class from the
* `langchain.callbacks.tracers.base` module. It represents a callback
* handler that logs the execution of runs and emits `RunLog` instances to a
* `RunLogStream`.
*/
var LogStreamCallbackHandler = class extends require_tracers_base.BaseTracer {
	autoClose = true;
	includeNames;
	includeTypes;
	includeTags;
	excludeNames;
	excludeTypes;
	excludeTags;
	_schemaFormat = "original";
	rootId;
	keyMapByRunId = {};
	counterMapByRunName = {};
	transformStream;
	writer;
	receiveStream;
	name = "log_stream_tracer";
	lc_prefer_streaming = true;
	constructor(fields) {
		super({
			_awaitHandler: true,
			...fields
		});
		this.autoClose = fields?.autoClose ?? true;
		this.includeNames = fields?.includeNames;
		this.includeTypes = fields?.includeTypes;
		this.includeTags = fields?.includeTags;
		this.excludeNames = fields?.excludeNames;
		this.excludeTypes = fields?.excludeTypes;
		this.excludeTags = fields?.excludeTags;
		this._schemaFormat = fields?._schemaFormat ?? this._schemaFormat;
		this.transformStream = new TransformStream();
		this.writer = this.transformStream.writable.getWriter();
		this.receiveStream = require_utils_stream.IterableReadableStream.fromReadableStream(this.transformStream.readable);
	}
	[Symbol.asyncIterator]() {
		return this.receiveStream;
	}
	async persistRun(_run) {}
	_includeRun(run) {
		if (run.id === this.rootId) return false;
		const runTags = run.tags ?? [];
		let include = this.includeNames === void 0 && this.includeTags === void 0 && this.includeTypes === void 0;
		if (this.includeNames !== void 0) include = include || this.includeNames.includes(run.name);
		if (this.includeTypes !== void 0) include = include || this.includeTypes.includes(run.run_type);
		if (this.includeTags !== void 0) include = include || runTags.find((tag) => this.includeTags?.includes(tag)) !== void 0;
		if (this.excludeNames !== void 0) include = include && !this.excludeNames.includes(run.name);
		if (this.excludeTypes !== void 0) include = include && !this.excludeTypes.includes(run.run_type);
		if (this.excludeTags !== void 0) include = include && runTags.every((tag) => !this.excludeTags?.includes(tag));
		return include;
	}
	async *tapOutputIterable(runId, output) {
		for await (const chunk of output) {
			if (runId !== this.rootId) {
				const key = this.keyMapByRunId[runId];
				if (key) await this.writer.write(new RunLogPatch({ ops: [{
					op: "add",
					path: `/logs/${key}/streamed_output/-`,
					value: chunk
				}] }));
			}
			yield chunk;
		}
	}
	async onRunCreate(run) {
		if (this.rootId === void 0) {
			this.rootId = run.id;
			await this.writer.write(new RunLogPatch({ ops: [{
				op: "replace",
				path: "",
				value: {
					id: run.id,
					name: run.name,
					type: run.run_type,
					streamed_output: [],
					final_output: void 0,
					logs: {}
				}
			}] }));
		}
		if (!this._includeRun(run)) return;
		if (this.counterMapByRunName[run.name] === void 0) this.counterMapByRunName[run.name] = 0;
		this.counterMapByRunName[run.name] += 1;
		const count = this.counterMapByRunName[run.name];
		this.keyMapByRunId[run.id] = count === 1 ? run.name : `${run.name}:${count}`;
		const logEntry = {
			id: run.id,
			name: run.name,
			type: run.run_type,
			tags: run.tags ?? [],
			metadata: run.extra?.metadata ?? {},
			start_time: new Date(run.start_time).toISOString(),
			streamed_output: [],
			streamed_output_str: [],
			final_output: void 0,
			end_time: void 0
		};
		if (this._schemaFormat === "streaming_events") logEntry.inputs = await _getStandardizedInputs(run, this._schemaFormat);
		await this.writer.write(new RunLogPatch({ ops: [{
			op: "add",
			path: `/logs/${this.keyMapByRunId[run.id]}`,
			value: logEntry
		}] }));
	}
	async onRunUpdate(run) {
		try {
			const runName = this.keyMapByRunId[run.id];
			if (runName === void 0) return;
			const ops = [];
			if (this._schemaFormat === "streaming_events") ops.push({
				op: "replace",
				path: `/logs/${runName}/inputs`,
				value: await _getStandardizedInputs(run, this._schemaFormat)
			});
			ops.push({
				op: "add",
				path: `/logs/${runName}/final_output`,
				value: await _getStandardizedOutputs(run, this._schemaFormat)
			});
			if (run.end_time !== void 0) ops.push({
				op: "add",
				path: `/logs/${runName}/end_time`,
				value: new Date(run.end_time).toISOString()
			});
			const patch = new RunLogPatch({ ops });
			await this.writer.write(patch);
		} finally {
			if (run.id === this.rootId) {
				const patch = new RunLogPatch({ ops: [{
					op: "replace",
					path: "/final_output",
					value: await _getStandardizedOutputs(run, this._schemaFormat)
				}] });
				await this.writer.write(patch);
				if (this.autoClose) await this.writer.close();
			}
		}
	}
	async onLLMNewToken(run, token, kwargs) {
		const runName = this.keyMapByRunId[run.id];
		if (runName === void 0) return;
		const isChatModel = run.inputs.messages !== void 0;
		let streamedOutputValue;
		if (isChatModel) if (isChatGenerationChunk(kwargs?.chunk)) streamedOutputValue = kwargs?.chunk;
		else streamedOutputValue = new require_ai.AIMessageChunk({
			id: `run-${run.id}`,
			content: token
		});
		else streamedOutputValue = token;
		const patch = new RunLogPatch({ ops: [{
			op: "add",
			path: `/logs/${runName}/streamed_output_str/-`,
			value: token
		}, {
			op: "add",
			path: `/logs/${runName}/streamed_output/-`,
			value: streamedOutputValue
		}] });
		await this.writer.write(patch);
	}
};
//#endregion
exports.LogStreamCallbackHandler = LogStreamCallbackHandler;
exports.RunLog = RunLog;
exports.RunLogPatch = RunLogPatch;
exports.isLogStreamHandler = isLogStreamHandler;
Object.defineProperty(exports, "log_stream_exports", {
	enumerable: true,
	get: function() {
		return log_stream_exports;
	}
});

//# sourceMappingURL=log_stream.cjs.map