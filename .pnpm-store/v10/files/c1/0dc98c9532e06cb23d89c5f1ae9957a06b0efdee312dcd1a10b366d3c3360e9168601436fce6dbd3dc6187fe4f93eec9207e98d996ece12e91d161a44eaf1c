import {
  LanguageModelV3Prompt,
  SharedV3ProviderMetadata,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { OpenAICompatibleChatPrompt } from './openai-compatible-api-types';
import {
  convertBase64ToUint8Array,
  convertToBase64,
} from '@ai-sdk/provider-utils';

function getOpenAIMetadata(message: {
  providerOptions?: SharedV3ProviderMetadata;
}) {
  return message?.providerOptions?.openaiCompatible ?? {};
}

function getAudioFormat(mediaType: string): 'wav' | 'mp3' | null {
  switch (mediaType) {
    case 'audio/wav':
      return 'wav';
    case 'audio/mp3':
    case 'audio/mpeg':
      return 'mp3';
    default:
      return null;
  }
}

export function convertToOpenAICompatibleChatMessages(
  prompt: LanguageModelV3Prompt,
): OpenAICompatibleChatPrompt {
  const messages: OpenAICompatibleChatPrompt = [];
  for (const { role, content, ...message } of prompt) {
    const metadata = getOpenAIMetadata({ ...message });
    switch (role) {
      case 'system': {
        messages.push({ role: 'system', content, ...metadata });
        break;
      }

      case 'user': {
        if (content.length === 1 && content[0].type === 'text') {
          messages.push({
            role: 'user',
            content: content[0].text,
            ...getOpenAIMetadata(content[0]),
          });
          break;
        }

        messages.push({
          role: 'user',
          content: content.map(part => {
            const partMetadata = getOpenAIMetadata(part);
            switch (part.type) {
              case 'text': {
                return { type: 'text', text: part.text, ...partMetadata };
              }
              case 'file': {
                if (part.mediaType.startsWith('image/')) {
                  const mediaType =
                    part.mediaType === 'image/*'
                      ? 'image/jpeg'
                      : part.mediaType;

                  return {
                    type: 'image_url',
                    image_url: {
                      url:
                        part.data instanceof URL
                          ? part.data.toString()
                          : `data:${mediaType};base64,${convertToBase64(part.data)}`,
                    },
                    ...partMetadata,
                  };
                }

                if (part.mediaType.startsWith('audio/')) {
                  if (part.data instanceof URL) {
                    throw new UnsupportedFunctionalityError({
                      functionality: 'audio file parts with URLs',
                    });
                  }

                  const format = getAudioFormat(part.mediaType);
                  if (format === null) {
                    throw new UnsupportedFunctionalityError({
                      functionality: `audio media type ${part.mediaType}`,
                    });
                  }

                  return {
                    type: 'input_audio',
                    input_audio: {
                      data: convertToBase64(part.data),
                      format,
                    },
                    ...partMetadata,
                  };
                }

                if (part.mediaType === 'application/pdf') {
                  if (part.data instanceof URL) {
                    throw new UnsupportedFunctionalityError({
                      functionality: 'PDF file parts with URLs',
                    });
                  }

                  return {
                    type: 'file',
                    file: {
                      filename: part.filename ?? 'document.pdf',
                      file_data: `data:application/pdf;base64,${convertToBase64(part.data)}`,
                    },
                    ...partMetadata,
                  };
                }

                if (part.mediaType.startsWith('text/')) {
                  const textContent =
                    part.data instanceof URL
                      ? part.data.toString()
                      : typeof part.data === 'string'
                        ? new TextDecoder().decode(
                            convertBase64ToUint8Array(part.data),
                          )
                        : new TextDecoder().decode(part.data);

                  return {
                    type: 'text',
                    text: textContent,
                    ...partMetadata,
                  };
                }

                // Unsupported type
                throw new UnsupportedFunctionalityError({
                  functionality: `file part media type ${part.mediaType}`,
                });
              }
            }
          }),
          ...metadata,
        });

        break;
      }

      case 'assistant': {
        let text = '';
        let reasoning = '';
        const toolCalls: Array<{
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
          extra_content?: {
            google?: {
              thought_signature?: string;
            };
          };
        }> = [];

        for (const part of content) {
          const partMetadata = getOpenAIMetadata(part);
          switch (part.type) {
            case 'text': {
              text += part.text;
              break;
            }
            case 'reasoning': {
              reasoning += part.text;
              break;
            }
            case 'tool-call': {
              // TODO: thoughtSignature should be abstracted once we add support for other providers
              const thoughtSignature =
                part.providerOptions?.google?.thoughtSignature;
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input),
                },
                ...partMetadata,
                // Include extra_content for Google Gemini thought signatures
                ...(thoughtSignature
                  ? {
                      extra_content: {
                        google: {
                          thought_signature: String(thoughtSignature),
                        },
                      },
                    }
                  : {}),
              });
              break;
            }
          }
        }

        messages.push({
          role: 'assistant',
          content: text,
          ...(reasoning.length > 0 ? { reasoning_content: reasoning } : {}),
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          ...metadata,
        });

        break;
      }

      case 'tool': {
        for (const toolResponse of content) {
          if (toolResponse.type === 'tool-approval-response') {
            continue;
          }

          const output = toolResponse.output;

          let contentValue: string;
          switch (output.type) {
            case 'text':
            case 'error-text':
              contentValue = output.value;
              break;
            case 'execution-denied':
              contentValue = output.reason ?? 'Tool execution denied.';
              break;
            case 'content':
            case 'json':
            case 'error-json':
              contentValue = JSON.stringify(output.value);
              break;
          }

          const toolResponseMetadata = getOpenAIMetadata(toolResponse);
          messages.push({
            role: 'tool',
            tool_call_id: toolResponse.toolCallId,
            content: contentValue,
            ...toolResponseMetadata,
          });
        }
        break;
      }

      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }

  return messages;
}
