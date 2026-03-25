import { IDerivation, IObservable, Reaction } from "../internal";
import { ComputedValue } from "./computedvalue";
export type IUNCHANGED = {};
export declare class MobXGlobals {
    /**
     * MobXGlobals version.
     * MobX compatiblity with other versions loaded in memory as long as this version matches.
     * It indicates that the global state still stores similar information
     *
     * N.B: this version is unrelated to the package version of MobX, and is only the version of the
     * internal state storage of MobX, and can be the same across many different package versions
     */
    version: number;
    /**
     * globally unique token to signal unchanged
     */
    UNCHANGED: IUNCHANGED;
    /**
     * Currently running derivation
     */
    trackingDerivation: IDerivation | null;
    /**
     * Currently running reaction. This determines if we currently have a reactive context.
     * (Tracking derivation is also set for temporal tracking of computed values inside actions,
     * but trackingReaction can only be set by a form of Reaction)
     */
    trackingContext: Reaction | ComputedValue<any> | null;
    /**
     * Each time a derivation is tracked, it is assigned a unique run-id
     */
    runId: number;
    /**
     * 'guid' for general purpose. Will be persisted amongst resets.
     */
    mobxGuid: number;
    /**
     * Are we in a batch block? (and how many of them)
     */
    inBatch: number;
    /**
     * Observables that don't have observers anymore, and are about to be
     * suspended, unless somebody else accesses it in the same batch
     *
     * @type {IObservable[]}
     */
    pendingUnobservations: IObservable[];
    /**
     * List of scheduled, not yet executed, reactions.
     */
    pendingReactions: Reaction[];
    /**
     * Are we currently processing reactions?
     */
    isRunningReactions: boolean;
    /**
     * Is it allowed to change observables at this point?
     * In general, MobX doesn't allow that when running computations and React.render.
     * To ensure that those functions stay pure.
     */
    allowStateChanges: boolean;
    /**
     * Is it allowed to read observables at this point?
     * Used to hold the state needed for `observableRequiresReaction`
     */
    allowStateReads: boolean;
    /**
     * If strict mode is enabled, state changes are by default not allowed
     */
    enforceActions: boolean | "always";
    /**
     * Spy callbacks
     */
    spyListeners: {
        (change: any): void;
    }[];
    /**
     * Globally attached error handlers that react specifically to errors in reactions
     */
    globalReactionErrorHandlers: ((error: any, derivation: IDerivation) => void)[];
    /**
     * Warn if computed values are accessed outside a reactive context
     */
    computedRequiresReaction: boolean;
    /**
     * (Experimental)
     * Warn if you try to create to derivation / reactive context without accessing any observable.
     */
    reactionRequiresObservable: boolean;
    /**
     * (Experimental)
     * Warn if observables are accessed outside a reactive context
     */
    observableRequiresReaction: boolean;
    disableErrorBoundaries: boolean;
    suppressReactionErrors: boolean;
    useProxies: boolean;
    verifyProxies: boolean;
    /**
     * False forces all object's descriptors to
     * writable: true
     * configurable: true
     */
    safeDescriptors: boolean;
}
export declare let globalState: MobXGlobals;
export declare function isolateGlobalState(): void;
export declare function getGlobalState(): any;
/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to get back at a stable state after throwing errors
 */
export declare function resetGlobalState(): void;
