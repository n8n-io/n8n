export interface TracerSession {
    tenant_id: string;
    id: string;
    start_time: number;
    end_time?: number;
    description?: string;
    name?: string;
    /** Extra metadata for the project. */
    extra?: KVMap;
    reference_dataset_id?: string;
}
export interface TracerSessionResult extends TracerSession {
    run_count?: number;
    latency_p50?: number;
    latency_p99?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    last_run_start_time?: number;
    feedback_stats?: Record<string, unknown>;
    run_facets?: KVMap[];
}
export type KVMap = Record<string, any>;
export type RunType = "llm" | "chain" | "tool" | "retriever" | "embedding" | "prompt" | "parser";
export type ScoreType = number | boolean | null;
export type ValueType = number | boolean | string | object | null;
export type DataType = "kv" | "llm" | "chat";
export interface BaseExample {
    dataset_id: string;
    inputs: KVMap;
    outputs?: KVMap;
    metadata?: KVMap;
    source_run_id?: string;
}
export interface AttachmentInfo {
    presigned_url: string;
    mime_type?: string;
}
export type AttachmentData = Uint8Array | ArrayBuffer;
export type AttachmentDescription = {
    mimeType: string;
    data: AttachmentData;
};
export type Attachments = Record<string, [
    string,
    AttachmentData
] | AttachmentDescription>;
/**
 * A run can represent either a trace (root run)
 * or a child run (~span).
 */
export interface BaseRun {
    /** Optionally, a unique identifier for the run. */
    id?: string;
    /** A human-readable name for the run. */
    name: string;
    /** The epoch time at which the run started, if available. */
    start_time?: number | string;
    /** Specifies the type of run (tool, chain, llm, etc.). */
    run_type: string;
    /** The epoch time at which the run ended, if applicable. */
    end_time?: number | string;
    /** Any additional metadata or settings for the run. */
    extra?: KVMap;
    /** Error message, captured if the run faces any issues. */
    error?: string;
    /** Serialized state of the run for potential future use. */
    serialized?: object;
    /** Events like 'start', 'end' linked to the run. */
    events?: KVMap[];
    /** Inputs that were used to initiate the run. */
    inputs: KVMap;
    /** Outputs produced by the run, if any. */
    outputs?: KVMap;
    /** ID of an example that might be related to this run. */
    reference_example_id?: string;
    /** ID of a parent run, if this run is part of a larger operation. */
    parent_run_id?: string;
    /** Tags for further categorizing or annotating the run. */
    tags?: string[];
    /** Unique ID assigned to every run within this nested trace. **/
    trace_id?: string;
    /**
     * The dotted order for the run.
     *
     * This is a string composed of {time}{run-uuid}.* so that a trace can be
     * sorted in the order it was executed.
     *
     * Example:
     * - Parent: 20230914T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8
     * - Children:
     *    - 20230914T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8.20230914T223155649Z809ed3a2-0172-4f4d-8a02-a64e9b7a0f8a
     *   - 20230915T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8.20230914T223155650Zc8d9f4c5-6c5a-4b2d-9b1c-3d9d7a7c5c7c
     */
    dotted_order?: string;
    /**
     * Attachments associated with the run.
     * Each entry is a tuple of [mime_type, bytes]
     */
    attachments?: Attachments;
}
type S3URL = {
    ROOT: {
        /** A pre-signed URL */
        presigned_url: string;
        /** The S3 path to the object in storage */
        s3_url: string;
    };
};
/**
 * Describes properties of a run when loaded from the database.
 * Extends the BaseRun interface.
 */
export interface Run extends BaseRun {
    /** A unique identifier for the run, mandatory when loaded from DB. */
    id: string;
    /** The ID of the project that owns this run. */
    session_id?: string;
    /** IDs of any child runs spawned by this run. */
    child_run_ids?: string[];
    /** Child runs, loaded explicitly via a heavier query. */
    child_runs?: Run[];
    /** Stats capturing feedback for this run. */
    feedback_stats?: KVMap;
    /** The URL path where this run is accessible within the app. */
    app_path?: string;
    /** The manifest ID that correlates with this run. */
    manifest_id?: string;
    /** The current status of the run, such as 'success'. */
    status?: string;
    /** Number of tokens used in the prompt. */
    prompt_tokens?: number;
    /** Number of tokens generated in the completion. */
    completion_tokens?: number;
    /** Total token count, combining prompt and completion. */
    total_tokens?: number;
    /** Time when the first token was processed. */
    first_token_time?: number;
    /** IDs of parent runs, if multiple exist. */
    parent_run_ids?: string[];
    /** Whether the run is included in a dataset. */
    in_dataset?: boolean;
    /** The output S3 URLs */
    outputs_s3_urls?: S3URL;
    /** The input S3 URLs */
    inputs_s3_urls?: S3URL;
}
export interface RunCreate extends BaseRun {
    revision_id?: string;
    child_runs?: this[];
    session_name?: string;
}
export interface RunUpdate {
    id?: string;
    name?: string;
    run_type?: string;
    start_time?: number | string;
    end_time?: number | string;
    extra?: KVMap;
    tags?: string[];
    error?: string;
    serialized?: object;
    inputs?: KVMap;
    outputs?: KVMap;
    parent_run_id?: string;
    reference_example_id?: string;
    events?: KVMap[];
    session_id?: string;
    session_name?: string;
    /** Unique ID assigned to every run within this nested trace. **/
    trace_id?: string;
    /**
     * The dotted order for the run.
     *
     * This is a string composed of {time}{run-uuid}.* so that a trace can be
     * sorted in the order it was executed.
     *
     * Example:
     * - Parent: 20230914T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8
     * - Children:
     *    - 20230914T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8.20230914T223155649Z809ed3a2-0172-4f4d-8a02-a64e9b7a0f8a
     *   - 20230915T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8.20230914T223155650Zc8d9f4c5-6c5a-4b2d-9b1c-3d9d7a7c5c7c
     */
    dotted_order?: string;
    /**
     * Attachments associated with the run.
     * Each entry is a tuple of [mime_type, bytes]
     */
    attachments?: Attachments;
}
export interface ExampleCreate {
    id?: string;
    inputs: KVMap;
    outputs?: KVMap;
    metadata?: KVMap;
    split?: string | string[];
    attachments?: Attachments;
    created_at?: string;
    dataset_id?: string;
    dataset_name?: string;
    source_run_id?: string;
    use_source_run_io?: boolean;
    use_source_run_attachments?: string[];
}
export interface ExampleUploadWithAttachments extends ExampleCreate {
}
export interface ExampleUpdate {
    id: string;
    inputs?: KVMap;
    outputs?: KVMap;
    metadata?: KVMap;
    split?: string | string[];
    attachments?: Attachments;
    attachments_operations?: KVMap;
    dataset_id?: string;
}
export interface ExampleUpdateWithoutId extends Omit<ExampleUpdate, "id"> {
}
export interface ExampleUpdateWithAttachments extends ExampleUpdate {
}
export interface UploadExamplesResponse {
    count: number;
    example_ids: string[];
    as_of?: string;
}
export interface UpdateExamplesResponse extends UploadExamplesResponse {
}
export interface Example extends BaseExample {
    id: string;
    created_at: string;
    modified_at?: string;
    source_run_id?: string;
    runs: Run[];
    attachments?: Record<string, AttachmentInfo>;
    split?: string | string[];
}
interface RawAttachmentInfo {
    presigned_url: string;
    s3_url: string;
    mime_type?: string;
}
export interface RawExample extends BaseExample {
    id: string;
    created_at: string;
    modified_at: string;
    source_run_id?: string;
    runs: Run[];
    attachment_urls?: Record<string, RawAttachmentInfo>;
}
export interface ExampleUpdateWithId extends ExampleUpdate {
}
export interface ExampleSearch extends BaseExample {
    id: string;
}
export interface BaseDataset {
    name: string;
    description: string;
    tenant_id: string;
    data_type?: DataType;
    inputs_schema_definition?: KVMap;
    outputs_schema_definition?: KVMap;
}
export interface Dataset extends BaseDataset {
    id: string;
    created_at: string;
    modified_at: string;
    example_count?: number;
    session_count?: number;
    last_session_start_time?: number;
}
export interface DatasetShareSchema {
    dataset_id: string;
    share_token: string;
    url: string;
}
export interface DatasetVersion {
    tags?: string[];
    as_of: string;
}
export interface FeedbackSourceBase {
    type: string;
    metadata?: KVMap;
}
export interface APIFeedbackSource extends FeedbackSourceBase {
    type: "api";
}
export interface ModelFeedbackSource extends FeedbackSourceBase {
    type: "model";
}
export interface FeedbackBase {
    created_at: string;
    modified_at: string;
    run_id: string;
    key: string;
    score: ScoreType;
    value: ValueType;
    comment: string | null;
    correction: string | object | null;
    feedback_source: APIFeedbackSource | ModelFeedbackSource | KVMap | null;
}
export interface FeedbackCreate extends FeedbackBase {
    id: string;
}
export interface Feedback extends FeedbackBase {
    id: string;
}
export interface LangChainBaseMessage {
    _getType: () => string;
    content: string;
    additional_kwargs?: KVMap;
}
export interface FeedbackIngestToken {
    id: string;
    url: string;
    expires_at: string;
}
export interface TimeDelta {
    days?: number;
    hours?: number;
    minutes?: number;
}
export interface FeedbackCategory {
    value: number;
    label?: string | null;
}
/**
 * Represents the configuration for feedback.
 * This determines how the LangSmith service interprets feedback
 * values of the associated key.
 */
export interface FeedbackConfig {
    /**
     * The type of feedback.
     * - "continuous": Feedback with a continuous numeric.
     * - "categorical": Feedback with a categorical value (classes)
     * - "freeform": Feedback with a freeform text value (notes).
     */
    type: "continuous" | "categorical" | "freeform";
    /**
     * The minimum value for continuous feedback.
     */
    min?: number | null;
    /**
     * The maximum value for continuous feedback.
     */
    max?: number | null;
    /**
     * The categories for categorical feedback.
     * Each category can be a string or an object with additional properties.
     *
     * If feedback is categorical, this defines the valid categories the server will accept.
     * Not applicable to continuous or freeform feedback types.
     */
    categories?: FeedbackCategory[] | null;
}
export interface DatasetDiffInfo {
    examples_modified: string[];
    examples_added: string[];
    examples_removed: string[];
}
export interface ComparisonEvaluationResult {
    key: string;
    scores: Record<string, ScoreType>;
    source_run_id?: string;
}
export interface ComparativeExperiment {
    id: string;
    name: string;
    description: string;
    tenant_id: string;
    created_at: string;
    modified_at: string;
    reference_dataset_id: string;
    extra?: Record<string, unknown>;
    experiments_info?: Array<Record<string, unknown>>;
    feedback_stats?: Record<string, unknown>;
}
/**
 * Represents the expected output schema returned by traceable
 * or by run tree output for LangSmith to correctly display
 * documents in the UI
 */
export type RetrieverOutput = Array<{
    page_content: string;
    type: "Document";
    metadata?: KVMap;
}>;
export interface InvocationParamsSchema {
    ls_provider?: string;
    ls_model_name?: string;
    ls_model_type: "chat" | "llm";
    ls_temperature?: number;
    ls_max_tokens?: number;
    ls_stop?: string[];
    ls_invocation_params?: Record<string, unknown>;
}
export interface PromptCommit {
    owner: string;
    repo: string;
    commit_hash: string;
    manifest: Record<string, any>;
    examples: Array<Record<any, any>>;
}
export interface Prompt {
    repo_handle: string;
    description?: string;
    readme?: string;
    id: string;
    tenant_id: string;
    created_at: string;
    updated_at: string;
    is_public: boolean;
    is_archived: boolean;
    tags: string[];
    original_repo_id?: string;
    upstream_repo_id?: string;
    owner?: string;
    full_name: string;
    num_likes: number;
    num_downloads: number;
    num_views: number;
    liked_by_auth_user: boolean;
    last_commit_hash?: string;
    num_commits: number;
    original_repo_full_name?: string;
    upstream_repo_full_name?: string;
}
export interface ListPromptsResponse {
    repos: Prompt[];
    total: number;
}
export interface ListCommitsResponse {
    commits: PromptCommit[];
    total: number;
}
export type PromptSortField = "num_downloads" | "num_views" | "updated_at" | "num_likes";
export interface LikePromptResponse {
    likes: number;
}
export interface LangSmithSettings {
    id: string;
    display_name: string;
    created_at: string;
    tenant_handle?: string;
}
export interface AnnotationQueue {
    /** The unique identifier of the annotation queue. */
    id: string;
    /** The name of the annotation queue. */
    name: string;
    /** An optional description of the annotation queue. */
    description?: string;
    /** The timestamp when the annotation queue was created. */
    created_at: string;
    /** The timestamp when the annotation queue was last updated. */
    updated_at: string;
    /** The ID of the tenant associated with the annotation queue. */
    tenant_id: string;
}
export interface AnnotationQueueRubricItem {
    /** The feedback key this rubric item is associated with. */
    feedback_key: string;
    /** An optional description of the rubric item. */
    description?: string | null;
    /** Descriptions for categorical values. */
    value_descriptions?: Record<string, string> | null;
    /** Descriptions for continuous score values. */
    score_descriptions?: Record<string, string> | null;
    /** Whether this rubric item is required. */
    is_required?: boolean | null;
}
export interface AnnotationQueueWithDetails extends AnnotationQueue {
    /** The rubric instructions for the annotation queue. */
    rubric_instructions?: string;
    /** The rubric items for the annotation queue. */
    rubric_items?: AnnotationQueueRubricItem[];
}
export interface FeedbackConfigSchema {
    /** The unique key identifying this feedback configuration. */
    feedback_key: string;
    /** The configuration specifying the type, bounds, and categories. */
    feedback_config: FeedbackConfig;
    /** The ID of the tenant that owns this feedback configuration. */
    tenant_id: string;
    /** When this feedback configuration was last modified. */
    modified_at: string;
    /** Whether a lower score is considered better for this feedback key. */
    is_lower_score_better?: boolean | null;
}
export interface RunWithAnnotationQueueInfo extends BaseRun {
    /** The last time this run was reviewed. */
    last_reviewed_time?: string;
    /** The time this run was added to the queue. */
    added_at?: string;
}
/**
 * Breakdown of input token counts.
 *
 * Does not *need* to sum to full input token count. Does *not* need to have all keys.
 */
export type InputTokenDetails = {
    /**
     * Audio input tokens.
     */
    audio?: number;
    /**
     * Input tokens that were cached and there was a cache hit.
     *
     * Since there was a cache hit, the tokens were read from the cache.
     * More precisely, the model state given these tokens was read from the cache.
     */
    cache_read?: number;
    /**
     * Input tokens that were cached and there was a cache miss.
     *
     * Since there was a cache miss, the cache was created from these tokens.
     */
    cache_creation?: number;
} & Record<string, number>;
/**
 * Breakdown of output token counts.
 *
 * Does *not* need to sum to full output token count. Does *not* need to have all keys.
 */
export type OutputTokenDetails = {
    /**
     * Audio output tokens
     */
    audio?: number;
    /**
     * Reasoning output tokens.
     *
     * Tokens generated by the model in a chain of thought process (i.e. by
     * OpenAI's o1 models) that are not returned as part of model output.
     */
    reasoning?: number;
} & Record<string, number>;
/**
 * Usage metadata for a message, such as token counts.
 */
export type UsageMetadata = {
    /**
     * Count of input (or prompt) tokens. Sum of all input token types.
     */
    input_tokens: number;
    /**
     * Count of output (or completion) tokens. Sum of all output token types.
     */
    output_tokens: number;
    /**
     * Total token count. Sum of input_tokens + output_tokens.
     */
    total_tokens: number;
    /**
     * Breakdown of input token counts.
     *
     * Does *not* need to sum to full input token count. Does *not* need to have all keys.
     */
    input_token_details?: InputTokenDetails;
    /**
     * Breakdown of output token counts.
     *
     * Does *not* need to sum to full output token count. Does *not* need to have all keys.
     */
    output_token_details?: OutputTokenDetails;
    /**
     * The cost of the input tokens.
     */
    input_cost?: number;
    /**
     * The cost of the output tokens.
     */
    output_cost?: number;
    /**
     * The total cost of the tokens.
     */
    total_cost?: number;
    /**
     * The cost details of the input tokens.
     */
    input_cost_details?: Record<string, unknown>;
    /**
     * The cost details of the output tokens.
     */
    output_cost_details?: Record<string, unknown>;
};
export type ExtractedUsageMetadata = Partial<UsageMetadata>;
export {};
