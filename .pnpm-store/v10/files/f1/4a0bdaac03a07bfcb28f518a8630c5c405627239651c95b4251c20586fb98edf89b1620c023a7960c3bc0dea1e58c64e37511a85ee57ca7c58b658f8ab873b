const require_async_caller = require('./utils/async_caller.cjs');
const require_env = require('./utils/env.cjs');
const require_signals = require('./utils/signals.cjs');
const require_sse = require('./utils/sse.cjs');
const require_stream = require('./utils/stream.cjs');

//#region src/client.ts
function* iterateHeaders(headers) {
	let iter;
	let shouldClear = false;
	if (headers instanceof Headers) {
		const entries = [];
		headers.forEach((value, name) => {
			entries.push([name, value]);
		});
		iter = entries;
	} else if (Array.isArray(headers)) iter = headers;
	else {
		shouldClear = true;
		iter = Object.entries(headers ?? {});
	}
	for (const item of iter) {
		const name = item[0];
		if (typeof name !== "string") throw new TypeError(`Expected header name to be a string, got ${typeof name}`);
		const values = Array.isArray(item[1]) ? item[1] : [item[1]];
		let didClear = false;
		for (const value of values) {
			if (value === void 0) continue;
			if (shouldClear && !didClear) {
				didClear = true;
				yield [name, null];
			}
			yield [name, value];
		}
	}
}
function mergeHeaders(...headerObjects) {
	const outputHeaders = new Headers();
	for (const headers of headerObjects) {
		if (!headers) continue;
		for (const [name, value] of iterateHeaders(headers)) if (value === null) outputHeaders.delete(name);
		else outputHeaders.append(name, value);
	}
	const headerEntries = [];
	outputHeaders.forEach((value, name) => {
		headerEntries.push([name, value]);
	});
	return Object.fromEntries(headerEntries);
}
/**
* Get the API key from the environment.
* Precedence:
*   1. explicit argument (if string)
*   2. LANGGRAPH_API_KEY
*   3. LANGSMITH_API_KEY
*   4. LANGCHAIN_API_KEY
*
* @param apiKey - API key provided as an argument. If null, skips environment lookup. If undefined, tries environment.
* @returns The API key if found, otherwise undefined
*/
function getApiKey(apiKey) {
	if (apiKey === null) return void 0;
	if (apiKey) return apiKey;
	const prefixes = [
		"LANGGRAPH",
		"LANGSMITH",
		"LANGCHAIN"
	];
	for (const prefix of prefixes) {
		const envKey = require_env.getEnvironmentVariable(`${prefix}_API_KEY`);
		if (envKey) return envKey.trim().replace(/^["']|["']$/g, "");
	}
	return void 0;
}
const REGEX_RUN_METADATA = /(\/threads\/(?<thread_id>.+))?\/runs\/(?<run_id>.+)/;
function getRunMetadataFromResponse(response) {
	const contentLocation = response.headers.get("Content-Location");
	if (!contentLocation) return void 0;
	const match = REGEX_RUN_METADATA.exec(contentLocation);
	if (!match?.groups?.run_id) return void 0;
	return {
		run_id: match.groups.run_id,
		thread_id: match.groups.thread_id || void 0
	};
}
var BaseClient = class {
	asyncCaller;
	timeoutMs;
	apiUrl;
	defaultHeaders;
	onRequest;
	constructor(config) {
		const callerOptions = {
			maxRetries: 4,
			maxConcurrency: 4,
			...config?.callerOptions
		};
		let defaultApiUrl = "http://localhost:8123";
		if (!config?.apiUrl && typeof globalThis === "object" && globalThis != null) {
			const fetchSmb = Symbol.for("langgraph_api:fetch");
			const urlSmb = Symbol.for("langgraph_api:url");
			const global = globalThis;
			if (global[fetchSmb]) callerOptions.fetch ??= global[fetchSmb];
			if (global[urlSmb]) defaultApiUrl = global[urlSmb];
		}
		this.asyncCaller = new require_async_caller.AsyncCaller(callerOptions);
		this.timeoutMs = config?.timeoutMs;
		this.apiUrl = config?.apiUrl?.replace(/\/$/, "") || defaultApiUrl;
		this.defaultHeaders = config?.defaultHeaders || {};
		this.onRequest = config?.onRequest;
		const apiKey = getApiKey(config?.apiKey);
		if (apiKey) this.defaultHeaders["x-api-key"] = apiKey;
	}
	prepareFetchOptions(path, options) {
		const mutatedOptions = {
			...options,
			headers: mergeHeaders(this.defaultHeaders, options?.headers)
		};
		if (mutatedOptions.json) {
			mutatedOptions.body = JSON.stringify(mutatedOptions.json);
			mutatedOptions.headers = mergeHeaders(mutatedOptions.headers, { "content-type": "application/json" });
			delete mutatedOptions.json;
		}
		if (mutatedOptions.withResponse) delete mutatedOptions.withResponse;
		let timeoutSignal = null;
		if (typeof options?.timeoutMs !== "undefined") {
			if (options.timeoutMs != null) timeoutSignal = AbortSignal.timeout(options.timeoutMs);
		} else if (this.timeoutMs != null) timeoutSignal = AbortSignal.timeout(this.timeoutMs);
		mutatedOptions.signal = require_signals.mergeSignals(timeoutSignal, mutatedOptions.signal);
		const targetUrl = new URL(`${this.apiUrl}${path}`);
		if (mutatedOptions.params) {
			for (const [key, value] of Object.entries(mutatedOptions.params)) {
				if (value == null) continue;
				const strValue = typeof value === "string" || typeof value === "number" ? value.toString() : JSON.stringify(value);
				targetUrl.searchParams.append(key, strValue);
			}
			delete mutatedOptions.params;
		}
		return [targetUrl, mutatedOptions];
	}
	async fetch(path, options) {
		const [url, init] = this.prepareFetchOptions(path, options);
		let finalInit = init;
		if (this.onRequest) finalInit = await this.onRequest(url, init);
		const response = await this.asyncCaller.fetch(url, finalInit);
		const body = (() => {
			if (response.status === 202 || response.status === 204) return void 0;
			return response.json();
		})();
		if (options?.withResponse) return [await body, response];
		return body;
	}
};
var CronsClient = class extends BaseClient {
	/**
	*
	* @param threadId The ID of the thread.
	* @param assistantId Assistant ID to use for this cron job.
	* @param payload Payload for creating a cron job.
	* @returns The created background run.
	*/
	async createForThread(threadId, assistantId, payload) {
		const json = {
			schedule: payload?.schedule,
			input: payload?.input,
			config: payload?.config,
			context: payload?.context,
			metadata: payload?.metadata,
			assistant_id: assistantId,
			interrupt_before: payload?.interruptBefore,
			interrupt_after: payload?.interruptAfter,
			webhook: payload?.webhook,
			multitask_strategy: payload?.multitaskStrategy,
			if_not_exists: payload?.ifNotExists,
			checkpoint_during: payload?.checkpointDuring,
			durability: payload?.durability
		};
		return this.fetch(`/threads/${threadId}/runs/crons`, {
			method: "POST",
			json
		});
	}
	/**
	*
	* @param assistantId Assistant ID to use for this cron job.
	* @param payload Payload for creating a cron job.
	* @returns
	*/
	async create(assistantId, payload) {
		const json = {
			schedule: payload?.schedule,
			input: payload?.input,
			config: payload?.config,
			context: payload?.context,
			metadata: payload?.metadata,
			assistant_id: assistantId,
			interrupt_before: payload?.interruptBefore,
			interrupt_after: payload?.interruptAfter,
			webhook: payload?.webhook,
			multitask_strategy: payload?.multitaskStrategy,
			if_not_exists: payload?.ifNotExists,
			checkpoint_during: payload?.checkpointDuring,
			durability: payload?.durability
		};
		return this.fetch(`/runs/crons`, {
			method: "POST",
			json
		});
	}
	/**
	*
	* @param cronId Cron ID of Cron job to delete.
	*/
	async delete(cronId) {
		await this.fetch(`/runs/crons/${cronId}`, { method: "DELETE" });
	}
	/**
	*
	* @param query Query options.
	* @returns List of crons.
	*/
	async search(query) {
		return this.fetch("/runs/crons/search", {
			method: "POST",
			json: {
				assistant_id: query?.assistantId ?? void 0,
				thread_id: query?.threadId ?? void 0,
				limit: query?.limit ?? 10,
				offset: query?.offset ?? 0,
				sort_by: query?.sortBy ?? void 0,
				sort_order: query?.sortOrder ?? void 0,
				select: query?.select ?? void 0
			}
		});
	}
	/**
	* Count cron jobs matching filters.
	*
	* @param query.assistantId Assistant ID to filter by.
	* @param query.threadId Thread ID to filter by.
	* @returns Number of cron jobs matching the criteria.
	*/
	async count(query) {
		return this.fetch(`/runs/crons/count`, {
			method: "POST",
			json: {
				assistant_id: query?.assistantId ?? void 0,
				thread_id: query?.threadId ?? void 0
			}
		});
	}
};
var AssistantsClient = class extends BaseClient {
	/**
	* Get an assistant by ID.
	*
	* @param assistantId The ID of the assistant.
	* @returns Assistant
	*/
	async get(assistantId) {
		return this.fetch(`/assistants/${assistantId}`);
	}
	/**
	* Get the JSON representation of the graph assigned to a runnable
	* @param assistantId The ID of the assistant.
	* @param options.xray Whether to include subgraphs in the serialized graph representation. If an integer value is provided, only subgraphs with a depth less than or equal to the value will be included.
	* @returns Serialized graph
	*/
	async getGraph(assistantId, options) {
		return this.fetch(`/assistants/${assistantId}/graph`, { params: { xray: options?.xray } });
	}
	/**
	* Get the state and config schema of the graph assigned to a runnable
	* @param assistantId The ID of the assistant.
	* @returns Graph schema
	*/
	async getSchemas(assistantId) {
		return this.fetch(`/assistants/${assistantId}/schemas`);
	}
	/**
	* Get the schemas of an assistant by ID.
	*
	* @param assistantId The ID of the assistant to get the schema of.
	* @param options Additional options for getting subgraphs, such as namespace or recursion extraction.
	* @returns The subgraphs of the assistant.
	*/
	async getSubgraphs(assistantId, options) {
		if (options?.namespace) return this.fetch(`/assistants/${assistantId}/subgraphs/${options.namespace}`, { params: { recurse: options?.recurse } });
		return this.fetch(`/assistants/${assistantId}/subgraphs`, { params: { recurse: options?.recurse } });
	}
	/**
	* Create a new assistant.
	* @param payload Payload for creating an assistant.
	* @returns The created assistant.
	*/
	async create(payload) {
		return this.fetch("/assistants", {
			method: "POST",
			json: {
				graph_id: payload.graphId,
				config: payload.config,
				context: payload.context,
				metadata: payload.metadata,
				assistant_id: payload.assistantId,
				if_exists: payload.ifExists,
				name: payload.name,
				description: payload.description
			}
		});
	}
	/**
	* Update an assistant.
	* @param assistantId ID of the assistant.
	* @param payload Payload for updating the assistant.
	* @returns The updated assistant.
	*/
	async update(assistantId, payload) {
		return this.fetch(`/assistants/${assistantId}`, {
			method: "PATCH",
			json: {
				graph_id: payload.graphId,
				config: payload.config,
				context: payload.context,
				metadata: payload.metadata,
				name: payload.name,
				description: payload.description
			}
		});
	}
	/**
	* Delete an assistant.
	*
	* @param assistantId ID of the assistant.
	*/
	async delete(assistantId) {
		return this.fetch(`/assistants/${assistantId}`, { method: "DELETE" });
	}
	/**
	* List assistants.
	* @param query Query options.
	* @returns List of assistants.
	*/
	async search(query) {
		return this.fetch("/assistants/search", {
			method: "POST",
			json: {
				graph_id: query?.graphId ?? void 0,
				name: query?.name ?? void 0,
				metadata: query?.metadata ?? void 0,
				limit: query?.limit ?? 10,
				offset: query?.offset ?? 0,
				sort_by: query?.sortBy ?? void 0,
				sort_order: query?.sortOrder ?? void 0,
				select: query?.select ?? void 0
			}
		});
	}
	/**
	* Count assistants matching filters.
	*
	* @param query.metadata Metadata to filter by. Exact match for each key/value.
	* @param query.graphId Optional graph id to filter by.
	* @returns Number of assistants matching the criteria.
	*/
	async count(query) {
		return this.fetch(`/assistants/count`, {
			method: "POST",
			json: {
				metadata: query?.metadata ?? void 0,
				graph_id: query?.graphId ?? void 0
			}
		});
	}
	/**
	* List all versions of an assistant.
	*
	* @param assistantId ID of the assistant.
	* @returns List of assistant versions.
	*/
	async getVersions(assistantId, payload) {
		return this.fetch(`/assistants/${assistantId}/versions`, {
			method: "POST",
			json: {
				metadata: payload?.metadata ?? void 0,
				limit: payload?.limit ?? 10,
				offset: payload?.offset ?? 0
			}
		});
	}
	/**
	* Change the version of an assistant.
	*
	* @param assistantId ID of the assistant.
	* @param version The version to change to.
	* @returns The updated assistant.
	*/
	async setLatest(assistantId, version) {
		return this.fetch(`/assistants/${assistantId}/latest`, {
			method: "POST",
			json: { version }
		});
	}
};
var ThreadsClient = class extends BaseClient {
	/**
	* Get a thread by ID.
	*
	* @param threadId ID of the thread.
	* @returns The thread.
	*/
	async get(threadId) {
		return this.fetch(`/threads/${threadId}`);
	}
	/**
	* Create a new thread.
	*
	* @param payload Payload for creating a thread.
	* @returns The created thread.
	*/
	async create(payload) {
		const ttlPayload = typeof payload?.ttl === "number" ? {
			ttl: payload.ttl,
			strategy: "delete"
		} : payload?.ttl;
		return this.fetch(`/threads`, {
			method: "POST",
			json: {
				metadata: {
					...payload?.metadata,
					graph_id: payload?.graphId
				},
				thread_id: payload?.threadId,
				if_exists: payload?.ifExists,
				supersteps: payload?.supersteps?.map((s) => ({ updates: s.updates.map((u) => ({
					values: u.values,
					command: u.command,
					as_node: u.asNode
				})) })),
				ttl: ttlPayload
			}
		});
	}
	/**
	* Copy an existing thread
	* @param threadId ID of the thread to be copied
	* @returns Newly copied thread
	*/
	async copy(threadId) {
		return this.fetch(`/threads/${threadId}/copy`, { method: "POST" });
	}
	/**
	* Update a thread.
	*
	* @param threadId ID of the thread.
	* @param payload Payload for updating the thread.
	* @returns The updated thread.
	*/
	async update(threadId, payload) {
		const ttlPayload = typeof payload?.ttl === "number" ? {
			ttl: payload.ttl,
			strategy: "delete"
		} : payload?.ttl;
		return this.fetch(`/threads/${threadId}`, {
			method: "PATCH",
			json: {
				metadata: payload?.metadata,
				ttl: ttlPayload
			}
		});
	}
	/**
	* Delete a thread.
	*
	* @param threadId ID of the thread.
	*/
	async delete(threadId) {
		return this.fetch(`/threads/${threadId}`, { method: "DELETE" });
	}
	/**
	* List threads
	*
	* @param query Query options
	* @returns List of threads
	*/
	async search(query) {
		return this.fetch("/threads/search", {
			method: "POST",
			json: {
				metadata: query?.metadata ?? void 0,
				ids: query?.ids ?? void 0,
				limit: query?.limit ?? 10,
				offset: query?.offset ?? 0,
				status: query?.status,
				sort_by: query?.sortBy,
				sort_order: query?.sortOrder,
				select: query?.select ?? void 0,
				values: query?.values ?? void 0
			}
		});
	}
	/**
	* Count threads matching filters.
	*
	* @param query.metadata Thread metadata to filter on.
	* @param query.values State values to filter on.
	* @param query.status Thread status to filter on.
	* @returns Number of threads matching the criteria.
	*/
	async count(query) {
		return this.fetch(`/threads/count`, {
			method: "POST",
			json: {
				metadata: query?.metadata ?? void 0,
				values: query?.values ?? void 0,
				status: query?.status ?? void 0
			}
		});
	}
	/**
	* Get state for a thread.
	*
	* @param threadId ID of the thread.
	* @returns Thread state.
	*/
	async getState(threadId, checkpoint, options) {
		if (checkpoint != null) {
			if (typeof checkpoint !== "string") return this.fetch(`/threads/${threadId}/state/checkpoint`, {
				method: "POST",
				json: {
					checkpoint,
					subgraphs: options?.subgraphs
				}
			});
			return this.fetch(`/threads/${threadId}/state/${checkpoint}`, { params: { subgraphs: options?.subgraphs } });
		}
		return this.fetch(`/threads/${threadId}/state`, { params: { subgraphs: options?.subgraphs } });
	}
	/**
	* Add state to a thread.
	*
	* @param threadId The ID of the thread.
	* @returns
	*/
	async updateState(threadId, options) {
		return this.fetch(`/threads/${threadId}/state`, {
			method: "POST",
			json: {
				values: options.values,
				checkpoint_id: options.checkpointId,
				checkpoint: options.checkpoint,
				as_node: options?.asNode
			}
		});
	}
	/**
	* Patch the metadata of a thread.
	*
	* @param threadIdOrConfig Thread ID or config to patch the state of.
	* @param metadata Metadata to patch the state with.
	*/
	async patchState(threadIdOrConfig, metadata) {
		let threadId;
		if (typeof threadIdOrConfig !== "string") {
			if (typeof threadIdOrConfig.configurable?.thread_id !== "string") throw new Error("Thread ID is required when updating state with a config.");
			threadId = threadIdOrConfig.configurable.thread_id;
		} else threadId = threadIdOrConfig;
		return this.fetch(`/threads/${threadId}/state`, {
			method: "PATCH",
			json: { metadata }
		});
	}
	/**
	* Get all past states for a thread.
	*
	* @param threadId ID of the thread.
	* @param options Additional options.
	* @returns List of thread states.
	*/
	async getHistory(threadId, options) {
		return this.fetch(`/threads/${threadId}/history`, {
			method: "POST",
			json: {
				limit: options?.limit ?? 10,
				before: options?.before,
				metadata: options?.metadata,
				checkpoint: options?.checkpoint
			}
		});
	}
	async *joinStream(threadId, options) {
		let [url, init] = this.prepareFetchOptions(`/threads/${threadId}/stream`, {
			method: "GET",
			headers: options?.lastEventId ? { "Last-Event-ID": options.lastEventId } : void 0,
			params: options?.streamMode ? { stream_mode: options.streamMode } : void 0
		});
		if (this.onRequest != null) init = await this.onRequest(url, init);
		const response = await this.asyncCaller.fetch(url, init);
		const stream = (response.body || new ReadableStream({ start: (ctrl) => ctrl.close() })).pipeThrough(require_sse.BytesLineDecoder()).pipeThrough(require_sse.SSEDecoder());
		yield* require_stream.IterableReadableStream.fromReadableStream(stream);
	}
};
var RunsClient = class extends BaseClient {
	/**
	* Create a run and stream the results.
	*
	* @param threadId The ID of the thread.
	* @param assistantId Assistant ID to use for this run.
	* @param payload Payload for creating a run.
	*/
	async *stream(threadId, assistantId, payload) {
		const json = {
			input: payload?.input,
			command: payload?.command,
			config: payload?.config,
			context: payload?.context,
			metadata: payload?.metadata,
			stream_mode: payload?.streamMode,
			stream_subgraphs: payload?.streamSubgraphs,
			stream_resumable: payload?.streamResumable,
			feedback_keys: payload?.feedbackKeys,
			assistant_id: assistantId,
			interrupt_before: payload?.interruptBefore,
			interrupt_after: payload?.interruptAfter,
			checkpoint: payload?.checkpoint,
			checkpoint_id: payload?.checkpointId,
			webhook: payload?.webhook,
			multitask_strategy: payload?.multitaskStrategy,
			on_completion: payload?.onCompletion,
			on_disconnect: payload?.onDisconnect,
			after_seconds: payload?.afterSeconds,
			if_not_exists: payload?.ifNotExists,
			checkpoint_during: payload?.checkpointDuring,
			durability: payload?.durability
		};
		const endpoint = threadId == null ? `/runs/stream` : `/threads/${threadId}/runs/stream`;
		let [url, init] = this.prepareFetchOptions(endpoint, {
			method: "POST",
			json,
			timeoutMs: null,
			signal: payload?.signal
		});
		if (this.onRequest != null) init = await this.onRequest(url, init);
		const response = await this.asyncCaller.fetch(url, init);
		const runMetadata = getRunMetadataFromResponse(response);
		if (runMetadata) payload?.onRunCreated?.(runMetadata);
		const stream = (response.body || new ReadableStream({ start: (ctrl) => ctrl.close() })).pipeThrough(require_sse.BytesLineDecoder()).pipeThrough(require_sse.SSEDecoder());
		yield* require_stream.IterableReadableStream.fromReadableStream(stream);
	}
	/**
	* Create a run.
	*
	* @param threadId The ID of the thread.
	* @param assistantId Assistant ID to use for this run.
	* @param payload Payload for creating a run.
	* @returns The created run.
	*/
	async create(threadId, assistantId, payload) {
		const json = {
			input: payload?.input,
			command: payload?.command,
			config: payload?.config,
			context: payload?.context,
			metadata: payload?.metadata,
			stream_mode: payload?.streamMode,
			stream_subgraphs: payload?.streamSubgraphs,
			stream_resumable: payload?.streamResumable,
			assistant_id: assistantId,
			interrupt_before: payload?.interruptBefore,
			interrupt_after: payload?.interruptAfter,
			webhook: payload?.webhook,
			checkpoint: payload?.checkpoint,
			checkpoint_id: payload?.checkpointId,
			multitask_strategy: payload?.multitaskStrategy,
			after_seconds: payload?.afterSeconds,
			if_not_exists: payload?.ifNotExists,
			checkpoint_during: payload?.checkpointDuring,
			durability: payload?.durability,
			langsmith_tracer: payload?._langsmithTracer ? {
				project_name: payload?._langsmithTracer?.projectName,
				example_id: payload?._langsmithTracer?.exampleId
			} : void 0
		};
		const endpoint = threadId === null ? "/runs" : `/threads/${threadId}/runs`;
		const [run, response] = await this.fetch(endpoint, {
			method: "POST",
			json,
			signal: payload?.signal,
			withResponse: true
		});
		const runMetadata = getRunMetadataFromResponse(response);
		if (runMetadata) payload?.onRunCreated?.(runMetadata);
		return run;
	}
	/**
	* Create a batch of stateless background runs.
	*
	* @param payloads An array of payloads for creating runs.
	* @returns An array of created runs.
	*/
	async createBatch(payloads) {
		const filteredPayloads = payloads.map((payload) => ({
			...payload,
			assistant_id: payload.assistantId
		})).map((payload) => {
			return Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== void 0));
		});
		return this.fetch("/runs/batch", {
			method: "POST",
			json: filteredPayloads
		});
	}
	/**
	* Create a run and wait for it to complete.
	*
	* @param threadId The ID of the thread.
	* @param assistantId Assistant ID to use for this run.
	* @param payload Payload for creating a run.
	* @returns The last values chunk of the thread.
	*/
	async wait(threadId, assistantId, payload) {
		const json = {
			input: payload?.input,
			command: payload?.command,
			config: payload?.config,
			context: payload?.context,
			metadata: payload?.metadata,
			assistant_id: assistantId,
			interrupt_before: payload?.interruptBefore,
			interrupt_after: payload?.interruptAfter,
			checkpoint: payload?.checkpoint,
			checkpoint_id: payload?.checkpointId,
			webhook: payload?.webhook,
			multitask_strategy: payload?.multitaskStrategy,
			on_completion: payload?.onCompletion,
			on_disconnect: payload?.onDisconnect,
			after_seconds: payload?.afterSeconds,
			if_not_exists: payload?.ifNotExists,
			checkpoint_during: payload?.checkpointDuring,
			durability: payload?.durability,
			langsmith_tracer: payload?._langsmithTracer ? {
				project_name: payload?._langsmithTracer?.projectName,
				example_id: payload?._langsmithTracer?.exampleId
			} : void 0
		};
		const endpoint = threadId == null ? `/runs/wait` : `/threads/${threadId}/runs/wait`;
		const [run, response] = await this.fetch(endpoint, {
			method: "POST",
			json,
			timeoutMs: null,
			signal: payload?.signal,
			withResponse: true
		});
		const runMetadata = getRunMetadataFromResponse(response);
		if (runMetadata) payload?.onRunCreated?.(runMetadata);
		const raiseError = payload?.raiseError !== void 0 ? payload.raiseError : true;
		if (raiseError && "__error__" in run && typeof run.__error__ === "object" && run.__error__ && "error" in run.__error__ && "message" in run.__error__) throw new Error(`${run.__error__?.error}: ${run.__error__?.message}`);
		return run;
	}
	/**
	* List all runs for a thread.
	*
	* @param threadId The ID of the thread.
	* @param options Filtering and pagination options.
	* @returns List of runs.
	*/
	async list(threadId, options) {
		return this.fetch(`/threads/${threadId}/runs`, { params: {
			limit: options?.limit ?? 10,
			offset: options?.offset ?? 0,
			status: options?.status ?? void 0,
			select: options?.select ?? void 0
		} });
	}
	/**
	* Get a run by ID.
	*
	* @param threadId The ID of the thread.
	* @param runId The ID of the run.
	* @returns The run.
	*/
	async get(threadId, runId) {
		return this.fetch(`/threads/${threadId}/runs/${runId}`);
	}
	/**
	* Cancel a run.
	*
	* @param threadId The ID of the thread.
	* @param runId The ID of the run.
	* @param wait Whether to block when canceling
	* @param action Action to take when cancelling the run. Possible values are `interrupt` or `rollback`. Default is `interrupt`.
	* @returns
	*/
	async cancel(threadId, runId, wait = false, action = "interrupt") {
		return this.fetch(`/threads/${threadId}/runs/${runId}/cancel`, {
			method: "POST",
			params: {
				wait: wait ? "1" : "0",
				action
			}
		});
	}
	/**
	* Block until a run is done.
	*
	* @param threadId The ID of the thread.
	* @param runId The ID of the run.
	* @returns
	*/
	async join(threadId, runId, options) {
		return this.fetch(`/threads/${threadId}/runs/${runId}/join`, {
			timeoutMs: null,
			signal: options?.signal
		});
	}
	/**
	* Stream output from a run in real-time, until the run is done.
	*
	* @param threadId The ID of the thread. Can be set to `null` | `undefined` for stateless runs.
	* @param runId The ID of the run.
	* @param options Additional options for controlling the stream behavior:
	*   - signal: An AbortSignal that can be used to cancel the stream request
	*   - lastEventId: The ID of the last event received. Can be used to reconnect to a stream without losing events.
	*   - cancelOnDisconnect: When true, automatically cancels the run if the client disconnects from the stream
	*   - streamMode: Controls what types of events to receive from the stream (can be a single mode or array of modes)
	*        Must be a subset of the stream modes passed when creating the run. Background runs default to having the union of all
	*        stream modes enabled.
	* @returns An async generator yielding stream parts.
	*/
	async *joinStream(threadId, runId, options) {
		const opts = typeof options === "object" && options != null && options instanceof AbortSignal ? { signal: options } : options;
		let [url, init] = this.prepareFetchOptions(threadId != null ? `/threads/${threadId}/runs/${runId}/stream` : `/runs/${runId}/stream`, {
			method: "GET",
			timeoutMs: null,
			signal: opts?.signal,
			headers: opts?.lastEventId ? { "Last-Event-ID": opts.lastEventId } : void 0,
			params: {
				cancel_on_disconnect: opts?.cancelOnDisconnect ? "1" : "0",
				stream_mode: opts?.streamMode
			}
		});
		if (this.onRequest != null) init = await this.onRequest(url, init);
		const response = await this.asyncCaller.fetch(url, init);
		const stream = (response.body || new ReadableStream({ start: (ctrl) => ctrl.close() })).pipeThrough(require_sse.BytesLineDecoder()).pipeThrough(require_sse.SSEDecoder());
		yield* require_stream.IterableReadableStream.fromReadableStream(stream);
	}
	/**
	* Delete a run.
	*
	* @param threadId The ID of the thread.
	* @param runId The ID of the run.
	* @returns
	*/
	async delete(threadId, runId) {
		return this.fetch(`/threads/${threadId}/runs/${runId}`, { method: "DELETE" });
	}
};
var StoreClient = class extends BaseClient {
	/**
	* Store or update an item.
	*
	* @param namespace A list of strings representing the namespace path.
	* @param key The unique identifier for the item within the namespace.
	* @param value A dictionary containing the item's data.
	* @param options.index Controls search indexing - null (use defaults), false (disable), or list of field paths to index.
	* @param options.ttl Optional time-to-live in minutes for the item, or null for no expiration.
	* @returns Promise<void>
	*
	* @example
	* ```typescript
	* await client.store.putItem(
	*   ["documents", "user123"],
	*   "item456",
	*   { title: "My Document", content: "Hello World" },
	*   { ttl: 60 } // expires in 60 minutes
	* );
	* ```
	*/
	async putItem(namespace, key, value, options) {
		namespace.forEach((label) => {
			if (label.includes(".")) throw new Error(`Invalid namespace label '${label}'. Namespace labels cannot contain periods ('.')`);
		});
		const payload = {
			namespace,
			key,
			value,
			index: options?.index,
			ttl: options?.ttl
		};
		return this.fetch("/store/items", {
			method: "PUT",
			json: payload
		});
	}
	/**
	* Retrieve a single item.
	*
	* @param namespace A list of strings representing the namespace path.
	* @param key The unique identifier for the item.
	* @param options.refreshTtl Whether to refresh the TTL on this read operation. If null, uses the store's default behavior.
	* @returns Promise<Item>
	*
	* @example
	* ```typescript
	* const item = await client.store.getItem(
	*   ["documents", "user123"],
	*   "item456",
	*   { refreshTtl: true }
	* );
	* console.log(item);
	* // {
	* //   namespace: ["documents", "user123"],
	* //   key: "item456",
	* //   value: { title: "My Document", content: "Hello World" },
	* //   createdAt: "2024-07-30T12:00:00Z",
	* //   updatedAt: "2024-07-30T12:00:00Z"
	* // }
	* ```
	*/
	async getItem(namespace, key, options) {
		namespace.forEach((label) => {
			if (label.includes(".")) throw new Error(`Invalid namespace label '${label}'. Namespace labels cannot contain periods ('.')`);
		});
		const params = {
			namespace: namespace.join("."),
			key
		};
		if (options?.refreshTtl !== void 0) params.refresh_ttl = options.refreshTtl;
		const response = await this.fetch("/store/items", { params });
		return response ? {
			...response,
			createdAt: response.created_at,
			updatedAt: response.updated_at
		} : null;
	}
	/**
	* Delete an item.
	*
	* @param namespace A list of strings representing the namespace path.
	* @param key The unique identifier for the item.
	* @returns Promise<void>
	*/
	async deleteItem(namespace, key) {
		namespace.forEach((label) => {
			if (label.includes(".")) throw new Error(`Invalid namespace label '${label}'. Namespace labels cannot contain periods ('.')`);
		});
		return this.fetch("/store/items", {
			method: "DELETE",
			json: {
				namespace,
				key
			}
		});
	}
	/**
	* Search for items within a namespace prefix.
	*
	* @param namespacePrefix List of strings representing the namespace prefix.
	* @param options.filter Optional dictionary of key-value pairs to filter results.
	* @param options.limit Maximum number of items to return (default is 10).
	* @param options.offset Number of items to skip before returning results (default is 0).
	* @param options.query Optional search query.
	* @param options.refreshTtl Whether to refresh the TTL on items returned by this search. If null, uses the store's default behavior.
	* @returns Promise<SearchItemsResponse>
	*
	* @example
	* ```typescript
	* const results = await client.store.searchItems(
	*   ["documents"],
	*   {
	*     filter: { author: "John Doe" },
	*     limit: 5,
	*     refreshTtl: true
	*   }
	* );
	* console.log(results);
	* // {
	* //   items: [
	* //     {
	* //       namespace: ["documents", "user123"],
	* //       key: "item789",
	* //       value: { title: "Another Document", author: "John Doe" },
	* //       createdAt: "2024-07-30T12:00:00Z",
	* //       updatedAt: "2024-07-30T12:00:00Z"
	* //     },
	* //     // ... additional items ...
	* //   ]
	* // }
	* ```
	*/
	async searchItems(namespacePrefix, options) {
		const payload = {
			namespace_prefix: namespacePrefix,
			filter: options?.filter,
			limit: options?.limit ?? 10,
			offset: options?.offset ?? 0,
			query: options?.query,
			refresh_ttl: options?.refreshTtl
		};
		const response = await this.fetch("/store/items/search", {
			method: "POST",
			json: payload
		});
		return { items: response.items.map((item) => ({
			...item,
			createdAt: item.created_at,
			updatedAt: item.updated_at
		})) };
	}
	/**
	* List namespaces with optional match conditions.
	*
	* @param options.prefix Optional list of strings representing the prefix to filter namespaces.
	* @param options.suffix Optional list of strings representing the suffix to filter namespaces.
	* @param options.maxDepth Optional integer specifying the maximum depth of namespaces to return.
	* @param options.limit Maximum number of namespaces to return (default is 100).
	* @param options.offset Number of namespaces to skip before returning results (default is 0).
	* @returns Promise<ListNamespaceResponse>
	*/
	async listNamespaces(options) {
		const payload = {
			prefix: options?.prefix,
			suffix: options?.suffix,
			max_depth: options?.maxDepth,
			limit: options?.limit ?? 100,
			offset: options?.offset ?? 0
		};
		return this.fetch("/store/namespaces", {
			method: "POST",
			json: payload
		});
	}
};
var UiClient = class UiClient extends BaseClient {
	static promiseCache = {};
	static getOrCached(key, fn) {
		if (UiClient.promiseCache[key] != null) return UiClient.promiseCache[key];
		const promise = fn();
		UiClient.promiseCache[key] = promise;
		return promise;
	}
	async getComponent(assistantId, agentName) {
		return UiClient.getOrCached(`${this.apiUrl}-${assistantId}-${agentName}`, async () => {
			let [url, init] = this.prepareFetchOptions(`/ui/${assistantId}`, {
				headers: {
					Accept: "text/html",
					"Content-Type": "application/json"
				},
				method: "POST",
				json: { name: agentName }
			});
			if (this.onRequest != null) init = await this.onRequest(url, init);
			const response = await this.asyncCaller.fetch(url, init);
			return response.text();
		});
	}
};
var Client = class {
	/**
	* The client for interacting with assistants.
	*/
	assistants;
	/**
	* The client for interacting with threads.
	*/
	threads;
	/**
	* The client for interacting with runs.
	*/
	runs;
	/**
	* The client for interacting with cron runs.
	*/
	crons;
	/**
	* The client for interacting with the KV store.
	*/
	store;
	/**
	* The client for interacting with the UI.
	* @internal Used by LoadExternalComponent and the API might change in the future.
	*/
	"~ui";
	/**
	* @internal Used to obtain a stable key representing the client.
	*/
	"~configHash";
	constructor(config) {
		this["~configHash"] = (() => JSON.stringify({
			apiUrl: config?.apiUrl,
			apiKey: config?.apiKey,
			timeoutMs: config?.timeoutMs,
			defaultHeaders: config?.defaultHeaders,
			maxConcurrency: config?.callerOptions?.maxConcurrency,
			maxRetries: config?.callerOptions?.maxRetries,
			callbacks: {
				onFailedResponseHook: config?.callerOptions?.onFailedResponseHook != null,
				onRequest: config?.onRequest != null,
				fetch: config?.callerOptions?.fetch != null
			}
		}))();
		this.assistants = new AssistantsClient(config);
		this.threads = new ThreadsClient(config);
		this.runs = new RunsClient(config);
		this.crons = new CronsClient(config);
		this.store = new StoreClient(config);
		this["~ui"] = new UiClient(config);
	}
};
/**
* @internal Used to obtain a stable key representing the client.
*/
function getClientConfigHash(client) {
	return client["~configHash"];
}

//#endregion
exports.AssistantsClient = AssistantsClient;
exports.Client = Client;
exports.CronsClient = CronsClient;
exports.RunsClient = RunsClient;
exports.StoreClient = StoreClient;
exports.ThreadsClient = ThreadsClient;
exports.getApiKey = getApiKey;
exports.getClientConfigHash = getClientConfigHash;
//# sourceMappingURL=client.cjs.map