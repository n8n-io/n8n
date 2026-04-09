export declare function _isPromise<T>(fn: any): fn is Promise<T>;
export declare function _wrapInterval(action: any, timeout?: any): AgPromise<number>;
type ResolveAndRejectCallback<T> = (resolve: (value: T | null) => void, reject: (params: any) => void) => void;
export declare class AgPromise<T> {
    private status;
    private resolution;
    private readonly waiters;
    static all<T>(promises: AgPromise<T | null>[]): AgPromise<(T | null)[]>;
    static resolve<T>(value?: T | null): AgPromise<T>;
    constructor(callback: ResolveAndRejectCallback<T>);
    then<V>(func: (result: T | null) => V): AgPromise<V>;
    private onDone;
    private onReject;
}
export {};
