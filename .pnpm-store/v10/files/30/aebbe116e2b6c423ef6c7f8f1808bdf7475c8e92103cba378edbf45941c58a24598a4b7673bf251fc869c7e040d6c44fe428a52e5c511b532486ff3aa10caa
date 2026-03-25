/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { MessageReactionTypes, messageReactionTypesZodSchema } from './messageReactionTypes'

/**
 * Represents a message reaction.
 */
export interface MessageReaction {
  /**
   * The type of the reaction.
   */
  type: MessageReactionTypes | string
}

/**
 * Zod schema for validating a MessageReaction object.
 */
export const messageReactionZodSchema = z.object({
  type: z.union([messageReactionTypesZodSchema, z.string().min(1)])
})
