import { Client } from "./client.js";
import { isTracingEnabled } from "./env.js";
import { isConflictingEndpointsError, ConflictingEndpointsError, } from "./utils/error.js";
import { _LC_CONTEXT_VARIABLES_KEY, _REPLICA_TRACE_ROOTS_KEY, } from "./singletons/constants.js";
import { getContextVar, setContextVar } from "./utils/context_vars.js";
import { getEnvironmentVariable, getRuntimeEnvironment, } from "./utils/env.js";
import { getDefaultProjectName } from "./utils/project.js";
import { getLangSmithEnvironmentVariable } from "./utils/env.js";
import { warnOnce } from "./utils/warn.js";
import { uuid7FromTime, nonCryptographicUuid7Deterministic, } from "./utils/_uuid.js";
import { v5 as uuidv5 } from "uuid";
const TIMESTAMP_LENGTH = 36;
// DNS namespace for UUID v5 (same as Python's uuid.NAMESPACE_DNS)
const UUID_NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
function getReplicaKey(replica) {
    // Generate a unique key by hashing the replica's identifying properties
    // This ensures each unique replica (combination of projectName, apiUrl, workspaceId, apiKey) gets a unique key
    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(replica).sort();
    const keyData = sortedKeys
        .map((key) => `${key}:${replica[key] ?? ""}`)
        .join("|");
    return uuidv5(keyData, UUID_NAMESPACE_DNS);
}
function stripNonAlphanumeric(input) {
    return input.replace(/[-:.]/g, "");
}
function getMicrosecondPrecisionDatestring(epoch, executionOrder = 1) {
    // Date only has millisecond precision, so we use the microseconds to break
    // possible ties, avoiding incorrect run order
    const paddedOrder = executionOrder.toFixed(0).slice(0, 3).padStart(3, "0");
    return `${new Date(epoch).toISOString().slice(0, -1)}${paddedOrder}Z`;
}
export function convertToDottedOrderFormat(epoch, runId, executionOrder = 1) {
    const microsecondPrecisionDatestring = getMicrosecondPrecisionDatestring(epoch, executionOrder);
    return {
        dottedOrder: stripNonAlphanumeric(microsecondPrecisionDatestring) + runId,
        microsecondPrecisionDatestring,
    };
}
const HEADER_SAFE_REPLICA_FIELDS = new Set([
    "projectName",
    "updates",
    "reroot",
]);
function filterReplicaForHeaders(replica) {
    const filtered = {};
    for (const key of Object.keys(replica)) {
        if (HEADER_SAFE_REPLICA_FIELDS.has(key)) {
            filtered[key] = replica[key];
        }
    }
    return filtered;
}
/**
 * Baggage header information
 */
class Baggage {
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
            const value = decodeURIComponent(uriValue);
            if (key === "langsmith-metadata") {
                metadata = JSON.parse(value);
            }
            else if (key === "langsmith-tags") {
                tags = value.split(",");
            }
            else if (key === "langsmith-project") {
                project_name = value;
            }
            else if (key === "langsmith-replicas") {
                const parsed = JSON.parse(value);
                replicas = parsed.map((replica) => {
                    if (Array.isArray(replica)) {
                        return replica;
                    }
                    return filterReplicaForHeaders(replica);
                });
            }
        }
        return new Baggage(metadata, tags, project_name, replicas);
    }
    toHeader() {
        const items = [];
        if (this.metadata && Object.keys(this.metadata).length > 0) {
            items.push(`langsmith-metadata=${encodeURIComponent(JSON.stringify(this.metadata))}`);
        }
        if (this.tags && this.tags.length > 0) {
            items.push(`langsmith-tags=${encodeURIComponent(this.tags.join(","))}`);
        }
        if (this.project_name) {
            items.push(`langsmith-project=${encodeURIComponent(this.project_name)}`);
        }
        return items.join(",");
    }
}
export class RunTree {
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
        Object.defineProperty(this, "distributedParentId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * @interface
         */
        Object.defineProperty(this, "_serialized_start_time", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * @internal
         */
        Object.defineProperty(this, "_awaitInputsOnPost", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // If you pass in a run tree directly, return a shallow clone
        if (isRunTree(originalConfig)) {
            Object.assign(this, { ...originalConfig });
            return;
        }
        const defaultConfig = RunTree.getDefaultConfig();
        const { metadata, ...config } = originalConfig;
        const client = config.client ?? RunTree.getSharedClient();
        const dedupedMetadata = {
            ...metadata,
            ...config?.extra?.metadata,
        };
        config.extra = { ...config.extra, metadata: dedupedMetadata };
        if ("id" in config && config.id == null) {
            delete config.id;
        }
        Object.assign(this, { ...defaultConfig, ...config, client });
        this.execution_order ??= 1;
        this.child_execution_order ??= 1;
        // Generate serialized start time for ID generation
        if (!this.dotted_order) {
            this._serialized_start_time = getMicrosecondPrecisionDatestring(this.start_time, this.execution_order);
        }
        // Generate id from serialized start_time if not provided
        if (!this.id) {
            this.id = uuid7FromTime(this._serialized_start_time ?? this.start_time);
        }
        if (!this.trace_id) {
            if (this.parent_run) {
                this.trace_id = this.parent_run.trace_id ?? this.id;
            }
            else {
                this.trace_id = this.id;
            }
        }
        this.replicas = _ensureWriteReplicas(this.replicas);
        // Now set the dotted order with the actual ID
        if (!this.dotted_order) {
            const { dottedOrder } = convertToDottedOrderFormat(this.start_time, this.id, this.execution_order);
            if (this.parent_run) {
                this.dotted_order = this.parent_run.dotted_order + "." + dottedOrder;
            }
            else {
                this.dotted_order = dottedOrder;
            }
        }
    }
    set metadata(metadata) {
        this.extra = {
            ...this.extra,
            metadata: {
                ...this.extra?.metadata,
                ...metadata,
            },
        };
    }
    get metadata() {
        return this.extra?.metadata;
    }
    static getDefaultConfig() {
        const start_time = Date.now();
        return {
            run_type: "chain",
            project_name: getDefaultProjectName(),
            child_runs: [],
            api_url: getEnvironmentVariable("LANGCHAIN_ENDPOINT") ?? "http://localhost:1984",
            api_key: getEnvironmentVariable("LANGCHAIN_API_KEY"),
            caller_options: {},
            start_time,
            serialized: {},
            inputs: {},
            extra: {},
        };
    }
    static getSharedClient() {
        if (!RunTree.sharedClient) {
            RunTree.sharedClient = new Client();
        }
        return RunTree.sharedClient;
    }
    createChild(config) {
        const child_execution_order = this.child_execution_order + 1;
        // Handle replicas: if child has its own replicas, use those; otherwise inherit parent's (with reroot stripped)
        // Reroot should only apply to the run where it's explicitly configured, not propagate down
        const inheritedReplicas = this.replicas?.map((replica) => {
            const { reroot, ...rest } = replica;
            return rest;
        });
        const childReplicas = config.replicas ?? inheritedReplicas;
        const child = new RunTree({
            ...config,
            parent_run: this,
            project_name: this.project_name,
            replicas: childReplicas,
            client: this.client,
            tracingEnabled: this.tracingEnabled,
            execution_order: child_execution_order,
            child_execution_order: child_execution_order,
        });
        // Copy context vars over into the new run tree.
        if (_LC_CONTEXT_VARIABLES_KEY in this) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            child[_LC_CONTEXT_VARIABLES_KEY] =
                this[_LC_CONTEXT_VARIABLES_KEY];
        }
        const LC_CHILD = Symbol.for("lc:child_config");
        const presentConfig = config.extra?.[LC_CHILD] ??
            this.extra[LC_CHILD];
        // tracing for LangChain is defined by the _parentRunId and runMap of the tracer
        if (isRunnableConfigLike(presentConfig)) {
            const newConfig = { ...presentConfig };
            const callbacks = isCallbackManagerLike(newConfig.callbacks)
                ? newConfig.callbacks.copy?.()
                : undefined;
            if (callbacks) {
                // update the parent run id
                Object.assign(callbacks, { _parentRunId: child.id });
                // only populate if we're in a newer LC.JS version
                callbacks.handlers
                    ?.find(isLangChainTracerLike)
                    ?.updateFromRunTree?.(child);
                newConfig.callbacks = callbacks;
            }
            child.extra[LC_CHILD] = newConfig;
        }
        // propagate child_execution_order upwards
        const visited = new Set();
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
        if (metadata && Object.keys(metadata).length > 0) {
            this.extra = this.extra
                ? { ...this.extra, metadata: { ...this.extra.metadata, ...metadata } }
                : { metadata };
        }
    }
    _convertToCreate(run, runtimeEnv, excludeChildRuns = true) {
        const runExtra = run.extra ?? {};
        // Avoid overwriting the runtime environment if it's already set
        if (runExtra?.runtime?.library === undefined) {
            if (!runExtra.runtime) {
                runExtra.runtime = {};
            }
            if (runtimeEnv) {
                for (const [k, v] of Object.entries(runtimeEnv)) {
                    if (!runExtra.runtime[k]) {
                        runExtra.runtime[k] = v;
                    }
                }
            }
        }
        let child_runs;
        let parent_run_id;
        if (!excludeChildRuns) {
            child_runs = run.child_runs.map((child_run) => this._convertToCreate(child_run, runtimeEnv, excludeChildRuns));
            parent_run_id = undefined;
        }
        else {
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
            child_runs: child_runs,
            parent_run_id: parent_run_id,
            trace_id: run.trace_id,
            dotted_order: run.dotted_order,
            tags: run.tags,
            attachments: run.attachments,
            events: run.events,
        };
    }
    _sliceParentId(parentId, run) {
        /**
         * Slice the parent id from dotted order.
         * Additionally check if the current run is a child of the parent. If so, update
         * the parent_run_id to undefined, and set the trace id to the new root id after
         * parent_id.
         */
        if (run.dotted_order) {
            const segs = run.dotted_order.split(".");
            let startIdx = null;
            // Find the index of the parent ID in the dotted order
            for (let idx = 0; idx < segs.length; idx++) {
                const segId = segs[idx].slice(-TIMESTAMP_LENGTH);
                if (segId === parentId) {
                    startIdx = idx;
                    break;
                }
            }
            if (startIdx !== null) {
                // Trim segments to start after parent_id (exclusive)
                const trimmedSegs = segs.slice(startIdx + 1);
                // Rebuild dotted_order
                run.dotted_order = trimmedSegs.join(".");
                if (trimmedSegs.length > 0) {
                    run.trace_id = trimmedSegs[0].slice(-TIMESTAMP_LENGTH);
                }
                else {
                    run.trace_id = run.id;
                }
            }
        }
        if (run.parent_run_id === parentId) {
            // We've found the new root node.
            run.parent_run_id = undefined;
        }
    }
    _setReplicaTraceRoot(replicaKey, traceRootId) {
        // Set the replica trace root in context vars on this run and all descendants
        const replicaTraceRoots = getContextVar(this, _REPLICA_TRACE_ROOTS_KEY) ?? {};
        replicaTraceRoots[replicaKey] = traceRootId;
        setContextVar(this, _REPLICA_TRACE_ROOTS_KEY, replicaTraceRoots);
        // Recursively update all descendants to avoid race conditions
        // around run tree creation vs processing time
        for (const child of this.child_runs) {
            child._setReplicaTraceRoot(replicaKey, traceRootId);
        }
    }
    _remapForProject(params) {
        const { projectName, runtimeEnv, excludeChildRuns = true, reroot = false, distributedParentId, apiUrl, apiKey, workspaceId, } = params;
        const baseRun = this._convertToCreate(this, runtimeEnv, excludeChildRuns);
        // Skip remapping if project name is the same
        if (projectName === this.project_name) {
            return {
                ...baseRun,
                session_name: projectName,
            };
        }
        // Apply reroot logic before ID remapping
        if (reroot) {
            if (distributedParentId) {
                // If we have a distributed parent ID, slice at that point
                this._sliceParentId(distributedParentId, baseRun);
            }
            else {
                // If no distributed parent ID, simply make this run a root run
                // by removing parent_run_id and resetting trace info
                baseRun.parent_run_id = undefined;
                // Keep the current run as the trace root
                if (baseRun.dotted_order) {
                    // Reset dotted order to just this run
                    const segs = baseRun.dotted_order.split(".");
                    if (segs.length > 0) {
                        baseRun.dotted_order = segs[segs.length - 1];
                        baseRun.trace_id = baseRun.id;
                    }
                }
            }
            // Store this run's original ID in context vars so descendants know the new trace root
            // We store the original ID (before remapping) so it can be found in dotted_order
            const replicaKey = getReplicaKey({
                projectName,
                apiUrl,
                apiKey,
                workspaceId,
            });
            this._setReplicaTraceRoot(replicaKey, baseRun.id);
        }
        // If an ancestor was rerooted for this replica, update trace_id and dotted_order
        // to reflect the new trace hierarchy. This is tracked via context variables.
        let ancestorRerootedTraceId;
        if (!reroot) {
            const replicaTraceRoots = getContextVar(this, _REPLICA_TRACE_ROOTS_KEY) ?? {};
            const replicaKey = getReplicaKey({
                projectName,
                apiUrl,
                apiKey,
                workspaceId,
            });
            ancestorRerootedTraceId = replicaTraceRoots[replicaKey];
            if (ancestorRerootedTraceId) {
                // An ancestor was rerooted for this replica, so set our trace_id
                // to the ancestor's original (unmapped) ID. It will be remapped along with other IDs.
                baseRun.trace_id = ancestorRerootedTraceId;
                // Also slice the dotted_order to start from the new trace root
                // This ensures descendants of a rerooted ancestor have correct hierarchy
                if (baseRun.dotted_order) {
                    const segs = baseRun.dotted_order.split(".");
                    let rootIdx = null;
                    // Find the new trace root's segment in dotted_order
                    for (let idx = 0; idx < segs.length; idx++) {
                        const segId = segs[idx].slice(-TIMESTAMP_LENGTH);
                        if (segId === ancestorRerootedTraceId) {
                            rootIdx = idx;
                            break;
                        }
                    }
                    if (rootIdx !== null) {
                        // Keep segments from new trace root onwards
                        const trimmedSegs = segs.slice(rootIdx);
                        baseRun.dotted_order = trimmedSegs.join(".");
                    }
                }
            }
        }
        // Remap IDs for the replica using nonCryptographicUuid7Deterministic
        // This ensures consistency across runs in the same replica while
        // preserving UUID7 properties (time-ordering, monotonicity)
        const oldId = baseRun.id;
        const newId = nonCryptographicUuid7Deterministic(oldId, projectName);
        // Remap trace_id
        let newTraceId;
        if (baseRun.trace_id) {
            newTraceId = nonCryptographicUuid7Deterministic(baseRun.trace_id, projectName);
        }
        else {
            newTraceId = newId;
        }
        // Remap parent_run_id
        let newParentId;
        if (baseRun.parent_run_id) {
            newParentId = nonCryptographicUuid7Deterministic(baseRun.parent_run_id, projectName);
        }
        // Remap dotted_order segments
        let newDottedOrder;
        if (baseRun.dotted_order) {
            const segs = baseRun.dotted_order.split(".");
            const remappedSegs = segs.map((seg) => {
                // Extract the UUID from the segment (last TIMESTAMP_LENGTH characters)
                const segId = seg.slice(-TIMESTAMP_LENGTH);
                const remappedId = nonCryptographicUuid7Deterministic(segId, projectName);
                // Replace the UUID part while keeping the timestamp prefix
                return seg.slice(0, -TIMESTAMP_LENGTH) + remappedId;
            });
            newDottedOrder = remappedSegs.join(".");
        }
        return {
            ...baseRun,
            id: newId,
            trace_id: newTraceId,
            parent_run_id: newParentId,
            dotted_order: newDottedOrder,
            session_name: projectName,
        };
    }
    async postRun(excludeChildRuns = true) {
        // Applies when `processInputs` is an async function
        if (this._awaitInputsOnPost) {
            this.inputs = await this.inputs;
        }
        try {
            const runtimeEnv = getRuntimeEnvironment();
            if (this.replicas && this.replicas.length > 0) {
                for (const { projectName, apiKey, apiUrl, workspaceId, reroot } of this
                    .replicas) {
                    const runCreate = this._remapForProject({
                        projectName: projectName ?? this.project_name,
                        runtimeEnv,
                        excludeChildRuns: true,
                        reroot,
                        distributedParentId: this.distributedParentId,
                        apiUrl,
                        apiKey,
                        workspaceId,
                    });
                    await this.client.createRun(runCreate, {
                        apiKey,
                        apiUrl,
                        workspaceId,
                    });
                }
            }
            else {
                const runCreate = this._convertToCreate(this, runtimeEnv, excludeChildRuns);
                await this.client.createRun(runCreate);
            }
            if (!excludeChildRuns) {
                warnOnce("Posting with excludeChildRuns=false is deprecated and will be removed in a future version.");
                for (const childRun of this.child_runs) {
                    await childRun.postRun(false);
                }
            }
            this.child_runs = [];
        }
        catch (error) {
            console.error(`Error in postRun for run ${this.id}:`, error);
        }
    }
    async patchRun(options) {
        if (this.replicas && this.replicas.length > 0) {
            for (const { projectName, apiKey, apiUrl, workspaceId, updates, reroot, } of this.replicas) {
                const runData = this._remapForProject({
                    projectName: projectName ?? this.project_name,
                    runtimeEnv: undefined,
                    excludeChildRuns: true,
                    reroot,
                    distributedParentId: this.distributedParentId,
                    apiUrl,
                    apiKey,
                    workspaceId,
                });
                const updatePayload = {
                    id: runData.id,
                    name: runData.name,
                    run_type: runData.run_type,
                    start_time: runData.start_time,
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
                    ...updates,
                };
                // Important that inputs is not a key in the run update
                // if excluded because it will overwrite the run create if the
                // two operations are merged during batching
                if (!options?.excludeInputs) {
                    updatePayload.inputs = runData.inputs;
                }
                await this.client.updateRun(runData.id, updatePayload, {
                    apiKey,
                    apiUrl,
                    workspaceId,
                });
            }
        }
        else {
            try {
                const runUpdate = {
                    name: this.name,
                    run_type: this.run_type,
                    start_time: this._serialized_start_time ?? this.start_time,
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
                    session_name: this.project_name,
                };
                // Important that inputs is not a key in the run update
                // if excluded because it will overwrite the run create if the
                // two operations are merged during batching
                if (!options?.excludeInputs) {
                    runUpdate.inputs = this.inputs;
                }
                await this.client.updateRun(this.id, runUpdate);
            }
            catch (error) {
                console.error(`Error in patchRun for run ${this.id}`, error);
            }
        }
        this.child_runs = [];
    }
    toJSON() {
        return this._convertToCreate(this, undefined, false);
    }
    /**
     * Add an event to the run tree.
     * @param event - A single event or string to add
     */
    addEvent(event) {
        if (!this.events) {
            this.events = [];
        }
        if (typeof event === "string") {
            this.events.push({
                name: "event",
                time: new Date().toISOString(),
                message: event,
            });
        }
        else {
            this.events.push({
                ...event,
                time: event.time ?? new Date().toISOString(),
            });
        }
    }
    static fromRunnableConfig(parentConfig, props) {
        // We only handle the callback manager case for now
        const callbackManager = parentConfig?.callbacks;
        let parentRun;
        let projectName;
        let client;
        let tracingEnabled = isTracingEnabled();
        if (callbackManager) {
            const parentRunId = callbackManager?.getParentRunId?.() ?? "";
            const langChainTracer = callbackManager?.handlers?.find((handler) => handler?.name == "langchain_tracer");
            parentRun = langChainTracer?.getRun?.(parentRunId);
            projectName = langChainTracer?.projectName;
            client = langChainTracer?.client;
            tracingEnabled = tracingEnabled || !!langChainTracer;
        }
        if (!parentRun) {
            return new RunTree({
                ...props,
                client,
                tracingEnabled,
                project_name: projectName,
            });
        }
        const parentRunTree = new RunTree({
            name: parentRun.name,
            id: parentRun.id,
            trace_id: parentRun.trace_id,
            dotted_order: parentRun.dotted_order,
            client,
            tracingEnabled,
            project_name: projectName,
            tags: [
                ...new Set((parentRun?.tags ?? []).concat(parentConfig?.tags ?? [])),
            ],
            extra: {
                metadata: {
                    ...parentRun?.extra?.metadata,
                    ...parentConfig?.metadata,
                },
            },
        });
        return parentRunTree.createChild(props);
    }
    static fromDottedOrder(dottedOrder) {
        return this.fromHeaders({ "langsmith-trace": dottedOrder });
    }
    static fromHeaders(headers, inheritArgs) {
        const rawHeaders = "get" in headers && typeof headers.get === "function"
            ? {
                "langsmith-trace": headers.get("langsmith-trace"),
                baggage: headers.get("baggage"),
            }
            : headers;
        const headerTrace = rawHeaders["langsmith-trace"];
        if (!headerTrace || typeof headerTrace !== "string")
            return undefined;
        const parentDottedOrder = headerTrace.trim();
        const parsedDottedOrder = parentDottedOrder.split(".").map((part) => {
            const [strTime, uuid] = part.split("Z");
            return { strTime, time: Date.parse(strTime + "Z"), uuid };
        });
        const traceId = parsedDottedOrder[0].uuid;
        const config = {
            ...inheritArgs,
            name: inheritArgs?.["name"] ?? "parent",
            run_type: inheritArgs?.["run_type"] ?? "chain",
            start_time: inheritArgs?.["start_time"] ?? Date.now(),
            id: parsedDottedOrder.at(-1)?.uuid,
            trace_id: traceId,
            dotted_order: parentDottedOrder,
        };
        if (rawHeaders["baggage"] && typeof rawHeaders["baggage"] === "string") {
            const baggage = Baggage.fromHeader(rawHeaders["baggage"]);
            config.metadata = baggage.metadata;
            config.tags = baggage.tags;
            config.project_name = baggage.project_name;
            config.replicas = baggage.replicas;
        }
        const runTree = new RunTree(config);
        // Set the distributed parent ID to this run's ID for rerooting
        runTree.distributedParentId = runTree.id;
        return runTree;
    }
    toHeaders(headers) {
        const result = {
            "langsmith-trace": this.dotted_order,
            baggage: new Baggage(this.extra?.metadata, this.tags, this.project_name, this.replicas).toHeader(),
        };
        if (headers) {
            for (const [key, value] of Object.entries(result)) {
                headers.set(key, value);
            }
        }
        return result;
    }
}
Object.defineProperty(RunTree, "sharedClient", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
export function isRunTree(x) {
    return (x != null &&
        typeof x.createChild === "function" &&
        typeof x.postRun === "function");
}
function isLangChainTracerLike(x) {
    return (typeof x === "object" &&
        x != null &&
        typeof x.name === "string" &&
        x.name === "langchain_tracer");
}
function containsLangChainTracerLike(x) {
    return (Array.isArray(x) && x.some((callback) => isLangChainTracerLike(callback)));
}
function isCallbackManagerLike(x) {
    return (typeof x === "object" &&
        x != null &&
        Array.isArray(x.handlers));
}
export function isRunnableConfigLike(x) {
    // Check that it's an object with a callbacks arg
    // that has either a CallbackManagerLike object with a langchain tracer within it
    // or an array with a LangChainTracerLike object within it
    const callbacks = x?.callbacks;
    return (x != null &&
        typeof callbacks === "object" &&
        // Callback manager with a langchain tracer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (containsLangChainTracerLike(callbacks?.handlers) ||
            // Or it's an array with a LangChainTracerLike object within it
            containsLangChainTracerLike(callbacks)));
}
function _getWriteReplicasFromEnv() {
    const envVar = getEnvironmentVariable("LANGSMITH_RUNS_ENDPOINTS");
    if (!envVar)
        return [];
    try {
        const parsed = JSON.parse(envVar);
        if (Array.isArray(parsed)) {
            const replicas = [];
            for (const item of parsed) {
                if (typeof item !== "object" || item === null) {
                    console.warn(`Invalid item type in LANGSMITH_RUNS_ENDPOINTS: ` +
                        `expected object, got ${typeof item}`);
                    continue;
                }
                if (typeof item.api_url !== "string") {
                    console.warn(`Invalid api_url type in LANGSMITH_RUNS_ENDPOINTS: ` +
                        `expected string, got ${typeof item.api_url}`);
                    continue;
                }
                if (typeof item.api_key !== "string") {
                    console.warn(`Invalid api_key type in LANGSMITH_RUNS_ENDPOINTS: ` +
                        `expected string, got ${typeof item.api_key}`);
                    continue;
                }
                replicas.push({
                    apiUrl: item.api_url.replace(/\/$/, ""),
                    apiKey: item.api_key,
                });
            }
            return replicas;
        }
        else if (typeof parsed === "object" && parsed !== null) {
            _checkEndpointEnvUnset(parsed);
            const replicas = [];
            for (const [url, key] of Object.entries(parsed)) {
                const cleanUrl = url.replace(/\/$/, "");
                if (typeof key === "string") {
                    replicas.push({
                        apiUrl: cleanUrl,
                        apiKey: key,
                    });
                }
                else {
                    console.warn(`Invalid value type in LANGSMITH_RUNS_ENDPOINTS for URL ${url}: ` +
                        `expected string, got ${typeof key}`);
                    continue;
                }
            }
            return replicas;
        }
        else {
            console.warn("Invalid LANGSMITH_RUNS_ENDPOINTS – must be valid JSON array of " +
                `objects with api_url and api_key properties, or object mapping url->apiKey, got ${typeof parsed}`);
            return [];
        }
    }
    catch (e) {
        if (isConflictingEndpointsError(e)) {
            throw e;
        }
        console.warn("Invalid LANGSMITH_RUNS_ENDPOINTS – must be valid JSON array of " +
            "objects with api_url and api_key properties, or object mapping url->apiKey");
        return [];
    }
}
function _ensureWriteReplicas(replicas) {
    // If null -> fetch from env
    if (replicas) {
        return replicas.map((replica) => {
            if (Array.isArray(replica)) {
                return {
                    projectName: replica[0],
                    updates: replica[1],
                };
            }
            return replica;
        });
    }
    return _getWriteReplicasFromEnv();
}
function _checkEndpointEnvUnset(parsed) {
    if (Object.keys(parsed).length > 0 &&
        getLangSmithEnvironmentVariable("ENDPOINT")) {
        throw new ConflictingEndpointsError();
    }
}
