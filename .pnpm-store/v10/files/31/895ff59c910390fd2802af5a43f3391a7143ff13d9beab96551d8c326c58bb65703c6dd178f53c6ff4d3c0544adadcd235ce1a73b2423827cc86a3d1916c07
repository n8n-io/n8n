/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { roleTypeZodSchema, RoleTypes } from './roleTypes'
import { MembershipSource } from './membershipSource'

/**
 * Represents a channel account.
 */
export interface ChannelAccount {
  /**
   * The unique identifier of the channel account.
   */
  id?: string

  /**
   * The name of the channel account.
   */
  name?: string

  /**
   * The Azure Active Directory object ID of the channel account.
   */
  aadObjectId?: string

  /**
   * Tenant ID of the user.
   */
  tenantId?: string

  /**
   * The UPN of an agentic user
   */
  agenticUserId?: string

  /**
   * The client ID of an agentic app
   */
  agenticAppId?: string

  /**
   * The parent blueprint ID of an agentic instance
   */
  agenticAppBlueprintId?: string

  /**
   * The role of the channel account.
   */
  role?: RoleTypes | string

  /**
   * Additional properties of the channel account.
   */
  properties?: unknown

  /**
   * List of membership sources associated with the channel account.
   */
  membershipSources?: MembershipSource[]
}

/**
 * Zod schema for validating a channel account.
 */
export const channelAccountZodSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().optional(),
  aadObjectId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  agenticUserId: z.string().min(1).optional(),
  agenticAppId: z.string().min(1).optional(),
  agenticAppBlueprintId: z.string().min(1).optional(),
  role: z.union([roleTypeZodSchema, z.string().min(1)]).optional(),
  properties: z.unknown().optional()
})
