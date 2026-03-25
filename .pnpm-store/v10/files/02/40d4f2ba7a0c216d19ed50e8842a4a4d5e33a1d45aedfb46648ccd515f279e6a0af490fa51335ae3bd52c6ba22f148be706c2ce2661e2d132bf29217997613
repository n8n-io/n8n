/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing the layout types for attachments.
 */
export enum AttachmentLayoutTypes {
  /**
   * Displays attachments in a list format.
   */
  List = 'list',

  /**
   * Displays attachments in a carousel format.
   */
  Carousel = 'carousel',
}

/**
 * Zod schema for validating attachment layout types.
 */
export const attachmentLayoutTypesZodSchema = z.enum(['list', 'carousel'])
