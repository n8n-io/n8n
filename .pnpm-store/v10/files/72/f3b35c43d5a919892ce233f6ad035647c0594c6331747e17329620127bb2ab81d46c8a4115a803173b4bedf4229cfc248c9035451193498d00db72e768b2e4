import { JSONValue } from '@ai-sdk/provider';
import { FlexibleSchema } from '../schema';
import { ToolResultOutput } from './content-part';
import { ModelMessage } from './model-message';
import { ProviderOptions } from './provider-options';

/**
 * Additional options that are sent into each tool call.
 */
export interface ToolExecutionOptions {
  /**
   * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
   */
  toolCallId: string;

  /**
   * Messages that were sent to the language model to initiate the response that contained the tool call.
   * The messages **do not** include the system prompt nor the assistant response that contained the tool call.
   */
  messages: ModelMessage[];

  /**
   * An optional abort signal that indicates that the overall operation should be aborted.
   */
  abortSignal?: AbortSignal;

  /**
   * User-defined context.
   *
   * Treat the context object as immutable inside tools.
   * Mutating the context object can lead to race conditions and unexpected results
   * when tools are called in parallel.
   *
   * If you need to mutate the context, analyze the tool calls and results
   * in `prepareStep` and update it there.
   *
   * Experimental (can break in patch releases).
   */
  experimental_context?: unknown;
}

/**
 * Function that is called to determine if the tool needs approval before it can be executed.
 */
export type ToolNeedsApprovalFunction<INPUT> = (
  input: INPUT,
  options: {
    /**
     * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
     */
    toolCallId: string;

    /**
     * Messages that were sent to the language model to initiate the response that contained the tool call.
     * The messages **do not** include the system prompt nor the assistant response that contained the tool call.
     */
    messages: ModelMessage[];

    /**
     * Additional context.
     *
     * Experimental (can break in patch releases).
     */
    experimental_context?: unknown;
  },
) => boolean | PromiseLike<boolean>;

export type ToolExecuteFunction<INPUT, OUTPUT> = (
  input: INPUT,
  options: ToolExecutionOptions,
) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;

// 0 extends 1 & N checks for any
// [N] extends [never] checks for never
type NeverOptional<N, T> = 0 extends 1 & N
  ? Partial<T>
  : [N] extends [never]
    ? Partial<Record<keyof T, undefined>>
    : T;

type ToolOutputProperties<INPUT, OUTPUT> = NeverOptional<
  OUTPUT,
  | {
      /**
       * An async function that is called with the arguments from the tool call and produces a result.
       * If not provided, the tool will not be executed automatically.
       *
       * @args is the input of the tool call.
       * @options.abortSignal is a signal that can be used to abort the tool call.
       */
      execute: ToolExecuteFunction<INPUT, OUTPUT>;

      outputSchema?: FlexibleSchema<OUTPUT>;
    }
  | {
      outputSchema: FlexibleSchema<OUTPUT>;

      execute?: never;
    }
>;

/**
 * A tool contains the description and the schema of the input that the tool expects.
 * This enables the language model to generate the input.
 *
 * The tool can also contain an optional execute function for the actual execution function of the tool.
 */
export type Tool<
  INPUT extends JSONValue | unknown | never = any,
  OUTPUT extends JSONValue | unknown | never = any,
> = {
  /**
   * An optional description of what the tool does.
   * Will be used by the language model to decide whether to use the tool.
   * Not used for provider-defined tools.
   */
  description?: string;

  /**
   * An optional title of the tool.
   */
  title?: string;

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;

  /**
   * The schema of the input that the tool expects.
   * The language model will use this to generate the input.
   * It is also used to validate the output of the language model.
   *
   * You can use descriptions on the schema properties to make the input understandable for the language model.
   */
  inputSchema: FlexibleSchema<INPUT>;

  /**
   * An optional list of input examples that show the language
   * model what the input should look like.
   */
  inputExamples?: Array<{ input: NoInfer<INPUT> }>;

  /**
   * Whether the tool needs approval before it can be executed.
   */
  needsApproval?:
    | boolean
    | ToolNeedsApprovalFunction<[INPUT] extends [never] ? unknown : INPUT>;

  /**
   * Strict mode setting for the tool.
   *
   * Providers that support strict mode will use this setting to determine
   * how the input should be generated. Strict mode will always produce
   * valid inputs, but it might limit what input schemas are supported.
   */
  strict?: boolean;

  /**
   * Optional function that is called when the argument streaming starts.
   * Only called when the tool is used in a streaming context.
   */
  onInputStart?: (options: ToolExecutionOptions) => void | PromiseLike<void>;

  /**
   * Optional function that is called when an argument streaming delta is available.
   * Only called when the tool is used in a streaming context.
   */
  onInputDelta?: (
    options: { inputTextDelta: string } & ToolExecutionOptions,
  ) => void | PromiseLike<void>;

  /**
   * Optional function that is called when a tool call can be started,
   * even if the execute function is not provided.
   */
  onInputAvailable?: (
    options: {
      input: [INPUT] extends [never] ? unknown : INPUT;
    } & ToolExecutionOptions,
  ) => void | PromiseLike<void>;
} & ToolOutputProperties<INPUT, OUTPUT> & {
    /**
     * Optional conversion function that maps the tool result to an output that can be used by the language model.
     *
     * If not provided, the tool result will be sent as a JSON object.
     */
    toModelOutput?: (options: {
      /**
       * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
       */
      toolCallId: string;

      /**
       * The input of the tool call.
       */
      input: [INPUT] extends [never] ? unknown : INPUT;

      /**
       * The output of the tool call.
       */
      output: 0 extends 1 & OUTPUT
        ? any
        : [OUTPUT] extends [never]
          ? any
          : NoInfer<OUTPUT>;
    }) => ToolResultOutput | PromiseLike<ToolResultOutput>;
  } & (
    | {
        /**
         * Tool with user-defined input and output schemas.
         */
        type?: undefined | 'function';
      }
    | {
        /**
         * Tool that is defined at runtime (e.g. an MCP tool).
         * The types of input and output are not known at development time.
         */
        type: 'dynamic';
      }
    | {
        /**
         * Tool with provider-defined input and output schemas.
         */
        type: 'provider';

        /**
         * The ID of the tool. Must follow the format `<provider-name>.<unique-tool-name>`.
         */
        id: `${string}.${string}`;

        /**
         * The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
         */
        args: Record<string, unknown>;

        /**
         * Whether this provider-executed tool supports deferred results.
         *
         * When true, the tool result may not be returned in the same turn as the
         * tool call (e.g., when using programmatic tool calling where a server tool
         * triggers a client-executed tool, and the server tool's result is deferred
         * until the client tool is resolved).
         *
         * This flag allows the AI SDK to handle tool results that arrive without
         * a matching tool call in the current response.
         *
         * @default false
         */
        supportsDeferredResults?: boolean;
      }
  );

/**
 * Infer the input type of a tool.
 */
export type InferToolInput<TOOL extends Tool> =
  TOOL extends Tool<infer INPUT, any> ? INPUT : never;

/**
 * Infer the output type of a tool.
 */
export type InferToolOutput<TOOL extends Tool> =
  TOOL extends Tool<any, infer OUTPUT> ? OUTPUT : never;

/**
 * Helper function for inferring the execute args of a tool.
 */
// Note: overload order is important for auto-completion
export function tool<INPUT, OUTPUT>(
  tool: Tool<INPUT, OUTPUT>,
): Tool<INPUT, OUTPUT>;
export function tool<INPUT>(tool: Tool<INPUT, never>): Tool<INPUT, never>;
export function tool<OUTPUT>(tool: Tool<never, OUTPUT>): Tool<never, OUTPUT>;
export function tool(tool: Tool<never, never>): Tool<never, never>;
export function tool(tool: any): any {
  return tool;
}

/**
 * Defines a dynamic tool.
 */
export function dynamicTool(tool: {
  description?: string;
  title?: string;
  providerOptions?: ProviderOptions;
  inputSchema: FlexibleSchema<unknown>;
  execute: ToolExecuteFunction<unknown, unknown>;

  /**
   * Optional conversion function that maps the tool result to an output that can be used by the language model.
   *
   * If not provided, the tool result will be sent as a JSON object.
   */
  toModelOutput?: (options: {
    /**
     * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
     */
    toolCallId: string;

    /**
     * The input of the tool call.
     */
    input: unknown;

    /**
     * The output of the tool call.
     */
    output: unknown;
  }) => ToolResultOutput | PromiseLike<ToolResultOutput>;

  /**
   * Whether the tool needs approval before it can be executed.
   */
  needsApproval?: boolean | ToolNeedsApprovalFunction<unknown>;
}): Tool<unknown, unknown> & {
  type: 'dynamic';
} {
  return { ...tool, type: 'dynamic' };
}
