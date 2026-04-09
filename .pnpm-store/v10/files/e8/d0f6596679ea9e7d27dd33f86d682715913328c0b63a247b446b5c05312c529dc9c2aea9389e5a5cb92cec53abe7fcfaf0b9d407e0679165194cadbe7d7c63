import type { Client } from "./client";
/**
 * @internal
 *
 * @param commands - command lookup container.
 * @param Client - client instance on which to add aggregated methods.
 * @param options
 * @param options.paginators - paginator functions.
 * @param options.waiters - waiter functions.
 *
 * @returns an aggregated client with dynamically created methods.
 */
export declare const createAggregatedClient: (commands: Record<string, any>, Client: {
    new (...args: any): Client<any, any, any, any>;
}, options?: {
    paginators?: Record<string, any>;
    waiters?: Record<string, any>;
}) => void;
