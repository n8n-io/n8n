import { Link, Subscriber, SubscriberFlags } from './system.js';
export declare let activeEffectScope: EffectScope | undefined;
export declare let activeScopeTrackId: number;
export declare function untrackScope<T>(fn: () => T): T;
export declare function setActiveScope(sub: EffectScope | undefined, trackId: number): void;
export declare function effectScope(): EffectScope;
export declare class EffectScope implements Subscriber {
    deps: Link | undefined;
    depsTail: Link | undefined;
    flags: SubscriberFlags;
    trackId: number;
    notify(): void;
    run<T>(fn: () => T): T;
    stop(): void;
}
