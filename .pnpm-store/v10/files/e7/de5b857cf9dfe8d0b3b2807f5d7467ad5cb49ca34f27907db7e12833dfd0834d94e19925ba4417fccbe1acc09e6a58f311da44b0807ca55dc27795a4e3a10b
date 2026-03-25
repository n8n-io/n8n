/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Represents a text highlight.
 */
export interface TextHighlight {
  /**
   * The highlighted text.
   */
  text: string
  /**
   * The occurrence count of the highlighted text.
   */
  occurrence: number
}

/**
 * Zod schema for validating TextHighlight objects.
 */
export const textHighlightZodSchema = z.object({
  text: z.string().min(1),
  occurrence: z.number()
})
