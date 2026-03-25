import { IEqualsComparer, IReactionDisposer, IReactionPublic, GenericAbortSignal } from "../internal";
export interface IAutorunOptions {
    delay?: number;
    name?: string;
    /**
     * Experimental.
     * Warns if the view doesn't track observables
     */
    requiresObservable?: boolean;
    scheduler?: (callback: () => void) => any;
    onError?: (error: any) => void;
    signal?: GenericAbortSignal;
}
/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export declare function autorun(view: (r: IReactionPublic) => any, opts?: IAutorunOptions): IReactionDisposer;
export type IReactionOptions<T, FireImmediately extends boolean> = IAutorunOptions & {
    fireImmediately?: FireImmediately;
    equals?: IEqualsComparer<T>;
};
export declare function reaction<T, FireImmediately extends boolean = false>(expression: (r: IReactionPublic) => T, effect: (arg: T, prev: FireImmediately extends true ? T | undefined : T, r: IReactionPublic) => void, opts?: IReactionOptions<T, FireImmediately>): IReactionDisposer;
