/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { MembershipSourceTypes, membershipSourceTypeZodSchema } from './membershipSourceTypes'
import { MembershipTypes, membershipTypeZodSchema } from './membershipTypes'

/**
 * Interface representing a membership source.
 */
export interface MembershipSource {
  /**
   * The type of roster the user is a member of.
   */
  sourceType: MembershipSourceTypes;

  /**
   * The unique identifier of the membership source.
   */
  id: string

  /**
   * The users relationship to the current channel.
   */
  membershipType: MembershipTypes;

  /**
   * The group ID of the team associated with this membership source.
   */
  teamGroupId: string

  /**
   * Optional. The tenant ID for the user.
   */
  tenantId?: string
}

/**
 * Zod schema for validating a membership source.
 */
export const membershipSourceZodSchema = z.object({
  sourceType: membershipSourceTypeZodSchema,
  id: z.string().min(1),
  name: z.string().optional(),
  membershipType: membershipTypeZodSchema,
  teamGroupId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
})
