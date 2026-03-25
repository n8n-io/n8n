/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing activity event names.
 */
export enum ActivityEventNames {
  /**
   * Event name for continuing a conversation.
   */
  ContinueConversation = 'ContinueConversation',

  /**
   * Event name for creating a new conversation.
   */
  CreateConversation = 'CreateConversation',
}

/**
 * Zod schema for validating an ActivityEventNames enum.
 */
export const activityEventNamesZodSchema = z.enum(['ContinueConversation', 'CreateConversation'])
