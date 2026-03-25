"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithExportToken = runWithExportToken;
exports.updateExportToken = updateExportToken;
exports.getExportToken = getExportToken;
const api_1 = require("@opentelemetry/api");
const logging_1 = __importDefault(require("../../utils/logging"));
const EXPORT_TOKEN_KEY = (0, api_1.createContextKey)('a365_export_token');
/**
 * Run a function within a Context that carries the per-request export token.
 * This keeps the token only in OTel Context (ALS), never in any registry.
 *
 * The token can be updated later via `updateExportToken()` before the trace
 * is flushed — useful when the callback is long-running and the original
 * token may expire before export.
 */
function runWithExportToken(token, fn) {
    const holder = { token };
    const ctxWithToken = api_1.context.active().setValue(EXPORT_TOKEN_KEY, holder);
    logging_1.default.info('[TokenContext] Running function with export token in context.');
    return api_1.context.with(ctxWithToken, fn);
}
/**
 * Update the export token in the active OTel Context.
 * Call this to refresh the token before ending the root span when the
 * original token may have expired during a long-running request.
 *
 * Must be called within the same async context created by `runWithExportToken`.
 * @param token The fresh token to use for export.
 * @returns true if the token was updated successfully, false if no token holder was found.
 */
function updateExportToken(token) {
    const value = api_1.context.active().getValue(EXPORT_TOKEN_KEY);
    if (value && typeof value === 'object' && 'token' in value) {
        value.token = token;
        logging_1.default.info('[TokenContext] Export token updated in context.');
        return true;
    }
    logging_1.default.warn('[TokenContext] updateExportToken called but no token holder found in active context. Was runWithExportToken called?');
    return false;
}
/**
 * Retrieve the per-request export token from a given OTel Context (or the active one).
 */
function getExportToken(ctx = api_1.context.active()) {
    const value = ctx.getValue(EXPORT_TOKEN_KEY);
    if (value && typeof value === 'object' && 'token' in value) {
        return value.token;
    }
    // Backward compat: support raw string values from older callers
    if (typeof value === 'string') {
        return value;
    }
    return undefined;
}
//# sourceMappingURL=token-context.js.map