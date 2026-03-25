/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { ChannelAccount, channelAccountZodSchema } from './channelAccount'
import { ConversationAccount, conversationAccountZodSchema } from './conversationAccount'

/**
 * Represents a reference to a conversation.
 */
export interface ConversationReference {
  /**
   * The ID of the activity. Optional.
   */
  activityId?: string

  /**
   * The user involved in the conversation. Optional.
   */
  user?: ChannelAccount

  /**
   * The locale of the conversation. Optional.
   */
  locale?: string

  /**
   * The agent involved in the conversation. Can be undefined or null. Optional.
   */
  agent?: ChannelAccount | undefined | null

  /**
   * The conversation account details.
   */
  conversation: ConversationAccount

  /**
   * The ID of the channel where the conversation is taking place.
   */
  channelId: string

  /**
   * The service URL for the conversation. Optional.
   */
  serviceUrl?: string | undefined
}

/**
 * Zod schema for validating a conversation reference.
 */
export const conversationReferenceZodSchema = z.object({
  activityId: z.string().min(1).optional(),
  user: channelAccountZodSchema.optional(),
  locale: z.string().min(1).optional(),
  agent: channelAccountZodSchema.optional().nullable(),
  conversation: conversationAccountZodSchema,
  channelId: z.string().min(1),
  serviceUrl: z.string().min(1).optional()
})
