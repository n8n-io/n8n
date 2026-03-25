// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
import { context, createContextKey } from '@opentelemetry/api';
import logger from '../../utils/logging';
const EXPORT_TOKEN_KEY = createContextKey('a365_export_token');
/**
 * Run a function within a Context that carries the per-request export token.
 * This keeps the token only in OTel Context (ALS), never in any registry.
 *
 * The token can be updated later via `updateExportToken()` before the trace
 * is flushed — useful when the callback is long-running and the original
 * token may expire before export.
 */
export function runWithExportToken(token, fn) {
    const holder = { token };
    const ctxWithToken = context.active().setValue(EXPORT_TOKEN_KEY, holder);
    logger.info('[TokenContext] Running function with export token in context.');
    return context.with(ctxWithToken, fn);
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
export function updateExportToken(token) {
    const value = context.active().getValue(EXPORT_TOKEN_KEY);
    if (value && typeof value === 'object' && 'token' in value) {
        value.token = token;
        logger.info('[TokenContext] Export token updated in context.');
        return true;
    }
    logger.warn('[TokenContext] updateExportToken called but no token holder found in active context. Was runWithExportToken called?');
    return false;
}
/**
 * Retrieve the per-request export token from a given OTel Context (or the active one).
 */
export function getExportToken(ctx = context.active()) {
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