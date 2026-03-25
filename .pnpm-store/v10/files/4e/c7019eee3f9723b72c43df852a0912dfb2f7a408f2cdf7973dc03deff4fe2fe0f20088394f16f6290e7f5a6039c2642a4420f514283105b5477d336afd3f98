/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Represents an adaptive card invoke action.
 */
export interface AdaptiveCardInvokeAction {
  /**
   * The type of the action.
   */
  type: string
  /**
   * The unique identifier of the action.
   */
  id?: string
  /**
   * The verb associated with the action.
   */
  verb: string
  /**
   * Additional data associated with the action.
   */
  data: Record<string, any>
}

/**
 * Zod schema for validating an adaptive card invoke action.
 */
export const adaptiveCardInvokeActionZodSchema = z.object({
  type: z.string().min(1),
  id: z.string().optional(),
  verb: z.string().min(1),
  data: z.record(z.string().min(1), z.any())
})
