import { JSONSchema7, LanguageModelV3ToolCall } from '@ai-sdk/provider';
import { InvalidToolInputError } from '../error/invalid-tool-input-error';
import { NoSuchToolError } from '../error/no-such-tool-error';
import { ModelMessage, SystemModelMessage } from '../prompt';
import { ToolSet } from './tool-set';

/**
 * A function that attempts to repair a tool call that failed to parse.
 *
 * It receives the error and the context as arguments and returns the repair
 * tool call JSON as text.
 *
 * @param options.system - The system prompt.
 * @param options.messages - The messages in the current generation step.
 * @param options.toolCall - The tool call that failed to parse.
 * @param options.tools - The tools that are available.
 * @param options.inputSchema - A function that returns the JSON Schema for a tool.
 * @param options.error - The error that occurred while parsing the tool call.
 */
export type ToolCallRepairFunction<TOOLS extends ToolSet> = (options: {
  system: string | SystemModelMessage | Array<SystemModelMessage> | undefined;
  messages: ModelMessage[];
  toolCall: LanguageModelV3ToolCall;
  tools: TOOLS;
  inputSchema: (options: { toolName: string }) => PromiseLike<JSONSchema7>;
  error: NoSuchToolError | InvalidToolInputError;
}) => Promise<LanguageModelV3ToolCall | null>;
