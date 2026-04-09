import type { OperationOptions } from "@azure-rest/core-client";
import type { PollOperation, PollOperationState } from "@azure/core-lro";
import { Poller } from "@azure/core-lro";
import type { KeyVaultClient } from "../generated/keyVaultClient.js";
/**
 * Common parameters to a Key Vault Key Poller.
 */
export interface KeyVaultKeyPollerOptions {
    client: KeyVaultClient;
    name: string;
    operationOptions?: OperationOptions;
    intervalInMs?: number;
    resumeFrom?: string;
}
/**
 * An interface representing the state of a Key Vault Key Poller's operation.
 */
export interface KeyVaultKeyPollOperationState<TResult> extends PollOperationState<TResult> {
    /**
     * The name of the key.
     */
    name: string;
}
/**
 * Common properties and methods of the Key Vault Key Pollers.
 */
export declare abstract class KeyVaultKeyPoller<TState extends KeyVaultKeyPollOperationState<TResult>, TResult> extends Poller<TState, TResult> {
    /**
     * Defines how much time the poller is going to wait before making a new request to the service.
     */
    intervalInMs: number;
    /**
     * The method used by the poller to wait before attempting to update its operation.
     */
    delay(): Promise<void>;
}
/**
 * Optional parameters to the KeyVaultKeyPollOperation
 */
export interface KeyVaultKeyPollOperationOptions {
    cancelMessage?: string;
}
/**
 * Common properties and methods of the Key Vault Key Poller operations.
 */
export declare class KeyVaultKeyPollOperation<TState, TResult> implements PollOperation<TState, TResult> {
    state: TState;
    private cancelMessage;
    constructor(state: TState, options?: KeyVaultKeyPollOperationOptions);
    /**
     * Meant to reach to the service and update the Poller operation.
     */
    update(): Promise<PollOperation<TState, TResult>>;
    /**
     * Meant to reach to the service and cancel the Poller operation.
     */
    cancel(): Promise<PollOperation<TState, TResult>>;
    /**
     * Serializes the Poller operation.
     */
    toString(): string;
}
//# sourceMappingURL=keyVaultKeyPoller.d.ts.map