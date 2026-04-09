import {
  ModelMessage,
  ToolApprovalRequest,
  ToolApprovalResponse,
} from '@ai-sdk/provider-utils';
import { InvalidToolApprovalError } from '../error/invalid-tool-approval-error';
import { ToolCallNotFoundForApprovalError } from '../error/tool-call-not-found-for-approval-error';
import { TypedToolCall } from './tool-call';
import { TypedToolResult } from './tool-result';
import { ToolSet } from './tool-set';

export type CollectedToolApprovals<TOOLS extends ToolSet> = {
  approvalRequest: ToolApprovalRequest;
  approvalResponse: ToolApprovalResponse;
  toolCall: TypedToolCall<TOOLS>;
};

/**
 * If the last message is a tool message, this function collects all tool approvals
 * from that message.
 */
export function collectToolApprovals<TOOLS extends ToolSet>({
  messages,
}: {
  messages: ModelMessage[];
}): {
  approvedToolApprovals: Array<CollectedToolApprovals<TOOLS>>;
  deniedToolApprovals: Array<CollectedToolApprovals<TOOLS>>;
} {
  const lastMessage = messages.at(-1);

  if (lastMessage?.role != 'tool') {
    return {
      approvedToolApprovals: [],
      deniedToolApprovals: [],
    };
  }

  // gather tool calls and prepare lookup
  const toolCallsByToolCallId: Record<string, TypedToolCall<TOOLS>> = {};
  for (const message of messages) {
    if (message.role === 'assistant' && typeof message.content !== 'string') {
      const content = message.content;
      for (const part of content) {
        if (part.type === 'tool-call') {
          toolCallsByToolCallId[part.toolCallId] = part as TypedToolCall<TOOLS>;
        }
      }
    }
  }

  // gather approval responses and prepare lookup
  const toolApprovalRequestsByApprovalId: Record<string, ToolApprovalRequest> =
    {};
  for (const message of messages) {
    if (message.role === 'assistant' && typeof message.content !== 'string') {
      const content = message.content;
      for (const part of content) {
        if (part.type === 'tool-approval-request') {
          toolApprovalRequestsByApprovalId[part.approvalId] = part;
        }
      }
    }
  }

  // gather tool results from the last tool message
  const toolResults: Record<string, TypedToolResult<TOOLS>> = {};
  for (const part of lastMessage.content) {
    if (part.type === 'tool-result') {
      toolResults[part.toolCallId] = part as TypedToolResult<TOOLS>;
    }
  }

  const approvedToolApprovals: Array<CollectedToolApprovals<TOOLS>> = [];
  const deniedToolApprovals: Array<CollectedToolApprovals<TOOLS>> = [];

  const approvalResponses = lastMessage.content.filter(
    part => part.type === 'tool-approval-response',
  );
  for (const approvalResponse of approvalResponses) {
    const approvalRequest =
      toolApprovalRequestsByApprovalId[approvalResponse.approvalId];

    if (approvalRequest == null) {
      throw new InvalidToolApprovalError({
        approvalId: approvalResponse.approvalId,
      });
    }

    if (toolResults[approvalRequest.toolCallId] != null) {
      continue;
    }

    const toolCall = toolCallsByToolCallId[approvalRequest.toolCallId];
    if (toolCall == null) {
      throw new ToolCallNotFoundForApprovalError({
        toolCallId: approvalRequest.toolCallId,
        approvalId: approvalRequest.approvalId,
      });
    }

    const approval: CollectedToolApprovals<TOOLS> = {
      approvalRequest,
      approvalResponse,
      toolCall,
    };

    if (approvalResponse.approved) {
      approvedToolApprovals.push(approval);
    } else {
      deniedToolApprovals.push(approval);
    }
  }

  return { approvedToolApprovals, deniedToolApprovals };
}
