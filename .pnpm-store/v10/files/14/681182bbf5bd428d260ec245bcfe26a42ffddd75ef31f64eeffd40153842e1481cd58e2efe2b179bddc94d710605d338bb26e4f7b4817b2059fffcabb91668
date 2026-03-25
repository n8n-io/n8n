import { PromiseInspection } from './PromiseInspection';
export interface Deferred<T> {
    resolve: (val: T) => any;
    reject: <T>(err: T) => any;
    promise: Promise<T>;
}
export declare function defer<T>(): Deferred<T>;
export declare function now(): number;
export declare function duration(t1: number, t2: number): number;
export declare function checkOptionalTime(time?: number): boolean;
export declare function checkRequiredTime(time: number): boolean;
export declare function delay(millis: number): Promise<unknown>;
export declare function reflect<T>(promise: Promise<T>): Promise<PromiseInspection<T> | PromiseInspection<unknown>>;
export declare function tryPromise<T>(cb: () => T | PromiseLike<T>): Promise<T>;
