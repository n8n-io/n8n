import { APIResource } from "../../../resource.js";
import * as Core from "../../../core.js";
import * as Shared from "../../shared.js";
import * as ResponsesAPI from "../../responses/responses.js";
import * as OutputItemsAPI from "./output-items.js";
import { OutputItemListParams, OutputItemListResponse, OutputItemListResponsesPage, OutputItemRetrieveResponse, OutputItems } from "./output-items.js";
import { CursorPage, type CursorPageParams } from "../../../pagination.js";
export declare class Runs extends APIResource {
    outputItems: OutputItemsAPI.OutputItems;
    /**
     * Kicks off a new run for a given evaluation, specifying the data source, and what
     * model configuration to use to test. The datasource will be validated against the
     * schema specified in the config of the evaluation.
     */
    create(evalId: string, body: RunCreateParams, options?: Core.RequestOptions): Core.APIPromise<RunCreateResponse>;
    /**
     * Get an evaluation run by ID.
     */
    retrieve(evalId: string, runId: string, options?: Core.RequestOptions): Core.APIPromise<RunRetrieveResponse>;
    /**
     * Get a list of runs for an evaluation.
     */
    list(evalId: string, query?: RunListParams, options?: Core.RequestOptions): Core.PagePromise<RunListResponsesPage, RunListResponse>;
    list(evalId: string, options?: Core.RequestOptions): Core.PagePromise<RunListResponsesPage, RunListResponse>;
    /**
     * Delete an eval run.
     */
    del(evalId: string, runId: string, options?: Core.RequestOptions): Core.APIPromise<RunDeleteResponse>;
    /**
     * Cancel an ongoing evaluation run.
     */
    cancel(evalId: string, runId: string, options?: Core.RequestOptions): Core.APIPromise<RunCancelResponse>;
}
export declare class RunListResponsesPage extends CursorPage<RunListResponse> {
}
/**
 * A CompletionsRunDataSource object describing a model sampling configuration.
 */
export interface CreateEvalCompletionsRunDataSource {
    /**
     * Determines what populates the `item` namespace in this run's data source.
     */
    source: CreateEvalCompletionsRunDataSource.FileContent | CreateEvalCompletionsRunDataSource.FileID | CreateEvalCompletionsRunDataSource.StoredCompletions;
    /**
     * The type of run data source. Always `completions`.
     */
    type: 'completions';
    /**
     * Used when sampling from a model. Dictates the structure of the messages passed
     * into the model. Can either be a reference to a prebuilt trajectory (ie,
     * `item.input_trajectory`), or a template with variable references to the `item`
     * namespace.
     */
    input_messages?: CreateEvalCompletionsRunDataSource.Template | CreateEvalCompletionsRunDataSource.ItemReference;
    /**
     * The name of the model to use for generating completions (e.g. "o3-mini").
     */
    model?: string;
    sampling_params?: CreateEvalCompletionsRunDataSource.SamplingParams;
}
export declare namespace CreateEvalCompletionsRunDataSource {
    interface FileContent {
        /**
         * The content of the jsonl file.
         */
        content: Array<FileContent.Content>;
        /**
         * The type of jsonl source. Always `file_content`.
         */
        type: 'file_content';
    }
    namespace FileContent {
        interface Content {
            item: Record<string, unknown>;
            sample?: Record<string, unknown>;
        }
    }
    interface FileID {
        /**
         * The identifier of the file.
         */
        id: string;
        /**
         * The type of jsonl source. Always `file_id`.
         */
        type: 'file_id';
    }
    /**
     * A StoredCompletionsRunDataSource configuration describing a set of filters
     */
    interface StoredCompletions {
        /**
         * The type of source. Always `stored_completions`.
         */
        type: 'stored_completions';
        /**
         * An optional Unix timestamp to filter items created after this time.
         */
        created_after?: number | null;
        /**
         * An optional Unix timestamp to filter items created before this time.
         */
        created_before?: number | null;
        /**
         * An optional maximum number of items to return.
         */
        limit?: number | null;
        /**
         * Set of 16 key-value pairs that can be attached to an object. This can be useful
         * for storing additional information about the object in a structured format, and
         * querying for objects via API or the dashboard.
         *
         * Keys are strings with a maximum length of 64 characters. Values are strings with
         * a maximum length of 512 characters.
         */
        metadata?: Shared.Metadata | null;
        /**
         * An optional model to filter by (e.g., 'gpt-4o').
         */
        model?: string | null;
    }
    interface Template {
        /**
         * A list of chat messages forming the prompt or context. May include variable
         * references to the `item` namespace, ie {{item.name}}.
         */
        template: Array<ResponsesAPI.EasyInputMessage | Template.Message>;
        /**
         * The type of input messages. Always `template`.
         */
        type: 'template';
    }
    namespace Template {
        /**
         * A message input to the model with a role indicating instruction following
         * hierarchy. Instructions given with the `developer` or `system` role take
         * precedence over instructions given with the `user` role. Messages with the
         * `assistant` role are presumed to have been generated by the model in previous
         * interactions.
         */
        interface Message {
            /**
             * Text inputs to the model - can contain template strings.
             */
            content: string | ResponsesAPI.ResponseInputText | Message.OutputText;
            /**
             * The role of the message input. One of `user`, `assistant`, `system`, or
             * `developer`.
             */
            role: 'user' | 'assistant' | 'system' | 'developer';
            /**
             * The type of the message input. Always `message`.
             */
            type?: 'message';
        }
        namespace Message {
            /**
             * A text output from the model.
             */
            interface OutputText {
                /**
                 * The text output from the model.
                 */
                text: string;
                /**
                 * The type of the output text. Always `output_text`.
                 */
                type: 'output_text';
            }
        }
    }
    interface ItemReference {
        /**
         * A reference to a variable in the `item` namespace. Ie, "item.input_trajectory"
         */
        item_reference: string;
        /**
         * The type of input messages. Always `item_reference`.
         */
        type: 'item_reference';
    }
    interface SamplingParams {
        /**
         * The maximum number of tokens in the generated output.
         */
        max_completion_tokens?: number;
        /**
         * A seed value to initialize the randomness, during sampling.
         */
        seed?: number;
        /**
         * A higher temperature increases randomness in the outputs.
         */
        temperature?: number;
        /**
         * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
         */
        top_p?: number;
    }
}
/**
 * A JsonlRunDataSource object with that specifies a JSONL file that matches the
 * eval
 */
export interface CreateEvalJSONLRunDataSource {
    /**
     * Determines what populates the `item` namespace in the data source.
     */
    source: CreateEvalJSONLRunDataSource.FileContent | CreateEvalJSONLRunDataSource.FileID;
    /**
     * The type of data source. Always `jsonl`.
     */
    type: 'jsonl';
}
export declare namespace CreateEvalJSONLRunDataSource {
    interface FileContent {
        /**
         * The content of the jsonl file.
         */
        content: Array<FileContent.Content>;
        /**
         * The type of jsonl source. Always `file_content`.
         */
        type: 'file_content';
    }
    namespace FileContent {
        interface Content {
            item: Record<string, unknown>;
            sample?: Record<string, unknown>;
        }
    }
    interface FileID {
        /**
         * The identifier of the file.
         */
        id: string;
        /**
         * The type of jsonl source. Always `file_id`.
         */
        type: 'file_id';
    }
}
/**
 * An object representing an error response from the Eval API.
 */
export interface EvalAPIError {
    /**
     * The error code.
     */
    code: string;
    /**
     * The error message.
     */
    message: string;
}
/**
 * A schema representing an evaluation run.
 */
export interface RunCreateResponse {
    /**
     * Unique identifier for the evaluation run.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the evaluation run was created.
     */
    created_at: number;
    /**
     * Information about the run's data source.
     */
    data_source: CreateEvalJSONLRunDataSource | CreateEvalCompletionsRunDataSource | RunCreateResponse.Responses;
    /**
     * An object representing an error response from the Eval API.
     */
    error: EvalAPIError;
    /**
     * The identifier of the associated evaluation.
     */
    eval_id: string;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata: Shared.Metadata | null;
    /**
     * The model that is evaluated, if applicable.
     */
    model: string;
    /**
     * The name of the evaluation run.
     */
    name: string;
    /**
     * The type of the object. Always "eval.run".
     */
    object: 'eval.run';
    /**
     * Usage statistics for each model during the evaluation run.
     */
    per_model_usage: Array<RunCreateResponse.PerModelUsage>;
    /**
     * Results per testing criteria applied during the evaluation run.
     */
    per_testing_criteria_results: Array<RunCreateResponse.PerTestingCriteriaResult>;
    /**
     * The URL to the rendered evaluation run report on the UI dashboard.
     */
    report_url: string;
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    result_counts: RunCreateResponse.ResultCounts;
    /**
     * The status of the evaluation run.
     */
    status: string;
}
export declare namespace RunCreateResponse {
    /**
     * A ResponsesRunDataSource object describing a model sampling configuration.
     */
    interface Responses {
        /**
         * Determines what populates the `item` namespace in this run's data source.
         */
        source: Responses.FileContent | Responses.FileID | Responses.Responses;
        /**
         * The type of run data source. Always `responses`.
         */
        type: 'responses';
        /**
         * Used when sampling from a model. Dictates the structure of the messages passed
         * into the model. Can either be a reference to a prebuilt trajectory (ie,
         * `item.input_trajectory`), or a template with variable references to the `item`
         * namespace.
         */
        input_messages?: Responses.Template | Responses.ItemReference;
        /**
         * The name of the model to use for generating completions (e.g. "o3-mini").
         */
        model?: string;
        sampling_params?: Responses.SamplingParams;
    }
    namespace Responses {
        interface FileContent {
            /**
             * The content of the jsonl file.
             */
            content: Array<FileContent.Content>;
            /**
             * The type of jsonl source. Always `file_content`.
             */
            type: 'file_content';
        }
        namespace FileContent {
            interface Content {
                item: Record<string, unknown>;
                sample?: Record<string, unknown>;
            }
        }
        interface FileID {
            /**
             * The identifier of the file.
             */
            id: string;
            /**
             * The type of jsonl source. Always `file_id`.
             */
            type: 'file_id';
        }
        /**
         * A EvalResponsesSource object describing a run data source configuration.
         */
        interface Responses {
            /**
             * The type of run data source. Always `responses`.
             */
            type: 'responses';
            /**
             * Only include items created after this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_after?: number | null;
            /**
             * Only include items created before this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_before?: number | null;
            /**
             * Optional string to search the 'instructions' field. This is a query parameter
             * used to select responses.
             */
            instructions_search?: string | null;
            /**
             * Metadata filter for the responses. This is a query parameter used to select
             * responses.
             */
            metadata?: unknown | null;
            /**
             * The name of the model to find responses for. This is a query parameter used to
             * select responses.
             */
            model?: string | null;
            /**
             * Optional reasoning effort parameter. This is a query parameter used to select
             * responses.
             */
            reasoning_effort?: Shared.ReasoningEffort | null;
            /**
             * Sampling temperature. This is a query parameter used to select responses.
             */
            temperature?: number | null;
            /**
             * List of tool names. This is a query parameter used to select responses.
             */
            tools?: Array<string> | null;
            /**
             * Nucleus sampling parameter. This is a query parameter used to select responses.
             */
            top_p?: number | null;
            /**
             * List of user identifiers. This is a query parameter used to select responses.
             */
            users?: Array<string> | null;
        }
        interface Template {
            /**
             * A list of chat messages forming the prompt or context. May include variable
             * references to the `item` namespace, ie {{item.name}}.
             */
            template: Array<Template.ChatMessage | Template.EvalItem>;
            /**
             * The type of input messages. Always `template`.
             */
            type: 'template';
        }
        namespace Template {
            interface ChatMessage {
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * The role of the message (e.g. "system", "assistant", "user").
                 */
                role: string;
            }
            /**
             * A message input to the model with a role indicating instruction following
             * hierarchy. Instructions given with the `developer` or `system` role take
             * precedence over instructions given with the `user` role. Messages with the
             * `assistant` role are presumed to have been generated by the model in previous
             * interactions.
             */
            interface EvalItem {
                /**
                 * Text inputs to the model - can contain template strings.
                 */
                content: string | ResponsesAPI.ResponseInputText | EvalItem.OutputText;
                /**
                 * The role of the message input. One of `user`, `assistant`, `system`, or
                 * `developer`.
                 */
                role: 'user' | 'assistant' | 'system' | 'developer';
                /**
                 * The type of the message input. Always `message`.
                 */
                type?: 'message';
            }
            namespace EvalItem {
                /**
                 * A text output from the model.
                 */
                interface OutputText {
                    /**
                     * The text output from the model.
                     */
                    text: string;
                    /**
                     * The type of the output text. Always `output_text`.
                     */
                    type: 'output_text';
                }
            }
        }
        interface ItemReference {
            /**
             * A reference to a variable in the `item` namespace. Ie, "item.name"
             */
            item_reference: string;
            /**
             * The type of input messages. Always `item_reference`.
             */
            type: 'item_reference';
        }
        interface SamplingParams {
            /**
             * The maximum number of tokens in the generated output.
             */
            max_completion_tokens?: number;
            /**
             * A seed value to initialize the randomness, during sampling.
             */
            seed?: number;
            /**
             * A higher temperature increases randomness in the outputs.
             */
            temperature?: number;
            /**
             * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
             */
            top_p?: number;
        }
    }
    interface PerModelUsage {
        /**
         * The number of tokens retrieved from cache.
         */
        cached_tokens: number;
        /**
         * The number of completion tokens generated.
         */
        completion_tokens: number;
        /**
         * The number of invocations.
         */
        invocation_count: number;
        /**
         * The name of the model.
         */
        model_name: string;
        /**
         * The number of prompt tokens used.
         */
        prompt_tokens: number;
        /**
         * The total number of tokens used.
         */
        total_tokens: number;
    }
    interface PerTestingCriteriaResult {
        /**
         * Number of tests failed for this criteria.
         */
        failed: number;
        /**
         * Number of tests passed for this criteria.
         */
        passed: number;
        /**
         * A description of the testing criteria.
         */
        testing_criteria: string;
    }
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    interface ResultCounts {
        /**
         * Number of output items that resulted in an error.
         */
        errored: number;
        /**
         * Number of output items that failed to pass the evaluation.
         */
        failed: number;
        /**
         * Number of output items that passed the evaluation.
         */
        passed: number;
        /**
         * Total number of executed output items.
         */
        total: number;
    }
}
/**
 * A schema representing an evaluation run.
 */
export interface RunRetrieveResponse {
    /**
     * Unique identifier for the evaluation run.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the evaluation run was created.
     */
    created_at: number;
    /**
     * Information about the run's data source.
     */
    data_source: CreateEvalJSONLRunDataSource | CreateEvalCompletionsRunDataSource | RunRetrieveResponse.Responses;
    /**
     * An object representing an error response from the Eval API.
     */
    error: EvalAPIError;
    /**
     * The identifier of the associated evaluation.
     */
    eval_id: string;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata: Shared.Metadata | null;
    /**
     * The model that is evaluated, if applicable.
     */
    model: string;
    /**
     * The name of the evaluation run.
     */
    name: string;
    /**
     * The type of the object. Always "eval.run".
     */
    object: 'eval.run';
    /**
     * Usage statistics for each model during the evaluation run.
     */
    per_model_usage: Array<RunRetrieveResponse.PerModelUsage>;
    /**
     * Results per testing criteria applied during the evaluation run.
     */
    per_testing_criteria_results: Array<RunRetrieveResponse.PerTestingCriteriaResult>;
    /**
     * The URL to the rendered evaluation run report on the UI dashboard.
     */
    report_url: string;
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    result_counts: RunRetrieveResponse.ResultCounts;
    /**
     * The status of the evaluation run.
     */
    status: string;
}
export declare namespace RunRetrieveResponse {
    /**
     * A ResponsesRunDataSource object describing a model sampling configuration.
     */
    interface Responses {
        /**
         * Determines what populates the `item` namespace in this run's data source.
         */
        source: Responses.FileContent | Responses.FileID | Responses.Responses;
        /**
         * The type of run data source. Always `responses`.
         */
        type: 'responses';
        /**
         * Used when sampling from a model. Dictates the structure of the messages passed
         * into the model. Can either be a reference to a prebuilt trajectory (ie,
         * `item.input_trajectory`), or a template with variable references to the `item`
         * namespace.
         */
        input_messages?: Responses.Template | Responses.ItemReference;
        /**
         * The name of the model to use for generating completions (e.g. "o3-mini").
         */
        model?: string;
        sampling_params?: Responses.SamplingParams;
    }
    namespace Responses {
        interface FileContent {
            /**
             * The content of the jsonl file.
             */
            content: Array<FileContent.Content>;
            /**
             * The type of jsonl source. Always `file_content`.
             */
            type: 'file_content';
        }
        namespace FileContent {
            interface Content {
                item: Record<string, unknown>;
                sample?: Record<string, unknown>;
            }
        }
        interface FileID {
            /**
             * The identifier of the file.
             */
            id: string;
            /**
             * The type of jsonl source. Always `file_id`.
             */
            type: 'file_id';
        }
        /**
         * A EvalResponsesSource object describing a run data source configuration.
         */
        interface Responses {
            /**
             * The type of run data source. Always `responses`.
             */
            type: 'responses';
            /**
             * Only include items created after this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_after?: number | null;
            /**
             * Only include items created before this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_before?: number | null;
            /**
             * Optional string to search the 'instructions' field. This is a query parameter
             * used to select responses.
             */
            instructions_search?: string | null;
            /**
             * Metadata filter for the responses. This is a query parameter used to select
             * responses.
             */
            metadata?: unknown | null;
            /**
             * The name of the model to find responses for. This is a query parameter used to
             * select responses.
             */
            model?: string | null;
            /**
             * Optional reasoning effort parameter. This is a query parameter used to select
             * responses.
             */
            reasoning_effort?: Shared.ReasoningEffort | null;
            /**
             * Sampling temperature. This is a query parameter used to select responses.
             */
            temperature?: number | null;
            /**
             * List of tool names. This is a query parameter used to select responses.
             */
            tools?: Array<string> | null;
            /**
             * Nucleus sampling parameter. This is a query parameter used to select responses.
             */
            top_p?: number | null;
            /**
             * List of user identifiers. This is a query parameter used to select responses.
             */
            users?: Array<string> | null;
        }
        interface Template {
            /**
             * A list of chat messages forming the prompt or context. May include variable
             * references to the `item` namespace, ie {{item.name}}.
             */
            template: Array<Template.ChatMessage | Template.EvalItem>;
            /**
             * The type of input messages. Always `template`.
             */
            type: 'template';
        }
        namespace Template {
            interface ChatMessage {
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * The role of the message (e.g. "system", "assistant", "user").
                 */
                role: string;
            }
            /**
             * A message input to the model with a role indicating instruction following
             * hierarchy. Instructions given with the `developer` or `system` role take
             * precedence over instructions given with the `user` role. Messages with the
             * `assistant` role are presumed to have been generated by the model in previous
             * interactions.
             */
            interface EvalItem {
                /**
                 * Text inputs to the model - can contain template strings.
                 */
                content: string | ResponsesAPI.ResponseInputText | EvalItem.OutputText;
                /**
                 * The role of the message input. One of `user`, `assistant`, `system`, or
                 * `developer`.
                 */
                role: 'user' | 'assistant' | 'system' | 'developer';
                /**
                 * The type of the message input. Always `message`.
                 */
                type?: 'message';
            }
            namespace EvalItem {
                /**
                 * A text output from the model.
                 */
                interface OutputText {
                    /**
                     * The text output from the model.
                     */
                    text: string;
                    /**
                     * The type of the output text. Always `output_text`.
                     */
                    type: 'output_text';
                }
            }
        }
        interface ItemReference {
            /**
             * A reference to a variable in the `item` namespace. Ie, "item.name"
             */
            item_reference: string;
            /**
             * The type of input messages. Always `item_reference`.
             */
            type: 'item_reference';
        }
        interface SamplingParams {
            /**
             * The maximum number of tokens in the generated output.
             */
            max_completion_tokens?: number;
            /**
             * A seed value to initialize the randomness, during sampling.
             */
            seed?: number;
            /**
             * A higher temperature increases randomness in the outputs.
             */
            temperature?: number;
            /**
             * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
             */
            top_p?: number;
        }
    }
    interface PerModelUsage {
        /**
         * The number of tokens retrieved from cache.
         */
        cached_tokens: number;
        /**
         * The number of completion tokens generated.
         */
        completion_tokens: number;
        /**
         * The number of invocations.
         */
        invocation_count: number;
        /**
         * The name of the model.
         */
        model_name: string;
        /**
         * The number of prompt tokens used.
         */
        prompt_tokens: number;
        /**
         * The total number of tokens used.
         */
        total_tokens: number;
    }
    interface PerTestingCriteriaResult {
        /**
         * Number of tests failed for this criteria.
         */
        failed: number;
        /**
         * Number of tests passed for this criteria.
         */
        passed: number;
        /**
         * A description of the testing criteria.
         */
        testing_criteria: string;
    }
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    interface ResultCounts {
        /**
         * Number of output items that resulted in an error.
         */
        errored: number;
        /**
         * Number of output items that failed to pass the evaluation.
         */
        failed: number;
        /**
         * Number of output items that passed the evaluation.
         */
        passed: number;
        /**
         * Total number of executed output items.
         */
        total: number;
    }
}
/**
 * A schema representing an evaluation run.
 */
export interface RunListResponse {
    /**
     * Unique identifier for the evaluation run.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the evaluation run was created.
     */
    created_at: number;
    /**
     * Information about the run's data source.
     */
    data_source: CreateEvalJSONLRunDataSource | CreateEvalCompletionsRunDataSource | RunListResponse.Responses;
    /**
     * An object representing an error response from the Eval API.
     */
    error: EvalAPIError;
    /**
     * The identifier of the associated evaluation.
     */
    eval_id: string;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata: Shared.Metadata | null;
    /**
     * The model that is evaluated, if applicable.
     */
    model: string;
    /**
     * The name of the evaluation run.
     */
    name: string;
    /**
     * The type of the object. Always "eval.run".
     */
    object: 'eval.run';
    /**
     * Usage statistics for each model during the evaluation run.
     */
    per_model_usage: Array<RunListResponse.PerModelUsage>;
    /**
     * Results per testing criteria applied during the evaluation run.
     */
    per_testing_criteria_results: Array<RunListResponse.PerTestingCriteriaResult>;
    /**
     * The URL to the rendered evaluation run report on the UI dashboard.
     */
    report_url: string;
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    result_counts: RunListResponse.ResultCounts;
    /**
     * The status of the evaluation run.
     */
    status: string;
}
export declare namespace RunListResponse {
    /**
     * A ResponsesRunDataSource object describing a model sampling configuration.
     */
    interface Responses {
        /**
         * Determines what populates the `item` namespace in this run's data source.
         */
        source: Responses.FileContent | Responses.FileID | Responses.Responses;
        /**
         * The type of run data source. Always `responses`.
         */
        type: 'responses';
        /**
         * Used when sampling from a model. Dictates the structure of the messages passed
         * into the model. Can either be a reference to a prebuilt trajectory (ie,
         * `item.input_trajectory`), or a template with variable references to the `item`
         * namespace.
         */
        input_messages?: Responses.Template | Responses.ItemReference;
        /**
         * The name of the model to use for generating completions (e.g. "o3-mini").
         */
        model?: string;
        sampling_params?: Responses.SamplingParams;
    }
    namespace Responses {
        interface FileContent {
            /**
             * The content of the jsonl file.
             */
            content: Array<FileContent.Content>;
            /**
             * The type of jsonl source. Always `file_content`.
             */
            type: 'file_content';
        }
        namespace FileContent {
            interface Content {
                item: Record<string, unknown>;
                sample?: Record<string, unknown>;
            }
        }
        interface FileID {
            /**
             * The identifier of the file.
             */
            id: string;
            /**
             * The type of jsonl source. Always `file_id`.
             */
            type: 'file_id';
        }
        /**
         * A EvalResponsesSource object describing a run data source configuration.
         */
        interface Responses {
            /**
             * The type of run data source. Always `responses`.
             */
            type: 'responses';
            /**
             * Only include items created after this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_after?: number | null;
            /**
             * Only include items created before this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_before?: number | null;
            /**
             * Optional string to search the 'instructions' field. This is a query parameter
             * used to select responses.
             */
            instructions_search?: string | null;
            /**
             * Metadata filter for the responses. This is a query parameter used to select
             * responses.
             */
            metadata?: unknown | null;
            /**
             * The name of the model to find responses for. This is a query parameter used to
             * select responses.
             */
            model?: string | null;
            /**
             * Optional reasoning effort parameter. This is a query parameter used to select
             * responses.
             */
            reasoning_effort?: Shared.ReasoningEffort | null;
            /**
             * Sampling temperature. This is a query parameter used to select responses.
             */
            temperature?: number | null;
            /**
             * List of tool names. This is a query parameter used to select responses.
             */
            tools?: Array<string> | null;
            /**
             * Nucleus sampling parameter. This is a query parameter used to select responses.
             */
            top_p?: number | null;
            /**
             * List of user identifiers. This is a query parameter used to select responses.
             */
            users?: Array<string> | null;
        }
        interface Template {
            /**
             * A list of chat messages forming the prompt or context. May include variable
             * references to the `item` namespace, ie {{item.name}}.
             */
            template: Array<Template.ChatMessage | Template.EvalItem>;
            /**
             * The type of input messages. Always `template`.
             */
            type: 'template';
        }
        namespace Template {
            interface ChatMessage {
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * The role of the message (e.g. "system", "assistant", "user").
                 */
                role: string;
            }
            /**
             * A message input to the model with a role indicating instruction following
             * hierarchy. Instructions given with the `developer` or `system` role take
             * precedence over instructions given with the `user` role. Messages with the
             * `assistant` role are presumed to have been generated by the model in previous
             * interactions.
             */
            interface EvalItem {
                /**
                 * Text inputs to the model - can contain template strings.
                 */
                content: string | ResponsesAPI.ResponseInputText | EvalItem.OutputText;
                /**
                 * The role of the message input. One of `user`, `assistant`, `system`, or
                 * `developer`.
                 */
                role: 'user' | 'assistant' | 'system' | 'developer';
                /**
                 * The type of the message input. Always `message`.
                 */
                type?: 'message';
            }
            namespace EvalItem {
                /**
                 * A text output from the model.
                 */
                interface OutputText {
                    /**
                     * The text output from the model.
                     */
                    text: string;
                    /**
                     * The type of the output text. Always `output_text`.
                     */
                    type: 'output_text';
                }
            }
        }
        interface ItemReference {
            /**
             * A reference to a variable in the `item` namespace. Ie, "item.name"
             */
            item_reference: string;
            /**
             * The type of input messages. Always `item_reference`.
             */
            type: 'item_reference';
        }
        interface SamplingParams {
            /**
             * The maximum number of tokens in the generated output.
             */
            max_completion_tokens?: number;
            /**
             * A seed value to initialize the randomness, during sampling.
             */
            seed?: number;
            /**
             * A higher temperature increases randomness in the outputs.
             */
            temperature?: number;
            /**
             * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
             */
            top_p?: number;
        }
    }
    interface PerModelUsage {
        /**
         * The number of tokens retrieved from cache.
         */
        cached_tokens: number;
        /**
         * The number of completion tokens generated.
         */
        completion_tokens: number;
        /**
         * The number of invocations.
         */
        invocation_count: number;
        /**
         * The name of the model.
         */
        model_name: string;
        /**
         * The number of prompt tokens used.
         */
        prompt_tokens: number;
        /**
         * The total number of tokens used.
         */
        total_tokens: number;
    }
    interface PerTestingCriteriaResult {
        /**
         * Number of tests failed for this criteria.
         */
        failed: number;
        /**
         * Number of tests passed for this criteria.
         */
        passed: number;
        /**
         * A description of the testing criteria.
         */
        testing_criteria: string;
    }
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    interface ResultCounts {
        /**
         * Number of output items that resulted in an error.
         */
        errored: number;
        /**
         * Number of output items that failed to pass the evaluation.
         */
        failed: number;
        /**
         * Number of output items that passed the evaluation.
         */
        passed: number;
        /**
         * Total number of executed output items.
         */
        total: number;
    }
}
export interface RunDeleteResponse {
    deleted?: boolean;
    object?: string;
    run_id?: string;
}
/**
 * A schema representing an evaluation run.
 */
export interface RunCancelResponse {
    /**
     * Unique identifier for the evaluation run.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) when the evaluation run was created.
     */
    created_at: number;
    /**
     * Information about the run's data source.
     */
    data_source: CreateEvalJSONLRunDataSource | CreateEvalCompletionsRunDataSource | RunCancelResponse.Responses;
    /**
     * An object representing an error response from the Eval API.
     */
    error: EvalAPIError;
    /**
     * The identifier of the associated evaluation.
     */
    eval_id: string;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata: Shared.Metadata | null;
    /**
     * The model that is evaluated, if applicable.
     */
    model: string;
    /**
     * The name of the evaluation run.
     */
    name: string;
    /**
     * The type of the object. Always "eval.run".
     */
    object: 'eval.run';
    /**
     * Usage statistics for each model during the evaluation run.
     */
    per_model_usage: Array<RunCancelResponse.PerModelUsage>;
    /**
     * Results per testing criteria applied during the evaluation run.
     */
    per_testing_criteria_results: Array<RunCancelResponse.PerTestingCriteriaResult>;
    /**
     * The URL to the rendered evaluation run report on the UI dashboard.
     */
    report_url: string;
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    result_counts: RunCancelResponse.ResultCounts;
    /**
     * The status of the evaluation run.
     */
    status: string;
}
export declare namespace RunCancelResponse {
    /**
     * A ResponsesRunDataSource object describing a model sampling configuration.
     */
    interface Responses {
        /**
         * Determines what populates the `item` namespace in this run's data source.
         */
        source: Responses.FileContent | Responses.FileID | Responses.Responses;
        /**
         * The type of run data source. Always `responses`.
         */
        type: 'responses';
        /**
         * Used when sampling from a model. Dictates the structure of the messages passed
         * into the model. Can either be a reference to a prebuilt trajectory (ie,
         * `item.input_trajectory`), or a template with variable references to the `item`
         * namespace.
         */
        input_messages?: Responses.Template | Responses.ItemReference;
        /**
         * The name of the model to use for generating completions (e.g. "o3-mini").
         */
        model?: string;
        sampling_params?: Responses.SamplingParams;
    }
    namespace Responses {
        interface FileContent {
            /**
             * The content of the jsonl file.
             */
            content: Array<FileContent.Content>;
            /**
             * The type of jsonl source. Always `file_content`.
             */
            type: 'file_content';
        }
        namespace FileContent {
            interface Content {
                item: Record<string, unknown>;
                sample?: Record<string, unknown>;
            }
        }
        interface FileID {
            /**
             * The identifier of the file.
             */
            id: string;
            /**
             * The type of jsonl source. Always `file_id`.
             */
            type: 'file_id';
        }
        /**
         * A EvalResponsesSource object describing a run data source configuration.
         */
        interface Responses {
            /**
             * The type of run data source. Always `responses`.
             */
            type: 'responses';
            /**
             * Only include items created after this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_after?: number | null;
            /**
             * Only include items created before this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_before?: number | null;
            /**
             * Optional string to search the 'instructions' field. This is a query parameter
             * used to select responses.
             */
            instructions_search?: string | null;
            /**
             * Metadata filter for the responses. This is a query parameter used to select
             * responses.
             */
            metadata?: unknown | null;
            /**
             * The name of the model to find responses for. This is a query parameter used to
             * select responses.
             */
            model?: string | null;
            /**
             * Optional reasoning effort parameter. This is a query parameter used to select
             * responses.
             */
            reasoning_effort?: Shared.ReasoningEffort | null;
            /**
             * Sampling temperature. This is a query parameter used to select responses.
             */
            temperature?: number | null;
            /**
             * List of tool names. This is a query parameter used to select responses.
             */
            tools?: Array<string> | null;
            /**
             * Nucleus sampling parameter. This is a query parameter used to select responses.
             */
            top_p?: number | null;
            /**
             * List of user identifiers. This is a query parameter used to select responses.
             */
            users?: Array<string> | null;
        }
        interface Template {
            /**
             * A list of chat messages forming the prompt or context. May include variable
             * references to the `item` namespace, ie {{item.name}}.
             */
            template: Array<Template.ChatMessage | Template.EvalItem>;
            /**
             * The type of input messages. Always `template`.
             */
            type: 'template';
        }
        namespace Template {
            interface ChatMessage {
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * The role of the message (e.g. "system", "assistant", "user").
                 */
                role: string;
            }
            /**
             * A message input to the model with a role indicating instruction following
             * hierarchy. Instructions given with the `developer` or `system` role take
             * precedence over instructions given with the `user` role. Messages with the
             * `assistant` role are presumed to have been generated by the model in previous
             * interactions.
             */
            interface EvalItem {
                /**
                 * Text inputs to the model - can contain template strings.
                 */
                content: string | ResponsesAPI.ResponseInputText | EvalItem.OutputText;
                /**
                 * The role of the message input. One of `user`, `assistant`, `system`, or
                 * `developer`.
                 */
                role: 'user' | 'assistant' | 'system' | 'developer';
                /**
                 * The type of the message input. Always `message`.
                 */
                type?: 'message';
            }
            namespace EvalItem {
                /**
                 * A text output from the model.
                 */
                interface OutputText {
                    /**
                     * The text output from the model.
                     */
                    text: string;
                    /**
                     * The type of the output text. Always `output_text`.
                     */
                    type: 'output_text';
                }
            }
        }
        interface ItemReference {
            /**
             * A reference to a variable in the `item` namespace. Ie, "item.name"
             */
            item_reference: string;
            /**
             * The type of input messages. Always `item_reference`.
             */
            type: 'item_reference';
        }
        interface SamplingParams {
            /**
             * The maximum number of tokens in the generated output.
             */
            max_completion_tokens?: number;
            /**
             * A seed value to initialize the randomness, during sampling.
             */
            seed?: number;
            /**
             * A higher temperature increases randomness in the outputs.
             */
            temperature?: number;
            /**
             * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
             */
            top_p?: number;
        }
    }
    interface PerModelUsage {
        /**
         * The number of tokens retrieved from cache.
         */
        cached_tokens: number;
        /**
         * The number of completion tokens generated.
         */
        completion_tokens: number;
        /**
         * The number of invocations.
         */
        invocation_count: number;
        /**
         * The name of the model.
         */
        model_name: string;
        /**
         * The number of prompt tokens used.
         */
        prompt_tokens: number;
        /**
         * The total number of tokens used.
         */
        total_tokens: number;
    }
    interface PerTestingCriteriaResult {
        /**
         * Number of tests failed for this criteria.
         */
        failed: number;
        /**
         * Number of tests passed for this criteria.
         */
        passed: number;
        /**
         * A description of the testing criteria.
         */
        testing_criteria: string;
    }
    /**
     * Counters summarizing the outcomes of the evaluation run.
     */
    interface ResultCounts {
        /**
         * Number of output items that resulted in an error.
         */
        errored: number;
        /**
         * Number of output items that failed to pass the evaluation.
         */
        failed: number;
        /**
         * Number of output items that passed the evaluation.
         */
        passed: number;
        /**
         * Total number of executed output items.
         */
        total: number;
    }
}
export interface RunCreateParams {
    /**
     * Details about the run's data source.
     */
    data_source: CreateEvalJSONLRunDataSource | CreateEvalCompletionsRunDataSource | RunCreateParams.CreateEvalResponsesRunDataSource;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata?: Shared.Metadata | null;
    /**
     * The name of the run.
     */
    name?: string;
}
export declare namespace RunCreateParams {
    /**
     * A ResponsesRunDataSource object describing a model sampling configuration.
     */
    interface CreateEvalResponsesRunDataSource {
        /**
         * Determines what populates the `item` namespace in this run's data source.
         */
        source: CreateEvalResponsesRunDataSource.FileContent | CreateEvalResponsesRunDataSource.FileID | CreateEvalResponsesRunDataSource.Responses;
        /**
         * The type of run data source. Always `responses`.
         */
        type: 'responses';
        /**
         * Used when sampling from a model. Dictates the structure of the messages passed
         * into the model. Can either be a reference to a prebuilt trajectory (ie,
         * `item.input_trajectory`), or a template with variable references to the `item`
         * namespace.
         */
        input_messages?: CreateEvalResponsesRunDataSource.Template | CreateEvalResponsesRunDataSource.ItemReference;
        /**
         * The name of the model to use for generating completions (e.g. "o3-mini").
         */
        model?: string;
        sampling_params?: CreateEvalResponsesRunDataSource.SamplingParams;
    }
    namespace CreateEvalResponsesRunDataSource {
        interface FileContent {
            /**
             * The content of the jsonl file.
             */
            content: Array<FileContent.Content>;
            /**
             * The type of jsonl source. Always `file_content`.
             */
            type: 'file_content';
        }
        namespace FileContent {
            interface Content {
                item: Record<string, unknown>;
                sample?: Record<string, unknown>;
            }
        }
        interface FileID {
            /**
             * The identifier of the file.
             */
            id: string;
            /**
             * The type of jsonl source. Always `file_id`.
             */
            type: 'file_id';
        }
        /**
         * A EvalResponsesSource object describing a run data source configuration.
         */
        interface Responses {
            /**
             * The type of run data source. Always `responses`.
             */
            type: 'responses';
            /**
             * Only include items created after this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_after?: number | null;
            /**
             * Only include items created before this timestamp (inclusive). This is a query
             * parameter used to select responses.
             */
            created_before?: number | null;
            /**
             * Optional string to search the 'instructions' field. This is a query parameter
             * used to select responses.
             */
            instructions_search?: string | null;
            /**
             * Metadata filter for the responses. This is a query parameter used to select
             * responses.
             */
            metadata?: unknown | null;
            /**
             * The name of the model to find responses for. This is a query parameter used to
             * select responses.
             */
            model?: string | null;
            /**
             * Optional reasoning effort parameter. This is a query parameter used to select
             * responses.
             */
            reasoning_effort?: Shared.ReasoningEffort | null;
            /**
             * Sampling temperature. This is a query parameter used to select responses.
             */
            temperature?: number | null;
            /**
             * List of tool names. This is a query parameter used to select responses.
             */
            tools?: Array<string> | null;
            /**
             * Nucleus sampling parameter. This is a query parameter used to select responses.
             */
            top_p?: number | null;
            /**
             * List of user identifiers. This is a query parameter used to select responses.
             */
            users?: Array<string> | null;
        }
        interface Template {
            /**
             * A list of chat messages forming the prompt or context. May include variable
             * references to the `item` namespace, ie {{item.name}}.
             */
            template: Array<Template.ChatMessage | Template.EvalItem>;
            /**
             * The type of input messages. Always `template`.
             */
            type: 'template';
        }
        namespace Template {
            interface ChatMessage {
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * The role of the message (e.g. "system", "assistant", "user").
                 */
                role: string;
            }
            /**
             * A message input to the model with a role indicating instruction following
             * hierarchy. Instructions given with the `developer` or `system` role take
             * precedence over instructions given with the `user` role. Messages with the
             * `assistant` role are presumed to have been generated by the model in previous
             * interactions.
             */
            interface EvalItem {
                /**
                 * Text inputs to the model - can contain template strings.
                 */
                content: string | ResponsesAPI.ResponseInputText | EvalItem.OutputText;
                /**
                 * The role of the message input. One of `user`, `assistant`, `system`, or
                 * `developer`.
                 */
                role: 'user' | 'assistant' | 'system' | 'developer';
                /**
                 * The type of the message input. Always `message`.
                 */
                type?: 'message';
            }
            namespace EvalItem {
                /**
                 * A text output from the model.
                 */
                interface OutputText {
                    /**
                     * The text output from the model.
                     */
                    text: string;
                    /**
                     * The type of the output text. Always `output_text`.
                     */
                    type: 'output_text';
                }
            }
        }
        interface ItemReference {
            /**
             * A reference to a variable in the `item` namespace. Ie, "item.name"
             */
            item_reference: string;
            /**
             * The type of input messages. Always `item_reference`.
             */
            type: 'item_reference';
        }
        interface SamplingParams {
            /**
             * The maximum number of tokens in the generated output.
             */
            max_completion_tokens?: number;
            /**
             * A seed value to initialize the randomness, during sampling.
             */
            seed?: number;
            /**
             * A higher temperature increases randomness in the outputs.
             */
            temperature?: number;
            /**
             * An alternative to temperature for nucleus sampling; 1.0 includes all tokens.
             */
            top_p?: number;
        }
    }
}
export interface RunListParams extends CursorPageParams {
    /**
     * Sort order for runs by timestamp. Use `asc` for ascending order or `desc` for
     * descending order. Defaults to `asc`.
     */
    order?: 'asc' | 'desc';
    /**
     * Filter runs by status. One of `queued` | `in_progress` | `failed` | `completed`
     * | `canceled`.
     */
    status?: 'queued' | 'in_progress' | 'completed' | 'canceled' | 'failed';
}
export declare namespace Runs {
    export { type CreateEvalCompletionsRunDataSource as CreateEvalCompletionsRunDataSource, type CreateEvalJSONLRunDataSource as CreateEvalJSONLRunDataSource, type EvalAPIError as EvalAPIError, type RunCreateResponse as RunCreateResponse, type RunRetrieveResponse as RunRetrieveResponse, type RunListResponse as RunListResponse, type RunDeleteResponse as RunDeleteResponse, type RunCancelResponse as RunCancelResponse, RunListResponsesPage as RunListResponsesPage, type RunCreateParams as RunCreateParams, type RunListParams as RunListParams, };
    export { OutputItems as OutputItems, type OutputItemRetrieveResponse as OutputItemRetrieveResponse, type OutputItemListResponse as OutputItemListResponse, OutputItemListResponsesPage as OutputItemListResponsesPage, type OutputItemListParams as OutputItemListParams, };
}
//# sourceMappingURL=runs.d.ts.map