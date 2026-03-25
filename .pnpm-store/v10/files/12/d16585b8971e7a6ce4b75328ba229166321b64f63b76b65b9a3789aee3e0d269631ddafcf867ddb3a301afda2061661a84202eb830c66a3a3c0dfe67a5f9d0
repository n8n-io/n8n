import { __export } from "../../../_virtual/rolldown_runtime.js";
import { isAIMessage } from "@langchain/core/messages";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { BaseTracer } from "@langchain/core/tracers/base";

//#region src/experimental/callbacks/handlers/datadog.ts
var datadog_exports = {};
__export(datadog_exports, { DatadogLLMObsTracer: () => DatadogLLMObsTracer });
var DatadogLLMObsTracer = class extends BaseTracer {
	name = "datadog_tracer";
	ddLLMObsEndpoint;
	endpoint = getEnvironmentVariable("DD_LLMOBS_ENDPOINT") || "https://api.datadoghq.com/api/unstable/llm-obs/v1/trace/spans";
	headers = { "Content-Type": "application/json" };
	mlApp;
	sessionId;
	tags = {};
	formatDocument;
	constructor(fields) {
		super(fields);
		const { mlApp, userHandle, userId, sessionId, service, env, tags, ddLLMObsEndpoint, ddApiKey, formatDocument } = fields;
		const apiKey = ddApiKey || getEnvironmentVariable("DD_API_KEY");
		if (apiKey) this.headers["DD-API-KEY"] = apiKey;
		this.mlApp = mlApp;
		this.sessionId = sessionId;
		this.ddLLMObsEndpoint = ddLLMObsEndpoint;
		this.formatDocument = formatDocument;
		this.tags = {
			...tags,
			env: env || "not-set",
			service: service || "not-set",
			user_handle: userHandle,
			user_id: userId
		};
	}
	async persistRun(_run) {
		try {
			const spans = this.convertRunToDDSpans(_run);
			const response = await fetch(this.ddLLMObsEndpoint || this.endpoint, {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(this.formatRequestBody(spans))
			});
			if (!response.ok) {
				const error = await response.text();
				throw new Error(error);
			}
		} catch (error) {
			console.error(`Error writing spans to Datadog: ${error}`);
		}
	}
	convertRunToDDSpans(run) {
		const spans = [this.langchainRunToDatadogLLMObsSpan(run)];
		if (run.child_runs) run.child_runs.forEach((childRun) => {
			spans.push(...this.convertRunToDDSpans(childRun));
		});
		return spans.flatMap((span) => span ? [span] : []);
	}
	formatRequestBody(spans) {
		return { data: {
			type: "span",
			attributes: {
				ml_app: this.mlApp,
				tags: Object.entries(this.tags).filter(([, value]) => value).map(([key, value]) => `${key}:${value}`),
				spans,
				session_id: this.sessionId
			}
		} };
	}
	uuidToBigInt(uuid) {
		const hexString = uuid.replace(/-/g, "");
		const first64Bits = hexString.slice(0, 16);
		const bigIntValue = BigInt(`0x${first64Bits}`).toString();
		return bigIntValue;
	}
	milisecondsToNanoseconds(ms) {
		return ms * 1e6;
	}
	toDatadogSpanKind(kind) {
		switch (kind) {
			case "llm": return "llm";
			case "tool": return "tool";
			case "chain": return "workflow";
			case "retriever": return "retrieval";
			default: return null;
		}
	}
	transformInput(inputs, spanKind) {
		if (spanKind === "llm") {
			if (inputs?.messages) return { messages: inputs?.messages?.flatMap((messages) => messages.map((message) => ({
				content: message.content,
				role: message?._getType?.() ?? void 0
			}))) };
			if (inputs?.prompts) return { value: inputs.prompts.join("\n") };
		}
		return { value: JSON.stringify(inputs) };
	}
	transformOutput(outputs, spanKind) {
		const tokensMetadata = {};
		if (!outputs) return {
			output: void 0,
			tokensMetadata
		};
		if (spanKind === "llm") return {
			output: { messages: outputs?.generations?.flatMap((generations) => generations.map(({ message, text }) => {
				if (isAIMessage(message) && message?.usage_metadata) {
					tokensMetadata.prompt_tokens = message.usage_metadata.input_tokens;
					tokensMetadata.completion_tokens = message.usage_metadata.output_tokens;
					tokensMetadata.total_tokens = message.usage_metadata.total_tokens;
				}
				return {
					content: message?.content ?? text,
					role: message?._getType?.()
				};
			})) },
			tokensMetadata
		};
		if (spanKind === "retrieval") return {
			output: { documents: outputs?.documents.map((document) => {
				if (typeof this.formatDocument === "function") return this.formatDocument(document);
				return {
					text: document.pageContent,
					id: document.metadata?.id,
					name: document.metadata?.name,
					score: document.metadata?.score
				};
			}) },
			tokensMetadata
		};
		if (outputs?.output) return {
			output: { value: JSON.stringify(outputs.output) },
			tokensMetadata
		};
		return {
			output: { value: JSON.stringify(outputs) },
			tokensMetadata
		};
	}
	langchainRunToDatadogLLMObsSpan(run) {
		if (!run.end_time || !run.trace_id) return null;
		const spanId = this.uuidToBigInt(run.id);
		const traceId = this.uuidToBigInt(run.trace_id);
		const parentId = run.parent_run_id ? this.uuidToBigInt(run.parent_run_id) : "undefined";
		const spanKind = this.toDatadogSpanKind(run.run_type);
		if (spanKind === null) return null;
		const input = this.transformInput(run.inputs, spanKind);
		const { output, tokensMetadata } = this.transformOutput(run.outputs, spanKind);
		const startTimeNs = Number(this.milisecondsToNanoseconds(run.start_time));
		const endTimeNs = Number(this.milisecondsToNanoseconds(run.end_time));
		const durationNs = endTimeNs - startTimeNs;
		if (durationNs <= 0) return null;
		const spanName = run.serialized?.kwargs?.name ?? run.name;
		const spanError = run.error ? 1 : 0;
		const spanStatus = run.error ? "error" : "ok";
		const meta = {
			kind: spanKind,
			input,
			output,
			model_name: run.extra?.metadata?.ls_model_name,
			model_provider: run.extra?.metadata?.ls_provider,
			temperature: run.extra?.metadata?.ls_temperature
		};
		return {
			parent_id: parentId,
			trace_id: traceId,
			span_id: spanId,
			name: spanName,
			error: spanError,
			status: spanStatus,
			tags: [...run.tags?.length ? run.tags : []],
			meta,
			start_ns: startTimeNs,
			duration: durationNs,
			metrics: tokensMetadata
		};
	}
};

//#endregion
export { DatadogLLMObsTracer, datadog_exports };
//# sourceMappingURL=datadog.js.map