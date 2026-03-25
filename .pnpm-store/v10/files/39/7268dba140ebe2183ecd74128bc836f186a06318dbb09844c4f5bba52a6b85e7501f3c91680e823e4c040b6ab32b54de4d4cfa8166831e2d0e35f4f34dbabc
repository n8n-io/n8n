/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import { TurnContext } from './turnContext'
import { debug } from '@microsoft/agents-activity/logger'

const logger = debug('agents:middleware')

/**
 * Interface for middleware.
 */
export interface Middleware {
  onTurn: (context: TurnContext, next: () => Promise<void>) => Promise<void>
}

/**
 * Type for middleware handler.
 */
export type MiddlewareHandler = (context: TurnContext, next: () => Promise<void>) => Promise<void>

/**
 * Represents a set of middleware.
 */
export class MiddlewareSet implements Middleware {
  private readonly middleware: MiddlewareHandler[] = []

  /**
   * Initializes a new instance of the MiddlewareSet class.
   * @param middlewares The middleware handlers or middleware objects to use.
   */
  constructor (...middlewares: Array<MiddlewareHandler | Middleware>) {
    this.use(...middlewares)
  }

  /**
   * Handles the turn of the middleware.
   * @param context The turn context.
   * @param next The next function to call.
   * @returns A promise representing the asynchronous operation.
   */
  async onTurn (context: TurnContext, next: () => Promise<void>): Promise<void> {
    return await this.run(context, next)
  }

  /**
   * Adds middleware to the set.
   * @param middlewares The middleware handlers or middleware objects to add.
   * @returns The current MiddlewareSet instance.
   */
  use (...middlewares: Array<MiddlewareHandler | Middleware>): this {
    middlewares.forEach((plugin) => {
      if (typeof plugin === 'function' || (typeof plugin === 'object' && plugin.onTurn)) {
        this.middleware.push(
          typeof plugin === 'function' ? plugin : async (context, next) => await plugin.onTurn(context, next)
        )
      } else {
        throw new Error('MiddlewareSet.use(): invalid plugin type being added.')
      }
    })
    return this
  }

  /**
   * Runs the middleware chain.
   * @param context The turn context.
   * @param next The next function to call.
   * @returns A promise representing the asynchronous operation.
   */
  async run (context: TurnContext, next: () => Promise<void>): Promise<void> {
    return await this.middleware.reduceRight<() => Promise<void>>(
      (nextHandler, currentHandler) => async () => await currentHandler(context, nextHandler),
    next
    )().catch(err => {
      logger.error('Error in middleware chain:', err)
      throw err
    })
  }
}
