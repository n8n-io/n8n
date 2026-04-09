import {
  AssistantModelMessage,
  ModelMessage,
  SystemModelMessage,
  ToolModelMessage,
  UserModelMessage,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { providerMetadataSchema } from '../types/provider-metadata';
import {
  filePartSchema,
  imagePartSchema,
  reasoningPartSchema,
  textPartSchema,
  toolApprovalRequestSchema,
  toolCallPartSchema,
  toolApprovalResponseSchema,
  toolResultPartSchema,
} from './content-part';

export const systemModelMessageSchema: z.ZodType<SystemModelMessage> = z.object(
  {
    role: z.literal('system'),
    content: z.string(),
    providerOptions: providerMetadataSchema.optional(),
  },
);

export const userModelMessageSchema: z.ZodType<UserModelMessage> = z.object({
  role: z.literal('user'),
  content: z.union([
    z.string(),
    z.array(z.union([textPartSchema, imagePartSchema, filePartSchema])),
  ]),
  providerOptions: providerMetadataSchema.optional(),
});

export const assistantModelMessageSchema: z.ZodType<AssistantModelMessage> =
  z.object({
    role: z.literal('assistant'),
    content: z.union([
      z.string(),
      z.array(
        z.union([
          textPartSchema,
          filePartSchema,
          reasoningPartSchema,
          toolCallPartSchema,
          toolResultPartSchema,
          toolApprovalRequestSchema,
        ]),
      ),
    ]),
    providerOptions: providerMetadataSchema.optional(),
  });

export const toolModelMessageSchema: z.ZodType<ToolModelMessage> = z.object({
  role: z.literal('tool'),
  content: z.array(z.union([toolResultPartSchema, toolApprovalResponseSchema])),
  providerOptions: providerMetadataSchema.optional(),
});

export const modelMessageSchema: z.ZodType<ModelMessage> = z.union([
  systemModelMessageSchema,
  userModelMessageSchema,
  assistantModelMessageSchema,
  toolModelMessageSchema,
]);
