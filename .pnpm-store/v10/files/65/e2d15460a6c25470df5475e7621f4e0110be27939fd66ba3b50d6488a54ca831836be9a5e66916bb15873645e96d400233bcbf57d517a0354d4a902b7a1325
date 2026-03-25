import type { OTELContext } from "./experimental/otel/types.js";
import { AsyncCallerParams } from "./utils/async_caller.js";
import { ComparativeExperiment, DataType, Dataset, DatasetDiffInfo, DatasetShareSchema, Example, ExampleCreate, ExampleUpdate, ExampleUpdateWithoutId, Feedback, FeedbackConfig, FeedbackIngestToken, KVMap, LangChainBaseMessage, LangSmithSettings, LikePromptResponse, Prompt, PromptCommit, PromptSortField, Run, RunCreate, RunUpdate, ScoreType, ExampleSearch, TimeDelta, TracerSession, TracerSessionResult, ValueType, AnnotationQueue, RunWithAnnotationQueueInfo, Attachments, UploadExamplesResponse, UpdateExamplesResponse, DatasetVersion, AnnotationQueueWithDetails } from "./schemas.js";
import { EvaluationResult, EvaluationResults } from "./evaluation/evaluator.js";
import { Cache } from "./utils/prompts_cache.js";
export interface ClientConfig {
    apiUrl?: string;
    apiKey?: string;
    callerOptions?: AsyncCallerParams;
    timeout_ms?: number;
    webUrl?: string;
    anonymizer?: (values: KVMap) => KVMap | Promise<KVMap>;
    hideInputs?: boolean | ((inputs: KVMap) => KVMap | Promise<KVMap>);
    hideOutputs?: boolean | ((outputs: KVMap) => KVMap | Promise<KVMap>);
    /**
     * Whether to omit runtime information from traced runs.
     * If true, runtime information (SDK version, platform, etc.) and
     * LangChain environment variable metadata will not be stored in runs.
     * Defaults to false.
     */
    omitTracedRuntimeInfo?: boolean;
    autoBatchTracing?: boolean;
    /** Maximum size of a batch of runs in bytes. */
    batchSizeBytesLimit?: number;
    /** Maximum number of operations to batch in a single request. */
    batchSizeLimit?: number;
    /**
     * Maximum total memory (in bytes) for both the AutoBatchQueue and batchIngestCaller queue.
     * When exceeded, runs/batches are dropped. Defaults to 1GB.
     */
    maxIngestMemoryBytes?: number;
    blockOnRootRunFinalization?: boolean;
    traceBatchConcurrency?: number;
    fetchOptions?: RequestInit;
    /**
     * Whether to require manual .flush() calls before sending traces.
     * Useful if encountering network rate limits at trace high volumes.
     */
    manualFlushMode?: boolean;
    tracingSamplingRate?: number;
    /**
     * Enable debug mode for the client. If set, all sent HTTP requests will be logged.
     */
    debug?: boolean;
    /**
     * The workspace ID. Required for org-scoped API keys.
     */
    workspaceId?: string;
    /**
     * Custom fetch implementation. Useful for testing.
     */
    fetchImplementation?: typeof fetch;
    /**
     * Configuration for caching. Can be:
     * - `true`: Enable caching with default settings
     * - `Cache` instance: Use custom cache configuration
     * - `undefined` or `false`: Disable caching (default)
     *
     * @example
     * ```typescript
     * import { Client, Cache } from "langsmith";
     *
     * // Enable with defaults
     * const client1 = new Client({ cache: true });
     *
     * // Or use custom configuration
     * const myCache = new Cache({
     *   maxSize: 100,
     *   ttlSeconds: 3600, // 1 hour, or null for infinite TTL
     * });
     * const client2 = new Client({ cache: myCache });
     * ```
     */
    cache?: Cache | boolean;
}
/**
 * Represents the parameters for listing runs (spans) from the Langsmith server.
 */
interface ListRunsParams {
    /**
     * The ID or IDs of the project(s) to filter by.
     */
    projectId?: string | string[];
    /**
     * The name or names of the project(s) to filter by.
     */
    projectName?: string | string[];
    /**
     * The ID of the trace to filter by.
     */
    traceId?: string;
    /**
     * isRoot - Whether to only include root runs.
     *  */
    isRoot?: boolean;
    /**
     * The execution order to filter by.
     */
    executionOrder?: number;
    /**
     * The ID of the parent run to filter by.
     */
    parentRunId?: string;
    /**
     * The order by run start date
     */
    order?: "asc" | "desc";
    /**
     * The ID of the reference example to filter by.
     */
    referenceExampleId?: string;
    /**
     * The start time to filter by.
     */
    startTime?: Date;
    /**
     * The run type to filter by.
     */
    runType?: string;
    /**
     * Indicates whether to filter by error runs.
     */
    error?: boolean;
    /**
     * The ID or IDs of the runs to filter by.
     */
    id?: string[];
    /**
     * The maximum number of runs to retrieve.
     */
    limit?: number;
    /**
     * The query string to filter by.
     */
    query?: string;
    /**
     * The filter string to apply.
     *
     * Run Filtering:
     * Listing runs with query params is useful for simple queries, but doesn't support many common needs, such as filtering by metadata, tags, or other fields.
     * LangSmith supports a filter query language to permit more complex filtering operations when fetching runs. This guide will provide a high level overview of the grammar as well as a few examples of when it can be useful.
     * If you'd prefer a more visual guide, you can get a taste of the language by viewing the table of runs on any of your projects' pages. We provide some recommended filters to get you started that you can copy and use the SDK.
     *
     * Grammar:
     * The filtering grammar is based on common comparators on fields in the run object. Supported comparators include:
     * - gte (greater than or equal to)
     * - gt (greater than)
     * - lte (less than or equal to)
     * - lt (less than)
     * - eq (equal to)
     * - neq (not equal to)
     * - has (check if run contains a tag or metadata json blob)
     * - search (search for a substring in a string field)
     */
    filter?: string;
    /**
     * Filter to apply to the ROOT run in the trace tree. This is meant to be used in conjunction with the regular
     *  `filter` parameter to let you filter runs by attributes of the root run within a trace. Example is filtering by
     * feedback assigned to the trace.
     */
    traceFilter?: string;
    /**
     * Filter to apply to OTHER runs in the trace tree, including sibling and child runs. This is meant to be used in
     * conjunction with the regular `filter` parameter to let you filter runs by attributes of any run within a trace.
     */
    treeFilter?: string;
    /**
     * The values to include in the response.
     *
     * Note: The 'child_run_ids' value is deprecated and will be removed in a future version.
     * This field is no longer populated by the API.
     */
    select?: string[];
}
interface GroupRunsParams {
    /**
     * The ID or IDs of the project(s) to filter by.
     */
    projectId?: string;
    /**
     * The ID or IDs of the project(s) to filter by.
     */
    projectName?: string;
    /**
     * @example "conversation"
     */
    groupBy: string;
    /**
     * The filter string to apply.
     *
     * Run Filtering:
     * Listing runs with query params is useful for simple queries, but doesn't support many common needs, such as filtering by metadata, tags, or other fields.
     * LangSmith supports a filter query language to permit more complex filtering operations when fetching runs. This guide will provide a high level overview of the grammar as well as a few examples of when it can be useful.
     * If you'd prefer a more visual guide, you can get a taste of the language by viewing the table of runs on any of your projects' pages. We provide some recommended filters to get you started that you can copy and use the SDK.
     *
     * Grammar:
     * The filtering grammar is based on common comparators on fields in the run object. Supported comparators include:
     * - gte (greater than or equal to)
     * - gt (greater than)
     * - lte (less than or equal to)
     * - lt (less than)
     * - eq (equal to)
     * - neq (not equal to)
     * - has (check if run contains a tag or metadata json blob)
     * - search (search for a substring in a string field)
     */
    filter?: string;
    /**
     * The start time to filter by.
     */
    startTime?: Date;
    /**
     * The end time to filter by.
     */
    endTime?: Date;
    /**
     * The maximum number of runs to retrieve.
     */
    limit?: number;
    /**
     * The maximum number of runs to retrieve.
     */
    offset?: number;
}
interface UploadCSVParams {
    csvFile: Blob;
    fileName: string;
    inputKeys: string[];
    outputKeys: string[];
    description?: string;
    dataType?: DataType;
    name?: string;
}
interface CreateRunParams {
    name: string;
    inputs: KVMap;
    run_type: string;
    id?: string;
    start_time?: number | string;
    end_time?: number | string;
    extra?: KVMap;
    error?: string;
    serialized?: object;
    outputs?: KVMap;
    reference_example_id?: string;
    child_runs?: RunCreate[];
    parent_run_id?: string;
    project_name?: string;
    revision_id?: string;
    trace_id?: string;
    dotted_order?: string;
    attachments?: Attachments;
}
interface ProjectOptions {
    projectName?: string;
    projectId?: string;
}
type RecordStringAny = Record<string, any>;
export type FeedbackSourceType = "model" | "api" | "app";
export type CreateExampleOptions = {
    /** The ID of the dataset to create the example in. */
    datasetId?: string;
    /** The name of the dataset to create the example in (if dataset ID is not provided). */
    datasetName?: string;
    /** The creation date of the example. */
    createdAt?: Date;
    /** A unique identifier for the example. */
    exampleId?: string;
    /** Additional metadata associated with the example. */
    metadata?: KVMap;
    /** The split(s) to assign the example to. */
    split?: string | string[];
    /** The ID of the source run associated with this example. */
    sourceRunId?: string;
    /** Whether to use the inputs and outputs from the source run. */
    useSourceRunIO?: boolean;
    /** Which attachments from the source run to use. */
    useSourceRunAttachments?: string[];
    /** Attachments for the example */
    attachments?: Attachments;
};
export type CreateProjectParams = {
    projectName: string;
    description?: string | null;
    metadata?: RecordStringAny | null;
    upsert?: boolean;
    projectExtra?: RecordStringAny | null;
    referenceDatasetId?: string | null;
};
type AutoBatchQueueItem = {
    action: "create" | "update";
    item: RunCreate | RunUpdate;
    otelContext?: OTELContext;
    apiKey?: string;
    apiUrl?: string;
    size?: number;
};
type Thread = {
    filter: string;
    count: number;
    total_tokens: number;
    total_cost: number | null;
    min_start_time: string;
    max_start_time: string;
    latency_p50: number;
    latency_p99: number;
    feedback_stats: any | null;
    group_key: string;
    first_inputs: string;
    last_outputs: string;
    last_error: string | null;
};
export declare function mergeRuntimeEnvIntoRun<T extends RunCreate | RunUpdate>(run: T, cachedEnvVars?: Record<string, string>, omitTracedRuntimeInfo?: boolean): T;
export declare const DEFAULT_UNCOMPRESSED_BATCH_SIZE_LIMIT_BYTES: number;
/** Default maximum memory (1GB) for queue size limits. */
export declare const DEFAULT_MAX_SIZE_BYTES: number;
export declare class AutoBatchQueue {
    items: {
        action: "create" | "update";
        payload: RunCreate | RunUpdate;
        otelContext?: OTELContext;
        itemPromiseResolve: () => void;
        itemPromise: Promise<void>;
        size: number;
        apiKey?: string;
        apiUrl?: string;
    }[];
    sizeBytes: number;
    private maxSizeBytes;
    constructor(maxSizeBytes?: number);
    peek(): {
        action: "create" | "update";
        payload: RunCreate | RunUpdate;
        otelContext?: OTELContext;
        itemPromiseResolve: () => void;
        itemPromise: Promise<void>;
        size: number;
        apiKey?: string;
        apiUrl?: string;
    };
    push(item: AutoBatchQueueItem): Promise<void>;
    pop({ upToSizeBytes, upToSize, }: {
        upToSizeBytes: number;
        upToSize: number;
    }): [AutoBatchQueueItem[], () => void];
}
export declare class Client implements LangSmithTracingClientInterface {
    private apiKey?;
    private apiUrl;
    private webUrl?;
    private workspaceId?;
    private caller;
    private batchIngestCaller;
    private timeout_ms;
    private _tenantId;
    private hideInputs?;
    private hideOutputs?;
    private omitTracedRuntimeInfo?;
    private tracingSampleRate?;
    private filteredPostUuids;
    private autoBatchTracing;
    private autoBatchQueue;
    private autoBatchTimeout;
    private autoBatchAggregationDelayMs;
    private batchSizeBytesLimit?;
    private batchSizeLimit?;
    private fetchOptions;
    private settings;
    private blockOnRootRunFinalization;
    private traceBatchConcurrency;
    private _serverInfo;
    private _getServerInfoPromise?;
    private manualFlushMode;
    private langSmithToOTELTranslator?;
    private fetchImplementation?;
    private cachedLSEnvVarsForMetadata?;
    private _cache?;
    private get _fetch();
    private multipartStreamingDisabled;
    private _multipartDisabled;
    private _runCompressionDisabled;
    debug: boolean;
    constructor(config?: ClientConfig);
    static getDefaultClientConfig(): {
        apiUrl: string;
        apiKey?: string;
        webUrl?: string;
        hideInputs?: boolean;
        hideOutputs?: boolean;
    };
    getHostUrl(): string;
    private get headers();
    private _getPlatformEndpointPath;
    private processInputs;
    private processOutputs;
    private prepareRunCreateOrUpdateInputs;
    private _getResponse;
    private _get;
    private _getPaginated;
    private _getCursorPaginatedList;
    private _shouldSample;
    private _filterForSampling;
    private _getBatchSizeLimitBytes;
    /**
     * Get the maximum number of operations to batch in a single request.
     */
    private _getBatchSizeLimit;
    private _getDatasetExamplesMultiPartSupport;
    private drainAutoBatchQueue;
    private _processBatch;
    private _sendBatchToOTELTranslator;
    private processRunOperation;
    protected _getServerInfo(): Promise<any>;
    protected _ensureServerInfo(): Promise<Record<string, any>>;
    protected _getSettings(): Promise<LangSmithSettings>;
    /**
     * Flushes current queued traces.
     */
    flush(): Promise<void>;
    private _cloneCurrentOTELContext;
    createRun(run: CreateRunParams, options?: {
        apiKey?: string;
        apiUrl?: string;
        workspaceId?: string;
    }): Promise<void>;
    /**
     * Batch ingest/upsert multiple runs in the Langsmith system.
     * @param runs
     */
    batchIngestRuns({ runCreates, runUpdates, }: {
        runCreates?: RunCreate[];
        runUpdates?: RunUpdate[];
    }, options?: {
        apiKey?: string;
        apiUrl?: string;
        sizeBytes?: number;
    }): Promise<void>;
    private _postBatchIngestRuns;
    /**
     * Batch ingest/upsert multiple runs in the Langsmith system.
     * @param runs
     */
    multipartIngestRuns({ runCreates, runUpdates, }: {
        runCreates?: RunCreate[];
        runUpdates?: RunUpdate[];
    }, options?: {
        apiKey?: string;
        apiUrl?: string;
        useGzip?: boolean;
        sizeBytes?: number;
    }): Promise<void>;
    private _createNodeFetchBody;
    private _createMultipartStream;
    private _sendMultipartRequest;
    updateRun(runId: string, run: RunUpdate, options?: {
        apiKey?: string;
        apiUrl?: string;
        workspaceId?: string;
    }): Promise<void>;
    readRun(runId: string, { loadChildRuns }?: {
        loadChildRuns: boolean;
    }): Promise<Run>;
    getRunUrl({ runId, run, projectOpts, }: {
        runId?: string;
        run?: Run;
        projectOpts?: ProjectOptions;
    }): Promise<string>;
    private _loadChildRuns;
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
    listRuns(props: ListRunsParams): AsyncIterable<Run>;
    listGroupRuns(props: GroupRunsParams): AsyncIterable<Thread>;
    getRunStats({ id, trace, parentRun, runType, projectNames, projectIds, referenceExampleIds, startTime, endTime, error, query, filter, traceFilter, treeFilter, isRoot, dataSourceType, }: {
        id?: string[];
        trace?: string;
        parentRun?: string;
        runType?: string;
        projectNames?: string[];
        projectIds?: string[];
        referenceExampleIds?: string[];
        startTime?: string;
        endTime?: string;
        error?: boolean;
        query?: string;
        filter?: string;
        traceFilter?: string;
        treeFilter?: string;
        isRoot?: boolean;
        dataSourceType?: string;
    }): Promise<any>;
    shareRun(runId: string, { shareId }?: {
        shareId?: string;
    }): Promise<string>;
    unshareRun(runId: string): Promise<void>;
    readRunSharedLink(runId: string): Promise<string | undefined>;
    listSharedRuns(shareToken: string, { runIds, }?: {
        runIds?: string[];
    }): Promise<Run[]>;
    readDatasetSharedSchema(datasetId?: string, datasetName?: string): Promise<DatasetShareSchema>;
    shareDataset(datasetId?: string, datasetName?: string): Promise<DatasetShareSchema>;
    unshareDataset(datasetId: string): Promise<void>;
    readSharedDataset(shareToken: string): Promise<Dataset>;
    /**
     * Get shared examples.
     *
     * @param {string} shareToken The share token to get examples for. A share token is the UUID (or LangSmith URL, including UUID) generated when explicitly marking an example as public.
     * @param {Object} [options] Additional options for listing the examples.
     * @param {string[] | undefined} [options.exampleIds] A list of example IDs to filter by.
     * @returns {Promise<Example[]>} The shared examples.
     */
    listSharedExamples(shareToken: string, options?: {
        exampleIds?: string[];
    }): Promise<Example[]>;
    createProject({ projectName, description, metadata, upsert, projectExtra, referenceDatasetId, }: CreateProjectParams): Promise<TracerSession>;
    updateProject(projectId: string, { name, description, metadata, projectExtra, endTime, }: {
        name?: string | null;
        description?: string | null;
        metadata?: RecordStringAny | null;
        projectExtra?: RecordStringAny | null;
        endTime?: string | null;
    }): Promise<TracerSession>;
    hasProject({ projectId, projectName, }: {
        projectId?: string;
        projectName?: string;
    }): Promise<boolean>;
    readProject({ projectId, projectName, includeStats, }: {
        projectId?: string;
        projectName?: string;
        includeStats?: boolean;
    }): Promise<TracerSessionResult>;
    getProjectUrl({ projectId, projectName, }: {
        projectId?: string;
        projectName?: string;
    }): Promise<string>;
    getDatasetUrl({ datasetId, datasetName, }: {
        datasetId?: string;
        datasetName?: string;
    }): Promise<string>;
    private _getTenantId;
    listProjects({ projectIds, name, nameContains, referenceDatasetId, referenceDatasetName, includeStats, datasetVersion, referenceFree, metadata, }?: {
        projectIds?: string[];
        name?: string;
        nameContains?: string;
        referenceDatasetId?: string;
        referenceDatasetName?: string;
        includeStats?: boolean;
        datasetVersion?: string;
        referenceFree?: boolean;
        metadata?: RecordStringAny;
    }): AsyncIterable<TracerSessionResult>;
    deleteProject({ projectId, projectName, }: {
        projectId?: string;
        projectName?: string;
    }): Promise<void>;
    uploadCsv({ csvFile, fileName, inputKeys, outputKeys, description, dataType, name, }: UploadCSVParams): Promise<Dataset>;
    createDataset(name: string, { description, dataType, inputsSchema, outputsSchema, metadata, }?: {
        description?: string;
        dataType?: DataType;
        inputsSchema?: KVMap;
        outputsSchema?: KVMap;
        metadata?: RecordStringAny;
    }): Promise<Dataset>;
    readDataset({ datasetId, datasetName, }: {
        datasetId?: string;
        datasetName?: string;
    }): Promise<Dataset>;
    hasDataset({ datasetId, datasetName, }: {
        datasetId?: string;
        datasetName?: string;
    }): Promise<boolean>;
    diffDatasetVersions({ datasetId, datasetName, fromVersion, toVersion, }: {
        datasetId?: string;
        datasetName?: string;
        fromVersion: string | Date;
        toVersion: string | Date;
    }): Promise<DatasetDiffInfo>;
    readDatasetOpenaiFinetuning({ datasetId, datasetName, }: {
        datasetId?: string;
        datasetName?: string;
    }): Promise<any[]>;
    listDatasets({ limit, offset, datasetIds, datasetName, datasetNameContains, metadata, }?: {
        limit?: number;
        offset?: number;
        datasetIds?: string[];
        datasetName?: string;
        datasetNameContains?: string;
        metadata?: RecordStringAny;
    }): AsyncIterable<Dataset>;
    /**
     * Update a dataset
     * @param props The dataset details to update
     * @returns The updated dataset
     */
    updateDataset(props: {
        datasetId?: string;
        datasetName?: string;
        name?: string;
        description?: string;
    }): Promise<Dataset>;
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
    updateDatasetTag(props: {
        datasetId?: string;
        datasetName?: string;
        asOf: string | Date;
        tag: string;
    }): Promise<void>;
    deleteDataset({ datasetId, datasetName, }: {
        datasetId?: string;
        datasetName?: string;
    }): Promise<void>;
    indexDataset({ datasetId, datasetName, tag, }: {
        datasetId?: string;
        datasetName?: string;
        tag?: string;
    }): Promise<void>;
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
    similarExamples(inputs: KVMap, datasetId: string, limit: number, { filter, }?: {
        filter?: string;
    }): Promise<ExampleSearch[]>;
    createExample(update: ExampleCreate): Promise<Example>;
    /**
     * @deprecated This signature is deprecated, use createExample(update: ExampleCreate) instead
     */
    createExample(inputs: KVMap, outputs: KVMap, options: CreateExampleOptions): Promise<Example>;
    createExamples(uploads: ExampleCreate[]): Promise<Example[]>;
    /** @deprecated Use the uploads-only overload instead */
    createExamples(props: {
        inputs?: Array<KVMap>;
        outputs?: Array<KVMap>;
        metadata?: Array<KVMap>;
        splits?: Array<string | Array<string>>;
        sourceRunIds?: Array<string>;
        useSourceRunIOs?: Array<boolean>;
        useSourceRunAttachments?: Array<string[]>;
        attachments?: Array<Attachments>;
        exampleIds?: Array<string>;
        datasetId?: string;
        datasetName?: string;
    }): Promise<Example[]>;
    createLLMExample(input: string, generation: string | undefined, options: CreateExampleOptions): Promise<Example>;
    createChatExample(input: KVMap[] | LangChainBaseMessage[], generations: KVMap | LangChainBaseMessage | undefined, options: CreateExampleOptions): Promise<Example>;
    readExample(exampleId: string): Promise<Example>;
    listExamples({ datasetId, datasetName, exampleIds, asOf, splits, inlineS3Urls, metadata, limit, offset, filter, includeAttachments, }?: {
        datasetId?: string;
        datasetName?: string;
        exampleIds?: string[];
        asOf?: string | Date;
        splits?: string[];
        inlineS3Urls?: boolean;
        metadata?: KVMap;
        limit?: number;
        offset?: number;
        filter?: string;
        includeAttachments?: boolean;
    }): AsyncIterable<Example>;
    deleteExample(exampleId: string): Promise<void>;
    /**
     * Delete multiple examples by ID.
     * @param exampleIds - The IDs of the examples to delete
     * @param options - Optional settings for deletion
     * @param options.hardDelete - If true, permanently delete examples. If false (default), soft delete them.
     */
    deleteExamples(exampleIds: string[], options?: {
        hardDelete?: boolean;
    }): Promise<void>;
    /**
     * @deprecated This signature is deprecated, use updateExample(update: ExampleUpdate) instead
     */
    updateExample(exampleId: string, update: ExampleUpdateWithoutId): Promise<object>;
    updateExample(update: ExampleUpdate): Promise<object>;
    updateExamples(update: ExampleUpdate[]): Promise<object>;
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
    readDatasetVersion({ datasetId, datasetName, asOf, tag, }: {
        datasetId?: string;
        datasetName?: string;
        asOf?: string | Date;
        tag?: string;
    }): Promise<DatasetVersion>;
    listDatasetSplits({ datasetId, datasetName, asOf, }: {
        datasetId?: string;
        datasetName?: string;
        asOf?: string | Date;
    }): Promise<string[]>;
    updateDatasetSplits({ datasetId, datasetName, splitName, exampleIds, remove, }: {
        datasetId?: string;
        datasetName?: string;
        splitName: string;
        exampleIds: string[];
        remove?: boolean;
    }): Promise<void>;
    createFeedback(runId: string | null, key: string, { score, value, correction, comment, sourceInfo, feedbackSourceType, sourceRunId, feedbackId, feedbackConfig, projectId, comparativeExperimentId, sessionId, startTime, }: {
        score?: ScoreType;
        value?: ValueType;
        correction?: object;
        comment?: string;
        sourceInfo?: object;
        feedbackSourceType?: FeedbackSourceType;
        feedbackConfig?: FeedbackConfig;
        sourceRunId?: string;
        feedbackId?: string;
        eager?: boolean;
        projectId?: string;
        comparativeExperimentId?: string;
        /** The session (project) ID of the run this feedback is for. */
        sessionId?: string;
        /** The start time of the run this feedback is for. Accepts ISO string or epoch ms. */
        startTime?: number | string;
    }): Promise<Feedback>;
    updateFeedback(feedbackId: string, { score, value, correction, comment, }: {
        score?: number | boolean | null;
        value?: number | boolean | string | object | null;
        correction?: object | null;
        comment?: string | null;
    }): Promise<void>;
    readFeedback(feedbackId: string): Promise<Feedback>;
    deleteFeedback(feedbackId: string): Promise<void>;
    listFeedback({ runIds, feedbackKeys, feedbackSourceTypes, }?: {
        runIds?: string[];
        feedbackKeys?: string[];
        feedbackSourceTypes?: FeedbackSourceType[];
    }): AsyncIterable<Feedback>;
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
    createPresignedFeedbackToken(runId: string, feedbackKey: string, { expiration, feedbackConfig, }?: {
        expiration?: string | TimeDelta;
        feedbackConfig?: FeedbackConfig;
    }): Promise<FeedbackIngestToken>;
    createComparativeExperiment({ name, experimentIds, referenceDatasetId, createdAt, description, metadata, id, }: {
        name: string;
        experimentIds: Array<string>;
        referenceDatasetId?: string;
        createdAt?: Date;
        description?: string;
        metadata?: Record<string, unknown>;
        id?: string;
    }): Promise<ComparativeExperiment>;
    /**
     * Retrieves a list of presigned feedback tokens for a given run ID.
     * @param runId The ID of the run.
     * @returns An async iterable of FeedbackIngestToken objects.
     */
    listPresignedFeedbackTokens(runId: string): AsyncIterable<FeedbackIngestToken>;
    _selectEvalResults(results: EvaluationResult | EvaluationResult[] | EvaluationResults): Array<EvaluationResult>;
    _logEvaluationFeedback(evaluatorResponse: EvaluationResult | EvaluationResult[] | EvaluationResults, run?: Run, sourceInfo?: {
        [key: string]: any;
    }): Promise<[results: EvaluationResult[], feedbacks: Feedback[]]>;
    logEvaluationFeedback(evaluatorResponse: EvaluationResult | EvaluationResult[] | EvaluationResults, run?: Run, sourceInfo?: {
        [key: string]: any;
    }): Promise<EvaluationResult[]>;
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
    listAnnotationQueues(options?: {
        queueIds?: string[];
        name?: string;
        nameContains?: string;
        limit?: number;
    }): AsyncIterableIterator<AnnotationQueue>;
    /**
     * Create an annotation queue on the LangSmith API.
     * @param options - The options for creating an annotation queue
     * @param options.name - The name of the annotation queue
     * @param options.description - The description of the annotation queue
     * @param options.queueId - The ID of the annotation queue
     * @returns The created AnnotationQueue object
     */
    createAnnotationQueue(options: {
        name: string;
        description?: string;
        queueId?: string;
        rubricInstructions?: string;
    }): Promise<AnnotationQueueWithDetails>;
    /**
     * Read an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to read
     * @returns The AnnotationQueueWithDetails object
     */
    readAnnotationQueue(queueId: string): Promise<AnnotationQueueWithDetails>;
    /**
     * Update an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to update
     * @param options - The options for updating the annotation queue
     * @param options.name - The new name for the annotation queue
     * @param options.description - The new description for the annotation queue
     */
    updateAnnotationQueue(queueId: string, options: {
        name: string;
        description?: string;
        rubricInstructions?: string;
    }): Promise<void>;
    /**
     * Delete an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to delete
     */
    deleteAnnotationQueue(queueId: string): Promise<void>;
    /**
     * Add runs to an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue
     * @param runIds - The IDs of the runs to be added to the annotation queue
     */
    addRunsToAnnotationQueue(queueId: string, runIds: string[]): Promise<void>;
    /**
     * Get a run from an annotation queue at the specified index.
     * @param queueId - The ID of the annotation queue
     * @param index - The index of the run to retrieve
     * @returns A Promise that resolves to a RunWithAnnotationQueueInfo object
     * @throws {Error} If the run is not found at the given index or for other API-related errors
     */
    getRunFromAnnotationQueue(queueId: string, index: number): Promise<RunWithAnnotationQueueInfo>;
    /**
     * Delete a run from an an annotation queue.
     * @param queueId - The ID of the annotation queue to delete the run from
     * @param queueRunId - The ID of the run to delete from the annotation queue
     */
    deleteRunFromAnnotationQueue(queueId: string, queueRunId: string): Promise<void>;
    /**
     * Get the size of an annotation queue.
     * @param queueId - The ID of the annotation queue
     */
    getSizeFromAnnotationQueue(queueId: string): Promise<{
        size: number;
    }>;
    protected _currentTenantIsOwner(owner: string): Promise<boolean>;
    protected _ownerConflictError(action: string, owner: string): Promise<Error>;
    protected _getLatestCommitHash(promptOwnerAndName: string): Promise<string | undefined>;
    protected _likeOrUnlikePrompt(promptIdentifier: string, like: boolean): Promise<LikePromptResponse>;
    protected _getPromptUrl(promptIdentifier: string): Promise<string>;
    promptExists(promptIdentifier: string): Promise<boolean>;
    likePrompt(promptIdentifier: string): Promise<LikePromptResponse>;
    unlikePrompt(promptIdentifier: string): Promise<LikePromptResponse>;
    listCommits(promptOwnerAndName: string): AsyncIterableIterator<PromptCommit>;
    listPrompts(options?: {
        isPublic?: boolean;
        isArchived?: boolean;
        sortField?: PromptSortField;
        query?: string;
    }): AsyncIterableIterator<Prompt>;
    getPrompt(promptIdentifier: string): Promise<Prompt | null>;
    createPrompt(promptIdentifier: string, options?: {
        description?: string;
        readme?: string;
        tags?: string[];
        isPublic?: boolean;
    }): Promise<Prompt>;
    createCommit(promptIdentifier: string, object: any, options?: {
        parentCommitHash?: string;
    }): Promise<string>;
    /**
     * Update examples with attachments using multipart form data.
     * @param updates List of ExampleUpdateWithAttachments objects to upsert
     * @returns Promise with the update response
     */
    updateExamplesMultipart(datasetId: string, updates?: ExampleUpdate[]): Promise<UpdateExamplesResponse>;
    private _updateExamplesMultipart;
    /**
     * Upload examples with attachments using multipart form data.
     * @param uploads List of ExampleUploadWithAttachments objects to upload
     * @returns Promise with the upload response
     * @deprecated This method is deprecated and will be removed in future LangSmith versions, please use `createExamples` instead
     */
    uploadExamplesMultipart(datasetId: string, uploads?: ExampleCreate[]): Promise<UploadExamplesResponse>;
    private _uploadExamplesMultipart;
    updatePrompt(promptIdentifier: string, options?: {
        description?: string;
        readme?: string;
        tags?: string[];
        isPublic?: boolean;
        isArchived?: boolean;
    }): Promise<Record<string, any>>;
    deletePrompt(promptIdentifier: string): Promise<void>;
    /**
     * Generate a cache key for a prompt.
     * Format: "{identifier}" or "{identifier}:with_model"
     */
    private _getPromptCacheKey;
    /**
     * Fetch a prompt commit directly from the API (bypassing cache).
     */
    private _fetchPromptFromApi;
    pullPromptCommit(promptIdentifier: string, options?: {
        includeModel?: boolean;
        skipCache?: boolean;
    }): Promise<PromptCommit>;
    /**
     * This method should not be used directly, use `import { pull } from "langchain/hub"` instead.
     * Using this method directly returns the JSON string of the prompt rather than a LangChain object.
     * @private
     */
    _pullPrompt(promptIdentifier: string, options?: {
        includeModel?: boolean;
        skipCache?: boolean;
    }): Promise<any>;
    pushPrompt(promptIdentifier: string, options?: {
        object?: any;
        parentCommitHash?: string;
        isPublic?: boolean;
        description?: string;
        readme?: string;
        tags?: string[];
    }): Promise<string>;
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
    clonePublicDataset(tokenOrUrl: string, options?: {
        sourceApiUrl?: string;
        datasetName?: string;
    }): Promise<void>;
    private parseTokenOrUrl;
    /**
     * Get the cache instance, if caching is enabled.
     * Useful for accessing cache metrics or manually managing the cache.
     */
    get cache(): Cache | undefined;
    /**
     * Cleanup resources held by the client.
     * Stops the cache's background refresh timer.
     */
    cleanup(): void;
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
    awaitPendingTraceBatches(): Promise<void>;
}
export interface LangSmithTracingClientInterface {
    createRun: (run: CreateRunParams) => Promise<void>;
    updateRun: (runId: string, run: RunUpdate) => Promise<void>;
}
export {};
