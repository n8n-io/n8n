export interface IEqualsComparer<T> {
    (a: T, b: T): boolean;
}
declare function identityComparer(a: any, b: any): boolean;
declare function structuralComparer(a: any, b: any): boolean;
declare function shallowComparer(a: any, b: any): boolean;
declare function defaultComparer(a: any, b: any): boolean;
export declare const comparer: {
    identity: typeof identityComparer;
    structural: typeof structuralComparer;
    default: typeof defaultComparer;
    shallow: typeof shallowComparer;
};
export {};
