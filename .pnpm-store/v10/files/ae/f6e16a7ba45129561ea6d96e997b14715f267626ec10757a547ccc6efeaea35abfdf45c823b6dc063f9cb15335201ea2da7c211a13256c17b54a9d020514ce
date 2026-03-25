/// <reference types="node" />
export declare function getTimeoutSignal(timeoutMs: number): {
    signal: AbortSignal;
    abortId: NodeJS.Timeout;
};
/**
 * Returns an abort signal that is getting aborted when
 * at least one of the specified abort signals is aborted.
 *
 * Requires at least node.js 18.
 */
export declare function anySignal(...args: AbortSignal[] | [AbortSignal[]]): AbortSignal;
