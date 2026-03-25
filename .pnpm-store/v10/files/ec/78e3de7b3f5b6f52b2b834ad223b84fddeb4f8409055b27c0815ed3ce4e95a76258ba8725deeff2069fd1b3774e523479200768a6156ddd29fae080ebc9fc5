import { Context } from '@opentelemetry/api';
import { AbstractAsyncHooksContextManager } from './AbstractAsyncHooksContextManager';
export declare class AsyncHooksContextManager extends AbstractAsyncHooksContextManager {
    private _asyncHook;
    private _contexts;
    private _stack;
    constructor();
    active(): Context;
    with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(context: Context, fn: F, thisArg?: ThisParameterType<F>, ...args: A): ReturnType<F>;
    enable(): this;
    disable(): this;
    /**
     * Init hook will be called when userland create a async context, setting the
     * context as the current one if it exist.
     * @param uid id of the async context
     * @param type the resource type
     */
    private _init;
    /**
     * Destroy hook will be called when a given context is no longer used so we can
     * remove its attached context.
     * @param uid uid of the async context
     */
    private _destroy;
    /**
     * Before hook is called just before executing a async context.
     * @param uid uid of the async context
     */
    private _before;
    /**
     * After hook is called just after completing the execution of a async context.
     */
    private _after;
    /**
     * Set the given context as active
     */
    private _enterContext;
    /**
     * Remove the context at the root of the stack
     */
    private _exitContext;
}
//# sourceMappingURL=AsyncHooksContextManager.d.ts.map