import { ISignal } from './computed.js';
import { Dependency, Link } from './system.js';
export interface IWritableSignal<T = any> extends ISignal<T> {
    set(value: T): void;
}
export declare function signal<T>(): Signal<T | undefined>;
export declare function signal<T>(oldValue: T): Signal<T>;
export declare class Signal<T = any> implements Dependency {
    currentValue: T;
    subs: Link | undefined;
    subsTail: Link | undefined;
    constructor(currentValue: T);
    get(): NonNullable<T>;
    set(value: T): void;
}
