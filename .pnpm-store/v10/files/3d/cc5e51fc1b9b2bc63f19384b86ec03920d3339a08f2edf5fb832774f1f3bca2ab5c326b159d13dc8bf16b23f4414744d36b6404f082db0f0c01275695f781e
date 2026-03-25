import * as Types from '../typebox';
export declare class ValueCastReferenceTypeError extends Error {
    readonly schema: Types.TRef | Types.TThis;
    constructor(schema: Types.TRef | Types.TThis);
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
export declare class ValueCastDereferenceError extends Error {
    readonly schema: Types.TRef | Types.TThis;
    constructor(schema: Types.TRef | Types.TThis);
}
export declare namespace ValueCast {
    function Visit(schema: Types.TSchema, references: Types.TSchema[], value: any): any;
    function Cast<T extends Types.TSchema>(schema: T, references: Types.TSchema[], value: any): Types.Static<T>;
}
