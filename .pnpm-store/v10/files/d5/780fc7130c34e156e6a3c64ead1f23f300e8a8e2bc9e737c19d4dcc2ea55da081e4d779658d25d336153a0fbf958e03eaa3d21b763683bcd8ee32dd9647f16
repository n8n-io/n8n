export interface IEffect extends Dependency, Subscriber {
    nextNotify: IEffect | undefined;
    notify(): void;
}
export interface IComputed extends Dependency, Subscriber {
    update(): void;
}
export interface Dependency {
    subs: Link | undefined;
    subsTail: Link | undefined;
}
export interface Subscriber {
    trackId: number;
    canPropagate: boolean;
    dirtyLevel: DirtyLevels;
    deps: Link | undefined;
    depsTail: Link | undefined;
}
export interface Link {
    dep: Dependency | IComputed | IEffect;
    sub: Subscriber | IComputed | IEffect;
    trackId: number;
    prevSub: Link | undefined;
    nextSub: Link | undefined;
    nextDep: Link | undefined;
}
export declare const enum DirtyLevels {
    None = 0,
    SideEffectsOnly = 1,
    MaybeDirty = 2,
    Dirty = 3
}
export declare namespace System {
    let activeSub: Subscriber | undefined;
    let activeTrackId: number;
    let batchDepth: number;
    let lastTrackId: number;
    let queuedEffects: IEffect | undefined;
    let queuedEffectsTail: IEffect | undefined;
}
export declare function startBatch(): void;
export declare function endBatch(): void;
export declare namespace Link {
    function get(dep: Dependency, sub: Subscriber, nextDep: Link | undefined): Link;
    function release(link: Link): void;
}
export declare namespace Dependency {
    /**
     * @deprecated Use `startTrack` instead.
     */
    function linkSubscriber(dep: Dependency, sub: Subscriber): void;
    function link(dep: Dependency, sub: Subscriber): void;
    function propagate(subs: Link): void;
}
export declare namespace Subscriber {
    function resolveMaybeDirty(sub: IComputed | IEffect, depth?: number): void;
    function resolveMaybeDirtyNonRecursive(sub: IComputed | IEffect): void;
    /**
     * @deprecated Use `startTrack` instead.
     */
    function startTrackDependencies(sub: Subscriber): Subscriber | undefined;
    /**
     * @deprecated Use `endTrack` instead.
     */
    function endTrackDependencies(sub: Subscriber, prevSub: Subscriber | undefined): void;
    function startTrack(sub: Subscriber): Subscriber | undefined;
    function endTrack(sub: Subscriber, prevSub: Subscriber | undefined): void;
    function clearTrack(link: Link): void;
}
