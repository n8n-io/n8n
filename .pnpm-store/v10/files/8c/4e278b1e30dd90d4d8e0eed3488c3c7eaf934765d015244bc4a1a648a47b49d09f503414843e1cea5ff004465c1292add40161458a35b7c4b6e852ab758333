/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing the different end of conversation codes.
 */
export enum EndOfConversationCodes {
  /**
   * The end of conversation reason is unknown.
   */
  Unknown = 'unknown',

  /**
   * The conversation completed successfully.
   */
  CompletedSuccessfully = 'completedSuccessfully',

  /**
   * The user cancelled the conversation.
   */
  UserCancelled = 'userCancelled',

  /**
   * The agent timed out during the conversation.
   */
  AgentTimedOut = 'agentTimedOut',

  /**
   * The agent issued an invalid message.
   */
  AgentIssuedInvalidMessage = 'agentIssuedInvalidMessage',

  /**
   * The channel failed during the conversation.
   */
  ChannelFailed = 'channelFailed',
}

/**
 * Zod schema for validating end of conversation codes.
 */
export const endOfConversationCodesZodSchema = z.enum(['unknown', 'completedSuccessfully', 'userCancelled', 'agentTimedOut', 'agentIssuedInvalidMessage', 'channelFailed'])
