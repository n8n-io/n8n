import { DirtyLevels, Link, Subscriber } from './system.js';
export declare let activeEffectScope: EffectScope | undefined;
export declare function effectScope(): EffectScope;
export declare class EffectScope implements Subscriber {
    deps: Link | undefined;
    depsTail: Link | undefined;
    trackId: number;
    dirtyLevel: DirtyLevels;
    canPropagate: boolean;
    notify(): void;
    run<T>(fn: () => T): T;
    stop(): void;
}
