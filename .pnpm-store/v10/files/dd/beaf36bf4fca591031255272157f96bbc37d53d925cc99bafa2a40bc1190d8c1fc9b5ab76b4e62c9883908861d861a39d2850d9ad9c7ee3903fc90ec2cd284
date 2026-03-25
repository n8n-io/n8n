"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureScopes = ensureScopes;
exports.ensureValidScopeForDevTimeCreds = ensureValidScopeForDevTimeCreds;
exports.getScopeResource = getScopeResource;
const logging_js_1 = require("./logging.js");
/**
 * Ensures the scopes value is an array.
 * @internal
 */
function ensureScopes(scopes) {
    return Array.isArray(scopes) ? scopes : [scopes];
}
/**
 * Throws if the received scope is not valid.
 * @internal
 */
function ensureValidScopeForDevTimeCreds(scope, logger) {
    if (!scope.match(/^[0-9a-zA-Z-_.:/]+$/)) {
        const error = new Error("Invalid scope was specified by the user or calling client");
        logger.getToken.info((0, logging_js_1.formatError)(scope, error));
        throw error;
    }
}
/**
 * Returns the resource out of a scope.
 * @internal
 */
function getScopeResource(scope) {
    return scope.replace(/\/.default$/, "");
}
//# sourceMappingURL=scopeUtils.js.map