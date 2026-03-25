/**
 * The `DeferredPromise` has a `promise` property in an initially pending state,
 * that will be resolved when the `done` method is called or rejected when the
 * `fail` method is called.
 */
export interface DeferredPromise<RESOLVES, REJECTS extends Error = Error> {
    done(result: RESOLVES): void;
    fail(error: REJECTS): void;
    readonly status: DeferredPromiseStatus;
    readonly fulfilled: boolean;
    promise: Promise<RESOLVES>;
}
/**
 * The three states the DeferredPromise can be in - initially pending then either
 * resolved or rejected when it is fulfilled.
 *
 * ```typescript
 import {createDeferred, DeferredPromiseStatus} from '@kwsites/promise-deferred`;

 const pending: DeferredPromiseStatus = 'pending';
 expect(createDeferred()).toHaveProperty('status', pending);
 ```
 */
export declare type DeferredPromiseStatus = 'pending' | 'resolved' | 'rejected';
/**
 * Creates a new `DeferredPromise`
 *
 * ```typescript
 import {deferred} from '@kwsites/promise-deferred`;
 ```
 */
export declare function deferred<T extends any = void, E extends Error = Error>(): DeferredPromise<T, E>;
/**
 * Alias of the exported `deferred` function, to help consumers wanting to use `deferred` as the
 * local variable name rather than the factory import name, without needing to rename on import.
 *
 * ```typescript
 import {createDeferred} from '@kwsites/promise-deferred`;
 ```
 */
export declare const createDeferred: typeof deferred;
/**
 * Default export allows use as:
 *
 * ```typescript
 import deferred from '@kwsites/promise-deferred`;
 ```
 */
export default deferred;
