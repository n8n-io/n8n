/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ActiveAuthorizationHandler } from './types'
import { TurnContext } from '../../turnContext'
import { Storage } from '../../storage'

/**
 * Storage manager for handler state.
 */
export class HandlerStorage<TActiveHandler extends ActiveAuthorizationHandler = ActiveAuthorizationHandler> {
  /**
   * Creates an instance of the HandlerStorage.
   * @param storage The storage provider.
   * @param context The turn context.
   */
  constructor (private storage: Storage, private context: TurnContext) { }

  /**
   * Gets the unique key for a handler session.
   */
  public get key (): string {
    const channelId = this.context.activity.channelId?.trim()
    const userId = this.context.activity.from?.id?.trim()
    if (!channelId || !userId) {
      throw new Error(`Both 'activity.channelId' and 'activity.from.id' are required to generate the ${HandlerStorage.name} key.`)
    }
    return `auth/${channelId}/${userId}`
  }

  /**
   * Reads the active handler state from storage.
   */
  public async read (): Promise<TActiveHandler | undefined> {
    const ongoing = await this.storage.read([this.key])
    return ongoing?.[this.key]
  }

  /**
   * Writes handler state to storage.
   */
  public write (data: TActiveHandler) : Promise<void> {
    return this.storage.write({ [this.key]: data })
  }

  /**
   * Deletes handler state from storage.
   */
  public async delete (): Promise<void> {
    try {
      await this.storage.delete([this.key])
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 404) {
        return
      }
      throw error
    }
  }
}
