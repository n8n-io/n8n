import { ModelMessage } from '@ai-sdk/provider-utils';
import { GenerateTextResult } from '../generate-text/generate-text-result';
import { Output } from '../generate-text/output';
import { StreamTextTransform } from '../generate-text/stream-text';
import { StreamTextResult } from '../generate-text/stream-text-result';
import { ToolSet } from '../generate-text/tool-set';
import { TimeoutConfiguration } from '../prompt/call-settings';
import type { ToolLoopAgentOnStepFinishCallback } from './tool-loop-agent-settings';

/**
 * Parameters for calling an agent.
 */
export type AgentCallParameters<CALL_OPTIONS, TOOLS extends ToolSet = {}> = ([
  CALL_OPTIONS,
] extends [never]
  ? { options?: never }
  : { options: CALL_OPTIONS }) &
  (
    | {
        /**
         * A prompt. It can be either a text prompt or a list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        prompt: string | Array<ModelMessage>;

        /**
         * A list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        messages?: never;
      }
    | {
        /**
         * A list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        messages: Array<ModelMessage>;

        /**
         * A prompt. It can be either a text prompt or a list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        prompt?: never;
      }
  ) & {
    /**
     * Abort signal.
     */
    abortSignal?: AbortSignal;

    /**
     * Timeout in milliseconds. Can be specified as a number or as an object with `totalMs`.
     */
    timeout?: TimeoutConfiguration;

    /**
     * Callback that is called when each step (LLM call) is finished, including intermediate steps.
     */
    onStepFinish?: ToolLoopAgentOnStepFinishCallback<TOOLS>;
  };

/**
 * Parameters for streaming an output from an agent.
 */
export type AgentStreamParameters<
  CALL_OPTIONS,
  TOOLS extends ToolSet,
> = AgentCallParameters<CALL_OPTIONS, TOOLS> & {
  /**
   * Optional stream transformations.
   * They are applied in the order they are provided.
   * The stream transformations must maintain the stream structure for streamText to work correctly.
   */
  experimental_transform?:
    | StreamTextTransform<TOOLS>
    | Array<StreamTextTransform<TOOLS>>;
};

/**
 * An Agent receives a prompt (text or messages) and generates or streams an output
 * that consists of steps, tool calls, data parts, etc.
 *
 * You can implement your own Agent by implementing the `Agent` interface,
 * or use the `ToolLoopAgent` class.
 */
export interface Agent<
  CALL_OPTIONS = never,
  TOOLS extends ToolSet = {},
  OUTPUT extends Output = never,
> {
  /**
   * The specification version of the agent interface. This will enable
   * us to evolve the agent interface and retain backwards compatibility.
   */
  readonly version: 'agent-v1';

  /**
   * The id of the agent.
   */
  readonly id: string | undefined;

  /**
   * The tools that the agent can use.
   */
  readonly tools: TOOLS;

  /**
   * Generates an output from the agent (non-streaming).
   */
  generate(
    options: AgentCallParameters<CALL_OPTIONS, TOOLS>,
  ): PromiseLike<GenerateTextResult<TOOLS, OUTPUT>>;

  /**
   * Streams an output from the agent (streaming).
   */
  stream(
    options: AgentStreamParameters<CALL_OPTIONS, TOOLS>,
  ): PromiseLike<StreamTextResult<TOOLS, OUTPUT>>;
}
