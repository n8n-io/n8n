import {
  FlexibleSchema,
  MaybePromiseLike,
  ProviderOptions,
  SystemModelMessage,
} from '@ai-sdk/provider-utils';
import type {
  OnFinishEvent,
  OnStepFinishEvent,
} from '../generate-text/callback-events';
import { Output } from '../generate-text/output';
import { PrepareStepFunction } from '../generate-text/prepare-step';
import { StopCondition } from '../generate-text/stop-condition';
import { ToolCallRepairFunction } from '../generate-text/tool-call-repair-function';
import { ToolSet } from '../generate-text/tool-set';
import { CallSettings } from '../prompt/call-settings';
import { Prompt } from '../prompt/prompt';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { LanguageModel, ToolChoice } from '../types/language-model';
import { DownloadFunction } from '../util/download/download-function';
import { AgentCallParameters } from './agent';

export type ToolLoopAgentOnStepFinishCallback<TOOLS extends ToolSet = {}> = (
  stepResult: OnStepFinishEvent<TOOLS>,
) => Promise<void> | void;

export type ToolLoopAgentOnFinishCallback<TOOLS extends ToolSet = {}> = (
  event: OnFinishEvent<TOOLS>,
) => PromiseLike<void> | void;

/**
 * Configuration options for an agent.
 */
export type ToolLoopAgentSettings<
  CALL_OPTIONS = never,
  TOOLS extends ToolSet = {},
  OUTPUT extends Output = never,
> = Omit<CallSettings, 'abortSignal'> & {
  /**
   * The id of the agent.
   */
  id?: string;

  /**
   * The instructions for the agent.
   *
   * It can be a string, or, if you need to pass additional provider options (e.g. for caching), a `SystemModelMessage`.
   */
  instructions?: string | SystemModelMessage | Array<SystemModelMessage>;

  /**
   * The language model to use.
   */
  model: LanguageModel;

  /**
   * The tools that the model can call. The model needs to support calling tools.
   */
  tools?: TOOLS;

  /**
   * The tool choice strategy. Default: 'auto'.
   */
  toolChoice?: ToolChoice<NoInfer<TOOLS>>;

  /**
   * Condition for stopping the generation when there are tool results in the last step.
   * When the condition is an array, any of the conditions can be met to stop the generation.
   *
   * @default stepCountIs(20)
   */
  stopWhen?:
    | StopCondition<NoInfer<TOOLS>>
    | Array<StopCondition<NoInfer<TOOLS>>>;

  /**
   * Optional telemetry configuration (experimental).
   */
  experimental_telemetry?: TelemetrySettings;

  /**
   * Limits the tools that are available for the model to call without
   * changing the tool call and result types in the result.
   */
  activeTools?: Array<keyof NoInfer<TOOLS>>;

  /**
   * Optional specification for generating structured outputs.
   */
  output?: OUTPUT;

  /**
   * Optional function that you can use to provide different settings for a step.
   */
  prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;

  /**
   * A function that attempts to repair a tool call that failed to parse.
   */
  experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<TOOLS>>;

  /**
   * Callback that is called when each step (LLM call) is finished, including intermediate steps.
   */
  onStepFinish?: ToolLoopAgentOnStepFinishCallback<NoInfer<TOOLS>>;

  /**
   * Callback that is called when all steps are finished and the response is complete.
   */
  onFinish?: ToolLoopAgentOnFinishCallback<NoInfer<TOOLS>>;

  /**
   * Additional provider-specific options. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;

  /**
   * Context that is passed into tool calls.
   *
   * Experimental (can break in patch releases).
   *
   * @default undefined
   */
  experimental_context?: unknown;

  /**
   * Custom download function to use for URLs.
   *
   * By default, files are downloaded if the model does not support the URL for the given media type.
   */
  experimental_download?: DownloadFunction | undefined;

  /**
   * The schema for the call options.
   */
  callOptionsSchema?: FlexibleSchema<CALL_OPTIONS>;

  /**
   * Prepare the parameters for the generateText or streamText call.
   *
   * You can use this to have templates based on call options.
   */
  prepareCall?: (
    options: Omit<
      AgentCallParameters<CALL_OPTIONS, NoInfer<TOOLS>>,
      'onStepFinish'
    > &
      Pick<
        ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>,
        | 'model'
        | 'tools'
        | 'maxOutputTokens'
        | 'temperature'
        | 'topP'
        | 'topK'
        | 'presencePenalty'
        | 'frequencyPenalty'
        | 'stopSequences'
        | 'seed'
        | 'headers'
        | 'instructions'
        | 'stopWhen'
        | 'experimental_telemetry'
        | 'activeTools'
        | 'providerOptions'
        | 'experimental_context'
        | 'experimental_download'
      >,
  ) => MaybePromiseLike<
    Pick<
      ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>,
      | 'model'
      | 'tools'
      | 'maxOutputTokens'
      | 'temperature'
      | 'topP'
      | 'topK'
      | 'presencePenalty'
      | 'frequencyPenalty'
      | 'stopSequences'
      | 'seed'
      | 'headers'
      | 'instructions'
      | 'stopWhen'
      | 'experimental_telemetry'
      | 'activeTools'
      | 'providerOptions'
      | 'experimental_context'
      | 'experimental_download'
    > &
      Omit<Prompt, 'system'>
  >;
};
