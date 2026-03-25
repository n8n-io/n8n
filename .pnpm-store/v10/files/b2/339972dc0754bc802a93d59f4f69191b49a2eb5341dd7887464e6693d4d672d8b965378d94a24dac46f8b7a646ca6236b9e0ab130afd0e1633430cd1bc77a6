export interface IEffect extends Subscriber {
    nextNotify: IEffect | undefined;
    notify(): void;
}
export interface IComputed extends Dependency, Subscriber {
    update(): boolean;
}
export interface Dependency {
    subs: Link | undefined;
    subsTail: Link | undefined;
    lastTrackedId?: number;
}
export interface Subscriber {
    flags: SubscriberFlags;
    deps: Link | undefined;
    depsTail: Link | undefined;
}
export interface Link {
    dep: Dependency | IComputed | (Dependency & IEffect);
    sub: Subscriber | IComputed | (Dependency & IEffect) | IEffect;
    prevSub: Link | undefined;
    nextSub: Link | undefined;
    nextDep: Link | undefined;
}
export declare const enum SubscriberFlags {
    None = 0,
    Tracking = 1,
    Recursed = 2,
    InnerEffectsPending = 4,
    ToCheckDirty = 8,
    Dirty = 16
}
export declare function startBatch(): void;
export declare function endBatch(): void;
export declare function link(dep: Dependency, sub: Subscriber): void;
export declare function propagate(link: Link): void;
export declare function shallowPropagate(link: Link): void;
export declare function checkDirty(link: Link): boolean;
export declare function startTrack(sub: Subscriber): void;
export declare function endTrack(sub: Subscriber): void;
