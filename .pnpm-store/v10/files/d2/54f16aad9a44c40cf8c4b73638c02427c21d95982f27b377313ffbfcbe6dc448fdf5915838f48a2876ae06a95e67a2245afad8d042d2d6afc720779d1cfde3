declare namespace emnapi {

export type CleanupHookCallbackFunction = number | ((arg: number) => void);

export class ConstHandle<S extends undefined | null | boolean | typeof globalThis> extends Handle<S> {
    constructor(id: number, value: S);
    dispose(): void;
}

export class Context {
    private _isStopping;
    private _canCallIntoJs;
    private _suppressDestroy;
    envStore: Store<Env>;
    scopeStore: ScopeStore;
    refStore: Store<Reference>;
    deferredStore: Store<Deferred<any>>;
    handleStore: HandleStore;
    private readonly refCounter?;
    private readonly cleanupQueue;
    feature: {
        supportReflect: boolean;
        supportFinalizer: boolean;
        supportWeakSymbol: boolean;
        supportBigInt: boolean;
        supportNewFunction: boolean;
        canSetFunctionName: boolean;
        setImmediate: (callback: () => void) => void;
        Buffer: BufferCtor | undefined;
        MessageChannel: {
            new (): MessageChannel;
            prototype: MessageChannel;
        } | undefined;
    };
    constructor();
    /**
     * Suppress the destroy on `beforeExit` event in Node.js.
     * Call this method if you want to keep the context and
     * all associated {@link Env | Env} alive,
     * this also means that cleanup hooks will not be called.
     * After call this method, you should call
     * {@link Context.destroy | `Context.prototype.destroy`} method manually.
     */
    suppressDestroy(): void;
    getRuntimeVersions(): {
        version: string;
        NODE_API_SUPPORTED_VERSION_MAX: Version;
        NAPI_VERSION_EXPERIMENTAL: Version;
        NODE_API_DEFAULT_MODULE_API_VERSION: Version;
    };
    createNotSupportWeakRefError(api: string, message: string): NotSupportWeakRefError;
    createNotSupportBufferError(api: string, message: string): NotSupportBufferError;
    createReference(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership): Reference;
    createReferenceWithData(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, data: void_p): Reference;
    createReferenceWithFinalizer(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, finalize_callback?: napi_finalize, finalize_data?: void_p, finalize_hint?: void_p): Reference;
    createDeferred<T = any>(value: IDeferrdValue<T>): Deferred<T>;
    createEnv(filename: string, moduleApiVersion: number, makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void, makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void, abort: (msg?: string) => never, nodeBinding?: any): Env;
    createTrackedFinalizer(envObject: Env, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): TrackedFinalizer;
    getCurrentScope(): HandleScope | null;
    addToCurrentScope<V>(value: V): Handle<V>;
    openScope(envObject?: Env): HandleScope;
    closeScope(envObject?: Env, _scope?: HandleScope): void;
    ensureHandle<S>(value: S): Handle<S>;
    addCleanupHook(envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void;
    removeCleanupHook(envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void;
    runCleanup(): void;
    increaseWaitingRequestCounter(): void;
    decreaseWaitingRequestCounter(): void;
    setCanCallIntoJs(value: boolean): void;
    setStopping(value: boolean): void;
    canCallIntoJs(): boolean;
    /**
     * Destroy the context and call cleanup hooks.
     * Associated {@link Env | Env} will be destroyed.
     */
    destroy(): void;
}

export function createContext(): Context;

export class Deferred<T = any> implements IStoreValue {
    static create<T = any>(ctx: Context, value: IDeferrdValue<T>): Deferred;
    id: number;
    ctx: Context;
    value: IDeferrdValue<T>;
    constructor(ctx: Context, value: IDeferrdValue<T>);
    resolve(value: T): void;
    reject(reason?: any): void;
    dispose(): void;
}

export class EmnapiError extends Error {
    constructor(message?: string);
}

export abstract class Env implements IStoreValue {
    readonly ctx: Context;
    moduleApiVersion: number;
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void;
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void;
    abort: (msg?: string) => never;
    id: number;
    openHandleScopes: number;
    instanceData: TrackedFinalizer | null;
    tryCatch: TryCatch;
    refs: number;
    reflist: RefTracker;
    finalizing_reflist: RefTracker;
    pendingFinalizers: RefTracker[];
    lastError: {
        errorCode: napi_status;
        engineErrorCode: number;
        engineReserved: Ptr;
    };
    inGcFinalizer: boolean;
    constructor(ctx: Context, moduleApiVersion: number, makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void, makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void, abort: (msg?: string) => never);
    /** @virtual */
    canCallIntoJs(): boolean;
    terminatedOrTerminating(): boolean;
    ref(): void;
    unref(): void;
    ensureHandle<S>(value: S): Handle<S>;
    ensureHandleId(value: any): napi_value;
    clearLastError(): napi_status;
    setLastError(error_code: napi_status, engine_error_code?: uint32_t, engine_reserved?: void_p): napi_status;
    getReturnStatus(): napi_status;
    callIntoModule<T>(fn: (env: Env) => T, handleException?: (envObject: Env, value: any) => void): T;
    /** @virtual */
    abstract callFinalizer(cb: napi_finalize, data: void_p, hint: void_p): void;
    invokeFinalizerFromGC(finalizer: RefTracker): void;
    checkGCAccess(): void;
    /** @virtual */
    enqueueFinalizer(finalizer: RefTracker): void;
    /** @virtual */
    dequeueFinalizer(finalizer: RefTracker): void;
    /** @virtual */
    deleteMe(): void;
    dispose(): void;
    private readonly _bindingMap;
    initObjectBinding<S extends object>(value: S): IReferenceBinding;
    getObjectBinding<S extends object>(value: S): IReferenceBinding;
    setInstanceData(data: number, finalize_cb: number, finalize_hint: number): void;
    getInstanceData(): number;
}

/** @public */
interface External_2 extends Record<any, any> {
}

/** @public */
const External_2: {
    new (value: number | bigint): External_2;
    prototype: null;
};
export { External_2 as External }

export class Finalizer {
    envObject: Env;
    private _finalizeCallback;
    private _finalizeData;
    private _finalizeHint;
    private _makeDynCall_vppp;
    constructor(envObject: Env, _finalizeCallback?: napi_finalize, _finalizeData?: void_p, _finalizeHint?: void_p);
    callback(): napi_finalize;
    data(): void_p;
    hint(): void_p;
    resetEnv(): void;
    resetFinalizer(): void;
    callFinalizer(): void;
    dispose(): void;
}

export function getDefaultContext(): Context;

/** @public */
export function getExternalValue(external: External_2): number | bigint;

export class Handle<S> {
    id: number;
    value: S;
    constructor(id: number, value: S);
    data(): void_p;
    isNumber(): boolean;
    isBigInt(): boolean;
    isString(): boolean;
    isFunction(): boolean;
    isExternal(): boolean;
    isObject(): boolean;
    isArray(): boolean;
    isArrayBuffer(): boolean;
    isTypedArray(): boolean;
    isBuffer(BufferConstructor?: BufferCtor): boolean;
    isDataView(): boolean;
    isDate(): boolean;
    isPromise(): boolean;
    isBoolean(): boolean;
    isUndefined(): boolean;
    isSymbol(): boolean;
    isNull(): boolean;
    dispose(): void;
}

export class HandleScope {
    handleStore: HandleStore;
    id: number;
    parent: HandleScope | null;
    child: HandleScope | null;
    start: number;
    end: number;
    private _escapeCalled;
    callbackInfo: ICallbackInfo;
    constructor(handleStore: HandleStore, id: number, parentScope: HandleScope | null, start: number, end?: number);
    add<V>(value: V): Handle<V>;
    addExternal(data: void_p): Handle<object>;
    dispose(): void;
    escape(handle: number): Handle<any> | null;
    escapeCalled(): boolean;
}

export class HandleStore {
    static UNDEFINED: ConstHandle<undefined>;
    static NULL: ConstHandle<null>;
    static FALSE: ConstHandle<false>;
    static TRUE: ConstHandle<true>;
    static GLOBAL: ConstHandle<typeof globalThis>;
    static MIN_ID: 6;
    private readonly _values;
    private _next;
    push<S>(value: S): Handle<S>;
    erase(start: number, end: number): void;
    get(id: Ptr): Handle<any> | undefined;
    swap(a: number, b: number): void;
    dispose(): void;
}

export interface ICallbackInfo {
    thiz: any;
    data: void_p;
    args: ArrayLike<any>;
    fn: Function;
}

export interface IDeferrdValue<T = any> {
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
}

export interface IReferenceBinding {
    wrapped: number;
    tag: Uint32Array | null;
}

/** @public */
export function isExternal(object: unknown): object is External_2;

export function isReferenceType(v: any): v is object;

export interface IStoreValue {
    id: number;
    dispose(): void;
    [x: string]: any;
}

export const NAPI_VERSION_EXPERIMENTAL = Version.NAPI_VERSION_EXPERIMENTAL;

export const NODE_API_DEFAULT_MODULE_API_VERSION = Version.NODE_API_DEFAULT_MODULE_API_VERSION;

export const NODE_API_SUPPORTED_VERSION_MAX = Version.NODE_API_SUPPORTED_VERSION_MAX;

export const NODE_API_SUPPORTED_VERSION_MIN = Version.NODE_API_SUPPORTED_VERSION_MIN;

export class NodeEnv extends Env {
    filename: string;
    private readonly nodeBinding?;
    destructing: boolean;
    finalizationScheduled: boolean;
    constructor(ctx: Context, filename: string, moduleApiVersion: number, makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void, makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void, abort: (msg?: string) => never, nodeBinding?: any);
    deleteMe(): void;
    canCallIntoJs(): boolean;
    triggerFatalException(err: any): void;
    callbackIntoModule<T>(enforceUncaughtExceptionPolicy: boolean, fn: (env: Env) => T): T;
    callFinalizer(cb: napi_finalize, data: void_p, hint: void_p): void;
    callFinalizerInternal(forceUncaught: int, cb: napi_finalize, data: void_p, hint: void_p): void;
    enqueueFinalizer(finalizer: RefTracker): void;
    drainFinalizerQueue(): void;
}

export class NotSupportBufferError extends EmnapiError {
    constructor(api: string, message: string);
}

export class NotSupportWeakRefError extends EmnapiError {
    constructor(api: string, message: string);
}

export class Persistent<T> {
    private _ref;
    private _param;
    private _callback;
    private static readonly _registry;
    constructor(value: T);
    setWeak<P>(param: P, callback: (param: P) => void): void;
    clearWeak(): void;
    reset(): void;
    isEmpty(): boolean;
    deref(): T | undefined;
}

export class Reference extends RefTracker implements IStoreValue {
    private static weakCallback;
    id: number;
    envObject: Env;
    private readonly canBeWeak;
    private _refcount;
    private readonly _ownership;
    persistent: Persistent<object>;
    static create(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, _unused1?: void_p, _unused2?: void_p, _unused3?: void_p): Reference;
    protected constructor(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership);
    ref(): number;
    unref(): number;
    get(envObject?: Env): napi_value;
    /** @virtual */
    resetFinalizer(): void;
    /** @virtual */
    data(): void_p;
    refcount(): number;
    ownership(): ReferenceOwnership;
    /** @virtual */
    protected callUserFinalizer(): void;
    /** @virtual */
    protected invokeFinalizerFromGC(): void;
    private _setWeak;
    finalize(): void;
    dispose(): void;
}

export enum ReferenceOwnership {
    kRuntime = 0,
    kUserland = 1
}

export class ReferenceWithData extends Reference {
    private readonly _data;
    static create(envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, data: void_p): ReferenceWithData;
    private constructor();
    data(): void_p;
}

export class ReferenceWithFinalizer extends Reference {
    private _finalizer;
    static create(envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): ReferenceWithFinalizer;
    private constructor();
    resetFinalizer(): void;
    data(): void_p;
    protected callUserFinalizer(): void;
    protected invokeFinalizerFromGC(): void;
    dispose(): void;
}

export class RefTracker {
    /** @virtual */
    dispose(): void;
    /** @virtual */
    finalize(): void;
    private _next;
    private _prev;
    link(list: RefTracker): void;
    unlink(): void;
    static finalizeAll(list: RefTracker): void;
}

export class ScopeStore {
    private readonly _rootScope;
    currentScope: HandleScope;
    private readonly _values;
    constructor();
    get(id: number): HandleScope | undefined;
    openScope(handleStore: HandleStore): HandleScope;
    closeScope(): void;
    dispose(): void;
}

export class Store<V extends IStoreValue> {
    protected _values: Array<V | undefined>;
    private _freeList;
    private _size;
    constructor();
    add(value: V): void;
    get(id: Ptr): V | undefined;
    has(id: Ptr): boolean;
    remove(id: Ptr): void;
    dispose(): void;
}

export class TrackedFinalizer extends RefTracker {
    private _finalizer;
    static create(envObject: Env, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): TrackedFinalizer;
    private constructor();
    data(): void_p;
    dispose(): void;
    finalize(): void;
}

export class TryCatch {
    private _exception;
    private _caught;
    isEmpty(): boolean;
    hasCaught(): boolean;
    exception(): any;
    setError(err: any): void;
    reset(): void;
    extractException(): any;
}

export const version: string;




}