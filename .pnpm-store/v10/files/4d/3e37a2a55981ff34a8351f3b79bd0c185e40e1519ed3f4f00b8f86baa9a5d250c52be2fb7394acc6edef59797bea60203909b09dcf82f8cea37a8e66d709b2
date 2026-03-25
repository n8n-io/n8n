import { Dependency, IEffect, Link, Subscriber, SubscriberFlags } from './system.js';
export declare let activeSub: Subscriber | undefined;
export declare let activeTrackId: number;
export declare let lastTrackId: number;
export declare function untrack<T>(fn: () => T): T;
export declare function setActiveSub(sub: Subscriber | undefined, trackId: number): void;
export declare function nextTrackId(): number;
export declare function effect<T>(fn: () => T): Effect<T>;
export declare class Effect<T = any> implements IEffect, Dependency {
    fn: () => T;
    nextNotify: IEffect | undefined;
    subs: Link | undefined;
    subsTail: Link | undefined;
    deps: Link | undefined;
    depsTail: Link | undefined;
    flags: SubscriberFlags;
    constructor(fn: () => T);
    notify(): void;
    run(): T;
    stop(): void;
}
