/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TurnContext } from '../turnContext'
import { TurnState } from './turnState'

/**
 * A handler function for routing operations in a specific turn context and state.
 *
 * @typeParam TState - The type of the turn state.
 * @param context - The turn context for the current operation.
 * @param state - The state associated with the current turn.
 * @returns A promise that resolves when the routing operation is complete.
 */
export type RouteHandler<TState extends TurnState> = (context: TurnContext, state: TState) => Promise<void>
