import { ResultBase, IParamsBase0, IParamsBase1, IParamsBase2, IParamsBase3, IParamsBase4, IParamsBase5, IParamsBase6, IParamsBasePlus } from './util';
interface IMemoizedSync<T1, T2, T3, T4, T5, T6, TResult> extends ResultBase {
    (arg1: T1): TResult;
    (arg1: T1, arg2: T2): TResult;
    (arg1: T1, arg2: T2, arg3: T3): TResult;
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4): TResult;
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): TResult;
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6): TResult;
}
interface IMemoizableFunctionSync0<TResult> {
    (): TResult;
}
interface IMemoizableFunctionSync1<T1, TResult> {
    (arg1: T1): TResult;
}
interface IMemoizableFunctionSync2<T1, T2, TResult> {
    (arg1: T1, arg2: T2): TResult;
}
interface IMemoizableFunctionSync3<T1, T2, T3, TResult> {
    (arg1: T1, arg2: T2, arg3: T3): TResult;
}
interface IMemoizableFunctionSync4<T1, T2, T3, T4, TResult> {
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4): TResult;
}
interface IMemoizableFunctionSync5<T1, T2, T3, T4, T5, TResult> {
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): TResult;
}
interface IMemoizableFunctionSync6<T1, T2, T3, T4, T5, T6, TResult> {
    (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5, a6: T6): TResult;
}
interface IMemoizableFunctionSyncPlus<TResult> {
    (...args: any[]): TResult;
}
export interface SyncParams0<TResult> extends IParamsBase0<TResult> {
    load: IMemoizableFunctionSync0<TResult>;
}
export interface SyncParams1<T1, TResult> extends IParamsBase1<T1, TResult> {
    load: IMemoizableFunctionSync1<T1, TResult>;
}
export interface SyncParams2<T1, T2, TResult> extends IParamsBase2<T1, T2, TResult> {
    load: IMemoizableFunctionSync2<T1, T2, TResult>;
}
export interface SyncParams3<T1, T2, T3, TResult> extends IParamsBase3<T1, T2, T3, TResult> {
    load: IMemoizableFunctionSync3<T1, T2, T3, TResult>;
}
export interface SyncParams4<T1, T2, T3, T4, TResult> extends IParamsBase4<T1, T2, T3, T4, TResult> {
    load: IMemoizableFunctionSync4<T1, T2, T3, T4, TResult>;
}
export interface SyncParams5<T1, T2, T3, T4, T5, TResult> extends IParamsBase5<T1, T2, T3, T4, T5, TResult> {
    load: IMemoizableFunctionSync5<T1, T2, T3, T4, T5, TResult>;
}
export interface SyncParams6<T1, T2, T3, T4, T5, T6, TResult> extends IParamsBase6<T1, T2, T3, T4, T5, T6, TResult> {
    load: IMemoizableFunctionSync6<T1, T2, T3, T4, T5, T6, TResult>;
}
export interface SyncParamsPlus<TResult> extends IParamsBasePlus {
    load: IMemoizableFunctionSyncPlus<TResult>;
}
export declare function syncMemoizer<TResult>(options: SyncParams0<TResult>): IMemoizedSync<unknown, unknown, unknown, unknown, unknown, unknown, TResult>;
export declare function syncMemoizer<T1, TResult>(options: SyncParams1<T1, TResult>): IMemoizedSync<T1, unknown, unknown, unknown, unknown, unknown, TResult>;
export declare function syncMemoizer<T1, T2, TResult>(options: SyncParams2<T1, T2, TResult>): IMemoizedSync<T1, T2, unknown, unknown, unknown, unknown, TResult>;
export declare function syncMemoizer<T1, T2, T3, TResult>(options: SyncParams3<T1, T2, T3, TResult>): IMemoizedSync<T1, T2, T3, unknown, unknown, unknown, TResult>;
export declare function syncMemoizer<T1, T2, T3, T4, TResult>(options: SyncParams4<T1, T2, T3, T4, TResult>): IMemoizedSync<T1, T2, T3, T4, unknown, unknown, TResult>;
export declare function syncMemoizer<T1, T2, T3, T4, T5, TResult>(options: SyncParams5<T1, T2, T3, T4, T5, TResult>): IMemoizedSync<T1, T2, T3, T4, T5, unknown, TResult>;
export declare function syncMemoizer<T1, T2, T3, T4, T5, T6, TResult>(options: SyncParams6<T1, T2, T3, T4, T5, T6, TResult>): IMemoizedSync<T1, T2, T3, T4, T5, T6, TResult>;
export {};
