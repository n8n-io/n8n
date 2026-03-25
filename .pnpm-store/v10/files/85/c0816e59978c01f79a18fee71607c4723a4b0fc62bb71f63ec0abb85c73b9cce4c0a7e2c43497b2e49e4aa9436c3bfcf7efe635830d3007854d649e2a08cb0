/// <reference types="node" />
import { PendingOperation } from './PendingOperation';
import { Resource } from './Resource';
import { EventEmitter } from 'events';
export interface PoolOptions<T> {
    create: CallbackOrPromise<T>;
    destroy: (resource: T) => any;
    min: number;
    max: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    createRetryIntervalMillis?: number;
    reapIntervalMillis?: number;
    log?: (msg: string) => any;
    validate?: (resource: T) => boolean;
    propagateCreateError?: boolean;
}
export declare class Pool<T> {
    protected min: number;
    protected max: number;
    protected used: Resource<T>[];
    protected free: Resource<T>[];
    protected pendingCreates: PendingOperation<T>[];
    protected pendingAcquires: PendingOperation<T>[];
    protected pendingDestroys: PendingOperation<T>[];
    protected pendingValidations: PendingOperation<T>[];
    protected interval: NodeJS.Timer | null;
    protected destroyed: boolean;
    protected propagateCreateError: boolean;
    protected idleTimeoutMillis: number;
    protected createRetryIntervalMillis: number;
    protected reapIntervalMillis: number;
    protected createTimeoutMillis: number;
    protected destroyTimeoutMillis: number;
    protected acquireTimeoutMillis: number;
    protected log: (msg: string, level: 'warn') => any;
    protected creator: CallbackOrPromise<T>;
    protected destroyer: (resource: T) => any;
    protected validate: (resource: T) => boolean;
    protected eventId: number;
    protected emitter: EventEmitter;
    constructor(opt: PoolOptions<T>);
    numUsed(): number;
    numFree(): number;
    numPendingAcquires(): number;
    numPendingValidations(): number;
    numPendingCreates(): number;
    acquire(): PendingOperation<T>;
    release(resource: T): boolean;
    isEmpty(): boolean;
    /**
     * Reaping cycle.
     */
    check(): void;
    destroy(): Promise<import("./PromiseInspection").PromiseInspection<unknown> | import("./PromiseInspection").PromiseInspection<void>>;
    on(eventName: 'acquireRequest', handler: (eventId: number) => void): void;
    on(eventName: 'acquireSuccess', handler: (eventId: number, resource: T) => void): void;
    on(eventName: 'acquireFail', handler: (eventId: number, err: Error) => void): void;
    on(eventName: 'release', handler: (resource: T) => void): void;
    on(eventName: 'createRequest', handler: (eventId: number) => void): void;
    on(eventName: 'createSuccess', handler: (eventId: number, resource: T) => void): void;
    on(eventName: 'createFail', handler: (eventId: number, err: Error) => void): void;
    on(eventName: 'destroyRequest', handler: (eventId: number, resource: T) => void): void;
    on(eventName: 'destroySuccess', handler: (eventId: number, resource: T) => void): void;
    on(eventName: 'destroyFail', handler: (eventId: number, resource: T, err: Error) => void): void;
    on(eventName: 'startReaping', handler: () => void): void;
    on(eventName: 'stopReaping', handler: () => void): void;
    on(eventName: 'poolDestroyRequest', handler: (eventId: number) => void): void;
    on(eventName: 'poolDestroySuccess', handler: (eventId: number) => void): void;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): void;
    removeAllListeners(event?: string | symbol | undefined): void;
    /**
     * The most important method that is called always when resources
     * are created / destroyed / acquired / released. In other words
     * every time when resources are moved from used to free or vice
     * versa.
     *
     * Either assigns free resources to pendingAcquires or creates new
     * resources if there is room for it in the pool.
     */
    _tryAcquireOrCreate(): void;
    _hasFreeResources(): boolean;
    _doAcquire(): void;
    _canAcquire(): boolean;
    _validateResource(resource: T): Promise<boolean>;
    _shouldCreateMoreResources(): boolean;
    _doCreate(): void;
    _create(): PendingOperation<T>;
    _destroy(resource: T): Promise<void | T>;
    _logDestroyerError(eventId: number, resource: T, err: Error): void;
    _startReaping(): void;
    _stopReaping(): void;
    _executeEventHandlers(eventName: string, ...args: any): void;
}
export declare type Callback<T> = (err: Error | null, resource: T) => any;
export declare type CallbackOrPromise<T> = (cb: Callback<T>) => any | (() => Promise<T>);
