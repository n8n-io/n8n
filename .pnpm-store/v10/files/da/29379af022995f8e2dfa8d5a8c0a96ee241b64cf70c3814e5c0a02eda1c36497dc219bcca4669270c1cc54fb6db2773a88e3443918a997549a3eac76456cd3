/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/**
 * Enum representing activity types.
 */
export enum ActivityTypes {
  /**
   * A message activity.
   */
  Message = 'message',

  /**
   * An update to a contact relationship.
   */
  ContactRelationUpdate = 'contactRelationUpdate',

  /**
   * An update to a conversation.
   */
  ConversationUpdate = 'conversationUpdate',

  /**
   * A typing indicator activity.
   */
  Typing = 'typing',

  /**
   * Indicates the end of a conversation.
   */
  EndOfConversation = 'endOfConversation',

  /**
   * An event activity.
   */
  Event = 'event',

  /**
   * An invoke activity.
   */
  Invoke = 'invoke',

  /**
   * A response to an invoke activity.
   */
  InvokeResponse = 'invokeResponse',

  /**
   * An activity to delete user data.
   */
  DeleteUserData = 'deleteUserData',

  /**
   * An update to a message.
   */
  MessageUpdate = 'messageUpdate',

  /**
   * A deletion of a message.
   */
  MessageDelete = 'messageDelete',

  /**
   * An update to an installation.
   */
  InstallationUpdate = 'installationUpdate',

  /**
   * A reaction to a message.
   */
  MessageReaction = 'messageReaction',

  /**
   * A suggestion activity.
   */
  Suggestion = 'suggestion',

  /**
   * A trace activity for debugging.
   */
  Trace = 'trace',

  /**
   * A handoff activity to another bot or human.
   */
  Handoff = 'handoff',

  /**
   * A command activity.
   */
  Command = 'command',

  /**
   * A result of a command activity.
   */
  CommandResult = 'commandResult',
}

/**
 * Zod schema for validating an ActivityTypes enum.
 */
export const activityTypesZodSchema = z.enum([
  'message',
  'contactRelationUpdate',
  'conversationUpdate',
  'typing',
  'endOfConversation',
  'event',
  'invoke',
  'invokeResponse',
  'deleteUserData',
  'messageUpdate',
  'messageDelete',
  'installationUpdate',
  'messageReaction',
  'suggestion',
  'trace',
  'handoff',
  'command',
  'commandResult',
])
