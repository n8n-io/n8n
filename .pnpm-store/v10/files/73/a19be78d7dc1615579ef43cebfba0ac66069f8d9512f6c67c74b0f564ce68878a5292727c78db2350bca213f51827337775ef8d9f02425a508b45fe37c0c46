import {
  AssistantContent,
  AssistantModelMessage,
  ToolContent,
  ToolModelMessage,
} from '../prompt';
import { createToolModelOutput } from '../prompt/create-tool-model-output';
import { ContentPart } from './content-part';
import { ToolSet } from './tool-set';

/**
 * Converts the result of a `generateText` or `streamText` call to a list of response messages.
 */
export async function toResponseMessages<TOOLS extends ToolSet>({
  content: inputContent,
  tools,
}: {
  content: Array<ContentPart<TOOLS>>;
  tools: TOOLS | undefined;
}): Promise<Array<AssistantModelMessage | ToolModelMessage>> {
  const responseMessages: Array<AssistantModelMessage | ToolModelMessage> = [];

  const content: AssistantContent = [];
  for (const part of inputContent) {
    // Skip sources - they are response-only content that no provider expects back
    if (part.type === 'source') {
      continue;
    }

    // Skip non-provider-executed tool results/errors (they go in the tool message)
    if (
      (part.type === 'tool-result' || part.type === 'tool-error') &&
      !part.providerExecuted
    ) {
      continue;
    }

    // Skip empty text
    if (part.type === 'text' && part.text.length === 0) {
      continue;
    }

    switch (part.type) {
      case 'text':
        content.push({
          type: 'text',
          text: part.text,
          providerOptions: part.providerMetadata,
        });
        break;
      case 'reasoning':
        content.push({
          type: 'reasoning',
          text: part.text,
          providerOptions: part.providerMetadata,
        });
        break;
      case 'file':
        content.push({
          type: 'file',
          data: part.file.base64,
          mediaType: part.file.mediaType,
          providerOptions: part.providerMetadata,
        });
        break;
      case 'tool-call':
        content.push({
          type: 'tool-call',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          input: part.input,
          providerExecuted: part.providerExecuted,
          providerOptions: part.providerMetadata,
        });
        break;
      case 'tool-result': {
        const output = await createToolModelOutput({
          toolCallId: part.toolCallId,
          input: part.input,
          tool: tools?.[part.toolName],
          output: part.output,
          errorMode: 'none',
        });
        content.push({
          type: 'tool-result',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          output,
          providerOptions: part.providerMetadata,
        });
        break;
      }
      case 'tool-error': {
        const output = await createToolModelOutput({
          toolCallId: part.toolCallId,
          input: part.input,
          tool: tools?.[part.toolName],
          output: part.error,
          errorMode: 'json',
        });
        content.push({
          type: 'tool-result',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          output,
          providerOptions: part.providerMetadata,
        });
        break;
      }
      case 'tool-approval-request':
        content.push({
          type: 'tool-approval-request',
          approvalId: part.approvalId,
          toolCallId: part.toolCall.toolCallId,
        });
        break;
    }
  }

  if (content.length > 0) {
    responseMessages.push({
      role: 'assistant',
      content,
    });
  }

  const toolResultContent: ToolContent = [];
  for (const part of inputContent) {
    if (
      !(part.type === 'tool-result' || part.type === 'tool-error') ||
      part.providerExecuted
    ) {
      continue;
    }

    const output = await createToolModelOutput({
      toolCallId: part.toolCallId,
      input: part.input,
      tool: tools?.[part.toolName],
      output: part.type === 'tool-result' ? part.output : part.error,
      errorMode: part.type === 'tool-error' ? 'text' : 'none',
    });

    toolResultContent.push({
      type: 'tool-result',
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      output,
      ...(part.providerMetadata != null
        ? { providerOptions: part.providerMetadata }
        : {}),
    });
  }

  if (toolResultContent.length > 0) {
    responseMessages.push({
      role: 'tool',
      content: toolResultContent,
    });
  }

  return responseMessages;
}
