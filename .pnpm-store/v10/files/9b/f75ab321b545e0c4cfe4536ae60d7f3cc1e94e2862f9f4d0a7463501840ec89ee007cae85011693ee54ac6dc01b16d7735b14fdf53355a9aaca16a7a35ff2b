export declare class ValuePointerRootSetError extends Error {
    readonly value: unknown;
    readonly path: string;
    readonly update: unknown;
    constructor(value: unknown, path: string, update: unknown);
}
export declare class ValuePointerRootDeleteError extends Error {
    readonly value: unknown;
    readonly path: string;
    constructor(value: unknown, path: string);
}
/** Provides functionality to update values through RFC6901 string pointers */
export declare namespace ValuePointer {
    /** Formats the given pointer into navigable key components */
    function Format(pointer: string): IterableIterator<string>;
    /** Sets the value at the given pointer. If the value at the pointer does not exist it is created */
    function Set(value: any, pointer: string, update: unknown): void;
    /** Deletes a value at the given pointer */
    function Delete(value: any, pointer: string): void;
    /** Returns true if a value exists at the given pointer */
    function Has(value: any, pointer: string): boolean;
    /** Gets the value at the given pointer */
    function Get(value: any, pointer: string): any;
}
