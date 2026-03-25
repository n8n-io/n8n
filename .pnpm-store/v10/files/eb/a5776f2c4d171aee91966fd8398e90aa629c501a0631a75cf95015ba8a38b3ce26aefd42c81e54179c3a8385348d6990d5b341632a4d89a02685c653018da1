// Type definitions for node-pool 3.1
// Derived from https://github.com/DefinitelyTyped/DefinitelyTyped
// -> https://github.com/DefinitelyTyped/DefinitelyTyped/blob/454dcbcbe5e932010b128dca9793758dd28adb45/types/generic-pool/index.d.ts

/// <reference types="node" />

import { EventEmitter } from "events";

export class Pool<T> extends EventEmitter {
    spareResourceCapacity: number;
    size: number;
    available: number;
    borrowed: number;
    pending: number;
    max: number;
    min: number;

    start(): void;
    acquire(priority?: number): Promise<T>;
    release(resource: T): Promise<void>;
    destroy(resource: T): Promise<void>;
    drain(): Promise<void>;
    clear(): Promise<void>;
    use<U>(cb: (resource: T) => U | Promise<U>): Promise<U>;
    isBorrowedResource(resource: T): boolean;
    ready(): Promise<void>;
}

export interface Factory<T> {
    create(): Promise<T>;
    destroy(client: T): Promise<void>;
    validate?(client: T): Promise<boolean>;
}

export interface Options {
    max?: number;
    min?: number;
    maxWaitingClients?: number;
    testOnBorrow?: boolean;
    testOnReturn?: boolean;
    acquireTimeoutMillis?: number;
    fifo?: boolean;
    priorityRange?: number;
    autostart?: boolean;
    evictionRunIntervalMillis?: number;
    numTestsPerEvictionRun?: number;
    softIdleTimeoutMillis?: number;
    idleTimeoutMillis?: number;
}

export function createPool<T>(factory: Factory<T>, opts?: Options): Pool<T>;
