import { GENAI_COMPLETION, GENAI_PROMPT, GEN_AI_OPERATION_NAME, GEN_AI_REQUEST_EXTRA_BODY, GEN_AI_REQUEST_EXTRA_QUERY, GEN_AI_REQUEST_FREQUENCY_PENALTY, GEN_AI_REQUEST_MAX_TOKENS, GEN_AI_REQUEST_MODEL, GEN_AI_REQUEST_PRESENCE_PENALTY, GEN_AI_REQUEST_TEMPERATURE, GEN_AI_REQUEST_TOP_P, GEN_AI_RESPONSE_FINISH_REASONS, GEN_AI_RESPONSE_ID, GEN_AI_RESPONSE_MODEL, GEN_AI_RESPONSE_SERVICE_TIER, GEN_AI_RESPONSE_SYSTEM_FINGERPRINT, GEN_AI_SERIALIZED_DOC, GEN_AI_SERIALIZED_NAME, GEN_AI_SERIALIZED_SIGNATURE, GEN_AI_SYSTEM, GEN_AI_USAGE_INPUT_TOKENS, GEN_AI_USAGE_INPUT_TOKEN_DETAILS, GEN_AI_USAGE_OUTPUT_TOKENS, GEN_AI_USAGE_OUTPUT_TOKEN_DETAILS, GEN_AI_USAGE_TOTAL_TOKENS, LANGSMITH_METADATA, LANGSMITH_NAME, LANGSMITH_REQUEST_HEADERS, LANGSMITH_REQUEST_STREAMING, LANGSMITH_RUN_TYPE, LANGSMITH_SESSION_ID, LANGSMITH_SESSION_NAME, LANGSMITH_TAGS } from "./constants.js";
import { getOTELTrace } from "../../singletons/otel.js";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/experimental/otel/translator.js
const WELL_KNOWN_OPERATION_NAMES = {
	llm: "chat",
	tool: "execute_tool",
	retriever: "embeddings",
	embedding: "embeddings",
	prompt: "chat"
};
function getOperationName(runType) {
	return WELL_KNOWN_OPERATION_NAMES[runType] || runType;
}
var LangSmithToOTELTranslator = class {
	constructor() {
		Object.defineProperty(this, "spans", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: /* @__PURE__ */ new Map()
		});
	}
	exportBatch(operations, otelContextMap) {
		for (const op of operations) try {
			if (!op.run) continue;
			if (op.operation === "post") {
				const span = this.createSpanForRun(op, op.run, otelContextMap.get(op.id));
				if (span && !op.run.end_time) this.spans.set(op.id, span);
			} else this.updateSpanForRun(op, op.run);
		} catch (e) {
			console.error(`Error processing operation ${op.id}:`, e);
		}
	}
	createSpanForRun(op, runInfo, otelContext) {
		const activeSpan = otelContext && getOTELTrace().getSpan(otelContext);
		if (!activeSpan) return;
		try {
			return this.finishSpanSetup(activeSpan, runInfo, op);
		} catch (e) {
			console.error(`Failed to create span for run ${op.id}:`, e);
			return void 0;
		}
	}
	finishSpanSetup(span, runInfo, op) {
		this.setSpanAttributes(span, runInfo, op);
		if (runInfo.error) {
			span.setStatus({ code: 2 });
			span.recordException(new Error(runInfo.error));
		} else span.setStatus({ code: 1 });
		if (runInfo.end_time) span.end(new Date(runInfo.end_time));
		return span;
	}
	updateSpanForRun(op, runInfo) {
		try {
			const span = this.spans.get(op.id);
			if (!span) {
				console.debug(`No span found for run ${op.id} during update`);
				return;
			}
			this.setSpanAttributes(span, runInfo, op);
			if (runInfo.error) {
				span.setStatus({ code: 2 });
				span.recordException(new Error(runInfo.error));
			} else span.setStatus({ code: 1 });
			const endTime = runInfo.end_time;
			if (endTime) {
				span.end(new Date(endTime));
				this.spans.delete(op.id);
			}
		} catch (e) {
			console.error(`Failed to update span for run ${op.id}:`, e);
		}
	}
	extractModelName(runInfo) {
		if (runInfo.extra?.metadata) {
			const metadata = runInfo.extra.metadata;
			if (metadata.ls_model_name) return metadata.ls_model_name;
			if (metadata.invocation_params) {
				const invocationParams = metadata.invocation_params;
				if (invocationParams.model) return invocationParams.model;
				else if (invocationParams.model_name) return invocationParams.model_name;
			}
		}
	}
	setSpanAttributes(span, runInfo, op) {
		if ("run_type" in runInfo && runInfo.run_type) {
			span.setAttribute(LANGSMITH_RUN_TYPE, runInfo.run_type);
			const operationName = getOperationName(runInfo.run_type || "chain");
			span.setAttribute(GEN_AI_OPERATION_NAME, operationName);
		}
		if ("name" in runInfo && runInfo.name) span.setAttribute(LANGSMITH_NAME, runInfo.name);
		if ("session_id" in runInfo && runInfo.session_id) span.setAttribute(LANGSMITH_SESSION_ID, runInfo.session_id);
		if ("session_name" in runInfo && runInfo.session_name) span.setAttribute(LANGSMITH_SESSION_NAME, runInfo.session_name);
		this.setGenAiSystem(span, runInfo);
		const modelName = this.extractModelName(runInfo);
		if (modelName) span.setAttribute(GEN_AI_REQUEST_MODEL, modelName);
		if ("prompt_tokens" in runInfo && typeof runInfo.prompt_tokens === "number") span.setAttribute(GEN_AI_USAGE_INPUT_TOKENS, runInfo.prompt_tokens);
		if ("completion_tokens" in runInfo && typeof runInfo.completion_tokens === "number") span.setAttribute(GEN_AI_USAGE_OUTPUT_TOKENS, runInfo.completion_tokens);
		if ("total_tokens" in runInfo && typeof runInfo.total_tokens === "number") span.setAttribute(GEN_AI_USAGE_TOTAL_TOKENS, runInfo.total_tokens);
		this.setInvocationParameters(span, runInfo);
		const metadata = runInfo.extra?.metadata || {};
		for (const [key, value] of Object.entries(metadata)) if (value !== null && value !== void 0) span.setAttribute(`${LANGSMITH_METADATA}.${key}`, String(value));
		const tags = runInfo.tags;
		if (tags && Array.isArray(tags)) span.setAttribute(LANGSMITH_TAGS, tags.join(", "));
		else if (tags) span.setAttribute(LANGSMITH_TAGS, String(tags));
		if ("serialized" in runInfo && typeof runInfo.serialized === "object") {
			const serialized = runInfo.serialized;
			if (serialized.name) span.setAttribute(GEN_AI_SERIALIZED_NAME, String(serialized.name));
			if (serialized.signature) span.setAttribute(GEN_AI_SERIALIZED_SIGNATURE, String(serialized.signature));
			if (serialized.doc) span.setAttribute(GEN_AI_SERIALIZED_DOC, String(serialized.doc));
		}
		this.setIOAttributes(span, op);
	}
	setGenAiSystem(span, runInfo) {
		let system = "langchain";
		const modelName = this.extractModelName(runInfo);
		if (modelName) {
			const modelLower = modelName.toLowerCase();
			if (modelLower.includes("anthropic") || modelLower.startsWith("claude")) system = "anthropic";
			else if (modelLower.includes("bedrock")) system = "aws.bedrock";
			else if (modelLower.includes("azure") && modelLower.includes("openai")) system = "az.ai.openai";
			else if (modelLower.includes("azure") && modelLower.includes("inference")) system = "az.ai.inference";
			else if (modelLower.includes("cohere")) system = "cohere";
			else if (modelLower.includes("deepseek")) system = "deepseek";
			else if (modelLower.includes("gemini")) system = "gemini";
			else if (modelLower.includes("groq")) system = "groq";
			else if (modelLower.includes("watson") || modelLower.includes("ibm")) system = "ibm.watsonx.ai";
			else if (modelLower.includes("mistral")) system = "mistral_ai";
			else if (modelLower.includes("gpt") || modelLower.includes("openai")) system = "openai";
			else if (modelLower.includes("perplexity") || modelLower.includes("sonar")) system = "perplexity";
			else if (modelLower.includes("vertex")) system = "vertex_ai";
			else if (modelLower.includes("xai") || modelLower.includes("grok")) system = "xai";
		}
		span.setAttribute(GEN_AI_SYSTEM, system);
	}
	setInvocationParameters(span, runInfo) {
		if (!runInfo.extra?.metadata?.invocation_params) return;
		const invocationParams = runInfo.extra.metadata.invocation_params;
		if (invocationParams.max_tokens !== void 0) span.setAttribute(GEN_AI_REQUEST_MAX_TOKENS, invocationParams.max_tokens);
		if (invocationParams.temperature !== void 0) span.setAttribute(GEN_AI_REQUEST_TEMPERATURE, invocationParams.temperature);
		if (invocationParams.top_p !== void 0) span.setAttribute(GEN_AI_REQUEST_TOP_P, invocationParams.top_p);
		if (invocationParams.frequency_penalty !== void 0) span.setAttribute(GEN_AI_REQUEST_FREQUENCY_PENALTY, invocationParams.frequency_penalty);
		if (invocationParams.presence_penalty !== void 0) span.setAttribute(GEN_AI_REQUEST_PRESENCE_PENALTY, invocationParams.presence_penalty);
	}
	setIOAttributes(span, op) {
		if (op.run.inputs) try {
			const inputs = op.run.inputs;
			if (typeof inputs === "object" && inputs !== null) {
				if (inputs.model && Array.isArray(inputs.messages)) span.setAttribute(GEN_AI_REQUEST_MODEL, inputs.model);
				if (inputs.stream !== void 0) span.setAttribute(LANGSMITH_REQUEST_STREAMING, inputs.stream);
				if (inputs.extra_headers) span.setAttribute(LANGSMITH_REQUEST_HEADERS, JSON.stringify(inputs.extra_headers));
				if (inputs.extra_query) span.setAttribute(GEN_AI_REQUEST_EXTRA_QUERY, JSON.stringify(inputs.extra_query));
				if (inputs.extra_body) span.setAttribute(GEN_AI_REQUEST_EXTRA_BODY, JSON.stringify(inputs.extra_body));
			}
			span.setAttribute(GENAI_PROMPT, JSON.stringify(inputs));
		} catch (e) {
			console.debug(`Failed to process inputs for run ${op.id}`, e);
		}
		if (op.run.outputs) try {
			const outputs = op.run.outputs;
			const tokenUsage = this.getUnifiedRunTokens(outputs);
			if (tokenUsage) {
				span.setAttribute(GEN_AI_USAGE_INPUT_TOKENS, tokenUsage[0]);
				span.setAttribute(GEN_AI_USAGE_OUTPUT_TOKENS, tokenUsage[1]);
				span.setAttribute(GEN_AI_USAGE_TOTAL_TOKENS, tokenUsage[0] + tokenUsage[1]);
			}
			if (outputs && typeof outputs === "object") {
				if (outputs.model) span.setAttribute(GEN_AI_RESPONSE_MODEL, String(outputs.model));
				if (outputs.id) span.setAttribute(GEN_AI_RESPONSE_ID, outputs.id);
				if (outputs.choices && Array.isArray(outputs.choices)) {
					const finishReasons = outputs.choices.map((choice) => choice.finish_reason).filter((reason) => reason).map(String);
					if (finishReasons.length > 0) span.setAttribute(GEN_AI_RESPONSE_FINISH_REASONS, finishReasons.join(", "));
				}
				if (outputs.service_tier) span.setAttribute(GEN_AI_RESPONSE_SERVICE_TIER, outputs.service_tier);
				if (outputs.system_fingerprint) span.setAttribute(GEN_AI_RESPONSE_SYSTEM_FINGERPRINT, outputs.system_fingerprint);
				if (outputs.usage_metadata && typeof outputs.usage_metadata === "object") {
					const usageMetadata = outputs.usage_metadata;
					if (usageMetadata.input_token_details) span.setAttribute(GEN_AI_USAGE_INPUT_TOKEN_DETAILS, JSON.stringify(usageMetadata.input_token_details));
					if (usageMetadata.output_token_details) span.setAttribute(GEN_AI_USAGE_OUTPUT_TOKEN_DETAILS, JSON.stringify(usageMetadata.output_token_details));
				}
			}
			span.setAttribute(GENAI_COMPLETION, JSON.stringify(outputs));
		} catch (e) {
			console.debug(`Failed to process outputs for run ${op.id}`, e);
		}
	}
	getUnifiedRunTokens(outputs) {
		if (!outputs) return null;
		let tokenUsage = this.extractUnifiedRunTokens(outputs.usage_metadata);
		if (tokenUsage) return tokenUsage;
		const keys = Object.keys(outputs);
		for (const key of keys) {
			const haystack = outputs[key];
			if (!haystack || typeof haystack !== "object") continue;
			tokenUsage = this.extractUnifiedRunTokens(haystack.usage_metadata);
			if (tokenUsage) return tokenUsage;
			if (haystack.lc === 1 && haystack.kwargs && typeof haystack.kwargs === "object") {
				tokenUsage = this.extractUnifiedRunTokens(haystack.kwargs.usage_metadata);
				if (tokenUsage) return tokenUsage;
			}
		}
		const generations = outputs.generations || [];
		if (!Array.isArray(generations)) return null;
		const flatGenerations = Array.isArray(generations[0]) ? generations.flat() : generations;
		for (const generation of flatGenerations) if (typeof generation === "object" && generation.message && typeof generation.message === "object" && generation.message.kwargs && typeof generation.message.kwargs === "object") {
			tokenUsage = this.extractUnifiedRunTokens(generation.message.kwargs.usage_metadata);
			if (tokenUsage) return tokenUsage;
		}
		return null;
	}
	extractUnifiedRunTokens(outputs) {
		if (!outputs || typeof outputs !== "object") return null;
		if (typeof outputs.input_tokens !== "number" || typeof outputs.output_tokens !== "number") return null;
		return [outputs.input_tokens, outputs.output_tokens];
	}
};

//#endregion
export { LangSmithToOTELTranslator };
//# sourceMappingURL=translator.js.map