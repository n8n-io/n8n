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
exports.LangSmithOTLPTraceExporter = void 0;
const exporter_trace_otlp_proto_1 = require("@opentelemetry/exporter-trace-otlp-proto");
const constants = __importStar(require("./constants.cjs"));
const env_js_1 = require("../../env.cjs");
const env_js_2 = require("../../utils/env.cjs");
const vercel_js_1 = require("../../utils/vercel.cjs");
/**
 * Convert headers string in format "name=value,name2=value2" to object
 */
function parseHeadersString(headersStr) {
    const headers = {};
    if (!headersStr)
        return headers;
    headersStr.split(",").forEach((pair) => {
        const [name, ...valueParts] = pair.split("=");
        if (name && valueParts.length > 0) {
            headers[name.trim()] = valueParts.join("=").trim();
        }
    });
    return headers;
}
/**
 * LangSmith OpenTelemetry trace exporter that extends the standard OTLP trace exporter
 * with LangSmith-specific configuration and span attribute transformations.
 *
 * This exporter automatically configures itself with LangSmith endpoints and API keys,
 * based on your LANGSMITH_API_KEY and LANGSMITH_PROJECT environment variables.
 * Will also respect OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_HEADERS environment
 * variables if set.
 *
 * @param config - Optional configuration object that accepts all OTLPTraceExporter parameters.
 *                 If not provided, uses default LangSmith configuration:
 *                 - `url`: Defaults to LangSmith OTEL endpoint (`${LANGSMITH_ENDPOINT}/otel/v1/traces`)
 *                 - `headers`: Auto-configured with LangSmith API key and project headers
 *                 Any provided config will override these defaults.
 */
class LangSmithOTLPTraceExporter extends exporter_trace_otlp_proto_1.OTLPTraceExporter {
    constructor(config) {
        const defaultLsEndpoint = (0, env_js_2.getLangSmithEnvironmentVariable)("ENDPOINT") ||
            "https://api.smith.langchain.com";
        const defaultBaseUrl = defaultLsEndpoint.replace(/\/$/, "");
        const defaultUrl = (0, env_js_2.getEnvironmentVariable)("OTEL_EXPORTER_OTLP_ENDPOINT") ??
            `${defaultBaseUrl}/otel/v1/traces`;
        // Configure headers with API key and project if available
        let headers = config?.headers;
        if (headers === undefined) {
            let defaultHeaderString = (0, env_js_2.getEnvironmentVariable)("OTEL_EXPORTER_OTLP_HEADERS") ?? "";
            if (!defaultHeaderString) {
                const apiKey = config?.apiKey ?? (0, env_js_2.getLangSmithEnvironmentVariable)("API_KEY");
                if (apiKey) {
                    defaultHeaderString = `x-api-key=${apiKey}`;
                }
            }
            headers = parseHeadersString(defaultHeaderString);
        }
        super({
            url: defaultUrl,
            headers,
            ...config,
        });
        Object.defineProperty(this, "transformExportedSpan", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "projectName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transformExportedSpan = config?.transformExportedSpan;
        this.projectName =
            config?.projectName ?? (0, env_js_2.getLangSmithEnvironmentVariable)("PROJECT");
    }
    export(spans, resultCallback) {
        if (!(0, env_js_1.isTracingEnabled)()) {
            return resultCallback({ code: 0 });
        }
        const runExport = async () => {
            for (let span of spans) {
                if (this.transformExportedSpan) {
                    span = await this.transformExportedSpan(span);
                }
                if (!span.attributes[constants.GENAI_PROMPT]) {
                    if (span.attributes["ai.prompt"]) {
                        span.attributes[constants.GENAI_PROMPT] =
                            span.attributes["ai.prompt"];
                    }
                    if (span.attributes["ai.prompt.messages"] &&
                        typeof span.attributes["ai.prompt.messages"] === "string") {
                        let messages;
                        try {
                            messages = JSON.parse(span.attributes["ai.prompt.messages"]);
                        }
                        catch (e) {
                            console.error("Failed to parse ai.prompt.messages", e);
                        }
                        if (messages && Array.isArray(messages)) {
                            span.attributes[constants.GENAI_PROMPT] = JSON.stringify({
                                input: messages,
                            });
                        }
                    }
                    if (span.attributes["ai.toolCall.input"]) {
                        span.attributes[constants.GENAI_PROMPT] =
                            span.attributes["ai.toolCall.input"];
                    }
                    else if (span.attributes["ai.toolCall.args"]) {
                        span.attributes[constants.GENAI_PROMPT] =
                            span.attributes["ai.toolCall.args"];
                    }
                }
                // Iterate over all attributes starting with "ai.telemetry.metadata"
                for (const [key, value] of Object.entries(span.attributes)) {
                    if (key.startsWith("ai.telemetry.metadata.")) {
                        if (key === "ai.telemetry.metadata.ls_project_name") {
                            span.attributes[constants.LANGSMITH_SESSION_NAME] = value;
                        }
                        else if (key === "ai.telemetry.metadata.ls_project_id") {
                            span.attributes[constants.LANGSMITH_SESSION_ID] = value;
                        }
                        else {
                            const metadataKey = key.replace("ai.telemetry.metadata.", "");
                            span.attributes[`${constants.LANGSMITH_METADATA}.${metadataKey}`] = value;
                        }
                        delete span.attributes[key];
                    }
                }
                if (!span.attributes[constants.GENAI_COMPLETION]) {
                    if (span.attributes["ai.response.text"]) {
                        span.attributes[constants.GENAI_COMPLETION] =
                            span.attributes["ai.response.text"];
                    }
                    if (span.attributes["ai.response.choices"]) {
                        span.attributes[constants.GENAI_COMPLETION] =
                            span.attributes["ai.response.choices"];
                    }
                    if (span.attributes["ai.response.object"]) {
                        span.attributes[constants.GENAI_COMPLETION] =
                            span.attributes["ai.response.object"];
                    }
                    if (span.attributes["ai.response.toolCalls"]) {
                        span.attributes[constants.GENAI_COMPLETION] =
                            span.attributes["ai.response.toolCalls"];
                    }
                    if (span.attributes["ai.toolCall.output"]) {
                        span.attributes[constants.GENAI_COMPLETION] =
                            span.attributes["ai.toolCall.output"];
                    }
                    else if (span.attributes["ai.toolCall.result"]) {
                        span.attributes[constants.GENAI_COMPLETION] =
                            span.attributes["ai.toolCall.result"];
                    }
                }
                if (typeof span.attributes["ai.operationId"] === "string" &&
                    constants.AI_SDK_LLM_OPERATIONS.includes(span.attributes["ai.operationId"])) {
                    span.attributes[constants.LANGSMITH_RUN_TYPE] = "llm";
                    const usageMetadata = (0, vercel_js_1.extractUsageMetadata)(span);
                    span.attributes[constants.LANGSMITH_USAGE_METADATA] =
                        JSON.stringify(usageMetadata);
                }
                else if (typeof span.attributes["ai.operationId"] === "string" &&
                    constants.AI_SDK_TOOL_OPERATIONS.includes(span.attributes["ai.operationId"])) {
                    span.attributes[constants.LANGSMITH_RUN_TYPE] = "tool";
                    if (span.attributes["ai.toolCall.name"]) {
                        span.attributes[constants.LANGSMITH_NAME] =
                            span.attributes["ai.toolCall.name"];
                    }
                }
                if (span.attributes[`${constants.LANGSMITH_METADATA}.ls_run_name`]) {
                    span.attributes[constants.LANGSMITH_NAME] =
                        span.attributes[`${constants.LANGSMITH_METADATA}.ls_run_name`];
                    delete span.attributes[`${constants.LANGSMITH_METADATA}.ls_run_name`];
                }
                if (span.attributes[constants.LANGSMITH_SESSION_NAME] === undefined &&
                    this.projectName !== undefined) {
                    span.attributes[constants.LANGSMITH_SESSION_NAME] = this.projectName;
                }
            }
            super.export(spans, resultCallback);
        };
        void runExport();
    }
}
exports.LangSmithOTLPTraceExporter = LangSmithOTLPTraceExporter;
