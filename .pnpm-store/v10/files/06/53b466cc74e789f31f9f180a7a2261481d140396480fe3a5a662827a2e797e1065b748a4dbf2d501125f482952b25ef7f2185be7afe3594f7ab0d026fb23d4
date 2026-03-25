import type { Client } from "./client";
import type { Command } from "./command";
/**
 * @public
 *
 * Expected type definition of a paginator.
 */
export type Paginator<T> = AsyncGenerator<T, undefined, unknown>;
/**
 * @public
 *
 * Expected paginator configuration passed to an operation. Services will extend
 * this interface definition and may type client further.
 */
export interface PaginationConfiguration {
    client: Client<any, any, any>;
    pageSize?: number;
    startingToken?: any;
    /**
     * For some APIs, such as CloudWatchLogs events, the next page token will always
     * be present.
     *
     * When true, this config field will have the paginator stop when the token doesn't change
     * instead of when it is not present.
     */
    stopOnSameToken?: boolean;
    /**
     * @param command - reference to the instantiated command. This callback is executed
     *                  prior to sending the command with the paginator's client.
     * @returns the original command or a replacement, defaulting to the original command object.
     */
    withCommand?: (command: Command<any, any, any, any, any>) => typeof command | undefined;
}
