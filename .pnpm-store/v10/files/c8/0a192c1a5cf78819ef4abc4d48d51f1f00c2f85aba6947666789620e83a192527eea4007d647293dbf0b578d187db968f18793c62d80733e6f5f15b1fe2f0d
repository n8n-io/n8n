/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Represents an attachment.
 */
export interface Attachment {
  /**
   * The MIME type of the attachment content.
   */
  contentType: string

  /**
   * The URL of the attachment content.
   */
  contentUrl?: string

  /**
   * The content of the attachment.
   */
  content?: unknown

  /**
   * The name of the attachment.
   */
  name?: string

  /**
   * The URL of the thumbnail for the attachment.
   */
  thumbnailUrl?: string
}

/**
 * Zod schema for validating attachments.
 */
export const attachmentZodSchema = z.object({
  contentType: z.string().min(1),
  contentUrl: z.string().min(1).optional(),
  content: z.unknown().optional(),
  name: z.string().min(1).optional(),
  thumbnailUrl: z.string().min(1).optional()
})
