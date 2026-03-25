/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { CardAction, cardActionZodSchema } from './cardAction'

/**
 * Represents suggested actions.
 */
export interface SuggestedActions {
  /**
   * Array of recipient IDs.
   */
  to: string[]
  /**
   * Array of card actions.
   */
  actions: CardAction[]
}

/**
 * Zod schema for validating SuggestedActions.
 */
export const suggestedActionsZodSchema = z.object({
  to: z.array(z.string().min(1)),
  actions: z.array(cardActionZodSchema)
})
