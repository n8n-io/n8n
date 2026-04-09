/// <reference types="node" />

import type { Worker as Worker_2 } from 'worker_threads';

/** @public */
export declare interface BaseOptions {
    wasi: WASIInstance;
    version?: 'preview1';
    wasm64?: boolean;
}

/** @public */
export declare interface ChildThreadOptions extends BaseOptions {
    childThread: true;
    postMessage?: (data: any) => void;
}

/** @public */
export declare interface CleanupThreadPayload {
    tid: number;
}

/** @public */
export declare interface CommandInfo<T extends CommandType> {
    type: T;
    payload: CommandPayloadMap[T];
}

/** @public */
export declare interface CommandPayloadMap {
    load: LoadPayload;
    loaded: LoadedPayload;
    start: StartPayload;
    'cleanup-thread': CleanupThreadPayload;
    'terminate-all-threads': TerminateAllThreadsPayload;
    'spawn-thread': SpawnThreadPayload;
}

/** @public */
export declare type CommandType = keyof CommandPayloadMap;

/** @public */
export declare function createInstanceProxy(instance: WebAssembly.Instance, memory?: WebAssembly.Memory | (() => WebAssembly.Memory)): WebAssembly.Instance;

/** @public */
export declare function isSharedArrayBuffer(value: any): value is SharedArrayBuffer;

/** @public */
export declare function isTrapError(e: Error): e is WebAssembly.RuntimeError;

/** @public */
export declare interface LoadedPayload {
}

/** @public */
export declare interface LoadPayload {
    wasmModule: WebAssembly.Module;
    wasmMemory: WebAssembly.Memory;
    sab?: Int32Array;
}

/** @public */
export declare interface MainThreadBaseOptions extends BaseOptions {
    waitThreadStart?: boolean | number;
}

/** @public */
export declare type MainThreadOptions = MainThreadOptionsWithThreadManager | MainThreadOptionsCreateThreadManager;

/** @public */
export declare interface MainThreadOptionsCreateThreadManager extends MainThreadBaseOptions, ThreadManagerOptionsMain {
}

/** @public */
export declare interface MainThreadOptionsWithThreadManager extends MainThreadBaseOptions {
    threadManager?: ThreadManager | (() => ThreadManager);
}

/** @public */
export declare interface MessageEventData<T extends CommandType> {
    __emnapi__: CommandInfo<T>;
}

/** @public */
export declare interface ReuseWorkerOptions {
    /**
     * @see {@link https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size | PTHREAD_POOL_SIZE}
     */
    size: number;
    /**
     * @see {@link https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size-strict | PTHREAD_POOL_SIZE_STRICT}
     */
    strict?: boolean;
}

/** @public */
export declare interface SpawnThreadPayload {
    startArg: number;
    errorOrTid: number;
}

/** @public */
export declare interface StartPayload {
    tid: number;
    arg: number;
    sab?: Int32Array;
}

/** @public */
export declare interface StartResult {
    exitCode: number;
    instance: WebAssembly.Instance;
}

/** @public */
export declare interface TerminateAllThreadsPayload {
}

/** @public */
export declare class ThreadManager {
    unusedWorkers: WorkerLike[];
    runningWorkers: WorkerLike[];
    pthreads: Record<number, WorkerLike>;
    get nextWorkerID(): number;
    wasmModule: WebAssembly.Module | null;
    wasmMemory: WebAssembly.Memory | null;
    private readonly messageEvents;
    private readonly _childThread;
    private readonly _onCreateWorker;
    private readonly _reuseWorker;
    private readonly _beforeLoad?;
    /* Excluded from this release type: printErr */
    threadSpawn?: ((startArg: number, errorOrTid?: number) => number);
    constructor(options: ThreadManagerOptions);
    init(): void;
    initMainThread(): void;
    private preparePool;
    shouldPreloadWorkers(): boolean;
    loadWasmModuleToAllWorkers(): Promise<WorkerLike[]>;
    preloadWorkers(): Promise<WorkerLike[]>;
    setup(wasmModule: WebAssembly.Module, wasmMemory: WebAssembly.Memory): void;
    markId(worker: WorkerLike): number;
    returnWorkerToPool(worker: WorkerLike): void;
    loadWasmModuleToWorker(worker: WorkerLike, sab?: Int32Array): Promise<WorkerLike>;
    allocateUnusedWorker(): WorkerLike;
    getNewWorker(sab?: Int32Array): WorkerLike | undefined;
    cleanThread(worker: WorkerLike, tid: number, force?: boolean): void;
    terminateWorker(worker: WorkerLike): void;
    terminateAllThreads(): void;
    addMessageEventListener(worker: WorkerLike, onMessage: (e: WorkerMessageEvent) => void): () => void;
    fireMessageEvent(worker: WorkerLike, e: WorkerMessageEvent): void;
}

/** @public */
export declare type ThreadManagerOptions = ThreadManagerOptionsMain | ThreadManagerOptionsChild;

/** @public */
export declare interface ThreadManagerOptionsBase {
    printErr?: (message: string) => void;
    threadSpawn?: (startArg: number, errorOrTid?: number) => number;
}

/** @public */
export declare interface ThreadManagerOptionsChild extends ThreadManagerOptionsBase {
    childThread: true;
}

/** @public */
export declare interface ThreadManagerOptionsMain extends ThreadManagerOptionsBase {
    beforeLoad?: (worker: WorkerLike) => any;
    reuseWorker?: boolean | number | ReuseWorkerOptions;
    onCreateWorker: WorkerFactory;
    childThread?: false;
}

/** @public */
export declare class ThreadMessageHandler {
    protected instance: WebAssembly.Instance | undefined;
    private messagesBeforeLoad;
    protected postMessage: (message: any) => void;
    protected onLoad?: (data: LoadPayload) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>;
    protected onError: (error: Error, type: WorkerMessageType) => void;
    constructor(options?: ThreadMessageHandlerOptions);
    /** @virtual */
    instantiate(data: LoadPayload): WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>;
    /** @virtual */
    handle(e: WorkerMessageEvent<MessageEventData<WorkerMessageType>>): void;
    private _load;
    private _start;
    protected _loaded(err: Error | null, source: WebAssembly.WebAssemblyInstantiatedSource | null, payload: LoadPayload): void;
    protected handleAfterLoad<E extends WorkerMessageEvent>(e: E, f: (e: E) => void): void;
}

/** @public */
export declare interface ThreadMessageHandlerOptions {
    onLoad?: (data: LoadPayload) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>;
    onError?: (error: Error, type: WorkerMessageType) => void;
    postMessage?: (message: any) => void;
}

/** @public */
export declare interface WASIInstance {
    readonly wasiImport?: Record<string, any>;
    initialize(instance: object): void;
    start(instance: object): number;
    getImportObject?(): any;
}

/** @public */
export declare class WASIThreads {
    PThread: ThreadManager | undefined;
    private wasmMemory;
    private wasmInstance;
    private readonly threadSpawn;
    readonly childThread: boolean;
    private readonly postMessage;
    readonly wasi: WASIInstance;
    constructor(options: WASIThreadsOptions);
    getImportObject(): {
        wasi: WASIThreadsImports;
    };
    setup(wasmInstance: WebAssembly.Instance, wasmModule: WebAssembly.Module, wasmMemory?: WebAssembly.Memory): void;
    preloadWorkers(): Promise<WorkerLike[]>;
    /**
     * It's ok to call this method to a WASI command module.
     *
     * in child thread, must call this method instead of {@link WASIThreads.start} even if it's a WASI command module
     *
     * @returns A proxied WebAssembly instance if in child thread, other wise the original instance
     */
    initialize(instance: WebAssembly.Instance, module: WebAssembly.Module, memory?: WebAssembly.Memory): WebAssembly.Instance;
    /**
     * Equivalent to calling {@link WASIThreads.initialize} and then calling {@link WASIInstance.start}
     * ```js
     * this.initialize(instance, module, memory)
     * this.wasi.start(instance)
     * ```
     */
    start(instance: WebAssembly.Instance, module: WebAssembly.Module, memory?: WebAssembly.Memory): StartResult;
    terminateAllThreads(): void;
}

/** @public */
export declare interface WASIThreadsImports {
    'thread-spawn': (startArg: number, errorOrTid?: number) => number;
}

/** @public */
export declare type WASIThreadsOptions = MainThreadOptions | ChildThreadOptions;

/** @public */
export declare type WorkerFactory = (ctx: {
    type: string;
    name: string;
}) => WorkerLike;

/** @public */
export declare type WorkerLike = (Worker | Worker_2) & {
    whenLoaded?: Promise<WorkerLike>;
    loaded?: boolean;
    __emnapi_tid?: number;
};

/** @public */
export declare interface WorkerMessageEvent<T = any> {
    data: T;
}

/** @public */
export declare type WorkerMessageType = 'load' | 'start';

export { }
