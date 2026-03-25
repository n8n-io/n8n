export type APICall = {
    status: "complete";
    request: Request;
    response: Response;
} | {
    status: "request-error";
    request: Request;
    response?: undefined;
} | {
    status: "invalid";
    request?: undefined;
    response?: undefined;
};
export declare class APIPromise<T> implements Promise<T> {
    #private;
    readonly [Symbol.toStringTag] = "APIPromise";
    constructor(p: [T, APICall] | Promise<[T, APICall]>);
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult>;
    finally(onfinally?: (() => void) | null | undefined): Promise<T>;
    $inspect(): Promise<[T, APICall]>;
}
//# sourceMappingURL=async.d.ts.map