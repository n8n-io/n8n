"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteRank = void 0;
/**
 * Defines the priority ranking for route evaluation in the agent hosting framework.
 *
 * @remarks
 * Routes are evaluated in ascending order of their rank values, allowing for precise
 * control over which routes are processed first when multiple routes could match
 * the same request.
 *
 * @example
 * ```typescript
 * // High priority route that should be evaluated first
 * this.onMessage('urgent', handler, undefined, RouteRank.First);
 *
 * // Normal priority route with default ranking
 * this.onMessage('data', handler, undefined, RouteRank.Unspecified);
 *
 * // Fallback route that should be evaluated last
 * this.onActivity('message', fallbackHandler, undefined, RouteRank.Last);
 *
 * // Multiple routes with same pattern - first ranked executes first
 * this.onMessage('dupText', handler1, undefined, RouteRank.Last);
 * this.onMessage('dupText', handler2, undefined, RouteRank.First); // This executes first
 * ```
 *
 */
var RouteRank;
(function (RouteRank) {
    /**
     * Highest priority rank (value: 0).
     *
     * Routes with this rank are evaluated
     * before any other routes. Use this for critical routes that must take precedence
     * over all others, such as high-priority message handlers or override handlers
     * that should execute before any other matching routes.
     */
    RouteRank[RouteRank["First"] = 0] = "First";
    /**
     * Lowest priority rank (value: Number.MAX_VALUE).
     *
     * Routes with this rank are
     * evaluated last, after all other routes have been considered. Ideal for
     * catch-all message handlers, fallback activity handlers, or default responses
     * that should only match when no other routes apply.
     */
    RouteRank[RouteRank["Last"] = Number.MAX_VALUE] = "Last";
    /**
     * Default priority rank (value: Number.MAX_VALUE / 2).
     *
     * This is the standard
     * rank for most routes that don't require special ordering. Routes with this
     * rank are evaluated after high-priority routes but before low-priority ones.
     * Use this when you don't need to specify a particular evaluation order.
     */
    RouteRank[RouteRank["Unspecified"] = Number.MAX_VALUE / 2] = "Unspecified";
})(RouteRank || (exports.RouteRank = RouteRank = {}));
//# sourceMappingURL=routeRank.js.map