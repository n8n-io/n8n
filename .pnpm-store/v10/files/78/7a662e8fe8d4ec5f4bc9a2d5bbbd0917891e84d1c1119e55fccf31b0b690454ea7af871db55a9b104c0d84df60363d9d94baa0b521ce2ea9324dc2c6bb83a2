import { AIMessageChunk } from "../messages/ai.js";
import { BaseTracer } from "./base.js";
import { IterableReadableStream } from "../utils/stream.js";
import { GenerationChunk } from "../outputs.js";
//#region src/tracers/event_stream.ts
function assignName({ name, serialized }) {
	if (name !== void 0) return name;
	if (serialized?.name !== void 0) return serialized.name;
	else if (serialized?.id !== void 0 && Array.isArray(serialized?.id)) return serialized.id[serialized.id.length - 1];
	return "Unnamed";
}
const isStreamEventsHandler = (handler) => handler.name === "event_stream_tracer";
/**
* Class that extends the `BaseTracer` class from the
* `langchain.callbacks.tracers.base` module. It represents a callback
* handler that logs the execution of runs and emits `RunLog` instances to a
* `RunLogStream`.
*/
var EventStreamCallbackHandler = class extends BaseTracer {
	autoClose = true;
	includeNames;
	includeTypes;
	includeTags;
	excludeNames;
	excludeTypes;
	excludeTags;
	runInfoMap = /* @__PURE__ */ new Map();
	tappedPromises = /* @__PURE__ */ new Map();
	transformStream;
	writer;
	receiveStream;
	readableStreamClosed = false;
	name = "event_stream_tracer";
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
		this.transformStream = new TransformStream({ flush: () => {
			this.readableStreamClosed = true;
		} });
		this.writer = this.transformStream.writable.getWriter();
		this.receiveStream = IterableReadableStream.fromReadableStream(this.transformStream.readable);
	}
	[Symbol.asyncIterator]() {
		return this.receiveStream;
	}
	async persistRun(_run) {}
	_includeRun(run) {
		const runTags = run.tags ?? [];
		let include = this.includeNames === void 0 && this.includeTags === void 0 && this.includeTypes === void 0;
		if (this.includeNames !== void 0) include = include || this.includeNames.includes(run.name);
		if (this.includeTypes !== void 0) include = include || this.includeTypes.includes(run.runType);
		if (this.includeTags !== void 0) include = include || runTags.find((tag) => this.includeTags?.includes(tag)) !== void 0;
		if (this.excludeNames !== void 0) include = include && !this.excludeNames.includes(run.name);
		if (this.excludeTypes !== void 0) include = include && !this.excludeTypes.includes(run.runType);
		if (this.excludeTags !== void 0) include = include && runTags.every((tag) => !this.excludeTags?.includes(tag));
		return include;
	}
	async *tapOutputIterable(runId, outputStream) {
		const firstChunk = await outputStream.next();
		if (firstChunk.done) return;
		const runInfo = this.runInfoMap.get(runId);
		if (runInfo === void 0) {
			yield firstChunk.value;
			return;
		}
		function _formatOutputChunk(eventType, data) {
			if (eventType === "llm" && typeof data === "string") return new GenerationChunk({ text: data });
			return data;
		}
		let tappedPromise = this.tappedPromises.get(runId);
		if (tappedPromise === void 0) {
			let tappedPromiseResolver;
			tappedPromise = new Promise((resolve) => {
				tappedPromiseResolver = resolve;
			});
			this.tappedPromises.set(runId, tappedPromise);
			try {
				const event = {
					event: `on_${runInfo.runType}_stream`,
					run_id: runId,
					name: runInfo.name,
					tags: runInfo.tags,
					metadata: runInfo.metadata,
					data: {}
				};
				await this.send({
					...event,
					data: { chunk: _formatOutputChunk(runInfo.runType, firstChunk.value) }
				}, runInfo);
				yield firstChunk.value;
				for await (const chunk of outputStream) {
					if (runInfo.runType !== "tool" && runInfo.runType !== "retriever") await this.send({
						...event,
						data: { chunk: _formatOutputChunk(runInfo.runType, chunk) }
					}, runInfo);
					yield chunk;
				}
			} finally {
				tappedPromiseResolver?.();
			}
		} else {
			yield firstChunk.value;
			for await (const chunk of outputStream) yield chunk;
		}
	}
	async send(payload, run) {
		if (this.readableStreamClosed) return;
		if (this._includeRun(run)) await this.writer.write(payload);
	}
	async sendEndEvent(payload, run) {
		const tappedPromise = this.tappedPromises.get(payload.run_id);
		if (tappedPromise !== void 0) tappedPromise.then(() => {
			this.send(payload, run);
		});
		else await this.send(payload, run);
	}
	async onLLMStart(run) {
		const runName = assignName(run);
		const runType = run.inputs.messages !== void 0 ? "chat_model" : "llm";
		const runInfo = {
			tags: run.tags ?? [],
			metadata: run.extra?.metadata ?? {},
			name: runName,
			runType,
			inputs: run.inputs
		};
		this.runInfoMap.set(run.id, runInfo);
		const eventName = `on_${runType}_start`;
		await this.send({
			event: eventName,
			data: { input: run.inputs },
			name: runName,
			tags: run.tags ?? [],
			run_id: run.id,
			metadata: run.extra?.metadata ?? {}
		}, runInfo);
	}
	async onLLMNewToken(run, token, kwargs) {
		const runInfo = this.runInfoMap.get(run.id);
		let chunk;
		let eventName;
		if (runInfo === void 0) throw new Error(`onLLMNewToken: Run ID ${run.id} not found in run map.`);
		if (this.runInfoMap.size === 1) return;
		if (runInfo.runType === "chat_model") {
			eventName = "on_chat_model_stream";
			if (kwargs?.chunk === void 0) chunk = new AIMessageChunk({
				content: token,
				id: `run-${run.id}`
			});
			else chunk = kwargs.chunk.message;
		} else if (runInfo.runType === "llm") {
			eventName = "on_llm_stream";
			if (kwargs?.chunk === void 0) chunk = new GenerationChunk({ text: token });
			else chunk = kwargs.chunk;
		} else throw new Error(`Unexpected run type ${runInfo.runType}`);
		await this.send({
			event: eventName,
			data: { chunk },
			run_id: run.id,
			name: runInfo.name,
			tags: runInfo.tags,
			metadata: runInfo.metadata
		}, runInfo);
	}
	async onLLMEnd(run) {
		const runInfo = this.runInfoMap.get(run.id);
		this.runInfoMap.delete(run.id);
		let eventName;
		if (runInfo === void 0) throw new Error(`onLLMEnd: Run ID ${run.id} not found in run map.`);
		const generations = run.outputs?.generations;
		let output;
		if (runInfo.runType === "chat_model") {
			for (const generation of generations ?? []) {
				if (output !== void 0) break;
				output = generation[0]?.message;
			}
			eventName = "on_chat_model_end";
		} else if (runInfo.runType === "llm") {
			output = {
				generations: generations?.map((generation) => {
					return generation.map((chunk) => {
						return {
							text: chunk.text,
							generationInfo: chunk.generationInfo
						};
					});
				}),
				llmOutput: run.outputs?.llmOutput ?? {}
			};
			eventName = "on_llm_end";
		} else throw new Error(`onLLMEnd: Unexpected run type: ${runInfo.runType}`);
		await this.sendEndEvent({
			event: eventName,
			data: {
				output,
				input: runInfo.inputs
			},
			run_id: run.id,
			name: runInfo.name,
			tags: runInfo.tags,
			metadata: runInfo.metadata
		}, runInfo);
	}
	async onChainStart(run) {
		const runName = assignName(run);
		const runType = run.run_type ?? "chain";
		const runInfo = {
			tags: run.tags ?? [],
			metadata: run.extra?.metadata ?? {},
			name: runName,
			runType: run.run_type
		};
		let eventData = {};
		if (run.inputs.input === "" && Object.keys(run.inputs).length === 1) {
			eventData = {};
			runInfo.inputs = {};
		} else if (run.inputs.input !== void 0) {
			eventData.input = run.inputs.input;
			runInfo.inputs = run.inputs.input;
		} else {
			eventData.input = run.inputs;
			runInfo.inputs = run.inputs;
		}
		this.runInfoMap.set(run.id, runInfo);
		await this.send({
			event: `on_${runType}_start`,
			data: eventData,
			name: runName,
			tags: run.tags ?? [],
			run_id: run.id,
			metadata: run.extra?.metadata ?? {}
		}, runInfo);
	}
	async onChainEnd(run) {
		const runInfo = this.runInfoMap.get(run.id);
		this.runInfoMap.delete(run.id);
		if (runInfo === void 0) throw new Error(`onChainEnd: Run ID ${run.id} not found in run map.`);
		const eventName = `on_${run.run_type}_end`;
		const inputs = run.inputs ?? runInfo.inputs ?? {};
		const data = {
			output: run.outputs?.output ?? run.outputs,
			input: inputs
		};
		if (inputs.input && Object.keys(inputs).length === 1) {
			data.input = inputs.input;
			runInfo.inputs = inputs.input;
		}
		await this.sendEndEvent({
			event: eventName,
			data,
			run_id: run.id,
			name: runInfo.name,
			tags: runInfo.tags,
			metadata: runInfo.metadata ?? {}
		}, runInfo);
	}
	async onToolStart(run) {
		const runName = assignName(run);
		const runInfo = {
			tags: run.tags ?? [],
			metadata: run.extra?.metadata ?? {},
			name: runName,
			runType: "tool",
			inputs: run.inputs ?? {}
		};
		this.runInfoMap.set(run.id, runInfo);
		await this.send({
			event: "on_tool_start",
			data: { input: run.inputs ?? {} },
			name: runName,
			run_id: run.id,
			tags: run.tags ?? [],
			metadata: run.extra?.metadata ?? {}
		}, runInfo);
	}
	async onToolEnd(run) {
		const runInfo = this.runInfoMap.get(run.id);
		this.runInfoMap.delete(run.id);
		if (runInfo === void 0) throw new Error(`onToolEnd: Run ID ${run.id} not found in run map.`);
		if (runInfo.inputs === void 0) throw new Error(`onToolEnd: Run ID ${run.id} is a tool call, and is expected to have traced inputs.`);
		const output = run.outputs?.output === void 0 ? run.outputs : run.outputs.output;
		await this.sendEndEvent({
			event: "on_tool_end",
			data: {
				output,
				input: runInfo.inputs
			},
			run_id: run.id,
			name: runInfo.name,
			tags: runInfo.tags,
			metadata: runInfo.metadata
		}, runInfo);
	}
	async onToolError(run) {
		const runInfo = this.runInfoMap.get(run.id);
		this.runInfoMap.delete(run.id);
		if (runInfo === void 0) throw new Error(`onToolEnd: Run ID ${run.id} not found in run map.`);
		if (runInfo.inputs === void 0) throw new Error(`onToolEnd: Run ID ${run.id} is a tool call, and is expected to have traced inputs.`);
		await this.sendEndEvent({
			event: "on_tool_error",
			data: {
				input: runInfo.inputs,
				error: run.error
			},
			run_id: run.id,
			name: runInfo.name,
			tags: runInfo.tags,
			metadata: runInfo.metadata
		}, runInfo);
	}
	async onRetrieverStart(run) {
		const runName = assignName(run);
		const runInfo = {
			tags: run.tags ?? [],
			metadata: run.extra?.metadata ?? {},
			name: runName,
			runType: "retriever",
			inputs: { query: run.inputs.query }
		};
		this.runInfoMap.set(run.id, runInfo);
		await this.send({
			event: "on_retriever_start",
			data: { input: { query: run.inputs.query } },
			name: runName,
			tags: run.tags ?? [],
			run_id: run.id,
			metadata: run.extra?.metadata ?? {}
		}, runInfo);
	}
	async onRetrieverEnd(run) {
		const runInfo = this.runInfoMap.get(run.id);
		this.runInfoMap.delete(run.id);
		if (runInfo === void 0) throw new Error(`onRetrieverEnd: Run ID ${run.id} not found in run map.`);
		await this.sendEndEvent({
			event: "on_retriever_end",
			data: {
				output: run.outputs?.documents ?? run.outputs,
				input: runInfo.inputs
			},
			run_id: run.id,
			name: runInfo.name,
			tags: runInfo.tags,
			metadata: runInfo.metadata
		}, runInfo);
	}
	async handleCustomEvent(eventName, data, runId) {
		const runInfo = this.runInfoMap.get(runId);
		if (runInfo === void 0) throw new Error(`handleCustomEvent: Run ID ${runId} not found in run map.`);
		await this.send({
			event: "on_custom_event",
			run_id: runId,
			name: eventName,
			tags: runInfo.tags,
			metadata: runInfo.metadata,
			data
		}, runInfo);
	}
	async finish() {
		const pendingPromises = [...this.tappedPromises.values()];
		Promise.all(pendingPromises).finally(() => {
			this.writer.close();
		});
	}
};
//#endregion
export { EventStreamCallbackHandler, isStreamEventsHandler };

//# sourceMappingURL=event_stream.js.map