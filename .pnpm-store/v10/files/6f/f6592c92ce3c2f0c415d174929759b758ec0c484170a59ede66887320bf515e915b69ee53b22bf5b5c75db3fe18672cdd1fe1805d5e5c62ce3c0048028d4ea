import { IDerivation, IDerivationState_, IObservable, Lambda, TraceMode, GenericAbortSignal } from "../internal";
/**
 * Reactions are a special kind of derivations. Several things distinguishes them from normal reactive computations
 *
 * 1) They will always run, whether they are used by other computations or not.
 * This means that they are very suitable for triggering side effects like logging, updating the DOM and making network requests.
 * 2) They are not observable themselves
 * 3) They will always run after any 'normal' derivations
 * 4) They are allowed to change the state and thereby triggering themselves again, as long as they make sure the state propagates to a stable state in a reasonable amount of iterations.
 *
 * The state machine of a Reaction is as follows:
 *
 * 1) after creating, the reaction should be started by calling `runReaction` or by scheduling it (see also `autorun`)
 * 2) the `onInvalidate` handler should somehow result in a call to `this.track(someFunction)`
 * 3) all observables accessed in `someFunction` will be observed by this reaction.
 * 4) as soon as some of the dependencies has changed the Reaction will be rescheduled for another run (after the current mutation or transaction). `isScheduled` will yield true once a dependency is stale and during this period
 * 5) `onInvalidate` will be called, and we are back at step 1.
 *
 */
export interface IReactionPublic {
    dispose(): void;
    trace(enterBreakPoint?: boolean): void;
}
export interface IReactionDisposer {
    (): void;
    $mobx: Reaction;
}
export declare class Reaction implements IDerivation, IReactionPublic {
    name_: string;
    private onInvalidate_;
    private errorHandler_?;
    requiresObservable_?: any;
    observing_: IObservable[];
    newObserving_: IObservable[];
    dependenciesState_: IDerivationState_;
    diffValue_: number;
    runId_: number;
    unboundDepsCount_: number;
    isDisposed_: boolean;
    isScheduled_: boolean;
    isTrackPending_: boolean;
    isRunning_: boolean;
    isTracing_: TraceMode;
    constructor(name_: string, onInvalidate_: () => void, errorHandler_?: ((error: any, derivation: IDerivation) => void) | undefined, requiresObservable_?: any);
    onBecomeStale_(): void;
    schedule_(): void;
    isScheduled(): boolean;
    /**
     * internal, use schedule() if you intend to kick off a reaction
     */
    runReaction_(): void;
    track(fn: () => void): void;
    reportExceptionInDerivation_(error: any): void;
    dispose(): void;
    getDisposer_(abortSignal?: GenericAbortSignal): IReactionDisposer;
    toString(): string;
    trace(enterBreakPoint?: boolean): void;
}
export declare function onReactionError(handler: (error: any, derivation: IDerivation) => void): Lambda;
export declare function runReactions(): void;
export declare const isReaction: (x: any) => x is Reaction;
export declare function setReactionScheduler(fn: (f: () => void) => void): void;
