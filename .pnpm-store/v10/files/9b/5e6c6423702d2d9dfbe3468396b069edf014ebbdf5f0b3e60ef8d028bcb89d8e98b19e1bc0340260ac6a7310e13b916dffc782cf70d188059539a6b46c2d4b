import { Dependency, Link } from './system.js';
import type { IWritableSignal } from './types.js';
export declare function signal<T>(): Signal<T | undefined>;
export declare function signal<T>(oldValue: T): Signal<T>;
export declare class Signal<T = any> implements Dependency, IWritableSignal<T> {
    currentValue: T;
    subs: Link | undefined;
    subsTail: Link | undefined;
    lastTrackedId: number;
    constructor(currentValue: T);
    get(): T;
    set(value: T): void;
}
