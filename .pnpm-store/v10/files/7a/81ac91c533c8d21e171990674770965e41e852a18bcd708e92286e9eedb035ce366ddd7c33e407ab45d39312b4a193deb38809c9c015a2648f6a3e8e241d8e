/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TurnContext } from '../turnContext'
import { StatePropertyAccessor } from '../state'
import { TurnStateEntry } from './turnStateEntry'
import { TurnState } from './turnState'

/**
 * Maps an application's Turn State property to a State property.
 * @typeParam T Optional. Type of the property being mapped. Defaults to any.
 */
export class TurnStateProperty<T = any> implements StatePropertyAccessor<T> {
  private readonly _state: TurnStateEntry
  private readonly _propertyName: string

  /**
     * Creates a new instance of the `TurnStateProperty` class.
     * @param {TurnState} state Current application turn state.
     * @param {string} scopeName Name of properties the memory scope to use.
     * @param {string} propertyName Name of the property to use.
     */
  public constructor (state: TurnState, scopeName: string, propertyName: string) {
    this._propertyName = propertyName

    const scope = state.getScope(scopeName)
    if (!scope) {
      throw new Error(`TurnStateProperty: TurnState missing state scope named "${scope}".`)
    }

    this._state = scope
    if (!this._state) {
      throw new Error(`TurnStateProperty: TurnState missing state scope named "${scope}".`)
    }
  }

  /**
     * Deletes the state property.
     * @returns {Promise<void>} A promise that represents the work queued to execute.
     */
  public delete (): Promise<void> {
    this._state.value[this._propertyName] = undefined
    return Promise.resolve()
  }

  /**
     * Returns the state property value.
     */
  public get (context: TurnContext): Promise<T | undefined>
  public get (context: TurnContext, defaultValue: T): Promise<T>
  public get (defaultValue?: unknown): Promise<T | undefined> | Promise<T> {
    if (this._state.value[this._propertyName] === undefined) {
      this._state.value[this._propertyName] = defaultValue
    }

    return Promise.resolve(this._state.value[this._propertyName] as T)
  }

  /**
     * Replace's the state property value.
     * @typeParam T
     * @param {TurnContext} context The context object for the turn.
     * @param {T} value The value to assign to the state property.
     * @returns {Promise<void>} A promise that represents the work queued to execute.
     */
  public set (context: TurnContext, value: T): Promise<void> {
    this._state.value[this._propertyName] = value
    return Promise.resolve()
  }
}
