import { TypedToolCall } from './tool-call';
import { ToolSet } from './tool-set';

/**
 * Output part that indicates that a tool approval request has been made.
 *
 * The tool approval request can be approved or denied in the next tool message.
 */
export type ToolApprovalRequestOutput<TOOLS extends ToolSet> = {
  type: 'tool-approval-request';

  /**
   * ID of the tool approval request.
   */
  approvalId: string;

  /**
   * Tool call that the approval request is for.
   */
  toolCall: TypedToolCall<TOOLS>;
};
