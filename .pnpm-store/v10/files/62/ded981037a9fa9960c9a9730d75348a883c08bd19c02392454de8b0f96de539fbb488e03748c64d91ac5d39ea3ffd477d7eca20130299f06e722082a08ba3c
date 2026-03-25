const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_env = require('./utils/env.cjs');
const require_warn = require('./utils/warn.cjs');
const require_error = require('./utils/error.cjs');
const require_client = require('./client.cjs');
const require_env$1 = require('./env.cjs');
const require_constants = require('./singletons/constants.cjs');
const require_project = require('./utils/project.cjs');
const uuid = require_rolldown_runtime.__toESM(require("uuid"));

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/run_trees.js
function stripNonAlphanumeric(input) {
	return input.replace(/[-:.]/g, "");
}
function convertToDottedOrderFormat(epoch, runId, executionOrder = 1) {
	const paddedOrder = executionOrder.toFixed(0).slice(0, 3).padStart(3, "0");
	const microsecondPrecisionDatestring = `${new Date(epoch).toISOString().slice(0, -1)}${paddedOrder}Z`;
	return {
		dottedOrder: stripNonAlphanumeric(microsecondPrecisionDatestring) + runId,
		microsecondPrecisionDatestring
	};
}
/**
* Baggage header information
*/
var Baggage = class Baggage {
	constructor(metadata, tags, project_name, replicas) {
		Object.defineProperty(this, "metadata", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "tags", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "project_name", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "replicas", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		this.metadata = metadata;
		this.tags = tags;
		this.project_name = project_name;
		this.replicas = replicas;
	}
	static fromHeader(value) {
		const items = value.split(",");
		let metadata = {};
		let tags = [];
		let project_name;
		let replicas;
		for (const item of items) {
			const [key, uriValue] = item.split("=");
			const value$1 = decodeURIComponent(uriValue);
			if (key === "langsmith-metadata") metadata = JSON.parse(value$1);
			else if (key === "langsmith-tags") tags = value$1.split(",");
			else if (key === "langsmith-project") project_name = value$1;
			else if (key === "langsmith-replicas") replicas = JSON.parse(value$1);
		}
		return new Baggage(metadata, tags, project_name, replicas);
	}
	toHeader() {
		const items = [];
		if (this.metadata && Object.keys(this.metadata).length > 0) items.push(`langsmith-metadata=${encodeURIComponent(JSON.stringify(this.metadata))}`);
		if (this.tags && this.tags.length > 0) items.push(`langsmith-tags=${encodeURIComponent(this.tags.join(","))}`);
		if (this.project_name) items.push(`langsmith-project=${encodeURIComponent(this.project_name)}`);
		return items.join(",");
	}
};
var RunTree = class RunTree {
	constructor(originalConfig) {
		Object.defineProperty(this, "id", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "name", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "run_type", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "project_name", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "parent_run", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "parent_run_id", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "child_runs", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "start_time", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "end_time", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "extra", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "tags", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "error", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "serialized", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "inputs", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "outputs", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "reference_example_id", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "client", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "events", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "trace_id", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "dotted_order", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "tracingEnabled", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "execution_order", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "child_execution_order", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		/**
		* Attachments associated with the run.
		* Each entry is a tuple of [mime_type, bytes]
		*/
		Object.defineProperty(this, "attachments", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		/**
		* Projects to replicate this run to with optional updates.
		*/
		Object.defineProperty(this, "replicas", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "_serialized_start_time", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		if (isRunTree(originalConfig)) {
			Object.assign(this, { ...originalConfig });
			return;
		}
		const defaultConfig = RunTree.getDefaultConfig();
		const { metadata,...config } = originalConfig;
		const client = config.client ?? RunTree.getSharedClient();
		const dedupedMetadata = {
			...metadata,
			...config?.extra?.metadata
		};
		config.extra = {
			...config.extra,
			metadata: dedupedMetadata
		};
		Object.assign(this, {
			...defaultConfig,
			...config,
			client
		});
		if (!this.trace_id) if (this.parent_run) this.trace_id = this.parent_run.trace_id ?? this.id;
		else this.trace_id = this.id;
		this.replicas = _ensureWriteReplicas(this.replicas);
		this.execution_order ??= 1;
		this.child_execution_order ??= 1;
		if (!this.dotted_order) {
			const { dottedOrder, microsecondPrecisionDatestring } = convertToDottedOrderFormat(this.start_time, this.id, this.execution_order);
			if (this.parent_run) this.dotted_order = this.parent_run.dotted_order + "." + dottedOrder;
			else this.dotted_order = dottedOrder;
			this._serialized_start_time = microsecondPrecisionDatestring;
		}
	}
	set metadata(metadata) {
		this.extra = {
			...this.extra,
			metadata: {
				...this.extra?.metadata,
				...metadata
			}
		};
	}
	get metadata() {
		return this.extra?.metadata;
	}
	static getDefaultConfig() {
		return {
			id: uuid.v4(),
			run_type: "chain",
			project_name: require_project.getDefaultProjectName(),
			child_runs: [],
			api_url: require_env.getEnvironmentVariable("LANGCHAIN_ENDPOINT") ?? "http://localhost:1984",
			api_key: require_env.getEnvironmentVariable("LANGCHAIN_API_KEY"),
			caller_options: {},
			start_time: Date.now(),
			serialized: {},
			inputs: {},
			extra: {}
		};
	}
	static getSharedClient() {
		if (!RunTree.sharedClient) RunTree.sharedClient = new require_client.Client();
		return RunTree.sharedClient;
	}
	createChild(config) {
		const child_execution_order = this.child_execution_order + 1;
		const child = new RunTree({
			...config,
			parent_run: this,
			project_name: this.project_name,
			replicas: this.replicas,
			client: this.client,
			tracingEnabled: this.tracingEnabled,
			execution_order: child_execution_order,
			child_execution_order
		});
		if (require_constants._LC_CONTEXT_VARIABLES_KEY in this) child[require_constants._LC_CONTEXT_VARIABLES_KEY] = this[require_constants._LC_CONTEXT_VARIABLES_KEY];
		const LC_CHILD = Symbol.for("lc:child_config");
		const presentConfig = config.extra?.[LC_CHILD] ?? this.extra[LC_CHILD];
		if (isRunnableConfigLike(presentConfig)) {
			const newConfig = { ...presentConfig };
			const callbacks = isCallbackManagerLike(newConfig.callbacks) ? newConfig.callbacks.copy?.() : void 0;
			if (callbacks) {
				Object.assign(callbacks, { _parentRunId: child.id });
				callbacks.handlers?.find(isLangChainTracerLike)?.updateFromRunTree?.(child);
				newConfig.callbacks = callbacks;
			}
			child.extra[LC_CHILD] = newConfig;
		}
		const visited = /* @__PURE__ */ new Set();
		let current = this;
		while (current != null && !visited.has(current.id)) {
			visited.add(current.id);
			current.child_execution_order = Math.max(current.child_execution_order, child_execution_order);
			current = current.parent_run;
		}
		this.child_runs.push(child);
		return child;
	}
	async end(outputs, error, endTime = Date.now(), metadata) {
		this.outputs = this.outputs ?? outputs;
		this.error = this.error ?? error;
		this.end_time = this.end_time ?? endTime;
		if (metadata && Object.keys(metadata).length > 0) this.extra = this.extra ? {
			...this.extra,
			metadata: {
				...this.extra.metadata,
				...metadata
			}
		} : { metadata };
	}
	_convertToCreate(run, runtimeEnv, excludeChildRuns = true) {
		const runExtra = run.extra ?? {};
		if (runExtra?.runtime?.library === void 0) {
			if (!runExtra.runtime) runExtra.runtime = {};
			if (runtimeEnv) {
				for (const [k, v] of Object.entries(runtimeEnv)) if (!runExtra.runtime[k]) runExtra.runtime[k] = v;
			}
		}
		let child_runs;
		let parent_run_id;
		if (!excludeChildRuns) {
			child_runs = run.child_runs.map((child_run) => this._convertToCreate(child_run, runtimeEnv, excludeChildRuns));
			parent_run_id = void 0;
		} else {
			parent_run_id = run.parent_run?.id ?? run.parent_run_id;
			child_runs = [];
		}
		return {
			id: run.id,
			name: run.name,
			start_time: run._serialized_start_time ?? run.start_time,
			end_time: run.end_time,
			run_type: run.run_type,
			reference_example_id: run.reference_example_id,
			extra: runExtra,
			serialized: run.serialized,
			error: run.error,
			inputs: run.inputs,
			outputs: run.outputs,
			session_name: run.project_name,
			child_runs,
			parent_run_id,
			trace_id: run.trace_id,
			dotted_order: run.dotted_order,
			tags: run.tags,
			attachments: run.attachments,
			events: run.events
		};
	}
	_remapForProject(projectName, runtimeEnv, excludeChildRuns = true) {
		const baseRun = this._convertToCreate(this, runtimeEnv, excludeChildRuns);
		if (projectName === this.project_name) return baseRun;
		const createRemappedId = (originalId) => {
			return uuid.v5(`${originalId}:${projectName}`, uuid.v5.DNS);
		};
		const newId = createRemappedId(baseRun.id);
		const newTraceId = baseRun.trace_id ? createRemappedId(baseRun.trace_id) : void 0;
		const newParentRunId = baseRun.parent_run_id ? createRemappedId(baseRun.parent_run_id) : void 0;
		let newDottedOrder;
		if (baseRun.dotted_order) {
			const segments = _parseDottedOrder(baseRun.dotted_order);
			const rebuilt = [];
			for (let i = 0; i < segments.length - 1; i++) {
				const [timestamp, segmentId] = segments[i];
				const remappedId = createRemappedId(segmentId);
				rebuilt.push(timestamp.toISOString().replace(/[-:]/g, "").replace(".", "") + remappedId);
			}
			const [lastTimestamp] = segments[segments.length - 1];
			rebuilt.push(lastTimestamp.toISOString().replace(/[-:]/g, "").replace(".", "") + newId);
			newDottedOrder = rebuilt.join(".");
		} else newDottedOrder = void 0;
		const remappedRun = {
			...baseRun,
			id: newId,
			trace_id: newTraceId,
			parent_run_id: newParentRunId,
			dotted_order: newDottedOrder,
			session_name: projectName
		};
		return remappedRun;
	}
	async postRun(excludeChildRuns = true) {
		try {
			const runtimeEnv = require_env.getRuntimeEnvironment();
			if (this.replicas && this.replicas.length > 0) for (const { projectName, apiKey, apiUrl, workspaceId } of this.replicas) {
				const runCreate = this._remapForProject(projectName ?? this.project_name, runtimeEnv, true);
				await this.client.createRun(runCreate, {
					apiKey,
					apiUrl,
					workspaceId
				});
			}
			else {
				const runCreate = this._convertToCreate(this, runtimeEnv, excludeChildRuns);
				await this.client.createRun(runCreate);
			}
			if (!excludeChildRuns) {
				require_warn.warnOnce("Posting with excludeChildRuns=false is deprecated and will be removed in a future version.");
				for (const childRun of this.child_runs) await childRun.postRun(false);
			}
		} catch (error) {
			console.error(`Error in postRun for run ${this.id}:`, error);
		}
	}
	async patchRun(options) {
		if (this.replicas && this.replicas.length > 0) for (const { projectName, apiKey, apiUrl, workspaceId, updates } of this.replicas) {
			const runData = this._remapForProject(projectName ?? this.project_name);
			const updatePayload = {
				id: runData.id,
				outputs: runData.outputs,
				error: runData.error,
				parent_run_id: runData.parent_run_id,
				session_name: runData.session_name,
				reference_example_id: runData.reference_example_id,
				end_time: runData.end_time,
				dotted_order: runData.dotted_order,
				trace_id: runData.trace_id,
				events: runData.events,
				tags: runData.tags,
				extra: runData.extra,
				attachments: this.attachments,
				...updates
			};
			if (!options?.excludeInputs) updatePayload.inputs = runData.inputs;
			await this.client.updateRun(runData.id, updatePayload, {
				apiKey,
				apiUrl,
				workspaceId
			});
		}
		else try {
			const runUpdate = {
				end_time: this.end_time,
				error: this.error,
				outputs: this.outputs,
				parent_run_id: this.parent_run?.id ?? this.parent_run_id,
				reference_example_id: this.reference_example_id,
				extra: this.extra,
				events: this.events,
				dotted_order: this.dotted_order,
				trace_id: this.trace_id,
				tags: this.tags,
				attachments: this.attachments,
				session_name: this.project_name
			};
			if (!options?.excludeInputs) runUpdate.inputs = this.inputs;
			await this.client.updateRun(this.id, runUpdate);
		} catch (error) {
			console.error(`Error in patchRun for run ${this.id}`, error);
		}
	}
	toJSON() {
		return this._convertToCreate(this, void 0, false);
	}
	/**
	* Add an event to the run tree.
	* @param event - A single event or string to add
	*/
	addEvent(event) {
		if (!this.events) this.events = [];
		if (typeof event === "string") this.events.push({
			name: "event",
			time: (/* @__PURE__ */ new Date()).toISOString(),
			message: event
		});
		else this.events.push({
			...event,
			time: event.time ?? (/* @__PURE__ */ new Date()).toISOString()
		});
	}
	static fromRunnableConfig(parentConfig, props) {
		const callbackManager = parentConfig?.callbacks;
		let parentRun;
		let projectName;
		let client;
		let tracingEnabled = require_env$1.isTracingEnabled();
		if (callbackManager) {
			const parentRunId = callbackManager?.getParentRunId?.() ?? "";
			const langChainTracer = callbackManager?.handlers?.find((handler) => handler?.name == "langchain_tracer");
			parentRun = langChainTracer?.getRun?.(parentRunId);
			projectName = langChainTracer?.projectName;
			client = langChainTracer?.client;
			tracingEnabled = tracingEnabled || !!langChainTracer;
		}
		if (!parentRun) return new RunTree({
			...props,
			client,
			tracingEnabled,
			project_name: projectName
		});
		const parentRunTree = new RunTree({
			name: parentRun.name,
			id: parentRun.id,
			trace_id: parentRun.trace_id,
			dotted_order: parentRun.dotted_order,
			client,
			tracingEnabled,
			project_name: projectName,
			tags: [...new Set((parentRun?.tags ?? []).concat(parentConfig?.tags ?? []))],
			extra: { metadata: {
				...parentRun?.extra?.metadata,
				...parentConfig?.metadata
			} }
		});
		return parentRunTree.createChild(props);
	}
	static fromDottedOrder(dottedOrder) {
		return this.fromHeaders({ "langsmith-trace": dottedOrder });
	}
	static fromHeaders(headers, inheritArgs) {
		const rawHeaders = "get" in headers && typeof headers.get === "function" ? {
			"langsmith-trace": headers.get("langsmith-trace"),
			baggage: headers.get("baggage")
		} : headers;
		const headerTrace = rawHeaders["langsmith-trace"];
		if (!headerTrace || typeof headerTrace !== "string") return void 0;
		const parentDottedOrder = headerTrace.trim();
		const parsedDottedOrder = parentDottedOrder.split(".").map((part) => {
			const [strTime, uuid$1] = part.split("Z");
			return {
				strTime,
				time: Date.parse(strTime + "Z"),
				uuid: uuid$1
			};
		});
		const traceId = parsedDottedOrder[0].uuid;
		const config = {
			...inheritArgs,
			name: inheritArgs?.["name"] ?? "parent",
			run_type: inheritArgs?.["run_type"] ?? "chain",
			start_time: inheritArgs?.["start_time"] ?? Date.now(),
			id: parsedDottedOrder.at(-1)?.uuid,
			trace_id: traceId,
			dotted_order: parentDottedOrder
		};
		if (rawHeaders["baggage"] && typeof rawHeaders["baggage"] === "string") {
			const baggage = Baggage.fromHeader(rawHeaders["baggage"]);
			config.metadata = baggage.metadata;
			config.tags = baggage.tags;
			config.project_name = baggage.project_name;
			config.replicas = baggage.replicas;
		}
		return new RunTree(config);
	}
	toHeaders(headers) {
		const result = {
			"langsmith-trace": this.dotted_order,
			baggage: new Baggage(this.extra?.metadata, this.tags, this.project_name, this.replicas).toHeader()
		};
		if (headers) for (const [key, value] of Object.entries(result)) headers.set(key, value);
		return result;
	}
};
Object.defineProperty(RunTree, "sharedClient", {
	enumerable: true,
	configurable: true,
	writable: true,
	value: null
});
function isRunTree(x) {
	return x != null && typeof x.createChild === "function" && typeof x.postRun === "function";
}
function isLangChainTracerLike(x) {
	return typeof x === "object" && x != null && typeof x.name === "string" && x.name === "langchain_tracer";
}
function containsLangChainTracerLike(x) {
	return Array.isArray(x) && x.some((callback) => isLangChainTracerLike(callback));
}
function isCallbackManagerLike(x) {
	return typeof x === "object" && x != null && Array.isArray(x.handlers);
}
function isRunnableConfigLike(x) {
	return x != null && typeof x.callbacks === "object" && (containsLangChainTracerLike(x.callbacks?.handlers) || containsLangChainTracerLike(x.callbacks));
}
function _parseDottedOrder(dottedOrder) {
	const parts = dottedOrder.split(".");
	return parts.map((part) => {
		const timestampStr = part.slice(0, -36);
		const uuidStr = part.slice(-36);
		const year = parseInt(timestampStr.slice(0, 4));
		const month = parseInt(timestampStr.slice(4, 6)) - 1;
		const day = parseInt(timestampStr.slice(6, 8));
		const hour = parseInt(timestampStr.slice(9, 11));
		const minute = parseInt(timestampStr.slice(11, 13));
		const second = parseInt(timestampStr.slice(13, 15));
		const microsecond = parseInt(timestampStr.slice(15, 21));
		const timestamp = new Date(year, month, day, hour, minute, second, microsecond / 1e3);
		return [timestamp, uuidStr];
	});
}
function _getWriteReplicasFromEnv() {
	const envVar = require_env.getEnvironmentVariable("LANGSMITH_RUNS_ENDPOINTS");
	if (!envVar) return [];
	try {
		const parsed = JSON.parse(envVar);
		if (Array.isArray(parsed)) {
			const replicas = [];
			for (const item of parsed) {
				if (typeof item !== "object" || item === null) {
					console.warn(`Invalid item type in LANGSMITH_RUNS_ENDPOINTS: expected object, got ${typeof item}`);
					continue;
				}
				if (typeof item.api_url !== "string") {
					console.warn(`Invalid api_url type in LANGSMITH_RUNS_ENDPOINTS: expected string, got ${typeof item.api_url}`);
					continue;
				}
				if (typeof item.api_key !== "string") {
					console.warn(`Invalid api_key type in LANGSMITH_RUNS_ENDPOINTS: expected string, got ${typeof item.api_key}`);
					continue;
				}
				replicas.push({
					apiUrl: item.api_url.replace(/\/$/, ""),
					apiKey: item.api_key
				});
			}
			return replicas;
		} else if (typeof parsed === "object" && parsed !== null) {
			_checkEndpointEnvUnset(parsed);
			const replicas = [];
			for (const [url, key] of Object.entries(parsed)) {
				const cleanUrl = url.replace(/\/$/, "");
				if (typeof key === "string") replicas.push({
					apiUrl: cleanUrl,
					apiKey: key
				});
				else {
					console.warn(`Invalid value type in LANGSMITH_RUNS_ENDPOINTS for URL ${url}: expected string, got ${typeof key}`);
					continue;
				}
			}
			return replicas;
		} else {
			console.warn(`Invalid LANGSMITH_RUNS_ENDPOINTS – must be valid JSON array of objects with api_url and api_key properties, or object mapping url->apiKey, got ${typeof parsed}`);
			return [];
		}
	} catch (e) {
		if (require_error.isConflictingEndpointsError(e)) throw e;
		console.warn("Invalid LANGSMITH_RUNS_ENDPOINTS – must be valid JSON array of objects with api_url and api_key properties, or object mapping url->apiKey");
		return [];
	}
}
function _ensureWriteReplicas(replicas) {
	if (replicas) return replicas.map((replica) => {
		if (Array.isArray(replica)) return {
			projectName: replica[0],
			updates: replica[1]
		};
		return replica;
	});
	return _getWriteReplicasFromEnv();
}
function _checkEndpointEnvUnset(parsed) {
	if (Object.keys(parsed).length > 0 && require_env.getLangSmithEnvironmentVariable("ENDPOINT")) throw new require_error.ConflictingEndpointsError();
}

//#endregion
exports.RunTree = RunTree;
//# sourceMappingURL=run_trees.cjs.map