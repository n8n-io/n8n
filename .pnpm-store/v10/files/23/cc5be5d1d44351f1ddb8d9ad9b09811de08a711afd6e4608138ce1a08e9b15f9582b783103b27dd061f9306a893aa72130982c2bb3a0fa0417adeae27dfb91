export declare type EqualityFn<TFunc extends (...args: any[]) => any> = (newArgs: Parameters<TFunc>, lastArgs: Parameters<TFunc>) => boolean;
export declare type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
    clear: () => void;
    (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): ReturnType<TFunc>;
};
declare function memoizeOne<TFunc extends (this: any, ...newArgs: any[]) => any>(resultFn: TFunc, isEqual?: EqualityFn<TFunc>): MemoizedFn<TFunc>;
export default memoizeOne;
