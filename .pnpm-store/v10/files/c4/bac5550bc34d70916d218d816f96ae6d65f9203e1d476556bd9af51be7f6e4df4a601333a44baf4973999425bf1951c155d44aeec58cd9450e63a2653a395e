import {
  LanguageModelV3FilePart,
  LanguageModelV3Message,
  LanguageModelV3Prompt,
  LanguageModelV3TextPart,
  LanguageModelV3ToolResultOutput,
} from '@ai-sdk/provider';
import {
  DataContent,
  FilePart,
  ImagePart,
  isUrlSupported,
  ModelMessage,
  ReasoningPart,
  TextPart,
  ToolCallPart,
  ToolResultOutput,
  ToolResultPart,
} from '@ai-sdk/provider-utils';
import {
  detectMediaType,
  imageMediaTypeSignatures,
} from '../util/detect-media-type';
import {
  createDefaultDownloadFunction,
  DownloadFunction,
} from '../util/download/download-function';
import { convertToLanguageModelV3DataContent } from './data-content';
import { InvalidMessageRoleError } from './invalid-message-role-error';
import { StandardizedPrompt } from './standardize-prompt';
import { asArray } from '../util/as-array';
import { MissingToolResultsError } from '../error/missing-tool-result-error';

export async function convertToLanguageModelPrompt({
  prompt,
  supportedUrls,
  download = createDefaultDownloadFunction(),
}: {
  prompt: StandardizedPrompt;
  supportedUrls: Record<string, RegExp[]>;
  download: DownloadFunction | undefined;
}): Promise<LanguageModelV3Prompt> {
  const downloadedAssets = await downloadAssets(
    prompt.messages,
    download,
    supportedUrls,
  );

  const approvalIdToToolCallId = new Map<string, string>();
  for (const message of prompt.messages) {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (
          part.type === 'tool-approval-request' &&
          'approvalId' in part &&
          'toolCallId' in part
        ) {
          approvalIdToToolCallId.set(
            part.approvalId as string,
            part.toolCallId as string,
          );
        }
      }
    }
  }

  const approvedToolCallIds = new Set<string>();
  for (const message of prompt.messages) {
    if (message.role === 'tool') {
      for (const part of message.content) {
        if (part.type === 'tool-approval-response') {
          const toolCallId = approvalIdToToolCallId.get(part.approvalId);
          if (toolCallId) {
            approvedToolCallIds.add(toolCallId);
          }
        }
      }
    }
  }

  const messages = [
    ...(prompt.system != null
      ? typeof prompt.system === 'string'
        ? [{ role: 'system' as const, content: prompt.system }]
        : asArray(prompt.system).map(message => ({
            role: 'system' as const,
            content: message.content,
            providerOptions: message.providerOptions,
          }))
      : []),
    ...prompt.messages.map(message =>
      convertToLanguageModelMessage({ message, downloadedAssets }),
    ),
  ];

  // combine consecutive tool messages into a single tool message
  const combinedMessages = [];
  for (const message of messages) {
    if (message.role !== 'tool') {
      combinedMessages.push(message);
      continue;
    }

    const lastCombinedMessage = combinedMessages.at(-1);
    if (lastCombinedMessage?.role === 'tool') {
      lastCombinedMessage.content.push(...message.content);
    } else {
      combinedMessages.push(message);
    }
  }

  const toolCallIds = new Set<string>();

  for (const message of combinedMessages) {
    switch (message.role) {
      case 'assistant': {
        for (const content of message.content) {
          if (content.type === 'tool-call' && !content.providerExecuted) {
            toolCallIds.add(content.toolCallId);
          }
        }
        break;
      }
      case 'tool': {
        for (const content of message.content) {
          if (content.type === 'tool-result') {
            toolCallIds.delete(content.toolCallId);
          }
        }
        break;
      }
      case 'user':
      case 'system':
        // remove approved tool calls from the set before checking:
        for (const id of approvedToolCallIds) {
          toolCallIds.delete(id);
        }

        if (toolCallIds.size > 0) {
          throw new MissingToolResultsError({
            toolCallIds: Array.from(toolCallIds),
          });
        }
        break;
    }
  }

  // remove approved tool calls from the set before checking:
  for (const id of approvedToolCallIds) {
    toolCallIds.delete(id);
  }

  if (toolCallIds.size > 0) {
    throw new MissingToolResultsError({ toolCallIds: Array.from(toolCallIds) });
  }

  return combinedMessages.filter(
    // Filter out empty tool messages (e.g. if they only contained
    // tool-approval-response parts that were removed).
    // This prevents sending invalid empty messages to the provider.
    // Note: provider-executed tool-approval-response parts are preserved.
    message => message.role !== 'tool' || message.content.length > 0,
  );
}

/**
 * Convert a ModelMessage to a LanguageModelV3Message.
 *
 * @param message - The ModelMessage to convert.
 * @param downloadedAssets - A map of URLs to their downloaded data. Only
 * available if the model does not support URLs, null otherwise.
 */
export function convertToLanguageModelMessage({
  message,
  downloadedAssets,
}: {
  message: ModelMessage;
  downloadedAssets: Record<
    string,
    { mediaType: string | undefined; data: Uint8Array }
  >;
}): LanguageModelV3Message {
  const role = message.role;
  switch (role) {
    case 'system': {
      return {
        role: 'system',
        content: message.content,
        providerOptions: message.providerOptions,
      };
    }

    case 'user': {
      if (typeof message.content === 'string') {
        return {
          role: 'user',
          content: [{ type: 'text', text: message.content }],
          providerOptions: message.providerOptions,
        };
      }

      return {
        role: 'user',
        content: message.content
          .map(part => convertPartToLanguageModelPart(part, downloadedAssets))
          // remove empty text parts:
          .filter(part => part.type !== 'text' || part.text !== ''),
        providerOptions: message.providerOptions,
      };
    }

    case 'assistant': {
      if (typeof message.content === 'string') {
        return {
          role: 'assistant',
          content: [{ type: 'text', text: message.content }],
          providerOptions: message.providerOptions,
        };
      }

      return {
        role: 'assistant',
        content: message.content
          .filter(
            // remove empty text parts (no text, and no provider options):
            part =>
              part.type !== 'text' ||
              part.text !== '' ||
              part.providerOptions != null,
          )
          .filter(
            (
              part,
            ): part is
              | TextPart
              | FilePart
              | ReasoningPart
              | ToolCallPart
              | ToolResultPart => part.type !== 'tool-approval-request',
          )
          .map(part => {
            const providerOptions = part.providerOptions;

            switch (part.type) {
              case 'file': {
                const { data, mediaType } = convertToLanguageModelV3DataContent(
                  part.data,
                );
                return {
                  type: 'file',
                  data,
                  filename: part.filename,
                  mediaType: mediaType ?? part.mediaType,
                  providerOptions,
                };
              }
              case 'reasoning': {
                return {
                  type: 'reasoning',
                  text: part.text,
                  providerOptions,
                };
              }
              case 'text': {
                return {
                  type: 'text' as const,
                  text: part.text,
                  providerOptions,
                };
              }
              case 'tool-call': {
                return {
                  type: 'tool-call' as const,
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.input,
                  providerExecuted: part.providerExecuted,
                  providerOptions,
                };
              }
              case 'tool-result': {
                return {
                  type: 'tool-result' as const,
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  output: mapToolResultOutput(part.output),
                  providerOptions,
                };
              }
            }
          }),
        providerOptions: message.providerOptions,
      };
    }

    case 'tool': {
      return {
        role: 'tool',
        content: message.content
          .filter(
            // Only include tool-approval-response for provider-executed tools
            part =>
              part.type !== 'tool-approval-response' || part.providerExecuted,
          )
          .map(part => {
            switch (part.type) {
              case 'tool-result': {
                return {
                  type: 'tool-result' as const,
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  output: mapToolResultOutput(part.output),
                  providerOptions: part.providerOptions,
                };
              }
              case 'tool-approval-response': {
                return {
                  type: 'tool-approval-response' as const,
                  approvalId: part.approvalId,
                  approved: part.approved,
                  reason: part.reason,
                };
              }
            }
          }),
        providerOptions: message.providerOptions,
      };
    }

    default: {
      const _exhaustiveCheck: never = role;
      throw new InvalidMessageRoleError({ role: _exhaustiveCheck });
    }
  }
}

/**
 * Downloads images and files from URLs in the messages.
 */
async function downloadAssets(
  messages: ModelMessage[],
  download: DownloadFunction,
  supportedUrls: Record<string, RegExp[]>,
): Promise<
  Record<string, { mediaType: string | undefined; data: Uint8Array }>
> {
  const plannedDownloads = messages
    .filter(message => message.role === 'user')
    .map(message => message.content)
    .filter((content): content is Array<TextPart | ImagePart | FilePart> =>
      Array.isArray(content),
    )
    .flat()
    .filter(
      (part): part is ImagePart | FilePart =>
        part.type === 'image' || part.type === 'file',
    )
    .map(part => {
      const mediaType =
        part.mediaType ?? (part.type === 'image' ? 'image/*' : undefined);

      let data = part.type === 'image' ? part.image : part.data;
      if (typeof data === 'string') {
        try {
          data = new URL(data);
        } catch (ignored) {}
      }

      return { mediaType, data };
    })

    .filter(
      (part): part is { mediaType: string | undefined; data: URL } =>
        part.data instanceof URL,
    )
    .map(part => ({
      url: part.data,
      isUrlSupportedByModel:
        part.mediaType != null &&
        isUrlSupported({
          url: part.data.toString(),
          mediaType: part.mediaType,
          supportedUrls,
        }),
    }));

  // download in parallel:
  const downloadedFiles = await download(plannedDownloads);

  return Object.fromEntries(
    downloadedFiles
      .map((file, index) =>
        file == null
          ? null
          : [
              plannedDownloads[index].url.toString(),
              { data: file.data, mediaType: file.mediaType },
            ],
      )
      .filter(file => file != null),
  );
}

/**
 * Convert part of a message to a LanguageModelV3Part.
 *
 * @param part - The part to convert.
 * @param downloadedAssets - A map of URLs to their downloaded data. Only
 * available if the model does not support URLs, null otherwise.
 * @returns The converted part.
 */
function convertPartToLanguageModelPart(
  part: TextPart | ImagePart | FilePart,
  downloadedAssets: Record<
    string,
    { mediaType: string | undefined; data: Uint8Array }
  >,
): LanguageModelV3TextPart | LanguageModelV3FilePart {
  if (part.type === 'text') {
    return {
      type: 'text',
      text: part.text,
      providerOptions: part.providerOptions,
    };
  }

  let originalData: DataContent | URL;
  const type = part.type;
  switch (type) {
    case 'image':
      originalData = part.image;
      break;
    case 'file':
      originalData = part.data;

      break;
    default:
      throw new Error(`Unsupported part type: ${type}`);
  }

  const { data: convertedData, mediaType: convertedMediaType } =
    convertToLanguageModelV3DataContent(originalData);

  let mediaType: string | undefined = convertedMediaType ?? part.mediaType;
  let data: Uint8Array | string | URL = convertedData; // binary | base64 | url

  // If the content is a URL, we check if it was downloaded:
  if (data instanceof URL) {
    const downloadedFile = downloadedAssets[data.toString()];
    if (downloadedFile) {
      data = downloadedFile.data;
      mediaType ??= downloadedFile.mediaType;
    }
  }

  // Now that we have the normalized data either as a URL or a Uint8Array,
  // we can create the LanguageModelV3Part.
  switch (type) {
    case 'image': {
      // When possible, try to detect the media type automatically
      // to deal with incorrect media type inputs.
      // When detection fails, use provided media type.
      if (data instanceof Uint8Array || typeof data === 'string') {
        mediaType =
          detectMediaType({ data, signatures: imageMediaTypeSignatures }) ??
          mediaType;
      }

      return {
        type: 'file',
        mediaType: mediaType ?? 'image/*', // any image
        filename: undefined,
        data,
        providerOptions: part.providerOptions,
      };
    }

    case 'file': {
      // We must have a mediaType for files, if not, throw an error.
      if (mediaType == null) {
        throw new Error(`Media type is missing for file part`);
      }

      return {
        type: 'file',
        mediaType,
        filename: part.filename,
        data,
        providerOptions: part.providerOptions,
      };
    }
  }
}

function mapToolResultOutput(
  output: ToolResultOutput,
): LanguageModelV3ToolResultOutput {
  if (output.type !== 'content') {
    return output;
  }

  return {
    type: 'content',
    value: output.value.map(item => {
      if (item.type !== 'media') {
        return item;
      }

      // AI SDK 5 tool backwards compatibility:
      // map media type to image-data or file-data
      if (item.mediaType.startsWith('image/')) {
        return {
          type: 'image-data' as const,
          data: item.data,
          mediaType: item.mediaType,
        };
      }

      return {
        type: 'file-data' as const,
        data: item.data,
        mediaType: item.mediaType,
      };
    }),
  };
}
