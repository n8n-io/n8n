export declare type PromiseInspectionArgs<T> = {
    value: T;
    error?: Error;
} | {
    value?: T;
    error: Error;
};
export declare class PromiseInspection<T> {
    _value: T | void;
    _error: Error | void;
    constructor(args: PromiseInspectionArgs<T>);
    value(): void | T;
    reason(): void | Error;
    isRejected(): boolean;
    isFulfilled(): boolean;
}
