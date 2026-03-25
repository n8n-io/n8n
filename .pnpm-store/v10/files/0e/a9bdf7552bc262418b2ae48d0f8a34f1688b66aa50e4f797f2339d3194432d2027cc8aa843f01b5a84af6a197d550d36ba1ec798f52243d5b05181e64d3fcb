import { DirtyLevels, IComputed, Link } from './system.js';
export interface ISignal<T = any> {
    get(): T;
}
export declare function computed<T>(getter: (cachedValue?: T) => T): ISignal<T>;
export declare class Computed<T = any> implements IComputed {
    getter: (cachedValue?: T) => T;
    cachedValue: T | undefined;
    subs: Link | undefined;
    subsTail: Link | undefined;
    deps: Link | undefined;
    depsTail: Link | undefined;
    trackId: number;
    dirtyLevel: DirtyLevels;
    canPropagate: boolean;
    constructor(getter: (cachedValue?: T) => T);
    get(): T;
    update(): void;
}
