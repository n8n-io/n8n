import { Lambda, IDerivation, IDerivationState_ } from "../internal";
export interface IDepTreeNode {
    name_: string;
    observing_?: IObservable[];
}
export interface IObservable extends IDepTreeNode {
    diffValue_: number;
    /**
     * Id of the derivation *run* that last accessed this observable.
     * If this id equals the *run* id of the current derivation,
     * the dependency is already established
     */
    lastAccessedBy_: number;
    isBeingObserved_: boolean;
    lowestObserverState_: IDerivationState_;
    isPendingUnobservation_: boolean;
    observers_: Set<IDerivation>;
    onBUO(): void;
    onBO(): void;
    onBUOL: Set<Lambda> | undefined;
    onBOL: Set<Lambda> | undefined;
}
export declare function hasObservers(observable: IObservable): boolean;
export declare function getObservers(observable: IObservable): Set<IDerivation>;
export declare function addObserver(observable: IObservable, node: IDerivation): void;
export declare function removeObserver(observable: IObservable, node: IDerivation): void;
export declare function queueForUnobservation(observable: IObservable): void;
/**
 * Batch starts a transaction, at least for purposes of memoizing ComputedValues when nothing else does.
 * During a batch `onBecomeUnobserved` will be called at most once per observable.
 * Avoids unnecessary recalculations.
 */
export declare function startBatch(): void;
export declare function endBatch(): void;
export declare function reportObserved(observable: IObservable): boolean;
/**
 * NOTE: current propagation mechanism will in case of self reruning autoruns behave unexpectedly
 * It will propagate changes to observers from previous run
 * It's hard or maybe impossible (with reasonable perf) to get it right with current approach
 * Hopefully self reruning autoruns aren't a feature people should depend on
 * Also most basic use cases should be ok
 */
export declare function propagateChanged(observable: IObservable): void;
export declare function propagateChangeConfirmed(observable: IObservable): void;
export declare function propagateMaybeChanged(observable: IObservable): void;
