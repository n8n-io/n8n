/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Represents the search parameters for adaptive cards.
 */
export interface AdaptiveCardsSearchParams {
  /**
   * The text query for the search.
   */
  queryText: string;
  /**
   * The dataset to search within.
   */
  dataset: string;
}

/**
 * Zod schema for validating AdaptiveCardsSearchParams.
 */
export const adaptiveCardsSearchParamsZodSchema = z.object({
  queryText: z.string(),
  dataset: z.string(),
})
