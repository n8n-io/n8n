type UnboxLazy<T> = T extends () => infer U ? U : T;
type BoxedTupleTypes<T extends any[]> = {
    [P in keyof T]: [UnboxLazy<T[P]>];
}[Exclude<keyof T, keyof any[]>];
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type UnboxIntersection<T> = T extends {
    0: infer U;
} ? U : never;
type MergeProxy<T extends any[]> = UnboxIntersection<UnionToIntersection<BoxedTupleTypes<T>>>;
export declare function mergeProxy<T extends any[]>(...sources: T): MergeProxy<T>;
export {};
