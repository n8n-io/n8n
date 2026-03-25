import * as Types from '../typebox';
import { ValueErrorIterator } from '../errors/index';
export type CheckFunction = (value: unknown) => boolean;
export declare class TypeCheck<T extends Types.TSchema> {
    private readonly schema;
    private readonly references;
    private readonly checkFunc;
    private readonly code;
    constructor(schema: T, references: Types.TSchema[], checkFunc: CheckFunction, code: string);
    /** Returns the generated assertion code used to validate this type. */
    Code(): string;
    /** Returns an iterator for each error in this value. */
    Errors(value: unknown): ValueErrorIterator;
    /** Returns true if the value matches the compiled type. */
    Check(value: unknown): value is Types.Static<T>;
}
export declare class TypeCompilerUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class TypeCompilerDereferenceError extends Error {
    readonly schema: Types.TRef;
    constructor(schema: Types.TRef);
}
export declare class TypeCompilerTypeGuardError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
/** Compiles Types for Runtime Type Checking */
export declare namespace TypeCompiler {
    /** Returns the generated assertion code used to validate this type. */
    function Code<T extends Types.TSchema>(schema: T, references?: Types.TSchema[]): string;
    /** Compiles the given type for runtime type checking. This compiler only accepts known TypeBox types non-inclusive of unsafe types. */
    function Compile<T extends Types.TSchema>(schema: T, references?: Types.TSchema[]): TypeCheck<T>;
}
