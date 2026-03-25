export type DeepRequired<T> = T extends Array<infer U> ? Array<DeepRequired<U>> : T extends object ? {
    [K in keyof T]-?: DeepRequired<NonNullable<T[K]>>;
} : T;
