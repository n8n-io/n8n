// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../resource';
import { isRequestOptions } from '../../../../core';
import { APIPromise } from '../../../../core';
import * as Core from '../../../../core';
import { AssistantStream, RunCreateParamsBaseStream } from '../../../../lib/AssistantStream';
import { sleep } from '../../../../core';
import { RunSubmitToolOutputsParamsStream } from '../../../../lib/AssistantStream';
import * as RunsAPI from './runs';
import * as Shared from '../../../shared';
import * as AssistantsAPI from '../../assistants';
import * as MessagesAPI from '../messages';
import * as ThreadsAPI from '../threads';
import * as StepsAPI from './steps';
import {
  CodeInterpreterLogs,
  CodeInterpreterOutputImage,
  CodeInterpreterToolCall,
  CodeInterpreterToolCallDelta,
  FileSearchToolCall,
  FileSearchToolCallDelta,
  FunctionToolCall,
  FunctionToolCallDelta,
  MessageCreationStepDetails,
  RunStep,
  RunStepDelta,
  RunStepDeltaEvent,
  RunStepDeltaMessageDelta,
  RunStepInclude,
  RunStepsPage,
  StepListParams,
  StepRetrieveParams,
  Steps,
  ToolCall,
  ToolCallDelta,
  ToolCallDeltaObject,
  ToolCallsStepDetails,
} from './steps';
import { CursorPage, type CursorPageParams } from '../../../../pagination';
import { Stream } from '../../../../streaming';

/**
 * @deprecated The Assistants API is deprecated in favor of the Responses API
 */
export class Runs extends APIResource {
  steps: StepsAPI.Steps = new StepsAPI.Steps(this._client);

  /**
   * Create a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(
    threadId: string,
    params: RunCreateParamsNonStreaming,
    options?: Core.RequestOptions,
  ): APIPromise<Run>;
  create(
    threadId: string,
    params: RunCreateParamsStreaming,
    options?: Core.RequestOptions,
  ): APIPromise<Stream<AssistantsAPI.AssistantStreamEvent>>;
  create(
    threadId: string,
    params: RunCreateParamsBase,
    options?: Core.RequestOptions,
  ): APIPromise<Stream<AssistantsAPI.AssistantStreamEvent> | Run>;
  create(
    threadId: string,
    params: RunCreateParams,
    options?: Core.RequestOptions,
  ): APIPromise<Run> | APIPromise<Stream<AssistantsAPI.AssistantStreamEvent>> {
    const { include, ...body } = params;
    return this._client.post(`/threads/${threadId}/runs`, {
      query: { include },
      body,
      ...options,
      headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
      stream: params.stream ?? false,
    }) as APIPromise<Run> | APIPromise<Stream<AssistantsAPI.AssistantStreamEvent>>;
  }

  /**
   * Retrieves a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadId: string, runId: string, options?: Core.RequestOptions): Core.APIPromise<Run> {
    return this._client.get(`/threads/${threadId}/runs/${runId}`, {
      ...options,
      headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
    });
  }

  /**
   * Modifies a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(
    threadId: string,
    runId: string,
    body: RunUpdateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Run> {
    return this._client.post(`/threads/${threadId}/runs/${runId}`, {
      body,
      ...options,
      headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
    });
  }

  /**
   * Returns a list of runs belonging to a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(
    threadId: string,
    query?: RunListParams,
    options?: Core.RequestOptions,
  ): Core.PagePromise<RunsPage, Run>;
  list(threadId: string, options?: Core.RequestOptions): Core.PagePromise<RunsPage, Run>;
  list(
    threadId: string,
    query: RunListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.PagePromise<RunsPage, Run> {
    if (isRequestOptions(query)) {
      return this.list(threadId, {}, query);
    }
    return this._client.getAPIList(`/threads/${threadId}/runs`, RunsPage, {
      query,
      ...options,
      headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
    });
  }

  /**
   * Cancels a run that is `in_progress`.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  cancel(threadId: string, runId: string, options?: Core.RequestOptions): Core.APIPromise<Run> {
    return this._client.post(`/threads/${threadId}/runs/${runId}/cancel`, {
      ...options,
      headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
    });
  }

  /**
   * A helper to create a run an poll for a terminal state. More information on Run
   * lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndPoll(
    threadId: string,
    body: RunCreateParamsNonStreaming,
    options?: Core.RequestOptions & { pollIntervalMs?: number },
  ): Promise<Run> {
    const run = await this.create(threadId, body, options);
    return await this.poll(threadId, run.id, options);
  }

  /**
   * Create a Run stream
   *
   * @deprecated use `stream` instead
   */
  createAndStream(
    threadId: string,
    body: RunCreateParamsBaseStream,
    options?: Core.RequestOptions,
  ): AssistantStream {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }

  /**
   * A helper to poll a run status until it reaches a terminal state. More
   * information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async poll(
    threadId: string,
    runId: string,
    options?: Core.RequestOptions & { pollIntervalMs?: number },
  ): Promise<Run> {
    const headers: { [key: string]: string } = { ...options?.headers, 'X-Stainless-Poll-Helper': 'true' };

    if (options?.pollIntervalMs) {
      headers['X-Stainless-Custom-Poll-Interval'] = options.pollIntervalMs.toString();
    }

    while (true) {
      const { data: run, response } = await this.retrieve(threadId, runId, {
        ...options,
        headers: { ...options?.headers, ...headers },
      }).withResponse();

      switch (run.status) {
        //If we are in any sort of intermediate state we poll
        case 'queued':
        case 'in_progress':
        case 'cancelling':
          let sleepInterval = 5000;

          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get('openai-poll-after-ms');
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        //We return the run in any terminal state.
        case 'requires_action':
        case 'incomplete':
        case 'cancelled':
        case 'completed':
        case 'failed':
        case 'expired':
          return run;
      }
    }
  }

  /**
   * Create a Run stream
   */
  stream(threadId: string, body: RunCreateParamsBaseStream, options?: Core.RequestOptions): AssistantStream {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }

  /**
   * When a run has the `status: "requires_action"` and `required_action.type` is
   * `submit_tool_outputs`, this endpoint can be used to submit the outputs from the
   * tool calls once they're all completed. All outputs must be submitted in a single
   * request.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  submitToolOutputs(
    threadId: string,
    runId: string,
    body: RunSubmitToolOutputsParamsNonStreaming,
    options?: Core.RequestOptions,
  ): APIPromise<Run>;
  submitToolOutputs(
    threadId: string,
    runId: string,
    body: RunSubmitToolOutputsParamsStreaming,
    options?: Core.RequestOptions,
  ): APIPromise<Stream<AssistantsAPI.AssistantStreamEvent>>;
  submitToolOutputs(
    threadId: string,
    runId: string,
    body: RunSubmitToolOutputsParamsBase,
    options?: Core.RequestOptions,
  ): APIPromise<Stream<AssistantsAPI.AssistantStreamEvent> | Run>;
  submitToolOutputs(
    threadId: string,
    runId: string,
    body: RunSubmitToolOutputsParams,
    options?: Core.RequestOptions,
  ): APIPromise<Run> | APIPromise<Stream<AssistantsAPI.AssistantStreamEvent>> {
    return this._client.post(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
      body,
      ...options,
      headers: { 'OpenAI-Beta': 'assistants=v2', ...options?.headers },
      stream: body.stream ?? false,
    }) as APIPromise<Run> | APIPromise<Stream<AssistantsAPI.AssistantStreamEvent>>;
  }

  /**
   * A helper to submit a tool output to a run and poll for a terminal run state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async submitToolOutputsAndPoll(
    threadId: string,
    runId: string,
    body: RunSubmitToolOutputsParamsNonStreaming,
    options?: Core.RequestOptions & { pollIntervalMs?: number },
  ): Promise<Run> {
    const run = await this.submitToolOutputs(threadId, runId, body, options);
    return await this.poll(threadId, run.id, options);
  }

  /**
   * Submit the tool outputs from a previous run and stream the run to a terminal
   * state. More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  submitToolOutputsStream(
    threadId: string,
    runId: string,
    body: RunSubmitToolOutputsParamsStream,
    options?: Core.RequestOptions,
  ): AssistantStream {
    return AssistantStream.createToolAssistantStream(
      threadId,
      runId,
      this._client.beta.threads.runs,
      body,
      options,
    );
  }
}

export class RunsPage extends CursorPage<Run> {}

/**
 * Tool call objects
 */
export interface RequiredActionFunctionToolCall {
  /**
   * The ID of the tool call. This ID must be referenced when you submit the tool
   * outputs in using the
   * [Submit tool outputs to run](https://platform.openai.com/docs/api-reference/runs/submitToolOutputs)
   * endpoint.
   */
  id: string;

  /**
   * The function definition.
   */
  function: RequiredActionFunctionToolCall.Function;

  /**
   * The type of tool call the output is required for. For now, this is always
   * `function`.
   */
  type: 'function';
}

export namespace RequiredActionFunctionToolCall {
  /**
   * The function definition.
   */
  export interface Function {
    /**
     * The arguments that the model expects you to pass to the function.
     */
    arguments: string;

    /**
     * The name of the function.
     */
    name: string;
  }
}

/**
 * Represents an execution run on a
 * [thread](https://platform.openai.com/docs/api-reference/threads).
 */
export interface Run {
  /**
   * The identifier, which can be referenced in API endpoints.
   */
  id: string;

  /**
   * The ID of the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) used for
   * execution of this run.
   */
  assistant_id: string;

  /**
   * The Unix timestamp (in seconds) for when the run was cancelled.
   */
  cancelled_at: number | null;

  /**
   * The Unix timestamp (in seconds) for when the run was completed.
   */
  completed_at: number | null;

  /**
   * The Unix timestamp (in seconds) for when the run was created.
   */
  created_at: number;

  /**
   * The Unix timestamp (in seconds) for when the run will expire.
   */
  expires_at: number | null;

  /**
   * The Unix timestamp (in seconds) for when the run failed.
   */
  failed_at: number | null;

  /**
   * Details on why the run is incomplete. Will be `null` if the run is not
   * incomplete.
   */
  incomplete_details: Run.IncompleteDetails | null;

  /**
   * The instructions that the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) used for
   * this run.
   */
  instructions: string;

  /**
   * The last error associated with this run. Will be `null` if there are no errors.
   */
  last_error: Run.LastError | null;

  /**
   * The maximum number of completion tokens specified to have been used over the
   * course of the run.
   */
  max_completion_tokens: number | null;

  /**
   * The maximum number of prompt tokens specified to have been used over the course
   * of the run.
   */
  max_prompt_tokens: number | null;

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
   * The model that the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) used for
   * this run.
   */
  model: string;

  /**
   * The object type, which is always `thread.run`.
   */
  object: 'thread.run';

  /**
   * Whether to enable
   * [parallel function calling](https://platform.openai.com/docs/guides/function-calling#configuring-parallel-function-calling)
   * during tool use.
   */
  parallel_tool_calls: boolean;

  /**
   * Details on the action required to continue the run. Will be `null` if no action
   * is required.
   */
  required_action: Run.RequiredAction | null;

  /**
   * Specifies the format that the model must output. Compatible with
   * [GPT-4o](https://platform.openai.com/docs/models#gpt-4o),
   * [GPT-4 Turbo](https://platform.openai.com/docs/models#gpt-4-turbo-and-gpt-4),
   * and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
   *
   * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables Structured
   * Outputs which ensures the model will match your supplied JSON schema. Learn more
   * in the
   * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
   *
   * Setting to `{ "type": "json_object" }` enables JSON mode, which ensures the
   * message the model generates is valid JSON.
   *
   * **Important:** when using JSON mode, you **must** also instruct the model to
   * produce JSON yourself via a system or user message. Without this, the model may
   * generate an unending stream of whitespace until the generation reaches the token
   * limit, resulting in a long-running and seemingly "stuck" request. Also note that
   * the message content may be partially cut off if `finish_reason="length"`, which
   * indicates the generation exceeded `max_tokens` or the conversation exceeded the
   * max context length.
   */
  response_format: ThreadsAPI.AssistantResponseFormatOption | null;

  /**
   * The Unix timestamp (in seconds) for when the run was started.
   */
  started_at: number | null;

  /**
   * The status of the run, which can be either `queued`, `in_progress`,
   * `requires_action`, `cancelling`, `cancelled`, `failed`, `completed`,
   * `incomplete`, or `expired`.
   */
  status: RunStatus;

  /**
   * The ID of the [thread](https://platform.openai.com/docs/api-reference/threads)
   * that was executed on as a part of this run.
   */
  thread_id: string;

  /**
   * Controls which (if any) tool is called by the model. `none` means the model will
   * not call any tools and instead generates a message. `auto` is the default value
   * and means the model can pick between generating a message or calling one or more
   * tools. `required` means the model must call one or more tools before responding
   * to the user. Specifying a particular tool like `{"type": "file_search"}` or
   * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
   * call that tool.
   */
  tool_choice: ThreadsAPI.AssistantToolChoiceOption | null;

  /**
   * The list of tools that the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) used for
   * this run.
   */
  tools: Array<AssistantsAPI.AssistantTool>;

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  truncation_strategy: Run.TruncationStrategy | null;

  /**
   * Usage statistics related to the run. This value will be `null` if the run is not
   * in a terminal state (i.e. `in_progress`, `queued`, etc.).
   */
  usage: Run.Usage | null;

  /**
   * The sampling temperature used for this run. If not set, defaults to 1.
   */
  temperature?: number | null;

  /**
   * The nucleus sampling value used for this run. If not set, defaults to 1.
   */
  top_p?: number | null;
}

export namespace Run {
  /**
   * Details on why the run is incomplete. Will be `null` if the run is not
   * incomplete.
   */
  export interface IncompleteDetails {
    /**
     * The reason why the run is incomplete. This will point to which specific token
     * limit was reached over the course of the run.
     */
    reason?: 'max_completion_tokens' | 'max_prompt_tokens';
  }

  /**
   * The last error associated with this run. Will be `null` if there are no errors.
   */
  export interface LastError {
    /**
     * One of `server_error`, `rate_limit_exceeded`, or `invalid_prompt`.
     */
    code: 'server_error' | 'rate_limit_exceeded' | 'invalid_prompt';

    /**
     * A human-readable description of the error.
     */
    message: string;
  }

  /**
   * Details on the action required to continue the run. Will be `null` if no action
   * is required.
   */
  export interface RequiredAction {
    /**
     * Details on the tool outputs needed for this run to continue.
     */
    submit_tool_outputs: RequiredAction.SubmitToolOutputs;

    /**
     * For now, this is always `submit_tool_outputs`.
     */
    type: 'submit_tool_outputs';
  }

  export namespace RequiredAction {
    /**
     * Details on the tool outputs needed for this run to continue.
     */
    export interface SubmitToolOutputs {
      /**
       * A list of the relevant tool calls.
       */
      tool_calls: Array<RunsAPI.RequiredActionFunctionToolCall>;
    }
  }

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  export interface TruncationStrategy {
    /**
     * The truncation strategy to use for the thread. The default is `auto`. If set to
     * `last_messages`, the thread will be truncated to the n most recent messages in
     * the thread. When set to `auto`, messages in the middle of the thread will be
     * dropped to fit the context length of the model, `max_prompt_tokens`.
     */
    type: 'auto' | 'last_messages';

    /**
     * The number of most recent messages from the thread when constructing the context
     * for the run.
     */
    last_messages?: number | null;
  }

  /**
   * Usage statistics related to the run. This value will be `null` if the run is not
   * in a terminal state (i.e. `in_progress`, `queued`, etc.).
   */
  export interface Usage {
    /**
     * Number of completion tokens used over the course of the run.
     */
    completion_tokens: number;

    /**
     * Number of prompt tokens used over the course of the run.
     */
    prompt_tokens: number;

    /**
     * Total number of tokens used (prompt + completion).
     */
    total_tokens: number;
  }
}

/**
 * The status of the run, which can be either `queued`, `in_progress`,
 * `requires_action`, `cancelling`, `cancelled`, `failed`, `completed`,
 * `incomplete`, or `expired`.
 */
export type RunStatus =
  | 'queued'
  | 'in_progress'
  | 'requires_action'
  | 'cancelling'
  | 'cancelled'
  | 'failed'
  | 'completed'
  | 'incomplete'
  | 'expired';

export type RunCreateParams = RunCreateParamsNonStreaming | RunCreateParamsStreaming;

export interface RunCreateParamsBase {
  /**
   * Body param: The ID of the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) to use to
   * execute this run.
   */
  assistant_id: string;

  /**
   * Query param: A list of additional fields to include in the response. Currently
   * the only supported value is
   * `step_details.tool_calls[*].file_search.results[*].content` to fetch the file
   * search result content.
   *
   * See the
   * [file search tool documentation](https://platform.openai.com/docs/assistants/tools/file-search#customizing-file-search-settings)
   * for more information.
   */
  include?: Array<StepsAPI.RunStepInclude>;

  /**
   * Body param: Appends additional instructions at the end of the instructions for
   * the run. This is useful for modifying the behavior on a per-run basis without
   * overriding other instructions.
   */
  additional_instructions?: string | null;

  /**
   * Body param: Adds additional messages to the thread before creating the run.
   */
  additional_messages?: Array<RunCreateParams.AdditionalMessage> | null;

  /**
   * Body param: Overrides the
   * [instructions](https://platform.openai.com/docs/api-reference/assistants/createAssistant)
   * of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  instructions?: string | null;

  /**
   * Body param: The maximum number of completion tokens that may be used over the
   * course of the run. The run will make a best effort to use only the number of
   * completion tokens specified, across multiple turns of the run. If the run
   * exceeds the number of completion tokens specified, the run will end with status
   * `incomplete`. See `incomplete_details` for more info.
   */
  max_completion_tokens?: number | null;

  /**
   * Body param: The maximum number of prompt tokens that may be used over the course
   * of the run. The run will make a best effort to use only the number of prompt
   * tokens specified, across multiple turns of the run. If the run exceeds the
   * number of prompt tokens specified, the run will end with status `incomplete`.
   * See `incomplete_details` for more info.
   */
  max_prompt_tokens?: number | null;

  /**
   * Body param: Set of 16 key-value pairs that can be attached to an object. This
   * can be useful for storing additional information about the object in a
   * structured format, and querying for objects via API or the dashboard.
   *
   * Keys are strings with a maximum length of 64 characters. Values are strings with
   * a maximum length of 512 characters.
   */
  metadata?: Shared.Metadata | null;

  /**
   * Body param: The ID of the
   * [Model](https://platform.openai.com/docs/api-reference/models) to be used to
   * execute this run. If a value is provided here, it will override the model
   * associated with the assistant. If not, the model associated with the assistant
   * will be used.
   */
  model?: (string & {}) | Shared.ChatModel | null;

  /**
   * Body param: Whether to enable
   * [parallel function calling](https://platform.openai.com/docs/guides/function-calling#configuring-parallel-function-calling)
   * during tool use.
   */
  parallel_tool_calls?: boolean;

  /**
   * Body param: **o-series models only**
   *
   * Constrains effort on reasoning for
   * [reasoning models](https://platform.openai.com/docs/guides/reasoning). Currently
   * supported values are `low`, `medium`, and `high`. Reducing reasoning effort can
   * result in faster responses and fewer tokens used on reasoning in a response.
   */
  reasoning_effort?: Shared.ReasoningEffort | null;

  /**
   * Body param: Specifies the format that the model must output. Compatible with
   * [GPT-4o](https://platform.openai.com/docs/models#gpt-4o),
   * [GPT-4 Turbo](https://platform.openai.com/docs/models#gpt-4-turbo-and-gpt-4),
   * and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
   *
   * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables Structured
   * Outputs which ensures the model will match your supplied JSON schema. Learn more
   * in the
   * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
   *
   * Setting to `{ "type": "json_object" }` enables JSON mode, which ensures the
   * message the model generates is valid JSON.
   *
   * **Important:** when using JSON mode, you **must** also instruct the model to
   * produce JSON yourself via a system or user message. Without this, the model may
   * generate an unending stream of whitespace until the generation reaches the token
   * limit, resulting in a long-running and seemingly "stuck" request. Also note that
   * the message content may be partially cut off if `finish_reason="length"`, which
   * indicates the generation exceeded `max_tokens` or the conversation exceeded the
   * max context length.
   */
  response_format?: ThreadsAPI.AssistantResponseFormatOption | null;

  /**
   * Body param: If `true`, returns a stream of events that happen during the Run as
   * server-sent events, terminating when the Run enters a terminal state with a
   * `data: [DONE]` message.
   */
  stream?: boolean | null;

  /**
   * Body param: What sampling temperature to use, between 0 and 2. Higher values
   * like 0.8 will make the output more random, while lower values like 0.2 will make
   * it more focused and deterministic.
   */
  temperature?: number | null;

  /**
   * Body param: Controls which (if any) tool is called by the model. `none` means
   * the model will not call any tools and instead generates a message. `auto` is the
   * default value and means the model can pick between generating a message or
   * calling one or more tools. `required` means the model must call one or more
   * tools before responding to the user. Specifying a particular tool like
   * `{"type": "file_search"}` or
   * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
   * call that tool.
   */
  tool_choice?: ThreadsAPI.AssistantToolChoiceOption | null;

  /**
   * Body param: Override the tools the assistant can use for this run. This is
   * useful for modifying the behavior on a per-run basis.
   */
  tools?: Array<AssistantsAPI.AssistantTool> | null;

  /**
   * Body param: An alternative to sampling with temperature, called nucleus
   * sampling, where the model considers the results of the tokens with top_p
   * probability mass. So 0.1 means only the tokens comprising the top 10%
   * probability mass are considered.
   *
   * We generally recommend altering this or temperature but not both.
   */
  top_p?: number | null;

  /**
   * Body param: Controls for how a thread will be truncated prior to the run. Use
   * this to control the intial context window of the run.
   */
  truncation_strategy?: RunCreateParams.TruncationStrategy | null;
}

export namespace RunCreateParams {
  export interface AdditionalMessage {
    /**
     * The text contents of the message.
     */
    content: string | Array<MessagesAPI.MessageContentPartParam>;

    /**
     * The role of the entity that is creating the message. Allowed values include:
     *
     * - `user`: Indicates the message is sent by an actual user and should be used in
     *   most cases to represent user-generated messages.
     * - `assistant`: Indicates the message is generated by the assistant. Use this
     *   value to insert messages from the assistant into the conversation.
     */
    role: 'user' | 'assistant';

    /**
     * A list of files attached to the message, and the tools they should be added to.
     */
    attachments?: Array<AdditionalMessage.Attachment> | null;

    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata?: Shared.Metadata | null;
  }

  export namespace AdditionalMessage {
    export interface Attachment {
      /**
       * The ID of the file to attach to the message.
       */
      file_id?: string;

      /**
       * The tools to add this file to.
       */
      tools?: Array<AssistantsAPI.CodeInterpreterTool | Attachment.FileSearch>;
    }

    export namespace Attachment {
      export interface FileSearch {
        /**
         * The type of tool being defined: `file_search`
         */
        type: 'file_search';
      }
    }
  }

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  export interface TruncationStrategy {
    /**
     * The truncation strategy to use for the thread. The default is `auto`. If set to
     * `last_messages`, the thread will be truncated to the n most recent messages in
     * the thread. When set to `auto`, messages in the middle of the thread will be
     * dropped to fit the context length of the model, `max_prompt_tokens`.
     */
    type: 'auto' | 'last_messages';

    /**
     * The number of most recent messages from the thread when constructing the context
     * for the run.
     */
    last_messages?: number | null;
  }

  export type RunCreateParamsNonStreaming = RunsAPI.RunCreateParamsNonStreaming;
  export type RunCreateParamsStreaming = RunsAPI.RunCreateParamsStreaming;
}

export interface RunCreateParamsNonStreaming extends RunCreateParamsBase {
  /**
   * Body param: If `true`, returns a stream of events that happen during the Run as
   * server-sent events, terminating when the Run enters a terminal state with a
   * `data: [DONE]` message.
   */
  stream?: false | null;
}

export interface RunCreateParamsStreaming extends RunCreateParamsBase {
  /**
   * Body param: If `true`, returns a stream of events that happen during the Run as
   * server-sent events, terminating when the Run enters a terminal state with a
   * `data: [DONE]` message.
   */
  stream: true;
}

export interface RunUpdateParams {
  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be useful
   * for storing additional information about the object in a structured format, and
   * querying for objects via API or the dashboard.
   *
   * Keys are strings with a maximum length of 64 characters. Values are strings with
   * a maximum length of 512 characters.
   */
  metadata?: Shared.Metadata | null;
}

export interface RunListParams extends CursorPageParams {
  /**
   * A cursor for use in pagination. `before` is an object ID that defines your place
   * in the list. For instance, if you make a list request and receive 100 objects,
   * starting with obj_foo, your subsequent call can include before=obj_foo in order
   * to fetch the previous page of the list.
   */
  before?: string;

  /**
   * Sort order by the `created_at` timestamp of the objects. `asc` for ascending
   * order and `desc` for descending order.
   */
  order?: 'asc' | 'desc';
}

export interface RunCreateAndPollParams {
  /**
   * The ID of the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) to use to
   * execute this run.
   */
  assistant_id: string;

  /**
   * Appends additional instructions at the end of the instructions for the run. This
   * is useful for modifying the behavior on a per-run basis without overriding other
   * instructions.
   */
  additional_instructions?: string | null;

  /**
   * Adds additional messages to the thread before creating the run.
   */
  additional_messages?: Array<RunCreateAndPollParams.AdditionalMessage> | null;

  /**
   * Overrides the
   * [instructions](https://platform.openai.com/docs/api-reference/assistants/createAssistant)
   * of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  instructions?: string | null;

  /**
   * The maximum number of completion tokens that may be used over the course of the
   * run. The run will make a best effort to use only the number of completion tokens
   * specified, across multiple turns of the run. If the run exceeds the number of
   * completion tokens specified, the run will end with status `incomplete`. See
   * `incomplete_details` for more info.
   */
  max_completion_tokens?: number | null;

  /**
   * The maximum number of prompt tokens that may be used over the course of the run.
   * The run will make a best effort to use only the number of prompt tokens
   * specified, across multiple turns of the run. If the run exceeds the number of
   * prompt tokens specified, the run will end with status `incomplete`. See
   * `incomplete_details` for more info.
   */
  max_prompt_tokens?: number | null;

  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be useful
   * for storing additional information about the object in a structured format. Keys
   * can be a maximum of 64 characters long and values can be a maxium of 512
   * characters long.
   */
  metadata?: unknown | null;

  /**
   * The ID of the [Model](https://platform.openai.com/docs/api-reference/models) to
   * be used to execute this run. If a value is provided here, it will override the
   * model associated with the assistant. If not, the model associated with the
   * assistant will be used.
   */
  model?:
    | (string & {})
    | 'gpt-4o'
    | 'gpt-4o-2024-05-13'
    | 'gpt-4-turbo'
    | 'gpt-4-turbo-2024-04-09'
    | 'gpt-4-0125-preview'
    | 'gpt-4-turbo-preview'
    | 'gpt-4-1106-preview'
    | 'gpt-4-vision-preview'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-1106'
    | 'gpt-3.5-turbo-0125'
    | 'gpt-3.5-turbo-16k-0613'
    | null;

  /**
   * Specifies the format that the model must output. Compatible with
   * [GPT-4o](https://platform.openai.com/docs/models/gpt-4o),
   * [GPT-4 Turbo](https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4),
   * and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
   *
   * Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the
   * message the model generates is valid JSON.
   *
   * **Important:** when using JSON mode, you **must** also instruct the model to
   * produce JSON yourself via a system or user message. Without this, the model may
   * generate an unending stream of whitespace until the generation reaches the token
   * limit, resulting in a long-running and seemingly "stuck" request. Also note that
   * the message content may be partially cut off if `finish_reason="length"`, which
   * indicates the generation exceeded `max_tokens` or the conversation exceeded the
   * max context length.
   */
  response_format?: ThreadsAPI.AssistantResponseFormatOption | null;

  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
   * make the output more random, while lower values like 0.2 will make it more
   * focused and deterministic.
   */
  temperature?: number | null;

  /**
   * Controls which (if any) tool is called by the model. `none` means the model will
   * not call any tools and instead generates a message. `auto` is the default value
   * and means the model can pick between generating a message or calling one or more
   * tools. `required` means the model must call one or more tools before responding
   * to the user. Specifying a particular tool like `{"type": "file_search"}` or
   * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
   * call that tool.
   */
  tool_choice?: ThreadsAPI.AssistantToolChoiceOption | null;

  /**
   * Override the tools the assistant can use for this run. This is useful for
   * modifying the behavior on a per-run basis.
   */
  tools?: Array<AssistantsAPI.AssistantTool> | null;

  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the
   * model considers the results of the tokens with top_p probability mass. So 0.1
   * means only the tokens comprising the top 10% probability mass are considered.
   *
   * We generally recommend altering this or temperature but not both.
   */
  top_p?: number | null;

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  truncation_strategy?: RunCreateAndPollParams.TruncationStrategy | null;
}

export namespace RunCreateAndPollParams {
  export interface AdditionalMessage {
    /**
     * The text contents of the message.
     */
    content: string | Array<MessagesAPI.MessageContentPartParam>;

    /**
     * The role of the entity that is creating the message. Allowed values include:
     *
     * - `user`: Indicates the message is sent by an actual user and should be used in
     *   most cases to represent user-generated messages.
     * - `assistant`: Indicates the message is generated by the assistant. Use this
     *   value to insert messages from the assistant into the conversation.
     */
    role: 'user' | 'assistant';

    /**
     * A list of files attached to the message, and the tools they should be added to.
     */
    attachments?: Array<AdditionalMessage.Attachment> | null;

    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format. Keys
     * can be a maximum of 64 characters long and values can be a maxium of 512
     * characters long.
     */
    metadata?: unknown | null;
  }

  export namespace AdditionalMessage {
    export interface Attachment {
      /**
       * The ID of the file to attach to the message.
       */
      file_id?: string;

      /**
       * The tools to add this file to.
       */
      tools?: Array<AssistantsAPI.CodeInterpreterTool | AssistantsAPI.FileSearchTool>;
    }
  }

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  export interface TruncationStrategy {
    /**
     * The truncation strategy to use for the thread. The default is `auto`. If set to
     * `last_messages`, the thread will be truncated to the n most recent messages in
     * the thread. When set to `auto`, messages in the middle of the thread will be
     * dropped to fit the context length of the model, `max_prompt_tokens`.
     */
    type: 'auto' | 'last_messages';

    /**
     * The number of most recent messages from the thread when constructing the context
     * for the run.
     */
    last_messages?: number | null;
  }
}

export interface RunCreateAndStreamParams {
  /**
   * The ID of the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) to use to
   * execute this run.
   */
  assistant_id: string;

  /**
   * Appends additional instructions at the end of the instructions for the run. This
   * is useful for modifying the behavior on a per-run basis without overriding other
   * instructions.
   */
  additional_instructions?: string | null;

  /**
   * Adds additional messages to the thread before creating the run.
   */
  additional_messages?: Array<RunCreateAndStreamParams.AdditionalMessage> | null;

  /**
   * Overrides the
   * [instructions](https://platform.openai.com/docs/api-reference/assistants/createAssistant)
   * of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  instructions?: string | null;

  /**
   * The maximum number of completion tokens that may be used over the course of the
   * run. The run will make a best effort to use only the number of completion tokens
   * specified, across multiple turns of the run. If the run exceeds the number of
   * completion tokens specified, the run will end with status `incomplete`. See
   * `incomplete_details` for more info.
   */
  max_completion_tokens?: number | null;

  /**
   * The maximum number of prompt tokens that may be used over the course of the run.
   * The run will make a best effort to use only the number of prompt tokens
   * specified, across multiple turns of the run. If the run exceeds the number of
   * prompt tokens specified, the run will end with status `incomplete`. See
   * `incomplete_details` for more info.
   */
  max_prompt_tokens?: number | null;

  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be useful
   * for storing additional information about the object in a structured format. Keys
   * can be a maximum of 64 characters long and values can be a maxium of 512
   * characters long.
   */
  metadata?: unknown | null;

  /**
   * The ID of the [Model](https://platform.openai.com/docs/api-reference/models) to
   * be used to execute this run. If a value is provided here, it will override the
   * model associated with the assistant. If not, the model associated with the
   * assistant will be used.
   */
  model?:
    | (string & {})
    | 'gpt-4o'
    | 'gpt-4o-2024-05-13'
    | 'gpt-4-turbo'
    | 'gpt-4-turbo-2024-04-09'
    | 'gpt-4-0125-preview'
    | 'gpt-4-turbo-preview'
    | 'gpt-4-1106-preview'
    | 'gpt-4-vision-preview'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-1106'
    | 'gpt-3.5-turbo-0125'
    | 'gpt-3.5-turbo-16k-0613'
    | null;

  /**
   * Specifies the format that the model must output. Compatible with
   * [GPT-4o](https://platform.openai.com/docs/models/gpt-4o),
   * [GPT-4 Turbo](https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4),
   * and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
   *
   * Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the
   * message the model generates is valid JSON.
   *
   * **Important:** when using JSON mode, you **must** also instruct the model to
   * produce JSON yourself via a system or user message. Without this, the model may
   * generate an unending stream of whitespace until the generation reaches the token
   * limit, resulting in a long-running and seemingly "stuck" request. Also note that
   * the message content may be partially cut off if `finish_reason="length"`, which
   * indicates the generation exceeded `max_tokens` or the conversation exceeded the
   * max context length.
   */
  response_format?: ThreadsAPI.AssistantResponseFormatOption | null;

  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
   * make the output more random, while lower values like 0.2 will make it more
   * focused and deterministic.
   */
  temperature?: number | null;

  /**
   * Controls which (if any) tool is called by the model. `none` means the model will
   * not call any tools and instead generates a message. `auto` is the default value
   * and means the model can pick between generating a message or calling one or more
   * tools. `required` means the model must call one or more tools before responding
   * to the user. Specifying a particular tool like `{"type": "file_search"}` or
   * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
   * call that tool.
   */
  tool_choice?: ThreadsAPI.AssistantToolChoiceOption | null;

  /**
   * Override the tools the assistant can use for this run. This is useful for
   * modifying the behavior on a per-run basis.
   */
  tools?: Array<AssistantsAPI.AssistantTool> | null;

  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the
   * model considers the results of the tokens with top_p probability mass. So 0.1
   * means only the tokens comprising the top 10% probability mass are considered.
   *
   * We generally recommend altering this or temperature but not both.
   */
  top_p?: number | null;

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  truncation_strategy?: RunCreateAndStreamParams.TruncationStrategy | null;
}

export namespace RunCreateAndStreamParams {
  export interface AdditionalMessage {
    /**
     * The text contents of the message.
     */
    content: string | Array<MessagesAPI.MessageContentPartParam>;

    /**
     * The role of the entity that is creating the message. Allowed values include:
     *
     * - `user`: Indicates the message is sent by an actual user and should be used in
     *   most cases to represent user-generated messages.
     * - `assistant`: Indicates the message is generated by the assistant. Use this
     *   value to insert messages from the assistant into the conversation.
     */
    role: 'user' | 'assistant';

    /**
     * A list of files attached to the message, and the tools they should be added to.
     */
    attachments?: Array<AdditionalMessage.Attachment> | null;

    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format. Keys
     * can be a maximum of 64 characters long and values can be a maxium of 512
     * characters long.
     */
    metadata?: unknown | null;
  }

  export namespace AdditionalMessage {
    export interface Attachment {
      /**
       * The ID of the file to attach to the message.
       */
      file_id?: string;

      /**
       * The tools to add this file to.
       */
      tools?: Array<AssistantsAPI.CodeInterpreterTool | AssistantsAPI.FileSearchTool>;
    }
  }

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  export interface TruncationStrategy {
    /**
     * The truncation strategy to use for the thread. The default is `auto`. If set to
     * `last_messages`, the thread will be truncated to the n most recent messages in
     * the thread. When set to `auto`, messages in the middle of the thread will be
     * dropped to fit the context length of the model, `max_prompt_tokens`.
     */
    type: 'auto' | 'last_messages';

    /**
     * The number of most recent messages from the thread when constructing the context
     * for the run.
     */
    last_messages?: number | null;
  }
}

export interface RunStreamParams {
  /**
   * The ID of the
   * [assistant](https://platform.openai.com/docs/api-reference/assistants) to use to
   * execute this run.
   */
  assistant_id: string;

  /**
   * Appends additional instructions at the end of the instructions for the run. This
   * is useful for modifying the behavior on a per-run basis without overriding other
   * instructions.
   */
  additional_instructions?: string | null;

  /**
   * Adds additional messages to the thread before creating the run.
   */
  additional_messages?: Array<RunStreamParams.AdditionalMessage> | null;

  /**
   * Overrides the
   * [instructions](https://platform.openai.com/docs/api-reference/assistants/createAssistant)
   * of the assistant. This is useful for modifying the behavior on a per-run basis.
   */
  instructions?: string | null;

  /**
   * The maximum number of completion tokens that may be used over the course of the
   * run. The run will make a best effort to use only the number of completion tokens
   * specified, across multiple turns of the run. If the run exceeds the number of
   * completion tokens specified, the run will end with status `incomplete`. See
   * `incomplete_details` for more info.
   */
  max_completion_tokens?: number | null;

  /**
   * The maximum number of prompt tokens that may be used over the course of the run.
   * The run will make a best effort to use only the number of prompt tokens
   * specified, across multiple turns of the run. If the run exceeds the number of
   * prompt tokens specified, the run will end with status `incomplete`. See
   * `incomplete_details` for more info.
   */
  max_prompt_tokens?: number | null;

  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be useful
   * for storing additional information about the object in a structured format. Keys
   * can be a maximum of 64 characters long and values can be a maxium of 512
   * characters long.
   */
  metadata?: unknown | null;

  /**
   * The ID of the [Model](https://platform.openai.com/docs/api-reference/models) to
   * be used to execute this run. If a value is provided here, it will override the
   * model associated with the assistant. If not, the model associated with the
   * assistant will be used.
   */
  model?:
    | (string & {})
    | 'gpt-4o'
    | 'gpt-4o-2024-05-13'
    | 'gpt-4-turbo'
    | 'gpt-4-turbo-2024-04-09'
    | 'gpt-4-0125-preview'
    | 'gpt-4-turbo-preview'
    | 'gpt-4-1106-preview'
    | 'gpt-4-vision-preview'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-1106'
    | 'gpt-3.5-turbo-0125'
    | 'gpt-3.5-turbo-16k-0613'
    | null;

  /**
   * Specifies the format that the model must output. Compatible with
   * [GPT-4o](https://platform.openai.com/docs/models/gpt-4o),
   * [GPT-4 Turbo](https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4),
   * and all GPT-3.5 Turbo models since `gpt-3.5-turbo-1106`.
   *
   * Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the
   * message the model generates is valid JSON.
   *
   * **Important:** when using JSON mode, you **must** also instruct the model to
   * produce JSON yourself via a system or user message. Without this, the model may
   * generate an unending stream of whitespace until the generation reaches the token
   * limit, resulting in a long-running and seemingly "stuck" request. Also note that
   * the message content may be partially cut off if `finish_reason="length"`, which
   * indicates the generation exceeded `max_tokens` or the conversation exceeded the
   * max context length.
   */
  response_format?: ThreadsAPI.AssistantResponseFormatOption | null;

  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
   * make the output more random, while lower values like 0.2 will make it more
   * focused and deterministic.
   */
  temperature?: number | null;

  /**
   * Controls which (if any) tool is called by the model. `none` means the model will
   * not call any tools and instead generates a message. `auto` is the default value
   * and means the model can pick between generating a message or calling one or more
   * tools. `required` means the model must call one or more tools before responding
   * to the user. Specifying a particular tool like `{"type": "file_search"}` or
   * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
   * call that tool.
   */
  tool_choice?: ThreadsAPI.AssistantToolChoiceOption | null;

  /**
   * Override the tools the assistant can use for this run. This is useful for
   * modifying the behavior on a per-run basis.
   */
  tools?: Array<AssistantsAPI.AssistantTool> | null;

  /**
   * An alternative to sampling with temperature, called nucleus sampling, where the
   * model considers the results of the tokens with top_p probability mass. So 0.1
   * means only the tokens comprising the top 10% probability mass are considered.
   *
   * We generally recommend altering this or temperature but not both.
   */
  top_p?: number | null;

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  truncation_strategy?: RunStreamParams.TruncationStrategy | null;
}

export namespace RunStreamParams {
  export interface AdditionalMessage {
    /**
     * The text contents of the message.
     */
    content: string | Array<MessagesAPI.MessageContentPartParam>;

    /**
     * The role of the entity that is creating the message. Allowed values include:
     *
     * - `user`: Indicates the message is sent by an actual user and should be used in
     *   most cases to represent user-generated messages.
     * - `assistant`: Indicates the message is generated by the assistant. Use this
     *   value to insert messages from the assistant into the conversation.
     */
    role: 'user' | 'assistant';

    /**
     * A list of files attached to the message, and the tools they should be added to.
     */
    attachments?: Array<AdditionalMessage.Attachment> | null;

    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format. Keys
     * can be a maximum of 64 characters long and values can be a maxium of 512
     * characters long.
     */
    metadata?: unknown | null;
  }

  export namespace AdditionalMessage {
    export interface Attachment {
      /**
       * The ID of the file to attach to the message.
       */
      file_id?: string;

      /**
       * The tools to add this file to.
       */
      tools?: Array<AssistantsAPI.CodeInterpreterTool | AssistantsAPI.FileSearchTool>;
    }
  }

  /**
   * Controls for how a thread will be truncated prior to the run. Use this to
   * control the intial context window of the run.
   */
  export interface TruncationStrategy {
    /**
     * The truncation strategy to use for the thread. The default is `auto`. If set to
     * `last_messages`, the thread will be truncated to the n most recent messages in
     * the thread. When set to `auto`, messages in the middle of the thread will be
     * dropped to fit the context length of the model, `max_prompt_tokens`.
     */
    type: 'auto' | 'last_messages';

    /**
     * The number of most recent messages from the thread when constructing the context
     * for the run.
     */
    last_messages?: number | null;
  }
}

export type RunSubmitToolOutputsParams =
  | RunSubmitToolOutputsParamsNonStreaming
  | RunSubmitToolOutputsParamsStreaming;

export interface RunSubmitToolOutputsParamsBase {
  /**
   * A list of tools for which the outputs are being submitted.
   */
  tool_outputs: Array<RunSubmitToolOutputsParams.ToolOutput>;

  /**
   * If `true`, returns a stream of events that happen during the Run as server-sent
   * events, terminating when the Run enters a terminal state with a `data: [DONE]`
   * message.
   */
  stream?: boolean | null;
}

export namespace RunSubmitToolOutputsParams {
  export interface ToolOutput {
    /**
     * The output of the tool call to be submitted to continue the run.
     */
    output?: string;

    /**
     * The ID of the tool call in the `required_action` object within the run object
     * the output is being submitted for.
     */
    tool_call_id?: string;
  }

  export type RunSubmitToolOutputsParamsNonStreaming = RunsAPI.RunSubmitToolOutputsParamsNonStreaming;
  export type RunSubmitToolOutputsParamsStreaming = RunsAPI.RunSubmitToolOutputsParamsStreaming;
}

export interface RunSubmitToolOutputsParamsNonStreaming extends RunSubmitToolOutputsParamsBase {
  /**
   * If `true`, returns a stream of events that happen during the Run as server-sent
   * events, terminating when the Run enters a terminal state with a `data: [DONE]`
   * message.
   */
  stream?: false | null;
}

export interface RunSubmitToolOutputsParamsStreaming extends RunSubmitToolOutputsParamsBase {
  /**
   * If `true`, returns a stream of events that happen during the Run as server-sent
   * events, terminating when the Run enters a terminal state with a `data: [DONE]`
   * message.
   */
  stream: true;
}

export interface RunSubmitToolOutputsAndPollParams {
  /**
   * A list of tools for which the outputs are being submitted.
   */
  tool_outputs: Array<RunSubmitToolOutputsAndPollParams.ToolOutput>;
}

export namespace RunSubmitToolOutputsAndPollParams {
  export interface ToolOutput {
    /**
     * The output of the tool call to be submitted to continue the run.
     */
    output?: string;

    /**
     * The ID of the tool call in the `required_action` object within the run object
     * the output is being submitted for.
     */
    tool_call_id?: string;
  }
}

export interface RunSubmitToolOutputsStreamParams {
  /**
   * A list of tools for which the outputs are being submitted.
   */
  tool_outputs: Array<RunSubmitToolOutputsStreamParams.ToolOutput>;
}

export namespace RunSubmitToolOutputsStreamParams {
  export interface ToolOutput {
    /**
     * The output of the tool call to be submitted to continue the run.
     */
    output?: string;

    /**
     * The ID of the tool call in the `required_action` object within the run object
     * the output is being submitted for.
     */
    tool_call_id?: string;
  }
}

Runs.RunsPage = RunsPage;
Runs.Steps = Steps;
Runs.RunStepsPage = RunStepsPage;

export declare namespace Runs {
  export {
    type RequiredActionFunctionToolCall as RequiredActionFunctionToolCall,
    type Run as Run,
    type RunStatus as RunStatus,
    RunsPage as RunsPage,
    type RunCreateParams as RunCreateParams,
    type RunCreateParamsNonStreaming as RunCreateParamsNonStreaming,
    type RunCreateParamsStreaming as RunCreateParamsStreaming,
    type RunUpdateParams as RunUpdateParams,
    type RunListParams as RunListParams,
    type RunCreateAndPollParams,
    type RunCreateAndStreamParams,
    type RunStreamParams,
    type RunSubmitToolOutputsParams as RunSubmitToolOutputsParams,
    type RunSubmitToolOutputsParamsNonStreaming as RunSubmitToolOutputsParamsNonStreaming,
    type RunSubmitToolOutputsParamsStreaming as RunSubmitToolOutputsParamsStreaming,
    type RunSubmitToolOutputsAndPollParams,
    type RunSubmitToolOutputsStreamParams,
  };

  export {
    Steps as Steps,
    type CodeInterpreterLogs as CodeInterpreterLogs,
    type CodeInterpreterOutputImage as CodeInterpreterOutputImage,
    type CodeInterpreterToolCall as CodeInterpreterToolCall,
    type CodeInterpreterToolCallDelta as CodeInterpreterToolCallDelta,
    type FileSearchToolCall as FileSearchToolCall,
    type FileSearchToolCallDelta as FileSearchToolCallDelta,
    type FunctionToolCall as FunctionToolCall,
    type FunctionToolCallDelta as FunctionToolCallDelta,
    type MessageCreationStepDetails as MessageCreationStepDetails,
    type RunStep as RunStep,
    type RunStepDelta as RunStepDelta,
    type RunStepDeltaEvent as RunStepDeltaEvent,
    type RunStepDeltaMessageDelta as RunStepDeltaMessageDelta,
    type RunStepInclude as RunStepInclude,
    type ToolCall as ToolCall,
    type ToolCallDelta as ToolCallDelta,
    type ToolCallDeltaObject as ToolCallDeltaObject,
    type ToolCallsStepDetails as ToolCallsStepDetails,
    RunStepsPage as RunStepsPage,
    type StepRetrieveParams as StepRetrieveParams,
    type StepListParams as StepListParams,
  };
}
