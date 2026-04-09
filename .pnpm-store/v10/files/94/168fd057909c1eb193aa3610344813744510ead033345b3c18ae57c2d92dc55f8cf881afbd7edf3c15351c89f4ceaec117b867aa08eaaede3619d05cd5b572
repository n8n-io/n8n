import {
  ModelMessage,
  ProviderOptions,
  SystemModelMessage,
  Tool,
} from '@ai-sdk/provider-utils';
import { LanguageModel, ToolChoice } from '../types/language-model';
import { StepResult } from './step-result';

/**
 * Function that you can use to provide different settings for a step.
 *
 * @param options - The options for the step.
 * @param options.steps - The steps that have been executed so far.
 * @param options.stepNumber - The number of the step that is being executed.
 * @param options.model - The model that is being used.
 * @param options.messages - The messages that will be sent to the model for the current step.
 * @param options.experimental_context - The context passed via the experimental_context setting (experimental).
 *
 * @returns An object that contains the settings for the step.
 * If you return undefined (or for undefined settings), the settings from the outer level will be used.
 */
export type PrepareStepFunction<
  TOOLS extends Record<string, Tool> = Record<string, Tool>,
> = (options: {
  /**
   * The steps that have been executed so far.
   */
  steps: Array<StepResult<NoInfer<TOOLS>>>;

  /**
   * The number of the step that is being executed.
   */
  stepNumber: number;

  /**
   * The model instance that is being used for this step.
   */
  model: LanguageModel;

  /**
   * The messages that will be sent to the model for the current step.
   */
  messages: Array<ModelMessage>;

  /**
   * The context passed via the experimental_context setting (experimental).
   */
  experimental_context: unknown;
}) => PromiseLike<PrepareStepResult<TOOLS>> | PrepareStepResult<TOOLS>;

/**
 * The result type returned by a {@link PrepareStepFunction},
 * allowing per-step overrides of model, tools, or messages.
 */
export type PrepareStepResult<
  TOOLS extends Record<string, Tool> = Record<string, Tool>,
> =
  | {
      /**
       * Optionally override which LanguageModel instance is used for this step.
       */
      model?: LanguageModel;

      /**
       * Optionally set which tool the model must call, or provide tool call configuration
       * for this step.
       */
      toolChoice?: ToolChoice<NoInfer<TOOLS>>;

      /**
       * If provided, only these tools are enabled/available for this step.
       */
      activeTools?: Array<keyof NoInfer<TOOLS>>;

      /**
       * Optionally override the system message(s) sent to the model for this step.
       */
      system?: string | SystemModelMessage | Array<SystemModelMessage>;

      /**
       * Optionally override the full set of messages sent to the model
       * for this step.
       */
      messages?: Array<ModelMessage>;

      /**
       * Context that is passed into tool execution. Experimental.
       *
       * Changing the context will affect the context in this step
       * and all subsequent steps.
       */
      experimental_context?: unknown;

      /**
       * Additional provider-specific options for this step.
       *
       * Can be used to pass provider-specific configuration such as
       * container IDs for Anthropic's code execution.
       */
      providerOptions?: ProviderOptions;
    }
  | undefined;
