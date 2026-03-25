import { getEnv, getEnvironmentVariable, getLangSmithEnvVarsMetadata, getLangSmithEnvironmentVariable, getOtelEnabled, getRuntimeEnvironment } from "./utils/env.js";
import { getDefaultOTLPTracerComponents, getOTELContext, getOTELTrace } from "./singletons/otel.js";
import { LangSmithToOTELTranslator } from "./experimental/otel/translator.js";
import { AsyncCaller } from "./utils/async_caller.js";
import { convertLangChainMessageToExample, isLangChainMessage } from "./utils/messages.js";
import { assertUuid } from "./utils/_uuid.js";
import { warnOnce } from "./utils/warn.js";
import { parsePromptIdentifier } from "./utils/prompts.js";
import { raiseForStatus } from "./utils/error.js";
import { _getFetchImplementation, _globalFetchImplementationIsNodeFetch } from "./singletons/fetch.js";
import { serialize } from "./utils/fast-safe-stringify/index.js";
import { __version__ } from "./index.js";
import * as uuid from "uuid";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/client.js
function mergeRuntimeEnvIntoRun(run, cachedEnvVars) {
	const runtimeEnv = getRuntimeEnvironment();
	const envVars = cachedEnvVars ?? getLangSmithEnvVarsMetadata();
	const extra = run.extra ?? {};
	const metadata = extra.metadata;
	run.extra = {
		...extra,
		runtime: {
			...runtimeEnv,
			...extra?.runtime
		},
		metadata: {
			...envVars,
			...envVars.revision_id || "revision_id" in run && run.revision_id ? { revision_id: ("revision_id" in run ? run.revision_id : void 0) ?? envVars.revision_id } : {},
			...metadata
		}
	};
	return run;
}
const getTracingSamplingRate = (configRate) => {
	const samplingRateStr = configRate?.toString() ?? getLangSmithEnvironmentVariable("TRACING_SAMPLING_RATE");
	if (samplingRateStr === void 0) return void 0;
	const samplingRate = parseFloat(samplingRateStr);
	if (samplingRate < 0 || samplingRate > 1) throw new Error(`LANGSMITH_TRACING_SAMPLING_RATE must be between 0 and 1 if set. Got: ${samplingRate}`);
	return samplingRate;
};
const isLocalhost = (url) => {
	const strippedUrl = url.replace("http://", "").replace("https://", "");
	const hostname = strippedUrl.split("/")[0].split(":")[0];
	return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
};
async function toArray(iterable) {
	const result = [];
	for await (const item of iterable) result.push(item);
	return result;
}
function trimQuotes(str) {
	if (str === void 0) return void 0;
	return str.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}
const handle429 = async (response) => {
	if (response?.status === 429) {
		const retryAfter = parseInt(response.headers.get("retry-after") ?? "10", 10) * 1e3;
		if (retryAfter > 0) {
			await new Promise((resolve) => setTimeout(resolve, retryAfter));
			return true;
		}
	}
	return false;
};
function _formatFeedbackScore(score) {
	if (typeof score === "number") return Number(score.toFixed(4));
	return score;
}
var AutoBatchQueue = class {
	constructor() {
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
	}
	peek() {
		return this.items[0];
	}
	push(item) {
		let itemPromiseResolve;
		const itemPromise = new Promise((resolve) => {
			itemPromiseResolve = resolve;
		});
		const size = serialize(item.item, `Serializing run with id: ${item.item.id}`).length;
		this.items.push({
			action: item.action,
			payload: item.item,
			otelContext: item.otelContext,
			apiKey: item.apiKey,
			apiUrl: item.apiUrl,
			itemPromiseResolve,
			itemPromise,
			size
		});
		this.sizeBytes += size;
		return itemPromise;
	}
	pop({ upToSizeBytes, upToSize }) {
		if (upToSizeBytes < 1) throw new Error("Number of bytes to pop off may not be less than 1.");
		const popped = [];
		let poppedSizeBytes = 0;
		while (poppedSizeBytes + (this.peek()?.size ?? 0) < upToSizeBytes && this.items.length > 0 && popped.length < upToSize) {
			const item = this.items.shift();
			if (item) {
				popped.push(item);
				poppedSizeBytes += item.size;
				this.sizeBytes -= item.size;
			}
		}
		if (popped.length === 0 && this.items.length > 0) {
			const item = this.items.shift();
			popped.push(item);
			poppedSizeBytes += item.size;
			this.sizeBytes -= item.size;
		}
		return [popped.map((it) => ({
			action: it.action,
			item: it.payload,
			otelContext: it.otelContext,
			apiKey: it.apiKey,
			apiUrl: it.apiUrl
		})), () => popped.forEach((it) => it.itemPromiseResolve())];
	}
};
const DEFAULT_UNCOMPRESSED_BATCH_SIZE_LIMIT_BYTES = 24 * 1024 * 1024;
const SERVER_INFO_REQUEST_TIMEOUT_MS = 1e4;
/** Maximum number of operations to batch in a single request. */
const DEFAULT_BATCH_SIZE_LIMIT = 100;
const DEFAULT_API_URL = "https://api.smith.langchain.com";
var Client = class Client {
	get _fetch() {
		return this.fetchImplementation || _getFetchImplementation(this.debug);
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
			value: /* @__PURE__ */ new Set()
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
			value: new AutoBatchQueue()
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
			value: getEnvironmentVariable("LANGSMITH_TRACING_BACKGROUND") === "false"
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
		Object.defineProperty(this, "multipartStreamingDisabled", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: false
		});
		Object.defineProperty(this, "debug", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: getEnvironmentVariable("LANGSMITH_DEBUG") === "true"
		});
		const defaultConfig = Client.getDefaultClientConfig();
		this.tracingSampleRate = getTracingSamplingRate(config.tracingSamplingRate);
		this.apiUrl = trimQuotes(config.apiUrl ?? defaultConfig.apiUrl) ?? "";
		if (this.apiUrl.endsWith("/")) this.apiUrl = this.apiUrl.slice(0, -1);
		this.apiKey = trimQuotes(config.apiKey ?? defaultConfig.apiKey);
		this.webUrl = trimQuotes(config.webUrl ?? defaultConfig.webUrl);
		if (this.webUrl?.endsWith("/")) this.webUrl = this.webUrl.slice(0, -1);
		this.workspaceId = trimQuotes(config.workspaceId ?? getLangSmithEnvironmentVariable("WORKSPACE_ID"));
		this.timeout_ms = config.timeout_ms ?? 9e4;
		this.caller = new AsyncCaller({
			...config.callerOptions ?? {},
			maxRetries: 4,
			debug: config.debug ?? this.debug
		});
		this.traceBatchConcurrency = config.traceBatchConcurrency ?? this.traceBatchConcurrency;
		if (this.traceBatchConcurrency < 1) throw new Error("Trace batch concurrency must be positive.");
		this.debug = config.debug ?? this.debug;
		this.fetchImplementation = config.fetchImplementation;
		this.batchIngestCaller = new AsyncCaller({
			maxRetries: 2,
			maxConcurrency: this.traceBatchConcurrency,
			...config.callerOptions ?? {},
			onFailedResponseHook: handle429,
			debug: config.debug ?? this.debug
		});
		this.hideInputs = config.hideInputs ?? config.anonymizer ?? defaultConfig.hideInputs;
		this.hideOutputs = config.hideOutputs ?? config.anonymizer ?? defaultConfig.hideOutputs;
		this.autoBatchTracing = config.autoBatchTracing ?? this.autoBatchTracing;
		this.blockOnRootRunFinalization = config.blockOnRootRunFinalization ?? this.blockOnRootRunFinalization;
		this.batchSizeBytesLimit = config.batchSizeBytesLimit;
		this.batchSizeLimit = config.batchSizeLimit;
		this.fetchOptions = config.fetchOptions || {};
		this.manualFlushMode = config.manualFlushMode ?? this.manualFlushMode;
		if (getOtelEnabled()) this.langSmithToOTELTranslator = new LangSmithToOTELTranslator();
		this.cachedLSEnvVarsForMetadata = getLangSmithEnvVarsMetadata();
	}
	static getDefaultClientConfig() {
		const apiKey = getLangSmithEnvironmentVariable("API_KEY");
		const apiUrl = getLangSmithEnvironmentVariable("ENDPOINT") ?? DEFAULT_API_URL;
		const hideInputs = getLangSmithEnvironmentVariable("HIDE_INPUTS") === "true";
		const hideOutputs = getLangSmithEnvironmentVariable("HIDE_OUTPUTS") === "true";
		return {
			apiUrl,
			apiKey,
			webUrl: void 0,
			hideInputs,
			hideOutputs
		};
	}
	getHostUrl() {
		if (this.webUrl) return this.webUrl;
		else if (isLocalhost(this.apiUrl)) {
			this.webUrl = "http://localhost:3000";
			return this.webUrl;
		} else if (this.apiUrl.endsWith("/api/v1")) {
			this.webUrl = this.apiUrl.replace("/api/v1", "");
			return this.webUrl;
		} else if (this.apiUrl.includes("/api") && !this.apiUrl.split(".", 1)[0].endsWith("api")) {
			this.webUrl = this.apiUrl.replace("/api", "");
			return this.webUrl;
		} else if (this.apiUrl.split(".", 1)[0].includes("dev")) {
			this.webUrl = "https://dev.smith.langchain.com";
			return this.webUrl;
		} else if (this.apiUrl.split(".", 1)[0].includes("eu")) {
			this.webUrl = "https://eu.smith.langchain.com";
			return this.webUrl;
		} else if (this.apiUrl.split(".", 1)[0].includes("beta")) {
			this.webUrl = "https://beta.smith.langchain.com";
			return this.webUrl;
		} else {
			this.webUrl = "https://smith.langchain.com";
			return this.webUrl;
		}
	}
	get headers() {
		const headers = { "User-Agent": `langsmith-js/${__version__}` };
		if (this.apiKey) headers["x-api-key"] = `${this.apiKey}`;
		if (this.workspaceId) headers["x-tenant-id"] = this.workspaceId;
		return headers;
	}
	_getPlatformEndpointPath(path) {
		const needsV1Prefix = this.apiUrl.slice(-3) !== "/v1" && this.apiUrl.slice(-4) !== "/v1/";
		return needsV1Prefix ? `/v1/platform/${path}` : `/platform/${path}`;
	}
	async processInputs(inputs) {
		if (this.hideInputs === false) return inputs;
		if (this.hideInputs === true) return {};
		if (typeof this.hideInputs === "function") return this.hideInputs(inputs);
		return inputs;
	}
	async processOutputs(outputs) {
		if (this.hideOutputs === false) return outputs;
		if (this.hideOutputs === true) return {};
		if (typeof this.hideOutputs === "function") return this.hideOutputs(outputs);
		return outputs;
	}
	async prepareRunCreateOrUpdateInputs(run) {
		const runParams = { ...run };
		if (runParams.inputs !== void 0) runParams.inputs = await this.processInputs(runParams.inputs);
		if (runParams.outputs !== void 0) runParams.outputs = await this.processOutputs(runParams.outputs);
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
				...this.fetchOptions
			});
			await raiseForStatus(res, `fetch ${path}`);
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
					...this.fetchOptions
				});
				await raiseForStatus(res, `fetch ${path}`);
				return res;
			});
			const items = transform ? transform(await response.json()) : await response.json();
			if (items.length === 0) break;
			yield items;
			if (items.length < limit) break;
			offset += items.length;
		}
	}
	async *_getCursorPaginatedList(path, body = null, requestMethod = "POST", dataKey = "runs") {
		const bodyParams = body ? { ...body } : {};
		while (true) {
			const body$1 = JSON.stringify(bodyParams);
			const response = await this.caller.call(async () => {
				const res = await this._fetch(`${this.apiUrl}${path}`, {
					method: requestMethod,
					headers: {
						...this.headers,
						"Content-Type": "application/json"
					},
					signal: AbortSignal.timeout(this.timeout_ms),
					...this.fetchOptions,
					body: body$1
				});
				await raiseForStatus(res, `fetch ${path}`);
				return res;
			});
			const responseBody = await response.json();
			if (!responseBody) break;
			if (!responseBody[dataKey]) break;
			yield responseBody[dataKey];
			const cursors = responseBody.cursors;
			if (!cursors) break;
			if (!cursors.next) break;
			bodyParams.cursor = cursors.next;
		}
	}
	_shouldSample() {
		if (this.tracingSampleRate === void 0) return true;
		return Math.random() < this.tracingSampleRate;
	}
	_filterForSampling(runs, patch = false) {
		if (this.tracingSampleRate === void 0) return runs;
		if (patch) {
			const sampled = [];
			for (const run of runs) if (!this.filteredPostUuids.has(run.trace_id)) sampled.push(run);
			else if (run.id === run.trace_id) this.filteredPostUuids.delete(run.trace_id);
			return sampled;
		} else {
			const sampled = [];
			for (const run of runs) {
				const traceId = run.trace_id ?? run.id;
				if (this.filteredPostUuids.has(traceId)) continue;
				if (run.id === traceId) if (this._shouldSample()) sampled.push(run);
				else this.filteredPostUuids.add(traceId);
				else sampled.push(run);
			}
			return sampled;
		}
	}
	async _getBatchSizeLimitBytes() {
		const serverInfo = await this._ensureServerInfo();
		return this.batchSizeBytesLimit ?? serverInfo.batch_ingest_config?.size_limit_bytes ?? DEFAULT_UNCOMPRESSED_BATCH_SIZE_LIMIT_BYTES;
	}
	/**
	* Get the maximum number of operations to batch in a single request.
	*/
	async _getBatchSizeLimit() {
		const serverInfo = await this._ensureServerInfo();
		return this.batchSizeLimit ?? serverInfo.batch_ingest_config?.size_limit ?? DEFAULT_BATCH_SIZE_LIMIT;
	}
	async _getDatasetExamplesMultiPartSupport() {
		const serverInfo = await this._ensureServerInfo();
		return serverInfo.instance_flags?.dataset_examples_multipart_enabled ?? false;
	}
	drainAutoBatchQueue({ batchSizeLimitBytes, batchSizeLimit }) {
		const promises = [];
		while (this.autoBatchQueue.items.length > 0) {
			const [batch, done] = this.autoBatchQueue.pop({
				upToSizeBytes: batchSizeLimitBytes,
				upToSize: batchSizeLimit
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
				if (!acc[batchKey]) acc[batchKey] = [];
				acc[batchKey].push(item);
				return acc;
			}, {});
			const batchPromises = [];
			for (const [batchKey, batch$1] of Object.entries(batchesByDestination)) {
				const batchPromise = this._processBatch(batch$1, {
					apiUrl: batchKey === "default" ? void 0 : batchKey.split("|")[0],
					apiKey: batchKey === "default" ? void 0 : batchKey.split("|")[1]
				});
				batchPromises.push(batchPromise);
			}
			const allBatchesPromise = Promise.all(batchPromises).finally(done);
			promises.push(allBatchesPromise);
		}
		return Promise.all(promises);
	}
	async _processBatch(batch, options) {
		if (!batch.length) return;
		try {
			if (this.langSmithToOTELTranslator !== void 0) this._sendBatchToOTELTranslator(batch);
			else {
				const ingestParams = {
					runCreates: batch.filter((item) => item.action === "create").map((item) => item.item),
					runUpdates: batch.filter((item) => item.action === "update").map((item) => item.item)
				};
				const serverInfo = await this._ensureServerInfo();
				if (serverInfo?.batch_ingest_config?.use_multipart_endpoint) {
					const useGzip = serverInfo?.instance_flags?.gzip_body_enabled;
					await this.multipartIngestRuns(ingestParams, {
						...options,
						useGzip
					});
				} else await this.batchIngestRuns(ingestParams, options);
			}
		} catch (e) {
			console.error("Error exporting batch:", e);
		}
	}
	_sendBatchToOTELTranslator(batch) {
		if (this.langSmithToOTELTranslator !== void 0) {
			const otelContextMap = /* @__PURE__ */ new Map();
			const operations = [];
			for (const item of batch) if (item.item.id && item.otelContext) {
				otelContextMap.set(item.item.id, item.otelContext);
				if (item.action === "create") operations.push({
					operation: "post",
					id: item.item.id,
					trace_id: item.item.trace_id ?? item.item.id,
					run: item.item
				});
				else operations.push({
					operation: "patch",
					id: item.item.id,
					trace_id: item.item.trace_id ?? item.item.id,
					run: item.item
				});
			}
			this.langSmithToOTELTranslator.exportBatch(operations, otelContextMap);
		}
	}
	async processRunOperation(item) {
		clearTimeout(this.autoBatchTimeout);
		this.autoBatchTimeout = void 0;
		item.item = mergeRuntimeEnvIntoRun(item.item, this.cachedLSEnvVarsForMetadata);
		const itemPromise = this.autoBatchQueue.push(item);
		if (this.manualFlushMode) return itemPromise;
		const sizeLimitBytes = await this._getBatchSizeLimitBytes();
		const sizeLimit = await this._getBatchSizeLimit();
		if (this.autoBatchQueue.sizeBytes > sizeLimitBytes || this.autoBatchQueue.items.length > sizeLimit) this.drainAutoBatchQueue({
			batchSizeLimitBytes: sizeLimitBytes,
			batchSizeLimit: sizeLimit
		});
		if (this.autoBatchQueue.items.length > 0) this.autoBatchTimeout = setTimeout(() => {
			this.autoBatchTimeout = void 0;
			this.drainAutoBatchQueue({
				batchSizeLimitBytes: sizeLimitBytes,
				batchSizeLimit: sizeLimit
			});
		}, this.autoBatchAggregationDelayMs);
		return itemPromise;
	}
	async _getServerInfo() {
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/info`, {
				method: "GET",
				headers: { Accept: "application/json" },
				signal: AbortSignal.timeout(SERVER_INFO_REQUEST_TIMEOUT_MS),
				...this.fetchOptions
			});
			await raiseForStatus(res, "get server info");
			return res;
		});
		const json = await response.json();
		if (this.debug) console.log("\n=== LangSmith Server Configuration ===\n" + JSON.stringify(json, null, 2) + "\n");
		return json;
	}
	async _ensureServerInfo() {
		if (this._getServerInfoPromise === void 0) this._getServerInfoPromise = (async () => {
			if (this._serverInfo === void 0) try {
				this._serverInfo = await this._getServerInfo();
			} catch (e) {
				console.warn(`[LANGSMITH]: Failed to fetch info on supported operations. Falling back to batch operations and default limits. Info: ${e.status ?? "Unspecified status code"} ${e.message}`);
			}
			return this._serverInfo ?? {};
		})();
		return this._getServerInfoPromise.then((serverInfo) => {
			if (this._serverInfo === void 0) this._getServerInfoPromise = void 0;
			return serverInfo;
		});
	}
	async _getSettings() {
		if (!this.settings) this.settings = this._get("/settings");
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
			batchSizeLimit: sizeLimit
		});
	}
	_cloneCurrentOTELContext() {
		const otel_trace = getOTELTrace();
		const otel_context = getOTELContext();
		if (this.langSmithToOTELTranslator !== void 0) {
			const currentSpan = otel_trace.getActiveSpan();
			if (currentSpan) return otel_trace.setSpan(otel_context.active(), currentSpan);
		}
		return void 0;
	}
	async createRun(run, options) {
		if (!this._filterForSampling([run]).length) return;
		const headers = {
			...this.headers,
			"Content-Type": "application/json"
		};
		const session_name = run.project_name;
		delete run.project_name;
		const runCreate = await this.prepareRunCreateOrUpdateInputs({
			session_name,
			...run,
			start_time: run.start_time ?? Date.now()
		});
		if (this.autoBatchTracing && runCreate.trace_id !== void 0 && runCreate.dotted_order !== void 0) {
			const otelContext = this._cloneCurrentOTELContext();
			this.processRunOperation({
				action: "create",
				item: runCreate,
				otelContext,
				apiKey: options?.apiKey,
				apiUrl: options?.apiUrl
			}).catch(console.error);
			return;
		}
		const mergedRunCreateParam = mergeRuntimeEnvIntoRun(runCreate, this.cachedLSEnvVarsForMetadata);
		if (options?.apiKey !== void 0) headers["x-api-key"] = options.apiKey;
		if (options?.workspaceId !== void 0) headers["x-tenant-id"] = options.workspaceId;
		const body = serialize(mergedRunCreateParam, `Creating run with id: ${mergedRunCreateParam.id}`);
		await this.caller.call(async () => {
			const res = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs`, {
				method: "POST",
				headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "create run", true);
			return res;
		});
	}
	/**
	* Batch ingest/upsert multiple runs in the Langsmith system.
	* @param runs
	*/
	async batchIngestRuns({ runCreates, runUpdates }, options) {
		if (runCreates === void 0 && runUpdates === void 0) return;
		let preparedCreateParams = await Promise.all(runCreates?.map((create) => this.prepareRunCreateOrUpdateInputs(create)) ?? []);
		let preparedUpdateParams = await Promise.all(runUpdates?.map((update) => this.prepareRunCreateOrUpdateInputs(update)) ?? []);
		if (preparedCreateParams.length > 0 && preparedUpdateParams.length > 0) {
			const createById = preparedCreateParams.reduce((params, run) => {
				if (!run.id) return params;
				params[run.id] = run;
				return params;
			}, {});
			const standaloneUpdates = [];
			for (const updateParam of preparedUpdateParams) if (updateParam.id !== void 0 && createById[updateParam.id]) createById[updateParam.id] = {
				...createById[updateParam.id],
				...updateParam
			};
			else standaloneUpdates.push(updateParam);
			preparedCreateParams = Object.values(createById);
			preparedUpdateParams = standaloneUpdates;
		}
		const rawBatch = {
			post: preparedCreateParams,
			patch: preparedUpdateParams
		};
		if (!rawBatch.post.length && !rawBatch.patch.length) return;
		const batchChunks = {
			post: [],
			patch: []
		};
		for (const k of ["post", "patch"]) {
			const key = k;
			const batchItems = rawBatch[key].reverse();
			let batchItem = batchItems.pop();
			while (batchItem !== void 0) {
				batchChunks[key].push(batchItem);
				batchItem = batchItems.pop();
			}
		}
		if (batchChunks.post.length > 0 || batchChunks.patch.length > 0) {
			const runIds = batchChunks.post.map((item) => item.id).concat(batchChunks.patch.map((item) => item.id)).join(",");
			await this._postBatchIngestRuns(serialize(batchChunks, `Ingesting runs with ids: ${runIds}`), options);
		}
	}
	async _postBatchIngestRuns(body, options) {
		const headers = {
			...this.headers,
			"Content-Type": "application/json",
			Accept: "application/json"
		};
		if (options?.apiKey !== void 0) headers["x-api-key"] = options.apiKey;
		await this.batchIngestCaller.call(async () => {
			const res = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs/batch`, {
				method: "POST",
				headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "batch create run", true);
			return res;
		});
	}
	/**
	* Batch ingest/upsert multiple runs in the Langsmith system.
	* @param runs
	*/
	async multipartIngestRuns({ runCreates, runUpdates }, options) {
		if (runCreates === void 0 && runUpdates === void 0) return;
		const allAttachments = {};
		let preparedCreateParams = [];
		for (const create of runCreates ?? []) {
			const preparedCreate = await this.prepareRunCreateOrUpdateInputs(create);
			if (preparedCreate.id !== void 0 && preparedCreate.attachments !== void 0) allAttachments[preparedCreate.id] = preparedCreate.attachments;
			delete preparedCreate.attachments;
			preparedCreateParams.push(preparedCreate);
		}
		let preparedUpdateParams = [];
		for (const update of runUpdates ?? []) preparedUpdateParams.push(await this.prepareRunCreateOrUpdateInputs(update));
		const invalidRunCreate = preparedCreateParams.find((runCreate) => {
			return runCreate.trace_id === void 0 || runCreate.dotted_order === void 0;
		});
		if (invalidRunCreate !== void 0) throw new Error(`Multipart ingest requires "trace_id" and "dotted_order" to be set when creating a run`);
		const invalidRunUpdate = preparedUpdateParams.find((runUpdate) => {
			return runUpdate.trace_id === void 0 || runUpdate.dotted_order === void 0;
		});
		if (invalidRunUpdate !== void 0) throw new Error(`Multipart ingest requires "trace_id" and "dotted_order" to be set when updating a run`);
		if (preparedCreateParams.length > 0 && preparedUpdateParams.length > 0) {
			const createById = preparedCreateParams.reduce((params, run) => {
				if (!run.id) return params;
				params[run.id] = run;
				return params;
			}, {});
			const standaloneUpdates = [];
			for (const updateParam of preparedUpdateParams) if (updateParam.id !== void 0 && createById[updateParam.id]) createById[updateParam.id] = {
				...createById[updateParam.id],
				...updateParam
			};
			else standaloneUpdates.push(updateParam);
			preparedCreateParams = Object.values(createById);
			preparedUpdateParams = standaloneUpdates;
		}
		if (preparedCreateParams.length === 0 && preparedUpdateParams.length === 0) return;
		const accumulatedContext = [];
		const accumulatedParts = [];
		for (const [method, payloads] of [["post", preparedCreateParams], ["patch", preparedUpdateParams]]) for (const originalPayload of payloads) {
			const { inputs, outputs, events, extra, error, serialized, attachments,...payload } = originalPayload;
			const fields = {
				inputs,
				outputs,
				events,
				extra,
				error,
				serialized
			};
			const stringifiedPayload = serialize(payload, `Serializing for multipart ingestion of run with id: ${payload.id}`);
			accumulatedParts.push({
				name: `${method}.${payload.id}`,
				payload: new Blob([stringifiedPayload], { type: `application/json; length=${stringifiedPayload.length}` })
			});
			for (const [key, value] of Object.entries(fields)) {
				if (value === void 0) continue;
				const stringifiedValue = serialize(value, `Serializing ${key} for multipart ingestion of run with id: ${payload.id}`);
				accumulatedParts.push({
					name: `${method}.${payload.id}.${key}`,
					payload: new Blob([stringifiedValue], { type: `application/json; length=${stringifiedValue.length}` })
				});
			}
			if (payload.id !== void 0) {
				const attachments$1 = allAttachments[payload.id];
				if (attachments$1) {
					delete allAttachments[payload.id];
					for (const [name, attachment] of Object.entries(attachments$1)) {
						let contentType;
						let content;
						if (Array.isArray(attachment)) [contentType, content] = attachment;
						else {
							contentType = attachment.mimeType;
							content = attachment.data;
						}
						if (name.includes(".")) {
							console.warn(`Skipping attachment '${name}' for run ${payload.id}: Invalid attachment name. Attachment names must not contain periods ('.'). Please rename the attachment and try again.`);
							continue;
						}
						accumulatedParts.push({
							name: `attachment.${payload.id}.${name}`,
							payload: new Blob([content], { type: `${contentType}; length=${content.byteLength}` })
						});
					}
				}
			}
			accumulatedContext.push(`trace=${payload.trace_id},id=${payload.id}`);
		}
		await this._sendMultipartRequest(accumulatedParts, accumulatedContext.join("; "), options);
	}
	async _createNodeFetchBody(parts, boundary) {
		const chunks = [];
		for (const part of parts) {
			chunks.push(new Blob([`--${boundary}\r\n`]));
			chunks.push(new Blob([`Content-Disposition: form-data; name="${part.name}"\r\n`, `Content-Type: ${part.payload.type}\r\n\r\n`]));
			chunks.push(part.payload);
			chunks.push(new Blob(["\r\n"]));
		}
		chunks.push(new Blob([`--${boundary}--\r\n`]));
		const body = new Blob(chunks);
		const arrayBuffer = await body.arrayBuffer();
		return arrayBuffer;
	}
	async _createMultipartStream(parts, boundary) {
		const encoder = new TextEncoder();
		const stream = new ReadableStream({ async start(controller) {
			const writeChunk = async (chunk) => {
				if (typeof chunk === "string") controller.enqueue(encoder.encode(chunk));
				else controller.enqueue(chunk);
			};
			for (const part of parts) {
				await writeChunk(`--${boundary}\r\n`);
				await writeChunk(`Content-Disposition: form-data; name="${part.name}"\r\n`);
				await writeChunk(`Content-Type: ${part.payload.type}\r\n\r\n`);
				const payloadStream = part.payload.stream();
				const reader = payloadStream.getReader();
				try {
					let result;
					while (!(result = await reader.read()).done) controller.enqueue(result.value);
				} finally {
					reader.releaseLock();
				}
				await writeChunk("\r\n");
			}
			await writeChunk(`--${boundary}--\r\n`);
			controller.close();
		} });
		return stream;
	}
	async _sendMultipartRequest(parts, context, options) {
		const boundary = "----LangSmithFormBoundary" + Math.random().toString(36).slice(2);
		const isNodeFetch = _globalFetchImplementationIsNodeFetch();
		const buildBuffered = () => this._createNodeFetchBody(parts, boundary);
		const buildStream = () => this._createMultipartStream(parts, boundary);
		const sendWithRetry = async (bodyFactory) => {
			return this.batchIngestCaller.call(async () => {
				const body = await bodyFactory();
				const headers = {
					...this.headers,
					"Content-Type": `multipart/form-data; boundary=${boundary}`
				};
				if (options?.apiKey !== void 0) headers["x-api-key"] = options.apiKey;
				let transformedBody = body;
				if (options?.useGzip && typeof body === "object" && "pipeThrough" in body) {
					transformedBody = body.pipeThrough(new CompressionStream("gzip"));
					headers["Content-Encoding"] = "gzip";
				}
				const response = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs/multipart`, {
					method: "POST",
					headers,
					body: transformedBody,
					duplex: "half",
					signal: AbortSignal.timeout(this.timeout_ms),
					...this.fetchOptions
				});
				await raiseForStatus(response, `Failed to send multipart request`, true);
				return response;
			});
		};
		try {
			let res;
			let streamedAttempt = false;
			if (!isNodeFetch && !this.multipartStreamingDisabled && getEnv() !== "bun") {
				streamedAttempt = true;
				res = await sendWithRetry(buildStream);
			} else res = await sendWithRetry(buildBuffered);
			if ((!this.multipartStreamingDisabled || streamedAttempt) && res.status === 422 && (options?.apiUrl ?? this.apiUrl) !== DEFAULT_API_URL) {
				console.warn(`Streaming multipart upload to ${options?.apiUrl ?? this.apiUrl}/runs/multipart failed. This usually means the host does not support chunked uploads. Retrying with a buffered upload for operation "${context}".`);
				this.multipartStreamingDisabled = true;
				res = await sendWithRetry(buildBuffered);
			}
		} catch (e) {
			console.warn(`${e.message.trim()}\n\nContext: ${context}`);
		}
	}
	async updateRun(runId, run, options) {
		assertUuid(runId);
		if (run.inputs) run.inputs = await this.processInputs(run.inputs);
		if (run.outputs) run.outputs = await this.processOutputs(run.outputs);
		const data = {
			...run,
			id: runId
		};
		if (!this._filterForSampling([data], true).length) return;
		if (this.autoBatchTracing && data.trace_id !== void 0 && data.dotted_order !== void 0) {
			const otelContext = this._cloneCurrentOTELContext();
			if (run.end_time !== void 0 && data.parent_run_id === void 0 && this.blockOnRootRunFinalization && !this.manualFlushMode) {
				await this.processRunOperation({
					action: "update",
					item: data,
					otelContext,
					apiKey: options?.apiKey,
					apiUrl: options?.apiUrl
				}).catch(console.error);
				return;
			} else this.processRunOperation({
				action: "update",
				item: data,
				otelContext,
				apiKey: options?.apiKey,
				apiUrl: options?.apiUrl
			}).catch(console.error);
			return;
		}
		const headers = {
			...this.headers,
			"Content-Type": "application/json"
		};
		if (options?.apiKey !== void 0) headers["x-api-key"] = options.apiKey;
		if (options?.workspaceId !== void 0) headers["x-tenant-id"] = options.workspaceId;
		const body = serialize(run, `Serializing payload to update run with id: ${runId}`);
		await this.caller.call(async () => {
			const res = await this._fetch(`${options?.apiUrl ?? this.apiUrl}/runs/${runId}`, {
				method: "PATCH",
				headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update run", true);
			return res;
		});
	}
	async readRun(runId, { loadChildRuns } = { loadChildRuns: false }) {
		assertUuid(runId);
		let run = await this._get(`/runs/${runId}`);
		if (loadChildRuns) run = await this._loadChildRuns(run);
		return run;
	}
	async getRunUrl({ runId, run, projectOpts }) {
		if (run !== void 0) {
			let sessionId;
			if (run.session_id) sessionId = run.session_id;
			else if (projectOpts?.projectName) sessionId = (await this.readProject({ projectName: projectOpts?.projectName })).id;
			else if (projectOpts?.projectId) sessionId = projectOpts?.projectId;
			else {
				const project = await this.readProject({ projectName: getLangSmithEnvironmentVariable("PROJECT") || "default" });
				sessionId = project.id;
			}
			const tenantId = await this._getTenantId();
			return `${this.getHostUrl()}/o/${tenantId}/projects/p/${sessionId}/r/${run.id}?poll=true`;
		} else if (runId !== void 0) {
			const run_ = await this.readRun(runId);
			if (!run_.app_path) throw new Error(`Run ${runId} has no app_path`);
			const baseUrl = this.getHostUrl();
			return `${baseUrl}${run_.app_path}`;
		} else throw new Error("Must provide either runId or run");
	}
	async _loadChildRuns(run) {
		const childRuns = await toArray(this.listRuns({
			isRoot: false,
			projectId: run.session_id,
			traceId: run.trace_id
		}));
		const treemap = {};
		const runs = {};
		childRuns.sort((a, b) => (a?.dotted_order ?? "").localeCompare(b?.dotted_order ?? ""));
		for (const childRun of childRuns) {
			if (childRun.parent_run_id === null || childRun.parent_run_id === void 0) throw new Error(`Child run ${childRun.id} has no parent`);
			if (childRun.dotted_order?.startsWith(run.dotted_order ?? "") && childRun.id !== run.id) {
				if (!(childRun.parent_run_id in treemap)) treemap[childRun.parent_run_id] = [];
				treemap[childRun.parent_run_id].push(childRun);
				runs[childRun.id] = childRun;
			}
		}
		run.child_runs = treemap[run.id] || [];
		for (const runId in treemap) if (runId !== run.id) runs[runId].child_runs = treemap[runId];
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
		const { projectId, projectName, parentRunId, traceId, referenceExampleId, startTime, executionOrder, isRoot, runType, error, id, query, filter, traceFilter, treeFilter, limit, select, order } = props;
		let projectIds = [];
		if (projectId) projectIds = Array.isArray(projectId) ? projectId : [projectId];
		if (projectName) {
			const projectNames = Array.isArray(projectName) ? projectName : [projectName];
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
			"trace_id"
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
			order
		};
		if (body.select.includes("child_run_ids")) warnOnce("Deprecated: 'child_run_ids' in the listRuns select parameter is deprecated and will be removed in a future version.");
		let runsYielded = 0;
		for await (const runs of this._getCursorPaginatedList("/runs/query", body)) if (limit) {
			if (runsYielded >= limit) break;
			if (runs.length + runsYielded > limit) {
				const newRuns = runs.slice(0, limit - runsYielded);
				yield* newRuns;
				break;
			}
			runsYielded += runs.length;
			yield* runs;
		} else yield* runs;
	}
	async *listGroupRuns(props) {
		const { projectId, projectName, groupBy, filter, startTime, endTime, limit, offset } = props;
		const sessionId = projectId || (await this.readProject({ projectName })).id;
		const baseBody = {
			session_id: sessionId,
			group_by: groupBy,
			filter,
			start_time: startTime ? startTime.toISOString() : null,
			end_time: endTime ? endTime.toISOString() : null,
			limit: Number(limit) || 100
		};
		let currentOffset = Number(offset) || 0;
		const path = "/runs/group";
		const url = `${this.apiUrl}${path}`;
		while (true) {
			const currentBody = {
				...baseBody,
				offset: currentOffset
			};
			const filteredPayload = Object.fromEntries(Object.entries(currentBody).filter(([_, value]) => value !== void 0));
			const body = JSON.stringify(filteredPayload);
			const response = await this.caller.call(async () => {
				const res = await this._fetch(url, {
					method: "POST",
					headers: {
						...this.headers,
						"Content-Type": "application/json"
					},
					signal: AbortSignal.timeout(this.timeout_ms),
					...this.fetchOptions,
					body
				});
				await raiseForStatus(res, `Failed to fetch ${path}`);
				return res;
			});
			const items = await response.json();
			const { groups, total } = items;
			if (groups.length === 0) break;
			for (const thread of groups) yield thread;
			currentOffset += groups.length;
			if (currentOffset >= total) break;
		}
	}
	async getRunStats({ id, trace, parentRun, runType, projectNames, projectIds, referenceExampleIds, startTime, endTime, error, query, filter, traceFilter, treeFilter, isRoot, dataSourceType }) {
		let projectIds_ = projectIds || [];
		if (projectNames) projectIds_ = [...projectIds || [], ...await Promise.all(projectNames.map((name) => this.readProject({ projectName: name }).then((project) => project.id)))];
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
			data_source_type: dataSourceType
		};
		const filteredPayload = Object.fromEntries(Object.entries(payload).filter(([_, value]) => value !== void 0));
		const body = JSON.stringify(filteredPayload);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/runs/stats`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "get run stats");
			return res;
		});
		const result = await response.json();
		return result;
	}
	async shareRun(runId, { shareId } = {}) {
		const data = {
			run_id: runId,
			share_token: shareId || uuid.v4()
		};
		assertUuid(runId);
		const body = JSON.stringify(data);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/runs/${runId}/share`, {
				method: "PUT",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "share run");
			return res;
		});
		const result = await response.json();
		if (result === null || !("share_token" in result)) throw new Error("Invalid response from server");
		return `${this.getHostUrl()}/public/${result["share_token"]}/r`;
	}
	async unshareRun(runId) {
		assertUuid(runId);
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/runs/${runId}/share`, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "unshare run", true);
			return res;
		});
	}
	async readRunSharedLink(runId) {
		assertUuid(runId);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/runs/${runId}/share`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "read run shared link");
			return res;
		});
		const result = await response.json();
		if (result === null || !("share_token" in result)) return void 0;
		return `${this.getHostUrl()}/public/${result["share_token"]}/r`;
	}
	async listSharedRuns(shareToken, { runIds } = {}) {
		const queryParams = new URLSearchParams({ share_token: shareToken });
		if (runIds !== void 0) for (const runId of runIds) queryParams.append("id", runId);
		assertUuid(shareToken);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/public/${shareToken}/runs${queryParams}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "list shared runs");
			return res;
		});
		const runs = await response.json();
		return runs;
	}
	async readDatasetSharedSchema(datasetId, datasetName) {
		if (!datasetId && !datasetName) throw new Error("Either datasetId or datasetName must be given");
		if (!datasetId) {
			const dataset = await this.readDataset({ datasetName });
			datasetId = dataset.id;
		}
		assertUuid(datasetId);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/share`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "read dataset shared schema");
			return res;
		});
		const shareSchema = await response.json();
		shareSchema.url = `${this.getHostUrl()}/public/${shareSchema.share_token}/d`;
		return shareSchema;
	}
	async shareDataset(datasetId, datasetName) {
		if (!datasetId && !datasetName) throw new Error("Either datasetId or datasetName must be given");
		if (!datasetId) {
			const dataset = await this.readDataset({ datasetName });
			datasetId = dataset.id;
		}
		const data = { dataset_id: datasetId };
		assertUuid(datasetId);
		const body = JSON.stringify(data);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/share`, {
				method: "PUT",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "share dataset");
			return res;
		});
		const shareSchema = await response.json();
		shareSchema.url = `${this.getHostUrl()}/public/${shareSchema.share_token}/d`;
		return shareSchema;
	}
	async unshareDataset(datasetId) {
		assertUuid(datasetId);
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/share`, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "unshare dataset", true);
			return res;
		});
	}
	async readSharedDataset(shareToken) {
		assertUuid(shareToken);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/public/${shareToken}/datasets`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "read shared dataset");
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
		if (options?.exampleIds) params.id = options.exampleIds;
		const urlParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (Array.isArray(value)) value.forEach((v) => urlParams.append(key, v));
			else urlParams.append(key, value);
		});
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/public/${shareToken}/examples?${urlParams.toString()}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "list shared examples");
			return res;
		});
		const result = await response.json();
		if (!response.ok) {
			if ("detail" in result) throw new Error(`Failed to list shared examples.\nStatus: ${response.status}\nMessage: ${Array.isArray(result.detail) ? result.detail.join("\n") : "Unspecified error"}`);
			throw new Error(`Failed to list shared examples: ${response.status} ${response.statusText}`);
		}
		return result.map((example) => ({
			...example,
			_hostUrl: this.getHostUrl()
		}));
	}
	async createProject({ projectName, description = null, metadata = null, upsert = false, projectExtra = null, referenceDatasetId = null }) {
		const upsert_ = upsert ? `?upsert=true` : "";
		const endpoint = `${this.apiUrl}/sessions${upsert_}`;
		const extra = projectExtra || {};
		if (metadata) extra["metadata"] = metadata;
		const body = {
			name: projectName,
			extra,
			description
		};
		if (referenceDatasetId !== null) body["reference_dataset_id"] = referenceDatasetId;
		const serializedBody = JSON.stringify(body);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(endpoint, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: serializedBody
			});
			await raiseForStatus(res, "create project");
			return res;
		});
		const result = await response.json();
		return result;
	}
	async updateProject(projectId, { name = null, description = null, metadata = null, projectExtra = null, endTime = null }) {
		const endpoint = `${this.apiUrl}/sessions/${projectId}`;
		let extra = projectExtra;
		if (metadata) extra = {
			...extra || {},
			metadata
		};
		const body = JSON.stringify({
			name,
			extra,
			description,
			end_time: endTime ? new Date(endTime).toISOString() : null
		});
		const response = await this.caller.call(async () => {
			const res = await this._fetch(endpoint, {
				method: "PATCH",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update project");
			return res;
		});
		const result = await response.json();
		return result;
	}
	async hasProject({ projectId, projectName }) {
		let path = "/sessions";
		const params = new URLSearchParams();
		if (projectId !== void 0 && projectName !== void 0) throw new Error("Must provide either projectName or projectId, not both");
		else if (projectId !== void 0) {
			assertUuid(projectId);
			path += `/${projectId}`;
		} else if (projectName !== void 0) params.append("name", projectName);
		else throw new Error("Must provide projectName or projectId");
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}${path}?${params}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "has project");
			return res;
		});
		try {
			const result = await response.json();
			if (!response.ok) return false;
			if (Array.isArray(result)) return result.length > 0;
			return true;
		} catch (e) {
			return false;
		}
	}
	async readProject({ projectId, projectName, includeStats }) {
		let path = "/sessions";
		const params = new URLSearchParams();
		if (projectId !== void 0 && projectName !== void 0) throw new Error("Must provide either projectName or projectId, not both");
		else if (projectId !== void 0) {
			assertUuid(projectId);
			path += `/${projectId}`;
		} else if (projectName !== void 0) params.append("name", projectName);
		else throw new Error("Must provide projectName or projectId");
		if (includeStats !== void 0) params.append("include_stats", includeStats.toString());
		const response = await this._get(path, params);
		let result;
		if (Array.isArray(response)) {
			if (response.length === 0) throw new Error(`Project[id=${projectId}, name=${projectName}] not found`);
			result = response[0];
		} else result = response;
		return result;
	}
	async getProjectUrl({ projectId, projectName }) {
		if (projectId === void 0 && projectName === void 0) throw new Error("Must provide either projectName or projectId");
		const project = await this.readProject({
			projectId,
			projectName
		});
		const tenantId = await this._getTenantId();
		return `${this.getHostUrl()}/o/${tenantId}/projects/p/${project.id}`;
	}
	async getDatasetUrl({ datasetId, datasetName }) {
		if (datasetId === void 0 && datasetName === void 0) throw new Error("Must provide either datasetName or datasetId");
		const dataset = await this.readDataset({
			datasetId,
			datasetName
		});
		const tenantId = await this._getTenantId();
		return `${this.getHostUrl()}/o/${tenantId}/datasets/${dataset.id}`;
	}
	async _getTenantId() {
		if (this._tenantId !== null) return this._tenantId;
		const queryParams = new URLSearchParams({ limit: "1" });
		for await (const projects of this._getPaginated("/sessions", queryParams)) {
			this._tenantId = projects[0].tenant_id;
			return projects[0].tenant_id;
		}
		throw new Error("No projects found to resolve tenant.");
	}
	async *listProjects({ projectIds, name, nameContains, referenceDatasetId, referenceDatasetName, includeStats, datasetVersion, referenceFree, metadata } = {}) {
		const params = new URLSearchParams();
		if (projectIds !== void 0) for (const projectId of projectIds) params.append("id", projectId);
		if (name !== void 0) params.append("name", name);
		if (nameContains !== void 0) params.append("name_contains", nameContains);
		if (referenceDatasetId !== void 0) params.append("reference_dataset", referenceDatasetId);
		else if (referenceDatasetName !== void 0) {
			const dataset = await this.readDataset({ datasetName: referenceDatasetName });
			params.append("reference_dataset", dataset.id);
		}
		if (includeStats !== void 0) params.append("include_stats", includeStats.toString());
		if (datasetVersion !== void 0) params.append("dataset_version", datasetVersion);
		if (referenceFree !== void 0) params.append("reference_free", referenceFree.toString());
		if (metadata !== void 0) params.append("metadata", JSON.stringify(metadata));
		for await (const projects of this._getPaginated("/sessions", params)) yield* projects;
	}
	async deleteProject({ projectId, projectName }) {
		let projectId_;
		if (projectId === void 0 && projectName === void 0) throw new Error("Must provide projectName or projectId");
		else if (projectId !== void 0 && projectName !== void 0) throw new Error("Must provide either projectName or projectId, not both");
		else if (projectId === void 0) projectId_ = (await this.readProject({ projectName })).id;
		else projectId_ = projectId;
		assertUuid(projectId_);
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/sessions/${projectId_}`, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, `delete session ${projectId_} (${projectName})`, true);
			return res;
		});
	}
	async uploadCsv({ csvFile, fileName, inputKeys, outputKeys, description, dataType, name }) {
		const url = `${this.apiUrl}/datasets/upload`;
		const formData = new FormData();
		formData.append("file", csvFile, fileName);
		inputKeys.forEach((key) => {
			formData.append("input_keys", key);
		});
		outputKeys.forEach((key) => {
			formData.append("output_keys", key);
		});
		if (description) formData.append("description", description);
		if (dataType) formData.append("data_type", dataType);
		if (name) formData.append("name", name);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(url, {
				method: "POST",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: formData
			});
			await raiseForStatus(res, "upload CSV");
			return res;
		});
		const result = await response.json();
		return result;
	}
	async createDataset(name, { description, dataType, inputsSchema, outputsSchema, metadata } = {}) {
		const body = {
			name,
			description,
			extra: metadata ? { metadata } : void 0
		};
		if (dataType) body.data_type = dataType;
		if (inputsSchema) body.inputs_schema_definition = inputsSchema;
		if (outputsSchema) body.outputs_schema_definition = outputsSchema;
		const serializedBody = JSON.stringify(body);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: serializedBody
			});
			await raiseForStatus(res, "create dataset");
			return res;
		});
		const result = await response.json();
		return result;
	}
	async readDataset({ datasetId, datasetName }) {
		let path = "/datasets";
		const params = new URLSearchParams({ limit: "1" });
		if (datasetId && datasetName) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId) {
			assertUuid(datasetId);
			path += `/${datasetId}`;
		} else if (datasetName) params.append("name", datasetName);
		else throw new Error("Must provide datasetName or datasetId");
		const response = await this._get(path, params);
		let result;
		if (Array.isArray(response)) {
			if (response.length === 0) throw new Error(`Dataset[id=${datasetId}, name=${datasetName}] not found`);
			result = response[0];
		} else result = response;
		return result;
	}
	async hasDataset({ datasetId, datasetName }) {
		try {
			await this.readDataset({
				datasetId,
				datasetName
			});
			return true;
		} catch (e) {
			if (e instanceof Error && e.message.toLocaleLowerCase().includes("not found")) return false;
			throw e;
		}
	}
	async diffDatasetVersions({ datasetId, datasetName, fromVersion, toVersion }) {
		let datasetId_ = datasetId;
		if (datasetId_ === void 0 && datasetName === void 0) throw new Error("Must provide either datasetName or datasetId");
		else if (datasetId_ !== void 0 && datasetName !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId_ === void 0) {
			const dataset = await this.readDataset({ datasetName });
			datasetId_ = dataset.id;
		}
		const urlParams = new URLSearchParams({
			from_version: typeof fromVersion === "string" ? fromVersion : fromVersion.toISOString(),
			to_version: typeof toVersion === "string" ? toVersion : toVersion.toISOString()
		});
		const response = await this._get(`/datasets/${datasetId_}/versions/diff`, urlParams);
		return response;
	}
	async readDatasetOpenaiFinetuning({ datasetId, datasetName }) {
		const path = "/datasets";
		if (datasetId !== void 0) {} else if (datasetName !== void 0) datasetId = (await this.readDataset({ datasetName })).id;
		else throw new Error("Must provide either datasetName or datasetId");
		const response = await this._getResponse(`${path}/${datasetId}/openai_ft`);
		const datasetText = await response.text();
		const dataset = datasetText.trim().split("\n").map((line) => JSON.parse(line));
		return dataset;
	}
	async *listDatasets({ limit = 100, offset = 0, datasetIds, datasetName, datasetNameContains, metadata } = {}) {
		const path = "/datasets";
		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString()
		});
		if (datasetIds !== void 0) for (const id_ of datasetIds) params.append("id", id_);
		if (datasetName !== void 0) params.append("name", datasetName);
		if (datasetNameContains !== void 0) params.append("name_contains", datasetNameContains);
		if (metadata !== void 0) params.append("metadata", JSON.stringify(metadata));
		for await (const datasets of this._getPaginated(path, params)) yield* datasets;
	}
	/**
	* Update a dataset
	* @param props The dataset details to update
	* @returns The updated dataset
	*/
	async updateDataset(props) {
		const { datasetId, datasetName,...update } = props;
		if (!datasetId && !datasetName) throw new Error("Must provide either datasetName or datasetId");
		const _datasetId = datasetId ?? (await this.readDataset({ datasetName })).id;
		assertUuid(_datasetId);
		const body = JSON.stringify(update);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${_datasetId}`, {
				method: "PATCH",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update dataset");
			return res;
		});
		return await response.json();
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
		if (!datasetId && !datasetName) throw new Error("Must provide either datasetName or datasetId");
		const _datasetId = datasetId ?? (await this.readDataset({ datasetName })).id;
		assertUuid(_datasetId);
		const body = JSON.stringify({
			as_of: typeof asOf === "string" ? asOf : asOf.toISOString(),
			tag
		});
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${_datasetId}/tags`, {
				method: "PUT",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update dataset tags", true);
			return res;
		});
	}
	async deleteDataset({ datasetId, datasetName }) {
		let path = "/datasets";
		let datasetId_ = datasetId;
		if (datasetId !== void 0 && datasetName !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetName !== void 0) {
			const dataset = await this.readDataset({ datasetName });
			datasetId_ = dataset.id;
		}
		if (datasetId_ !== void 0) {
			assertUuid(datasetId_);
			path += `/${datasetId_}`;
		} else throw new Error("Must provide datasetName or datasetId");
		await this.caller.call(async () => {
			const res = await this._fetch(this.apiUrl + path, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, `delete ${path}`, true);
			return res;
		});
	}
	async indexDataset({ datasetId, datasetName, tag }) {
		let datasetId_ = datasetId;
		if (!datasetId_ && !datasetName) throw new Error("Must provide either datasetName or datasetId");
		else if (datasetId_ && datasetName) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (!datasetId_) {
			const dataset = await this.readDataset({ datasetName });
			datasetId_ = dataset.id;
		}
		assertUuid(datasetId_);
		const data = { tag };
		const body = JSON.stringify(data);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId_}/index`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "index dataset");
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
	async similarExamples(inputs, datasetId, limit, { filter } = {}) {
		const data = {
			limit,
			inputs
		};
		if (filter !== void 0) data["filter"] = filter;
		assertUuid(datasetId);
		const body = JSON.stringify(data);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId}/search`, {
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				method: "POST",
				body
			});
			await raiseForStatus(res, "fetch similar examples");
			return res;
		});
		const result = await response.json();
		return result["examples"];
	}
	async createExample(inputsOrUpdate, outputs, options) {
		if (isExampleCreate(inputsOrUpdate)) {
			if (outputs !== void 0 || options !== void 0) throw new Error("Cannot provide outputs or options when using ExampleCreate object");
		}
		let datasetId_ = outputs ? options?.datasetId : inputsOrUpdate.dataset_id;
		const datasetName_ = outputs ? options?.datasetName : inputsOrUpdate.dataset_name;
		if (datasetId_ === void 0 && datasetName_ === void 0) throw new Error("Must provide either datasetName or datasetId");
		else if (datasetId_ !== void 0 && datasetName_ !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId_ === void 0) {
			const dataset = await this.readDataset({ datasetName: datasetName_ });
			datasetId_ = dataset.id;
		}
		const createdAt_ = (outputs ? options?.createdAt : inputsOrUpdate.created_at) || /* @__PURE__ */ new Date();
		let data;
		if (!isExampleCreate(inputsOrUpdate)) data = {
			inputs: inputsOrUpdate,
			outputs,
			created_at: createdAt_?.toISOString(),
			id: options?.exampleId,
			metadata: options?.metadata,
			split: options?.split,
			source_run_id: options?.sourceRunId,
			use_source_run_io: options?.useSourceRunIO,
			use_source_run_attachments: options?.useSourceRunAttachments,
			attachments: options?.attachments
		};
		else data = inputsOrUpdate;
		const response = await this._uploadExamplesMultipart(datasetId_, [data]);
		const example = await this.readExample(response.example_ids?.[0] ?? uuid.v4());
		return example;
	}
	async createExamples(propsOrUploads) {
		if (Array.isArray(propsOrUploads)) {
			if (propsOrUploads.length === 0) return [];
			const uploads = propsOrUploads;
			let datasetId_$1 = uploads[0].dataset_id;
			const datasetName_$1 = uploads[0].dataset_name;
			if (datasetId_$1 === void 0 && datasetName_$1 === void 0) throw new Error("Must provide either datasetName or datasetId");
			else if (datasetId_$1 !== void 0 && datasetName_$1 !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
			else if (datasetId_$1 === void 0) {
				const dataset = await this.readDataset({ datasetName: datasetName_$1 });
				datasetId_$1 = dataset.id;
			}
			const response$1 = await this._uploadExamplesMultipart(datasetId_$1, uploads);
			const examples$1 = await Promise.all(response$1.example_ids.map((id) => this.readExample(id)));
			return examples$1;
		}
		const { inputs, outputs, metadata, splits, sourceRunIds, useSourceRunIOs, useSourceRunAttachments, attachments, exampleIds, datasetId, datasetName } = propsOrUploads;
		if (inputs === void 0) throw new Error("Must provide inputs when using legacy parameters");
		let datasetId_ = datasetId;
		const datasetName_ = datasetName;
		if (datasetId_ === void 0 && datasetName_ === void 0) throw new Error("Must provide either datasetName or datasetId");
		else if (datasetId_ !== void 0 && datasetName_ !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId_ === void 0) {
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
				use_source_run_attachments: useSourceRunAttachments?.[idx]
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
			if (isLangChainMessage(message)) return convertLangChainMessageToExample(message);
			return message;
		});
		const finalOutput = isLangChainMessage(generations) ? convertLangChainMessageToExample(generations) : generations;
		return this.createExample({ input: finalInput }, { output: finalOutput }, options);
	}
	async readExample(exampleId) {
		assertUuid(exampleId);
		const path = `/examples/${exampleId}`;
		const rawExample = await this._get(path);
		const { attachment_urls,...rest } = rawExample;
		const example = rest;
		if (attachment_urls) example.attachments = Object.entries(attachment_urls).reduce((acc, [key, value]) => {
			acc[key.slice(11)] = {
				presigned_url: value.presigned_url,
				mime_type: value.mime_type
			};
			return acc;
		}, {});
		return example;
	}
	async *listExamples({ datasetId, datasetName, exampleIds, asOf, splits, inlineS3Urls, metadata, limit, offset, filter, includeAttachments } = {}) {
		let datasetId_;
		if (datasetId !== void 0 && datasetName !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId !== void 0) datasetId_ = datasetId;
		else if (datasetName !== void 0) {
			const dataset = await this.readDataset({ datasetName });
			datasetId_ = dataset.id;
		} else throw new Error("Must provide a datasetName or datasetId");
		const params = new URLSearchParams({ dataset: datasetId_ });
		const dataset_version = asOf ? typeof asOf === "string" ? asOf : asOf?.toISOString() : void 0;
		if (dataset_version) params.append("as_of", dataset_version);
		const inlineS3Urls_ = inlineS3Urls ?? true;
		params.append("inline_s3_urls", inlineS3Urls_.toString());
		if (exampleIds !== void 0) for (const id_ of exampleIds) params.append("id", id_);
		if (splits !== void 0) for (const split of splits) params.append("splits", split);
		if (metadata !== void 0) {
			const serializedMetadata = JSON.stringify(metadata);
			params.append("metadata", serializedMetadata);
		}
		if (limit !== void 0) params.append("limit", limit.toString());
		if (offset !== void 0) params.append("offset", offset.toString());
		if (filter !== void 0) params.append("filter", filter);
		if (includeAttachments === true) [
			"attachment_urls",
			"outputs",
			"metadata"
		].forEach((field) => params.append("select", field));
		let i = 0;
		for await (const rawExamples of this._getPaginated("/examples", params)) {
			for (const rawExample of rawExamples) {
				const { attachment_urls,...rest } = rawExample;
				const example = rest;
				if (attachment_urls) example.attachments = Object.entries(attachment_urls).reduce((acc, [key, value]) => {
					acc[key.slice(11)] = {
						presigned_url: value.presigned_url,
						mime_type: value.mime_type || void 0
					};
					return acc;
				}, {});
				yield example;
				i++;
			}
			if (limit !== void 0 && i >= limit) break;
		}
	}
	async deleteExample(exampleId) {
		assertUuid(exampleId);
		const path = `/examples/${exampleId}`;
		await this.caller.call(async () => {
			const res = await this._fetch(this.apiUrl + path, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, `delete ${path}`, true);
			return res;
		});
	}
	async updateExample(exampleIdOrUpdate, update) {
		let exampleId;
		if (update) exampleId = exampleIdOrUpdate;
		else exampleId = exampleIdOrUpdate.id;
		assertUuid(exampleId);
		let updateToUse;
		if (update) updateToUse = {
			id: exampleId,
			...update
		};
		else updateToUse = exampleIdOrUpdate;
		let datasetId;
		if (updateToUse.dataset_id !== void 0) datasetId = updateToUse.dataset_id;
		else {
			const example = await this.readExample(exampleId);
			datasetId = example.dataset_id;
		}
		return this._updateExamplesMultipart(datasetId, [updateToUse]);
	}
	async updateExamples(update) {
		let datasetId;
		if (update[0].dataset_id === void 0) {
			const example = await this.readExample(update[0].id);
			datasetId = example.dataset_id;
		} else datasetId = update[0].dataset_id;
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
	async readDatasetVersion({ datasetId, datasetName, asOf, tag }) {
		let resolvedDatasetId;
		if (!datasetId) {
			const dataset = await this.readDataset({ datasetName });
			resolvedDatasetId = dataset.id;
		} else resolvedDatasetId = datasetId;
		assertUuid(resolvedDatasetId);
		if (asOf && tag || !asOf && !tag) throw new Error("Exactly one of asOf and tag must be specified.");
		const params = new URLSearchParams();
		if (asOf !== void 0) params.append("as_of", typeof asOf === "string" ? asOf : asOf.toISOString());
		if (tag !== void 0) params.append("tag", tag);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${resolvedDatasetId}/version?${params.toString()}`, {
				method: "GET",
				headers: { ...this.headers },
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "read dataset version");
			return res;
		});
		return await response.json();
	}
	async listDatasetSplits({ datasetId, datasetName, asOf }) {
		let datasetId_;
		if (datasetId === void 0 && datasetName === void 0) throw new Error("Must provide dataset name or ID");
		else if (datasetId !== void 0 && datasetName !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId === void 0) {
			const dataset = await this.readDataset({ datasetName });
			datasetId_ = dataset.id;
		} else datasetId_ = datasetId;
		assertUuid(datasetId_);
		const params = new URLSearchParams();
		const dataset_version = asOf ? typeof asOf === "string" ? asOf : asOf?.toISOString() : void 0;
		if (dataset_version) params.append("as_of", dataset_version);
		const response = await this._get(`/datasets/${datasetId_}/splits`, params);
		return response;
	}
	async updateDatasetSplits({ datasetId, datasetName, splitName, exampleIds, remove = false }) {
		let datasetId_;
		if (datasetId === void 0 && datasetName === void 0) throw new Error("Must provide dataset name or ID");
		else if (datasetId !== void 0 && datasetName !== void 0) throw new Error("Must provide either datasetName or datasetId, not both");
		else if (datasetId === void 0) {
			const dataset = await this.readDataset({ datasetName });
			datasetId_ = dataset.id;
		} else datasetId_ = datasetId;
		assertUuid(datasetId_);
		const data = {
			split_name: splitName,
			examples: exampleIds.map((id) => {
				assertUuid(id);
				return id;
			}),
			remove
		};
		const body = JSON.stringify(data);
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/${datasetId_}/splits`, {
				method: "PUT",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update dataset splits", true);
			return res;
		});
	}
	/**
	* @deprecated This method is deprecated and will be removed in future LangSmith versions, use `evaluate` from `langsmith/evaluation` instead.
	*/
	async evaluateRun(run, evaluator, { sourceInfo, loadChildRuns, referenceExample } = { loadChildRuns: false }) {
		warnOnce("This method is deprecated and will be removed in future LangSmith versions, use `evaluate` from `langsmith/evaluation` instead.");
		let run_;
		if (typeof run === "string") run_ = await this.readRun(run, { loadChildRuns });
		else if (typeof run === "object" && "id" in run) run_ = run;
		else throw new Error(`Invalid run type: ${typeof run}`);
		if (run_.reference_example_id !== null && run_.reference_example_id !== void 0) referenceExample = await this.readExample(run_.reference_example_id);
		const feedbackResult = await evaluator.evaluateRun(run_, referenceExample);
		const [_, feedbacks] = await this._logEvaluationFeedback(feedbackResult, run_, sourceInfo);
		return feedbacks[0];
	}
	async createFeedback(runId, key, { score, value, correction, comment, sourceInfo, feedbackSourceType = "api", sourceRunId, feedbackId, feedbackConfig, projectId, comparativeExperimentId }) {
		if (!runId && !projectId) throw new Error("One of runId or projectId must be provided");
		if (runId && projectId) throw new Error("Only one of runId or projectId can be provided");
		const feedback_source = {
			type: feedbackSourceType ?? "api",
			metadata: sourceInfo ?? {}
		};
		if (sourceRunId !== void 0 && feedback_source?.metadata !== void 0 && !feedback_source.metadata["__run"]) feedback_source.metadata["__run"] = { run_id: sourceRunId };
		if (feedback_source?.metadata !== void 0 && feedback_source.metadata["__run"]?.run_id !== void 0) assertUuid(feedback_source.metadata["__run"].run_id);
		const feedback = {
			id: feedbackId ?? uuid.v4(),
			run_id: runId,
			key,
			score: _formatFeedbackScore(score),
			value,
			correction,
			comment,
			feedback_source,
			comparative_experiment_id: comparativeExperimentId,
			feedbackConfig,
			session_id: projectId
		};
		const body = JSON.stringify(feedback);
		const url = `${this.apiUrl}/feedback`;
		await this.caller.call(async () => {
			const res = await this._fetch(url, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "create feedback", true);
			return res;
		});
		return feedback;
	}
	async updateFeedback(feedbackId, { score, value, correction, comment }) {
		const feedbackUpdate = {};
		if (score !== void 0 && score !== null) feedbackUpdate["score"] = _formatFeedbackScore(score);
		if (value !== void 0 && value !== null) feedbackUpdate["value"] = value;
		if (correction !== void 0 && correction !== null) feedbackUpdate["correction"] = correction;
		if (comment !== void 0 && comment !== null) feedbackUpdate["comment"] = comment;
		assertUuid(feedbackId);
		const body = JSON.stringify(feedbackUpdate);
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/feedback/${feedbackId}`, {
				method: "PATCH",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update feedback", true);
			return res;
		});
	}
	async readFeedback(feedbackId) {
		assertUuid(feedbackId);
		const path = `/feedback/${feedbackId}`;
		const response = await this._get(path);
		return response;
	}
	async deleteFeedback(feedbackId) {
		assertUuid(feedbackId);
		const path = `/feedback/${feedbackId}`;
		await this.caller.call(async () => {
			const res = await this._fetch(this.apiUrl + path, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, `delete ${path}`, true);
			return res;
		});
	}
	async *listFeedback({ runIds, feedbackKeys, feedbackSourceTypes } = {}) {
		const queryParams = new URLSearchParams();
		if (runIds) for (const runId of runIds) {
			assertUuid(runId);
			queryParams.append("run", runId);
		}
		if (feedbackKeys) for (const key of feedbackKeys) queryParams.append("key", key);
		if (feedbackSourceTypes) for (const type of feedbackSourceTypes) queryParams.append("source", type);
		for await (const feedbacks of this._getPaginated("/feedback", queryParams)) yield* feedbacks;
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
	async createPresignedFeedbackToken(runId, feedbackKey, { expiration, feedbackConfig } = {}) {
		const body = {
			run_id: runId,
			feedback_key: feedbackKey,
			feedback_config: feedbackConfig
		};
		if (expiration) {
			if (typeof expiration === "string") body["expires_at"] = expiration;
			else if (expiration?.hours || expiration?.minutes || expiration?.days) body["expires_in"] = expiration;
		} else body["expires_in"] = { hours: 3 };
		const serializedBody = JSON.stringify(body);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/feedback/tokens`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: serializedBody
			});
			await raiseForStatus(res, "create presigned feedback token");
			return res;
		});
		return await response.json();
	}
	async createComparativeExperiment({ name, experimentIds, referenceDatasetId, createdAt, description, metadata, id }) {
		if (experimentIds.length === 0) throw new Error("At least one experiment is required");
		if (!referenceDatasetId) referenceDatasetId = (await this.readProject({ projectId: experimentIds[0] })).reference_dataset_id;
		if (!referenceDatasetId == null) throw new Error("A reference dataset is required");
		const body = {
			id,
			name,
			experiment_ids: experimentIds,
			reference_dataset_id: referenceDatasetId,
			description,
			created_at: (createdAt ?? /* @__PURE__ */ new Date())?.toISOString(),
			extra: {}
		};
		if (metadata) body.extra["metadata"] = metadata;
		const serializedBody = JSON.stringify(body);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/datasets/comparative`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: serializedBody
			});
			await raiseForStatus(res, "create comparative experiment");
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
		assertUuid(runId);
		const params = new URLSearchParams({ run_id: runId });
		for await (const tokens of this._getPaginated("/feedback/tokens", params)) yield* tokens;
	}
	_selectEvalResults(results) {
		let results_;
		if ("results" in results) results_ = results.results;
		else if (Array.isArray(results)) results_ = results;
		else results_ = [results];
		return results_;
	}
	async _logEvaluationFeedback(evaluatorResponse, run, sourceInfo) {
		const evalResults = this._selectEvalResults(evaluatorResponse);
		const feedbacks = [];
		for (const res of evalResults) {
			let sourceInfo_ = sourceInfo || {};
			if (res.evaluatorInfo) sourceInfo_ = {
				...res.evaluatorInfo,
				...sourceInfo_
			};
			let runId_ = null;
			if (res.targetRunId) runId_ = res.targetRunId;
			else if (run) runId_ = run.id;
			feedbacks.push(await this.createFeedback(runId_, res.key, {
				score: res.score,
				value: res.value,
				comment: res.comment,
				correction: res.correction,
				sourceInfo: sourceInfo_,
				sourceRunId: res.sourceRunId,
				feedbackConfig: res.feedbackConfig,
				feedbackSourceType: "model"
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
		if (queueIds) queueIds.forEach((id, i) => {
			assertUuid(id, `queueIds[${i}]`);
			params.append("ids", id);
		});
		if (name) params.append("name", name);
		if (nameContains) params.append("name_contains", nameContains);
		params.append("limit", (limit !== void 0 ? Math.min(limit, 100) : 100).toString());
		let count = 0;
		for await (const queues of this._getPaginated("/annotation-queues", params)) {
			yield* queues;
			count++;
			if (limit !== void 0 && count >= limit) break;
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
			rubric_instructions: rubricInstructions
		};
		const serializedBody = JSON.stringify(Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== void 0)));
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/annotation-queues`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: serializedBody
			});
			await raiseForStatus(res, "create annotation queue");
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
			const res = await this._fetch(`${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "read annotation queue");
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
			rubric_instructions: rubricInstructions
		});
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}`, {
				method: "PATCH",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update annotation queue", true);
			return res;
		});
	}
	/**
	* Delete an annotation queue with the specified queue ID.
	* @param queueId - The ID of the annotation queue to delete
	*/
	async deleteAnnotationQueue(queueId) {
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}`, {
				method: "DELETE",
				headers: {
					...this.headers,
					Accept: "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "delete annotation queue", true);
			return res;
		});
	}
	/**
	* Add runs to an annotation queue with the specified queue ID.
	* @param queueId - The ID of the annotation queue
	* @param runIds - The IDs of the runs to be added to the annotation queue
	*/
	async addRunsToAnnotationQueue(queueId, runIds) {
		const body = JSON.stringify(runIds.map((id, i) => assertUuid(id, `runIds[${i}]`).toString()));
		await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}/runs`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "add runs to annotation queue", true);
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
		const baseUrl = `/annotation-queues/${assertUuid(queueId, "queueId")}/run`;
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}${baseUrl}/${index}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "get run from annotation queue");
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
			const res = await this._fetch(`${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}/runs/${assertUuid(queueRunId, "queueRunId")}`, {
				method: "DELETE",
				headers: {
					...this.headers,
					Accept: "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "delete run from annotation queue", true);
			return res;
		});
	}
	/**
	* Get the size of an annotation queue.
	* @param queueId - The ID of the annotation queue
	*/
	async getSizeFromAnnotationQueue(queueId) {
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}/size`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "get size from annotation queue");
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
		return /* @__PURE__ */ new Error(`Cannot ${action} for another tenant.\n
      Current tenant: ${settings.tenant_handle}\n
      Requested tenant: ${owner}`);
	}
	async _getLatestCommitHash(promptOwnerAndName) {
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/commits/${promptOwnerAndName}/?limit=1&offset=0`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "get latest commit hash");
			return res;
		});
		const json = await response.json();
		if (json.commits.length === 0) return void 0;
		return json.commits[0].commit_hash;
	}
	async _likeOrUnlikePrompt(promptIdentifier, like) {
		const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
		const body = JSON.stringify({ like });
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/likes/${owner}/${promptName}`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, `${like ? "like" : "unlike"} prompt`);
			return res;
		});
		return response.json();
	}
	async _getPromptUrl(promptIdentifier) {
		const [owner, promptName, commitHash] = parsePromptIdentifier(promptIdentifier);
		if (!await this._currentTenantIsOwner(owner)) if (commitHash !== "latest") return `${this.getHostUrl()}/hub/${owner}/${promptName}/${commitHash.substring(0, 8)}`;
		else return `${this.getHostUrl()}/hub/${owner}/${promptName}`;
		else {
			const settings = await this._getSettings();
			if (commitHash !== "latest") return `${this.getHostUrl()}/prompts/${promptName}/${commitHash.substring(0, 8)}?organizationId=${settings.id}`;
			else return `${this.getHostUrl()}/prompts/${promptName}?organizationId=${settings.id}`;
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
		for await (const commits of this._getPaginated(`/commits/${promptOwnerAndName}/`, new URLSearchParams(), (res) => res.commits)) yield* commits;
	}
	async *listPrompts(options) {
		const params = new URLSearchParams();
		params.append("sort_field", options?.sortField ?? "updated_at");
		params.append("sort_direction", "desc");
		params.append("is_archived", (!!options?.isArchived).toString());
		if (options?.isPublic !== void 0) params.append("is_public", options.isPublic.toString());
		if (options?.query) params.append("query", options.query);
		for await (const prompts of this._getPaginated("/repos", params, (res) => res.repos)) yield* prompts;
	}
	async getPrompt(promptIdentifier) {
		const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/repos/${owner}/${promptName}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			if (res?.status === 404) return null;
			await raiseForStatus(res, "get prompt");
			return res;
		});
		const result = await response?.json();
		if (result?.repo) return result.repo;
		else return null;
	}
	async createPrompt(promptIdentifier, options) {
		const settings = await this._getSettings();
		if (options?.isPublic && !settings.tenant_handle) throw new Error(`Cannot create a public prompt without first\n
        creating a LangChain Hub handle.
        You can add a handle by creating a public prompt at:\n
        https://smith.langchain.com/prompts`);
		const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
		if (!await this._currentTenantIsOwner(owner)) throw await this._ownerConflictError("create a prompt", owner);
		const data = {
			repo_handle: promptName,
			...options?.description && { description: options.description },
			...options?.readme && { readme: options.readme },
			...options?.tags && { tags: options.tags },
			is_public: !!options?.isPublic
		};
		const body = JSON.stringify(data);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/repos/`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "create prompt");
			return res;
		});
		const { repo } = await response.json();
		return repo;
	}
	async createCommit(promptIdentifier, object, options) {
		if (!await this.promptExists(promptIdentifier)) throw new Error("Prompt does not exist, you must create it first.");
		const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
		const resolvedParentCommitHash = options?.parentCommitHash === "latest" || !options?.parentCommitHash ? await this._getLatestCommitHash(`${owner}/${promptName}`) : options?.parentCommitHash;
		const payload = {
			manifest: JSON.parse(JSON.stringify(object)),
			parent_commit: resolvedParentCommitHash
		};
		const body = JSON.stringify(payload);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/commits/${owner}/${promptName}`, {
				method: "POST",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "create commit");
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
		if (!await this._getDatasetExamplesMultiPartSupport()) throw new Error("Your LangSmith deployment does not allow using the multipart examples endpoint, please upgrade your deployment to the latest version.");
		const formData = new FormData();
		for (const example of updates) {
			const exampleId = example.id;
			const exampleBody = {
				...example.metadata && { metadata: example.metadata },
				...example.split && { split: example.split }
			};
			const stringifiedExample = serialize(exampleBody, `Serializing body for example with id: ${exampleId}`);
			const exampleBlob = new Blob([stringifiedExample], { type: "application/json" });
			formData.append(exampleId, exampleBlob);
			if (example.inputs) {
				const stringifiedInputs = serialize(example.inputs, `Serializing inputs for example with id: ${exampleId}`);
				const inputsBlob = new Blob([stringifiedInputs], { type: "application/json" });
				formData.append(`${exampleId}.inputs`, inputsBlob);
			}
			if (example.outputs) {
				const stringifiedOutputs = serialize(example.outputs, `Serializing outputs whle updating example with id: ${exampleId}`);
				const outputsBlob = new Blob([stringifiedOutputs], { type: "application/json" });
				formData.append(`${exampleId}.outputs`, outputsBlob);
			}
			if (example.attachments) for (const [name, attachment] of Object.entries(example.attachments)) {
				let mimeType;
				let data;
				if (Array.isArray(attachment)) [mimeType, data] = attachment;
				else {
					mimeType = attachment.mimeType;
					data = attachment.data;
				}
				const attachmentBlob = new Blob([data], { type: `${mimeType}; length=${data.byteLength}` });
				formData.append(`${exampleId}.attachment.${name}`, attachmentBlob);
			}
			if (example.attachments_operations) {
				const stringifiedAttachmentsOperations = serialize(example.attachments_operations, `Serializing attachments while updating example with id: ${exampleId}`);
				const attachmentsOperationsBlob = new Blob([stringifiedAttachmentsOperations], { type: "application/json" });
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
				body: formData
			});
			await raiseForStatus(res, "update examples");
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
		if (!await this._getDatasetExamplesMultiPartSupport()) throw new Error("Your LangSmith deployment does not allow using the multipart examples endpoint, please upgrade your deployment to the latest version.");
		const formData = new FormData();
		for (const example of uploads) {
			const exampleId = (example.id ?? uuid.v4()).toString();
			const exampleBody = {
				created_at: example.created_at,
				...example.metadata && { metadata: example.metadata },
				...example.split && { split: example.split },
				...example.source_run_id && { source_run_id: example.source_run_id },
				...example.use_source_run_io && { use_source_run_io: example.use_source_run_io },
				...example.use_source_run_attachments && { use_source_run_attachments: example.use_source_run_attachments }
			};
			const stringifiedExample = serialize(exampleBody, `Serializing body for uploaded example with id: ${exampleId}`);
			const exampleBlob = new Blob([stringifiedExample], { type: "application/json" });
			formData.append(exampleId, exampleBlob);
			if (example.inputs) {
				const stringifiedInputs = serialize(example.inputs, `Serializing inputs for uploaded example with id: ${exampleId}`);
				const inputsBlob = new Blob([stringifiedInputs], { type: "application/json" });
				formData.append(`${exampleId}.inputs`, inputsBlob);
			}
			if (example.outputs) {
				const stringifiedOutputs = serialize(example.outputs, `Serializing outputs for uploaded example with id: ${exampleId}`);
				const outputsBlob = new Blob([stringifiedOutputs], { type: "application/json" });
				formData.append(`${exampleId}.outputs`, outputsBlob);
			}
			if (example.attachments) for (const [name, attachment] of Object.entries(example.attachments)) {
				let mimeType;
				let data;
				if (Array.isArray(attachment)) [mimeType, data] = attachment;
				else {
					mimeType = attachment.mimeType;
					data = attachment.data;
				}
				const attachmentBlob = new Blob([data], { type: `${mimeType}; length=${data.byteLength}` });
				formData.append(`${exampleId}.attachment.${name}`, attachmentBlob);
			}
		}
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}${this._getPlatformEndpointPath(`datasets/${datasetId}/examples`)}`, {
				method: "POST",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body: formData
			});
			await raiseForStatus(res, "upload examples");
			return res;
		});
		return response.json();
	}
	async updatePrompt(promptIdentifier, options) {
		if (!await this.promptExists(promptIdentifier)) throw new Error("Prompt does not exist, you must create it first.");
		const [owner, promptName] = parsePromptIdentifier(promptIdentifier);
		if (!await this._currentTenantIsOwner(owner)) throw await this._ownerConflictError("update a prompt", owner);
		const payload = {};
		if (options?.description !== void 0) payload.description = options.description;
		if (options?.readme !== void 0) payload.readme = options.readme;
		if (options?.tags !== void 0) payload.tags = options.tags;
		if (options?.isPublic !== void 0) payload.is_public = options.isPublic;
		if (options?.isArchived !== void 0) payload.is_archived = options.isArchived;
		if (Object.keys(payload).length === 0) throw new Error("No valid update options provided");
		const body = JSON.stringify(payload);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/repos/${owner}/${promptName}`, {
				method: "PATCH",
				headers: {
					...this.headers,
					"Content-Type": "application/json"
				},
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions,
				body
			});
			await raiseForStatus(res, "update prompt");
			return res;
		});
		return response.json();
	}
	async deletePrompt(promptIdentifier) {
		if (!await this.promptExists(promptIdentifier)) throw new Error("Prompt does not exist, you must create it first.");
		const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
		if (!await this._currentTenantIsOwner(owner)) throw await this._ownerConflictError("delete a prompt", owner);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/repos/${owner}/${promptName}`, {
				method: "DELETE",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "delete prompt");
			return res;
		});
		return response.json();
	}
	async pullPromptCommit(promptIdentifier, options) {
		const [owner, promptName, commitHash] = parsePromptIdentifier(promptIdentifier);
		const response = await this.caller.call(async () => {
			const res = await this._fetch(`${this.apiUrl}/commits/${owner}/${promptName}/${commitHash}${options?.includeModel ? "?include_model=true" : ""}`, {
				method: "GET",
				headers: this.headers,
				signal: AbortSignal.timeout(this.timeout_ms),
				...this.fetchOptions
			});
			await raiseForStatus(res, "pull prompt commit");
			return res;
		});
		const result = await response.json();
		return {
			owner,
			repo: promptName,
			commit_hash: result.commit_hash,
			manifest: result.manifest,
			examples: result.examples
		};
	}
	/**
	* This method should not be used directly, use `import { pull } from "langchain/hub"` instead.
	* Using this method directly returns the JSON string of the prompt rather than a LangChain object.
	* @private
	*/
	async _pullPrompt(promptIdentifier, options) {
		const promptObject = await this.pullPromptCommit(promptIdentifier, { includeModel: options?.includeModel });
		const prompt = JSON.stringify(promptObject.manifest);
		return prompt;
	}
	async pushPrompt(promptIdentifier, options) {
		if (await this.promptExists(promptIdentifier)) {
			if (options && Object.keys(options).some((key) => key !== "object")) await this.updatePrompt(promptIdentifier, {
				description: options?.description,
				readme: options?.readme,
				tags: options?.tags,
				isPublic: options?.isPublic
			});
		} else await this.createPrompt(promptIdentifier, {
			description: options?.description,
			readme: options?.readme,
			tags: options?.tags,
			isPublic: options?.isPublic
		});
		if (!options?.object) return await this._getPromptUrl(promptIdentifier);
		const url = await this.createCommit(promptIdentifier, options?.object, { parentCommitHash: options?.parentCommitHash });
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
			apiKey: "placeholder"
		});
		const ds = await sourceClient.readSharedDataset(tokenUuid);
		const finalDatasetName = datasetName || ds.name;
		try {
			if (await this.hasDataset({ datasetId: finalDatasetName })) {
				console.log(`Dataset ${finalDatasetName} already exists in your tenant. Skipping.`);
				return;
			}
		} catch (_) {}
		const examples = await sourceClient.listSharedExamples(tokenUuid);
		const dataset = await this.createDataset(finalDatasetName, {
			description: ds.description,
			dataType: ds.data_type || "kv",
			inputsSchema: ds.inputs_schema_definition ?? void 0,
			outputsSchema: ds.outputs_schema_definition ?? void 0
		});
		try {
			await this.createExamples({
				inputs: examples.map((e) => e.inputs),
				outputs: examples.flatMap((e) => e.outputs ? [e.outputs] : []),
				datasetId: dataset.id
			});
		} catch (e) {
			console.error(`An error occurred while creating dataset ${finalDatasetName}. You should delete it manually.`);
			throw e;
		}
	}
	parseTokenOrUrl(urlOrToken, apiUrl, numParts = 2, kind = "dataset") {
		try {
			assertUuid(urlOrToken);
			return [apiUrl, urlOrToken];
		} catch (_) {}
		try {
			const parsedUrl = new URL(urlOrToken);
			const pathParts = parsedUrl.pathname.split("/").filter((part) => part !== "");
			if (pathParts.length >= numParts) {
				const tokenUuid = pathParts[pathParts.length - numParts];
				return [apiUrl, tokenUuid];
			} else throw new Error(`Invalid public ${kind} URL: ${urlOrToken}`);
		} catch (error) {
			throw new Error(`Invalid public ${kind} URL or token: ${urlOrToken}`);
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
		await Promise.all([...this.autoBatchQueue.items.map(({ itemPromise }) => itemPromise), this.batchIngestCaller.queue.onIdle()]);
		if (this.langSmithToOTELTranslator !== void 0) await getDefaultOTLPTracerComponents()?.DEFAULT_LANGSMITH_SPAN_PROCESSOR?.forceFlush();
	}
};
function isExampleCreate(input) {
	return "dataset_id" in input || "dataset_name" in input;
}

//#endregion
export { Client };
//# sourceMappingURL=client.js.map