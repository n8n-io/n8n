import LRU from 'lru-cache';
export declare type Listener = (...as: any[]) => void;
export declare type INodeStyleCallBack<Success> = (err: Error | null, result?: Success) => void;
export interface ResultBase {
    /**
     * Returns all keys in the cache.
     */
    keys: () => string[];
    /**
     * Clear the cache.
     */
    reset: () => void;
    /**
     * Delete an item given the parameters.
     */
    del: <T1, T2, T3, T4, T5, T6>(a1?: T1, a2?: T2, a3?: T3, a4?: T4, a5?: T5, a6?: T6) => void;
    on(event: 'hit', handler: Listener): void;
    on(event: 'miss', handler: Listener): void;
    on(event: 'queue', handler: Listener): void;
}
export interface IHashingFunction0 {
    (): string;
}
export interface IHashingFunction1<T1> {
    (a1: T1): string;
}
export interface IHashingFunction2<T1, T2> {
    (a1: T1, a2: T2): string;
}
export interface IHashingFunction3<T1, T2, T3> {
    (a1: T1, a2: T2, a3: T3): string;
}
export interface IHashingFunction4<T1, T2, T3, T4> {
    (a1: T1, a2: T2, a3: T3, a4: T4): string;
}
export interface IHashingFunction5<T1, T2, T3, T4, T5> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5): string;
}
export interface IHashingFunction6<T1, T2, T3, T4, T5, T6> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6): string;
}
export interface IHashingFunctionPlus {
    (...rest: any[]): string;
}
export interface IBypassFunction0 {
    (): boolean;
}
export interface IBypassFunction1<T1> {
    (a1: T1): boolean;
}
export interface IBypassFunction2<T1, T2> {
    (a1: T1, a2: T2): boolean;
}
export interface IBypassFunction3<T1, T2, T3> {
    (a1: T1, a2: T2, a3: T3): boolean;
}
export interface IBypassFunction4<T1, T2, T3, T4> {
    (a1: T1, a2: T2, a3: T3, a4: T4): boolean;
}
export interface IBypassFunction5<T1, T2, T3, T4, T5> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5): boolean;
}
export interface IBypassFunction6<T1, T2, T3, T4, T5, T6> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6): boolean;
}
export interface IBypassFunctionPlus {
    (...rest: any[]): boolean;
}
export interface IMaxAgeFunction0<TResult> {
    (res: TResult): number;
}
export interface IMaxAgeFunction1<T1, TResult> {
    (a1: T1, res: TResult): number;
}
export interface IMaxAgeFunction2<T1, T2, TResult> {
    (a1: T1, a2: T2, res: TResult): number;
}
export interface IMaxAgeFunction3<T1, T2, T3, TResult> {
    (a1: T1, a2: T2, a3: T3, res: TResult): number;
}
export interface IMaxAgeFunction4<T1, T2, T3, T4, TResult> {
    (a1: T1, a2: T2, a3: T3, a4: T4, res: TResult): number;
}
export interface IMaxAgeFunction5<T1, T2, T3, T4, T5, TResult> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, res: TResult): number;
}
export interface IMaxAgeFunction6<T1, T2, T3, T4, T5, T6, TResult> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6, res: TResult): number;
}
export interface IMaxAgeFunctionPlus {
    (...rest: any[]): number;
}
export interface IParamsBase0<TResult> extends IParamsBaseCommons {
    hash: IHashingFunction0;
    bypass?: IBypassFunction0;
    itemMaxAge?: IMaxAgeFunction0<TResult>;
}
export interface IParamsBase1<T1, TResult> extends IParamsBaseCommons {
    hash: IHashingFunction1<T1>;
    bypass?: IBypassFunction1<T1>;
    itemMaxAge?: IMaxAgeFunction1<T1, TResult>;
}
export interface IParamsBase2<T1, T2, TResult> extends IParamsBaseCommons {
    hash: IHashingFunction2<T1, T2>;
    bypass?: IBypassFunction2<T1, T2>;
    itemMaxAge?: IMaxAgeFunction2<T1, T2, TResult>;
}
export interface IParamsBase3<T1, T2, T3, TResult> extends IParamsBaseCommons {
    hash: IHashingFunction3<T1, T2, T3>;
    bypass?: IBypassFunction3<T1, T2, T3>;
    itemMaxAge?: IMaxAgeFunction3<T1, T2, T3, TResult>;
}
export interface IParamsBase4<T1, T2, T3, T4, TResult> extends IParamsBaseCommons {
    hash: IHashingFunction4<T1, T2, T3, T4>;
    bypass?: IBypassFunction4<T1, T2, T3, T4>;
    itemMaxAge?: IMaxAgeFunction4<T1, T2, T3, T4, TResult>;
}
export interface IParamsBase5<T1, T2, T3, T4, T5, TResult> extends IParamsBaseCommons {
    hash: IHashingFunction5<T1, T2, T3, T4, T5>;
    bypass?: IBypassFunction5<T1, T2, T3, T4, T5>;
    itemMaxAge?: IMaxAgeFunction5<T1, T2, T3, T4, T5, TResult>;
}
export interface IParamsBase6<T1, T2, T3, T4, T5, T6, TResult> extends IParamsBaseCommons {
    /**
     * A function to generate the key of the cache.
     */
    hash: IHashingFunction6<T1, T2, T3, T4, T5, T6>;
    /**
     * Return true if the result should not be retrieved from the cache.
     */
    bypass?: IBypassFunction6<T1, T2, T3, T4, T5, T6>;
    /**
     * An optional function to indicate the maxAge of an specific item.
     */
    itemMaxAge?: IMaxAgeFunction6<T1, T2, T3, T4, T5, T6, TResult>;
}
export interface IParamsBasePlus extends IParamsBaseCommons {
    hash: IHashingFunctionPlus;
    bypass?: IBypassFunctionPlus;
    itemMaxAge?: IMaxAgeFunctionPlus;
}
interface IParamsBaseCommons extends LRU.Options<string, any> {
    /**
     * Indicates if the resource should be freezed.
     */
    freeze?: boolean;
    /**
     * Indicates if the resource should be cloned before is returned.
     */
    clone?: boolean;
    /**
     * Disable the cache and executes the load logic directly.
     */
    disable?: boolean;
    /**
     * Do not queue requests if initial call is more than `queueMaxAge` milliseconds old.
     * Instead, invoke `load` again and create a new queue.
     * Defaults to 1000ms.
     */
    queueMaxAge?: number;
}
export {};
