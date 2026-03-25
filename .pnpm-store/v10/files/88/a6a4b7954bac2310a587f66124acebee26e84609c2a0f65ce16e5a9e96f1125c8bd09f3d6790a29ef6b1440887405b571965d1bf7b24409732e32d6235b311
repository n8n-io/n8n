// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { formatError } from "./logging.js";
/**
 * Ensures the scopes value is an array.
 * @internal
 */
export function ensureScopes(scopes) {
    return Array.isArray(scopes) ? scopes : [scopes];
}
/**
 * Throws if the received scope is not valid.
 * @internal
 */
export function ensureValidScopeForDevTimeCreds(scope, logger) {
    if (!scope.match(/^[0-9a-zA-Z-_.:/]+$/)) {
        const error = new Error("Invalid scope was specified by the user or calling client");
        logger.getToken.info(formatError(scope, error));
        throw error;
    }
}
/**
 * Returns the resource out of a scope.
 * @internal
 */
export function getScopeResource(scope) {
    return scope.replace(/\/.default$/, "");
}
//# sourceMappingURL=scopeUtils.js.map