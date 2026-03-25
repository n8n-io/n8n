export declare type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};
export declare type WritableArray<T> = T extends readonly any[] ? Writable<T> : T;
export declare type IfNever<T, Y = true, N = false> = [T] extends [never] ? Y : N;
export declare type IfUnknown<T, Y, N> = [unknown] extends [T] ? Y : N;
export declare type UnknownToNever<T> = IfUnknown<T, never, T>;
export {};
