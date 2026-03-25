/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import { TurnContext } from './turnContext';
/**
 * Interface for middleware.
 */
export interface Middleware {
    onTurn: (context: TurnContext, next: () => Promise<void>) => Promise<void>;
}
/**
 * Type for middleware handler.
 */
export type MiddlewareHandler = (context: TurnContext, next: () => Promise<void>) => Promise<void>;
/**
 * Represents a set of middleware.
 */
export declare class MiddlewareSet implements Middleware {
    private readonly middleware;
    /**
     * Initializes a new instance of the MiddlewareSet class.
     * @param middlewares The middleware handlers or middleware objects to use.
     */
    constructor(...middlewares: Array<MiddlewareHandler | Middleware>);
    /**
     * Handles the turn of the middleware.
     * @param context The turn context.
     * @param next The next function to call.
     * @returns A promise representing the asynchronous operation.
     */
    onTurn(context: TurnContext, next: () => Promise<void>): Promise<void>;
    /**
     * Adds middleware to the set.
     * @param middlewares The middleware handlers or middleware objects to add.
     * @returns The current MiddlewareSet instance.
     */
    use(...middlewares: Array<MiddlewareHandler | Middleware>): this;
    /**
     * Runs the middleware chain.
     * @param context The turn context.
     * @param next The next function to call.
     * @returns A promise representing the asynchronous operation.
     */
    run(context: TurnContext, next: () => Promise<void>): Promise<void>;
}
