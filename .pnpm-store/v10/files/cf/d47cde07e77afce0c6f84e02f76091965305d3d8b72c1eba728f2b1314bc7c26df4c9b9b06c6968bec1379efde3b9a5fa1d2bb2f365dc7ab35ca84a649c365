import { ModelMessage } from '@ai-sdk/provider-utils';
import { TypedToolCall } from './tool-call';
import { ToolSet } from './tool-set';

export async function isApprovalNeeded<TOOLS extends ToolSet>({
  tool,
  toolCall,
  messages,
  experimental_context,
}: {
  tool: TOOLS[keyof TOOLS];
  toolCall: TypedToolCall<TOOLS>;
  messages: ModelMessage[];
  experimental_context: unknown;
}) {
  if (tool.needsApproval == null) {
    return false;
  }

  if (typeof tool.needsApproval === 'boolean') {
    return tool.needsApproval;
  }

  return await tool.needsApproval(toolCall.input, {
    toolCallId: toolCall.toolCallId,
    messages,
    experimental_context,
  });
}
