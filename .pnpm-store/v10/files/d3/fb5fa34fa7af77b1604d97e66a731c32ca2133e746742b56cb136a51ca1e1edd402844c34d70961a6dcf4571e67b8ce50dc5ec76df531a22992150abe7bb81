import { ToolResultPart } from './content-part';
import { ProviderOptions } from './provider-options';
import { ToolApprovalResponse } from './tool-approval-response';

/**
 * A tool message. It contains the result of one or more tool calls.
 */
export type ToolModelMessage = {
  role: 'tool';
  content: ToolContent;

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
};

/**
 * Content of a tool message. It is an array of tool result parts.
 */
export type ToolContent = Array<ToolResultPart | ToolApprovalResponse>;
