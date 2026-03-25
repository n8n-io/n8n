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
}
export interface Subscriber {
    trackId: number;
    canPropagate: boolean;
    dirtyLevel: DirtyLevels;
    deps: Link | undefined;
    depsTail: Link | undefined;
}
export interface Link {
    dep: Dependency | IComputed | (Dependency & IEffect);
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
    function link(dep: Dependency, sub: Subscriber): void;
    function propagate(subs: Link): void;
}
export declare namespace Subscriber {
    function checkDirty(link: Link, depth?: number): boolean;
    function startTrack(sub: Subscriber): Subscriber | undefined;
    function endTrack(sub: Subscriber, prevSub: Subscriber | undefined): void;
    function clearTrack(link: Link): void;
}
