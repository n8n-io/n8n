import { TypeValidationContext, TypeValidationError } from '@ai-sdk/provider';
import {
  FlexibleSchema,
  lazySchema,
  StandardSchemaV1,
  Tool,
  validateTypes,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { InvalidArgumentError } from '../error';
import { providerMetadataSchema } from '../types/provider-metadata';
import {
  DataUIPart,
  InferUIMessageData,
  InferUIMessageTools,
  ToolUIPart,
  UIMessage,
} from './ui-messages';

const uiMessagesSchema = lazySchema(() =>
  zodSchema(
    z
      .array(
        z.object({
          id: z.string(),
          role: z.enum(['system', 'user', 'assistant']),
          metadata: z.unknown().optional(),
          parts: z
            .array(
              z.union([
                z.object({
                  type: z.literal('text'),
                  text: z.string(),
                  state: z.enum(['streaming', 'done']).optional(),
                  providerMetadata: providerMetadataSchema.optional(),
                }),
                z.object({
                  type: z.literal('reasoning'),
                  text: z.string(),
                  state: z.enum(['streaming', 'done']).optional(),
                  providerMetadata: providerMetadataSchema.optional(),
                }),
                z.object({
                  type: z.literal('source-url'),
                  sourceId: z.string(),
                  url: z.string(),
                  title: z.string().optional(),
                  providerMetadata: providerMetadataSchema.optional(),
                }),
                z.object({
                  type: z.literal('source-document'),
                  sourceId: z.string(),
                  mediaType: z.string(),
                  title: z.string(),
                  filename: z.string().optional(),
                  providerMetadata: providerMetadataSchema.optional(),
                }),
                z.object({
                  type: z.literal('file'),
                  mediaType: z.string(),
                  filename: z.string().optional(),
                  url: z.string(),
                  providerMetadata: providerMetadataSchema.optional(),
                }),
                z.object({
                  type: z.literal('step-start'),
                }),
                z.object({
                  type: z.string().startsWith('data-'),
                  id: z.string().optional(),
                  data: z.unknown(),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('input-streaming'),
                  input: z.unknown().optional(),
                  providerExecuted: z.boolean().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  approval: z.never().optional(),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('input-available'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.never().optional(),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('approval-requested'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.object({
                    id: z.string(),
                    approved: z.never().optional(),
                    reason: z.never().optional(),
                  }),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('approval-responded'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.object({
                    id: z.string(),
                    approved: z.boolean(),
                    reason: z.string().optional(),
                  }),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('output-available'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.unknown(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  preliminary: z.boolean().optional(),
                  approval: z
                    .object({
                      id: z.string(),
                      approved: z.literal(true),
                      reason: z.string().optional(),
                    })
                    .optional(),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('output-error'),
                  input: z.unknown(),
                  rawInput: z.unknown().optional(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.string(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  approval: z
                    .object({
                      id: z.string(),
                      approved: z.literal(true),
                      reason: z.string().optional(),
                    })
                    .optional(),
                }),
                z.object({
                  type: z.literal('dynamic-tool'),
                  toolName: z.string(),
                  toolCallId: z.string(),
                  state: z.literal('output-denied'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.object({
                    id: z.string(),
                    approved: z.literal(false),
                    reason: z.string().optional(),
                  }),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('input-streaming'),
                  providerExecuted: z.boolean().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  input: z.unknown().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  approval: z.never().optional(),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('input-available'),
                  providerExecuted: z.boolean().optional(),
                  input: z.unknown(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.never().optional(),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('approval-requested'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.object({
                    id: z.string(),
                    approved: z.never().optional(),
                    reason: z.never().optional(),
                  }),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('approval-responded'),
                  input: z.unknown(),
                  providerExecuted: z.boolean().optional(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.object({
                    id: z.string(),
                    approved: z.boolean(),
                    reason: z.string().optional(),
                  }),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('output-available'),
                  providerExecuted: z.boolean().optional(),
                  input: z.unknown(),
                  output: z.unknown(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  preliminary: z.boolean().optional(),
                  approval: z
                    .object({
                      id: z.string(),
                      approved: z.literal(true),
                      reason: z.string().optional(),
                    })
                    .optional(),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('output-error'),
                  providerExecuted: z.boolean().optional(),
                  input: z.unknown(),
                  rawInput: z.unknown().optional(),
                  output: z.never().optional(),
                  errorText: z.string(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  resultProviderMetadata: providerMetadataSchema.optional(),
                  approval: z
                    .object({
                      id: z.string(),
                      approved: z.literal(true),
                      reason: z.string().optional(),
                    })
                    .optional(),
                }),
                z.object({
                  type: z.string().startsWith('tool-'),
                  toolCallId: z.string(),
                  state: z.literal('output-denied'),
                  providerExecuted: z.boolean().optional(),
                  input: z.unknown(),
                  output: z.never().optional(),
                  errorText: z.never().optional(),
                  callProviderMetadata: providerMetadataSchema.optional(),
                  approval: z.object({
                    id: z.string(),
                    approved: z.literal(false),
                    reason: z.string().optional(),
                  }),
                }),
              ]),
            )
            .nonempty('Message must contain at least one part'),
        }),
      )
      .nonempty('Messages array must not be empty'),
  ),
);

export type SafeValidateUIMessagesResult<UI_MESSAGE extends UIMessage> =
  | {
      success: true;
      data: Array<UI_MESSAGE>;
    }
  | {
      success: false;
      error: Error;
    };

/**
 * Validates a list of UI messages like `validateUIMessages`,
 * but instead of throwing it returns `{ success: true, data }`
 * or `{ success: false, error }`.
 */
export async function safeValidateUIMessages<UI_MESSAGE extends UIMessage>({
  messages,
  metadataSchema,
  dataSchemas,
  tools,
}: {
  messages: unknown;
  metadataSchema?: FlexibleSchema<UIMessage['metadata']>;
  dataSchemas?: {
    [NAME in keyof InferUIMessageData<UI_MESSAGE> & string]?: FlexibleSchema<
      InferUIMessageData<UI_MESSAGE>[NAME]
    >;
  };
  tools?: {
    [NAME in keyof InferUIMessageTools<UI_MESSAGE> & string]?: Tool<
      InferUIMessageTools<UI_MESSAGE>[NAME]['input'],
      InferUIMessageTools<UI_MESSAGE>[NAME]['output']
    >;
  };
}): Promise<SafeValidateUIMessagesResult<UI_MESSAGE>> {
  try {
    if (messages == null) {
      return {
        success: false,
        error: new InvalidArgumentError({
          parameter: 'messages',
          value: messages,
          message: 'messages parameter must be provided',
        }),
      };
    }

    const validatedMessages = await validateTypes({
      value: messages,
      schema: uiMessagesSchema,
    });

    if (metadataSchema) {
      for (const [msgIdx, message] of validatedMessages.entries()) {
        await validateTypes({
          value: message.metadata,
          schema: metadataSchema,
          context: {
            field: `messages[${msgIdx}].metadata`,
            entityId: message.id,
          },
        });
      }
    }

    if (dataSchemas || tools) {
      for (const [msgIdx, message] of validatedMessages.entries()) {
        for (const [partIdx, part] of message.parts.entries()) {
          // Data part validation
          if (dataSchemas && part.type.startsWith('data-')) {
            const dataPart = part as DataUIPart<InferUIMessageData<UI_MESSAGE>>;
            const dataName = dataPart.type.slice(5);
            const dataSchema = dataSchemas[dataName];

            if (!dataSchema) {
              return {
                success: false,
                error: new TypeValidationError({
                  value: dataPart.data,
                  cause: `No data schema found for data part ${dataName}`,
                  context: {
                    field: `messages[${msgIdx}].parts[${partIdx}].data`,
                    entityName: dataName,
                    entityId: dataPart.id,
                  },
                }),
              };
            }

            await validateTypes({
              value: dataPart.data,
              schema: dataSchema,
              context: {
                field: `messages[${msgIdx}].parts[${partIdx}].data`,
                entityName: dataName,
                entityId: dataPart.id,
              },
            });
          }

          // Tool part validation
          if (tools && part.type.startsWith('tool-')) {
            const toolPart = part as ToolUIPart<
              InferUIMessageTools<UI_MESSAGE>
            >;
            const toolName = toolPart.type.slice(5);
            const tool = tools[toolName];

            // TODO support dynamic tools
            if (!tool) {
              return {
                success: false,
                error: new TypeValidationError({
                  value: toolPart.input,
                  cause: `No tool schema found for tool part ${toolName}`,
                  context: {
                    field: `messages[${msgIdx}].parts[${partIdx}].input`,
                    entityName: toolName,
                    entityId: toolPart.toolCallId,
                  },
                }),
              };
            }

            // Tool input validation
            if (
              toolPart.state === 'input-available' ||
              toolPart.state === 'output-available' ||
              (toolPart.state === 'output-error' &&
                toolPart.input !== undefined)
            ) {
              await validateTypes({
                value: toolPart.input,
                schema: tool.inputSchema,
                context: {
                  field: `messages[${msgIdx}].parts[${partIdx}].input`,
                  entityName: toolName,
                  entityId: toolPart.toolCallId,
                },
              });
            }

            // Tool output validation
            if (toolPart.state === 'output-available' && tool.outputSchema) {
              await validateTypes({
                value: toolPart.output,
                schema: tool.outputSchema,
                context: {
                  field: `messages[${msgIdx}].parts[${partIdx}].output`,
                  entityName: toolName,
                  entityId: toolPart.toolCallId,
                },
              });
            }
          }
        }
      }
    }

    return {
      success: true,
      data: validatedMessages as Array<UI_MESSAGE>,
    };
  } catch (error) {
    const err = error as Error;

    return {
      success: false,
      error: err,
    };
  }
}

/**
 * Validates a list of UI messages.
 *
 * Metadata, data parts, and generic tool call structures are only validated if
 * the corresponding schemas are provided. Otherwise, they are assumed to be
 * valid.
 */
export async function validateUIMessages<UI_MESSAGE extends UIMessage>({
  messages,
  metadataSchema,
  dataSchemas,
  tools,
}: {
  messages: unknown;
  metadataSchema?: FlexibleSchema<UIMessage['metadata']>;
  dataSchemas?: {
    [NAME in keyof InferUIMessageData<UI_MESSAGE> & string]?: FlexibleSchema<
      InferUIMessageData<UI_MESSAGE>[NAME]
    >;
  };
  tools?: {
    [NAME in keyof InferUIMessageTools<UI_MESSAGE> & string]?: Tool<
      InferUIMessageTools<UI_MESSAGE>[NAME]['input'],
      InferUIMessageTools<UI_MESSAGE>[NAME]['output']
    >;
  };
}): Promise<Array<UI_MESSAGE>> {
  const response = await safeValidateUIMessages({
    messages,
    metadataSchema,
    dataSchemas,
    tools,
  });

  if (!response.success) throw response.error;

  return response.data;
}
