/**
 * This allows omitting keys from objects inside unions, without merging the individual components of the union.
 */
type Omit_<T, K> = Omit<T, Extract<keyof T, K>>;
export type DistributiveOmit<T, K> = T extends unknown ? keyof Omit_<T, K> extends never ? never : {
    [P in keyof Omit_<T, K>]: Omit_<T, K>[P];
} : never;
export {};
//# sourceMappingURL=distributive-omit.d.ts.map