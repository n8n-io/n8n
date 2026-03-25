/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing the different role types in a conversation.
 */
export enum RoleTypes {
  /**
   * Represents a user in the conversation.
   */
  User = 'user',

  /**
   * Represents an agent or bot in the conversation.
   */
  Agent = 'bot',

  /**
   * Represents a skill in the conversation.
   */
  Skill = 'skill',

  /**
   * Agentic AI - AAI role
   */
  AgenticIdentity = 'agenticAppInstance',

  /**
   * Agentic AI - AAI role.
   */
  AgenticUser = 'agenticUser'
}

/**
 * Zod schema for validating role types.
 */
export const roleTypeZodSchema = z.enum(['user', 'bot', 'skill', 'agenticAppInstance', 'agenticUser'])
