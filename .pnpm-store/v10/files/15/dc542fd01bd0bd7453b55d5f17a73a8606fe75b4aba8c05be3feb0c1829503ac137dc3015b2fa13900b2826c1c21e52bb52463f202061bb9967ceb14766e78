/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AgentState } from './agentState'
import { Storage } from '../storage/storage'
import { TurnContext } from '../turnContext'
import { Activity } from '@microsoft/agents-activity'

/**
 * Manages the state of a user.
 */
export class UserState extends AgentState {
  /**
    * Creates a new instance of UserState.
    * @param storage The storage provider.
    */
  constructor (storage: Storage, private readonly namespace: string = '') {
    super(storage, (context: TurnContext) => {
      const key: string = this.getStorageKey(context)

      return key ?? new Error('UserState: overridden getStorageKey method did not return a key.')
    })
  }

  private getStorageKey (context: TurnContext): string {
    const activity: Activity = context.activity

    const channelId = activity.channelId
    const userId = activity && (activity.from != null) && activity.from.id ? activity.from.id : undefined

    if (!channelId) {
      throw new Error('missing activity.channelId')
    }

    if (!userId) {
      throw new Error('missing activity.from.id')
    }

    return `${channelId}/users/${userId}/${this.namespace}`
  }
}
