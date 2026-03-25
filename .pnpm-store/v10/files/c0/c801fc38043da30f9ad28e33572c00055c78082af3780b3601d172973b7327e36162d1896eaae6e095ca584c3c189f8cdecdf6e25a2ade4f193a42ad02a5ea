/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing text format types.
 */
export enum TextFormatTypes {
  /**
   * Represents text formatted using Markdown.
   */
  Markdown = 'markdown',

  /**
   * Represents plain text without any formatting.
   */
  Plain = 'plain',

  /**
   * Represents text formatted using XML.
   */
  Xml = 'xml',
}

/**
 * Zod schema for validating TextFormatTypes enum values.
 */
export const textFormatTypesZodSchema = z.enum(['markdown', 'plain', 'xml'])
