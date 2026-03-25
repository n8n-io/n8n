/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AppRoute } from './appRoute';
import { RouteHandler } from './routeHandler';
import { RouteSelector } from './routeSelector';
import { TurnState } from './turnState';
export declare class RouteList<TState extends TurnState> {
    private _routes;
    addRoute(selector: RouteSelector, handler: RouteHandler<TState>, isInvokeRoute?: boolean, rank?: number, authHandlers?: string[], isAgenticRoute?: boolean): this;
    [Symbol.iterator](): Iterator<AppRoute<TState>>;
}
