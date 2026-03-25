import { WaiterOptions, WaiterResult } from "./waiter";
/**
 * Function that runs polling as part of waiters. This will make one inital attempt and then
 * subsequent attempts with an increasing delay.
 * @param params - options passed to the waiter.
 * @param client - AWS SDK Client
 * @param input - client input
 * @param stateChecker - function that checks the acceptor states on each poll.
 */
export declare const runPolling: <Client, Input>({ minDelay, maxDelay, maxWaitTime, abortController, client, abortSignal }: WaiterOptions<Client>, input: Input, acceptorChecks: (client: Client, input: Input) => Promise<WaiterResult>) => Promise<WaiterResult>;
