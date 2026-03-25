/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { RouteHandler } from './routeHandler'
import { RouteSelector } from './routeSelector'
import { TurnState } from './turnState'

/**
 * Represents a route configuration for handling bot activities within an application.
 *
 * @typeParam TState - The type of turn state that extends TurnState, allowing for
 *                    type-safe access to custom state properties within route handlers
 *
 * @remarks
 * An AppRoute defines how incoming activities are matched and processed by combining
 * a selector function that determines when the route should be activated with a handler
 * function that processes the matched activities.
 *
 * @example
 * ```typescript
 * const echoRoute: AppRoute<MyTurnState> = {
 *   selector: (activity) => activity.type === 'message',
 *   handler: async (context, state) => {
 *     await context.sendActivity(`You said: ${context.activity.text}`);
 *   }
 * };
 * ```
 *
 */
export interface AppRoute<TState extends TurnState> {
  /**
   * The selector function used to determine if this route should handle the current activity.
   *
   * @remarks
   * This function is called for each incoming activity to determine if the route's handler
   * should be invoked. It receives the activity and returns a boolean indicating whether
   * this route should process the activity.
   */
  selector: RouteSelector;

  /**
   * The handler function that processes the activity if the selector matches.
   *
   * @remarks
   * This function contains the core logic for handling the matched activity. It receives
   * the turn context and state, allowing it to process the activity and respond appropriately.
   * The handler can be asynchronous and should return a promise that resolves when processing
   * is complete.
   */
  handler: RouteHandler<TState>;

  /**
   * Indicates whether this route is an agentic-only route.
   *
   * @default false
   *
   */
  isAgenticRoute?: boolean;

  /**
   * Indicates whether this route is an invoke route.
   *
   * @default false
   *
   * @remarks
   * Invoke routes are used for specific types of activities, such as messaging extensions,
   * adaptive card actions, or other invoke-based interactions. When set to true, this route
   * will be processed differently than regular message routes, typically with special
   * handling for invoke responses.
   *
   */
  isInvokeRoute?: boolean;

  /**
   * Optional rank of the route, used to determine the order in which routes are evaluated.
   *
   * 0 - number.MAX_VALUE. Ranks of the same value are evaluated in order of addition.
   */
  rank?: number;

  /**
   * Optional list of authorization handlers that this route requires.
   *
   * @remarks
   * If provided, the route will check for these authorization handlers before processing
   * the activity. Each string in the array should correspond to a registered authorization
   * handler name. All specified handlers must pass authorization checks before the route
   * handler is invoked.
   *
   * @example
   * ```typescript
   * authHandlers: ['oauth', 'admin-only']
   * ```
   *
   */
  authHandlers?: string[]
}
