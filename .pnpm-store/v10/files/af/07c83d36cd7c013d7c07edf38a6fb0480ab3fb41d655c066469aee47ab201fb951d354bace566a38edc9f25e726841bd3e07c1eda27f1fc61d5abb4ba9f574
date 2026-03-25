import * as Types from '../typebox';
export declare class ValueCastReferenceTypeError extends Error {
    readonly schema: Types.TRef | Types.TSelf;
    constructor(schema: Types.TRef | Types.TSelf);
}
export declare class ValueCastArrayUniqueItemsTypeError extends Error {
    readonly schema: Types.TSchema;
    readonly value: unknown;
    constructor(schema: Types.TSchema, value: unknown);
}
export declare class ValueCastNeverTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCastRecursiveTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCastUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare namespace ValueCast {
    function Visit(schema: Types.TSchema, references: Types.TSchema[], value: any): any;
    function Cast<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: any): Types.Static<T>;
}
