"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangSmithToOTELTranslator = void 0;
const constants = __importStar(require("./constants.cjs"));
const otel_js_1 = require("../../singletons/otel.cjs");
const WELL_KNOWN_OPERATION_NAMES = {
    llm: "chat",
    tool: "execute_tool",
    retriever: "embeddings",
    embedding: "embeddings",
    prompt: "chat",
};
function getOperationName(runType) {
    return WELL_KNOWN_OPERATION_NAMES[runType] || runType;
}
class LangSmithToOTELTranslator {
    constructor() {
        Object.defineProperty(this, "spans", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    exportBatch(operations, otelContextMap) {
        for (const op of operations) {
            try {
                if (!op.run) {
                    continue;
                }
                if (op.operation === "post") {
                    const span = this.createSpanForRun(op, op.run, otelContextMap.get(op.id));
                    if (span && !op.run.end_time) {
                        this.spans.set(op.id, span);
                    }
                }
                else {
                    this.updateSpanForRun(op, op.run);
                }
            }
            catch (e) {
                console.error(`Error processing operation ${op.id}:`, e);
            }
        }
    }
    createSpanForRun(op, runInfo, otelContext) {
        const activeSpan = otelContext && (0, otel_js_1.getOTELTrace)().getSpan(otelContext);
        if (!activeSpan) {
            return;
        }
        try {
            return this.finishSpanSetup(activeSpan, runInfo, op);
        }
        catch (e) {
            console.error(`Failed to create span for run ${op.id}:`, e);
            return undefined;
        }
    }
    finishSpanSetup(span, runInfo, op) {
        // Set all attributes
        this.setSpanAttributes(span, runInfo, op);
        // Set status based on error
        if (runInfo.error) {
            span.setStatus({ code: 2 }); // ERROR status
            span.recordException(new Error(runInfo.error));
        }
        else {
            span.setStatus({ code: 1 }); // OK status
        }
        // End the span if end_time is present
        if (runInfo.end_time) {
            span.end(new Date(runInfo.end_time));
        }
        return span;
    }
    updateSpanForRun(op, runInfo) {
        try {
            const span = this.spans.get(op.id);
            if (!span) {
                console.debug(`No span found for run ${op.id} during update`);
                return;
            }
            // Update attributes
            this.setSpanAttributes(span, runInfo, op);
            // Update status based on error
            if (runInfo.error) {
                span.setStatus({ code: 2 }); // ERROR status
                span.recordException(new Error(runInfo.error));
            }
            else {
                span.setStatus({ code: 1 }); // OK status
            }
            // End the span if end_time is present
            const endTime = runInfo.end_time;
            if (endTime) {
                span.end(new Date(endTime));
                this.spans.delete(op.id);
            }
        }
        catch (e) {
            console.error(`Failed to update span for run ${op.id}:`, e);
        }
    }
    extractModelName(runInfo) {
        // Try to get model name from metadata
        if (runInfo.extra?.metadata) {
            const metadata = runInfo.extra.metadata;
            // First check for ls_model_name in metadata
            if (metadata.ls_model_name) {
                return metadata.ls_model_name;
            }
            // Then check invocation_params for model info
            if (metadata.invocation_params) {
                const invocationParams = metadata.invocation_params;
                if (invocationParams.model) {
                    return invocationParams.model;
                }
                else if (invocationParams.model_name) {
                    return invocationParams.model_name;
                }
            }
        }
        return;
    }
    setSpanAttributes(span, runInfo, op) {
        if ("run_type" in runInfo && runInfo.run_type) {
            span.setAttribute(constants.LANGSMITH_RUN_TYPE, runInfo.run_type);
            // Set GenAI attributes according to OTEL semantic conventions
            const operationName = getOperationName(runInfo.run_type || "chain");
            span.setAttribute(constants.GEN_AI_OPERATION_NAME, operationName);
        }
        if ("name" in runInfo && runInfo.name) {
            span.setAttribute(constants.LANGSMITH_NAME, runInfo.name);
        }
        if ("session_id" in runInfo && runInfo.session_id) {
            span.setAttribute(constants.LANGSMITH_SESSION_ID, runInfo.session_id);
        }
        if ("session_name" in runInfo && runInfo.session_name) {
            span.setAttribute(constants.LANGSMITH_SESSION_NAME, runInfo.session_name);
        }
        // Set gen_ai.system
        this.setGenAiSystem(span, runInfo);
        // Set model name if available
        const modelName = this.extractModelName(runInfo);
        if (modelName) {
            span.setAttribute(constants.GEN_AI_REQUEST_MODEL, modelName);
        }
        // Set token usage information
        if ("prompt_tokens" in runInfo &&
            typeof runInfo.prompt_tokens === "number") {
            span.setAttribute(constants.GEN_AI_USAGE_INPUT_TOKENS, runInfo.prompt_tokens);
        }
        if ("completion_tokens" in runInfo &&
            typeof runInfo.completion_tokens === "number") {
            span.setAttribute(constants.GEN_AI_USAGE_OUTPUT_TOKENS, runInfo.completion_tokens);
        }
        if ("total_tokens" in runInfo && typeof runInfo.total_tokens === "number") {
            span.setAttribute(constants.GEN_AI_USAGE_TOTAL_TOKENS, runInfo.total_tokens);
        }
        // Set other parameters from invocation_params
        this.setInvocationParameters(span, runInfo);
        // Set metadata and tags if available
        const metadata = runInfo.extra?.metadata || {};
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== null && value !== undefined) {
                span.setAttribute(`${constants.LANGSMITH_METADATA}.${key}`, String(value));
            }
        }
        const tags = runInfo.tags;
        if (tags && Array.isArray(tags)) {
            span.setAttribute(constants.LANGSMITH_TAGS, tags.join(", "));
        }
        else if (tags) {
            span.setAttribute(constants.LANGSMITH_TAGS, String(tags));
        }
        // Support additional serialized attributes, if present
        if ("serialized" in runInfo && typeof runInfo.serialized === "object") {
            const serialized = runInfo.serialized;
            if (serialized.name) {
                span.setAttribute(constants.GEN_AI_SERIALIZED_NAME, String(serialized.name));
            }
            if (serialized.signature) {
                span.setAttribute(constants.GEN_AI_SERIALIZED_SIGNATURE, String(serialized.signature));
            }
            if (serialized.doc) {
                span.setAttribute(constants.GEN_AI_SERIALIZED_DOC, String(serialized.doc));
            }
        }
        // Set inputs/outputs if available
        this.setIOAttributes(span, op);
    }
    setGenAiSystem(span, runInfo) {
        // Default to "langchain" if we can't determine the system
        let system = "langchain";
        // Extract model name to determine the system
        const modelName = this.extractModelName(runInfo);
        if (modelName) {
            const modelLower = modelName.toLowerCase();
            if (modelLower.includes("anthropic") || modelLower.startsWith("claude")) {
                system = "anthropic";
            }
            else if (modelLower.includes("bedrock")) {
                system = "aws.bedrock";
            }
            else if (modelLower.includes("azure") &&
                modelLower.includes("openai")) {
                system = "az.ai.openai";
            }
            else if (modelLower.includes("azure") &&
                modelLower.includes("inference")) {
                system = "az.ai.inference";
            }
            else if (modelLower.includes("cohere")) {
                system = "cohere";
            }
            else if (modelLower.includes("deepseek")) {
                system = "deepseek";
            }
            else if (modelLower.includes("gemini")) {
                system = "gemini";
            }
            else if (modelLower.includes("groq")) {
                system = "groq";
            }
            else if (modelLower.includes("watson") || modelLower.includes("ibm")) {
                system = "ibm.watsonx.ai";
            }
            else if (modelLower.includes("mistral")) {
                system = "mistral_ai";
            }
            else if (modelLower.includes("gpt") || modelLower.includes("openai")) {
                system = "openai";
            }
            else if (modelLower.includes("perplexity") ||
                modelLower.includes("sonar")) {
                system = "perplexity";
            }
            else if (modelLower.includes("vertex")) {
                system = "vertex_ai";
            }
            else if (modelLower.includes("xai") || modelLower.includes("grok")) {
                system = "xai";
            }
        }
        span.setAttribute(constants.GEN_AI_SYSTEM, system);
    }
    setInvocationParameters(span, runInfo) {
        if (!runInfo.extra?.metadata?.invocation_params) {
            return;
        }
        const invocationParams = runInfo.extra.metadata.invocation_params;
        // Set relevant invocation parameters
        if (invocationParams.max_tokens !== undefined) {
            span.setAttribute(constants.GEN_AI_REQUEST_MAX_TOKENS, invocationParams.max_tokens);
        }
        if (invocationParams.temperature !== undefined) {
            span.setAttribute(constants.GEN_AI_REQUEST_TEMPERATURE, invocationParams.temperature);
        }
        if (invocationParams.top_p !== undefined) {
            span.setAttribute(constants.GEN_AI_REQUEST_TOP_P, invocationParams.top_p);
        }
        if (invocationParams.frequency_penalty !== undefined) {
            span.setAttribute(constants.GEN_AI_REQUEST_FREQUENCY_PENALTY, invocationParams.frequency_penalty);
        }
        if (invocationParams.presence_penalty !== undefined) {
            span.setAttribute(constants.GEN_AI_REQUEST_PRESENCE_PENALTY, invocationParams.presence_penalty);
        }
    }
    setIOAttributes(span, op) {
        if (op.run.inputs) {
            try {
                const inputs = op.run.inputs;
                if (typeof inputs === "object" && inputs !== null) {
                    if (inputs.model && Array.isArray(inputs.messages)) {
                        span.setAttribute(constants.GEN_AI_REQUEST_MODEL, inputs.model);
                    }
                    // Set additional request attributes if available
                    if (inputs.stream !== undefined) {
                        span.setAttribute(constants.LANGSMITH_REQUEST_STREAMING, inputs.stream);
                    }
                    if (inputs.extra_headers) {
                        span.setAttribute(constants.LANGSMITH_REQUEST_HEADERS, JSON.stringify(inputs.extra_headers));
                    }
                    if (inputs.extra_query) {
                        span.setAttribute(constants.GEN_AI_REQUEST_EXTRA_QUERY, JSON.stringify(inputs.extra_query));
                    }
                    if (inputs.extra_body) {
                        span.setAttribute(constants.GEN_AI_REQUEST_EXTRA_BODY, JSON.stringify(inputs.extra_body));
                    }
                }
                span.setAttribute(constants.GENAI_PROMPT, JSON.stringify(inputs));
            }
            catch (e) {
                console.debug(`Failed to process inputs for run ${op.id}`, e);
            }
        }
        if (op.run.outputs) {
            try {
                const outputs = op.run.outputs;
                // Extract token usage from outputs (for LLM runs)
                const tokenUsage = this.getUnifiedRunTokens(outputs);
                if (tokenUsage) {
                    span.setAttribute(constants.GEN_AI_USAGE_INPUT_TOKENS, tokenUsage[0]);
                    span.setAttribute(constants.GEN_AI_USAGE_OUTPUT_TOKENS, tokenUsage[1]);
                    span.setAttribute(constants.GEN_AI_USAGE_TOTAL_TOKENS, tokenUsage[0] + tokenUsage[1]);
                }
                if (outputs && typeof outputs === "object") {
                    if (outputs.model) {
                        span.setAttribute(constants.GEN_AI_RESPONSE_MODEL, String(outputs.model));
                    }
                    // Extract additional response attributes
                    if (outputs.id) {
                        span.setAttribute(constants.GEN_AI_RESPONSE_ID, outputs.id);
                    }
                    if (outputs.choices && Array.isArray(outputs.choices)) {
                        const finishReasons = outputs.choices
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .map((choice) => choice.finish_reason)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .filter((reason) => reason)
                            .map(String);
                        if (finishReasons.length > 0) {
                            span.setAttribute(constants.GEN_AI_RESPONSE_FINISH_REASONS, finishReasons.join(", "));
                        }
                    }
                    if (outputs.service_tier) {
                        span.setAttribute(constants.GEN_AI_RESPONSE_SERVICE_TIER, outputs.service_tier);
                    }
                    if (outputs.system_fingerprint) {
                        span.setAttribute(constants.GEN_AI_RESPONSE_SYSTEM_FINGERPRINT, outputs.system_fingerprint);
                    }
                    if (outputs.usage_metadata &&
                        typeof outputs.usage_metadata === "object") {
                        const usageMetadata = outputs.usage_metadata;
                        if (usageMetadata.input_token_details) {
                            span.setAttribute(constants.GEN_AI_USAGE_INPUT_TOKEN_DETAILS, JSON.stringify(usageMetadata.input_token_details));
                        }
                        if (usageMetadata.output_token_details) {
                            span.setAttribute(constants.GEN_AI_USAGE_OUTPUT_TOKEN_DETAILS, JSON.stringify(usageMetadata.output_token_details));
                        }
                    }
                }
                span.setAttribute(constants.GENAI_COMPLETION, JSON.stringify(outputs));
            }
            catch (e) {
                console.debug(`Failed to process outputs for run ${op.id}`, e);
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getUnifiedRunTokens(outputs) {
        if (!outputs) {
            return null;
        }
        // Search in non-generations lists
        let tokenUsage = this.extractUnifiedRunTokens(outputs.usage_metadata);
        if (tokenUsage) {
            return tokenUsage;
        }
        // Find if direct kwarg in outputs
        const keys = Object.keys(outputs);
        for (const key of keys) {
            const haystack = outputs[key];
            if (!haystack || typeof haystack !== "object") {
                continue;
            }
            tokenUsage = this.extractUnifiedRunTokens(haystack.usage_metadata);
            if (tokenUsage) {
                return tokenUsage;
            }
            if (haystack.lc === 1 &&
                haystack.kwargs &&
                typeof haystack.kwargs === "object") {
                tokenUsage = this.extractUnifiedRunTokens(haystack.kwargs.usage_metadata);
                if (tokenUsage) {
                    return tokenUsage;
                }
            }
        }
        // Find in generations
        const generations = outputs.generations || [];
        if (!Array.isArray(generations)) {
            return null;
        }
        const flatGenerations = Array.isArray(generations[0])
            ? generations.flat()
            : generations;
        for (const generation of flatGenerations) {
            if (typeof generation === "object" &&
                generation.message &&
                typeof generation.message === "object" &&
                generation.message.kwargs &&
                typeof generation.message.kwargs === "object") {
                tokenUsage = this.extractUnifiedRunTokens(generation.message.kwargs.usage_metadata);
                if (tokenUsage) {
                    return tokenUsage;
                }
            }
        }
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractUnifiedRunTokens(outputs) {
        if (!outputs || typeof outputs !== "object") {
            return null;
        }
        if (typeof outputs.input_tokens !== "number" ||
            typeof outputs.output_tokens !== "number") {
            return null;
        }
        return [outputs.input_tokens, outputs.output_tokens];
    }
}
exports.LangSmithToOTELTranslator = LangSmithToOTELTranslator;
