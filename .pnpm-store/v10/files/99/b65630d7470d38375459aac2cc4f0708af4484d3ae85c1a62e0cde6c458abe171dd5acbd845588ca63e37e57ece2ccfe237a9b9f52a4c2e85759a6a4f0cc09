import {
  LanguageModelV3Prompt,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { convertToBase64 } from '@ai-sdk/provider-utils';
import {
  GoogleGenerativeAIContent,
  GoogleGenerativeAIContentPart,
  GoogleGenerativeAIFunctionResponsePart,
  GoogleGenerativeAIPrompt,
} from './google-generative-ai-prompt';

const dataUrlRegex = /^data:([^;,]+);base64,(.+)$/s;

function parseBase64DataUrl(
  value: string,
): { mediaType: string; data: string } | undefined {
  const match = dataUrlRegex.exec(value);
  if (match == null) {
    return undefined;
  }

  return {
    mediaType: match[1],
    data: match[2],
  };
}

function convertUrlToolResultPart(
  url: string,
): GoogleGenerativeAIFunctionResponsePart | undefined {
  // Per https://ai.google.dev/api/caching#FunctionResponsePart, only inline data is supported.
  // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling#functionresponsepart suggests that this
  // may be different for Vertex, but this needs to be confirmed and further tested for both APIs.
  const parsedDataUrl = parseBase64DataUrl(url);
  if (parsedDataUrl == null) {
    return undefined;
  }

  return {
    inlineData: {
      mimeType: parsedDataUrl.mediaType,
      data: parsedDataUrl.data,
    },
  };
}

/*
 * Appends tool result content parts to the message using the functionResponse
 * format with support for multimodal parts (e.g. inline images/files alongside
 * text). This format is supported by Gemini 3+ models.
 */
function appendToolResultParts(
  parts: GoogleGenerativeAIContentPart[],
  toolName: string,
  outputValue: Array<{
    type: string;
    [key: string]: unknown;
  }>,
): void {
  const functionResponseParts: GoogleGenerativeAIFunctionResponsePart[] = [];
  const responseTextParts: string[] = [];

  for (const contentPart of outputValue) {
    switch (contentPart.type) {
      case 'text': {
        responseTextParts.push(contentPart.text as string);
        break;
      }
      case 'image-data':
      case 'file-data': {
        functionResponseParts.push({
          inlineData: {
            mimeType: contentPart.mediaType as string,
            data: contentPart.data as string,
          },
        });
        break;
      }
      case 'image-url':
      case 'file-url': {
        const functionResponsePart = convertUrlToolResultPart(
          contentPart.url as string,
        );

        if (functionResponsePart != null) {
          functionResponseParts.push(functionResponsePart);
        } else {
          responseTextParts.push(JSON.stringify(contentPart));
        }
        break;
      }
      default: {
        responseTextParts.push(JSON.stringify(contentPart));
        break;
      }
    }
  }

  parts.push({
    functionResponse: {
      name: toolName,
      response: {
        name: toolName,
        content:
          responseTextParts.length > 0
            ? responseTextParts.join('\n')
            : 'Tool executed successfully.',
      },
      ...(functionResponseParts.length > 0
        ? { parts: functionResponseParts }
        : {}),
    },
  });
}

/*
 * Appends tool result content parts using a legacy format for pre-Gemini 3
 * models that do not support multimodal parts within functionResponse. Instead,
 * non-text content like images is sent as separate top-level inlineData parts.
 */
function appendLegacyToolResultParts(
  parts: GoogleGenerativeAIContentPart[],
  toolName: string,
  outputValue: Array<{
    type: string;
    [key: string]: unknown;
  }>,
): void {
  for (const contentPart of outputValue) {
    switch (contentPart.type) {
      case 'text':
        parts.push({
          functionResponse: {
            name: toolName,
            response: {
              name: toolName,
              content: contentPart.text,
            },
          },
        });
        break;
      case 'image-data':
        parts.push(
          {
            inlineData: {
              mimeType: String(contentPart.mediaType),
              data: String(contentPart.data),
            },
          },
          {
            text: 'Tool executed successfully and returned this image as a response',
          },
        );
        break;
      default:
        parts.push({ text: JSON.stringify(contentPart) });
        break;
    }
  }
}

export function convertToGoogleGenerativeAIMessages(
  prompt: LanguageModelV3Prompt,
  options?: {
    isGemmaModel?: boolean;
    providerOptionsName?: string;
    supportsFunctionResponseParts?: boolean;
  },
): GoogleGenerativeAIPrompt {
  const systemInstructionParts: Array<{ text: string }> = [];
  const contents: Array<GoogleGenerativeAIContent> = [];
  let systemMessagesAllowed = true;
  const isGemmaModel = options?.isGemmaModel ?? false;
  const providerOptionsName = options?.providerOptionsName ?? 'google';
  const supportsFunctionResponseParts =
    options?.supportsFunctionResponseParts ?? true;

  for (const { role, content } of prompt) {
    switch (role) {
      case 'system': {
        if (!systemMessagesAllowed) {
          throw new UnsupportedFunctionalityError({
            functionality:
              'system messages are only supported at the beginning of the conversation',
          });
        }

        systemInstructionParts.push({ text: content });
        break;
      }

      case 'user': {
        systemMessagesAllowed = false;

        const parts: GoogleGenerativeAIContentPart[] = [];

        for (const part of content) {
          switch (part.type) {
            case 'text': {
              parts.push({ text: part.text });
              break;
            }

            case 'file': {
              // default to image/jpeg for unknown image/* types
              const mediaType =
                part.mediaType === 'image/*' ? 'image/jpeg' : part.mediaType;

              parts.push(
                part.data instanceof URL
                  ? {
                      fileData: {
                        mimeType: mediaType,
                        fileUri: part.data.toString(),
                      },
                    }
                  : {
                      inlineData: {
                        mimeType: mediaType,
                        data: convertToBase64(part.data),
                      },
                    },
              );

              break;
            }
          }
        }

        contents.push({ role: 'user', parts });
        break;
      }

      case 'assistant': {
        systemMessagesAllowed = false;

        contents.push({
          role: 'model',
          parts: content
            .map(part => {
              const providerOpts =
                part.providerOptions?.[providerOptionsName] ??
                (providerOptionsName !== 'google'
                  ? part.providerOptions?.google
                  : part.providerOptions?.vertex);
              const thoughtSignature =
                providerOpts?.thoughtSignature != null
                  ? String(providerOpts.thoughtSignature)
                  : undefined;

              switch (part.type) {
                case 'text': {
                  return part.text.length === 0
                    ? undefined
                    : {
                        text: part.text,
                        thoughtSignature,
                      };
                }

                case 'reasoning': {
                  return part.text.length === 0
                    ? undefined
                    : {
                        text: part.text,
                        thought: true,
                        thoughtSignature,
                      };
                }

                case 'file': {
                  if (part.data instanceof URL) {
                    throw new UnsupportedFunctionalityError({
                      functionality:
                        'File data URLs in assistant messages are not supported',
                    });
                  }

                  return {
                    inlineData: {
                      mimeType: part.mediaType,
                      data: convertToBase64(part.data),
                    },
                    ...(providerOpts?.thought === true
                      ? { thought: true }
                      : {}),
                    thoughtSignature,
                  };
                }

                case 'tool-call': {
                  return {
                    functionCall: {
                      name: part.toolName,
                      args: part.input,
                    },
                    thoughtSignature,
                  };
                }
              }
            })
            .filter(part => part !== undefined),
        });
        break;
      }

      case 'tool': {
        systemMessagesAllowed = false;

        const parts: GoogleGenerativeAIContentPart[] = [];

        for (const part of content) {
          if (part.type === 'tool-approval-response') {
            continue;
          }
          const output = part.output;

          if (output.type === 'content') {
            if (supportsFunctionResponseParts) {
              appendToolResultParts(parts, part.toolName, output.value);
            } else {
              appendLegacyToolResultParts(parts, part.toolName, output.value);
            }
          } else {
            parts.push({
              functionResponse: {
                name: part.toolName,
                response: {
                  name: part.toolName,
                  content:
                    output.type === 'execution-denied'
                      ? (output.reason ?? 'Tool execution denied.')
                      : output.value,
                },
              },
            });
          }
        }

        contents.push({
          role: 'user',
          parts,
        });
        break;
      }
    }
  }

  if (
    isGemmaModel &&
    systemInstructionParts.length > 0 &&
    contents.length > 0 &&
    contents[0].role === 'user'
  ) {
    const systemText = systemInstructionParts
      .map(part => part.text)
      .join('\n\n');

    contents[0].parts.unshift({ text: systemText + '\n\n' });
  }

  return {
    systemInstruction:
      systemInstructionParts.length > 0 && !isGemmaModel
        ? { parts: systemInstructionParts }
        : undefined,
    contents,
  };
}
