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
exports.Client = exports.AutoBatchQueue = exports.DEFAULT_MAX_SIZE_BYTES = exports.DEFAULT_UNCOMPRESSED_BATCH_SIZE_LIMIT_BYTES = void 0;
exports.mergeRuntimeEnvIntoRun = mergeRuntimeEnvIntoRun;
const uuid = __importStar(require("uuid"));
const translator_js_1 = require("./experimental/otel/translator.cjs");
const otel_js_1 = require("./singletons/otel.cjs");
const async_caller_js_1 = require("./utils/async_caller.cjs");
const messages_js_1 = require("./utils/messages.cjs");
const env_js_1 = require("./utils/env.cjs");
const index_js_1 = require("./index.cjs");
const _uuid_js_1 = require("./utils/_uuid.cjs");
const warn_js_1 = require("./utils/warn.cjs");
const prompts_js_1 = require("./utils/prompts.cjs");
const error_js_1 = require("./utils/error.cjs");
const prompts_cache_js_1 = require("./utils/prompts_cache.cjs");
const fetch_js_1 = require("./singletons/fetch.cjs");
const index_js_2 = require("./utils/fast-safe-stringify/index.cjs");
function mergeRuntimeEnvIntoRun(run, cachedEnvVars, omitTracedRuntimeInfo) {
    if (omitTracedRuntimeInfo) {
        return run;
    }
    const runtimeEnv = (0, env_js_1.getRuntimeEnvironment)();
    const envVars = cachedEnvVars ?? (0, env_js_1.getLangSmithEnvVarsMetadata)();
    const extra = run.extra ?? {};
    const metadata = extra.metadata;
    run.extra = {
        ...extra,
        runtime: {
            ...runtimeEnv,
            ...extra?.runtime,
        },
        metadata: {
            ...envVars,
            ...(envVars.revision_id || ("revision_id" in run && run.revision_id)
                ? {
                    revision_id: ("revision_id" in run ? run.revision_id : undefined) ??
                        envVars.revision_id,
                }
                : {}),
            ...metadata,
        },
    };
    return run;
}
const getTracingSamplingRate = (configRate) => {
    const samplingRateStr = configRate?.toString() ??
        (0, env_js_1.getLangSmithEnvironmentVariable)("TRACING_SAMPLING_RATE");
    if (samplingRateStr === undefined) {
        return undefined;
    }
    const samplingRate = parseFloat(samplingRateStr);
    if (samplingRate < 0 || samplingRate > 1) {
        throw new Error(`LANGSMITH_TRACING_SAMPLING_RATE must be between 0 and 1 if set. Got: ${samplingRate}`);
    }
    return samplingRate;
};
// utility functions
const isLocalhost = (url) => {
    const strippedUrl = url.replace("http://", "").replace("https://", "");
    const hostname = strippedUrl.split("/")[0].split(":")[0];
    return (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1");
};
async function toArray(iterable) {
    const result = [];
    for await (const item of iterable) {
        result.push(item);
    }
    return result;
}
function trimQuotes(str) {
    if (str === undefined) {
        return undefined;
    }
    return str
        .trim()
        .replace(/^"(.*)"$/, "$1")
        .replace(/^'(.*)'$/, "$1");
}
const handle429 = async (response) => {
    if (response?.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") ?? "10", 10) * 1000;
        if (retryAfter > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
            // Return directly after calling this check
            return true;
        }
    }
    // Fall back to existing status checks
    return false;
};
function _formatFeedbackScore(score) {
    if (typeof score === "number") {
        // Truncate at 4 decimal places
        return Number(score.toFixed(4));
    }
    return score;
}
exports.DEFAULT_UNCOMPRESSED_BATCH_SIZE_LIMIT_BYTES = 24 * 1024 * 1024;
/** Default maximum memory (1GB) for queue size limits. */
exports.DEFAULT_MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB
const SERVER_INFO_REQUEST_TIMEOUT_MS = 10000;
/** Maximum number of operations to batch in a single request. */
const DEFAULT_BATCH_SIZE_LIMIT = 100;
const DEFAULT_API_URL = "https://api.smith.langchain.com";
class AutoBatchQueue {
    constructor(maxSizeBytes) {
        Object.defineProperty(this, "items", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "sizeBytes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "maxSizeBytes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxSizeBytes = maxSizeBytes ?? exports.DEFAULT_MAX_SIZE_BYTES;
    }
    peek() {
        return this.items[0];
    }
    push(item) {
        let itemPromiseResolve;
        const itemPromise = new Promise((resolve) => {
            // Setting itemPromiseResolve is synchronous with promise creation:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise
            itemPromiseResolve = resolve;
        });
        const size = (0, index_js_2.serialize)(item.item, `Serializing run with id: ${item.item.id}`).length;
        // Check if adding this item would exceed the size limit
        // Allow the run if the queue is empty (to support large single traces)
        if (this.sizeBytes + size > this.maxSizeBytes && this.items.length > 0) {
            console.warn(`AutoBatchQueue size limit (${this.maxSizeBytes} bytes) exceeded. Dropping run with id: ${item.item.id}. ` +
                `Current queue size: ${this.sizeBytes} bytes, attempted addition: ${size} bytes.`);
            // Resolve immediately to avoid blocking caller
            itemPromiseResolve();
            return itemPromise;
        }
        this.items.push({
            action: item.action,
            payload: item.item,
            otelContext: item.otelContext,
            apiKey: item.apiKey,
            apiUrl: item.apiUrl,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemPromiseResolve: itemPromiseResolve,
            itemPromise,
            size,
        });
        this.sizeBytes += size;
        return itemPromise;
    }
    pop({ upToSizeBytes, upToSize, }) {
        if (upToSizeBytes < 1) {
            throw new Error("Number of bytes to pop off may not be less than 1.");
        }
        const popped = [];
        let poppedSizeBytes = 0;
        // Pop items until we reach or exceed the size limit
        while (poppedSizeBytes + (this.peek()?.size ?? 0) < upToSizeBytes &&
            this.items.length > 0 &&
            popped.length < upToSize) {
            const item = this.items.shift();
            if (item) {
                popped.push(item);
                poppedSizeBytes += item.size;
                this.sizeBytes -= item.size;
            }
        }
        // If there is an item on the queue we were unable to pop,
        // just return it as a single batch.
        if (popped.length === 0 && this.items.length > 0) {
            const item = this.items.shift();
            popped.push(item);
            poppedSizeBytes += item.size;
            this.sizeBytes -= item.size;
        }
        return [
            popped.map((it) => ({
                action: it.action,
                item: it.payload,
                otelContext: it.otelContext,
                apiKey: it.apiKey,
                apiUrl: it.apiUrl,
                size: it.size,
            })),
            () => popped.forEach((it) => it.itemPromiseResolve()),
        ];
    }
}
exports.AutoBatchQueue = AutoBatchQueue;
class Client {
    get _fetch() {
        return this.fetchImplementation || (0, fetch_js_1._getFetchImplementation)(this.debug);
    }
    constructor(config = {}) {
        Object.defineProperty(this, "apiKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "apiUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "webUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "workspaceId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "caller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "batchIngestCaller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "timeout_ms", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_tenantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "hideInputs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hideOutputs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "omitTracedRuntimeInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tracingSampleRate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "filteredPostUuids", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "autoBatchTracing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "autoBatchQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoBatchTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoBatchAggregationDelayMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 250
        });
        Object.defineProperty(this, "batchSizeBytesLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "batchSizeLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "settings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "blockOnRootRunFinalization", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, env_js_1.getEnvironmentVariable)("LANGSMITH_TRACING_BACKGROUND") === "false"
        });
        Object.defineProperty(this, "traceBatchConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 5
        });
        Object.defineProperty(this, "_serverInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.defineProperty(this, "_getServerInfoPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "manualFlushMode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "langSmithToOTELTranslator", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchImplementation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cachedLSEnvVarsForMetadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "multipartStreamingDisabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_multipartDisabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_runCompressionDisabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, env_js_1.getLangSmithEnvironmentVariable)("DISABLE_RUN_COMPRESSION") === "true"
        });
        Object.defineProperty(this, "debug", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, env_js_1.getEnvironmentVariable)("LANGSMITH_DEBUG") === "true"
        });
        const defaultConfig = Client.getDefaultClientConfig();
        this.tracingSampleRate = getTracingSamplingRate(config.tracingSamplingRate);
        this.apiUrl = trimQuotes(config.apiUrl ?? defaultConfig.apiUrl) ?? "";
        if (this.apiUrl.endsWith("/")) {
            this.apiUrl = this.apiUrl.slice(0, -1);
        }
        this.apiKey = trimQuotes(config.apiKey ?? defaultConfig.apiKey);
        this.webUrl = trimQuotes(config.webUrl ?? defaultConfig.webUrl);
        if (this.webUrl?.endsWith("/")) {
            this.webUrl = this.webUrl.slice(0, -1);
        }
        this.workspaceId = trimQuotes(config.workspaceId ?? (0, env_js_1.getLangSmithEnvironmentVariable)("WORKSPACE_ID"));
        this.timeout_ms = config.timeout_ms ?? 90_000;
        this.caller = new async_caller_js_1.AsyncCaller({
            ...(config.callerOptions ?? {}),
            maxRetries: 4,
            debug: config.debug ?? this.debug,
        });
        this.traceBatchConcurrency =
            config.traceBatchConcurrency ?? this.traceBatchConcurrency;
        if (this.traceBatchConcurrency < 1) {
            throw new Error("Trace batch concurrency must be positive.");
        }
        this.debug = config.debug ?? this.debug;
        this.fetchImplementation = config.fetchImplementation;
        // Use maxIngestMemoryBytes for both queues
        const maxMemory = config.maxIngestMemoryBytes ?? exports.DEFAULT_MAX_SIZE_BYTES;
        this.batchIngestCaller = new async_caller_js_1.AsyncCaller({
            maxRetries: 4,
            maxConcurrency: this.traceBatchConcurrency,
            maxQueueSizeBytes: maxMemory,
            ...(config.callerOptions ?? {}),
            onFailedResponseHook: handle429,
            debug: config.debug ?? this.debug,
        });
        this.hideInputs =
            config.hideInputs ?? config.anonymizer ?? defaultConfig.hideInputs;
        this.hideOutputs =
            config.hideOutputs ?? config.anonymizer ?? defaultConfig.hideOutputs;
        this.omitTracedRuntimeInfo = config.omitTracedRuntimeInfo ?? false;
        this.autoBatchTracing = config.autoBatchTracing ?? this.autoBatchTracing;
        this.autoBatchQueue = new AutoBatchQueue(maxMemory);
        this.blockOnRootRunFinalization =
            config.blockOnRootRunFinalization ?? this.blockOnRootRunFinalization;
        this.batchSizeBytesLimit = config.batchSizeBytesLimit;
        this.batchSizeLimit = config.batchSizeLimit;
        this.fetchOptions = config.fetchOptions || {};
        this.manualFlushMode = config.manualFlushMode ?? this.manualFlushMode;
        if ((0, env_js_1.getOtelEnabled)()) {
            this.langSmithToOTELTranslator = new translator_js_1.LangSmithToOTELTranslator();
        }
        // Cache metadata env vars once during construction to avoid repeatedly scanning process.env
        this.cachedLSEnvVarsForMetadata = (0, env_js_1.getLangSmithEnvVarsMetadata)();
        // Initialize cache
        if (config.cache === true) {
            this._cache = new prompts_cache_js_1.Cache();
        }
        else if (config.cache && typeof config.cache === "object") {
            this._cache = config.cache;
        }
        else {
            this._cache = undefined;
        }
    }
    static getDefaultClientConfig() {
        const apiKey = (0, env_js_1.getLangSmithEnvironmentVariable)("API_KEY");
        const apiUrl = (0, env_js_1.getLangSmithEnvironmentVariable)("ENDPOINT") ?? DEFAULT_API_URL;
        const hideInputs = (0, env_js_1.getLangSmithEnvironmentVariable)("HIDE_INPUTS") === "true";
        const hideOutputs = (0, env_js_1.getLangSmithEnvironmentVariable)("HIDE_OUTPUTS") === "true";
        return {
            apiUrl: apiUrl,
            apiKey: apiKey,
            webUrl: undefined,
            hideInputs: hideInputs,
            hideOutputs: hideOutputs,
        };
    }
    getHostUrl() {
        if (this.webUrl) {
            return this.webUrl;
        }
        else if (isLocalhost(this.apiUrl)) {
            this.webUrl = "http://localhost:3000";
            return this.webUrl;
        }
        else if (this.apiUrl.endsWith("/api/v1")) {
            this.webUrl = this.apiUrl.replace("/api/v1", "");
            return this.webUrl;
        }
        else if (this.apiUrl.includes("/api") &&
            !this.apiUrl.split(".", 1)[0].endsWith("api")) {
            this.webUrl = this.apiUrl.replace("/api", "");
            return this.webUrl;
        }
        else if (this.apiUrl.split(".", 1)[0].includes("dev")) {
            this.webUrl = "https://dev.smith.langchain.com";
            return this.webUrl;
        }
        else if (this.apiUrl.split(".", 1)[0].includes("eu")) {
            this.webUrl = "https://eu.smith.langchain.com";
            return this.webUrl;
        }
        else if (this.apiUrl.split(".", 1)[0].includes("beta")) {
            this.webUrl = "https://beta.smith.langchain.com";
            return this.webUrl;
        }
        else {
            this.webUrl = "https://smith.langchain.com";
            return this.webUrl;
        }
    }
    get headers() {
        const headers = {
            "User-Agent": `langsmith-js/${index_js_1.__version__}`,
        };
        if (this.apiKey) {
            headers["x-api-key"] = `${this.apiKey}`;
        }
        if (this.workspaceId) {
            headers["x-tenant-id"] = this.workspaceId;
        }
        return headers;
    }
    _getPlatformEndpointPath(path) {
        // Check if apiUrl already ends with /v1 or /v1/ to avoid double /v1/v1/ paths
        const needsV1Prefix = this.apiUrl.slice(-3) !== "/v1" && this.apiUrl.slice(-4) !== "/v1/";
        return needsV1Prefix ? `/v1/platform/${path}` : `/platform/${path}`;
    }
    async processInputs(inputs) {
        if (this.hideInputs === false) {
            return inputs;
        }
        if (this.hideInputs === true) {
            return {};
        }
        if (typeof this.hideInputs === "function") {
            return this.hideInputs(inputs);
        }
        return inputs;
    }
    async processOutputs(outputs) {
        if (this.hideOutputs === false) {
            return outputs;
        }
        if (this.hideOutputs === true) {
            return {};
        }
        if (typeof this.hideOutputs === "function") {
            return this.hideOutputs(outputs);
        }
        return outputs;
    }
    async prepareRunCreateOrUpdateInputs(run) {
        const runParams = { ...run };
        if (runParams.inputs !== undefined) {
            runParams.inputs = await this.processInputs(runParams.inputs);
        }
        if (runParams.outputs !== undefined) {
            runParams.outputs = await this.processOutputs(runParams.outputs);
        }
        return runParams;
    }
    async _getResponse(path, queryParams) {
        const paramsString = queryParams?.toString() ?? "";
        const url = `${this.apiUrl}${path}?${paramsString}`;
        const response = await this.caller.call(async () => {
            const res = await this._fetch(url, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, `fetch ${path}`);
            return res;
        });
        return response;
    }
    async _get(path, queryParams) {
        const response = await this._getResponse(path, queryParams);
        return response.json();
    }
    async *_getPaginated(path, queryParams = new URLSearchParams(), transform) {
        let offset = Number(queryParams.get("offset")) || 0;
        const limit = Number(queryParams.get("limit")) || 100;
        while (true) {
            queryParams.set("offset", String(offset));
            queryParams.set("limit", String(limit));
            const url = `${this.apiUrl}${path}?${queryParams}`;
            const response = await this.caller.call(async () => {
                const res = await this._fetch(url, {
                    method: "GET",
                    headers: this.headers,
                    signal: AbortSignal.timeout(this.timeout_ms),
                    ...this.fetchOptions,
                });
                await (0, error_js_1.raiseForStatus)(res, `fetch ${path}`);
                return res;
            });
            const items = transform
                ? transform(await response.json())
                : await response.json();
            if (items.length === 0) {
                break;
            }
            yield items;
            if (items.length < limit) {
                break;
            }
            offset += items.length;
        }
    }
    async *_getCursorPaginatedList(path, body = null, requestMethod = "POST", dataKey = "runs") {
        const bodyParams = body ? { ...body } : {};
        while (true) {
            const body = JSON.stringify(bodyParams);
            const response = await this.caller.call(async () => {
                const res = await this._fetch(`${this.apiUrl}${path}`, {
                    method: requestMethod,
                    headers: { ...this.headers, "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(this.timeout_ms),
                    ...this.fetchOptions,
                    body,
                });
                await (0, error_js_1.raiseForStatus)(res, `fetch ${path}`);
                return res;
            });
            const responseBody = await response.json();
            if (!responseBody) {
                break;
            }
            if (!responseBody[dataKey]) {
                break;
            }
            yield responseBody[dataKey];
            const cursors = responseBody.cursors;
            if (!cursors) {
                break;
            }
            if (!cursors.next) {
                break;
            }
            bodyParams.cursor = cursors.next;
        }
    }
    // Allows mocking for tests
    _shouldSample() {
        if (this.tracingSampleRate === undefined) {
            return true;
        }
        return Math.random() < this.tracingSampleRate;
    }
    _filterForSampling(runs, patch = false) {
        if (this.tracingSampleRate === undefined) {
            return runs;
        }
        if (patch) {
            const sampled = [];
            for (const run of runs) {
                if (!this.filteredPostUuids.has(run.trace_id)) {
                    sampled.push(run);
                }
                else if (run.id === run.trace_id) {
                    this.filteredPostUuids.delete(run.trace_id);
                }
            }
            return sampled;
        }
        else {
            // For new runs, sample at trace level to maintain consistency
            const sampled = [];
            for (const run of runs) {
                const traceId = run.trace_id ?? run.id;
                // If we've already made a decision about this trace, follow it
                if (this.filteredPostUuids.has(traceId)) {
                    continue;
                }
                // For new traces, apply sampling
                if (run.id === traceId) {
                    if (this._shouldSample()) {
                        sampled.push(run);
                    }
                    else {
                        this.filteredPostUuids.add(traceId);
                    }
                }
                else {
                    // Child runs follow their trace's sampling decision
                    sampled.push(run);
                }
            }
            return sampled;
        }
    }
    async _getBatchSizeLimitBytes() {
        const serverInfo = await this._ensureServerInfo();
        return (this.batchSizeBytesLimit ??
            serverInfo?.batch_ingest_config?.size_limit_bytes ??
            exports.DEFAULT_UNCOMPRESSED_BATCH_SIZE_LIMIT_BYTES);
    }
    /**
     * Get the maximum number of operations to batch in a single request.
     */
    async _getBatchSizeLimit() {
        const serverInfo = await this._ensureServerInfo();
        return (this.batchSizeLimit ??
            serverInfo?.batch_ingest_config?.size_limit ??
            DEFAULT_BATCH_SIZE_LIMIT);
    }
    async _getDatasetExamplesMultiPartSupport() {
        const serverInfo = await this._ensureServerInfo();
        return (serverInfo.instance_flags?.dataset_examples_multipart_enabled ?? false);
    }
    drainAutoBatchQueue({ batchSizeLimitBytes, batchSizeLimit, }) {
        const promises = [];
        while (this.autoBatchQueue.items.length > 0) {
            const [batch, done] = this.autoBatchQueue.pop({
                upToSizeBytes: batchSizeLimitBytes,
                upToSize: batchSizeLimit,
            });
            if (!batch.length) {
                done();
                break;
            }
            const batchesByDestination = batch.reduce((acc, item) => {
                const apiUrl = item.apiUrl ?? this.apiUrl;
                const apiKey = item.apiKey ?? this.apiKey;
                const isDefault = item.apiKey === this.apiKey && item.apiUrl === this.apiUrl;
                const batchKey = isDefault ? "default" : `${apiUrl}|${apiKey}`;
                if (!acc[batchKey]) {
                    acc[batchKey] = [];
                }
                acc[batchKey].push(item);
                return acc;
            }, {});
            const batchPromises = [];
            for (const [batchKey, batch] of Object.entries(batchesByDestination)) {
                const batchPromise = this._processBatch(batch, {
                    apiUrl: batchKey === "default" ? undefined : batchKey.split("|")[0],
                    apiKey: batchKey === "default" ? undefined : batchKey.split("|")[1],
                });
                batchPromises.push(batchPromise);
            }
            // Wait for all batches to complete, then call the overall done callback
            const allBatchesPromise = Promise.all(batchPromises).finally(done);
            promises.push(allBatchesPromise);
        }
        return Promise.all(promises);
    }
    async _processBatch(batch, options) {
        if (!batch.length) {
            return;
        }
        // Calculate total batch size for queue tracking
        const batchSizeBytes = batch.reduce((sum, item) => sum + (item.size ?? 0), 0);
        try {
            if (this.langSmithToOTELTranslator !== undefined) {
                this._sendBatchToOTELTranslator(batch);
            }
            else {
                const ingestParams = {
                    runCreates: batch
                        .filter((item) => item.action === "create")
                        .map((item) => item.item),
                    runUpdates: batch
                        .filter((item) => item.action === "update")
                        .map((item) => item.item),
                };
                const serverInfo = await this._ensureServerInfo();
                const useMultipart = !this._multipartDisabled &&
                    (serverInfo?.batch_ingest_config?.use_multipart_endpoint ?? true);
                if (useMultipart) {
                    const useGzip = !this._runCompressionDisabled &&
                        serverInfo?.instance_flags?.gzip_body_enabled;
                    try {
                        await this.multipartIngestRuns(ingestParams, {
                            ...options,
                            useGzip,
                            sizeBytes: batchSizeBytes,
                        });
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }
                    catch (e) {
                        if ((0, error_js_1.isLangSmithNotFoundError)(e)) {
                            // Fallback to batch ingest if multipart endpoint returns 404
                            // Disable multipart for future requests
                            this._multipartDisabled = true;
                            await this.batchIngestRuns(ingestParams, {
                                ...options,
                                sizeBytes: batchSizeBytes,
                            });
                        }
                        else {
                            throw e;
                        }
                    }
                }
                else {
                    await this.batchIngestRuns(ingestParams, {
                        ...options,
                        sizeBytes: batchSizeBytes,
                    });
                }
            }
        }
        catch (e) {
            console.error("Error exporting batch:", e);
        }
    }
    _sendBatchToOTELTranslator(batch) {
        if (this.langSmithToOTELTranslator !== undefined) {
            const otelContextMap = new Map();
            const operations = [];
            for (const item of batch) {
                if (item.item.id && item.otelContext) {
                    otelContextMap.set(item.item.id, item.otelContext);
                    if (item.action === "create") {
                        operations.push({
                            operation: "post",
                            id: item.item.id,
                            trace_id: item.item.trace_id ?? item.item.id,
                            run: item.item,
                        });
                    }
                    else {
                        operations.push({
                            operation: "patch",
                            id: item.item.id,
                            trace_id: item.item.trace_id ?? item.item.id,
                            run: item.item,
                        });
                    }
                }
            }
            this.langSmithToOTELTranslator.exportBatch(operations, otelContextMap);
        }
    }
    async processRunOperation(item) {
        clearTimeout(this.autoBatchTimeout);
        this.autoBatchTimeout = undefined;
        item.item = mergeRuntimeEnvIntoRun(item.item, this.cachedLSEnvVarsForMetadata, this.omitTracedRuntimeInfo);
        const itemPromise = this.autoBatchQueue.push(item);
        if (this.manualFlushMode) {
            // Rely on manual flushing in serverless environments
            return itemPromise;
        }
        const sizeLimitBytes = await this._getBatchSizeLimitBytes();
        const sizeLimit = await this._getBatchSizeLimit();
        if (this.autoBatchQueue.sizeBytes > sizeLimitBytes ||
            this.autoBatchQueue.items.length > sizeLimit) {
            void this.drainAutoBatchQueue({
                batchSizeLimitBytes: sizeLimitBytes,
                batchSizeLimit: sizeLimit,
            });
        }
        if (this.autoBatchQueue.items.length > 0) {
            this.autoBatchTimeout = setTimeout(() => {
                this.autoBatchTimeout = undefined;
                void this.drainAutoBatchQueue({
                    batchSizeLimitBytes: sizeLimitBytes,
                    batchSizeLimit: sizeLimit,
                });
            }, this.autoBatchAggregationDelayMs);
        }
        return itemPromise;
    }
    async _getServerInfo() {
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/info`, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: AbortSignal.timeout(SERVER_INFO_REQUEST_TIMEOUT_MS),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "get server info");
            return res;
        });
        const json = await response.json();
        if (this.debug) {
            console.log("\n=== LangSmith Server Configuration ===\n" +
                JSON.stringify(json, null, 2) +
                "\n");
        }
        return json;
    }
    async _ensureServerInfo() {
        if (this._getServerInfoPromise === undefined) {
            this._getServerInfoPromise = (async () => {
                if (this._serverInfo === undefined) {
                    try {
                        this._serverInfo = await this._getServerInfo();
                    }
                    catch (e) {
                        console.warn(`[LANGSMITH]: Failed to fetch info on supported operations. Falling back to batch operations and default limits. Info: ${e.status ?? "Unspecified status code"} ${e.message}`);
                    }
                }
                return this._serverInfo ?? {};
            })();
        }
        return this._getServerInfoPromise.then((serverInfo) => {
            if (this._serverInfo === undefined) {
                this._getServerInfoPromise = undefined;
            }
            return serverInfo;
        });
    }
    async _getSettings() {
        if (!this.settings) {
            this.settings = this._get("/settings");
        }
        return await this.settings;
    }
    /**
     * Flushes current queued traces.
     */
    async flush() {
        const sizeLimitBytes = await this._getBatchSizeLimitBytes();
        const sizeLimit = await this._getBatchSizeLimit();
        await this.drainAutoBatchQueue({
            batchSizeLimitBytes: sizeLimitBytes,
            batchSizeLimit: sizeLimit,
        });
    }
    _cloneCurrentOTELContext() {
        const otel_trace = (0, otel_js_1.getOTELTrace)();
        const otel_context = (0, otel_js_1.getOTELContext)();
        if (this.langSmithToOTELTranslator !== undefined) {
            const currentSpan = otel_trace.getActiveSpan();
            if (currentSpan) {
                return otel_trace.setSpan(otel_context.active(), currentSpan);
            }
        }
        return undefined;
    }
    async createRun(run, options) {
        if (!this._filterForSampling([run]).length) {
            return;
        }
        const headers = {
            ...this.headers,
            "Content-Type": "application/json",
        };
        const session_name = run.project_name;
        delete run.project_name;
        const runCreate = await this.prepareRunCreateOrUpdateInputs({
            session_name,
            ...run,
            start_time: run.start_time ?? Date.now(),
        });
        if (this.autoBatchTracing &&
            runCreate.trace_id !== undefined &&
            runCreate.dotted_order !== undefined) {
            const otelContext = this._cloneCurrentOTELContext();
            void this.processRunOperation({
                action: "create",
                item: runCreate,
                otelContext,
                apiKey: options?.apiKey,
                apiUrl: options?.apiUrl,
            }).catch(console.error);
            return;
        }
        const mergedRunCreateParam = mergeRuntimeEnvIntoRun(runCreate, this.cachedLSEnvVarsForMetadata, this.omitTracedRuntimeInfo);
        if (options?.apiKey !== undefined) {
            headers["x-api-key"] = options.apiKey;
        }
        if (options?.workspaceId !== undefined) {
            headers["x-tenant-id"] = options.workspaceId;
        }
        const body = (0, index_js_2.serialize)(mergedRunCreateParam, `Creating run with id: ${mergedRunCreateParam.id}`);
        await this.caller.call(async () => {
            const res = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs`, {
                method: "POST",
                headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "create run", true);
            return res;
        });
    }
    /**
     * Batch ingest/upsert multiple runs in the Langsmith system.
     * @param runs
     */
    async batchIngestRuns({ runCreates, runUpdates, }, options) {
        if (runCreates === undefined && runUpdates === undefined) {
            return;
        }
        let preparedCreateParams = await Promise.all(runCreates?.map((create) => this.prepareRunCreateOrUpdateInputs(create)) ?? []);
        let preparedUpdateParams = await Promise.all(runUpdates?.map((update) => this.prepareRunCreateOrUpdateInputs(update)) ?? []);
        if (preparedCreateParams.length > 0 && preparedUpdateParams.length > 0) {
            const createById = preparedCreateParams.reduce((params, run) => {
                if (!run.id) {
                    return params;
                }
                params[run.id] = run;
                return params;
            }, {});
            const standaloneUpdates = [];
            for (const updateParam of preparedUpdateParams) {
                if (updateParam.id !== undefined && createById[updateParam.id]) {
                    createById[updateParam.id] = {
                        ...createById[updateParam.id],
                        ...updateParam,
                    };
                }
                else {
                    standaloneUpdates.push(updateParam);
                }
            }
            preparedCreateParams = Object.values(createById);
            preparedUpdateParams = standaloneUpdates;
        }
        const rawBatch = {
            post: preparedCreateParams,
            patch: preparedUpdateParams,
        };
        if (!rawBatch.post.length && !rawBatch.patch.length) {
            return;
        }
        const batchChunks = {
            post: [],
            patch: [],
        };
        for (const k of ["post", "patch"]) {
            const key = k;
            const batchItems = rawBatch[key].reverse();
            let batchItem = batchItems.pop();
            while (batchItem !== undefined) {
                // Type is wrong but this is a deprecated code path anyway
                batchChunks[key].push(batchItem);
                batchItem = batchItems.pop();
            }
        }
        if (batchChunks.post.length > 0 || batchChunks.patch.length > 0) {
            const runIds = batchChunks.post
                .map((item) => item.id)
                .concat(batchChunks.patch.map((item) => item.id))
                .join(",");
            await this._postBatchIngestRuns((0, index_js_2.serialize)(batchChunks, `Ingesting runs with ids: ${runIds}`), options);
        }
    }
    async _postBatchIngestRuns(body, options) {
        const headers = {
            ...this.headers,
            "Content-Type": "application/json",
            Accept: "application/json",
        };
        if (options?.apiKey !== undefined) {
            headers["x-api-key"] = options.apiKey;
        }
        await this.batchIngestCaller.callWithOptions({ sizeBytes: options?.sizeBytes }, async () => {
            const res = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs/batch`, {
                method: "POST",
                headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "batch create run", true);
            return res;
        });
    }
    /**
     * Batch ingest/upsert multiple runs in the Langsmith system.
     * @param runs
     */
    async multipartIngestRuns({ runCreates, runUpdates, }, options) {
        if (runCreates === undefined && runUpdates === undefined) {
            return;
        }
        // transform and convert to dicts
        const allAttachments = {};
        let preparedCreateParams = [];
        for (const create of runCreates ?? []) {
            const preparedCreate = await this.prepareRunCreateOrUpdateInputs(create);
            if (preparedCreate.id !== undefined &&
                preparedCreate.attachments !== undefined) {
                allAttachments[preparedCreate.id] = preparedCreate.attachments;
            }
            delete preparedCreate.attachments;
            preparedCreateParams.push(preparedCreate);
        }
        let preparedUpdateParams = [];
        for (const update of runUpdates ?? []) {
            preparedUpdateParams.push(await this.prepareRunCreateOrUpdateInputs(update));
        }
        // require trace_id and dotted_order
        const invalidRunCreate = preparedCreateParams.find((runCreate) => {
            return (runCreate.trace_id === undefined || runCreate.dotted_order === undefined);
        });
        if (invalidRunCreate !== undefined) {
            throw new Error(`Multipart ingest requires "trace_id" and "dotted_order" to be set when creating a run`);
        }
        const invalidRunUpdate = preparedUpdateParams.find((runUpdate) => {
            return (runUpdate.trace_id === undefined || runUpdate.dotted_order === undefined);
        });
        if (invalidRunUpdate !== undefined) {
            throw new Error(`Multipart ingest requires "trace_id" and "dotted_order" to be set when updating a run`);
        }
        // combine post and patch dicts where possible
        if (preparedCreateParams.length > 0 && preparedUpdateParams.length > 0) {
            const createById = preparedCreateParams.reduce((params, run) => {
                if (!run.id) {
                    return params;
                }
                params[run.id] = run;
                return params;
            }, {});
            const standaloneUpdates = [];
            for (const updateParam of preparedUpdateParams) {
                if (updateParam.id !== undefined && createById[updateParam.id]) {
                    createById[updateParam.id] = {
                        ...createById[updateParam.id],
                        ...updateParam,
                    };
                }
                else {
                    standaloneUpdates.push(updateParam);
                }
            }
            preparedCreateParams = Object.values(createById);
            preparedUpdateParams = standaloneUpdates;
        }
        if (preparedCreateParams.length === 0 &&
            preparedUpdateParams.length === 0) {
            return;
        }
        // send the runs in multipart requests
        const accumulatedContext = [];
        const accumulatedParts = [];
        for (const [method, payloads] of [
            ["post", preparedCreateParams],
            ["patch", preparedUpdateParams],
        ]) {
            for (const originalPayload of payloads) {
                // collect fields to be sent as separate parts
                const { inputs, outputs, events, extra, error, serialized, attachments, ...payload } = originalPayload;
                const fields = { inputs, outputs, events, extra, error, serialized };
                // encode the main run payload
                const stringifiedPayload = (0, index_js_2.serialize)(payload, `Serializing for multipart ingestion of run with id: ${payload.id}`);
                accumulatedParts.push({
                    name: `${method}.${payload.id}`,
                    payload: new Blob([stringifiedPayload], {
                        type: `application/json; length=${stringifiedPayload.length}`, // encoding=gzip
                    }),
                });
                // encode the fields we collected
                for (const [key, value] of Object.entries(fields)) {
                    if (value === undefined) {
                        continue;
                    }
                    const stringifiedValue = (0, index_js_2.serialize)(value, `Serializing ${key} for multipart ingestion of run with id: ${payload.id}`);
                    accumulatedParts.push({
                        name: `${method}.${payload.id}.${key}`,
                        payload: new Blob([stringifiedValue], {
                            type: `application/json; length=${stringifiedValue.length}`,
                        }),
                    });
                }
                // encode the attachments
                if (payload.id !== undefined) {
                    const attachments = allAttachments[payload.id];
                    if (attachments) {
                        delete allAttachments[payload.id];
                        for (const [name, attachment] of Object.entries(attachments)) {
                            let contentType;
                            let content;
                            if (Array.isArray(attachment)) {
                                [contentType, content] = attachment;
                            }
                            else {
                                contentType = attachment.mimeType;
                                content = attachment.data;
                            }
                            // Validate that the attachment name doesn't contain a '.'
                            if (name.includes(".")) {
                                console.warn(`Skipping attachment '${name}' for run ${payload.id}: Invalid attachment name. ` +
                                    `Attachment names must not contain periods ('.'). Please rename the attachment and try again.`);
                                continue;
                            }
                            accumulatedParts.push({
                                name: `attachment.${payload.id}.${name}`,
                                payload: new Blob([content], {
                                    type: `${contentType}; length=${content.byteLength}`,
                                }),
                            });
                        }
                    }
                }
                // compute context
                accumulatedContext.push(`trace=${payload.trace_id},id=${payload.id}`);
            }
        }
        await this._sendMultipartRequest(accumulatedParts, accumulatedContext.join("; "), options);
    }
    async _createNodeFetchBody(parts, boundary) {
        // Create multipart form data manually using Blobs
        const chunks = [];
        for (const part of parts) {
            // Add field boundary
            chunks.push(new Blob([`--${boundary}\r\n`]));
            chunks.push(new Blob([
                `Content-Disposition: form-data; name="${part.name}"\r\n`,
                `Content-Type: ${part.payload.type}\r\n\r\n`,
            ]));
            chunks.push(part.payload);
            chunks.push(new Blob(["\r\n"]));
        }
        // Add final boundary
        chunks.push(new Blob([`--${boundary}--\r\n`]));
        // Combine all chunks into a single Blob
        const body = new Blob(chunks);
        // Convert Blob to ArrayBuffer for compatibility
        const arrayBuffer = await body.arrayBuffer();
        return arrayBuffer;
    }
    async _createMultipartStream(parts, boundary) {
        const encoder = new TextEncoder();
        // Create a ReadableStream for streaming the multipart data
        // Only do special handling if we're using node-fetch
        const stream = new ReadableStream({
            async start(controller) {
                // Helper function to write a chunk to the stream
                const writeChunk = async (chunk) => {
                    if (typeof chunk === "string") {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    else {
                        controller.enqueue(chunk);
                    }
                };
                // Write each part to the stream
                for (const part of parts) {
                    // Write boundary and headers
                    await writeChunk(`--${boundary}\r\n`);
                    await writeChunk(`Content-Disposition: form-data; name="${part.name}"\r\n`);
                    await writeChunk(`Content-Type: ${part.payload.type}\r\n\r\n`);
                    // Write the payload
                    const payloadStream = part.payload.stream();
                    const reader = payloadStream.getReader();
                    try {
                        let result;
                        while (!(result = await reader.read()).done) {
                            controller.enqueue(result.value);
                        }
                    }
                    finally {
                        reader.releaseLock();
                    }
                    await writeChunk("\r\n");
                }
                // Write final boundary
                await writeChunk(`--${boundary}--\r\n`);
                controller.close();
            },
        });
        return stream;
    }
    async _sendMultipartRequest(parts, context, options) {
        // Create multipart form data boundary
        const boundary = "----LangSmithFormBoundary" + Math.random().toString(36).slice(2);
        const isNodeFetch = (0, fetch_js_1._globalFetchImplementationIsNodeFetch)();
        const buildBuffered = () => this._createNodeFetchBody(parts, boundary);
        const buildStream = () => this._createMultipartStream(parts, boundary);
        const sendWithRetry = async (bodyFactory) => {
            return this.batchIngestCaller.callWithOptions({ sizeBytes: options?.sizeBytes }, async () => {
                const body = await bodyFactory();
                const headers = {
                    ...this.headers,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                };
                if (options?.apiKey !== undefined) {
                    headers["x-api-key"] = options.apiKey;
                }
                let transformedBody = body;
                if (options?.useGzip &&
                    typeof body === "object" &&
                    "pipeThrough" in body) {
                    transformedBody = body.pipeThrough(new CompressionStream("gzip"));
                    headers["Content-Encoding"] = "gzip";
                }
                const response = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs/multipart`, {
                    method: "POST",
                    headers,
                    body: transformedBody,
                    duplex: "half",
                    signal: AbortSignal.timeout(this.timeout_ms),
                    ...this.fetchOptions,
                });
                await (0, error_js_1.raiseForStatus)(response, `Failed to send multipart request`, true);
                return response;
            });
        };
        try {
            let res;
            let streamedAttempt = false;
            // attempt stream only if not disabled and not using node-fetch or Bun
            if (!isNodeFetch &&
                !this.multipartStreamingDisabled &&
                (0, env_js_1.getEnv)() !== "bun") {
                streamedAttempt = true;
                res = await sendWithRetry(buildStream);
            }
            else {
                res = await sendWithRetry(buildBuffered);
            }
            // if stream fails, fallback to buffered body
            if ((!this.multipartStreamingDisabled || streamedAttempt) &&
                res.status === 422 &&
                (options?.apiUrl ?? this.apiUrl) !== DEFAULT_API_URL) {
                console.warn(`Streaming multipart upload to ${options?.apiUrl ?? this.apiUrl}/runs/multipart failed. ` +
                    `This usually means the host does not support chunked uploads. ` +
                    `Retrying with a buffered upload for operation "${context}".`);
                // Disable streaming for future requests
                this.multipartStreamingDisabled = true;
                // retry with fully-buffered body
                res = await sendWithRetry(buildBuffered);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            // Re-throw 404 errors so caller can fall back to batch ingest
            if ((0, error_js_1.isLangSmithNotFoundError)(e)) {
                throw e;
            }
            console.warn(`${e.message.trim()}\n\nContext: ${context}`);
        }
    }
    async updateRun(runId, run, options) {
        (0, _uuid_js_1.assertUuid)(runId);
        if (run.inputs) {
            run.inputs = await this.processInputs(run.inputs);
        }
        if (run.outputs) {
            run.outputs = await this.processOutputs(run.outputs);
        }
        // TODO: Untangle types
        const data = { ...run, id: runId };
        if (!this._filterForSampling([data], true).length) {
            return;
        }
        if (this.autoBatchTracing &&
            data.trace_id !== undefined &&
            data.dotted_order !== undefined) {
            const otelContext = this._cloneCurrentOTELContext();
            if (run.end_time !== undefined &&
                data.parent_run_id === undefined &&
                this.blockOnRootRunFinalization &&
                !this.manualFlushMode) {
                // Trigger batches as soon as a root trace ends and wait to ensure trace finishes
                // in serverless environments.
                await this.processRunOperation({
                    action: "update",
                    item: data,
                    otelContext,
                    apiKey: options?.apiKey,
                    apiUrl: options?.apiUrl,
                }).catch(console.error);
                return;
            }
            else {
                void this.processRunOperation({
                    action: "update",
                    item: data,
                    otelContext,
                    apiKey: options?.apiKey,
                    apiUrl: options?.apiUrl,
                }).catch(console.error);
            }
            return;
        }
        const headers = {
            ...this.headers,
            "Content-Type": "application/json",
        };
        if (options?.apiKey !== undefined) {
            headers["x-api-key"] = options.apiKey;
        }
        if (options?.workspaceId !== undefined) {
            headers["x-tenant-id"] = options.workspaceId;
        }
        const body = (0, index_js_2.serialize)(run, `Serializing payload to update run with id: ${runId}`);
        await this.caller.call(async () => {
            const res = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs/${runId}`, {
                method: "PATCH",
                headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update run", true);
            return res;
        });
    }
    async readRun(runId, { loadChildRuns } = { loadChildRuns: false }) {
        (0, _uuid_js_1.assertUuid)(runId);
        let run = await this._get(`/runs/${runId}`);
        if (loadChildRuns) {
            run = await this._loadChildRuns(run);
        }
        return run;
    }
    async getRunUrl({ runId, run, projectOpts, }) {
        if (run !== undefined) {
            let sessionId;
            if (run.session_id) {
                sessionId = run.session_id;
            }
            else if (projectOpts?.projectName) {
                sessionId = (await this.readProject({ projectName: projectOpts?.projectName })).id;
            }
            else if (projectOpts?.projectId) {
                sessionId = projectOpts?.projectId;
            }
            else {
                const project = await this.readProject({
                    projectName: (0, env_js_1.getLangSmithEnvironmentVariable)("PROJECT") || "default",
                });
                sessionId = project.id;
            }
            const tenantId = await this._getTenantId();
            return `${this.getHostUrl()}/o/${tenantId}/projects/p/${sessionId}/r/${run.id}?poll=true`;
        }
        else if (runId !== undefined) {
            const run_ = await this.readRun(runId);
            if (!run_.app_path) {
                throw new Error(`Run ${runId} has no app_path`);
            }
            const baseUrl = this.getHostUrl();
            return `${baseUrl}${run_.app_path}`;
        }
        else {
            throw new Error("Must provide either runId or run");
        }
    }
    async _loadChildRuns(run) {
        const childRuns = await toArray(this.listRuns({
            isRoot: false,
            projectId: run.session_id,
            traceId: run.trace_id,
        }));
        const treemap = {};
        const runs = {};
        // TODO: make dotted order required when the migration finishes
        childRuns.sort((a, b) => (a?.dotted_order ?? "").localeCompare(b?.dotted_order ?? ""));
        for (const childRun of childRuns) {
            if (childRun.parent_run_id === null ||
                childRun.parent_run_id === undefined) {
                throw new Error(`Child run ${childRun.id} has no parent`);
            }
            if (childRun.dotted_order?.startsWith(run.dotted_order ?? "") &&
                childRun.id !== run.id) {
                if (!(childRun.parent_run_id in treemap)) {
                    treemap[childRun.parent_run_id] = [];
                }
                treemap[childRun.parent_run_id].push(childRun);
                runs[childRun.id] = childRun;
            }
        }
        run.child_runs = treemap[run.id] || [];
        for (const runId in treemap) {
            if (runId !== run.id) {
                runs[runId].child_runs = treemap[runId];
            }
        }
        return run;
    }
    /**
     * List runs from the LangSmith server.
     * @param projectId - The ID of the project to filter by.
     * @param projectName - The name of the project to filter by.
     * @param parentRunId - The ID of the parent run to filter by.
     * @param traceId - The ID of the trace to filter by.
     * @param referenceExampleId - The ID of the reference example to filter by.
     * @param startTime - The start time to filter by.
     * @param isRoot - Indicates whether to only return root runs.
     * @param runType - The run type to filter by.
     * @param error - Indicates whether to filter by error runs.
     * @param id - The ID of the run to filter by.
     * @param query - The query string to filter by.
     * @param filter - The filter string to apply to the run spans.
     * @param traceFilter - The filter string to apply on the root run of the trace.
     * @param treeFilter - The filter string to apply on other runs in the trace.
     * @param limit - The maximum number of runs to retrieve.
     * @returns {AsyncIterable<Run>} - The runs.
     *
     * @example
     * // List all runs in a project
     * const projectRuns = client.listRuns({ projectName: "<your_project>" });
     *
     * @example
     * // List LLM and Chat runs in the last 24 hours
     * const todaysLLMRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
     *   run_type: "llm",
     * });
     *
     * @example
     * // List traces in a project
     * const rootRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   execution_order: 1,
     * });
     *
     * @example
     * // List runs without errors
     * const correctRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   error: false,
     * });
     *
     * @example
     * // List runs by run ID
     * const runIds = [
     *   "a36092d2-4ad5-4fb4-9c0d-0dba9a2ed836",
     *   "9398e6be-964f-4aa4-8ae9-ad78cd4b7074",
     * ];
     * const selectedRuns = client.listRuns({ run_ids: runIds });
     *
     * @example
     * // List all "chain" type runs that took more than 10 seconds and had `total_tokens` greater than 5000
     * const chainRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'and(eq(run_type, "chain"), gt(latency, 10), gt(total_tokens, 5000))',
     * });
     *
     * @example
     * // List all runs called "extractor" whose root of the trace was assigned feedback "user_score" score of 1
     * const goodExtractorRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'eq(name, "extractor")',
     *   traceFilter: 'and(eq(feedback_key, "user_score"), eq(feedback_score, 1))',
     * });
     *
     * @example
     * // List all runs that started after a specific timestamp and either have "error" not equal to null or a "Correctness" feedback score equal to 0
     * const complexRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'and(gt(start_time, "2023-07-15T12:34:56Z"), or(neq(error, null), and(eq(feedback_key, "Correctness"), eq(feedback_score, 0.0))))',
     * });
     *
     * @example
     * // List all runs where `tags` include "experimental" or "beta" and `latency` is greater than 2 seconds
     * const taggedRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'and(or(has(tags, "experimental"), has(tags, "beta")), gt(latency, 2))',
     * });
     */
    async *listRuns(props) {
        const { projectId, projectName, parentRunId, traceId, referenceExampleId, startTime, executionOrder, isRoot, runType, error, id, query, filter, traceFilter, treeFilter, limit, select, order, } = props;
        let projectIds = [];
        if (projectId) {
            projectIds = Array.isArray(projectId) ? projectId : [projectId];
        }
        if (projectName) {
            const projectNames = Array.isArray(projectName)
                ? projectName
                : [projectName];
            const projectIds_ = await Promise.all(projectNames.map((name) => this.readProject({ projectName: name }).then((project) => project.id)));
            projectIds.push(...projectIds_);
        }
        const default_select = [
            "app_path",
            "completion_cost",
            "completion_tokens",
            "dotted_order",
            "end_time",
            "error",
            "events",
            "extra",
            "feedback_stats",
            "first_token_time",
            "id",
            "inputs",
            "name",
            "outputs",
            "parent_run_id",
            "parent_run_ids",
            "prompt_cost",
            "prompt_tokens",
            "reference_example_id",
            "run_type",
            "session_id",
            "start_time",
            "status",
            "tags",
            "total_cost",
            "total_tokens",
            "trace_id",
        ];
        const body = {
            session: projectIds.length ? projectIds : null,
            run_type: runType,
            reference_example: referenceExampleId,
            query,
            filter,
            trace_filter: traceFilter,
            tree_filter: treeFilter,
            execution_order: executionOrder,
            parent_run: parentRunId,
            start_time: startTime ? startTime.toISOString() : null,
            error,
            id,
            limit,
            trace: traceId,
            select: select ? select : default_select,
            is_root: isRoot,
            order,
        };
        if (body.select.includes("child_run_ids")) {
            (0, warn_js_1.warnOnce)("Deprecated: 'child_run_ids' in the listRuns select parameter is deprecated and will be removed in a future version.");
        }
        let runsYielded = 0;
        for await (const runs of this._getCursorPaginatedList("/runs/query", body)) {
            if (limit) {
                if (runsYielded >= limit) {
                    break;
                }
                if (runs.length + runsYielded > limit) {
                    const newRuns = runs.slice(0, limit - runsYielded);
                    yield* newRuns;
                    break;
                }
                runsYielded += runs.length;
                yield* runs;
            }
            else {
                yield* runs;
            }
        }
    }
    async *listGroupRuns(props) {
        const { projectId, projectName, groupBy, filter, startTime, endTime, limit, offset, } = props;
        const sessionId = projectId || (await this.readProject({ projectName })).id;
        const baseBody = {
            session_id: sessionId,
            group_by: groupBy,
            filter,
            start_time: startTime ? startTime.toISOString() : null,
            end_time: endTime ? endTime.toISOString() : null,
            limit: Number(limit) || 100,
        };
        let currentOffset = Number(offset) || 0;
        const path = "/runs/group";
        const url = `${this.apiUrl}${path}`;
        while (true) {
            const currentBody = {
                ...baseBody,
                offset: currentOffset,
            };
            // Remove undefined values from the payload
            const filteredPayload = Object.fromEntries(Object.entries(currentBody).filter(([_, value]) => value !== undefined));
            const body = JSON.stringify(filteredPayload);
            const response = await this.caller.call(async () => {
                const res = await this._fetch(url, {
                    method: "POST",
                    headers: { ...this.headers, "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(this.timeout_ms),
                    ...this.fetchOptions,
                    body,
                });
                await (0, error_js_1.raiseForStatus)(res, `Failed to fetch ${path}`);
                return res;
            });
            const items = await response.json();
            const { groups, total } = items;
            if (groups.length === 0) {
                break;
            }
            for (const thread of groups) {
                yield thread;
            }
            currentOffset += groups.length;
            if (currentOffset >= total) {
                break;
            }
        }
    }
    async getRunStats({ id, trace, parentRun, runType, projectNames, projectIds, referenceExampleIds, startTime, endTime, error, query, filter, traceFilter, treeFilter, isRoot, dataSourceType, }) {
        let projectIds_ = projectIds || [];
        if (projectNames) {
            projectIds_ = [
                ...(projectIds || []),
                ...(await Promise.all(projectNames.map((name) => this.readProject({ projectName: name }).then((project) => project.id)))),
            ];
        }
        const payload = {
            id,
            trace,
            parent_run: parentRun,
            run_type: runType,
            session: projectIds_,
            reference_example: referenceExampleIds,
            start_time: startTime,
            end_time: endTime,
            error,
            query,
            filter,
            trace_filter: traceFilter,
            tree_filter: treeFilter,
            is_root: isRoot,
            data_source_type: dataSourceType,
        };
        // Remove undefined values from the payload
        const filteredPayload = Object.fromEntries(Object.entries(payload).filter(([_, value]) => value !== undefined));
        const body = JSON.stringify(filteredPayload);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/runs/stats`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "get run stats");
            return res;
        });
        const result = await response.json();
        return result;
    }
    async shareRun(runId, { shareId } = {}) {
        const data = {
            run_id: runId,
            share_token: shareId || uuid.v4(),
        };
        (0, _uuid_js_1.assertUuid)(runId);
        const body = JSON.stringify(data);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/runs/${runId}/share`, {
                method: "PUT",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "share run");
            return res;
        });
        const result = await response.json();
        if (result === null || !("share_token" in result)) {
            throw new Error("Invalid response from server");
        }
        return `${this.getHostUrl()}/public/${result["share_token"]}/r`;
    }
    async unshareRun(runId) {
        (0, _uuid_js_1.assertUuid)(runId);
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/runs/${runId}/share`, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "unshare run", true);
            return res;
        });
    }
    async readRunSharedLink(runId) {
        (0, _uuid_js_1.assertUuid)(runId);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/runs/${runId}/share`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "read run shared link");
            return res;
        });
        const result = await response.json();
        if (result === null || !("share_token" in result)) {
            return undefined;
        }
        return `${this.getHostUrl()}/public/${result["share_token"]}/r`;
    }
    async listSharedRuns(shareToken, { runIds, } = {}) {
        const queryParams = new URLSearchParams({
            share_token: shareToken,
        });
        if (runIds !== undefined) {
            for (const runId of runIds) {
                queryParams.append("id", runId);
            }
        }
        (0, _uuid_js_1.assertUuid)(shareToken);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/public/${shareToken}/runs${queryParams}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "list shared runs");
            return res;
        });
        const runs = await response.json();
        return runs;
    }
    async readDatasetSharedSchema(datasetId, datasetName) {
        if (!datasetId && !datasetName) {
            throw new Error("Either datasetId or datasetName must be given");
        }
        if (!datasetId) {
            const dataset = await this.readDataset({ datasetName });
            datasetId = dataset.id;
        }
        (0, _uuid_js_1.assertUuid)(datasetId);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/share`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "read dataset shared schema");
            return res;
        });
        const shareSchema = await response.json();
        shareSchema.url = `${this.getHostUrl()}/public/${shareSchema.share_token}/d`;
        return shareSchema;
    }
    async shareDataset(datasetId, datasetName) {
        if (!datasetId && !datasetName) {
            throw new Error("Either datasetId or datasetName must be given");
        }
        if (!datasetId) {
            const dataset = await this.readDataset({ datasetName });
            datasetId = dataset.id;
        }
        const data = {
            dataset_id: datasetId,
        };
        (0, _uuid_js_1.assertUuid)(datasetId);
        const body = JSON.stringify(data);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/share`, {
                method: "PUT",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "share dataset");
            return res;
        });
        const shareSchema = await response.json();
        shareSchema.url = `${this.getHostUrl()}/public/${shareSchema.share_token}/d`;
        return shareSchema;
    }
    async unshareDataset(datasetId) {
        (0, _uuid_js_1.assertUuid)(datasetId);
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/share`, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "unshare dataset", true);
            return res;
        });
    }
    async readSharedDataset(shareToken) {
        (0, _uuid_js_1.assertUuid)(shareToken);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/public/${shareToken}/datasets`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "read shared dataset");
            return res;
        });
        const dataset = await response.json();
        return dataset;
    }
    /**
     * Get shared examples.
     *
     * @param {string} shareToken The share token to get examples for. A share token is the UUID (or LangSmith URL, including UUID) generated when explicitly marking an example as public.
     * @param {Object} [options] Additional options for listing the examples.
     * @param {string[] | undefined} [options.exampleIds] A list of example IDs to filter by.
     * @returns {Promise<Example[]>} The shared examples.
     */
    async listSharedExamples(shareToken, options) {
        const params = {};
        if (options?.exampleIds) {
            params.id = options.exampleIds;
        }
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((v) => urlParams.append(key, v));
            }
            else {
                urlParams.append(key, value);
            }
        });
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/public/${shareToken}/examples?${urlParams.toString()}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "list shared examples");
            return res;
        });
        const result = await response.json();
        if (!response.ok) {
            if ("detail" in result) {
                throw new Error(`Failed to list shared examples.\nStatus: ${response.status}\nMessage: ${Array.isArray(result.detail)
                    ? result.detail.join("\n")
                    : "Unspecified error"}`);
            }
            throw new Error(`Failed to list shared examples: ${response.status} ${response.statusText}`);
        }
        return result.map((example) => ({
            ...example,
            _hostUrl: this.getHostUrl(),
        }));
    }
    async createProject({ projectName, description = null, metadata = null, upsert = false, projectExtra = null, referenceDatasetId = null, }) {
        const upsert_ = upsert ? `?upsert=true` : "";
        const endpoint = `${this.apiUrl}/sessions${upsert_}`;
        const extra = projectExtra || {};
        if (metadata) {
            extra["metadata"] = metadata;
        }
        const body = {
            name: projectName,
            extra,
            description,
        };
        if (referenceDatasetId !== null) {
            body["reference_dataset_id"] = referenceDatasetId;
        }
        const serializedBody = JSON.stringify(body);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(endpoint, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: serializedBody,
            });
            await (0, error_js_1.raiseForStatus)(res, "create project");
            return res;
        });
        const result = await response.json();
        return result;
    }
    async updateProject(projectId, { name = null, description = null, metadata = null, projectExtra = null, endTime = null, }) {
        const endpoint = `${this.apiUrl}/sessions/${projectId}`;
        let extra = projectExtra;
        if (metadata) {
            extra = { ...(extra || {}), metadata };
        }
        const body = JSON.stringify({
            name,
            extra,
            description,
            end_time: endTime ? new Date(endTime).toISOString() : null,
        });
        const response = await this.caller.call(async () => {
            const res = await this._fetch(endpoint, {
                method: "PATCH",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update project");
            return res;
        });
        const result = await response.json();
        return result;
    }
    async hasProject({ projectId, projectName, }) {
        // TODO: Add a head request
        let path = "/sessions";
        const params = new URLSearchParams();
        if (projectId !== undefined && projectName !== undefined) {
            throw new Error("Must provide either projectName or projectId, not both");
        }
        else if (projectId !== undefined) {
            (0, _uuid_js_1.assertUuid)(projectId);
            path += `/${projectId}`;
        }
        else if (projectName !== undefined) {
            params.append("name", projectName);
        }
        else {
            throw new Error("Must provide projectName or projectId");
        }
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}${path}?${params}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "has project");
            return res;
        });
        // consume the response body to release the connection
        // https://undici.nodejs.org/#/?id=garbage-collection
        try {
            const result = await response.json();
            if (!response.ok) {
                return false;
            }
            // If it's OK and we're querying by name, need to check the list is not empty
            if (Array.isArray(result)) {
                return result.length > 0;
            }
            // projectId querying
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async readProject({ projectId, projectName, includeStats, }) {
        let path = "/sessions";
        const params = new URLSearchParams();
        if (projectId !== undefined && projectName !== undefined) {
            throw new Error("Must provide either projectName or projectId, not both");
        }
        else if (projectId !== undefined) {
            (0, _uuid_js_1.assertUuid)(projectId);
            path += `/${projectId}`;
        }
        else if (projectName !== undefined) {
            params.append("name", projectName);
        }
        else {
            throw new Error("Must provide projectName or projectId");
        }
        if (includeStats !== undefined) {
            params.append("include_stats", includeStats.toString());
        }
        const response = await this._get(path, params);
        let result;
        if (Array.isArray(response)) {
            if (response.length === 0) {
                throw new Error(`Project[id=${projectId}, name=${projectName}] not found`);
            }
            result = response[0];
        }
        else {
            result = response;
        }
        return result;
    }
    async getProjectUrl({ projectId, projectName, }) {
        if (projectId === undefined && projectName === undefined) {
            throw new Error("Must provide either projectName or projectId");
        }
        const project = await this.readProject({ projectId, projectName });
        const tenantId = await this._getTenantId();
        return `${this.getHostUrl()}/o/${tenantId}/projects/p/${project.id}`;
    }
    async getDatasetUrl({ datasetId, datasetName, }) {
        if (datasetId === undefined && datasetName === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        const dataset = await this.readDataset({ datasetId, datasetName });
        const tenantId = await this._getTenantId();
        return `${this.getHostUrl()}/o/${tenantId}/datasets/${dataset.id}`;
    }
    async _getTenantId() {
        if (this._tenantId !== null) {
            return this._tenantId;
        }
        const queryParams = new URLSearchParams({ limit: "1" });
        for await (const projects of this._getPaginated("/sessions", queryParams)) {
            this._tenantId = projects[0].tenant_id;
            return projects[0].tenant_id;
        }
        throw new Error("No projects found to resolve tenant.");
    }
    async *listProjects({ projectIds, name, nameContains, referenceDatasetId, referenceDatasetName, includeStats, datasetVersion, referenceFree, metadata, } = {}) {
        const params = new URLSearchParams();
        if (projectIds !== undefined) {
            for (const projectId of projectIds) {
                params.append("id", projectId);
            }
        }
        if (name !== undefined) {
            params.append("name", name);
        }
        if (nameContains !== undefined) {
            params.append("name_contains", nameContains);
        }
        if (referenceDatasetId !== undefined) {
            params.append("reference_dataset", referenceDatasetId);
        }
        else if (referenceDatasetName !== undefined) {
            const dataset = await this.readDataset({
                datasetName: referenceDatasetName,
            });
            params.append("reference_dataset", dataset.id);
        }
        if (includeStats !== undefined) {
            params.append("include_stats", includeStats.toString());
        }
        if (datasetVersion !== undefined) {
            params.append("dataset_version", datasetVersion);
        }
        if (referenceFree !== undefined) {
            params.append("reference_free", referenceFree.toString());
        }
        if (metadata !== undefined) {
            params.append("metadata", JSON.stringify(metadata));
        }
        for await (const projects of this._getPaginated("/sessions", params)) {
            yield* projects;
        }
    }
    async deleteProject({ projectId, projectName, }) {
        let projectId_;
        if (projectId === undefined && projectName === undefined) {
            throw new Error("Must provide projectName or projectId");
        }
        else if (projectId !== undefined && projectName !== undefined) {
            throw new Error("Must provide either projectName or projectId, not both");
        }
        else if (projectId === undefined) {
            projectId_ = (await this.readProject({ projectName })).id;
        }
        else {
            projectId_ = projectId;
        }
        (0, _uuid_js_1.assertUuid)(projectId_);
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/sessions/${projectId_}`, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, `delete session ${projectId_} (${projectName})`, true);
            return res;
        });
    }
    async uploadCsv({ csvFile, fileName, inputKeys, outputKeys, description, dataType, name, }) {
        const url = `${this.apiUrl}/datasets/upload`;
        const formData = new FormData();
        const csvBlob = new Blob([csvFile], { type: "text/csv" });
        formData.append("file", csvBlob, fileName);
        inputKeys.forEach((key) => {
            formData.append("input_keys", key);
        });
        outputKeys.forEach((key) => {
            formData.append("output_keys", key);
        });
        if (description) {
            formData.append("description", description);
        }
        if (dataType) {
            formData.append("data_type", dataType);
        }
        if (name) {
            formData.append("name", name);
        }
        const response = await this.caller.call(async () => {
            const res = await this._fetch(url, {
                method: "POST",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: formData,
            });
            await (0, error_js_1.raiseForStatus)(res, "upload CSV");
            return res;
        });
        const result = await response.json();
        return result;
    }
    async createDataset(name, { description, dataType, inputsSchema, outputsSchema, metadata, } = {}) {
        const body = {
            name,
            description,
            extra: metadata ? { metadata } : undefined,
        };
        if (dataType) {
            body.data_type = dataType;
        }
        if (inputsSchema) {
            body.inputs_schema_definition = inputsSchema;
        }
        if (outputsSchema) {
            body.outputs_schema_definition = outputsSchema;
        }
        const serializedBody = JSON.stringify(body);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: serializedBody,
            });
            await (0, error_js_1.raiseForStatus)(res, "create dataset");
            return res;
        });
        const result = await response.json();
        return result;
    }
    async readDataset({ datasetId, datasetName, }) {
        let path = "/datasets";
        // limit to 1 result
        const params = new URLSearchParams({ limit: "1" });
        if (datasetId && datasetName) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId) {
            (0, _uuid_js_1.assertUuid)(datasetId);
            path += `/${datasetId}`;
        }
        else if (datasetName) {
            params.append("name", datasetName);
        }
        else {
            throw new Error("Must provide datasetName or datasetId");
        }
        const response = await this._get(path, params);
        let result;
        if (Array.isArray(response)) {
            if (response.length === 0) {
                throw new Error(`Dataset[id=${datasetId}, name=${datasetName}] not found`);
            }
            result = response[0];
        }
        else {
            result = response;
        }
        return result;
    }
    async hasDataset({ datasetId, datasetName, }) {
        try {
            await this.readDataset({ datasetId, datasetName });
            return true;
        }
        catch (e) {
            if (
            // eslint-disable-next-line no-instanceof/no-instanceof
            e instanceof Error &&
                e.message.toLocaleLowerCase().includes("not found")) {
                return false;
            }
            throw e;
        }
    }
    async diffDatasetVersions({ datasetId, datasetName, fromVersion, toVersion, }) {
        let datasetId_ = datasetId;
        if (datasetId_ === undefined && datasetName === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId_ === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        const urlParams = new URLSearchParams({
            from_version: typeof fromVersion === "string"
                ? fromVersion
                : fromVersion.toISOString(),
            to_version: typeof toVersion === "string" ? toVersion : toVersion.toISOString(),
        });
        const response = await this._get(`/datasets/${datasetId_}/versions/diff`, urlParams);
        return response;
    }
    async readDatasetOpenaiFinetuning({ datasetId, datasetName, }) {
        const path = "/datasets";
        if (datasetId !== undefined) {
            // do nothing
        }
        else if (datasetName !== undefined) {
            datasetId = (await this.readDataset({ datasetName })).id;
        }
        else {
            throw new Error("Must provide either datasetName or datasetId");
        }
        const response = await this._getResponse(`${path}/${datasetId}/openai_ft`);
        const datasetText = await response.text();
        const dataset = datasetText
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        return dataset;
    }
    async *listDatasets({ limit = 100, offset = 0, datasetIds, datasetName, datasetNameContains, metadata, } = {}) {
        const path = "/datasets";
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });
        if (datasetIds !== undefined) {
            for (const id_ of datasetIds) {
                params.append("id", id_);
            }
        }
        if (datasetName !== undefined) {
            params.append("name", datasetName);
        }
        if (datasetNameContains !== undefined) {
            params.append("name_contains", datasetNameContains);
        }
        if (metadata !== undefined) {
            params.append("metadata", JSON.stringify(metadata));
        }
        for await (const datasets of this._getPaginated(path, params)) {
            yield* datasets;
        }
    }
    /**
     * Update a dataset
     * @param props The dataset details to update
     * @returns The updated dataset
     */
    async updateDataset(props) {
        const { datasetId, datasetName, ...update } = props;
        if (!datasetId && !datasetName) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        const _datasetId = datasetId ?? (await this.readDataset({ datasetName })).id;
        (0, _uuid_js_1.assertUuid)(_datasetId);
        const body = JSON.stringify(update);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${_datasetId}`, {
                method: "PATCH",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update dataset");
            return res;
        });
        return (await response.json());
    }
    /**
     * Updates a tag on a dataset.
     *
     * If the tag is already assigned to a different version of this dataset,
     * the tag will be moved to the new version. The as_of parameter is used to
     * determine which version of the dataset to apply the new tags to.
     *
     * It must be an exact version of the dataset to succeed. You can
     * use the "readDatasetVersion" method to find the exact version
     * to apply the tags to.
     * @param params.datasetId The ID of the dataset to update. Must be provided if "datasetName" is not provided.
     * @param params.datasetName The name of the dataset to update. Must be provided if "datasetId" is not provided.
     * @param params.asOf The timestamp of the dataset to apply the new tags to.
     * @param params.tag The new tag to apply to the dataset.
     */
    async updateDatasetTag(props) {
        const { datasetId, datasetName, asOf, tag } = props;
        if (!datasetId && !datasetName) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        const _datasetId = datasetId ?? (await this.readDataset({ datasetName })).id;
        (0, _uuid_js_1.assertUuid)(_datasetId);
        const body = JSON.stringify({
            as_of: typeof asOf === "string" ? asOf : asOf.toISOString(),
            tag,
        });
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${_datasetId}/tags`, {
                method: "PUT",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update dataset tags", true);
            return res;
        });
    }
    async deleteDataset({ datasetId, datasetName, }) {
        let path = "/datasets";
        let datasetId_ = datasetId;
        if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetName !== undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        if (datasetId_ !== undefined) {
            (0, _uuid_js_1.assertUuid)(datasetId_);
            path += `/${datasetId_}`;
        }
        else {
            throw new Error("Must provide datasetName or datasetId");
        }
        await this.caller.call(async () => {
            const res = await this._fetch(this.apiUrl + path, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, `delete ${path}`, true);
            return res;
        });
    }
    async indexDataset({ datasetId, datasetName, tag, }) {
        let datasetId_ = datasetId;
        if (!datasetId_ && !datasetName) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ && datasetName) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (!datasetId_) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        (0, _uuid_js_1.assertUuid)(datasetId_);
        const data = {
            tag: tag,
        };
        const body = JSON.stringify(data);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId_}/index`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "index dataset");
            return res;
        });
        await response.json();
    }
    /**
     * Lets you run a similarity search query on a dataset.
     *
     * Requires the dataset to be indexed. Please see the `indexDataset` method to set up indexing.
     *
     * @param inputs      The input on which to run the similarity search. Must have the
     *                    same schema as the dataset.
     *
     * @param datasetId   The dataset to search for similar examples.
     *
     * @param limit       The maximum number of examples to return. Will return the top `limit` most
     *                    similar examples in order of most similar to least similar. If no similar
     *                    examples are found, random examples will be returned.
     *
     * @param filter      A filter string to apply to the search. Only examples will be returned that
     *                    match the filter string. Some examples of filters
     *
     *                    - eq(metadata.mykey, "value")
     *                    - and(neq(metadata.my.nested.key, "value"), neq(metadata.mykey, "value"))
     *                    - or(eq(metadata.mykey, "value"), eq(metadata.mykey, "othervalue"))
     *
     * @returns           A list of similar examples.
     *
     *
     * @example
     * dataset_id = "123e4567-e89b-12d3-a456-426614174000"
     * inputs = {"text": "How many people live in Berlin?"}
     * limit = 5
     * examples = await client.similarExamples(inputs, dataset_id, limit)
     */
    async similarExamples(inputs, datasetId, limit, { filter, } = {}) {
        const data = {
            limit: limit,
            inputs: inputs,
        };
        if (filter !== undefined) {
            data["filter"] = filter;
        }
        (0, _uuid_js_1.assertUuid)(datasetId);
        const body = JSON.stringify(data);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/search`, {
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                method: "POST",
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "fetch similar examples");
            return res;
        });
        const result = await response.json();
        return result["examples"];
    }
    async createExample(inputsOrUpdate, outputs, options) {
        if (isExampleCreate(inputsOrUpdate)) {
            if (outputs !== undefined || options !== undefined) {
                throw new Error("Cannot provide outputs or options when using ExampleCreate object");
            }
        }
        let datasetId_ = outputs ? options?.datasetId : inputsOrUpdate.dataset_id;
        const datasetName_ = outputs
            ? options?.datasetName
            : inputsOrUpdate.dataset_name;
        if (datasetId_ === undefined && datasetName_ === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ !== undefined && datasetName_ !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId_ === undefined) {
            const dataset = await this.readDataset({ datasetName: datasetName_ });
            datasetId_ = dataset.id;
        }
        const createdAt_ = (outputs ? options?.createdAt : inputsOrUpdate.created_at) || new Date();
        let data;
        if (!isExampleCreate(inputsOrUpdate)) {
            data = {
                inputs: inputsOrUpdate,
                outputs,
                created_at: createdAt_?.toISOString(),
                id: options?.exampleId,
                metadata: options?.metadata,
                split: options?.split,
                source_run_id: options?.sourceRunId,
                use_source_run_io: options?.useSourceRunIO,
                use_source_run_attachments: options?.useSourceRunAttachments,
                attachments: options?.attachments,
            };
        }
        else {
            data = inputsOrUpdate;
        }
        const response = await this._uploadExamplesMultipart(datasetId_, [data]);
        const example = await this.readExample(response.example_ids?.[0] ?? uuid.v4());
        return example;
    }
    async createExamples(propsOrUploads) {
        if (Array.isArray(propsOrUploads)) {
            if (propsOrUploads.length === 0) {
                return [];
            }
            const uploads = propsOrUploads;
            let datasetId_ = uploads[0].dataset_id;
            const datasetName_ = uploads[0].dataset_name;
            if (datasetId_ === undefined && datasetName_ === undefined) {
                throw new Error("Must provide either datasetName or datasetId");
            }
            else if (datasetId_ !== undefined && datasetName_ !== undefined) {
                throw new Error("Must provide either datasetName or datasetId, not both");
            }
            else if (datasetId_ === undefined) {
                const dataset = await this.readDataset({ datasetName: datasetName_ });
                datasetId_ = dataset.id;
            }
            const response = await this._uploadExamplesMultipart(datasetId_, uploads);
            const examples = await Promise.all(response.example_ids.map((id) => this.readExample(id)));
            return examples;
        }
        const { inputs, outputs, metadata, splits, sourceRunIds, useSourceRunIOs, useSourceRunAttachments, attachments, exampleIds, datasetId, datasetName, } = propsOrUploads;
        if (inputs === undefined) {
            throw new Error("Must provide inputs when using legacy parameters");
        }
        let datasetId_ = datasetId;
        const datasetName_ = datasetName;
        if (datasetId_ === undefined && datasetName_ === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ !== undefined && datasetName_ !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId_ === undefined) {
            const dataset = await this.readDataset({ datasetName: datasetName_ });
            datasetId_ = dataset.id;
        }
        const formattedExamples = inputs.map((input, idx) => {
            return {
                dataset_id: datasetId_,
                inputs: input,
                outputs: outputs?.[idx],
                metadata: metadata?.[idx],
                split: splits?.[idx],
                id: exampleIds?.[idx],
                attachments: attachments?.[idx],
                source_run_id: sourceRunIds?.[idx],
                use_source_run_io: useSourceRunIOs?.[idx],
                use_source_run_attachments: useSourceRunAttachments?.[idx],
            };
        });
        const response = await this._uploadExamplesMultipart(datasetId_, formattedExamples);
        const examples = await Promise.all(response.example_ids.map((id) => this.readExample(id)));
        return examples;
    }
    async createLLMExample(input, generation, options) {
        return this.createExample({ input }, { output: generation }, options);
    }
    async createChatExample(input, generations, options) {
        const finalInput = input.map((message) => {
            if ((0, messages_js_1.isLangChainMessage)(message)) {
                return (0, messages_js_1.convertLangChainMessageToExample)(message);
            }
            return message;
        });
        const finalOutput = (0, messages_js_1.isLangChainMessage)(generations)
            ? (0, messages_js_1.convertLangChainMessageToExample)(generations)
            : generations;
        return this.createExample({ input: finalInput }, { output: finalOutput }, options);
    }
    async readExample(exampleId) {
        (0, _uuid_js_1.assertUuid)(exampleId);
        const path = `/examples/${exampleId}`;
        const rawExample = await this._get(path);
        const { attachment_urls, ...rest } = rawExample;
        const example = rest;
        if (attachment_urls) {
            example.attachments = Object.entries(attachment_urls).reduce((acc, [key, value]) => {
                acc[key.slice("attachment.".length)] = {
                    presigned_url: value.presigned_url,
                    mime_type: value.mime_type,
                };
                return acc;
            }, {});
        }
        return example;
    }
    async *listExamples({ datasetId, datasetName, exampleIds, asOf, splits, inlineS3Urls, metadata, limit, offset, filter, includeAttachments, } = {}) {
        let datasetId_;
        if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId !== undefined) {
            datasetId_ = datasetId;
        }
        else if (datasetName !== undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        else {
            throw new Error("Must provide a datasetName or datasetId");
        }
        const params = new URLSearchParams({ dataset: datasetId_ });
        const dataset_version = asOf
            ? typeof asOf === "string"
                ? asOf
                : asOf?.toISOString()
            : undefined;
        if (dataset_version) {
            params.append("as_of", dataset_version);
        }
        const inlineS3Urls_ = inlineS3Urls ?? true;
        params.append("inline_s3_urls", inlineS3Urls_.toString());
        if (exampleIds !== undefined) {
            for (const id_ of exampleIds) {
                params.append("id", id_);
            }
        }
        if (splits !== undefined) {
            for (const split of splits) {
                params.append("splits", split);
            }
        }
        if (metadata !== undefined) {
            const serializedMetadata = JSON.stringify(metadata);
            params.append("metadata", serializedMetadata);
        }
        if (limit !== undefined) {
            params.append("limit", limit.toString());
        }
        if (offset !== undefined) {
            params.append("offset", offset.toString());
        }
        if (filter !== undefined) {
            params.append("filter", filter);
        }
        if (includeAttachments === true) {
            ["attachment_urls", "outputs", "metadata"].forEach((field) => params.append("select", field));
        }
        let i = 0;
        for await (const rawExamples of this._getPaginated("/examples", params)) {
            for (const rawExample of rawExamples) {
                const { attachment_urls, ...rest } = rawExample;
                const example = rest;
                if (attachment_urls) {
                    example.attachments = Object.entries(attachment_urls).reduce((acc, [key, value]) => {
                        acc[key.slice("attachment.".length)] = {
                            presigned_url: value.presigned_url,
                            mime_type: value.mime_type || undefined,
                        };
                        return acc;
                    }, {});
                }
                yield example;
                i++;
            }
            if (limit !== undefined && i >= limit) {
                break;
            }
        }
    }
    async deleteExample(exampleId) {
        (0, _uuid_js_1.assertUuid)(exampleId);
        const path = `/examples/${exampleId}`;
        await this.caller.call(async () => {
            const res = await this._fetch(this.apiUrl + path, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, `delete ${path}`, true);
            return res;
        });
    }
    /**
     * Delete multiple examples by ID.
     * @param exampleIds - The IDs of the examples to delete
     * @param options - Optional settings for deletion
     * @param options.hardDelete - If true, permanently delete examples. If false (default), soft delete them.
     */
    async deleteExamples(exampleIds, options) {
        // Validate all UUIDs
        exampleIds.forEach((id) => (0, _uuid_js_1.assertUuid)(id));
        if (options?.hardDelete) {
            // Hard delete uses POST to a different platform endpoint
            const path = this._getPlatformEndpointPath("datasets/examples/delete");
            await this.caller.call(async () => {
                const res = await this._fetch(`${this.apiUrl}${path}`, {
                    method: "POST",
                    headers: { ...this.headers, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        example_ids: exampleIds,
                        hard_delete: true,
                    }),
                    signal: AbortSignal.timeout(this.timeout_ms),
                    ...this.fetchOptions,
                });
                await (0, error_js_1.raiseForStatus)(res, "hard delete examples", true);
                return res;
            });
        }
        else {
            // Soft delete uses DELETE with query params
            const params = new URLSearchParams();
            exampleIds.forEach((id) => params.append("example_ids", id));
            await this.caller.call(async () => {
                const res = await this._fetch(`${this.apiUrl}/examples?${params.toString()}`, {
                    method: "DELETE",
                    headers: this.headers,
                    signal: AbortSignal.timeout(this.timeout_ms),
                    ...this.fetchOptions,
                });
                await (0, error_js_1.raiseForStatus)(res, "delete examples", true);
                return res;
            });
        }
    }
    async updateExample(exampleIdOrUpdate, update) {
        let exampleId;
        if (update) {
            exampleId = exampleIdOrUpdate;
        }
        else {
            exampleId = exampleIdOrUpdate.id;
        }
        (0, _uuid_js_1.assertUuid)(exampleId);
        let updateToUse;
        if (update) {
            updateToUse = { id: exampleId, ...update };
        }
        else {
            updateToUse = exampleIdOrUpdate;
        }
        let datasetId;
        if (updateToUse.dataset_id !== undefined) {
            datasetId = updateToUse.dataset_id;
        }
        else {
            const example = await this.readExample(exampleId);
            datasetId = example.dataset_id;
        }
        return this._updateExamplesMultipart(datasetId, [updateToUse]);
    }
    async updateExamples(update) {
        // We will naively get dataset id from first example and assume it works for all
        let datasetId;
        if (update[0].dataset_id === undefined) {
            const example = await this.readExample(update[0].id);
            datasetId = example.dataset_id;
        }
        else {
            datasetId = update[0].dataset_id;
        }
        return this._updateExamplesMultipart(datasetId, update);
    }
    /**
     * Get dataset version by closest date or exact tag.
     *
     * Use this to resolve the nearest version to a given timestamp or for a given tag.
     *
     * @param options The options for getting the dataset version
     * @param options.datasetId The ID of the dataset
     * @param options.datasetName The name of the dataset
     * @param options.asOf The timestamp of the dataset to retrieve
     * @param options.tag The tag of the dataset to retrieve
     * @returns The dataset version
     */
    async readDatasetVersion({ datasetId, datasetName, asOf, tag, }) {
        let resolvedDatasetId;
        if (!datasetId) {
            const dataset = await this.readDataset({ datasetName });
            resolvedDatasetId = dataset.id;
        }
        else {
            resolvedDatasetId = datasetId;
        }
        (0, _uuid_js_1.assertUuid)(resolvedDatasetId);
        if ((asOf && tag) || (!asOf && !tag)) {
            throw new Error("Exactly one of asOf and tag must be specified.");
        }
        const params = new URLSearchParams();
        if (asOf !== undefined) {
            params.append("as_of", typeof asOf === "string" ? asOf : asOf.toISOString());
        }
        if (tag !== undefined) {
            params.append("tag", tag);
        }
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${resolvedDatasetId}/version?${params.toString()}`, {
                method: "GET",
                headers: { ...this.headers },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "read dataset version");
            return res;
        });
        return await response.json();
    }
    async listDatasetSplits({ datasetId, datasetName, asOf, }) {
        let datasetId_;
        if (datasetId === undefined && datasetName === undefined) {
            throw new Error("Must provide dataset name or ID");
        }
        else if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        else {
            datasetId_ = datasetId;
        }
        (0, _uuid_js_1.assertUuid)(datasetId_);
        const params = new URLSearchParams();
        const dataset_version = asOf
            ? typeof asOf === "string"
                ? asOf
                : asOf?.toISOString()
            : undefined;
        if (dataset_version) {
            params.append("as_of", dataset_version);
        }
        const response = await this._get(`/datasets/${datasetId_}/splits`, params);
        return response;
    }
    async updateDatasetSplits({ datasetId, datasetName, splitName, exampleIds, remove = false, }) {
        let datasetId_;
        if (datasetId === undefined && datasetName === undefined) {
            throw new Error("Must provide dataset name or ID");
        }
        else if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        else {
            datasetId_ = datasetId;
        }
        (0, _uuid_js_1.assertUuid)(datasetId_);
        const data = {
            split_name: splitName,
            examples: exampleIds.map((id) => {
                (0, _uuid_js_1.assertUuid)(id);
                return id;
            }),
            remove,
        };
        const body = JSON.stringify(data);
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId_}/splits`, {
                method: "PUT",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update dataset splits", true);
            return res;
        });
    }
    async createFeedback(runId, key, { score, value, correction, comment, sourceInfo, feedbackSourceType = "api", sourceRunId, feedbackId, feedbackConfig, projectId, comparativeExperimentId, sessionId, startTime, }) {
        if (!runId && !projectId) {
            throw new Error("One of runId or projectId must be provided");
        }
        if (runId && projectId) {
            throw new Error("Only one of runId or projectId can be provided");
        }
        const feedback_source = {
            type: feedbackSourceType ?? "api",
            metadata: sourceInfo ?? {},
        };
        if (sourceRunId !== undefined &&
            feedback_source?.metadata !== undefined &&
            !feedback_source.metadata["__run"]) {
            feedback_source.metadata["__run"] = { run_id: sourceRunId };
        }
        if (feedback_source?.metadata !== undefined &&
            feedback_source.metadata["__run"]?.run_id !== undefined) {
            (0, _uuid_js_1.assertUuid)(feedback_source.metadata["__run"].run_id);
        }
        const feedback = {
            id: feedbackId ?? uuid.v4(),
            run_id: runId,
            key,
            score: _formatFeedbackScore(score),
            value,
            correction,
            comment,
            feedback_source: feedback_source,
            comparative_experiment_id: comparativeExperimentId,
            feedbackConfig,
            session_id: sessionId ?? projectId,
            start_time: startTime,
        };
        const body = JSON.stringify(feedback);
        const url = `${this.apiUrl}/feedback`;
        await this.caller.call(async () => {
            const res = await this._fetch(url, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "create feedback", true);
            return res;
        });
        return feedback;
    }
    async updateFeedback(feedbackId, { score, value, correction, comment, }) {
        const feedbackUpdate = {};
        if (score !== undefined && score !== null) {
            feedbackUpdate["score"] = _formatFeedbackScore(score);
        }
        if (value !== undefined && value !== null) {
            feedbackUpdate["value"] = value;
        }
        if (correction !== undefined && correction !== null) {
            feedbackUpdate["correction"] = correction;
        }
        if (comment !== undefined && comment !== null) {
            feedbackUpdate["comment"] = comment;
        }
        (0, _uuid_js_1.assertUuid)(feedbackId);
        const body = JSON.stringify(feedbackUpdate);
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/feedback/${feedbackId}`, {
                method: "PATCH",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update feedback", true);
            return res;
        });
    }
    async readFeedback(feedbackId) {
        (0, _uuid_js_1.assertUuid)(feedbackId);
        const path = `/feedback/${feedbackId}`;
        const response = await this._get(path);
        return response;
    }
    async deleteFeedback(feedbackId) {
        (0, _uuid_js_1.assertUuid)(feedbackId);
        const path = `/feedback/${feedbackId}`;
        await this.caller.call(async () => {
            const res = await this._fetch(this.apiUrl + path, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, `delete ${path}`, true);
            return res;
        });
    }
    async *listFeedback({ runIds, feedbackKeys, feedbackSourceTypes, } = {}) {
        const queryParams = new URLSearchParams();
        if (runIds) {
            for (const runId of runIds) {
                (0, _uuid_js_1.assertUuid)(runId);
                queryParams.append("run", runId);
            }
        }
        if (feedbackKeys) {
            for (const key of feedbackKeys) {
                queryParams.append("key", key);
            }
        }
        if (feedbackSourceTypes) {
            for (const type of feedbackSourceTypes) {
                queryParams.append("source", type);
            }
        }
        for await (const feedbacks of this._getPaginated("/feedback", queryParams)) {
            yield* feedbacks;
        }
    }
    /**
     * Creates a presigned feedback token and URL.
     *
     * The token can be used to authorize feedback metrics without
     * needing an API key. This is useful for giving browser-based
     * applications the ability to submit feedback without needing
     * to expose an API key.
     *
     * @param runId The ID of the run.
     * @param feedbackKey The feedback key.
     * @param options Additional options for the token.
     * @param options.expiration The expiration time for the token.
     *
     * @returns A promise that resolves to a FeedbackIngestToken.
     */
    async createPresignedFeedbackToken(runId, feedbackKey, { expiration, feedbackConfig, } = {}) {
        const body = {
            run_id: runId,
            feedback_key: feedbackKey,
            feedback_config: feedbackConfig,
        };
        if (expiration) {
            if (typeof expiration === "string") {
                body["expires_at"] = expiration;
            }
            else if (expiration?.hours || expiration?.minutes || expiration?.days) {
                body["expires_in"] = expiration;
            }
        }
        else {
            body["expires_in"] = {
                hours: 3,
            };
        }
        const serializedBody = JSON.stringify(body);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/feedback/tokens`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: serializedBody,
            });
            await (0, error_js_1.raiseForStatus)(res, "create presigned feedback token");
            return res;
        });
        return await response.json();
    }
    async createComparativeExperiment({ name, experimentIds, referenceDatasetId, createdAt, description, metadata, id, }) {
        if (experimentIds.length === 0) {
            throw new Error("At least one experiment is required");
        }
        if (!referenceDatasetId) {
            referenceDatasetId = (await this.readProject({
                projectId: experimentIds[0],
            })).reference_dataset_id;
        }
        if (!referenceDatasetId == null) {
            throw new Error("A reference dataset is required");
        }
        const body = {
            id,
            name,
            experiment_ids: experimentIds,
            reference_dataset_id: referenceDatasetId,
            description,
            created_at: (createdAt ?? new Date())?.toISOString(),
            extra: {},
        };
        if (metadata)
            body.extra["metadata"] = metadata;
        const serializedBody = JSON.stringify(body);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/datasets/comparative`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: serializedBody,
            });
            await (0, error_js_1.raiseForStatus)(res, "create comparative experiment");
            return res;
        });
        return response.json();
    }
    /**
     * Retrieves a list of presigned feedback tokens for a given run ID.
     * @param runId The ID of the run.
     * @returns An async iterable of FeedbackIngestToken objects.
     */
    async *listPresignedFeedbackTokens(runId) {
        (0, _uuid_js_1.assertUuid)(runId);
        const params = new URLSearchParams({ run_id: runId });
        for await (const tokens of this._getPaginated("/feedback/tokens", params)) {
            yield* tokens;
        }
    }
    _selectEvalResults(results) {
        let results_;
        if ("results" in results) {
            results_ = results.results;
        }
        else if (Array.isArray(results)) {
            results_ = results;
        }
        else {
            results_ = [results];
        }
        return results_;
    }
    async _logEvaluationFeedback(evaluatorResponse, run, sourceInfo) {
        const evalResults = this._selectEvalResults(evaluatorResponse);
        const feedbacks = [];
        for (const res of evalResults) {
            let sourceInfo_ = sourceInfo || {};
            if (res.evaluatorInfo) {
                sourceInfo_ = { ...res.evaluatorInfo, ...sourceInfo_ };
            }
            let runId_ = null;
            if (res.targetRunId) {
                runId_ = res.targetRunId;
            }
            else if (run) {
                runId_ = run.id;
            }
            feedbacks.push(await this.createFeedback(runId_, res.key, {
                score: res.score,
                value: res.value,
                comment: res.comment,
                correction: res.correction,
                sourceInfo: sourceInfo_,
                sourceRunId: res.sourceRunId,
                feedbackConfig: res.feedbackConfig,
                feedbackSourceType: "model",
                sessionId: run?.session_id,
                startTime: run?.start_time,
            }));
        }
        return [evalResults, feedbacks];
    }
    async logEvaluationFeedback(evaluatorResponse, run, sourceInfo) {
        const [results] = await this._logEvaluationFeedback(evaluatorResponse, run, sourceInfo);
        return results;
    }
    /**
     * API for managing annotation queues
     */
    /**
     * List the annotation queues on the LangSmith API.
     * @param options - The options for listing annotation queues
     * @param options.queueIds - The IDs of the queues to filter by
     * @param options.name - The name of the queue to filter by
     * @param options.nameContains - The substring that the queue name should contain
     * @param options.limit - The maximum number of queues to return
     * @returns An iterator of AnnotationQueue objects
     */
    async *listAnnotationQueues(options = {}) {
        const { queueIds, name, nameContains, limit } = options;
        const params = new URLSearchParams();
        if (queueIds) {
            queueIds.forEach((id, i) => {
                (0, _uuid_js_1.assertUuid)(id, `queueIds[${i}]`);
                params.append("ids", id);
            });
        }
        if (name)
            params.append("name", name);
        if (nameContains)
            params.append("name_contains", nameContains);
        params.append("limit", (limit !== undefined ? Math.min(limit, 100) : 100).toString());
        let count = 0;
        for await (const queues of this._getPaginated("/annotation-queues", params)) {
            yield* queues;
            count++;
            if (limit !== undefined && count >= limit)
                break;
        }
    }
    /**
     * Create an annotation queue on the LangSmith API.
     * @param options - The options for creating an annotation queue
     * @param options.name - The name of the annotation queue
     * @param options.description - The description of the annotation queue
     * @param options.queueId - The ID of the annotation queue
     * @returns The created AnnotationQueue object
     */
    async createAnnotationQueue(options) {
        const { name, description, queueId, rubricInstructions } = options;
        const body = {
            name,
            description,
            id: queueId || uuid.v4(),
            rubric_instructions: rubricInstructions,
        };
        const serializedBody = JSON.stringify(Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined)));
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: serializedBody,
            });
            await (0, error_js_1.raiseForStatus)(res, "create annotation queue");
            return res;
        });
        return response.json();
    }
    /**
     * Read an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to read
     * @returns The AnnotationQueueWithDetails object
     */
    async readAnnotationQueue(queueId) {
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "read annotation queue");
            return res;
        });
        return response.json();
    }
    /**
     * Update an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to update
     * @param options - The options for updating the annotation queue
     * @param options.name - The new name for the annotation queue
     * @param options.description - The new description for the annotation queue
     */
    async updateAnnotationQueue(queueId, options) {
        const { name, description, rubricInstructions } = options;
        const body = JSON.stringify({
            name,
            description,
            rubric_instructions: rubricInstructions,
        });
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}`, {
                method: "PATCH",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update annotation queue", true);
            return res;
        });
    }
    /**
     * Delete an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to delete
     */
    async deleteAnnotationQueue(queueId) {
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}`, {
                method: "DELETE",
                headers: { ...this.headers, Accept: "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "delete annotation queue", true);
            return res;
        });
    }
    /**
     * Add runs to an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue
     * @param runIds - The IDs of the runs to be added to the annotation queue
     */
    async addRunsToAnnotationQueue(queueId, runIds) {
        const body = JSON.stringify(runIds.map((id, i) => (0, _uuid_js_1.assertUuid)(id, `runIds[${i}]`).toString()));
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}/runs`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "add runs to annotation queue", true);
            return res;
        });
    }
    /**
     * Get a run from an annotation queue at the specified index.
     * @param queueId - The ID of the annotation queue
     * @param index - The index of the run to retrieve
     * @returns A Promise that resolves to a RunWithAnnotationQueueInfo object
     * @throws {Error} If the run is not found at the given index or for other API-related errors
     */
    async getRunFromAnnotationQueue(queueId, index) {
        const baseUrl = `/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}/run`;
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}${baseUrl}/${index}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "get run from annotation queue");
            return res;
        });
        return response.json();
    }
    /**
     * Delete a run from an an annotation queue.
     * @param queueId - The ID of the annotation queue to delete the run from
     * @param queueRunId - The ID of the run to delete from the annotation queue
     */
    async deleteRunFromAnnotationQueue(queueId, queueRunId) {
        await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}/runs/${(0, _uuid_js_1.assertUuid)(queueRunId, "queueRunId")}`, {
                method: "DELETE",
                headers: { ...this.headers, Accept: "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "delete run from annotation queue", true);
            return res;
        });
    }
    /**
     * Get the size of an annotation queue.
     * @param queueId - The ID of the annotation queue
     */
    async getSizeFromAnnotationQueue(queueId) {
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/annotation-queues/${(0, _uuid_js_1.assertUuid)(queueId, "queueId")}/size`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "get size from annotation queue");
            return res;
        });
        return response.json();
    }
    async _currentTenantIsOwner(owner) {
        const settings = await this._getSettings();
        return owner == "-" || settings.tenant_handle === owner;
    }
    async _ownerConflictError(action, owner) {
        const settings = await this._getSettings();
        return new Error(`Cannot ${action} for another tenant.\n
      Current tenant: ${settings.tenant_handle}\n
      Requested tenant: ${owner}`);
    }
    async _getLatestCommitHash(promptOwnerAndName) {
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/commits/${promptOwnerAndName}/?limit=${1}&offset=${0}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "get latest commit hash");
            return res;
        });
        const json = await response.json();
        if (json.commits.length === 0) {
            return undefined;
        }
        return json.commits[0].commit_hash;
    }
    async _likeOrUnlikePrompt(promptIdentifier, like) {
        const [owner, promptName, _] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        const body = JSON.stringify({ like: like });
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/likes/${owner}/${promptName}`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, `${like ? "like" : "unlike"} prompt`);
            return res;
        });
        return response.json();
    }
    async _getPromptUrl(promptIdentifier) {
        const [owner, promptName, commitHash] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            if (commitHash !== "latest") {
                return `${this.getHostUrl()}/hub/${owner}/${promptName}/${commitHash.substring(0, 8)}`;
            }
            else {
                return `${this.getHostUrl()}/hub/${owner}/${promptName}`;
            }
        }
        else {
            const settings = await this._getSettings();
            if (commitHash !== "latest") {
                return `${this.getHostUrl()}/prompts/${promptName}/${commitHash.substring(0, 8)}?organizationId=${settings.id}`;
            }
            else {
                return `${this.getHostUrl()}/prompts/${promptName}?organizationId=${settings.id}`;
            }
        }
    }
    async promptExists(promptIdentifier) {
        const prompt = await this.getPrompt(promptIdentifier);
        return !!prompt;
    }
    async likePrompt(promptIdentifier) {
        return this._likeOrUnlikePrompt(promptIdentifier, true);
    }
    async unlikePrompt(promptIdentifier) {
        return this._likeOrUnlikePrompt(promptIdentifier, false);
    }
    async *listCommits(promptOwnerAndName) {
        for await (const commits of this._getPaginated(`/commits/${promptOwnerAndName}/`, new URLSearchParams(), (res) => res.commits)) {
            yield* commits;
        }
    }
    async *listPrompts(options) {
        const params = new URLSearchParams();
        params.append("sort_field", options?.sortField ?? "updated_at");
        params.append("sort_direction", "desc");
        params.append("is_archived", (!!options?.isArchived).toString());
        if (options?.isPublic !== undefined) {
            params.append("is_public", options.isPublic.toString());
        }
        if (options?.query) {
            params.append("query", options.query);
        }
        for await (const prompts of this._getPaginated("/repos", params, (res) => res.repos)) {
            yield* prompts;
        }
    }
    async getPrompt(promptIdentifier) {
        const [owner, promptName, _] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/repos/${owner}/${promptName}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            if (res?.status === 404) {
                return null;
            }
            await (0, error_js_1.raiseForStatus)(res, "get prompt");
            return res;
        });
        const result = await response?.json();
        if (result?.repo) {
            return result.repo;
        }
        else {
            return null;
        }
    }
    async createPrompt(promptIdentifier, options) {
        const settings = await this._getSettings();
        if (options?.isPublic && !settings.tenant_handle) {
            throw new Error(`Cannot create a public prompt without first\n
        creating a LangChain Hub handle.
        You can add a handle by creating a public prompt at:\n
        https://smith.langchain.com/prompts`);
        }
        const [owner, promptName, _] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            throw await this._ownerConflictError("create a prompt", owner);
        }
        const data = {
            repo_handle: promptName,
            ...(options?.description && { description: options.description }),
            ...(options?.readme && { readme: options.readme }),
            ...(options?.tags && { tags: options.tags }),
            is_public: !!options?.isPublic,
        };
        const body = JSON.stringify(data);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/repos/`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "create prompt");
            return res;
        });
        const { repo } = await response.json();
        return repo;
    }
    async createCommit(promptIdentifier, object, options) {
        if (!(await this.promptExists(promptIdentifier))) {
            throw new Error("Prompt does not exist, you must create it first.");
        }
        const [owner, promptName, _] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        const resolvedParentCommitHash = options?.parentCommitHash === "latest" || !options?.parentCommitHash
            ? await this._getLatestCommitHash(`${owner}/${promptName}`)
            : options?.parentCommitHash;
        const payload = {
            manifest: JSON.parse(JSON.stringify(object)),
            parent_commit: resolvedParentCommitHash,
        };
        const body = JSON.stringify(payload);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/commits/${owner}/${promptName}`, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "create commit");
            return res;
        });
        const result = await response.json();
        return this._getPromptUrl(`${owner}/${promptName}${result.commit_hash ? `:${result.commit_hash}` : ""}`);
    }
    /**
     * Update examples with attachments using multipart form data.
     * @param updates List of ExampleUpdateWithAttachments objects to upsert
     * @returns Promise with the update response
     */
    async updateExamplesMultipart(datasetId, updates = []) {
        return this._updateExamplesMultipart(datasetId, updates);
    }
    async _updateExamplesMultipart(datasetId, updates = []) {
        if (!(await this._getDatasetExamplesMultiPartSupport())) {
            throw new Error("Your LangSmith deployment does not allow using the multipart examples endpoint, please upgrade your deployment to the latest version.");
        }
        const formData = new FormData();
        for (const example of updates) {
            const exampleId = example.id;
            // Prepare the main example body
            const exampleBody = {
                ...(example.metadata && { metadata: example.metadata }),
                ...(example.split && { split: example.split }),
            };
            // Add main example data
            const stringifiedExample = (0, index_js_2.serialize)(exampleBody, `Serializing body for example with id: ${exampleId}`);
            const exampleBlob = new Blob([stringifiedExample], {
                type: "application/json",
            });
            formData.append(exampleId, exampleBlob);
            // Add inputs if present
            if (example.inputs) {
                const stringifiedInputs = (0, index_js_2.serialize)(example.inputs, `Serializing inputs for example with id: ${exampleId}`);
                const inputsBlob = new Blob([stringifiedInputs], {
                    type: "application/json",
                });
                formData.append(`${exampleId}.inputs`, inputsBlob);
            }
            // Add outputs if present
            if (example.outputs) {
                const stringifiedOutputs = (0, index_js_2.serialize)(example.outputs, `Serializing outputs whle updating example with id: ${exampleId}`);
                const outputsBlob = new Blob([stringifiedOutputs], {
                    type: "application/json",
                });
                formData.append(`${exampleId}.outputs`, outputsBlob);
            }
            // Add attachments if present
            if (example.attachments) {
                for (const [name, attachment] of Object.entries(example.attachments)) {
                    let mimeType;
                    let data;
                    if (Array.isArray(attachment)) {
                        [mimeType, data] = attachment;
                    }
                    else {
                        mimeType = attachment.mimeType;
                        data = attachment.data;
                    }
                    const attachmentBlob = new Blob([data], {
                        type: `${mimeType}; length=${data.byteLength}`,
                    });
                    formData.append(`${exampleId}.attachment.${name}`, attachmentBlob);
                }
            }
            if (example.attachments_operations) {
                const stringifiedAttachmentsOperations = (0, index_js_2.serialize)(example.attachments_operations, `Serializing attachments while updating example with id: ${exampleId}`);
                const attachmentsOperationsBlob = new Blob([stringifiedAttachmentsOperations], {
                    type: "application/json",
                });
                formData.append(`${exampleId}.attachments_operations`, attachmentsOperationsBlob);
            }
        }
        const datasetIdToUse = datasetId ?? updates[0]?.dataset_id;
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}${this._getPlatformEndpointPath(`datasets/${datasetIdToUse}/examples`)}`, {
                method: "PATCH",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: formData,
            });
            await (0, error_js_1.raiseForStatus)(res, "update examples");
            return res;
        });
        return response.json();
    }
    /**
     * Upload examples with attachments using multipart form data.
     * @param uploads List of ExampleUploadWithAttachments objects to upload
     * @returns Promise with the upload response
     * @deprecated This method is deprecated and will be removed in future LangSmith versions, please use `createExamples` instead
     */
    async uploadExamplesMultipart(datasetId, uploads = []) {
        return this._uploadExamplesMultipart(datasetId, uploads);
    }
    async _uploadExamplesMultipart(datasetId, uploads = []) {
        if (!(await this._getDatasetExamplesMultiPartSupport())) {
            throw new Error("Your LangSmith deployment does not allow using the multipart examples endpoint, please upgrade your deployment to the latest version.");
        }
        const formData = new FormData();
        for (const example of uploads) {
            const exampleId = (example.id ?? uuid.v4()).toString();
            // Prepare the main example body
            const exampleBody = {
                created_at: example.created_at,
                ...(example.metadata && { metadata: example.metadata }),
                ...(example.split && { split: example.split }),
                ...(example.source_run_id && { source_run_id: example.source_run_id }),
                ...(example.use_source_run_io && {
                    use_source_run_io: example.use_source_run_io,
                }),
                ...(example.use_source_run_attachments && {
                    use_source_run_attachments: example.use_source_run_attachments,
                }),
            };
            // Add main example data
            const stringifiedExample = (0, index_js_2.serialize)(exampleBody, `Serializing body for uploaded example with id: ${exampleId}`);
            const exampleBlob = new Blob([stringifiedExample], {
                type: "application/json",
            });
            formData.append(exampleId, exampleBlob);
            // Add inputs if present
            if (example.inputs) {
                const stringifiedInputs = (0, index_js_2.serialize)(example.inputs, `Serializing inputs for uploaded example with id: ${exampleId}`);
                const inputsBlob = new Blob([stringifiedInputs], {
                    type: "application/json",
                });
                formData.append(`${exampleId}.inputs`, inputsBlob);
            }
            // Add outputs if present
            if (example.outputs) {
                const stringifiedOutputs = (0, index_js_2.serialize)(example.outputs, `Serializing outputs for uploaded example with id: ${exampleId}`);
                const outputsBlob = new Blob([stringifiedOutputs], {
                    type: "application/json",
                });
                formData.append(`${exampleId}.outputs`, outputsBlob);
            }
            // Add attachments if present
            if (example.attachments) {
                for (const [name, attachment] of Object.entries(example.attachments)) {
                    let mimeType;
                    let data;
                    if (Array.isArray(attachment)) {
                        [mimeType, data] = attachment;
                    }
                    else {
                        mimeType = attachment.mimeType;
                        data = attachment.data;
                    }
                    const attachmentBlob = new Blob([data], {
                        type: `${mimeType}; length=${data.byteLength}`,
                    });
                    formData.append(`${exampleId}.attachment.${name}`, attachmentBlob);
                }
            }
        }
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}${this._getPlatformEndpointPath(`datasets/${datasetId}/examples`)}`, {
                method: "POST",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: formData,
            });
            await (0, error_js_1.raiseForStatus)(res, "upload examples");
            return res;
        });
        return response.json();
    }
    async updatePrompt(promptIdentifier, options) {
        if (!(await this.promptExists(promptIdentifier))) {
            throw new Error("Prompt does not exist, you must create it first.");
        }
        const [owner, promptName] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            throw await this._ownerConflictError("update a prompt", owner);
        }
        const payload = {};
        if (options?.description !== undefined)
            payload.description = options.description;
        if (options?.readme !== undefined)
            payload.readme = options.readme;
        if (options?.tags !== undefined)
            payload.tags = options.tags;
        if (options?.isPublic !== undefined)
            payload.is_public = options.isPublic;
        if (options?.isArchived !== undefined)
            payload.is_archived = options.isArchived;
        // Check if payload is empty
        if (Object.keys(payload).length === 0) {
            throw new Error("No valid update options provided");
        }
        const body = JSON.stringify(payload);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/repos/${owner}/${promptName}`, {
                method: "PATCH",
                headers: {
                    ...this.headers,
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body,
            });
            await (0, error_js_1.raiseForStatus)(res, "update prompt");
            return res;
        });
        return response.json();
    }
    async deletePrompt(promptIdentifier) {
        if (!(await this.promptExists(promptIdentifier))) {
            throw new Error("Prompt does not exist, you must create it first.");
        }
        const [owner, promptName, _] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            throw await this._ownerConflictError("delete a prompt", owner);
        }
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/repos/${owner}/${promptName}`, {
                method: "DELETE",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "delete prompt");
            return res;
        });
        return response.json();
    }
    /**
     * Generate a cache key for a prompt.
     * Format: "{identifier}" or "{identifier}:with_model"
     */
    _getPromptCacheKey(promptIdentifier, includeModel) {
        const suffix = includeModel ? ":with_model" : "";
        return `${promptIdentifier}${suffix}`;
    }
    /**
     * Fetch a prompt commit directly from the API (bypassing cache).
     */
    async _fetchPromptFromApi(promptIdentifier, options) {
        const [owner, promptName, commitHash] = (0, prompts_js_1.parsePromptIdentifier)(promptIdentifier);
        const response = await this.caller.call(async () => {
            const res = await this._fetch(`${this.apiUrl}/commits/${owner}/${promptName}/${commitHash}${options?.includeModel ? "?include_model=true" : ""}`, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await (0, error_js_1.raiseForStatus)(res, "pull prompt commit");
            return res;
        });
        const result = await response.json();
        return {
            owner,
            repo: promptName,
            commit_hash: result.commit_hash,
            manifest: result.manifest,
            examples: result.examples,
        };
    }
    async pullPromptCommit(promptIdentifier, options) {
        // Check cache first if not skipped
        if (!options?.skipCache && this._cache) {
            const cacheKey = this._getPromptCacheKey(promptIdentifier, options?.includeModel);
            const cached = this._cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            // Cache miss - fetch from API and cache it
            const result = await this._fetchPromptFromApi(promptIdentifier, options);
            this._cache.set(cacheKey, result);
            return result;
        }
        // No cache or skip cache - fetch directly
        return this._fetchPromptFromApi(promptIdentifier, options);
    }
    /**
     * This method should not be used directly, use `import { pull } from "langchain/hub"` instead.
     * Using this method directly returns the JSON string of the prompt rather than a LangChain object.
     * @private
     */
    async _pullPrompt(promptIdentifier, options) {
        const promptObject = await this.pullPromptCommit(promptIdentifier, {
            includeModel: options?.includeModel,
            skipCache: options?.skipCache,
        });
        const prompt = JSON.stringify(promptObject.manifest);
        return prompt;
    }
    async pushPrompt(promptIdentifier, options) {
        // Create or update prompt metadata
        if (await this.promptExists(promptIdentifier)) {
            if (options && Object.keys(options).some((key) => key !== "object")) {
                await this.updatePrompt(promptIdentifier, {
                    description: options?.description,
                    readme: options?.readme,
                    tags: options?.tags,
                    isPublic: options?.isPublic,
                });
            }
        }
        else {
            await this.createPrompt(promptIdentifier, {
                description: options?.description,
                readme: options?.readme,
                tags: options?.tags,
                isPublic: options?.isPublic,
            });
        }
        if (!options?.object) {
            return await this._getPromptUrl(promptIdentifier);
        }
        // Create a commit with the new manifest
        const url = await this.createCommit(promptIdentifier, options?.object, {
            parentCommitHash: options?.parentCommitHash,
        });
        return url;
    }
    /**
     * Clone a public dataset to your own langsmith tenant.
     * This operation is idempotent. If you already have a dataset with the given name,
     * this function will do nothing.
  
     * @param {string} tokenOrUrl The token of the public dataset to clone.
     * @param {Object} [options] Additional options for cloning the dataset.
     * @param {string} [options.sourceApiUrl] The URL of the langsmith server where the data is hosted. Defaults to the API URL of your current client.
     * @param {string} [options.datasetName] The name of the dataset to create in your tenant. Defaults to the name of the public dataset.
     * @returns {Promise<void>}
     */
    async clonePublicDataset(tokenOrUrl, options = {}) {
        const { sourceApiUrl = this.apiUrl, datasetName } = options;
        const [parsedApiUrl, tokenUuid] = this.parseTokenOrUrl(tokenOrUrl, sourceApiUrl);
        const sourceClient = new Client({
            apiUrl: parsedApiUrl,
            // Placeholder API key not needed anymore in most cases, but
            // some private deployments may have API key-based rate limiting
            // that would cause this to fail if we provide no value.
            apiKey: "placeholder",
        });
        const ds = await sourceClient.readSharedDataset(tokenUuid);
        const finalDatasetName = datasetName || ds.name;
        try {
            if (await this.hasDataset({ datasetId: finalDatasetName })) {
                console.log(`Dataset ${finalDatasetName} already exists in your tenant. Skipping.`);
                return;
            }
        }
        catch (_) {
            // `.hasDataset` will throw an error if the dataset does not exist.
            // no-op in that case
        }
        // Fetch examples first, then create the dataset
        const examples = await sourceClient.listSharedExamples(tokenUuid);
        const dataset = await this.createDataset(finalDatasetName, {
            description: ds.description,
            dataType: ds.data_type || "kv",
            inputsSchema: ds.inputs_schema_definition ?? undefined,
            outputsSchema: ds.outputs_schema_definition ?? undefined,
        });
        try {
            await this.createExamples({
                inputs: examples.map((e) => e.inputs),
                outputs: examples.flatMap((e) => (e.outputs ? [e.outputs] : [])),
                datasetId: dataset.id,
            });
        }
        catch (e) {
            console.error(`An error occurred while creating dataset ${finalDatasetName}. ` +
                "You should delete it manually.");
            throw e;
        }
    }
    parseTokenOrUrl(urlOrToken, apiUrl, numParts = 2, kind = "dataset") {
        // Try parsing as UUID
        try {
            (0, _uuid_js_1.assertUuid)(urlOrToken); // Will throw if it's not a UUID.
            return [apiUrl, urlOrToken];
        }
        catch (_) {
            // no-op if it's not a uuid
        }
        // Parse as URL
        try {
            const parsedUrl = new URL(urlOrToken);
            const pathParts = parsedUrl.pathname
                .split("/")
                .filter((part) => part !== "");
            if (pathParts.length >= numParts) {
                const tokenUuid = pathParts[pathParts.length - numParts];
                return [apiUrl, tokenUuid];
            }
            else {
                throw new Error(`Invalid public ${kind} URL: ${urlOrToken}`);
            }
        }
        catch (error) {
            throw new Error(`Invalid public ${kind} URL or token: ${urlOrToken}`);
        }
    }
    /**
     * Get the cache instance, if caching is enabled.
     * Useful for accessing cache metrics or manually managing the cache.
     */
    get cache() {
        return this._cache;
    }
    /**
     * Cleanup resources held by the client.
     * Stops the cache's background refresh timer.
     */
    cleanup() {
        if (this._cache) {
            this._cache.stop();
        }
    }
    /**
     * Awaits all pending trace batches. Useful for environments where
     * you need to be sure that all tracing requests finish before execution ends,
     * such as serverless environments.
     *
     * @example
     * ```
     * import { Client } from "langsmith";
     *
     * const client = new Client();
     *
     * try {
     *   // Tracing happens here
     *   ...
     * } finally {
     *   await client.awaitPendingTraceBatches();
     * }
     * ```
     *
     * @returns A promise that resolves once all currently pending traces have sent.
     */
    async awaitPendingTraceBatches() {
        if (this.manualFlushMode) {
            console.warn("[WARNING]: When tracing in manual flush mode, you must call `await client.flush()` manually to submit trace batches.");
            return Promise.resolve();
        }
        /**
         * traceables use a backgrounded promise before updating runs to avoid blocking
         * and to allow waiting for child runs to end. Waiting a small amount of time
         * here ensures that they are able to enqueue their run operation before we await
         * queued run operations below:
         *
         * ```ts
         * const run = await traceable(async () => {
         *   return "Hello, world!";
         * }, { client })();
         *
         * await client.awaitPendingTraceBatches();
         * ```
         */
        await new Promise((resolve) => setTimeout(resolve, 1));
        await Promise.all([
            ...this.autoBatchQueue.items.map(({ itemPromise }) => itemPromise),
            this.batchIngestCaller.queue.onIdle(),
        ]);
        if (this.langSmithToOTELTranslator !== undefined) {
            await (0, otel_js_1.getDefaultOTLPTracerComponents)()?.DEFAULT_LANGSMITH_SPAN_PROCESSOR?.forceFlush();
        }
    }
}
exports.Client = Client;
function isExampleCreate(input) {
    return "dataset_id" in input || "dataset_name" in input;
}
