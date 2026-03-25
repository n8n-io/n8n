import { Dependency, DirtyLevels, IEffect, Link } from './system.js';
export declare function effect(fn: () => void): Effect<void>;
export declare class Effect<T = any> implements IEffect, Dependency {
    fn: () => T;
    nextNotify: IEffect | undefined;
    subs: Link | undefined;
    subsTail: Link | undefined;
    deps: Link | undefined;
    depsTail: Link | undefined;
    trackId: number;
    dirtyLevel: DirtyLevels;
    canPropagate: boolean;
    constructor(fn: () => T);
    notify(): void;
    run(): T;
    stop(): void;
}
