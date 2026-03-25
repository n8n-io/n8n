import type { StackFrame } from '@sentry/core';
interface ContextLinesOptions {
    /**
     * Sets the number of context lines for each frame when loading a file.
     * Defaults to 7.
     *
     * Set to 0 to disable loading and inclusion of source files.
     **/
    frameContextLines?: number;
}
/**
 * Collects source context lines around the lines of stackframes pointing to JS embedded in
 * the current page's HTML.
 *
 * This integration DOES NOT work for stack frames pointing to JS files that are loaded by the browser.
 * For frames pointing to files, context lines are added during ingestion and symbolication
 * by attempting to download the JS files to the Sentry backend.
 *
 * Use this integration if you have inline JS code in HTML pages that can't be accessed
 * by our backend (e.g. due to a login-protected page).
 */
export declare const contextLinesIntegration: (options?: ContextLinesOptions | undefined) => import("@sentry/core").Integration;
/**
 * Only exported for testing
 */
export declare function applySourceContextToFrame(frame: StackFrame, htmlLines: string[], htmlFilename: string, linesOfContext: number): StackFrame;
export {};
//# sourceMappingURL=contextlines.d.ts.map