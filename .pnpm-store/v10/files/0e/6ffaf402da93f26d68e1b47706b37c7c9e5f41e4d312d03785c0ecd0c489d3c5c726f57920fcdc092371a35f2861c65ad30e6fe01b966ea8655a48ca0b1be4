"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteList = void 0;
const routeRank_1 = require("./routeRank");
class RouteList {
    constructor() {
        this._routes = [];
    }
    addRoute(selector, handler, isInvokeRoute = false, rank = routeRank_1.RouteRank.Unspecified, authHandlers = [], isAgenticRoute = false) {
        this._routes.push({ selector, handler, isInvokeRoute, rank, authHandlers, isAgenticRoute });
        // Ordered by:
        //    Agentic + Invoke
        //    Invoke
        //    Agentic
        //    Other
        // Then by Rank
        this._routes.sort((a, b) => {
            var _a, _b;
            const getPriority = (route) => {
                if (route.isAgenticRoute && route.isInvokeRoute)
                    return 0;
                if (route.isInvokeRoute)
                    return 1;
                if (route.isAgenticRoute)
                    return 2;
                return 3;
            };
            const priorityA = getPriority(a);
            const priorityB = getPriority(b);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            // If priorities are equal, sort by rank
            return ((_a = a.rank) !== null && _a !== void 0 ? _a : 0) - ((_b = b.rank) !== null && _b !== void 0 ? _b : 0);
        });
        return this;
    }
    [Symbol.iterator]() {
        return this._routes[Symbol.iterator]();
    }
}
exports.RouteList = RouteList;
//# sourceMappingURL=routeList.js.map