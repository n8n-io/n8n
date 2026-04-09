export declare type Ptr = number | bigint

export declare interface IBuffer extends Uint8Array {}
export declare interface BufferCtor {
  readonly prototype: IBuffer
  /** @deprecated */
  new (...args: any[]): IBuffer
  from: {
    (buffer: ArrayBufferLike): IBuffer
    (buffer: ArrayBufferLike, byteOffset: number, length: number): IBuffer
  }
  alloc: (size: number) => IBuffer
  isBuffer: (obj: unknown) => obj is IBuffer
}

export declare const enum GlobalHandle {
  UNDEFINED = 1,
  NULL,
  FALSE,
  TRUE,
  GLOBAL
}

export declare const enum Version {
  NODE_API_SUPPORTED_VERSION_MIN = 1,
  NODE_API_DEFAULT_MODULE_API_VERSION = 8,
  NODE_API_SUPPORTED_VERSION_MAX = 10,
  NAPI_VERSION_EXPERIMENTAL = 2147483647 // INT_MAX
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export declare type Pointer<T> = number
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export declare type PointerPointer<T> = number
export declare type FunctionPointer<T extends (...args: any[]) => any> = Pointer<T>
export declare type Const<T> = T

export declare type void_p = Pointer<void>
export declare type void_pp = Pointer<void_p>
export declare type bool = number
export declare type char = number
export declare type char_p = Pointer<char>
export declare type unsigned_char = number
export declare type const_char = Const<char>
export declare type const_char_p = Pointer<const_char>
export declare type char16_t_p = number
export declare type const_char16_t_p = number

export declare type short = number
export declare type unsigned_short = number
export declare type int = number
export declare type unsigned_int = number
export declare type long = number
export declare type unsigned_long = number
export declare type long_long = bigint
export declare type unsigned_long_long = bigint
export declare type float = number
export declare type double = number
export declare type long_double = number
export declare type size_t = number

export declare type int8_t = number
export declare type uint8_t = number
export declare type int16_t = number
export declare type uint16_t = number
export declare type int32_t = number
export declare type uint32_t = number
export declare type int64_t = bigint
export declare type uint64_t = bigint
export declare type napi_env = Pointer<unknown>

export declare type napi_value = Pointer<unknown>
export declare type napi_ref = Pointer<unknown>
export declare type napi_deferred = Pointer<unknown>
export declare type napi_handle_scope = Pointer<unknown>
export declare type napi_escapable_handle_scope = Pointer<unknown>

export declare type napi_addon_register_func = FunctionPointer<(env: napi_env, exports: napi_value) => napi_value>

export declare type napi_callback_info = Pointer<unknown>
export declare type napi_callback = FunctionPointer<(env: napi_env, info: napi_callback_info) => napi_value>

export declare interface napi_extended_error_info {
  error_message: const_char_p
  engine_reserved: void_p
  engine_error_code: uint32_t
  error_code: napi_status
}

export declare interface napi_property_descriptor {
  // One of utf8name or name should be NULL.
  utf8name: const_char_p
  name: napi_value

  method: napi_callback
  getter: napi_callback
  setter: napi_callback
  value: napi_value
  /* napi_property_attributes */
  attributes: number
  data: void_p
}

export declare type napi_finalize = FunctionPointer<(
  env: napi_env,
  finalize_data: void_p,
  finalize_hint: void_p
) => void>

export declare interface node_module {
  nm_version: int32_t
  nm_flags: uint32_t
  nm_filename: Pointer<const_char>
  nm_register_func: napi_addon_register_func
  nm_modname: Pointer<const_char>
  nm_priv: Pointer<void>
  reserved: PointerPointer<void>
}

export declare interface napi_node_version {
  major: uint32_t
  minor: uint32_t
  patch: uint32_t
  release: const_char_p
}

export declare interface emnapi_emscripten_version {
  major: uint32_t
  minor: uint32_t
  patch: uint32_t
}

export declare const enum napi_status {
  napi_ok,
  napi_invalid_arg,
  napi_object_expected,
  napi_string_expected,
  napi_name_expected,
  napi_function_expected,
  napi_number_expected,
  napi_boolean_expected,
  napi_array_expected,
  napi_generic_failure,
  napi_pending_exception,
  napi_cancelled,
  napi_escape_called_twice,
  napi_handle_scope_mismatch,
  napi_callback_scope_mismatch,
  napi_queue_full,
  napi_closing,
  napi_bigint_expected,
  napi_date_expected,
  napi_arraybuffer_expected,
  napi_detachable_arraybuffer_expected,
  napi_would_deadlock, // unused
  napi_no_external_buffers_allowed,
  napi_cannot_run_js
}

export declare const enum napi_property_attributes {
  napi_default = 0,
  napi_writable = 1 << 0,
  napi_enumerable = 1 << 1,
  napi_configurable = 1 << 2,

  // Used with napi_define_class to distinguish static properties
  // from instance properties. Ignored by napi_define_properties.
  napi_static = 1 << 10,

  /// #ifdef NAPI_EXPERIMENTAL
  // Default for class methods.
  napi_default_method = napi_writable | napi_configurable,

  // Default for object properties, like in JS obj[prop].
  napi_default_jsproperty = napi_writable | napi_enumerable | napi_configurable
  /// #endif  // NAPI_EXPERIMENTAL
}

export declare const enum napi_valuetype {
  napi_undefined,
  napi_null,
  napi_boolean,
  napi_number,
  napi_string,
  napi_symbol,
  napi_object,
  napi_function,
  napi_external,
  napi_bigint
}

export declare const enum napi_typedarray_type {
  napi_int8_array,
  napi_uint8_array,
  napi_uint8_clamped_array,
  napi_int16_array,
  napi_uint16_array,
  napi_int32_array,
  napi_uint32_array,
  napi_float32_array,
  napi_float64_array,
  napi_bigint64_array,
  napi_biguint64_array,
  napi_float16_array,
}

export declare const enum napi_key_collection_mode {
  napi_key_include_prototypes,
  napi_key_own_only
}

export declare const enum napi_key_filter {
  napi_key_all_properties = 0,
  napi_key_writable = 1,
  napi_key_enumerable = 1 << 1,
  napi_key_configurable = 1 << 2,
  napi_key_skip_strings = 1 << 3,
  napi_key_skip_symbols = 1 << 4
}

export declare const enum napi_key_conversion {
  napi_key_keep_numbers,
  napi_key_numbers_to_strings
}

export declare const enum emnapi_memory_view_type {
  emnapi_int8_array,
  emnapi_uint8_array,
  emnapi_uint8_clamped_array,
  emnapi_int16_array,
  emnapi_uint16_array,
  emnapi_int32_array,
  emnapi_uint32_array,
  emnapi_float32_array,
  emnapi_float64_array,
  emnapi_bigint64_array,
  emnapi_biguint64_array,
  emnapi_float16_array,
  emnapi_data_view = -1,
  emnapi_buffer = -2
}

export declare const enum napi_threadsafe_function_call_mode {
  napi_tsfn_nonblocking,
  napi_tsfn_blocking
}

export declare const enum napi_threadsafe_function_release_mode {
  napi_tsfn_release,
  napi_tsfn_abort
}
export declare type CleanupHookCallbackFunction = number | ((arg: number) => void);

export declare class ConstHandle<S extends undefined | null | boolean | typeof globalThis> extends Handle<S> {
    constructor(id: number, value: S);
    dispose(): void;
}

export declare class Context {
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

export declare function createContext(): Context;

export declare class Deferred<T = any> implements IStoreValue {
    static create<T = any>(ctx: Context, value: IDeferrdValue<T>): Deferred;
    id: number;
    ctx: Context;
    value: IDeferrdValue<T>;
    constructor(ctx: Context, value: IDeferrdValue<T>);
    resolve(value: T): void;
    reject(reason?: any): void;
    dispose(): void;
}

export declare class EmnapiError extends Error {
    constructor(message?: string);
}

export declare abstract class Env implements IStoreValue {
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
declare interface External_2 extends Record<any, any> {
}

/** @public */
declare const External_2: {
    new (value: number | bigint): External_2;
    prototype: null;
};
export { External_2 as External }

export declare class Finalizer {
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

export declare function getDefaultContext(): Context;

/** @public */
export declare function getExternalValue(external: External_2): number | bigint;

export declare class Handle<S> {
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

export declare class HandleScope {
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

export declare class HandleStore {
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

export declare interface ICallbackInfo {
    thiz: any;
    data: void_p;
    args: ArrayLike<any>;
    fn: Function;
}

export declare interface IDeferrdValue<T = any> {
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
}

export declare interface IReferenceBinding {
    wrapped: number;
    tag: Uint32Array | null;
}

/** @public */
export declare function isExternal(object: unknown): object is External_2;

export declare function isReferenceType(v: any): v is object;

export declare interface IStoreValue {
    id: number;
    dispose(): void;
    [x: string]: any;
}

export declare const NAPI_VERSION_EXPERIMENTAL = Version.NAPI_VERSION_EXPERIMENTAL;

export declare const NODE_API_DEFAULT_MODULE_API_VERSION = Version.NODE_API_DEFAULT_MODULE_API_VERSION;

export declare const NODE_API_SUPPORTED_VERSION_MAX = Version.NODE_API_SUPPORTED_VERSION_MAX;

export declare const NODE_API_SUPPORTED_VERSION_MIN = Version.NODE_API_SUPPORTED_VERSION_MIN;

export declare class NodeEnv extends Env {
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

export declare class NotSupportBufferError extends EmnapiError {
    constructor(api: string, message: string);
}

export declare class NotSupportWeakRefError extends EmnapiError {
    constructor(api: string, message: string);
}

export declare class Persistent<T> {
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

export declare class Reference extends RefTracker implements IStoreValue {
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

export declare enum ReferenceOwnership {
    kRuntime = 0,
    kUserland = 1
}

export declare class ReferenceWithData extends Reference {
    private readonly _data;
    static create(envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, data: void_p): ReferenceWithData;
    private constructor();
    data(): void_p;
}

export declare class ReferenceWithFinalizer extends Reference {
    private _finalizer;
    static create(envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): ReferenceWithFinalizer;
    private constructor();
    resetFinalizer(): void;
    data(): void_p;
    protected callUserFinalizer(): void;
    protected invokeFinalizerFromGC(): void;
    dispose(): void;
}

export declare class RefTracker {
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

export declare class ScopeStore {
    private readonly _rootScope;
    currentScope: HandleScope;
    private readonly _values;
    constructor();
    get(id: number): HandleScope | undefined;
    openScope(handleStore: HandleStore): HandleScope;
    closeScope(): void;
    dispose(): void;
}

export declare class Store<V extends IStoreValue> {
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

export declare class TrackedFinalizer extends RefTracker {
    private _finalizer;
    static create(envObject: Env, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): TrackedFinalizer;
    private constructor();
    data(): void_p;
    dispose(): void;
    finalize(): void;
}

export declare class TryCatch {
    private _exception;
    private _caught;
    isEmpty(): boolean;
    hasCaught(): boolean;
    exception(): any;
    setError(err: any): void;
    reset(): void;
    extractException(): any;
}

export declare const version: string;

export { }
