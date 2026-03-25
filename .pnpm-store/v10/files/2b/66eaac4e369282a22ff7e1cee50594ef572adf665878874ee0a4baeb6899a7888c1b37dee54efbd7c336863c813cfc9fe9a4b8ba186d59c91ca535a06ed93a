import { Context } from '@opentelemetry/api';
/**
 * Run a function within a Context that carries the per-request export token.
 * This keeps the token only in OTel Context (ALS), never in any registry.
 *
 * The token can be updated later via `updateExportToken()` before the trace
 * is flushed — useful when the callback is long-running and the original
 * token may expire before export.
 */
export declare function runWithExportToken<T>(token: string, fn: () => T): T;
/**
 * Update the export token in the active OTel Context.
 * Call this to refresh the token before ending the root span when the
 * original token may have expired during a long-running request.
 *
 * Must be called within the same async context created by `runWithExportToken`.
 * @param token The fresh token to use for export.
 * @returns true if the token was updated successfully, false if no token holder was found.
 */
export declare function updateExportToken(token: string): boolean;
/**
 * Retrieve the per-request export token from a given OTel Context (or the active one).
 */
export declare function getExportToken(ctx?: Context): string | undefined;
//# sourceMappingURL=token-context.d.ts.map