import { SharedV3ProviderMetadata } from '../../shared/v3/shared-v3-provider-metadata';

/**
 * Tool approval request emitted by a provider for a provider-executed tool call.
 *
 * This is used for flows where the provider executes the tool (e.g. MCP tools)
 * but requires an explicit user approval before continuing.
 */
export type LanguageModelV3ToolApprovalRequest = {
  type: 'tool-approval-request';

  /**
   * ID of the approval request. This ID is referenced by the subsequent
   * tool-approval-response (tool message) to approve or deny execution.
   */
  approvalId: string;

  /**
   * The tool call ID that this approval request is for.
   */
  toolCallId: string;

  /**
   * Additional provider-specific metadata for the approval request.
   */
  providerMetadata?: SharedV3ProviderMetadata;
};
