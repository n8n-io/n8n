/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { ActionTypes, actionTypesZodSchema } from './actionTypes'

/**
 * Represents a card action.
 */
export interface CardAction {
  /**
   * Type of the action.
   */
  type: ActionTypes | string
  /**
   * Title of the action.
   */
  title: string
  /**
   * URL of the image associated with the action.
   */
  image?: string
  /**
   * Text associated with the action.
   */
  text?: string
  /**
   * Display text for the action.
   */
  displayText?: string
  /**
   * Value associated with the action.
   */
  value?: any
  /**
   * Channel-specific data associated with the action.
   */
  channelData?: unknown
  /**
   * Alt text for the image.
   */
  imageAltText?: string
}

/**
 * Zod schema for validating CardAction.
 */
export const cardActionZodSchema = z.object({
  type: z.union([actionTypesZodSchema, z.string().min(1)]),
  title: z.string().min(1),
  image: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  displayText: z.string().min(1).optional(),
  value: z.any().optional(),
  channelData: z.unknown().optional(),
  imageAltText: z.string().min(1).optional()
})
