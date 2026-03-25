export declare class ValueMutateTypeMismatchError extends Error {
    constructor();
}
export declare class ValueMutateInvalidRootMutationError extends Error {
    constructor();
}
export type Mutable = {
    [key: string]: unknown;
} | unknown[];
export declare namespace ValueMutate {
    /** Performs a deep mutable value assignment while retaining internal references. */
    function Mutate(current: Mutable, next: Mutable): void;
}
