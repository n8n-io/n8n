/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AgentState } from './agentState'
import { Storage } from '../storage/storage'
import { TurnContext } from '../turnContext'
import { Activity } from '@microsoft/agents-activity'

/**
 * Manages the state of a conversation.
 */
export class ConversationState extends AgentState {
  /**
   * Creates a new instance of ConversationState.
   * @param storage The storage provider.
   */
  constructor (storage: Storage, private readonly namespace: string = '') {
    super(storage, (context: TurnContext) => {
      const key: string = this.getStorageKey(context)

      return key ?? new Error('ConversationState: overridden getStorageKey method did not return a key.')
    })
  }

  private getStorageKey (context: TurnContext): string {
    const activity: Activity = context.activity
    const channelId = activity.channelId
    const conversationId = activity && (activity.conversation != null) && activity.conversation.id ? activity.conversation.id : undefined

    if (!channelId) {
      throw new Error('missing activity.channelId')
    }

    if (!conversationId) {
      throw new Error('missing activity.conversation.id')
    }

    return `${channelId}/conversations/${conversationId}/${this.namespace}`
  }
}
