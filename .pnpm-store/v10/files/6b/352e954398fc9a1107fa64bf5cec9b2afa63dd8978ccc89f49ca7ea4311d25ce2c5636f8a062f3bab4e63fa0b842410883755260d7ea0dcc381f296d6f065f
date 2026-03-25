import { ContextManager, Context } from '@opentelemetry/api';
export declare abstract class AbstractAsyncHooksContextManager implements ContextManager {
    abstract active(): Context;
    abstract with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(context: Context, fn: F, thisArg?: ThisParameterType<F>, ...args: A): ReturnType<F>;
    abstract enable(): this;
    abstract disable(): this;
    /**
     * Binds a the certain context or the active one to the target function and then returns the target
     * @param context A context (span) to be bind to target
     * @param target a function or event emitter. When target or one of its callbacks is called,
     *  the provided context will be used as the active context for the duration of the call.
     */
    bind<T>(context: Context, target: T): T;
    private _bindFunction;
    /**
     * By default, EventEmitter call their callback with their context, which we do
     * not want, instead we will bind a specific context to all callbacks that
     * go through it.
     * @param context the context we want to bind
     * @param ee EventEmitter an instance of EventEmitter to patch
     */
    private _bindEventEmitter;
    /**
     * Patch methods that remove a given listener so that we match the "patched"
     * version of that listener (the one that propagate context).
     * @param ee EventEmitter instance
     * @param original reference to the patched method
     */
    private _patchRemoveListener;
    /**
     * Patch methods that remove all listeners so we remove our
     * internal references for a given event.
     * @param ee EventEmitter instance
     * @param original reference to the patched method
     */
    private _patchRemoveAllListeners;
    /**
     * Patch methods on an event emitter instance that can add listeners so we
     * can force them to propagate a given context.
     * @param ee EventEmitter instance
     * @param original reference to the patched method
     * @param [context] context to propagate when calling listeners
     */
    private _patchAddListener;
    private _createPatchMap;
    private _getPatchMap;
    private readonly _kOtListeners;
    private _wrapped;
}
//# sourceMappingURL=AbstractAsyncHooksContextManager.d.ts.map