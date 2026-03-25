import { IComputed, Link, SubscriberFlags } from './system.js';
import type { ISignal } from './types.js';
export declare function computed<T>(getter: (cachedValue?: T) => T): Computed<T>;
export declare class Computed<T = any> implements IComputed, ISignal<T> {
    getter: (cachedValue?: T) => T;
    currentValue: T | undefined;
    subs: Link | undefined;
    subsTail: Link | undefined;
    lastTrackedId: number;
    deps: Link | undefined;
    depsTail: Link | undefined;
    flags: SubscriberFlags;
    constructor(getter: (cachedValue?: T) => T);
    get(): T;
    update(): boolean;
}
