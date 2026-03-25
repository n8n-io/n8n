/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { Entity, entityZodSchema } from '../entity/entity'
import { SemanticActionStateTypes, semanticActionStateTypesZodSchema } from './semanticActionStateTypes'

/**
 * Represents a semantic action.
 */
export interface SemanticAction {
  /**
   * Unique identifier for the semantic action.
   */
  id: string
  /**
   * State of the semantic action.
   */
  state: SemanticActionStateTypes | string
  /**
   * Entities associated with the semantic action.
   */
  entities: { [propertyName: string]: Entity }
}

/**
 * Zod schema for validating SemanticAction.
 */
export const semanticActionZodSchema = z.object({
  id: z.string().min(1),
  state: z.union([semanticActionStateTypesZodSchema, z.string().min(1)]),
  entities: z.record(entityZodSchema)
})
