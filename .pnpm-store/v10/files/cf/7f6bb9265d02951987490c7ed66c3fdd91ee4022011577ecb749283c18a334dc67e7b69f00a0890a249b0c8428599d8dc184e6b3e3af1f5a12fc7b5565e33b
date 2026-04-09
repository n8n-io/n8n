import {
  SharedV3Warning,
  LanguageModelV3Message,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { convertToBase64 } from '@ai-sdk/provider-utils';
import {
  XaiResponsesInput,
  XaiResponsesUserMessageContentPart,
} from './xai-responses-api';

export async function convertToXaiResponsesInput({
  prompt,
}: {
  prompt: LanguageModelV3Message[];
  store?: boolean;
}): Promise<{
  input: XaiResponsesInput;
  inputWarnings: SharedV3Warning[];
}> {
  const input: XaiResponsesInput = [];
  const inputWarnings: SharedV3Warning[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system': {
        input.push({
          role: 'system',
          content: message.content,
        });
        break;
      }

      case 'user': {
        const contentParts: XaiResponsesUserMessageContentPart[] = [];

        for (const block of message.content) {
          switch (block.type) {
            case 'text': {
              contentParts.push({ type: 'input_text', text: block.text });
              break;
            }

            case 'file': {
              if (block.mediaType.startsWith('image/')) {
                const mediaType =
                  block.mediaType === 'image/*'
                    ? 'image/jpeg'
                    : block.mediaType;

                const imageUrl =
                  block.data instanceof URL
                    ? block.data.toString()
                    : `data:${mediaType};base64,${convertToBase64(block.data)}`;

                contentParts.push({ type: 'input_image', image_url: imageUrl });
              } else {
                throw new UnsupportedFunctionalityError({
                  functionality: `file part media type ${block.mediaType}`,
                });
              }
              break;
            }

            default: {
              const _exhaustiveCheck: never = block;
              inputWarnings.push({
                type: 'other',
                message:
                  'xAI Responses API does not support this content type in user messages',
              });
            }
          }
        }

        input.push({
          role: 'user',
          content: contentParts,
        });
        break;
      }

      case 'assistant': {
        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              const id =
                typeof part.providerOptions?.xai?.itemId === 'string'
                  ? part.providerOptions.xai.itemId
                  : undefined;

              input.push({
                role: 'assistant',
                content: part.text,
                id,
              });

              break;
            }

            case 'tool-call': {
              if (part.providerExecuted) {
                break;
              }

              const id =
                typeof part.providerOptions?.xai?.itemId === 'string'
                  ? part.providerOptions.xai.itemId
                  : undefined;

              input.push({
                type: 'function_call',
                id: id ?? part.toolCallId,
                call_id: part.toolCallId,
                name: part.toolName,
                arguments: JSON.stringify(part.input),
                status: 'completed',
              });
              break;
            }

            case 'tool-result': {
              break;
            }

            case 'reasoning':
            case 'file': {
              inputWarnings.push({
                type: 'other',
                message: `xAI Responses API does not support ${part.type} in assistant messages`,
              });
              break;
            }

            default: {
              const _exhaustiveCheck: never = part;
              inputWarnings.push({
                type: 'other',
                message:
                  'xAI Responses API does not support this content type in assistant messages',
              });
            }
          }
        }

        break;
      }

      case 'tool': {
        for (const part of message.content) {
          if (part.type === 'tool-approval-response') {
            continue;
          }
          const output = part.output;

          let outputValue: string;
          switch (output.type) {
            case 'text':
            case 'error-text':
              outputValue = output.value;
              break;
            case 'execution-denied':
              outputValue = output.reason ?? 'tool execution denied';
              break;
            case 'json':
            case 'error-json':
              outputValue = JSON.stringify(output.value);
              break;
            case 'content':
              outputValue = output.value
                .map(item => {
                  if (item.type === 'text') {
                    return item.text;
                  }
                  return '';
                })
                .join('');
              break;
            default: {
              const _exhaustiveCheck: never = output;
              outputValue = '';
            }
          }

          input.push({
            type: 'function_call_output',
            call_id: part.toolCallId,
            output: outputValue,
          });
        }

        break;
      }

      default: {
        const _exhaustiveCheck: never = message;
        inputWarnings.push({
          type: 'other',
          message: 'unsupported message role',
        });
      }
    }
  }

  return { input, inputWarnings };
}
