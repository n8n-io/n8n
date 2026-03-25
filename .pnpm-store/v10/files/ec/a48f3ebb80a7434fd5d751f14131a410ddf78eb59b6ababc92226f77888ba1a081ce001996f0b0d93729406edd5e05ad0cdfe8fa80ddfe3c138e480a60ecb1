/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum expressing the users relationship to the current channel.
 */
export enum MembershipTypes {
  /**
   * The user is a direct member of a channel.
   */
  Direct = 'direct',

  /**
   * The user is a member of a channel through a group.
   */
  Transitive = 'transitive',
}

/**
 * Zod schema for validating membership source types.
 */
export const membershipTypeZodSchema = z.enum(['direct', 'transitive'])
