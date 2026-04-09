import {
  FilePart,
  ReasoningPart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from './content-part';
import { ProviderOptions } from './provider-options';
import { ToolApprovalRequest } from './tool-approval-request';

/**
 * An assistant message. It can contain text, tool calls, or a combination of text and tool calls.
 */
export type AssistantModelMessage = {
  role: 'assistant';
  content: AssistantContent;

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
};

/**
 * Content of an assistant message.
 * It can be a string or an array of text, image, reasoning, redacted reasoning, and tool call parts.
 */
export type AssistantContent =
  | string
  | Array<
      | TextPart
      | FilePart
      | ReasoningPart
      | ToolCallPart
      | ToolResultPart
      | ToolApprovalRequest
    >;
