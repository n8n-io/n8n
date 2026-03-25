/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Represents a generic Entity.
 */
export interface Entity {
  /**
   * The type of the entity.
   */
  type: string
  /**
   * Additional properties of the entity.
   */
  [key: string]: unknown
}

/**
 * Zod schema for validating Entity objects.
 */
export const entityZodSchema = z.object({
  type: z.string().min(1)
}).passthrough()
