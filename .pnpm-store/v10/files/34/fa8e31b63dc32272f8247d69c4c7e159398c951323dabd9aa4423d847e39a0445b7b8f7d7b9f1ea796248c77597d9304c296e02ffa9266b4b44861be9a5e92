import { IAtom, IDepTreeNode, IObservable } from "../internal";
export declare enum IDerivationState_ {
    NOT_TRACKING_ = -1,
    UP_TO_DATE_ = 0,
    POSSIBLY_STALE_ = 1,
    STALE_ = 2
}
export declare enum TraceMode {
    NONE = 0,
    LOG = 1,
    BREAK = 2
}
/**
 * A derivation is everything that can be derived from the state (all the atoms) in a pure manner.
 * See https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 */
export interface IDerivation extends IDepTreeNode {
    observing_: IObservable[];
    newObserving_: null | IObservable[];
    dependenciesState_: IDerivationState_;
    /**
     * Id of the current run of a derivation. Each time the derivation is tracked
     * this number is increased by one. This number is globally unique
     */
    runId_: number;
    /**
     * amount of dependencies used by the derivation in this run, which has not been bound yet.
     */
    unboundDepsCount_: number;
    onBecomeStale_(): void;
    isTracing_: TraceMode;
    /**
     *  warn if the derivation has no dependencies after creation/update
     */
    requiresObservable_?: boolean;
}
export declare class CaughtException {
    cause: any;
    constructor(cause: any);
}
export declare function isCaughtException(e: any): e is CaughtException;
/**
 * Finds out whether any dependency of the derivation has actually changed.
 * If dependenciesState is 1 then it will recalculate dependencies,
 * if any dependency changed it will propagate it by changing dependenciesState to 2.
 *
 * By iterating over the dependencies in the same order that they were reported and
 * stopping on the first change, all the recalculations are only called for ComputedValues
 * that will be tracked by derivation. That is because we assume that if the first x
 * dependencies of the derivation doesn't change then the derivation should run the same way
 * up until accessing x-th dependency.
 */
export declare function shouldCompute(derivation: IDerivation): boolean;
export declare function isComputingDerivation(): boolean;
export declare function checkIfStateModificationsAreAllowed(atom: IAtom): void;
export declare function checkIfStateReadsAreAllowed(observable: IObservable): void;
/**
 * Executes the provided function `f` and tracks which observables are being accessed.
 * The tracking information is stored on the `derivation` object and the derivation is registered
 * as observer of any of the accessed observables.
 */
export declare function trackDerivedFunction<T>(derivation: IDerivation, f: () => T, context: any): any;
export declare function clearObserving(derivation: IDerivation): void;
export declare function untracked<T>(action: () => T): T;
export declare function untrackedStart(): IDerivation | null;
export declare function untrackedEnd(prev: IDerivation | null): void;
export declare function allowStateReadsStart(allowStateReads: boolean): boolean;
export declare function allowStateReadsEnd(prev: boolean): void;
/**
 * needed to keep `lowestObserverState` correct. when changing from (2 or 1) to 0
 *
 */
export declare function changeDependenciesStateTo0(derivation: IDerivation): void;
