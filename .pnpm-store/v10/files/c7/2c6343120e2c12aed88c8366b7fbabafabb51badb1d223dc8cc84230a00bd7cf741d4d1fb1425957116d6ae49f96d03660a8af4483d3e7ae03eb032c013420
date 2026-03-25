import { Client } from "./client.js";
import { Attachments, BaseRun, KVMap, RunCreate } from "./schemas.js";
export declare function convertToDottedOrderFormat(epoch: number, runId: string, executionOrder?: number): {
    dottedOrder: string;
    microsecondPrecisionDatestring: string;
};
export interface RunTreeConfig {
    name: string;
    run_type?: string;
    id?: string;
    project_name?: string;
    parent_run?: RunTree;
    parent_run_id?: string;
    child_runs?: RunTree[];
    start_time?: number | string;
    end_time?: number | string;
    extra?: KVMap;
    metadata?: KVMap;
    tags?: string[];
    error?: string;
    serialized?: object;
    inputs?: KVMap;
    outputs?: KVMap;
    reference_example_id?: string;
    client?: Client;
    tracingEnabled?: boolean;
    on_end?: (runTree: RunTree) => void;
    execution_order?: number;
    child_execution_order?: number;
    trace_id?: string;
    dotted_order?: string;
    attachments?: Attachments;
    replicas?: Replica[];
    distributedParentId?: string;
}
export interface RunnableConfigLike {
    /**
     * Tags for this call and any sub-calls (eg. a Chain calling an LLM).
     * You can use these to filter calls.
     */
    tags?: string[];
    /**
     * Metadata for this call and any sub-calls (eg. a Chain calling an LLM).
     * Keys should be strings, values should be JSON-serializable.
     */
    metadata?: Record<string, unknown>;
    /**
     * Callbacks for this call and any sub-calls (eg. a Chain calling an LLM).
     * Tags are passed to all callbacks, metadata is passed to handle*Start callbacks.
     */
    callbacks?: Record<string, any> | any[];
}
interface HeadersLike {
    get(name: string): string | null;
    set(name: string, value: string): void;
}
type ProjectReplica = [string, KVMap | undefined];
type WriteReplica = {
    apiUrl?: string;
    apiKey?: string;
    workspaceId?: string;
    projectName?: string;
    updates?: KVMap | undefined;
    fromEnv?: boolean;
    reroot?: boolean;
};
type Replica = ProjectReplica | WriteReplica;
export declare class RunTree implements BaseRun {
    private static sharedClient;
    id: string;
    name: RunTreeConfig["name"];
    run_type: string;
    project_name: string;
    parent_run?: RunTree;
    parent_run_id?: string;
    child_runs: RunTree[];
    start_time: number;
    end_time?: number;
    extra: KVMap;
    tags?: string[];
    error?: string;
    serialized: object;
    inputs: KVMap;
    outputs?: KVMap;
    reference_example_id?: string;
    client: Client;
    events?: KVMap[] | undefined;
    trace_id: string;
    dotted_order: string;
    tracingEnabled?: boolean;
    execution_order: number;
    child_execution_order: number;
    /**
     * Attachments associated with the run.
     * Each entry is a tuple of [mime_type, bytes]
     */
    attachments?: Attachments;
    /**
     * Projects to replicate this run to with optional updates.
     */
    replicas?: WriteReplica[];
    distributedParentId?: string;
    /**
     * @interface
     */
    private _serialized_start_time;
    constructor(originalConfig: RunTreeConfig | RunTree);
    set metadata(metadata: KVMap);
    get metadata(): KVMap;
    private static getDefaultConfig;
    static getSharedClient(): Client;
    createChild(config: RunTreeConfig): RunTree;
    end(outputs?: KVMap, error?: string, endTime?: number, metadata?: KVMap): Promise<void>;
    private _convertToCreate;
    private _sliceParentId;
    private _setReplicaTraceRoot;
    private _remapForProject;
    postRun(excludeChildRuns?: boolean): Promise<void>;
    patchRun(options?: {
        excludeInputs?: boolean;
    }): Promise<void>;
    toJSON(): RunCreate & {
        id: string;
    };
    /**
     * Add an event to the run tree.
     * @param event - A single event or string to add
     */
    addEvent(event: RunEvent | string): void;
    static fromRunnableConfig(parentConfig: RunnableConfigLike, props: RunTreeConfig): RunTree;
    static fromDottedOrder(dottedOrder: string): RunTree | undefined;
    static fromHeaders(headers: Record<string, string | string[]> | HeadersLike, inheritArgs?: Partial<RunTreeConfig>): RunTree | undefined;
    toHeaders(headers?: HeadersLike): {
        "langsmith-trace": string;
        baggage: string;
    };
}
export declare function isRunTree(x?: unknown): x is RunTree;
export interface RunEvent {
    name?: string;
    time?: string;
    message?: string;
    kwargs?: Record<string, unknown>;
    [key: string]: unknown;
}
export declare function isRunnableConfigLike(x?: unknown): x is RunnableConfigLike;
export {};
