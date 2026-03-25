/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { roleTypeZodSchema, RoleTypes } from './roleTypes'

/**
 * Represents a conversation account.
 */
export interface ConversationAccount {
  /**
   * The unique identifier of the conversation account.
   */
  id: string

  /**
   * The type of the conversation (e.g., personal, group, etc.).
   */
  conversationType?: string

  /**
   * The tenant ID associated with the conversation account.
   */
  tenantId?: string

  /**
   * Indicates whether the conversation is a group.
   */
  isGroup?: boolean

  /**
   * The name of the conversation account.
   */
  name?: string

  /**
   * The Azure Active Directory object ID of the conversation account.
   */
  aadObjectId?: string

  /**
   * The role of the conversation account.
   */
  role?: RoleTypes | string

  /**
   * Additional properties of the conversation account.
   */
  properties?: unknown
}

/**
 * Zod schema for validating a conversation account.
 */
export const conversationAccountZodSchema = z.object({
  isGroup: z.boolean().optional(),
  conversationType: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  aadObjectId: z.string().min(1).optional(),
  role: z.union([roleTypeZodSchema, z.string().min(1)]).optional(),
  properties: z.unknown().optional()
})
